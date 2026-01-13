// js/components/modal/templates/addUserModalTemplate.js
export const addUserModalTemplate = `
<div id="add-user-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center hidden z-50 p-4">
    <div class="bg-white p-6 md:p-8 rounded-xl shadow-lg max-w-sm w-full">
    <h2 class="text-xl font-bold mb-6 text-center text-gray-700">新規ユーザーの追加</h2>
    <form id="add-user-modal-form" class="space-y-4">
        <div>
        <label for="add-user-modal-name-input" class="block text-sm font-medium text-gray-700">ユーザー名 <span class="text-red-500">*</span></label>
        <input type="text" id="add-user-modal-name-input" required class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" placeholder="山田太郎 (空白不可)"/>
        </div>
        <p id="add-user-modal-error" class="text-red-500 text-sm h-4"></p>
    </form>
    <div class="flex justify-end gap-4 mt-6">
        <button id="add-user-modal-cancel-btn" type="button" class="bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-lg hover:bg-gray-400 transition whitespace-nowrap">キャンセル</button>
        <button id="add-user-modal-save-btn" type="button" class="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition whitespace-nowrap">保存</button>
    </div>
    </div>
</div>
`;
