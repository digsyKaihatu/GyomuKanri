// js/views/host/approval/approvalActions.js
import { userId as currentAdminId, userName as currentAdminName } from "../../../main.js";
import { WORKER_URL } from "../../client/timerState.js"; // 💡既存のWorkerURLの定義元からインポート

export async function handleApprove(reqDoc) {
    if (!confirm("この申請を承認して、実際の勤務ログへ反映させますか？")) return;

    try {
        const response = await fetch(`${WORKER_URL}/approve-request`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                requestId: reqDoc.id,
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
        
        if (typeof window.refreshApprovalList === "function") {
            window.refreshApprovalList();
        }

    } catch (error) {
        console.error("Approval error:", error);
        alert(`承認処理中にエラーが発生しました:\n${error.message}`);
    }
}

// 💡 却下理由の入力を追加した却下処理
export async function handleRejectRequest(reqDoc) {
    // 1. confirm の代わりに prompt を使用して、理由入力を促す
    const reason = prompt("この申請を却下しますか？\n却下理由を入力してください（空欄のままでも却下可能です。キャンセルで中断します）:");

    // prompt で「キャンセル」が押された場合は null が返るので処理を終了する
    if (reason === null) return; 

    try {
        const response = await fetch(`${WORKER_URL}/reject-request`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                requestId: reqDoc.id,
                adminId: currentAdminId,
                adminName: currentAdminName,
                rejectReason: reason.trim() // 💡 却下理由を追加（前後の不要な空白を削除）
            })
        });

        const result = await response.json();
        
        if (!response.ok) {
            const errorMsg = result.error || result.message || "サーバー側での却下処理に失敗しました。";
            throw new Error(`${errorMsg}\n\n[詳細スタック]: ${result.stack || 'なし'}`);
        }

        alert("申請を却下しました。申請履歴にログが保持されます。");

        // 💡 承認時と同様、却下後にリストを最新状態にするために追加
        if (typeof window.refreshApprovalList === "function") {
            window.refreshApprovalList();
        }
    } catch (error) {
        console.error("Reject error:", error);
        alert(`却下処理中にエラーが発生しました:\n${error.message}`);
    }
}

// 💡 一括承認処理を追加
export async function handleBulkApprove(reqDocs) {
    if (!reqDocs || reqDocs.length === 0) return;
    
    if (!confirm(`表示中の未承認申請（計 ${reqDocs.length} 件）をすべて一括承認して、勤務記録へ反映させますか？`)) return;

    let successCount = 0;
    let failCount = 0;

    for (const reqDoc of reqDocs) {
        try {
            const response = await fetch(`${WORKER_URL}/approve-request`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    requestId: reqDoc.id,
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

    if (typeof window.refreshApprovalList === "function") {
        window.refreshApprovalList();
    }
}

// 💡 一括却下処理を追加（却下理由の入力対応）
export async function handleBulkRejectRequest(reqDocs) {
    if (!reqDocs || reqDocs.length === 0) return;

    const reason = prompt(`表示中の未承認申請（計 ${reqDocs.length} 件）を一括却下しますか？\n却下理由を入力してください（空欄のままでも却下可能です。キャンセルで中断します）:`);

    if (reason === null) return; // キャンセルされた場合

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

    if (typeof window.refreshApprovalList === "function") {
        window.refreshApprovalList();
    }
}
