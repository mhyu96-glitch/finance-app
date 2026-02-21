/**
 * Interface Shell Management for Financial App Flow
 */

/**
 * Initialize Theme based on saved preference or system settings
 */
export const initTheme = () => {
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
        document.documentElement.classList.add('dark');
    } else if (savedTheme === 'light') {
        document.documentElement.classList.remove('dark');
    } else {
        document.documentElement.classList.add('dark');
    }
};

/**
 * Toggle between Light and Dark themes
 * @param {Function} onThemeChange - Callback for chart re-initialization
 */
export const toggleTheme = (onThemeChange) => {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    if (typeof onThemeChange === 'function') onThemeChange();
};

/**
 * Handle Sidebar Collapse/Expand on Desktop
 */
export const toggleSidebar = () => {
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('main-content');
    const toggleIcon = document.getElementById('toggle-icon');

    sidebar.classList.toggle('collapsed');
    const isCollapsed = sidebar.classList.contains('collapsed');

    if (mainContent) {
        if (isCollapsed) mainContent.classList.add('collapsed');
        else mainContent.classList.remove('collapsed');
    }

    if (toggleIcon) {
        toggleIcon.innerText = isCollapsed ? 'chevron_right' : 'chevron_left';
    }

    localStorage.setItem('sidebarCollapsed', isCollapsed ? 'true' : 'false');
};

/**
 * Handle Mobile Sidebar Drawer
 */
export const toggleMobileMenu = () => {
    const sidebar = document.getElementById('sidebar');
    const scrim = document.getElementById('sidebar-scrim');

    sidebar.classList.toggle('active');
    if (scrim) scrim.classList.toggle('hidden');
};

/**
 * Total Hide/Show Sidebar
 */
export const toggleSidebarHide = () => {
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('main-content');
    const hideTrigger = document.getElementById('sidebar-show-trigger');

    if (!sidebar || !mainContent) return;

    const isHidden = sidebar.classList.toggle('hidden-total');

    if (isHidden) {
        mainContent.classList.add('full-width');
        if (hideTrigger) hideTrigger.classList.remove('hidden');
    } else {
        mainContent.classList.remove('full-width');
        if (hideTrigger) hideTrigger.classList.add('hidden');
    }

    localStorage.setItem('sidebarHidden', isHidden ? 'true' : 'false');
};

/**
 * Toggle Private Mode (Stealth Mode)
 */
export const togglePrivateMode = () => {
    const isPrivate = document.documentElement.classList.toggle('private-mode');
    localStorage.setItem('privateMode', isPrivate ? 'true' : 'false');
    return isPrivate;
};

/**
 * Restore Private Mode state
 */
export const restorePrivateModeState = () => {
    const isPrivate = localStorage.getItem('privateMode') === 'true';
    if (isPrivate) {
        document.documentElement.classList.add('private-mode');
    }
};

/**
 * Restore Sidebar state from localStorage
 */
export const restoreSidebarState = () => {
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('main-content');
    const toggleIcon = document.getElementById('toggle-icon');
    const hideTrigger = document.getElementById('sidebar-show-trigger');

    const isCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
    const isHidden = localStorage.getItem('sidebarHidden') === 'true';

    // Handle Total Hide State first
    if (isHidden && sidebar && mainContent) {
        sidebar.classList.add('hidden-total');
        mainContent.classList.add('full-width');
        if (hideTrigger) hideTrigger.classList.remove('hidden');
    }

    // Handle Collapsed state
    if (isCollapsed && sidebar && window.innerWidth > 1024) {
        sidebar.classList.add('collapsed');
        if (mainContent) mainContent.classList.add('collapsed');
        if (toggleIcon) toggleIcon.innerText = 'chevron_right';
    }

    // Handle Private Mode
    restorePrivateModeState();
};
/**
 * AI Financial Advisor Global Component
 */
export const initAIAdvisor = (Store, Utils) => {
    // Check if widget already exists
    if (document.getElementById('ai-advisor-widget')) return;

    // Create Widget Container
    const widget = document.createElement('div');
    widget.id = 'ai-advisor-widget';
    widget.className = 'fixed bottom-8 right-32 z-[100] flex flex-col items-end gap-3 pointer-events-none group';

    // Advice Bubble
    const bubble = document.createElement('div');
    bubble.id = 'ai-advice-bubble';
    bubble.className = 'glass-premium p-6 rounded-[2.5rem] max-w-[300px] opacity-0 translate-y-4 transition-all duration-700 pointer-events-auto border-indigo-500/30 relative overflow-hidden';
    bubble.innerHTML = `
        <div class="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent"></div>
        <p id="ai-advice-text" class="text-[11px] font-bold text-slate-700 dark:text-slate-300 leading-relaxed italic relative z-10 whitespace-normal">
            Analyzing your spending trajectory...
        </p>
    `;

    // Floating Button
    const avatar = document.createElement('button');
    avatar.className = 'w-14 h-14 mesh-gradient rounded-full flex items-center justify-center text-white shadow-[0_10px_30px_rgba(99,102,241,0.4)] pointer-events-auto hover:scale-110 active:scale-95 transition-all animate-bounce relative group';
    avatar.innerHTML = `
        <span class="material-symbols-outlined text-2xl">auto_awesome</span>
        <div class="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 border-2 border-white dark:border-dark rounded-full"></div>
    `;

    avatar.onclick = () => {
        bubble.classList.toggle('opacity-0');
        bubble.classList.toggle('translate-y-4');
        generateAdvice(Store, Utils);
    };

    widget.appendChild(bubble);
    widget.appendChild(avatar);
    document.body.appendChild(widget);

    // Initial Advice delay
    setTimeout(() => {
        bubble.classList.remove('opacity-0', 'translate-y-4');
        generateAdvice(Store, Utils);
    }, 3000);
};

/**
 * Global Toast Notification System
 */
export const showNotification = (title, message, type = 'info') => {
    let container = document.getElementById('notification-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notification-container';
        container.className = 'fixed top-8 right-8 z-[200] flex flex-col gap-3 pointer-events-none';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'glass p-5 rounded-2xl border border-white/10 shadow-2xl pointer-events-auto animate-in slide-in-from-right-10 duration-500 max-w-sm flex gap-4 items-start';

    let icon = 'info';
    let colorClass = 'text-indigo-500';
    if (type === 'success') { icon = 'check_circle'; colorClass = 'text-emerald-500'; }
    if (type === 'warning') { icon = 'warning'; colorClass = 'text-amber-500'; }
    if (type === 'error') { icon = 'error'; colorClass = 'text-rose-500'; }

    toast.innerHTML = `
        <div class="w-10 h-10 rounded-xl bg-black/5 dark:bg-white/5 flex items-center justify-center shrink-0 ${colorClass}">
            <span class="material-symbols-outlined">${icon}</span>
        </div>
        <div class="flex-1">
            <h5 class="text-[11px] font-black uppercase tracking-widest text-slate-800 dark:text-white mb-1">${title}</h5>
            <p class="text-[10px] font-medium text-slate-500 leading-relaxed">${message}</p>
        </div>
    `;

    container.appendChild(toast);

    // Auto-remove
    setTimeout(() => {
        toast.classList.add('animate-out', 'fade-out', 'slide-out-to-right-10');
        setTimeout(() => toast.remove(), 500);
    }, 5000);
};

const generateAdvice = (Store, Utils) => {
    const textEl = document.getElementById('ai-advice-text');
    if (!textEl) return;

    const totals = Store.getTotals();
    const budgets = Store.budgets;
    const transactions = Store.transactions;

    const adviceList = [
        "Your burn rate is looking stable! Keep it up.",
        "Detected high spending in Lifestyle this week. Consider a 'No-Spend' weekend.",
        "Your emergency fund is 65% complete. You're getting closer to financial peace!",
        "Subscriptions detected: You spend Rp 250k/month on digital services. Worth a review?",
        "Pro-tip: Automating your savings on the 1st of each month leads to 3x higher success.",
        "You've stayed 15% under budget this month. Future YOU says thanks!",
        "Net worth increased by 4% since January. The fractal growth is real."
    ];

    // Contextual Advice
    let finalAdvice = adviceList[Math.floor(Math.random() * adviceList.length)];

    // Check for high utilization
    const totalBudgetLimit = budgets.reduce((acc, b) => acc + b.limit, 0);
    const monthExpenses = transactions.filter(t => new Date(t.date).getMonth() === new Date().getMonth()).reduce((acc, t) => acc + t.amount, 0);

    if (totalBudgetLimit > 0 && monthExpenses > totalBudgetLimit * 0.9) {
        finalAdvice = "Warning: You've used 90% of your global budget. Tighten the belt for the next few days!";
    } else if (totals.activeDebt > totals.realBalance * 0.5) {
        finalAdvice = "Your debt-to-asset ratio is high. Focus on the 'Snowball' strategy this month.";
    }

    // Typing effect
    textEl.innerText = '';
    let i = 0;
    const type = () => {
        if (i < finalAdvice.length) {
            textEl.innerText += finalAdvice.charAt(i);
            i++;
            setTimeout(type, 30);
        }
    };
    type();
};
