import { StateManager } from './state.js';
import { UIManager, ChartManager } from './ui.js';
import { CustomerView, TransactionView } from './views.js';
import { BackupService } from './backup.js';

const App = {
    async init() {
        // Request persistent storage for PWA
        if (navigator.storage && navigator.storage.persist) {
            const isPersisted = await navigator.storage.persisted();
            if (!isPersisted) {
                await navigator.storage.persist();
            }
        }

        // Initialize Database & State
        await StateManager.init();
        
        // Initialize UI Modules
        UIManager.init();
        CustomerView.init();
        TransactionView.init();
        BackupService.init();
        
        // Global Event Listener for State Changes (DRY UI Update)
        document.addEventListener('stateChanged', () => this.update());
        
        // Initial Render
        this.update();
    },
    
    update() {
        CustomerView.render();
        TransactionView.render();
        ChartManager.update();
    }
};

document.addEventListener('DOMContentLoaded', App.init.bind(App));
