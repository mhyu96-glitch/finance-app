/**
 * Dashboard Page Logic
 */
import * as Store from '../store.js';
import * as Utils from '../utils.js';
import * as Charts from '../charts.js';
import { translations } from '../translations.js';

let currentFilter = 'all';
let searchTerm = '';
let editingTransactionId = null;

/**
 * Receipt Logic
 */
export const handleReceiptPreview = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const base64 = e.target.result;
        document.getElementById('receipt-base64').value = base64;

        const preview = document.getElementById('receipt-preview-img');
        const container = document.getElementById('receipt-preview-container');
        const placeholder = document.getElementById('receipt-placeholder');

        if (preview && container && placeholder) {
            preview.src = base64;
            container.classList.remove('hidden');
            placeholder.classList.add('hidden');
        }
    };
    reader.readAsDataURL(file);
};

export const viewReceipt = (id) => {
    const t = Store.transactions.find(item => item.id === id);
    if (!t || !t.attachment) return;

    const modal = document.getElementById('receipt-view-modal');
    const img = document.getElementById('receipt-view-img');
    if (modal && img) {
        img.src = t.attachment;
        modal.classList.remove('hidden');
    }
};

export const closeReceiptModal = () => {
    const modal = document.getElementById('receipt-view-modal');
    if (modal) modal.classList.add('hidden');
};

/**
 * Elite Receipt OCR Simulator
 */
export const simulateOCR = () => {
    const btn = document.getElementById('scan-receipt-btn');
    const text = document.getElementById('scan-btn-text');
    const progress = document.getElementById('scan-progress');

    if (!btn || !text || !progress) return;

    // Start Animation
    btn.disabled = true;
    text.innerText = "Simulating AI Extraction...";
    progress.classList.remove('hidden');

    setTimeout(() => {
        // Mock Extracted Data
        const mockData = {
            amount: 145000,
            category: "Food",
            description: "Dinner at Gacoan (AI Extracted)",
            date: new Date().toISOString().split('T')[0]
        };

        // Fill Form
        const amountEl = document.getElementById('quick-add-amount');
        const catEl = document.getElementById('quick-add-category');
        const descEl = document.getElementById('quick-add-description');
        const dateEl = document.getElementById('quick-add-date');

        if (amountEl) amountEl.value = Utils.formatIDR(mockData.amount).replace('Rp ', '');
        if (catEl) catEl.value = mockData.category;
        if (descEl) descEl.value = mockData.description;
        if (dateEl) dateEl.value = mockData.date;

        // Reset Button
        text.innerText = "Elite Receipt OCR Scanner";
        progress.classList.add('hidden');
        btn.disabled = false;

        // Visual Feedback
        [amountEl, catEl, descEl].forEach(el => {
            if (el) {
                el.classList.add('ring-2', 'ring-emerald-500/50');
                setTimeout(() => el.classList.remove('ring-2', 'ring-emerald-500/50'), 2000);
            }
        });
    }, 2000);
};

/**
 * Initialize Dashboard
 */
export const init = () => {
    const listBody = document.getElementById('transaction-list-body');
    if (!listBody) return;

    renderTransactions();
    renderCommitmentsCard();
    initForm();
    initSavingsForm();
    populateAccountSelector();
    Utils.applyCurrencyFormatting(document.getElementById('down-payment'));
    initCommitmentModal();

    // Attach date default
    const dateInput = document.getElementById('date');
    if (dateInput) dateInput.valueAsDate = new Date();

    // Initial UI state
    setType('income');
};

/**
 * Render Transactions List (Grouped by Date)
 */
export const renderTransactions = () => {
    const listBody = document.getElementById('transaction-list-body');
    const emptyState = document.getElementById('empty-state');
    if (!listBody) return;

    listBody.innerHTML = '';
    let filtered = Store.transactions;

    // Filter by type
    if (currentFilter !== 'all') {
        if (currentFilter === 'debt') {
            filtered = Store.transactions.filter(t => t.type === 'debt' || t.type === 'receivable');
        } else {
            filtered = Store.transactions.filter(t => t.type === currentFilter);
        }
    }

    // Filter by search
    if (searchTerm) {
        filtered = filtered.filter(t =>
            t.description.toLowerCase().includes(searchTerm) ||
            (t.category && t.category.toLowerCase().includes(searchTerm)) ||
            (t.contact && t.contact.toLowerCase().includes(searchTerm))
        );
    }

    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

    if (filtered.length === 0) {
        if (emptyState) emptyState.classList.remove('hidden');
    } else {
        if (emptyState) emptyState.classList.add('hidden');

        let lastDateLabel = "";
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        const yesterdayDate = new Date();
        yesterdayDate.setDate(now.getDate() - 1);
        const yesterday = yesterdayDate.toISOString().split('T')[0];

        filtered.forEach(t => {
            const lang = Store.lang || 'en';
            const dict = translations[lang] || translations.en;

            let dateLabel = t.date;
            if (t.date === today) dateLabel = dict.today || "Today";
            else if (t.date === yesterday) dateLabel = dict.yesterday || "Yesterday";
            else dateLabel = new Date(t.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

            if (dateLabel !== lastDateLabel) {
                const header = document.createElement('div');
                header.className = 'date-group-header col-span-full';
                header.innerHTML = `<span class="date-group-label">${dateLabel}</span>`;
                listBody.appendChild(header);
                lastDateLabel = dateLabel;
            }

            const div = createTransactionElement(t);
            listBody.appendChild(div);
        });
    }

    updateDashboardValues();
};

/**
 * Create a single transaction list element
 */
const createTransactionElement = (t) => {
    const div = document.createElement('div');
    div.className = 'flex flex-col p-4 rounded-2xl bg-slate-50/50 dark:bg-white/[0.02] border border-transparent hover:border-black/5 dark:hover:border-white/5 hover:bg-slate-100 dark:hover:bg-white/[0.04] transition-all group relative overflow-hidden';

    let icon = 'south_west', colorClass = 'indigo', sign = '+';
    if (t.type === 'expense') { icon = 'north_east'; colorClass = 'rose'; sign = '-'; }
    if (t.type === 'debt') { icon = 'account_balance'; colorClass = 'amber'; sign = '+'; }
    if (t.type === 'receivable') { icon = 'payments'; colorClass = 'blue'; sign = '-'; }

    const account = Store.accounts.find(a => a.id == t.accountId);
    const accountName = account ? account.name : 'Global';

    // Search Highlighting
    let displayDescription = t.description;
    if (searchTerm) {
        const regex = new RegExp(`(${searchTerm})`, 'gi');
        displayDescription = t.description.replace(regex, '<span class="search-highlight">$1</span>');
    }

    let statusBadge = '';
    if (t.type === 'debt' || t.type === 'receivable') {
        const paid = t.paidAmount || 0;
        const percentage = Math.round((paid / t.amount) * 100);
        statusBadge = `
            <div class="flex items-center gap-2 mt-1">
                <div class="w-16 h-1 bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
                    <div class="h-full bg-${colorClass}-500" style="width: ${percentage}%"></div>
                </div>
                <span class="text-[8px] font-bold text-slate-500 uppercase">${percentage}% Paid</span>
            </div>
        `;
    }

    div.innerHTML = `
        <div class="flex flex-col h-full gap-3">
            <div class="flex items-center justify-between w-full">
                <div class="w-10 h-10 rounded-xl bg-${colorClass}-500/10 flex items-center justify-center text-${colorClass}-500 shrink-0 shadow-sm border border-${colorClass}-500/5">
                    <span class="material-symbols-outlined text-[18px]">${icon}</span>
                </div>
                <div class="flex items-center gap-1.5">
                    ${t.attachment ? `<span class="material-symbols-outlined text-[14px] text-indigo-400 opacity-60">attach_file</span>` : ''}
                    ${t.isPaid ? `<span class="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.4)]"></span>` : ''}
                </div>
            </div>
            
            <div class="min-w-0 flex-1">
                <p class="text-[13px] font-bold text-slate-900 dark:text-white line-clamp-2 leading-tight mb-1 text-ellipsis overflow-hidden truncate-2-lines">${displayDescription}</p>
                <div class="flex items-center gap-2">
                    <p class="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider truncate opacity-80">${t.category}</p>
                    <span class="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700"></span>
                    <p class="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider truncate opacity-80">${accountName}</p>
                </div>
            </div>

            <div class="flex items-end justify-between gap-2 mt-auto pt-3 border-t border-slate-100 dark:border-white/5">
                <div class="flex flex-col">
                    <p class="text-[15px] font-black text-slate-900 dark:text-white sensitive-data leading-none">${sign}${Utils.formatCurrency(Store.convertBalance(t.amount), Store.currency)}</p>
                </div>
                
                <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all translate-y-1 group-hover:translate-y-0">
                    <button onclick="window.FinancialApp.editTransaction(${t.id})" class="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-indigo-500 dark:hover:text-white bg-slate-100/50 dark:bg-white/5 rounded-lg transition-colors" title="Edit">
                        <span class="material-symbols-outlined text-[14px]">edit</span>
                    </button>
                    <button onclick="window.FinancialApp.removeTransaction(${t.id})" class="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 bg-slate-100/50 dark:bg-white/5 rounded-lg transition-colors" title="Delete">
                        <span class="material-symbols-outlined text-[14px]">delete</span>
                    </button>
                </div>
            </div>
        </div>
    `;
    return div;
};

/**
 * Update Dashboard Stat Cards and Chart
 */
export const updateDashboardValues = () => {
    const totals = Store.getTotals();

    const balanceEl = document.getElementById('total-balance');
    const incomeEl = document.getElementById('total-income');
    const expenseEl = document.getElementById('total-expense');
    const savingsEl = document.getElementById('total-savings');
    const debtEl = document.getElementById('total-debt');
    const receivableEl = document.getElementById('total-receivable');

    if (balanceEl) balanceEl.innerText = Utils.formatCurrency(Store.convertBalance(totals.netWorth || totals.realBalance), Store.currency);
    if (incomeEl) incomeEl.innerText = Utils.formatCurrency(Store.convertBalance(totals.income), Store.currency);
    if (expenseEl) expenseEl.innerText = Utils.formatCurrency(Store.convertBalance(totals.expense), Store.currency);
    if (savingsEl) savingsEl.innerText = Utils.formatCurrency(Store.convertBalance(Store.getTotalAccountBalance()), Store.currency);
    if (debtEl) debtEl.innerText = Utils.formatCurrency(Store.convertBalance(totals.activeDebt), Store.currency);
    if (receivableEl) receivableEl.innerText = Utils.formatCurrency(Store.convertBalance(totals.activeReceivable), Store.currency);

    updateSavingsGoal(totals.income, totals.expense);
    Charts.updateDashboardChart(totals.income, totals.expense);
    renderSavingsTrendChart();
    renderNetWorthTrendChart();
    renderCommitmentsCard();
    renderSnowballStrategy();

    // Investment Summary
    const investments = Store.investments || [];
    let totalInvested = 0;
    const typeTotals = {};

    investments.forEach(inv => {
        const val = inv.quantity * inv.price;
        totalInvested += val;
        typeTotals[inv.type] = (typeTotals[inv.type] || 0) + val;
    });

    const investedEl = document.getElementById('dashboard-total-invested');
    if (investedEl) investedEl.innerText = Utils.formatCurrency(Store.convertBalance(totalInvested), Store.currency);

    Charts.initDashboardInvestmentChart(typeTotals);

    // Financial Health Score
    const healthScore = Store.calculateHealthScore();
    Charts.initHealthScoreGauge(healthScore);
};

/**
 * Debt Snowball Strategy Logic
 */
export const renderSnowballStrategy = () => {
    const list = document.getElementById('snowball-list');
    if (!list) return;

    // Filter active debts (type: debt, not fully paid)
    const activeDebts = Store.transactions.filter(t => t.type === 'debt' && !t.isPaid);

    if (activeDebts.length === 0) {
        list.innerHTML = `
            <div class="py-20 text-center opacity-30">
                <span class="material-symbols-outlined text-4xl mb-4 text-purple-500">check_circle</span>
                <p class="text-[10px] font-black uppercase tracking-[0.2em]">No Active Debts. Debt Free!</p>
            </div>`;
        return;
    }

    // Snowball Method: Sort by remaining amount (smallest first)
    activeDebts.sort((a, b) => (a.amount - (a.paidAmount || 0)) - (b.amount - (b.paidAmount || 0)));

    list.innerHTML = '';
    activeDebts.forEach((debt, index) => {
        const remaining = debt.amount - (debt.paidAmount || 0);
        const recurring = Store.getRecurringTransactions().find(rt => rt.description.includes(debt.description));
        const monthlyPayment = recurring ? recurring.amount : (debt.amount / 12); // Fallback estimate
        const monthsLeft = Math.ceil(remaining / monthlyPayment);

        const card = document.createElement('div');
        card.className = 'glass p-6 rounded-3xl border-white/5 relative group hover:bg-white/[0.04] transition-all duration-500';
        card.innerHTML = `
            <div class="flex justify-between items-start mb-4">
                <div class="flex items-center gap-4">
                    <div class="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500">
                        <span class="material-symbols-outlined text-sm">${index === 0 ? 'priority_high' : 'list'}</span>
                    </div>
                    <div>
                        <h5 class="font-bold text-sm text-slate-900 dark:text-white">${debt.description}</h5>
                        <p class="text-[8px] font-black text-slate-500 uppercase tracking-widest">${index === 0 ? 'NEXT PRIORITY' : 'STRATEGY LINEUP'}</p>
                    </div>
                </div>
                <div class="text-right">
                    <p class="text-xs font-black text-slate-900 dark:text-white sensitive-data">${Utils.formatCurrency(Store.convertBalance(remaining), Store.currency)}</p>
                    <p class="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Remaining</p>
                </div>
            </div>
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                    <span class="material-symbols-outlined text-xs text-purple-400">schedule</span>
                    <span class="text-[9px] font-bold text-slate-500 uppercase">~${monthsLeft} Months to payoff</span>
                </div>
                <button onclick="window.FinancialApp.payInstallment(${debt.id})" class="px-3 py-1 bg-purple-500 text-white text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-purple-600 transition-all active:scale-95">Accelerate</button>
            </div>
        `;
        list.appendChild(card);
    });
};

/**
 * Render Financial Commitments Card
 */
export const renderCommitmentsCard = () => {
    const list = document.getElementById('commitments-list');
    if (!list) return;

    const recurring = Store.getRecurringTransactions();
    if (recurring.length === 0) {
        list.innerHTML = `
            <div class="col-span-full py-12 text-center opacity-30">
                <span class="material-symbols-outlined text-4xl mb-3">auto_awesome_motion</span>
                <p class="text-[10px] font-black uppercase tracking-[0.2em]">No Active Commitments</p>
            </div>`;
        return;
    }

    list.innerHTML = '';
    recurring.forEach(item => {
        const card = document.createElement('div');
        // Added onclick and cursor-pointer
        card.className = 'glass p-6 rounded-3xl border-white/5 relative group/item overflow-hidden hover:bg-white/[0.04] transition-all duration-500 cursor-pointer';
        card.onclick = (e) => {
            // Prevent opening if clicked on action buttons
            if (e.target.closest('button')) return;
            window.FinancialApp.openCommitmentDetails(item.id);
        };

        const progress = item.tenor > 0 ? Math.round((item.completedPayments / item.tenor) * 100) : null;
        const nextDate = new Date(item.lastProcessed);
        if (item.frequency === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1);
        else if (item.frequency === 'weekly') nextDate.setDate(nextDate.getDate() + 7);
        else if (item.frequency === 'daily') nextDate.setDate(nextDate.getDate() + 1);
        else if (item.frequency === 'yearly') nextDate.setFullYear(nextDate.getFullYear() + 1);

        const colorClass = item.type === 'income' ? 'emerald' : (item.type === 'debt' ? 'purple' : 'indigo');
        const icon = item.type === 'income' ? 'stat_3' : (item.type === 'debt' ? 'handshake' : 'receipt_long');

        card.innerHTML = `
            <div class="flex justify-between items-start mb-6">
                <div class="flex items-center gap-4">
                    <div class="w-10 h-10 rounded-xl bg-${colorClass}-500/10 flex items-center justify-center text-${colorClass}-500">
                        <span class="material-symbols-outlined text-lg">${icon}</span>
                    </div>
                    <div>
                        <h5 class="font-bold text-sm text-slate-900 dark:text-white truncate max-w-[120px]">${item.description}</h5>
                        <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">${item.frequency}</p>
                    </div>
                </div>
                <div class="flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
                    <button onclick="window.FinancialApp.editCommitment(${item.id})" class="p-2 text-slate-300 hover:text-indigo-500 transition-colors">
                        <span class="material-symbols-outlined text-sm">edit</span>
                    </button>
                    <button onclick="window.FinancialApp.removeCommitment(${item.id})" class="p-2 text-slate-300 hover:text-rose-500 transition-colors">
                        <span class="material-symbols-outlined text-sm">close</span>
                    </button>
                </div>
            </div>
            
            <div class="mb-6">
                <div class="flex justify-between items-end mb-2">
                    <span class="text-[10px] font-black text-slate-900 dark:text-white sensitive-data">${Utils.formatIDR(item.amount)}</span>
                    <span class="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Next: ${nextDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
                </div>
                ${item.tenor > 0 ? `
                <div class="h-1.5 w-full bg-black/5 dark:bg-white/5 rounded-full overflow-hidden mb-1">
                    <div class="h-full bg-gradient-to-r from-${colorClass}-500 to-${colorClass}-400" style="width: ${progress}%"></div>
                </div>
                <div class="flex justify-between">
                    <span class="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">${item.completedPayments} OF ${item.tenor} PAID</span>
                    <span class="text-[8px] font-black text-${colorClass}-500 uppercase tracking-widest">${progress}%</span>
                </div>
                ` : `
                <div class="h-1.5 w-full bg-black/5 dark:bg-white/5 rounded-full overflow-hidden group-hover/item:bg-${colorClass}-500/10 transition-colors">
                     <div class="h-full bg-${colorClass}-500/20 w-full animate-pulse"></div>
                </div>
                <div class="flex justify-between mt-1">
                    <span class="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Fixed Commitment</span>
                    <span class="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Active</span>
                </div>
                `}
            </div>
            
            <div class="absolute top-0 right-0 w-24 h-24 bg-${colorClass}-500/5 blur-3xl rounded-full -mr-12 -mt-12"></div>
        `;
        list.appendChild(card);
    });
};

export const removeCommitment = (id) => {
    if (confirm('Terminate this financial commitment?')) {
        Store.removeRecurringTransaction(id);
        renderCommitmentsCard();
    }
};

/**
 * Trigger UI to set up a new commitment
 */
export const triggerNewCommitment = () => {
    const modal = document.getElementById('commitment-modal');
    if (!modal) return;

    // Reset Edit State
    editingCommitmentId = null;
    const btnText = document.querySelector('#commitment-form button[type="submit"]');
    if (btnText) btnText.innerHTML = `<span class="material-symbols-outlined text-sm">check_circle</span> Create Commitment`;

    // Reset form
    const form = document.getElementById('commitment-form');
    if (form) form.reset();

    // Reset account
    document.getElementById('commit-account-id').value = '';
    document.getElementById('commit-account-label').innerText = 'Select Account...';

    // Hide installment preview
    const preview = document.getElementById('commit-installment-preview');
    if (preview) preview.classList.add('hidden');

    // Populate accounts
    populateCommitAccountSelector();

    // Show modal
    modal.classList.remove('hidden');
};

export const closeCommitmentModal = () => {
    const modal = document.getElementById('commitment-modal');
    if (modal) modal.classList.add('hidden');
};

/**
 * Initialize Commitment Modal (currency formatting + auto-calc)
 */
const initCommitmentModal = () => {
    Utils.applyCurrencyFormatting(document.getElementById('commit-total-price'));
    Utils.applyCurrencyFormatting(document.getElementById('commit-dp'));

    const els = ['commit-total-price', 'commit-dp', 'commit-tenor'];
    els.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', calcCommitInstallment);
    });

    // Form submission
    const form = document.getElementById('commitment-form');
    if (form) {
        form.addEventListener('submit', submitCommitment);
    }
};

const calcCommitInstallment = () => {
    const totalPriceRaw = document.getElementById('commit-total-price')?.value || '0';
    const dpRaw = document.getElementById('commit-dp')?.value || '0';
    const tenor = parseInt(document.getElementById('commit-tenor')?.value) || 0;

    const totalPrice = parseFloat(totalPriceRaw.replace(/[^0-9]/g, '')) || 0;
    const dp = parseFloat(dpRaw.replace(/[^0-9]/g, '')) || 0;

    const preview = document.getElementById('commit-installment-preview');
    const valueEl = document.getElementById('commit-installment-value');

    if (totalPrice > 0 && tenor > 0) {
        const remaining = Math.max(0, totalPrice - dp);
        const installment = Math.ceil(remaining / tenor);

        if (preview) preview.classList.remove('hidden');
        if (valueEl) valueEl.textContent = Utils.formatIDR(installment);
    } else {
        if (preview) preview.classList.add('hidden');
        if (valueEl) valueEl.textContent = 'Rp 0';
    }
};

const populateCommitAccountSelector = () => {
    const dropdown = document.getElementById('commit-account-dropdown');
    if (!dropdown) return;

    dropdown.innerHTML = '';
    Store.accounts.forEach(acc => {
        let icon = 'account_balance';
        if (acc.type === 'Cash') icon = 'payments';
        if (acc.type === 'E-Wallet') icon = 'account_balance_wallet';
        if (acc.type === 'Credit Card') icon = 'credit_card';

        const item = document.createElement('div');
        item.className = 'flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer transition-colors group';
        item.onclick = () => selectCommitAccount(acc.id);

        item.innerHTML = `
            <div class="w-8 h-8 rounded-lg bg-${acc.color || 'indigo'}-500/10 flex items-center justify-center text-${acc.color || 'indigo'}-500 group-hover:scale-110 transition-transform">
                <span class="material-symbols-outlined text-base">${icon}</span>
            </div>
            <div>
                <p class="font-bold text-xs text-slate-900 dark:text-white">${acc.name}</p>
                <p class="text-[9px] font-bold text-slate-500 uppercase">${Utils.formatCurrency(Store.convertBalance(acc.balance), Store.currency)}</p>
            </div>
        `;
        dropdown.appendChild(item);
    });
};

export const toggleCommitAccountDropdown = () => {
    const dropdown = document.getElementById('commit-account-dropdown');
    if (dropdown) dropdown.classList.toggle('hidden');
};

const selectCommitAccount = (id) => {
    const acc = Store.accounts.find(a => a.id === id);
    if (!acc) return;

    document.getElementById('commit-account-id').value = acc.id;
    document.getElementById('commit-account-label').innerText = acc.name;
    document.getElementById('commit-account-dropdown').classList.add('hidden');
};

let editingCommitmentId = null;

export const editCommitment = (id) => {
    const item = Store.getRecurringTransactions().find(i => i.id === id);
    if (!item) return;

    editingCommitmentId = id;

    // Populate Fields
    document.getElementById('commit-description').value = item.description;
    document.getElementById('commit-total-price').value = Utils.formatNumberWithDots(item.totalPrice || 0);
    document.getElementById('commit-dp').value = Utils.formatNumberWithDots(item.dpAmount || 0);
    document.getElementById('commit-tenor').value = item.tenor;
    document.getElementById('commit-frequency').value = item.frequency;
    document.getElementById('commit-category').value = item.category;

    // Select Account
    selectCommitAccount(item.accountId);

    // Trigger Calculation for Preview
    calcCommitInstallment();

    // Change Submit Button Text
    const btnCheck = document.querySelector('#commitment-form button[type="submit"] span');
    const btnText = document.querySelector('#commitment-form button[type="submit"]');
    if (btnText) btnText.innerHTML = `<span class="material-symbols-outlined text-sm">save</span> Update Commitment`;

    // Show Modal
    const modal = document.getElementById('commitment-modal');
    if (modal) modal.classList.remove('hidden');
};

const submitCommitment = (e) => {
    e.preventDefault();

    const description = document.getElementById('commit-description')?.value || '';
    const totalPriceRaw = document.getElementById('commit-total-price')?.value || '0';
    const dpRaw = document.getElementById('commit-dp')?.value || '0';
    const tenor = parseInt(document.getElementById('commit-tenor')?.value) || 0;
    const frequency = document.getElementById('commit-frequency')?.value || 'monthly';
    const category = document.getElementById('commit-category')?.value || 'General';
    const accountId = document.getElementById('commit-account-id')?.value;

    const totalPrice = parseFloat(totalPriceRaw.replace(/[^0-9]/g, '')) || 0;
    const dpAmount = parseFloat(dpRaw.replace(/[^0-9]/g, '')) || 0;

    if (!description || !totalPrice || !tenor || !accountId) {
        alert('Please fill in Description, Total Price, Tenor, and select an Account.');
        return;
    }

    const installmentAmount = Math.ceil(Math.max(0, totalPrice - dpAmount) / tenor);
    const date = new Date().toISOString().split('T')[0];

    if (editingCommitmentId) {
        // --- Update Existing Commitment ---
        Store.updateRecurringTransaction(editingCommitmentId, {
            description,
            amount: installmentAmount,
            totalPrice,
            dpAmount,
            tenor,
            frequency,
            category,
            accountId
        });
    } else {
        // --- Create New Commitment ---

        // 1. Record DP as a one-time expense if provided (Only for new commitments)
        if (dpAmount > 0) {
            Store.addTransaction({
                type: 'expense',
                date,
                amount: dpAmount,
                description: `DP: ${description}`,
                category,
                accountId,
                tenor: 0
            });
            Store.updateAccountBalance(accountId, -dpAmount);
        }

        // 2. Create the Recurring Commitment
        Store.addRecurringTransaction({
            type: 'expense',
            date,
            amount: installmentAmount,
            description,
            category,
            accountId,
            frequency,
            tenor,
            totalPrice,
            dpAmount
        });
    }

    // Refresh UI
    closeCommitmentModal();
    updateDashboardValues();
    renderTransactions();
    renderCommitmentsCard();
    populateAccountSelector();
};

/**
 * Render Detailed Net Worth Trend
 */
const renderNetWorthTrendChart = () => {
    const totals = Store.getTotals();
    let currentNetWorth = totals.netWorth || totals.realBalance; // Global Net Worth

    const labels = [];
    const data = [];
    const today = new Date();

    // Reconstruct last 12 months
    for (let i = 11; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        labels.push(d.toLocaleString('default', { month: 'short', year: '2-digit' }));

        // Calculate snapshot at END of this month
        const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);

        // Net worth at this point = Current NW - (Sum of transactions AFTER this date)
        // If income happened AFTER, we subtract it to go back.
        // If expense happened AFTER, we add it back.
        const futureTrans = Store.transactions.filter(t => new Date(t.date) > monthEnd);

        let adjustment = 0;
        futureTrans.forEach(t => {
            if (t.type === 'income') adjustment -= t.amount;
            if (t.type === 'expense') adjustment += t.amount;
            // Debt increases cash but decreases net worth. 
            // In our simple model, we focus on liquid cash (accounts)
        });

        data.push(currentNetWorth + adjustment);
    }

    Charts.initNetWorthChart(labels, data);
};

/**
 * Update Savings Goal Progress Ring
 */
const updateSavingsGoal = (income, expense) => {
    const ring = document.getElementById('goal-progress-ring');
    const percentageEl = document.getElementById('goal-percentage');
    const targetEl = document.getElementById('goal-target-val');
    const savedEl = document.getElementById('goal-saved-val');
    const projectionEl = document.getElementById('goal-projection');

    if (!ring) return;

    const target = Store.getSavingsGoal();
    const saved = Math.max(0, income - expense);
    const percentage = Math.min(100, Math.round((saved / target) * 100));

    const offset = 283 - (percentage / 100) * 283;
    ring.style.strokeDashoffset = offset;

    if (percentageEl) percentageEl.innerText = `${percentage}%`;
    if (targetEl) targetEl.innerText = Utils.formatCurrency(Store.convertBalance(target), Store.currency);
    if (savedEl) savedEl.innerText = Utils.formatCurrency(Store.convertBalance(saved), Store.currency);

    // Predictive Forecast Logic
    if (projectionEl) {
        const remaining = target - saved;
        if (remaining <= 0) {
            projectionEl.innerText = "Goal Reached! 🚀";
        } else if (saved <= 0) {
            projectionEl.innerText = "Waiting for first savings...";
        } else {
            // Calculate avg savings per day (based on current month so far)
            const now = new Date();
            const dayOfMonth = now.getDate();
            const avgPerDay = saved / dayOfMonth;

            const daysToGoal = Math.ceil(remaining / avgPerDay);
            const targetDate = new Date();
            targetDate.setDate(now.getDate() + daysToGoal);

            if (daysToGoal > 365) {
                projectionEl.innerText = "ETA: Over 1 year";
            } else {
                projectionEl.innerText = `ETA: ${targetDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} (${daysToGoal} days)`;
            }
        }
    }
};

let savingsTrendChart = null;

/**
 * Render Savings Trend Sparkline
 */
const renderSavingsTrendChart = () => {
    const ctx = document.getElementById('savingsTrendChart');
    if (!ctx) return;

    // Calculate last 6 months trend
    const months = [];
    const data = [];
    const today = new Date();

    for (let i = 5; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const monthLabel = d.toLocaleString('default', { month: 'short' });
        months.push(monthLabel);

        const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
        const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);

        const monthlyTrans = Store.transactions.filter(t => {
            const tDate = new Date(t.date);
            return tDate >= monthStart && tDate <= monthEnd;
        });

        const inc = monthlyTrans.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const exp = monthlyTrans.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
        data.push(Math.max(0, inc - exp));
    }

    if (savingsTrendChart) savingsTrendChart.destroy();

    const isDark = document.documentElement.classList.contains('dark');
    const color = isDark ? '#2dd4bf' : '#10b981';

    savingsTrendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: months,
            datasets: [{
                data: data,
                borderColor: color,
                borderWidth: 2,
                tension: 0.4,
                pointRadius: 0,
                fill: true,
                backgroundColor: (context) => {
                    const ctx = context.chart.ctx;
                    const gradient = ctx.createLinearGradient(0, 0, 0, 50);
                    gradient.addColorStop(0, isDark ? 'rgba(45, 212, 191, 0.2)' : 'rgba(16, 185, 129, 0.2)');
                    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
                    return gradient;
                }
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { enabled: false } },
            scales: {
                x: { display: false },
                y: { display: false, min: 0 }
            }
        }
    });
};

/**
 * Savings Goal Modal Logic
 */
export const openSavingsGoalModal = () => {
    const modal = document.getElementById('savings-goal-modal');
    if (modal) {
        modal.classList.remove('hidden');
        const input = document.getElementById('savings-goal-input');
        if (input) {
            input.value = `Rp ${Utils.formatNumberWithDots(Store.getSavingsGoal())}`;
            Utils.applyCurrencyFormatting(input);
            input.focus();
        }
    }
};

export const closeSavingsGoalModal = () => {
    const modal = document.getElementById('savings-goal-modal');
    if (modal) modal.classList.add('hidden');
};

const initSavingsForm = () => {
    const form = document.getElementById('savings-goal-form');
    if (!form) return;

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const raw = document.getElementById('savings-goal-input')?.value || '0';
        const amount = parseFloat(raw.replace(/[^0-9]/g, ''));

        if (amount > 0) {
            Store.setSavingsGoal(amount);
            closeSavingsGoalModal();
            updateDashboardValues();
        }
    });
};

/**
 * Initialize Transaction Form
 */
const initForm = () => {
    const form = document.getElementById('transaction-form');
    if (!form) return;

    Utils.applyDotFormatting(document.getElementById('amount'));

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const type = document.getElementById('type-input')?.value || 'income';
        const amountRaw = document.getElementById('amount')?.value || '0';
        const description = document.getElementById('description')?.value || '';
        const date = document.getElementById('date')?.value || new Date().toISOString().split('T')[0];
        const accountId = document.getElementById('transaction-account')?.value;
        const category = document.getElementById('category')?.value || 'General';
        const contact = document.getElementById('contact')?.value || '';
        const tenor = document.getElementById('tenor') ? +document.getElementById('tenor').value : 0;
        const isRecurring = document.getElementById('is-recurring')?.checked || false;
        const frequency = document.getElementById('frequency')?.value || 'monthly';
        const attachment = document.getElementById('receipt-base64')?.value || null;
        const dpRaw = document.getElementById('down-payment')?.value || '0';
        const dpAmount = parseFloat(dpRaw.replace(/[^0-9]/g, '')) || 0;
        const totalPriceRaw = document.getElementById('total-price')?.value || '0';
        const totalPrice = parseFloat(totalPriceRaw.replace(/[^0-9]/g, '')) || 0;

        const amount = parseFloat(amountRaw.replace(/\./g, ''));

        if (!amount || !description || !date || !accountId) {
            alert("Please fill in all required fields (Amount, Description, Date, Account)");
            return;
        }

        const transData = {
            type, date, amount, description,
            category: category || 'General',
            contact: (type === 'debt' || type === 'receivable') ? contact : '',
            tenor: (type === 'debt' || type === 'receivable' || isRecurring) ? tenor : 0,
            accountId: accountId,
            attachment: attachment
        };

        if (editingTransactionId) {
            const oldT = Store.transactions.find(t => t.id === editingTransactionId);
            if (oldT) {
                const undoChange = (oldT.type === 'income' || oldT.type === 'debt') ? -oldT.amount : oldT.amount;
                Store.updateAccountBalance(oldT.accountId, undoChange);
            }
            Store.updateTransaction(editingTransactionId, transData);
            const newChange = (type === 'income' || type === 'debt') ? amount : -amount;
            Store.updateAccountBalance(accountId, newChange);

            editingTransactionId = null;
            resetSubmitButton();
        } else {
            // --- New Transaction Flow ---
            if (isRecurring && totalPrice > 0 && tenor > 0) {
                // Commitment with Total Price + Tenor (auto-calculated installment)
                const installmentAmount = Math.ceil(Math.max(0, totalPrice - dpAmount) / tenor);

                // 1. Record DP as a one-time expense if provided
                if (dpAmount > 0) {
                    Store.addTransaction({
                        type: 'expense',
                        date,
                        amount: dpAmount,
                        description: `DP: ${description}`,
                        category: category || 'General',
                        accountId,
                        tenor: 0
                    });
                    Store.updateAccountBalance(accountId, -dpAmount);
                }

                // 2. Create the Recurring Commitment for installments
                Store.addRecurringTransaction({
                    type,
                    date,
                    amount: installmentAmount,
                    description,
                    category: category || 'General',
                    contact: (type === 'debt' || type === 'receivable') ? contact : '',
                    accountId,
                    frequency,
                    tenor: tenor,
                    totalPrice: totalPrice,
                    dpAmount: dpAmount
                });

            } else if (isRecurring) {
                // Regular recurring without Total Price (use Amount directly)
                Store.addTransaction(transData);
                const newChange = (type === 'income' || type === 'debt') ? amount : -amount;
                Store.updateAccountBalance(accountId, newChange);

                Store.addRecurringTransaction({
                    ...transData,
                    frequency,
                    tenor: tenor
                });
            } else {
                // Normal one-time transaction
                Store.addTransaction(transData);
                const newChange = (type === 'income' || type === 'debt') ? amount : -amount;
                Store.updateAccountBalance(accountId, newChange);
            }
        }

        e.target.reset();
        if (document.getElementById('is-recurring')) {
            document.getElementById('is-recurring').checked = false;
            document.getElementById('recurring-options').style.display = 'none';
        }
        if (document.getElementById('receipt-base64')) {
            document.getElementById('receipt-base64').value = '';
            document.getElementById('receipt-preview-container').classList.add('hidden');
            document.getElementById('receipt-placeholder').classList.remove('hidden');
        }
        // Reset installment preview
        const preview = document.getElementById('installment-preview');
        if (preview) preview.classList.add('hidden');

        document.getElementById('date').valueAsDate = new Date();
        setType(type);
        populateAccountSelector();
        renderTransactions();
        renderCommitmentsCard();
    });
};

/**
 * Handle Transaction Editing
 */
export const editTransaction = (id) => {
    const t = Store.transactions.find(item => item.id === id);
    if (!t) return;

    const form = document.getElementById('transaction-form');
    if (form) form.scrollIntoView({ behavior: 'smooth' });

    document.getElementById('amount').value = Utils.formatNumberWithDots(t.amount);
    document.getElementById('description').value = t.description;
    document.getElementById('date').value = t.date;
    if (document.getElementById('category')) document.getElementById('category').value = t.category || '';
    if (document.getElementById('contact')) document.getElementById('contact').value = t.contact || '';
    if (document.getElementById('transaction-account')) document.getElementById('transaction-account').value = t.accountId || '';

    setType(t.type);
    editingTransactionId = id;

    const submitBtn = form?.querySelector('button[type="submit"]');
    if (submitBtn) {
        const label = submitBtn.querySelector('span:first-child');
        if (label) label.textContent = 'Update Transaction';
        submitBtn.classList.add('ring-2', 'ring-amber-500/50');
    }
};

const resetSubmitButton = () => {
    const form = document.getElementById('transaction-form');
    const submitBtn = form?.querySelector('button[type="submit"]');
    if (submitBtn) {
        const label = submitBtn.querySelector('span:first-child');
        if (label) label.textContent = 'Record Transaction';
        submitBtn.classList.remove('ring-2', 'ring-amber-500/50');
    }
};

/**
 * Handle Transaction Removal
 */
/**
 * Handle Transaction Removal
 */
let deletingTransactionId = null;

export const removeTransaction = (id) => {
    deletingTransactionId = id;
    const modal = document.getElementById('delete-confirmation-modal');
    if (modal) {
        modal.classList.remove('hidden');
    } else {
        // Fallback if modal missing
        if (confirm('Delete this transaction?')) confirmDelete();
    }
};

export const confirmDelete = () => {
    if (deletingTransactionId) {
        const id = deletingTransactionId;
        const t = Store.transactions.find(item => item.id === id);

        if (t && t.accountId) {
            const revertChange = (t.type === 'income' || t.type === 'debt') ? -t.amount : t.amount;
            Store.updateAccountBalance(t.accountId, revertChange);
        }

        Store.removeTransaction(id);
        renderTransactions();
        populateAccountSelector();
        deletingTransactionId = null;
    }
    closeDeleteModal();
};

export const closeDeleteModal = () => {
    const modal = document.getElementById('delete-confirmation-modal');
    if (modal) modal.classList.add('hidden');
    deletingTransactionId = null;
};

export const addDebt = () => {
    // 1. Set type to Debt
    setType('debt');

    // 2. Scroll to form
    const formContainer = document.querySelector('.glass.rounded-\\[2\\.5rem\\]'); // The container of the form
    if (formContainer) {
        formContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // 3. Focus input after scroll
    setTimeout(() => {
        const amountInput = document.getElementById('amount');
        if (amountInput) amountInput.focus();
    }, 600);
};

/**
 * Handle Debt/Receivable Installment
 */
export const payInstallment = (id) => {
    const t = Store.transactions.find(item => item.id === id);
    if (!t) return;

    const remaining = t.amount - (t.paidAmount || 0);
    const pay = prompt(`Pay Installment (Remaining: ${Utils.formatIDR(remaining)})`, remaining);

    if (pay && pay > 0 && pay <= remaining) {
        const paidVal = parseFloat(pay);
        const newPaidAmount = (t.paidAmount || 0) + paidVal;
        const isPaid = newPaidAmount >= t.amount - 100;

        Store.updateTransaction(id, { paidAmount: newPaidAmount, isPaid });

        // Record as independent expense
        Store.addTransaction({
            type: 'expense',
            date: new Date().toISOString().split('T')[0],
            amount: paidVal,
            description: `Repayment: ${t.description}`,
            category: 'Debt Repayment',
            accountId: t.accountId
        });

        // The addTransaction above doesn't automatically update account balance if we use the generic Store method 
        // without specifically calling updateAccountBalance for that new expense.
        // But our old app.js didn't use accountId for repayments? 
        // Actually, it should. Let's ensure it does.
        if (t.accountId) Store.updateAccountBalance(t.accountId, -paidVal);

        renderTransactions();
        populateAccountSelector();
    }
};

/**
 * Handle Search
 */
export const handleSearch = (val) => {
    searchTerm = val.toLowerCase();
    renderTransactions();
};

/**
 * Handle Filtering
 */
export const setFilter = (filter) => {
    currentFilter = filter;
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.className = 'filter-btn px-4 py-1.5 text-xs font-bold rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors';
        if (btn.dataset.filter === filter) btn.className = 'filter-btn px-4 py-1.5 text-xs font-bold rounded-full bg-primary text-white';
    });
    renderTransactions();
};

/**
 * Handle Type Switching
 */
export const setType = (type) => {
    const typeInput = document.getElementById('type-input');
    if (!typeInput) return;
    typeInput.value = type;

    const typeSlider = document.getElementById('type-slider');
    if (typeSlider) {
        if (type === 'income') typeSlider.style.left = '4px';
        else if (type === 'expense') typeSlider.style.left = 'calc(50% - 1px)';
    }

    document.querySelectorAll('.type-btn').forEach(btn => {
        const isActive = btn.dataset.type === type;
        if (isActive) {
            btn.className = 'type-btn flex-1 py-3 px-4 rounded-xl text-xs font-black transition-all relative z-10 text-slate-900 dark:text-white';
        } else {
            btn.className = 'type-btn flex-1 py-3 px-4 rounded-xl text-xs font-black transition-all relative z-10 text-slate-400 hover:text-slate-900 dark:hover:text-white';
        }
    });

    const debtFields = document.getElementById('debt-fields');
    if (debtFields) {
        debtFields.style.display = (type === 'debt' || type === 'receivable') ? 'block' : 'none';
    }
};

/**
 * Populate Account Selector Dropdown (Custom Card Style)
 */
export const populateAccountSelector = () => {
    const dropdown = document.getElementById('account-selector-dropdown');
    const trigger = document.getElementById('account-selector-trigger');
    const hiddenInput = document.getElementById('transaction-account');

    if (!dropdown || !trigger || !hiddenInput) return;

    dropdown.innerHTML = '';

    // If no accounts, show placeholder
    if (Store.accounts.length === 0) {
        hiddenInput.value = '';
        trigger.innerHTML = `<span class="text-slate-400 font-bold text-sm">No Accounts Found</span>`;
        return;
    }

    // Auto-select first account if none selected
    if (!hiddenInput.value && Store.accounts.length > 0) {
        selectAccount(Store.accounts[0].id);
    }

    Store.accounts.forEach(acc => {
        let icon = 'account_balance';
        if (acc.type === 'Cash') icon = 'payments';
        if (acc.type === 'E-Wallet') icon = 'account_balance_wallet';
        if (acc.type === 'Credit Card') icon = 'credit_card';

        const item = document.createElement('div');
        item.className = 'flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer transition-colors group';
        item.onclick = () => selectAccount(acc.id);

        item.innerHTML = `
            <div class="w-10 h-10 rounded-lg bg-${acc.color || 'indigo'}-500/10 flex items-center justify-center text-${acc.color || 'indigo'}-500 group-hover:scale-110 transition-transform">
                <span class="material-symbols-outlined text-xl">${icon}</span>
            </div>
            <div>
                <p class="font-bold text-sm text-slate-900 dark:text-white">${acc.name}</p>
                <p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">${Utils.formatIDR(acc.balance)}</p>
            </div>
        `;
        dropdown.appendChild(item);
    });
};

export const toggleAccountDropdown = () => {
    const dropdown = document.getElementById('account-selector-dropdown');
    if (!dropdown) return;

    dropdown.classList.toggle('hidden');

    // Close when clicking outside
    if (!dropdown.classList.contains('hidden')) {
        const closeMenu = (e) => {
            if (!e.target.closest('#account-selector-dropdown') && !e.target.closest('#account-selector-trigger')) {
                dropdown.classList.add('hidden');
                document.removeEventListener('click', closeMenu);
            }
        };
        setTimeout(() => document.addEventListener('click', closeMenu), 10);
    }
};

export const selectAccount = (id) => {
    const hiddenInput = document.getElementById('transaction-account');
    const trigger = document.getElementById('account-selector-trigger');
    const dropdown = document.getElementById('account-selector-dropdown');

    const acc = Store.accounts.find(a => a.id === id);
    if (!acc || !hiddenInput || !trigger) return;

    hiddenInput.value = acc.id;

    let icon = 'account_balance';
    if (acc.type === 'Cash') icon = 'payments';
    if (acc.type === 'E-Wallet') icon = 'account_balance_wallet';
    if (acc.type === 'Credit Card') icon = 'credit_card';

    trigger.innerHTML = `
        <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-${acc.color || 'indigo'}-500/10 flex items-center justify-center text-${acc.color || 'indigo'}-500">
                <span class="material-symbols-outlined text-lg">${icon}</span>
            </div>
            <div class="text-left">
                <p class="font-bold text-sm text-slate-900 dark:text-white leading-tight">${acc.name}</p>
                <p class="text-[10px] font-bold text-slate-500 uppercase tracking-wider leading-tight">${Utils.formatIDR(acc.balance)}</p>
            </div>
        </div>
        <span class="material-symbols-outlined text-slate-400">expand_more</span>
    `;

    if (dropdown) dropdown.classList.add('hidden');
};


/**
 * Quick Add Modal Logic
 */
export const openQuickAddModal = (type) => {
    const modal = document.getElementById('quick-add-modal');
    const title = document.getElementById('quick-add-title');
    const icon = document.getElementById('quick-add-icon');
    const iconBg = document.getElementById('quick-add-icon-bg');
    const typeInput = document.getElementById('quick-add-type');
    const submitBtn = document.getElementById('quick-add-submit-btn');
    const contactContainer = document.getElementById('quick-add-contact-container');

    if (!modal || !title || !typeInput) return;

    // Reset Form
    document.getElementById('quick-add-form').reset();
    document.getElementById('quick-add-account-id').value = '';
    document.getElementById('quick-account-label').innerText = 'Select Account...';
    document.getElementById('quick-add-date').value = new Date().toISOString().split('T')[0];

    // Setup Type Specific UI
    typeInput.value = type;
    contactContainer.style.display = (type === 'debt' || type === 'receivable') ? 'block' : 'none';

    let colorClass = 'indigo';
    let iconName = 'add_circle';
    let titleText = 'Add Income';

    if (type === 'expense') {
        colorClass = 'rose';
        iconName = 'remove_circle';
        titleText = 'Record Expense';
    } else if (type === 'debt') {
        colorClass = 'purple';
        iconName = 'history_edu';
        titleText = 'Add Debt';
    } else if (type === 'receivable') {
        colorClass = 'teal';
        iconName = 'account_balance_wallet';
        titleText = 'Add Receivable';
    }

    title.innerText = titleText;
    icon.innerText = iconName;
    iconBg.className = `w-12 h-12 bg-${colorClass}-500/10 rounded-2xl flex items-center justify-center text-${colorClass}-400`;
    submitBtn.className = `w-full py-5 bg-${colorClass}-500 hover:bg-${colorClass}-600 text-white font-display font-black rounded-3xl transition-all active:scale-[0.98] shadow-lg shadow-${colorClass}-500/20 flex items-center justify-center gap-2`;

    modal.classList.remove('hidden');

    // Apply Formatting (one-time listener attachment check)
    const amountInput = document.getElementById('quick-add-amount');
    if (amountInput && !amountInput.dataset.formatted) {
        Utils.applyCurrencyFormatting(amountInput);
        amountInput.dataset.formatted = "true";
    }

    populateQuickAccountSelector();
};

export const closeQuickAddModal = () => {
    const modal = document.getElementById('quick-add-modal');
    if (modal) modal.classList.add('hidden');
};

export const populateQuickAccountSelector = () => {
    const dropdown = document.getElementById('quick-account-dropdown');
    if (!dropdown) return;

    dropdown.innerHTML = '';
    Store.accounts.forEach(acc => {
        let icon = 'account_balance';
        if (acc.type === 'Cash') icon = 'payments';
        if (acc.type === 'E-Wallet') icon = 'account_balance_wallet';
        if (acc.type === 'Credit Card') icon = 'credit_card';

        const item = document.createElement('div');
        item.className = 'flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer transition-colors group';
        item.onclick = () => selectQuickAccount(acc.id);

        item.innerHTML = `
            <div class="w-8 h-8 rounded-lg bg-${acc.color || 'indigo'}-500/10 flex items-center justify-center text-${acc.color || 'indigo'}-500">
                <span class="material-symbols-outlined text-base">${icon}</span>
            </div>
            <div>
                <p class="font-bold text-xs text-slate-900 dark:text-white">${acc.name}</p>
                <p class="text-[9px] font-bold text-slate-500 uppercase">${Utils.formatIDR(acc.balance)}</p>
            </div>
        `;
        dropdown.appendChild(item);
    });
};

export const toggleQuickAccountDropdown = () => {
    const dropdown = document.getElementById('quick-account-dropdown');
    if (dropdown) dropdown.classList.toggle('hidden');
};

export const selectQuickAccount = (id) => {
    const acc = Store.accounts.find(a => a.id === id);
    if (!acc) return;

    document.getElementById('quick-add-account-id').value = acc.id;
    document.getElementById('quick-account-label').innerText = acc.name;
    document.getElementById('quick-account-dropdown').classList.add('hidden');
};

export const submitQuickTransaction = (e) => {
    e.preventDefault();

    const type = document.getElementById('quick-add-type').value;
    const amountRaw = document.getElementById('quick-add-amount').value;
    const date = document.getElementById('quick-add-date').value;
    const accountId = document.getElementById('quick-add-account-id').value;
    const category = document.getElementById('quick-add-category').value;
    const description = document.getElementById('quick-add-description').value;
    const contact = document.getElementById('quick-add-contact').value;

    // Robust parsing for formatted currency
    const amount = parseFloat(amountRaw.replace(/[^0-9]/g, ''));

    if (!amount || !accountId) {
        alert("Please fill in Amount and Select an Account");
        return;
    }

    const tData = {
        type,
        date,
        amount,
        description,
        category: category || 'General',
        accountId,
        contact: (type === 'debt' || type === 'receivable') ? contact : ''
    };

    Store.addTransaction(tData);

    // Update balance
    const balanceChange = (type === 'income' || type === 'debt') ? amount : -amount;
    Store.updateAccountBalance(accountId, balanceChange);

    // Refresh everything
    closeQuickAddModal();
    updateDashboardValues();
    renderTransactions();
    populateAccountSelector(); // Main sidebar selector if any
};


// --- Commitment Details Logic ---

let currentCommitmentId = null;
let currentInstallmentProof = null;

export const openCommitmentDetails = (id) => {
    const commitment = Store.getRecurringTransactions().find(c => c.id === id);
    if (!commitment) return;

    currentCommitmentId = id;
    const modal = document.getElementById('commitment-details-modal');

    // 1. Populate Summary
    document.getElementById('cd-title').textContent = commitment.description;
    document.getElementById('cd-remaining').textContent = Utils.formatIDR(Math.max(0, commitment.totalPrice - (commitment.paidAmount || 0) - (commitment.dpAmount || 0))); // Simplified remaining logic
    // Better remaining logic:
    const totalPaid = (commitment.completedPayments * commitment.amount) + (commitment.dpAmount || 0);
    const realRemaining = Math.max(0, commitment.totalPrice - totalPaid);
    document.getElementById('cd-remaining').textContent = Utils.formatIDR(realRemaining);

    document.getElementById('cd-amount').textContent = Utils.formatIDR(commitment.amount);

    const nextDate = new Date(commitment.lastProcessed);
    if (commitment.frequency === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1);
    else if (commitment.frequency === 'weekly') nextDate.setDate(nextDate.getDate() + 7);
    document.getElementById('cd-next-due').textContent = nextDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

    // Progress Bar
    const percent = Math.min(100, Math.round((commitment.completedPayments / commitment.tenor) * 100));
    document.getElementById('cd-percentage').textContent = `${percent}%`;
    document.getElementById('cd-progress-bar').style.width = `${percent}%`;
    document.getElementById('cd-paid-count').textContent = `${commitment.completedPayments} Paid`;
    document.getElementById('cd-tenor-count').textContent = `${commitment.tenor} Total`;

    // 2. Render History
    renderCommitmentHistory(id);

    // 3. Show Modal
    if (modal) modal.classList.remove('hidden');
};

const renderCommitmentHistory = (id) => {
    const list = document.getElementById('cd-history-list');
    if (!list) return;

    // Filter transactions linked to this commitment
    const history = Store.transactions.filter(t => t.recurringId === id).sort((a, b) => new Date(b.date) - new Date(a.date));

    list.innerHTML = '';
    if (history.length === 0) {
        list.innerHTML = `
            <div class="text-center py-12 opacity-30">
                <span class="material-symbols-outlined text-4xl mb-3">history</span>
                <p class="text-xs font-bold uppercase tracking-widest">No Payment History</p>
            </div>`;
        return;
    }

    history.forEach((t, index) => {
        const item = document.createElement('div');
        item.className = 'p-4 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between group hover:bg-white/10 transition-colors';

        item.innerHTML = `
            <div class="flex items-center gap-4">
                <div class="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500 font-black text-xs">
                    #${history.length - index}
                </div>
                <div>
                    <p class="text-sm font-bold text-white">Installment Payment</p>
                    <p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">${new Date(t.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                </div>
            </div>
            <div class="flex items-center gap-4">
                <span class="text-sm font-black text-white">${Utils.formatIDR(t.amount)}</span>
                ${t.attachment ?
                `<button onclick="window.FinancialApp.viewReceipt(${t.id})" class="p-2 text-indigo-400 hover:text-white transition-colors" title="View Proof">
                        <span class="material-symbols-outlined text-lg">receipt_long</span>
                    </button>` : ''}
            </div>
        `;
        list.appendChild(item);
    });
};

export const closeCommitmentDetails = () => {
    const modal = document.getElementById('commitment-details-modal');
    if (modal) modal.classList.add('hidden');
    currentCommitmentId = null;
};

// --- Upload Proof Logic ---

export const handleInstallmentUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        currentInstallmentProof = e.target.result;

        // Show confirmation modal
        const previewModal = document.getElementById('installment-upload-modal');
        const previewImg = document.getElementById('cd-preview-img');
        if (previewModal && previewImg) {
            previewImg.src = currentInstallmentProof;
            previewModal.classList.remove('hidden');
        }
    };
    reader.readAsDataURL(file);
};

export const submitInstallmentPayment = () => {
    if (!currentCommitmentId) return;

    const commitment = Store.getRecurringTransactions().find(c => c.id === currentCommitmentId);
    if (!commitment) return;

    // 1. Create Transaction (Expense)
    Store.addTransaction({
        type: 'expense',
        date: new Date().toISOString().split('T')[0],
        amount: commitment.amount,
        description: `Installment: ${commitment.description}`,
        category: commitment.category,
        accountId: commitment.accountId,
        recurringId: commitment.id,
        attachment: currentInstallmentProof
    });

    // 2. Update Balance
    Store.updateAccountBalance(commitment.accountId, -commitment.amount);

    // 3. Update Commitment Progress
    const newCount = (commitment.completedPayments || 0) + 1;
    Store.updateRecurringTransaction(commitment.id, {
        completedPayments: newCount,
        lastProcessed: new Date().toISOString()
    });

    // 4. Checking for completion (optional logic)
    if (commitment.tenor > 0 && newCount >= commitment.tenor) {
        alert("Congratulations! Commitment Completed.");
    }

    // 5. Cleanup & Refresh
    document.getElementById('installment-upload-modal').classList.add('hidden');
    document.getElementById('cd-upload-input').value = '';
    currentInstallmentProof = null;

    // Refresh Views
    openCommitmentDetails(currentCommitmentId); // Re-render details
    renderTransactions(); // Refresh main list
    renderCommitmentsCard(); // Refresh dashboard card
    updateDashboardValues(); // Refresh totals
};

/**
 * Export Transactions to CSV
 */
export const exportToCSV = () => {
    if (Store.transactions.length === 0) {
        alert("No transactions to export.");
        return;
    }

    const headers = ['Date', 'Description', 'Type', 'Category', 'Contact', 'Amount'];
    const rows = Store.transactions.map(t => [
        `"${t.date}"`, `"${t.description.replace(/"/g, '""')}"`, `"${t.type}"`,
        `"${(t.category || '').replace(/"/g, '""')}"`, `"${(t.contact || '').replace(/"/g, '""')}"`, t.amount
    ]);

    let csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `financial_app_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
