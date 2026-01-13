// js/views/templates/modeSelectionTemplate.js

export const modeSelectionTemplate = `
<div id="mode-selection-view" class="view">
    <div class="bg-white p-8 rounded-xl shadow-lg">
      <div class="flex justify-between items-start mb-8">
        <div>
          <h1 class="text-3xl font-bold mb-2 text-gray-700">ようこそ</h1>
          <p class="text-gray-500">
            ログインユーザー:
            <span id="user-name-display" class="font-mono bg-gray-200 px-2 py-1 rounded">読み込み中...</span>
          </p>
           <p class="text-gray-500 mt-2">使用するモードを選択してください</p>
        </div>
        <button
          id="logout-btn-selection"
          class="bg-gray-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-600 transition duration-300"
        >
          ログアウト
        </button>
      </div>
      <div class="flex flex-col md:flex-row gap-4 justify-center">
        <button
          id="select-host-btn"
          class="bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700 transition duration-300 shadow-md"
        >
          管理者として使用
        </button>
        <button
          id="select-client-btn"
          class="bg-green-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-green-700 transition duration-300 shadow-md"
        >
          従業員として使用
        </button>
        <button
          id="task-settings-btn"
          class="bg-gray-700 text-white font-bold py-3 px-6 rounded-lg hover:bg-gray-800 transition duration-300 shadow-md"
        >
          業務内容を設定
        </button>
      </div>
      <div class="mt-8 text-center border-t pt-8">
        <label
          for="word-of-the-day-input"
          class="block text-sm font-medium text-gray-700 mb-2"
          >今日の一言</label
        >
        <div class="flex gap-2 max-w-md mx-auto">
          <input
            type="text"
            id="word-of-the-day-input"
            class="flex-grow p-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="今日の一言を入力"
          />
          <button
            id="save-word-btn"
            class="bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700 transition"
          >
            保存
          </button>
        </div>
      </div>
      </div>
  </div>
`;
