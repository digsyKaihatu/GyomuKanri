// js/views/report.js
import { db } from "../firebase.js"; 
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { handleGoBack } from "../main.js"; 
import { renderUnifiedCalendar } from "../components/calendar.js";
import { renderChart, destroyCharts } from "../components/chart.js";
import { formatHoursMinutes, getMonthDateRange, escapeHtml } from "../utils.js";

let currentReportDate = new Date();
let activeReportCharts = [];
let selectedReportDateStr = null;
let currentMonthLogs = []; 

// DOM要素 (遅延初期化)
let reportCalendarEl, reportMonthYearEl, reportPrevMonthBtn, reportNextMonthBtn, reportTitleEl, reportChartsContainer, backButton;

function initializeDOMElements() {
    reportCalendarEl = document.getElementById("report-calendar");
    reportMonthYearEl = document.getElementById("report-calendar-month-year");
    reportPrevMonthBtn = document.getElementById("report-prev-month-btn");
    reportNextMonthBtn = document.getElementById("report-next-month-btn");
    reportTitleEl = document.getElementById("report-title");
    reportChartsContainer = document.getElementById("report-charts-container");
    backButton = document.getElementById("back-to-host-from-report");
}

// --- 初期化・クリーンアップ関数 ---

export async function initializeReportView() {
    initializeDOMElements();
    currentReportDate = new Date();
    selectedReportDateStr = null;
    
    await fetchAndRenderForCurrentMonth();
    setupReportEventListeners();
}

export function cleanupReportView() {
    // Remove event listeners to prevent memory leaks
    reportPrevMonthBtn?.removeEventListener("click", handlePrevMonthClick);
    reportNextMonthBtn?.removeEventListener("click", handleNextMonthClick);
    backButton?.removeEventListener("click", handleGoBack);

    destroyCharts(activeReportCharts);
    activeReportCharts = [];
    selectedReportDateStr = null;
    currentMonthLogs = [];
    if (reportChartsContainer) reportChartsContainer.innerHTML = "";
}

const handlePrevMonthClick = () => moveReportMonth(-1);
const handleNextMonthClick = () => moveReportMonth(1);

export function setupReportEventListeners() {
    reportPrevMonthBtn?.addEventListener("click", handlePrevMonthClick);
    reportNextMonthBtn?.addEventListener("click", handleNextMonthClick);
    backButton?.addEventListener("click", handleGoBack);
}

// --- データ取得・描画ロジック ---

async function fetchAndRenderForCurrentMonth() {
    const { start, end } = getMonthDateRange(currentReportDate);

    if(reportTitleEl) reportTitleEl.textContent = "データを読み込み中...";

    try {
        const q = query(
            collection(db, "work_logs"),
            where("date", ">=", start),
            where("date", "<=", end)
        );
        const snapshot = await getDocs(q);
        currentMonthLogs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        renderReportCalendar();       
        renderReportChartsForMonth(); 

    } catch (error) {
        console.error("Error fetching report logs:", error);
        if(reportChartsContainer) reportChartsContainer.innerHTML = `<p class="text-red-500 text-center">データの取得中にエラーが発生しました。</p>`;
    }
}

function renderReportCalendar() {
    if (!reportCalendarEl || !reportMonthYearEl) return;
    
    renderUnifiedCalendar({
        calendarEl: reportCalendarEl,
        monthYearEl: reportMonthYearEl,
        dateToDisplay: currentReportDate,
        logs: currentMonthLogs, 
        onDayClick: (e) => {
            const dateStr = e.currentTarget.dataset.date;
            selectedReportDateStr = dateStr;
            reportCalendarEl.querySelectorAll(".calendar-day.selected").forEach(el => el.classList.remove("selected"));
            e.currentTarget.classList.add("selected");
            renderReportChartsForDay(dateStr);
        },
        onMonthClick: () => {
             selectedReportDateStr = null;
             reportCalendarEl.querySelectorAll(".calendar-day.selected").forEach(el => el.classList.remove("selected"));
             renderReportChartsForMonth();
        },
    });
     if(selectedReportDateStr){
        const dayElement = reportCalendarEl.querySelector(`.calendar-day[data-date="${selectedReportDateStr}"]`);
        dayElement?.classList.add('selected');
     }
}

async function moveReportMonth(direction) {
    selectedReportDateStr = null;
    currentReportDate.setMonth(currentReportDate.getMonth() + direction);
    await fetchAndRenderForCurrentMonth();
}

function renderReportChartsForMonth() {
     if (!reportTitleEl) return;
    const year = currentReportDate.getFullYear();
    const month = currentReportDate.getMonth();
    reportTitleEl.textContent = `${year}年 ${month + 1}月 月次レポート`;

    renderReportCharts(currentMonthLogs);
}

function renderReportChartsForDay(dateStr) {
     if (!reportTitleEl || !dateStr) return;
    reportTitleEl.textContent = `${dateStr} 日次レポート`;

    const logsForDay = currentMonthLogs.filter((log) => log.date === dateStr);
    renderReportCharts(logsForDay);
}

function renderReportCharts(logs) {
    if (!reportChartsContainer) return;

    destroyCharts(activeReportCharts);
    activeReportCharts = [];
    
    reportChartsContainer.className = "space-y-12"; 
    reportChartsContainer.innerHTML = "";

    // 1. 集計処理
    const userStats = new Map(); // userId -> { name, tasks: Map<taskName, duration> }
    const grandTotalTasks = new Map();
    let grandTotalDuration = 0;

    // ★ここを追加：タスクごとの詳細集計用Map
    const taskStats = new Map();

    logs.forEach(log => {
        if (!log.userName || !log.task || log.task === "休憩" || log.type === "goal") return;

        const taskName = log.task.startsWith("その他_") ? log.task.substring(4) : log.task;
        const userId = log.userId || log.userName; 

        // ★ここを追加： userName と goalTitle を定義する
        const userName = log.userName;
        const goalTitle = log.goalTitle || "未分類";
        // ★追加: ログから納期情報を取得
        const goalDeadline = log.goalDeadline || log.effortDeadline || log.deadline || "";

        if (!userStats.has(userId)) {
            userStats.set(userId, { name: log.userName, tasks: new Map() });
        }
        const user = userStats.get(userId);
        const currentDuration = user.tasks.get(taskName) || 0;
        user.tasks.set(taskName, currentDuration + (log.duration || 0));

        const totalTaskDuration = grandTotalTasks.get(taskName) || 0;
        grandTotalTasks.set(taskName, totalTaskDuration + (log.duration || 0));
        grandTotalDuration += (log.duration || 0);

        // ★ここから追加：工数や従業員ごとの詳細集計
        if (!taskStats.has(taskName)) {
            taskStats.set(taskName, { users: new Map(), goals: new Map() });
        }
        const tStat = taskStats.get(taskName);
        tStat.users.set(userName, (tStat.users.get(userName) || 0) + (log.duration || 0));

        if (!tStat.goals.has(goalTitle)) {
            // ★修正: deadline プロパティも持たせる
            tStat.goals.set(goalTitle, { duration: 0, users: new Map(), deadline: goalDeadline });
        }
        const gStat = tStat.goals.get(goalTitle);
        // ★追加: もし最初のログで納期が空でも、後のログに納期があれば更新する
        if (!gStat.deadline && goalDeadline) {
            gStat.deadline = goalDeadline;
        }
        gStat.duration += (log.duration || 0);
        gStat.users.set(userName, (gStat.users.get(userName) || 0) + (log.duration || 0));
        // ★追加ここまで
    });

    if (grandTotalDuration === 0) {
        reportChartsContainer.innerHTML = `<p class="text-gray-500 text-center col-span-full py-10">この期間の業務記録はありません。</p>`;
        return;
    }

    // 2. レイアウトの作成

    // A. 全体合計用コンテナ
    const totalSectionTitle = document.createElement("h3");
    totalSectionTitle.className = "text-xl font-bold text-gray-700 mb-4 text-center border-b pb-2";
    totalSectionTitle.textContent = "全従業員 合計";
    reportChartsContainer.appendChild(totalSectionTitle);

    const totalWrapper = document.createElement("div");
    totalWrapper.className = "w-full md:w-2/3 mx-auto mb-12 bg-white p-6 rounded-lg shadow-md border border-gray-100";
    reportChartsContainer.appendChild(totalWrapper);

    // ★修正: 全体合計のカード作成時に userStats (内訳用データ) を渡す
    createChartCard(totalWrapper, "全従業員", grandTotalTasks, grandTotalDuration, true, taskStats);

    // B. 個別従業員用コンテナ
    if (userStats.size > 0) {
        const employeeSectionTitle = document.createElement("h3");
        employeeSectionTitle.className = "text-xl font-bold text-gray-700 mb-4 border-b pb-2";
        employeeSectionTitle.textContent = "従業員別 詳細";
        reportChartsContainer.appendChild(employeeSectionTitle);

        const gridContainer = document.createElement("div");
        gridContainer.className = "grid grid-cols-1 md:grid-cols-2 gap-8";
        reportChartsContainer.appendChild(gridContainer);

        const sortedUsers = Array.from(userStats.entries()).sort((a, b) => a[1].name.localeCompare(b[1].name, "ja"));

        sortedUsers.forEach(([_userId, stats]) => {
            const card = document.createElement("div");
            card.className = "bg-white p-4 rounded shadow border border-gray-200 flex flex-col";
            
            let totalUserDuration = 0;
            stats.tasks.forEach(d => totalUserDuration += d);

            if (totalUserDuration > 0) {
                // 個別カードには内訳データ(userStats)は渡さない(null)
                createChartCard(card, stats.name, stats.tasks, totalUserDuration, false, null);
                gridContainer.appendChild(card);
            }
        });
    }
}

/**
 * チャートと詳細リストを含むカードの中身を生成するヘルパー関数
 * @param {HTMLElement} parentElement 追加先の要素
 * @param {string} title タイトル
 * @param {Map} tasksMap タスクデータ
 * @param {number} totalDuration 合計時間
 * @param {boolean} isLarge 全体表示かどうか
 * @param {Map} allUserStats 内訳表示用の全ユーザーデータ (省略可)
 */
function createChartCard(parentElement, title, tasksMap, totalDuration, isLarge, taskStatsMap = null) {
    // 1. ヘッダー
    const header = document.createElement("div");
    header.className = "flex justify-between items-center mb-4 border-b pb-2";
    
    const nameEl = document.createElement("h3");
    nameEl.className = isLarge ? "text-xl font-bold text-indigo-700" : "text-lg font-semibold text-gray-700";
    nameEl.textContent = title;
    
    const timeEl = document.createElement("span");
    timeEl.className = "text-sm font-medium text-gray-500";
    timeEl.textContent = `合計: ${formatHoursMinutes(totalDuration)}`;

    header.appendChild(nameEl);
    header.appendChild(timeEl);
    parentElement.appendChild(header);

    // 2. チャート描画エリア
    const canvasContainer = document.createElement("div");
    canvasContainer.className = isLarge ? "relative h-80 w-full" : "relative h-64 w-full";
    const canvas = document.createElement("canvas");
    canvasContainer.appendChild(canvas);
    parentElement.appendChild(canvasContainer);

    // データを整形でソート（降順）
    const sortedTasks = Array.from(tasksMap.entries()).sort((a, b) => b[1] - a[1]);
    const labels = sortedTasks.map(t => t[0]);
    const dataPoints = sortedTasks.map(t => Math.round(t[1] / 3600 * 10) / 10); 

    const chartInstance = renderChart(canvas, labels, dataPoints, title);
    if (chartInstance) {
        activeReportCharts.push(chartInstance);
    }

    const backgroundColors = chartInstance?.data?.datasets[0]?.backgroundColor || [];

    // 3. 詳細リスト
    const listContainer = document.createElement("div");
    // ★修正: リストの高さを拡大 (max-h-40 -> max-h-96)
    listContainer.className = "mt-4 text-sm text-gray-600 max-h-96 overflow-y-auto custom-scrollbar";
    
    const ul = document.createElement("ul");
    ul.className = "space-y-1";

    sortedTasks.forEach(([taskName, duration], index) => {
        const percentage = totalDuration > 0 ? Math.round((duration / totalDuration) * 100) : 0;
        const color = backgroundColors[index] || '#cccccc';

        const li = document.createElement("li");
        // ★修正：allUserStats を taskStatsMap に変更
        const cursorClass = taskStatsMap ? "cursor-pointer" : "";
        li.className = `flex flex-col px-2 py-1 hover:bg-gray-50 rounded border-b border-gray-100 last:border-0 ${cursorClass}`;
        
        // 業務名の行
        const rowDiv = document.createElement("div");
        rowDiv.className = "flex justify-between items-center w-full";
        rowDiv.innerHTML = `
            <div class="flex items-center truncate mr-2 flex-1" title="${escapeHtml(taskName)}">
                <span class="w-3 h-3 rounded-full mr-2 flex-shrink-0" style="background-color: ${color};"></span>
                <span class="truncate font-medium">${escapeHtml(taskName)}</span>
                ${taskStatsMap ? '<span class="text-xs text-gray-400 ml-2 toggle-icon">▼</span>' : ''}
            </div>
            <div class="flex items-center gap-2 whitespace-nowrap">
                <span class="font-mono text-gray-800">${formatHoursMinutes(duration)}</span>
                <span class="text-xs text-gray-400 w-8 text-right">(${percentage}%)</span>
            </div>
        `;
        li.appendChild(rowDiv);

        // ★修正: 内訳表示用のコンテナを追加
        if (taskStatsMap) {
            const breakdownDiv = document.createElement("div");
            breakdownDiv.className = "hidden pl-6 mt-2 pb-2 text-xs text-gray-600 border-l-2 border-gray-200 ml-1.5 space-y-1 bg-gray-50 rounded-r";
            
            // クリックイベントの設定
            li.addEventListener("click", (e) => {
                e.stopPropagation();
                
                if (breakdownDiv.classList.contains("hidden")) {
                    // 表示: データがまだなければ生成
                    if (breakdownDiv.innerHTML === "") {
                        const tStat = taskStatsMap.get(taskName);
                        if (!tStat) {
                            breakdownDiv.innerHTML = "<div class='p-2'>データなし</div>";
                        } else {
                            let html = "";
                            
                            // ① 従業員ごとのタスク合計表示
                            const usersSorted = Array.from(tStat.users.entries()).sort((a, b) => b[1] - a[1]);
                            usersSorted.forEach(([uName, dur]) => {
                                html += `
                                    <div class="flex justify-between bg-gray-100 p-1 rounded px-2 mb-1">
                                        <span class="font-semibold text-gray-700">${escapeHtml(uName)}</span>
                                        <span class="font-mono text-gray-800">${formatHoursMinutes(dur)}</span>
                                    </div>`;
                            });

                            // ② 工数ごとの合計（さらにクリックで従業員ごとの時間を展開）
                            const goalsSorted = Array.from(tStat.goals.entries()).sort((a, b) => b[1].duration - a[1].duration);
                            goalsSorted.forEach(([gTitle, gStat]) => {
                                
                                // ★追加: 納期を mm/dd 形式にフォーマット
                                let deadlineHtml = "";
                                if (gStat.deadline) {
                                    const d = new Date(gStat.deadline);
                                    if (!isNaN(d.getTime())) {
                                        const mm = String(d.getMonth() + 1).padStart(2, '0');
                                        const dd = String(d.getDate()).padStart(2, '0');
                                        deadlineHtml = `<span class="text-xs text-gray-500 ml-3 font-normal whitespace-nowrap">納期: ${mm}/${dd}</span>`;
                                    }
                                }

                                html += `<div class="mt-2 pl-2 border-l-2 border-blue-200">`;
                                html += `
                                    <div class="flex justify-between items-center cursor-pointer hover:bg-gray-200 p-1 rounded goal-toggle">
                                        <div class="flex items-center truncate mr-2 flex-1" title="${escapeHtml(gTitle)}">
                                            <span class="text-blue-700 font-medium truncate">↳ ${escapeHtml(gTitle)}</span>
                                            ${deadlineHtml}
                                            <span class="text-[10px] text-blue-700 ml-2 goal-toggle-icon flex-shrink-0">▼</span>
                                        </div>
                                        <div class="flex items-center whitespace-nowrap">
                                            <span class="font-mono text-blue-800">${formatHoursMinutes(gStat.duration)}</span>
                                        </div>
                                    </div>`;
                                });
                                html += `</div></div>`;
                            });

                            breakdownDiv.innerHTML = html;

                            // 工数の開閉イベントを設定
                            const goalToggles = breakdownDiv.querySelectorAll('.goal-toggle');
                            goalToggles.forEach(toggle => {
                                toggle.addEventListener('click', (e2) => {
                                    e2.stopPropagation();
                                    const targetBreakdown = toggle.nextElementSibling;
                                    const icon = toggle.querySelector('.goal-toggle-icon'); // ★クラスでアイコンを探す
                                    
                                    if (targetBreakdown.classList.contains("hidden")) {
                                        targetBreakdown.classList.remove("hidden");
                                        if (icon) icon.textContent = '▲';
                                    } else {
                                        targetBreakdown.classList.add("hidden");
                                        if (icon) icon.textContent = '▼';
                                    }
                                });
                            });
                        }
                    }
                    breakdownDiv.classList.remove("hidden");
                    const icon = rowDiv.querySelector(".toggle-icon");
                    if(icon) icon.textContent = "▲";
                } else {
                    // 非表示
                    breakdownDiv.classList.add("hidden");
                    const icon = rowDiv.querySelector(".toggle-icon");
                    if(icon) icon.textContent = "▼";
                }
            });
            li.appendChild(breakdownDiv);
        }

        ul.appendChild(li);
    });

    listContainer.appendChild(ul);
    parentElement.appendChild(listContainer);
}
