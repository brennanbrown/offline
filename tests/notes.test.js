/**
 * Notes Manager Tests
 * Tests for note management functionality
 */

describe('Notes Manager', () => {
    let notesManager;
    let mockStorageManager;
    let testNotes;

    beforeAll(() => {
        // Create mock storage manager
        mockStorageManager = {
            notes: [],
            nextId: 1,
            
            async createNote(noteData) {
                const note = {
                    id: `note_${this.nextId++}`,
                    title: noteData.title || 'Untitled Note',
                    content: noteData.content || '',
                    tags: noteData.tags || [],
                    folder: noteData.folder || 'default',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    ...noteData
                };
                this.notes.push(note);
                return note;
            },
            
            async getAllNotes() {
                return [...this.notes];
            },
            
            async getNote(id) {
                return this.notes.find(n => n.id === id);
            },
            
            async updateNote(id, updates) {
                const noteIndex = this.notes.findIndex(n => n.id === id);
                if (noteIndex === -1) throw new Error('Note not found');
                
                this.notes[noteIndex] = {
                    ...this.notes[noteIndex],
                    ...updates,
                    updatedAt: new Date().toISOString()
                };
                return this.notes[noteIndex];
            },
            
            async deleteNote(id) {
                const index = this.notes.findIndex(n => n.id === id);
                if (index !== -1) {
                    this.notes.splice(index, 1);
                }
                return true;
            },
            
            async searchNotes(query) {
                const searchTerm = query.toLowerCase();
                return this.notes.filter(note => 
                    note.title.toLowerCase().includes(searchTerm) ||
                    note.content.toLowerCase().includes(searchTerm) ||
                    note.tags.some(tag => tag.toLowerCase().includes(searchTerm))
                );
            },
            
            async getNotesByFolder(folder) {
                return this.notes.filter(note => note.folder === folder);
            }
        };
    });

    beforeEach(async () => {
        // Reset mock storage
        mockStorageManager.notes = [];
        mockStorageManager.nextId = 1;
        
        // Create fresh notes manager
        notesManager = new NotesManager(mockStorageManager);
        
        // Mock UI manager
        window.uiManager = {
            showToast: () => {},
            showConfirmDialog: () => true,
            showInputDialog: () => 'test'
        };
        
        // Create test notes
        testNotes = [
            await mockStorageManager.createNote({
                title: 'First Note',
                content: 'Content of first note',
                tags: ['tag1', 'important']
            }),
            await mockStorageManager.createNote({
                title: 'Second Note',
                content: 'Content of second note',
                tags: ['tag2'],
                folder: 'work'
            }),
            await mockStorageManager.createNote({
                title: 'Third Note',
                content: 'Content of third note',
                tags: ['tag1', 'tag3']
            })
        ];
        
        await notesManager.loadNotes();
    });

    describe('Initialization', () => {
        it('should initialize with storage manager', () => {
            expect(notesManager.storage).toBe(mockStorageManager);
            expect(notesManager.notes).toHaveLength(3);
            expect(notesManager.currentNote).toBeNull();
            expect(notesManager.currentFolder).toBe('all');
        });

        it('should load notes from storage on init', () => {
            expect(notesManager.notes).toHaveLength(3);
            expect(notesManager.filteredNotes).toHaveLength(3);
        });
    });

    describe('Note Creation', () => {
        it('should create a new note', async () => {
            const initialCount = notesManager.notes.length;
            await notesManager.createNewNote();
            
            expect(notesManager.notes.length).toBe(initialCount + 1);
            expect(notesManager.currentNote).toBeTruthy();
            expect(notesManager.currentNote.title).toBe('Untitled Note');
        });

        it('should set current folder for new note', async () => {
            notesManager.currentFolder = 'work';
            await notesManager.createNewNote();
            
            expect(notesManager.currentNote.folder).toBe('work');
        });

        it('should use default folder when current folder is "all"', async () => {
            notesManager.currentFolder = 'all';
            await notesManager.createNewNote();
            
            expect(notesManager.currentNote.folder).toBe('default');
        });
    });

    describe('Note Selection', () => {
        it('should select a note by ID', async () => {
            const noteId = testNotes[0].id;
            await notesManager.selectNote(noteId);
            
            expect(notesManager.currentNote).toBeTruthy();
            expect(notesManager.currentNote.id).toBe(noteId);
        });

        it('should handle selecting non-existent note', async () => {
            await notesManager.selectNote('non-existent-id');
            expect(notesManager.currentNote).toBeNull();
        });

        it('should save current note before selecting new one', async () => {
            // Select first note
            await notesManager.selectNote(testNotes[0].id);
            
            // Mock DOM elements for saving
            document.body.innerHTML = `
                <input class="note-title-input" value="Updated Title">
                <textarea class="note-content-input">Updated Content</textarea>
                <input class="note-tags-input" value="updated, tags">
            `;
            
            // Select second note (should save first)
            await notesManager.selectNote(testNotes[1].id);
            
            // Check if first note was updated
            const updatedNote = await mockStorageManager.getNote(testNotes[0].id);
            expect(updatedNote.title).toBe('Updated Title');
        });
    });

    describe('Note Editing and Saving', () => {
        beforeEach(async () => {
            await notesManager.selectNote(testNotes[0].id);
        });

        it('should detect note changes correctly', () => {
            const updates = {
                title: 'New Title',
                content: notesManager.currentNote.content,
                tags: notesManager.currentNote.tags
            };
            
            expect(notesManager.hasNoteChanged(updates)).toBe(true);
        });

        it('should not save when no changes detected', () => {
            const updates = {
                title: notesManager.currentNote.title,
                content: notesManager.currentNote.content,
                tags: notesManager.currentNote.tags
            };
            
            expect(notesManager.hasNoteChanged(updates)).toBe(false);
        });

        it('should parse tags correctly', () => {
            const tagString = 'tag1, tag2, tag3';
            const parsed = notesManager.parseTags(tagString);
            
            expect(parsed).toEqual(['tag1', 'tag2', 'tag3']);
        });

        it('should handle empty tag string', () => {
            const parsed = notesManager.parseTags('');
            expect(parsed).toEqual([]);
        });

        it('should trim whitespace from tags', () => {
            const tagString = ' tag1 , tag2 , tag3 ';
            const parsed = notesManager.parseTags(tagString);
            
            expect(parsed).toEqual(['tag1', 'tag2', 'tag3']);
        });
    });

    describe('Note Deletion', () => {
        it('should delete a note', async () => {
            const noteId = testNotes[0].id;
            const initialCount = notesManager.notes.length;
            
            // Mock confirm dialog
            window.uiManager.showConfirmDialog = () => true;
            
            await notesManager.deleteNote(noteId);
            
            expect(notesManager.notes.length).toBe(initialCount - 1);
            expect(notesManager.notes.find(n => n.id === noteId)).toBeUndefined();
        });

        it('should not delete when user cancels', async () => {
            const noteId = testNotes[0].id;
            const initialCount = notesManager.notes.length;
            
            // Mock confirm dialog to return false
            window.uiManager.showConfirmDialog = () => false;
            
            await notesManager.deleteNote(noteId);
            
            expect(notesManager.notes.length).toBe(initialCount);
        });

        it('should deselect current note if deleted', async () => {
            const noteId = testNotes[0].id;
            await notesManager.selectNote(noteId);
            
            window.uiManager.showConfirmDialog = () => true;
            await notesManager.deleteNote(noteId);
            
            expect(notesManager.currentNote).toBeNull();
        });
    });

    describe('Filtering and Search', () => {
        it('should filter notes by folder', () => {
            notesManager.setCurrentFolder('work');
            
            expect(notesManager.filteredNotes.length).toBe(1);
            expect(notesManager.filteredNotes[0].folder).toBe('work');
        });

        it('should show all notes when folder is "all"', () => {
            notesManager.setCurrentFolder('all');
            expect(notesManager.filteredNotes.length).toBe(3);
        });

        it('should filter notes by search query', () => {
            notesManager.searchQuery = 'first';
            notesManager.filterAndRenderNotes();
            
            expect(notesManager.filteredNotes.length).toBe(1);
            expect(notesManager.filteredNotes[0].title).toBe('First Note');
        });

        it('should search in content and tags', () => {
            notesManager.searchQuery = 'tag1';
            notesManager.filterAndRenderNotes();
            
            expect(notesManager.filteredNotes.length).toBe(2);
        });

        it('should be case insensitive', () => {
            notesManager.searchQuery = 'FIRST';
            notesManager.filterAndRenderNotes();
            
            expect(notesManager.filteredNotes.length).toBe(1);
        });

        it('should combine folder and search filters', () => {
            notesManager.setCurrentFolder('work');
            notesManager.searchQuery = 'second';
            notesManager.filterAndRenderNotes();
            
            expect(notesManager.filteredNotes.length).toBe(1);
            expect(notesManager.filteredNotes[0].title).toBe('Second Note');
        });
    });

    describe('Sorting', () => {
        beforeEach(() => {
            // Modify test notes to have different timestamps
            testNotes[0].updatedAt = '2023-01-01T00:00:00Z';
            testNotes[1].updatedAt = '2023-01-02T00:00:00Z';
            testNotes[2].updatedAt = '2023-01-03T00:00:00Z';
            notesManager.notes = [...testNotes];
            notesManager.filteredNotes = [...testNotes];
        });

        it('should sort by newest first by default', () => {
            notesManager.sortOrder = 'newest';
            notesManager.sortNotes();
            
            expect(notesManager.filteredNotes[0].title).toBe('Third Note');
            expect(notesManager.filteredNotes[2].title).toBe('First Note');
        });

        it('should sort by oldest first', () => {
            notesManager.sortOrder = 'oldest';
            notesManager.sortNotes();
            
            expect(notesManager.filteredNotes[0].title).toBe('First Note');
            expect(notesManager.filteredNotes[2].title).toBe('Third Note');
        });

        it('should sort alphabetically', () => {
            notesManager.sortOrder = 'alphabetical';
            notesManager.sortNotes();
            
            expect(notesManager.filteredNotes[0].title).toBe('First Note');
            expect(notesManager.filteredNotes[1].title).toBe('Second Note');
            expect(notesManager.filteredNotes[2].title).toBe('Third Note');
        });

        it('should cycle through sort orders', () => {
            notesManager.sortOrder = 'newest';
            notesManager.cycleSortOrder();
            expect(notesManager.sortOrder).toBe('oldest');
            
            notesManager.cycleSortOrder();
            expect(notesManager.sortOrder).toBe('alphabetical');
            
            notesManager.cycleSortOrder();
            expect(notesManager.sortOrder).toBe('newest');
        });
    });

    describe('Export Functionality', () => {
        beforeEach(async () => {
            await notesManager.selectNote(testNotes[0].id);
        });

        it('should export note as markdown', () => {
            const note = testNotes[0];
            
            // Mock download function
            let downloadedContent = '';
            notesManager.downloadFile = (content) => {
                downloadedContent = content;
            };
            
            notesManager.exportNote(note, 'markdown');
            
            expect(downloadedContent).toContain('# First Note');
            expect(downloadedContent).toContain('Content of first note');
            expect(downloadedContent).toContain('tag1, important');
        });

        it('should export note as HTML', () => {
            const note = testNotes[0];
            
            let downloadedContent = '';
            notesManager.downloadFile = (content) => {
                downloadedContent = content;
            };
            
            notesManager.exportNote(note, 'html');
            
            expect(downloadedContent).toContain('<title>First Note</title>');
            expect(downloadedContent).toContain('<h1>First Note</h1>');
            expect(downloadedContent).toContain('Content of first note');
        });

        it('should export note as plain text', () => {
            const note = testNotes[0];
            
            let downloadedContent = '';
            notesManager.downloadFile = (content) => {
                downloadedContent = content;
            };
            
            notesManager.exportNote(note, 'txt');
            
            expect(downloadedContent).toContain('First Note');
            expect(downloadedContent).toContain('==========');
            expect(downloadedContent).toContain('Content of first note');
        });
    });

    describe('Utility Functions', () => {
        it('should escape HTML correctly', () => {
            const html = '<script>alert("xss")</script>';
            const escaped = notesManager.escapeHtml(html);
            
            expect(escaped).toBe('&lt;script&gt;alert("xss")&lt;/script&gt;');
        });

        it('should generate preview text', () => {
            const longText = 'a'.repeat(150);
            const preview = notesManager.getPreview(longText, 100);
            
            expect(preview.length).toBe(103); // 100 + '...'
            expect(preview.endsWith('...')).toBe(true);
        });

        it('should format dates correctly', () => {
            const now = new Date();
            const today = notesManager.formatDate(now.toISOString());
            
            expect(today).toMatch(/\d{1,2}:\d{2}/); // Should show time for today
            
            const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            const yesterdayFormat = notesManager.formatDate(yesterday.toISOString());
            expect(yesterdayFormat).toBe('Yesterday');
        });
    });

    describe('Keyboard Shortcuts', () => {
        it('should handle Ctrl+N for new note', () => {
            let newNoteCalled = false;
            notesManager.createNewNote = () => { newNoteCalled = true; };
            
            const event = new KeyboardEvent('keydown', {
                key: 'n',
                ctrlKey: true
            });
            
            notesManager.handleKeyboardShortcuts(event);
            expect(newNoteCalled).toBe(true);
        });

        it('should handle Ctrl+S for save', () => {
            notesManager.currentNote = testNotes[0];
            let saveCalled = false;
            notesManager.saveCurrentNote = () => { saveCalled = true; };
            
            const event = new KeyboardEvent('keydown', {
                key: 's',
                ctrlKey: true
            });
            
            notesManager.handleKeyboardShortcuts(event);
            expect(saveCalled).toBe(true);
        });

        it('should handle Escape key', () => {
            notesManager.currentNote = testNotes[0];
            notesManager.searchQuery = 'test';
            
            // Mock search input
            document.body.innerHTML = '<input id="search-input" value="test">';
            
            const event = new KeyboardEvent('keydown', { key: 'Escape' });
            notesManager.handleKeyboardShortcuts(event);
            
            const searchInput = document.getElementById('search-input');
            expect(searchInput.value).toBe('');
            expect(notesManager.searchQuery).toBe('');
        });
    });

    describe('Error Handling', () => {
        it('should handle storage errors gracefully', async () => {
            // Mock storage to throw error
            mockStorageManager.createNote = () => {
                throw new Error('Storage error');
            };
            
            let toastMessage = '';
            window.uiManager.showToast = (message, type) => {
                toastMessage = message;
            };
            
            await notesManager.createNewNote();
            expect(toastMessage).toContain('Failed to create note');
        });

        it('should handle missing DOM elements', () => {
            // Clear DOM
            document.body.innerHTML = '';
            
            // Should not throw error
            expect(() => {
                notesManager.renderNotesList();
                notesManager.renderEmptyEditor();
            }).not.toThrow();
        });
    });
});
