import { StateManager } from './state.js';
import { UIManager } from './ui.js';
import { Utils, FinanceService } from './utils.js';
import { CustomerView, TransactionView } from './views.js';

export const BackupService = {
    init() {
        document.getElementById('export-data-btn').addEventListener('click', () => this.exportToPDF());
        document.getElementById('import-data-btn').addEventListener('click', () => document.getElementById('import-file-input').click());
        
        document.getElementById('import-file-input').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const data = JSON.parse(event.target.result);
                    if (data.customers && data.transactions) {
                        UIManager.showConfirm("Importing will overwrite ALL current data. Are you sure you want to continue?", async () => {
                            await StateManager.importData(data);
                            
                            CustomerView.dom.search.value = '';
                            TransactionView.dom.filterType.value = 'all';
                            TransactionView.dom.filterCustomer.value = '';
                            
                            UIManager.showAlert("Data imported successfully!");
                        });
                    } else {
                        UIManager.showAlert("Invalid backup file format.");
                    }
                } catch (err) {
                    UIManager.showAlert("Error reading file. Please ensure it is a valid JSON backup.");
                }
            };
            reader.readAsText(file);
            e.target.value = '';
        });
    },

    exportToPDF() {
        const printWindow = window.open('', '_blank', 'width=800,height=600');
        if (!printWindow) {
            UIManager.showAlert("Please allow pop-ups to export data to PDF.");
            return;
        }

        const customerRows = StateManager.customers.map(c => `
            <tr>
                <td>${Utils.escapeHtml(c.accountNumber)}</td>
                <td>${Utils.escapeHtml(c.name)}</td>
                <td>${Utils.escapeHtml(c.phone)}</td>
                <td>${Utils.escapeHtml(c.location)}</td>
                <td style="text-align: right;">${Utils.formatCurrency(c.balance)}</td>
            </tr>
        `).join('');

        const transactionRows = StateManager.transactions.slice().reverse().map(t => {
            const cust = StateManager.customers.find(c => c.accountNumber === t.accountNumber);
            const name = cust ? Utils.escapeHtml(cust.name) : 'Deleted Customer';
            const date = t.date ? new Date(t.date).toLocaleString() : 'N/A';
            const sign = FinanceService.TransactionTypes[t.type]?.multiplier > 0 ? '+' : '-';
            
            return `
                <tr>
                    <td>${date}</td>
                    <td>${name}</td>
                    <td>${Utils.escapeHtml(t.type)}</td>
                    <td style="text-align: right;">${sign}${Utils.formatCurrency(t.amount)}</td>
                </tr>
            `;
        }).join('');

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Pese Susu - Export Report</title>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; color: #333; }
                    h1 { color: #1a73e8; border-bottom: 2px solid #1a73e8; padding-bottom: 10px; }
                    h2 { margin-top: 30px; color: #333; }
                    table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 14px; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background-color: #f0f2f5; color: #1a73e8; }
                    .empty { font-style: italic; color: #777; text-align: center; padding: 20px; }
                    .footer { margin-top: 40px; font-size: 12px; color: #777; text-align: center; }
                </style>
            </head>
            <body>
                <h1>Pese Susu Financial Report</h1>
                <p>Generated on: ${new Date().toLocaleString()}</p>
                
                <h2>Customers</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Acc Num</th>
                            <th>Name</th>
                            <th>Phone</th>
                            <th>Location</th>
                            <th style="text-align: right;">Balance</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${customerRows || '<tr><td colspan="5" class="empty">No customers found.</td></tr>'}
                    </tbody>
                </table>

                <h2>Transactions</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Customer</th>
                            <th>Type</th>
                            <th style="text-align: right;">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${transactionRows || '<tr><td colspan="4" class="empty">No transactions found.</td></tr>'}
                    </tbody>
                </table>

                <div class="footer">Powered by Pese Susu</div>

                <script>
                    window.onload = function() {
                        window.focus();
                        window.print();
                        setTimeout(function() { window.close(); }, 500);
                    };
                <\/script>
            </body>
            </html>
        `;

        printWindow.document.open();
        printWindow.document.write(html);
        printWindow.document.close();
    }
};
