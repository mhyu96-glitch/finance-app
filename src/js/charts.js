/**
 * Chart management for Financial App Flow
 */
import { formatIDR } from './utils.js';

// Global chart instances to allow destruction
let dashboardChart = null;
let categoryChart = null;
let trendChart = null;

/**
 * Update/Initialize Dashboard Doughnut Chart
 */
export const updateDashboardChart = (income, expense) => {
    if (typeof Chart === 'undefined') {
        console.warn('Chart.js not loaded. Skipping dashboard chart initialization.');
        return;
    }
    const ctx = document.getElementById('expenseChart');
    if (!ctx) return;
    const canvas = ctx.getContext('2d');

    const gradIncome = canvas.createLinearGradient(0, 0, 0, 400);
    gradIncome.addColorStop(0, '#6366f1');
    gradIncome.addColorStop(1, '#a855f7');

    const gradExpense = canvas.createLinearGradient(0, 0, 0, 400);
    gradExpense.addColorStop(0, '#f43f5e');
    gradExpense.addColorStop(1, '#fb7185');

    if (dashboardChart && typeof dashboardChart.destroy === 'function') dashboardChart.destroy();

    // Update legend cards
    const legendIncome = document.getElementById('chart-legend-income');
    const legendExpense = document.getElementById('chart-legend-expense');
    if (legendIncome) legendIncome.textContent = formatIDR(income);
    if (legendExpense) legendExpense.textContent = formatIDR(expense);

    dashboardChart = new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels: ['Income', 'Expense'],
            datasets: [{
                data: [income, expense],
                backgroundColor: [gradIncome, gradExpense],
                borderWidth: 0,
                hoverOffset: 15,
                borderRadius: 8,
                spacing: 4
            }]
        },
        options: {
            cutout: '78%',
            responsive: true,
            maintainAspectRatio: false,
            animation: { animateScale: true, animateRotate: true, duration: 800 },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: document.documentElement.classList.contains('dark') ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                    titleColor: document.documentElement.classList.contains('dark') ? '#fff' : '#1e293b',
                    bodyColor: document.documentElement.classList.contains('dark') ? '#fff' : '#1e293b',
                    borderColor: document.documentElement.classList.contains('dark') ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                    borderWidth: 1,
                    padding: 14,
                    cornerRadius: 12,
                    bodyFont: { size: 13, weight: 'bold', family: 'Plus Jakarta Sans' },
                    callbacks: {
                        label: (context) => ` ${context.label}: ${formatIDR(context.raw)}`
                    }
                }
            }
        },
        plugins: [{
            id: 'centerText',
            beforeDraw: (chart) => {
                const { width, height, ctx } = chart;
                ctx.restore();

                // "Total Flow" label — small
                const labelSize = Math.max(10, Math.min(14, height / 18));
                ctx.font = `600 ${labelSize}px Inter, sans-serif`;
                ctx.textBaseline = "middle";
                ctx.fillStyle = document.documentElement.classList.contains('dark') ? "#94a3b8" : "#64748b";
                const text = "Total Flow";
                const textX = Math.round((width - ctx.measureText(text).width) / 2);
                const textY = height / 2 - labelSize;
                ctx.fillText(text, textX, textY);

                // Amount — bold, adaptive size
                const total = income + expense;
                const amountSize = Math.max(14, Math.min(22, height / 11));
                ctx.font = `800 ${amountSize}px "Plus Jakarta Sans", Inter, sans-serif`;
                ctx.fillStyle = document.documentElement.classList.contains('dark') ? "#f8fafc" : "#0f172a";
                const amountText = formatIDR(total);
                const amountX = Math.round((width - ctx.measureText(amountText).width) / 2);
                const amountY = height / 2 + amountSize * 0.5;
                ctx.fillText(amountText, amountX, amountY);
                ctx.save();
            }
        }]
    });
};

/**
 * Initialize Analytics Charts
 */
export const initAnalyticsCharts = (categoryTotals, totalSpend, trendLabels, trendData) => {
    if (typeof Chart === 'undefined') {
        console.warn('Chart.js not loaded. Skipping analytics chart initialization.');
        return;
    }
    const trendCtx = document.getElementById('trendChart');
    const catCtx = document.getElementById('categoryChart');
    if (!trendCtx || !catCtx) return;

    const tCanvas = trendCtx.getContext('2d');
    const cCanvas = catCtx.getContext('2d');

    // Gradients
    const grads = [
        ['#6366f1', '#818cf8'], ['#2dd4bf', '#5eead4'],
        ['#f59e0b', '#fbbf24'], ['#f43f5e', '#fb7185']
    ].map(colors => {
        const g = cCanvas.createLinearGradient(0, 0, 0, 400);
        g.addColorStop(0, colors[0]); g.addColorStop(1, colors[1]);
        return g;
    });

    const gradTrend = tCanvas.createLinearGradient(0, 0, 0, 400);
    gradTrend.addColorStop(0, 'rgba(79, 70, 229, 0.4)');
    gradTrend.addColorStop(1, 'rgba(79, 70, 229, 0)');

    // Category Doughnut
    if (categoryChart && typeof categoryChart.destroy === 'function') categoryChart.destroy();
    categoryChart = new Chart(cCanvas, {
        type: 'doughnut',
        data: {
            labels: Object.keys(categoryTotals),
            datasets: [{
                data: Object.values(categoryTotals),
                backgroundColor: [...grads, '#8b5cf6', '#ec4899'],
                borderWidth: 0, hoverOffset: 15, borderRadius: 10, spacing: 8
            }]
        },
        options: {
            cutout: '82%', responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: document.documentElement.classList.contains('dark') ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                    titleColor: document.documentElement.classList.contains('dark') ? '#fff' : '#1e293b',
                    bodyColor: document.documentElement.classList.contains('dark') ? '#fff' : '#1e293b',
                    borderColor: 'rgba(99, 102, 241, 0.1)', borderWidth: 1, padding: 12, cornerRadius: 8,
                    callbacks: { label: (context) => ` ${context.label}: ${formatIDR(context.raw)}` }
                }
            }
        },
        plugins: [{
            id: 'centerTextAnalytic',
            beforeDraw: (chart) => {
                const { width, height, ctx } = chart;
                ctx.restore();

                // 1. Label: Small, Uppercase, Spaced
                const labelSize = Math.max(10, height / 30);
                ctx.font = `bold ${labelSize}px Inter, sans-serif`;
                ctx.textBaseline = "middle";
                ctx.fillStyle = "#64748b"; // slate-500

                const text = "TOTAL SPEND";
                const textWidth = ctx.measureText(text).width;
                const textX = Math.round((width - textWidth) / 2);
                const textY = height / 2 - (labelSize * 1.2);
                ctx.fillText(text, textX, textY);

                // 2. Value: Big but Clean
                const valueSize = Math.max(12, height / 14);
                ctx.font = `800 ${valueSize}px "Plus Jakarta Sans", Inter, sans-serif`;
                ctx.fillStyle = document.documentElement.classList.contains('dark') ? "#ffffff" : "#0f172a";

                const amountText = formatIDR(totalSpend);
                const amountWidth = ctx.measureText(amountText).width;
                const amountX = Math.round((width - amountWidth) / 2);
                const amountY = height / 2 + (valueSize * 0.4);

                ctx.fillText(amountText, amountX, amountY);
                ctx.save();
            }
        }]
    });

    // Trend Line
    if (trendChart && typeof trendChart.destroy === 'function') trendChart.destroy();
    trendChart = new Chart(tCanvas, {
        type: 'line',
        data: {
            labels: trendLabels,
            datasets: [{
                label: 'Daily Spending', data: trendData,
                borderColor: '#4f46e5', borderWidth: 3, backgroundColor: gradTrend,
                tension: 0.45, fill: true, pointRadius: 0, pointHoverRadius: 6,
                pointHoverBackgroundColor: '#4f46e5', pointHoverBorderColor: '#fff', pointHoverBorderWidth: 3
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: document.documentElement.classList.contains('dark') ? 'rgba(148, 163, 184, 0.05)' : 'rgba(0, 0, 0, 0.05)', drawBorder: false },
                    ticks: { color: document.documentElement.classList.contains('dark') ? '#94a3b8' : '#64748b', font: { size: 10 } }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: document.documentElement.classList.contains('dark') ? '#94a3b8' : '#64748b', font: { size: 10 }, maxRotation: 0, autoSkip: true, maxTicksLimit: 10 }
                }
            },
            interaction: { intersect: false, mode: 'index' },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: document.documentElement.classList.contains('dark') ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                    titleColor: document.documentElement.classList.contains('dark') ? '#fff' : '#1e293b',
                    bodyColor: document.documentElement.classList.contains('dark') ? '#fff' : '#1e293b',
                    borderColor: 'rgba(99, 102, 241, 0.1)', borderWidth: 1, padding: 12
                }
            }
        }
    });
};

/**
 * Initialize Net Worth Trend Chart
 */
let netWorthChart = null;
export const initNetWorthChart = (labels, data) => {
    if (typeof Chart === 'undefined') return;
    const ctx = document.getElementById('netWorthChart');
    if (!ctx) return;

    const canvas = ctx.getContext('2d');
    const grad = canvas.createLinearGradient(0, 0, 0, 400);
    grad.addColorStop(0, 'rgba(99, 102, 241, 0.2)');
    grad.addColorStop(1, 'rgba(99, 102, 241, 0)');

    if (netWorthChart && typeof netWorthChart.destroy === 'function') netWorthChart.destroy();

    netWorthChart = new Chart(canvas, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Net Worth',
                data: data,
                borderColor: '#6366f1',
                borderWidth: 4,
                backgroundColor: grad,
                tension: 0.4,
                fill: true,
                pointRadius: 4,
                pointBackgroundColor: '#6366f1',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointHoverRadius: 8,
                pointHoverBackgroundColor: '#6366f1',
                pointHoverBorderColor: '#fff',
                pointHoverBorderWidth: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)', drawBorder: false },
                    ticks: {
                        color: '#94a3b8',
                        font: { size: 10, weight: '600' },
                        callback: (value) => formatIDR(value).replace('Rp ', '')
                    }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#94a3b8', font: { size: 10, weight: '600' } }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    padding: 12,
                    cornerRadius: 12,
                    titleFont: { size: 12, weight: 'bold' },
                    bodyFont: { size: 14, weight: '800' },
                    callbacks: {
                        label: (context) => ` Net Worth: ${formatIDR(context.raw)}`
                    }
                }
            }
        }
    });
};
/**
 * Initialize Financial Health Score Gauge
 */
let healthChart = null;
export const initHealthScoreGauge = (score) => {
    if (typeof Chart === 'undefined') return;
    const ctx = document.getElementById('healthScoreGauge');
    if (!ctx) return;

    const canvas = ctx.getContext('2d');

    // Determine color based on score
    let color = '#10b981'; // Emerald
    if (score < 50) color = '#f43f5e'; // Rose
    else if (score < 80) color = '#f59e0b'; // Amber

    if (healthChart && typeof healthChart.destroy === 'function') healthChart.destroy();

    healthChart = new Chart(canvas, {
        type: 'doughnut',
        data: {
            datasets: [{
                data: [score, 100 - score],
                backgroundColor: [color, 'rgba(255, 255, 255, 0.05)'],
                borderWidth: 0,
                circumference: 180,
                rotation: 270,
                cutout: '85%',
                borderRadius: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { enabled: false }
            },
            animation: {
                animateScale: true,
                animateRotate: true,
                duration: 2000,
                easing: 'easeOutQuart'
            }
        }
    });

    // Update Score Text
    const valEl = document.getElementById('health-score-value');
    const statusEl = document.getElementById('health-score-status');
    if (valEl) valEl.innerText = score;
    if (statusEl) {
        if (score >= 80) {
            statusEl.innerText = 'Excellent';
            statusEl.className = statusEl.className.replace(/text-(rose|amber)-500/g, 'text-emerald-500');
        } else if (score >= 50) {
            statusEl.innerText = 'Good';
            statusEl.className = statusEl.className.replace(/text-(rose|emerald)-500/g, 'text-amber-500');
        } else {
            statusEl.innerText = 'Critical';
            statusEl.className = statusEl.className.replace(/text-(amber|emerald)-500/g, 'text-rose-500');
        }
    }
};
/**
 * Initialize Cash Flow Forecast Chart
 */
let forecastChart = null;
export const initForecastChart = (labels, data) => {
    if (typeof Chart === 'undefined') return;
    const ctx = document.getElementById('forecastChart');
    if (!ctx) return;

    const canvas = ctx.getContext('2d');
    const grad = canvas.createLinearGradient(0, 0, 0, 400);
    grad.addColorStop(0, 'rgba(45, 212, 191, 0.2)');
    grad.addColorStop(1, 'rgba(45, 212, 191, 0)');

    if (forecastChart && typeof forecastChart.destroy === 'function') forecastChart.destroy();

    forecastChart = new Chart(canvas, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Projected Balance',
                data: data,
                borderColor: '#2dd4bf',
                borderWidth: 3,
                backgroundColor: grad,
                tension: 0.4,
                fill: true,
                pointRadius: 0,
                pointHoverRadius: 6,
                pointHoverBackgroundColor: '#2dd4bf',
                pointHoverBorderColor: '#fff',
                pointHoverBorderWidth: 3,
                borderDash: [5, 5] // Dashed line for projection
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)', drawBorder: false },
                    ticks: {
                        color: '#94a3b8',
                        font: { size: 10 },
                        callback: (value) => formatIDR(value).replace('Rp ', '')
                    }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#94a3b8', font: { size: 10 } }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    padding: 12,
                    callbacks: {
                        label: (context) => ` Projected: ${formatIDR(context.raw)}`
                    }
                }
            }
        }
    });
};

/**
 * Initialize Investment Allocation Chart
 */
let investmentChart = null;
export const initInvestmentChart = (typeTotals) => {
    if (typeof Chart === 'undefined') return;
    const ctx = document.getElementById('investmentAllocationChart');
    if (!ctx) return;

    const canvas = ctx.getContext('2d');

    // Asset Colors
    const colors = {
        stock: '#6366f1',      // Indigo
        crypto: '#f59e0b',     // Amber
        gold: '#eab308',       // Yellow
        mutual_fund: '#10b981', // Emerald
        real_estate: '#ec4899'  // Pink
    };

    const labels = Object.keys(typeTotals).map(t => t.replace('_', ' ').toUpperCase());
    const data = Object.values(typeTotals);
    const bgColors = Object.keys(typeTotals).map(t => colors[t] || '#94a3b8');

    if (investmentChart && typeof investmentChart.destroy === 'function') investmentChart.destroy();

    investmentChart = new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: bgColors,
                borderWidth: 0,
                hoverOffset: 12,
                borderRadius: 6,
                spacing: 3
            }]
        },
        options: {
            cutout: '75%',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: document.documentElement.classList.contains('dark') ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                    titleColor: document.documentElement.classList.contains('dark') ? '#fff' : '#1e293b',
                    bodyColor: document.documentElement.classList.contains('dark') ? '#fff' : '#1e293b',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderWidth: 1,
                    padding: 12,
                    cornerRadius: 8,
                    callbacks: {
                        label: (context) => ` ${context.label}: ${formatIDR(context.raw)}`
                    }
                }
            }
        }
    });
};

/**
 * Initialize Dashboard Investment Mini-Chart
 */
let dashboardInvestmentChart = null;
export const initDashboardInvestmentChart = (typeTotals) => {
    if (typeof Chart === 'undefined') return;
    const ctx = document.getElementById('dashboardInvestmentChart');
    if (!ctx) return;

    const canvas = ctx.getContext('2d');

    // Asset Colors
    const colors = {
        stock: '#6366f1',
        crypto: '#f59e0b',
        gold: '#eab308',
        mutual_fund: '#10b981',
        real_estate: '#ec4899'
    };

    const data = Object.values(typeTotals);
    const bgColors = Object.keys(typeTotals).map(t => colors[t] || '#94a3b8');

    if (dashboardInvestmentChart && typeof dashboardInvestmentChart.destroy === 'function') dashboardInvestmentChart.destroy();

    dashboardInvestmentChart = new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels: Object.keys(typeTotals),
            datasets: [{
                data: data,
                backgroundColor: bgColors,
                borderWidth: 0,
                hoverOffset: 4,
                borderRadius: 4,
                spacing: 2
            }]
        },
        options: {
            cutout: '80%',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { enabled: false }
            }
        }
    });
};
