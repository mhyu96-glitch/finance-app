/**
 * Budgets Page Logic
 */
import * as Store from '../store.js';
import * as Utils from '../utils.js';

/**
 * Initialize Budgets Page
 */
export const init = () => {
    if (!document.getElementById('budgets-container')) return;
    render();
    initForm();
};

/**
 * Render Budget Cards
 */
export const render = () => {
    const container = document.getElementById('budgets-container');
    const emptyState = document.getElementById('budgets-empty');
    if (!container) return;

    container.innerHTML = '';

    // Calculate spent per category for CURRENT MONTH
    const categorySpend = {};
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    Store.transactions
        .filter(t => t.type === 'expense' && new Date(t.date) >= startOfMonth)
        .forEach(t => {
            categorySpend[t.category] = (categorySpend[t.category] || 0) + t.amount;
        });

    if (Store.budgets.length === 0) {
        container.classList.add('hidden');
        if (emptyState) emptyState.classList.remove('hidden');
        return;
    } else {
        container.classList.remove('hidden');
        if (emptyState) emptyState.classList.add('hidden');
    }

    Store.budgets.forEach((b, index) => {
        const spent = categorySpend[b.category] || 0;
        const pct = b.limit > 0 ? Math.round((spent / b.limit) * 100) : 0;

        let color = 'indigo';
        let statusText = 'Strategic';
        let isCritical = false;

        if (pct >= 100) {
            color = 'rose';
            statusText = 'Limit Breach';
            isCritical = true;
        } else if (pct >= 80) {
            color = 'amber';
            statusText = 'Boundary Watch';
        }

        const staggerClass = `stagger-${Math.min(6, (index % 6) + 1)}`;
        const card = document.createElement('div');
        card.className = `glass p-8 rounded-[2.5rem] border-white/5 relative group overflow-hidden transition-all duration-700 hover:bg-slate-50/80 dark:hover:bg-white/[0.05] hover:shadow-[0_20px_50px_-12px_rgba(99,102,241,0.1)] hover:-translate-y-1.5 animate-fade-in-up ${staggerClass} ${isCritical ? 'ring-2 ring-rose-500/20 shadow-lg shadow-rose-500/5' : ''}`;
        card.innerHTML = `
            <div class="absolute top-0 right-0 w-40 h-40 bg-${color}-500/5 blur-[80px] rounded-full -mr-20 -mt-20 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
            <div class="relative z-10">
                <div class="flex justify-between items-start mb-8">
                    <div>
                        <div class="flex items-center gap-3 mb-3">
                            <p class="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.3em]">${b.category}</p>
                            ${pct >= 80 ? `<span class="flex h-2 w-2 rounded-full bg-${color}-500 animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.6)]"></span>` : ''}
                        </div>
                        <h3 class="text-3xl font-display font-black text-slate-900 dark:text-white tracking-tighter drop-shadow-sm">${Utils.formatIDR(b.limit)}</h3>
                    </div>
                    <div class="flex items-center gap-3">
                        <div class="px-3 py-1.5 bg-${color}-500/10 text-${color}-500 dark:border-${color}-500/20 border border-transparent rounded-xl text-[9px] font-black uppercase tracking-widest shadow-sm">
                            ${statusText}
                        </div>
                        <button onclick="window.FinancialApp.deleteBudget(${b.id})" class="p-2.5 glass border-black/5 dark:border-white/5 text-slate-400 hover:text-rose-500 rounded-xl transition-all active:scale-90">
                            <span class="material-symbols-outlined text-base font-bold">delete</span>
                        </button>
                    </div>
                </div>
                <div class="space-y-6">
                    <div class="flex justify-between items-end">
                        <p class="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Real-time Cycle Spend</p>
                        <p class="text-xs font-black text-slate-900 dark:text-white tracking-tighter">${Utils.formatIDR(spent)} <span class="text-slate-400 dark:text-slate-500 font-bold ml-1">(${pct}%)</span></p>
                    </div>
                    <div class="h-2.5 w-full bg-black/5 dark:bg-white/5 rounded-full overflow-hidden relative p-[1.5px]">
                        <div class="h-full bg-${color}-500 rounded-full transition-all duration-1000 shadow-lg relative" style="width: ${Math.min(100, pct)}%">
                            <div class="absolute inset-0 w-full animate-shimmer" style="background-size: 200% 100%; background-image: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);"></div>
                        </div>
                    </div>
                     <div class="flex justify-between items-center text-[9px] font-black uppercase tracking-[0.2em] pt-2">
                          <span class="${pct >= 100 ? 'text-rose-500' : 'text-slate-500 dark:text-slate-400'} flex items-center gap-1.5">
                              <span class="material-symbols-outlined text-[12px]">${pct >= 100 ? 'error' : 'shield'}</span>
                              ${pct >= 100 ? 'Limit Exceeded' : (100 - pct) + '% Fractal Left'}
                          </span>
                          <span class="text-slate-900 dark:text-white opacity-80 sensitive-data">${Utils.formatIDR(Math.max(0, b.limit - spent))} Safe</span>
                     </div>
                 </div>
                 
                 <!-- Project Finish (Forecasting) -->
                 <div class="mt-8 pt-6 border-t border-black/5 dark:border-white/5 flex items-center justify-between">
                     <div class="flex items-center gap-2">
                         <div class="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                             <span class="material-symbols-outlined text-sm">auto_graph</span>
                         </div>
                         <div>
                             <p class="text-[8px] font-black text-slate-500 uppercase tracking-widest">Projection</p>
                             <p class="text-[10px] font-bold text-slate-900 dark:text-white">${getProjectedFinishText(spent, b.limit)}</p>
                         </div>
                     </div>
                     <div class="text-right">
                         <p class="text-[8px] font-black text-slate-500 uppercase tracking-widest">Burn Rate</p>
                         <p class="text-[10px] font-bold text-slate-900 dark:text-white sensitive-data">${getDailyBurnRate(spent)}/day</p>
                     </div>
                 </div>
             </div>
         `;
        container.appendChild(card);
    });
};

/**
 * Initialize Budget Form
 */
const initForm = () => {
    const form = document.getElementById('add-budget-form');
    if (!form) return;

    Utils.applyDotFormatting(document.getElementById('budget-limit'));

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const category = document.getElementById('budget-category')?.value;
        const limitRaw = document.getElementById('budget-limit')?.value || '0';
        const limit = parseFloat(limitRaw.replace(/\./g, ''));

        if (!category || isNaN(limit) || limit <= 0) {
            alert("Please enter valid details (Category and Limit)");
            return;
        }

        Store.addBudget({ category: category.trim(), limit });
        render();
        closeModal();
    });
};

/**
 * Modal Controls
 */
export const openModal = () => {
    const modal = document.getElementById('budget-modal');
    if (modal) {
        modal.classList.remove('hidden');
        document.getElementById('budget-category').focus();
    }
};

export const closeModal = () => {
    const modal = document.getElementById('budget-modal');
    if (modal) modal.classList.add('hidden');
    document.getElementById('add-budget-form').reset();
};

/**
 * Forecasting Helpers
 */
const getDailyBurnRate = (spent) => {
    const now = new Date();
    const day = now.getDate();
    const rate = day > 0 ? spent / day : 0;
    return Utils.formatIDR(rate);
};

const getProjectedFinishText = (spent, limit) => {
    if (spent === 0) return 'No spending yet';
    const now = new Date();
    const day = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

    const dailyRate = spent / day;
    const remainingLimit = limit - spent;

    if (remainingLimit <= 0) return 'Budget Depleted';

    const remainingDaysProjected = remainingLimit / dailyRate;
    const projectedDay = Math.floor(day + remainingDaysProjected);

    if (projectedDay > daysInMonth) return 'Safe for the month';

    const projectedDate = new Date(now.getFullYear(), now.getMonth(), projectedDay);
    return `Finish by ${projectedDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}`;
};

/**
 * Handle Budget Deletion
 */
export const deleteBudget = (id) => {
    if (confirm('Are you sure you want to delete this budget?')) {
        Store.removeBudget(id);
        render();
    }
};
