/**
 * Main Entry Point for Financial App Flow
 */
import * as UI from './ui.js';
import * as Dashboard from './pages/dashboard.js';
import * as Analytics from './pages/analytics.js';
import * as Budgets from './pages/budgets.js';
import * as Accounts from './pages/accounts.js';
import * as Ledger from './pages/ledger.js';
import * as Strategy from './pages/strategy.js';
import * as Services from './pages/services.js';
import * as Gamification from './pages/gamification.js';
import * as Onboarding from './pages/onboarding.js';
import * as Translate from './translations.js';
import * as Store from './store.js';
import * as Utils from './utils.js';

// 1. Initialize UI Shell (Theme, Sidebar)
UI.initTheme();

document.addEventListener('DOMContentLoaded', () => {
    // Process recurring items before loading specific pages
    const processed = Store.processRecurring();
    if (processed) console.log("Financial App: Recurring transactions processed successfully.");

    // Restore sidebar state
    UI.restoreSidebarState();

    // 2. Initialize Page-Specific Logic
    Dashboard.init();
    Analytics.init();
    Budgets.init();
    Accounts.init();
    Ledger.init();
    Strategy.init();
    Services.init();
    Gamification.init();
    Onboarding.init();
    Translate.translateUI(Store.lang);
    window.FinancialApp.highlightActiveCurrency();
    window.FinancialApp.highlightActiveLanguage();

    // 3. Initialize Advanced Global Components
    UI.initAIAdvisor(Store, Utils);

    // 4. Connect Notification System
    Store.setNotificationCallback((title, msg, type) => {
        UI.showNotification(title, msg, type);
    });

    // Initial Budget Check
    Store.checkBudgets();
});

// 3. Export Global API for HTML Compatibility (Bridge)
const FinancialAppAPI = {
    // Shell Logic
    toggleSidebar: UI.toggleSidebar,
    toggleSidebarHide: UI.toggleSidebarHide,
    togglePrivateMode: UI.togglePrivateMode,
    toggleMobileMenu: UI.toggleMobileMenu,
    toggleTheme: () => UI.toggleTheme(() => {
        Dashboard.updateDashboardValues();
        if (Analytics && Analytics.init) Analytics.init();
    }),

    // Dashboard Actions
    editTransaction: Dashboard.editTransaction,
    removeTransaction: Dashboard.removeTransaction,
    payInstallment: Dashboard.payInstallment,
    handleSearch: Dashboard.handleSearch,
    confirmDelete: Dashboard.confirmDelete,
    closeDeleteModal: Dashboard.closeDeleteModal,
    setFilter: Dashboard.setFilter,
    setType: Dashboard.setType,
    exportToCSV: Dashboard.exportToCSV,
    toggleAccountDropdown: Dashboard.toggleAccountDropdown,
    selectAccount: Dashboard.selectAccount,
    openSavingsGoalModal: Dashboard.openSavingsGoalModal,
    closeSavingsGoalModal: Dashboard.closeSavingsGoalModal,
    openQuickAddModal: Dashboard.openQuickAddModal,
    closeQuickAddModal: Dashboard.closeQuickAddModal,
    submitQuickTransaction: Dashboard.submitQuickTransaction,
    toggleQuickAccountDropdown: Dashboard.toggleQuickAccountDropdown,
    addDebt: Dashboard.addDebt,
    handleReceiptPreview: Dashboard.handleReceiptPreview,
    viewReceipt: Dashboard.viewReceipt,
    closeReceiptModal: Dashboard.closeReceiptModal,
    removeCommitment: Dashboard.removeCommitment,
    triggerNewCommitment: Dashboard.triggerNewCommitment,
    editCommitment: Dashboard.editCommitment,
    closeCommitmentModal: Dashboard.closeCommitmentModal,
    toggleCommitAccountDropdown: Dashboard.toggleCommitAccountDropdown,
    openCommitmentDetails: Dashboard.openCommitmentDetails,
    closeCommitmentDetails: Dashboard.closeCommitmentDetails,
    handleInstallmentUpload: Dashboard.handleInstallmentUpload,
    submitInstallmentPayment: Dashboard.submitInstallmentPayment,
    simulateOCR: Dashboard.simulateOCR,

    // Budget Actions
    openBudgetModal: Budgets.openModal,
    closeBudgetModal: Budgets.closeModal,
    deleteBudget: Budgets.deleteBudget,

    // Analytics Actions
    exportToPDF: Analytics.exportToPDF,
    exportToExcel: Analytics.exportToExcel,
    handleAddInvestment: Analytics.handleAddInvestment,

    // Account Actions
    openAccountModal: Accounts.openModal,
    closeAccountModal: Accounts.closeModal,
    deleteAccount: Accounts.deleteAccount,
    confirmDeleteAccount: Accounts.confirmDeleteAccount,
    closeDeleteAccountModal: Accounts.closeDeleteAccountModal,

    // Ledger Actions
    filterTransactions: Ledger.filterTransactions,
    applyAISuggestion: Ledger.applyAISuggestion,
    exportLedgerToPDF: Ledger.exportToPDF,

    // Strategy Actions
    updateEF: Strategy.updateEF,
    calculateRetirement: Strategy.calculateRetirement,
    handleAddGoal: Strategy.handleAddGoal,
    removeGoal: Strategy.removeGoal,

    // Currency Support
    toggleCurrency: (c) => {
        Store.setCurrency(c);
        location.reload();
    },
    getCurrency: () => Store.currency,
    toggleLanguage: (l) => {
        Store.setLang(l);
        location.reload();
    },
    getLang: () => Store.lang,
    highlightActiveLanguage: () => {
        const l = Store.lang;
        ['EN', 'ID'].forEach(lang => {
            const btn = document.getElementById(`lang-${lang.toLowerCase()}`);
            if (btn) {
                if (lang.toLowerCase() === l) {
                    btn.classList.add('bg-primary/20', 'text-primary', 'border-primary/40');
                    btn.classList.remove('text-slate-400');
                } else {
                    btn.classList.remove('bg-primary/20', 'text-primary', 'border-primary/40');
                    btn.classList.add('text-slate-400');
                }
            }
        });
    },
    highlightActiveCurrency: () => {
        const c = Store.currency;
        ['IDR', 'USD', 'EUR'].forEach(curr => {
            const btn = document.getElementById(`curr-${curr.toLowerCase()}`);
            if (btn) {
                if (curr === c) {
                    btn.classList.add('bg-primary/20', 'text-primary', 'border-primary/40');
                    btn.classList.remove('text-slate-400');
                } else {
                    btn.classList.remove('bg-primary/20', 'text-primary', 'border-primary/40');
                    btn.classList.add('text-slate-400');
                }
            }
        });
    },

    nextTourStep: Onboarding.nextStep,
    skipTour: Onboarding.finishTour,

    // Backup & Restore
    handleBackupExport: () => {
        const data = Store.exportData();
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `financial_app_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    },
    handleBackupImport: (event) => {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const success = Store.importData(e.target.result);
            if (success) {
                alert("Backup restored successfully! Reloading...");
                window.location.reload();
            } else {
                alert("Failed to restore backup. Please ensure the file is valid.");
            }
        };
        reader.readAsText(file);
    }
};

// Explicitly attach to window
window.FinancialApp = FinancialAppAPI;
window.Store = Store; // For debugging and direct access if needed

console.log("Financial App: Advanced Financial Engine Started");

// 5. Register Service Worker for PWA Support
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('Service Worker Registered!', reg))
            .catch(err => console.log('Service Worker Registration Failed', err));
    });
}
