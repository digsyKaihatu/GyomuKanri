// js/components/modal/templates/helpModalTemplate.js
export const helpModalTemplate = `
<div id="help-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center hidden z-50 p-4">
    <div class="bg-white p-6 md:p-8 rounded-xl shadow-lg max-w-5xl w-full">
    <div class="flex justify-between items-center mb-4">
        <h2 id="help-modal-title" class="text-2xl font-bold text-gray-700"></h2>
        <button id="help-modal-close-btn" class="text-gray-500 hover:text-gray-800 text-3xl font-bold leading-none">&times;</button>
    </div>
    <div id="help-modal-content" class="text-gray-700 space-y-3 max-h-[70vh] overflow-y-auto custom-scrollbar pr-2 text-sm leading-relaxed">
    </div>
    </div>
</div>
`;
