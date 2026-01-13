// js/views/templates/progressViewTemplate.js

export const progressViewTemplate = `
<div id="progress-view" class="view">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-3xl font-bold text-gray-700">業務進捗</h1>
      <div class="flex items-center gap-4">
        <button class="help-btn" data-help-for="progress">
          <svg class="w-6 h-6 text-gray-400 hover:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        </button>
        <button
          id="view-archive-btn"
          class="bg-gray-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-700 transition"
        >
          完了した工数を見る
        </button>
        <button
          id="back-to-previous-view-from-progress"
          class="bg-gray-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-600 transition"
        >
          戻る
        </button>
      </div>
    </div>
    <div class="flex flex-col gap-6">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="md:col-span-1 bg-white p-4 rounded-xl shadow-lg">
          <h3 class="font-bold text-lg mb-2 text-gray-700">業務選択</h3>
          <div
            id="progress-task-list"
            class="space-y-1 h-48 overflow-y-auto custom-scrollbar pr-2"
          >
            <p class="text-gray-500 p-2">読み込み中...</p>
          </div>
        </div>
        <div class="md:col-span-2 bg-white p-4 rounded-xl shadow-lg">
          <h3 class="font-bold text-lg mb-2 text-gray-700">工数選択</h3>
          <div
            id="progress-goal-list"
            class="space-y-1 h-48 overflow-y-auto custom-scrollbar pr-2"
          >
            <p class="text-gray-500 p-2">業務を選択してください</p>
          </div>
        </div>
      </div>
      <div
        id="progress-goal-details-container"
        class="bg-white p-6 rounded-xl shadow-lg hidden"
      >
        </div>
      <div
        id="progress-chart-container"
        class="bg-white p-6 rounded-xl shadow-lg hidden"
      >
          </div>
      <div
        id="progress-weekly-summary-container"
        class="bg-white p-6 rounded-xl shadow-lg hidden"
      >
        </div>
    </div>
  </div>
`;
