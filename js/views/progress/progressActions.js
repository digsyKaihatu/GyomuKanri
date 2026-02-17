// js/views/progress/progressActions.js

import { db, updateGlobalTaskObjects } from "../../main.js"; 
// ★ runTransaction を追加
import { doc, updateDoc, Timestamp, runTransaction } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { showConfirmationModal, hideConfirmationModal } from "../../components/modal/index.js";
import { escapeHtml } from "../../utils.js";

// ★共通トランザクション処理関数
async function updateTasksSafe(updateLogic) {
    const tasksRef = doc(db, "settings", "tasks");
    try {
        const newTaskList = await runTransaction(db, async (transaction) => {
            const sfDoc = await transaction.get(tasksRef);
            if (!sfDoc.exists()) throw "Document does not exist!";
            const currentList = sfDoc.data().list || [];
            
            // ロジック実行（データを加工）
            const updatedList = updateLogic(JSON.parse(JSON.stringify(currentList)));
            
            transaction.set(tasksRef, { list: updatedList });
            return updatedList;
        });
        updateGlobalTaskObjects(newTaskList);
        return true;
    } catch (e) {
        console.error("Transaction failed: ", e);
        alert("処理に失敗しました。他の人が変更した可能性があります。");
        return false;
    }
}

export async function handleCompleteGoal(taskName, goalId, onSuccessCallback) {
    if (!taskName || !goalId) return;

    // ※確認用モーダルの表示は元のままですが、その後の処理を差し替えます
    // 本当はモーダル表示前にDB確認すべきですが、UX上、押した瞬間の情報で確認を出します
    showConfirmationModal(
        `工数を完了にしますか？`, // 簡略化（タイトル取得が非同期になるため）
        async () => {
            hideConfirmationModal(); 

            const success = await updateTasksSafe((taskList) => {
                const taskIndex = taskList.findIndex((t) => t.name === taskName);
                if (taskIndex === -1) throw new Error("TASK_NOT_FOUND");
                
                const goalIndex = taskList[taskIndex].goals?.findIndex((g) => g.id === goalId || g.title === goalId);
                if (goalIndex === undefined || goalIndex === -1) throw new Error("GOAL_NOT_FOUND");

                taskList[taskIndex].goals[goalIndex].isComplete = true;
                taskList[taskIndex].goals[goalIndex].completedAt = Timestamp.now();
                return taskList;
            });

            if (success && typeof onSuccessCallback === 'function') onSuccessCallback();
        }
    );
}

export async function handleDeleteGoal(taskName, goalId, onSuccessCallback) {
    if (!taskName || !goalId) return;

    showConfirmationModal(
        `工数を完全に削除しますか？`,
        async () => {
            hideConfirmationModal(); 

            const success = await updateTasksSafe((taskList) => {
                const taskIndex = taskList.findIndex((t) => t.name === taskName);
                if (taskIndex === -1) throw new Error("TASK_NOT_FOUND");

                taskList[taskIndex].goals = taskList[taskIndex].goals.filter(
                    (g) => g.id !== goalId && g.title !== goalId
                );
                return taskList;
            });

            if (success && typeof onSuccessCallback === 'function') onSuccessCallback();
        }
    );
}
