// js/views/client/timer.js

import { showConfirmationModal, hideConfirmationModal } from "../../components/modal/index.js";
import { allTaskObjects } from "../../main.js";
import * as Logic from "./timerLogic.js";
import * as State from "./timerState.js";

// 他のファイルがこれらの関数を使っているため再エクスポート
export const getCurrentTask = State.getCurrentTask;
export const getCurrentGoalId = State.getCurrentGoalId;
export const getIsWorking = State.getIsWorking;
export const getStartTime = State.getStartTime;
export const setHasContributed = State.setHasContributed;
export const getHasContributed = State.getHasContributed;
export const restoreClientState = Logic.restoreClientState;
export const stopStatusListener = Logic.stopTimerLoop;

// --- Action Handlers ---

export async function handleStartClick() {
    const taskSelect = document.getElementById("task-select");
    const goalSelect = document.getElementById("goal-select");
    const otherTaskInput = document.getElementById("other-task-input");

    // 1. タスク名の取得
    const selectedTask = taskSelect.value === "その他" ? otherTaskInput.value : taskSelect.value;

    // 2. 目標IDとタイトルの取得
    let selectedGoalId = goalSelect ? goalSelect.value : null;
    let selectedGoalTitle = goalSelect ? goalSelect.options[goalSelect.selectedIndex]?.text : null;

    if (selectedGoalId === "" || selectedGoalTitle === "工数を選択 (任意)" || selectedGoalTitle === "なし") {
        selectedGoalId = null;
        selectedGoalTitle = null;
    }

    // エラーチェック
    if (selectedGoalTitle && !selectedGoalId) {
        alert("エラー: 目標IDが取得できませんでした。");
        return; 
    }

    if (!selectedTask) {
        alert("業務内容を選択または入力してください。");
        return;
    }

    const isWorking = localStorage.getItem("isWorking") === "1";
    
    // 進捗未入力チェック
    if (isWorking && State.getCurrentGoalId() && !State.getHasContributed()) {

        const currentTaskObj = allTaskObjects.find(t => t.name === State.getCurrentTask());
        const currentGoalObj = currentTaskObj?.goals?.find(g => g.id === State.getCurrentGoalId() || g.title === State.getCurrentGoalId());

if (currentGoalObj && currentGoalObj.target > 0) {
            showConfirmationModal(
                `「${State.getCurrentGoalTitle()}」の進捗(件数)が入力されていません。\nこのまま業務を変更しますか？`,
                async () => {
                    hideConfirmationModal();
                    await Logic.stopCurrentTaskCore(false); 
                    await Logic.executeStartTask(selectedTask, selectedGoalId, selectedGoalTitle);
                },
                hideConfirmationModal
            );
            return; 
        }
    } // <--- 進捗未入力チェックの if 文終了

    // 業務変更（通常）
    if (isWorking) {
        await Logic.stopCurrentTaskCore(false);
    }

    await Logic.executeStartTask(selectedTask, selectedGoalId, selectedGoalTitle);
} // <--- handleStartClick 関数の終了        

export async function handleStopClick(isAuto = false) {
    if (!isAuto) {
        const { cancelAllReservations } = await import("./reservations.js");
        await cancelAllReservations();
    }
    if (!State.getCurrentTask()) return;

    if (State.getCurrentGoalId() && !State.getHasContributed()) {

        
        // ★追加: こちらも同様に目標値0チェックを追加
        const currentTaskObj = allTaskObjects.find(t => t.name === State.getCurrentTask());
        const currentGoalObj = currentTaskObj?.goals?.find(g => g.id === State.getCurrentGoalId() || g.title === State.getCurrentGoalId());

        if (currentGoalObj && currentGoalObj.target > 0) {
        showConfirmationModal(
            `「${State.getCurrentGoalTitle()}」の進捗(件数)が入力されていません。\nこのまま終了（帰宅）しますか？`,
            async () => {
                hideConfirmationModal();
                await Logic.stopCurrentTask(true);
            },
            hideConfirmationModal
        );
        return;
    }
    }

    await Logic.stopCurrentTask(true);
}

export async function handleBreakClick(isAuto = false) {
    if (!isAuto) {
        const { cancelAllReservations } = await import("./reservations.js");
        await cancelAllReservations();
    }

    const isWorking = localStorage.getItem("isWorking") === "1";
    const nowTask = localStorage.getItem("currentTask");

    if (!isWorking) return;

    if (nowTask === "休憩") {
        // --- 休憩から戻る ---
        
         await Logic.stopCurrentTaskCore(false); 
        
        let taskToReturnTo = null;
        try {
            const savedPreTask = localStorage.getItem("preBreakTask");
            if (savedPreTask) {
                taskToReturnTo = JSON.parse(savedPreTask);
                if (typeof taskToReturnTo === 'string') {
                    taskToReturnTo = JSON.parse(taskToReturnTo);
                }
            }
        } catch (e) {
            console.error("休憩前タスクの復元失敗:", e);
        }

        if (taskToReturnTo && taskToReturnTo.task) {

            // ★修正: ここは「BreakClick」なので taskToReturnTo 系を使うのが正解
            // さっきはここに selectedTask と書いてしまったためエラーになりました                      
            await Logic.executeStartTask(taskToReturnTo.task, taskToReturnTo.goalId, taskToReturnTo.goalTitle);
        } else {
            console.warn("休憩前のタスク情報が破損しているため、停止処理を行います。");
            await Logic.stopCurrentTask(true);
        }
    } else {
        // --- 休憩を開始する ---

        let currentGoalId = State.getCurrentGoalId();
        if (!currentGoalId) {
            const goalSelect = document.getElementById("goal-select");
            if (goalSelect) {
                currentGoalId = goalSelect.value;
            }
        }
        
        const preTaskData = { 
            task: State.getCurrentTask(), 
            goalId: currentGoalId,
            goalTitle: State.getCurrentGoalTitle() 
        };
        
        localStorage.setItem("preBreakTask", JSON.stringify(preTaskData));
        State.setPreBreakTask(preTaskData);

        await Logic.stopCurrentTaskCore(false); 

        await Logic.executeStartTask("休憩", null, null);
    }
}
