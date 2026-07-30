// js/views/host/approval/approvalActions.js
import { userId as currentAdminId, userName as currentAdminName } from "../../../main.js";
import { WORKER_URL } from "../../client/timerState.js";

export async function handleApprove(reqDoc, fallbackTargetLogId = null) {
    if (!confirm("この申請を承認して、実際の勤務ログへ反映させますか？")) return;

    try {
        const requestData = typeof reqDoc.data === "function" ? reqDoc.data() : (reqDoc.data || reqDoc);

        // 🌟 退勤忘れ等で targetLogId が無ければ、フロント側で特定した ID をセット
        if (!requestData.targetLogId && !requestData.data?.targetLogId && fallbackTargetLogId) {
            requestData.targetLogId = fallbackTargetLogId;
        }

        const response = await fetch(`${WORKER_URL}/approve-request`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                requestId: reqDoc.id,
                requestData: requestData,
                adminId: currentAdminId,
                adminName: currentAdminName
            })
        });

        const result = await response.json();

        if (!response.ok) {
            const errorMsg = result.error || result.message || "サーバー側での承認処理に失敗しました。";
            throw new Error(`${errorMsg}\n\n[詳細スタック]: ${result.stack || 'なし'}`);
        }

        alert("申請を承認し、勤務記録への書き込みを完了しました。");

        // モーダルが開いていれば自動閉鎖
        document.getElementById("close-timeline-modal")?.click();

        if (typeof window.refreshApprovalList === "function") {
            window.refreshApprovalList();
        }

    } catch (error) {
        console.error("Approval error:", error);
        alert(`承認処理中にエラーが発生しました:\n${error.message}`);
    }
}

// 却下処理 (却下時は Read/Write の対象データ変更がないため既存のままで OK)
export async function handleRejectRequest(reqDoc) {
    const reason = prompt("この申請を却下しますか？\n却下理由を入力してください（空欄のままでも却下可能です。キャンセルで中断します）:");

    if (reason === null) return; 

    try {
        const response = await fetch(`${WORKER_URL}/reject-request`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                requestId: reqDoc.id,
                adminId: currentAdminId,
                adminName: currentAdminName,
                rejectReason: reason.trim()
            })
        });

        const result = await response.json();
        
        if (!response.ok) {
            const errorMsg = result.error || result.message || "サーバー側での却下処理に失敗しました。";
            throw new Error(`${errorMsg}\n\n[詳細スタック]: ${result.stack || 'なし'}`);
        }

        alert("申請を却下しました。申請履歴にログが保持されます。");

        document.getElementById("close-timeline-modal")?.click();

        if (typeof window.refreshApprovalList === "function") {
            window.refreshApprovalList();
        }
    } catch (error) {
        console.error("Reject error:", error);
        alert(`却下処理中にエラーが発生しました:\n${error.message}`);
    }
}

// 一括承認処理
export async function handleBulkApprove(reqDocs) {
    if (!reqDocs || reqDocs.length === 0) return;
    
    if (!confirm(`表示中の未承認申請（計 ${reqDocs.length} 件）をすべて一括承認して、勤務記録へ反映させますか？`)) return;

    let successCount = 0;
    let failCount = 0;

    for (const reqDoc of reqDocs) {
        try {
            const requestData = typeof reqDoc.data === "function" ? reqDoc.data() : (reqDoc.data || reqDoc);

            const response = await fetch(`${WORKER_URL}/approve-request`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    requestId: reqDoc.id,
                    requestData: requestData, // 💡 一括承認時にも requestData を追加
                    adminId: currentAdminId,
                    adminName: currentAdminName
                })
            });
            if (response.ok) successCount++;
            else failCount++;
        } catch (error) {
            console.error("Bulk approval error:", error);
            failCount++;
        }
    }

    if (failCount === 0) {
        alert(`${successCount} 件の申請を一括承認しました。`);
    } else {
        alert(`一括承認処理が完了しました。\n成功: ${successCount} 件 / 失敗: ${failCount} 件`);
    }

    document.getElementById("close-timeline-modal")?.click();

    if (typeof window.refreshApprovalList === "function") {
        window.refreshApprovalList();
    }
}

// 一括却下処理
export async function handleBulkRejectRequest(reqDocs) {
    if (!reqDocs || reqDocs.length === 0) return;

    const reason = prompt(`表示中の未承認申請（計 ${reqDocs.length} 件）を一括却下しますか？\n却下理由を入力してください（空欄のままでも却下可能です。キャンセルで中断します）:`);

    if (reason === null) return;

    let successCount = 0;
    let failCount = 0;

    for (const reqDoc of reqDocs) {
        try {
            const response = await fetch(`${WORKER_URL}/reject-request`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    requestId: reqDoc.id,
                    adminId: currentAdminId,
                    adminName: currentAdminName,
                    rejectReason: reason.trim()
                })
            });
            if (response.ok) successCount++;
            else failCount++;
        } catch (error) {
            console.error("Bulk reject error:", error);
            failCount++;
        }
    }

    if (failCount === 0) {
        alert(`${successCount} 件の申請を一括却下しました。`);
    } else {
        alert(`一括却下処理が完了しました。\n成功: ${successCount} 件 / 失敗: ${failCount} 件`);
    }

    document.getElementById("close-timeline-modal")?.click();

    if (typeof window.refreshApprovalList === "function") {
        window.refreshApprovalList();
    }
}
