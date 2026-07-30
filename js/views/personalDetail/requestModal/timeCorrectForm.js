// js/views/personalDetail/requestModal/timeCorrectForm.js
import { allTaskObjects, userDisplayPreferences } from "../../../main.js";
import { escapeHtml } from "../../../utils.js";
import { subscribeModalTimelineLogs } from "./index.js";

let pendingCorrections = [];
let currentTimelineLogs = []; 
let editingPendingId = null; // ✏️ 現在編集中のリストアイテムID

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
                    <p>💡 <b>開始と終了を同じ時間にすると「削除申請」になります。</b></p>
                    <p>💡 <b>リストのアイテムをクリックすると再編集できます。</b></p>
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

                <!-- ⏱️ 計算時間・削除判定のプレビュー表示エリア -->
                <div id="req-correct-time-preview" class="text-xs font-bold px-2 py-1 bg-blue-50 border border-blue-200 text-blue-800 rounded-lg flex items-center justify-between">
                    <span>⏱️ 変更後の所要時間:</span>
                    <span id="req-correct-duration-badge" class="font-mono text-sm font-extrabold">-</span>
                </div>

                <div class="flex flex-col flex-grow">
                    <label class="block text-xs font-bold text-gray-700">訂正理由・メモ (任意)</label>
                    <textarea id="req-correct-memo" class="mt-1 block w-full border border-gray-300 rounded-lg p-2 text-sm bg-white resize-none min-h-[50px] focus:ring-2 focus:ring-emerald-500" placeholder="申請理由など" disabled></textarea>
                </div>

                <!-- ➕ リスト追加／更新ボタン -->
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
            <div id="pending-list-container" class="border border-gray-200 rounded-xl bg-gray-50 p-3 h-[100px] overflow-y-auto custom-scrollbar space-y-2 text-xs">
                <p class="text-center text-gray-400 py-4">追加された申請データはありません。</p>
            </div>
        </div>
    </div>`;
}

export function initTimeCorrectForm() {
    pendingCorrections = [];
    currentTimelineLogs = [];
    editingPendingId = null;

    const taskSelect = document.getElementById("req-correct-task-select");
    const correctDateInput = document.getElementById("req-correct-date");
    const startTimeInput = document.getElementById("req-correct-start-time");
    const endTimeInput = document.getElementById("req-correct-end-time");
    const addBtn = document.getElementById("btn-add-correction-queue");

    if (!taskSelect || !correctDateInput) return;

    taskSelect.innerHTML = '<option value="">業務を選択...</option>';

    // ★ 非表示に設定されている業務を取得
    const hiddenTasks = userDisplayPreferences?.hiddenTasks || [];

    // ★ 非表示業務を除外してソート
    const filteredTasks = allTaskObjects.filter(task => !hiddenTasks.includes(task.name));
    const sortedTasks = [...filteredTasks].sort((a, b) => a.name.localeCompare(b.name, "ja"));

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

    // 時間変更時のリアルタイム計算イベント
    if (startTimeInput) startTimeInput.addEventListener("input", updateFormTimePreview);
    if (endTimeInput) endTimeInput.addEventListener("input", updateFormTimePreview);

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
 * ⏱️ フォームの開始・終了時間のリアルタイムプレビュー計算
 */
function updateFormTimePreview() {
    const startVal = document.getElementById("req-correct-start-time")?.value;
    const endVal = document.getElementById("req-correct-end-time")?.value;
    const badge = document.getElementById("req-correct-duration-badge");
    const container = document.getElementById("req-correct-time-preview");

    if (!badge || !startVal || !endVal) {
        if (badge) badge.textContent = "-";
        return;
    }

    const startMin = toMinutes(startVal);
    const endMin = toMinutes(endVal);

    if (startMin === endMin) {
        badge.textContent = "🗑️ 削除申請";
        container.className = "text-xs font-bold px-2 py-1 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center justify-between";
    } else if (endMin < startMin) {
        badge.textContent = "⚠️ 時刻エラー (終了時刻が先)";
        container.className = "text-xs font-bold px-2 py-1 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg flex items-center justify-between";
    } else {
        const diff = endMin - startMin;
        badge.textContent = `${diff}分`;
        container.className = "text-xs font-bold px-2 py-1 bg-blue-50 border border-blue-200 text-blue-800 rounded-lg flex items-center justify-between";
    }
}

function toMinutes(timeStr) {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(":").map(Number);
    return h * 60 + m;
}

function getSimulatedLogsForDate(dateStr, testPendingList = pendingCorrections) {
    return currentTimelineLogs.map(log => {
        const correction = testPendingList.find(p => p.targetLogId === log.id && p.requestDate === dateStr);
        if (correction) {
            if (correction.data.timeDifference === "削除申請") {
                return null; // 削除対象ログはシミュレーションから除外
            }
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
    }).filter(Boolean);
}

function checkTimeOverlap(simulatedLogs) {
    for (let i = 0; i < simulatedLogs.length; i++) {
        for (let j = i + 1; j < simulatedLogs.length; j++) {
            const logA = simulatedLogs[i];
            const logB = simulatedLogs[j];

            const startA = toMinutes(logA.startTimeStr);
            const endA = toMinutes(logA.endTimeStr);
            const startB = toMinutes(logB.startTimeStr);
            const endB = toMinutes(logB.endTimeStr);

            if (startA < endB && startB < endA) {
                return `「${logA.task} (${logA.startTimeStr}～${logA.endTimeStr})」と「${logB.task} (${logB.startTimeStr}～${logB.endTimeStr})」の時間がかぶっています！`;
            }
        }
    }
    return null;
}

function calculateSimulatedTotalWorkTime(dateStr) {
    const simulatedLogs = getSimulatedLogsForDate(dateStr);
    let totalMinutes = 0;

    simulatedLogs.forEach(log => {
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
    if (startTime > endTime) throw new Error("終了時間は開始時間より後の時刻にするか、同じ時刻（削除申請）にしてください。");

    if (!editingPendingId && pendingCorrections.some(item => item.targetLogId === targetLogId)) {
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

    const isDelete = (startTime === endTime);
    let timeDifference = "変更なし";
    let durationText = "";

    if (isDelete) {
        timeDifference = "削除申請";
        durationText = "削除申請";
    } else if (beforeStart && beforeEnd && startTime && endTime) {
        const diffBefore = toMinutes(beforeEnd) - toMinutes(beforeStart);
        const diffAfter = toMinutes(endTime) - toMinutes(startTime);
        const diffMin = diffAfter - diffBefore;
        durationText = `${diffAfter}分`;

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

    const updatedData = {
        applicationType: isDelete ? "削除" : "変更",
        reasonCategory: isDelete ? "記録の削除" : "時間・業務の訂正",
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
        durationText: durationText,
        memo: memoVal
    };

    if (editingPendingId) {
        const item = pendingCorrections.find(p => p.id === editingPendingId);
        if (item) {
            item.requestDate = dateVal;
            item.targetLogId = targetLogId;
            item.data = updatedData;
        }
        editingPendingId = null;
    } else {
        const newItem = {
            id: `pending-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            requestDate: dateVal,
            targetLogId: targetLogId,
            data: updatedData
        };
        pendingCorrections.push(newItem);
    }

    renderPendingListUI();
    resetCorrectionInputs();
}

function renderPendingListUI() {
    const container = document.getElementById("pending-list-container");
    const countBadge = document.getElementById("pending-count-badge");
    const totalTimeEl = document.getElementById("simulated-total-work-time");
    const currentDateVal = document.getElementById("req-correct-date")?.value;

    if (!container) return;

    if (countBadge) countBadge.textContent = `${pendingCorrections.length}件`;

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
        const isEditing = item.id === editingPendingId;
        const activeClasses = isEditing ? "bg-amber-50 border-amber-400 ring-2 ring-amber-200" : "bg-white border-gray-200 hover:border-blue-300";

        div.className = `flex justify-between items-center p-2.5 rounded-lg border shadow-sm gap-3 cursor-pointer transition ${activeClasses}`;
        
        const d = item.data;
        const timeBadgeHtml = d.timeDifference === "削除申請" 
            ? `<span class="bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold">🗑️ 削除申請</span>` 
            : `<span class="font-bold text-emerald-600">${d.timeDifference} (${d.durationText})</span>`;

        div.innerHTML = `
            <div class="flex-grow min-w-0 grid grid-cols-12 gap-2 items-center">
                <span class="col-span-2 font-mono text-gray-500 font-bold whitespace-nowrap">${item.requestDate}</span>
                <div class="col-span-5 flex items-center gap-1 truncate">
                    <span class="text-gray-400 line-through truncate">${d.beforeStartTime}-${d.beforeEndTime} (${escapeHtml(d.beforeTask)})</span>
                    <span class="shrink-0">➔</span>
                    <span class="font-bold text-blue-600 truncate">${d.afterStartTime}-${d.afterEndTime} (${escapeHtml(d.task)})</span>
                </div>
                <div class="col-span-3 text-right whitespace-nowrap">${timeBadgeHtml}</div>
                <div class="col-span-2 text-gray-400 truncate">${escapeHtml(d.memo || "メモなし")}</div>
            </div>
            <button type="button" class="btn-remove-pending text-red-500 hover:text-red-700 font-bold px-2 py-1 rounded hover:bg-red-50 text-xs whitespace-nowrap shrink-0" data-index="${index}">
                削除
            </button>
        `;

        div.addEventListener("click", (e) => {
            if (e.target.closest(".btn-remove-pending")) return;

            editingPendingId = item.id;

            document.getElementById("req-correct-log-id").value = item.targetLogId;
            document.getElementById("req-correct-before-start").value = d.beforeStartTime;
            document.getElementById("req-correct-before-end").value = d.beforeEndTime;
            document.getElementById("req-correct-before-task").value = d.beforeTask; 
            document.getElementById("req-correct-before-goal-title").value = d.beforeGoalTitle || "";

            document.getElementById("req-correct-date").value = item.requestDate;
            const taskSelect = document.getElementById("req-correct-task-select");
            const startTimeInput = document.getElementById("req-correct-start-time");
            const endTimeInput = document.getElementById("req-correct-end-time");
            const memoInput = document.getElementById("req-correct-memo");
            const addBtn = document.getElementById("btn-add-correction-queue");

            if (taskSelect) taskSelect.value = d.task;
            if (startTimeInput) startTimeInput.value = d.afterStartTime;
            if (endTimeInput) endTimeInput.value = d.afterEndTime;
            if (memoInput) memoInput.value = d.memo || "";

            [taskSelect, startTimeInput, endTimeInput, memoInput].forEach(el => { if (el) el.disabled = false; });
            
            updateCorrectGoalDropdown(d.task, d.goalId || d.goalTitle);

            if (addBtn) {
                addBtn.disabled = false;
                addBtn.innerHTML = "<span>✏️ 申請リストの項目を更新</span>";
                addBtn.className = "w-full py-2 px-4 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg transition text-sm shadow-sm flex items-center justify-center gap-1";
            }

            updateFormTimePreview();
            renderPendingListUI();
        });

        div.querySelector(".btn-remove-pending").addEventListener("click", (e) => {
            e.stopPropagation();
            const idx = parseInt(e.currentTarget.getAttribute("data-index"), 10);
            const removed = pendingCorrections.splice(idx, 1)[0];
            if (removed && removed.id === editingPendingId) {
                resetCorrectionInputs();
            }
            renderPendingListUI();
        });

        container.appendChild(div);
    });

    container.scrollTop = container.scrollHeight;
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
        currentTimelineLogs = logs;

        if (cacheBadge) {
            if (isCache) {
                cacheBadge.textContent = "⚡ キャッシュ表示中";
            } else {
                cacheBadge.textContent = changeType ? `✨ 差分適用 (${changeType})` : "☁️ Firestore同期済";
            }
        }

        renderTimelineList(container, logs);
        renderPendingListUI();
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
        const durationMin = toMinutes(log.endTimeStr) - toMinutes(log.startTimeStr);

        item.innerHTML = `
            <div class="flex justify-between items-center font-bold">
                <span class="text-blue-600 font-mono text-sm">${log.startTimeStr} - ${log.endTimeStr} (${durationMin}分)</span>
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

            // ★ 過去ログの業務が非表示に設定されていて選択肢に存在しない場合、一時的に選択肢を追加する
            if (taskSelect && log.task) {
                const exists = Array.from(taskSelect.options).some(opt => opt.value === log.task);
                if (!exists) {
                    const opt = document.createElement("option");
                    opt.value = log.task;
                    opt.textContent = `${log.task} (非表示設定中)`;
                    taskSelect.appendChild(opt);
                }
                taskSelect.value = log.task;
            }

            if (startTimeInput) startTimeInput.value = log.startTimeStr;
            if (endTimeInput) endTimeInput.value = log.endTimeStr;
            if (memoInput) memoInput.value = log.memo || "";

            [taskSelect, startTimeInput, endTimeInput, memoInput].forEach(el => { if (el) el.disabled = false; });
            
            if (addBtn) {
                addBtn.disabled = false;
                addBtn.innerHTML = "<span>➕ 申請リストに追加</span>";
                addBtn.className = "w-full py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition text-sm shadow-sm flex items-center justify-center gap-1";
            }

            updateCorrectGoalDropdown(log.task, log.goalId || log.goalTitle);
            updateFormTimePreview();
        });

        container.appendChild(item);
    });
}

function resetCorrectionInputs() {
    editingPendingId = null;
    const fields = ["req-correct-log-id", "req-correct-before-start", "req-correct-before-end", "req-correct-before-task", "req-correct-before-goal-title", "req-correct-task-select", "req-correct-goal-select", "req-correct-start-time", "req-correct-end-time", "req-correct-memo"];
    fields.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.value = "";
            if (!id.startsWith("req-correct-before-") && id !== "req-correct-log-id") el.disabled = true; 
        }
    });
    
    const addBtn = document.getElementById("btn-add-correction-queue");
    if (addBtn) {
        addBtn.disabled = true;
        addBtn.innerHTML = "<span>➕ 申請リストに追加</span>";
        addBtn.className = "w-full py-2 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white font-bold rounded-lg transition text-sm shadow-sm flex items-center justify-center gap-1";
    }

    const container = document.getElementById("req-correct-goal-container");
    if (container) container.classList.add("hidden");

    updateFormTimePreview();
}

export function getPendingTimeCorrectDataList() {
    if (pendingCorrections.length === 0) {
        throw new Error("申請リストにデータが追加されていません。「リストに追加」を実行してください。");
    }

    // 送信のタイミングで重複チェックを実行
    const dates = [...new Set(pendingCorrections.map(p => p.requestDate))];
    for (const dateStr of dates) {
        const simulatedLogs = getSimulatedLogsForDate(dateStr, pendingCorrections);
        const overlapError = checkTimeOverlap(simulatedLogs);
        if (overlapError) {
            throw new Error(`[${dateStr}] ${overlapError}`);
        }
    }

    return pendingCorrections.map(item => ({
        requestDate: item.requestDate,
        targetLogId: item.targetLogId,
        data: item.data
    }));
}
