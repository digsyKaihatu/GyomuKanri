// js/components/modal/templates/goalModalTemplate.js
export const goalModalTemplate = `
<div id="goal-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center hidden z-50 p-4">
    <div class="bg-white p-6 md:p-8 rounded-xl shadow-lg max-w-md w-full">
    <h2 id="goal-modal-title" class="text-xl font-bold mb-6 text-center text-gray-700">工数の追加・編集</h2>
    <form id="goal-modal-form" class="space-y-4">
        <input type="hidden" id="goal-modal-task-name"/>
        <input type="hidden" id="goal-modal-goal-id"/>
        <div>
        <label for="goal-modal-title-input" class="block text-sm font-medium text-gray-700">工数タイトル <span class="text-red-500">*</span></label>
        <input type="text" id="goal-modal-title-input" required class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"/>
        </div>
        <div>
        <label for="goal-modal-target-input" class="block text-sm font-medium text-gray-700">目標値 (件数など) <span class="text-red-500">*</span></label>
        <input type="number" id="goal-modal-target-input" min="0" required class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"/>
        </div>
        <div>
        <label for="goal-modal-deadline-input" class="block text-sm font-medium text-gray-700">納期 (任意)</label>
        <input type="date" id="goal-modal-deadline-input" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"/>
        </div>
        <div>
        <label for="goal-modal-effort-deadline-input" class="block text-sm font-medium text-gray-700">工数納期 (任意)</label>
        <input type="date" id="goal-modal-effort-deadline-input" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"/>
        </div>
        <div>
        <label for="goal-modal-memo-input" class="block text-sm font-medium text-gray-700">メモ (任意)</label>
        <textarea id="goal-modal-memo-input" rows="3" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"></textarea>
        </div>
    </form>
    <div class="flex justify-end gap-4 mt-6">
        <button id="goal-modal-cancel-btn" type="button" class="bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-lg hover:bg-gray-400 transition">キャンセル</button>
        <button id="goal-modal-save-btn" type="button" class="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition">保存</button>
    </div>
    </div>
</div>
`;
