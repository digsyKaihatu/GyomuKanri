// js/components/modal/templates/editMemoModalTemplate.js
export const editMemoModalTemplate = `
<div id="edit-memo-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center hidden z-50 p-4">
    <div class="bg-white p-6 md:p-8 rounded-xl shadow-lg max-w-md w-full">
    <h2 class="text-xl font-bold mb-4 text-center text-gray-700">メモの編集</h2>
    <div>
        <label for="edit-memo-textarea" class="sr-only">メモ内容</label>
        <textarea id="edit-memo-textarea" rows="4" class="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"></textarea>
    </div>
    <div class="flex justify-end gap-4 mt-4">
        <button id="edit-memo-cancel-btn" class="bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-lg hover:bg-gray-400 transition">キャンセル</button>
        <button id="edit-memo-save-btn" class="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition">保存</button>
    </div>
    </div>
</div>
`;
