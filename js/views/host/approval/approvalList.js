// js/views/host/approval/approvalList.js
import { escapeHtml } from "../../../utils.js";
import { showTimelineModal } from "./timelineModal.js";

export function renderApprovalList(docs) {
    const listEl = document.getElementById("approval-list-content");
    if (!listEl) return;
    
    listEl.innerHTML = "";

    if (docs.length === 0) {
        listEl.innerHTML = '<p class="text-gray-500 text-center py-8 text-sm font-semibold">未承認の変更追加申請はありません。</p>';
        return;
    }

    // ① 個人 + 日付 ごとに申請をグループ化
    const groups = {};
    docs.forEach(docSnap => {
        const req = docSnap.data();
        const key = `${req.userId}_${req.requestDate}`;
        if (!groups[key]) {
            groups[key] = {
                userId: req.userId,
                userName: req.userName,
                requestDate: req.requestDate,
                docs: []
            };
        }
        groups[key].docs.push(docSnap);
    });

    // ② グループ単位でカードをレンダリング
    Object.values(groups).forEach(group => {
        const card = document.createElement("div");
        card.className = "bg-white p-5 rounded-xl shadow-md mb-4 border-l-4 border-indigo-500 flex flex-col sm:flex-row justify-between items-center gap-4 hover:shadow-lg transition animate-fade-in";
        
        const count = group.docs.length;

        card.innerHTML = `
            <div class="flex-grow space-y-1">
                <div class="flex items-center gap-3 flex-wrap">
                    <span class="font-black text-lg text-gray-800">${escapeHtml(group.userName)} さん</span>
                    <span class="text-sm font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100">
                        📅 ${escapeHtml(group.requestDate)} 分
                    </span>
                    <span class="bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold px-2.5 py-1 rounded-full">
                        計 ${count} 件
                    </span>
                </div>
                <p class="text-xs text-gray-500 pt-1">
                    タイムラインを開くと「修正前」と「全承認後の仮タイムライン」を比較・承認/却下できます。
                </p>
            </div>
            
            <div>
                <button class="view-timeline-btn bg-indigo-600 text-white font-bold px-5 py-2.5 rounded-lg hover:bg-indigo-700 shadow transition text-xs whitespace-nowrap flex items-center gap-2 focus:outline-none">
                    🔍 タイムラインで確認・操作
                </button>
            </div>
        `;

        card.querySelector(".view-timeline-btn").addEventListener("click", () => {
            showTimelineModal(group.userId, group.userName, group.requestDate);
        });

        listEl.appendChild(card);
    });
}
