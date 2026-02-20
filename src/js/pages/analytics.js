/**
 * Analytics Page Logic
 */
import * as Store from '../store.js';
import * as Utils from '../utils.js';
import * as Charts from '../charts.js';

let currentDate = new Date();

/**
 * Change Month
 * @param {number} offset - -1 for previous, 1 for next
 */
export const changeMonth = (offset) => {
    currentDate.setMonth(currentDate.getMonth() + offset);
    init(); // Re-render with new date
};

/**
 * Initialize Analytics
 */
export const init = () => {
    const totalSpendEl = document.getElementById('analytics-total-spend');
    if (!totalSpendEl) return;

    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    // For average calculation: if current month, use today's date. If past month, use total days.
    const now = new Date();
    const isCurrentMonth = currentMonth === now.getMonth() && currentYear === now.getFullYear();
    const currentDay = isCurrentMonth ? now.getDate() : daysInMonth;

    // Set Date Range Text
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const rangeText = document.getElementById('date-range-display');
    const rangeTitle = document.getElementById('analytics-period-title');

    // Update Header Date Display
    if (rangeTitle) rangeTitle.innerText = `${monthNames[currentMonth]} ${currentYear}`;
    if (rangeText) rangeText.innerText = `${monthNames[currentMonth]} 1 - ${daysInMonth}, ${currentYear}`;

    // Filter month expenses
    const monthExpenses = Store.transactions.filter(t => {
        const d = new Date(t.date);
        return t.type === 'expense' && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    // 1. Calculate Metrics
    const totalSpend = monthExpenses.reduce((acc, t) => acc + t.amount, 0);
    const avgDaily = currentDay > 0 ? totalSpend / currentDay : 0;

    // Top Category
    const categoryTotals = {};
    monthExpenses.forEach(t => {
        categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
    });

    let topCat = '-', maxVal = 0;
    for (const [cat, val] of Object.entries(categoryTotals)) {
        if (val > maxVal) { maxVal = val; topCat = cat; }
    }

    // Budget Utilization
    const totalBudgetLimit = Store.budgets.reduce((acc, b) => acc + b.limit, 0);
    let utilization = 0;
    if (totalBudgetLimit > 0) utilization = Math.round((totalSpend / totalBudgetLimit) * 100);

    // Update DOM Metrics
    const avgDailyEl = document.getElementById('analytics-avg-daily');
    const topCatEl = document.getElementById('analytics-top-category');
    const topCatValEl = document.getElementById('analytics-top-category-val');

    if (totalSpendEl) totalSpendEl.innerText = Utils.formatIDR(totalSpend);
    if (avgDailyEl) avgDailyEl.innerText = Utils.formatIDR(avgDaily);
    if (topCatEl) topCatEl.innerText = topCat;
    if (topCatValEl) topCatValEl.innerText = Utils.formatIDR(maxVal);

    // Update Gauge/Ring or Progress Bar
    // We will use a progress bar for now as per previous design, can be upgraded to ring in html
    const utilEl = document.getElementById('analytics-budget-utilization');
    const utilBar = document.getElementById('analytics-budget-bar');
    if (utilEl) utilEl.innerText = `${utilization}%`;
    if (utilBar) {
        utilBar.style.width = `${Math.min(utilization, 100)}%`;
        utilBar.className = `h-full rounded-full transition-all duration-1000 ${utilization > 100 ? 'bg-rose-500' : 'bg-primary'}`;
    }

    // 2. Trend Data
    const dailyTotals = {};
    monthExpenses.forEach(t => {
        const day = new Date(t.date).getDate();
        dailyTotals[day] = (dailyTotals[day] || 0) + t.amount;
    });

    const trendLabels = [];
    const trendData = [];
    for (let i = 1; i <= daysInMonth; i++) {
        trendLabels.push(`${monthNames[currentMonth]} ${i}`);
        trendData.push(dailyTotals[i] || 0);
    }

    // 3. Render Charts
    Charts.initAnalyticsCharts(categoryTotals, totalSpend, trendLabels, trendData);

    // 4. Render Custom Legend
    renderCategoryLegend(categoryTotals, totalSpend);

    // 5. Render Budget List (Compliance Monitor)
    renderBudgetCompliance(categoryTotals);

    // 6. Init Cash Flow Forecast
    initCashFlowForecast();

    // 7. Init Net Worth Tracker
    // 7. Init Net Worth Tracker
    initNetWorthTracker();

    // 8. Render Investment Portfolio Deep-Dive
    renderInvestmentPortfolio();
};

/**
 * Handle Add Investment Form Submission
 */
export const handleAddInvestment = (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    const investment = {
        name: formData.get('name'),
        type: formData.get('type'),
        quantity: parseFloat(formData.get('quantity')),
        price: Utils.parseIDR(formData.get('price')),
        buy_price: formData.get('buy_price') ? Utils.parseIDR(formData.get('buy_price')) : null
    };

    Store.addInvestment(investment);
    document.getElementById('add-investment-modal').classList.add('hidden');
    event.target.reset();

    // Re-render
    renderInvestmentPortfolio();
    initNetWorthTracker(); // Update global net worth

    // Notification
    const notificationCenter = document.getElementById('notification-center-panel');
    if (notificationCenter) {
        // We'll simulate a push notification here if the UI module is loaded, 
        // but for now just console log or basic alert if needed.
        console.log("Asset Added:", investment.name);
    }
};

/**
 * Render Investment Portfolio (Chart & Grid)
 */
const renderInvestmentPortfolio = () => {
    const assetList = document.getElementById('investment-list-body');
    const totalEl = document.getElementById('analytics-total-invested');

    if (!assetList || !Store.investments) return;

    assetList.innerHTML = '';
    const investments = Store.investments;

    // Calculate Totals per Type for Chart
    const typeTotals = {};
    let totalPortfolioValue = 0;

    investments.forEach(inv => {
        const currentValue = inv.quantity * inv.price;
        totalPortfolioValue += currentValue;
        typeTotals[inv.type] = (typeTotals[inv.type] || 0) + currentValue;

        // Calculate ROI if buy price exists
        let roiHtml = '<span class="text-slate-400">-</span>';
        if (inv.buy_price) {
            const initialValue = inv.quantity * inv.buy_price;
            const profit = currentValue - initialValue;
            const roiPercent = (profit / initialValue) * 100;
            const isPositive = profit >= 0;

            roiHtml = `
                <div class="flex flex-col items-end">
                    <span class="text-[10px] font-bold ${isPositive ? 'text-emerald-500' : 'text-rose-500'}">
                        ${isPositive ? '+' : ''}${roiPercent.toFixed(1)}%
                    </span>
                    <span class="text-[9px] text-slate-400 uppercase">
                        ${isPositive ? '+' : ''}${Utils.formatIDR(profit)}
                    </span>
                </div>
            `;
        }

        const row = document.createElement('tr');
        row.className = "group hover:bg-white/5 transition-colors border-b border-white/5 last:border-0";
        row.innerHTML = `
            <td class="py-3 pl-2">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 text-slate-400 group-hover:bg-indigo-500 group-hover:text-white transition-all">
                        <span class="material-symbols-outlined text-base">
                            ${getAssetIcon(inv.type)}
                        </span>
                    </div>
                    <div>
                        <p class="font-bold text-slate-900 dark:text-white text-xs">${inv.name}</p>
                        <p class="text-[9px] font-bold text-slate-500 uppercase tracking-wider">${inv.quantity} Units</p>
                    </div>
                </div>
            </td>
            <td class="py-3">
                <span class="px-2 py-1 rounded-md bg-white/5 text-[9px] font-bold uppercase tracking-widest text-slate-500 border border-white/10">
                    ${inv.type.replace('_', ' ')}
                </span>
            </td>
            <td class="py-3 text-right">
                <p class="font-bold text-slate-900 dark:text-white text-sm sensitive-data">${Utils.formatIDR(currentValue)}</p>
                <p class="text-[9px] text-slate-500 uppercase">@ ${Utils.formatIDR(inv.price)}</p>
            </td>
            <td class="py-3 text-right">${roiHtml}</td>
            <td class="py-3 text-center">
                <button onclick="deleteInvestment(${inv.id})" class="p-1.5 hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 rounded-lg transition-colors">
                    <span class="material-symbols-outlined text-sm">delete</span>
                </button>
            </td>
        `;
        assetList.appendChild(row);
    });

    if (investments.length === 0) {
        assetList.innerHTML = `<tr><td colspan="5" class="py-8 text-center text-xs font-bold text-slate-500 uppercase tracking-widest opacity-50">No assets in portfolio</td></tr>`;
    }

    // Update Total Display
    if (totalEl) totalEl.innerText = Utils.formatIDR(totalPortfolioValue);

    // Render Allocation Chart
    Charts.initInvestmentChart(typeTotals);
};

// Global delete function
window.deleteInvestment = (id) => {
    if (confirm('Remove this asset from portfolio?')) {
        Store.removeInvestment(id);
        renderInvestmentPortfolio();
        initNetWorthTracker();
    }
};

const getAssetIcon = (type) => {
    const map = {
        stock: 'show_chart',
        crypto: 'currency_bitcoin',
        gold: 'savings',
        mutual_fund: 'pie_chart',
        real_estate: 'domain'
    };
    return map[type] || 'attach_money';
};

/**
 * 30-Day Cash Flow Projection Logic
 */
const initCashFlowForecast = () => {
    const totals = Store.getTotals();
    const currentBalance = totals.realBalance;
    const now = new Date();

    // Calculate average daily burn rate from last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const last30DaysExpenses = Store.transactions.filter(t => {
        const d = new Date(t.date);
        return t.type === 'expense' && d >= thirtyDaysAgo && d <= now;
    });

    const totalSpent30Days = last30DaysExpenses.reduce((sum, t) => sum + t.amount, 0);
    const avgDailyBurn = totalSpent30Days / 30;

    // Projection Data
    const labels = [];
    const data = [];
    let projectedBalance = currentBalance;

    for (let i = 1; i <= 30; i++) {
        const projectionDate = new Date();
        projectionDate.setDate(now.getDate() + i);

        // Subtract average daily burn
        projectedBalance -= avgDailyBurn;

        // Check for recurring transactions on this date
        const recurringToday = Store.recurringTransactions.filter(r => {
            const nextDate = new Date(r.nextDate);
            return nextDate.getDate() === projectionDate.getDate() &&
                nextDate.getMonth() === projectionDate.getMonth() &&
                nextDate.getFullYear() === projectionDate.getFullYear();
        });

        recurringToday.forEach(r => {
            if (r.type === 'expense') projectedBalance -= r.amount;
            else projectedBalance += r.amount;
        });

        labels.push(projectionDate.toLocaleDateString('default', { month: 'short', day: 'numeric' }));
        data.push(projectedBalance);
    }

    Charts.initForecastChart(labels, data);
};

/**
 * Net Worth Tracker Logic
 */
const initNetWorthTracker = () => {
    const totals = Store.getTotals();
    const assets = totals.realBalance;
    const liabilities = totals.activeDebt;
    const netWorth = assets - liabilities;

    // Update UI
    const netWorthEl = document.getElementById('analytics-net-worth');
    if (netWorthEl) netWorthEl.innerText = Utils.formatIDR(netWorth);

    // Simulate Net Worth Trend (Last 6 Months)
    const labels = [];
    const data = [];
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        labels.push(monthNames[d.getMonth()]);

        // Randomly simulate growth/fluctuation for demo purposes
        const variance = (Math.random() - 0.5) * 0.1; // +/- 5%
        const simulatedNW = netWorth * (1 - (i * 0.05) + variance);
        data.push(simulatedNW);
    }

    Charts.initNetWorthChart(labels, data);
};

/**
 * Render Custom HTML Legend for Category Split
 */
const renderCategoryLegend = (categoryTotals, totalSpend) => {
    const container = document.getElementById('category-legend-container');
    if (!container) return;

    container.innerHTML = '';
    const categories = Object.keys(categoryTotals);

    const colors = [
        '#6366f1', '#2dd4bf', '#f59e0b', '#f43f5e', '#8b5cf6', '#ec4899'
    ];

    categories.forEach((cat, index) => {
        const color = colors[index % colors.length];
        const val = categoryTotals[cat];
        const pct = totalSpend > 0 ? Math.round((val / totalSpend) * 100) : 0;

        const item = document.createElement('div');
        item.className = 'flex items-center gap-4 group cursor-default p-3 rounded-2xl hover:bg-white/50 dark:hover:bg-white/[0.05] transition-all duration-500 border border-transparent hover:border-black/5 dark:hover:border-white/5';
        item.innerHTML = `
            <div class="w-1.5 h-8 rounded-full shrink-0 shadow-lg" style="background-color: ${color}; filter: drop-shadow(0 0 4px ${color}80);"></div>
            <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between gap-2 overflow-hidden mb-1">
                    <p class="text-[11px] font-black text-slate-700 dark:text-slate-300 truncate lowercase tracking-tight">${cat}</p>
                    <span class="text-[9px] font-black text-indigo-500 bg-indigo-500/5 dark:bg-indigo-400/10 px-2 py-0.5 rounded-lg border border-indigo-500/10">${pct}%</span>
                </div>
                <p class="text-[10px] font-bold text-slate-500 dark:text-slate-500 tracking-tighter opacity-80 sensitive-data">${Utils.formatIDR(val)}</p>
            </div>
        `;
        container.appendChild(item);
    });
};

/**
 * Render Budget Compliance List
 */
const renderBudgetCompliance = (categoryTotals) => {
    const budgetList = document.getElementById('analytics-budget-list');
    if (!budgetList) return;

    budgetList.innerHTML = '';
    if (Store.budgets.length === 0) {
        budgetList.innerHTML = '<p class="text-sm text-slate-400 font-bold uppercase tracking-widest opacity-50 px-6">No budgets active.</p>';
        return;
    }

    Store.budgets.forEach(b => {
        const spent = categoryTotals[b.category] || 0;
        const pct = b.limit > 0 ? Math.round((spent / b.limit) * 100) : 0;

        // Optimized Color Mapping
        const colorMap = {
            indigo: { text: 'text-indigo-500', bg: 'bg-indigo-500', lightBg: 'bg-indigo-500/10', glow: 'shadow-indigo-500/20' },
            rose: { text: 'text-rose-500', bg: 'bg-rose-500', lightBg: 'bg-rose-500/10', glow: 'shadow-rose-500/20' },
            amber: { text: 'text-amber-500', bg: 'bg-amber-500', lightBg: 'bg-amber-500/10', glow: 'shadow-amber-500/20' }
        };

        let theme = colorMap.indigo;
        if (pct >= 100) theme = colorMap.rose;
        else if (pct >= 80) theme = colorMap.amber;

        const item = document.createElement('div');
        item.className = 'glass p-8 rounded-[2.5rem] group border border-black/5 dark:border-white/5 hover:bg-slate-50/80 dark:hover:bg-white/[0.05] transition-all duration-700 relative overflow-hidden hover:-translate-y-1.5 hover:shadow-2xl';
        item.innerHTML = `
            <div class="absolute top-0 right-0 w-32 h-32 ${theme.bg}/5 blur-[60px] rounded-full -mr-16 -mt-16 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
            <div class="flex justify-between items-start mb-6 relative z-10">
                <div>
                    <p class="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.3em] mb-2">${b.category}</p>
                    <h5 class="text-sm font-black text-slate-900 dark:text-white tracking-tight">
                        <span class="sensitive-data">${Utils.formatIDR(spent)}</span>
                        <span class="text-slate-400 dark:text-slate-500 font-bold ml-1 opacity-70">/ <span class="sensitive-data">${Utils.formatIDR(b.limit)}</span></span>
                    </h5>
                </div>
                <div class="px-3 py-1.5 rounded-xl ${theme.lightBg} ${theme.text} text-[10px] font-black tracking-widest border border-current/10">
                    ${pct}%
                </div>
            </div>
            <div class="h-2 w-full bg-black/5 dark:bg-white/5 rounded-full overflow-hidden relative z-10 p-[1px]">
                <div class="h-full ${theme.bg} rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(0,0,0,0.1)]" style="width: ${Math.min(100, pct)}%"></div>
            </div>
            <div class="flex items-center gap-2 mt-4 relative z-10">
                <span class="material-symbols-outlined text-sm ${theme.text} opacity-80">${pct >= 100 ? 'warning' : 'check_circle'}</span>
                <p class="text-[10px] font-black ${pct >= 100 ? 'text-rose-500' : 'text-slate-500 dark:text-slate-400'} uppercase tracking-[0.15em] opacity-80">
                    ${pct >= 100 ? 'Threshold Violation' : (b.limit - spent > 0 ? `<span class="sensitive-data">${Utils.formatIDR(b.limit - spent)}</span>` + ' available' : 'On Target')}
                </p >
            </div >
    `;
        budgetList.appendChild(item);
    });
};

/**
 * Professional PDF Export (Bank Report Style)
 */
export const exportToPDF = () => {
    const totals = Store.getTotals();
    const now = new Date();
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    const element = document.createElement('div');
    element.className = 'p-12 bg-white text-slate-900 font-sans';
    element.style.width = '800px';

    element.innerHTML = `
    < div style = "border-bottom: 2px solid #6366f1; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: end;" >
            <div>
                <h1 style="font-size: 28px; font-weight: 800; color: #1e293b; margin: 0; letter-spacing: -1px;">FINANCIAL APP PRO</h1>
                <p style="font-size: 10px; color: #64748b; font-weight: 700; text-transform: uppercase; margin-top: 4px; letter-spacing: 1px;">Wealth Performance Statement</p>
            </div>
            <div style="text-align: right;">
                <p style="font-size: 12px; font-weight: 700; color: #1e293b;">${monthNames[now.getMonth()]} ${now.getFullYear()}</p>
                <p style="font-size: 9px; color: #94a3b8;">Generated on ${now.toLocaleString()}</p>
            </div>
        </div >

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 40px;">
            <div style="background: #f8fafc; padding: 25px; border-radius: 16px; border: 1px solid #e2e8f0;">
                <p style="font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase;">Total Portfolio Value</p>
                <div style="font-size: 32px; font-weight: 800; color: #6366f1; margin-top: 5px;">${Utils.formatIDR(totals.realBalance)}</div>
            </div>
            <div style="background: #f8fafc; padding: 25px; border-radius: 16px; border: 1px solid #e2e8f0;">
                <p style="font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase;">Active Liabilities (Debt)</p>
                <div style="font-size: 24px; font-weight: 800; color: #f43f5e; margin-top: 5px;">${Utils.formatIDR(totals.activeDebt)}</div>
            </div>
        </div>

        <h3 style="font-size: 14px; font-weight: 800; color: #1e293b; margin-bottom: 15px; text-transform: uppercase; letter-spacing: 0.5px;">Budget Compliance Monitor</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 40px;">
            <thead style="background: #f1f5f9;">
                <tr>
                    <th style="padding: 12px; text-align: left; font-size: 10px; font-weight: 800; color: #64748b; border-radius: 8px 0 0 8px;">CATEGORY</th>
                    <th style="padding: 12px; text-align: right; font-size: 10px; font-weight: 800; color: #64748b;">MONTHLY LIMIT</th>
                    <th style="padding: 12px; text-align: right; font-size: 10px; font-weight: 800; color: #64748b; border-radius: 0 8px 8px 0;">UTILIZATION</th>
                </tr>
            </thead>
            <tbody>
                ${Store.budgets.map(b => {
        const monthExpenses = Store.transactions.filter(t => {
            const d = new Date(t.date);
            return t.type === 'expense' && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && t.category === b.category;
        });
        const spent = monthExpenses.reduce((sum, t) => sum + t.amount, 0);
        const pct = Math.round((spent / b.limit) * 100);
        return `
                        <tr>
                            <td style="padding: 15px 12px; font-size: 12px; font-weight: 700; border-bottom: 1px solid #f1f5f9;">${b.category}</td>
                            <td style="padding: 15px 12px; font-size: 12px; font-weight: 700; text-align: right; border-bottom: 1px solid #f1f5f9;">${Utils.formatIDR(b.limit)}</td>
                            <td style="padding: 15px 12px; font-size: 12px; font-weight: 800; text-align: right; color: ${pct > 90 ? '#f43f5e' : '#6366f1'}; border-bottom: 1px solid #f1f5f9;">${pct}%</td>
                        </tr>
                    `;
    }).join('')}
            </tbody>
        </table>

        <h3 style="font-size: 14px; font-weight: 800; color: #1e293b; margin-bottom: 15px; text-transform: uppercase; letter-spacing: 0.5px;">Recent Activities</h3>
        <table style="width: 100%; border-collapse: collapse;">
            <thead style="background: #f1f5f9;">
                <tr>
                    <th style="padding: 12px; text-align: left; font-size: 10px; font-weight: 800; color: #64748b;">DATE</th>
                    <th style="padding: 12px; text-align: left; font-size: 10px; font-weight: 800; color: #64748b;">DESCRIPTION</th>
                    <th style="padding: 12px; text-align: right; font-size: 10px; font-weight: 800; color: #64748b;">AMOUNT</th>
                </tr>
            </thead>
            <tbody>
                ${Store.transactions.slice(0, 15).map(t => `
                    <tr>
                        <td style="padding: 12px; font-size: 11px; color: #64748b; border-bottom: 1px solid #f8fafc;">${new Date(t.date).toLocaleDateString()}</td>
                        <td style="padding: 12px; font-size: 11px; font-weight: 600; border-bottom: 1px solid #f8fafc;">${t.description}</td>
                        <td style="padding: 12px; font-size: 11px; font-weight: 700; text-align: right; color: ${t.type === 'expense' ? '#f43f5e' : '#10b981'}; border-bottom: 1px solid #f8fafc;">
                            ${t.type === 'expense' ? '-' : '+'}${Utils.formatIDR(t.amount)}
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>

        <div style="margin-top: 50px; text-align: center; font-size: 9px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 20px;">
            This report is for informational purposes only. Manage your finances wisely with Financial App Pro.
        </div>
`;

    const opt = {
        margin: 10,
        filename: `Financial_App_Report_${now.toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save();
};

/**
 * Professional Excel/CSV Export
 */
export const exportToExcel = () => {
    const now = currentDate; // Use currently viewed month
    const totals = Store.getTotals();
    const monthExpenses = Store.transactions.filter(t => {
        const d = new Date(t.date);
        return t.type === 'expense' && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });

    const totalSpend = monthExpenses.reduce((acc, t) => acc + t.amount, 0);

    const rows = [];

    // 1. Portfolio Snapshot Header
    rows.push(['FINANCIAL APP PRO ELITE FINANCIAL STATEMENT']);
    rows.push([`Period: ${now.toLocaleString('default', { month: 'long', year: 'numeric' })} `]);
    rows.push(['Generated on:', new Date().toLocaleString()]);
    rows.push([]);

    rows.push(['PORTFOLIO SNAPSHOT']);
    rows.push(['Metric', 'Value']);
    rows.push(['Total Portfolio Value', totals.realBalance]);
    rows.push(['Active Liabilities (Debt)', totals.activeDebt]);
    rows.push(['Active Receivables', totals.activeReceivable]);
    rows.push(['Monthly Expenditure', totalSpend]);
    rows.push([]);

    // 2. Budget Performance
    rows.push(['BUDGET COMPLIANCE MONITOR']);
    rows.push(['Category', 'Monthly Limit', 'Utilized Amount', 'Utilization %', 'Status']);

    Store.budgets.forEach(b => {
        const spent = monthExpenses.filter(t => t.category === b.category).reduce((sum, t) => sum + t.amount, 0);
        const pct = b.limit > 0 ? Math.round((spent / b.limit) * 100) : 0;
        let status = 'On Target';
        if (pct >= 100) status = 'Violation';
        else if (pct >= 80) status = 'Watchlist';

        rows.push([b.category, b.limit, spent, `${pct}% `, status]);
    });
    rows.push([]);

    // 3. Detailed Transaction Ledger
    rows.push(['DETAILED TRANSACTION LEDGER']);
    rows.push(['Date', 'Description', 'Type', 'Category', 'Account', 'Amount']);

    const monthTransactions = Store.transactions.filter(t => {
        const d = new Date(t.date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });

    monthTransactions.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(t => {
        rows.push([
            t.date,
            t.description.replace(/"/g, '""'),
            t.type.toUpperCase(),
            t.category || '-',
            t.account || '-',
            t.type === 'expense' ? -t.amount : t.amount
        ]);
    });

    // Generate CSV Content
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF"; // \uFEFF for Excel UTF-8 BOM
    csvContent += rows.map(r => r.map(cell => {
        if (typeof cell === 'string') return `"${cell.replace(/"/g, '""')}"`;
        return cell;
    }).join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Financial_App_Elite_Report_${now.getFullYear()}_${now.getMonth() + 1}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
