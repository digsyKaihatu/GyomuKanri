// js/views/templates/hostViewTemplate.js

export const hostViewTemplate = `
<div id="host-view" class="view">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-3xl font-bold text-gray-700">
        管理者用ダッシュボード
      </h1>
      <div class="flex items-center gap-4">
        <button class="help-btn" data-help-for="host">
          <svg class="w-6 h-6 text-gray-400 hover:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        </button>
        <button
          id="back-to-selection-host"
          class="bg-gray-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-600 transition"
        >
          戻る
        </button>
      </div>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div class="bg-white p-6 rounded-xl shadow-lg">
        <h2 class="text-xl font-bold mb-4 border-b pb-2 text-gray-700">
          リアルタイム稼働状況
        </h2>
        <div
          id="task-summary-list"
          class="space-y-2 mb-4 border-b pb-4"
        >
            <p class="text-gray-500">読み込み中...</p>
        </div>
        <div id="status-list" class="space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
            <p class="text-gray-500">読み込み中...</p>
        </div>
      </div>
      <div class="bg-white p-6 rounded-xl shadow-lg">
        <div
          id="tomura-status-setter"
          class="space-y-2 mb-4 p-4 bg-gray-50 rounded-lg border"
        >
          <h4 class="font-medium text-gray-600">戸村さんステータス</h4>
          <div class="flex items-center gap-4 flex-wrap">
            <label class="flex items-center"
              ><input type="radio" name="tomura-status" value="声掛けOK" class="mr-1"/>声掛けOK</label>
            <label class="flex items-center"
              ><input type="radio" name="tomura-status" value="急用ならOK" class="mr-1"/>急用ならOK</label>
            <label class="flex items-center"
              ><input type="radio" name="tomura-status" value="声掛けNG" class="mr-1"/>声掛けNG</label>
          </div>
        </div>
        <div class="mb-6 border-t pt-6">
          <h3 class="text-lg font-semibold text-gray-700 mb-2">
            管理者操作
          </h3>
          <div class="space-y-3">
            <button
              id="export-excel-btn"
              class="w-full bg-teal-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-teal-700 transition shadow-sm"
            >
              稼働時間Excelを出力
            </button>
            <button
              id="view-progress-btn"
              class="w-full bg-cyan-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-cyan-700 transition shadow-sm"
            >
              業務進捗を確認
            </button>
            <button
              id="view-report-btn"
              class="w-full bg-purple-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-purple-700 transition shadow-sm"
            >
              業務レポートを表示
            </button>
          </div>
        </div>
        <div class="flex flex-col items-center gap-2 mb-4 border-t pt-6">
            <h2 class="text-xl font-bold text-gray-700">アカウントリスト</h2>
            </div>
        <div id="summary-list" class="space-y-3 max-h-[40vh] overflow-y-auto custom-scrollbar pr-2">
            <p class="text-gray-500">読み込み中...</p>
        </div>
        <div class="mt-6 border-t pt-6">
          <button
            id="delete-all-logs-btn"
            class="w-full bg-red-800 text-white font-bold py-3 px-4 rounded-lg hover:bg-red-900 transition shadow-sm"
          >
            全従業員の全業務記録を削除
          </button>
          <p class="text-xs text-red-700 mt-2">
            注意: 削除操作は元に戻せません。ユーザープロフィールは削除されません。
          </p>
        </div>
      </div>
    </div>
  </div>
`;
