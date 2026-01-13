// js/domInjector.js
import { approvalViewTemplate } from './views/templates/approvalViewTemplate.js';
import { modeSelectionTemplate } from './views/templates/modeSelectionTemplate.js';
import { taskSettingsTemplate } from './views/templates/taskSettingsTemplate.js';
import { hostViewTemplate } from './views/templates/hostViewTemplate.js';
import { progressViewTemplate } from './views/templates/progressViewTemplate.js';
import { archiveViewTemplate } from './views/templates/archiveViewTemplate.js';
import { reportViewTemplate } from './views/templates/reportViewTemplate.js';
import { personalDetailViewTemplate } from './views/templates/personalDetailViewTemplate.js';
import { clientViewTemplate } from './views/templates/clientViewTemplate.js';
import { confirmationModalTemplate } from './components/modal/templates/confirmationModalTemplate.js';
import { editLogModalTemplate } from './components/modal/templates/editLogModalTemplate.js';
import { fixCheckoutModalTemplate } from './components/modal/templates/fixCheckoutModalTemplate.js';
import { editMemoModalTemplate } from './components/modal/templates/editMemoModalTemplate.js';
import { goalDetailsModalTemplate } from './components/modal/templates/goalDetailsModalTemplate.js';
import { goalModalTemplate } from './components/modal/templates/goalModalTemplate.js';
import { exportExcelModalTemplate } from './components/modal/templates/exportExcelModalTemplate.js';
import { helpModalTemplate } from './components/modal/templates/helpModalTemplate.js';
import { editContributionModalTemplate } from './components/modal/templates/editContributionModalTemplate.js';
import { breakReservationModalTemplate } from './components/modal/templates/breakReservationModalTemplate.js';
import { addUserModalTemplate } from './components/modal/templates/addUserModalTemplate.js';
import { adminPasswordViewTemplate } from './components/modal/templates/adminPasswordViewTemplate.js';

// This array will hold all the imported HTML templates.
const allTemplates = [
    approvalViewTemplate,
    modeSelectionTemplate,
    taskSettingsTemplate,
    hostViewTemplate,
    progressViewTemplate,
    archiveViewTemplate,
    reportViewTemplate,
    personalDetailViewTemplate,
    clientViewTemplate,
    confirmationModalTemplate,
    editLogModalTemplate,
    fixCheckoutModalTemplate,
    editMemoModalTemplate,
    goalDetailsModalTemplate,
    goalModalTemplate,
    exportExcelModalTemplate,
    helpModalTemplate,
    editContributionModalTemplate,
    breakReservationModalTemplate,
    addUserModalTemplate,
    adminPasswordViewTemplate
];

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
