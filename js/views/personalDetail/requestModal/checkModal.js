// js/views/personalDetail/requestModal/checkModal.js
import { db, userId } from "../../../main.js";
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { escapeHtml } from "../../../utils.js";

const requestCache = {};

function createRequestCheckModalHTML() {
    if (document.getElementById("request-check-modal")) return;

    const modalHtml = `
    <div id="request-check-modal" class="modal hidden fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
        <div class="relative mx-auto border w-full max-w-2xl shadow-2xl rounded-xl bg-white overflow-hidden animate-fade-in flex flex-col max-h-[85vh]">
            <div class="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
                <div class="flex items-center gap-2">
                    <span class="text-indigo-600 font-bold text-xl">
                        <svg class="w-6 h-6 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h11a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path>
                        </svg>
                    </span>
                    <h3 class="text-lg font-bold text-gray-800">申請状況・履歴の確認</h3>
                </div>
                <button id="check-modal-close-x" class="text-gray-400 hover:text-gray-600 text-2xl font-semibold focus:outline-none">&times;</button>
            </div>
            
            <div class="p-6 overflow-y-auto flex-grow space-y-4">
                <div class="flex items-end gap-3 bg-indigo-50/50 p-3 rounded-xl border border-indigo-100">
                    <div class="flex-grow">
                        <label class="block text-xs font-bold text-indigo-700 uppercase tracking-wide">表示する月を選択</label>
                        <select id="check-modal-month-select" class="mt-1 block w-full border border-gray-300 rounded-lg p-2 text-sm bg-white font-semibold focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
                        </select>
                    </div>
                    <button id="check-modal-refresh-btn" class="px-3 py-2 bg-white border border-gray-300 text-gray-700 text-xs font-bold rounded-lg shadow-sm hover:bg-gray-50 flex items-center gap-1 transition focus:outline-none h-[38px]">
                        🔄 最新に更新
                    </button>
                </div>
                
                <div id="check-modal-list-container" class="space-y-3 min-h-[280px] max-h-[450px] overflow-y-auto pr-1 custom-scrollbar">
                    <p class="text-center text-gray-400 py-12 text-sm">月を選択すると、これまでの申請履歴が表示されます。</p>
                </div>
            </div>
            
            <div class="px-6 py-4 border-t flex justify-end bg-gray-50">
                <button id="check-modal-close-btn" class="px-5 py-2 border border-gray-300 bg-white text-gray-700 text-sm font-medium rounded-lg shadow-sm hover:bg-gray-50 transition focus:outline-none">閉じる</button>
            </div>
        </div>
    </div>`;

    document.body.insertAdjacentHTML("beforeend", modalHtml);

    document.getElementById("check-modal-close-btn").addEventListener("click", closeRequestCheckModal);
    document.getElementById("check-modal-close-x").addEventListener("click", closeRequestCheckModal);
    document.getElementById("check-modal-month-select").addEventListener("change", (e) => { loadMonthRequests(e.target.value, false); });
    document.getElementById("check-modal-refresh-btn").addEventListener("click", () => {
        const selectedMonth = document.getElementById("check-modal-month-select").value;
        if (selectedMonth) loadMonthRequests(selectedMonth, true);
    });
}

function generateMonthOptions() {
    const select = document.getElementById("check-modal-month-select");
    if (!select) return;
    select.innerHTML = '<option value="">-- 月を選択してください --</option>';
    const now = new Date();
    for (let i = 0; i < 12; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const val = `${year}-${month}`;
        const text = `${year}年${month}月`;
        const opt = document.createElement("option");
        opt.value = val;
        opt.textContent = text;
        select.appendChild(opt);
    }
}

async function loadMonthRequests(monthStr, forceRefresh = false) {
    const container = document.getElementById("check-modal-list-container");
    if (!container) return;

    if (!monthStr) {
        container.innerHTML = '<p class="text-center text-gray-400 py-12 text-sm">月を選択すると、これまでの申請履歴が表示されます。</p>';
        return;
    }

    if (!forceRefresh && requestCache[monthStr]) {
        renderRequestList(requestCache[monthStr]);
        return;
    }

    container.innerHTML = '<p class="text-center text-gray-400 py-12 text-sm animate-pulse">📡 Firestoreからデータを取得中...</p>';

    try {
        const startRange = `${monthStr}-01`;
        const endRange = `${monthStr}-31`;
        const q = query(collection(db, "work_log_requests"), where("userId", "==", userId), where("requestDate", ">=", startRange), where("requestDate", "<=", endRange));
        const snapshot = await getDocs(q);
        const requests = [];

        snapshot.forEach(doc => { requests.push({ id: doc.id, ...doc.data() }); });
        requests.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
        requestCache[monthStr] = requests;
        renderRequestList(requests);
    } catch (error) {
        console.error(error);
        container.innerHTML = '<p class="text-center text-red-500 py-12 text-sm font-bold">データの取得中にエラーが発生しました。</p>';
    }
}

function renderRequestList(requests) {
    const container = document.getElementById("check-modal-list-container");
    if (!container) return;

    if (requests.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-400 py-12 text-sm">この月の申請履歴はありません。</p>';
        return;
    }

    const statusConfig = {
        pending: { label: "申請中", classes: "bg-yellow-50 text-yellow-700 border-yellow-200" },
        approved: { label: "承認", classes: "bg-green-50 text-green-700 border-green-200" },
        rejected: { label: "却下", classes: "bg-red-50 text-red-700 border-red-200" }
    };

    container.innerHTML = "";
    requests.forEach(req => {
        const d = req.data || {};
        const statusInfo = statusConfig[req.status] || { label: req.status, classes: "bg-gray-100 text-gray-700" };
        
        const applicationType = d.applicationType || (req.type === "add" ? "追加" : "変更");
        const reasonCategory = d.reasonCategory || "不明な申請メニュー";

        let contentDetail = "";
        if (req.type === "add" || req.type === "time_correct") {
            // パターン1：シンプルに「時間変更なし」と切り替える修正
            const timeRange = (d.afterStartTime && d.afterEndTime) 
                ? `${d.afterStartTime} - ${d.afterEndTime}` 
                : "時間変更なし";

            contentDetail = `
                <div>案件名: <span class="font-bold text-gray-800">${escapeHtml(d.task)}</span></div>
                <div>修正後時間: <span class="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">${timeRange}</span></div>
                <div>増減差異: <span class="font-bold text-green-600">${d.timeDifference || "対象外"}</span></div>
            `;
        } else if (req.type === "count_correct") {
            contentDetail = `
                <div>案件名: <span class="font-bold text-gray-800">${escapeHtml(d.task)}</span></div>
                <div>修正後件数: <span class="font-bold text-indigo-700">${d.count} 件</span></div>
                <div>件数差異: <span class="font-bold text-orange-600">${d.timeDifference}</span></div>
            `;
        } else if (req.type === "forget_checkout") {
            contentDetail = `
                <div>申告退勤時刻: <span class="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-red-600 font-bold">${d.afterEndTime}</span></div>
            `;
        }

        const approverHtml = req.status !== "pending" && req.approverName ? `
            <div class="mt-2 border-t pt-2 text-[10px] text-gray-400 flex justify-between">
                <span>👤 承認対応者: ${escapeHtml(req.approverName)}</span>
                <span>📅 日時: ${req.approvedAt ? req.approvedAt.substring(0,16).replace("T"," ") : ""}</span>
            </div>
        ` : "";

        const card = document.createElement("div");
        card.className = "p-4 border border-gray-200 rounded-xl bg-white shadow-sm flex flex-col gap-2 hover:border-gray-300 transition text-xs text-gray-600 animate-fade-in";
        card.innerHTML = `
            <div class="flex justify-between items-center border-b pb-2">
                <div class="flex items-center gap-1.5">
                    <span class="font-bold text-sm text-gray-800">${req.requestDate}</span>
                    <span class="bg-blue-50 text-blue-700 font-bold px-1.5 py-0.5 rounded border border-blue-100 text-[10px]">${applicationType}</span>
                    <span class="bg-gray-100 text-gray-700 font-semibold px-1.5 py-0.5 rounded text-[10px] border border-gray-200">${reasonCategory}</span>
                </div>
                <span class="px-2.5 py-0.5 rounded-full border text-[11px] font-bold shadow-sm ${statusInfo.classes}">
                    ${statusInfo.label}
                </span>
            </div>
            <div class="space-y-1">
                ${contentDetail}
                ${d.memo ? `<div class="text-gray-400 italic mt-1 bg-gray-50 p-2 rounded-lg border border-dashed">💬 理由記述: ${escapeHtml(d.memo)}</div>` : ""}
                ${approverHtml}
            </div>
        `;
        container.appendChild(card);
    });
}

export function openRequestCheckModal(dateStr) {
    createRequestCheckModalHTML();
    generateMonthOptions();
    const modal = document.getElementById("request-check-modal");
    const select = document.getElementById("check-modal-month-select");
    if (select && dateStr) {
        const currentMonthVal = dateStr.substring(0, 7);
        if (Array.from(select.options).some(o => o.value === currentMonthVal)) {
            select.value = currentMonthVal;
            loadMonthRequests(currentMonthVal, false);
        } else {
            select.value = "";
        }
    }
    modal.classList.remove("hidden");
}

function closeRequestCheckModal() {
    const modal = document.getElementById("request-check-modal");
    if (modal) modal.classList.add("hidden");
}
