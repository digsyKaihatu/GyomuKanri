// js/views/personalDetail/requestModal.js
import { db, userId, userName, allTaskObjects } from "../../main.js";
import { collection, addDoc, query, where, getDocs } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
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
                            <option value="add">記録 of 追加（あとから稼働を足す）</option>
                            <option value="time_correct">時間の訂正（現在のタイムラインの修正）</option>
                            <option value="task_change">入った業務を変更する（現在のタイムラインの修正）</option>
                            <option value="count_correct">工数件数の修正</option>
                            <option value="forget_checkout">退勤忘れの修正（現在のタイムラインの修正）</option>
                        </select>
                    </div>
                    <div></div> </div>
                
                <div id="unified-req-form-body" class="hidden border-t border-dashed pt-4 mt-4">
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
    
    // 初期選択を空（-- 選択してください --）にする
    const typeSelect = document.getElementById("unified-req-type-select");
    typeSelect.value = "";
    
    // 初期状態は下部エリアを隠す
    document.getElementById("unified-req-form-body").classList.add("hidden");
    document.getElementById("unified-alternative-body").classList.add("hidden");
    document.getElementById("unified-req-error-bar").classList.add("hidden");

    modal.classList.remove("hidden");
}

// モーダルを閉じる関数
function closeUnifiedRequestModal() {
    const modal = document.getElementById("unified-request-modal");
    if (modal) modal.classList.add("hidden");
}

// 申請内容選択時の動的切り替え
function handleUnifiedTypeChange(event) {
    const selectedType = event.target.value;
    const formBody = document.getElementById("unified-req-form-body");
    const alternativeBody = document.getElementById("unified-alternative-body");
    const errorBar = document.getElementById("unified-req-error-bar");
    
    if (errorBar) errorBar.classList.add("hidden");
    document.getElementById("unified-req-error").textContent = "";

    // 一旦クリアして隠す
    formBody.innerHTML = "";
    formBody.classList.add("hidden");
    alternativeBody.classList.add("hidden");

    // 選択してください の場合は何も出さない
    if (!selectedType) return;

    if (selectedType === "add") {
        // 【記録の追加】フォームを構築
        formBody.innerHTML = renderAddFormHTML();
        formBody.classList.remove("hidden");
        populateTaskDropdown("req-add-task-select", "req-add-goal-select", "req-add-goal-container");
        
    } else if (selectedType === "time_correct") {
        // 【時間の訂正】フォームを構築 (設計画像16eaad.pngの完全再現)
        formBody.innerHTML = renderTimeCorrectFormHTML();
        formBody.classList.remove("hidden");
        populateTaskDropdownWithoutGoals("req-correct-task-select");
        
        // 日付変更時に当日のタイムラインを再取得するイベントを設定
        const correctDateInput = document.getElementById("req-correct-date");
        correctDateInput.addEventListener("change", (e) => {
            fetchAndRenderTimeline(e.target.value);
        });
        
        // 初回読み込み
        fetchAndRenderTimeline(correctDateInput.value);
        
    } else {
        alternativeBody.classList.remove("hidden");
        alternativeBody.textContent = `選択された申請タイプ [${selectedType}] のフォーマットは現在開発中です。`;
    }
}

// ーーー 各メニューのテンプレート出力 HTML ーーー

// 1. 記録の追加用 HTML
function renderAddFormHTML() {
    const defaultDate = document.getElementById("unified-req-date").value;
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
            <div id="req-add-goal-container" class="hidden">
                <label class="block text-sm font-bold text-gray-700">工数プルダウン</label>
                <select id="req-add-goal-select" class="mt-1 block w-full border border-gray-300 rounded-lg p-2 text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500">
                    <option value="">工数を選択 (任意)</option>
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
                <input type="time" id="req-add-start-time" value="12:00" class="mt-1 block w-full border border-gray-300 rounded-lg p-2 text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500">
            </div>
            <div>
                <label class="block text-sm font-bold text-gray-700">終了時間</label>
                <input type="time" id="req-add-end-time" value="12:45" class="mt-1 block w-full border border-gray-300 rounded-lg p-2 text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500">
            </div>
            <div class="flex flex-col flex-grow">
                <label class="block text-sm font-bold text-gray-700">メモ (任意)</label>
                <textarea id="req-add-memo" class="mt-1 block w-full border border-gray-300 rounded-lg p-2 text-sm bg-white resize-none flex-grow min-h-[80px] focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" placeholder="補足事項など"></textarea>
            </div>
        </div>
    </div>`;
}

// 2. 【画像完全再現】時間の訂正用 HTML (横広3列)
function renderTimeCorrectFormHTML() {
    const defaultDate = document.getElementById("unified-req-date").value;
    return `
    <div class="grid grid-cols-3 gap-x-6 gap-y-4 w-full animate-fade-in">
        
        <div class="space-y-4">
            <div class="p-4 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 space-y-2">
                <span class="font-bold block text-sm text-blue-900">⏱️ 時間の訂正操作手順</span>
                <p>① 中央の「訂正をしたい日付」を選択します。</p>
                <p>② 展開されたタイムラインの履歴から、修正したい稼働ログをクリックして選択してください。</p>
                <p>③ 右側の入力欄にデータが反映されるので、正しい時間や業務内容に上書きし「申請を送る」を実行します。</p>
            </div>
        </div>
        
        <div class="space-y-3 flex flex-col">
            <div>
                <label class="block text-sm font-bold text-gray-700">時間の訂正をしたい日付入力</label>
                <input type="date" id="req-correct-date" value="${defaultDate}" class="mt-1 block w-full border border-gray-300 rounded-lg p-2 text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500">
            </div>
            <div class="flex flex-col flex-grow">
                <label class="block text-sm font-bold text-gray-700">その日のタイムラインが出てくる（ここから選択する）</label>
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

// ーーー バックエンドおよびマスターデータとのデータ流し込みロジック ーーー

// 指定日のユーザータイムラインをFirestoreから動的にフェッチして描画する関数
async function fetchAndRenderTimeline(dateStr) {
    const container = document.getElementById("req-correct-timeline-container");
    if (!container) return;

    container.innerHTML = '<p class="text-center text-gray-400 py-4 text-xs animate-pulse">業務記録を取得中...</p>';
    
    // 日付切り替え時は右の入力エリアを初期化・ロック
    resetCorrectionInputs();

    try {
        const q = query(
            collection(db, "work_logs"),
            where("userId", "==", userId),
            where("date", "==", dateStr)
        );
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            container.innerHTML = '<p class="text-center text-gray-400 py-6 text-xs">この日の業務記録（ワークログ）はありません。</p>';
            return;
        }

        // 時間フォーマット変換のローカルヘルパー
        const convertTime = (t) => {
            if (!t) return "";
            const d = t.toDate ? t.toDate() : new Date(t);
            return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
        };

        // ログ一覧を抽出し、開始時間順にソート
        const logs = snapshot.docs.map(d => {
            const data = d.data();
            return {
                id: d.id,
                task: data.task || "不明",
                startTimeStr: convertTime(data.startTime),
                endTimeStr: convertTime(data.endTime),
                goalTitle: data.goalTitle || "",
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

            // ログがクリックされたときの選択・右側連動処理
            item.addEventListener("click", () => {
                document.querySelectorAll(".timeline-log-item").forEach(el => el.classList.remove("bg-blue-100", "border-blue-400", "ring-2", "ring-blue-100"));
                item.classList.add("bg-blue-100", "border-blue-400", "ring-2", "ring-blue-100");

                const logIdInput = document.getElementById("req-correct-log-id");
                const taskSelect = document.getElementById("req-correct-task-select");
                const startTimeInput = document.getElementById("req-correct-start-time");
                const endTimeInput = document.getElementById("req-correct-end-time");
                const memoInput = document.getElementById("req-correct-memo");

                logIdInput.value = log.id;
                taskSelect.value = log.task;
                startTimeInput.value = log.startTimeStr;
                endTimeInput.value = log.endTimeStr;
                memoInput.value = log.memo;

                // 入力ロックを解除
                [taskSelect, startTimeInput, endTimeInput, memoInput].forEach(el => { if (el) el.disabled = false; });
            });

            container.appendChild(item);
        });

    } catch (error) {
        console.error("Error fetching correction data:", error);
        container.innerHTML = '<p class="text-center text-red-500 py-4 text-xs">データの同期中にエラーが発生しました。</p>';
    }
}

function resetCorrectionInputs() {
    const logIdInput = document.getElementById("req-correct-log-id");
    const taskSelect = document.getElementById("req-correct-task-select");
    const startTimeInput = document.getElementById("req-correct-start-time");
    const endTimeInput = document.getElementById("req-correct-end-time");
    const memoInput = document.getElementById("req-correct-memo");

    if (logIdInput) logIdInput.value = "";
    if (taskSelect) { taskSelect.value = ""; taskSelect.disabled = true; }
    if (startTimeInput) { startTimeInput.value = ""; startTimeInput.disabled = true; }
    if (endTimeInput) { endTimeInput.value = ""; endTimeInput.disabled = true; }
    if (memoInput) { memoInput.value = ""; memoInput.disabled = true; }
}

// 大項目・小項目データ注入ロジック
function populateTaskDropdown(taskSelectId, goalSelectId, goalContainerId) {
    const taskSelect = document.getElementById(taskSelectId);
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
        const goalContainer = document.getElementById(goalContainerId);
        const goalSelect = document.getElementById(goalSelectId);

        if (!goalSelect || !goalContainer) return;
        goalSelect.innerHTML = '<option value="">工数を選択 (任意)</option>';

        if (selectedTaskName === "休憩") {
            goalSelect.innerHTML = '<option value="">休憩は工数項目なし</option>';
            goalSelect.disabled = true;
            goalSelect.className = "mt-1 block w-full border border-gray-300 rounded-lg p-2 text-sm bg-gray-100 text-gray-400 focus:outline-none";
            goalContainer.classList.remove("hidden");
            return;
        }

        if (!selectedTaskName) {
            goalSelect.innerHTML = '<option value="">業務を選択してください</option>';
            goalSelect.disabled = true;
            goalSelect.className = "mt-1 block w-full border border-gray-300 rounded-lg p-2 text-sm bg-gray-100 text-gray-500 focus:outline-none";
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
            goalSelect.disabled = false;
            goalSelect.className = "mt-1 block w-full border border-gray-300 rounded-lg p-2 text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500";
            goalContainer.classList.remove("hidden");
        } else {
            goalSelect.innerHTML = '<option value="">対応する工数項目なし</option>';
            goalSelect.disabled = true;
            goalSelect.className = "mt-1 block w-full border border-gray-300 rounded-lg p-2 text-sm bg-gray-100 text-gray-400 focus:outline-none";
            goalContainer.classList.remove("hidden");
        }
    });

    taskSelect.value = "";
    taskSelect.dispatchEvent(new Event("change"));
}

function populateTaskDropdownWithoutGoals(taskSelectId) {
    const taskSelect = document.getElementById(taskSelectId);
    if (!taskSelect) return;

    taskSelect.innerHTML = '<option value="">業務を選択...</option>';
    const sortedTasks = [...allTaskObjects].sort((a, b) => a.name.localeCompare(b.name, "ja"));
    
    sortedTasks.forEach(task => {
        const opt = document.createElement("option");
        opt.value = task.name;
        opt.textContent = task.name;
        taskSelect.appendChild(opt);
    });
}

// 申請情報の送信処理
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

    const sendBtn = document.getElementById("unified-req-send-btn");

    if (type === "add") {
        const dateVal = document.getElementById("req-add-date").value;
        const startTime = document.getElementById("req-add-start-time").value;
        const endTime = document.getElementById("req-add-end-time").value;
        const taskName = document.getElementById("req-add-task-select").value;
        const goalSelect = document.getElementById("req-add-goal-select");
        const countVal = parseInt(document.getElementById("req-add-count").value, 10) || 0;
        const memoVal = document.getElementById("req-add-memo").value.trim();

        if (!dateVal || !startTime || !endTime || !taskName) {
            errorEl.textContent = "エラー：日付、時間、業務内容は必須入力です。";
            errorBar.classList.remove("hidden");
            return;
        }

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

        try {
            sendBtn.disabled = true;
            sendBtn.textContent = "送信中...";

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
            errorBar.classList.remove("hidden");
        } finally {
            sendBtn.disabled = false;
            sendBtn.textContent = "申請を送る";
        }

    } else if (type === "time_correct") {
        const targetLogId = document.getElementById("req-correct-log-id").value;
        const dateVal = document.getElementById("req-correct-date").value;
        const taskName = document.getElementById("req-correct-task-select").value;
        const startTime = document.getElementById("req-correct-start-time").value;
        const endTime = document.getElementById("req-correct-end-time").value;
        const memoVal = document.getElementById("req-correct-memo").value.trim();

        if (!targetLogId) {
            errorEl.textContent = "エラー：修正したい当日のログを一覧から選択してください。";
            errorBar.classList.remove("hidden");
            return;
        }

        if (!taskName || !startTime || !endTime) {
            errorEl.textContent = "エラー：業務、開始時間、終了時間は必須入力です。";
            errorBar.classList.remove("hidden");
            return;
        }

        if (startTime >= endTime) {
            errorEl.textContent = "エラー：終了時間は開始時間より後の時刻にしてください。";
            errorBar.classList.remove("hidden");
            return;
        }

        try {
            sendBtn.disabled = true;
            sendBtn.textContent = "送信中...";

            // 変更・訂正申請スキーマに落とし込んで送信
            await addDoc(collection(db, "work_log_requests"), {
                userId: userId,
                userName: userName,
                type: "time_correct",
                status: "pending",
                requestDate: dateVal,
                targetLogId: targetLogId,
                createdAt: new Date().toISOString(),
                data: {
                    task: taskName,
                    startTime: startTime,
                    endTime: endTime,
                    memo: memoVal
                }
            });

            alert("時間の訂正申請を送信しました。管理者の承認をお待ちください。");
            closeUnifiedRequestModal();
        } catch (error) {
            console.error("Error submitting time correction request:", error);
            errorEl.textContent = "申請の送信中にシステムエラーが発生しました。";
            errorBar.classList.remove("hidden");
        } finally {
            sendBtn.disabled = false;
            sendBtn.textContent = "申請を送る";
        }
    } else {
        errorEl.textContent = `選択された申請タイプ [${type}] の送信ロジックは現在未実装です。`;
        errorBar.classList.remove("hidden");
    }
}
