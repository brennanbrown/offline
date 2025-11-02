/**
 * Storage Layer - IndexedDB with localStorage fallback
 * Handles all data persistence for the offline note-taking app
 */

class StorageManager {
    constructor() {
        this.dbName = 'OfflineNotesDB';
        this.dbVersion = 1;
        this.db = null;
        this.isIndexedDBSupported = this.checkIndexedDBSupport();
        this.storeName = 'notes';
        
        // Initialize storage
        this.init();
    }

    /**
     * Check if IndexedDB is supported
     */
    checkIndexedDBSupport() {
        return 'indexedDB' in window && 
               typeof window.indexedDB.open === 'function' &&
               !this.isPrivateMode();
    }

    /**
     * Detect private/incognito mode where IndexedDB might not work
     */
    isPrivateMode() {
        try {
            // Test if we can actually use IndexedDB
            const testDB = indexedDB.open('test');
            testDB.onerror = () => true;
            return false;
        } catch (e) {
            return true;
        }
    }

    /**
     * Initialize the storage system
     */
    async init() {
        if (this.isIndexedDBSupported) {
            try {
                await this.initIndexedDB();
                console.log('✅ IndexedDB initialized successfully');
            } catch (error) {
                console.warn('⚠️ IndexedDB failed, falling back to localStorage:', error);
                this.isIndexedDBSupported = false;
            }
        }
        
        if (!this.isIndexedDBSupported) {
            this.initLocalStorage();
            console.log('✅ localStorage fallback initialized');
        }
    }

    /**
     * Initialize IndexedDB
     */
    initIndexedDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => {
                reject(new Error('Failed to open IndexedDB'));
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                
                // Handle database errors
                this.db.onerror = (event) => {
                    console.error('Database error:', event.target.error);
                };

                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Create notes object store
                if (!db.objectStoreNames.contains(this.storeName)) {
                    const notesStore = db.createObjectStore(this.storeName, { 
                        keyPath: 'id' 
                    });
                    
                    // Create indexes for efficient querying
                    notesStore.createIndex('title', 'title', { unique: false });
                    notesStore.createIndex('content', 'content', { unique: false });
                    notesStore.createIndex('tags', 'tags', { unique: false, multiEntry: true });
                    notesStore.createIndex('folder', 'folder', { unique: false });
                    notesStore.createIndex('createdAt', 'createdAt', { unique: false });
                    notesStore.createIndex('updatedAt', 'updatedAt', { unique: false });
                }
            };
        });
    }

    /**
     * Initialize localStorage fallback
     */
    initLocalStorage() {
        // Check if localStorage is available
        if (typeof Storage === 'undefined') {
            throw new Error('Neither IndexedDB nor localStorage is supported');
        }

        // Initialize notes array if it doesn't exist
        if (!localStorage.getItem('offline_notes')) {
            localStorage.setItem('offline_notes', JSON.stringify([]));
        }
    }

    /**
     * Create a new note
     */
    async createNote(noteData) {
        const note = {
            id: this.generateId(),
            title: noteData.title || 'Untitled Note',
            content: noteData.content || '',
            tags: noteData.tags || [],
            folder: noteData.folder || 'default',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            ...noteData
        };

        if (this.isIndexedDBSupported) {
            return this.createNoteIndexedDB(note);
        } else {
            return this.createNoteLocalStorage(note);
        }
    }

    /**
     * Create note using IndexedDB
     */
    createNoteIndexedDB(note) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.add(note);

            request.onsuccess = () => {
                resolve(note);
            };

            request.onerror = () => {
                reject(new Error('Failed to create note'));
            };
        });
    }

    /**
     * Create note using localStorage
     */
    createNoteLocalStorage(note) {
        try {
            const notes = this.getNotesFromLocalStorage();
            notes.push(note);
            localStorage.setItem('offline_notes', JSON.stringify(notes));
            return Promise.resolve(note);
        } catch (error) {
            return Promise.reject(new Error('Failed to create note in localStorage'));
        }
    }

    /**
     * Get all notes
     */
    async getAllNotes() {
        if (this.isIndexedDBSupported) {
            return this.getAllNotesIndexedDB();
        } else {
            return this.getAllNotesLocalStorage();
        }
    }

    /**
     * Get all notes from IndexedDB
     */
    getAllNotesIndexedDB() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.getAll();

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                reject(new Error('Failed to get notes'));
            };
        });
    }

    /**
     * Get all notes from localStorage
     */
    getAllNotesLocalStorage() {
        try {
            const notes = this.getNotesFromLocalStorage();
            return Promise.resolve(notes);
        } catch (error) {
            return Promise.reject(new Error('Failed to get notes from localStorage'));
        }
    }

    /**
     * Get a specific note by ID
     */
    async getNote(id) {
        if (this.isIndexedDBSupported) {
            return this.getNoteIndexedDB(id);
        } else {
            return this.getNoteLocalStorage(id);
        }
    }

    /**
     * Get note from IndexedDB
     */
    getNoteIndexedDB(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.get(id);

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                reject(new Error('Failed to get note'));
            };
        });
    }

    /**
     * Get note from localStorage
     */
    getNoteLocalStorage(id) {
        try {
            const notes = this.getNotesFromLocalStorage();
            const note = notes.find(n => n.id === id);
            return Promise.resolve(note);
        } catch (error) {
            return Promise.reject(new Error('Failed to get note from localStorage'));
        }
    }

    /**
     * Update an existing note
     */
    async updateNote(id, updates) {
        const existingNote = await this.getNote(id);
        if (!existingNote) {
            throw new Error('Note not found');
        }

        const updatedNote = {
            ...existingNote,
            ...updates,
            updatedAt: new Date().toISOString()
        };

        if (this.isIndexedDBSupported) {
            return this.updateNoteIndexedDB(updatedNote);
        } else {
            return this.updateNoteLocalStorage(updatedNote);
        }
    }

    /**
     * Update note in IndexedDB
     */
    updateNoteIndexedDB(note) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.put(note);

            request.onsuccess = () => {
                resolve(note);
            };

            request.onerror = () => {
                reject(new Error('Failed to update note'));
            };
        });
    }

    /**
     * Update note in localStorage
     */
    updateNoteLocalStorage(note) {
        try {
            const notes = this.getNotesFromLocalStorage();
            const index = notes.findIndex(n => n.id === note.id);
            if (index === -1) {
                throw new Error('Note not found');
            }
            notes[index] = note;
            localStorage.setItem('offline_notes', JSON.stringify(notes));
            return Promise.resolve(note);
        } catch (error) {
            return Promise.reject(new Error('Failed to update note in localStorage'));
        }
    }

    /**
     * Delete a note
     */
    async deleteNote(id) {
        if (this.isIndexedDBSupported) {
            return this.deleteNoteIndexedDB(id);
        } else {
            return this.deleteNoteLocalStorage(id);
        }
    }

    /**
     * Delete note from IndexedDB
     */
    deleteNoteIndexedDB(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.delete(id);

            request.onsuccess = () => {
                resolve(true);
            };

            request.onerror = () => {
                reject(new Error('Failed to delete note'));
            };
        });
    }

    /**
     * Delete note from localStorage
     */
    deleteNoteLocalStorage(id) {
        try {
            const notes = this.getNotesFromLocalStorage();
            const filteredNotes = notes.filter(n => n.id !== id);
            localStorage.setItem('offline_notes', JSON.stringify(filteredNotes));
            return Promise.resolve(true);
        } catch (error) {
            return Promise.reject(new Error('Failed to delete note from localStorage'));
        }
    }

    /**
     * Search notes by text content
     */
    async searchNotes(query) {
        const allNotes = await this.getAllNotes();
        const searchTerm = query.toLowerCase();
        
        return allNotes.filter(note => 
            note.title.toLowerCase().includes(searchTerm) ||
            note.content.toLowerCase().includes(searchTerm) ||
            note.tags.some(tag => tag.toLowerCase().includes(searchTerm))
        );
    }

    /**
     * Get notes by folder
     */
    async getNotesByFolder(folder) {
        if (this.isIndexedDBSupported) {
            return this.getNotesByFolderIndexedDB(folder);
        } else {
            const allNotes = await this.getAllNotes();
            return allNotes.filter(note => note.folder === folder);
        }
    }

    /**
     * Get notes by folder from IndexedDB
     */
    getNotesByFolderIndexedDB(folder) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const index = store.index('folder');
            const request = index.getAll(folder);

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                reject(new Error('Failed to get notes by folder'));
            };
        });
    }

    /**
     * Export all data
     */
    async exportData() {
        const notes = await this.getAllNotes();
        return {
            version: this.dbVersion,
            exportDate: new Date().toISOString(),
            notes: notes
        };
    }

    /**
     * Import data
     */
    async importData(data) {
        if (!data.notes || !Array.isArray(data.notes)) {
            throw new Error('Invalid import data format');
        }

        // Clear existing data
        await this.clearAllData();

        // Import notes
        for (const noteData of data.notes) {
            await this.createNote(noteData);
        }

        return data.notes.length;
    }

    /**
     * Clear all data
     */
    async clearAllData() {
        if (this.isIndexedDBSupported) {
            return this.clearAllDataIndexedDB();
        } else {
            return this.clearAllDataLocalStorage();
        }
    }

    /**
     * Clear all data from IndexedDB
     */
    clearAllDataIndexedDB() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.clear();

            request.onsuccess = () => {
                resolve(true);
            };

            request.onerror = () => {
                reject(new Error('Failed to clear data'));
            };
        });
    }

    /**
     * Clear all data from localStorage
     */
    clearAllDataLocalStorage() {
        try {
            localStorage.setItem('offline_notes', JSON.stringify([]));
            return Promise.resolve(true);
        } catch (error) {
            return Promise.reject(new Error('Failed to clear localStorage data'));
        }
    }

    /**
     * Helper: Get notes from localStorage
     */
    getNotesFromLocalStorage() {
        const notesJson = localStorage.getItem('offline_notes');
        return notesJson ? JSON.parse(notesJson) : [];
    }

    /**
     * Helper: Generate unique ID
     */
    generateId() {
        return 'note_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Get storage statistics
     */
    async getStorageStats() {
        const notes = await this.getAllNotes();
        const totalNotes = notes.length;
        const totalSize = JSON.stringify(notes).length;
        
        return {
            totalNotes,
            totalSize,
            storageType: this.isIndexedDBSupported ? 'IndexedDB' : 'localStorage',
            lastUpdated: notes.length > 0 ? 
                Math.max(...notes.map(n => new Date(n.updatedAt).getTime())) : null
        };
    }
}

// Export for use in other modules
window.StorageManager = StorageManager;
