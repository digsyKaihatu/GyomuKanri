// js/views/personalDetail/requestModal/timeCorrectForm.js
import { allTaskObjects } from "../../../main.js";
import { escapeHtml } from "../../../utils.js";
import { subscribeModalTimelineLogs } from "./index.js";

// 📝 一時保存データ & 現在選択中の日の元ログデータ
let pendingCorrections = [];
let currentTimelineLogs = []; // 現在表示中の日の元のタイムラインログ

export function renderTimeCorrectFormHTML(defaultDate) {
    return `
    <div class="flex flex-col gap-6 w-full animate-fade-in">
        <div class="grid grid-cols-3 gap-x-6 gap-y-4 w-full">
            <!-- 左カラム：手順説明 -->
            <div class="space-y-4">
                <div class="p-4 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 space-y-2">
                    <span class="font-bold block text-sm text-blue-900">⏱️ 時間・業務の訂正操作手順</span>
                    <p>① 日付を選択し、「タイムライン履歴」から修正したいログをクリックします。</p>
                    <p>② 右側のフォームで正しい内容に上書きし、<b>「リストに追加」</b>を押します。</p>
                    <p>③ 複数件ある場合は①〜②を繰り返し、最後に下部の<b>「まとめて申請を送信」</b>を実行してください。</p>
                </div>
            </div>
            
            <!-- 中央カラム：日付・タイムライン -->
            <div class="space-y-3 flex flex-col">
                <div>
                    <label class="block text-sm font-bold text-gray-700">時間・業務の訂正をしたい日付入力</label>
                    <input type="date" id="req-correct-date" value="${defaultDate}" class="mt-1 block w-full border border-gray-300 rounded-lg p-2 text-sm bg-white focus:ring-2 focus:ring-emerald-500">
                </div>
                <div class="flex flex-col flex-grow">
                    <div class="flex justify-between items-center mb-1">
                        <label class="block text-sm font-bold text-gray-700">タイムライン履歴</label>
                        <span id="req-correct-cache-badge" class="text-[10px] text-gray-400 font-mono"></span>
                    </div>
                    <div id="req-correct-timeline-container" class="border border-gray-300 rounded-lg p-3 bg-gray-50 min-h-[220px] max-h-[320px] overflow-y-auto space-y-2 custom-scrollbar text-sm">
                        ログデータを読み込み中...
                    </div>
                </div>
            </div>
            
            <!-- 右カラム：修正フォーム -->
            <div class="space-y-3 flex flex-col">
                <input type="hidden" id="req-correct-log-id" value="">
                <input type="hidden" id="req-correct-before-start" value="">
                <input type="hidden" id="req-correct-before-end" value="">
                <input type="hidden" id="req-correct-before-task" value=""> 
                <input type="hidden" id="req-correct-before-goal-title" value="">
                
                <div>
                    <label class="block text-xs font-bold text-gray-700">変更後の業務</label>
                    <select id="req-correct-task-select" class="mt-1 block w-full border border-gray-300 rounded-lg p-2 text-sm bg-white focus:ring-2 focus:ring-emerald-500" disabled>
                        <option value="">業務を選択...</option>
                    </select>
                </div>

                <div id="req-correct-goal-container" class="hidden">
                    <label class="block text-xs font-bold text-gray-700">工数プルダウン</label>
                    <select id="req-correct-goal-select" class="mt-1 block w-full border border-gray-300 rounded-lg p-2 text-sm bg-gray-100 text-gray-500 focus:outline-none" disabled>
                        <option value="">工数を選択 (任意)</option>
                    </select>
                </div>

                <div class="grid grid-cols-2 gap-2">
                    <div>
                        <label class="block text-xs font-bold text-gray-700">開始時間</label>
                        <input type="time" id="req-correct-start-time" class="mt-1 block w-full border border-gray-300 rounded-lg p-2 text-sm bg-white focus:ring-2 focus:ring-emerald-500" disabled>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-gray-700">終了時間</label>
                        <input type="time" id="req-correct-end-time" class="mt-1 block w-full border border-gray-300 rounded-lg p-2 text-sm bg-white focus:ring-2 focus:ring-emerald-500" disabled>
                    </div>
                </div>

                <div class="flex flex-col flex-grow">
                    <label class="block text-xs font-bold text-gray-700">訂正理由・メモ (任意)</label>
                    <textarea id="req-correct-memo" class="mt-1 block w-full border border-gray-300 rounded-lg p-2 text-sm bg-white resize-none min-h-[50px] focus:ring-2 focus:ring-emerald-500" placeholder="申請理由など" disabled></textarea>
                </div>

                <!-- ➕ リスト追加ボタン -->
                <button type="button" id="btn-add-correction-queue" class="w-full py-2 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white font-bold rounded-lg transition text-sm shadow-sm flex items-center justify-center gap-1" disabled>
                    <span>➕ 申請リストに追加</span>
                </button>
            </div>
        </div>

        <!-- 📋 申請待ち（一時保存）リストエリア -->
        <div class="border-t pt-4">
            <div class="flex justify-between items-center mb-2">
                <h4 class="text-sm font-bold text-gray-800 flex items-center gap-2">
                    🛒 申請予定の訂正リスト
                    <span id="pending-count-badge" class="bg-emerald-100 text-emerald-800 text-xs px-2 py-0.5 rounded-full font-bold">0件</span>
                </h4>
                
                <!-- ⏱️ 申請適用後の合計稼働時間表示エリア -->
                <div class="text-xs font-bold text-gray-700 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                    <span>⏱️ 申請適用後の想定稼働時間:</span>
                    <span id="simulated-total-work-time" class="text-blue-700 font-mono text-sm font-extrabold">0時間0分</span>
                </div>
            </div>
            <div id="pending-list-container" class="border border-gray-200 rounded-xl bg-gray-50 p-3 min-h-[90px] max-h-[180px] overflow-y-auto space-y-2 text-xs">
                <p class="text-center text-gray-400 py-4">追加された申請データはありません。</p>
            </div>
        </div>
    </div>`;
}

export function initTimeCorrectForm() {
    pendingCorrections = [];
    currentTimelineLogs = [];

    const taskSelect = document.getElementById("req-correct-task-select");
    const correctDateInput = document.getElementById("req-correct-date");
    const addBtn = document.getElementById("btn-add-correction-queue");

    if (!taskSelect || !correctDateInput) return;

    taskSelect.innerHTML = '<option value="">業務を選択...</option>';
    const sortedTasks = [...allTaskObjects].sort((a, b) => a.name.localeCompare(b.name, "ja"));
    sortedTasks.forEach(task => {
        const opt = document.createElement("option");
        opt.value = task.name;
        opt.textContent = task.name;
        taskSelect.appendChild(opt);
    });

    taskSelect.addEventListener("change", (e) => {
        updateCorrectGoalDropdown(e.target.value, null);
    });

    correctDateInput.addEventListener("change", (e) => {
        setupRealtimeTimeline(e.target.value);
    });

    if (addBtn) {
        addBtn.addEventListener("click", () => {
            try {
                addCurrentToPendingList();
            } catch (err) {
                alert(err.message);
            }
        });
    }

    setupRealtimeTimeline(correctDateInput.value);
}

/**
 * ⏱️ 時刻文字列 (HH:MM) を分（数値）に変換
 */
function toMinutes(timeStr) {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(":").map(Number);
    return h * 60 + m;
}

/**
 * 🔍 指定日のログ一覧に対し、カート（pendingCorrections）内の修正を反映させたシミュレーションログ配列を生成
 */
function getSimulatedLogsForDate(dateStr, testPendingList = pendingCorrections) {
    return currentTimelineLogs.map(log => {
        const correction = testPendingList.find(p => p.targetLogId === log.id && p.requestDate === dateStr);
        if (correction) {
            return {
                id: log.id,
                task: correction.data.task,
                startTimeStr: correction.data.afterStartTime,
                endTimeStr: correction.data.afterEndTime,
                isCorrected: true
            };
        }
        return {
            id: log.id,
            task: log.task,
            startTimeStr: log.startTimeStr,
            endTimeStr: log.endTimeStr,
            isCorrected: false
        };
    });
}

/**
 * ⚠️ 時間の重複・かぶりチェック
 */
function checkTimeOverlap(simulatedLogs) {
    for (let i = 0; i < simulatedLogs.length; i++) {
        for (let j = i + 1; j < simulatedLogs.length; j++) {
            const logA = simulatedLogs[i];
            const logB = simulatedLogs[j];

            const startA = toMinutes(logA.startTimeStr);
            const endA = toMinutes(logA.endTimeStr);
            const startB = toMinutes(logB.startTimeStr);
            const endB = toMinutes(logB.endTimeStr);

            // 重複の数学的判定条件: (startA < endB) かつ (startB < endA)
            if (startA < endB && startB < endA) {
                return `「${logA.task} (${logA.startTimeStr}～${logA.endTimeStr})」と「${logB.task} (${logB.startTimeStr}～${logB.endTimeStr})」の時間がかぶっています！`;
            }
        }
    }
    return null; // かぶりなし
}

/**
 * 🧮 申請適用後の合計稼働時間（休憩除く）を算出
 */
function calculateSimulatedTotalWorkTime(dateStr) {
    const simulatedLogs = getSimulatedLogsForDate(dateStr);
    let totalMinutes = 0;

    simulatedLogs.forEach(log => {
        // 「休憩」は稼働時間から除外
        if (log.task === "休憩") return;

        const start = toMinutes(log.startTimeStr);
        const end = toMinutes(log.endTimeStr);
        if (end > start) {
            totalMinutes += (end - start);
        }
    });

    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${h}時間${m}分`;
}

/**
 * 現在フォームに入力されている修正内容を検証し、キューに追加する
 */
function addCurrentToPendingList() {
    const targetLogId = document.getElementById("req-correct-log-id").value;
    const beforeStart = document.getElementById("req-correct-before-start").value;
    const beforeEnd = document.getElementById("req-correct-before-end").value;
    const beforeTask = document.getElementById("req-correct-before-task").value; 
    const beforeGoalTitle = document.getElementById("req-correct-before-goal-title").value;
    const dateVal = document.getElementById("req-correct-date").value;
    const taskName = document.getElementById("req-correct-task-select").value;
    const startTime = document.getElementById("req-correct-start-time").value;
    const endTime = document.getElementById("req-correct-end-time").value;
    const memoVal = document.getElementById("req-correct-memo").value.trim();
    
    const goalSelect = document.getElementById("req-correct-goal-select");
    const goalContainer = document.getElementById("req-correct-goal-container");

    if (!targetLogId) throw new Error("修正したいタイムラインログを選択してください。");
    if (!taskName || !startTime || !endTime) throw new Error("業務、開始時間、終了時間は必須です。");
    if (startTime >= endTime) throw new Error("終了時間は開始時間より後の時刻にしてください。");

    // 重複追加の防止チェック
    if (pendingCorrections.some(item => item.targetLogId === targetLogId)) {
        throw new Error("このログに対する修正はすでにリストに追加されています。");
    }

    let goalId = null;
    let goalTitle = null;
    if (goalSelect && goalContainer && !goalContainer.classList.contains("hidden") && !goalSelect.disabled && goalSelect.value) {
        goalId = goalSelect.value;
        if (goalSelect.selectedIndex > 0) {
            goalTitle = goalSelect.options[goalSelect.selectedIndex].text.split(" (目標:")[0];
        }
    }

    let timeDifference = "変更なし";
    if (beforeStart && beforeEnd && startTime && endTime) {
        const diffBefore = toMinutes(beforeEnd) - toMinutes(beforeStart);
        const diffAfter = toMinutes(endTime) - toMinutes(startTime);
        const diffMin = diffAfter - diffBefore;
        
        if (diffMin === 0) {
            timeDifference = "±0分";
        } else {
            const sign = diffMin > 0 ? "+" : "-";
            const absMin = Math.abs(diffMin);
            const h = Math.floor(absMin / 60);
            const m = absMin % 60;
            timeDifference = h > 0 ? `${sign}${h}時間${m}分` : `${sign}${m}分`;
        }
    }

    const newItem = {
        id: `pending-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        requestDate: dateVal,
        targetLogId: targetLogId,
        data: {
            applicationType: "変更",
            reasonCategory: "時間・業務の訂正",
            beforeTask: beforeTask, 
            beforeGoalTitle: beforeGoalTitle,
            task: taskName,
            goalId: goalId,
            goalTitle: goalTitle,
            beforeStartTime: beforeStart,
            beforeEndTime: beforeEnd,
            afterStartTime: startTime,
            afterEndTime: endTime,
            timeDifference: timeDifference,
            memo: memoVal
        }
    };

    // 🚨 【追加前重複判定】この修正を追加したと仮定して時間の重複・かぶりをチェック
    const testPendingList = [...pendingCorrections, newItem];
    const simulatedLogs = getSimulatedLogsForDate(dateVal, testPendingList);
    const overlapError = checkTimeOverlap(simulatedLogs);

    if (overlapError) {
        throw new Error(overlapError); // 重複があった場合はアラートを出して追加を中止
    }

    pendingCorrections.push(newItem);
    renderPendingListUI();
    resetCorrectionInputs();
}

/**
 * 画面下部の一時保存リスト描画 & 合計稼働時間の更新
 */
function renderPendingListUI() {
    const container = document.getElementById("pending-list-container");
    const countBadge = document.getElementById("pending-count-badge");
    const totalTimeEl = document.getElementById("simulated-total-work-time");
    const currentDateVal = document.getElementById("req-correct-date")?.value;

    if (!container) return;

    if (countBadge) countBadge.textContent = `${pendingCorrections.length}件`;

    // ⏱️ 申請適用後の合計稼働時間を更新
    if (totalTimeEl && currentDateVal) {
        totalTimeEl.textContent = calculateSimulatedTotalWorkTime(currentDateVal);
    }

    if (pendingCorrections.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-400 py-4">追加された申請データはありません。</p>';
        return;
    }

    container.innerHTML = "";
    pendingCorrections.forEach((item, index) => {
        const div = document.createElement("div");
        div.className = "flex justify-between items-center bg-white p-2.5 rounded-lg border border-gray-200 shadow-sm gap-3";
        
        const d = item.data;
        div.innerHTML = `
            <div class="flex-grow min-w-0 grid grid-cols-12 gap-2 items-center">
                <span class="col-span-2 font-mono text-gray-500 font-bold whitespace-nowrap">${item.requestDate}</span>
                <div class="col-span-5 flex items-center gap-1 truncate">
                    <span class="text-gray-400 line-through truncate">${d.beforeStartTime}-${d.beforeEndTime} (${escapeHtml(d.beforeTask)})</span>
                    <span class="shrink-0">➔</span>
                    <span class="font-bold text-blue-600 truncate">${d.afterStartTime}-${d.afterEndTime} (${escapeHtml(d.task)})</span>
                </div>
                <div class="col-span-3 text-emerald-600 font-bold text-right whitespace-nowrap">${d.timeDifference}</div>
                <div class="col-span-2 text-gray-400 truncate">${escapeHtml(d.memo || "メモなし")}</div>
            </div>
            <button type="button" class="btn-remove-pending text-red-500 hover:text-red-700 font-bold px-2 py-1 rounded hover:bg-red-50 text-xs whitespace-nowrap shrink-0" data-index="${index}">
                削除
            </button>
        `;

        div.querySelector(".btn-remove-pending").addEventListener("click", (e) => {
            const idx = parseInt(e.currentTarget.getAttribute("data-index"), 10);
            pendingCorrections.splice(idx, 1);
            renderPendingListUI();
        });

        container.appendChild(div);
    });
}

function updateCorrectGoalDropdown(selectedTaskName, selectedGoalValue) {
    const goalContainer = document.getElementById("req-correct-goal-container");
    const goalSelect = document.getElementById("req-correct-goal-select");

    if (!goalSelect || !goalContainer) return;

    goalSelect.innerHTML = '<option value="">工数を選択 (任意)</option>';
    goalSelect.disabled = true;

    if (selectedTaskName === "休憩") {
        goalSelect.innerHTML = '<option value="">休憩は工数項目なし</option>';
        goalSelect.className = "mt-1 block w-full border border-gray-300 rounded-lg p-2 text-sm bg-gray-100 text-gray-400 focus:outline-none";
        goalContainer.classList.remove("hidden");
        return;
    }

    if (!selectedTaskName) {
        goalContainer.classList.add("hidden");
        return;
    }

    const foundTask = allTaskObjects.find(t => t.name === selectedTaskName);
    const activeGoals = (foundTask?.goals || []).filter(g => !g.isComplete);

    if (activeGoals.length > 0) {
        activeGoals.forEach(goal => {
            const opt = document.createElement("option");
            opt.value = goal.id || goal.title;
            opt.textContent = `${goal.title} (目標: ${goal.target})`;
            goalSelect.appendChild(opt);
        });

        if (selectedGoalValue) {
            const foundOpt = Array.from(goalSelect.options).find(o => o.value === selectedGoalValue || o.textContent.split(" (目標:")[0] === selectedGoalValue);
            if (foundOpt) goalSelect.value = foundOpt.value;
        }

        goalSelect.disabled = false;
        goalSelect.className = "mt-1 block w-full border border-gray-300 rounded-lg p-2 text-sm bg-white focus:ring-2 focus:ring-emerald-500";
        goalContainer.classList.remove("hidden");
    } else {
        goalContainer.classList.add("hidden");
    }
}

function setupRealtimeTimeline(dateStr) {
    const container = document.getElementById("req-correct-timeline-container");
    const cacheBadge = document.getElementById("req-correct-cache-badge");
    if (!container) return;

    resetCorrectionInputs();

    container.innerHTML = '<p class="text-center text-gray-400 py-4 text-xs animate-pulse">業務記録を取得中...</p>';
    if (cacheBadge) cacheBadge.textContent = "☁️ 通信中...";

    subscribeModalTimelineLogs(dateStr, ({ logs, isCache, changeType }) => {
        currentTimelineLogs = logs; // 最新の元のログを退避

        if (cacheBadge) {
            if (isCache) {
                cacheBadge.textContent = "⚡ キャッシュ表示中";
            } else {
                cacheBadge.textContent = changeType ? `✨ 差分適用 (${changeType})` : "☁️ Firestore同期済";
            }
        }

        renderTimelineList(container, logs);
        renderPendingListUI(); // 元ログが取得できたら稼働時間表示も計算更新
    });
}

function renderTimelineList(container, logs) {
    if (logs.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-400 py-6 text-xs">この日の業務記録はありません。</p>';
        return;
    }

    container.innerHTML = "";
    logs.forEach(log => {
        const item = document.createElement("div");
        item.className = "timeline-log-item border border-gray-200 rounded-lg p-2.5 bg-white hover:bg-blue-50 cursor-pointer transition flex flex-col gap-1 text-xs text-gray-700 shadow-sm";
        const goalBadge = log.goalTitle ? `<span class="bg-gray-100 border text-gray-500 px-1 rounded ml-1 scale-95 inline-block truncate max-w-[130px]">${escapeHtml(log.goalTitle)}</span>` : "";
        
        item.innerHTML = `
            <div class="flex justify-between items-center font-bold">
                <span class="text-blue-600 font-mono text-sm">${log.startTimeStr} - ${log.endTimeStr}</span>
                <span class="text-gray-800">${escapeHtml(log.task)}${goalBadge}</span>
            </div>
            ${log.memo ? `<p class="text-gray-400 truncate italic mt-0.5 pl-1 border-l">💬 ${escapeHtml(log.memo)}</p>` : ""}
        `;

        item.addEventListener("click", () => {
            document.querySelectorAll(".timeline-log-item").forEach(el => el.classList.remove("bg-blue-100", "border-blue-400", "ring-2", "ring-blue-100"));
            item.classList.add("bg-blue-100", "border-blue-400", "ring-2", "ring-blue-100");

            const taskSelect = document.getElementById("req-correct-task-select");
            const startTimeInput = document.getElementById("req-correct-start-time");
            const endTimeInput = document.getElementById("req-correct-end-time");
            const memoInput = document.getElementById("req-correct-memo");
            const addBtn = document.getElementById("btn-add-correction-queue");

            document.getElementById("req-correct-log-id").value = log.id;
            
            document.getElementById("req-correct-before-start").value = log.startTimeStr;
            document.getElementById("req-correct-before-end").value = log.endTimeStr;
            document.getElementById("req-correct-before-task").value = log.task; 
            document.getElementById("req-correct-before-goal-title").value = log.goalTitle || "";

            if (taskSelect) taskSelect.value = log.task;
            if (startTimeInput) startTimeInput.value = log.startTimeStr;
            if (endTimeInput) endTimeInput.value = log.endTimeStr;
            if (memoInput) memoInput.value = log.memo || "";

            [taskSelect, startTimeInput, endTimeInput, memoInput].forEach(el => { if (el) el.disabled = false; });
            if (addBtn) addBtn.disabled = false;

            updateCorrectGoalDropdown(log.task, log.goalId || log.goalTitle);
        });

        container.appendChild(item);
    });
}

function resetCorrectionInputs() {
    const fields = ["req-correct-log-id", "req-correct-before-start", "req-correct-before-end", "req-correct-before-task", "req-correct-before-goal-title", "req-correct-task-select", "req-correct-goal-select", "req-correct-start-time", "req-correct-end-time", "req-correct-memo"];
    fields.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.value = "";
            if (!id.startsWith("req-correct-before-") && id !== "req-correct-log-id") el.disabled = true; 
        }
    });
    const addBtn = document.getElementById("btn-add-correction-queue");
    if (addBtn) addBtn.disabled = true;

    const container = document.getElementById("req-correct-goal-container");
    if (container) container.classList.add("hidden");
}

/**
 * 📦 呼び出し元（親モーダルなど）が一括送信時にデータを取り出す関数
 */
export function getPendingTimeCorrectDataList() {
    if (pendingCorrections.length === 0) {
        throw new Error("申請リストにデータが追加されていません。「リストに追加」を実行してください。");
    }
    return pendingCorrections.map(item => ({
        requestDate: item.requestDate,
        targetLogId: item.targetLogId,
        data: item.data
    }));
}
