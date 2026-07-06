// js/views/personalDetail/requestModal.js
import { db, userId, userName, allTaskObjects } from "../../main.js";
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { escapeHtml } from "../../utils.js";

// --- 統合版：業務タイムライン変更追加申請モーダルの動的生成 ---
function createUnifiedRequestModalHTML() {
    // すでに存在していれば重複して作らない
    if (document.getElementById("unified-request-modal")) return;

    const modalHtml = `
    <div id="unified-request-modal" class="modal hidden fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 p-4">
        <div class="relative top-10 mx-auto p-5 border w-full max-w-md shadow-lg rounded-xl bg-white animate-fade-in">
            <div class="mt-2">
                <h3 class="text-xl leading-6 font-bold text-gray-800 border-b pb-3">業務タイムライン変更追加申請</h3>
                
                <div class="mt-4 space-y-4">
                    <div>
                        <label class="block text-xs font-bold text-gray-500 uppercase tracking-wide">対象日</label>
                        <input type="date" id="unified-req-date" class="mt-1 block w-full border border-gray-300 rounded-lg bg-gray-50 p-2.5 text-sm font-semibold text-gray-700 focus:outline-none" readonly>
                    </div>

                    <div>
                        <label class="block text-xs font-bold text-indigo-600 uppercase tracking-wide">申請内容を選択してください</label>
                        <select id="unified-req-type-select" class="mt-1 block w-full border border-indigo-200 rounded-lg bg-white p-2.5 text-sm font-bold text-indigo-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm">
                            <option value="">-- 選択してください --</option>
                            <option value="add">記録の追加（あとから稼働を足す）</option>
                            <option value="time_correct">時間の訂正（現在のタイムラインの修正）</option>
                            <option value="task_change">入った業務を変更する（現在のタイムラインの修正）</option>
                            <option value="count_correct">工数件数の修正</option>
                            <option value="forget_checkout">退勤忘れの修正（現在のタイムラインの修正）</option>
                        </select>
                    </div>

                    <div id="unified-req-form-body" class="border-t border-dashed pt-4 mt-4">
                        <p class="text-sm text-gray-400 text-center py-4">申請内容を選択すると、ここに入力フォーマットが表示されます。</p>
                    </div>
                    
                    <p id="unified-req-error" class="text-red-500 text-xs font-bold mt-2 h-4 text-center"></p>
                </div>

                <div class="items-center px-4 py-3 mt-4 flex gap-3 border-t pt-4">
                    <button id="unified-req-cancel-btn" class="px-4 py-2.5 bg-gray-200 text-gray-700 text-sm font-bold rounded-lg w-full shadow-sm hover:bg-gray-300 transition focus:outline-none">
                        キャンセル
                    </button>
                    <button id="unified-req-send-btn" class="px-4 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-lg w-full shadow-sm hover:bg-blue-700 transition focus:outline-none">
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
    
    // 送信ボタンの処理
    document.getElementById("unified-req-send-btn").addEventListener("click", handleRequestSubmit);
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

// プルダウン変更時に対応するフォーマットを切り替える関数
function handleUnifiedTypeChange(event) {
    const selectedType = event.target.value;
    const formBody = document.getElementById("unified-req-form-body");
    document.getElementById("unified-req-error").textContent = "";
    
    if (!selectedType) {
        formBody.innerHTML = '<p class="text-sm text-gray-400 text-center py-4">申請内容を選択すると、ここに入力フォーマットが表示されます。</p>';
        return;
    }

    switch (selectedType) {
        case "add":
            // カレンダーで選ばれている日付を取得
            const defaultDate = document.getElementById("unified-req-date").value;

            formBody.innerHTML = `
                <div class="space-y-4 bg-green-50/50 p-4 rounded-xl border border-green-200">
                    <div class="text-xs font-bold text-green-800 bg-green-100 px-2.5 py-1 rounded-md w-fit mb-2">
                        🟢 記録の追加
                    </div>
                    
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="block text-xs font-bold text-gray-600">追加する日付</label>
                            <input type="date" id="req-add-date" value="${defaultDate}" class="mt-1 block w-full p-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-1 focus:ring-green-500">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-gray-600">成果件数</label>
                            <input type="number" id="req-add-count" min="0" value="0" class="mt-1 block w-full p-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-1 focus:ring-green-500">
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="block text-xs font-bold text-gray-600">開始時間</label>
                            <input type="time" id="req-add-start-time" class="mt-1 block w-full p-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-1 focus:ring-green-500">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-gray-600">終了時間</label>
                            <input type="time" id="req-add-end-time" class="mt-1 block w-full p-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-1 focus:ring-green-500">
                        </div>
                    </div>

                    <div>
                        <label class="block text-xs font-bold text-gray-600">業務プルダウン <span class="text-red-500">*</span></label>
                        <select id="req-add-task-select" class="mt-1 block w-full p-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-1 focus:ring-green-500">
                            <option value="">業務を選択...</option>
                        </select>
                    </div>

                    <div id="req-add-goal-container" class="hidden">
                        <label class="block text-xs font-bold text-gray-600">工数プルダウン</label>
                        <select id="req-add-goal-select" class="mt-1 block w-full p-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-1 focus:ring-green-500">
                            <option value="">工数を選択 (任意)</option>
                        </select>
                    </div>

                    <div>
                        <label class="block text-xs font-bold text-gray-600">メモ (任意)</label>
                        <textarea id="req-add-memo" rows="2" class="mt-1 block w-full p-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-1 focus:ring-green-500" placeholder="申請理由や補足事項"></textarea>
                    </div>
                </div>
            `;

            // 業務プルダウンにマスターデータを動的注入
            populateTaskDropdown();
            break;

        default:
            formBody.innerHTML = `
                <div class="p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-500 text-center">
                    選択されたタイプ [${selectedType}] のフォーマットは現在開発中です。
                </div>
            `;
            break;
    }
}

// 業務プルダウンをセットアップする関数
function populateTaskDropdown() {
    const taskSelect = document.getElementById("req-add-task-select");
    if (!taskSelect) return;

    // アルファベット・五十音順にソートして追加
    const sortedTasks = [...allTaskObjects].sort((a, b) => a.name.localeCompare(b.name, "ja"));
    
    sortedTasks.forEach(task => {
        const opt = document.createElement("option");
        opt.value = task.name;
        opt.textContent = task.name;
        taskSelect.appendChild(opt);
    });

    // 業務名が変更されたら、対応する工数（小項目）を動的に切り替える
    taskSelect.addEventListener("change", (e) => {
        const selectedTaskName = e.target.value;
        const goalContainer = document.getElementById("req-add-goal-container");
        const goalSelect = document.getElementById("req-add-goal-select");

        if (!goalSelect || !goalContainer) return;

        // 一旦初期化
        goalSelect.innerHTML = '<option value="">工数を選択 (任意)</option>';

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
                opt.textContent = `${goal.title} (目標: ${goal.target})`;
                goalSelect.appendChild(opt);
            });
            goalContainer.classList.remove("hidden");
        } else {
            goalContainer.classList.add("hidden");
        }
    });
}

// 申請情報の送信処理
async function handleRequestSubmit() {
    const type = document.getElementById("unified-req-type-select").value;
    const errorEl = document.getElementById("unified-req-error");
    if (!errorEl) return;
    
    errorEl.textContent = "";

    if (!type) {
        errorEl.textContent = "申請内容を選択してください。";
        return;
    }

    if (type === "add") {
        const dateVal = document.getElementById("req-add-date").value;
        const startTime = document.getElementById("req-add-start-time").value;
        const endTime = document.getElementById("req-add-end-time").value;
        const taskName = document.getElementById("req-add-task-select").value;
        const goalSelect = document.getElementById("req-add-goal-select");
        const countVal = parseInt(document.getElementById("req-add-count").value, 10) || 0;
        const memoVal = document.getElementById("req-add-memo").value.trim();

        // バリデーションチェック
        if (!dateVal || !startTime || !endTime || !taskName) {
            errorEl.textContent = "日付、時間、業務内容は必須入力です。";
            return;
        }

        if (startTime >= endTime) {
            errorEl.textContent = "終了時間は開始時間より後の時刻にしてください。";
            return;
        }

        const goalId = goalSelect && goalSelect.value ? goalSelect.value : null;
        let goalTitle = null;
        if (goalSelect && goalSelect.selectedIndex > 0) {
            // 末尾の「 (目標: 10)」などの表記を除去してタイトルだけを抽出
            goalTitle = goalSelect.options[goalSelect.selectedIndex].text.split(" (目標:")[0];
        }

        const sendBtn = document.getElementById("unified-req-send-btn");
        
        try {
            sendBtn.disabled = true;
            sendBtn.textContent = "送信中...";

            // Firestoreのスキーマ構造(work_log_requests)に合わせてデータを整形
            await addDoc(collection(db, "work_log_requests"), {
                userId: userId,
                userName: userName,
                type: "add",
                status: "pending",
                requestDate: dateVal,
                createdAt: new Date().toISOString(),
                data: {
                    task: taskName,
                    goalId: goalId,
                    goalTitle: goalTitle,
                    startTime: startTime,
                    endTime: endTime,
                    count: countVal,
                    memo: memoVal
                }
            });

            alert("記録の追加申請を送信しました。管理者の承認をお待ちください。");
            closeUnifiedRequestModal();
            
        } catch (error) {
            console.error("Error submitting request:", error);
            errorEl.textContent = "申請の送信中にエラーが発生しました。";
        } finally {
            sendBtn.disabled = false;
            sendBtn.textContent = "申請を送る";
        }
    } else {
        alert(`選択されたタイプ [${type}] の送信ロジックは現在未実装です。`);
    }
}
