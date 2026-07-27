import { StateManager } from './state.js';
import { FinanceService } from './utils.js';

export const UIManager = {
    dom: {},
    lastFocusedElement: null,
    confirmCallback: null,

    init() {
        this.cacheDom();
        this.bindEvents();
    },

    cacheDom() {
        this.dom.screens = document.querySelectorAll('.screen');
        this.dom.navBtns = document.querySelectorAll('.nav-btn');
        this.dom.modals = document.querySelectorAll('.modal');
        this.dom.alertModal = document.getElementById('alert-modal');
        this.dom.alertMessage = document.getElementById('alert-modal-message');
        this.dom.alertOkBtn = document.getElementById('alert-ok-btn');
        this.dom.alertCancelBtn = document.getElementById('alert-cancel-btn');
        this.dom.alertTitle = document.getElementById('alert-modal-title');
    },

    bindEvents() {
        this.dom.navBtns.forEach(btn => btn.addEventListener('click', () => this.handleNavigation(btn)));
        
        document.querySelectorAll('.close-btn').forEach(btn => {
            btn.addEventListener('click', () => this.closeModal(document.getElementById(btn.dataset.modal)));
        });
        
        this.dom.modals.forEach(modal => {
            modal.addEventListener('click', (e) => { if (e.target === modal) this.closeModal(modal); });
        });

        this.dom.alertOkBtn.addEventListener('click', () => this.handleAlertOk());
        this.dom.alertCancelBtn.addEventListener('click', () => { this.confirmCallback = null; this.closeModal(this.dom.alertModal); });
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal.active').forEach(m => this.closeModal(m));
            }
            if (e.key === 'Enter' && this.dom.alertModal.classList.contains('active')) {
                e.preventDefault();
                this.handleAlertOk();
            }
        });
    },

    handleNavigation(btn) {
        const target = btn.dataset.target;
        this.dom.screens.forEach(s => s.classList.remove('active'));
        document.getElementById(target).classList.add('active');
        this.dom.navBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        if (target === 'analytics-screen') ChartManager.handleVisibility();
    },

    openModal(modal) {
        this.lastFocusedElement = document.activeElement;
        modal.classList.add('active');
        setTimeout(() => {
            const focusable = modal.querySelector('input:not([disabled]):not([type="hidden"]), select');
            if (focusable) focusable.focus();
        }, 100);
    },

    closeModal(modal) {
        modal.classList.remove('active');
        if (modal.id === 'alert-modal') this.confirmCallback = null;
        if (this.lastFocusedElement && document.body.contains(this.lastFocusedElement)) {
            this.lastFocusedElement.focus();
        }
    },

    showAlert(message) {
        this.dom.alertTitle.innerText = "Notice";
        this.dom.alertMessage.innerText = message;
        this.dom.alertCancelBtn.hidden = true;
        this.dom.alertOkBtn.innerText = "OK";
        this.openModal(this.dom.alertModal);
    },

    showConfirm(message, callback) {
        this.dom.alertTitle.innerText = "Are you sure?";
        this.dom.alertMessage.innerText = message;
        this.dom.alertCancelBtn.hidden = false;
        this.dom.alertOkBtn.innerText = "Confirm";
        this.dom.alertCancelBtn.innerText = "Cancel";
        this.confirmCallback = callback;
        this.openModal(this.dom.alertModal);
    },

    handleAlertOk() {
        if (typeof this.confirmCallback === 'function') this.confirmCallback();
        this.confirmCallback = null;
        this.closeModal(this.dom.alertModal);
    },

    populateDropdown(selectEl, items, defaultOptionText) {
        selectEl.innerHTML = `<option value="">${defaultOptionText}</option>`;
        items.forEach(item => {
            const option = document.createElement('option');
            option.value = item.value;
            option.innerText = item.label;
            selectEl.appendChild(option);
        });
    }
};

export const ChartManager = {
    chart: null,
    initialized: false,

    init() {
        if (this.initialized) return;
        if (typeof Chart === 'undefined') {
            console.error("Chart.js library not loaded.");
            return;
        }

        const ctx = document.getElementById('transactionsChart').getContext('2d');
        this.chart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Total Deposits', 'Total Withdrawals'],
                datasets: [{
                    data: [0, 0],
                    backgroundColor: ['#28a745', '#dc3545'],
                    borderWidth: 0, hoverOffset: 10
                }]
            },
            options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { position: 'bottom', labels: { font: { size: 14 }, padding: 20 } } } }
        });
        this.initialized = true;
        this.update();
    },

    update() {
        if (!this.chart) return;
        const totals = FinanceService.getTransactionTotals(StateManager.transactions);
        this.chart.data.datasets[0].data = [totals.deposits, totals.withdrawals];
        this.chart.update();
    },

    handleVisibility() {
        if (!this.initialized) {
            this.init();
        } else if (this.chart) {
            setTimeout(() => this.chart.resize(), 100);
        }
    }
};
