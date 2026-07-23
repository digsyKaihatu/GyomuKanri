// js/views/personalDetail/requestModal/countCorrectForm.js
import { escapeHtml } from "../../../utils.js";
import { fetchModalTimelineLogs } from "./index.js"; // ★ 親モジュールからインポート

export function renderCountCorrectFormHTML(defaultDate) {
    return `
    <div class="grid grid-cols-3 gap-x-6 gap-y-4 w-full animate-fade-in">
        <div class="space-y-4">
            <div class="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-2">
                <span class="font-bold block text-sm text-amber-900">🔢 工数件数の修正操作手順</span>
                <p>① 中央の「工数件数の修正をしたい日付入力」を選択します。</p>
                <p>② 「タイムライン履歴」から、件数を修正したい過去ログをクリックして選択してください。</p>
                <p>③ 右側の入力欄に元の登録件数が自動表示されます。<strong>※工数が設定されているログのみ件数の修正が可能です。</strong></p>
            </div>
        </div>
        
        <div class="space-y-3 flex flex-col">
            <div>
                <div class="flex justify-between items-center mb-1">
                    <label class="block text-sm font-bold text-gray-700">工数件数の修正をしたい日付入力</label>
                    <button type="button" id="req-countcorrect-refresh-btn" class="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 transition" title="Firestoreから最新データを再取得">
                        🔄 最新に更新
                    </button>
                </div>
                <input type="date" id="req-countcorrect-date" value="${defaultDate}" class="block w-full border border-gray-300 rounded-lg p-2 text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500">
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
        
        <div class="space-y-4 flex flex-col">
            <input type="hidden" id="req-countcorrect-log-id" value="">
            <input type="hidden" id="req-countcorrect-task-name" value="">
            <input type="hidden" id="req-countcorrect-goal-id" value="">
            <input type="hidden" id="req-countcorrect-goal-title" value="">
            <input type="hidden" id="req-countcorrect-before-count" value="0">

            <div>
                <label class="block text-sm font-bold text-gray-700">選択された業務・工数名</label>
                <input type="text" id="req-countcorrect-task-display" class="mt-1 block w-full border border-gray-300 rounded-lg p-2 text-sm bg-gray-100 text-gray-600 focus:outline-none" readonly placeholder="(タイムライン履歴から選択)">
            </div>
            <div>
                <label class="block text-sm font-bold text-gray-700">修正後の成果件数を入力</label>
                <input type="number" id="req-countcorrect-value" min="0" class="mt-1 block w-full border border-gray-300 rounded-lg p-3 text-lg font-bold bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" placeholder="0" disabled>
            </div>
            <div class="flex flex-col flex-grow">
                <label class="block text-sm font-bold text-gray-700">理由（自由記述）</label>
                <textarea id="req-countcorrect-memo" class="mt-1 block w-full border border-gray-300 rounded-lg p-2 text-sm bg-white resize-none flex-grow min-h-[100px] focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" placeholder="修正理由など" disabled></textarea>
            </div>
        </div>
    </div>`;
}

export function initCountCorrectForm() {
    const correctDateInput = document.getElementById("req-countcorrect-date");
    const refreshBtn = document.getElementById("req-countcorrect-refresh-btn");

    if (!correctDateInput) return;

    correctDateInput.addEventListener("change", (e) => { 
        fetchCountTimeline(e.target.value, false); 
    });

    refreshBtn?.addEventListener("click", () => {
        const dateVal = correctDateInput.value;
        if (dateVal) {
            fetchCountTimeline(dateVal, true);
        }
    });

    fetchCountTimeline(correctDateInput.value, false);
}

async function fetchCountTimeline(dateStr, forceRefresh = false) {
    const container = document.getElementById("req-countcorrect-timeline-container");
    const cacheBadge = document.getElementById("req-countcorrect-cache-badge");
    if (!container) return;

    resetCountInputs();

    container.innerHTML = '<p class="text-center text-gray-400 py-4 text-xs animate-pulse">業務記録を取得中...</p>';
    if (cacheBadge) cacheBadge.textContent = "☁️ 通信中...";

    try {
        // ★ 親モジュールの index.js 経由で共有ログを取得
        const { logs, isCache } = await fetchModalTimelineLogs(dateStr, forceRefresh);

        if (cacheBadge) {
            cacheBadge.textContent = isCache ? "⚡ キャッシュ表示中" : "☁️ Firestoreから同期済";
        }

        renderTimelineList(container, logs);

    } catch (error) {
        console.error("Fetch timeline error:", error);
        if (cacheBadge) cacheBadge.textContent = "";
        container.innerHTML = '<p class="text-center text-red-500 py-4 text-xs">データの同期中にエラーが発生しました。</p>';
    }
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
                    countInput.className = "mt-1 block w-full border border-gray-300 rounded-lg p-3 text-lg font-bold bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500";
                } else {
                    countInput.disabled = true;
                    countInput.placeholder = "工数未設定のため入力不可";
                    countInput.className = "mt-1 block w-full border border-gray-300 rounded-lg p-3 text-sm font-semibold bg-gray-100 text-gray-400 focus:outline-none";
                }
            }
            if (memoInput) memoInput.disabled = false;
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
            if (id === "req-countcorrect-value") {
                el.placeholder = "0";
                el.className = "mt-1 block w-full border border-gray-300 rounded-lg p-3 text-lg font-bold bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500";
            }
            if (id === "req-countcorrect-before-count") el.value = "0";
            if (id !== "req-countcorrect-log-id" && id !== "req-countcorrect-task-name" && id !== "req-countcorrect-goal-id" && id !== "req-countcorrect-goal-title" && id !== "req-countcorrect-before-count" && id !== "req-countcorrect-task-display") el.disabled = true;
        }
    });
}

export function getCountCorrectFormData() {
    const targetLogId = document.getElementById("req-countcorrect-log-id").value;
    const dateVal = document.getElementById("req-countcorrect-date").value;
    const countInput = document.getElementById("req-countcorrect-value");
    const countVal = parseInt(countInput.value, 10);
    const memoVal = document.getElementById("req-countcorrect-memo").value.trim();

    const taskName = document.getElementById("req-countcorrect-task-name").value;
    const goalId = document.getElementById("req-countcorrect-goal-id").value || null;
    const goalTitle = document.getElementById("req-countcorrect-goal-title").value || null;
    const beforeCount = parseInt(document.getElementById("req-countcorrect-before-count").value, 10) || 0;

    if (!targetLogId) throw new Error("エラー：件数を修正したいログをタイムライン履歴から選択してください。");
    if (countInput && countInput.disabled) throw new Error("エラー：選択された業務ログは工数が設定されていないため修正できません。");
    if (isNaN(countVal) || countVal < 0) throw new Error("エラー：成果件数は0以上の有効な数値を入力してください。");

    const diffCount = countVal - beforeCount;

    return {
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
}
