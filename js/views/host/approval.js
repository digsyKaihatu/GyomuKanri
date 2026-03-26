// js/views/host/approval.js

import { db, showView, VIEWS, allTaskObjects, updateGlobalTaskObjects } from "../../main.js";
// ★ getDocs を追加インポート
import { collection, query, where, orderBy, onSnapshot, doc, writeBatch, Timestamp, getDoc, deleteDoc, getDocs } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
// ★ formatTime, formatDuration を追加インポート
import { escapeHtml, formatTime, formatDuration } from "../../utils.js";

let unsubscribe = null;

const handleBackClick = () => showView(VIEWS.HOST);

export function initializeApprovalView() {
    const container = document.getElementById(VIEWS.APPROVAL);
    if (!container) return; 

    const backBtn = document.getElementById("back-from-approval");
    backBtn?.addEventListener("click", handleBackClick);
    
    const q = query(
        collection(db, "work_log_requests"),
        where("status", "==", "pending"),
        orderBy("createdAt", "asc")
    );

    unsubscribe = onSnapshot(q, (snapshot) => {
        renderApprovalList(snapshot.docs);
    });
}

export function cleanupApprovalView() {
    if (unsubscribe) unsubscribe();
    const backBtn = document.getElementById("back-from-approval");
    backBtn?.removeEventListener("click", handleBackClick);
}

function renderApprovalList(docs) {
    const listEl = document.getElementById("approval-list-content");
    if (!listEl) return;
    
    listEl.innerHTML = "";

    if (docs.length === 0) {
        listEl.innerHTML = '<p class="text-gray-500 text-center py-4">未承認の申請はありません。</p>';
        return;
    }

    docs.forEach(docSnap => {
        const req = docSnap.data();
        const card = document.createElement("div");
        card.className = "bg-white p-4 rounded shadow mb-4 border-l-4 border-blue-500";
        
        const typeLabel = req.type === 'add' 
            ? '<span class="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">追加申請</span>' 
            : '<span class="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">変更申請</span>';

        const timeInfo = req.type === 'add' 
            ? `時間: ${req.data.startTime} ~ ${req.data.endTime}` 
            : `<span class="text-gray-400 text-xs">時間は変更されません</span>`;

        const goalInfo = req.data.goalTitle 
            ? `<div class="text-sm">目標: ${escapeHtml(req.data.goalTitle)} (${req.data.count}件)</div>` 
            : "";

        // ★「タイムライン確認」ボタンを追加
        card.innerHTML = `
            <div class="flex justify-between items-start">
                <div class="flex-grow">
                    <div class="flex items-center gap-2 mb-1">
                        ${typeLabel}
                        <span class="font-bold text-lg">${escapeHtml(req.userName)}</span>
                        <span class="text-gray-500 text-sm">${req.requestDate}</span>
                        <button class="view-timeline-btn text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded hover:bg-indigo-200 border border-indigo-200 ml-2 flex items-center gap-1" 
                            title="この日のタイムラインを見る">
                            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            タイムライン
                        </button>
                    </div>
                    <div class="mt-2">
                        <div class="font-semibold text-gray-800">業務: ${escapeHtml(req.data.task)}</div>
                        ${goalInfo}
                        <div class="text-sm text-gray-600">${timeInfo}</div>
                        <div class="text-sm text-gray-500 mt-1">メモ: ${escapeHtml(req.data.memo)}</div>
                    </div>
                </div>
                <div class="flex flex-col gap-2 ml-4">
                    <button class="approve-btn bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 shadow text-sm whitespace-nowrap" data-id="${docSnap.id}">
                        承認
                    </button>
                    <button class="delete-req-btn bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 shadow text-sm whitespace-nowrap" data-id="${docSnap.id}">
                        削除
                    </button>
                </div>
            </div>
        `;
        
        // イベントリスナーを追加
        card.querySelector(".approve-btn").addEventListener("click", () => handleApprove(docSnap));
        card.querySelector(".delete-req-btn").addEventListener("click", () => handleDeleteRequest(docSnap));
        
        // ★タイムラインボタンのイベント
        card.querySelector(".view-timeline-btn").addEventListener("click", () => {
            showTimelineModal(req.userId, req.userName, req.requestDate);
        });
        
        listEl.appendChild(card);
    });
}

// --- 以下、タイムライン表示用の追加関数 ---

/**
 * 指定ユーザー・指定日のログを取得してモーダル表示する関数
 */
async function showTimelineModal(targetUserId, targetUserName, dateStr) {
    // 既存モーダルがあれば削除
    const existing = document.getElementById("approval-timeline-modal");
    if (existing) existing.remove();

    // モーダルの枠組みを作成
    const modalHtml = `
    <div id="approval-timeline-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-xl shadow-lg w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div class="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-xl">
                <h3 class="font-bold text-gray-700 text-lg">
                    📅 ${escapeHtml(targetUserName)} さんの業務記録 <span class="text-sm font-normal text-gray-500">(${dateStr})</span>
                </h3>
                <button id="close-timeline-modal" class="text-gray-500 hover:text-gray-800 text-2xl font-bold leading-none">&times;</button>
            </div>
            <div id="timeline-content" class="p-4 overflow-y-auto custom-scrollbar flex-grow bg-white">
                <p class="text-center text-gray-500 py-4">データを読み込み中...</p>
            </div>
            <div class="p-3 border-t bg-gray-50 rounded-b-xl text-right">
                <button id="close-timeline-btn-btm" class="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-1 px-4 rounded">閉じる</button>
            </div>
        </div>
    </div>`;
    
    document.body.insertAdjacentHTML("beforeend", modalHtml);

    // 閉じる処理の設定
    const closeModal = () => document.getElementById("approval-timeline-modal")?.remove();
    document.getElementById("close-timeline-modal").onclick = closeModal;
    document.getElementById("close-timeline-btn-btm").onclick = closeModal;
    document.getElementById("approval-timeline-modal").onclick = (e) => {
        if(e.target.id === "approval-timeline-modal") closeModal();
    };

    // データの取得
    const contentEl = document.getElementById("timeline-content");
    try {
        const q = query(
            collection(db, "work_logs"),
            where("userId", "==", targetUserId),
            where("date", "==", dateStr)
        );
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            contentEl.innerHTML = `<p class="text-center text-gray-500 py-4">この日の業務記録はありません。</p>`;
            return;
        }

        // 開始時間順にソート
        const logs = snapshot.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .sort((a, b) => {
                const tA = a.startTime?.toMillis ? a.startTime.toMillis() : new Date(a.startTime).getTime();
                const tB = b.startTime?.toMillis ? b.startTime.toMillis() : new Date(b.startTime).getTime();
                return tA - tB;
            });

        // HTML生成
        let html = '<ul class="space-y-2">';
        logs.forEach(log => {
            // 工数記録だけのログはタイムライン上では邪魔になることがあるので、必要に応じて除外したりデザインを変える
            // ここではシンプルにすべて表示しますが、type="goal" は少し見た目を変えます
            
            const isGoalLog = log.type === 'goal';
            const bgColor = log.task === '休憩' ? 'bg-yellow-50 border-yellow-200' : (isGoalLog ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200');
            
            const startStr = formatTime(log.startTime);
            const endStr = log.endTime ? formatTime(log.endTime) : '---';
            const durationStr = log.duration ? formatDuration(log.duration) : '';
            
            let mainContent = `<span class="font-bold text-gray-800">${escapeHtml(log.task)}</span>`;
            if (log.goalTitle) {
                mainContent += ` <span class="text-xs text-gray-500 bg-white border border-gray-300 px-1 rounded ml-1">${escapeHtml(log.goalTitle)}</span>`;
            }
            if (log.contribution) {
                mainContent += ` <span class="text-xs font-bold text-orange-600 ml-1">+${log.contribution}件</span>`;
            }

            const timeDisplay = isGoalLog 
                ? `<span class="text-xs text-gray-400">${startStr} (進捗登録)</span>` 
                : `<span class="font-mono text-sm text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">${startStr} - ${endStr}</span>`;

            html += `
            <li class="p-3 rounded border ${bgColor} flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                <div>
                    <div class="flex items-center flex-wrap gap-2">
                        ${timeDisplay}
                        ${mainContent}
                    </div>
                    ${log.memo ? `<div class="text-xs text-gray-500 mt-1 pl-2 border-l-2 border-gray-300">${escapeHtml(log.memo)}</div>` : ''}
                </div>
                ${!isGoalLog ? `<div class="text-xs font-bold text-gray-500 whitespace-nowrap">⏱ ${durationStr}</div>` : ''}
            </li>`;
        });
        html += '</ul>';
        
        contentEl.innerHTML = html;

    } catch (error) {
        console.error("タイムライン取得エラー:", error);
        contentEl.innerHTML = `<p class="text-center text-red-500 py-4">データの取得に失敗しました。</p>`;
    }
}

// ... 既存の handleApprove, updateGoalProgress, handleDeleteRequest ...
async function handleApprove(reqDoc) {
    if(!confirm("この申請を承認しますか？")) return;

    const req = reqDoc.data();
    const batch = writeBatch(db);
    const reqRef = doc(db, "work_log_requests", reqDoc.id);

    try {
        if (req.type === "add") {
            // 新規ログ作成
            const newLogRef = doc(collection(db, "work_logs"));
            
            const [sh, sm] = req.data.startTime.split(":");
            const [eh, em] = req.data.endTime.split(":");
            const startD = new Date(req.requestDate);
            startD.setHours(sh, sm, 0);
            const endD = new Date(req.requestDate);
            endD.setHours(eh, em, 0);
            const duration = Math.max(0, (endD - startD) / 1000);

            batch.set(newLogRef, {
                userId: req.userId,
                userName: req.userName,
                date: req.requestDate,
                startTime: startD,
                endTime: endD,
                duration: duration,
                task: req.data.task,
                goalId: req.data.goalId || null,
                goalTitle: req.data.goalTitle || null,
                contribution: req.data.count || 0,
                memo: req.data.memo || "",
                type: "work" // 常に "work" にする（またはこの行を削除）
            });

            // 目標進捗更新（加算）
            if (req.data.goalId && req.data.count > 0) {
                await updateGoalProgress(req.data.task, req.data.goalId, req.data.count);
            }

} else if (req.type === "update") {
            // 既存ログ更新
            const logRef = doc(db, "work_logs", req.targetLogId);
            const logSnap = await getDoc(logRef);
            
            if (!logSnap.exists()) {
                alert("対象のログが見つかりません。");
                return;
            }
            const oldLog = logSnap.data();

            batch.update(logRef, {
                task: req.data.task,
                goalId: req.data.goalId || null,
                goalTitle: req.data.goalTitle || null,
                contribution: req.data.count || 0,
                memo: req.data.memo || ""
                // 変更前: type: "work" // 常に "work" にする（またはこの行を削除）
                // 変更後: ↓ 行ごと削除するかコメントアウトしてください
            });
            
            // 目標進捗更新（差分）
            if (oldLog.goalId && oldLog.contribution > 0) {
                await updateGoalProgress(oldLog.task, oldLog.goalId, -oldLog.contribution);
            }
            if (req.data.goalId && req.data.count > 0) {
                await updateGoalProgress(req.data.task, req.data.goalId, req.data.count);
            }
        }

        // 申請ステータスを更新
        batch.update(reqRef, { status: "approved" });
        await batch.commit();
        
        alert("承認しました。");
        
    } catch (error) {
        console.error("Approval error:", error);
        alert("承認処理中にエラーが発生しました。");
    }
}

// 目標進捗のグローバル更新ヘルパー
async function updateGoalProgress(taskName, goalId, diff) {
    if (!allTaskObjects) return;
    
    const updatedTasks = JSON.parse(JSON.stringify(allTaskObjects));
    
    const taskIdx = updatedTasks.findIndex(t => t.name === taskName);
    if (taskIdx === -1) return;
    
    const goalIdx = updatedTasks[taskIdx].goals.findIndex(g => g.id === goalId);
    if (goalIdx === -1) return;

    updatedTasks[taskIdx].goals[goalIdx].current = Math.max(0, (updatedTasks[taskIdx].goals[goalIdx].current || 0) + diff);

    await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js")
        .then(({ updateDoc, doc }) => {
            updateDoc(doc(db, "settings", "tasks"), { list: updatedTasks });
        });
    
    updateGlobalTaskObjects(updatedTasks);
}

// js/views/host/approval.js の最後の方に追加

async function handleDeleteRequest(reqDoc) {
    if(!confirm("この申請を削除（却下）しますか？\nこの操作は元に戻せません。")) return;

    try {
        // work_log_requests コレクションからドキュメントを削除
        await deleteDoc(doc(db, "work_log_requests", reqDoc.id));
        alert("申請を削除しました。");
    } catch (error) {
        console.error("Delete error:", error);
        alert("削除中にエラーが発生しました。");
    }
}
