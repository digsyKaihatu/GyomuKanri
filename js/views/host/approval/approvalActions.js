// js/views/host/approval/approvalActions.js
import { userId as currentAdminId, userName as currentAdminName } from "../../../main.js";
import { WORKER_URL } from "../../client/timerState.js"; // 💡既存のWorkerURLの定義元からインポート

export async function handleApprove(reqDoc) {
    if (!confirm("この申請を承認して、実際の勤務ログへ反映させますか？")) return;

    try {
        // 1. Workerのエンドポイントに対して、申請IDと管理者情報をPOSTする
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
            throw new Error(result.message || "サーバー側での承認処理に失敗しました。");
        }

        alert("申請を承認し、勤務記録への書き込みを完了しました。");
        
        // 💡必要に応じて、フロント側の画面（リスト）を再読み込み・更新する関数をここに呼ぶ
        if (typeof window.refreshApprovalList === "function") {
            window.refreshApprovalList();
        }

    } catch (error) {
        console.error("Approval error:", error);
        alert(`承認処理中にエラーが発生しました: ${error.message}`);
    }
}

export async function handleRejectRequest(reqDoc) {
    if (!confirm("この申請を却下しますか？")) return;

    try {
        // 却下処理も同様にWorkerへ逃がすとより安全・高速になります
        const response = await fetch(`${WORKER_URL}/reject-request`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                requestId: reqDoc.id,
                adminId: currentAdminId,
                adminName: currentAdminName
            })
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.message);

        alert("申請を却下しました。申請履歴にログが保持されます。");
    } catch (error) {
        console.error("Reject error:", error);
        alert(`却下処理中にエラーが発生しました: ${error.message}`);
    }
}
