// js/components/modal/templates/breakReservationModalTemplate.js
export const breakReservationModalTemplate = `
<div id="break-reservation-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center hidden z-50 p-4">
    <div class="bg-white p-6 md:p-8 rounded-xl shadow-lg max-w-sm w-full">
    <h2 id="break-reservation-modal-title" class="text-xl font-bold mb-4 text-center text-gray-700">休憩予約</h2>
    <input type="hidden" id="break-reservation-id"/>
    <div>
        <label for="break-reservation-time-input" class="block text-sm font-medium text-gray-700">休憩開始時刻</label>
        <input type="time" id="break-reservation-time-input" required class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"/>
    </div>
    <div class="flex justify-end gap-4 mt-6">
        <button id="break-reservation-cancel-btn" type="button" class="bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-lg hover:bg-gray-400 transition">キャンセル</button>
        <button id="break-reservation-save-btn" type="button" class="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition">保存</button>
    </div>
    </div>
</div>
`;
