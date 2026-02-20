/**
 * Utility functions for Financial App Flow
 */

/**
 * Format number to IDR currency string
 * @param {number} number 
 * @returns {string} formatted string
 */
/**
 * Formats a number into a currency string (IDR, USD, EUR)
 */
export const formatCurrency = (amount, currency = 'IDR') => {
    const formatters = {
        IDR: { locale: 'id-ID', currency: 'IDR', decimal: 0 },
        USD: { locale: 'en-US', currency: 'USD', decimal: 2 },
        EUR: { locale: 'de-DE', currency: 'EUR', decimal: 2 }
    };

    const config = formatters[currency] || formatters.IDR;

    return new Intl.NumberFormat(config.locale, {
        style: 'currency',
        currency: config.currency,
        minimumFractionDigits: config.decimal,
        maximumFractionDigits: config.decimal
    }).format(amount).replace(/\s/g, ' ');
};

// Legacy support for older calls (optional, but safer to keep/alias)
export const formatIDR = (amount) => formatCurrency(amount, 'IDR');

/**
 * Format raw number to dot-separated string (e.g., 1.000.000)
 * @param {number|string} value 
 * @returns {string} formatted string
 */
export const formatNumberWithDots = (value) => {
    if (!value && value !== 0) return '';
    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

/**
 * Attach live listener for dot formatting on input elements
 * @param {HTMLElement} inputEl 
 */
export const applyDotFormatting = (inputEl) => {
    if (!inputEl) return;
    inputEl.addEventListener('input', (e) => {
        let value = e.target.value.replace(/[^0-9]/g, '');
        if (value === '') {
            e.target.value = '';
            return;
        }
        e.target.value = formatNumberWithDots(value);
    });
};

/**
 * Attach live listener for Indonesian Currency formatting (Rp + Dots)
 * @param {HTMLElement} inputEl 
 */
export const applyCurrencyFormatting = (inputEl) => {
    if (!inputEl) return;
    inputEl.addEventListener('input', (e) => {
        let value = e.target.value.replace(/[^0-9]/g, '');
        if (value === '') {
            e.target.value = '';
            return;
        }

        const formatted = formatNumberWithDots(value);
        e.target.value = `Rp ${formatted}`;
    });

    // Handle blur to ensure "Rp " stays if not empty
    inputEl.addEventListener('blur', (e) => {
        let value = e.target.value.replace(/[^0-9]/g, '');
        if (value !== '') {
            e.target.value = `Rp ${formatNumberWithDots(value)}`;
        }
    });
};

/**
 * Parse IDR string back to number
 * @param {string} value 
 * @returns {number}
 */
export const parseIDR = (value) => {
    if (!value) return 0;
    return parseFloat(value.toString().replace(/[^0-9]/g, '')) || 0;
};

/**
 * Alias for formatNumberWithDots for compatibility
 */
export const formatNumber = (value) => formatNumberWithDots(value);

/**
 * Returns a random brand color name
 * @returns {string} color name
 */
export const getRandomColor = () => {
    const colors = ['indigo', 'emerald', 'sky', 'rose', 'amber', 'violet'];
    return colors[Math.floor(Math.random() * colors.length)];
};
