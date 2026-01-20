// js/views/templates/personalDetailViewTemplate.js

export const personalDetailViewTemplate = `
<div id="personal-detail-view" class="view">
    <div class="flex justify-between items-center mb-6">
      <h1
        id="personal-detail-title"
        class="text-3xl font-bold text-gray-700"
      ></h1>
      <button
        id="back-from-detail-btn"
        class="bg-gray-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-600 transition"
      >
        戻る
      </button>
    </div>
    <div class="grid grid-cols-1 lg:grid-cols-5 gap-8">
      <div class="lg:col-span-3 bg-white p-6 rounded-xl shadow-lg">
        <div
          id="calendar-header"
          class="flex justify-between items-center mb-4"
        >
          <button
            id="prev-month-btn"
            class="p-2 rounded-full hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          >
            &lt;
          </button>
          <h2
            id="calendar-month-year"
            class="text-xl font-bold cursor-pointer hover:text-blue-600"
            title="クリックして月次集計を表示"
          ></h2>
          <button
            id="next-month-btn"
            class="p-2 rounded-full hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          >
            &gt;
          </button>
        </div>
         <div class="overflow-x-auto">
            <table id="calendar" class="calendar min-w-full">
                </table>
        </div>
      </div>
      <div
        id="log-details-container"
        class="lg:col-span-2 bg-white p-6 rounded-xl shadow-lg max-h-[80vh] overflow-y-auto custom-scrollbar"
      >
        <h3 id="details-title" class="text-xl font-bold mb-4 border-b pb-2 text-gray-700 sticky top-0 bg-white">
          詳細
        </h3>
        <div id="details-content" class="space-y-4">
          <p class="text-gray-500">
            カレンダーの日付または月をクリックして詳細を表示します。
          </p>
        </div>
        <div id="delete-user-container" class="mt-6 border-t pt-6 sticky bottom-0 bg-white">
          <button
            id="delete-user-btn"
            class="w-full bg-red-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-red-700 transition"
          >
            このユーザーのプロフィールと全記録を削除
          </button>
           <p class="text-xs text-red-700 mt-2">
            注意: この操作は管理者のみ実行可能で、元に戻せません。
          </p>
        </div>
      </div>
    </div>
  </div>
`;
