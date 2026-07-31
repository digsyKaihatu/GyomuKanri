// js/views/host/host.js

import { db, showView, VIEWS } from "../../main.js"; 
// ★修正: getCountFromServer をインポートに追加
import { doc, setDoc, onSnapshot, collection, query, where, getDocs, addDoc, getDoc, getCountFromServer } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { openMessageModal, showHelpModal } from "../../components/modal/index.js"; 
import { openExportExcelModal } from "../../excelExport.js"; 

import { startListeningForStatusUpdates, stopListeningForStatusUpdates, forceStopUser } from "./statusDisplay.js";
import { startListeningForUsers, stopListeningForUsers, handleUserDetailClick, handleDeleteAllLogs } from "./userManagement.js";
import { WORKER_URL } from "../client/timerState.js";

// DOM要素 (遅延初期化)
let backButton, exportExcelButton, viewProgressButton, viewReportButton, deleteAllLogsButton, userListContainer, helpButton, tomuraStatusRadios;

function initializeDOMElements() {
    backButton = document.getElementById("back-to-selection-host");
    exportExcelButton = document.getElementById("export-excel-btn");
    viewProgressButton = document.getElementById("view-progress-btn");
    viewReportButton = document.getElementById("view-report-btn");
    deleteAllLogsButton = document.getElementById("delete-all-logs-btn");
    userListContainer = document.getElementById("summary-list");
    helpButton = document.querySelector('#host-view .help-btn');
    tomuraStatusRadios = document.querySelectorAll('input[name="tomura-status"]');
}

// --- 既存機能: 戸村さんステータスUI ---
function injectTomuraLocationUI() {
    if (document.getElementById("tomura-location-container")) return;

    const statusRadio = document.querySelector('#host-view input[name="tomura-status"]');
    
    if (statusRadio) {
        const radioGroupParent = statusRadio.parentElement.parentElement; 

        if (radioGroupParent) {
            const wrapper = document.createElement("div");
            wrapper.id = "tomura-location-container";
            
            wrapper.innerHTML = `
                <div class="flex gap-4">
                    <label class="flex items-center cursor-pointer hover:bg-gray-50 p-1 rounded transition">
                        <input type="radio" name="tomura-location" value="出社" class="form-radio h-4 w-4 text-blue-600">
                        <span class="ml-2 text-gray-800 text-sm font-bold">🏢 出社</span>
                    </label>
                    <label class="flex items-center cursor-pointer hover:bg-gray-50 p-1 rounded transition">
                        <input type="radio" name="tomura-location" value="リモート" class="form-radio h-4 w-4 text-orange-500">
                        <span class="ml-2 text-gray-800 text-sm font-bold">🏠 リモート</span>
                    </label>
                </div>
            `;
            radioGroupParent.insertBefore(wrapper, statusRadio.parentElement);

            const radios = wrapper.querySelectorAll('input[name="tomura-location"]');
            radios.forEach(radio => {
                radio.addEventListener("change", updateTomuraStatusOnD1);
            });
        }
    }
}

// --- 承認ボタンの注入 ---
function injectApprovalButton() {
    // ボタンが既に存在していたら何もしない
    if (document.getElementById("view-approval-btn")) return;
    
    const referenceBtn = document.getElementById("view-report-btn");
    
    if (referenceBtn) {
        // ボタンが入っている親リスト（space-y-3 の div）を取得
        const buttonList = referenceBtn.parentElement;

        // ボタン要素を作成
        const btn = document.createElement("button");
        btn.id = "view-approval-btn";
        
        // 他のボタンと同じクラス構成にする
        btn.className = "w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-4 rounded-lg transition shadow-sm flex items-center justify-center gap-2";
        
        btn.innerHTML = `
            <span>📩 業務時間申請を確認・承認する</span>
            <span id="approval-badge" class="bg-white text-orange-600 text-xs font-bold px-2 py-1 rounded-full hidden shadow-sm">0</span>
        `;
        
        btn.onclick = () => showView(VIEWS.APPROVAL);

        // リストの最後に追加
        buttonList.appendChild(btn);
    }
}

// --- ★修正: getCountFromServer を用いた件数取得処理 ---
let approvalPollingInterval = null;
let lastApprovalCount = 0;

export async function fetchApprovalCount() {
    const btn = document.getElementById("view-approval-btn");
    const badge = document.getElementById("approval-badge");
    if (!btn || !badge) return;

    try {
        const q = query(collection(db, "work_log_requests"), where("status", "==", "pending"));
        
        // サーバーからドキュメント本文を取得せず、件数のみを取得（コスト節約）
        const snapshot = await getCountFromServer(q);
        const count = snapshot.data().count;

        if (count > 0) {
            // 件数が増加した場合に通知を送信
            if (Notification.permission === "granted" && count > lastApprovalCount) {
                new Notification("業務報告の承認依頼", {
                    body: `${count}件の承認待ちがあります。`,
                    icon: "/path/to/icon.png"
                });
            }

            badge.textContent = `${count}件`;
            badge.classList.remove("hidden");
            btn.classList.add("animate-pulse");
        } else {
            badge.classList.add("hidden");
            btn.classList.remove("animate-pulse");
        }

        lastApprovalCount = count;
    } catch (error) {
        console.error("承認件数の取得エラー:", error);
    }
}

function startListeningForApprovals() {
    if (approvalPollingInterval) clearInterval(approvalPollingInterval);

    // 初回取得
    fetchApprovalCount();

    // 定期取得（30秒間隔）
    approvalPollingInterval = setInterval(fetchApprovalCount, 30000);
}

function stopListeningForApprovals() {
    if (approvalPollingInterval) {
        clearInterval(approvalPollingInterval);
        approvalPollingInterval = null;
    }
}

export function initializeHostView() {
    initializeDOMElements();
    
    injectTomuraLocationUI();
    injectApprovalButton();

    startListeningForStatusUpdates(); 
    startListeningForUsers();      
    listenForTomuraStatus();
    startListeningForApprovals();
    setupHostEventListeners();
}

export function cleanupHostView() {
    stopListeningForStatusUpdates(); 
    stopListeningForUsers();      
    stopListeningForApprovals();
}

export function setupHostEventListeners() {
    backButton?.addEventListener("click", () => showView(VIEWS.MODE_SELECTION));
    viewProgressButton?.addEventListener("click", () => {
        window.isProgressViewReadOnly = false; 
        showView(VIEWS.PROGRESS);
    });
    viewReportButton?.addEventListener("click", () => showView(VIEWS.REPORT));
    exportExcelButton?.addEventListener("click", openExportExcelModal); 
    deleteAllLogsButton?.addEventListener("click", handleDeleteAllLogs); 

    tomuraStatusRadios.forEach((radio) => {
        radio.addEventListener("change", handleTomuraStatusChange);
    });
    
    userListContainer?.addEventListener("click", (event) => {
        handleUserDetailClick(event.target);
    });

    helpButton?.addEventListener('click', () => showHelpModal('host'));
}

async function updateTomuraStatusOnD1(newData) {
    try {
        await fetch(`${WORKER_URL}/update-tomura-status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newData)
        });
    } catch (error) {
        console.error("戸村ステータス更新エラー:", error);
    }
}

async function handleTomuraStatusChange(event) {
    const status = event.target.value;
    const location = document.querySelector('input[name="tomura-location"]:checked')?.value || "出社";
    await updateTomuraStatusOnD1({ status, location });
}

function updateUI(data) {
    if (!data) return;

    if (data.status) {
        const radio = document.querySelector(`input[name="tomura-status"][value="${data.status}"]`);
        if (radio) radio.checked = true;
    }

    if (data.location) {
        const radio = document.querySelector(`input[name="tomura-location"][value="${data.location}"]`);
        if (radio) radio.checked = true;
    }
}

let tomuraPollingInterval = null;
let lastTomuraDataCache = null;

async function fetchTomuraStatus(force = false) {
    if (document.hidden && !force) return;

    try {
        const resp = await fetch(`${WORKER_URL}/get-tomura-status`);
        if (resp.ok) {
            let data = await resp.json();
            
            const todayStr = new Date().toISOString().split("T")[0];
            if (data.date && data.date !== todayStr) {
                data = { status: "声掛けNG", location: "出社" };
            }

            const dataStr = JSON.stringify(data);

            if (dataStr !== lastTomuraDataCache) {
                updateUI(data);
                lastTomuraDataCache = dataStr;
            }
        }
    } catch (error) {
        console.error("D1 戸村ステータス取得エラー:", error);
    }
}

async function listenForTomuraStatus() {
    if (tomuraPollingInterval) clearInterval(tomuraPollingInterval);

    fetchTomuraStatus();
    tomuraPollingInterval = setInterval(fetchTomuraStatus, 30000);
}

// タブ表示切り替え時の制御
document.addEventListener("visibilitychange", () => {
    const isHostViewActive = document.getElementById(VIEWS.HOST)?.classList.contains('active-view');
    if (!isHostViewActive) return;

    if (document.hidden) {
        stopListeningForUsers();
    } else {
        fetchTomuraStatus();
        fetchApprovalCount(); // ★画面復帰時に承認件数も即座に再取得
        startListeningForUsers();
        startListeningForApprovals();
    }
});

document.addEventListener('force-fetch-status', () => {
    fetchTomuraStatus(true);
});

// --- メッセージ機能の実装 ---
function injectMessageFeature() {
    const existingModal = document.getElementById("message-modal");
    if (existingModal) {
        existingModal.remove();
    }

    const modalHtml = `
    <div id="message-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center hidden z-50 p-4">
        <div class="bg-white p-6 rounded-xl shadow-lg max-w-lg w-full">
            <h2 class="text-xl font-bold mb-4 text-gray-700 border-b pb-2">📢 メッセージ送信</h2>
            
            <div class="mb-4">
                <label class="block text-sm font-bold text-gray-700 mb-2">送信先を選択</label>
                <div class="flex gap-4 mb-3">
                    <label class="flex items-center cursor-pointer"><input type="radio" name="message-target-type" value="individual" class="mr-1" checked>個人</label>
                    <label class="flex items-center cursor-pointer"><input type="radio" name="message-target-type" value="working" class="mr-1">現在の業務中</label>
                    <label class="flex items-center cursor-pointer"><input type="radio" name="message-target-type" value="manual" class="mr-1">手動選択</label>
                </div>

                <div id="message-target-individual-container">
                    <select id="message-user-select" class="w-full p-2 border rounded bg-white"></select>
                </div>

                <div class="hidden bg-blue-50 p-3 rounded text-blue-800 text-sm mb-2">
                    <div class="mb-2 font-bold text-gray-700">対象の業務を選択:</div>
                    <select id="message-working-task-select" class="w-full p-2 border border-blue-300 rounded bg-white text-gray-800 font-bold mb-2"></select>
                    <span id="message-target-working-info" class="text-xs text-gray-500"></span>
                </div>

                <div id="message-target-manual-container" class="hidden border rounded max-h-32 overflow-y-auto p-2 bg-gray-50">
                    <div id="message-manual-list" class="space-y-1"></div>
                </div>
            </div>

            <div class="mb-3">
                <label class="block text-sm font-bold text-gray-700 mb-1">タイトル</label>
                <input type="text" id="message-title-input" class="w-full p-2 border rounded" placeholder="例: 連絡事項">
            </div>
            
            <div class="mb-6">
                <label class="block text-sm font-bold text-gray-700 mb-1">メッセージ内容</label>
                <textarea id="message-body-input" rows="4" class="w-full p-2 border rounded" placeholder="メッセージを入力してください"></textarea>
            </div>

            <div class="flex justify-end gap-3">
                <button id="message-cancel-btn" class="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded">キャンセル</button>
                <button id="message-send-btn" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded flex items-center gap-2">
                    <span>送信</span> 🚀
                </button>
            </div>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    const approvalBtn = document.getElementById("view-approval-btn");
    const referenceBtn = document.getElementById("view-report-btn");
    
    if (referenceBtn && !document.getElementById("open-message-modal-btn")) {
        const buttonList = referenceBtn.parentElement; 

        const msgBtn = document.createElement("button");
        msgBtn.id = "open-message-modal-btn";
        msgBtn.className = "w-full bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg transition shadow-sm flex items-center justify-center gap-2";
        msgBtn.innerHTML = `📢 メッセージを作成・送信する`;

        if (approvalBtn) {
            buttonList.insertBefore(msgBtn, approvalBtn);
        } else {
            buttonList.appendChild(msgBtn);
        }

        msgBtn.addEventListener("click", handleOpenMessageModal);
    }
}

async function handleOpenMessageModal() {
    if (typeof openMessageModal !== 'function') {
        alert("エラー: モーダル機能が読み込めていません。");
        return;
    }

    try {
        const usersSnap = await getDocs(collection(db, "user_profiles"));
        const allUsers = usersSnap.docs.map(doc => {
            const data = doc.id === doc.data().name ? {} : doc.data(); 
            return {
                id: doc.id, 
                displayName: data.displayName || data.name || "名称未設定"
            };
        }).sort((a, b) => a.displayName.localeCompare(b.displayName, "ja"));

        const statusSnap = await getDocs(collection(db, "work_status"));
        
        const workingData = {
            all: [],     
            byTask: {}   
        };

        statusSnap.forEach(doc => {
            const data = doc.data();
            if (data.isWorking && data.currentTask && data.currentTask !== "休憩") {
                const uid = doc.id; 
                let taskName = data.currentTask;

                if (taskName.startsWith("その他_")) {
                    taskName = taskName.replace("その他_", "");
                }

                workingData.all.push(uid);

                if (!workingData.byTask[taskName]) {
                    workingData.byTask[taskName] = [];
                }
                workingData.byTask[taskName].push(uid);
            }
        });

        openMessageModal(allUsers, workingData, executeSendMessage);

    } catch (error) {
        console.error("データ取得エラー:", error);
        alert("送信先データの取得に失敗しました。");
    }
}

async function executeSendMessage(targetIds, title, bodyContent) {
    if (!targetIds || targetIds.length === 0) {
        console.error("【送信エラー】送信対象のIDリストが空です。");
        return;
    }

    const confirmMsg = `${targetIds.length}名にメッセージを送信しますか？`;
    if (!confirm(confirmMsg)) return;

    try {
        const timestamp = new Date().toISOString();
        const writePromises = targetIds.map(uid => {
            return addDoc(collection(db, "user_profiles", uid, "messages"), {
                title: title,
                body: bodyContent,
                createdAt: timestamp,
                read: false,
                sender: "管理者"
            });
        });
        await Promise.all(writePromises);

        const sendMessageUrl = `${WORKER_URL}/send-message`;
        
        let errorReport = [];
        let successTotal = 0;

        const sendPromises = targetIds.map(async (uid) => {
            try {
                const response = await fetch(sendMessageUrl, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        targetUserId: uid,
                        title: title,
                        body: bodyContent
                    })
                });

                const result = await response.json();

                if (!result.success) {
                    const msg = result.error || "詳細不明のエラー";
                    const debugInfo = result.debug ? ` | Debug: ${result.debug}` : "";
                    errorReport.push(`${uid}: ${msg}${debugInfo}`);
                } else {
                    successTotal += result.sent || 0;
                }
            } catch (e) {
                console.error(`--- [通信エラー] UID: ${uid} ---`, e);
                errorReport.push(`${uid}: 通信エラー ${e.message}`);
            }
        });

        await Promise.all(sendPromises);

        if (errorReport.length > 0) {
            alert(`【送信結果レポート】\n成功: ${successTotal}件\nエラー: ${errorReport.length}件\n\n詳細はブラウザのコンソール(F12)を確認してください。`);
        } else {
            alert(`送信完了！\n${successTotal}名に通知を送りました。`);
        }

    } catch (error) {
        console.error("全体処理エラー:", error);
        alert("処理中に予期せぬエラーが発生しました。");
    }
}
