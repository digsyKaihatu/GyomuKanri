// js/views/host/approval.js

import { db, showView, VIEWS, allTaskObjects, updateGlobalTaskObjects, userId as currentAdminId, userName as currentAdminName } from "../../main.js";
import { collection, query, where, orderBy, onSnapshot, doc, writeBatch, getDoc, deleteDoc, getDocs, updateDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { escapeHtml, formatTime, formatDuration } from "../../utils.js";

let unsubscribe = null;
const logCache = {}; // 過去ログのキャッシュコンテナ

const handleBackClick = () => showView(VIEWS.HOST);

export function initializeApprovalView() {
    const container = document.getElementById(VIEWS.APPROVAL);
    if (!container) return; 

    // ★【新機能】テンプレートファイルを変更する代わりに、ここで戻るボタンの左側に動的にボタンを配置します
    injectLogViewButton();

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

// ★【新機能】戻るボタンの左側にログ閲覧ボタンを自動で綺麗に並べる関数
function injectLogViewButton() {
    // 重複生成を防ぐガード節
    if (document.getElementById("view-approval-log-btn")) return;
    
    const backBtn = document.getElementById("back-from-approval");
    if (backBtn) {
        const parent = backBtn.parentNode;
        
        // 2つのボタンを綺麗に横並び（隙間 gap-2）にするための小さなラッパーDivを生成
        const wrapper = document.createElement("div");
        wrapper.className = "flex items-center gap-2";
        
        // ログ閲覧ボタンを生成
        const btn = document.createElement("button");
        btn.id = "view-approval-log-btn";
        btn.className = "bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded shadow transition text-sm";
        btn.innerHTML = `📋 ログ閲覧`;
        
        // 元の戻るボタンの位置にラッパーを差し込み、その中に「ログ閲覧」と「戻る」ボタンを綺麗に格納
        parent.insertBefore(wrapper, backBtn);
        wrapper.appendChild(btn);
        wrapper.appendChild(backBtn);
        
        // クリックイベントの紐付け
        btn.addEventListener("click", openApprovalLogModal);
    }
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

// ーーー 申請の却下処理 ーーー
async function handleRejectRequest(reqDoc) {
    if (!confirm("この申請を却下しますか？")) return;

    const reqRef = doc(db, "work_log_requests", reqDoc.id);
    try {
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

// ーーー ★【新機能】全従業員の申請履歴過去ログモーダルの制御 ーーー
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
    if (!select || select.children.length > 1) return; // 既に生成済みならスキップ
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
        requests.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
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

function openApprovalLogModal() {
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
