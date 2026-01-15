// js/components/modal/templates/editLogModalTemplate.js
export const editLogModalTemplate = `
<div id="edit-log-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center hidden z-50 p-4">
    <div class="bg-white p-6 md:p-8 rounded-xl shadow-lg max-w-sm w-full">
    <h2 class="text-xl font-bold mb-4 text-center text-gray-700">勤務時間修正</h2>
    <p id="edit-log-task-name" class="text-center text-gray-600 mb-4"></p>
    <div class="flex items-center justify-center gap-2">
        <input type="number" id="edit-hours-input" min="0" class="w-20 p-2 border border-gray-300 rounded-md text-center focus:ring-indigo-500 focus:border-indigo-500" placeholder="時間"/>
        <span class="text-gray-700">時間</span>
        <input type="number" id="edit-minutes-input" min="0" max="59" class="w-20 p-2 border border-gray-300 rounded-md text-center focus:ring-indigo-500 focus:border-indigo-500" placeholder="分"/>
        <span class="text-gray-700">分</span>
    </div>
    <p id="edit-log-error" class="text-red-500 text-sm h-4 text-center mt-2"></p>
    <div class="flex justify-end gap-4 mt-6">
        <button id="edit-log-cancel-btn" class="bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-lg hover:bg-gray-400 transition">キャンセル</button>
        <button id="edit-log-save-btn" class="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition">保存</button>
    </div>
    </div>
</div>
`;
