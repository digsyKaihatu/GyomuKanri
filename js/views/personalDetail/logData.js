// js/views/personalDetail/logData.js (データ取得 担当)

import { db } from "../../firebase.js";
import { collection, query, where, onSnapshot } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getJSTDateString } from "../../utils.js";

let personalDetailUnsubscribe = null; // Firestore listener unsubscribe function

/**
 * Starts the Firestore listener for the specified user's work logs for a specific month.
 * @param {string} name - The username whose logs to fetch.
 * @param {Date} dateToDisplay - The date object indicating which month to fetch.
 * @param {function} onLogsReceived - Callback function executed with the fetched logs array.
 */

export function startListeningForUserLogs(name, dateToDisplay, onLogsReceived) {
    stopListeningForUserLogs();

    if (!name) {
        onLogsReceived([]);
        return;
    }

    const year = dateToDisplay.getFullYear();
    const month = dateToDisplay.getMonth();
    const cacheKey = `${name}_${year}-${month}`; // 例: "山田太郎_2026-6"

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDateStr = getJSTDateString(firstDay);
    const endDateStr = getJSTDateString(lastDay);

    const q = query(
        collection(db, "work_logs"),
        where("userName", "==", name),
        where("date", ">=", startDateStr),
        where("date", "<=", endDateStr)
    );

    personalDetailUnsubscribe = onSnapshot(q, (snapshot) => {
        const logs = snapshot.docs.map((d) => {
            const data = d.data();
            const log = { id: d.id, ...data };
            if (log.startTime && log.startTime.toDate) log.startTime = log.startTime.toDate();
            if (log.endTime && log.endTime.toDate) log.endTime = log.endTime.toDate();
            return log;
        });
        
        // 🌟追加：取得したデータをグローバルキャッシュに保存して使い回せるようにする
        globalMonthLogsCache.set(cacheKey, logs);
        
        if (typeof onLogsReceived === 'function') {
            onLogsReceived(logs);
        }
    }, (error) => {
        console.error(`Error listening for logs for user ${name}:`, error);
        if (typeof onLogsReceived === 'function') onLogsReceived([]);
    });
}

// 🌟追加：別ファイル（モーダルなど）から特定の日のログをキャッシュから取り出す関数
export function getCachedLogsForDate(userName, dateStr) {
    if (!dateStr || !userName) return [];
    
    // dateStr (例: "2026-07-28") から年と月（0-based）を取得
    const [yearStr, monthStr] = dateStr.split("-");
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10) - 1; 
    
    const cacheKey = `${userName}_${year}-${month}`;
    const monthLogs = globalMonthLogsCache.get(cacheKey) || [];
    
    // その月の全ログから、指定された日付のものだけをフィルタリングして返す
    return monthLogs.filter(log => log.date === dateStr);
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
