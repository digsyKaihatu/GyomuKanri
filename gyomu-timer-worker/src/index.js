/**
 * 業務管理システム: Cloudflare Worker 統合バックエンド (修正版)
 * 機能: D1ステータス管理, 予約自動実行, Firebaseログ連携, ステータス完全同期
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// 指定時間待機するためのヘルパー
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default {
  /**
   * 1. HTTPリクエスト処理 (フロントエンドからのAPI呼び出し)
   */
  async fetch(request, env, ctx) {
    // CORS プリフライトリクエストの処理
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      const url = new URL(request.url);

      if (!env.DB) {
        throw new Error("D1 データベース接続(env.DB)が確立されていません。wrangler.tomlを確認してください。");
      }

      // --- エンドポイント1: 全ユーザーのステータス一覧を取得 ---
      if (url.pathname === "/get-all-status") {
        const { results } = await env.DB.prepare("SELECT * FROM work_status").all();
        return new Response(JSON.stringify(results), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // --- エンドポイント2: 特定ユーザーのステータスを詳細取得 ---
      if (url.pathname === "/get-user-status" || url.pathname === "/get-my-status" || url.pathname === "/get-status") {
        const userId = url.searchParams.get("userId");
        const result = await env.DB.prepare("SELECT * FROM work_status WHERE userId = ?")
          .bind(userId).first();
        return new Response(JSON.stringify(result || {}), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // --- エンドポイント3: 予約データの新規作成または更新 ---
      if (url.pathname === "/save-reservation" && request.method === "POST") {
        const data = await request.json();
        await env.DB.prepare(
          "INSERT OR REPLACE INTO reservations (id, userId, userName, action, scheduledTime, status) VALUES (?, ?, ?, ?, ?, ?)"
        ).bind(data.id, data.userId, data.userName, data.action, data.scheduledTime, 'reserved').run();
        return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
      }

      // --- エンドポイント4: ユーザー自身の有効な予約一覧を取得 ---
      if (url.pathname === "/get-user-reservations") {
        const userId = url.searchParams.get("userId");
        const { results } = await env.DB.prepare(
          "SELECT * FROM reservations WHERE userId = ? AND status = 'reserved'"
        ).bind(userId).all();
        return new Response(JSON.stringify(results), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // --- エンドポイント5: 予約の取り消し ---
      if (url.pathname === "/delete-reservation" && request.method === "POST") {
        const { id } = await request.json();
        await env.DB.prepare("DELETE FROM reservations WHERE id = ?").bind(id).run();
        return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
      }

// --- エンドポイント6: フロントエンドからの手動ステータス同期 ---
      if ((url.pathname === "/update-status" || url.pathname === "/start-work") && request.method === "POST") {
        const data = await request.json();

        const currentGoal = data.currentGoal || null;
        const currentGoalId = data.currentGoalId || null;
        // ★追加: 今日の一言を受け取る
        const wordOfTheDay = data.wordOfTheDay || null;

        const nowIso = new Date().toISOString();
        const preBreakTask = data.preBreakTask ? (typeof data.preBreakTask === 'string' ? data.preBreakTask : JSON.stringify(data.preBreakTask)) : null;

        // ★修正: wordOfTheDay をカラムに追加 (INSERTとUPDATE両方)
        await env.DB.prepare(`
          INSERT INTO work_status (userId, userName, isWorking, currentTask, startTime, preBreakTask, currentGoal, currentGoalId, wordOfTheDay, updatedAt, lastUpdatedBy)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(userId) DO UPDATE SET
            userName=excluded.userName,
            isWorking=excluded.isWorking,
            currentTask=excluded.currentTask,
            startTime=excluded.startTime,
            preBreakTask=excluded.preBreakTask,
            currentGoal=excluded.currentGoal,
            currentGoalId=excluded.currentGoalId,
            wordOfTheDay=excluded.wordOfTheDay, 
            updatedAt=excluded.updatedAt,
            lastUpdatedBy=excluded.lastUpdatedBy
        `).bind(
            data.userId,
            data.userName,
            data.isWorking,
            data.currentTask,
            data.startTime,
            preBreakTask,
            currentGoal,
            currentGoalId,
            wordOfTheDay, // ★バインド変数に追加
            nowIso,
            'client'
        ).run();

        return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
      }

// --- エンドポイント: メッセージ送信 (修正版) ---
      if (url.pathname === "/send-message" && request.method === "POST") {
        try {
          // 1. フロントからデータを受け取る
          const reqJson = await request.json();
          // IDは単体でも配列でも受け取れるようにする
          const targetUserIds = Array.isArray(reqJson.targetUserId) ? reqJson.targetUserId : [reqJson.targetUserId];
          const { title, messageBody } = reqJson;

          // 2. Googleへの認証トークンを取得 (既存の関数を再利用)
          // ★注意: Cloudflareの環境変数に FIREBASE_SERVICE_ACCOUNT が設定されている必要があります
          const serviceAccount = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT);
          const accessToken = await getAccessToken(serviceAccount);
          const projectId = serviceAccount.project_id;

          let successCount = 0;

          // 3. 対象ユーザーごとに通知送信
          for (const uid of targetUserIds) {
            // Firestoreからユーザー情報を取得 (D1ではなくFirestoreを見に行く)
            const fsUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/user_profiles/${uid}`;
            const fsResp = await fetch(fsUrl, {
              headers: { 'Authorization': `Bearer ${accessToken}` }
            });

            if (!fsResp.ok) continue; // ユーザーが見つからなければスキップ

            const fsData = await fsResp.json();
            // トークン配列を取り出す (FirestoreのJSON構造に対応)
            const tokens = fsData.fields?.fcmTokens?.arrayValue?.values?.map(v => v.stringValue) || [];

            // 保持している全端末に送信
            for (const token of tokens) {
              const fcmUrl = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;
              const messagePayload = {
                message: {
                  token: token,
                  notification: {
                    title: title || "管理者からのメッセージ",
                    body: messageBody || ""
                  },
                  data: {
                    source: 'worker' // フロントでworkerからの通知と識別するために付与
                  }
                }
              };

              await fetch(fcmUrl, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${accessToken}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify(messagePayload)
              });
              successCount++;
            }
          }

          return new Response(JSON.stringify({ success: true, sent: successCount }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });

        } catch (e) {
          console.error("Send Message Error:", e);
          return new Response(JSON.stringify({ success: false, error: e.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
      }
      
      // --- エンドポイント7: 管理者による強制停止 ---
      if (url.pathname === "/force-stop" && request.method === "POST") {
        const { userId } = await request.json();
        const nowIso = new Date().toISOString();
        // 管理者による停止時は preBreakTask も含めすべてリセットする
        await env.DB.prepare(`
          UPDATE work_status
          SET isWorking = 0,
              currentTask = NULL,
              startTime = NULL,
              preBreakTask = NULL,
              currentGoal = NULL,
              currentGoalId = NULL,
              updatedAt = ?,
              lastUpdatedBy = 'admin'
          WHERE userId = ?
        `).bind(nowIso, userId).run();
        return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
      }

      // --- 追加エンドポイント: 戸村さんステータスの取得 ---
      if (url.pathname === "/get-tomura-status") {
        const result = await env.DB.prepare("SELECT value FROM settings WHERE key = 'tomura_status'").first();
        return new Response(result ? result.value : JSON.stringify({ status: "声掛けOK", location: "出社" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // --- 追加エンドポイント: 戸村さんステータスの更新 ---
      if (url.pathname === "/update-tomura-status" && request.method === "POST") {
        const data = await request.json();
        const todayStr = new Date().toISOString().split("T")[0];
        const value = JSON.stringify({ ...data, date: todayStr });

        await env.DB.prepare(
          "INSERT OR REPLACE INTO settings (key, value, updatedAt) VALUES ('tomura_status', ?, ?)"
        ).bind(value, new Date().toISOString()).run();

        return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
      }

      // --- 404 Not Found ---
      return new Response("End Point Not Found", { status: 404, headers: corsHeaders });

    } catch (e) {
      // エラーハンドリング
      return new Response(JSON.stringify({ error: e.message, stack: e.stack }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
  },

/**
   * 2. 定期実行 (Cronによる予約の自動処理)
   */
  async scheduled(event, env, ctx) {
    const now = new Date();
    // 1分後までの予約を検索対象とする
    const lookAheadIso = new Date(now.getTime() + 60 * 1000).toISOString();

    try {
      // 実行待ちの予約を取得
      const { results: pendingReservations } = await env.DB.prepare(
        "SELECT * FROM reservations WHERE status = 'reserved' AND scheduledTime <= ?"
      ).bind(lookAheadIso).all();

      if (pendingReservations.length === 0) return;

      // Firebase認証情報の取得
      const serviceAccount = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT);
      const token = await getAccessToken(serviceAccount);
      const projectId = serviceAccount.project_id;

      for (const res of pendingReservations) {
        // 現在のステータスを取得
        const currentStatus = await env.DB.prepare("SELECT * FROM work_status WHERE userId = ?")
          .bind(res.userId).first();

        let preBreakTaskJson = null;

        // 既に休憩中ならスキップ（ただし予約日時は更新）
        if (res.action === "break" && currentStatus && currentStatus.currentTask === "休憩") {
          const scheduledDate = new Date(res.scheduledTime);
          const nextDateIso = new Date(scheduledDate.getTime() + 24 * 60 * 60 * 1000).toISOString();
          await env.DB.prepare("UPDATE reservations SET scheduledTime = ? WHERE id = ?")
            .bind(nextDateIso, res.id).run();
          continue; 
        }

        // ▼▼▼ ここを追加 ▼▼▼
        // 休憩予約だが、現在業務中でない場合はスキップ（予約日時は翌日に更新）
        if (res.action === "break" && (!currentStatus || currentStatus.isWorking === 0)) {
          const scheduledDate = new Date(res.scheduledTime);
          const nextDateIso = new Date(scheduledDate.getTime() + 24 * 60 * 60 * 1000).toISOString();
          await env.DB.prepare("UPDATE reservations SET scheduledTime = ? WHERE id = ?")
            .bind(nextDateIso, res.id).run();
          continue; 
        }
        // ▲▲▲ ここまで ▲▲▲

        // --- 1. Firebaseへのログ送信 & 休憩前タスクの保存準備 ---
        if (currentStatus && currentStatus.isWorking === 1) {
          try {
            const startTime = new Date(currentStatus.startTime);
            const endTime = new Date();
            const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);

            // 休憩以外のタスクで、かつ作業時間が正の場合のみログ送信
            if (duration > 0 && currentStatus.currentTask !== "休憩") {
              const logBody = {
                fields: {
                  userId: { stringValue: res.userId },
                  userName: { stringValue: res.userName },
                  task: { stringValue: currentStatus.currentTask },
                  startTime: { timestampValue: currentStatus.startTime },
                  endTime: { timestampValue: endTime.toISOString() },
                  duration: { integerValue: duration },
                  date: { stringValue: endTime.toISOString().split('T')[0] },
                  memo: { stringValue: "（自動実行ログ）" }
                }
              };

              if (currentStatus.currentGoalId) {
                logBody.fields.goalId = { stringValue: currentStatus.currentGoalId };
                if (currentStatus.currentGoal) {
                  logBody.fields.goalTitle = { stringValue: currentStatus.currentGoal };
                }
              }

              const todayStr = new Date().toISOString().split('T')[0];
              const uniqueLogId = `log_${res.id}_${todayStr}`;

              await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/work_logs/${uniqueLogId}`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(logBody)
              });
            }
          } catch (logErr) {
            console.error("Firebase Log Error (Ignored):", logErr.message);
          }

          // 「休憩」アクションの場合、直前のタスク情報を保存するためのJSONを作成
          if (res.action === "break") {
            preBreakTaskJson = JSON.stringify({
              task: currentStatus.currentTask,
              goalTitle: currentStatus.currentGoal || "",
              goalId: currentStatus.currentGoalId || ""
            });
          }
        }

        // --- 2. D1とFirestoreのステータスを更新 ---
        const isWorkingNext = (res.action === "break") ? 1 : 0; // 休憩もisWorking=1扱い、退勤は0
        const taskNext = (res.action === "break") ? "休憩" : null;
        const currentNowIso = new Date().toISOString();
        
        // ★修正ポイント: Upsert構文を使用し、updatedAtやpreBreakTaskを含む全10カラムを更新
        await env.DB.prepare(`
          INSERT INTO work_status (
            userId, userName, isWorking, currentTask, startTime, 
            preBreakTask, currentGoal, currentGoalId, updatedAt, lastUpdatedBy
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(userId) DO UPDATE SET
            userName = excluded.userName,
            isWorking = excluded.isWorking,
            currentTask = excluded.currentTask,
            startTime = excluded.startTime,
            preBreakTask = excluded.preBreakTask,
            currentGoal = excluded.currentGoal,
            currentGoalId = excluded.currentGoalId,
            updatedAt = excluded.updatedAt,
            lastUpdatedBy = excluded.lastUpdatedBy
        `).bind(
            res.userId,
            res.userName,
            isWorkingNext,
            taskNext,
            currentNowIso,
            preBreakTaskJson, // 生成したJSON (またはnull)
            null, // currentGoal (休憩/停止時はnull)
            null, // currentGoalId (休憩/停止時はnull)
            currentNowIso,
            'worker' // 自動実行なので 'worker' とする
        ).run();

        // Firestore同期
        try {
          const fsBody = {
            fields: {
              userId: { stringValue: res.userId },
              userName: { stringValue: res.userName },
              isWorking: { booleanValue: isWorkingNext === 1 },
              currentTask: { stringValue: taskNext || "" },
              startTime: { timestampValue: currentNowIso },
              preBreakTask: { stringValue: preBreakTaskJson || "" },
              currentGoal: { stringValue: "" },
              currentGoalId: { stringValue: "" },
              lastUpdatedBy: { stringValue: 'worker' },
              updatedAt: { timestampValue: currentNowIso }
            }
          };
          
          await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/work_status/${res.userId}`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(fsBody)
          });
        } catch (fsErr) {
          console.error("Firestore Sync Error:", fsErr.message);
        }

        // --- 3. 予約を翌日に更新（毎日繰り返す仕様の場合） ---
        const scheduledDate = new Date(res.scheduledTime);
        const nextDateIso = new Date(scheduledDate.getTime() + 24 * 60 * 60 * 1000).toISOString();
        await env.DB.prepare("UPDATE reservations SET scheduledTime = ? WHERE id = ?")
          .bind(nextDateIso, res.id).run();
      }
    } catch (e) {
      console.error("Critical Worker Error:", e.message);
    }
  }
};

/**
 * 認証: Google OAuth2 アクセストークンの取得
 */
async function getAccessToken(serviceAccount) {
  const pem = serviceAccount.private_key;
  const clientEmail = serviceAccount.client_email;
  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/cloud-platform',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  };
  const encodedHeader = btoaUrl(JSON.stringify(header));
  const encodedClaim = btoaUrl(JSON.stringify(claim));
  const binaryKey = str2ab(pem);

  const key = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(`${encodedHeader}.${encodedClaim}`)
  );

  const jwt = `${encodedHeader}.${encodedClaim}.${btoaUrl(String.fromCharCode(...new Uint8Array(signature)))}`;

  const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
  });

  const data = await tokenResp.json();
  return data.access_token;
}

function btoaUrl(str) {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function str2ab(pem) {
  const pemHeader = "-----BEGIN PRIVATE KEY-----";
  const pemFooter = "-----END PRIVATE KEY-----";
  const pemContents = pem.substring(pem.indexOf(pemHeader) + pemHeader.length, pem.indexOf(pemFooter)).replace(/\s/g, '');
  const binaryString = atob(pemContents);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}
