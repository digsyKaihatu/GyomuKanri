// js/views/personalDetail/requestModal/addForm.js
import { allTaskObjects } from "../../../main.js";

// ①「記録の追加」用のHTMLテンプレート
export function renderAddFormHTML(defaultDate) {
    return `
    <div class="grid grid-cols-3 gap-x-6 gap-y-4 w-full animate-fade-in">
        <div class="space-y-4">
            <div>
                <label class="block text-sm font-bold text-gray-700">追加する日付</label>
                <input type="date" id="req-add-date" value="${defaultDate}" class="mt-1 block w-full border border-gray-300 rounded-lg p-2 text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500">
            </div>
        </div>
        <div class="space-y-4">
            <div>
                <label class="block text-sm font-bold text-gray-700">業務プルダウン</label>
                <select id="req-add-task-select" class="mt-1 block w-full border border-gray-300 rounded-lg p-2 text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500">
                    <option value="">業務を選択...</option>
                </select>
            </div>
            <div>
                <label class="block text-sm font-bold text-gray-700">工数プルダウン</label>
                <select id="req-add-goal-select" class="mt-1 block w-full border border-gray-300 rounded-lg p-2 text-sm bg-gray-100 text-gray-500 focus:outline-none" disabled>
                    <option value="">業務を選択してください</option>
                </select>
            </div>
            <div>
                <label class="block text-sm font-bold text-gray-700">成果件数</label>
                <input type="number" id="req-add-count" min="0" value="0" class="mt-1 block w-full border border-gray-300 rounded-lg p-2 text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500">
            </div>
        </div>
        <div class="space-y-4 flex flex-col">
            <div class="grid grid-cols-2 gap-2">
                <div>
                    <label class="block text-sm font-bold text-gray-700">開始時間</label>
                    <input type="time" id="req-add-start-time" value="12:00" class="mt-1 block w-full border border-gray-300 rounded-lg p-2 text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500">
                </div>
                <div>
                    <label class="block text-sm font-bold text-gray-700">終了時間</label>
                    <input type="time" id="req-add-end-time" value="12:45" class="mt-1 block w-full border border-gray-300 rounded-lg p-2 text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500">
                </div>
            </div>
            <div class="flex flex-col flex-grow">
                <label class="block text-sm font-bold text-gray-700">理由（自由記述）</label>
                <textarea id="req-add-memo" class="mt-1 block w-full border border-gray-300 rounded-lg p-2 text-sm bg-white resize-none flex-grow min-h-[100px] focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" placeholder="補足事項や理由など"></textarea>
            </div>
        </div>
    </div>`;
}

export function initAddForm() {
    const taskSelect = document.getElementById("req-add-task-select");
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
            goalSelect.className = "mt-1 block w-full border border-gray-300 rounded-lg p-2 text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500";
        } else {
            goalSelect.innerHTML = '<option value="">対応する工数項目なし</option>';
            goalSelect.disabled = true;
            goalSelect.className = "mt-1 block w-full border border-gray-300 rounded-lg p-2 text-sm bg-gray-100 text-gray-400 focus:outline-none";
        }
    });

    taskSelect.value = "";
    taskSelect.dispatchEvent(new Event("change"));
}

export function getAddFormData() {
    const dateVal = document.getElementById("req-add-date").value;
    const startTime = document.getElementById("req-add-start-time").value;
    const endTime = document.getElementById("req-add-end-time").value;
    const taskName = document.getElementById("req-add-task-select").value;
    const goalSelect = document.getElementById("req-add-goal-select");
    const countVal = parseInt(document.getElementById("req-add-count").value, 10) || 0;
    const memoVal = document.getElementById("req-add-memo").value.trim();

    if (!dateVal || !startTime || !endTime || !taskName) {
        throw new Error("エラー：日付、時間、業務内容は必須入力です。");
    }
    if (startTime >= endTime) {
        throw new Error("エラー：終了時間は開始時間より後の時刻にしてください。");
    }

    const goalId = goalSelect && !goalSelect.disabled && goalSelect.value ? goalSelect.value : null;
    let goalTitle = null;
    if (goalSelect && !goalSelect.disabled && goalSelect.selectedIndex > 0) {
        goalTitle = goalSelect.options[goalSelect.selectedIndex].text.split(" (目標:")[0];
    }

    // 差異の自動計算
    const [sH, sM] = startTime.split(":").map(Number);
    const [eH, eM] = endTime.split(":").map(Number);
    const durationMin = (eH * 60 + eM) - (sH * 60 + sM);

    return {
        requestDate: dateVal,
        data: {
            applicationType: "追加",        // 【要件】申請種別
            reasonCategory: "記録の追加",     // 【要件】理由（区分）
            task: taskName,                  // 【要件】案件名
            goalId: goalId,
            goalTitle: goalTitle,
            beforeStartTime: "",             // 【要件】修正前の時間
            beforeEndTime: "",
            afterStartTime: startTime,       // 【要件】修正後の時間
            afterEndTime: endTime,
            timeDifference: `+${durationMin}分`, // 【要件】差異
            count: countVal,
            memo: memoVal                    // 【要件】理由（自由記述）
        }
    };
}
