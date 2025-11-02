/**
 * Notes Management System
 * Handles note creation, editing, and organization
 */

class NotesManager {
    constructor(storage) {
        this.storage = storage;
        this.notes = [];
        this.filteredNotes = [];
        this.currentNote = null;
        this.currentFolder = 'all';
        this.searchQuery = '';
        this.currentTagFilter = null;
        this.sortOrder = 'newest'; // newest, oldest, alphabetical
        
        this.init();
    }

    /**
     * Initialize notes manager
     */
    async init() {
        await this.loadNotes();
        this.setupEventListeners();
        this.renderNotesList();
        this.updateFolderCounts();
    }

    /**
     * Load and display all notes
     */
    async loadNotes() {
        try {
            this.notes = await this.storage.getAllNotes();
            this.filterAndRenderNotes();
            this.renderFolders();
            this.updateTagCounts();
        } catch (error) {
            console.error('Error loading notes:', error);
            this.showToast('Failed to load notes', 'error');
        }
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // New note button
        const newNoteBtn = document.getElementById('new-note-btn');
        // New note creation
        document.getElementById('new-note-btn').addEventListener('click', () => {
            this.createNewNote();
        });

        // New folder creation
        document.getElementById('new-folder-btn').addEventListener('click', () => {
            this.createNewFolder();
        });

        // Search input
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchQuery = e.target.value;
                this.filterAndRenderNotes();
            });
        }

        // Sort toggle - use once() to prevent double-firing
        const sortToggle = document.getElementById('sort-toggle');
        if (sortToggle) {
            // Remove any existing listeners first
            sortToggle.removeEventListener('click', this.sortClickHandler);
            this.sortClickHandler = () => this.cycleSortOrder();
            sortToggle.addEventListener('click', this.sortClickHandler);
        }

        // Folder navigation
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('folder-item')) {
                const folder = e.target.getAttribute('data-folder');
                this.setCurrentFolder(folder);
            }
        });

        // Note selection
        document.addEventListener('click', (e) => {
            if (e.target.closest('.note-item')) {
                const noteId = e.target.closest('.note-item').getAttribute('data-note-id');
                this.selectNote(noteId);
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });

        // Formatting keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
                switch (e.key.toLowerCase()) {
                    case 'b':
                        e.preventDefault();
                        this.applyFormatting('bold');
                        break;
                    case 'i':
                        e.preventDefault();
                        this.applyFormatting('italic');
                        break;
                }
            }
        });
    }

    /**
     * Handle keyboard shortcuts
     */
    handleKeyboardShortcuts(e) {
        // Ctrl/Cmd + N: New note
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            this.createNewNote();
        }
        
        // Ctrl/Cmd + S: Save current note
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            if (this.currentNote) {
                this.saveCurrentNote();
            }
        }
        
        // Ctrl/Cmd + F: Focus search
        if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
            e.preventDefault();
            const searchInput = document.getElementById('search-input');
            if (searchInput) {
                searchInput.focus();
            }
        }
        
        // Escape: Clear search or deselect note
        if (e.key === 'Escape') {
            const searchInput = document.getElementById('search-input');
            if (searchInput && searchInput.value) {
                searchInput.value = '';
                this.searchQuery = '';
                this.filterAndRenderNotes();
            } else if (this.currentNote) {
                this.deselectNote();
            }
        }
    }

    /**
     * Create a new note
     */
    async createNewNote() {
        try {
            const noteData = {
                title: 'Untitled Note',
                content: '',
                folder: this.currentFolder === 'all' ? 'default' : this.currentFolder,
                tags: []
            };

            const newNote = await this.storage.createNote(noteData);
            this.notes.unshift(newNote);
            this.filterAndRenderNotes();
            this.selectNote(newNote.id);
            this.updateFolderCounts();
            this.updateTagCounts();
            
            // Focus on title for immediate editing
            setTimeout(() => {
                const titleInput = document.querySelector('.note-title-input');
                if (titleInput) {
                    titleInput.focus();
                    titleInput.select();
                }
            }, 100);
            
            this.showToast('New note created', 'success');
        } catch (error) {
            console.error('Failed to create note:', error);
            this.showToast('Failed to create note', 'error');
        }
    }

    /**
     * Create a new folder
     */
    async createNewFolder() {
        const folderName = prompt('Enter folder name:');
        if (!folderName || !folderName.trim()) {
            return;
        }

        const cleanFolderName = folderName.trim();
        
        // Check if folder already exists
        const existingFolders = this.getFolderNames();
        if (existingFolders.includes(cleanFolderName)) {
            this.showToast('Folder already exists', 'error');
            return;
        }

        // Add folder to the list and render
        this.renderFolders();
        this.showToast(`Folder "${cleanFolderName}" created`, 'success');
    }

    /**
     * Get all unique folder names from notes
     */
    getFolderNames() {
        const folders = new Set();
        this.notes.forEach(note => {
            if (note.folder && note.folder !== 'default') {
                folders.add(note.folder);
            }
        });
        return Array.from(folders);
    }

    /**
     * Update tag counts in sidebar
     */
    updateTagCounts() {
        const tagsList = document.getElementById('tags-list');
        if (!tagsList) return;

        // Get all unique tags from notes
        const tagCounts = new Map();
        this.notes.forEach(note => {
            if (note.tags && Array.isArray(note.tags)) {
                note.tags.forEach(tag => {
                    const cleanTag = tag.trim();
                    if (cleanTag) {
                        tagCounts.set(cleanTag, (tagCounts.get(cleanTag) || 0) + 1);
                    }
                });
            }
        });

        // Build HTML for tags
        let tagsHTML = '';
        if (tagCounts.size === 0) {
            tagsHTML = '<li class="empty-state">No tags yet</li>';
        } else {
            tagCounts.forEach((count, tag) => {
                const isActive = this.currentTagFilter === tag ? 'active' : '';
                tagsHTML += `
                    <li role="listitem">
                        <button class="tag-item ${isActive}" data-tag="${tag}">
                            🏷️ ${tag} <span class="count">(${count})</span>
                        </button>
                    </li>
                `;
            });
        }

        tagsList.innerHTML = tagsHTML;

        // Add event listeners for tag filtering
        tagsList.querySelectorAll('.tag-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tag = e.target.dataset.tag;
                this.filterByTag(tag);
            });
        });
    }

    /**
     * Render folders in sidebar
     */
    renderFolders() {
        const foldersList = document.getElementById('folders-list');
        if (!foldersList) return;

        const folders = this.getFolderNames();
        
        // Build HTML for folders
        let foldersHTML = `
            <li role="treeitem" aria-expanded="true">
                <button class="folder-item ${this.currentFolder === 'all' ? 'active' : ''}" data-folder="all">
                    📄 All Notes <span class="count">(${this.notes.length})</span>
                </button>
            </li>
        `;

        // Add default folder if it has notes
        const defaultNotes = this.notes.filter(note => note.folder === 'default' || !note.folder);
        if (defaultNotes.length > 0) {
            foldersHTML += `
                <li role="treeitem">
                    <button class="folder-item ${this.currentFolder === 'default' ? 'active' : ''}" data-folder="default">
                        📁 Default <span class="count">(${defaultNotes.length})</span>
                    </button>
                </li>
            `;
        }

        // Add other folders
        folders.forEach(folder => {
            const folderNotes = this.notes.filter(note => note.folder === folder);
            foldersHTML += `
                <li role="treeitem">
                    <button class="folder-item ${this.currentFolder === folder ? 'active' : ''}" data-folder="${folder}">
                        📁 ${folder} <span class="count">(${folderNotes.length})</span>
                    </button>
                </li>
            `;
        });

        foldersList.innerHTML = foldersHTML;
    }

    /**
     * Select and display a note
     */
    async selectNote(noteId) {
        try {
            // Save current note if it exists and has changes
            if (this.currentNote) {
                await this.saveCurrentNote();
            }
            
            const note = this.notes.find(n => n.id === noteId);
            if (!note) return;
            
            this.currentNote = note;
            this.renderNoteEditor(note);
            this.updateActiveNoteInList(noteId);
            
            // Switch to editor panel on mobile
            if (window.innerWidth <= 768) {
                const uiManager = window.app?.ui;
                if (uiManager && uiManager.switchMobilePanel) {
                    uiManager.switchMobilePanel('main-editor');
                }
            }
            
            // Auto-focus on content for immediate editing
            setTimeout(() => {
                const contentTextarea = document.getElementById('note-content');
                if (contentTextarea) {
                    contentTextarea.focus();
                }
            }, 100);
            
        } catch (error) {
            console.error('Error selecting note:', error);
        }
    }

    /**
     * Deselect current note
     */
    deselectNote() {
        this.currentNote = null;
        this.renderEmptyEditor();
        this.updateActiveNoteInList(null);
        
        // Clear URL hash
        if (history.pushState) {
            history.pushState(null, null, window.location.pathname);
        }
    }

    /**
     * Save current note
     */
    async saveCurrentNote() {
        if (!this.currentNote || !this.quillEditor) return;

        try {
            const titleInput = document.querySelector('.note-title-input');
            const tagsInput = document.querySelector('.note-tags-input');

            if (!titleInput) return;

            const updates = {
                title: titleInput.value.trim() || 'Untitled Note',
                content: this.quillEditor.root.innerHTML,
                tags: tagsInput ? this.parseTags(tagsInput.value) : this.currentNote.tags
            };

            // Only save if there are actual changes
            if (this.hasNoteChanged(updates)) {
                const updatedNote = await this.storage.updateNote(this.currentNote.id, updates);
                
                // Update local copy
                const noteIndex = this.notes.findIndex(n => n.id === this.currentNote.id);
                if (noteIndex !== -1) {
                    this.notes[noteIndex] = updatedNote;
                }
                
                this.currentNote = updatedNote;
                this.filterAndRenderNotes();
                this.updateFolderCounts();
                
                // Show subtle save indicator
                this.showSaveIndicator();
            }
        } catch (error) {
            console.error('Failed to save note:', error);
            this.showToast('Failed to save note', 'error');
        }
    }

    /**
     * Check if note has changed
     */
    hasNoteChanged(updates) {
        return (
            updates.title !== this.currentNote.title ||
            updates.content !== this.currentNote.content ||
            JSON.stringify(updates.tags) !== JSON.stringify(this.currentNote.tags)
        );
    }

    /**
     * Delete a note
     */
    async deleteNote(noteId) {
        if (!confirm('Are you sure you want to delete this note? This action cannot be undone.')) {
            return;
        }

        try {
            await this.storage.deleteNote(noteId);
            
            // Remove from local array
            this.notes = this.notes.filter(n => n.id !== noteId);
            
            // If this was the current note, deselect it
            if (this.currentNote && this.currentNote.id === noteId) {
                this.deselectNote();
            }
            
            this.filterAndRenderNotes();
            this.updateFolderCounts();
            this.showToast('Note deleted', 'success');
        } catch (error) {
            console.error('Failed to delete note:', error);
            this.showToast('Failed to delete note', 'error');
        }
    }

    /**
     * Set current folder filter
     */
    setCurrentFolder(folder) {
        this.currentFolder = folder;
        this.currentTagFilter = null; // Clear tag filter when switching folders
        this.updateActiveFolderInSidebar(folder);
        this.filterAndRenderNotes();
        
        // Clear tag active states
        document.querySelectorAll('.tag-item').forEach(btn => btn.classList.remove('active'));
    }

    /**
     * Filter and render notes based on current criteria
     */
    filterAndRenderNotes() {
        this.filteredNotes = this.notes.filter(note => {
            // Folder filter
            if (this.currentFolder !== 'all' && note.folder !== this.currentFolder) {
                return false;
            }
            
            // Tag filter
            if (this.currentTagFilter) {
                if (!note.tags.includes(this.currentTagFilter)) {
                    return false;
                }
            }
            
            // Search filter
            if (this.searchQuery) {
                const query = this.searchQuery.toLowerCase();
                return (
                    note.title.toLowerCase().includes(query) ||
                    note.content.toLowerCase().includes(query) ||
                    note.tags.some(tag => tag.toLowerCase().includes(query))
                );
            }
            
            return true;
        });

        this.sortNotes();
        this.renderNotesList();
        this.updateTagsList();
    }

    /**
     * Update the tags list in sidebar
     */
    updateTagsList() {
        const tagCounts = {};
        
        // Count occurrences of each tag across all notes
        this.notes.forEach(note => {
            note.tags.forEach(tag => {
                tagCounts[tag] = (tagCounts[tag] || 0) + 1;
            });
        });
        
        // Sort tags by count (descending) then alphabetically
        const sortedTags = Object.entries(tagCounts)
            .sort(([a, countA], [b, countB]) => {
                if (countA !== countB) return countB - countA;
                return a.localeCompare(b);
            });
        
        this.renderTagsList(sortedTags);
    }

    /**
     * Render tags list in sidebar
     */
    renderTagsList(tagEntries) {
        const tagsList = document.getElementById('tags-list');
        if (!tagsList) return;
        
        if (tagEntries.length === 0) {
            tagsList.innerHTML = '<li class="nav-item"><span class="empty-state">No tags yet</span></li>';
            return;
        }
        
        tagsList.innerHTML = tagEntries.map(([tag, count]) => `
            <li class="nav-item">
                <button class="tag-item" data-tag="${this.escapeHtml(tag)}" title="Filter by tag: ${this.escapeHtml(tag)}">
                    🏷️ ${this.escapeHtml(tag)} <span class="count">(${count})</span>
                </button>
            </li>
        `).join('');
        
        // Add click handlers for tag filtering
        tagsList.querySelectorAll('.tag-item').forEach(tagBtn => {
            tagBtn.addEventListener('click', (e) => {
                const tag = e.target.dataset.tag;
                this.filterByTag(tag);
            });
        });
    }

    /**
     * Filter notes by tag
     */
    filterByTag(tag) {
        this.currentFolder = 'all'; // Reset folder filter
        this.searchQuery = ''; // Clear search query
        this.currentTagFilter = tag; // Set tag filter
        this.filterAndRenderNotes();
        
        // Update active states
        document.querySelectorAll('.tag-item').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-tag="${tag}"]`)?.classList.add('active');
        document.querySelectorAll('.folder-item').forEach(btn => btn.classList.remove('active'));
        document.querySelector('[data-folder="all"]')?.classList.add('active');
        
        // Clear search input
        const searchInput = document.getElementById('search-input');
        if (searchInput) searchInput.value = '';
    }

    /**
     * Sort notes based on current sort order
     */
    sortNotes() {
        switch (this.sortOrder) {
            case 'newest':
                this.filteredNotes.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
                break;
            case 'oldest':
                this.filteredNotes.sort((a, b) => new Date(a.updatedAt) - new Date(b.updatedAt));
                break;
            case 'alphabetical':
                this.filteredNotes.sort((a, b) => a.title.localeCompare(b.title));
                break;
        }
    }

    /**
     * Cycle through sort orders
     */
    cycleSortOrder() {
        const orders = ['newest', 'oldest', 'alphabetical'];
        const currentIndex = orders.indexOf(this.sortOrder);
        this.sortOrder = orders[(currentIndex + 1) % orders.length];
        
        this.filterAndRenderNotes();
        this.updateSortButton();
        this.showToast(`Sorted by ${this.sortOrder}`, 'success');
    }

    /**
     * Update sort button appearance
     */
    updateSortButton() {
        const sortBtn = document.getElementById('sort-toggle');
        if (!sortBtn) return;

        const icons = {
            newest: '📅',
            oldest: '📆',
            alphabetical: '🔤'
        };

        sortBtn.textContent = icons[this.sortOrder];
        sortBtn.title = `Sort by ${this.sortOrder}`;
    }

    /**
     * Parse tags from input string
     */
    parseTags(tagsString) {
        return tagsString
            .split(',')
            .map(tag => tag.trim())
            .filter(tag => tag.length > 0);
    }

    /**
     * Render notes list
     */
    renderNotesList() {
        const notesList = document.getElementById('notes-list');
        if (!notesList) return;

        if (this.filteredNotes.length === 0) {
            notesList.innerHTML = `
                <div class="empty-state" role="status" aria-live="polite">
                    <p>📝 ${this.searchQuery ? 'No notes match your search.' : 'No notes in this folder.'}</p>
                </div>
            `;
            return;
        }

        notesList.innerHTML = this.filteredNotes.map(note => `
            <div class="note-item" data-note-id="${note.id}" role="button" tabindex="0" 
                 aria-label="Note: ${this.escapeHtml(note.title)}">
                <div class="note-title">${this.escapeHtml(note.title)}</div>
                <div class="note-preview">${this.escapeHtml(this.getPreview(note.content))}</div>
                <div class="note-meta">
                    <span class="note-date">${this.formatDate(note.updatedAt)}</span>
                    <span class="note-tags">
                        ${note.tags.map(tag => `<span class="tag">#${this.escapeHtml(tag)}</span>`).join('')}
                    </span>
                </div>
                <button class="note-delete" data-note-id="${note.id}" aria-label="Delete note" title="Delete note">
                    🗑️
                </button>
            </div>
        `).join('');

        // Add event listeners for delete buttons
        notesList.querySelectorAll('.note-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const noteId = btn.getAttribute('data-note-id');
                this.showDeleteConfirmation(noteId);
            });
        });

        // Add keyboard navigation for note items
        notesList.querySelectorAll('.note-item').forEach(item => {
            item.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    const noteId = item.getAttribute('data-note-id');
                    this.selectNote(noteId);
                }
            });
        });
    }

    /**
     * Render note editor
     */
    renderNoteEditor(note) {
        const editorContainer = document.getElementById('editor-container');
        if (!editorContainer) return;

        editorContainer.innerHTML = `
            <div class="note-editor">
                <div class="editor-header">
                    <input 
                        type="text" 
                        class="note-title-input" 
                        value="${this.escapeHtml(note.title)}"
                        placeholder="Note title..."
                        aria-label="Note title"
                    >
                    <div class="editor-actions">
                        <div class="formatting-toolbar">
                            <button class="format-btn" data-format="bold" title="Bold (Ctrl+B)" aria-label="Bold">
                                <strong>B</strong>
                            </button>
                            <button class="format-btn" data-format="italic" title="Italic (Ctrl+I)" aria-label="Italic">
                                <em>I</em>
                            </button>
                            <button class="format-btn" data-format="heading" title="Heading" aria-label="Heading">
                                H1
                            </button>
                            <button class="format-btn" data-format="list" title="Bullet List" aria-label="Bullet List">
                                •
                            </button>
                            <button class="format-btn" data-format="link" title="Link" aria-label="Insert Link">
                                🔗
                            </button>
                        </div>
                        <div class="editor-main-actions">
                            <button class="btn btn-secondary" id="save-note-btn" aria-label="Save note">
                                💾 Save
                            </button>
                            <button class="btn btn-secondary" id="export-note-btn" aria-label="Export note">
                                📤 Export
                            </button>
                        </div>
                    </div>
                </div>
                
                <div class="editor-toolbar">
                    <input 
                        type="text" 
                        class="note-tags-input" 
                        value="${note.tags.join(', ')}"
                        placeholder="Tags (comma-separated)..."
                        aria-label="Note tags"
                    >
                </div>
                
                <div id="note-content" class="note-content-input"></div>
                
                <div class="editor-footer">
                    <div class="editor-stats">
                        <span class="word-count">0 words</span>
                        <span class="char-count">0 characters</span>
                        <span class="last-saved">Last saved: ${this.formatDate(note.updatedAt)}</span>
                    </div>
                </div>
            </div>
        `;

        // Initialize Quill editor
        this.initializeQuillEditor(note);
        
        // Set up editor actions
        this.setupEditorActions();
    }

    /**
     * Render empty editor state
     */
    renderEmptyEditor() {
        const editorContainer = document.getElementById('editor-container');
        if (!editorContainer) return;

        editorContainer.innerHTML = `
            <div class="empty-editor" role="status" aria-live="polite">
                <h2>✨ Welcome to Offline</h2>
                <p>Your privacy-focused note-taking app that works entirely in your browser.</p>
                <ul>
                    <li>🔒 <strong>Private:</strong> All data stays on your device</li>
                    <li>🌐 <strong>Offline:</strong> No internet required</li>
                    <li>♿ <strong>Accessible:</strong> Built for everyone</li>
                    <li>📤 <strong>Portable:</strong> Export your data anytime</li>
                </ul>
                <p>Create a new note to begin writing!</p>
            </div>
        `;
    }

    /**
     * Set up auto-save functionality
     */
    setupAutoSave() {
        let saveTimeout;
        
        const inputs = document.querySelectorAll('.note-title-input, .note-content-input, .note-tags-input');
        inputs.forEach(input => {
            input.addEventListener('input', () => {
                clearTimeout(saveTimeout);
                saveTimeout = setTimeout(() => {
                    this.saveCurrentNote();
                }, 2000); // Auto-save after 2 seconds of inactivity
            });
        });
    }

    /**
     * Set up editor statistics
     */
    setupEditorStats() {
        const contentInput = document.querySelector('.note-content-input');
        if (contentInput) {
            contentInput.addEventListener('input', () => {
                this.updateEditorStats();
            });
        }
    }

    /**
     * Initialize Quill rich text editor
     */
    initializeQuillEditor(note) {
        if (this.quillEditor) {
            // Clean up existing editor
            this.quillEditor = null;
        }

        const editorContainer = document.getElementById('note-content');
        if (!editorContainer) return;

        // Initialize Quill with minimal toolbar
        this.quillEditor = new Quill('#note-content', {
            theme: 'snow',
            modules: {
                toolbar: [
                    ['bold', 'italic', 'underline'],
                    ['link', 'blockquote', 'code-block'],
                    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                    [{ 'header': [1, 2, 3, false] }],
                    ['clean']
                ]
            },
            placeholder: 'Start writing your note...'
        });

        // Set initial content
        this.quillEditor.root.innerHTML = note.content || '';

        // Set up auto-save on content change
        this.quillEditor.on('text-change', () => {
            clearTimeout(this.saveTimeout);
            this.saveTimeout = setTimeout(() => {
                this.saveCurrentNote();
            }, 2000);
            this.updateEditorStats();
        });

        // Update stats immediately
        this.updateEditorStats();
    }

    /**
     * Set up editor actions
     */
    setupEditorActions() {
        const saveBtn = document.getElementById('save-note-btn');
        const exportBtn = document.getElementById('export-note-btn');
        
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveCurrentNote());
        }
        
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportCurrentNote());
        }
    }

    /**
     * Update editor statistics
     */
    updateEditorStats() {
        const wordCountEl = document.querySelector('.word-count');
        const charCountEl = document.querySelector('.char-count');
        
        if (!wordCountEl || !charCountEl || !this.quillEditor) return;
        
        const content = this.quillEditor.getText();
        const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
        const charCount = content.length;
        
        wordCountEl.textContent = `${wordCount} word${wordCount !== 1 ? 's' : ''}`;
        charCountEl.textContent = `${charCount} character${charCount !== 1 ? 's' : ''}`;
    }

    /**
     * Export current note
     */
    async exportCurrentNote() {
        if (!this.currentNote) return;
        
        const formats = ['markdown', 'html', 'txt'];
        const format = await this.showFormatSelector(formats);
        
        if (format) {
            this.exportNote(this.currentNote, format);
        }
    }

    /**
     * Export note in specified format
     */
    exportNote(note, format) {
        let content, filename, mimeType;
        
        switch (format) {
            case 'markdown':
                content = `# ${note.title}\n\n${note.content}\n\n---\nTags: ${note.tags.join(', ')}\nCreated: ${note.createdAt}\nUpdated: ${note.updatedAt}`;
                filename = `${note.title}.md`;
                mimeType = 'text/markdown';
                break;
                
            case 'html':
                content = `<!DOCTYPE html>
<html>
<head>
    <title>${this.escapeHtml(note.title)}</title>
    <meta charset="UTF-8">
</head>
<body>
    <h1>${this.escapeHtml(note.title)}</h1>
    <pre>${this.escapeHtml(note.content)}</pre>
    <hr>
    <p><strong>Tags:</strong> ${note.tags.map(tag => this.escapeHtml(tag)).join(', ')}</p>
    <p><strong>Created:</strong> ${note.createdAt}</p>
    <p><strong>Updated:</strong> ${note.updatedAt}</p>
</body>
</html>`;
                filename = `${note.title}.html`;
                mimeType = 'text/html';
                break;
                
            case 'txt':
                content = `${note.title}\n${'='.repeat(note.title.length)}\n\n${note.content}\n\n---\nTags: ${note.tags.join(', ')}\nCreated: ${note.createdAt}\nUpdated: ${note.updatedAt}`;
                filename = `${note.title}.txt`;
                mimeType = 'text/plain';
                break;
        }
        
        this.downloadFile(content, filename, mimeType);
    }

    /**
     * Download file
     */
    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showToast(`Exported as ${filename}`, 'success');
    }

    /**
     * Utility functions
     */
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    getPreview(content, maxLength = 100) {
        return content.length > maxLength ? content.substring(0, maxLength) + '...' : content;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else if (diffDays === 1) {
            return 'Yesterday';
        } else if (diffDays < 7) {
            return `${diffDays} days ago`;
        } else {
            return date.toLocaleDateString();
        }
    }

    updateActiveNoteInList(noteId) {
        const noteItems = document.querySelectorAll('.note-item');
        noteItems.forEach(item => {
            item.classList.toggle('active', item.getAttribute('data-note-id') === noteId);
        });
    }

    updateActiveFolderInSidebar(folder) {
        const folderItems = document.querySelectorAll('.folder-item');
        folderItems.forEach(item => {
            item.classList.toggle('active', item.getAttribute('data-folder') === folder);
        });
    }

    updateFolderCounts() {
        const folderCounts = {};
        this.notes.forEach(note => {
            folderCounts[note.folder] = (folderCounts[note.folder] || 0) + 1;
        });
        
        // Update all notes count
        const allNotesBtn = document.querySelector('[data-folder="all"] .count');
        if (allNotesBtn) {
            allNotesBtn.textContent = `(${this.notes.length})`;
        }
        
        // Update individual folder counts
        Object.entries(folderCounts).forEach(([folder, count]) => {
            const folderBtn = document.querySelector(`[data-folder="${folder}"] .count`);
            if (folderBtn) {
                folderBtn.textContent = `(${count})`;
            }
        });
    }

    /**
     * Apply text formatting to selected text in editor
     */
    applyFormatting(format) {
        const contentTextarea = document.getElementById('note-content');
        if (!contentTextarea) return;

        const start = contentTextarea.selectionStart;
        const end = contentTextarea.selectionEnd;
        const selectedText = contentTextarea.value.substring(start, end);
        const beforeText = contentTextarea.value.substring(0, start);
        const afterText = contentTextarea.value.substring(end);

        let formattedText = '';
        let cursorOffset = 0;

        switch (format) {
            case 'bold':
                formattedText = `**${selectedText}**`;
                cursorOffset = selectedText ? 0 : 2; // Position cursor between ** if no selection
                break;
            case 'italic':
                formattedText = `*${selectedText}*`;
                cursorOffset = selectedText ? 0 : 1;
                break;
            case 'heading':
                formattedText = `# ${selectedText}`;
                cursorOffset = selectedText ? 0 : 2;
                break;
            case 'list':
                formattedText = `- ${selectedText}`;
                cursorOffset = selectedText ? 0 : 2;
                break;
            case 'link':
                const url = selectedText.startsWith('http') ? selectedText : 'https://';
                const linkText = selectedText.startsWith('http') ? 'Link text' : selectedText || 'Link text';
                formattedText = `[${linkText}](${url})`;
                cursorOffset = selectedText ? 0 : 1;
                break;
            default:
                return;
        }

        // Update textarea content
        contentTextarea.value = beforeText + formattedText + afterText;
        
        // Set cursor position
        const newCursorPos = start + formattedText.length - cursorOffset;
        contentTextarea.setSelectionRange(newCursorPos, newCursorPos);
        contentTextarea.focus();

        // Trigger auto-save
        this.saveCurrentNote();
    }

    /**
     * Show save indicator
     */
    showSaveIndicator() {
        const saveBtn = document.getElementById('save-note-btn');
        if (saveBtn) {
            const originalText = saveBtn.innerHTML;
            saveBtn.innerHTML = '✅ Saved';
            saveBtn.disabled = true;
            
            setTimeout(() => {
                saveBtn.innerHTML = originalText;
                saveBtn.disabled = false;
            }, 2000);
        }
    }

    /**
     * Show toast notification
     */
    showToast(message, type = 'info') {
        // This will be implemented by the UI manager
        if (window.uiManager) {
            window.uiManager.showToast(message, type);
        }
    }

    /**
     * Show format selector dialog
     */
    async showFormatSelector(formats) {
    return new Promise((resolve) => {
        // Create modal dialog
        const modal = document.createElement('div');
        modal.className = 'export-modal';
        modal.innerHTML = `
            <div class="export-modal-content">
                <h3>Export Note</h3>
                <p>Choose export format:</p>
                <div class="export-format-buttons">
                    ${formats.map(format => `
                        <button class="btn btn-primary export-format-btn" data-format="${format}">
                            ${this.getFormatIcon(format)} ${format.toUpperCase()}
                        </button>
                    `).join('')}
                </div>
                <div class="export-modal-actions">
                    <button class="btn btn-secondary export-cancel-btn">Cancel</button>
                </div>
            </div>
        `;
        
        // Add to page
        document.body.appendChild(modal);
        
        // Add event listeners
        modal.querySelectorAll('.export-format-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const format = btn.dataset.format;
                document.body.removeChild(modal);
                resolve(format);
            });
        });
        
        modal.querySelector('.export-cancel-btn').addEventListener('click', () => {
            document.body.removeChild(modal);
            resolve(null);
        });
        
        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
                resolve(null);
            }
        });
        
        // Focus first button
        setTimeout(() => {
            modal.querySelector('.export-format-btn')?.focus();
        }, 100);
    });
}

    /**
     * Get icon for export format
     */
    getFormatIcon(format) {
        const icons = {
            markdown: '📝',
            html: '🌐', 
            txt: '📄'
        };
        return icons[format] || '📤';
    }

    /**
     * Show delete confirmation dialog
     */
    async showDeleteConfirmation(noteId) {
        const note = this.notes.find(n => n.id === noteId);
        if (!note) return;

        return new Promise((resolve) => {
            // Create modal dialog
            const modal = document.createElement('div');
            modal.className = 'delete-modal';
            modal.innerHTML = `
                <div class="delete-modal-content">
                    <h3>Delete Note</h3>
                    <p>Are you sure you want to delete "<strong>${this.escapeHtml(note.title)}</strong>"?</p>
                    <p class="delete-warning">This action cannot be undone.</p>
                    <div class="delete-modal-actions">
                        <button class="btn btn-secondary delete-cancel-btn">Cancel</button>
                        <button class="btn btn-danger delete-confirm-btn">Delete</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            modal.querySelector('.delete-confirm-btn').addEventListener('click', async () => {
                document.body.removeChild(modal);
                await this.performDeleteNote(noteId);
                resolve(true);
            });
            
            modal.querySelector('.delete-cancel-btn').addEventListener('click', () => {
                document.body.removeChild(modal);
                resolve(false);
            });
            
            // Close on backdrop click
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    document.body.removeChild(modal);
                    resolve(false);
                }
            });
            
            // Focus cancel button by default
            setTimeout(() => {
                modal.querySelector('.delete-cancel-btn')?.focus();
            }, 100);
        });
    }

    /**
     * Actually delete the note (without confirmation)
     */
    async performDeleteNote(noteId) {
        try {
            await this.storage.deleteNote(noteId);
            
            // Remove from local array
            this.notes = this.notes.filter(n => n.id !== noteId);
            
            // If this was the current note, deselect it
            if (this.currentNote && this.currentNote.id === noteId) {
                this.deselectNote();
            }
            
            this.filterAndRenderNotes();
            this.renderFolders();
            this.updateTagCounts();
            this.showToast('Note deleted', 'success');
        } catch (error) {
            console.error('Failed to delete note:', error);
            this.showToast('Failed to delete note', 'error');
        }
    }

}

// Export for use in other modules
window.NotesManager = NotesManager;
