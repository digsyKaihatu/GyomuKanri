// js/views/personalDetail/personalDetail.js (リファクタリング版 - 司令塔)

import { db, userName as currentUserName, authLevel, viewHistory, showView, VIEWS, allTaskObjects, updateGlobalTaskObjects, handleGoBack } from "../../main.js";
import { renderUnifiedCalendar } from "../../components/calendar.js"; 
import { editLogModal, editMemoModal, editContributionModal } from "../../components/modal/index.js";

import { startListeningForUserLogs, stopListeningForUserLogs } from "./logData.js";
import { showDailyLogs, showMonthlyLogs, clearDetails } from "./logDisplay.js";
import { handleTimelineClick, handleSaveLogDuration, handleSaveMemo, handleSaveContribution } from "./logEditor.js";
import { handleDeleteUserClick } from "./adminActions.js";
// 修正：openRequestCheckModal も一緒にインポートします
import { openUnifiedRequestModal, openRequestCheckModal } from "./requestModal.js";

// --- Module State ---
let selectedUserLogs = [];
let currentCalendarDate = new Date();
let selectedDateStr = null; 
let currentUserForDetailView = null; 

// DOM要素 (遅延初期化)
let detailTitle, calendarEl, monthYearEl, prevMonthBtn, nextMonthBtn, detailsTitleEl, detailsContentEl, deleteUserContainer, deleteUserBtn, backButton, editLogSaveBtn, editMemoSaveBtn, editContributionSaveBtn, editLogCancelBtn, editMemoCancelBtn, editContributionCancelBtn;

function initializeDOMElements() {
    detailTitle = document.getElementById("personal-detail-title");
    calendarEl = document.getElementById("calendar");
    monthYearEl = document.getElementById("calendar-month-year");
    prevMonthBtn = document.getElementById("prev-month-btn");
    nextMonthBtn = document.getElementById("next-month-btn");
    detailsTitleEl = document.getElementById("details-title");
    detailsContentEl = document.getElementById("details-content");
    deleteUserContainer = document.getElementById("delete-user-container");
    deleteUserBtn = document.getElementById("delete-user-btn");
    backButton = document.getElementById("back-from-detail-btn");
    editLogSaveBtn = document.getElementById("edit-log-save-btn");
    editMemoSaveBtn = document.getElementById("edit-memo-save-btn");
    editContributionSaveBtn = document.getElementById("edit-contribution-save-btn");
    editLogCancelBtn = document.getElementById("edit-log-cancel-btn");
    editMemoCancelBtn = document.getElementById("edit-memo-cancel-btn");
    editContributionCancelBtn = document.getElementById("edit-contribution-cancel-btn");
}

function injectAddRequestButton() {
    // 既存ボタンがあれば削除（重複防止のためのクリーンアップ）
    const existingBtn = document.getElementById("add-request-btn");
    if(existingBtn) existingBtn.remove();
    const existingCheckBtn = document.getElementById("request-check-btn");
    if(existingCheckBtn) existingCheckBtn.remove();

    // タイトルの横のヘッダー領域を取得
    const header = document.querySelector("#personal-detail-view .flex.justify-between");
    if (header) {
        // --- ① 業務タイムライン変更追加申請ボタン ---
        const btn = document.createElement("button");
        btn.id = "add-request-btn";
        btn.className = "bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded shadow ml-4 tooltip text-sm transition";
        btn.innerHTML = `
            業務タイムライン変更追加申請
            <span class="tooltip-text">
                各種修正・追加申請はこちらから行えます
            </span>
        `;
        btn.onclick = () => {
            const targetDate = selectedDateStr || new Date().toISOString().split("T")[0];
            openUnifiedRequestModal(targetDate);
        };
        header.appendChild(btn);

        // --- ② 【新規追加】申請確認ボタン ---
        const checkBtn = document.createElement("button");
        checkBtn.id = "request-check-btn";
        // Tailwindのスタイルを統一し、ml-2 で少し隙間を空けて配置
        checkBtn.className = "bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded shadow ml-2 tooltip text-sm transition";
        checkBtn.innerHTML = `
            申請確認
            <span class="tooltip-text">
                過去の申請状況や履歴を確認できます
            </span>
        `;
        checkBtn.onclick = () => {
            // カレンダーで選択中の日付、選んでいなければ今日の日付を取得してモーダルに渡す
            const targetDate = selectedDateStr || new Date().toISOString().split("T")[0];
            openRequestCheckModal(targetDate);
        };
        header.appendChild(checkBtn);
    }
}

export function initializePersonalDetailView(data) {
    initializeDOMElements();
    const name = data?.userName;
    if (!name) {
        console.error("Cannot initialize Personal Detail View: Username missing in data.");
        handleGoBack();
        return;
    }

    currentUserForDetailView = name;

    if (detailTitle) detailTitle.textContent = `${escapeHtml(name)} の業務記録`;

    currentCalendarDate = new Date();
    selectedDateStr = null;

    // ★追加: 申請ボタン配置
    injectAddRequestButton();

    const previousView = viewHistory[viewHistory.length - 2];
    if (deleteUserContainer) {
        if (authLevel === 'admin' && previousView === VIEWS.HOST && currentUserForDetailView !== currentUserName) {
            deleteUserContainer.style.display = "block";
        } else {
            deleteUserContainer.style.display = "none";
        }
    }

    startListeningForUserLogs(currentUserForDetailView, currentCalendarDate, (logs) => {
        selectedUserLogs = logs;
        renderCalendar();
        
        if (selectedDateStr) {
            const dayElement = calendarEl?.querySelector(`.calendar-day[data-date="${selectedDateStr}"]`);
            if(dayElement) {
                handleDayClick({ currentTarget: dayElement });
            } else {
                handleMonthClick(); 
            }
        } else {
            handleMonthClick(); 
        }
    });

    clearDetails(detailsTitleEl, detailsContentEl);
    setupPersonalDetailEventListeners();
}

export function cleanupPersonalDetailView() {
    stopListeningForUserLogs();
    selectedUserLogs = [];
    currentUserForDetailView = null;
    selectedDateStr = null;
    
    // ボタンの掃除
    const btn = document.getElementById("add-request-btn");
    if(btn) btn.remove();
    
    // 【新規追加】申請確認ボタンの掃除
    const checkBtn = document.getElementById("request-check-btn");
    if(checkBtn) checkBtn.remove();
}

export function setupPersonalDetailEventListeners() {
    prevMonthBtn?.addEventListener("click", () => moveMonth(-1));
    nextMonthBtn?.addEventListener("click", () => moveMonth(1));
    backButton?.addEventListener("click", handleGoBack);
    
    deleteUserBtn?.addEventListener("click", () => {
        handleDeleteUserClick(currentUserForDetailView, authLevel, currentUserName);
    });

    editLogSaveBtn?.addEventListener("click", handleSaveLogDuration);
    editMemoSaveBtn?.addEventListener("click", handleSaveMemo);
    editContributionSaveBtn?.addEventListener("click", handleSaveContribution);

// ★追加: キャンセルボタンのイベント (ここを追加してください)
    editLogCancelBtn?.addEventListener("click", () => {
        if (editLogModal) editLogModal.classList.add("hidden");
    });
    
    editMemoCancelBtn?.addEventListener("click", () => {
        if (editMemoModal) editMemoModal.classList.add("hidden");
    });
    
    editContributionCancelBtn?.addEventListener("click", () => {
        if (editContributionModal) editContributionModal.classList.add("hidden");
    });
    
     detailsContentEl?.addEventListener('click', (event) => {
        handleTimelineClick(event.target, selectedUserLogs, currentUserForDetailView, {
             editLogModal,
             editMemoModal,
             editContributionModal
         });
     });

}

function renderCalendar() {
    if (!calendarEl || !monthYearEl) {
        console.warn("Calendar elements not found for rendering.");
        return;
    }
    renderUnifiedCalendar({
        calendarEl: calendarEl,
        monthYearEl: monthYearEl,
        dateToDisplay: currentCalendarDate,
        logs: selectedUserLogs, 
        onDayClick: handleDayClick, 
        onMonthClick: handleMonthClick, 
    });

     if (selectedDateStr) {
         const dayElement = calendarEl.querySelector(`.calendar-day[data-date="${selectedDateStr}"]`);
         if (dayElement) {
             dayElement.classList.add("selected");
         }
     }
}

function moveMonth(direction) {
    selectedDateStr = null; 
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + direction);
    
    if (currentUserForDetailView) {
        startListeningForUserLogs(currentUserForDetailView, currentCalendarDate, (logs) => {
            selectedUserLogs = logs;
            renderCalendar();
            handleMonthClick(); 
        });
    } else {
         console.error("Cannot move month, currentUserForDetailView is not set.");
    }
}

function handleDayClick(event) {
    const dayElement = event.currentTarget;
    const date = dayElement?.dataset?.date;
    if (!date) return;

    selectedDateStr = date;

    calendarEl?.querySelectorAll(".calendar-day.selected").forEach((el) => el.classList.remove("selected"));
    dayElement.classList?.add("selected");

    showDailyLogs(
        date,
        selectedUserLogs, 
        authLevel,
        currentUserForDetailView,
        currentUserName,
        detailsTitleEl,
        detailsContentEl
    );
}

function handleMonthClick() {
    selectedDateStr = null;
    calendarEl?.querySelectorAll(".calendar-day.selected").forEach((el) => el.classList.remove("selected"));

    showMonthlyLogs(
        currentCalendarDate,
        selectedUserLogs,
        detailsTitleEl,
        detailsContentEl,
        monthYearEl
    );
}

function escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') return '';
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
 }
