// js/views/templates/archiveViewTemplate.js

export const archiveViewTemplate = `
<div id="archive-view" class="view">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-3xl font-bold text-gray-700">
        完了済み工数アーカイブ
      </h1>
      <button
        id="back-to-progress-from-archive"
        class="bg-gray-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-600 transition"
      >
        戻る
      </button>
    </div>
    <div class="flex flex-col gap-6">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="md:col-span-1 bg-white p-4 rounded-xl shadow-lg">
          <h3 class="font-bold text-lg mb-2 text-gray-700">業務選択</h3>
          <div
            id="archive-task-list"
            class="space-y-1 h-48 overflow-y-auto custom-scrollbar pr-2"
          >
            <p class="text-gray-500 p-2">読み込み中...</p>
          </div>
        </div>
        <div class="md:col-span-2 bg-white p-4 rounded-xl shadow-lg">
          <h3 class="font-bold text-lg mb-2 text-gray-700">完了済み工数選択</h3>
          <div
            id="archive-goal-list"
            class="space-y-1 h-48 overflow-y-auto custom-scrollbar pr-2"
          >
            <p class="text-gray-500 p-2">業務を選択してください</p>
          </div>
        </div>
      </div>
      <div
        id="archive-goal-details-container"
        class="bg-white p-6 rounded-xl shadow-lg hidden"
      >
        </div>
      <div
        id="archive-chart-container"
        class="bg-white p-6 rounded-xl shadow-lg hidden"
      >
        </div>
      <div
        id="archive-weekly-summary-container"
        class="bg-white p-6 rounded-xl shadow-lg hidden"
      >
        </div>
    </div>
  </div>
`;
