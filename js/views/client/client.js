// js/views/client/client.js

// ★修正: userId を追加インポート（自分の監視に必要）
import { showView, VIEWS, db, userName, userId } from "../../main.js";
import { doc, onSnapshot } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import * as State from "./timerState.js"; // ★追加: これが必要です

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

let pollingWorker; // 変数定義を変更

export function cleanupClientView() {
    
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
    
    initClientViewDOM();
    initializeClientUIDOMElements();

    // 以前のリスナーが残っている場合に備えて掃除を行う
    cleanupClientView();

    await restoreTimerState();

    // ★追加: ここで退勤忘れチェックを実行
    // utils.js 側で画面チェックを入れたので、ここでは呼ぶだけでOK
    checkForCheckoutCorrection(userId);

    // ★追加: 自分自身のステータス変化を監視開始 (自動切り替えに必須)
    listenForMyStatus();

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
    if (!data || Object.keys(data).length === 0) return;

    // ★判定：Workerによって更新されたばかりかどうか
    const isWorkerUpdate = data.lastUpdatedBy === 'worker' || data.lastUpdatedBy === null;

    // D1ポーリング時に lastUpdatedBy が無い場合への警告
    if (source === 'd1' && (data.lastUpdatedBy === undefined || data.lastUpdatedBy === null)) {
        console.warn(`[syncStatus] Warning: D1 data is missing 'lastUpdatedBy' column (value: ${data.lastUpdatedBy}). Notification will not trigger.`);
    }


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
    // 予約通知に関しては Worker による更新であればソースを問わず判定を行う
    // (以前はD1のみに限定していましたが、アクティブ時の反応を良くするためFirestore側でも許可します)
    if (isWorkerUpdate) {
        // 更新時刻の正規化
        let normalizedUpdatedAt = null;
        if (data.updatedAt) {
            if (typeof data.updatedAt.toDate === 'function') normalizedUpdatedAt = data.updatedAt.toDate().toISOString();
            else if (data.updatedAt.seconds) normalizedUpdatedAt = new Date(data.updatedAt.seconds * 1000).toISOString();
            else normalizedUpdatedAt = new Date(data.updatedAt).toISOString();
        }

        const lastNotified = localStorage.getItem("lastNotifiedWorkerUpdate");
        // Fallback: updatedAt がない場合は startTime を ID とする
        const currentUpdateId = normalizedUpdatedAt || (data.startTime && new Date(data.startTime).toISOString());


        if (currentUpdateId && lastNotified !== currentUpdateId) {
            const lastUpdateDate = new Date(currentUpdateId);
            const now = new Date();
            const diffSeconds = (now - lastUpdateDate) / 1000;

if (Math.abs(diffSeconds) < 600) { // 10分以内の更新のみ通知
                // 1. 休憩開始の判定
                if (data.currentTask && data.currentTask.trim() === '休憩') {
                    
                    // ★★★ ここから修正・追加 ★★★
                    // 以前の状態が「休憩」でない場合のみチェック（連続通知防止）
                    if (prevTask !== '休憩') {
                        // アクティブな予約リストを取得
                        const reservations = State.getActiveReservations();
                        // 簡易的に「break」アクションを持つ予約を探す
                        const matchingRes = reservations ? reservations.find(r => r.action === "break") : null;

                        if (matchingRes && State.isReservationNotified(matchingRes.id)) {
                            // ローカル（裏画面など）ですでに通知済みの場合はスキップ
                        } else {
                            // まだ通知していない場合
                            
                            // もし予約が見つかればフラグを立てる（同時発生時の重複防止）
                            if (matchingRes) {
                                State.markReservationAsNotified(matchingRes.id);
                            }
                            
                            triggerReservationNotification("休憩開始");
                        }
                        // 最後に通知済みIDを保存（Worker更新IDによる重複防止）
                        localStorage.setItem("lastNotifiedWorkerUpdate", currentUpdateId);
                    }
                    // ★★★ ここまで ★★★
                }
                
                // 2. 自動帰宅の判定
                else if (!(data.isWorking === 1 || data.isWorking === true)) {
                    triggerReservationNotification("帰宅");
                    localStorage.setItem("lastNotifiedWorkerUpdate", currentUpdateId);
                }
            } else {
                // 古い更新の場合は通知せず、既読扱いにする
                localStorage.setItem("lastNotifiedWorkerUpdate", currentUpdateId);
            }
        }
    }
    // ■■■ ここまで ■■■

    // ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼
    // ★追加：チラつき防止のガード節
    // 現在のローカル状態と比較し、変更がなければここで終了してUI再構築（restoreTimerState）を防ぐ
    const currentIsWorkingLocal = localStorage.getItem("isWorking") === "1";
    const newIsWorkingData = (data.isWorking === 1 || data.isWorking === true);

    // ゴールIDの取得と正規化
    const currentGoalIdLocal = localStorage.getItem("currentGoalId");
    const newGoalIdData = data.currentGoalId || data.goalId;

    // 「勤務状態」「タスク名」「ゴールID」がすべて一致している場合は更新不要
    if (currentIsWorkingLocal === newIsWorkingData &&
        prevTask === data.currentTask && // prevTaskは関数の冒頭で定義済み
        currentGoalIdLocal == newGoalIdData // nullとundefinedの差を許容するため緩やかな等価演算(==)を使用
    ) {
        return; // UI更新をスキップ
    }
    // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

    // 通常の同期ロジック
    const dbIsWorking = data.isWorking === 1 || data.isWorking === true;
    if (dbIsWorking) {
        localStorage.setItem("isWorking", "1");
        if (data.currentTask) localStorage.setItem("currentTask", data.currentTask);
        if (dbStartTime) localStorage.setItem("startTime", dbStartTime);

        // 工数（ゴール）情報の同期: 複数名への対応 (currentGoalId or goalId)
        const gId = data.currentGoalId || data.goalId;
        if (gId) localStorage.setItem("currentGoalId", gId);
        else localStorage.removeItem("currentGoalId");

        const gTitle = data.currentGoal || data.currentGoalTitle || data.goalTitle;
        if (gTitle) localStorage.setItem("currentGoal", gTitle);
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
        import("./timerState.js").then(State => State.setPreBreakTask(preTask));
    }

    await restoreTimerState();
}

// ★追加: D1ステータスポーリングを開始する関数

// ★重要: これがないと動きません。startD1StatusPolling の上あたりに追加してください
const poll = async () => {
    if (!userId) return;
    try {
        // userIdを使ってD1(Worker)から最新ステータスを取得
        const resp = await fetch(`${WORKER_URL}/get-status?userId=${userId}`);
        if (resp.ok) {
            const data = await resp.json();
            // 取得したデータで同期を実行
            await syncStatus(data, 'd1');
        }
    } catch (e) {
        console.error("Polling error:", e);
    }
};

export function startD1StatusPolling() {
    // 既存のsetIntervalがあれば消す（念のため）
    if (typeof d1StatusPollingInterval !== 'undefined') clearInterval(d1StatusPollingInterval);

    // Workerがまだなければ作成
    if (!pollingWorker) {
        pollingWorker = new Worker('js/pollingWorker.js');
        
        // Workerから「時間だよ」と連絡が来たら poll() を実行
        pollingWorker.onmessage = function(e) {
            if (e.data === 'tick') {
                poll();
            }
        };

        // Workerを開始
        pollingWorker.postMessage('start');
    }

    poll(); // 初回即時実行
}

function stopD1StatusPolling() {
    if (d1StatusPollingInterval) {
        clearInterval(d1StatusPollingInterval);
        d1StatusPollingInterval = null;
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
    document.getElementById('test-notification-btn').addEventListener('click', () => {
        triggerReservationNotification("テスト通知 (5秒後に届きます)");
        alert("通知テストを開始しました。5秒以内にブラウザを最小化するか他のタブを開いて、通知が届くか確認してください。");
    });

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
        }
    });

    areClientEventListenersSetup = true; // ★フラグを立てる
}

// 【修正】戸村さんの状況をD1から取得して表示する関数
function listenForTomuraStatus() {
    // すでに動いているタイマーがあれば止める
    if (tomuraStatusInterval) {
        clearInterval(tomuraStatusInterval);
    }

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
