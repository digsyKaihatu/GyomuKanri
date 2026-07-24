// js/views/personalDetail/requestModal/addForm.js
import { allTaskObjects } from "../../../main.js";
import { escapeHtml } from "../../../utils.js";
import { subscribeModalTimelineLogs } from "./index.js";

let pendingAdds = [];
let currentTimelineLogs = [];

export function renderAddFormHTML(defaultDate) {
    return `
    <div class="flex flex-col gap-6 w-full animate-fade-in">
        <div class="grid grid-cols-3 gap-x-6 gap-y-4 w-full">
            <!-- 左カラム：手順説明 -->
            <div class="space-y-4">
                <div class="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 space-y-2">
                    <span class="font-bold block text-sm text-emerald-900">➕ 記録追加の操作手順</span>
                    <p>① 追加したい日付を選択します。</p>
                    <p>② 中央のタイムライン履歴で既存ログを確認しながら右側フォームに入力します。</p>
                    <p>③ <b>「申請リストに追加」</b>を押し、複数件ある場合は繰り返し追加します。</p>
                    <p>④ 最後に下部の<b>「申請を送る」</b>ボタンでまとめて送信してください。</p>
                </div>
            </div>
            
            <!-- 中央カラム：日付・タイムライン履歴 -->
            <div class="space-y-3 flex flex-col">
                <div>
                    <label class="block text-sm font-bold text-gray-700">追加する日付</label>
                    <input type="date" id="req-add-date" value="${defaultDate}" class="mt-1 block w-full border border-gray-300 rounded-lg p-2 text-sm bg-white focus:ring-2 focus:ring-emerald-500">
                </div>
                <div class="flex flex-col flex-grow">
                    <div class="flex justify-between items-center mb-1">
                        <label class="block text-sm font-bold text-gray-700">当日のタイムライン履歴</label>
                        <span id="req-add-cache-badge" class="text-[10px] text-gray-400 font-mono"></span>
                    </div>
                    <div id="req-add-timeline-container" class="border border-gray-300 rounded-lg p-3 bg-gray-50 min-h-[200px] max-h-[280px] overflow-y-auto space-y-2 custom-scrollbar text-sm">
                        ログデータを読み込み中...
                    </div>
                </div>
            </div>
            
            <!-- 右カラム：入力フォーム -->
            <div class="space-y-3 flex flex-col">
                <div>
                    <label class="block text-xs font-bold text-gray-700">業務プルダウン</label>
                    <select id="req-add-task-select" class="mt-1 block w-full border border-gray-300 rounded-lg p-2 text-sm bg-white focus:ring-2 focus:ring-emerald-500">
                        <option value="">業務を選択...</option>
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-700">工数プルダウン</label>
                    <select id="req-add-goal-select" class="mt-1 block w-full border border-gray-300 rounded-lg p-2 text-sm bg-gray-100 text-gray-500 focus:outline-none" disabled>
                        <option value="">業務を選択してください</option>
                    </select>
                </div>
                <div class="grid grid-cols-3 gap-2">
                    <div>
                        <label class="block text-xs font-bold text-gray-700">開始時間</label>
                        <input type="time" id="req-add-start-time" value="12:00" class="mt-1 block w-full border border-gray-300 rounded-lg p-2 text-sm bg-white focus:ring-2 focus:ring-emerald-500">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-gray-700">終了時間</label>
                        <input type="time" id="req-add-end-time" value="12:45" class="mt-1 block w-full border border-gray-300 rounded-lg p-2 text-sm bg-white focus:ring-2 focus:ring-emerald-500">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-gray-700">成果件数</label>
                        <input type="number" id="req-add-count" min="0" value="0" class="mt-1 block w-full border border-gray-300 rounded-lg p-2 text-sm bg-white focus:ring-2 focus:ring-emerald-500">
                    </div>
                </div>
                <div class="flex flex-col flex-grow">
                    <label class="block text-xs font-bold text-gray-700">理由（自由記述）</label>
                    <textarea id="req-add-memo" class="mt-1 block w-full border border-gray-300 rounded-lg p-2 text-sm bg-white resize-none min-h-[40px] focus:ring-2 focus:ring-emerald-500" placeholder="補足事項など"></textarea>
                </div>

                <!-- ➕ リスト追加ボタン -->
                <button type="button" id="btn-add-queue" class="w-full py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition text-sm shadow-sm flex items-center justify-center gap-1">
                    <span>➕ 申請リストに追加</span>
                </button>
            </div>
        </div>

        <!-- 📋 申請予定（一時保存）リストエリア -->
        <div class="border-t pt-4">
            <div class="flex justify-between items-center mb-2">
                <h4 class="text-sm font-bold text-gray-800 flex items-center gap-2">
                    🛒 申請予定の追加リスト
                    <span id="pending-add-count-badge" class="bg-emerald-100 text-emerald-800 text-xs px-2 py-0.5 rounded-full font-bold">0件</span>
                </h4>
                
                <!-- ⏱️ 申請適用後の合計稼働時間表示エリア -->
                <div class="text-xs font-bold text-gray-700 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                    <span>⏱️ 申請適用後の想定稼働時間:</span>
                    <span id="simulated-add-total-work-time" class="text-blue-700 font-mono text-sm font-extrabold">0時間0分</span>
                </div>
            </div>
            <div id="pending-add-list-container" class="border border-gray-200 rounded-xl bg-gray-50 p-3 h-[100px] overflow-y-auto custom-scrollbar space-y-2 text-xs">
                <p class="text-center text-gray-400 py-4">追加された申請データはありません。</p>
            </div>
        </div>
    </div>`;
}

export function initAddForm() {
    pendingAdds = [];
    currentTimelineLogs = [];

    const taskSelect = document.getElementById("req-add-task-select");
    const dateInput = document.getElementById("req-add-date");
    const addBtn = document.getElementById("btn-add-queue");

    if (!taskSelect || !dateInput) return;

    taskSelect.innerHTML = '<option value="">業務を選択...</option>';
    const sortedTasks = [...allTaskObjects].sort((a, b) => a.name.localeCompare(b.name, "ja"));
    sortedTasks.forEach(task => {
        const opt = document.createElement("option");
        opt.value = task.name;
        opt.textContent = task.name;
        taskSelect.appendChild(opt);
    });

    taskSelect.addEventListener("change", handleTaskChange);
    dateInput.addEventListener("change", (e) => setupRealtimeTimeline(e.target.value));

    if (addBtn) {
        addBtn.addEventListener("click", () => {
            try {
                addCurrentToPendingList();
            } catch (err) {
                alert(err.message);
            }
        });
    }

    setupRealtimeTimeline(dateInput.value);
}

function handleTaskChange(e) {
    const selectedTaskName = e.target.value;
    const goalSelect = document.getElementById("req-add-goal-select");
    if (!goalSelect) return;

    if (selectedTaskName === "休憩") {
        goalSelect.innerHTML = '<option value="">休憩は工数項目なし</option>';
        goalSelect.disabled = true;
        goalSelect.className = "mt-1 block w-full border border-gray-300 rounded-lg p-2 text-sm bg-gray-100 text-gray-400 focus:outline-none";
        return;
    }
    if (!selectedTaskName) {
        goalSelect.innerHTML = '<option value="">業務を選択してください</option>';
        goalSelect.disabled = true;
        goalSelect.className = "mt-1 block w-full border border-gray-300 rounded-lg p-2 text-sm bg-gray-100 text-gray-500 focus:outline-none";
        return;
    }

    const foundTask = allTaskObjects.find(t => t.name === selectedTaskName);
    const activeGoals = (foundTask?.goals || []).filter(g => !g.isComplete);

    if (activeGoals.length > 0) {
        goalSelect.innerHTML = '<option value="">工数を選択 (任意)</option>';
        activeGoals.forEach(goal => {
            const opt = document.createElement("option");
            opt.value = goal.id || goal.title;
            opt.textContent = `${goal.title} (目標: ${goal.target})`;
            goalSelect.appendChild(opt);
        });
        goalSelect.disabled = false;
        goalSelect.className = "mt-1 block w-full border border-gray-300 rounded-lg p-2 text-sm bg-white focus:ring-2 focus:ring-emerald-500";
    } else {
        goalSelect.innerHTML = '<option value="">対応する工数項目なし</option>';
        goalSelect.disabled = true;
        goalSelect.className = "mt-1 block w-full border border-gray-300 rounded-lg p-2 text-sm bg-gray-100 text-gray-400 focus:outline-none";
    }
}

function toMinutes(timeStr) {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(":").map(Number);
    return h * 60 + m;
}

function getSimulatedLogsForDate(dateStr, testPendingList = pendingAdds) {
    const existing = currentTimelineLogs.map(log => ({
        task: log.task,
        startTimeStr: log.startTimeStr,
        endTimeStr: log.endTimeStr
    }));

    const added = testPendingList
        .filter(p => p.requestDate === dateStr)
        .map(p => ({
            task: p.data.task,
            startTimeStr: p.data.afterStartTime,
            endTimeStr: p.data.afterEndTime
        }));

    return [...existing, ...added];
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
        if (end > start) totalMinutes += (end - start);
    });

    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${h}時間${m}分`;
}

function addCurrentToPendingList() {
    const dateVal = document.getElementById("req-add-date").value;
    const startTime = document.getElementById("req-add-start-time").value;
    const endTime = document.getElementById("req-add-end-time").value;
    const taskName = document.getElementById("req-add-task-select").value;
    const goalSelect = document.getElementById("req-add-goal-select");
    const countVal = parseInt(document.getElementById("req-add-count").value, 10) || 0;
    const memoVal = document.getElementById("req-add-memo").value.trim();

    if (!dateVal || !startTime || !endTime || !taskName) {
        throw new Error("日付、時間、業務内容は必須入力です。");
    }
    if (startTime >= endTime) {
        throw new Error("終了時間は開始時間より後の時刻にしてください。");
    }

    const goalId = goalSelect && !goalSelect.disabled && goalSelect.value ? goalSelect.value : null;
    let goalTitle = null;
    if (goalSelect && !goalSelect.disabled && goalSelect.selectedIndex > 0) {
        goalTitle = goalSelect.options[goalSelect.selectedIndex].text.split(" (目標:")[0];
    }

    const durationMin = toMinutes(endTime) - toMinutes(startTime);

    const newItem = {
        id: `pending-add-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        requestDate: dateVal,
        data: {
            applicationType: "追加",
            reasonCategory: "記録の追加",
            task: taskName,
            goalId: goalId,
            goalTitle: goalTitle,
            beforeStartTime: "",
            beforeEndTime: "",
            afterStartTime: startTime,
            afterEndTime: endTime,
            timeDifference: `+${durationMin}分`,
            count: countVal,
            memo: memoVal
        }
    };

    const testPendingList = [...pendingAdds, newItem];
    const simulatedLogs = getSimulatedLogsForDate(dateVal, testPendingList);
    const overlapError = checkTimeOverlap(simulatedLogs);

    if (overlapError) throw new Error(overlapError);

    pendingAdds.push(newItem);
    renderPendingListUI();
}

function renderPendingListUI() {
    const container = document.getElementById("pending-add-list-container");
    const countBadge = document.getElementById("pending-add-count-badge");
    const totalTimeEl = document.getElementById("simulated-add-total-work-time");
    const currentDateVal = document.getElementById("req-add-date")?.value;

    if (!container) return;

    if (countBadge) countBadge.textContent = `${pendingAdds.length}件`;
    if (totalTimeEl && currentDateVal) {
        totalTimeEl.textContent = calculateSimulatedTotalWorkTime(currentDateVal);
    }

    if (pendingAdds.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-400 py-4">追加された申請データはありません。</p>';
        return;
    }

    container.innerHTML = "";
    pendingAdds.forEach((item, index) => {
        const div = document.createElement("div");
        div.className = "flex justify-between items-center bg-white p-2.5 rounded-lg border border-gray-200 shadow-sm gap-3";
        const d = item.data;
        div.innerHTML = `
            <div class="flex-grow min-w-0 grid grid-cols-12 gap-2 items-center">
                <span class="col-span-2 font-mono text-gray-500 font-bold whitespace-nowrap">${item.requestDate}</span>
                <div class="col-span-5 font-bold text-emerald-600 truncate">
                    ${d.afterStartTime}-${d.afterEndTime} (${escapeHtml(d.task)})
                </div>
                <div class="col-span-3 text-blue-600 font-bold text-right whitespace-nowrap">${d.timeDifference} / ${d.count}件</div>
                <div class="col-span-2 text-gray-400 truncate">${escapeHtml(d.memo || "メモなし")}</div>
            </div>
            <button type="button" class="btn-remove-pending-add text-red-500 hover:text-red-700 font-bold px-2 py-1 rounded hover:bg-red-50 text-xs shrink-0" data-index="${index}">
                削除
            </button>
        `;

        div.querySelector(".btn-remove-pending-add").addEventListener("click", (e) => {
            const idx = parseInt(e.currentTarget.getAttribute("data-index"), 10);
            pendingAdds.splice(idx, 1);
            renderPendingListUI();
        });

        container.appendChild(div);
    });

    container.scrollTop = container.scrollHeight;
}

function setupRealtimeTimeline(dateStr) {
    const container = document.getElementById("req-add-timeline-container");
    const cacheBadge = document.getElementById("req-add-cache-badge");
    if (!container) return;

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
        container.innerHTML = '<p class="text-center text-gray-400 py-4 text-xs">この日の業務記録はありません。</p>';
        return;
    }

    container.innerHTML = "";
    logs.forEach(log => {
        const item = document.createElement("div");
        item.className = "border border-gray-200 rounded-lg p-2 bg-white flex justify-between items-center text-xs text-gray-700 shadow-sm";
        item.innerHTML = `
            <div>
                <span class="text-blue-600 font-mono font-bold mr-2">${log.startTimeStr} - ${log.endTimeStr}</span>
                <span class="font-medium">${escapeHtml(log.task)}</span>
            </div>
        `;
        container.appendChild(item);
    });
}

export function getPendingAddDataList() {
    if (pendingAdds.length === 0) {
        throw new Error("申請リストにデータが追加されていません。「リストに追加」を実行してください。");
    }
    return pendingAdds.map(item => ({
        requestDate: item.requestDate,
        targetLogId: null,
        data: item.data
    }));
}
