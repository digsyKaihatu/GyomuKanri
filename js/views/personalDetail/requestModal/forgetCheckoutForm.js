// js/views/personalDetail/requestModal/forgetCheckoutForm.js

export function renderForgetCheckoutFormHTML(defaultDate) {
    return `
    <div class="grid grid-cols-3 gap-x-6 gap-y-4 w-full animate-fade-in">
        <div class="space-y-4">
            <div class="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 space-y-2">
                <span class="font-bold block text-sm text-red-900">⚠️ 退勤忘れの申請手順</span>
                <p>① 中央の「退勤忘れた日付」を選択します。</p>
                <p>② 「退勤した時間」に、本来業務を終了した時刻を入力してください。</p>
                <p>③ 右側のメモ欄に、退勤を忘れてしまった理由を記載して申請してください。</p>
            </div>
        </div>
        
        <div class="space-y-6 flex flex-col justify-center">
            <div>
                <label class="block text-sm font-bold text-gray-700">退勤忘れた日付</label>
                <input type="date" id="req-forget-date" value="${defaultDate}" class="mt-1 block w-full border border-gray-300 rounded-lg p-2 text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500">
            </div>
            <div>
                <label class="block text-sm font-bold text-gray-700">退勤した時間</label>
                <input type="time" id="req-forget-time" class="mt-1 block w-full border border-gray-300 rounded-lg p-3 text-lg font-bold bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500">
            </div>
        </div>
        
        <div class="space-y-4 flex flex-col">
            <div class="flex flex-col flex-grow">
                <label class="block text-sm font-bold text-gray-700">理由（自由記述）</label>
                <textarea id="req-forget-memo" class="mt-1 block w-full border border-gray-300 rounded-lg p-2 text-sm bg-white resize-none flex-grow min-h-[120px] focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" placeholder="退勤を忘れた状況など"></textarea>
            </div>
        </div>
    </div>`;
}

export function initForgetCheckoutForm() {
    const timeInput = document.getElementById("req-forget-time");
    if (timeInput && !timeInput.value) {
        timeInput.value = "18:00"; 
    }
}

export function getForgetCheckoutFormData() {
    const dateVal = document.getElementById("req-forget-date").value;
    const timeVal = document.getElementById("req-forget-time").value;
    const memoVal = document.getElementById("req-forget-memo").value.trim();

    if (!dateVal || !timeVal) {
        throw new Error("エラー：日付と退勤時間は必須入力です。");
    }

    return {
        requestDate: dateVal,
        data: {
            applicationType: "変更",          // 【要件】申請種別
            reasonCategory: "退勤忘れの修正",   // 【要件】理由（区分）
            task: "退勤忘れ修正",               // 【要件】案件名
            beforeStartTime: "",               // 【要件】修正前の時間
            beforeEndTime: "",
            afterStartTime: "",                // 【要件】修正後の時間
            afterEndTime: timeVal,
            timeDifference: "対象外",          // 【要件】差異
            count: 0,
            memo: memoVal                      // 【要件】理由（自由記述）
        }
    };
}
