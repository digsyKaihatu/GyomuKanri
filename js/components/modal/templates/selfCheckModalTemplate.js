// js/components/modal/templates/selfCheckModalTemplate.js
export const selfCheckModalTemplate = `
<div id="self-check-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center hidden z-50 p-4">
    <div class="bg-white p-6 md:p-8 rounded-xl shadow-lg max-w-7xl w-full h-[85vh] flex flex-col">
        <div class="flex justify-between items-center mb-4">
            <h2 class="text-2xl font-bold text-gray-700">セルフチェック</h2>
            <button id="self-check-cancel-btn" class="text-gray-500 hover:text-gray-800 text-3xl font-bold leading-none">&times;</button>
        </div>
        <div class="flex-grow w-full rounded border border-gray-200 overflow-hidden relative">
            <iframe 
                src="https://docs.google.com/forms/d/e/1FAIpQLSdG1CXiaC2DJ2VjY2emTMDGyu0oN5osm8J9ZpFhHUHwu1a0Mw/viewform?embedded=true" 
                class="absolute inset-0 w-full h-full block" 
                frameborder="0" 
                marginheight="0" 
                marginwidth="0">
                読み込んでいます…
            </iframe>
        </div>
    </div>
</div>
`;
