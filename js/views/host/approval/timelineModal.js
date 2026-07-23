// js/views/host/approval/timelineModal.js
import { db } from "../../../main.js";
import { collection, query, where, onSnapshot } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { escapeHtml, formatTime, formatDuration } from "../../../utils.js";

// モーダル内で保持するローカルデータと監視解除用関数
let currentUnsubscribes = [];

function parseTimeToSeconds(timeStr) {
    if (!timeStr || typeof timeStr !== 'string' || timeStr === '変更なし') return null;
    const parts = timeStr.split(':').map(Number);
    if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        return (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0);
    }
    return null;
}

function parseTimeDiffToSeconds(diffStr) {
    if (!diffStr || typeof diffStr !== 'string' || diffStr === '変更なし') return 0;
    let sign = diffStr.startsWith('-') ? -1 : 1;
    let str = diffStr.replace(/^[+-]/, '').trim();
    
    let minutes = 0;
    const hourMatch = str.match(/(\d+)\s*時間/);
    const minMatch = str.match(/(\d+)\s*分/);
    
    if (hourMatch) minutes += parseInt(hourMatch[1], 10) * 60;
    if (minMatch) minutes += parseInt(minMatch[1], 10);
    if (!hourMatch && !minMatch) {
        const num = parseInt(str, 10);
        if (!isNaN(num)) minutes = num;
    }
    
    return sign * minutes * 60;
}

export function showTimelineModal(targetUserId, targetUserName, dateStr) {
    closeTimelineModal();

    const modalHtml = `
    <div id="approval-timeline-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-xl shadow-lg w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div class="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-xl">
                <div class="flex items-center gap-2">
                    <h3 class="font-bold text-gray-700 text-lg">
                        📅 ${escapeHtml(targetUserName)} さんの業務記録 <span class="text-sm font-normal text-gray-500">(${dateStr})</span>
                    </h3>
                    <span id="timeline-cache-badge" class="text-[10px] text-gray-400 font-mono"></span>
                </div>
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

    document.getElementById("close-timeline-modal").onclick = closeTimelineModal;
    document.getElementById("close-timeline-btn-btm").onclick = closeTimelineModal;
    document.getElementById("approval-timeline-modal").onclick = (e) => { 
        if (e.target === document.getElementById("approval-timeline-modal")) closeTimelineModal(); 
    };

    setupTimelineSnapshotWithDocChanges(targetUserId, dateStr);
}

function closeTimelineModal() {
    currentUnsubscribes.forEach(unsub => unsub && unsub());
    currentUnsubscribes = [];
    document.getElementById("approval-timeline-modal")?.remove();
}

/**
 * docChanges() を活用した差分更新リスナー
 */
function setupTimelineSnapshotWithDocChanges(targetUserId, dateStr) {
    const contentEl = document.getElementById("timeline-content");
    const cacheBadge = document.getElementById("timeline-cache-badge");

    // ローカル状態管理用マップ (docId -> docData)
    const logsMap = new Map();
    const requestsMap = new Map();

    const render = (isFromCache, changeType) => {
        if (cacheBadge) {
            if (isFromCache) {
                cacheBadge.textContent = "⚡ キャッシュ表示中";
            } else {
                cacheBadge.textContent = changeType ? `✨ 差分適用 (${changeType})` : "☁️ Firestore同期済";
            }
        }

        const sortedLogs = Array.from(logsMap.values()).sort((a, b) => {
            const tA = a.startTime?.toMillis ? a.startTime.toMillis() : new Date(a.startTime).getTime();
            const tB = b.startTime?.toMillis ? b.startTime.toMillis() : new Date(b.startTime).getTime();
            return tA - tB;
        });

        const requestsList = Array.from(requestsMap.values());

        renderTimelineUI(contentEl, sortedLogs, requestsList);
    };

    // 1. work_logs の docChanges() 監視
    const qLogs = query(
        collection(db, "work_logs"), 
        where("userId", "==", targetUserId), 
        where("date", "==", dateStr)
    );

    const unsubLogs = onSnapshot(qLogs, (snapshot) => {
        const isFromCache = snapshot.metadata.fromCache;
        let lastChangeType = "";

        // 🔥 docChanges() で追加・更新・削除の差分のみ処理
        snapshot.docChanges().forEach((change) => {
            const docId = change.doc.id;
            lastChangeType = change.type;

            if (change.type === "added" || change.type === "modified") {
                logsMap.set(docId, { id: docId, ...change.doc.data() });
            } else if (change.type === "removed") {
                logsMap.delete(docId);
            }
        });

        render(isFromCache, lastChangeType);
    });

    // 2. work_log_requests の docChanges() 監視
    const qRequests = query(
        collection(db, "work_log_requests"),
        where("userId", "==", targetUserId),
        where("requestDate", "==", dateStr),
        where("status", "==", "pending")
    );

    const unsubRequests = onSnapshot(qRequests, (snapshot) => {
        const isFromCache = snapshot.metadata.fromCache;
        let lastChangeType = "";

        // 🔥 docChanges() で追加・更新・削除の差分のみ処理
        snapshot.docChanges().forEach((change) => {
            const docId = change.doc.id;
            lastChangeType = change.type;

            if (change.type === "added" || change.type === "modified") {
                requestsMap.set(docId, { id: docId, ...change.doc.data() });
            } else if (change.type === "removed") {
                requestsMap.delete(docId);
            }
        });

        render(isFromCache, lastChangeType);
    });

    currentUnsubscribes.push(unsubLogs, unsubRequests);
}

/**
 * 画面描画用関数
 */
function renderTimelineUI(contentEl, logs, pendingRequests) {
    if (!contentEl) return;

    if (logs.length === 0 && pendingRequests.length === 0) {
        contentEl.innerHTML = `<p class="text-center text-gray-500 py-4 text-xs">この日の業務記録・申請はありません。</p>`;
        return;
    }

    const totalWorkDuration = logs.reduce((total, log) => {
        if (log.task === '休憩' || log.type === 'goal') return total;
        return total + (Number(log.duration) || 0);
    }, 0);

    const pendingCount = pendingRequests.length;
    let afterApprovalDuration = totalWorkDuration;

    pendingRequests.forEach(req => {
        const d = req.data || {};
        const taskName = d.task || d.taskName || d.beforeTask || "";
        if (taskName === '休憩') return;

        const reqType = req.type;
        const startStr = d.afterStartTime || d.startTime;
        const endStr = d.afterEndTime || d.endTime || d.checkoutTime;

        const startSec = parseTimeToSeconds(startStr);
        const endSec = parseTimeToSeconds(endStr);

        let newDurationSec = null;
        if (startSec !== null && endSec !== null && endSec > startSec) {
            newDurationSec = endSec - startSec;
        }

        if (reqType === 'add') {
            if (newDurationSec !== null) afterApprovalDuration += newDurationSec;
            else if (d.timeDifference) afterApprovalDuration += parseTimeDiffToSeconds(d.timeDifference);
        } 
        else if (reqType === 'time_correct' || reqType === 'update') {
            const targetLogId = req.targetLogId || d.targetLogId;
            const originalLog = logs.find(l => l.id === targetLogId);
            const oldDurationSec = originalLog ? (Number(originalLog.duration) || 0) : 0;

            if (newDurationSec !== null) afterApprovalDuration += (newDurationSec - oldDurationSec);
            else if (d.timeDifference) afterApprovalDuration += parseTimeDiffToSeconds(d.timeDifference);
        }
        else if (reqType === 'forget_checkout') {
            const targetLogId = req.targetLogId || d.targetLogId;
            const originalLog = logs.find(l => l.id === targetLogId);
            const oldDurationSec = originalLog ? (Number(originalLog.duration) || 0) : 0;

            let calcNewSec = newDurationSec;
            if (calcNewSec === null && endSec !== null && originalLog && originalLog.startTime) {
                const origStartSec = parseTimeToSeconds(formatTime(originalLog.startTime));
                if (origStartSec !== null && endSec > origStartSec) {
                    calcNewSec = endSec - origStartSec;
                }
            }

            if (calcNewSec !== null) afterApprovalDuration += (calcNewSec - oldDurationSec);
        }
    });

    afterApprovalDuration = Math.max(0, afterApprovalDuration);

    const totalWorkTimeStr = formatDuration(totalWorkDuration);
    const afterApprovalTimeStr = formatDuration(afterApprovalDuration);

    let html = `
    <div class="mb-4 p-3 bg-indigo-50 border border-indigo-100 rounded-lg text-xs space-y-2.5">
        <div class="flex items-center justify-between">
            <span class="font-bold text-gray-700 flex items-center gap-1">
                ⏱️ 修正前 合計稼働時間 <span class="text-[10px] text-gray-500 font-normal">(休憩除く)</span>
            </span>
            <span class="font-mono font-bold text-gray-700 text-sm bg-white px-2.5 py-1 rounded border border-gray-200">
                ${totalWorkTimeStr}
            </span>
        </div>
        
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-indigo-100">
            <span class="font-bold flex items-center gap-1 ${pendingCount > 0 ? 'text-amber-600' : 'text-gray-500'}">
                📝 この日の未承認の申請: <span class="bg-white px-2 py-0.5 rounded border border-indigo-100">${pendingCount} 件</span>
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
}
