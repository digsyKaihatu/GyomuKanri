// js/views/personalDetail/requestModal.js
import { db, userId, userName, allTaskObjects } from "../../main.js";
import { collection, addDoc, Timestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { escapeHtml } from "../../utils.js";

// DOM要素の生成
function createRequestModalHTML() {
    if (document.getElementById("request-modal")) return;

    const modalHtml = `
    <div id="request-modal" class="modal hidden fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div class="mt-3">
                <h3 class="text-lg leading-6 font-medium text-gray-900" id="request-modal-title">申請</h3>
                <div class="mt-2 px-1 space-y-3">
                    <input type="hidden" id="req-type">
                    <input type="hidden" id="req-target-log-id">
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700">日付</label>
                        <input type="date" id="req-date" class="mt-1 block w-full border-gray-300 rounded-md shadow-sm bg-gray-100" readonly>
                    </div>

                    <div id="req-time-container" class="grid grid-cols-2 gap-2">
                        <div>
                            <label class="block text-sm font-medium text-gray-700">開始時間</label>
                            <input type="time" id="req-start-time" class="mt-1 block w-full border-gray-300 rounded-md shadow-sm">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700">終了時間</label>
                            <input type="time" id="req-end-time" class="mt-1 block w-full border-gray-300 rounded-md shadow-sm">
                        </div>
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-700">業務（タスク）</label>
                        <select id="req-task" class="mt-1 block w-full border-gray-300 rounded-md shadow-sm"></select>
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-700">工数（目標）※件数を入れる場合は必須</label>
                        <select id="req-goal" class="mt-1 block w-full border-gray-300 rounded-md shadow-sm">
                            <option value="">(選択なし)</option>
                        </select>
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-700">件数 ※任意</label>
                        <input type="number" id="req-count" class="mt-1 block w-full border-gray-300 rounded-md shadow-sm" min="0">
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-700">メモ</label>
                        <textarea id="req-memo" class="mt-1 block w-full border-gray-300 rounded-md shadow-sm" rows="3"></textarea>
                    </div>
                    
                    <p id="req-error" class="text-red-500 text-sm mt-2"></p>
                </div>
                <div class="items-center px-4 py-3">
                    <button id="req-send-btn" class="px-4 py-2 bg-blue-500 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300">
                        申請を送る
                    </button>
                    <button id="req-cancel-btn" class="mt-3 px-4 py-2 bg-gray-300 text-gray-700 text-base font-medium rounded-md w-full shadow-sm hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300">
                        キャンセル
                    </button>
                </div>
            </div>
        </div>
    </div>`;
    document.body.insertAdjacentHTML("beforeend", modalHtml);

    document.getElementById("req-cancel-btn").addEventListener("click", closeRequestModal);
    document.getElementById("req-send-btn").addEventListener("click", submitRequest);
    document.getElementById("req-task").addEventListener("change", () => updateGoalOptions());
}

function updateTaskOptions(selectedTaskName = null) {
    const taskSelect = document.getElementById("req-task");
    taskSelect.innerHTML = '<option value="">業務を選択</option>';
    allTaskObjects.forEach(task => {
        const option = document.createElement("option");
        option.value = task.name;
        option.textContent = task.name;
        taskSelect.appendChild(option);
    });
    if (selectedTaskName) taskSelect.value = selectedTaskName;
    updateGoalOptions();
}

function updateGoalOptions() {
    const taskSelect = document.getElementById("req-task");
    const goalSelect = document.getElementById("req-goal");
    const selectedTask = allTaskObjects.find(t => t.name === taskSelect.value);
    
    // 現在選択されているGoalを保持（あれば）
    const currentGoal = goalSelect.value;
    
    goalSelect.innerHTML = '<option value="">(選択なし)</option>';
    
    if (selectedTask && selectedTask.goals) {
        selectedTask.goals.forEach(goal => {
            const option = document.createElement("option");
            option.value = goal.id; 
            option.dataset.title = goal.title;
            option.textContent = goal.title;
            goalSelect.appendChild(option);
        });
    }
    
    // もしタスクが変わっていなくて、元のゴールがまだリストにあれば再選択
    if (currentGoal) {
        // 同じ値を持つoptionがあるか確認
        if(goalSelect.querySelector(`option[value="${currentGoal}"]`)){
            goalSelect.value = currentGoal;
        }
    }
}

export function openAddRequestModal(dateStr) {
    createRequestModalHTML();
    const modal = document.getElementById("request-modal");
    
    document.getElementById("req-type").value = "add";
    document.getElementById("request-modal-title").textContent = "業務追加申請";
    
    // ★修正: 日付を入力可能にする (readonly属性削除とグレー背景解除)
    const dateInput = document.getElementById("req-date");
    dateInput.value = dateStr;
    dateInput.removeAttribute("readonly");
    dateInput.classList.remove("bg-gray-100");

    document.getElementById("req-time-container").style.display = "grid";
    document.getElementById("req-start-time").value = "";
    document.getElementById("req-end-time").value = "";
    document.getElementById("req-count").value = "";
    document.getElementById("req-memo").value = "";
    document.getElementById("req-error").textContent = "";

    updateTaskOptions();
    modal.classList.remove("hidden");
}

export function openUpdateRequestModal(log) {
    createRequestModalHTML();
    const modal = document.getElementById("request-modal");

    document.getElementById("req-type").value = "update";
    document.getElementById("request-modal-title").textContent = "業務変更申請";
    document.getElementById("req-target-log-id").value = log.id;
    
    // ★修正: 変更申請の場合は日付を固定に戻す (readonly属性付与とグレー背景追加)
    const dateInput = document.getElementById("req-date");
    dateInput.value = log.date;
    dateInput.setAttribute("readonly", "true");
    dateInput.classList.add("bg-gray-100");
    
    document.getElementById("req-time-container").style.display = "none";

    document.getElementById("req-count").value = log.contribution || "";
    document.getElementById("req-memo").value = log.memo || "";
    document.getElementById("req-error").textContent = "";

    updateTaskOptions(log.task);
    
    // updateTaskOptionsの中でupdateGoalOptionsが呼ばれるが、
    // タイミング的にここで明示的にゴールIDをセットする
    const goalSelect = document.getElementById("req-goal");
    if (log.goalId) {
        // 既にoptionが生成されているはず
        goalSelect.value = log.goalId;
    }

    modal.classList.remove("hidden");
}

function closeRequestModal() {
    const modal = document.getElementById("request-modal");
    if (modal) modal.classList.add("hidden");
}

async function submitRequest() {
    const type = document.getElementById("req-type").value;
    const date = document.getElementById("req-date").value;
    const task = document.getElementById("req-task").value;
    const goalSelect = document.getElementById("req-goal");
    const goalId = goalSelect.value || null;
    const goalTitle = goalSelect.options[goalSelect.selectedIndex]?.text || null;
    const count = parseInt(document.getElementById("req-count").value) || 0;
    const memo = document.getElementById("req-memo").value;
    const errorEl = document.getElementById("req-error");

    if (!task) {
        errorEl.textContent = "業務を選択してください。";
        return;
    }

    // ★追加: 件数と工数のリンク強制バリデーション
    if (count > 0 && !goalId) {
        errorEl.textContent = "件数を入力する場合は、必ず対象の工数（目標）を選択してください。";
        return;
    }

    let requestData = {
        type,
        status: "pending",
        userId,
        userName,
        requestDate: date,
        createdAt: Timestamp.now(),
        data: {
            task,
            goalId,
            goalTitle: goalId ? goalTitle : null,
            count,
            memo
        }
    };

    if (type === "add") {
        const startTime = document.getElementById("req-start-time").value;
        const endTime = document.getElementById("req-end-time").value;
        
        if (!startTime || !endTime) {
            errorEl.textContent = "開始・終了時間を入力してください。";
            return;
        }
        requestData.data.startTime = startTime;
        requestData.data.endTime = endTime;
    } else {
        requestData.targetLogId = document.getElementById("req-target-log-id").value;
    }

    try {
        await addDoc(collection(db, "work_log_requests"), requestData);
        alert("申請を送信しました。管理者の承認をお待ちください。");
        closeRequestModal();
    } catch (e) {
        console.error("Error submitting request:", e);
        errorEl.textContent = "送信中にエラーが発生しました。";
    }
}

// --- 統合版：業務タイムライン変更追加申請モーダルの動的生成 ---
function createUnifiedRequestModalHTML() {
    // すでに存在していれば重複して作らない
    if (document.getElementById("unified-request-modal")) return;

    const modalHtml = `
    <div id="unified-request-modal" class="modal hidden fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div class="mt-3">
                <h3 class="text-lg leading-6 font-medium text-gray-900 font-bold">業務タイムライン変更追加申請</h3>
                
                <div class="mt-4 px-1 space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700">対象日</label>
                        <input type="date" id="unified-req-date" class="mt-1 block w-full border-gray-300 rounded-md shadow-sm bg-gray-100 p-2 border" readonly>
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-700 font-bold text-indigo-700">申請内容を選択してください</label>
                        <select id="unified-req-type-select" class="mt-1 block w-full border-gray-300 rounded-md shadow-sm bg-white p-2 border font-medium">
                            <option value="">-- 選択してください --</option>
                            <option value="add">記録の追加（あとから稼働を足す）</option>
                            <option value="time_correct">時間の訂正（現在のタイムラインの修正）</option>
                            <option value="task_change">入った業務を変更する（現在のタイムラインの修正）</option>
                            <option value="count_correct">工数件数の修正</option>
                            <option value="forget_checkout">退勤忘れの修正（現在のタイムラインの修正）</option>
                        </select>
                    </div>

                    <div id="unified-req-form-body" class="border-t pt-3 mt-3 min-h-[100px]">
                        <p class="text-sm text-gray-400 text-center py-4">申請内容を選択すると、ここに入力フォーマットが表示されます。</p>
                    </div>
                    
                    <p id="unified-req-error" class="text-red-500 text-sm mt-2 h-4"></p>
                </div>

                <div class="items-center px-4 py-3 mt-4 flex gap-2">
                    <button id="unified-req-cancel-btn" class="px-4 py-2 bg-gray-300 text-gray-700 text-base font-medium rounded-md w-full shadow-sm hover:bg-gray-400 focus:outline-none">
                        キャンセル
                    </button>
                    <button id="unified-req-send-btn" class="px-4 py-2 bg-blue-500 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-blue-700 focus:outline-none">
                        申請を送る
                    </button>
                </div>
            </div>
        </div>
    </div>`;
    
    document.body.insertAdjacentHTML("beforeend", modalHtml);

    // イベントリスナーの登録
    document.getElementById("unified-req-cancel-btn").addEventListener("click", closeUnifiedRequestModal);
    document.getElementById("unified-req-type-select").addEventListener("change", handleUnifiedTypeChange);
    // 送信ボタンの処理（形だけ）
    document.getElementById("unified-req-send-btn").addEventListener("click", () => {
        const type = document.getElementById("unified-req-type-select").value;
        if (!type) {
            document.getElementById("unified-req-error").textContent = "申請内容を選択してください。";
            return;
        }
        alert(`現時点では骨組みのみのため、実際の送信処理は未実装です。(選択タイプ: ${type})`);
    });
}

// モーダルを開く関数
export function openUnifiedRequestModal(dateStr) {
    createUnifiedRequestModalHTML();
    const modal = document.getElementById("unified-request-modal");
    
    document.getElementById("unified-req-date").value = dateStr;
    document.getElementById("unified-req-type-select").value = "";
    document.getElementById("unified-req-form-body").innerHTML = `
        <p class="text-sm text-gray-400 text-center py-4">申請内容を選択すると、ここに入力フォーマットが表示されます。</p>
    `;
    document.getElementById("unified-req-error").textContent = "";

    modal.classList.remove("hidden");
}

// モーダルを閉じる関数
function closeUnifiedRequestModal() {
    const modal = document.getElementById("unified-request-modal");
    if (modal) modal.classList.add("hidden");
}

// プルダウン変更時に対応するフォーマット（形だけ）を切り替える関数
function handleUnifiedTypeChange(event) {
    const selectedType = event.target.value;
    const formBody = document.getElementById("unified-req-form-body");
    document.getElementById("unified-req-error").textContent = "";
    
    if (!selectedType) {
        formBody.innerHTML = '<p class="text-sm text-gray-400 text-center py-4">申請内容を選択すると、ここに入力フォーマットが表示されます。</p>';
        return;
    }

    // 各選択肢に応じたプレースホルダー（骨組み）を挿入
    switch (selectedType) {
        case "add":
            formBody.innerHTML = `
                <div class="p-3 bg-green-50 border border-green-200 rounded text-xs text-green-800">
                    <strong class="block text-sm mb-1">📝 記録の追加フォーマットの位置</strong>
                    ここに「開始時間」「終了時間」「業務（大項目）」「工数（小項目）」「件数」「メモ」等の入力欄を後ほど実装します。
                </div>
            `;
            break;
        case "time_correct":
            formBody.innerHTML = `
                <div class="p-3 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
                    <strong class="block text-sm mb-1">⏱ 時間の訂正フォーマットの位置</strong>
                    ここに、本日稼働したタイムラインのログ一覧（セレクトボックス等）や、「正しい開始・終了時間」の入力欄を後ほど実装します。
                </div>
            `;
            break;
        case "task_change":
            formBody.innerHTML = `
                <div class="p-3 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                    <strong class="block text-sm mb-1">📂 入った業務を変更するフォーマットの位置</strong>
                    ここに、本日稼働したログ一覧と、「変更後の新しい業務名」や「工数」を選択するドロップダウンを後ほど実装します。
                </div>
            `;
            break;
        case "count_correct":
            formBody.innerHTML = `
                <div class="p-3 bg-purple-50 border border-purple-200 rounded text-xs text-purple-800">
                    <strong class="block text-sm mb-1">⭐ 工数件数の修正フォーマットの位置</strong>
                    ここに、修正したい工数（目標）の選択と、「新しく上書きする合計件数」の数値入力欄を後ほど実装します。
                </div>
            `;
            break;
        case "forget_checkout":
            formBody.innerHTML = `
                <div class="p-3 bg-orange-50 border border-orange-200 rounded text-xs text-orange-800">
                    <strong class="block text-sm mb-1">🚪 退勤忘れの修正フォーマットの位置</strong>
                    ここに、「正しい退勤時刻（終了時間）」の入力欄などを後ほど実装します。
                </div>
            `;
            break;
    }
}
