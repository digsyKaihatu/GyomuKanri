// js/components/modal/templates/confirmationModalTemplate.js
export const confirmationModalTemplate = `
<div id="confirmation-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center hidden z-50 p-4">
    <div class="bg-white p-6 md:p-8 rounded-xl shadow-lg max-w-sm w-full text-center">
    <h2 class="text-xl font-bold mb-4 text-gray-700">確認</h2>
    <p id="modal-message" class="text-gray-600 mb-6 whitespace-pre-wrap"></p>
    <div class="flex justify-center gap-4">
        <button id="modal-cancel-btn" class="bg-gray-300 text-gray-800 font-bold py-2 px-6 rounded-lg hover:bg-gray-400 transition">キャンセル</button>
        <button id="modal-confirm-btn" class="bg-red-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-red-700 transition">実行</button>
    </div>
    </div>
</div>
`;
