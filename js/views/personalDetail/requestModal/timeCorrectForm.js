// js/views/personalDetail/requestModal/timeCorrectForm.js
import { db, userId, allTaskObjects } from "../../../main.js";
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { escapeHtml } from "../../../utils.js";

// ①「時間・業務の訂正」用のHTMLテンプレート
export function renderTimeCorrectFormHTML(defaultDate) {
    return `
    <div class="grid grid-cols-3 gap-x-6 gap-y-4 w-full animate-fade-in">
        
        <div class="space-y-4">
            <div class="p-4 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 space-y-2">
                <span class="font-bold block text-sm text-blue-900">⏱️ 時間・業務の訂正操作手順</span>
                <p>① 中央の「時間・業務の訂正をしたい日付入力」を選択します。</p>
                <p>② 「タイムライン履歴」から、修正・訂正したい稼働ログをクリックして選択してください。</p>
                <p>③ 右側の入力欄にデータが反映されるので、正しい時間や業務内容に上書きし「申請を送る」を実行します。</p>
            </div>
        </div>
        
        <div class="space-y-3 flex flex-col">
            <div>
                <label class="block text-sm font-bold text-gray-700">時間・業務の訂正をしたい日付入力</label>
                <input type="date" id="req-correct-date" value="${defaultDate}" class="mt-1 block w-full border border-gray-300 rounded-lg p-2 text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500">
            </div>
            <div class="flex flex-col flex-grow">
                <label class="block text-sm font-bold text-gray-700">タイムライン履歴</label>
                <div id="req-correct-timeline-container" class="mt-1 border border-gray-300 rounded-lg p-3 bg-gray-50 min-h-[220px] max-h-[320px] overflow-y-auto space-y-2 custom-scrollbar text-sm">
                    ログデータを読み込み中...
                </div>
            </div>
        </div>
        
        <div class="space-y-4 flex flex-col">
            <input type="hidden" id="req-correct-log-id" value="">
            <div>
                <label class="block text-sm font-bold text-gray-700">変更したい業務のプルダウン</label>
                <select id="req-correct-task-select" class="mt-1 block w-full border border-gray-300 rounded-lg p-2 text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" disabled>
                    <option value="">業務を選択...</option>
                </select>
            </div>

            <div id="req-correct-goal-container" class="hidden">
                <label class="block text-sm font-bold text-gray-700">工数プルダウン</label>
                <select id="req-correct-goal-select" class="mt-1 block w-full border border-gray-300 rounded-lg p-2 text-sm bg-gray-100 text-gray-500 focus:outline-none" disabled>
                    <option value="">工数を選択 (任意)</option>
                </select>
            </div>

            <div>
                <label class="block text-sm font-bold text-gray-700">開始時間記入</label>
                <input type="time" id="req-correct-start-time" class="mt-1 block w-full border border-gray-300 rounded-lg p-2 text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" disabled>
            </div>
            <div>
                <label class="block text-sm font-bold text-gray-700">終了時間記入</label>
                <input type="time" id="req-correct-end-time" class="mt-1 block w-full border border-gray-300 rounded-lg p-2 text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" disabled>
            </div>
            <div class="flex flex-col flex-grow">
                <label class="block text-sm font-bold text-gray-700">訂正の理由・メモ (任意)</label>
                <textarea id="req-correct-memo" class="mt-1 block w-full border border-gray-300 rounded-lg p-2 text-sm bg-white resize-none flex-grow min-h-[60px] focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" placeholder="申請理由など" disabled></textarea>
            </div>
        </div>
        
    </div>`;
}

// ② タイムライン自動取得 & プルダウン初期化
export function initTimeCorrectForm() {
    const taskSelect = document.getElementById("req-correct-task-select");
    const correctDateInput = document.getElementById("req-correct-date");
    if (!taskSelect || !correctDateInput) return;

    // 業務一覧を注入
    taskSelect.innerHTML = '<option value="">業務を選択...</option>';
    const sortedTasks = [...allTaskObjects].sort((a, b) => a.name.localeCompare(b.name, "ja"));
    sortedTasks.forEach(task => {
        const opt = document.createElement("option");
        opt.value = task.name;
        opt.textContent = task.name;
        taskSelect.appendChild(opt);
    });

    // 【機能追加】業務プルダウンの変更イベントを監視して工数を動的切り替え
    taskSelect.addEventListener("change", (e) => {
        updateCorrectGoalDropdown(e.target.value, null);
    });

    // 日付変更イベント登録
    correctDateInput.addEventListener("change", (e) => {
        fetchAndRenderTimeline(e.target.value);
    });

    // 初回フェッチ実行
    fetchAndRenderTimeline(correctDateInput.value);
}

// 【機能追加】業務名に応じて工数プルダウンの表示・非表示・内容を切り替える共通関数
function updateCorrectGoalDropdown(selectedTaskName, selectedGoalValue) {
    const goalContainer = document.getElementById("req-correct-goal-container");
    const goalSelect = document.getElementById("req-correct-goal-select");

    if (!goalSelect || !goalContainer) return;

    goalSelect.innerHTML = '<option value="">工数を選択 (任意)</option>';
    goalSelect.disabled = true;

    // 休憩が選ばれたときはグレーアウトしてメッセージを変更し表示する
    if (selectedTaskName === "休憩") {
        goalSelect.innerHTML = '<option value="">休憩は工数項目なし</option>';
        goalSelect.className = "mt-1 block w-full border border-gray-300 rounded-lg p-2 text-sm bg-gray-100 text-gray-400 focus:outline-none";
        goalContainer.classList.remove("hidden");
        return;
    }

    // 業務未選択のときは非表示
    if (!selectedTaskName) {
        goalContainer.classList.add("hidden");
        return;
    }

    const foundTask = allTaskObjects.find(t => t.name === selectedTaskName);
    const activeGoals = (foundTask?.goals || []).filter(g => !g.isComplete);

    // 工数が設定されている場合のみコンテナを表示化
    if (activeGoals.length > 0) {
        activeGoals.forEach(goal => {
            const opt = document.createElement("option");
            opt.value = goal.id || goal.title;
            opt.textContent = `${goal.title} (目標: ${goal.target})`;
            goalSelect.appendChild(opt);
        });

        // タイムライン履歴のクリック時など、初期値（既存データ）があればセットする
        if (selectedGoalValue) {
            const foundOpt = Array.from(goalSelect.options).find(o => o.value === selectedGoalValue || o.textContent.split(" (目標:")[0] === selectedGoalValue);
            if (foundOpt) goalSelect.value = foundOpt.value;
        }

        goalSelect.disabled = false;
        goalSelect.className = "mt-1 block w-full border border-gray-300 rounded-lg p-2 text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500";
        goalContainer.classList.remove("hidden");
    } else {
        // 工数が設定されていない業務の場合は非表示にする
        goalContainer.classList.add("hidden");
    }
}

async function fetchAndRenderTimeline(dateStr) {
    const container = document.getElementById("req-correct-timeline-container");
    if (!container) return;

    container.innerHTML = '<p class="text-center text-gray-400 py-4 text-xs animate-pulse">業務記録を取得中...</p>';
    resetCorrectionInputs();

    try {
        const q = query(collection(db, "work_logs"), where("userId", "==", userId), where("date", "==", dateStr));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            container.innerHTML = '<p class="text-center text-gray-400 py-6 text-xs">この日の業務記録はありません。</p>';
            return;
        }

        const convertTime = (t) => {
            if (!t) return "";
            const d = t.toDate ? t.toDate() : new Date(t);
            return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
        };

        const logs = snapshot.docs.map(d => {
            const data = d.data();
            return {
                id: d.id,
                task: data.task || "不明",
                startTimeStr: convertTime(data.startTime),
                endTimeStr: convertTime(data.endTime),
                goalId: data.goalId || null,      // 連動用に追加
                goalTitle: data.goalTitle || "",  // 連動用に追加
                memo: data.memo || ""
            };
        }).sort((a, b) => a.startTimeStr.localeCompare(b.startTimeStr));

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

                document.getElementById("req-correct-log-id").value = log.id;
                if (taskSelect) taskSelect.value = log.task;
                if (startTimeInput) startTimeInput.value = log.startTimeStr;
                if (endTimeInput) endTimeInput.value = log.endTimeStr;
                if (memoInput) memoInput.value = log.memo;

                // 各入力欄の disabled ロックを解除
                [taskSelect, startTimeInput, endTimeInput, memoInput].forEach(el => { if (el) el.disabled = false; });

                // 【機能追加】ログクリック時に、そのログに工数が設定されていれば自動展開して選択する
                updateCorrectGoalDropdown(log.task, log.goalId || log.goalTitle);
            });

            container.appendChild(item);
        });
    } catch (error) {
        console.error(error);
        container.innerHTML = '<p class="text-center text-red-500 py-4 text-xs">データの同期中にエラーが発生しました。</p>';
    }
}

function resetCorrectionInputs() {
    const fields = ["req-correct-log-id", "req-correct-task-select", "req-correct-goal-select", "req-correct-start-time", "req-correct-end-time", "req-correct-memo"];
    fields.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.value = "";
            if (id !== "req-correct-log-id") el.disabled = true;
        }
    });
    // コンテナも非表示へリセット
    const container = document.getElementById("req-correct-goal-container");
    if (container) container.classList.add("hidden");
}

// ③ バリデーション & データ抽出
export function getTimeCorrectFormData() {
    const targetLogId = document.getElementById("req-correct-log-id").value;
    const dateVal = document.getElementById("req-correct-date").value;
    const taskName = document.getElementById("req-correct-task-select").value;
    const startTime = document.getElementById("req-correct-start-time").value;
    const endTime = document.getElementById("req-correct-end-time").value;
    const memoVal = document.getElementById("req-correct-memo").value.trim();
    
    const goalSelect = document.getElementById("req-correct-goal-select");
    const goalContainer = document.getElementById("req-correct-goal-container");

    if (!targetLogId) throw new Error("エラー：修正したい当日のログをタイムライン履歴から選択してください。");
    if (!taskName || !startTime || !endTime) throw new Error("エラー：業務、開始時間、終了時間は必須入力です。");
    if (startTime >= endTime) throw new Error("エラー：終了時間は開始時間より後の時刻にしてください。");

    // 【機能追加】工数プルダウンが表示されており、値が選択されていれば申請データに含める
    let goalId = null;
    let goalTitle = null;
    if (goalSelect && goalContainer && !goalContainer.classList.contains("hidden") && !goalSelect.disabled && goalSelect.value) {
        goalId = goalSelect.value;
        if (goalSelect.selectedIndex > 0) {
            goalTitle = goalSelect.options[goalSelect.selectedIndex].text.split(" (目標:")[0];
        }
    }

    return {
        requestDate: dateVal,
        targetLogId: targetLogId,
        data: {
            task: taskName,
            goalId: goalId,      // 承認画面に引き渡すデータを拡張
            goalTitle: goalTitle,  // 承認画面に引き渡すデータを拡張
            startTime: startTime,
            endTime: endTime,
            memo: memoVal
        }
    };
}
