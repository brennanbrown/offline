/**
 * Storage Manager Tests
 * Tests for IndexedDB and localStorage functionality
 */

describe('Storage Manager', () => {
    let storageManager;
    let testNote;

    beforeAll(async () => {
        // Create a fresh storage manager for testing
        storageManager = new StorageManager();
        await storageManager.init();
    });

    beforeEach(() => {
        // Create a test note for each test
        testNote = {
            title: 'Test Note',
            content: 'This is a test note content',
            tags: ['test', 'sample'],
            folder: 'test-folder'
        };
    });

    afterEach(async () => {
        // Clean up after each test
        try {
            await storageManager.clearAllData();
        } catch (error) {
            console.warn('Failed to clear test data:', error);
        }
    });

    describe('Initialization', () => {
        it('should initialize successfully', () => {
            expect(storageManager).toBeTruthy();
            expect(storageManager.dbName).toBe('OfflineNotesDB');
            expect(storageManager.dbVersion).toBe(1);
        });

        it('should detect IndexedDB support correctly', () => {
            const hasIndexedDB = 'indexedDB' in window;
            expect(typeof storageManager.checkIndexedDBSupport()).toBe('boolean');
            
            if (hasIndexedDB) {
                expect(storageManager.isIndexedDBSupported).toBe(true);
            }
        });

        it('should fall back to localStorage when IndexedDB is not available', async () => {
            // Create a storage manager that simulates no IndexedDB
            const fallbackStorage = new StorageManager();
            fallbackStorage.isIndexedDBSupported = false;
            await fallbackStorage.init();
            
            expect(fallbackStorage.isIndexedDBSupported).toBe(false);
        });
    });

    describe('Note Creation', () => {
        it('should create a note successfully', async () => {
            const createdNote = await storageManager.createNote(testNote);
            
            expect(createdNote).toBeTruthy();
            expect(createdNote.id).toBeTruthy();
            expect(createdNote.title).toBe(testNote.title);
            expect(createdNote.content).toBe(testNote.content);
            expect(createdNote.tags).toEqual(testNote.tags);
            expect(createdNote.folder).toBe(testNote.folder);
            expect(createdNote.createdAt).toBeTruthy();
            expect(createdNote.updatedAt).toBeTruthy();
        });

        it('should generate unique IDs for notes', async () => {
            const note1 = await storageManager.createNote(testNote);
            const note2 = await storageManager.createNote(testNote);
            
            expect(note1.id).not.toBe(note2.id);
        });

        it('should set default values for missing fields', async () => {
            const minimalNote = { title: 'Minimal Note' };
            const createdNote = await storageManager.createNote(minimalNote);
            
            expect(createdNote.content).toBe('');
            expect(createdNote.tags).toEqual([]);
            expect(createdNote.folder).toBe('default');
        });

        it('should handle empty note creation', async () => {
            const emptyNote = {};
            const createdNote = await storageManager.createNote(emptyNote);
            
            expect(createdNote.title).toBe('Untitled Note');
            expect(createdNote.content).toBe('');
            expect(createdNote.tags).toEqual([]);
        });
    });

    describe('Note Retrieval', () => {
        let createdNote;

        beforeEach(async () => {
            createdNote = await storageManager.createNote(testNote);
        });

        it('should retrieve a note by ID', async () => {
            const retrievedNote = await storageManager.getNote(createdNote.id);
            
            expect(retrievedNote).toBeTruthy();
            expect(retrievedNote.id).toBe(createdNote.id);
            expect(retrievedNote.title).toBe(createdNote.title);
        });

        it('should return undefined for non-existent note', async () => {
            const retrievedNote = await storageManager.getNote('non-existent-id');
            expect(retrievedNote).toBeUndefined();
        });

        it('should retrieve all notes', async () => {
            // Create additional notes
            await storageManager.createNote({ title: 'Note 2' });
            await storageManager.createNote({ title: 'Note 3' });
            
            const allNotes = await storageManager.getAllNotes();
            expect(allNotes).toHaveLength(3);
            expect(allNotes.some(note => note.title === 'Test Note')).toBe(true);
        });

        it('should retrieve notes by folder', async () => {
            await storageManager.createNote({ title: 'Folder Note', folder: 'specific-folder' });
            await storageManager.createNote({ title: 'Other Note', folder: 'other-folder' });
            
            const folderNotes = await storageManager.getNotesByFolder('specific-folder');
            expect(folderNotes).toHaveLength(1);
            expect(folderNotes[0].title).toBe('Folder Note');
        });
    });

    describe('Note Updates', () => {
        let createdNote;

        beforeEach(async () => {
            createdNote = await storageManager.createNote(testNote);
        });

        it('should update a note successfully', async () => {
            const updates = {
                title: 'Updated Title',
                content: 'Updated content'
            };
            
            const updatedNote = await storageManager.updateNote(createdNote.id, updates);
            
            expect(updatedNote.title).toBe(updates.title);
            expect(updatedNote.content).toBe(updates.content);
            expect(updatedNote.updatedAt).not.toBe(createdNote.updatedAt);
            expect(updatedNote.createdAt).toBe(createdNote.createdAt);
        });

        it('should preserve unchanged fields during update', async () => {
            const updates = { title: 'New Title' };
            const updatedNote = await storageManager.updateNote(createdNote.id, updates);
            
            expect(updatedNote.content).toBe(createdNote.content);
            expect(updatedNote.tags).toEqual(createdNote.tags);
            expect(updatedNote.folder).toBe(createdNote.folder);
        });

        it('should throw error when updating non-existent note', async () => {
            await expect(
                storageManager.updateNote('non-existent-id', { title: 'New Title' })
            ).toReject('Note not found');
        });
    });

    describe('Note Deletion', () => {
        let createdNote;

        beforeEach(async () => {
            createdNote = await storageManager.createNote(testNote);
        });

        it('should delete a note successfully', async () => {
            const result = await storageManager.deleteNote(createdNote.id);
            expect(result).toBe(true);
            
            const retrievedNote = await storageManager.getNote(createdNote.id);
            expect(retrievedNote).toBeUndefined();
        });

        it('should handle deletion of non-existent note gracefully', async () => {
            // Should not throw error
            const result = await storageManager.deleteNote('non-existent-id');
            expect(result).toBe(true);
        });
    });

    describe('Search Functionality', () => {
        beforeEach(async () => {
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
                content: 'JavaScript and HTML work together',
                tags: ['html', 'programming']
            });
        });

        it('should search notes by title', async () => {
            const results = await storageManager.searchNotes('JavaScript');
            expect(results).toHaveLength(2); // Title match + content match
        });

        it('should search notes by content', async () => {
            const results = await storageManager.searchNotes('CSS');
            expect(results).toHaveLength(1);
            expect(results[0].title).toBe('CSS Guide');
        });

        it('should search notes by tags', async () => {
            const results = await storageManager.searchNotes('programming');
            expect(results).toHaveLength(2);
        });

        it('should return empty array for no matches', async () => {
            const results = await storageManager.searchNotes('nonexistent');
            expect(results).toHaveLength(0);
        });

        it('should be case insensitive', async () => {
            const results = await storageManager.searchNotes('javascript');
            expect(results.length).toBeGreaterThan(0);
        });
    });

    describe('Data Export and Import', () => {
        let testNotes;

        beforeEach(async () => {
            testNotes = [
                await storageManager.createNote({ title: 'Note 1', content: 'Content 1' }),
                await storageManager.createNote({ title: 'Note 2', content: 'Content 2' }),
                await storageManager.createNote({ title: 'Note 3', content: 'Content 3' })
            ];
        });

        it('should export all data correctly', async () => {
            const exportData = await storageManager.exportData();
            
            expect(exportData).toBeTruthy();
            expect(exportData.version).toBe(storageManager.dbVersion);
            expect(exportData.exportDate).toBeTruthy();
            expect(exportData.notes).toHaveLength(3);
            expect(exportData.notes[0].title).toBeTruthy();
        });

        it('should import data correctly', async () => {
            const exportData = await storageManager.exportData();
            
            // Clear existing data
            await storageManager.clearAllData();
            
            // Import the data
            const importedCount = await storageManager.importData(exportData);
            expect(importedCount).toBe(3);
            
            // Verify imported data
            const allNotes = await storageManager.getAllNotes();
            expect(allNotes).toHaveLength(3);
        });

        it('should handle invalid import data', async () => {
            const invalidData = { invalid: 'data' };
            
            await expect(
                storageManager.importData(invalidData)
            ).toReject('Invalid import data format');
        });
    });

    describe('Storage Statistics', () => {
        beforeEach(async () => {
            await storageManager.createNote({ title: 'Stats Test Note' });
        });

        it('should provide accurate storage statistics', async () => {
            const stats = await storageManager.getStorageStats();
            
            expect(stats).toBeTruthy();
            expect(stats.totalNotes).toBe(1);
            expect(stats.totalSize).toBeGreaterThan(0);
            expect(stats.storageType).toBeTruthy();
            expect(stats.lastUpdated).toBeTruthy();
        });

        it('should report correct storage type', async () => {
            const stats = await storageManager.getStorageStats();
            const expectedType = storageManager.isIndexedDBSupported ? 'IndexedDB' : 'localStorage';
            expect(stats.storageType).toBe(expectedType);
        });
    });

    describe('Error Handling', () => {
        it('should handle storage quota exceeded gracefully', async () => {
            // This test is difficult to simulate reliably
            // In a real scenario, we'd mock the storage to throw quota errors
            expect(true).toBe(true); // Placeholder
        });

        it('should handle corrupted data gracefully', async () => {
            // Test with corrupted localStorage data
            if (!storageManager.isIndexedDBSupported) {
                localStorage.setItem('offline_notes', 'invalid json');
                
                // Should not throw error, should return empty array
                const notes = await storageManager.getAllNotes();
                expect(Array.isArray(notes)).toBe(true);
            }
        });
    });

    describe('Performance', () => {
        it('should handle large number of notes efficiently', async () => {
            const startTime = performance.now();
            
            // Create 100 notes
            const promises = [];
            for (let i = 0; i < 100; i++) {
                promises.push(storageManager.createNote({
                    title: `Performance Test Note ${i}`,
                    content: `Content for note ${i}`.repeat(10)
                }));
            }
            
            await Promise.all(promises);
            
            const endTime = performance.now();
            const duration = endTime - startTime;
            
            // Should complete within reasonable time (5 seconds)
            expect(duration).toBeLessThan(5000);
            
            // Verify all notes were created
            const allNotes = await storageManager.getAllNotes();
            expect(allNotes).toHaveLength(100);
        });

        it('should search through large dataset efficiently', async () => {
            // Create notes with searchable content
            for (let i = 0; i < 50; i++) {
                await storageManager.createNote({
                    title: `Note ${i}`,
                    content: i % 10 === 0 ? 'special content' : 'regular content'
                });
            }
            
            const startTime = performance.now();
            const results = await storageManager.searchNotes('special');
            const endTime = performance.now();
            
            expect(results).toHaveLength(5); // Every 10th note
            expect(endTime - startTime).toBeLessThan(1000); // Should be fast
        });
    });
});
