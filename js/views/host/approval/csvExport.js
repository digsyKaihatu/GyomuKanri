// js/views/host/approval/csvExport.js

import { db } from "../../../main.js";
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { escapeHtml } from "../../../utils.js";

export function handleCSVExportClick() {
    const todayStr = new Date().toISOString().split("T")[0];
    const currentMonth = todayStr.substring(0, 7); 
    
    const monthStr = prompt("出力したい対象の年月を入力してください (例: 2026-07):", currentMonth);
    if (!monthStr) return; 
    
    if (!/^\d{4}-\d{2}$/.test(monthStr)) {
        alert("入力形式が正しくありません。YYYY-MM 形式（例: 2026-07）で指定してください。");
        return;
    }
    
    exportRequestsToCSV(monthStr);
}

async function exportRequestsToCSV(monthStr) {
    try {
        const startRange = `${monthStr}-01`;
        const endRange = `${monthStr}-31`;
        
        const q = query(
            collection(db, "work_log_requests"), 
            where("requestDate", ">=", startRange), 
            where("requestDate", "<=", endRange)
        );
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            alert(`${monthStr} の申請データ履歴は1件も見つかりませんでした。`);
            return;
        }
        
        const headers = [
            "案件", "工数", "対象年月日", "申請者", "申請日付", 
            "申請種別", "修正前の時間", "修正後の時間", "差異", 
            "理由（区分）", "理由（自由記述）", "承認者", "承認日時"
        ];
        
        const csvRows = [headers.join(",")];
        
        const formatDateTime = (t) => {
            if (!t) return "";
            let d;
            if (typeof t.toDate === "function") d = t.toDate();
            else d = new Date(t);
            if (isNaN(d.getTime())) return "";
            return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
        };
        
        const escapeCSV = (val) => {
            if (val === null || val === undefined) return "";
            const str = String(val);
            return `"${str.replace(/"/g, '""')}"`;
        };
        
        snapshot.docs.forEach(docSnap => {
            const req = docSnap.data();
            const d = req.data || {};
            
            const task = d.task || d.taskName || "未定";
            const goal = d.goalTitle || "";
            const requestDate = req.requestDate || "";
            const userName = req.userName || "";
            const createdAt = formatDateTime(req.createdAt);
            const applicationType = d.applicationType || (req.type === "add" ? "追加" : "変更");
            
            let beforeTime = "";
            let afterTime = "";
            if (req.type === "add") {
                beforeTime = "対象外(新規追加)";
                afterTime = (d.afterStartTime && d.afterEndTime) ? `${d.afterStartTime} - ${d.afterEndTime}` : "";
            } else if (req.type === "time_correct" || req.type === "update") {
                beforeTime = (d.beforeStartTime && d.beforeEndTime) ? `${d.beforeStartTime} - ${d.beforeEndTime}` : "変更なし";
                afterTime = (d.afterStartTime && d.afterEndTime) ? `${d.afterStartTime} - ${d.afterEndTime}` : "時間変更なし";
            } else if (req.type === "count_correct") {
                beforeTime = "対象外(件数訂正)";
                afterTime = `修正後確定: ${d.count || 0}件`;
            } else if (req.type === "forget_checkout") {
                beforeTime = "対象外(退勤忘れ)";
                afterTime = d.afterEndTime || "";
            }
            
            const timeDifference = d.timeDifference || "変更なし";
            const reasonCategory = d.reasonCategory || "各種申請";
            const memo = d.memo || "";
            
            let approverName = req.approverName || "";
            if (req.status === "pending") {
                approverName = "未承認（対応待ち）";
            } else if (req.status === "rejected") {
                approverName = `${req.approverName || "管理者"} (却下対応)`;
            }
            const approvedAt = formatDateTime(req.approvedAt);
            
            const row = [
                escapeCSV(task),
                escapeCSV(goal),
                escapeCSV(requestDate),
                escapeCSV(userName),
                escapeCSV(createdAt),
                escapeCSV(applicationType),
                escapeCSV(beforeTime),
                escapeCSV(afterTime),
                escapeCSV(timeDifference),
                escapeCSV(reasonCategory),
                escapeCSV(memo),
                escapeCSV(approverName),
                escapeCSV(approvedAt)
            ];
            
            csvRows.push(row.join(","));
        });
        
        const csvContent = "\uFEFF" + csvRows.join("\r\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `全従業員_申請データ一覧_${monthStr}.csv`);
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
    } catch (error) {
        console.error("CSV Export error:", error);
        alert(`CSVの出力処理中にエラーが発生しました: ${error.message}`);
    }
}
