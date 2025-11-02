/**
 * Main Application Entry Point
 * Initializes and coordinates all app modules
 */

class OfflineApp {
    constructor() {
        this.storageManager = null;
        this.themeManager = null;
        this.notesManager = null;
        this.uiManager = null;
        this.isInitialized = false;
        
        this.init();
    }

    /**
     * Initialize the application
     */
    async init() {
        try {
            // Show loading overlay
            this.showInitialLoading();
            
            // Initialize core systems in order
            await this.initializeStorage();
            this.initializeThemes();
            this.initializeUI();
            await this.initializeNotes();
            
            // Set up global error handling
            this.setupErrorHandling();
            
            // Set up service worker for offline functionality
            this.setupServiceWorker();
            
            // Handle initial URL if there's a note hash
            this.handleInitialURL();
            
            // Mark as initialized
            this.isInitialized = true;
            
            // Hide loading overlay
            this.hideInitialLoading();
            
            console.log('✅ Offline app initialized successfully');
            
            // Show welcome message for first-time users
            this.showWelcomeMessage();
            
        } catch (error) {
            console.error('❌ Failed to initialize app:', error);
            this.handleInitializationError(error);
        }
    }

    /**
     * Show initial loading screen
     */
    showInitialLoading() {
        const loading = document.getElementById('loading');
        if (loading) {
            loading.classList.add('visible');
            loading.setAttribute('aria-hidden', 'false');
        }
    }

    /**
     * Hide initial loading screen
     */
    hideInitialLoading() {
        const loading = document.getElementById('loading');
        if (loading) {
            loading.classList.remove('visible');
            loading.setAttribute('aria-hidden', 'true');
        }
    }

    /**
     * Initialize storage system
     */
    async initializeStorage() {
        console.log('🔧 Initializing storage system...');
        this.storageManager = new StorageManager();
        await this.storageManager.init();
    }

    /**
     * Initialize theme system
     */
    initializeThemes() {
        console.log('🎨 Initializing theme system...');
        this.themeManager = new ThemeManager();
    }

    /**
     * Initialize UI system
     */
    initializeUI() {
        console.log('🖥️ Initializing UI system...');
        this.uiManager = new UIManager();
        
        // Make UI manager globally available for other modules
        window.uiManager = this.uiManager;
    }

    /**
     * Initialize notes system
     */
    async initializeNotes() {
        console.log('📝 Initializing notes system...');
        this.notesManager = new NotesManager(this.storageManager);
        await this.notesManager.init();
    }

    /**
     * Set up global error handling
     */
    setupErrorHandling() {
        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            this.uiManager.showToast('An unexpected error occurred', 'error');
            event.preventDefault();
        });

        // Handle general JavaScript errors
        window.addEventListener('error', (event) => {
            console.error('JavaScript error:', event.error);
            this.uiManager.showToast('An unexpected error occurred', 'error');
        });

        // Handle storage quota exceeded errors
        window.addEventListener('storage', (event) => {
            if (event.key === null) {
                // Storage was cleared
                this.uiManager.showToast('Storage was cleared by the browser', 'warning');
            }
        });
    }

    /**
     * Set up service worker for offline functionality
     */
    setupServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then((registration) => {
                    console.log('✅ Service Worker registered:', registration);
                })
                .catch((error) => {
                    console.log('⚠️ Service Worker registration failed:', error);
                    // Don't show error to user as this is not critical
                });
        }
    }

    /**
     * Handle initial URL (e.g., direct links to notes)
     */
    handleInitialURL() {
        const hash = window.location.hash;
        if (hash.startsWith('#note-')) {
            const noteId = hash.substring(6); // Remove '#note-' prefix
            setTimeout(() => {
                this.notesManager.selectNote(noteId);
            }, 500); // Give time for notes to load
        }
    }

    /**
     * Show welcome message for new users
     */
    showWelcomeMessage() {
        const hasSeenWelcome = localStorage.getItem('offline_has_seen_welcome');
        if (!hasSeenWelcome) {
            setTimeout(() => {
                this.uiManager.showToast('Welcome to Offline! Your privacy-focused note-taking app.', 'info', 5000);
                localStorage.setItem('offline_has_seen_welcome', 'true');
            }, 1000);
        }
    }

    /**
     * Handle initialization errors
     */
    handleInitializationError(error) {
        this.hideInitialLoading();
        
        // Show error message
        const errorContainer = document.createElement('div');
        errorContainer.className = 'initialization-error';
        errorContainer.innerHTML = `
            <div class="error-content">
                <h2>⚠️ Initialization Error</h2>
                <p>Sorry, we couldn't start the application properly.</p>
                <p><strong>Error:</strong> ${error.message}</p>
                <div class="error-actions">
                    <button onclick="location.reload()" class="btn btn-primary">
                        🔄 Retry
                    </button>
                    <button onclick="localStorage.clear(); location.reload()" class="btn btn-secondary">
                        🗑️ Clear Data & Retry
                    </button>
                </div>
                <details class="error-details">
                    <summary>Technical Details</summary>
                    <pre>${error.stack || error.message}</pre>
                </details>
            </div>
        `;
        
        document.body.appendChild(errorContainer);
    }

    /**
     * Get application statistics
     */
    async getAppStats() {
        if (!this.isInitialized) {
            return null;
        }

        try {
            const storageStats = await this.storageManager.getStorageStats();
            const themeInfo = {
                currentTheme: this.themeManager.getCurrentTheme(),
                availableThemes: this.themeManager.getAllThemes().length
            };
            
            return {
                initialized: this.isInitialized,
                storage: storageStats,
                theme: themeInfo,
                viewport: this.uiManager.getViewportInfo(),
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('Failed to get app stats:', error);
            return null;
        }
    }

    /**
     * Export all application data
     */
    async exportAllData() {
        if (!this.isInitialized) {
            throw new Error('App not initialized');
        }

        try {
            const data = await this.storageManager.exportData();
            const appStats = await this.getAppStats();
            
            const exportData = {
                ...data,
                appInfo: {
                    name: 'Offline Notes',
                    version: '1.0.0',
                    exportedBy: 'Offline App',
                    stats: appStats
                }
            };

            const filename = `offline-notes-backup-${new Date().toISOString().split('T')[0]}.json`;
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.uiManager.showToast(`Exported ${data.notes.length} notes`, 'success');
            
        } catch (error) {
            console.error('Failed to export data:', error);
            this.uiManager.showToast('Failed to export data', 'error');
            throw error;
        }
    }

    /**
     * Import application data
     */
    async importData(file) {
        if (!this.isInitialized) {
            throw new Error('App not initialized');
        }

        try {
            const text = await file.text();
            const data = JSON.parse(text);
            
            // Validate data format
            if (!data.notes || !Array.isArray(data.notes)) {
                throw new Error('Invalid backup file format');
            }

            // Confirm with user
            const confirmed = this.uiManager.showConfirmDialog(
                `This will replace all existing notes with ${data.notes.length} notes from the backup. Continue?`
            );
            
            if (!confirmed) {
                return;
            }

            // Import data
            const importedCount = await this.storageManager.importData(data);
            
            // Refresh the notes manager
            await this.notesManager.loadNotes();
            this.notesManager.filterAndRenderNotes();
            this.notesManager.updateFolderCounts();
            
            this.uiManager.showToast(`Imported ${importedCount} notes successfully`, 'success');
            
        } catch (error) {
            console.error('Failed to import data:', error);
            this.uiManager.showToast('Failed to import data: ' + error.message, 'error');
            throw error;
        }
    }

    /**
     * Reset application data
     */
    async resetApp() {
        const confirmed = this.uiManager.showConfirmDialog(
            'This will delete ALL your notes and settings. This action cannot be undone. Are you sure?'
        );
        
        if (!confirmed) {
            return;
        }

        try {
            // Clear all data
            await this.storageManager.clearAllData();
            localStorage.clear();
            
            // Reload the page to reinitialize
            location.reload();
            
        } catch (error) {
            console.error('Failed to reset app:', error);
            this.uiManager.showToast('Failed to reset app', 'error');
        }
    }

    /**
     * Check for updates (placeholder for future implementation)
     */
    checkForUpdates() {
        // In a real app, this would check for updates
        // For now, just show a message
        this.uiManager.showToast('You are running the latest version', 'info');
    }
}

// CSS for initialization error
const initErrorCSS = `
.initialization-error {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: var(--color-bg, #ffffff);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 9999;
}

.error-content {
    max-width: 500px;
    padding: 2rem;
    text-align: center;
    color: var(--color-text, #1a1a1a);
}

.error-content h2 {
    margin-bottom: 1rem;
    color: var(--color-error, #ef4444);
}

.error-content p {
    margin-bottom: 1rem;
    line-height: 1.6;
}

.error-actions {
    display: flex;
    gap: 1rem;
    justify-content: center;
    margin: 2rem 0;
}

.error-details {
    text-align: left;
    margin-top: 2rem;
}

.error-details pre {
    background: var(--color-input-bg, #f3f4f6);
    padding: 1rem;
    border-radius: 4px;
    overflow: auto;
    font-size: 0.875rem;
    max-height: 200px;
}
`;

// Inject error CSS
const errorStyle = document.createElement('style');
errorStyle.textContent = initErrorCSS;
document.head.appendChild(errorStyle);

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.offlineApp = new OfflineApp();
    });
} else {
    window.offlineApp = new OfflineApp();
}

// Export for global access
window.OfflineApp = OfflineApp;
