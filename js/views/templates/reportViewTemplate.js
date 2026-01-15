// js/views/templates/reportViewTemplate.js

export const reportViewTemplate = `
<div id="report-view" class="view">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-3xl font-bold text-gray-700">業務レポート</h1>
      <button
        id="back-to-host-from-report"
        class="bg-gray-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-600 transition"
      >
        戻る
      </button>
    </div>
    <div class="flex flex-col gap-8">
      <div class="bg-white p-6 rounded-xl shadow-lg">
        <div
          id="report-calendar-header"
          class="flex justify-between items-center mb-4"
        >
          <button
            id="report-prev-month-btn"
            class="p-2 rounded-full hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          >
            &lt;
          </button>
          <h2
            id="report-calendar-month-year"
            class="text-xl font-bold cursor-pointer hover:text-blue-600"
            title="クリックして月次集計を表示"
          ></h2>
          <button
            id="report-next-month-btn"
            class="p-2 rounded-full hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          >
            &gt;
          </button>
        </div>
        <div class="overflow-x-auto">
          <table id="report-calendar" class="calendar min-w-full">
              </table>
        </div>
      </div>
      <div class="bg-white p-6 rounded-xl shadow-lg">
        <h2
          id="report-title"
          class="text-2xl font-bold mb-4 text-center text-gray-700"
        ></h2>
        <div
          id="report-charts-container"
          class="grid grid-cols-1 lg:grid-cols-2 gap-6"
        >
          <p class="text-gray-500 lg:col-span-2 text-center">カレンダーで日付または月を選択してください。</p>
        </div>
      </div>
    </div>
  </div>
`;
