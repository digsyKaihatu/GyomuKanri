// js/domInjector.js
import { approvalViewTemplate } from './views/templates/approvalViewTemplate.js';

// This array will hold all the imported HTML templates.
const allTemplates = [approvalViewTemplate];

/**
 * Injects all the HTML templates into the main app container.
 * This function should be called once when the application initializes.
 */
export function injectAllTemplates() {
    const appContainer = document.getElementById('app-container');
    if (!appContainer) {
        console.error('Fatal Error: The #app-container element was not found in the DOM.');
        return;
    }

    // Join all template strings and insert them at the end of the container,
    // without overwriting existing content.
    appContainer.insertAdjacentHTML('beforeend', allTemplates.join(''));
    console.log(`${allTemplates.length} templates have been injected into the DOM.`);
    // Add a signal attribute to the body to indicate that the injection is complete.
    document.body.dataset.templatesInjected = 'true';
}
