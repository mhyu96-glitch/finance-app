/**
 * Accounts Page Logic
 */
import * as Store from '../store.js';
import * as Utils from '../utils.js';

/**
 * Initialize Accounts Page
 */
export const init = () => {
    if (!document.getElementById('accounts-container')) return;
    render();
    initForm();
};

/**
 * Render Account Cards
 */
export const render = () => {
    const container = document.getElementById('accounts-container');
    const emptyState = document.getElementById('accounts-empty');
    if (!container) return;

    container.innerHTML = '';

    if (Store.accounts.length === 0) {
        container.classList.add('hidden');
        if (emptyState) emptyState.classList.remove('hidden');
        return;
    } else {
        container.classList.remove('hidden');
        if (emptyState) emptyState.classList.add('hidden');
    }

    Store.accounts.forEach((acc, index) => {
        let icon = 'account_balance';
        if (acc.type === 'Cash') icon = 'payments';
        if (acc.type === 'E-Wallet') icon = 'account_balance_wallet';
        if (acc.type === 'Credit Card') icon = 'credit_card';
        if (acc.type === 'Investment') icon = 'trending_up';

        const staggerClass = `stagger-${Math.min(6, (index % 6) + 1)}`;
        const card = document.createElement('div');
        card.className = `glass p-10 rounded-[2.5rem] border-black/5 dark:border-white/5 relative group overflow-hidden transition-all duration-700 hover:bg-slate-50/80 dark:hover:bg-white/[0.05] h-[280px] flex flex-col justify-between hover-lift animate-fade-in-up ${staggerClass}`;

        card.innerHTML = `
            <div class="absolute top-0 right-0 w-64 h-64 mesh-gradient opacity-[0.07] blur-[80px] rounded-full -mr-32 -mt-32 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
            <div class="relative z-10 flex justify-between items-start">
                <div class="flex items-center gap-5">
                    <div class="w-14 h-14 bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/5 transition-transform duration-500 group-hover:scale-110">
                        <span class="material-symbols-outlined text-2xl">${icon}</span>
                    </div>
                    <div>
                        <h3 class="font-display font-black text-slate-900 dark:text-white text-xl tracking-tighter mb-1">${acc.name}</h3>
                        <p class="text-[9px] text-slate-500 dark:text-slate-500 uppercase font-black tracking-[0.3em] opacity-80">${acc.type}</p>
                    </div>
                </div>
                <button onclick="window.FinancialApp.deleteAccount(${acc.id})" class="p-2.5 glass border-black/5 dark:border-white/5 text-slate-400 hover:text-rose-500 rounded-xl transition-all active:scale-90 opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0">
                    <span class="material-symbols-outlined text-base font-bold">delete</span>
                </button>
            </div>
            <div class="relative z-10 mt-4">
                <p class="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Real-time Cycle Spend</p>
                <h4 class="text-4xl lg:text-5xl font-display font-black text-slate-900 dark:text-white tracking-tighter drop-shadow-sm sensitive-data">${Utils.formatIDR(acc.balance)}</h4>
            </div>
            <div class="relative z-10 flex justify-between items-center text-[9px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-[0.2em] pt-4 border-t border-black/[0.03] dark:border-white/[0.03]">
                 <span class="opacity-80">Secured Vault Layer</span>
                 <span class="text-indigo-500 dark:text-indigo-400 flex items-center gap-1.5 ring-indigo-500/10 bg-indigo-500/5 px-2 py-1 rounded-lg">
                    <span class="w-1 h-1 rounded-full bg-indigo-500 animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.8)]"></span>
                    Verified
                 </span>
            </div>
        `;
        container.appendChild(card);
    });
};

/**
 * Initialize Account Form
 */
const initForm = () => {
    const form = document.getElementById('add-account-form');
    if (!form) return;

    Utils.applyDotFormatting(document.getElementById('account-balance'));

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('account-name')?.value;
        const type = document.getElementById('account-type')?.value || 'Bank';
        const balanceRaw = document.getElementById('account-balance')?.value || '0';
        const balance = parseFloat(balanceRaw.replace(/\./g, ''));

        if (!name || isNaN(balance)) {
            alert("Please enter valid details (Account Name and Balance)");
            return;
        }

        Store.addAccount({
            name: name.trim(),
            type: type,
            balance: balance,
            color: Utils.getRandomColor()
        });

        render();
        closeModal();
    });
};

/**
 * Modal Controls
 */
export const openModal = () => {
    const modal = document.getElementById('account-modal');
    if (modal) {
        modal.classList.remove('hidden');
        document.getElementById('account-name').focus();
    }
};

export const closeModal = () => {
    const modal = document.getElementById('account-modal');
    if (modal) modal.classList.add('hidden');
    document.getElementById('add-account-form').reset();
};

/**
 * Handle Account Deletion
 */
/**
 * Handle Account Deletion
 */
let deletingAccountId = null;

export const deleteAccount = (id) => {
    deletingAccountId = id;
    const modal = document.getElementById('delete-account-modal');
    if (modal) {
        modal.classList.remove('hidden');
    } else {
        if (confirm('Delete this account?')) {
            Store.removeAccount(id);
            render();
        }
    }
};

export const confirmDeleteAccount = () => {
    if (deletingAccountId) {
        Store.removeAccount(deletingAccountId);
        render();
        deletingAccountId = null;
    }
    closeDeleteAccountModal();
};

export const closeDeleteAccountModal = () => {
    const modal = document.getElementById('delete-account-modal');
    if (modal) modal.classList.add('hidden');
    deletingAccountId = null;
};
