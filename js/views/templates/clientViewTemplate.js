// js/views/templates/clientViewTemplate.js

export const clientViewTemplate = `
<div id="client-view" class="view">
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div class="bg-white p-6 md:p-8 rounded-xl shadow-lg flex flex-col">
        <div class="flex justify-between items-center mb-6">
          <h1 class="text-2xl font-bold text-gray-700">従業員</h1>
          <div class="flex items-center gap-4">
            <button class="help-btn" data-help-for="client">
              <svg class="w-6 h-6 text-gray-400 hover:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            </button>
            <button
              id="back-to-selection-client"
              class="bg-gray-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-600 transition"
            >
              戻る
            </button>
          </div>
        </div>
        <div
          id="tomura-status-display"
          class="p-3 rounded-lg mb-6 text-center text-sm"
        >
          <span class="font-semibold">戸村さんの状況: </span>
          <span id="tomura-status-text" class="font-bold">読み込み中...</span>
        </div>
        <div class="mb-4">
          <label for="task-select" class="block text-sm font-medium text-gray-700 mb-1">業務内容</label>
          <select id="task-select" class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white">
              <option value="">業務を選択...</option>
          </select>
        </div>
        <div id="other-task-container" class="hidden mb-4">
           <label for="other-task-input" class="block text-sm font-medium text-gray-700 mb-1">具体的な業務内容</label>
          <input
            type="text"
            id="other-task-input"
            class="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            placeholder="具体的な業務内容を入力"
          />
        </div>
        <div id="goal-select-container" class="mb-4 hidden">
          <label for="goal-select" class="block text-sm font-medium text-gray-700 mb-1">工数</label>
          <select id="goal-select" class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white">
              <option value="">工数を選択 (任意)</option>
          </select>
        </div>
        <div class="mb-4">
          <label for="task-memo-input" class="block text-sm font-medium text-gray-700 mb-1">メモ (任意)</label>
          <textarea id="task-memo-input" rows="2" class="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500" placeholder="業務に関するメモ"></textarea>
        </div>
        <div id="task-description-display" class="mb-4 hidden"></div>

        <div class="mb-6 text-center">
          <div class="text-4xl md:text-5xl font-mono bg-gray-100 p-4 rounded-lg tabular-nums" id="timer-display">
            00:00:00
          </div>
          <p class="text-sm text-gray-500 mt-2">
            現在の業務:
            <span id="current-task-display" class="font-semibold">未開始</span>
          </p>
          <p id="change-warning-message" class="text-orange-600 font-bold text-sm text-center hidden h-6 mt-2">
            変更が確定されていません
          </p>
        </div>

        <div id="colleagues-on-task-container" class="mb-6 hidden">
          <h3 class="text-base font-semibold text-gray-700 mb-2 border-t pt-4">
            同じ業務中の従業員
          </h3>
          <ul id="colleagues-list" class="space-y-2 max-h-24 overflow-y-auto custom-scrollbar pr-2"></ul>
        </div>

        <div class="grid grid-cols-2 gap-4 mt-auto pt-4 border-t">
          <button id="start-btn" class="w-full bg-green-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-700 transition shadow-sm disabled:opacity-50">
            業務開始
          </button>
          <button id="stop-btn" class="w-full bg-red-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-red-700 transition shadow-sm disabled:opacity-50">
            帰宅
          </button>
        </div>
        <div class="mt-3">
           <button id="break-btn" class="w-full bg-yellow-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-yellow-600 transition shadow-sm disabled:opacity-50" disabled>
            休憩開始
          </button>
        </div>
      </div>

      <div class="bg-white p-6 md:p-8 rounded-xl shadow-lg flex flex-col gap-6">
        <div id="goal-progress-container" class="hidden"></div>

        <details class="group border rounded-lg overflow-hidden">
          <summary class="flex justify-between items-center font-medium cursor-pointer list-none p-4 bg-gray-50 hover:bg-gray-100">
            <span class="text-lg text-gray-700">予約設定</span>
            <span class="transition group-open:rotate-180">
              <svg fill="none" height="24" shape-rendering="geometricPrecision" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" viewBox="0 0 24 24" width="24"><path d="M6 9l6 6 6-6"></path></svg>
            </span>
          </summary>
          <div class="p-4 border-t space-y-4">
            <div>
              <h3 class="text-base font-semibold text-gray-700 text-center mb-2">休憩予約</h3>
              <div id="break-reservation-list" class="space-y-2">
                  <p class="text-center text-sm text-gray-500">読み込み中...</p>
              </div>
              <button id="add-break-reservation-btn" class="w-full mt-3 bg-sky-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-sky-700 transition text-sm">
                休憩予約を追加 +
              </button>
            </div>
            <div class="border-t pt-4">
              <h3 class="text-base font-semibold text-gray-700 text-center mb-2">帰宅予約</h3>
              <div id="stop-reservation-setter">
                <label for="stop-reservation-time-input" class="sr-only">帰宅予約時刻</label>
                <input type="time" id="stop-reservation-time-input" class="w-full p-2 border border-gray-300 rounded-lg"/>
                <button id="set-stop-reservation-btn" class="w-full mt-2 bg-sky-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-sky-700 transition text-sm">
                  帰宅予約を設定
                </button>
              </div>
              <div id="stop-reservation-status" class="hidden text-center">
                <p id="stop-reservation-status-text" class="p-3 bg-green-100 text-green-800 rounded-lg text-sm"></p>
                <button id="cancel-stop-reservation-btn" class="w-full mt-2 bg-gray-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-gray-600 transition text-sm">
                  予約取消
                </button>
              </div>
            </div>
          </div>
        </details>

        <details class="group border rounded-lg overflow-hidden">
          <summary class="flex justify-between items-center font-medium cursor-pointer list-none p-4 bg-gray-50 hover:bg-gray-100">
            <span class="text-lg text-gray-700">表示設定</span>
             <span class="text-xs text-gray-500 mr-auto ml-2">(業務ドロップダウン)</span>
            <span class="transition group-open:rotate-180">
              <svg fill="none" height="24" shape-rendering="geometricPrecision" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" viewBox="0 0 24 24" width="24"><path d="M6 9l6 6 6-6"></path></svg>
            </span>
          </summary>
          
          <div class="p-4 border-t space-y-1">
            <label for="notification-interval-input" class="block text-sm font-medium text-gray-700">お褒め通知 (同じ業務の継続)</label>
            <div class="flex items-center gap-2">
                <input 
                    type="number" 
                    id="notification-interval-input" 
                    class="w-24 p-2 border border-gray-300 rounded-lg"
                    min="0" 
                    placeholder="例: 10"
                >
                <span class="text-sm text-gray-600">分ごと (0で通知しない)</span>
            </div>
          </div>
          <div id="task-display-settings-list" class="p-4 border-t space-y-1 max-h-48 overflow-y-auto custom-scrollbar pr-2">
            <p class="text-sm text-gray-500">読み込み中...</p>
          </div>
        </details>

         <div class="flex flex-col gap-3 pt-6 border-t mt-auto">
          <button id="my-records-btn" class="w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700 transition shadow-sm">
            個人記録ページへ
          </button>
          <button id="view-my-progress-btn" class="w-full bg-cyan-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-cyan-700 transition shadow-sm">
            業務進捗を確認 (読取専用)
          </button>
          <button id="fix-yesterday-checkout-btn" class="w-full bg-orange-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-orange-600 transition shadow-sm">
            退勤忘れを修正
          </button>
        </div>
      </div>
    </div>
  </div>
`;
