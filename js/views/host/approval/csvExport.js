// js/views/host/approval/csvExport.js

import { db } from "../../../main.js";
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { escapeHtml } from "../../../utils.js";

// ① CSV出力専用のモーダルHTMLを動的に生成
function createCSVExportModalHTML() {
    if (document.getElementById("export-csv-modal")) return;

    const modalHtml = `
    <div id="export-csv-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center hidden z-50 p-4">
        <div class="bg-white p-6 md:p-8 rounded-xl shadow-lg max-w-sm w-full animate-fade-in">
            <h2 class="text-xl font-bold mb-6 text-center text-gray-700">CSV出力</h2>
            <div class="space-y-4">
                <div>
                    <label for="csv-year-select" class="block text-sm font-medium text-gray-700">年</label>
                    <select id="csv-year-select" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm font-semibold"></select>
                </div>
                <div>
                    <label for="csv-month-select" class="block text-sm font-medium text-gray-700">月</label>
                    <select id="csv-month-select" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm font-semibold"></select>
                </div>
            </div>
            <div class="flex justify-end gap-4 mt-6">
                <button id="cancel-export-csv-btn" class="bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-lg hover:bg-gray-400 transition text-sm">キャンセル</button>
                <button id="confirm-export-csv-btn" class="bg-emerald-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-emerald-700 transition text-sm">出力</button>
            </div>
        </div>
    </div>`;

    document.body.insertAdjacentHTML("beforeend", modalHtml);

    // イベントの紐付け
    document.getElementById("cancel-export-csv-btn").onclick = closeCSVExportModal;
    document.getElementById("confirm-export-csv-btn").onclick = executeCSVExportWorkflow;
}

// ② CSV出力ボタンが押された時の挙動（プルダウンの初期化と表示）
export function handleCSVExportClick() {
    createCSVExportModalHTML();

    const yearSelect = document.getElementById("csv-year-select");
    const monthSelect = document.getElementById("csv-month-select");
    if (!yearSelect || !monthSelect) return;

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    // 年プルダウンの生成 (過去5年分)
    yearSelect.innerHTML = "";
    for (let i = 0; i < 5; i++) {
        const year = currentYear - i;
        const option = document.createElement("option");
        option.value = year;
        option.textContent = year;
        yearSelect.appendChild(option);
    }

    // 月プルダウンの生成
    monthSelect.innerHTML = "";
    for (let i = 1; i <= 12; i++) {
        const option = document.createElement("option");
        option.value = String(i).padStart(2, '0'); // Firestoreのフォーマット(07)に合わせる
        option.textContent = `${i}月`;
        if (i === currentMonth) option.selected = true;
        monthSelect.appendChild(option);
    }

    document.getElementById("export-csv-modal").classList.remove("hidden");
}

function closeCSVExportModal() {
    const modal = document.getElementById("export-csv-modal");
    if (modal) modal.classList.add("hidden");
}

// ③ 「出力」が確定した段階で実際のデータ抽出を呼び出す
async function executeCSVExportWorkflow() {
    const year = document.getElementById("csv-year-select").value;
    const month = document.getElementById("csv-month-select").value;
    const monthStr = `${year}-${month}`;

    closeCSVExportModal();
    await exportRequestsToCSV(monthStr);
}

// ④ 実際のダウンロード処理
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
