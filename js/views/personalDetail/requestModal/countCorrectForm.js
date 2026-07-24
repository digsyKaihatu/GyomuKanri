// js/views/personalDetail/requestModal/countCorrectForm.js
import { escapeHtml } from "../../../utils.js";
import { subscribeModalTimelineLogs } from "./index.js";

let pendingCountCorrections = [];
let currentTimelineLogs = [];

export function renderCountCorrectFormHTML(defaultDate) {
    return `
    <div class="flex flex-col gap-6 w-full animate-fade-in">
        <div class="grid grid-cols-3 gap-x-6 gap-y-4 w-full">
            <!-- 左カラム：手順説明 -->
            <div class="space-y-4">
                <div class="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-2">
                    <span class="font-bold block text-sm text-amber-900">🔢 工数件数の修正操作手順</span>
                    <p>① 「工数件数の修正をしたい日付」を選択します。</p>
                    <p>② 「タイムライン履歴」から件数を修正したい過去ログをクリックして選択します。</p>
                    <p>③ 右側で件数と理由を入力し、<b>「リストに追加」</b>を押します。</p>
                    <p>④ 最後に下部の<b>「申請を送る」</b>ボタンでまとめて送信してください。</p>
                </div>
            </div>
            
            <!-- 中央カラム：日付・タイムライン -->
            <div class="space-y-3 flex flex-col">
                <div>
                    <label class="block text-sm font-bold text-gray-700">工数件数の修正をしたい日付入力</label>
                    <input type="date" id="req-countcorrect-date" value="${defaultDate}" class="mt-1 block w-full border border-gray-300 rounded-lg p-2 text-sm bg-white focus:ring-2 focus:ring-emerald-500">
                </div>
                <div class="flex flex-col flex-grow">
                    <div class="flex justify-between items-center mb-1">
                        <label class="block text-sm font-bold text-gray-700">タイムライン履歴</label>
                        <span id="req-countcorrect-cache-badge" class="text-[10px] text-gray-400 font-mono"></span>
                    </div>
                    <div id="req-countcorrect-timeline-container" class="border border-gray-300 rounded-lg p-3 bg-gray-50 min-h-[220px] max-h-[320px] overflow-y-auto space-y-2 custom-scrollbar text-sm">
                        ログデータを読み込み中...
                    </div>
                </div>
            </div>
            
            <!-- 右カラム：入力フォーム -->
            <div class="space-y-3 flex flex-col">
                <input type="hidden" id="req-countcorrect-log-id" value="">
                <input type="hidden" id="req-countcorrect-task-name" value="">
                <input type="hidden" id="req-countcorrect-goal-id" value="">
                <input type="hidden" id="req-countcorrect-goal-title" value="">
                <input type="hidden" id="req-countcorrect-before-count" value="0">

                <div>
                    <label class="block text-xs font-bold text-gray-700">選択された業務・工数名</label>
                    <input type="text" id="req-countcorrect-task-display" class="mt-1 block w-full border border-gray-300 rounded-lg p-2 text-sm bg-gray-100 text-gray-600 focus:outline-none" readonly placeholder="(タイムライン履歴から選択)">
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-700">修正後の成果件数を入力</label>
                    <input type="number" id="req-countcorrect-value" min="0" class="mt-1 block w-full border border-gray-300 rounded-lg p-2 text-base font-bold bg-white focus:ring-2 focus:ring-emerald-500" placeholder="0" disabled>
                </div>
                <div class="flex flex-col flex-grow">
                    <label class="block text-xs font-bold text-gray-700">理由（自由記述）</label>
                    <textarea id="req-countcorrect-memo" class="mt-1 block w-full border border-gray-300 rounded-lg p-2 text-sm bg-white resize-none min-h-[50px] focus:ring-2 focus:ring-emerald-500" placeholder="修正理由など" disabled></textarea>
                </div>

                <!-- ➕ リスト追加ボタン -->
                <button type="button" id="btn-countcorrect-queue" class="w-full py-2 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white font-bold rounded-lg transition text-sm shadow-sm flex items-center justify-center gap-1" disabled>
                    <span>➕ 申請リストに追加</span>
                </button>
            </div>
        </div>

        <!-- 📋 申請予定の訂正リストエリア -->
        <div class="border-t pt-4">
            <div class="flex justify-between items-center mb-2">
                <h4 class="text-sm font-bold text-gray-800 flex items-center gap-2">
                    🛒 申請予定の件数訂正リスト
                    <span id="pending-count-badge" class="bg-emerald-100 text-emerald-800 text-xs px-2 py-0.5 rounded-full font-bold">0件</span>
                </h4>
                
                <!-- ⏱️ 申請適用後の想定稼働時間表示エリア -->
                <div class="text-xs font-bold text-gray-700 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                    <span>⏱️ 申請適用後の想定稼働時間:</span>
                    <span id="simulated-count-total-work-time" class="text-blue-700 font-mono text-sm font-extrabold">0時間0分</span>
                </div>
            </div>
            <div id="pending-count-list-container" class="border border-gray-200 rounded-xl bg-gray-50 p-3 h-[100px] overflow-y-auto custom-scrollbar space-y-2 text-xs">
                <p class="text-center text-gray-400 py-4">追加された申請データはありません。</p>
            </div>
        </div>
    </div>`;
}

export function initCountCorrectForm() {
    pendingCountCorrections = [];
    currentTimelineLogs = [];

    const correctDateInput = document.getElementById("req-countcorrect-date");
    const addBtn = document.getElementById("btn-countcorrect-queue");

    if (!correctDateInput) return;

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

function toMinutes(timeStr) {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(":").map(Number);
    return h * 60 + m;
}

function calculateSimulatedTotalWorkTime() {
    let totalMinutes = 0;
    currentTimelineLogs.forEach(log => {
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
    const targetLogId = document.getElementById("req-countcorrect-log-id").value;
    const dateVal = document.getElementById("req-countcorrect-date").value;
    const countInput = document.getElementById("req-countcorrect-value");
    const countVal = parseInt(countInput.value, 10);
    const memoVal = document.getElementById("req-countcorrect-memo").value.trim();

    const taskName = document.getElementById("req-countcorrect-task-name").value;
    const goalId = document.getElementById("req-countcorrect-goal-id").value || null;
    const goalTitle = document.getElementById("req-countcorrect-goal-title").value || null;
    const beforeCount = parseInt(document.getElementById("req-countcorrect-before-count").value, 10) || 0;

    if (!targetLogId) throw new Error("件数を修正したいログをタイムライン履歴から選択してください。");
    if (countInput && countInput.disabled) throw new Error("選択された業務ログは工数が設定されていないため修正できません。");
    if (isNaN(countVal) || countVal < 0) throw new Error("成果件数は0以上の有効な数値を入力してください。");

    if (pendingCountCorrections.some(item => item.targetLogId === targetLogId)) {
        throw new Error("このログに対する件数修正はすでにリストに追加されています。");
    }

    const diffCount = countVal - beforeCount;

    const newItem = {
        id: `pending-count-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        requestDate: dateVal,
        targetLogId: targetLogId,
        data: {
            applicationType: "変更",
            reasonCategory: "工数件数の修正",
            task: taskName,
            goalId: goalId,
            goalTitle: goalTitle,
            beforeStartTime: "",
            beforeEndTime: "",
            afterStartTime: "",
            afterEndTime: "",
            timeDifference: diffCount >= 0 ? `+${diffCount}件` : `${diffCount}件`,
            count: countVal,
            memo: memoVal
        }
    };

    pendingCountCorrections.push(newItem);
    renderPendingListUI();
    resetCountInputs();
}

function renderPendingListUI() {
    const container = document.getElementById("pending-count-list-container");
    const countBadge = document.getElementById("pending-count-badge");
    const totalTimeEl = document.getElementById("simulated-count-total-work-time");

    if (!container) return;

    if (countBadge) countBadge.textContent = `${pendingCountCorrections.length}件`;
    if (totalTimeEl) {
        totalTimeEl.textContent = calculateSimulatedTotalWorkTime();
    }

    if (pendingCountCorrections.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-400 py-4">追加された申請データはありません。</p>';
        return;
    }

    container.innerHTML = "";
    pendingCountCorrections.forEach((item, index) => {
        const div = document.createElement("div");
        div.className = "flex justify-between items-center bg-white p-2.5 rounded-lg border border-gray-200 shadow-sm gap-3";
        const d = item.data;
        div.innerHTML = `
            <div class="flex-grow min-w-0 grid grid-cols-12 gap-2 items-center">
                <span class="col-span-2 font-mono text-gray-500 font-bold whitespace-nowrap">${item.requestDate}</span>
                <div class="col-span-5 font-bold text-amber-700 truncate">
                    ${escapeHtml(d.task)}${d.goalTitle ? ` (${escapeHtml(d.goalTitle)})` : ""}
                </div>
                <div class="col-span-3 text-emerald-600 font-bold text-right whitespace-nowrap">変更後: ${d.count}件 (${d.timeDifference})</div>
                <div class="col-span-2 text-gray-400 truncate">${escapeHtml(d.memo || "メモなし")}</div>
            </div>
            <button type="button" class="btn-remove-pending-count text-red-500 hover:text-red-700 font-bold px-2 py-1 rounded hover:bg-red-50 text-xs shrink-0" data-index="${index}">
                削除
            </button>
        `;

        div.querySelector(".btn-remove-pending-count").addEventListener("click", (e) => {
            const idx = parseInt(e.currentTarget.getAttribute("data-index"), 10);
            pendingCountCorrections.splice(idx, 1);
            renderPendingListUI();
        });

        container.appendChild(div);
    });

    container.scrollTop = container.scrollHeight;
}

function setupRealtimeTimeline(dateStr) {
    const container = document.getElementById("req-countcorrect-timeline-container");
    const cacheBadge = document.getElementById("req-countcorrect-cache-badge");
    if (!container) return;

    resetCountInputs();

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
        item.className = "timeline-log-item border border-gray-200 rounded-lg p-2.5 bg-white hover:bg-blue-50 cursor-pointer transition flex items-center justify-between text-xs text-gray-700 shadow-sm";
        const goalBadge = log.goalTitle ? `<span class="bg-gray-100 border text-gray-500 px-1 rounded ml-1 scale-95 inline-block truncate max-w-[130px]">${escapeHtml(log.goalTitle)}</span>` : "";
        
        item.innerHTML = `
            <div class="flex items-center">
                <span class="text-blue-600 font-mono text-sm font-bold mr-2">${log.startTimeStr} - ${log.endTimeStr}</span>
                <span class="text-gray-800 font-medium">${escapeHtml(log.task)}${goalBadge}</span>
            </div>
            <span class="bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded scale-95">現件数: ${log.count}</span>
        `;

        item.addEventListener("click", () => {
            document.querySelectorAll("#req-countcorrect-timeline-container .timeline-log-item").forEach(el => el.classList.remove("bg-blue-100", "border-blue-400", "ring-2", "ring-blue-100"));
            item.classList.add("bg-blue-100", "border-blue-400", "ring-2", "ring-blue-100");

            const displayInput = document.getElementById("req-countcorrect-task-display");
            const countInput = document.getElementById("req-countcorrect-value");
            const memoInput = document.getElementById("req-countcorrect-memo");
            const addBtn = document.getElementById("btn-countcorrect-queue");

            document.getElementById("req-countcorrect-log-id").value = log.id;
            document.getElementById("req-countcorrect-task-name").value = log.task;
            document.getElementById("req-countcorrect-goal-id").value = log.goalId || "";
            document.getElementById("req-countcorrect-goal-title").value = log.goalTitle || "";
            document.getElementById("req-countcorrect-before-count").value = log.count;
            
            const goalText = log.goalTitle ? ` (${log.goalTitle})` : "";
            if (displayInput) displayInput.value = `${log.task}${goalText}`;
            
            if (countInput) {
                countInput.value = log.count;
                if (log.goalTitle) {
                    countInput.disabled = false;
                    countInput.placeholder = "0";
                } else {
                    countInput.disabled = true;
                    countInput.placeholder = "工数未設定のため入力不可";
                }
            }
            if (memoInput) memoInput.disabled = false;
            if (addBtn) addBtn.disabled = !log.goalTitle;
        });
        container.appendChild(item);
    });
}

function resetCountInputs() {
    const fields = ["req-countcorrect-log-id", "req-countcorrect-task-name", "req-countcorrect-goal-id", "req-countcorrect-goal-title", "req-countcorrect-before-count", "req-countcorrect-task-display", "req-countcorrect-value", "req-countcorrect-memo"];
    fields.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.value = "";
            if (id === "req-countcorrect-value") el.placeholder = "0";
            if (id === "req-countcorrect-before-count") el.value = "0";
            if (!id.startsWith("req-countcorrect-before-") && id !== "req-countcorrect-log-id" && id !== "req-countcorrect-task-name" && id !== "req-countcorrect-goal-id" && id !== "req-countcorrect-goal-title" && id !== "req-countcorrect-task-display") el.disabled = true;
        }
    });
    const addBtn = document.getElementById("btn-countcorrect-queue");
    if (addBtn) addBtn.disabled = true;
}

export function getPendingCountCorrectDataList() {
    if (pendingCountCorrections.length === 0) {
        throw new Error("申請リストにデータが追加されていません。「リストに追加」を実行してください。");
    }
    return pendingCountCorrections.map(item => ({
        requestDate: item.requestDate,
        targetLogId: item.targetLogId,
        data: item.data
    }));
}
