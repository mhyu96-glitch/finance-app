import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    build: {
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                accounts: resolve(__dirname, 'accounts.html'),
                analytics: resolve(__dirname, 'analytics.html'),
                budgets: resolve(__dirname, 'budgets.html'),
                ledger: resolve(__dirname, 'ledger.html'),
                services: resolve(__dirname, 'services.html'),
                strategy: resolve(__dirname, 'strategy.html'),
            },
        },
    },
});
