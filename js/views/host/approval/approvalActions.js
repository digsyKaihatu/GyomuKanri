// js/views/host/approval/approvalActions.js
import { db, allTaskObjects, updateGlobalTaskObjects, userId as currentAdminId, userName as currentAdminName } from "../../../main.js";
import { collection, doc, writeBatch, getDoc, getDocs, query, where, updateDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

export async function handleApprove(reqDoc) {
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

export async function handleRejectRequest(reqDoc) {
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
