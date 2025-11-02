/**
 * Theme Management System
 * Handles theme switching and persistence
 */

class ThemeManager {
    constructor() {
        this.themes = [
            { id: 'light', name: 'Light', emoji: '☀️' },
            { id: 'dark', name: 'Dark', emoji: '🌙' },
            { id: 'gruvbox', name: 'Gruvbox', emoji: '🍂' },
            { id: 'monokai', name: 'Monokai', emoji: '🖤' },
            { id: 'ocean', name: 'Ocean', emoji: '🌊' },
            { id: 'high-contrast', name: 'High Contrast', emoji: '⚡' }
        ];
        
        this.currentTheme = 'light';
        this.init();
    }

    /**
     * Initialize theme system
     */
    init() {
        // Load saved theme or detect system preference
        this.loadTheme();
        
        // Listen for system theme changes
        this.watchSystemTheme();
        
        // Set up theme toggle button
        this.setupThemeToggle();
    }

    /**
     * Load theme from localStorage or detect system preference
     */
    loadTheme() {
        const savedTheme = localStorage.getItem('offline_theme');
        
        if (savedTheme && this.themes.find(t => t.id === savedTheme)) {
            this.setTheme(savedTheme);
        } else {
            // Detect system preference
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            this.setTheme(prefersDark ? 'dark' : 'light');
        }
    }

    /**
     * Watch for system theme changes
     */
    watchSystemTheme() {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        
        mediaQuery.addEventListener('change', (e) => {
            // Only auto-switch if user hasn't manually selected a theme
            const savedTheme = localStorage.getItem('offline_theme');
            if (!savedTheme) {
                this.setTheme(e.matches ? 'dark' : 'light');
            }
        });
    }

    /**
     * Set up theme toggle button functionality
     */
    setupThemeToggle() {
        const toggleBtn = document.getElementById('theme-toggle');
        if (!toggleBtn) return;

        // Create dropdown menu
        this.createThemeDropdown(toggleBtn);
        
        toggleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.toggleThemeDropdown();
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!toggleBtn.contains(e.target)) {
                this.closeThemeDropdown();
            }
        });

        // Handle keyboard navigation
        toggleBtn.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.toggleThemeDropdown();
            } else if (e.key === 'Escape') {
                this.closeThemeDropdown();
            }
        });
    }

    /**
     * Create theme dropdown menu
     */
    createThemeDropdown(toggleBtn) {
        const dropdown = document.createElement('div');
        dropdown.className = 'theme-dropdown';
        dropdown.setAttribute('role', 'menu');
        dropdown.setAttribute('aria-label', 'Theme selection');
        dropdown.style.display = 'none';

        this.themes.forEach((theme, index) => {
            const option = document.createElement('button');
            option.className = 'theme-option';
            option.setAttribute('role', 'menuitem');
            option.setAttribute('data-theme', theme.id);
            option.innerHTML = `${theme.emoji} ${theme.name}`;
            
            if (theme.id === this.currentTheme) {
                option.classList.add('active');
                option.setAttribute('aria-current', 'true');
            }

            option.addEventListener('click', (e) => {
                e.preventDefault();
                this.setTheme(theme.id);
                this.closeThemeDropdown();
            });

            option.addEventListener('keydown', (e) => {
                this.handleDropdownKeydown(e, index);
            });

            dropdown.appendChild(option);
        });

        // Insert dropdown as child of the sidebar header (which has position: relative)
        const sidebarHeader = toggleBtn.closest('.sidebar-header');
        sidebarHeader.appendChild(dropdown);
        this.dropdown = dropdown;
    }

    /**
     * Handle keyboard navigation in dropdown
     */
    handleDropdownKeydown(e, currentIndex) {
        const options = this.dropdown.querySelectorAll('.theme-option');
        
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                const nextIndex = (currentIndex + 1) % options.length;
                options[nextIndex].focus();
                break;
                
            case 'ArrowUp':
                e.preventDefault();
                const prevIndex = (currentIndex - 1 + options.length) % options.length;
                options[prevIndex].focus();
                break;
                
            case 'Enter':
            case ' ':
                e.preventDefault();
                e.target.click();
                break;
                
            case 'Escape':
                e.preventDefault();
                this.closeThemeDropdown();
                document.getElementById('theme-toggle').focus();
                break;
        }
    }

    /**
     * Toggle theme dropdown visibility
     */
    toggleThemeDropdown() {
        if (!this.dropdown) return;
        
        const isVisible = this.dropdown.style.display !== 'none';
        
        if (isVisible) {
            this.closeThemeDropdown();
        } else {
            this.openThemeDropdown();
        }
    }

    /**
     * Open theme dropdown
     */
    openThemeDropdown() {
        if (!this.dropdown) return;
        
        this.dropdown.style.display = 'block';
        
        // Focus first option
        const firstOption = this.dropdown.querySelector('.theme-option');
        if (firstOption) {
            firstOption.focus();
        }
        
        // Update aria attributes
        document.getElementById('theme-toggle').setAttribute('aria-expanded', 'true');
    }

    /**
     * Close theme dropdown
     */
    closeThemeDropdown() {
        if (!this.dropdown) return;
        
        this.dropdown.style.display = 'none';
        document.getElementById('theme-toggle').setAttribute('aria-expanded', 'false');
    }

    /**
     * Set active theme
     */
    setTheme(themeId) {
        if (!this.themes.find(t => t.id === themeId)) {
            console.warn(`Theme "${themeId}" not found`);
            return;
        }

        // Add transition class to prevent flash
        document.body.classList.add('theme-transitioning');
        
        // Update data attribute
        document.documentElement.setAttribute('data-theme', themeId);
        
        // Update current theme
        this.currentTheme = themeId;
        
        // Save to localStorage
        localStorage.setItem('offline_theme', themeId);
        
        // Update dropdown active state
        this.updateDropdownActiveState();
        
        // Update toggle button tooltip
        const toggleBtn = document.getElementById('theme-toggle');
        if (toggleBtn) {
            const theme = this.themes.find(t => t.id === themeId);
            toggleBtn.title = `Current theme: ${theme.name}. Click to change theme`;
        }
        
        // Remove transition class after a short delay
        setTimeout(() => {
            document.body.classList.remove('theme-transitioning');
        }, 50);
        
        // Dispatch theme change event
        this.dispatchThemeChangeEvent(themeId);
    }

    /**
     * Update dropdown active state
     */
    updateDropdownActiveState() {
        if (!this.dropdown) return;
        
        const options = this.dropdown.querySelectorAll('.theme-option');
        options.forEach(option => {
            const isActive = option.getAttribute('data-theme') === this.currentTheme;
            option.classList.toggle('active', isActive);
            option.setAttribute('aria-current', isActive ? 'true' : 'false');
        });
    }

    /**
     * Dispatch theme change event
     */
    dispatchThemeChangeEvent(themeId) {
        const event = new CustomEvent('themechange', {
            detail: { 
                theme: themeId,
                themeData: this.themes.find(t => t.id === themeId)
            }
        });
        
        document.dispatchEvent(event);
    }

    /**
     * Get current theme
     */
    getCurrentTheme() {
        return this.currentTheme;
    }

    /**
     * Get theme data
     */
    getThemeData(themeId) {
        return this.themes.find(t => t.id === themeId);
    }

    /**
     * Get all available themes
     */
    getAllThemes() {
        return [...this.themes];
    }

    /**
     * Cycle to next theme (for keyboard shortcuts)
     */
    cycleTheme() {
        const currentIndex = this.themes.findIndex(t => t.id === this.currentTheme);
        const nextIndex = (currentIndex + 1) % this.themes.length;
        this.setTheme(this.themes[nextIndex].id);
    }

    /**
     * Reset to system theme
     */
    resetToSystemTheme() {
        localStorage.removeItem('offline_theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        this.setTheme(prefersDark ? 'dark' : 'light');
    }
}

// CSS for theme dropdown (injected dynamically)
const themeDropdownCSS = `
.theme-dropdown {
    position: absolute;
    top: 100%;
    right: 0;
    background: var(--color-panel-bg);
    border: var(--border-width) solid var(--color-border);
    border-radius: var(--border-radius);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: var(--z-dropdown);
    min-width: 150px;
    margin-top: var(--spacing-xs);
}

.theme-option {
    width: 100%;
    padding: var(--spacing-sm) var(--spacing-md);
    background: none;
    border: none;
    text-align: left;
    cursor: pointer;
    color: var(--color-text);
    font-size: 0.875rem;
    transition: background-color var(--transition-fast);
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
}

.theme-option:hover {
    background-color: var(--color-hover);
}

.theme-option:focus {
    background-color: var(--color-hover);
    outline: 2px solid var(--color-focus);
    outline-offset: -2px;
}

.theme-option.active {
    background-color: var(--color-active);
    color: var(--color-active-text);
    font-weight: 600;
}

.theme-option:first-child {
    border-top-left-radius: var(--border-radius);
    border-top-right-radius: var(--border-radius);
}

.theme-option:last-child {
    border-bottom-left-radius: var(--border-radius);
    border-bottom-right-radius: var(--border-radius);
}

`;

// Inject CSS
const themeStyle = document.createElement('style');
themeStyle.textContent = themeDropdownCSS;
document.head.appendChild(themeStyle);

// Export for use in other modules
window.ThemeManager = ThemeManager;
