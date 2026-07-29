// js/views/personalDetail/logData.js (データ取得 担当)

import { db } from "../../firebase.js";
import { collection, query, where, onSnapshot } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getJSTDateString } from "../../utils.js";

let personalDetailUnsubscribe = null; // Firestore listener unsubscribe function

// 🌟追加: アプリ全体でログデータを使い回すためのメモリキャッシュ領域
export const globalMonthLogsCache = new Map();

/**
 * Starts the Firestore listener for the specified user's work logs for a specific month.
 * @param {string} name - The username whose logs to fetch.
 * @param {Date} dateToDisplay - The date object indicating which month to fetch.
 * @param {function} onLogsReceived - Callback function executed with the fetched logs array.
 */
export function startListeningForUserLogs(name, dateToDisplay, onLogsReceived) {
    stopListeningForUserLogs(); // Ensure previous listener is stopped

    if (!name) {
        console.error("Cannot listen for logs: Username is missing.");
        onLogsReceived([]); // ログ無しとしてコールバック
        return;
    }

    // 1. 表示対象の月の初日と最終日を計算
    const year = dateToDisplay.getFullYear();
    const month = dateToDisplay.getMonth(); // 0-based
    const cacheKey = `${name}_${year}-${month}`; // 例: "山田太郎_2026-6"
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0); // その月の最終日
    
    const startDateStr = getJSTDateString(firstDay); // "YYYY-MM-01"
    const endDateStr = getJSTDateString(lastDay);   // "YYYY-MM-30" など

    // 2. クエリを修正
    const q = query(
        collection(db, "work_logs"),
        where("userName", "==", name),
        where("date", ">=", startDateStr), // 月の初日
        where("date", "<=", endDateStr)   // 月の最終日
    );

    personalDetailUnsubscribe = onSnapshot(q, (snapshot) => {
        const logs = snapshot.docs.map((d) => {
            const data = d.data();
            // Convert Firestore Timestamps to JS Date objects
            const log = { id: d.id, ...data };
            if (log.startTime && log.startTime.toDate) log.startTime = log.startTime.toDate();
            if (log.endTime && log.endTime.toDate) log.endTime = log.endTime.toDate();
            return log;
        });
        
        // 🌟追加: 取得した最新の月間ログをキャッシュに保存
        globalMonthLogsCache.set(cacheKey, logs);
        
        // データを司令塔（personalDetail.js）にコールバックで渡す
        if (typeof onLogsReceived === 'function') {
            onLogsReceived(logs);
        }

    }, (error) => {
        console.error(`Error listening for logs for user ${name}:`, error);
        if (typeof onLogsReceived === 'function') {
            onLogsReceived([]); // エラー時も空配列を渡す
        }
    });
}

/**
 * Stops the Firestore listener for user logs.
 */
export function stopListeningForUserLogs() {
    if (personalDetailUnsubscribe) {
        personalDetailUnsubscribe();
        personalDetailUnsubscribe = null;
    }
}

/**
 * 🌟追加: メモリキャッシュから指定日のログを一瞬で取得する関数
 */
export function getCachedLogsForDate(userName, dateStr) {
    if (!dateStr || !userName) return [];
    
    const [yearStr, monthStr] = dateStr.split("-");
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10) - 1; // JSのMonthは0〜11
    
    const cacheKey = `${userName}_${year}-${month}`;
    const monthLogs = globalMonthLogsCache.get(cacheKey) || [];
    
    return monthLogs.filter(log => log.date === dateStr);
}
