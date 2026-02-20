/**
 * Interactive Onboarding Tour Logic
 */

const TOUR_STEPS = [
    {
        title: "Welcome to the Super-App",
        content: "Discover your new financial command center. High-fidelity tracking and AI insights await.",
        target: "sidebar"
    },
    {
        title: "Health Intelligence",
        content: "Your Health Score monitors savings rate, budget compliance, and commitment status in real-time.",
        target: "health-score-container"
    },
    {
        title: "Financial Strategy",
        content: "Use predicted growth calculators to plan your retirement and emergency funds.",
        target: "strategy-preview"
    }
];

export const init = () => {
    const isComplete = localStorage.getItem('onboardingComplete');
    if (!isComplete) {
        setTimeout(startTour, 2000);
    }
};

export const startTour = () => {
    const overlay = document.createElement('div');
    overlay.id = 'onboarding-overlay';
    overlay.className = 'fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm transition-all duration-500';
    overlay.innerHTML = `
        <div class="glass w-full max-w-sm p-10 rounded-[3rem] border-primary/20 shadow-3xl text-center animate-fade-in-up">
            <div class="w-20 h-20 mesh-gradient rounded-3xl mx-auto mb-8 flex items-center justify-center text-white shadow-xl shadow-primary/20">
                <span class="material-symbols-outlined text-4xl">auto_awesome</span>
            </div>
            <h3 id="tour-title" class="text-2xl font-display font-black text-slate-900 dark:text-white mb-4">Master Your Money</h3>
            <p id="tour-content" class="text-xs font-medium text-slate-500 leading-relaxed mb-10">Let us guide you through the new premium features of your financial super-app.</p>
            <div class="flex gap-4">
                <button onclick="FinancialApp.skipTour()" class="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors">Skip</button>
                <button onclick="FinancialApp.nextTourStep()" class="flex-[2] py-4 bg-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-105 transition-all">Get Started</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
};

let currentStep = -1;

export const nextStep = () => {
    currentStep++;
    if (currentStep >= TOUR_STEPS.length) {
        finishTour();
        return;
    }

    const step = TOUR_STEPS[currentStep];
    const titleEl = document.getElementById('tour-title');
    const contentEl = document.getElementById('tour-content');

    if (titleEl && contentEl) {
        titleEl.textContent = step.title;
        contentEl.textContent = step.content;
    }

    // In a real app, we would scroll to or highlight the 'target'
    console.log(`Tour highlighting: ${step.target}`);
};

export const finishTour = () => {
    localStorage.setItem('onboardingComplete', 'true');
    const overlay = document.getElementById('onboarding-overlay');
    if (overlay) {
        overlay.classList.add('opacity-0', 'scale-95');
        setTimeout(() => overlay.remove(), 500);
    }

    // Final celebration
    if (window.confetti) {
        window.confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
        });
    }
};
