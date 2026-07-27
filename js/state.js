import { DatabaseService } from './db.js';

export const StateManager = {
    customers: [],
    transactions: [],
    accCounter: 0,
    
    async init() {
        await DatabaseService.init(); 
        this.customers = await DatabaseService.getAll('customers');
        this.transactions = await DatabaseService.getAll('transactions');
        
        const counterMeta = await DatabaseService.get('metadata', 'acc_counter');
        this.accCounter = counterMeta ? counterMeta.value : 0;
        
        await this.syncCounterWithFallback();
    },
    
    async syncCounterWithFallback() {
        let maxInData = 0;
        this.customers.forEach(c => {
            if (c.accountNumber && c.accountNumber.startsWith('PESE-')) {
                const num = parseInt(c.accountNumber.split('-')[1], 10);
                if (!isNaN(num) && num > maxInData) maxInData = num;
            }
        });
        
        if (maxInData > this.accCounter) {
            this.accCounter = maxInData;
            await this.saveCounter();
        }
    },
    
    async saveCounter() {
        await DatabaseService.put('metadata', { key: 'acc_counter', value: this.accCounter });
    },
    
    async getNextAccountNumber() {
        this.accCounter++;
        await this.saveCounter();
        return `PESE-${String(this.accCounter).padStart(7, '0')}`;
    },

    save() {
        document.dispatchEvent(new CustomEvent('stateChanged'));
    },
    
    async addCustomer(customer) {
        customer.accountNumber = await this.getNextAccountNumber();
        this.customers.push(customer);
        await DatabaseService.put('customers', customer);
        this.save();
        return customer;
    },
    
    async updateCustomer(index, customer) {
        this.customers[index] = customer;
        await DatabaseService.put('customers', customer);
        this.save();
    },
    
    async deleteCustomer(accNum) {
        this.customers = this.customers.filter(c => c.accountNumber !== accNum);
        const txnsToRemove = this.transactions.filter(t => t.accountNumber === accNum);
        this.transactions = this.transactions.filter(t => t.accountNumber !== accNum);
        
        await DatabaseService.delete('customers', accNum);
        if (txnsToRemove.length > 0) {
            await DatabaseService.bulkDelete('transactions', txnsToRemove.map(t => t.id));
        }
        this.save();
    },
    
    async addTransaction(transaction) {
        this.transactions.push(transaction);
        await DatabaseService.put('transactions', transaction);
        this.save();
    },
    
    async deleteTransaction(txnId) {
        this.transactions = this.transactions.filter(t => t.id !== txnId);
        await DatabaseService.delete('transactions', txnId);
        this.save();
    },
    
    async importData(data) {
        this.customers = data.customers || [];
        this.transactions = data.transactions || [];
        
        await DatabaseService.clear('customers');
        await DatabaseService.clear('transactions');
        
        for (let c of this.customers) await DatabaseService.put('customers', c);
        for (let t of this.transactions) await DatabaseService.put('transactions', t);
        
        await this.syncCounterWithFallback();
        this.save();
    }
};
