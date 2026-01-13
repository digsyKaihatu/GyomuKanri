// js/views/templates/taskSettingsTemplate.js

export const taskSettingsTemplate = `
<div id="task-settings-view" class="view">
    <div class="bg-white p-8 rounded-xl shadow-lg max-w-2xl mx-auto">
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-2xl font-bold text-gray-700">業務内容の設定</h1>
        <div class="flex items-center gap-4">
          <button class="help-btn" data-help-for="taskSettings">
            <svg class="w-6 h-6 text-gray-400 hover:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          </button>
          <button
            id="view-progress-from-settings-btn"
            class="bg-cyan-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-cyan-700 transition"
          >
            業務進捗を確認
          </button>
          <button
            id="back-to-selection-from-settings"
            class="bg-gray-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-600 transition"
          >
            戻る
          </button>
        </div>
      </div>
      <div class="space-y-4">
        <div id="add-task-form" class="flex gap-2">
          <input
            type="text"
            id="new-task-input"
            placeholder="新しい業務名"
            class="flex-grow p-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
          />
          <button
            id="add-task-btn"
            class="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition"
          >
            追加
          </button>
        </div>
        <div id="task-list-editor" class="space-y-3">
            <p class="text-gray-500">業務リストを読み込み中...</p>
        </div>
      </div>
    </div>
  </div>
`;
