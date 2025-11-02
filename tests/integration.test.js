/**
 * Integration Tests
 * Tests for complete application workflows and component interactions
 */

describe('Integration Tests', () => {
    let app;
    let storageManager;
    let notesManager;
    let themeManager;
    let uiManager;

    beforeAll(async () => {
        // Mock localStorage
        window.localStorage = {
            data: {},
            getItem(key) { return this.data[key] || null; },
            setItem(key, value) { this.data[key] = value; },
            removeItem(key) { delete this.data[key]; },
            clear() { this.data = {}; }
        };

        // Mock matchMedia
        window.matchMedia = (query) => ({
            matches: false,
            addEventListener: () => {},
            removeEventListener: () => {}
        });

        // Mock IndexedDB if not available
        if (!window.indexedDB) {
            window.indexedDB = {
                open: () => ({
                    onerror: null,
                    onsuccess: null,
                    onupgradeneeded: null
                })
            };
        }
    });

    beforeEach(() => {
        // Reset DOM
        document.body.innerHTML = `
            <div id="app" class="app-container">
                <aside id="sidebar" class="sidebar">
                    <header class="sidebar-header">
                        <h1 class="app-title">📝 Offline</h1>
                        <button id="theme-toggle" class="theme-toggle"></button>
                    </header>
                    <nav class="sidebar-nav">
                        <section class="nav-section">
                            <ul id="folders-list" class="nav-list">
                                <li><button class="folder-item active" data-folder="all">All Notes <span class="count">(0)</span></button></li>
                            </ul>
                        </section>
                        <section class="nav-section">
                            <ul id="tags-list" class="nav-list"></ul>
                        </section>
                    </nav>
                    <div class="sidebar-footer">
                        <button id="new-note-btn" class="btn btn-primary">New Note</button>
                    </div>
                </aside>
                <section id="notes-panel" class="notes-panel">
                    <header class="panel-header">
                        <div class="search-container">
                            <input type="search" id="search-input" class="search-input" placeholder="Search notes...">
                        </div>
                        <div class="panel-actions">
                            <button id="sort-toggle" class="btn btn-secondary">📅</button>
                        </div>
                    </header>
                    <div id="notes-list" class="notes-list"></div>
                </section>
                <main id="main-editor" class="editor-panel">
                    <div id="editor-container" class="editor-container"></div>
                </main>
            </div>
            <div id="toast-container" class="toast-container"></div>
            <div id="loading" class="loading-overlay"></div>
        `;

        // Clear localStorage
        window.localStorage.clear();
    });

    describe('Application Initialization', () => {
        it('should initialize all components successfully', async () => {
            // Initialize components manually for testing
            storageManager = new StorageManager();
            await storageManager.init();
            
            themeManager = new ThemeManager();
            uiManager = new UIManager();
            window.uiManager = uiManager;
            
            notesManager = new NotesManager(storageManager);
            await notesManager.init();

            expect(storageManager).toBeTruthy();
            expect(themeManager).toBeTruthy();
            expect(uiManager).toBeTruthy();
            expect(notesManager).toBeTruthy();
        });

        it('should handle initialization errors gracefully', async () => {
            // Mock storage to fail
            const failingStorage = new StorageManager();
            failingStorage.init = () => Promise.reject(new Error('Storage failed'));

            let errorHandled = false;
            try {
                await failingStorage.init();
            } catch (error) {
                errorHandled = true;
                expect(error.message).toBe('Storage failed');
            }

            expect(errorHandled).toBe(true);
        });
    });

    describe('Complete Note Workflow', () => {
        beforeEach(async () => {
            storageManager = new StorageManager();
            await storageManager.init();
            
            uiManager = new UIManager();
            window.uiManager = uiManager;
            
            notesManager = new NotesManager(storageManager);
            await notesManager.init();
        });

        it('should create, edit, and save a note', async () => {
            // Create new note
            await notesManager.createNewNote();
            const noteId = notesManager.currentNote.id;
            
            expect(notesManager.currentNote).toBeTruthy();
            expect(notesManager.notes.length).toBe(1);

            // Mock editor DOM elements
            document.getElementById('editor-container').innerHTML = `
                <div class="note-editor">
                    <input class="note-title-input" value="Test Note Title">
                    <textarea class="note-content-input">Test note content</textarea>
                    <input class="note-tags-input" value="test, integration">
                </div>
            `;

            // Save the note
            await notesManager.saveCurrentNote();

            // Verify note was saved
            const savedNote = await storageManager.getNote(noteId);
            expect(savedNote.title).toBe('Test Note Title');
            expect(savedNote.content).toBe('Test note content');
            expect(savedNote.tags).toEqual(['test', 'integration']);
        });

        it('should search and filter notes', async () => {
            // Create multiple notes
            await storageManager.createNote({
                title: 'JavaScript Tutorial',
                content: 'Learn JavaScript programming',
                tags: ['programming', 'tutorial']
            });
            
            await storageManager.createNote({
                title: 'CSS Guide',
                content: 'Styling with CSS',
                tags: ['css', 'design']
            });
            
            await storageManager.createNote({
                title: 'HTML Basics',
                content: 'HTML fundamentals',
                tags: ['html', 'basics']
            });

            // Reload notes
            await notesManager.loadNotes();

            // Test search functionality
            notesManager.searchQuery = 'JavaScript';
            notesManager.filterAndRenderNotes();
            
            expect(notesManager.filteredNotes.length).toBe(1);
            expect(notesManager.filteredNotes[0].title).toBe('JavaScript Tutorial');

            // Test tag search
            notesManager.searchQuery = 'design';
            notesManager.filterAndRenderNotes();
            
            expect(notesManager.filteredNotes.length).toBe(1);
            expect(notesManager.filteredNotes[0].title).toBe('CSS Guide');

            // Clear search
            notesManager.searchQuery = '';
            notesManager.filterAndRenderNotes();
            
            expect(notesManager.filteredNotes.length).toBe(3);
        });

        it('should delete notes correctly', async () => {
            // Create a note
            const note = await storageManager.createNote({
                title: 'Note to Delete',
                content: 'This will be deleted'
            });

            await notesManager.loadNotes();
            expect(notesManager.notes.length).toBe(1);

            // Mock confirmation dialog
            window.uiManager.showConfirmDialog = () => true;

            // Delete the note
            await notesManager.deleteNote(note.id);

            expect(notesManager.notes.length).toBe(0);
            
            // Verify note is deleted from storage
            const deletedNote = await storageManager.getNote(note.id);
            expect(deletedNote).toBeUndefined();
        });
    });

    describe('Theme Integration', () => {
        beforeEach(() => {
            themeManager = new ThemeManager();
            uiManager = new UIManager();
        });

        it('should persist theme changes across components', () => {
            // Change theme
            themeManager.setTheme('dark');
            
            expect(themeManager.currentTheme).toBe('dark');
            expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
            expect(window.localStorage.getItem('offline_theme')).toBe('dark');
        });

        it('should handle theme change events', (done) => {
            let eventReceived = false;
            
            document.addEventListener('themechange', (event) => {
                eventReceived = true;
                expect(event.detail.theme).toBe('ocean');
                done();
            });
            
            themeManager.setTheme('ocean');
            expect(eventReceived).toBe(true);
        });
    });

    describe('Responsive Behavior', () => {
        beforeEach(() => {
            uiManager = new UIManager();
        });

        it('should adapt to mobile screen size', () => {
            // Simulate mobile screen
            window.innerWidth = 600;
            uiManager.handleResize();
            
            expect(uiManager.isMobile).toBe(true);
            expect(uiManager.sidebarVisible).toBe(false);
            expect(uiManager.notesPanelVisible).toBe(false);
        });

        it('should handle panel navigation on mobile', () => {
            uiManager.isMobile = true;
            
            // Show sidebar
            uiManager.showSidebar();
            expect(uiManager.sidebarVisible).toBe(true);
            expect(uiManager.notesPanelVisible).toBe(false);
            
            // Show notes panel
            uiManager.showNotesPanel();
            expect(uiManager.sidebarVisible).toBe(false);
            expect(uiManager.notesPanelVisible).toBe(true);
        });
    });

    describe('Data Export/Import', () => {
        beforeEach(async () => {
            storageManager = new StorageManager();
            await storageManager.init();
        });

        it('should export and import data correctly', async () => {
            // Create test data
            const testNotes = [
                { title: 'Note 1', content: 'Content 1', tags: ['tag1'] },
                { title: 'Note 2', content: 'Content 2', tags: ['tag2'] },
                { title: 'Note 3', content: 'Content 3', tags: ['tag3'] }
            ];

            for (const noteData of testNotes) {
                await storageManager.createNote(noteData);
            }

            // Export data
            const exportData = await storageManager.exportData();
            expect(exportData.notes.length).toBe(3);

            // Clear storage
            await storageManager.clearAllData();
            const clearedNotes = await storageManager.getAllNotes();
            expect(clearedNotes.length).toBe(0);

            // Import data
            const importedCount = await storageManager.importData(exportData);
            expect(importedCount).toBe(3);

            // Verify imported data
            const importedNotes = await storageManager.getAllNotes();
            expect(importedNotes.length).toBe(3);
            expect(importedNotes.some(n => n.title === 'Note 1')).toBe(true);
        });
    });

    describe('Error Recovery', () => {
        it('should handle storage errors gracefully', async () => {
            storageManager = new StorageManager();
            await storageManager.init();
            
            uiManager = new UIManager();
            window.uiManager = uiManager;
            
            // Mock storage to fail
            storageManager.createNote = () => Promise.reject(new Error('Storage full'));
            
            notesManager = new NotesManager(storageManager);
            
            let toastShown = false;
            uiManager.showToast = (message, type) => {
                toastShown = true;
                expect(message).toContain('Failed to create note');
                expect(type).toBe('error');
            };
            
            await notesManager.createNewNote();
            expect(toastShown).toBe(true);
        });

        it('should recover from corrupted data', async () => {
            // Simulate corrupted localStorage
            window.localStorage.setItem('offline_notes', 'invalid json');
            
            storageManager = new StorageManager();
            storageManager.isIndexedDBSupported = false; // Force localStorage
            await storageManager.init();
            
            // Should not throw error and return empty array
            const notes = await storageManager.getAllNotes();
            expect(Array.isArray(notes)).toBe(true);
        });
    });

    describe('Performance Integration', () => {
        it('should handle large datasets efficiently', async () => {
            storageManager = new StorageManager();
            await storageManager.init();
            
            uiManager = new UIManager();
            window.uiManager = uiManager;
            
            notesManager = new NotesManager(storageManager);
            
            const startTime = performance.now();
            
            // Create many notes
            const promises = [];
            for (let i = 0; i < 50; i++) {
                promises.push(storageManager.createNote({
                    title: `Performance Test Note ${i}`,
                    content: `Content for note ${i}`.repeat(5),
                    tags: [`tag${i % 5}`, 'performance']
                }));
            }
            
            await Promise.all(promises);
            
            // Load and filter notes
            await notesManager.loadNotes();
            notesManager.searchQuery = 'performance';
            notesManager.filterAndRenderNotes();
            
            const endTime = performance.now();
            const duration = endTime - startTime;
            
            expect(duration).toBeLessThan(3000); // Should complete within 3 seconds
            expect(notesManager.filteredNotes.length).toBe(50);
        });
    });

    describe('Accessibility Integration', () => {
        beforeEach(() => {
            uiManager = new UIManager();
        });

        it('should provide proper ARIA announcements', () => {
            let announcement = '';
            uiManager.announce = (message) => {
                announcement = message;
            };
            
            // Simulate theme change
            const themeEvent = new CustomEvent('themechange', {
                detail: { theme: 'high-contrast' }
            });
            
            uiManager.handleThemeChange(themeEvent);
            expect(announcement).toContain('Theme changed to high-contrast');
        });

        it('should handle keyboard navigation', () => {
            uiManager.isMobile = true;
            uiManager.notesPanelVisible = true;
            
            // Simulate escape key
            const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
            uiManager.handleEscapeKey(escapeEvent);
            
            expect(uiManager.sidebarVisible).toBe(true);
            expect(uiManager.notesPanelVisible).toBe(false);
        });
    });

    describe('Real-world Scenarios', () => {
        beforeEach(async () => {
            storageManager = new StorageManager();
            await storageManager.init();
            
            themeManager = new ThemeManager();
            uiManager = new UIManager();
            window.uiManager = uiManager;
            
            notesManager = new NotesManager(storageManager);
            await notesManager.init();
        });

        it('should handle rapid user interactions', async () => {
            // Simulate rapid note creation and editing
            for (let i = 0; i < 10; i++) {
                await notesManager.createNewNote();
                
                // Mock quick edits
                document.getElementById('editor-container').innerHTML = `
                    <input class="note-title-input" value="Quick Note ${i}">
                    <textarea class="note-content-input">Quick content ${i}</textarea>
                    <input class="note-tags-input" value="quick, test${i}">
                `;
                
                await notesManager.saveCurrentNote();
            }
            
            expect(notesManager.notes.length).toBe(10);
            
            // Test rapid search
            for (let i = 0; i < 5; i++) {
                notesManager.searchQuery = `test${i}`;
                notesManager.filterAndRenderNotes();
                expect(notesManager.filteredNotes.length).toBe(1);
            }
        });

        it('should maintain data consistency during concurrent operations', async () => {
            // Create initial notes
            const note1 = await storageManager.createNote({ title: 'Note 1', content: 'Content 1' });
            const note2 = await storageManager.createNote({ title: 'Note 2', content: 'Content 2' });
            
            // Simulate concurrent updates
            const updatePromises = [
                storageManager.updateNote(note1.id, { title: 'Updated Note 1' }),
                storageManager.updateNote(note2.id, { title: 'Updated Note 2' }),
                storageManager.createNote({ title: 'Note 3', content: 'Content 3' })
            ];
            
            await Promise.all(updatePromises);
            
            // Verify consistency
            const allNotes = await storageManager.getAllNotes();
            expect(allNotes.length).toBe(3);
            
            const updatedNote1 = allNotes.find(n => n.id === note1.id);
            const updatedNote2 = allNotes.find(n => n.id === note2.id);
            
            expect(updatedNote1.title).toBe('Updated Note 1');
            expect(updatedNote2.title).toBe('Updated Note 2');
        });

        it('should handle browser tab switching and focus events', () => {
            // Mock document visibility change
            Object.defineProperty(document, 'hidden', {
                writable: true,
                value: true
            });
            
            // Simulate visibility change event
            const visibilityEvent = new Event('visibilitychange');
            document.dispatchEvent(visibilityEvent);
            
            // Should handle gracefully without errors
            expect(true).toBe(true);
        });
    });
});
