// js/views/templates/approvalViewTemplate.js

export const approvalViewTemplate = `
<div id="approval-view" class="view p-6 max-w-5xl mx-auto hidden">
    <div class="flex items-center justify-between mb-6">
        <h2 class="text-2xl font-bold text-gray-800">業務時間追加・変更承認</h2>
        <button id="back-from-approval" class="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded shadow">
            戻る
        </button>
    </div>
    <div id="approval-list-content" class="space-y-4"></div>
</div>
`;
