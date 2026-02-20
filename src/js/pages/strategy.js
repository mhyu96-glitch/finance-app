/**
 * Strategy Page Logic - Financial calculators and projections
 */
import * as Store from '../store.js';
import * as Utils from '../utils.js';

let retirementChart = null;

export const init = () => {
    if (!document.getElementById('ef-months-slider')) return;

    updateEF();
    calculateRetirement();
    renderDebtSnowball();
    updateFIRE();
    renderGoals();
};

export const updateFIRE = () => {
    const fireTargetEl = document.getElementById('fire-target');
    const fireProgressEl = document.getElementById('fire-progress-bar');
    const fireStatusEl = document.getElementById('fire-status-text');
    const fireAnnualEl = document.getElementById('fire-annual-expenses');

    if (!fireTargetEl) return;

    // 1. Calculate Annual Expenses (Last 3 months avg * 12)
    const now = new Date();
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const expenses = Store.transactions.filter(t => t.type === 'expense' && new Date(t.date) >= threeMonthsAgo);
    const totalExp = expenses.reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const avgMonthly = totalExp > 0 ? totalExp / 3 : 2500000;
    const annualExp = avgMonthly * 12;

    // 2. FIRE Number (25x Rule)
    const fireNumber = annualExp * 25;

    // 3. Current Liquid Assets
    const liquidBalance = Store.accounts
        .filter(a => a.type === 'Bank' || a.type === 'E-Wallet' || a.type === 'Cash')
        .reduce((sum, a) => sum + parseFloat(a.balance), 0);

    const progress = Math.min((liquidBalance / fireNumber) * 100, 100);

    // Update UI
    fireTargetEl.textContent = Utils.formatIDR(fireNumber);
    fireAnnualEl.textContent = Utils.formatIDR(annualExp);
    if (fireProgressEl) fireProgressEl.style.width = `${progress}%`;
    if (fireStatusEl) fireStatusEl.textContent = `${progress.toFixed(1)}% of freedom achieved`;
};

export const updateEF = () => {
    const slider = document.getElementById('ef-months-slider');
    const monthsVal = document.getElementById('ef-months-val');
    const targetEl = document.getElementById('ef-target-amount');
    const monthlyExpEl = document.getElementById('ef-monthly-expenses');

    if (!slider) return;

    const months = parseInt(slider.value);
    monthsVal.textContent = `${months} Months`;

    // Calculate Average Monthly Expense from transactions
    const now = new Date();
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);

    const expenses = Store.transactions.filter(t => t.type === 'expense' && new Date(t.date) >= threeMonthsAgo);
    const totalExp = expenses.reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const avgMonthly = totalExp > 0 ? totalExp / 3 : 2500000; // Fallback to 2.5jt

    const target = avgMonthly * months;

    targetEl.textContent = Utils.formatIDR(target);
    monthlyExpEl.textContent = Utils.formatIDR(avgMonthly);

    // Progress Simulation (based on current liquid accounts)
    const liquidBalance = Store.accounts
        .filter(a => a.type === 'Bank' || a.type === 'E-Wallet' || a.type === 'Cash')
        .reduce((sum, a) => sum + parseFloat(a.balance), 0);

    const progress = Math.min((liquidBalance / target) * 100, 100);
    document.getElementById('ef-progress').style.width = `${progress}%`;
    document.getElementById('ef-progress-text').textContent = `${Math.round(progress)}% Saved`;
};

export const calculateRetirement = () => {
    const age = parseInt(document.getElementById('ret-age').value) || 25;
    const monthlySaving = parseFloat(document.getElementById('ret-monthly').value) || 0;
    const retirementAge = 65;
    const annualReturn = 0.10; // 10% average stock market return
    const monthlyReturn = annualReturn / 12;

    let currentBalance = Store.accounts.reduce((sum, a) => sum + parseFloat(a.balance), 0);
    const labels = [];
    const data = [];

    for (let year = age; year <= retirementAge; year++) {
        labels.push(`Age ${year}`);
        data.push(currentBalance);

        // Compound for 12 months
        for (let month = 0; month < 12; month++) {
            currentBalance = (currentBalance + monthlySaving) * (1 + monthlyReturn);
        }
    }

    document.getElementById('retirement-final').textContent = Utils.formatIDR(currentBalance);
    renderRetirementChart(labels, data);
};

const renderRetirementChart = (labels, data) => {
    const ctx = document.getElementById('retirementChart');
    if (!ctx) return;

    if (retirementChart) retirementChart.destroy();

    retirementChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Projected Net Worth',
                data: data,
                borderColor: '#6366f1',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { callback: (val) => 'Rp ' + (val / 1000000).toFixed(0) + 'M' }
                },
                x: {
                    grid: { display: false }
                }
            }
        }
    });
};

const renderDebtSnowball = () => {
    const list = document.getElementById('snowball-list');
    if (!list) return;

    // Get "Debts" (Negative balances or debt-type accounts/transactions)
    const debts = Store.transactions.filter(t => t.type === 'debt' && !t.isPaid);

    list.innerHTML = '';

    if (debts.length === 0) {
        list.innerHTML = `<p class="text-[9px] text-slate-500 italic mt-4">Safe zone. Tidak ada hutang terdeteksi.</p>`;
        return;
    }

    // Sort by smallest balance (Snowball Method)
    const sorted = [...debts].sort((a, b) => a.amount - b.amount);

    sorted.forEach((debt, index) => {
        const item = document.createElement('div');
        item.className = "flex items-center justify-between p-3 bg-black/5 dark:bg-white/5 rounded-xl border border-white/5 mb-2";
        item.innerHTML = `
            <div class="flex flex-col">
                <span class="text-[11px] font-bold text-slate-900 dark:text-white">${debt.provider || debt.name}</span>
                <span class="text-[9px] text-slate-500 uppercase tracking-widest">Priority ${index + 1}</span>
            </div>
            <span class="text-[11px] font-black text-rose-500">${Utils.formatIDR(debt.amount)}</span>
        `;
        list.appendChild(item);
    });
};

/**
 * Render Savings Goals & Wishlist
 */
export const renderGoals = () => {
    const goalsContainer = document.getElementById('goals-container');
    if (!goalsContainer) return;

    const goals = Store.goals;
    goalsContainer.innerHTML = '';

    if (goals.length === 0) {
        goalsContainer.innerHTML = `
            <div class="col-span-full py-20 text-center glass border-dashed border-2 border-white/10 rounded-[2.5rem]">
                <span class="material-symbols-outlined text-5xl text-slate-300 dark:text-white/10 mb-4">stars</span>
                <p class="text-slate-500 text-sm font-bold uppercase tracking-widest">No goals set yet</p>
                <button onclick="document.getElementById('add-goal-modal').classList.remove('hidden')" class="mt-4 text-primary text-[10px] font-black uppercase tracking-widest hover:underline">Start your first goal</button>
            </div>
        `;
        return;
    }

    // Get liquid balance to show progress
    const liquidBalance = Store.accounts
        .filter(a => a.type === 'Bank' || a.type === 'E-Wallet' || a.type === 'Cash')
        .reduce((sum, a) => sum + parseFloat(a.balance), 0);

    goals.forEach(goal => {
        const progress = Math.min((liquidBalance / goal.target) * 100, 100);
        const isCompleted = progress >= 100;

        const goalCard = document.createElement('div');
        goalCard.className = `glass p-8 rounded-[2.5rem] group hover-lift border border-black/5 dark:border-white/5 relative overflow-hidden transition-all duration-700`;
        goalCard.innerHTML = `
            <div class="absolute top-0 right-0 w-40 h-40 ${isCompleted ? 'bg-emerald-500/10' : 'bg-primary/5'} blur-[60px] rounded-full -mr-20 -mt-20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            
            <div class="flex justify-between items-start mb-10 relative z-10">
                <div class="w-14 h-14 ${isCompleted ? 'bg-emerald-500/10 text-emerald-500' : 'bg-indigo-500/10 text-indigo-500'} rounded-2xl flex items-center justify-center">
                    <span class="material-symbols-outlined">${isCompleted ? 'workspace_premium' : 'auto_awesome'}</span>
                </div>
                <button onclick="FinancialApp.removeGoal(${goal.id})" class="p-2 text-slate-300 hover:text-rose-500 transition-colors">
                    <span class="material-symbols-outlined text-sm">delete</span>
                </button>
            </div>

            <div class="relative z-10">
                <h4 class="text-xl font-display font-black text-slate-900 dark:text-white tracking-tight mb-2 uppercase">${goal.name}</h4>
                <div class="flex items-baseline gap-2 mb-8">
                    <span class="text-2xl font-black text-slate-900 dark:text-white">${Utils.formatIDR(goal.target)}</span>
                    <span class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Target</span>
                </div>

                <div class="space-y-3">
                    <div class="flex justify-between items-end text-[10px] font-black uppercase tracking-widest">
                        <span class="${isCompleted ? 'text-emerald-500' : 'text-slate-500'}">${isCompleted ? 'Goal Reached' : 'Progress'}</span>
                        <span class="text-slate-900 dark:text-white">${progress.toFixed(1)}%</span>
                    </div>
                    <div class="h-2 w-full bg-black/5 dark:bg-white/5 rounded-full overflow-hidden p-[1px]">
                        <div class="h-full ${isCompleted ? 'bg-emerald-500' : 'bg-indigo-500'} rounded-full transition-all duration-1000" style="width: ${progress}%"></div>
                    </div>
                </div>
                
                <p class="mt-6 text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-relaxed">
                    ${isCompleted ? 'You have enough liquid funds for this goal!' : `Requires Rp ${Utils.formatNumber(goal.target - liquidBalance)} more to reach target`}
                </p>
            </div>
        `;
        goalsContainer.appendChild(goalCard);
    });
};

/**
 * Handle Add Goal Submission
 */
export const handleAddGoal = (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);

    const goal = {
        name: formData.get('name'),
        target: Utils.parseIDR(formData.get('target'))
    };

    Store.addGoal(goal);
    document.getElementById('add-goal-modal').classList.add('hidden');
    event.target.reset();
    renderGoals();
};

/**
 * Handle Remove Goal
 */
export const removeGoal = (id) => {
    if (confirm('Are you sure you want to remove this goal?')) {
        Store.removeGoal(id);
        renderGoals();
    }
};
