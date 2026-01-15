// js/components/modal/templates/fixCheckoutModalTemplate.js
export const fixCheckoutModalTemplate = `
<div id="fix-checkout-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center hidden z-50 p-4">
    <div class="bg-white p-6 md:p-8 rounded-xl shadow-lg max-w-md w-full">
    <h2 class="text-xl font-bold mb-4 text-center text-gray-700">退勤忘れ修正</h2>
    <p class="text-sm text-gray-600 mb-4">修正したい日付と、その日の正しい退勤時刻を入力してください。入力した時刻でその日の最後の業務が終了され、それ以降の記録は削除されます。</p>
    <div class="space-y-4">
        <div>
        <label for="fix-checkout-date-input" class="block text-sm font-medium text-gray-700">修正する日付</label>
        <input type="date" id="fix-checkout-date-input" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"/>
        </div>
        <div>
        <label for="fix-checkout-time-input" class="block text-sm font-medium text-gray-700">退勤時刻</label>
        <input type="time" id="fix-checkout-time-input" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"/>
        </div>
    </div>
    <p id="fix-checkout-error" class="text-red-500 text-sm h-4 mt-2"></p>
    <div class="flex justify-end gap-4 mt-6">
        <button id="fix-checkout-cancel-btn" class="bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-lg hover:bg-gray-400 transition">キャンセル</button>
        <button id="fix-checkout-save-btn" class="bg-orange-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-orange-600 transition">修正</button>
    </div>
    </div>
</div>
`;
