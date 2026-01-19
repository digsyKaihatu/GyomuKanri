// js/views/client/client.js

// ★修正: userId を追加インポート（自分の監視に必要）
import { showView, VIEWS, db, userName, userId } from "../../main.js";
import { doc, onSnapshot } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// timer.js から操作関数をインポート
import { 
    handleStartClick, 
    handleStopClick, 
    handleBreakClick, 
    restoreClientState as restoreTimerState,
    stopStatusListener 
} from "./timer.js";

import { listenForUserReservations, handleSaveBreakReservation, handleSetStopReservation, handleCancelStopReservation, deleteReservation } from "./reservations.js";
import { triggerReservationNotification } from "../../components/notification.js";
import { WORKER_URL } from "./timerState.js";

import { 
    handleTaskSelectionChange, 
    handleGoalSelectionChange, 
    handleDisplaySettingChange, 
    renderTaskOptions, 
    renderTaskDisplaySettings, 
    updateTomuraStatusDisplay,
    injectMessageHistoryButton,
    initializeDOMElements as initializeClientUIDOMElements
} from "./clientUI.js";

import { handleFixCheckout } from "./clientActions.js";
import { toggleMiniDisplay } from "./miniDisplay.js";
import { openBreakReservationModal, fixCheckoutModal, showHelpModal } from "../../components/modal/index.js";
import { stopColleaguesListener } from "./colleagues.js";

// --- DOM Element references ---
let startBtn, stopBtn, breakBtn, taskSelect, goalSelect, otherTaskInput, taskDisplaySettingsList;
let addBreakReservationBtn, breakReservationList, breakReservationSaveBtn, setStopReservationBtn, cancelStopReservationBtn;
let backButton, myRecordsButton, viewMyProgressButton, fixCheckoutButton, fixCheckoutSaveBtn;
let helpButton;


function initClientViewDOM() {
    startBtn = document.getElementById("start-btn");
    stopBtn = document.getElementById("stop-btn");
    breakBtn = document.getElementById("break-btn");
    taskSelect = document.getElementById("task-select");
    goalSelect = document.getElementById("goal-select");
    otherTaskInput = document.getElementById("other-task-input");
    taskDisplaySettingsList = document.getElementById("task-display-settings-list");

    // Reservation UI elements
    addBreakReservationBtn = document.getElementById("add-break-reservation-btn");
    breakReservationList = document.getElementById("break-reservation-list");
    breakReservationSaveBtn = document.getElementById("break-reservation-save-btn");
    setStopReservationBtn = document.getElementById("set-stop-reservation-btn");
    cancelStopReservationBtn = document.getElementById("cancel-stop-reservation-btn");

    // Navigation/Other buttons
    backButton = document.getElementById("back-to-selection-client");
    myRecordsButton = document.getElementById("my-records-btn");
    viewMyProgressButton = document.getElementById("view-my-progress-btn");
    fixCheckoutButton = document.getElementById("fix-yesterday-checkout-btn");
    fixCheckoutSaveBtn = document.getElementById("fix-checkout-save-btn");

    // Help Button
    helpButton = document.querySelector('#client-view .help-btn');
}


// リスナー解除用変数
let tomuraStatusInterval = null; // Unsubscribe から Interval に変更
let myStatusUnsubscribe = null;
let d1StatusPollingInterval = null; // ★追加: D1ステータスポーリング用
let areClientEventListenersSetup = false; // ★リスナー重複登録防止フラグ
/**
 * クライアント画面を離れる際、または初期化前のクリーンアップ処理
 */
export function cleanupClientView() {
    console.log("Cleaning up Client View listeners...");
    
    // 1. 【修正】戸村さんのステータス監視（タイマー）を止める
    if (tomuraStatusInterval) {
        clearInterval(tomuraStatusInterval);
        tomuraStatusInterval = null;
    }
    // 2. ★追加: 自分自身のステータス監視を止める
    stopListeningForMyStatus();
    stopD1StatusPolling(); // ★追加
    
    // 3. 同僚の監視を止める
    stopColleaguesListener();
    
    // 4. タイマー関連の監視（ステータス監視やループ）を止める
    stopStatusListener();
}

/**
 * クライアント画面の初期化
 */
export async function initializeClientView({ tasks }) {
    console.log("Initializing Client View...");
    
    initClientViewDOM();
    initializeClientUIDOMElements();

    // 以前のリスナーが残っている場合に備えて掃除を行う
    cleanupClientView();

    await restoreTimerState();

    // ★追加: 自分自身のステータス変化を監視開始 (自動切り替えに必須)
    listenForMyStatus();
    startD1StatusPolling(); // ★追加: D1側も監視開始

    listenForUserReservations();
    
    const taskSelect = document.getElementById("task-select");
    renderTaskOptions(tasks, taskSelect);
    renderTaskDisplaySettings(tasks);
    
    injectMessageHistoryButton();
    
    listenForTomuraStatus();
    
    // 前の画面のリスナーを停止
    stopColleaguesListener();

    // Setup event listeners for the client view
    setupClientEventListeners();
}

/**
 * ★追加: 自分自身のステータスをリアルタイム監視する関数
 * Workerが裏でステータスを変更した際に、画面を即座に同期させます。
 */
/**
 * ステータス同期のコアロジック
 * @param {Object} data 取得したステータスデータ
 * @param {string} source データのソース ('firestore' | 'd1')
 */
async function syncStatus(data, source) {
    if (!data) return;

    // ★追加判定：Workerによって更新されたばかりかどうか
    const isWorkerUpdate = data.lastUpdatedBy === 'worker';
    // 以前の状態（ローカル）と比較
    const prevTask = localStorage.getItem("currentTask");

    // データの正規化 (Firestore Timestamp 対策)
    let dbStartTime = data.startTime;
    if (dbStartTime && typeof dbStartTime.toDate === 'function') {
        dbStartTime = dbStartTime.toDate().toISOString();
    } else if (dbStartTime && dbStartTime.seconds) {
        dbStartTime = new Date(dbStartTime.seconds * 1000).toISOString();
    }

    // ■■■ 予約通知・Worker更新対応ブロック ■■■
    // ユーザーの要望により、予約通知に関しては D1 側のみで判定を行う
    if (isWorkerUpdate && source === 'd1') {
        const lastNotified = localStorage.getItem("lastNotifiedWorkerUpdate");
        const currentUpdateId = data.updatedAt ? (data.updatedAt.seconds || data.updatedAt) : null;

        if (currentUpdateId && lastNotified !== String(currentUpdateId)) {
            // 更新時刻をチェックして、古すぎる通知（ログイン時など）を防ぐ
            let lastUpdate = null;
            if (data.updatedAt) {
                if (typeof data.updatedAt.toDate === 'function') lastUpdate = data.updatedAt.toDate();
                else if (data.updatedAt.seconds) lastUpdate = new Date(data.updatedAt.seconds * 1000);
                else lastUpdate = new Date(data.updatedAt);
            }
            const now = new Date();
            const diffSeconds = lastUpdate ? (now - lastUpdate) / 1000 : 999999;

            if (diffSeconds < 600) { // 10分以内の更新のみ通知
                // 1. 休憩開始の判定
                // Firebase(Firestore)とのレースに勝つため、prevTaskのチェックは外します
                if (data.currentTask === '休憩') {
                    console.log(`[${source}] Workerによる休憩開始を検知。`);
                    triggerReservationNotification("休憩開始");
                    localStorage.setItem("lastNotifiedWorkerUpdate", String(currentUpdateId));
                }
                // 2. 自動帰宅の判定
                else if (!(data.isWorking === 1 || data.isWorking === true)) {
                    console.log(`[${source}] Workerによる自動帰宅を検知。`);
                    triggerReservationNotification("帰宅");
                    localStorage.setItem("lastNotifiedWorkerUpdate", String(currentUpdateId));
                }
            } else {
                // 古い更新の場合は通知せず、既読扱いにする
                localStorage.setItem("lastNotifiedWorkerUpdate", String(currentUpdateId));
            }
        }
    }
    // ■■■ ここまで ■■■

    // 通常の同期ロジック
    const dbIsWorking = data.isWorking === 1 || data.isWorking === true;
    if (dbIsWorking) {
        localStorage.setItem("isWorking", "1");
        if (data.currentTask) localStorage.setItem("currentTask", data.currentTask);
        if (dbStartTime) localStorage.setItem("startTime", dbStartTime);

        if (data.currentGoalId) localStorage.setItem("currentGoalId", data.currentGoalId);
        else localStorage.removeItem("currentGoalId");

        const goalTitle = data.currentGoalTitle || data.currentGoal;
        if (goalTitle) localStorage.setItem("currentGoal", goalTitle);
        else localStorage.removeItem("currentGoal");
    } else {
        localStorage.removeItem("isWorking");
        localStorage.removeItem("currentTask");
        localStorage.removeItem("startTime");
        localStorage.removeItem("currentGoal");
        localStorage.removeItem("currentGoalId");
        localStorage.removeItem("preBreakTask");
        localStorage.removeItem("gyomu_timer_current_status");
    }

    if (data.preBreakTask) {
        let preTask = data.preBreakTask;
        if (typeof preTask === 'string') {
            try { preTask = JSON.parse(preTask); } catch (e) { console.error(e); }
        }
        localStorage.setItem("preBreakTask", JSON.stringify(preTask));
        const State = await import("./timerState.js");
        State.setPreBreakTask(preTask);
    }

    await restoreTimerState();
}

// ★追加: D1ステータスポーリングを開始する関数
function startD1StatusPolling() {
    if (!userId || d1StatusPollingInterval) return;

    console.log("D1 status polling started.");
    const poll = async () => {
        // タブの状態に関わらず実行（予約通知のため）
        // ただし、バックグラウンド時は頻度を落とすなどの配慮は可能
        try {
            const resp = await fetch(`${WORKER_URL}/get-all-status`);
            if (resp.ok) {
                const allStatus = await resp.json();
                const myData = allStatus.find(u => u.userId === userId);
                if (myData) {
                    await syncStatus(myData, 'd1');
                }
            }
        } catch (error) {
            console.error("D1 polling error:", error);
        }
    };

    poll();
    d1StatusPollingInterval = setInterval(poll, 30000); // 30秒おき
}

function stopD1StatusPolling() {
    if (d1StatusPollingInterval) {
        clearInterval(d1StatusPollingInterval);
        d1StatusPollingInterval = null;
        console.log("D1 status polling stopped.");
    }
}

// ★追加: 自分自身のステータスをリアルタイム監視する関数
function listenForMyStatus() {
    if (!userId || myStatusUnsubscribe) return;

    // Firestoreの自分のドキュメントを監視
    myStatusUnsubscribe = onSnapshot(doc(db, "work_status", userId), async (docSnap) => {
        if (docSnap.exists()) {
            await syncStatus(docSnap.data(), 'firestore');
        } 
    }, (error) => {
        console.error("Error listening to my status:", error);
    });
}

function stopListeningForMyStatus() {
    if (myStatusUnsubscribe) {
        myStatusUnsubscribe();
        myStatusUnsubscribe = null;
    }
}

/**
 * イベントリスナーの設定
 */
export function setupClientEventListeners() {
    if (areClientEventListenersSetup) {
        return; // リスナーが既にセットアップされていれば何もしない
    }
    console.log("Setting up Client View event listeners for the first time...");

    // Timer control buttons
    if (startBtn) startBtn.onclick = handleStartClick;
if (stopBtn) stopBtn.onclick = () => handleStopClick(false);
if (breakBtn) breakBtn.onclick = () => handleBreakClick(false);
    
    // Task and Goal selection
    taskSelect?.addEventListener("change", handleTaskSelectionChange);
    goalSelect?.addEventListener("change", handleGoalSelectionChange);

    // Other task input
    otherTaskInput?.addEventListener("change", handleTaskSelectionChange);
    otherTaskInput?.addEventListener("blur", handleTaskSelectionChange);

    // Task display preferences
    taskDisplaySettingsList?.addEventListener("change", handleDisplaySettingChange);
    
    // ミニ表示ボタン
    taskDisplaySettingsList?.addEventListener("click", (e) => {
        if (e.target.id === "toggle-mini-display-btn") {
            toggleMiniDisplay();
        }
    });

    // --- Reservation UI Listeners ---
    addBreakReservationBtn?.addEventListener("click", () => openBreakReservationModal());
    
    breakReservationList?.addEventListener("click", (event) => {
        const target = event.target;
        const id = target.dataset.id;
        if (!id) return;

        if (target.classList.contains("edit-break-reservation-btn")) {
            openBreakReservationModal(id);
        } else if (target.classList.contains("delete-break-reservation-btn")) {
            deleteReservation(id);
        }
    });

    breakReservationSaveBtn?.addEventListener("click", handleSaveBreakReservation);
    setStopReservationBtn?.addEventListener("click", handleSetStopReservation);
    cancelStopReservationBtn?.addEventListener("click", handleCancelStopReservation);

    // --- Navigation and Other Buttons ---
    backButton?.addEventListener("click", () => showView(VIEWS.MODE_SELECTION));

    myRecordsButton?.addEventListener("click", () => {
        if (userName) {
            showView(VIEWS.PERSONAL_DETAIL, { userName: userName });
        } else {
            console.error("Cannot show personal records: userName is not defined.");
        }
    });

    viewMyProgressButton?.addEventListener("click", () => {
        window.isProgressViewReadOnly = true;
        showView(VIEWS.PROGRESS);
    });

    fixCheckoutButton?.addEventListener("click", () => {
        if (fixCheckoutModal) {
            const dateInput = fixCheckoutModal.querySelector("#fix-checkout-date-input");
            const cancelBtn = fixCheckoutModal.querySelector("#fix-checkout-cancel-btn");
            const descP = fixCheckoutModal.querySelector("p");

            if (cancelBtn) cancelBtn.style.display = "inline-block";

            if (descP) {
                descP.textContent = "修正したい日付と、その日の正しい退勤時刻を入力してください。入力した時刻でその日の最後の業務が終了され、それ以降の記録は削除されます。";
                descP.classList.remove("text-red-600", "font-bold");
            }

            if (dateInput) {
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                dateInput.value = yesterday.toISOString().split("T")[0];
            }
            fixCheckoutModal.classList.remove("hidden");
        } else {
            console.error("Fix checkout modal not found.");
        }
    });

    fixCheckoutSaveBtn?.addEventListener("click", handleFixCheckout);

    // Help Button
    helpButton?.addEventListener('click', () => showHelpModal('client'));

    document.addEventListener("visibilitychange", () => {
        const isClientViewActive = document.getElementById(VIEWS.CLIENT)?.classList.contains('active-view');
        if (!isClientViewActive) return;

        if (document.hidden) {
            // Firestoreは非アクティブ時に停止して節約する
            stopListeningForMyStatus();
        } else {
            // アクティブになったら即座に同期
            listenForMyStatus();
            // D1ポーリングも即座に1回実行して最新にする（任意）
            // fetchMyStatusFromD1();
        }
    });

    areClientEventListenersSetup = true; // ★フラグを立てる
    console.log("Client View event listeners set up complete.");
}

// 【修正】戸村さんの状況をD1から取得して表示する関数
function listenForTomuraStatus() {
    // すでに動いているタイマーがあれば止める
    if (tomuraStatusInterval) {
        clearInterval(tomuraStatusInterval);
    }

    const WORKER_URL = "https://muddy-night-4bd4.sora-yamashita.workers.dev";
    const todayStr = new Date().toISOString().split("T")[0];

    const fetchStatus = async () => {
        if (document.hidden) return;
        try {
            const resp = await fetch(`${WORKER_URL}/get-tomura-status`);
            if (resp.ok) {
                const data = await resp.json();
                
                // 日付が今日のものかチェック（Worker側でも考慮されていますが念のため）
                let statusData = {
                    status: data.status || "声掛けNG",
                    location: data.location || ""
                };

                // もし日付が今日でない場合は、デフォルトに戻す
                if (data.date && data.date !== todayStr) {
                    statusData = { status: "声掛けNG", location: "出社" };
                }
                
                // UI表示を更新（既存のclientUI.jsの関数を呼び出し）
                updateTomuraStatusDisplay(statusData);
            }
        } catch (error) {
            console.error("戸村ステータス(D1)取得エラー:", error);
        }
    };

    // 初回実行
    fetchStatus();
    // 10秒おきに最新の状態を確認
    tomuraStatusInterval = setInterval(fetchStatus, 60000);
}
