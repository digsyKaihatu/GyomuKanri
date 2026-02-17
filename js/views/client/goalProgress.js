// js/views/client/goalProgress.js

import { db, userId, userName, allTaskObjects, updateGlobalTaskObjects, escapeHtml } from "../../main.js"; // ★updateGlobalTaskObjectsを追加
// ★ runTransaction を追加
import { addDoc, collection, doc, setDoc, Timestamp, runTransaction } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js"; 
import { getJSTDateString } from "../../utils.js"; 
import { setHasContributed } from "./timer.js";

export async function handleUpdateGoalProgress(taskName, goalId, inputElement) {
    let finalGoalId = goalId || document.getElementById("goal-modal")?.dataset.currentGoalId;
    if (!finalGoalId) return;

    const contribution = parseInt(inputElement.value, 10);
    if (isNaN(contribution) || contribution <= 0) return;

    // ★修正: トランザクションを使用して安全に更新
    const tasksRef = doc(db, "settings", "tasks");

    try {
        let newCurrentValue = 0;
        let targetValue = 0;
        let updatedGoalTitle = "";

        const newTaskList = await runTransaction(db, async (transaction) => {
            const sfDoc = await transaction.get(tasksRef);
            if (!sfDoc.exists()) throw "Document does not exist!";
            
            const taskList = sfDoc.data().list || [];
            
            const taskIndex = taskList.findIndex((t) => t.name === taskName);
            if (taskIndex === -1) throw new Error("TASK_NOT_FOUND"); // 業務自体が消されていた場合

            const goalIndex = taskList[taskIndex].goals?.findIndex(g => g.id === finalGoalId || g.title === finalGoalId);
            if (goalIndex === undefined || goalIndex === -1) throw new Error("GOAL_NOT_FOUND");

            // 加算処理
            const goal = taskList[taskIndex].goals[goalIndex];
            newCurrentValue = (goal.current || 0) + contribution;
            goal.current = newCurrentValue;
            
            // ログ用に情報を取得
            targetValue = goal.target;
            updatedGoalTitle = goal.title;

            transaction.set(tasksRef, { list: taskList });
            return taskList;
        });

        // 成功したらログを保存（ログは追記なのでトランザクション外でも比較的安全だが、厳密には内側が良い。今回は既存ロジック維持で外側に配置）
        await addDoc(collection(db, "work_logs"), {
            type: "goal", userId, userName, task: taskName,
            goalId: finalGoalId, goalTitle: updatedGoalTitle, contribution,
            date: getJSTDateString(new Date()),
            startTime: Timestamp.fromDate(new Date()),
        });

        // ローカルデータを更新
        updateGlobalTaskObjects(newTaskList);

        // --- UI更新 ---
        const valEl = document.getElementById("ui-current-val");
        const barEl = document.getElementById("ui-current-bar");
        const pctEl = document.getElementById("ui-current-percent");

        if (valEl) valEl.textContent = newCurrentValue;
        if (barEl || pctEl) {
            const target = targetValue || 1;
            const newPercent = Math.min(100, Math.round((newCurrentValue / target) * 100));
            if (barEl) barEl.style.width = `${newPercent}%`;
            if (pctEl) pctEl.textContent = `${newPercent}%`;
        }

        inputElement.value = "";
        setHasContributed(true);

    } catch (error) {
        console.error("Update error:", error);
        if (error.message === "TASK_NOT_FOUND" || error.message === "GOAL_NOT_FOUND") {
            alert("対象の業務または工数が削除されているため、更新できませんでした。");
        } else {
            alert("更新中にエラーが発生しました。");
        }
    }
}

// ... (renderSingleGoalDisplay は変更なし) ...
export function renderSingleGoalDisplay(task, goalId) {
    // (省略: 元のコードのまま)
    const container = document.getElementById("goal-progress-container");
    if (!container) return;

    const goal = task.goals.find(g => g.id === goalId) || task.goals.find(g => g.title === goalId);
    if (!goal) {
        container.innerHTML = "";
        container.classList.add("hidden");
        return;
    }
    
    const current = goal.current || 0;
    const target = goal.target || 0;
    const percentage = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
    
    const memoHtml = goal.memo ? `
        <div class="w-fit max-w-full bg-gray-50 border-l-4 border-blue-600 p-2 mb-3 rounded text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">${escapeHtml(goal.memo)}</div>
    ` : '';

    let deadlineHtml = '';
    if (goal.deadline || goal.manHourDeadline) {
        deadlineHtml = `<div class="flex flex-wrap gap-3 mb-4">`;
        if (goal.deadline) {
            deadlineHtml += `
                <div class="flex items-center text-xs font-bold text-gray-600 bg-white border border-gray-300 px-2 py-1 rounded shadow-sm">
                    <span class="mr-1">📅</span> 納期: ${escapeHtml(goal.deadline)}
                </div>
            `;
        }
        if (goal.effortDeadline) {
            deadlineHtml += `
                <div class="flex items-center text-xs font-bold text-gray-600 bg-white border border-gray-300 px-2 py-1 rounded shadow-sm">
                    <span class="mr-1">⏳</span> 工数納期: ${escapeHtml(goal.effortDeadline)}
                </div>
            `;
        }
        deadlineHtml += `</div>`;
    }

    container.innerHTML = `
        <div class="border-b pb-4 mb-4">
            <h3 class="text-sm font-bold text-gray-700 mb-2">${escapeHtml(goal.title)}</h3>
            ${memoHtml}
            ${deadlineHtml}
            <div class="flex items-center justify-between text-xs text-gray-600 mb-1">
                <span>現在: <span id="ui-current-val" class="font-bold text-lg">${current}</span> / 目標: ${target}</span>
                <span id="ui-current-percent">${percentage}%</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-2.5 mb-3">
                <div id="ui-current-bar" class="bg-blue-600 h-2.5 rounded-full transition-all duration-500" style="width: ${percentage}%"></div>
            </div>
            <div class="flex gap-2 items-center">
                <input type="number" id="goal-contribution-input" 
                    class="flex-grow p-2 border border-gray-300 rounded text-sm" 
                    placeholder="件数を追加" min="1">
                <button id="update-goal-btn" 
                    class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded text-sm transition">
                    登録
                </button>
            </div>
        </div>
    `;

    container.classList.remove("hidden");

    const updateBtn = document.getElementById("update-goal-btn");
    const inputVal = document.getElementById("goal-contribution-input");
    const tid = goal.id || goal.title;

    updateBtn.onclick = () => handleUpdateGoalProgress(task.name, tid, inputVal);
    inputVal.onkeypress = (e) => {
        if (e.key === "Enter") handleUpdateGoalProgress(task.name, tid, inputVal);
    };
}
