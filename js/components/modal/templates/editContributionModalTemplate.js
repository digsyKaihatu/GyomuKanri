// js/components/modal/templates/editContributionModalTemplate.js
export const editContributionModalTemplate = `
<div id="edit-contribution-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center hidden z-50 p-4">
    <div class="bg-white p-6 md:p-8 rounded-xl shadow-lg max-w-sm w-full">
    <h2 class="text-xl font-bold mb-4 text-center text-gray-700">貢献件数の修正</h2>
    <p id="edit-contribution-title" class="text-center text-gray-600 mb-4 text-sm"></p>
    <div>
        <label for="edit-contribution-input" class="block text-sm font-medium text-gray-700">その日の新しい合計件数</label>
        <input type="number" id="edit-contribution-input" min="0" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"/>
    </div>
    <p id="edit-contribution-error" class="text-red-500 text-sm h-4 mt-2"></p>
    <div class="flex justify-end gap-4 mt-6">
        <button id="edit-contribution-cancel-btn" class="bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-lg hover:bg-gray-400 transition">キャンセル</button>
        <button id="edit-contribution-save-btn" class="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition">保存</button>
    </div>
    </div>
</div>
`;
