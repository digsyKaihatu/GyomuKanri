// js/views/progress/progress.js
import { db, allTaskObjects, handleGoBack, showView, VIEWS, escapeHtml } from "../../main.js";
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { openGoalModal, showHelpModal } from "../../components/modal/index.js";
import { destroyCharts } from "../../components/chart.js";

import {
    renderProgressTaskList,
    renderProgressGoalList,
    renderProgressGoalDetails,
    renderChartAndTable,
    clearGoalDetailsAndSummary,
    updateTaskSelectionUI,
    updateGoalSelectionUI
} from "./progressUI.js";

import {
    calculateDateRange,
    aggregateWeeklyData
} from "./progressData.js";

import {
    handleCompleteGoal,
    handleDeleteGoal
} from "./progressActions.js";

let selectedProgressTaskName = null;
let selectedProgressGoalId = null;
let progressWeekOffset = 0;
let progressMonthOffset = 0;
let progressChartType = "contribution";
let progressLineChartInstance = null;
let selectedTaskLogs = []; 

// DOM要素
let taskListContainer, goalListContainer, goalDetailsContainer, chartContainer, weeklySummaryContainer, backButton, viewArchiveButton, helpButton;

function initializeDOMElements() {
    taskListContainer = document.getElementById("progress-task-list");
    goalListContainer = document.getElementById("progress-goal-list");
    goalDetailsContainer = document.getElementById("progress-goal-details-container");
    chartContainer = document.getElementById("progress-chart-container");
    weeklySummaryContainer = document.getElementById("progress-weekly-summary-container");
    backButton = document.getElementById("back-to-previous-view-from-progress");
    viewArchiveButton = document.getElementById("view-archive-btn");
    helpButton = document.querySelector('#progress-view .help-btn');
}

export async function initializeProgressView() {
    initializeDOMElements();
    
    // 初期化時はログをクリア
    selectedTaskLogs = []; 
    progressWeekOffset = 0;
    progressMonthOffset = 0;

    renderProgressTaskList(allTaskObjects, selectedProgressTaskName, handleTaskClick);

    if (selectedProgressTaskName) {
        renderProgressGoalList(allTaskObjects, selectedProgressTaskName, selectedProgressGoalId, handleGoalClick);
        if (selectedProgressGoalId) {
            // ★変更: ここでログ取得と描画を行う
            await renderDetailsAndSummary();
        } else {
            clearGoalDetailsAndSummary(goalDetailsContainer, chartContainer, weeklySummaryContainer, [progressLineChartInstance]);
            progressLineChartInstance = null;
        }
    } else {
        if(goalListContainer) goalListContainer.innerHTML = '<p class="text-gray-500">業務を選択してください</p>';
        clearGoalDetailsAndSummary(goalDetailsContainer, chartContainer, weeklySummaryContainer, [progressLineChartInstance]);
        progressLineChartInstance = null;
    }

    setupProgressEventListeners();
}

export function setupProgressEventListeners() {
    backButton?.addEventListener("click", handleGoBack);
    viewArchiveButton?.addEventListener("click", () => showView(VIEWS.ARCHIVE));
    helpButton?.addEventListener('click', () => showHelpModal('progress'));

     goalDetailsContainer?.addEventListener('click', (event) => {
        const target = event.target.closest('button');
        if (!target) return;

        const taskName = target.dataset.taskName;
        const goalId = target.dataset.goalId;
        if (!taskName || !goalId) return;
        
        const readOnlyMode = window.isProgressViewReadOnly === true;
        if (readOnlyMode) return;

        if (target.classList.contains('edit-goal-btn')) {
             openGoalModal('edit', taskName, goalId);
        } else if (target.classList.contains('complete-goal-btn')) {
             handleCompleteGoal(taskName, goalId, async () => {
                 // 成功時のコールバック
                 selectedProgressGoalId = null;
                 clearGoalDetailsAndSummary(goalDetailsContainer, chartContainer, weeklySummaryContainer, [progressLineChartInstance]);
                 progressLineChartInstance = null;
                 
                 // ★変更: データ更新のため再描画（この中で必要な期間だけ再取得される）
                 await renderDetailsAndSummary();
                 
                 renderProgressTaskList(allTaskObjects, selectedProgressTaskName, handleTaskClick);
                 renderProgressGoalList(allTaskObjects, selectedProgressTaskName, null, handleGoalClick);
             });
        } else if (target.classList.contains('delete-goal-btn')) {
             handleDeleteGoal(taskName, goalId, () => {
                 selectedProgressGoalId = null;
                 clearGoalDetailsAndSummary(goalDetailsContainer, chartContainer, weeklySummaryContainer, [progressLineChartInstance]);
                 progressLineChartInstance = null;
                 renderProgressTaskList(allTaskObjects, selectedProgressTaskName, handleTaskClick);
                 renderProgressGoalList(allTaskObjects, selectedProgressTaskName, null, handleGoalClick);
             });
        }
    });

     chartContainer?.addEventListener('click', (event) => {
        const target = event.target.closest('button');
        if (!target) return;

        if (target.id === 'chart-toggle-contribution') {
            if (progressChartType !== 'contribution') {
                progressChartType = 'contribution';
                renderDetailsAndSummary(); // 再描画のみ（データは既存のものを使用）
            }
        } else if (target.id === 'chart-toggle-efficiency') {
             if (progressChartType !== 'efficiency') {
                progressChartType = 'efficiency';
                renderDetailsAndSummary(); // 再描画のみ
            }
        }
     });

     weeklySummaryContainer?.addEventListener('click', (event) => {
        const target = event.target.closest('button');
        if (!target) return;

        // ★変更: ページ移動時は renderDetailsAndSummary を呼ぶことで自動的に新期間のデータをfetchする
        if (target.id === 'progress-prev-week-btn') {
            progressWeekOffset--;
            renderDetailsAndSummary();
        } else if (target.id === 'progress-next-week-btn') {
            progressWeekOffset++;
            renderDetailsAndSummary();
        } else if (target.id === 'progress-prev-month-btn') {
             progressMonthOffset--;
             progressWeekOffset = 0;
             renderDetailsAndSummary();
        } else if (target.id === 'progress-next-month-btn') {
             progressMonthOffset++;
             progressWeekOffset = 0;
             renderDetailsAndSummary();
        }
     });
}

// ★変更: 期間指定でログを取得する形に修正
async function fetchLogsForTask(taskName, startDate, endDate) {
    if (!taskName || !startDate || !endDate) return;

    // UIにローディング表示（簡易的）
    if(weeklySummaryContainer) weeklySummaryContainer.innerHTML = '<p class="text-gray-500 text-center p-4">データを読み込み中...</p>';
    if(chartContainer) chartContainer.innerHTML = '';

    try {
        const q = query(
            collection(db, "work_logs"),
            where("task", "==", taskName),
            where("date", ">=", startDate), // 開始日以降
            where("date", "<=", endDate)   // 終了日以前
        );
        
        const snapshot = await getDocs(q);
        
        selectedTaskLogs = snapshot.docs.map((d) => {
             const data = d.data();
             const log = { id: d.id, ...data };
             if (log.startTime && log.startTime.toDate) log.startTime = log.startTime.toDate();
             if (log.endTime && log.endTime.toDate) log.endTime = log.endTime.toDate();
             return log;
        });

    } catch (error) {
        console.error("Error fetching task logs:", error);
        selectedTaskLogs = [];
        // インデックス未作成エラーの可能性が高い場合の案内
        if (error.message.includes("indexes")) {
            alert("この期間のデータを表示するにはインデックスが必要です。\nブラウザのコンソール(F12)を開き、表示されたリンクをクリックしてインデックスを作成してください。");
        } else {
            alert("ログデータの取得中にエラーが発生しました。");
        }
    }
}

async function handleTaskClick(taskName) {
    selectedProgressTaskName = taskName;
    selectedProgressGoalId = null;
    progressWeekOffset = 0;
    progressMonthOffset = 0;

    updateTaskSelectionUI(taskListContainer, taskName);
    
    // ★変更: タスククリック時は、まずリスト表示のみ行い、ログ取得はしない（工数選択待ち、または自動で今週を表示）
    // 今回は「工数を選択してください」状態にする
    renderProgressGoalList(allTaskObjects, selectedProgressTaskName, null, handleGoalClick);
    
    clearGoalDetailsAndSummary(goalDetailsContainer, chartContainer, weeklySummaryContainer, [progressLineChartInstance]);
    progressLineChartInstance = null;
}

function handleGoalClick(goalId) {
    selectedProgressGoalId = goalId;
    progressWeekOffset = 0;
    progressMonthOffset = 0;
    progressChartType = "contribution";

    updateGoalSelectionUI(goalListContainer, goalId);
    renderDetailsAndSummary();
}

// ★変更: 描画関数内でデータ取得を行うフローに変更
async function renderDetailsAndSummary() {
    if (!selectedProgressTaskName || !selectedProgressGoalId) {
        clearGoalDetailsAndSummary(goalDetailsContainer, chartContainer, weeklySummaryContainer, [progressLineChartInstance]);
        progressLineChartInstance = null;
        return;
    }

    const task = allTaskObjects.find((t) => t.name === selectedProgressTaskName);
    const goal = task?.goals.find((g) => g.id === selectedProgressGoalId || g.title === selectedProgressGoalId);

    if (!goal || goal.isComplete) {
        clearGoalDetailsAndSummary(goalDetailsContainer, chartContainer, weeklySummaryContainer, [progressLineChartInstance]);
        progressLineChartInstance = null;
        if (goal?.isComplete) {
            selectedProgressGoalId = null;
            renderProgressGoalList(allTaskObjects, selectedProgressTaskName, null, handleGoalClick);
        }
        return;
    }

    const readOnlyMode = window.isProgressViewReadOnly === true;
    renderProgressGoalDetails(goal, task.name, readOnlyMode, goalDetailsContainer);

    // 1. 表示すべき期間を計算
    const weekDates = calculateDateRange(progressWeekOffset, progressMonthOffset);
    const startDate = weekDates[0];
    const endDate = weekDates[6];

    // 2. ★ここで必要な期間のデータだけをFirestoreから取得
    await fetchLogsForTask(selectedProgressTaskName, startDate, endDate);

    // 3. 取得したデータを使って集計・描画
    const finalGoalIdForFilter = goal.id || goal.title;
    const chartAndTableData = aggregateWeeklyData(selectedTaskLogs, finalGoalIdForFilter, weekDates);

    destroyCharts([progressLineChartInstance]);
    progressLineChartInstance = renderChartAndTable(
        weekDates,
        chartAndTableData,
        goal,
        progressChartType,
        progressMonthOffset,
        progressWeekOffset,
        chartContainer,
        weeklySummaryContainer
    );
}
