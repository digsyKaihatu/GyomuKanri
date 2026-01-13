// js/components/modal/templates/exportExcelModalTemplate.js
export const exportExcelModalTemplate = `
<div id="export-excel-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center hidden z-50 p-4">
    <div class="bg-white p-6 md:p-8 rounded-xl shadow-lg max-w-sm w-full">
    <h2 class="text-xl font-bold mb-6 text-center text-gray-700">Excel出力</h2>
    <div class="space-y-4">
        <div>
        <label for="export-year-select" class="block text-sm font-medium text-gray-700">年</label>
        <select id="export-year-select" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"></select>
        </div>
        <div>
        <label for="export-month-select" class="block text-sm font-medium text-gray-700">月</label>
        <select id="export-month-select" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"></select>
        </div>
    </div>
    <div class="flex justify-end gap-4 mt-6">
        <button id="cancel-export-excel-btn" class="bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-lg hover:bg-gray-400 transition">キャンセル</button>
        <button id="confirm-export-excel-btn" class="bg-teal-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-teal-700 transition">出力</button>
    </div>
    </div>
</div>
`;
