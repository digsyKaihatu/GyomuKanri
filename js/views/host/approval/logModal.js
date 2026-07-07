// js/views/host/approval/logModal.js
import { db } from "../../../main.js";
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { escapeHtml } from "../../../utils.js";

const logCache = {}; 

function createApprovalLogModalHTML() {
    if (document.getElementById("approval-log-modal")) return;

    const modalHtml = `
    <div id="approval-log-modal" class="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4 hidden">
        <div class="relative mx-auto border w-full max-w-3xl shadow-2xl rounded-xl bg-white overflow-hidden flex flex-col max-h-[85vh] animate-fade-in">
            <div class="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
                <div class="flex items-center gap-2">
                    <span class="text-indigo-600 font-bold text-xl">📋</span>
                    <h3 class="text-lg font-bold text-gray-800">全従業員の変更・追加申請ログ履歴一覧</h3>
                </div>
                <button id="log-modal-close-x" class="text-gray-400 hover:text-gray-600 text-2xl font-semibold focus:outline-none">&times;</button>
            </div>
            
            <div class="p-6 overflow-y-auto flex-grow space-y-4">
                <div class="flex items-end gap-3 bg-indigo-50/50 p-3 rounded-xl border border-indigo-100">
                    <div class="flex-grow">
                        <label class="block text-xs font-bold text-indigo-700 uppercase tracking-wide">表示する月を選択</label>
                        <select id="log-modal-month-select" class="mt-1 block w-full border border-gray-300 rounded-lg p-2 text-sm bg-white font-semibold focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
                        </select>
                    </div>
                    <button id="log-modal-refresh-btn" class="px-3 py-2 bg-white border border-gray-300 text-gray-700 text-xs font-bold rounded-lg shadow-sm hover:bg-gray-50 flex items-center gap-1 transition focus:outline-none h-[38px]">
                        🔄 最新に更新
                    </button>
                </div>
                
                <div id="log-modal-list-container" class="space-y-3 min-h-[280px] max-h-[450px] overflow-y-auto pr-1 custom-scrollbar">
                    <p class="text-center text-gray-400 py-12 text-sm">月を選択すると、これまでの全従業員の申請履歴が表示されます。</p>
                </div>
            </div>
            
            <div class="px-6 py-4 border-t flex justify-end bg-gray-50">
                <button id="log-modal-close-btn" class="px-5 py-2 border border-gray-300 bg-white text-gray-700 text-sm font-medium rounded-lg shadow-sm hover:bg-gray-50 transition focus:outline-none">閉じる</button>
            </div>
        </div>
    </div>`;

    document.body.insertAdjacentHTML("beforeend", modalHtml);

    document.getElementById("log-modal-close-btn").onclick = closeApprovalLogModal;
    document.getElementById("log-modal-close-x").onclick = closeApprovalLogModal;
    document.getElementById("log-modal-month-select").onchange = (e) => { loadAllUsersRequests(e.target.value, false); };
    document.getElementById("log-modal-refresh-btn").onclick = () => {
        const selectedMonth = document.getElementById("log-modal-month-select").value;
        if (selectedMonth) loadAllUsersRequests(selectedMonth, true);
    };
}

function generateLogMonthOptions() {
    const select = document.getElementById("log-modal-month-select");
    if (!select || select.children.length > 1) return; 
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

async function loadAllUsersRequests(monthStr, forceRefresh = false) {
    const container = document.getElementById("log-modal-list-container");
    if (!container) return;

    if (!monthStr) {
        container.innerHTML = '<p class="text-center text-gray-400 py-12 text-sm">月を選択すると、全従業員の申請履歴が表示されます。</p>';
        return;
    }

    if (!forceRefresh && logCache[monthStr]) {
        renderApprovalLogList(logCache[monthStr]);
        return;
    }

    container.innerHTML = '<p class="text-center text-gray-400 py-12 text-sm animate-pulse">📡 Firestoreから全員分のログデータを取得中...</p>';

    try {
        const startRange = `${monthStr}-01`;
        const endRange = `${monthStr}-31`;
        const q = query(
            collection(db, "work_log_requests"), 
            where("requestDate", ">=", startRange), 
            where("requestDate", "<=", endRange)
        );
        const snapshot = await getDocs(q);
        const requests = [];

        snapshot.forEach(doc => { requests.push({ id: doc.id, ...doc.data() }); });
        
        const getMillis = (t) => {
            if (!t) return 0;
            if (typeof t.toMillis === "function") return t.toMillis(); 
            return new Date(t).getTime() || 0; 
        };
        requests.sort((a, b) => getMillis(b.createdAt) - getMillis(a.createdAt));
        
        logCache[monthStr] = requests;
        renderApprovalLogList(requests);
    } catch (error) {
        console.error(error);
        container.innerHTML = '<p class="text-center text-red-500 py-12 text-sm font-bold">データの取得中にエラーが発生しました。</p>';
    }
}

function renderApprovalLogList(requests) {
    const container = document.getElementById("log-modal-list-container");
    if (!container) return;

    if (requests.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-400 py-12 text-sm">この月の申請ログ履歴はありません。</p>';
        return;
    }

    const statusConfig = {
        pending: { label: "未承認", classes: "bg-yellow-50 text-yellow-700 border-yellow-200" },
        approved: { label: "承認済", classes: "bg-green-50 text-green-700 border-green-200" },
        rejected: { label: "却下済", classes: "bg-red-50 text-red-700 border-red-200" }
    };

    container.innerHTML = "";
    requests.forEach(req => {
        const d = req.data || {};
        const statusInfo = statusConfig[req.status] || { label: req.status, classes: "bg-gray-100 text-gray-700" };
        
        const applicationType = d.applicationType || (req.type === "add" ? "追加" : "変更");
        const reasonCategory = d.reasonCategory || "各種申請";

        let contentDetail = "";
        if (req.type === "add") {
            const goalText = d.goalTitle ? ` <span class="bg-gray-100 px-1 rounded border text-gray-500">[${escapeHtml(d.goalTitle)}]</span>` : "";
            const startTime = d.afterStartTime || d.startTime || "変更なし";
            const endTime = d.afterEndTime || d.endTime || "変更なし";
            const timeDiff = d.timeDifference || "変更なし";

            contentDetail = `
                <div>業務名: <span class="font-bold text-gray-800">${escapeHtml(d.task || d.taskName || "未定")} ${goalText}</span></div>
                <div>追加時間: <span class="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-indigo-700 font-bold">${startTime} - ${endTime}</span> (${timeDiff})</div>
                <div>成果件数: <span class="font-bold text-gray-700">${d.count !== undefined ? d.count : 0} 件</span></div>
            `;
        } 
        else if (req.type === "time_correct" || req.type === "update") {
            const beforeTimeStr = (d.beforeStartTime && d.beforeEndTime) ? `${d.beforeStartTime} - ${d.beforeEndTime}` : "変更なし";
            const afterTimeStr = (d.afterStartTime && d.afterEndTime) ? `${d.afterStartTime} - ${d.afterEndTime}` : "時間変更なし";

            const beforeTaskStr = d.beforeTask || "不明";
            const afterTaskStr = d.task || d.taskName || "未定";
            const beforeGoalStr = d.beforeGoalTitle || "";
            const afterGoalStr = d.goalTitle || "";
            
            let taskDisplayHtml = "";
            if (beforeTaskStr !== "不明" && beforeTaskStr !== afterTaskStr) {
                taskDisplayHtml = `<div>業務変更: <span class="text-gray-400 line-through">${escapeHtml(beforeTaskStr)}</span> <span class="text-blue-600 font-bold">➡️ ${escapeHtml(afterTaskStr)}</span></div>`;
            } else {
                taskDisplayHtml = `<div>対象業務: <span class="font-bold text-gray-800">${escapeHtml(afterTaskStr)}</span></div>`;
            }

            let goalDisplayHtml = "";
            if (beforeGoalStr !== afterGoalStr) {
                goalDisplayHtml = `<div>工数変更: <span class="text-gray-400 line-through">[${beforeGoalStr || "なし"}]</span> <span class="text-indigo-600 font-bold">➡️ [${afterGoalStr || "なし"}]</span></div>`;
            } else if (afterGoalStr) {
                goalDisplayHtml = `<div>工数: <span class="bg-gray-100 px-1 rounded border text-gray-600">[${escapeHtml(afterGoalStr)}]</span></div>`;
            }

            contentDetail = `
                ${taskDisplayHtml}
                ${goalDisplayHtml}
                <div>修正前の時間: <span class="font-mono">${beforeTimeStr}</span></div>
                <div>訂正後の時間: <span class="font-mono bg-blue-50 px-1.5 py-0.5 rounded text-blue-700 font-bold">${afterTimeStr}</span></div>
                <div>労働時間差異: <span class="text-orange-600 font-bold">${d.timeDifference || "変更なし"}</span></div>
            `;
        } 
        else if (req.type === "count_correct") {
            const goalText = d.goalTitle ? ` <span class="bg-gray-100 px-1 rounded border text-gray-500">[${escapeHtml(d.goalTitle)}]</span>` : "";
            contentDetail = `
                <div>対象業務: <span class="font-bold text-gray-800">${escapeHtml(d.task || d.taskName || "未定")} ${goalText}</span></div>
                <div>修正後の確定成果件数: <span class="font-bold text-indigo-700">${d.count !== undefined ? d.count : 0} 件</span></div>
                <div>件数の増減差異: <span class="text-orange-600 font-bold">${d.timeDifference || "変更なし"}</span></div>
            `;
        } 
        else if (req.type === "forget_checkout") {
            const afterEnd = d.afterEndTime || d.checkoutTime || "変更なし";
            contentDetail = `
                <div class="font-bold text-red-700">🚨 退勤打刻忘れの時刻補正依頼</div>
                <div>従業員の申告退勤時間: <span class="font-mono bg-red-50 px-1.5 py-0.5 rounded text-red-700 font-bold">${afterEnd}</span></div>
            `;
        }

        let approverHtml = "";
        if (req.status !== "pending") {
            const actionLabel = req.status === "approved" ? "👤 承認対応者" : "👤 却下対応者";
            approverHtml = `
                <div class="mt-2 border-t pt-2 text-[10px] text-gray-400 flex justify-between">
                    <span>${actionLabel}: <span class="font-bold text-gray-600">${escapeHtml(req.approverName || "システム")}</span></span>
                    <span>📅 対応日時: ${req.approvedAt ? req.approvedAt.substring(0,16).replace("T"," ") : "不明"}</span>
                </div>
            `;
        } else {
            approverHtml = `
                <div class="mt-2 border-t pt-2 text-[10px] text-yellow-600 font-bold">
                    ⏳ 現在未承認（対応待ち）
                </div>
            `;
        }

        const card = document.createElement("div");
        card.className = "p-4 border border-gray-200 rounded-xl bg-white shadow-sm flex flex-col gap-2 hover:border-gray-300 transition text-xs text-gray-600 animate-fade-in";
        card.innerHTML = `
            <div class="flex justify-between items-center border-b pb-2">
                <div class="flex items-center gap-1.5 flex-wrap">
                    <span class="font-black text-sm text-gray-800">${escapeHtml(req.userName)}</span>
                    <span class="text-gray-400 font-medium">対象日: ${req.requestDate}</span>
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

export function openApprovalLogModal() {
    createApprovalLogModalHTML();
    generateLogMonthOptions();
    const modal = document.getElementById("approval-log-modal");
    if (!modal) return;

    const select = document.getElementById("log-modal-month-select");
    const todayStr = new Date().toISOString().split("T")[0];
    const currentMonthVal = todayStr.substring(0, 7);
    
    if (select) {
        if (Array.from(select.options).some(o => o.value === currentMonthVal)) {
            select.value = currentMonthVal;
            loadAllUsersRequests(currentMonthVal, false);
        } else {
            select.value = "";
        }
    }
    modal.classList.remove("hidden");
}

function closeApprovalLogModal() {
    const modal = document.getElementById("approval-log-modal");
    if (modal) modal.classList.add("hidden");
}
