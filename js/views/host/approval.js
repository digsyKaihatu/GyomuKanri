// js/views/host/approval.js

import { db, showView, VIEWS, allTaskObjects, updateGlobalTaskObjects, userId as currentAdminId, userName as currentAdminName } from "../../main.js";
// 修正：updateDoc を正式にインポートに追加しました
import { collection, query, where, orderBy, onSnapshot, doc, writeBatch, getDoc, deleteDoc, getDocs, updateDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { escapeHtml, formatTime, formatDuration } from "../../utils.js";

let unsubscribe = null;

const handleBackClick = () => showView(VIEWS.HOST);

export function initializeApprovalView() {
    const container = document.getElementById(VIEWS.APPROVAL);
    if (!container) return; 

    const backBtn = document.getElementById("back-from-approval");
    backBtn?.addEventListener("click", handleBackClick);
    
    // 未承認 (pending) の申請を古い順にリアルタイム監視
    const q = query(
        collection(db, "work_log_requests"),
        where("status", "==", "pending"),
        orderBy("createdAt", "asc")
    );

    unsubscribe = onSnapshot(q, (snapshot) => {
        renderApprovalList(snapshot.docs);
    });
}

export function cleanupApprovalView() {
    if (unsubscribe) unsubscribe();
    const backBtn = document.getElementById("back-from-approval");
    backBtn?.removeEventListener("click", handleBackClick);
}

// ーーー 承認リストのUIレンダリング ーーー
function renderApprovalList(docs) {
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
            const goalText = d.goalTitle ? ` <span class="bg-gray-100 px-1 rounded border text-gray-500">[${escapeHtml(d.goalTitle)}]</span>` : "";
            const beforeStart = d.beforeStartTime || "変更なし";
            const beforeEnd = d.beforeEndTime || "変更なし";
            const afterStart = d.afterStartTime || "変更なし";
            const afterEnd = d.afterEndTime || "変更なし";
            const timeDiff = d.timeDifference || "変更なし";

            const beforeTimeStr = (beforeStart === "変更なし" && beforeEnd === "変更なし") ? "変更なし" : `${beforeStart} - ${beforeEnd}`;
            const afterTimeStr = (afterStart === "変更なし" && afterEnd === "変更なし") ? "変更なし" : `${afterStart} - ${afterEnd}`;

            infoHtml = `
                <div class="text-sm font-bold text-gray-800">訂正後業務: ${escapeHtml(d.task || d.taskName || "未定")} ${goalText}</div>
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

// ーーー 承認処理 ーーー
async function handleApprove(reqDoc) {
    if (!confirm("この申請を承認して、実際の勤務ログへ反映させますか？")) return;

    const req = reqDoc.data();
    const d = req.data || {};
    const batch = writeBatch(db);
    const reqRef = doc(db, "work_log_requests", reqDoc.id);

    try {
        const buildDateTime = (dateStr, timeStr) => {
            const [h, m] = timeStr.split(":");
            const dateObj = new Date(dateStr + "T00:00:00");
            dateObj.setHours(parseInt(h, 10), parseInt(m, 10), 0, 0);
            return dateObj;
        };

        if (req.type === "add") {
            const newLogRef = doc(collection(db, "work_logs"));
            const targetStartTime = d.afterStartTime || d.startTime;
            const targetEndTime = d.afterEndTime || d.endTime;

            const startD = buildDateTime(req.requestDate, targetStartTime);
            const endD = buildDateTime(req.requestDate, targetEndTime);
            const duration = Math.max(0, (endD - startD) / 1000);

            batch.set(newLogRef, {
                userId: req.userId,
                userName: req.userName,
                date: req.requestDate,
                startTime: startD,
                endTime: endD,
                duration: duration,
                task: d.task,
                goalId: d.goalId || null,
                goalTitle: d.goalTitle || null,
                count: d.count || 0,
                contribution: d.count || 0, 
                memo: d.memo ? `${d.memo} [追加申請承認済]` : "[追加申請承認済]",
                type: "work"
            });

            if (d.goalId && d.count > 0) {
                await updateGoalProgress(d.task, d.goalId, d.count);
            }
        }
        else if (req.type === "time_correct" || req.type === "update") {
            const targetId = req.targetLogId;
            if (!targetId) throw new Error("対象の元ログIDが見つかりません。");
            const logRef = doc(db, "work_logs", targetId);
            
            const startD = buildDateTime(req.requestDate, d.afterStartTime);
            const endD = buildDateTime(req.requestDate, d.afterEndTime);
            const duration = Math.max(0, (endD - startD) / 1000);

            batch.update(logRef, {
                task: d.task,
                goalId: d.goalId || null,
                goalTitle: d.goalTitle || null,
                startTime: startD,
                endTime: endD,
                duration: duration,
                memo: d.memo ? `${d.memo} [時間訂正承認済]` : "[時間訂正承認済]"
            });
        }
        else if (req.type === "count_correct") {
            if (!req.targetLogId) throw new Error("対象の元ログIDが見つかりません。");
            const logRef = doc(db, "work_logs", req.targetLogId);
            const logSnap = await getDoc(logRef);
            
            if (!logSnap.exists()) {
                alert("エラー：修正対象の元ログがすでに削除されています。");
                return;
            }
            
            const oldLog = logSnap.data();
            const oldContribution = oldLog.contribution || oldLog.count || 0;
            const diff = (d.count || 0) - oldContribution;

            batch.update(logRef, {
                count: d.count || 0,
                contribution: d.count || 0,
                memo: d.memo ? `${d.memo} [件数修正承認済]` : "[件数修正承認済]"
            });

            if (oldLog.goalId && diff !== 0) {
                await updateGoalProgress(oldLog.task, oldLog.goalId, diff);
            }
        }
        else if (req.type === "forget_checkout") {
            const qLogs = query(
                collection(db, "work_logs"),
                where("userId", "==", req.userId),
                where("date", "==", req.requestDate)
            );
            const snapshot = await getDocs(qLogs);

            if (snapshot.empty) {
                alert("エラー：該当日に勤務ログが存在しないため補正できません。");
                return;
            }

            const targetCheckoutTime = d.afterEndTime || d.checkoutTime;
            const checkoutTimeObj = buildDateTime(req.requestDate, targetCheckoutTime);

            const logsForDay = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .sort((a, b) => {
                    const tA = a.startTime?.toMillis ? a.startTime.toMillis() : new Date(a.startTime).getTime();
                    const tB = b.startTime?.toMillis ? b.startTime.toMillis() : new Date(b.startTime).getTime();
                    return tB - tA;
                });

            const lastLogToUpdate = logsForDay.find(log => {
                const sDate = log.startTime?.toDate ? log.startTime.toDate() : new Date(log.startTime);
                return sDate < checkoutTimeObj;
            });

            if (!lastLogToUpdate) {
                alert("エラー：申告された退勤時刻よりも前に開始された有効なログがありません。");
                return;
            }

            const lastLogStart = lastLogToUpdate.startTime?.toDate ? lastLogToUpdate.startTime.toDate() : new Date(lastLogToUpdate.startTime);
            const newDuration = Math.max(0, Math.floor((checkoutTimeObj - lastLogStart) / 1000));
            
            const targetLogRef = doc(db, "work_logs", lastLogToUpdate.id);
            batch.update(targetLogRef, {
                endTime: checkoutTimeObj,
                duration: newDuration,
                memo: d.memo ? `${d.memo} [退勤忘れ修正承認済]` : "[退勤忘れ修正承認済]"
            });

            logsForDay.forEach(log => {
                const sTime = log.startTime?.toMillis ? log.startTime.toMillis() : new Date(log.startTime).getTime();
                const lastTime = lastLogToUpdate.startTime?.toMillis ? lastLogToUpdate.startTime.toMillis() : new Date(lastLogToUpdate.startTime).getTime();
                if (sTime > lastTime) {
                    batch.delete(doc(db, "work_logs", log.id));
                }
            });

            const statusRef = doc(db, "work_status", req.userId);
            batch.update(statusRef, { needsCheckoutCorrection: false });
        }

        // 承認完了ログをメタデータに上書き追記
        batch.update(reqRef, {
            status: "approved",
            approverId: currentAdminId,
            approverName: currentAdminName,
            approvedAt: new Date().toISOString()
        });

        await batch.commit();
        alert("申請を承認し、勤務記録への書き込みを完了しました。");
        
    } catch (error) {
        console.error("Approval critical error:", error);
        alert(`承認処理中にシステムエラーが発生しました: ${error.message}`);
    }
}

// ーーー 【機能改修】申請の却下処理 ーーー
// データをdeleteDocするのではなく、「却下(rejected)」に更新して誰が・いつ対応したかのログを残します
async function handleRejectRequest(reqDoc) {
    if (!confirm("この申請を却下しますか？")) return;

    const reqRef = doc(db, "work_log_requests", reqDoc.id);
    try {
        // 要件通りにログを残すため、statusを「rejected」に更新し、承認者メタデータを追記
        await updateDoc(reqRef, {
            status: "rejected",
            approverId: currentAdminId,
            approverName: currentAdminName,
            approvedAt: new Date().toISOString()
        });
        alert("申請を却下しました。申請履歴にログが保持されます。");
    } catch (error) {
        console.error("Reject error:", error);
        alert("却下処理中にエラーが発生しました。");
    }
}

// ーーー 進捗小項目の数値を安全に更新するヘルパー ーーー
async function updateGoalProgress(taskName, goalId, diff) {
    if (!allTaskObjects) return;
    
    const updatedTasks = JSON.parse(JSON.stringify(allTaskObjects));
    const taskIdx = updatedTasks.findIndex(t => t.name === taskName);
    if (taskIdx === -1) return;
    
    const goalIdx = updatedTasks[taskIdx].goals.findIndex(g => g.id === goalId || g.title === goalId);
    if (goalIdx === -1) return;

    updatedTasks[taskIdx].goals[goalIdx].current = Math.max(0, (updatedTasks[taskIdx].goals[goalIdx].current || 0) + diff);

    try {
        await updateDoc(doc(db, "settings", "tasks"), { list: updatedTasks });
        updateGlobalTaskObjects(updatedTasks);
    } catch (e) {
        console.error("Failed to sync goal progress master:", e);
    }
}

// ーーー タイムライン確認モーダルの展開表示 ーーー
async function showTimelineModal(targetUserId, targetUserName, dateStr) {
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
                <p class="text-center text-gray-500 py-4">データを読み込み中...</p>
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
    document.getElementById("approval-timeline-modal").onclick = (e) => { if(e.target.id === "approval-timeline-modal") closeModal(); };

    const contentEl = document.getElementById("timeline-content");
    try {
        const q = query(collection(db, "work_logs"), where("userId", "==", targetUserId), where("date", "==", dateStr));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
    contentEl.innerHTML = `<p class="text-center text-gray-500 py-4 text-xs">この日の業務記録はありません。</p>`; // ← 末尾を ` に修正
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
