/**
 * Services & Automation Page Logic
 */
import * as Store from '../store.js';
import * as Utils from '../utils.js';

export const init = () => {
    if (!document.getElementById('sub-list')) return;

    renderSubscriptions();
    renderBillReminders();
    generateAIInsights();
};

export const renderSubscriptions = () => {
    const list = document.getElementById('sub-list');
    const burnEl = document.getElementById('sub-total-burn');
    const yearlyBurnEl = burnEl.nextElementSibling;

    if (!list) return;

    // Filter recurring transactions for "Subscriptions"
    // In this app, we consider anything monthly/yearly as a potential sub, 
    // but specifically look for common digital service keywords
    const subKeywords = ['netflix', 'spotify', 'youtube', 'adobe', 'icloud', 'google', 'disney', 'amazon', 'indihome', 'netflix', 'hbo', 'gym', 'hosting', 'canva'];

    // We'll also include anything the user marked as 'Subscription' if we had that category,
    // but for now let's use the keywords + frequency
    const subscriptions = Store.getRecurringTransactions ? Store.getRecurringTransactions() : []; // Fallback if getter is not available
    // Actually store.js has recurringTransactions as a let, but not exported directly as a list often.
    // Let me check store.js export of recurringTransactions.

    // NOTE: Since store.js doesn't export recurringTransactions as a read-only list directly,
    // we might need to add a getter to store.js or access it via Store.exportData().
    // For this implementation, I'll assume we've added a getter or access them via exportData.
    const rawData = JSON.parse(Store.exportData());
    const recurringList = rawData.recurringTransactions || [];
    const subs = recurringList.filter(rt => {
        const name = (rt.name || rt.provider || '').toLowerCase();
        return subKeywords.some(k => name.includes(k)) || rt.category === 'Subscription' || rt.category === 'Entertainment';
    });

    // Remove old cards except the "Add" card
    const addCard = list.querySelector('.border-dashed');
    list.innerHTML = '';
    list.appendChild(addCard);

    let totalMonthly = 0;

    subs.forEach(sub => {
        const amount = parseFloat(sub.amount);
        const monthlyAmount = sub.frequency === 'yearly' ? amount / 12 : amount;
        totalMonthly += monthlyAmount;

        const card = document.createElement('div');
        card.className = "sub-card";
        card.innerHTML = `
            <div class="flex justify-between items-start mb-6">
                <div class="w-12 h-12 bg-indigo-500/10 text-primary rounded-xl flex items-center justify-center">
                    <span class="material-symbols-outlined">${getIconForSub(sub.name)}</span>
                </div>
                <span class="text-[9px] font-black text-slate-400 border border-white/5 px-2 py-1 rounded-md uppercase">${sub.frequency}</span>
            </div>
            <h4 class="font-bold text-slate-900 dark:text-white mb-1">${sub.name || sub.provider}</h4>
            <p class="text-[10px] text-slate-500 mb-4">${sub.category}</p>
            <div class="flex justify-between items-center pt-4 border-t border-white/5">
                <span class="text-sm font-black text-slate-900 dark:text-white">${Utils.formatIDR(amount)}</span>
                <span class="material-symbols-outlined text-slate-300 text-sm">settings</span>
            </div>
        `;
        list.insertBefore(card, addCard);
    });

    burnEl.textContent = Utils.formatIDR(totalMonthly);
    yearlyBurnEl.textContent = `Estimated Yearly: ${Utils.formatIDR(totalMonthly * 12)}`;
};

const getIconForSub = (name) => {
    name = (name || '').toLowerCase();
    if (name.includes('netflix') || name.includes('hbo') || name.includes('disney')) return 'movie';
    if (name.includes('spotify') || name.includes('music')) return 'music_note';
    if (name.includes('google') || name.includes('icloud')) return 'cloud';
    if (name.includes('gym')) return 'fitness_center';
    if (name.includes('indihome') || name.includes('wifi')) return 'wifi';
    return 'subscriptions';
};

export const renderBillReminders = () => {
    const list = document.getElementById('bill-reminders');
    if (!list) return;

    const rawData = JSON.parse(Store.exportData());
    const recurringList = rawData.recurringTransactions || [];
    const bills = recurringList.filter(rt => rt.type === 'expense');

    if (bills.length === 0) {
        list.innerHTML = `<p class="text-[10px] text-slate-500 italic">No upcoming bills scheduled.</p>`;
        return;
    }

    list.innerHTML = '';
    bills.forEach(bill => {
        const item = document.createElement('div');
        item.className = "flex items-center justify-between p-6 bg-black/5 dark:bg-white/5 rounded-3xl border border-white/5 hover:bg-white/[0.08] transition-all group";
        item.innerHTML = `
            <div class="flex items-center gap-4">
                <div class="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-black text-[10px]">
                    ${bill.date.split('-')[2]}
                </div>
                <div>
                    <h5 class="text-xs font-bold text-slate-900 dark:text-white">${bill.name || bill.provider}</h5>
                    <p class="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Due Monthly</p>
                </div>
            </div>
            <div class="text-right">
                <p class="text-xs font-black text-rose-500">${Utils.formatIDR(bill.amount)}</p>
                <button class="text-[9px] font-black text-primary opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-widest mt-1">Pay Now</button>
            </div>
        `;
        list.appendChild(item);
    });
};

export const generateAIInsights = () => {
    const list = document.getElementById('ai-insights-list');
    if (!list) return;

    const transactions = Store.transactions;
    const now = new Date();
    const thisMonth = now.getMonth();
    const insights = [];

    // 1. Food Trend
    const foodThisMonth = transactions.filter(t => t.category === 'Food' && new Date(t.date).getMonth() === thisMonth)
        .reduce((sum, t) => sum + t.amount, 0);
    const avgFood = transactions.filter(t => t.category === 'Food').reduce((sum, t) => sum + t.amount, 0) / 6; // Rough 6 month avg

    if (foodThisMonth > avgFood * 1.2) {
        insights.push({
            title: "Spending Spike Detected",
            desc: `Pengeluaran 'Food' Anda bulan ini naik ${Math.round((foodThisMonth / avgFood - 1) * 100)}% dibanding rata-rata.`,
            type: "warning"
        });
    }

    // 2. Subscription Volume
    const rawData = JSON.parse(Store.exportData());
    const subCount = (rawData.recurringTransactions || []).length;
    if (subCount > 5) {
        insights.push({
            title: "Subscription Fatigue",
            desc: `Anda memiliki ${subCount} layanan aktif. Pertimbangkan untuk membatalkan yang jarang dipakai.`,
            type: "info"
        });
    }

    // 3. Balance Runway
    const liquidBalance = rawData.accounts.filter(a => a.type === 'Bank' || a.type === 'Cash').reduce((sum, a) => sum + a.balance, 0);
    const monthlyBurn = transactions.filter(t => t.type === 'expense' && new Date(t.date).getMonth() === thisMonth).reduce((sum, t) => sum + t.amount, 0);

    if (monthlyBurn > 0) {
        const runway = Math.floor(liquidBalance / monthlyBurn);
        if (runway < 2) {
            insights.push({
                title: "Low Cash Runway",
                desc: "Saldo likuid Anda saat ini hanya cukup untuk 1-2 bulan pengeluaran rutin.",
                type: "danger"
            });
        }
    }

    list.innerHTML = '';
    insights.forEach(insight => {
        const colorClass = insight.type === 'warning' ? 'bg-amber-500/10 text-amber-500' : (insight.type === 'danger' ? 'bg-rose-500/10 text-rose-500' : 'bg-primary/10 text-primary');
        const item = document.createElement('div');
        item.className = "space-y-2 animate-fade-in-up";
        item.innerHTML = `
            <div class="flex items-center justify-between">
                <span class="insight-badge ${colorClass}">${insight.title}</span>
                <span class="text-[9px] text-slate-500">Just Now</span>
            </div>
            <p class="text-[11px] leading-relaxed font-medium">${insight.desc}</p>
        `;
        list.appendChild(item);
    });

    if (insights.length === 0) {
        list.innerHTML = `<p class="text-[10px] text-slate-500 italic">No anomalies detected. Everything looks stable.</p>`;
    }
};
