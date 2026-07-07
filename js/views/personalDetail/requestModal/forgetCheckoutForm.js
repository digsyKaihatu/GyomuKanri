// js/views/personalDetail/requestModal/forgetCheckoutForm.js

// ①「退勤忘れ」用のHTMLテンプレート
export function renderForgetCheckoutFormHTML(defaultDate) {
    return `
    <div class="grid grid-cols-3 gap-x-6 gap-y-4 w-full animate-fade-in">
        
        <div class="space-y-4">
            <div class="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 space-y-2">
                <span class="font-bold block text-sm text-red-900">⚠️ 退勤忘れの申請手順</span>
                <p>① 中央の「退勤忘れた日付」を選択します。</p>
                <p>② 「退勤した時間」に、本来業務を終了した時刻を入力してください。</p>
                <p>③ 右側のメモ欄に、退勤を忘れてしまった理由（例：急ぎの対応で失念した等）を記載して申請してください。</p>
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
                <label class="block text-sm font-bold text-gray-700">理由・メモ (任意)</label>
                <textarea id="req-forget-memo" class="mt-1 block w-full border border-gray-300 rounded-lg p-2 text-sm bg-white resize-none flex-grow min-h-[120px] focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" placeholder="退勤を忘れた理由など"></textarea>
            </div>
        </div>
        
    </div>`;
}

// ② 初期化ロジック (特別な連動がなければ空でOK)
export function initForgetCheckoutForm() {
    // 17:00などをデフォルトで入れておきたい場合はここで設定可能
    const timeInput = document.getElementById("req-forget-time");
    if (timeInput && !timeInput.value) {
        timeInput.value = "18:00"; 
    }
}

// ③ 送信データの抽出
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
            checkoutTime: timeVal, // 退勤した時間
            memo: memoVal
        }
    };
}
