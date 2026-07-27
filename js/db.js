// Database Service (SRP, DIP: Abstracts raw IndexedDB)
export const DatabaseService = {
    db: null,
    
    init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('PeseSusuDB', 1);
            
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('customers')) {
                    db.createObjectStore('customers', { keyPath: 'accountNumber' });
                }
                if (!db.objectStoreNames.contains('transactions')) {
                    db.createObjectStore('transactions', { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains('metadata')) {
                    db.createObjectStore('metadata', { keyPath: 'key' });
                }
            };
            
            request.onsuccess = (e) => { this.db = e.target.result; resolve(); };
            request.onerror = (e) => {
                console.error("IndexedDB Error:", e.target.error);
                reject(e.target.error);
            };
        });
    },
    
    _tx(storeName, mode = 'readonly') {
        return this.db.transaction(storeName, mode).objectStore(storeName);
    },
    
    getAll(storeName) {
        return new Promise((resolve, reject) => {
            const req = this._tx(storeName).getAll();
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    },
    
    get(storeName, key) {
        return new Promise((resolve, reject) => {
            const req = this._tx(storeName).get(key);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    },
    
    put(storeName, item) {
        return new Promise((resolve, reject) => {
            const req = this._tx(storeName, 'readwrite').put(item);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    },
    
    delete(storeName, key) {
        return new Promise((resolve, reject) => {
            const req = this._tx(storeName, 'readwrite').delete(key);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    },
    
    bulkDelete(storeName, keys) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            keys.forEach(key => store.delete(key));
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    },
    
    clear(storeName) {
        return new Promise((resolve, reject) => {
            const req = this._tx(storeName, 'readwrite').clear();
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    }
};
