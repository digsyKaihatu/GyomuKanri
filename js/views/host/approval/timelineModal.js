// js/views/host/approval/timelineModal.js
import { db } from "../../../main.js";
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { escapeHtml, formatTime, formatDuration } from "../../../utils.js";

export async function showTimelineModal(targetUserId, targetUserName, dateStr) {
    const existing = document.getElementById("approval-timeline-modal");
    if (existing) existing.remove();

    const modalHtml = `
    <div id="approval-timeline-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-xl shadow-lg w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div class="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-xl">
                <h3 class="font-bold text-gray-700 text-lg">
                    📅 ${escapeHtml(targetUserName)} さんの業務記録 <span class="text-sm font-normal text-gray-500">(${dateStr})</span>
                </h3>
                <button id="close-timeline-modal" class="text-gray-500 hover:text-gray-800 text-2xl font-bold leading-none">&times;</button>
            </div>
            <div id="timeline-content" class="p-4 overflow-y-auto custom-scrollbar flex-grow bg-white">
                <p class="text-center text-gray-400 py-4">データを読み込み中...</p>
            </div>
            <div class="p-3 border-t bg-gray-50 rounded-b-xl text-right">
                <button id="close-timeline-btn-btm" class="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-1 px-4 rounded">閉じる</button>
            </div>
        </div>
    </div>`;
    
    document.body.insertAdjacentHTML("beforeend", modalHtml);

    const closeModal = () => document.getElementById("approval-timeline-modal")?.remove();
    document.getElementById("close-timeline-modal").onclick = closeModal;
    document.getElementById("close-timeline-btn-btm").onclick = closeModal;
    document.getElementById("approval-timeline-modal").onclick = (e) => { if (e.target === document.getElementById("approval-timeline-modal")) closeModal(); };

    const contentEl = document.getElementById("timeline-content");
    try {
        const q = query(collection(db, "work_logs"), where("userId", "==", targetUserId), where("date", "==", dateStr));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            contentEl.innerHTML = `<p class="text-center text-gray-500 py-4 text-xs">この日の業務記録はありません。</p>`;
            return;
        }

        const logs = snapshot.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .sort((a, b) => {
                const tA = a.startTime?.toMillis ? a.startTime.toMillis() : new Date(a.startTime).getTime();
                const tB = b.startTime?.toMillis ? b.startTime.toMillis() : new Date(b.startTime).getTime();
                return tA - tB;
            });

        let html = '<ul class="space-y-2">';
        logs.forEach(log => {
            const isGoalLog = log.type === 'goal';
            const bgColor = log.task === '休憩' ? 'bg-yellow-50 border-yellow-200' : (isGoalLog ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200');
            const startStr = formatTime(log.startTime);
            const endStr = log.endTime ? formatTime(log.endTime) : '---';
            const durationStr = log.duration ? formatDuration(log.duration) : '';
            
            let mainContent = `<span class="font-bold text-gray-800">${escapeHtml(log.task)}</span>`;
            if (log.goalTitle) mainContent += ` <span class="text-xs text-gray-500 bg-white border border-gray-300 px-1 rounded ml-1">${escapeHtml(log.goalTitle)}</span>`;
            if (log.contribution) mainContent += ` <span class="text-xs font-bold text-orange-600 ml-1">+${log.contribution}件</span>`;

            const timeDisplay = isGoalLog 
                ? `<span class="text-xs text-gray-400">${startStr} (進捗登録)</span>` 
                : `<span class="font-mono text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">${startStr} - ${endStr}</span>`;

            html += `
            <li class="p-2.5 rounded border ${bgColor} flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 text-xs">
                <div>
                    <div class="flex items-center flex-wrap gap-2">
                        ${timeDisplay}
                        ${mainContent}
                    </div>
                    ${log.memo ? `<div class="text-[11px] text-gray-400 mt-1 pl-2 border-l-2 border-gray-300">${escapeHtml(log.memo)}</div>` : ''}
                </div>
                ${!isGoalLog ? `<div class="font-bold text-gray-400 whitespace-nowrap">⏱ ${durationStr}</div>` : ''}
            </li>`;
        });
        html += '</ul>';
        contentEl.innerHTML = html;
    } catch (error) {
        console.error(error);
        contentEl.innerHTML = `<p class="text-center text-red-500 py-4 text-xs">データの取得に失敗しました。</p>`;
    }
}
