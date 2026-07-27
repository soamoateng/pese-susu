import { StateManager } from './state.js';
import { UIManager } from './ui.js';
import { Utils, FinanceService } from './utils.js';

export const CustomerView = {
    dom: {},
    editIndex: -1,

    init() {
        this.cacheDom();
        this.bindEvents();
    },

    cacheDom() {
        this.dom.list = document.getElementById('customer-list');
        this.dom.form = document.getElementById('customer-form');
        this.dom.modal = document.getElementById('customer-modal');
        this.dom.search = document.getElementById('customer-search');
        this.dom.addBtn = document.getElementById('add-customer-btn');
    },

    bindEvents() {
        this.dom.addBtn.addEventListener('click', () => this.openModal());
        this.dom.form.addEventListener('submit', (e) => this.handleSubmit(e));
        this.dom.search.addEventListener('input', () => this.render());
        
        this.dom.list.addEventListener('click', (e) => {
            const btn = e.target.closest('button');
            if (!btn) return;
            const accNum = btn.dataset.id;
            if (btn.classList.contains('btn-edit')) this.openModal(StateManager.customers.findIndex(c => c.accountNumber === accNum));
            if (btn.classList.contains('btn-delete')) this.handleDelete(accNum);
        });
    },

    openModal(index = -1) {
        this.editIndex = index;
        const title = document.getElementById('customer-modal-title');
        const balanceInput = document.getElementById('customer-balance');
        
        if (index !== -1) {
            title.innerText = "Edit Customer";
            const c = StateManager.customers[index];
            document.getElementById('customer-index').value = index;
            document.getElementById('customer-name').value = c.name;
            document.getElementById('customer-phone').value = c.phone;
            document.getElementById('customer-location').value = c.location;
            document.getElementById('customer-balance').value = c.balance;
            balanceInput.disabled = true;
        } else {
            title.innerText = "Create New Customer";
            this.dom.form.reset();
            balanceInput.disabled = false;
        }
        UIManager.openModal(this.dom.modal);
    },

    async handleSubmit(e) {
        e.preventDefault();
        const submitBtn = this.dom.form.querySelector('button[type="submit"]');
        submitBtn.disabled = true; 

        try {
            const name = document.getElementById('customer-name').value;
            const phone = document.getElementById('customer-phone').value;
            const location = document.getElementById('customer-location').value;
            let balance = Utils.roundCurrency(parseFloat(document.getElementById('customer-balance').value) || 0);
            
            if (this.editIndex !== -1) {
                await StateManager.updateCustomer(this.editIndex, { 
                    ...StateManager.customers[this.editIndex], 
                    name, phone, location 
                });
            } else {
                const newCustomer = { name, phone, location, balance };
                const savedCustomer = await StateManager.addCustomer(newCustomer);
                
                if (balance > 0) {
                    await StateManager.addTransaction({
                        id: Utils.generateId('TXN'),
                        accountNumber: savedCustomer.accountNumber,
                        type: 'deposit',
                        amount: balance,
                        date: new Date().toISOString()
                    });
                }
            }
            UIManager.closeModal(this.dom.modal);
            this.dom.form.reset();
        } finally {
            submitBtn.disabled = false; 
        }
    },

    handleDelete(accNum) {
        const customer = StateManager.customers.find(c => c.accountNumber === accNum);
        if (!customer) return;
        
        UIManager.showConfirm(`Are you sure you want to delete ${customer.name}?`, async () => {
            await StateManager.deleteCustomer(accNum);
        });
    },

    render() {
        const searchTerm = this.dom.search.value.toLowerCase();
        const filtered = StateManager.customers.filter(c => 
            c.name.toLowerCase().includes(searchTerm) || c.accountNumber.toLowerCase().includes(searchTerm)
        );
        
        if (filtered.length === 0) {
            this.dom.list.innerHTML = `<div class="empty-state">No customers found.${searchTerm ? ' Try a different search.' : ' Click "Create New Customer" to start.'}</div>`;
            return;
        }
        
        this.dom.list.innerHTML = filtered.map(c => `
            <div class="card customer-card">
                <h3>${Utils.escapeHtml(c.name)}</h3>
                <div class="customer-info">
                    <p><strong>Acc Num:</strong> ${Utils.escapeHtml(c.accountNumber)}</p>
                    <p><strong>Phone:</strong> ${Utils.escapeHtml(c.phone)}</p>
                    <p><strong>Location:</strong> ${Utils.escapeHtml(c.location)}</p>
                    <p class="balance">Balance: ${Utils.formatCurrency(c.balance)}</p>
                </div>
                <div class="card-actions">
                    <button class="btn btn-edit" data-id="${Utils.escapeHtml(c.accountNumber)}"><i class="fa-solid fa-pen-to-square"></i> Edit</button>
                    <button class="btn btn-delete" data-id="${Utils.escapeHtml(c.accountNumber)}"><i class="fa-solid fa-trash"></i> Delete</button>
                </div>
            </div>
        `).join('');
    }
};

export const TransactionView = {
    dom: {},
    activeCustomerFilter: '', // Holds the actual ID of the selected customer in the combobox

    init() {
        this.cacheDom();
        this.bindEvents();
    },

    cacheDom() {
        this.dom.list = document.getElementById('transaction-list');
        this.dom.form = document.getElementById('transaction-form');
        this.dom.modal = document.getElementById('transaction-modal');
        this.dom.addBtn = document.getElementById('add-transaction-btn');
        this.dom.customerSelect = document.getElementById('transaction-customer');
        this.dom.filterType = document.getElementById('transaction-filter-type');
        this.dom.filterCustomerInput = document.getElementById('transaction-filter-customer');
        this.dom.filterCustomerDropdown = document.getElementById('transaction-filter-customer-dropdown');
    },

    bindEvents() {
        this.dom.addBtn.addEventListener('click', () => this.openModal());
        this.dom.form.addEventListener('submit', (e) => this.handleSubmit(e));
        this.dom.filterType.addEventListener('change', () => this.render());
        
        // Combobox Listeners
        this.dom.filterCustomerInput.addEventListener('input', (e) => this.handleFilterSearch(e.target.value));
        this.dom.filterCustomerInput.addEventListener('focus', () => this.renderFilterDropdown());
        this.dom.filterCustomerInput.addEventListener('blur', () => setTimeout(() => this.dom.filterCustomerDropdown.classList.remove('active'), 200));
        
        this.dom.list.addEventListener('click', (e) => {
            const btn = e.target.closest('button');
            if (!btn || !btn.classList.contains('btn-delete')) return;
            this.handleDelete(btn.dataset.id);
        });
    },

    openModal() {
        if (this.populateCustomerDropdown()) {
            this.dom.form.reset();
            UIManager.openModal(this.dom.modal);
        }
    },

    populateCustomerDropdown() {
        if (StateManager.customers.length === 0) {
            UIManager.showAlert("Please create a customer first before adding transactions.");
            return false;
        }
        const items = StateManager.customers.map(c => ({
            value: c.accountNumber,
            label: `${c.name} (${c.accountNumber}) - Bal: ${Utils.formatCurrency(c.balance)}`
        }));
        UIManager.populateDropdown(this.dom.customerSelect, items, "-- Select Customer --");
        return true;
    },

    // NEW: Handles the searchable select logic
    renderFilterDropdown(searchTerm = '') {
        const filteredCustomers = StateManager.customers.filter(c => 
            c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
            c.accountNumber.toLowerCase().includes(searchTerm.toLowerCase())
        );

        let html = `<div class="combobox-item" data-id="" data-name="All Customers">All Customers</div>`;
        html += filteredCustomers.map(c => `
            <div class="combobox-item ${this.activeCustomerFilter === c.accountNumber ? 'selected' : ''}" data-id="${Utils.escapeHtml(c.accountNumber)}" data-name="${Utils.escapeHtml(c.name)}">
                ${Utils.escapeHtml(c.name)} (${Utils.escapeHtml(c.accountNumber)})
            </div>
        `).join('');

        this.dom.filterCustomerDropdown.innerHTML = html;
        this.dom.filterCustomerDropdown.classList.add('active');

        // Attach click listeners to new items
        this.dom.filterCustomerDropdown.querySelectorAll('.combobox-item').forEach(item => {
            item.addEventListener('mousedown', (e) => {
                e.preventDefault(); // Prevent input blur before click registers
                this.activeCustomerFilter = item.dataset.id;
                this.dom.filterCustomerInput.value = item.dataset.name;
                this.dom.filterCustomerDropdown.classList.remove('active');
                this.render();
            });
        });
    },

    handleFilterSearch(term) {
        // If user manually clears the text, reset the filter
        if (term === '') {
            this.activeCustomerFilter = '';
        }
        this.renderFilterDropdown(term);
    },

    async handleSubmit(e) {
        e.preventDefault();
        const submitBtn = this.dom.form.querySelector('button[type="submit"]');
        submitBtn.disabled = true; 

        try {
            const accNum = this.dom.customerSelect.value;
            if (!accNum) return UIManager.showAlert("Please select a customer.");
            
            const customer = StateManager.customers.find(c => c.accountNumber === accNum);
            if (!customer) return;
            
            const type = document.getElementById('transaction-type').value;
            let amount = parseFloat(document.getElementById('transaction-amount').value);
            
            if (isNaN(amount) || amount <= 0) return UIManager.showAlert("Amount must be a valid number greater than zero.");
            amount = Utils.roundCurrency(amount);
            
            const result = FinanceService.applyTransaction(customer, type, amount);
            if (!result.success) return UIManager.showAlert(result.error);
            
            await StateManager.addTransaction({
                id: Utils.generateId('TXN'),
                accountNumber: customer.accountNumber,
                type, amount,
                date: new Date().toISOString()
            });
            
            const custIndex = StateManager.customers.findIndex(c => c.accountNumber === accNum);
            await StateManager.updateCustomer(custIndex, customer);
            
            UIManager.closeModal(this.dom.modal);
        } finally {
            submitBtn.disabled = false; 
        }
    },

    handleDelete(txnId) {
        const txn = StateManager.transactions.find(t => t.id === txnId);
        if (!txn) return;
        
        UIManager.showConfirm("Are you sure you want to delete this transaction? This will automatically adjust the customer's balance.", async () => {
            const customer = StateManager.customers.find(c => c.accountNumber === txn.accountNumber);
            if (customer) {
                FinanceService.applyTransaction(customer, txn.type, txn.amount, true);
                const custIndex = StateManager.customers.findIndex(c => c.accountNumber === txn.accountNumber);
                await StateManager.updateCustomer(custIndex, customer);
            }
            await StateManager.deleteTransaction(txnId);
        });
    },

    render() {
        const typeFilter = this.dom.filterType.value;
        const custFilter = this.activeCustomerFilter;
        
        const filteredTxns = StateManager.transactions.filter(t => {
            const typeMatch = typeFilter === 'all' || t.type === typeFilter;
            const custMatch = !custFilter || t.accountNumber === custFilter;
            return typeMatch && custMatch;
        }).reverse();
        
        if (filteredTxns.length === 0) {
            const hasFilters = typeFilter !== 'all' || custFilter;
            const message = hasFilters 
                ? 'No transactions found matching your filters.' 
                : 'No transactions yet. Click "Add New Transaction" to start.';
            this.dom.list.innerHTML = `<div class="empty-state">${message}</div>`;
            return;
        }
        
        this.dom.list.innerHTML = filteredTxns.map(t => {
            const cust = StateManager.customers.find(c => c.accountNumber === t.accountNumber);
            const displayName = cust ? Utils.escapeHtml(cust.name) : 'Deleted Customer';
            const txDate = t.date ? new Date(t.date).toLocaleString() : 'N/A';
            const sign = FinanceService.TransactionTypes[t.type]?.multiplier > 0 ? '+' : '-';
            
            return `
            <div class="card transaction-item">
                <div class="transaction-info">
                    <h4>${displayName}</h4>
                    <p>ID: ${Utils.escapeHtml(t.id)}</p>
                    <p>Acc: ${Utils.escapeHtml(t.accountNumber)}</p>
                    <p>Type: ${t.type.charAt(0).toUpperCase() + t.type.slice(1)}</p>
                    <p>Date: ${txDate}</p>
                </div>
                <div class="transaction-amount ${t.type}">
                    ${sign}${Utils.formatCurrency(t.amount)}
                </div>
                <button class="btn btn-delete transaction-delete-btn" data-id="${Utils.escapeHtml(t.id)}">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>`;
        }).join('');
    }
};
