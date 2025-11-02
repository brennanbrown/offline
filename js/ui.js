/**
 * UI Manager - Handles user interface interactions and responsive behavior
 */

class UIManager {
    constructor() {
        this.isMobile = window.innerWidth <= 768;
        this.isTablet = window.innerWidth <= 1024 && window.innerWidth > 768;
        this.sidebarVisible = !this.isMobile;
        this.notesPanelVisible = !this.isMobile;
        
        this.init();
    }

    /**
     * Initialize UI manager
     */
    init() {
        this.setupResponsiveLayout();
        this.setupToastSystem();
        this.setupLoadingOverlay();
        this.setupKeyboardNavigation();
        this.setupAccessibilityFeatures();
        
        // Listen for window resize
        window.addEventListener('resize', () => this.handleResize());
        
        // Listen for theme changes
        document.addEventListener('themechange', (e) => this.handleThemeChange(e));
    }

    /**
     * Set up responsive layout
     */
    setupResponsiveLayout() {
        this.updateLayoutClasses();
        
        // Add mobile navigation buttons if needed
        if (this.isMobile) {
            this.addMobileNavigation();
        }
    }

    /**
     * Update layout classes based on screen size
     */
    updateLayoutClasses() {
        const app = document.getElementById('app');
        const sidebar = document.getElementById('sidebar');
        const notesPanel = document.getElementById('notes-panel');
        
        if (!app || !sidebar || !notesPanel) return;
        
        // Remove existing responsive classes
        app.classList.remove('mobile-layout', 'tablet-layout', 'desktop-layout');
        sidebar.classList.remove('visible');
        notesPanel.classList.remove('visible');
        
        // Add appropriate classes
        if (this.isMobile) {
            app.classList.add('mobile-layout');
            if (this.sidebarVisible) sidebar.classList.add('visible');
            if (this.notesPanelVisible) notesPanel.classList.add('visible');
        } else if (this.isTablet) {
            app.classList.add('tablet-layout');
            if (this.notesPanelVisible) notesPanel.classList.add('visible');
        } else {
            app.classList.add('desktop-layout');
        }
    }

    /**
     * Add mobile navigation if needed
     */
    addMobileNavigation() {
        this.setupMobileNavigation();
        this.setupDesktopPanelToggles();
        this.removeUnusedElements();
    }

    /**
     * Setup mobile navigation system
     */
    setupMobileNavigation() {
        const mobileNav = document.getElementById('mobile-nav');
        if (!mobileNav) return;

        const navButtons = mobileNav.querySelectorAll('.mobile-nav-btn');
        const appContainer = document.getElementById('app');

        // Set initial state - show sidebar
        this.currentMobilePanel = 'sidebar';
        appContainer.className = 'app-container mobile-show-sidebar';

        navButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const panel = btn.dataset.panel;
                this.switchMobilePanel(panel);
            });
        });
    }

    /**
     * Switch mobile panel
     */
    switchMobilePanel(panel) {
        const appContainer = document.getElementById('app');
        const navButtons = document.querySelectorAll('.mobile-nav-btn');

        // Update panel state with new class names
        this.currentMobilePanel = panel;
        appContainer.className = `app-container mobile-show-${panel}`;

        // Update active button
        navButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.panel === panel);
        });
    }

    /**
     * Setup desktop panel toggles
     */
    setupDesktopPanelToggles() {
        // Create fixed position toggle buttons
        this.createDesktopToggle('sidebar');
        this.createDesktopToggle('notes-panel');
    }

    /**
     * Create desktop toggle button
     */
    createDesktopToggle(panelId) {
        const panel = document.getElementById(panelId);
        if (!panel) return;

        const toggleBtn = document.createElement('button');
        toggleBtn.className = `panel-toggle panel-toggle-${panelId}`;
        toggleBtn.innerHTML = '◀';
        toggleBtn.setAttribute('aria-label', `Toggle ${panelId.replace('-', ' ')}`);
        
        toggleBtn.addEventListener('click', () => {
            const appContainer = document.getElementById('app');
            const isHidden = panel.classList.contains('hidden');
            
            panel.classList.toggle('hidden');
            appContainer.classList.toggle(`${panelId}-hidden`);
            toggleBtn.textContent = isHidden ? '◀' : '▶';
        });

        // Add to body instead of panel
        document.body.appendChild(toggleBtn);
    }

    /**
     * Remove unused UI elements
     */
    removeUnusedElements() {
        // Remove any existing back buttons from notes panel (no longer needed with mobile nav)
        const panelHeader = document.querySelector('.panel-header');
        if (panelHeader) {
            const existingBackBtn = panelHeader.querySelector('.back-btn');
            if (existingBackBtn) {
                existingBackBtn.remove();
            }
        }
    }

    /**
     * Toggle sidebar visibility
     */
    toggleSidebar() {
        this.sidebarVisible = !this.sidebarVisible;
        this.updateLayoutClasses();
        
        if (this.sidebarVisible) {
            this.hideNotesPanel();
        }
    }

    /**
     * Show sidebar
     */
    showSidebar() {
        this.sidebarVisible = true;
        this.notesPanelVisible = false;
        this.updateLayoutClasses();
    }

    /**
     * Show notes panel
     */
    showNotesPanel() {
        this.notesPanelVisible = true;
        this.sidebarVisible = false;
        this.updateLayoutClasses();
    }

    /**
     * Hide notes panel
     */
    hideNotesPanel() {
        this.notesPanelVisible = false;
        this.updateLayoutClasses();
    }

    /**
     * Handle window resize
     */
    handleResize() {
        const wasIsMobile = this.isMobile;
        const wasIsTablet = this.isTablet;
        
        this.isMobile = window.innerWidth <= 768;
        this.isTablet = window.innerWidth <= 1024 && window.innerWidth > 768;
        
        // Reset visibility for desktop
        if (!this.isMobile && !this.isTablet) {
            this.sidebarVisible = true;
            this.notesPanelVisible = true;
        }
        
        // Add mobile navigation if switching to mobile
        if (this.isMobile && !wasIsMobile) {
            this.addMobileNavigation();
        }
        
        this.updateLayoutClasses();
    }

    /**
     * Set up toast notification system
     */
    setupToastSystem() {
        // Toast container should already exist in HTML
        this.toastContainer = document.getElementById('toast-container');
        if (!this.toastContainer) {
            console.warn('Toast container not found');
        }
    }

    /**
     * Show toast notification
     */
    showToast(message, type = 'info', duration = 3000) {
        if (!this.toastContainer) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'assertive');
        
        // Add icon based on type
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        
        toast.innerHTML = `
            <span class="toast-icon">${icons[type] || icons.info}</span>
            <span class="toast-message">${this.escapeHtml(message)}</span>
            <button class="toast-close" aria-label="Close notification">×</button>
        `;

        // Add close functionality
        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => this.hideToast(toast));

        // Add to container
        this.toastContainer.appendChild(toast);

        // Trigger animation
        setTimeout(() => toast.classList.add('visible'), 10);

        // Auto-hide after duration
        if (duration > 0) {
            setTimeout(() => this.hideToast(toast), duration);
        }

        return toast;
    }

    /**
     * Hide toast notification
     */
    hideToast(toast) {
        if (!toast || !toast.parentNode) return;

        toast.classList.remove('visible');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }

    /**
     * Set up loading overlay
     */
    setupLoadingOverlay() {
        this.loadingOverlay = document.getElementById('loading');
    }

    /**
     * Show loading overlay
     */
    showLoading(message = 'Loading...') {
        if (!this.loadingOverlay) return;

        const loadingText = this.loadingOverlay.querySelector('p');
        if (loadingText) {
            loadingText.textContent = message;
        }

        this.loadingOverlay.classList.add('visible');
        this.loadingOverlay.setAttribute('aria-hidden', 'false');
    }

    /**
     * Hide loading overlay
     */
    hideLoading() {
        if (!this.loadingOverlay) return;

        this.loadingOverlay.classList.remove('visible');
        this.loadingOverlay.setAttribute('aria-hidden', 'true');
    }

    /**
     * Set up keyboard navigation
     */
    setupKeyboardNavigation() {
        // Focus management for modals and dropdowns
        document.addEventListener('keydown', (e) => {
            // Escape key handling
            if (e.key === 'Escape') {
                this.handleEscapeKey(e);
            }
            
            // Tab trapping for modals
            if (e.key === 'Tab') {
                this.handleTabKey(e);
            }
        });

        // Focus visible elements when panels change
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('folder-item')) {
                // Focus first note when folder changes
                setTimeout(() => {
                    const firstNote = document.querySelector('.note-item');
                    if (firstNote && this.isMobile) {
                        this.showNotesPanel();
                    }
                }, 100);
            }
        });
    }

    /**
     * Handle escape key
     */
    handleEscapeKey(e) {
        // Close any open dropdowns
        const openDropdowns = document.querySelectorAll('.theme-dropdown[style*="block"]');
        openDropdowns.forEach(dropdown => {
            dropdown.style.display = 'none';
        });

        // Hide mobile panels
        if (this.isMobile) {
            if (this.notesPanelVisible) {
                this.showSidebar();
            } else if (this.sidebarVisible) {
                this.sidebarVisible = false;
                this.updateLayoutClasses();
            }
        }
    }

    /**
     * Handle tab key for focus management
     */
    handleTabKey(e) {
        // Get all focusable elements
        const focusableElements = this.getFocusableElements();
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        // Trap focus in visible areas on mobile
        if (this.isMobile) {
            const visibleElements = focusableElements.filter(el => {
                const rect = el.getBoundingClientRect();
                return rect.width > 0 && rect.height > 0;
            });

            if (visibleElements.length > 0) {
                const firstVisible = visibleElements[0];
                const lastVisible = visibleElements[visibleElements.length - 1];

                if (e.shiftKey && document.activeElement === firstVisible) {
                    e.preventDefault();
                    lastVisible.focus();
                } else if (!e.shiftKey && document.activeElement === lastVisible) {
                    e.preventDefault();
                    firstVisible.focus();
                }
            }
        }
    }

    /**
     * Get all focusable elements
     */
    getFocusableElements() {
        const selector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
        return Array.from(document.querySelectorAll(selector)).filter(el => {
            return !el.disabled && !el.getAttribute('aria-hidden');
        });
    }

    /**
     * Set up accessibility features
     */
    setupAccessibilityFeatures() {
        // Announce page changes to screen readers
        this.setupLiveRegions();
        
        // High contrast mode detection
        this.setupHighContrastMode();
        
        // Reduced motion detection
        this.setupReducedMotion();
        
        // Focus management
        this.setupFocusManagement();
    }

    /**
     * Set up live regions for screen reader announcements
     */
    setupLiveRegions() {
        // Create announcement region if it doesn't exist
        if (!document.getElementById('announcements')) {
            const announcements = document.createElement('div');
            announcements.id = 'announcements';
            announcements.className = 'visually-hidden';
            announcements.setAttribute('aria-live', 'polite');
            announcements.setAttribute('aria-atomic', 'true');
            document.body.appendChild(announcements);
        }
    }

    /**
     * Announce message to screen readers
     */
    announce(message) {
        const announcements = document.getElementById('announcements');
        if (announcements) {
            announcements.textContent = message;
        }
    }

    /**
     * Set up high contrast mode detection
     */
    setupHighContrastMode() {
        // Check for high contrast preference
        const prefersHighContrast = window.matchMedia('(prefers-contrast: high)').matches;
        if (prefersHighContrast) {
            document.documentElement.classList.add('high-contrast-mode');
        }

        // Listen for changes
        window.matchMedia('(prefers-contrast: high)').addEventListener('change', (e) => {
            document.documentElement.classList.toggle('high-contrast-mode', e.matches);
        });
    }

    /**
     * Set up reduced motion detection
     */
    setupReducedMotion() {
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (prefersReducedMotion) {
            document.documentElement.classList.add('reduced-motion');
        }

        window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
            document.documentElement.classList.toggle('reduced-motion', e.matches);
        });
    }

    /**
     * Set up focus management
     */
    setupFocusManagement() {
        // Store last focused element before modal opens
        this.lastFocusedElement = null;

        // Focus first interactive element when panels change
        document.addEventListener('transitionend', (e) => {
            if (e.target.classList.contains('sidebar') || e.target.classList.contains('notes-panel')) {
                if (e.target.classList.contains('visible')) {
                    const firstFocusable = e.target.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
                    if (firstFocusable) {
                        firstFocusable.focus();
                    }
                }
            }
        });
    }

    /**
     * Handle theme change
     */
    handleThemeChange(e) {
        const { theme } = e.detail;
        this.announce(`Theme changed to ${theme}`);
        
        // Update any theme-specific UI elements
        this.updateThemeSpecificElements(theme);
    }

    /**
     * Update theme-specific UI elements
     */
    updateThemeSpecificElements(theme) {
        // Update loading spinner colors if needed
        const spinner = document.querySelector('.loading-spinner');
        if (spinner) {
            // Colors are handled by CSS variables, but we could add specific logic here
        }
        
        // Update any other theme-specific elements
    }

    /**
     * Show confirmation dialog
     */
    showConfirmDialog(message, onConfirm, onCancel) {
        // For now, use native confirm - can be enhanced with custom modal later
        const result = confirm(message);
        if (result && onConfirm) {
            onConfirm();
        } else if (!result && onCancel) {
            onCancel();
        }
        return result;
    }

    /**
     * Show input dialog
     */
    showInputDialog(message, defaultValue = '', onSubmit, onCancel) {
        // For now, use native prompt - can be enhanced with custom modal later
        const result = prompt(message, defaultValue);
        if (result !== null && onSubmit) {
            onSubmit(result);
        } else if (result === null && onCancel) {
            onCancel();
        }
        return result;
    }

    /**
     * Utility: Escape HTML
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Update document title
     */
    updateDocumentTitle(title) {
        document.title = title ? `${title} - Offline` : 'Offline - Your Notes, Your Device';
    }

    /**
     * Get viewport information
     */
    getViewportInfo() {
        return {
            width: window.innerWidth,
            height: window.innerHeight,
            isMobile: this.isMobile,
            isTablet: this.isTablet,
            isDesktop: !this.isMobile && !this.isTablet
        };
    }
}

// CSS for mobile navigation and responsive features
const responsiveCSS = `
.mobile-nav-btn {
    background: none;
    border: none;
    font-size: 1.25rem;
    cursor: pointer;
    padding: var(--spacing-xs);
    border-radius: var(--border-radius);
    transition: background-color var(--transition-fast);
    color: var(--color-text);
}

.mobile-nav-btn:hover {
    background-color: var(--color-hover);
}

.back-btn {
    margin-bottom: var(--spacing-md);
}

.notes-toggle-btn {
    position: fixed;
    top: var(--spacing-md);
    right: var(--spacing-md);
    z-index: 100;
    display: none;
}

.mobile-layout .notes-toggle-btn {
    display: block;
}

.toast {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-md);
    border-radius: var(--border-radius);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    max-width: 300px;
    transform: translateX(100%);
    transition: transform var(--transition-normal);
}

.toast.visible {
    transform: translateX(0);
}

.toast-icon {
    flex-shrink: 0;
}

.toast-message {
    flex: 1;
    font-size: 0.875rem;
}

.toast-close {
    background: none;
    border: none;
    font-size: 1.25rem;
    cursor: pointer;
    color: inherit;
    opacity: 0.7;
    transition: opacity var(--transition-fast);
}

.toast-close:hover {
    opacity: 1;
}

.note-delete {
    position: absolute;
    top: var(--spacing-sm);
    right: var(--spacing-sm);
    background: none;
    border: none;
    font-size: 1rem;
    cursor: pointer;
    opacity: 0;
    transition: opacity var(--transition-fast);
    color: var(--color-error);
}

.note-item:hover .note-delete,
.note-item:focus-within .note-delete {
    opacity: 1;
}

.note-item {
    position: relative;
}

.editor-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-lg);
    gap: var(--spacing-md);
}

.note-title-input {
    flex: 1;
    font-size: 1.5rem;
    font-weight: 600;
    border: none;
    background: none;
    color: var(--color-text);
    padding: var(--spacing-sm);
    border-radius: var(--border-radius);
    transition: background-color var(--transition-fast);
}

.note-title-input:focus {
    background-color: var(--color-input-bg);
}

.editor-actions {
    display: flex;
    gap: var(--spacing-sm);
}

.editor-toolbar {
    margin-bottom: var(--spacing-lg);
}

.note-tags-input {
    width: 100%;
    padding: var(--spacing-sm) var(--spacing-md);
    border: var(--border-width) solid var(--color-border);
    border-radius: var(--border-radius);
    background-color: var(--color-input-bg);
    color: var(--color-text);
    font-size: 0.875rem;
}

.note-content-input {
    width: 100%;
    min-height: 400px;
    padding: var(--spacing-md);
    border: var(--border-width) solid var(--color-border);
    border-radius: var(--border-radius);
    background-color: var(--color-input-bg);
    color: var(--color-text);
    font-family: var(--font-family-primary);
    font-size: 1rem;
    line-height: 1.6;
    resize: vertical;
}

.editor-footer {
    margin-top: var(--spacing-lg);
    padding-top: var(--spacing-md);
    border-top: var(--border-width) solid var(--color-border);
}

.editor-stats {
    display: flex;
    gap: var(--spacing-lg);
    font-size: 0.75rem;
    color: var(--color-text-secondary);
}

.tag {
    display: inline-block;
    background-color: var(--color-badge-bg);
    color: var(--color-text-secondary);
    padding: 0.125rem 0.375rem;
    border-radius: 10px;
    font-size: 0.75rem;
    margin-right: var(--spacing-xs);
}

@media (max-width: 768px) {
    .editor-header {
        flex-direction: column;
        align-items: stretch;
    }
    
    .editor-actions {
        justify-content: center;
    }
    
    .editor-stats {
        flex-direction: column;
        gap: var(--spacing-xs);
    }
}

.high-contrast-mode {
    --border-width: 2px;
}

.reduced-motion * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
}
`;

// Inject CSS
const style = document.createElement('style');
style.textContent = responsiveCSS;
document.head.appendChild(style);

// Export for use in other modules
window.UIManager = UIManager;
