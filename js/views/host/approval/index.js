// js/views/host/approval/index.js
import { db, showView, VIEWS } from "../../../main.js";
import { collection, query, where, orderBy, getDocs } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { renderApprovalList } from "./approvalList.js";
import { openApprovalLogModal } from "./logModal.js";
import { handleCSVExportClick } from "./csvExport.js";

const handleBackClick = () => showView(VIEWS.HOST);

export async function initializeApprovalView() {
    const container = document.getElementById(VIEWS.APPROVAL);
    if (!container) return; 

    injectActionButtons();

    const backBtn = document.getElementById("back-from-approval");
    backBtn?.addEventListener("click", handleBackClick);
    
    // 初期表示時のデータ取得
    await fetchApprovalData();
}

export function cleanupApprovalView() {
    const backBtn = document.getElementById("back-from-approval");
    backBtn?.removeEventListener("click", handleBackClick);
}

/**
 * 承認待ちデータをFirestoreから取得して再描画する関数
 */
async function fetchApprovalData() {
    const refreshBtn = document.getElementById("refresh-approval-btn");
    
    // 通信中の連打防止とフィードバック表示
    if (refreshBtn) {
        refreshBtn.disabled = true;
        refreshBtn.classList.add("opacity-50", "cursor-not-allowed");
        refreshBtn.innerHTML = `⏳ 取得中...`;
    }

    const q = query(
        collection(db, "work_log_requests"),
        where("status", "==", "pending"),
        orderBy("createdAt", "asc")
    );

    try {
        const querySnapshot = await getDocs(q);
        renderApprovalList(querySnapshot.docs);
    } catch (error) {
        console.error("承認待ちデータの取得に失敗しました:", error);
    } finally {
        // ボタン状態を元に戻す
        if (refreshBtn) {
            refreshBtn.disabled = false;
            refreshBtn.classList.remove("opacity-50", "cursor-not-allowed");
            refreshBtn.innerHTML = `🔄 最新に更新`;
        }
    }
}

function injectActionButtons() {
    if (document.getElementById("view-approval-log-btn")) return;
    
    const backBtn = document.getElementById("back-from-approval");
    if (backBtn) {
        const parent = backBtn.parentNode;
        const wrapper = document.createElement("div");
        wrapper.className = "flex items-center gap-2";
        
        // 🔄 最新に更新ボタン
        const refreshBtn = document.createElement("button");
        refreshBtn.id = "refresh-approval-btn";
        refreshBtn.className = "bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded shadow transition text-sm";
        refreshBtn.innerHTML = `🔄 最新に更新`;

        // 📋 ログ閲覧ボタン
        const logBtn = document.createElement("button");
        logBtn.id = "view-approval-log-btn";
        logBtn.className = "bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded shadow transition text-sm";
        logBtn.innerHTML = `📋 ログ閲覧`;
        
        // 📥 CSV出力ボタン
        const csvBtn = document.createElement("button");
        csvBtn.id = "export-csv-btn";
        csvBtn.className = "bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded shadow transition text-sm";
        csvBtn.innerHTML = `📥 CSV出力`;
        
        parent.insertBefore(wrapper, backBtn);
        wrapper.appendChild(refreshBtn);
        wrapper.appendChild(logBtn);
        wrapper.appendChild(csvBtn);
        wrapper.appendChild(backBtn);
        
        // クリックイベントの設定
        refreshBtn.addEventListener("click", fetchApprovalData);
        logBtn.addEventListener("click", openApprovalLogModal);
        csvBtn.addEventListener("click", handleCSVExportClick);
    }
}
