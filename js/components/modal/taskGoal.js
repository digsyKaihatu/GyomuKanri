// js/components/modal/taskGoal.js
import { db } from "../../firebase.js";
// ★ runTransaction を追加
import { doc, runTransaction } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { allTaskObjects, updateGlobalTaskObjects, escapeHtml } from "../../main.js";
import { showModal, closeModal, showConfirmationModal, taskModal, goalModal } from "./core.js";

// ... (openTaskModal, openGoalModal は変更なし) ...

export function openTaskModal(task = null) {
    const title = document.getElementById("task-modal-title");
    const nameIn = document.getElementById("task-name-input");
    const catSel = document.getElementById("task-category-select");
    const memoIn = document.getElementById("task-memo-input");
    if (!taskModal || !nameIn) return;

    if (task) {
        title.textContent = "業務を編集";
        nameIn.value = task.name;
        catSel.value = task.category || "A";
        memoIn.value = task.memo || "";
        taskModal.dataset.editingName = task.name;
    } else {
        title.textContent = "新しい業務を追加";
        nameIn.value = ""; catSel.value = "A"; memoIn.value = "";
        delete taskModal.dataset.editingName;
    }
    showModal(taskModal);
    nameIn.focus();
}

export function openGoalModal(mode, taskName, goalId = null) {
    const title = document.getElementById("goal-modal-title");
    const taskIn = document.getElementById("goal-modal-task-name");
    const idIn = document.getElementById("goal-modal-goal-id");
    const titleIn = document.getElementById("goal-modal-title-input");
    const targetIn = document.getElementById("goal-modal-target-input");
    const deadlineIn = document.getElementById("goal-modal-deadline-input");
    const effortIn = document.getElementById("goal-modal-effort-deadline-input");
    const memoIn = document.getElementById("goal-modal-memo-input");
    goalModal.dataset.currentGoalId = goalId || "";

    if (idIn) idIn.value = goalId || "";
    if (taskIn) taskIn.value = taskName;

    if (!goalModal) return;

    taskIn.value = taskName;
    idIn.value = goalId || "";

    if (mode === 'edit' && goalId) {
        title.textContent = "工数の編集";
        const task = allTaskObjects.find(t => t.name === taskName);
        const goal = task?.goals?.find(g => g.id === goalId || g.title === goalId);
    
        if (goal) {
            titleIn.value = goal.title || "";
            targetIn.value = goal.target || "";
            deadlineIn.value = goal.deadline || "";
            effortIn.value = goal.effortDeadline || "";
            memoIn.value = goal.memo || "";
        }
    } else {
        title.textContent = `[${escapeHtml(taskName)}] に工数を追加`;
        [titleIn, targetIn, deadlineIn, effortIn, memoIn].forEach(i => i.value = "");
    }
    showModal(goalModal);
    titleIn.focus();
}

/**
 * 3. 工数の完了処理 (Firebase連携) - 修正版
 */
export async function handleCompleteGoal(taskName, goalId) {
    const task = allTaskObjects.find(t => t.name === taskName);
    const goal = task?.goals?.find(g => g.id === goalId);
    if (!goal) return;

    showConfirmationModal(`「${goal.title}」を完了にしますか？`, async () => {
        await updateFirestoreGoalsSafe(taskName, (goals) => {
            return goals.map(g => g.id === goalId ? { ...g, isCompleted: true, completedAt: new Date().toISOString() } : g);
        });
    });
}

/**
 * 4. 工数の削除処理 (Firebase連携) - 修正版
 */
export async function handleDeleteGoal(taskName, goalId) {
    const task = allTaskObjects.find(t => t.name === taskName);
    const goal = task?.goals?.find(g => g.id === goalId);
    if (!goal) return;

    showConfirmationModal(`「${goal.title}」を削除しますか？\nこの操作は戻せません。`, async () => {
        await updateFirestoreGoalsSafe(taskName, (goals) => {
            return goals.filter(g => g.id !== goalId);
        });
    });
}

/**
 * 5. 工数の復元処理 (Firebase連携) - 修正版
 */
export async function handleRestoreGoalClick(taskName, goalId) {
    const task = allTaskObjects.find(t => t.name === taskName);
    const goal = task?.goals?.find(g => g.id === goalId);
    if (!goal) return;

    showConfirmationModal(`「${goal.title}」を未完了に戻しますか？`, async () => {
        await updateFirestoreGoalsSafe(taskName, (goals) => {
            return goals.map(g => g.id === goalId ? { ...g, isCompleted: false, completedAt: null } : g);
        });
    });
}

/**
 * Firestore更新の共通補助関数（トランザクション版）
 */
async function updateFirestoreGoalsSafe(taskName, updateGoalsLogic) {
    const tasksRef = doc(db, "settings", "tasks");
    try {
        const newTaskList = await runTransaction(db, async (transaction) => {
            const sfDoc = await transaction.get(tasksRef);
            if (!sfDoc.exists()) throw "Document does not exist!";
            
            const currentList = sfDoc.data().list || [];
            const taskIndex = currentList.findIndex(t => t.name === taskName);
            
            if (taskIndex === -1) throw new Error("TASK_NOT_FOUND");
            
            // Goalsを更新するロジックを適用
            const updatedGoals = updateGoalsLogic(currentList[taskIndex].goals || []);
            currentList[taskIndex].goals = updatedGoals;
            
            transaction.set(tasksRef, { list: currentList });
            return currentList;
        });

        // 成功時のUI更新
        updateGlobalTaskObjects(newTaskList);
        location.reload(); // ※元のコードがリロードしていたため維持していますが、refreshUIBasedOnTaskUpdate()等があればそちらが望ましいです

    } catch (e) {
        console.error("Firestore Update Error:", e);
        if (e.message === "TASK_NOT_FOUND") {
            alert("対象の業務が見つかりません。削除された可能性があります。");
        } else {
            alert("更新に失敗しました。");
        }
    }
}
