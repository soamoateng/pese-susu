export const Utils = {
    escapeHtml(str) {
        if (typeof str !== 'string') return str;
        return str.replace(/[&<>"']/g, (char) => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[char]));
    },
    roundCurrency(num) {
        return Math.round((Number(num) + Number.EPSILON) * 100) / 100;
    },
    generateId(prefix) {
        return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
    },
    formatCurrency(num) {
        const value = Number(num || 0);
        return value < 0 ? `-₵${Math.abs(value).toFixed(2)}` : `₵${value.toFixed(2)}`;
    }
};

export const FinanceService = {
    TransactionTypes: {
        deposit: { multiplier: 1, label: 'Deposit' },
        withdrawal: { multiplier: -1, label: 'Withdrawal' }
    },

    applyTransaction(customer, type, amount, isReversal = false) {
        const config = this.TransactionTypes[type];
        if (!config) throw new Error('Invalid transaction type');
        
        const direction = isReversal ? -1 : 1;
        const delta = (amount * config.multiplier * direction);
        
        if (!isReversal && type === 'withdrawal' && amount > customer.balance) {
            return { success: false, error: `Insufficient funds! ${customer.name} only has ${Utils.formatCurrency(customer.balance)}` };
        }
        
        customer.balance = Utils.roundCurrency(customer.balance + delta);
        return { success: true };
    },

    getTransactionTotals(transactions) {
        return transactions.reduce((acc, t) => {
            const amount = Number(t.amount) || 0;
            if (t.type === 'deposit') acc.deposits = Utils.roundCurrency(acc.deposits + amount);
            if (t.type === 'withdrawal') acc.withdrawals = Utils.roundCurrency(acc.withdrawals + amount);
            return acc;
        }, { deposits: 0, withdrawals: 0 });
    }
};
