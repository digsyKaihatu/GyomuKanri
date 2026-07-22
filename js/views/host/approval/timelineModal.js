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
        // 1. 打刻ログの取得クエリ
        const logsQuery = query(
            collection(db, "work_logs"), 
            where("userId", "==", targetUserId), 
            where("date", "==", dateStr)
        );

        // 2. 申請データの取得クエリ (work_log_requests / requestDate / pending)
        const requestsQuery = query(
            collection(db, "work_log_requests"),
            where("userId", "==", targetUserId),
            where("requestDate", "==", dateStr),
            where("status", "==", "pending")
        );

        // 並列取得
        const [logsSnapshot, requestsSnapshot] = await Promise.all([
            getDocs(logsQuery),
            getDocs(requestsQuery)
        ]);
        
        if (logsSnapshot.empty && requestsSnapshot.empty) {
            contentEl.innerHTML = `<p class="text-center text-gray-500 py-4 text-xs">この日の業務記録・申請はありません。</p>`;
            return;
        }

        // --- A. 打刻ログの整理 & 修正前の合計稼働時間（休憩除く）計算 ---
        const logs = logsSnapshot.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .sort((a, b) => {
                const tA = a.startTime?.toMillis ? a.startTime.toMillis() : new Date(a.startTime).getTime();
                const tB = b.startTime?.toMillis ? b.startTime.toMillis() : new Date(b.startTime).getTime();
                return tA - tB;
            });

        const totalWorkDuration = logs.reduce((total, log) => {
            if (log.task === '休憩' || log.type === 'goal') return total;
            return total + (Number(log.duration) || 0);
        }, 0);

        // --- B. 未承認申請の計算 & 承認後の想定時間算出 ---
        const pendingRequests = requestsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        const pendingCount = pendingRequests.length;
        
        let afterApprovalDuration = totalWorkDuration;

        pendingRequests.forEach(req => {
            const reqData = req.data || {};
            // 休憩に関する申請は稼働時間から除外
            if (reqData.task === '休憩' || reqData.taskName === '休憩') return;

            // 1. 差異データ(diffMinutesなど)が保持されている場合は優先加算
            if (reqData.diffMinutes !== undefined && !isNaN(Number(reqData.diffMinutes))) {
                afterApprovalDuration += Number(reqData.diffMinutes);
                return;
            }

            // 2. 申請タイプ別の計算
            if (req.type === 'add') {
                // 新規追加申請
                const addTime = Number(reqData.duration) || Number(reqData.workMinutes) || 0;
                afterApprovalDuration += addTime;
            } 
            else if (req.type === 'time_correct' || req.type === 'forget_checkout') {
                // 時間訂正・退勤忘れ修正
                const originalLog = logs.find(l => l.id === req.targetLogId);
                const oldTime = originalLog ? (Number(originalLog.duration) || 0) : 0;
                const newTime = Number(reqData.duration) || Number(reqData.workMinutes) || 0;
                
                afterApprovalDuration += (newTime - oldTime);
            }
            // ※ count_correct (工数件数修正) は稼働時間に影響しないため何もしない
        });

        // 負の値にならないよう安全対策
        afterApprovalDuration = Math.max(0, afterApprovalDuration);

        // 表示用フォーマット
        const totalWorkTimeStr = formatDuration(totalWorkDuration);
        const afterApprovalTimeStr = formatDuration(afterApprovalDuration);

        // --- C. UI構築 ---
        let html = `
        <div class="mb-4 p-3 bg-indigo-50 border border-indigo-100 rounded-lg text-xs space-y-2.5">
            <!-- 修正前の稼働時間 -->
            <div class="flex items-center justify-between">
                <span class="font-bold text-gray-700 flex items-center gap-1">
                    ⏱️ 修正前 合計稼働時間 <span class="text-[10px] text-gray-500 font-normal">(休憩除く)</span>
                </span>
                <span class="font-mono font-bold text-gray-700 text-sm bg-white px-2.5 py-1 rounded border border-gray-200">
                    ${totalWorkTimeStr}
                </span>
            </div>
            
            <!-- 申請件数 & 全承認後の想定時間 -->
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-indigo-100">
                <span class="font-bold flex items-center gap-1 ${pendingCount > 0 ? 'text-amber-600' : 'text-gray-500'}">
                    📝 未承認の申請: <span class="bg-white px-2 py-0.5 rounded border border-indigo-100">${pendingCount} 件</span>
                </span>
                <span class="font-bold text-gray-700 flex items-center gap-1">
                    ➡️ 全承認後の想定時間:
                    <span class="font-mono font-bold text-sm bg-white px-2.5 py-1 rounded border ${pendingCount > 0 ? 'text-emerald-600 border-emerald-300 shadow-sm' : 'text-gray-600 border-gray-200'}">
                        ${pendingCount > 0 ? afterApprovalTimeStr : totalWorkTimeStr}
                    </span>
                </span>
            </div>
        </div>
        <ul class="space-y-2">`;

        // ログリスト出力
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
        console.error("タイムラインデータ取得エラー:", error);
        contentEl.innerHTML = `<p class="text-center text-red-500 py-4 text-xs">データの取得に失敗しました。</p>`;
    }
}
