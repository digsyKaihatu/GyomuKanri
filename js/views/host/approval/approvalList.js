// js/views/host/approval/approvalList.js
import { escapeHtml } from "../../../utils.js";
import { handleApprove, handleRejectRequest } from "./approvalActions.js";
import { showTimelineModal } from "./timelineModal.js";

export function renderApprovalList(docs) {
    const listEl = document.getElementById("approval-list-content");
    if (!listEl) return;
    
    listEl.innerHTML = "";

    if (docs.length === 0) {
        listEl.innerHTML = '<p class="text-gray-500 text-center py-8 text-sm font-semibold">未承認の変更追加申請はありません。</p>';
        return;
    }

    docs.forEach(docSnap => {
        const req = docSnap.data();
        const d = req.data || {};
        const card = document.createElement("div");
        
        let typeBadgeColor = "bg-gray-100 text-gray-800 border-gray-200";
        if (d.applicationType === "追加") typeBadgeColor = "bg-green-100 text-green-800 border-green-200";
        if (d.applicationType === "変更") typeBadgeColor = "bg-blue-100 text-blue-800 border-blue-200";

        const appTypeLabel = d.applicationType || (req.type === "add" ? "追加" : "変更");
        const reasonCategoryLabel = d.reasonCategory || "各種申請";

        let infoHtml = "";
        if (req.type === "add") {
            const goalText = d.goalTitle ? ` <span class="bg-gray-100 px-1 rounded border text-gray-500">[${escapeHtml(d.goalTitle)}]</span>` : "";
            const startTime = d.afterStartTime || d.startTime || "変更なし";
            const endTime = d.afterEndTime || d.endTime || "変更なし";
            const timeDiff = d.timeDifference || "変更なし";

            infoHtml = `
                <div class="text-sm font-bold text-gray-800">業務: ${escapeHtml(d.task || d.taskName || "未定")} ${goalText}</div>
                <div class="text-xs text-gray-600 mt-1">追加時間: <span class="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-indigo-700 font-bold">${startTime} - ${endTime}</span> (${timeDiff})</div>
                <div class="text-xs text-gray-600 mt-0.5">成果件数: <span class="font-bold text-gray-700">${d.count !== undefined ? d.count : 0} 件</span></div>
            `;
        } 
        else if (req.type === "time_correct" || req.type === "update") {
            const beforeStart = d.beforeStartTime || "変更なし";
            const beforeEnd = d.beforeEndTime || "変更なし";
            const afterStart = d.afterStartTime || "変更なし";
            const afterEnd = d.afterEndTime || "変更なし";
            const timeDiff = d.timeDifference || "変更なし";

            const beforeTimeStr = (beforeStart === "変更なし" && beforeEnd === "変更なし") ? "変更なし" : `${beforeStart} - ${beforeEnd}`;
            const afterTimeStr = (afterStart === "変更なし" && afterEnd === "変更なし") ? "変更なし" : `${afterStart} - ${afterEnd}`;

            const beforeTaskStr = d.beforeTask || "不明";
            const afterTaskStr = d.task || d.taskName || "未定";
            const beforeGoalStr = d.beforeGoalTitle || "";
            const afterGoalStr = d.goalTitle || "";
            
            const isTaskChanged = (beforeTaskStr !== "不明" && beforeTaskStr !== afterTaskStr);
            const isGoalChanged = (d.beforeGoalTitle !== undefined && beforeGoalStr !== afterGoalStr);

            let taskDisplayHtml = "";
            if (isTaskChanged) {
                taskDisplayHtml = `
                    <div class="text-sm font-bold text-gray-800 flex items-center flex-wrap gap-1">
                        業務変更: <span class="text-gray-400 line-through font-normal">${escapeHtml(beforeTaskStr)}</span> 
                        <span class="text-blue-600 font-black">➡️ ${escapeHtml(afterTaskStr)}</span>
                    </div>`;
            } else {
                taskDisplayHtml = `<div class="text-sm font-bold text-gray-800">対象業務: ${escapeHtml(afterTaskStr)}</div>`;
            }

            let goalDisplayHtml = "";
            if (isGoalChanged) {
                const beforeGoalLabel = beforeGoalStr ? `[${beforeGoalStr}]` : "[工数なし]";
                const afterGoalLabel = afterGoalStr ? `[${afterGoalStr}]` : "[工数なし]";
                goalDisplayHtml = `
                    <div class="text-xs font-bold text-gray-700 flex items-center flex-wrap gap-1 mt-0.5">
                        工数変更: <span class="text-gray-400 line-through font-normal">${escapeHtml(beforeGoalLabel)}</span> 
                        <span class="text-indigo-600 font-black">➡️ ${escapeHtml(afterGoalLabel)}</span>
                    </div>`;
            } else if (afterGoalStr) {
                goalDisplayHtml = `<div class="text-xs text-gray-500 mt-0.5">工数: <span class="bg-gray-100 px-1 rounded border text-gray-600">[${escapeHtml(afterGoalStr)}]</span></div>`;
            }

            infoHtml = `
                ${taskDisplayHtml}
                ${goalDisplayHtml}
                <div class="text-xs text-gray-500 mt-1">修正前の時間: <span class="font-mono">${beforeTimeStr}</span></div>
                <div class="text-xs text-gray-600 mt-0.5">訂正後の時間: <span class="font-mono bg-blue-50 px-1.5 py-0.5 rounded text-blue-700 font-bold">${afterTimeStr}</span></div>
                <div class="text-xs text-gray-700 font-semibold mt-1">労働時間差異: <span class="text-orange-600 font-bold">${timeDiff}</span></div>
            `;
        } 
        else if (req.type === "count_correct") {
            const goalText = d.goalTitle ? ` <span class="bg-gray-100 px-1 rounded border text-gray-500">[${escapeHtml(d.goalTitle)}]</span>` : "";
            const timeDiff = d.timeDifference || "変更なし";

            infoHtml = `
                <div class="text-sm font-bold text-gray-800">対象業務: ${escapeHtml(d.task || d.taskName || "未定")} ${goalText}</div>
                <div class="text-xs text-gray-600 mt-1">修正後の確定成果件数: <span class="font-bold text-indigo-700 text-sm">${d.count !== undefined ? d.count : 0} 件</span></div>
                <div class="text-xs text-gray-700 font-semibold mt-0.5">件数の増減差異: <span class="text-orange-600 font-bold">${timeDiff}</span></div>
            `;
        } 
        else if (req.type === "forget_checkout") {
            const afterEnd = d.afterEndTime || d.checkoutTime || "変更なし";

            infoHtml = `
                <div class="text-sm font-bold text-red-700">🚨 退勤打刻忘れの時刻補正依頼</div>
                <div class="text-xs text-gray-600 mt-1">従業員の申告退勤時間: <span class="font-mono bg-red-50 px-1.5 py-0.5 rounded text-red-700 font-bold">${afterEnd}</span></div>
                <p class="text-[10px] text-gray-400 mt-1">※承認すると、この時間より後に記録された不要な自動延長ログは自動消去されます。</p>
            `;
        }

        card.className = "bg-white p-5 rounded-xl shadow-md mb-4 border-l-4 border-indigo-500 flex flex-col sm:flex-row justify-between items-start gap-4 hover:shadow-lg transition animate-fade-in";
        card.innerHTML = `
            <div class="flex-grow space-y-2 w-full sm:w-auto">
                <div class="flex flex-wrap items-center gap-2">
                    <span class="font-black text-base text-gray-800">${escapeHtml(req.userName)}</span>
                    <span class="text-xs text-gray-400 font-medium">対象日: ${req.requestDate}</span>
                    <span class="border text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm ${typeBadgeColor}">${appTypeLabel}</span>
                    <span class="border border-gray-200 text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-50 text-gray-600">${reasonCategoryLabel}</span>
                    
                    <button class="view-timeline-btn text-[11px] bg-gray-100 text-gray-700 px-2 py-0.5 rounded hover:bg-gray-200 border ml-auto sm:ml-2 flex items-center gap-1 transition focus:outline-none" title="当日のタイムラインを横に展開">
                        🔍 タイムライン確認
                    </button>
                </div>
                
                <div class="bg-gray-50/50 p-3 rounded-xl border border-gray-100 space-y-1">
                    ${infoHtml}
                </div>
                
                ${d.memo ? `<div class="text-xs text-gray-400 italic bg-gray-50 p-2 rounded-lg border border-dashed">💬 理由記述: ${escapeHtml(d.memo)}</div>` : ""}
            </div>
            
            <div class="flex sm:flex-col gap-2 w-full sm:w-auto justify-end sm:justify-start pt-2 sm:pt-0 border-t sm:border-0 border-gray-100">
                <button class="approve-btn bg-emerald-600 text-white font-bold px-5 py-2 rounded-lg hover:bg-emerald-700 shadow-sm text-xs whitespace-nowrap transition w-full sm:w-28 focus:outline-none">
                    承認
                </button>
                <button class="reject-req-btn bg-red-500 text-white font-bold px-5 py-2 rounded-lg hover:bg-red-600 shadow-sm text-xs whitespace-nowrap transition w-full sm:w-28 focus:outline-none">
                    却下
                </button>
            </div>
        `;
        
        card.querySelector(".approve-btn").addEventListener("click", () => handleApprove(docSnap));
        card.querySelector(".reject-req-btn").addEventListener("click", () => handleRejectRequest(docSnap));
        card.querySelector(".view-timeline-btn").addEventListener("click", () => showTimelineModal(req.userId, req.userName, req.requestDate));
        
        listEl.appendChild(card);
    });
}
