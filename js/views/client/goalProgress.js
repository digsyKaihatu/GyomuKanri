// js/views/client/goalProgress.js

// ★ query, where, getDocs をインポートに追加
import { db, userId, userName, allTaskObjects, updateGlobalTaskObjects, escapeHtml } from "../../main.js"; 
import { addDoc, collection, doc, setDoc, Timestamp, runTransaction, query, where, getDocs } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js"; 
import { getJSTDateString, linkify } from "../../utils.js";
import { setHasContributed } from "./timer.js";
import { createLineChart, destroyCharts } from "../../components/chart.js"; // ★追加: チャート共通コンポーネントをインポート

let clientLineChartInstance = null; // ★追加: チャートの多重描画バグを防ぐためのインスタンス保持変数

// ★追加: 直近7日間の日付（YYYY-MM-DD）の配列を取得するヘルパー関数
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
        // ★修正: where("userId", "==", userId) を削除し、この工数に「入った人全員」のログを取得
        const q = query(
            collection(db, "work_logs"),
            where("goalId", "==", finalGoalId)
        );
        const snapshot = await getDocs(q);

        const dateList = getLast7Days();
        
        // ★追加: ユーザーごとの集計用オブジェクトを作成
        const userMap = {};

        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            // 直近7日間の範囲内の日付であれば集計対象にする
            if (dateList.includes(data.date)) {
                const uId = data.userId || "unknown";
                const uName = data.userName || "不明なユーザー";

                if (!userMap[uId]) {
                    userMap[uId] = {
                        name: uName,
                        counts: {}
                    };
                    // 7日間分を0件で初期化
                    dateList.forEach(d => userMap[uId].counts[d] = 0);
                }
                userMap[uId].counts[data.date] += (data.contribution || 0);
            }
        });

        // ★追加: 自分がまだ1件も書き込んでいなくても、グラフ上に自分の線（0件の線）が必ず出るように保証
        if (!userMap[userId]) {
            userMap[userId] = {
                name: userName,
                counts: {}
            };
            dateList.forEach(d => userMap[userId].counts[d] = 0);
        }

        // ユーザーごとに Chart.js 用の dataset を生成する
        const datasets = Object.keys(userMap).map((uId, index) => {
            const userData = userMap[uId];
            const isMe = (uId === userId);

            let color;
            if (isMe) {
                color = "rgb(59, 130, 246)"; // 自分のメインカラー（青）
            } else {
                // ★修正: 自分の色（青系: HSLの色相170〜260）と被りそうな場合は、数値をシフトして排除する
                let hue = (index * 137.508) % 360;
                if (hue >= 170 && hue <= 260) {
                    hue = (hue + 100) % 360; // 青・水色・紫系を綺麗に避けて、黄色や緑・オレンジ系に変調
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
                borderWidth: isMe ? 3 : 1.5, // 自分を太く
                pointRadius: isMe ? 4 : 2,   // 自分の点を大きく
                hoverRadius: isMe ? 6 : 4    // マウスが乗った時さらに強調
            };
        });

        const labels = dateList.map(d => {
            const parts = d.split('-');
            return `${parseInt(parts[1], 10)}/${parseInt(parts[2], 10)}`; 
        });

        wrapper.classList.remove("hidden");
        const ctx = canvas.getContext("2d");
        
        const titleText = "チーム全体の週間進捗グラフ";
        
        // ★修正: 第7引数に 'nearest' を指定することで、「今マウスが乗っている折れ線（その人）の説明だけ」をポップアップさせる
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
        let targetValue = 0;
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
            
            targetValue = goal.target;
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

        // ★追加: 「登録」ボタンを押して件数が追加された直後にチャートを動的に更新する
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
    const target = goal.target || 0;
    const percentage = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
    
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

    // ★ 件数入力フォーム（flex gap-2 items-center）の下に、チャート用のCanvasWrapper要素を挿入
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

    // ★追加: 工数画面がレンダリングされた初期タイミングでチャートを描画する
    renderClientProgressChart(task.name, tid);
}
