// js/utils.js - 汎用ヘルパー関数

import { db } from "./firebase.js"; 
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { fixCheckoutModal } from "./components/modal/index.js"; 

export function formatDuration(seconds) {
    if (isNaN(seconds) || seconds < 0) return "00:00:00";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function formatHoursMinutes(seconds) {
    if (isNaN(seconds) || seconds < 0) return "0時間 0分";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}時間 ${m}分`;
}

export function formatHoursAndMinutesSimple(seconds) {
    if (isNaN(seconds) || seconds < 0) return "0:00";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}:${m.toString().padStart(2, "0")}`;
}

export function formatTime(timestamp) {
    let date;
    if (timestamp && typeof timestamp.toDate === 'function') {
        date = timestamp.toDate(); 
    } else if (timestamp instanceof Date && !isNaN(timestamp)) {
        date = timestamp; 
    } else {
        return ""; 
    }

    try {
        const hours = date.getHours().toString().padStart(2, "0");
        const minutes = date.getMinutes().toString().padStart(2, "0");
        return `${hours}:${minutes}`;
    } catch (error) {
        console.error("Error formatting time:", error, timestamp);
        return ""; 
    }
}

export function getJSTDateString(dateObj) {
     if (!(dateObj instanceof Date) || isNaN(dateObj)) {
         console.warn("Invalid date object passed to getJSTDateString:", dateObj);
         dateObj = new Date();
     }
    try {
        const year = dateObj.getFullYear();
        const month = (dateObj.getMonth() + 1).toString().padStart(2, "0");
        const day = dateObj.getDate().toString().padStart(2, "0");
        return `${year}-${month}-${day}`;
    } catch (error) {
        console.error("Error formatting date string:", error, dateObj);
        return ""; 
    }
}

export function getMonthDateRange(dateObj) {
    const year = dateObj.getFullYear();
    const month = dateObj.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    return {
        start: getJSTDateString(firstDay),
        end: getJSTDateString(lastDay)
    };
}

/**
 * Firestoreのユーザーステータスを確認し、退勤忘れ修正が必要な場合に修正モーダルを表示します。
 * 修正が必要な場合はキャンセルボタンを隠し、警告メッセージを表示して修正を強制します。
 * @param {string} uid - 確認対象のユーザーID。
 */
export async function checkForCheckoutCorrection(uid) {
    if (!uid) {
         console.warn("Cannot check for checkout correction: UID is missing.");
         return;
    }

    const clientView = document.getElementById("client-view");
    if (!clientView || !clientView.classList.contains("active-view")) {
        return;
    }
    
    const statusRef = doc(db, "work_status", uid);
    try {
        const statusSnap = await getDoc(statusRef);
        if (statusSnap.exists() && statusSnap.data().needsCheckoutCorrection === true) {
            
            if (fixCheckoutModal) {
                const dateInput = fixCheckoutModal.querySelector("#fix-checkout-date-input");
                const cancelBtn = fixCheckoutModal.querySelector("#fix-checkout-cancel-btn");
                const descP = fixCheckoutModal.querySelector("p");
                
                if (dateInput) {
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    dateInput.value = getJSTDateString(yesterday);
                }

                if (cancelBtn) cancelBtn.style.display = "none";

                if (descP) {
                    descP.textContent = "【重要】前回の退勤処理が完了していません。正しい退勤時刻を入力して修正してください。この操作は完了するまでスキップできません。";
                    descP.classList.add("text-red-600", "font-bold");
                }

                fixCheckoutModal.classList.remove("hidden");
            }
        }
    } catch (error) {
        console.error(`Error checking checkout correction flag for user ${uid}:`, error);
    }
}

export function escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') return '';
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

/**
 * テキスト内のURLをリンクに変換し、さらに #文字# を赤色で少し大きく装飾する関数
 * 画像URLやチャットツールの画像添付URLの場合は <img> タグのみを生成し、中央揃えで表示します。
 * ※セキュリティのため、必ず先に escapeHtml を通した文字列を渡してください。
 */
export function linkify(escapedText) {
    if (!escapedText) return "";
    
    // 0. 【自動修復】（変更なし）
    let healedText = escapedText;
    const healRegex = /(https?:\/\/[^\s<>#"]+)[\s\n]+([a-zA-Z0-9%=\?&\-\+_\/;]{15,})/gi;
    
    let previousText;
    do {
        previousText = healedText;
        healedText = healedText.replace(healRegex, "$1$2");
    } while (healedText !== previousText);
    
    // 1. 【修正】画像URL、およびチャットツールのルーム/スペース由来のURLも画像として検知
    // chat.google.com/room/... などのパターンや、通常の画像拡張子・content_typeに対応
    const imageUrlRegex = /\n?(https?:\/\/[^\s\n<>"]*(?:content_type=image|\.(?:jpeg|jpg|gif|png|webp|svg)|chat\.google\.com\/(?:room|space))[^\s\n<>"]*)\n?/gi;
    
    let processedText = healedText.replace(imageUrlRegex, (match, url) => {
        return `<div class="my-2 flex justify-center"><img src="${url}" alt="貼り付けられた画像" class="max-w-full sm:max-w-xs md:max-w-md h-auto rounded-lg shadow-md border border-gray-200" onerror="this.style.display='none';"/></div>`;
    });

    // 2. 通常のURL（画像ではないリンク）をそのままテキストリンク化（変更なし）
    const normalUrlRegex = /(https?:\/\/[^\s\n<>"]+)/g;
    processedText = processedText.replace(normalUrlRegex, (url) => {
        return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline break-all">${url}</a>`;
    });

    // 3. #（文字）# を装飾（変更なし）
    const decorRegex = /#([^#\n]+)#/g;
    processedText = processedText.replace(decorRegex, (match, p1) => {
        return `<span class="text-red-600 text-base font-bold">${p1}</span>`;
    });

    return processedText;
}
