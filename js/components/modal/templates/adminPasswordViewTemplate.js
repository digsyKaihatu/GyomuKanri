// js/components/modal/templates/adminPasswordViewTemplate.js
export const adminPasswordViewTemplate = `
<div id="admin-password-view" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center hidden z-50 p-4">
    <div class="bg-white p-6 md:p-8 rounded-xl shadow-lg max-w-sm w-full">
    <h2 class="text-xl font-bold mb-4 text-center text-gray-700">管理者認証</h2>
    <p class="text-sm text-gray-500 mb-4 text-center">この機能にアクセスするにはパスワードが必要です。</p>
    <div class="mb-4">
        <label for="admin-password-input" class="sr-only">パスワード</label>
        <input type="password" id="admin-password-input" class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" placeholder="パスワードを入力"/>
    </div>
    <p id="admin-password-error" class="text-red-500 text-sm h-4 mb-2 text-center"></p>
    <div class="flex justify-end gap-4 mt-2">
        <button id="admin-password-cancel-btn" class="bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-lg hover:bg-gray-400 transition">キャンセル</button>
        <button id="admin-password-submit-btn" class="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition">認証</button>
    </div>
    </div>
</div>
`;
