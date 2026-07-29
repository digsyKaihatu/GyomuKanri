// js/views/personalDetail/requestModal/index.js
import { db, userId, userName } from "../../../main.js";
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// ⚡ 各フォームから一括データ取得用の関数をインポート
import { renderAddFormHTML, initAddForm, getPendingAddDataList } from "./addForm.js";
import { renderTimeCorrectFormHTML, initTimeCorrectForm, getPendingTimeCorrectDataList } from "./timeCorrectForm.js";
import { renderCountCorrectFormHTML, initCountCorrectForm, getPendingCountCorrectDataList } from "./countCorrectForm.js";
import { renderForgetCheckoutFormHTML, initForgetCheckoutForm, getForgetCheckoutFormData } from "./forgetCheckoutForm.js";

// 🌟 logData.js からキャッシュ取得関数をインポート
import { getCachedLogsForDate } from "../logData.js";
import { WORKER_URL } from "../../client/timerState.js"; // 💡 Worker URL のインポート

// -------------------------------------------------------------
// モーダル共通 リアルタイム差分監視（CDN + メモリキャッシュ対応版）
// -------------------------------------------------------------
let activeUnsubscribe = null;

/**
 * 日本時間 (JST) の今日の日付文字列 (YYYY-MM-DD) を取得
 */
function getTodayJSTDateString() {
    const now = new Date();
    const jstOffset = 9 * 60;
    const jstTime = new Date(now.getTime() + (jstOffset + now.getTimezoneOffset()) * 60000);
    const yyyy = jstTime.getFullYear();
    const mm = String(jstTime.getMonth() + 1).padStart(2, '0');
    const dd = String(jstTime.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

function convertTime(t) {
    if (!t) return "";
    if (typeof t === "string" && t.includes(":") && t.length <= 5) return t;
    if (typeof t === "string" && t.includes("T")) {
        const d = new Date(t);
        if (!isNaN(d.getTime())) {
            return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
        }
    }
    const d = t.toDate ? t.toDate() : new Date(t);
    if (isNaN(d.getTime())) return "";
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/**
 * 日付（過去か今日か）に応じてデータ取得ソースを自動切り替えする関数
 * @param {string} dateStr 対象日付 (YYYY-MM-DD)
 * @param {function} callback データ描画用コールバック
 */
export async function subscribeModalTimelineLogs(dateStr, callback) {
    const todayStr = getTodayJSTDateString();

    // 🌟 1. 昨日以前（過去日）の場合は Cloudflare CDN から超高速取得
    if (dateStr < todayStr) {
        try {
            // 🌟 修正: &v=20260729 を付与してWorkerのキャッシュキーと統一し、古い空キャッシュを回避
            const resp = await fetch(`${WORKER_URL}/get-daily-summary?date=${dateStr}&v=20260729`);
            if (resp.ok) {
                const resData = await resp.json();
                const allLogs = resData.logs || [];

                // 自分のログ（userName または userId が一致するもの）のみ抽出
                const targetDayLogs = allLogs.filter(log => 
                    (log.userName && log.userName === userName) || 
                    (log.userId && log.userId === userId)
                );

                const formattedLogs = targetDayLogs.map(log => {
                    const countVal = log.contribution !== undefined 
                        ? log.contribution 
                        : (log.count !== undefined ? log.count : 0);

                    return {
                        id: log.id,
                        type: log.type || "work",
                        task: log.task || "不明",
                        startTimeStr: convertTime(log.startTime),
                        endTimeStr: convertTime(log.endTime),
                        goalId: log.goalId || null,
                        goalTitle: log.goalTitle || "",
                        count: countVal,
                        memo: log.memo || ""
                    };
                });

                formattedLogs.sort((a, b) => a.startTimeStr.localeCompare(b.startTimeStr));

                // ⚡ CDN キャッシュから即座にコールバック実行 (Firestore Read 0)
                callback({ logs: formattedLogs, isCache: true, changeType: "Cloudflare CDN" });
                return () => {};
            }
        } catch (e) {
            console.error(`RequestModal CDN fetch error (${dateStr}):`, e);
        }
    }

    // 🌟 2. 今日の日付、または CDN 取得失敗時のフォールバック: メモリキャッシュから取得
    const targetDayLogs = getCachedLogsForDate(userName, dateStr);

    const formattedLogs = targetDayLogs.map(log => {
        const countVal = log.contribution !== undefined 
            ? log.contribution 
            : (log.count !== undefined ? log.count : 0);

        return {
            id: log.id,
            type: log.type || "work",
            task: log.task || "不明",
            startTimeStr: convertTime(log.startTime),
            endTimeStr: convertTime(log.endTime),
            goalId: log.goalId || null,
            goalTitle: log.goalTitle || "",
            count: countVal,
            memo: log.memo || ""
        };
    });

    formattedLogs.sort((a, b) => a.startTimeStr.localeCompare(b.startTimeStr));

    callback({ logs: formattedLogs, isCache: true, changeType: "メモリキャッシュ" });

    return () => {};
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

/**
 * 🚀 申請送信ハンドラー（一括処理対応）
 */
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

    try {
        if (type === "time_correct" || type === "add" || type === "count_correct") {
            let requestsList = [];
            
            if (type === "time_correct") {
                requestsList = getPendingTimeCorrectDataList();
            } else if (type === "add") {
                requestsList = getPendingAddDataList();
            } else if (type === "count_correct") {
                requestsList = getPendingCountCorrectDataList();
            }

            const summaryText = requestsList.map((req, idx) => {
                const d = req.data;
                if (type === "time_correct") {
                    return `${idx + 1}. [${req.requestDate}] ${d.beforeTask}(${d.beforeStartTime}-${d.beforeEndTime}) ➔ ${d.task}(${d.afterStartTime}-${d.afterEndTime})`;
                } else if (type === "add") {
                    return `${idx + 1}. [${req.requestDate}] ${d.task}(${d.afterStartTime}-${d.afterEndTime}) ${d.count}件`;
                } else if (type === "count_correct") {
                    return `${idx + 1}. [${req.requestDate}] ${d.task} ➔ 件数: ${d.count}件 (${d.timeDifference})`;
                }
            }).join("\n");

            const isConfirmed = confirm(
                `計 ${requestsList.length} 件の申請をまとめて送信します。\n内容をご確認ください：\n\n${summaryText}\n\n送信してよろしいですか？`
            );

            if (!isConfirmed) return;

            const sendBtn = document.getElementById("unified-req-send-btn");
            sendBtn.disabled = true;
            sendBtn.textContent = "送信中...";

            for (const payload of requestsList) {
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
            }

            alert(`計 ${requestsList.length} 件の申請を送信しました。管理者の承認をお待ちください。`);
            closeUnifiedRequestModal();
            return;
        }

        let payload = null;
        if (type === "forget_checkout") { 
            payload = getForgetCheckoutFormData(); 
        } else { 
            throw new Error("現在、この申請タイプの送信ロジックは未実装です。"); 
        }

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
