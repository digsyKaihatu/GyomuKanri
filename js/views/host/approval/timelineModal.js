// js/views/host/approval/timelineModal.js
import { db } from "../../../main.js";
import { collection, query, where, onSnapshot } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { escapeHtml, formatTime, formatDuration } from "../../../utils.js";
import { handleApprove, handleRejectRequest } from "./approvalActions.js";

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
        <div class="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
            <!-- モーダルヘッダー -->
            <div class="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-xl">
                <div class="flex items-center gap-3">
                    <h3 class="font-bold text-gray-800 text-lg flex items-center gap-2">
                        📅 <span>${escapeHtml(targetUserName)}</span> さんの勤務タイムライン 
                        <span class="text-sm font-normal text-gray-500">(${escapeHtml(dateStr)})</span>
                    </h3>
                    <span id="timeline-cache-badge" class="text-[10px] text-gray-400 font-mono"></span>
                </div>
                <button id="close-timeline-modal" class="text-gray-400 hover:text-gray-700 text-2xl font-bold leading-none">&times;</button>
            </div>

            <!-- 2カラムコンテンツ -->
            <div id="timeline-modal-body" class="p-4 overflow-y-auto custom-scrollbar flex-grow bg-gray-50/50">
                <p class="text-center text-gray-400 py-8">データを読み込み中...</p>
            </div>

            <!-- モーダルフッター -->
            <div class="p-3 border-t bg-gray-50 rounded-b-xl flex justify-between items-center">
                <div class="text-xs text-gray-500 italic">
                    💡 右側の仮タイムラインで「💬 コメントあり」にマウスオーバーすると申請時のメモを確認できます。
                </div>
                <button id="close-timeline-btn-btm" class="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-1.5 px-5 rounded-lg text-xs transition">閉じる</button>
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

function setupTimelineSnapshotWithDocChanges(targetUserId, dateStr) {
    const modalBodyEl = document.getElementById("timeline-modal-body");
    const cacheBadge = document.getElementById("timeline-cache-badge");

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

        render2ColumnTimelineUI(modalBodyEl, sortedLogs, requestsList);
    };

    // 1. 勤務ログのリアルタイム監視
    const qLogs = query(
        collection(db, "work_logs"), 
        where("userId", "==", targetUserId), 
        where("date", "==", dateStr)
    );

    const unsubLogs = onSnapshot(qLogs, (snapshot) => {
        const isFromCache = snapshot.metadata.fromCache;
        let lastChangeType = "";

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

    // 2. 申請データのリアルタイム監視
    const qRequests = query(
        collection(db, "work_log_requests"),
        where("userId", "==", targetUserId),
        where("requestDate", "==", dateStr),
        where("status", "==", "pending")
    );

    const unsubRequests = onSnapshot(qRequests, (snapshot) => {
        const isFromCache = snapshot.metadata.fromCache;
        let lastChangeType = "";

        snapshot.docChanges().forEach((change) => {
            const docId = change.doc.id;
            lastChangeType = change.type;

            if (change.type === "added" || change.type === "modified") {
                requestsMap.set(docId, change.doc);
            } else if (change.type === "removed") {
                requestsMap.delete(docId);
            }
        });

        render(isFromCache, lastChangeType);
    });

    currentUnsubscribes.push(unsubLogs, unsubRequests);
}

/**
 * 2カラム（修正前 vs 全承認後）描画関数
 */
function render2ColumnTimelineUI(containerEl, logs, pendingRequestDocs) {
    if (!containerEl) return;

    if (logs.length === 0 && pendingRequestDocs.length === 0) {
        containerEl.innerHTML = `<p class="text-center text-gray-500 py-8 text-xs">この日の業務記録・申請はありません。</p>`;
        return;
    }

    // ① 修正前の合計時間
    const totalWorkDurationBefore = logs.reduce((total, log) => {
        if (log.task === '休憩' || log.type === 'goal') return total;
        return total + (Number(log.duration) || 0);
    }, 0);

    // ② 仮タイムライン（全承認後）用データの構成
    const simulatedLogs = logs.map(l => ({ ...l, pendingReqs: [] }));
    const standaloneRequests = [];

    pendingRequestDocs.forEach(reqDocSnap => {
        const req = reqDocSnap.data();
        const d = req.data || {};
        const reqType = req.type;
        const targetLogId = req.targetLogId || d.targetLogId;

        const targetLog = simulatedLogs.find(l => l.id === targetLogId);

        if (targetLog) {
            targetLog.pendingReqs.push({ docSnap: reqDocSnap, reqData: req });
            if (reqType === 'time_correct' || reqType === 'update') {
                if (d.task || d.taskName) targetLog.task = d.task || d.taskName;
                if (d.goalTitle !== undefined) targetLog.goalTitle = d.goalTitle;
                if (d.afterStartTime) targetLog.simulatedStartTime = d.afterStartTime;
                if (d.afterEndTime) targetLog.simulatedEndTime = d.afterEndTime;
            } else if (reqType === 'count_correct') {
                if (d.count !== undefined) targetLog.contribution = d.count;
            } else if (reqType === 'forget_checkout') {
                if (d.afterEndTime || d.checkoutTime) targetLog.simulatedEndTime = d.afterEndTime || d.checkoutTime;
            }
        } else {
            standaloneRequests.push({ docSnap: reqDocSnap, reqData: req });
        }
    });

    // 新規追加申請ログを仮タイムラインに追加
    standaloneRequests.forEach(item => {
        const req = item.reqData;
        const d = req.data || {};
        simulatedLogs.push({
            id: `req_${item.docSnap.id}`,
            task: d.task || d.taskName || "新規追加業務",
            goalTitle: d.goalTitle || "",
            simulatedStartTime: d.afterStartTime || d.startTime || "00:00",
            simulatedEndTime: d.afterEndTime || d.endTime || "00:00",
            contribution: d.count,
            pendingReqs: [{ docSnap: item.docSnap, reqData: req }]
        });
    });

    // 仮タイムラインの時刻ソート
    simulatedLogs.sort((a, b) => {
        const getSec = (log) => {
            // ① 申請による変更後の時間("12:13"など)があれば、それを秒に変換（"変更なし"の場合は null になる）
            if (log.simulatedStartTime) {
                const sec = parseTimeToSeconds(log.simulatedStartTime);
                if (sec !== null) return sec;
            }
            // ② 変更後の時間がない、または"変更なし"の場合は、元の startTime をフォーマットして秒に変換
            if (log.startTime) {
                const timeStr = formatTime(log.startTime);
                const sec = parseTimeToSeconds(timeStr);
                if (sec !== null) return sec;
            }
            return 0;
        };
        return getSec(a) - getSec(b);
    });

    // 想定合計時間の計算
    let totalWorkDurationAfter = totalWorkDurationBefore;
    pendingRequestDocs.forEach(docSnap => {
        const req = docSnap.data();
        const d = req.data || {};
        const taskName = d.task || d.taskName || d.beforeTask || "";
        if (taskName === '休憩') return;

        const startSec = parseTimeToSeconds(d.afterStartTime || d.startTime);
        const endSec = parseTimeToSeconds(d.afterEndTime || d.endTime || d.checkoutTime);
        let newSec = (startSec !== null && endSec !== null && endSec > startSec) ? (endSec - startSec) : null;

        if (req.type === 'add') {
            if (newSec !== null) totalWorkDurationAfter += newSec;
            else if (d.timeDifference) totalWorkDurationAfter += parseTimeDiffToSeconds(d.timeDifference);
        } else if (req.type === 'time_correct' || req.type === 'update' || req.type === 'forget_checkout') {
            const originalLog = logs.find(l => l.id === (req.targetLogId || d.targetLogId));
            const oldSec = originalLog ? (Number(originalLog.duration) || 0) : 0;
            if (newSec !== null) totalWorkDurationAfter += (newSec - oldSec);
            else if (d.timeDifference) totalWorkDurationAfter += parseTimeDiffToSeconds(d.timeDifference);
        }
    });

    totalWorkDurationAfter = Math.max(0, totalWorkDurationAfter);

    // HTMLの構築
    containerEl.innerHTML = `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- 左カラム: 修正前タイムライン -->
        <div class="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col">
            <div class="pb-3 mb-3 border-b border-gray-100 flex justify-between items-center">
                <h4 class="font-bold text-gray-700 text-sm flex items-center gap-1.5">
                    <span class="w-2.5 h-2.5 rounded-full bg-gray-400"></span> 修正前 タイムライン (現在)
                </h4>
                <span class="text-xs font-mono font-bold text-gray-600 bg-gray-100 px-2 py-1 rounded">
                    合計: ${formatDuration(totalWorkDurationBefore)}
                </span>
            </div>
            <div class="space-y-2.5 overflow-y-auto max-h-[60vh] pr-1">
                ${renderOriginalTimelineListHtml(logs)}
            </div>
        </div>

        <!-- 右カラム: 全部承認後の仮タイムライン -->
        <div class="bg-white p-4 rounded-xl border-2 border-indigo-200 shadow-sm flex flex-col">
            <div class="pb-3 mb-3 border-b border-indigo-100 flex justify-between items-center bg-indigo-50/50 -m-4 p-4 rounded-t-xl">
                <h4 class="font-bold text-indigo-900 text-sm flex items-center gap-1.5">
                    <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span> 仮タイムライン (全部承認後)
                </h4>
                <span class="text-xs font-mono font-bold text-emerald-700 bg-emerald-100 px-2 py-1 rounded border border-emerald-200">
                    想定合計: ${formatDuration(totalWorkDurationAfter)}
                </span>
            </div>
            <div class="space-y-2.5 overflow-y-auto max-h-[60vh] pr-1 mt-2">
                ${renderSimulatedTimelineListHtml(simulatedLogs)}
            </div>
        </div>
    </div>`;

    // 右カラム内の承認・却下ボタンイベント紐付け
    containerEl.querySelectorAll(".approve-single-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const docId = e.currentTarget.dataset.docid;
            const reqDocSnap = pendingRequestDocs.find(d => d.id === docId);
            if (reqDocSnap) handleApprove(reqDocSnap);
        });
    });

    containerEl.querySelectorAll(".reject-single-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const docId = e.currentTarget.dataset.docid;
            const reqDocSnap = pendingRequestDocs.find(d => d.id === docId);
            if (reqDocSnap) handleRejectRequest(reqDocSnap);
        });
    });
}

/**
 * 修正前リスト描画
 */
function renderOriginalTimelineListHtml(logs) {
    if (logs.length === 0) return `<p class="text-xs text-gray-400 text-center py-6">勤務ログがありません</p>`;

    return logs.map(log => {
        const isGoalLog = log.type === 'goal';
        const bgColor = log.task === '休憩' ? 'bg-yellow-50/60 border-yellow-200' : (isGoalLog ? 'bg-green-50/60 border-green-200' : 'bg-gray-50 border-gray-200');
        const startStr = formatTime(log.startTime);
        const endStr = log.endTime ? formatTime(log.endTime) : '---';
        const durationStr = log.duration ? formatDuration(log.duration) : '';

        let mainContent = `<span class="font-bold text-gray-800 text-xs">${escapeHtml(log.task)}</span>`;
        if (log.goalTitle) mainContent += ` <span class="text-[10px] text-gray-500 bg-white border border-gray-200 px-1 rounded ml-1">${escapeHtml(log.goalTitle)}</span>`;
        if (log.contribution) mainContent += ` <span class="text-[10px] font-bold text-orange-600 ml-1">+${log.contribution}件</span>`;

        const timeDisplay = isGoalLog 
            ? `<span class="text-[10px] text-gray-400">${startStr} (進捗)</span>` 
            : `<span class="font-mono text-xs text-gray-600 bg-white px-1.5 py-0.5 rounded border border-gray-200">${startStr} - ${endStr}</span>`;

        return `
        <div class="p-2.5 rounded-lg border ${bgColor} flex justify-between items-center gap-2">
            <div class="space-y-1">
                <div class="flex items-center flex-wrap gap-1.5">
                    ${timeDisplay}
                    ${mainContent}
                </div>
                ${log.memo ? `<div class="text-[11px] text-gray-400 italic pl-1.5 border-l-2 border-gray-300">${escapeHtml(log.memo)}</div>` : ''}
            </div>
            ${!isGoalLog ? `<div class="font-bold text-gray-500 text-xs font-mono whitespace-nowrap">${durationStr}</div>` : ''}
        </div>`;
    }).join('');
}

/**
 * 全承認後の仮タイムライン描画 (ボタン・マウスオーバーコメント表示機能付き)
 */
function renderSimulatedTimelineListHtml(simulatedLogs) {
    if (simulatedLogs.length === 0) return `<p class="text-xs text-gray-400 text-center py-6">タイムラインデータがありません</p>`;

    return simulatedLogs.map(log => {
        const isGoalLog = log.type === 'goal';
        const hasPending = log.pendingReqs && log.pendingReqs.length > 0;
        
        let bgColor = log.task === '休憩' ? 'bg-yellow-50 border-yellow-200' : (isGoalLog ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200');
        if (hasPending) bgColor = 'bg-indigo-50/70 border-indigo-300 shadow-sm';

        const startStr = log.simulatedStartTime || formatTime(log.startTime);
        const endStr = log.simulatedEndTime || (log.endTime ? formatTime(log.endTime) : '---');

        let mainContent = `<span class="font-bold text-gray-800 text-xs">${escapeHtml(log.task)}</span>`;
        if (log.goalTitle) mainContent += ` <span class="text-[10px] text-gray-500 bg-white border border-gray-200 px-1 rounded ml-1">${escapeHtml(log.goalTitle)}</span>`;
        if (log.contribution !== undefined && log.contribution !== null) {
            mainContent += ` <span class="text-[10px] font-bold text-orange-600 ml-1">+${log.contribution}件</span>`;
        }

        const timeDisplay = isGoalLog 
            ? `<span class="text-[10px] text-gray-400">${startStr} (進捗)</span>` 
            : `<span class="font-mono text-xs text-indigo-700 bg-indigo-100/80 px-1.5 py-0.5 rounded font-bold">${startStr} - ${endStr}</span>`;

        // 申請アクションエリア（操作ボタン ＆ ホバーツールチップ）
        let actionAreaHtml = '';
        if (hasPending) {
            actionAreaHtml = log.pendingReqs.map(item => {
                const reqDocSnap = item.docSnap;
                const req = item.reqData;
                const d = req.data || {};
                const docId = reqDocSnap.id;

                const appType = d.applicationType || (req.type === "add" ? "追加" : "変更");
                const memoText = d.memo || d.reason || "理由記述なし";
                const reasonCat = d.reasonCategory ? `[${d.reasonCategory}] ` : "";
                const fullComment = reasonCat + memoText;

                return `
                <div class="mt-2 pt-2 border-t border-indigo-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white/80 p-2 rounded-lg relative">
                    <!-- マウスオーバーでコメント表示する要素 -->
                    <!-- 💡 title属性を追加して、ブラウザ標準のツールチップでも確実に読めるように保険をかける -->
                    <div class="relative group cursor-help flex items-center gap-1.5" title="${escapeHtml(fullComment)}">
                        <span class="bg-amber-100 text-amber-800 text-[10px] font-bold px-1.5 py-0.5 rounded border border-amber-200">
                            仮: ${escapeHtml(appType)}申請
                        </span>
                        <span class="text-[11px] text-indigo-700 font-semibold underline decoration-dotted">
                            💬 コメントあり (ホバーで確認)
                        </span>

                        <!-- ホバー時の黒いツールチップ（デザイン版） -->
                        <!-- 💡 下に表示させ、opacityとvisibilityで表示制御＆z-index強化 -->
                        <div class="absolute left-0 top-full mt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible z-[100] w-64 p-2.5 bg-gray-900 text-white text-xs rounded-lg shadow-xl pointer-events-none transition-all duration-200">
                            <div class="font-bold text-amber-300 mb-0.5">📌 申請コメント / 理由</div>
                            <div class="text-[11px] leading-relaxed text-gray-200 whitespace-pre-wrap">${escapeHtml(fullComment)}</div>
                            <div class="text-[9px] text-gray-400 mt-1 border-t border-gray-700 pt-0.5">申請者: ${escapeHtml(req.userName || "")}</div>
                        </div>
                    </div>

                    <!-- 承認・却下ボタン -->
                    <div class="flex items-center gap-1.5 ml-auto">
                        <button data-docid="${docId}" class="approve-single-btn bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2.5 py-1 rounded text-[11px] transition shadow-sm focus:outline-none">
                            承認
                        </button>
                        <button data-docid="${docId}" class="reject-single-btn bg-red-500 hover:bg-red-600 text-white font-bold px-2.5 py-1 rounded text-[11px] transition shadow-sm focus:outline-none">
                            却下
                        </button>
                    </div>
                </div>`;
            }).join('');
        }

        // 💡 外枠の div に `relative hover:z-50` を追加して、ホバー時に裏へ隠れるのを防ぐ
        return `
        <div class="p-2.5 rounded-lg border ${bgColor} flex flex-col gap-1 transition relative hover:z-50">
            <div class="flex justify-between items-center gap-2">
                <div class="flex items-center flex-wrap gap-1.5">
                    ${timeDisplay}
                    ${mainContent}
                </div>
            </div>
            ${actionAreaHtml}
        </div>`;
    }).join('');
}
