/**
 * Ledger Page Logic - Advanced Transaction Management
 */
import * as Store from '../store.js';
import * as Utils from '../utils.js';

export const init = () => {
    if (!document.getElementById('ledger-body')) return; // Not on ledger page

    populateFilters();
    renderTransactions();
};

const populateFilters = () => {
    const categorySelect = document.getElementById('filter-category');
    if (!categorySelect) return;

    // Get unique categories from current transactions and budgets
    const categories = new Set();
    Store.transactions.forEach(t => { if (t.category) categories.add(t.category); });
    Store.budgets.forEach(b => { if (b.category) categories.add(b.category); });

    categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        categorySelect.appendChild(option);
    });
};

export const renderTransactions = (filteredTransactions = null) => {
    const list = filteredTransactions || Store.transactions;
    const body = document.getElementById('ledger-body');
    const emptyState = document.getElementById('ledger-empty');

    if (!body) return;

    body.innerHTML = '';

    if (list.length === 0) {
        emptyState.classList.remove('hidden');
        return;
    } else {
        emptyState.classList.add('hidden');
    }

    // Sort by date descending
    const sorted = [...list].sort((a, b) => new Date(b.date) - new Date(a.date));

    sorted.forEach((t, index) => {
        const row = document.createElement('tr');
        row.className = `ledger-row animate-fade-in-up stagger-${(index % 6) + 1}`;

        const typeColor = t.type === 'income' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500';
        const amountSign = t.type === 'income' ? '+' : '-';

        // AI Suggestion Simulation
        const aiSuggestion = suggestCategory(t);
        const needsSuggestion = !t.category || t.category === 'Others' || t.category === 'General';

        row.innerHTML = `
            <td class="p-8 text-[11px] font-bold text-slate-500">${new Date(t.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
            <td class="p-8">
                <div class="flex flex-col">
                    <span class="text-sm font-bold text-slate-900 dark:text-white leading-tight">${t.provider || t.name || 'Transaction'}</span>
                    <span class="text-[9px] text-slate-400 uppercase tracking-widest mt-1">${t.description || 'No description'}</span>
                </div>
            </td>
            <td class="p-8">
                <div class="flex items-center gap-2">
                    <span class="px-3 py-1 bg-white/5 border border-white/5 rounded-lg text-[10px] font-bold text-slate-400">
                        ${t.category || 'Uncategorized'}
                    </span>
                    ${needsSuggestion && aiSuggestion ? `
                        <button onclick="LedgerPage.applyAISuggestion(${t.id}, '${aiSuggestion}')" 
                            class="flex items-center gap-1.5 px-2 py-1 bg-indigo-500/10 text-primary rounded-lg text-[9px] font-black uppercase tracking-wider hover:bg-primary hover:text-white transition-all group"
                            title="AI Recommendation">
                            <span class="material-symbols-outlined text-[10px] group-hover:scale-110">auto_awesome</span>
                            ${aiSuggestion}?
                        </button>
                    ` : ''}
                </div>
            </td>
            <td class="p-8 text-[11px] font-bold text-slate-400">${t.account || 'Vault'}</td>
            <td class="p-8 text-right">
                <span class="text-sm font-black ${t.type === 'income' ? 'text-emerald-500' : 'text-slate-900 dark:text-white'} sensitive-data">
                    ${amountSign}${Utils.formatIDR(t.amount)}
                </span>
            </td>
        `;
        body.appendChild(row);
    });
};

const suggestCategory = (t) => {
    const input = (t.provider || t.name || t.description || '').toLowerCase();

    const rules = [
        { keywords: ['gojek', 'grab', 'uber', 'taxi', 'transjakarta', 'tj', 'kai', 'kereta'], category: 'Transport' },
        { keywords: ['indomaret', 'alfamart', 'supermarket', 'market', 'toko', 'warung', 'sayur'], category: 'Food & Groceries' },
        { keywords: ['starbucks', 'kopi', 'makan', 'restoran', 'cafe', 'food', 'bakmie', 'nasgor'], category: 'Dining Out' },
        { keywords: ['netflix', 'spotify', 'movie', 'bioskop', 'game', 'steam', 'playstation'], category: 'Entertainment' },
        { keywords: ['listrik', 'token', 'pdam', 'internet', 'indihome', 'telkom'], category: 'Bills' },
        { keywords: ['shopee', 'tokopedia', 'lazada', 'blibli', 'amazon'], category: 'Shopping' }
    ];

    for (const rule of rules) {
        if (rule.keywords.some(k => input.includes(k))) return rule.category;
    }
    return null;
};

export const applyAISuggestion = (id, category) => {
    Store.updateTransaction(id, { category });
    renderTransactions();
    // Re-populate filters in case it's a new category
    populateFilters();
};

export const filterTransactions = () => {
    const search = document.getElementById('ledger-search').value.toLowerCase();
    const category = document.getElementById('filter-category').value;
    const type = document.getElementById('filter-type').value;

    const filtered = Store.transactions.filter(t => {
        const matchesSearch = (t.provider || t.name || t.description || '').toLowerCase().includes(search);
        const matchesCategory = !category || t.category === category;
        const matchesType = !type || t.type === type;
        return matchesSearch && matchesCategory && matchesType;
    });

    renderTransactions(filtered);
};

export const exportToPDF = () => {
    const element = document.getElementById('report-area');
    if (!element) return;

    const opt = {
        margin: 10,
        filename: `financial_report_${new Date().toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };

    html2pdf().set(opt).from(element).save();
};
