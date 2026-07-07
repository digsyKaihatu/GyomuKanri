// js/views/personalDetail/requestModal.js
import { db, userId, userName, allTaskObjects } from "../../main.js";
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { escapeHtml } from "../../utils.js";

// --- 統合版：業務タイムライン変更追加申請モーダルの動的生成 ---
function createUnifiedRequestModalHTML() {
    // すでに存在していれば重複して作らない
    if (document.getElementById("unified-request-modal")) return;

    const modalHtml = `
    <div id="unified-request-modal" class="modal hidden fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
        <div class="relative mx-auto border w-full max-w-4xl shadow-2xl rounded-xl bg-white overflow-hidden animate-fade-in flex flex-col">
            
            <div class="flex items-center justify-between px-6 py-4 border-b">
                <div class="flex items-center gap-2">
                    <span class="text-blue-600 font-bold text-xl">
                        <svg class="w-6 h-6 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                        </svg>
                    </span>
                    <h3 class="text-lg font-bold text-gray-800">業務タイムライン変更追加申請</h3>
                </div>
                <button id="unified-req-close-x" class="text-gray-400 hover:text-gray-600 text-2xl font-semibold focus:outline-none">&times;</button>
            </div>
            
            <div class="p-6 overflow-y-auto flex-grow">
                
                <div class="grid grid-cols-3 gap-x-6 gap-y-4 mb-2">
                    <div>
                        <label class="block text-sm font-bold text-gray-700">申請日</label>
                        <input type="date" id="unified-req-date" class="mt-1 block w-full border border-gray-300 rounded-lg p-2 text-sm bg-gray-50 focus:outline-none" readonly>
                    </div>
                    <div>
                        <label class="block text-sm font-bold text-gray-700">申請内容を選択してください</label>
                        <select id="unified-req-type-select" class="mt-1 block w-full border border-gray-300 rounded-lg p-2 text-sm bg-white font-semibold focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500">
                            <option value="">-- 選択してください --</option>
                            <option value="add">記録の追加（あとから稼働を足す）</option>
                            <option value="time_correct">時間の訂正（現在のタイムラインの修正）</option>
                            <option value="task_change">入った業務を変更する（現在のタイムラインの修正）</option>
                            <option value="count_correct">工数件数の修正</option>
                            <option value="forget_checkout">退勤忘れの修正（現在のタイムラインの修正）</option>
                        </select>
                    </div>
                    <div></div> </div>
                
                <div id="unified-req-form-body" class="hidden border-t border-dashed pt-4 mt-4">
                    <div class="grid grid-cols-3 gap-x-6 gap-y-4">
                        
                        <div class="space-y-4">
                            <div>
                                <label class="block text-sm font-bold text-gray-700">追加する日付</label>
                                <input type="date" id="req-add-date" class="mt-1 block w-full border border-gray-300 rounded-lg p-2 text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500">
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
                            <div>
                                <label class="block text-sm font-bold text-gray-700">開始時間</label>
                                <input type="time" id="req-add-start-time" class="mt-1 block w-full border border-gray-300 rounded-lg p-2 text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500">
                            </div>
                            <div>
                                <label class="block text-sm font-bold text-gray-700">終了時間</label>
                                <input type="time" id="req-add-end-time" class="mt-1 block w-full border border-gray-300 rounded-lg p-2 text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500">
                            </div>
                            <div class="flex flex-col flex-grow">
                                <label class="block text-sm font-bold text-gray-700">メモ (任意)</label>
                                <textarea id="req-add-memo" class="mt-1 block w-full border border-gray-300 rounded-lg p-2 text-sm bg-white resize-none flex-grow min-h-[80px] focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" placeholder="補足事項など"></textarea>
                            </div>
                        </div>
                        
                    </div>
                </div>
                
                <div id="unified-alternative-body" class="hidden border-t border-dashed pt-4 mt-4 py-12 text-center text-gray-400 text-sm font-bold">
                    選択された申請タイプのフォーマットは現在開発中です。
                </div>
            </div>
            
            <div class="px-6 py-4 border-t flex justify-end gap-3 bg-white">
                <button id="unified-req-cancel-btn" class="px-6 py-2 border border-gray-300 bg-white text-gray-700 text-sm font-medium rounded-lg shadow-sm hover:bg-gray-50 transition focus:outline-none">
                    キャンセル
                </button>
                <button id="unified-req-send-btn" class="px-6 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg shadow-sm hover:bg-emerald-700 transition focus:outline-none">
                    申請を送る
                </button>
            </div>
            
            <div id="unified-req-error-bar" class="bg-red-50 border-t border-red-200 px-6 py-3 text-sm text-red-700 font-bold hidden animate-fade-in">
                <span id="unified-req-error"></span>
            </div>
            
        </div>
    </div>`;

    document.body.insertAdjacentHTML("beforeend", modalHtml);

    // イベントリスナーの登録
    document.getElementById("unified-req-cancel-btn").addEventListener("click", closeUnifiedRequestModal);
    document.getElementById("unified-req-close-x").addEventListener("click", closeUnifiedRequestModal);
    document.getElementById("unified-req-type-select").addEventListener("change", handleUnifiedTypeChange);
    document.getElementById("unified-req-send-btn").addEventListener("click", handleRequestSubmit);
}

// モーダルを開く関数
export function openUnifiedRequestModal(dateStr) {
    createUnifiedRequestModalHTML();
    const modal = document.getElementById("unified-request-modal");
    
    // 日付の初期値を適用
    document.getElementById("unified-req-date").value = dateStr;
    document.getElementById("req-add-date").value = dateStr;
    
    // 初期選択を空（-- 選択してください --）にする
    const typeSelect = document.getElementById("unified-req-type-select");
    typeSelect.value = "";
    
    // 【ご要望】初期状態は下部の詳細入力エリアをすべて非表示にする
    document.getElementById("unified-req-form-body").classList.add("hidden");
    document.getElementById("unified-alternative-body").classList.add("hidden");
    document.getElementById("unified-req-error-bar").classList.add("hidden");

    // フォームの入力値をリセット
    document.getElementById("req-add-start-time").value = "12:00";
    document.getElementById("req-add-end-time").value = "12:45";
    document.getElementById("req-add-count").value = "0";
    document.getElementById("req-add-memo").value = "";

    // 業務プルダウンにマスターデータを注入
    populateTaskDropdown();

    modal.classList.remove("hidden");
}

// モーダルを閉じる関数
function closeUnifiedRequestModal() {
    const modal = document.getElementById("unified-request-modal");
    if (modal) modal.classList.add("hidden");
}

// 申請内容プルダウン変更時の表示切り替え
function handleUnifiedTypeChange(event) {
    const selectedType = event.target.value;
    const formBody = document.getElementById("unified-req-form-body");
    const alternativeBody = document.getElementById("unified-alternative-body");
    const errorBar = document.getElementById("unified-req-error-bar");
    
    if (errorBar) errorBar.classList.add("hidden");

    // 一旦すべて隠す
    formBody.classList.add("hidden");
    alternativeBody.classList.add("hidden");

    // 【ご要望】「選択してください(空文字)」の場合は、これ以上の内容を出さずに終了
    if (!selectedType) {
        return;
    }

    if (selectedType === "add") {
        formBody.classList.remove("hidden");
    } else {
        alternativeBody.classList.remove("hidden");
        alternativeBody.textContent = `選択された申請タイプ [${selectedType}] のフォーマットは現在開発中です。`;
    }
}

// 業務プルダウンのセットアップおよび工数連動ロジック
function populateTaskDropdown() {
    const taskSelect = document.getElementById("req-add-task-select");
    if (!taskSelect) return;

    // 初期値を「業務を選択...」に設定
    taskSelect.innerHTML = '<option value="">業務を選択...</option>';

    // 全業務オブジェクトをソートして追加
    const sortedTasks = [...allTaskObjects].sort((a, b) => a.name.localeCompare(b.name, "ja"));
    
    sortedTasks.forEach(task => {
        const opt = document.createElement("option");
        opt.value = task.name;
        opt.textContent = task.name;
        taskSelect.appendChild(opt);
    });

    // 業務プルダウンの変更イベント
    taskSelect.addEventListener("change", (e) => {
        const selectedTaskName = e.target.value;
        const goalSelect = document.getElementById("req-add-goal-select");
        if (!goalSelect) return;

        // 休憩が選ばれたときはグレーアウトしてメッセージを変更
        if (selectedTaskName === "休憩") {
            goalSelect.innerHTML = '<option value="">休憩は工数項目なし</option>';
            goalSelect.disabled = true;
            goalSelect.className = "mt-1 block w-full border border-gray-300 rounded-lg p-2 text-sm bg-gray-100 text-gray-400 focus:outline-none";
            return;
        }

        // 初期選択「業務を選択...」のときの工数の状態
        if (!selectedTaskName) {
            goalSelect.innerHTML = '<option value="">業務を選択してください</option>';
            goalSelect.disabled = true;
            goalSelect.className = "mt-1 block w-full border border-gray-300 rounded-lg p-2 text-sm bg-gray-100 text-gray-500 focus:outline-none";
            return;
        }

        // 選択された業務に紐づく未完了工数を取得
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

    // 初期選択を「業務を選択...」にするため値を空にし、変更イベントを発火させて工数側も同期
    taskSelect.value = "";
    taskSelect.dispatchEvent(new Event("change"));
}

// 申請情報のバリデーション & Firestore送信
async function handleRequestSubmit() {
    const type = document.getElementById("unified-req-type-select").value;
    const errorBar = document.getElementById("unified-req-error-bar");
    const errorEl = document.getElementById("unified-req-error");
    
    if (!errorBar || !errorEl) return;
    
    errorBar.classList.add("hidden");
    errorEl.textContent = "";

    if (!type) {
        errorEl.textContent = "申請内容を選択してください。";
        errorBar.classList.remove("hidden");
        return;
    }

    if (type !== "add") {
        errorEl.textContent = "現在、この申請タイプの送信ロジックは未実装です。";
        errorBar.classList.remove("hidden");
        return;
    }

    const dateVal = document.getElementById("req-add-date").value;
    const startTime = document.getElementById("req-add-start-time").value;
    const endTime = document.getElementById("req-add-end-time").value;
    const taskName = document.getElementById("req-add-task-select").value;
    const goalSelect = document.getElementById("req-add-goal-select");
    const countVal = parseInt(document.getElementById("req-add-count").value, 10) || 0;
    const memoVal = document.getElementById("req-add-memo").value.trim();

    // 必須入力チェック
    if (!dateVal || !startTime || !endTime || !taskName) {
        errorEl.textContent = "エラー：日付、時間、業務内容は必須入力です。";
        errorBar.classList.remove("hidden");
        return;
    }

    // 時間の逆転チェック
    if (startTime >= endTime) {
        errorEl.textContent = "エラー：終了時間は開始時間より後の時刻にしてください。";
        errorBar.classList.remove("hidden");
        return;
    }

    const goalId = goalSelect && !goalSelect.disabled && goalSelect.value ? goalSelect.value : null;
    let goalTitle = null;
    if (goalSelect && !goalSelect.disabled && goalSelect.selectedIndex > 0) {
        goalTitle = goalSelect.options[goalSelect.selectedIndex].text.split(" (目標:")[0];
    }

    const sendBtn = document.getElementById("unified-req-send-btn");
    
    try {
        sendBtn.disabled = true;
        sendBtn.textContent = "送信中...";

        // Firestoreの work_log_requests にデータを追加
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
        errorEl.textContent = "申請の送信中にシステムエラーが発生しました。";
        errorBar.classList.remove("hidden");
    } finally {
        sendBtn.disabled = false;
        sendBtn.textContent = "申請を送る";
    }
}
