import { StateManager } from './state.js';
import { UIManager, ChartManager } from './ui.js';
import { CustomerView, TransactionView } from './views.js';
import { BackupService } from './backup.js';

const App = {
    async init() {
        try {
            if (navigator.storage && navigator.storage.persist) {
                const isPersisted = await navigator.storage.persisted();
                if (!isPersisted) {
                    await navigator.storage.persist();
                }
            }

            await StateManager.init();
            
            UIManager.init();
            CustomerView.init();
            TransactionView.init();
            BackupService.init();
            
            document.addEventListener('stateChanged', () => this.update());
            
            this.update();
        } catch (error) {
            console.error("Initialization failed:", error);
            alert("Failed to initialize the database. Please ensure your browser supports IndexedDB and isn't in private browsing mode.");
        }
    },
    
    update() {
        CustomerView.render();
        TransactionView.render();
        ChartManager.update();
    }
};

App.init();
