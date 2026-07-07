// js/views/personalDetail/requestModal/index.js
import { db, userId, userName } from "../../../main.js";
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// 子ファイルの読み込み
import { renderAddFormHTML, initAddForm, getAddFormData } from "./addForm.js";
import { renderTimeCorrectFormHTML, initTimeCorrectForm, getTimeCorrectFormData } from "./timeCorrectForm.js";
import { renderCountCorrectFormHTML, initCountCorrectForm, getCountCorrectFormData } from "./countCorrectForm.js"; // 追加

// ... (createUnifiedRequestModalHTML 等の中間コードは変更なし)

// 選択タイプによって各フォームを切り替える
function handleUnifiedTypeChange(event) {
    const selectedType = event.target.value;
    const formBody = document.getElementById("unified-req-form-body");
    const alternativeBody = document.getElementById("unified-alternative-body");
    const errorBar = document.getElementById("unified-req-error-bar");
    
    if (errorBar) errorBar.classList.add("hidden");
    formBody.innerHTML = "";
    formBody.classList.add("hidden");
    alternativeBody.classList.add("hidden");

    if (!selectedType) return;

    const defaultDate = document.getElementById("unified-req-date").value;

    if (selectedType === "add") {
        formBody.innerHTML = renderAddFormHTML(defaultDate);
        formBody.classList.remove("hidden");
        initAddForm();
    } else if (selectedType === "time_correct") {
        formBody.innerHTML = renderTimeCorrectFormHTML(defaultDate);
        formBody.classList.remove("hidden");
        initTimeCorrectForm();
    } else if (selectedType === "count_correct") { // 追加
        formBody.innerHTML = renderCountCorrectFormHTML(defaultDate);
        formBody.classList.remove("hidden");
        initCountCorrectForm();
    } else {
        alternativeBody.classList.remove("hidden");
        alternativeBody.textContent = `選択された申請タイプ [${selectedType}] のフォーマットは現在開発中です。`;
    }
}

// 送信の共通処理
async function handleRequestSubmit() {
    const type = document.getElementById("unified-req-type-select").value;
    const errorBar = document.getElementById("unified-req-error-bar");
    const errorEl = document.getElementById("unified-req-error");
    
    if (!errorBar || !errorEl) return;
    errorBar.classList.add("hidden");

    if (!type) {
        errorEl.textContent = "申請内容を選択してください。";
        errorBar.classList.remove("hidden");
        return;
    }

    let payload = null;
    try {
        if (type === "add") {
            payload = getAddFormData();
        } else if (type === "time_correct") {
            payload = getTimeCorrectFormData();
        } else if (type === "count_correct") { // 追加
            payload = getCountCorrectFormData();
        } else {
            throw new Error("現在、この申請タイプの送信ロジックは未実装です。");
        }

        const sendBtn = document.getElementById("unified-req-send-btn");
        sendBtn.disabled = true;
        sendBtn.textContent = "送信中...";

        // Firestoreへの保存
        await addDoc(collection(db, "work_log_requests"), {
            userId: userId,
            userName: userName,
            type: type,
            status: "pending",
            requestDate: payload.requestDate,
            targetLogId: payload.targetLogId || null,
            createdAt: new Date().toISOString(),
            data: payload.data
        });

        alert("申請を送信しました。管理者の承認をお待ちください。");
        closeUnifiedRequestModal();
    } catch (error) {
        errorEl.textContent = error.message || "申請の送信中にシステムエラーが発生しました。";
        errorBar.classList.remove("hidden");
    } finally {
        const sendBtn = document.getElementById("unified-req-send-btn");
        if (sendBtn) {
            sendBtn.disabled = false;
            sendBtn.textContent = "申請を送る";
        }
    }
}

// (以下、openUnifiedRequestModal等の関数は前回までと同じ)
