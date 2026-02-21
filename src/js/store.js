/**
 * Data Store for Financial App Flow
 */

// Initial Data
export let transactions = JSON.parse(localStorage.getItem('transactions')) || [
    { id: 101, name: "Initial Balance", amount: 15000000, type: "income", category: "Salary", date: new Date().toISOString().split('T')[0], accountId: 1 },
    { id: 102, name: "Coffee Shop", amount: 45000, type: "expense", category: "Food", date: new Date().toISOString().split('T')[0], accountId: 1 }
];
export let budgets = JSON.parse(localStorage.getItem('budgets')) || [
    { id: 1, category: "Food", limit: 2000000 },
    { id: 2, category: "Transport", limit: 1000000 }
];
export let accounts = JSON.parse(localStorage.getItem('accounts')) || [
    { id: 1, name: "Main Savings", balance: 14955000, type: "Savings", icon: "account_balance_wallet" }
];
export let investments = JSON.parse(localStorage.getItem('investments')) || [];
let savingsGoal = parseFloat(localStorage.getItem('savingsGoal')) || 5000000;
export let goals = JSON.parse(localStorage.getItem('goals')) || [];
export let recurringTransactions = JSON.parse(localStorage.getItem('recurringTransactions')) || [];
export let currency = localStorage.getItem('currency') || 'IDR';
export let lang = localStorage.getItem('lang') || 'en';

const EXCHANGE_RATES = {
    IDR: 1,
    USD: 0.000064,
    EUR: 0.000059
};

// Notification Hook
let notificationCallback = null;
export const setNotificationCallback = (cb) => { notificationCallback = cb; };

const pushNotification = (title, message, type) => {
    if (notificationCallback) notificationCallback(title, message, type);
};

export const getCurrencyData = () => ({
    current: currency,
    rates: EXCHANGE_RATES
});

export const setCurrency = (c) => {
    currency = c;
    localStorage.setItem('currency', c);
};

export const setLang = (l) => {
    lang = l;
    localStorage.setItem('lang', l);
};

export const convertBalance = (idrAmount) => {
    return idrAmount * (EXCHANGE_RATES[currency] || 1);
};

// --- Core Helper Functions ---
const updateLocalStorage = () => {
    localStorage.setItem('transactions', JSON.stringify(transactions));
    localStorage.setItem('budgets', JSON.stringify(budgets));
    localStorage.setItem('accounts', JSON.stringify(accounts));
    localStorage.setItem('investments', JSON.stringify(investments));
    localStorage.setItem('savingsGoal', savingsGoal.toString());
    localStorage.setItem('goals', JSON.stringify(goals));
    localStorage.setItem('recurringTransactions', JSON.stringify(recurringTransactions));
};

export const getSavingsGoal = () => savingsGoal;

export const setSavingsGoal = (amount) => {
    savingsGoal = amount;
    updateLocalStorage();
};

/**
 * Backup & Restore Logic
 */
export const exportData = () => {
    const data = {
        transactions,
        budgets,
        accounts,
        investments,
        savingsGoal,
        goals,
        recurringTransactions: recurringTransactions || [],
        exportDate: new Date().toISOString(),
        version: "1.3.0"
    };
    return JSON.stringify(data, null, 2);
};

export const importData = (jsonData) => {
    try {
        const data = JSON.parse(jsonData);

        // Basic Validation
        if (!data.transactions || !data.accounts) {
            throw new Error("Invalid backup file format");
        }

        // Overwrite State
        transactions = data.transactions;
        budgets = data.budgets || [];
        accounts = data.accounts;
        investments = data.investments || [];
        savingsGoal = data.savingsGoal || 5000000;
        goals = data.goals || [];
        recurringTransactions = data.recurringTransactions || [];

        updateLocalStorage();
        return true;
    } catch (error) {
        console.error("Financial App: Import Failed:", error);
        return false;
    }
};

// --- Transaction Actions ---

export const addTransaction = (t) => {
    const newT = {
        ...t,
        id: Date.now(),
        isPaid: (t.type === 'debt' || t.type === 'receivable') ? false : true,
        paidAmount: 0,
        attachment: t.attachment || null // New field
    };
    transactions.push(newT);
    updateLocalStorage();
    checkBudgets();
    return newT;
};

export const updateTransaction = (id, updatedT) => {
    const index = transactions.findIndex(t => t.id === id);
    if (index !== -1) {
        transactions[index] = { ...transactions[index], ...updatedT };
        updateLocalStorage();
        return transactions[index];
    }
    return null;
};

export const removeTransaction = (id) => {
    transactions = transactions.filter(t => t.id !== id);
    updateLocalStorage();
};

export const clearAllTransactions = () => {
    transactions = [];
    updateLocalStorage();
};

// --- Recurring Transactions ---
export const getRecurringTransactions = () => recurringTransactions;

export const addRecurringTransaction = (item) => {
    const newItem = {
        ...item,
        id: Date.now(),
        lastProcessed: new Date().toISOString(),
        completedPayments: 0,
        tenor: item.tenor || 0 // 0 means infinite/regular commitment
    };
    recurringTransactions.push(newItem);
    updateLocalStorage();
    return newItem;
};

export const removeRecurringTransaction = (id) => {
    recurringTransactions = recurringTransactions.filter(item => item.id !== id);
    updateLocalStorage();
};

export const updateRecurringTransaction = (id, updatedItem) => {
    const index = recurringTransactions.findIndex(item => item.id === id);
    if (index !== -1) {
        recurringTransactions[index] = { ...recurringTransactions[index], ...updatedItem };
        updateLocalStorage();
        return recurringTransactions[index];
    }
    return null;
};

export const processRecurring = () => {
    const now = new Date();
    let addedAny = false;
    let itemsToRemove = [];

    recurringTransactions.forEach(rt => {
        const last = new Date(rt.lastProcessed);
        let isDue = false;

        if (rt.frequency === 'daily') {
            const next = new Date(last);
            next.setDate(next.getDate() + 1);
            if (now >= next) isDue = true;
        } else if (rt.frequency === 'weekly') {
            const next = new Date(last);
            next.setDate(next.getDate() + 7);
            if (now >= next) isDue = true;
        } else if (rt.frequency === 'monthly') {
            const next = new Date(last);
            next.setMonth(next.getMonth() + 1);
            if (now >= next) isDue = true;
        } else if (rt.frequency === 'yearly') {
            const next = new Date(last);
            next.setFullYear(next.getFullYear() + 1);
            if (now >= next) isDue = true;
        }

        if (isDue) {
            // Update counts
            rt.completedPayments = (rt.completedPayments || 0) + 1;

            // Add actual transaction
            addTransaction({
                ...rt,
                id: Date.now() + Math.random(),
                date: now.toISOString().split('T')[0],
                isRecurringInstance: true,
                recurringId: rt.id // Link to parent commitment
            });

            // Update balance
            updateAccountBalance(rt.accountId, rt.type === 'income' ? rt.amount : -rt.amount);

            rt.lastProcessed = now.toISOString();
            addedAny = true;

            pushNotification("Auto-Payment Processed", `Recurring ${rt.type}: ${rt.name} - ${Utils.formatIDR(rt.amount)} has been recorded.`, "success");

            // Check for completion
            if (rt.tenor > 0 && rt.completedPayments >= rt.tenor) {
                itemsToRemove.push(rt.id);
                pushNotification("Commitment Fulfilled", `You have successfully completed all payments for ${rt.name}!`, "success");
            }
        }
    });

    if (itemsToRemove.length > 0) {
        recurringTransactions = recurringTransactions.filter(rt => !itemsToRemove.includes(rt.id));
    }

    if (addedAny || itemsToRemove.length > 0) updateLocalStorage();
    return addedAny;
};

export const checkBudgets = () => {
    const totals = getTotals();
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthExpenses = transactions.filter(t => {
        const d = new Date(t.date);
        return t.type === 'expense' && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    budgets.forEach(b => {
        const spent = monthExpenses.filter(t => t.category === b.category).reduce((sum, t) => sum + t.amount, 0);
        const utilization = (spent / b.limit) * 100;

        if (utilization >= 100) {
            pushNotification("Budget Alert", `You have exceeded your ${b.category} budget!`, "error");
        } else if (utilization >= 90) {
            pushNotification("Budget Warning", `You have used 90% of your ${b.category} budget.`, "warning");
        }
    });
};

export const addBudget = (budget) => {
    const newBudget = {
        id: Date.now(),
        ...budget
    };
    budgets.push(newBudget);
    updateLocalStorage();
    return newBudget;
};

export const removeBudget = (id) => {
    budgets = budgets.filter(b => b.id !== id);
    updateLocalStorage();
};

export const calculateHealthScore = () => {
    const totals = getTotals();
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // 1. Savings Rate Score (40%)
    // Target: 20% savings rate = 100 points
    let savingsRate = 0;
    if (totals.income > 0) {
        savingsRate = (totals.income - totals.expense) / totals.income;
    }
    const savingsScore = Math.min(100, Math.max(0, (savingsRate / 0.2) * 100));

    // 2. Budget Compliance Score (40%)
    // Each budget under limit gives points
    let complianceScore = 100;
    if (budgets.length > 0) {
        const monthExpenses = transactions.filter(t => {
            const d = new Date(t.date);
            return t.type === 'expense' && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        });

        let overBudgetCount = 0;
        budgets.forEach(b => {
            const spent = monthExpenses.filter(t => t.category === b.category).reduce((sum, t) => sum + t.amount, 0);
            if (spent > b.limit) overBudgetCount++;
        });
        complianceScore = ((budgets.length - overBudgetCount) / budgets.length) * 100;
    }

    // 3. Commitment Health (20%)
    // Ratio of paid vs total commitments in current month
    let commitmentScore = 100;
    if (recurringTransactions.length > 0) {
        const total = recurringTransactions.length;
        const overdue = recurringTransactions.filter(rt => {
            const last = new Date(rt.lastProcessed);
            const isOverdue = (now - last) > (35 * 24 * 60 * 60 * 1000); // Rough check for monthly
            return isOverdue;
        }).length;
        commitmentScore = ((total - overdue) / total) * 100;
    }

    const finalScore = (savingsScore * 0.4) + (complianceScore * 0.4) + (commitmentScore * 0.2);
    return Math.round(finalScore);
};

// --- Account Actions ---

export const addAccount = (account) => {
    const newAccount = {
        id: Date.now(),
        ...account
    };
    accounts.push(newAccount);
    updateLocalStorage();
    return newAccount;
};

export const updateAccountBalance = (id, change) => {
    const idx = accounts.findIndex(a => a.id == id);
    if (idx !== -1) {
        accounts[idx].balance += change;
        updateLocalStorage();
        return accounts[idx];
    }
    return null;
};

export const removeAccount = (id) => {
    accounts = accounts.filter(a => a.id !== id);
    updateLocalStorage();
    updateLocalStorage();
};

export const getTotalAccountBalance = () => {
    return accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);
};

// --- Derived State Calculations ---

export const getTotals = () => {
    const income = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
    const expense = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);

    const totalDebtTaken = transactions.filter(t => t.type === 'debt').reduce((acc, t) => acc + t.amount, 0);
    const totalReceivableGiven = transactions.filter(t => t.type === 'receivable').reduce((acc, t) => acc + t.amount, 0);

    const activeDebt = transactions
        .filter(t => t.type === 'debt' && !t.isPaid)
        .reduce((acc, item) => acc + (item.amount - (item.paidAmount || 0)), 0);

    const activeReceivable = transactions
        .filter(t => t.type === 'receivable' && !t.isPaid)
        .reduce((acc, item) => acc + (item.amount - (item.paidAmount || 0)), 0);

    const realBalance = income - expense + totalDebtTaken - totalReceivableGiven;

    // Investment Totals
    const totalInvestments = investments.reduce((sum, inv) => sum + (inv.amount * (inv.quantity || 1)), 0);

    return {
        income,
        expense,
        activeDebt,
        activeReceivable,
        realBalance,
        totalInvestments,
        netWorth: realBalance + totalInvestments - activeDebt // Global Net Worth Formula
    };
};

// --- Investment Actions ---

export const addInvestment = (inv) => {
    const newInv = {
        id: Date.now(),
        ...inv,
        date: inv.date || new Date().toISOString().split('T')[0],
        lastUpdated: new Date().toISOString()
    };
    investments.push(newInv);
    updateLocalStorage();
    return newInv;
};

export const removeInvestment = (id) => {
    investments = investments.filter(i => i.id !== id);
    updateLocalStorage();
};

export const updateInvestment = (id, updatedInv) => {
    const index = investments.findIndex(i => i.id === id);
    if (index !== -1) {
        investments[index] = { ...investments[index], ...updatedInv, lastUpdated: new Date().toISOString() };
        updateLocalStorage();
        return investments[index];
    }
    return null;
};

// --- Goal Actions ---

export const addGoal = (goal) => {
    const newGoal = {
        id: Date.now(),
        ...goal
    };
    goals.push(newGoal);
    updateLocalStorage();
    return newGoal;
};

export const updateGoal = (id, updatedGoal) => {
    const index = goals.findIndex(g => g.id === id);
    if (index !== -1) {
        goals[index] = { ...goals[index], ...updatedGoal };
        updateLocalStorage();
        return goals[index];
    }
    return null;
};

export const removeGoal = (id) => {
    goals = goals.filter(g => g.id !== id);
    updateLocalStorage();
};
