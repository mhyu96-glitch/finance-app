/**
 * Gamification & Badge System Logic
 */
import * as Store from '../store.js';

const BADGE_DEFINITIONS = [
    {
        id: 'saving_streak',
        name: 'Saving Streak',
        icon: 'local_fire_department',
        desc: 'Maintain a positive budget for 3 consecutive months.',
        color: 'text-orange-500'
    },
    {
        id: 'health_master',
        name: 'Health Master',
        icon: 'verified_user',
        desc: 'Reach a Health Score of over 90.',
        color: 'text-emerald-500'
    },
    {
        id: 'debt_slayer',
        name: 'Debt Slayer',
        icon: 'swords',
        desc: 'Successfully pay off a major liability.',
        color: 'text-rose-500'
    },
    {
        id: 'super_app_pro',
        name: 'Super-App Pro',
        icon: 'stars',
        desc: 'Use all 6 modules of the financial super-app.',
        color: 'text-primary'
    }
];

export const init = () => {
    checkAndAwardBadges();
    renderBadgeSection();
};

export const checkAndAwardBadges = () => {
    const earned = JSON.parse(localStorage.getItem('earnedBadges')) || [];
    const health = Store.calculateHealthScore();
    const newBadges = [];

    // 1. Health Master
    if (health >= 90 && !earned.includes('health_master')) {
        newBadges.push('health_master');
    }

    // 2. Debt Slayer (Check if any recurring debt was completed)
    // For this simulation, we'll check completedPayments vs tenor in store
    const completedDebt = Store.getRecurringTransactions ? Store.getRecurringTransactions().some(rt => rt.type === 'expense' && rt.completedPayments >= rt.tenor) : false;
    if (completedDebt && !earned.includes('debt_slayer')) {
        newBadges.push('debt_slayer');
    }

    // 3. Super-App Pro (Mock check for now)
    if (!earned.includes('super_app_pro')) {
        newBadges.push('super_app_pro'); // Give it for first visit to Phase 5
    }

    if (newBadges.length > 0) {
        const updated = [...earned, ...newBadges];
        localStorage.setItem('earnedBadges', JSON.stringify(updated));

        // Trigger Celebration for each new badge
        newBadges.forEach(id => {
            const badge = BADGE_DEFINITIONS.find(b => b.id === id);
            triggerCelebration(badge);
        });
    }
};

export const triggerCelebration = (badge) => {
    console.log(`Earned badge: ${badge.name}`);
    // Confetti logic can be called here if library is loaded
    if (window.confetti) {
        window.confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#6366f1', '#a855f7', '#2dd4bf']
        });
    }
};

export const renderBadgeSection = () => {
    const container = document.getElementById('dashboard-badges');
    if (!container) return;

    const earned = JSON.parse(localStorage.getItem('earnedBadges')) || [];

    container.innerHTML = '';
    BADGE_DEFINITIONS.forEach(badge => {
        const isEarned = earned.includes(badge.id);
        const card = document.createElement('div');
        card.className = `p-4 rounded-2xl border transition-all flex flex-col items-center text-center gap-2 ${isEarned ? 'bg-white/5 border-primary/20 opacity-100' : 'bg-black/5 border-white/5 opacity-30 grayscale'}`;
        card.innerHTML = `
            <span class="material-symbols-outlined text-2xl ${badge.color}">${badge.icon}</span>
            <p class="text-[9px] font-black uppercase tracking-widest">${badge.name}</p>
        `;
        if (isEarned) card.title = badge.desc;
        container.appendChild(card);
    });
};
