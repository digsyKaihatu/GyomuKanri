// js/views/host/approval/index.js
import { db, showView, VIEWS } from "../../../main.js";
import { collection, query, where, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { renderApprovalList } from "./approvalList.js";
import { openApprovalLogModal } from "./logModal.js";
import { handleCSVExportClick } from "./csvExport.js";

let unsubscribe = null;
const handleBackClick = () => showView(VIEWS.HOST);

export function initializeApprovalView() {
    const container = document.getElementById(VIEWS.APPROVAL);
    if (!container) return; 

    injectActionButtons();

    const backBtn = document.getElementById("back-from-approval");
    backBtn?.addEventListener("click", handleBackClick);
    
    const q = query(
        collection(db, "work_log_requests"),
        where("status", "==", "pending"),
        orderBy("createdAt", "asc")
    );

    unsubscribe = onSnapshot(q, (snapshot) => {
        renderApprovalList(snapshot.docs);
    });
}

export function cleanupApprovalView() {
    if (unsubscribe) unsubscribe();
    const backBtn = document.getElementById("back-from-approval");
    backBtn?.removeEventListener("click", handleBackClick);
}

function injectActionButtons() {
    if (document.getElementById("view-approval-log-btn")) return;
    
    const backBtn = document.getElementById("back-from-approval");
    if (backBtn) {
        const parent = backBtn.parentNode;
        const wrapper = document.createElement("div");
        wrapper.className = "flex items-center gap-2";
        
        const logBtn = document.createElement("button");
        logBtn.id = "view-approval-log-btn";
        logBtn.className = "bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded shadow transition text-sm";
        logBtn.innerHTML = `📋 ログ閲覧`;
        
        const csvBtn = document.createElement("button");
        csvBtn.id = "export-csv-btn";
        csvBtn.className = "bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded shadow transition text-sm";
        csvBtn.innerHTML = `📥 CSV出力`;
        
        parent.insertBefore(wrapper, backBtn);
        wrapper.appendChild(logBtn);
        wrapper.appendChild(csvBtn);
        wrapper.appendChild(backBtn);
        
        logBtn.addEventListener("click", openApprovalLogModal);
        csvBtn.addEventListener("click", handleCSVExportClick);
    }
}
