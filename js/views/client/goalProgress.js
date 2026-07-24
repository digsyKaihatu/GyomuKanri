// js/views/client/goalProgress.js

import { db, userId, userName, allTaskObjects, updateGlobalTaskObjects, escapeHtml } from "../../main.js"; 
import { addDoc, collection, doc, setDoc, Timestamp, runTransaction, query, where, getDocs } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js"; 
import { getJSTDateString, linkify } from "../../utils.js";
import { setHasContributed } from "./timer.js";
import { createLineChart, destroyCharts } from "../../components/chart.js";

let clientLineChartInstance = null;

// 直近7日間の日付（YYYY-MM-DD）の配列を取得するヘルパー関数
function getLast7Days() {
    const dates = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        dates.push(`${yyyy}-${mm}-${dd}`);
    }
    return dates;
}

async function renderClientProgressChart(taskName, finalGoalId) {
    const wrapper = document.getElementById("client-chart-wrapper");
    const canvas = document.getElementById("client-progress-chart");
    if (!wrapper || !canvas) return;

    if (clientLineChartInstance) {
        destroyCharts([clientLineChartInstance]);
        clientLineChartInstance = null;
    }

    try {
        const dateList = getLast7Days();
        const startDate = dateList[0];

        // 直近7日分のみ取得
        const q = query(
            collection(db, "work_logs"),
            where("goalId", "==", finalGoalId),
            where("date", ">=", startDate)
        );
        const snapshot = await getDocs(q);

        const userMap = {};
        let weekTotal = 0; // 直近7日間の合計件数

        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            if (dateList.includes(data.date)) {
                const uId = data.userId || "unknown";
                const uName = data.userName || "不明なユーザー";
                const contrib = data.contribution || 0;

                if (!userMap[uId]) {
                    userMap[uId] = {
                        name: uName,
                        counts: {}
                    };
                    dateList.forEach(d => userMap[uId].counts[d] = 0);
                }
                userMap[uId].counts[data.date] += contrib;
                weekTotal += contrib;
            }
        });

        // 直近7日間の合計件数を画面へ反映
        const weekTotalEl = document.getElementById("ui-week-total-val");
        if (weekTotalEl) {
            weekTotalEl.textContent = weekTotal;
        }

        if (!userMap[userId]) {
            userMap[userId] = {
                name: userName,
                counts: {}
            };
            dateList.forEach(d => userMap[userId].counts[d] = 0);
        }

        const datasets = Object.keys(userMap).map((uId, index) => {
            const userData = userMap[uId];
            const isMe = (uId === userId);

            let color;
            if (isMe) {
                color = "rgb(59, 130, 246)";
            } else {
                let hue = (index * 137.508) % 360;
                if (hue >= 170 && hue <= 260) {
                    hue = (hue + 100) % 360;
                }
                color = `hsl(${hue}, 65%, 55%)`; 
            }

            return {
                label: userData.name, 
                data: dateList.map(d => userData.counts[d]),
                borderColor: color,
                backgroundColor: isMe ? "rgba(59, 130, 246, 0.08)" : "transparent",
                tension: 0.2,
                fill: isMe, 
                borderWidth: isMe ? 3 : 1.5,
                pointRadius: isMe ? 4 : 2,
                hoverRadius: isMe ? 6 : 4
            };
        });

        const labels = dateList.map(d => {
            const parts = d.split('-');
            return `${parseInt(parts[1], 10)}/${parseInt(parts[2], 10)}`; 
        });

        wrapper.classList.remove("hidden");
        const ctx = canvas.getContext("2d");
        
        const titleText = "チーム全体の週間進捗グラフ";
        clientLineChartInstance = await createLineChart(ctx, labels, datasets, titleText, "件数", userName, 'nearest');

    } catch (error) {
        console.error("Error rendering client progress chart:", error);
    }
}

export async function handleUpdateGoalProgress(taskName, goalId, inputElement) {
    let finalGoalId = goalId || document.getElementById("goal-modal")?.dataset.currentGoalId;
    if (!finalGoalId) return;

    const contribution = parseInt(inputElement.value, 10);
    if (isNaN(contribution) || contribution <= 0) return;

    const tasksRef = doc(db, "settings", "tasks");

    try {
        let newCurrentValue = 0;
        let updatedGoalTitle = "";

        const newTaskList = await runTransaction(db, async (transaction) => {
            const sfDoc = await transaction.get(tasksRef);
            if (!sfDoc.exists()) throw "Document does not exist!";
            
            const taskList = sfDoc.data().list || [];
            
            const taskIndex = taskList.findIndex((t) => t.name === taskName);
            if (taskIndex === -1) throw new Error("TASK_NOT_FOUND");

            const goalIndex = taskList[taskIndex].goals?.findIndex(g => g.id === finalGoalId || g.title === finalGoalId);
            if (goalIndex === undefined || goalIndex === -1) throw new Error("GOAL_NOT_FOUND");

            const goal = taskList[taskIndex].goals[goalIndex];
            newCurrentValue = (goal.current || 0) + contribution;
            goal.current = newCurrentValue;
            
            updatedGoalTitle = goal.title;

            transaction.set(tasksRef, { list: taskList });
            return taskList;
        });

        await addDoc(collection(db, "work_logs"), {
            type: "goal", userId, userName, task: taskName,
            goalId: finalGoalId, goalTitle: updatedGoalTitle, contribution,
            date: getJSTDateString(new Date()),
            startTime: Timestamp.fromDate(new Date()),
        });

        updateGlobalTaskObjects(newTaskList);

        // 累計件数表示テキストを更新
        const valEl = document.getElementById("ui-current-val");
        if (valEl) valEl.textContent = newCurrentValue;

        inputElement.value = "";
        setHasContributed(true);

        await renderClientProgressChart(taskName, finalGoalId);

    } catch (error) {
        console.error("Update error:", error);
        if (error.message === "TASK_NOT_FOUND" || error.message === "GOAL_NOT_FOUND") {
            alert("対象の業務または工数が削除されているため、更新できませんでした。");
        } else {
            alert("【不具合発生のお知らせ】\n現在、業務管理アプリで一時的な不具合が発生しています。\n\nお手数ですが、以下の時間帯に再度「件数入力」または「申請」をお願いいたします。\n\n■ 16時より前 ➔ 本日の16時以降に\n■ 16時以降   ➔ 明日の16時以降に");
        }
    }
}

export function renderSingleGoalDisplay(task, goalId) {
    const container = document.getElementById("goal-progress-container");
    if (!container) return;

    const goal = task.goals.find(g => g.id === goalId) || task.goals.find(g => g.title === goalId);
    if (!goal) {
        container.innerHTML = "";
        container.classList.add("hidden");
        return;
    }
    
    const current = goal.current || 0;

    const memoHtml = goal.memo ? `
        <div class="w-fit max-w-full bg-gray-50 border-l-4 border-blue-600 p-2 mb-3 rounded text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">${linkify(escapeHtml(goal.memo))}</div>
    ` : '';

    let deadlineHtml = '';
    if (goal.deadline || goal.effortDeadline) {
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

    // ★ 目標値を削除し、「累計: X 件」と「直近7日間: Y 件」のみ表示
    container.innerHTML = `
        <div class="border-b pb-4 mb-4">
            <h3 class="text-sm font-bold text-gray-700 mb-2">${escapeHtml(goal.title)}</h3>
            ${memoHtml}
            ${deadlineHtml}
            
            <div class="flex items-center justify-between text-xs text-gray-600 mb-3 font-semibold">
                <span>累計: <span id="ui-current-val" class="font-bold text-base text-blue-600">${current}</span> 件</span>
                <span class="bg-blue-50 border border-blue-200 text-blue-800 px-2.5 py-1 rounded-md">
                    直近7日間: <span id="ui-week-total-val" class="font-bold text-sm text-blue-600">0</span> 件
                </span>
            </div>

            <div class="flex gap-2 items-center">
                <input type="number" id="goal-contribution-input" 
                    class="flex-grow p-2 border border-gray-300 rounded text-sm" 
                    placeholder="件数を追加" min="1" autocomplete="off">
                <button id="update-goal-btn" 
                    class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded text-sm transition">
                    登録
                </button>
            </div>
            
            <div id="client-chart-wrapper" class="relative w-full h-64 mt-4 hidden">
                <canvas id="client-progress-chart"></canvas>
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

    renderClientProgressChart(task.name, tid);
}
