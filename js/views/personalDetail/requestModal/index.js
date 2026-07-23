// js/views/personalDetail/requestModal/index.js
import { db, userId, userName } from "../../../main.js";
import { collection, query, where, onSnapshot, addDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

import { renderAddFormHTML, initAddForm, getAddFormData } from "./addForm.js";
import { renderTimeCorrectFormHTML, initTimeCorrectForm, getTimeCorrectFormData } from "./timeCorrectForm.js";
import { renderCountCorrectFormHTML, initCountCorrectForm, getCountCorrectFormData } from "./countCorrectForm.js";
import { renderForgetCheckoutFormHTML, initForgetCheckoutForm, getForgetCheckoutFormData } from "./forgetCheckoutForm.js";

// -------------------------------------------------------------
// モーダル共通 リアルタイム差分監視（docChanges管理）
// -------------------------------------------------------------
let activeUnsubscribe = null;
const modalLogsMap = new Map(); // docId -> logData

function convertTime(t) {
    if (!t) return "";
    if (typeof t === "string" && t.includes(":") && t.length <= 5) return t;
    const d = t.toDate ? t.toDate() : new Date(t);
    if (isNaN(d.getTime())) return "";
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/**
 * onSnapshot + docChanges() によるリアルタイム差分購読関数
 * @param {string} dateStr 対象日付 (YYYY-MM-DD)
 * @param {function} callback データ変更時に実行する描画用コールバック
 * @returns {function} リスナー解除用関数
 */
export function subscribeModalTimelineLogs(dateStr, callback) {
    // 既存の監視があれば解除
    if (activeUnsubscribe) {
        activeUnsubscribe();
        activeUnsubscribe = null;
    }
    modalLogsMap.clear();

    const q = query(
        collection(db, "work_logs"),
        where("userId", "==", userId),
        where("date", "==", dateStr)
    );

    activeUnsubscribe = onSnapshot(q, (snapshot) => {
        const isFromCache = snapshot.metadata.fromCache;
        let lastChangeType = "";

        // 🔥 docChanges() で差分（追加・修正・削除）のみローカルMapに適用
        snapshot.docChanges().forEach((change) => {
            const docId = change.doc.id;
            lastChangeType = change.type;

            if (change.type === "added" || change.type === "modified") {
                const data = change.doc.data();
                modalLogsMap.set(docId, {
                    id: docId,
                    task: data.task || "不明",
                    startTimeStr: convertTime(data.startTime),
                    endTimeStr: convertTime(data.endTime),
                    goalId: data.goalId || null,
                    goalTitle: data.goalTitle || "",
                    count: data.count !== undefined ? data.count : 0,
                    memo: data.memo || ""
                });
            } else if (change.type === "removed") {
                modalLogsMap.delete(docId);
            }
        });

        const sortedLogs = Array.from(modalLogsMap.values()).sort((a, b) => 
            a.startTimeStr.localeCompare(b.startTimeStr)
        );

        callback({ logs: sortedLogs, isCache: isFromCache, changeType: lastChangeType });
    });

    return () => {
        if (activeUnsubscribe) {
            activeUnsubscribe();
            activeUnsubscribe = null;
        }
    };
}

function createUnifiedRequestModalHTML() {
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
                            <option value="time_correct">時間・業務の訂正（現在のタイムラインの修正）</option>
                            <option value="count_correct">工数件数の修正（履歴から件数を書き換える）</option>
                            <option value="forget_checkout">退勤忘れの修正（現在のタイムラインの修正）</option>
                        </select>
                    </div>
                    <div></div>
                </div>
                
                <div id="unified-req-form-body" class="hidden border-t border-dashed pt-4 mt-4"></div>
                <div id="unified-alternative-body" class="hidden border-t border-dashed pt-4 mt-4 py-12 text-center text-gray-400 text-sm font-bold"></div>
            </div>
            
            <div class="px-6 py-4 border-t flex justify-end gap-3 bg-white">
                <button id="unified-req-cancel-btn" class="px-6 py-2 border border-gray-300 bg-white text-gray-700 text-sm font-medium rounded-lg shadow-sm hover:bg-gray-50 transition focus:outline-none">キャンセル</button>
                <button id="unified-req-send-btn" class="px-6 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg shadow-sm hover:bg-emerald-700 transition focus:outline-none">申請を送る</button>
            </div>
            
            <div id="unified-req-error-bar" class="bg-red-50 border-t border-red-200 px-6 py-3 text-sm text-red-700 font-bold hidden animate-fade-in">
                <span id="unified-req-error"></span>
            </div>
        </div>
    </div>`;

    document.body.insertAdjacentHTML("beforeend", modalHtml);

    document.getElementById("unified-req-cancel-btn").addEventListener("click", closeUnifiedRequestModal);
    document.getElementById("unified-req-close-x").addEventListener("click", closeUnifiedRequestModal);
    document.getElementById("unified-req-type-select").addEventListener("change", handleUnifiedTypeChange);
    document.getElementById("unified-req-send-btn").addEventListener("click", handleRequestSubmit);
}

export function openUnifiedRequestModal(dateStr) {
    createUnifiedRequestModalHTML();
    const modal = document.getElementById("unified-request-modal");
    
    document.getElementById("unified-req-date").value = dateStr;
    document.getElementById("unified-req-type-select").value = "";
    
    document.getElementById("unified-req-form-body").classList.add("hidden");
    document.getElementById("unified-alternative-body").classList.add("hidden");
    document.getElementById("unified-req-error-bar").classList.add("hidden");

    modal.classList.remove("hidden");
}

function closeUnifiedRequestModal() {
    if (activeUnsubscribe) {
        activeUnsubscribe();
        activeUnsubscribe = null;
    }
    const modal = document.getElementById("unified-request-modal");
    if (modal) modal.classList.add("hidden");
}

function handleUnifiedTypeChange(event) {
    const selectedType = event.target.value;
    const formBody = document.getElementById("unified-req-form-body");
    const alternativeBody = document.getElementById("unified-alternative-body");
    const errorBar = document.getElementById("unified-req-error-bar");
    
    if (errorBar) errorBar.classList.add("hidden");
    formBody.innerHTML = "";
    formBody.classList.add("hidden");
    alternativeBody.classList.add("hidden");

    if (!selectedType) return;

    const defaultDate = document.getElementById("unified-req-date").value;

    if (selectedType === "add") {
        formBody.innerHTML = renderAddFormHTML(defaultDate);
        formBody.classList.remove("hidden");
        initAddForm();
    } else if (selectedType === "time_correct") {
        formBody.innerHTML = renderTimeCorrectFormHTML(defaultDate);
        formBody.classList.remove("hidden");
        initTimeCorrectForm();
    } else if (selectedType === "count_correct") {
        formBody.innerHTML = renderCountCorrectFormHTML(defaultDate);
        formBody.classList.remove("hidden");
        initCountCorrectForm();
    } else if (selectedType === "forget_checkout") {
        formBody.innerHTML = renderForgetCheckoutFormHTML(defaultDate);
        formBody.classList.remove("hidden");
        initForgetCheckoutForm();
    } else {
        alternativeBody.classList.remove("hidden");
        alternativeBody.textContent = `選択された申請タイプ [${selectedType}] のフォーマットは現在開発中です。`;
    }
}

async function handleRequestSubmit() {
    const type = document.getElementById("unified-req-type-select").value;
    const errorBar = document.getElementById("unified-req-error-bar");
    const errorEl = document.getElementById("unified-req-error");
    
    if (!errorBar || !errorEl) return;
    errorBar.classList.add("hidden");

    if (!type) {
        errorEl.textContent = "申請内容を選択してください。";
        errorBar.classList.remove("hidden");
        return;
    }

    let payload = null;
    try {
        if (type === "add") { payload = getAddFormData(); } 
        else if (type === "time_correct") { payload = getTimeCorrectFormData(); } 
        else if (type === "count_correct") { payload = getCountCorrectFormData(); } 
        else if (type === "forget_checkout") { payload = getForgetCheckoutFormData(); } 
        else { throw new Error("現在、この申請タイプの送信ロジックは未実装です。"); }

        const sendBtn = document.getElementById("unified-req-send-btn");
        sendBtn.disabled = true;
        sendBtn.textContent = "送信中...";

        await addDoc(collection(db, "work_log_requests"), {
            userId: userId,
            userName: userName,
            type: type,
            status: "pending",
            requestDate: payload.requestDate,
            targetLogId: payload.targetLogId || null,
            createdAt: new Date().toISOString(),
            
            approverId: null,
            approverName: null,
            approvedAt: null,
            
            data: payload.data
        });

        alert("変更申請を送信しました。管理者の承認をお待ちください。");
        closeUnifiedRequestModal();
    } catch (error) {
        errorEl.textContent = error.message || "申請の送信中にシステムエラーが発生しました。";
        errorBar.classList.remove("hidden");
    } finally {
        const sendBtn = document.getElementById("unified-req-send-btn");
        if (sendBtn) {
            sendBtn.disabled = false;
            sendBtn.textContent = "申請を送る";
        }
    }
}
