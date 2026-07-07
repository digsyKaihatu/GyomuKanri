// js/views/personalDetail/requestModal/countAddForm.js
import { allTaskObjects } from "../../../main.js";

// ①「工数件数の追加」用のHTMLテンプレート
export function renderCountAddFormHTML(defaultDate) {
    return `
    <div class="grid grid-cols-3 gap-x-6 gap-y-4 w-full animate-fade-in">
        <div class="space-y-4">
            <div class="p-4 bg-orange-50 border border-orange-200 rounded-xl text-xs text-orange-800 space-y-2">
                <span class="font-bold block text-sm text-orange-900">🔢 工数件数の追加手順</span>
                <p>① 中央の「追加をしたい日付」を選択します。</p>
                <p>② 対象の「業務」と「工数」を選択してください。</p>
                <p>③ 右側の入力欄に「追加したい件数」を入力し、申請を送ってください。</p>
            </div>
        </div>
        <div class="space-y-3 flex flex-col">
            <div>
                <label class="block text-sm font-bold text-gray-700">追加をしたい日付入力</label>
                <input type="date" id="req-countadd-date" value="${defaultDate}" class="mt-1 block w-full border border-gray-300 rounded-lg p-2 text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500">
            </div>
            <div>
                <label class="block text-sm font-bold text-gray-700">業務を選択</label>
                <select id="req-countadd-task-select" class="mt-1 block w-full border border-gray-300 rounded-lg p-2 text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500">
                    <option value="">業務を選択...</option>
                </select>
            </div>
            <div id="req-countadd-goal-container" class="hidden">
                <label class="block text-sm font-bold text-gray-700">工数を選択</label>
                <select id="req-countadd-goal-select" class="mt-1 block w-full border border-gray-300 rounded-lg p-2 text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500">
                    <option value="">工数を選択...</option>
                </select>
            </div>
        </div>
        <div class="space-y-4 flex flex-col">
            <div>
                <label class="block text-sm font-bold text-gray-700">追加する件数を入力</label>
                <input type="number" id="req-countadd-value" class="mt-1 block w-full border border-gray-300 rounded-lg p-3 text-lg font-bold bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" placeholder="0">
            </div>
            <div class="flex flex-col flex-grow">
                <label class="block text-sm font-bold text-gray-700">メモ (任意)</label>
                <textarea id="req-countadd-memo" class="mt-1 block w-full border border-gray-300 rounded-lg p-2 text-sm bg-white resize-none flex-grow min-h-[80px] focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" placeholder="追加の理由など"></textarea>
            </div>
        </div>
    </div>`;
}

// ② 初期化ロジック
export function initCountAddForm() {
    const taskSelect = document.getElementById("req-countadd-task-select");
    if (!taskSelect) return;

    taskSelect.innerHTML = '<option value="">業務を選択...</option>';
    const sortedTasks = [...allTaskObjects].sort((a, b) => a.name.localeCompare(b.name, "ja"));
    
    sortedTasks.forEach(task => {
        const opt = document.createElement("option");
        opt.value = task.name;
        opt.textContent = task.name;
        taskSelect.appendChild(opt);
    });

    taskSelect.addEventListener("change", (e) => {
        const selectedTaskName = e.target.value;
        const goalContainer = document.getElementById("req-countadd-goal-container");
        const goalSelect = document.getElementById("req-countadd-goal-select");

        if (!goalSelect || !goalContainer) return;
        goalSelect.innerHTML = '<option value="">工数を選択...</option>';

        if (!selectedTaskName || selectedTaskName === "休憩") {
            goalContainer.classList.add("hidden");
            return;
        }

        const foundTask = allTaskObjects.find(t => t.name === selectedTaskName);
        const activeGoals = (foundTask?.goals || []).filter(g => !g.isComplete);

        if (activeGoals.length > 0) {
            activeGoals.forEach(goal => {
                const opt = document.createElement("option");
                opt.value = goal.id || goal.title;
                opt.textContent = goal.title;
                goalSelect.appendChild(opt);
            });
            goalContainer.classList.remove("hidden");
        } else {
            goalContainer.classList.add("hidden");
        }
    });
}

// ③ 送信データの抽出
export function getCountAddFormData() {
    const dateVal = document.getElementById("req-countadd-date").value;
    const taskName = document.getElementById("req-countadd-task-select").value;
    const goalSelect = document.getElementById("req-countadd-goal-select");
    const countVal = parseInt(document.getElementById("req-countadd-value").value, 10);
    const memoVal = document.getElementById("req-countadd-memo").value.trim();

    if (!dateVal || !taskName) {
        throw new Error("エラー：日付と業務は必須入力です。");
    }
    if (isNaN(countVal) || countVal === 0) {
        throw new Error("エラー：追加する件数を入力してください（0以外）。");
    }

    const goalId = goalSelect && goalSelect.value ? goalSelect.value : null;
    let goalTitle = null;
    if (goalSelect && goalSelect.selectedIndex > 0) {
        goalTitle = goalSelect.options[goalSelect.selectedIndex].text;
    }

    return {
        requestDate: dateVal,
        data: {
            task: taskName,
            goalId: goalId,
            goalTitle: goalTitle,
            correctionValue: countVal, // 追加用の差分数値
            memo: memoVal
        }
    };
}
