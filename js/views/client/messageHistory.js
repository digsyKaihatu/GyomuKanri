// js/views/client/messageHistory.js

import { db, userId, escapeHtml } from "../../main.js";
import { collection, query, where, orderBy, limit, getDocs, onSnapshot, writeBatch } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// ▼▼▼ 修正1：ファイルの上部（importの下あたり）にリスナーを保存する変数を追加 ▼▼▼
let unreadMessagesUnsubscribe = null;

/**
 * メッセージ履歴ボタンを画面上部に注入する
 */
export function injectMessageHistoryButton() {
    const container = document.getElementById("client-view");
    if (!container) return;

    // 重複防止
    if (document.getElementById("open-messages-btn")) return;

    // ヘッダー的な領域を作成
    const headerDiv = document.createElement("div");
    headerDiv.className = "flex justify-end mb-4";
    
    headerDiv.innerHTML = `
        <button id="open-messages-btn" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded shadow flex items-center gap-2 text-sm transition-colors duration-300">
            <span>📨 届いたメッセージ</span>
            <span id="unread-badge" class="hidden bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full border border-white">New</span>
        </button>
    `;

    // コンテナの最初の要素の前に挿入（タイトルの上）
    container.insertBefore(headerDiv, container.firstChild);

    // イベントリスナー
    document.getElementById("open-messages-btn").addEventListener("click", showMessageHistoryModal);

    // 未読メッセージを監視してボタンを強調する
    listenForUnreadMessages();
}

// 未読メッセージ監視ロジック
function listenForUnreadMessages() {
    if (!userId) return;

    // ▼▼▼ 修正2：既に監視が動いている場合は、二重登録を防ぐために処理をストップ ▼▼▼
    if (unreadMessagesUnsubscribe) {
        return; // 既に監視中なら何もしないで終了
    }
    
    const q = query(
        collection(db, "user_profiles", userId, "messages"),
        where("read", "==", false)
    );

    let isInitialLoad = true;

    // ▼▼▼ 修正3：onSnapshot の返り値（監視解除用の関数）を変数に保存する ▼▼▼
    unreadMessagesUnsubscribe = onSnapshot(q, (snapshot) => {
        const btn = document.getElementById("open-messages-btn");
        const badge = document.getElementById("unread-badge");

        // ▼▼▼ 追加: デスクトップ通知のロジック ▼▼▼
        if (!isInitialLoad) {
            snapshot.docChanges().forEach((change) => {
                if (change.type === "added") {
                    const data = change.doc.data();
                    // ブラウザの通知許可があれば通知を出す
                    if (Notification.permission === "granted") {
                        new Notification(data.title || "新しいメッセージ", {
                            body: data.body || "管理者からメッセージが届きました",
                            icon: "/512.pngs32.png" // アイコン画像のパス（必要に応じて変更）
                        });
                    }
                }
            });
        }
        isInitialLoad = false; // 初回処理完了
        // ▲▲▲ 追加ここまで ▲▲▲
        
        if (!btn || !badge) return;

        const count = snapshot.size;
        if (count > 0) {
            // 未読あり: 赤バッジ表示、ボタンをオレンジにして点滅させる
            badge.textContent = count > 99 ? "99+" : count;
            badge.classList.remove("hidden");
            
            btn.classList.add("animate-pulse", "bg-orange-600", "hover:bg-orange-700");
            btn.classList.remove("bg-indigo-600", "hover:bg-indigo-700");
        } else {
            // 未読なし: バッジ非表示、ボタンを元の青色に戻す
            badge.classList.add("hidden");
            
            btn.classList.remove("animate-pulse", "bg-orange-600", "hover:bg-orange-700");
            btn.classList.add("bg-indigo-600", "hover:bg-indigo-700");
        }
    });
}

/**
 * メッセージ履歴モーダルを表示
 */
async function showMessageHistoryModal() {
    if (!userId) {
        alert("ユーザーIDが見つかりません。再ログインしてください。");
        return;
    }

    // 開いた瞬間に未読を既読にする
    markMessagesAsRead();

    // モーダルのHTML作成（動的生成）
    const modalHtml = `
        <div class="p-6">
            <h2 class="text-xl font-bold mb-4 text-gray-800 border-b pb-2">📩 メッセージ履歴</h2>
            <div id="message-list-content" class="space-y-3 max-h-96 overflow-y-auto custom-scrollbar pr-2">
                <p class="text-gray-500 text-center py-4">読み込み中...</p>
            </div>
            <div class="mt-6 flex justify-end">
                <button id="close-msg-modal" class="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded shadow">閉じる</button>
            </div>
        </div>
    `;

    // オーバーレイ作成
    const modalOverlay = document.createElement("div");
    modalOverlay.id = "message-history-modal";
    modalOverlay.className = "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4";
    modalOverlay.innerHTML = `<div class="bg-white rounded-xl shadow-lg w-full max-w-lg animate-fade-in-up">${modalHtml}</div>`;
    
    document.body.appendChild(modalOverlay);

    // 閉じる処理
    const closeModal = () => {
        document.body.removeChild(modalOverlay);
    };

    document.getElementById("close-msg-modal").addEventListener("click", closeModal);
    modalOverlay.addEventListener("click", (e) => {
        if (e.target === modalOverlay) closeModal();
    });

    // データの取得 (user_profiles/{uid}/messages サブコレクションを想定)
    try {
        const q = query(
            collection(db, "user_profiles", userId, "messages"),
            orderBy("createdAt", "desc"),
            limit(20)
        );
        
        const snapshot = await getDocs(q);
        const listContainer = document.getElementById("message-list-content");
        
        if (snapshot.empty) {
            listContainer.innerHTML = '<p class="text-gray-500 text-center py-4">メッセージはありません。</p>';
        } else {
            listContainer.innerHTML = "";
            snapshot.forEach(docSnap => {
                const data = docSnap.data();
                const dateObj = data.createdAt ? new Date(data.createdAt) : new Date();
                const dateStr = dateObj.toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                
                // 未読だったものは少し強調する（またはNewバッジをつける）
                const isUnread = data.read === false;
                const borderClass = isUnread ? "border-orange-300 bg-orange-50" : "border-gray-200 bg-gray-50";
                const newBadge = isUnread ? `<span class="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full ml-2">New</span>` : "";

                const item = document.createElement("div");
                item.className = `p-4 rounded-lg border ${borderClass} hover:shadow-sm transition`;
                item.innerHTML = `
                    <div class="flex justify-between items-start mb-2">
                        <div class="flex items-center">
                            <span class="font-bold text-indigo-700 text-sm">${escapeHtml(data.title || '管理者メッセージ')}</span>
                            ${newBadge}
                        </div>
                        <span class="text-xs text-gray-400">${dateStr}</span>
                    </div>
                    <p class="text-gray-700 text-sm whitespace-pre-wrap leading-relaxed">${escapeHtml(data.body || data.content || '')}</p>
                `;
                listContainer.appendChild(item);
            });
        }
    } catch (error) {
        console.error("履歴取得エラー:", error);
        const listContainer = document.getElementById("message-list-content");
        if(listContainer) {
            listContainer.innerHTML = '<p class="text-red-500 text-center py-4">履歴の読み込みに失敗しました。<br>ネットワーク接続を確認してください。</p>';
        }
    }
}

// 未読メッセージを既読にする処理
async function markMessagesAsRead() {
    try {
        const q = query(
            collection(db, "user_profiles", userId, "messages"),
            where("read", "==", false)
        );
        
        const snapshot = await getDocs(q);
        if (snapshot.empty) return;

        const batch = writeBatch(db);
        snapshot.docs.forEach(doc => {
            batch.update(doc.ref, { read: true });
        });
        
        await batch.commit();
    } catch (error) {
        console.error("Error marking messages as read:", error);
    }
}
