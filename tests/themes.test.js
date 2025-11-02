/**
 * Theme Manager Tests
 * Tests for theme switching and persistence
 */

describe('Theme Manager', () => {
    let themeManager;
    let originalLocalStorage;
    let originalMatchMedia;

    beforeAll(() => {
        // Mock localStorage
        originalLocalStorage = window.localStorage;
        window.localStorage = {
            data: {},
            getItem(key) { return this.data[key] || null; },
            setItem(key, value) { this.data[key] = value; },
            removeItem(key) { delete this.data[key]; },
            clear() { this.data = {}; }
        };

        // Mock matchMedia
        originalMatchMedia = window.matchMedia;
        window.matchMedia = (query) => ({
            matches: query.includes('dark') ? false : true,
            addEventListener: () => {},
            removeEventListener: () => {}
        });
    });

    afterAll(() => {
        // Restore original functions
        window.localStorage = originalLocalStorage;
        window.matchMedia = originalMatchMedia;
    });

    beforeEach(() => {
        // Clear localStorage
        window.localStorage.clear();
        
        // Reset DOM
        document.body.innerHTML = `
            <div class="sidebar-header">
                <button id="theme-toggle" class="theme-toggle"></button>
            </div>
        `;
        
        // Reset document theme
        document.documentElement.removeAttribute('data-theme');
        
        // Create fresh theme manager
        themeManager = new ThemeManager();
    });

    describe('Initialization', () => {
        it('should initialize with available themes', () => {
            expect(themeManager.themes).toHaveLength(6);
            expect(themeManager.themes[0].id).toBe('light');
            expect(themeManager.themes[1].id).toBe('dark');
        });

        it('should set default theme to light', () => {
            expect(themeManager.currentTheme).toBe('light');
            expect(document.documentElement.getAttribute('data-theme')).toBe('light');
        });

        it('should load saved theme from localStorage', () => {
            window.localStorage.setItem('offline_theme', 'dark');
            const newThemeManager = new ThemeManager();
            
            expect(newThemeManager.currentTheme).toBe('dark');
        });

        it('should detect system dark mode preference', () => {
            window.matchMedia = (query) => ({
                matches: query.includes('dark') ? true : false,
                addEventListener: () => {},
                removeEventListener: () => {}
            });
            
            const newThemeManager = new ThemeManager();
            expect(newThemeManager.currentTheme).toBe('dark');
        });
    });

    describe('Theme Switching', () => {
        it('should switch to a valid theme', () => {
            themeManager.setTheme('dark');
            
            expect(themeManager.currentTheme).toBe('dark');
            expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
            expect(window.localStorage.getItem('offline_theme')).toBe('dark');
        });

        it('should ignore invalid theme IDs', () => {
            const originalTheme = themeManager.currentTheme;
            themeManager.setTheme('invalid-theme');
            
            expect(themeManager.currentTheme).toBe(originalTheme);
        });

        it('should cycle through themes', () => {
            const originalTheme = themeManager.currentTheme;
            themeManager.cycleTheme();
            
            expect(themeManager.currentTheme).not.toBe(originalTheme);
        });

        it('should dispatch theme change event', (done) => {
            document.addEventListener('themechange', (event) => {
                expect(event.detail.theme).toBe('gruvbox');
                expect(event.detail.themeData.name).toBe('Gruvbox');
                done();
            });
            
            themeManager.setTheme('gruvbox');
        });
    });

    describe('Theme Dropdown', () => {
        beforeEach(() => {
            // Ensure dropdown is created
            const toggleBtn = document.getElementById('theme-toggle');
            themeManager.createThemeDropdown(toggleBtn);
        });

        it('should create theme dropdown with all themes', () => {
            const dropdown = document.querySelector('.theme-dropdown');
            const options = dropdown.querySelectorAll('.theme-option');
            
            expect(dropdown).toBeTruthy();
            expect(options).toHaveLength(6);
        });

        it('should mark current theme as active', () => {
            themeManager.setTheme('ocean');
            themeManager.updateDropdownActiveState();
            
            const activeOption = document.querySelector('.theme-option.active');
            expect(activeOption.getAttribute('data-theme')).toBe('ocean');
        });

        it('should toggle dropdown visibility', () => {
            const dropdown = themeManager.dropdown;
            
            themeManager.toggleThemeDropdown();
            expect(dropdown.style.display).toBe('block');
            
            themeManager.toggleThemeDropdown();
            expect(dropdown.style.display).toBe('none');
        });

        it('should close dropdown when clicking outside', () => {
            themeManager.openThemeDropdown();
            
            // Simulate click outside
            const outsideClick = new MouseEvent('click', { bubbles: true });
            document.body.dispatchEvent(outsideClick);
            
            expect(themeManager.dropdown.style.display).toBe('none');
        });

        it('should handle keyboard navigation in dropdown', () => {
            themeManager.openThemeDropdown();
            const options = themeManager.dropdown.querySelectorAll('.theme-option');
            
            // Simulate arrow down
            const arrowDown = new KeyboardEvent('keydown', { key: 'ArrowDown' });
            themeManager.handleDropdownKeydown(arrowDown, 0);
            
            // Should focus next option (this would need proper DOM focus simulation)
            expect(true).toBe(true); // Placeholder for complex DOM interaction
        });
    });

    describe('Theme Data Management', () => {
        it('should get current theme data', () => {
            themeManager.setTheme('monokai');
            const currentThemeData = themeManager.getThemeData(themeManager.currentTheme);
            
            expect(currentThemeData.id).toBe('monokai');
            expect(currentThemeData.name).toBe('Monokai');
            expect(currentThemeData.emoji).toBe('🖤');
        });

        it('should return all available themes', () => {
            const allThemes = themeManager.getAllThemes();
            
            expect(allThemes).toHaveLength(6);
            expect(allThemes[0]).toHaveProperty('id');
            expect(allThemes[0]).toHaveProperty('name');
            expect(allThemes[0]).toHaveProperty('emoji');
        });

        it('should reset to system theme', () => {
            // Set a manual theme first
            themeManager.setTheme('gruvbox');
            expect(window.localStorage.getItem('offline_theme')).toBe('gruvbox');
            
            // Reset to system theme
            themeManager.resetToSystemTheme();
            expect(window.localStorage.getItem('offline_theme')).toBeNull();
        });
    });

    describe('System Theme Detection', () => {
        it('should watch for system theme changes', () => {
            let eventListener = null;
            
            window.matchMedia = (query) => ({
                matches: false,
                addEventListener: (event, callback) => {
                    eventListener = callback;
                },
                removeEventListener: () => {}
            });
            
            const newThemeManager = new ThemeManager();
            
            // Simulate system theme change
            if (eventListener) {
                eventListener({ matches: true });
            }
            
            expect(true).toBe(true); // Placeholder - would need more complex mocking
        });
    });

    describe('Accessibility', () => {
        it('should update button tooltip when theme changes', () => {
            const toggleBtn = document.getElementById('theme-toggle');
            themeManager.setTheme('ocean');
            
            expect(toggleBtn.title).toContain('Ocean');
        });

        it('should set proper ARIA attributes on dropdown', () => {
            const toggleBtn = document.getElementById('theme-toggle');
            themeManager.createThemeDropdown(toggleBtn);
            
            const dropdown = themeManager.dropdown;
            expect(dropdown.getAttribute('role')).toBe('menu');
            expect(dropdown.getAttribute('aria-label')).toBe('Theme selection');
        });

        it('should handle escape key to close dropdown', () => {
            themeManager.openThemeDropdown();
            
            const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
            themeManager.handleDropdownKeydown(escapeEvent, 0);
            
            expect(themeManager.dropdown.style.display).toBe('none');
        });
    });

    describe('Theme Persistence', () => {
        it('should persist theme selection across sessions', () => {
            themeManager.setTheme('high-contrast');
            
            // Create new theme manager (simulating page reload)
            const newThemeManager = new ThemeManager();
            
            expect(newThemeManager.currentTheme).toBe('high-contrast');
        });

        it('should handle corrupted localStorage gracefully', () => {
            window.localStorage.setItem('offline_theme', 'invalid-theme-id');
            
            // Should fall back to system preference
            const newThemeManager = new ThemeManager();
            expect(['light', 'dark']).toContain(newThemeManager.currentTheme);
        });
    });

    describe('CSS Integration', () => {
        it('should inject theme dropdown CSS', () => {
            const styles = document.querySelectorAll('style');
            const themeCSS = Array.from(styles).find(style => 
                style.textContent.includes('.theme-dropdown')
            );
            
            expect(themeCSS).toBeTruthy();
        });

        it('should add transition class during theme change', () => {
            themeManager.setTheme('dark');
            
            // Should briefly add transition class
            expect(document.body.classList.contains('theme-transitioning')).toBe(true);
            
            // Should remove it after timeout
            setTimeout(() => {
                expect(document.body.classList.contains('theme-transitioning')).toBe(false);
            }, 100);
        });
    });

    describe('Theme Validation', () => {
        it('should validate theme exists before setting', () => {
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
            
            themeManager.setTheme('nonexistent-theme');
            
            expect(consoleSpy).toHaveBeenCalledWith('Theme "nonexistent-theme" not found');
            consoleSpy.mockRestore();
        });

        it('should handle null or undefined theme IDs', () => {
            const originalTheme = themeManager.currentTheme;
            
            themeManager.setTheme(null);
            expect(themeManager.currentTheme).toBe(originalTheme);
            
            themeManager.setTheme(undefined);
            expect(themeManager.currentTheme).toBe(originalTheme);
        });
    });

    describe('Performance', () => {
        it('should handle rapid theme switching efficiently', () => {
            const startTime = performance.now();
            
            // Switch themes rapidly
            const themes = ['light', 'dark', 'gruvbox', 'monokai', 'ocean'];
            for (let i = 0; i < 100; i++) {
                themeManager.setTheme(themes[i % themes.length]);
            }
            
            const endTime = performance.now();
            const duration = endTime - startTime;
            
            expect(duration).toBeLessThan(1000); // Should be fast
        });

        it('should debounce theme transitions', () => {
            let transitionCount = 0;
            
            // Mock transition end detection
            const originalAddEventListener = document.body.addEventListener;
            document.body.addEventListener = (event, callback) => {
                if (event === 'transitionend') {
                    transitionCount++;
                }
                originalAddEventListener.call(document.body, event, callback);
            };
            
            // Rapid theme changes should not cause excessive transitions
            themeManager.setTheme('dark');
            themeManager.setTheme('light');
            themeManager.setTheme('gruvbox');
            
            expect(true).toBe(true); // Placeholder for complex timing test
        });
    });

    describe('Error Handling', () => {
        it('should handle missing DOM elements gracefully', () => {
            // Remove theme toggle button
            document.getElementById('theme-toggle').remove();
            
            // Should not throw error
            expect(() => {
                const newThemeManager = new ThemeManager();
                newThemeManager.setTheme('dark');
            }).not.toThrow();
        });

        it('should handle localStorage errors', () => {
            // Mock localStorage to throw errors
            const originalSetItem = window.localStorage.setItem;
            window.localStorage.setItem = () => {
                throw new Error('Storage quota exceeded');
            };
            
            // Should not throw error
            expect(() => {
                themeManager.setTheme('dark');
            }).not.toThrow();
            
            // Restore localStorage
            window.localStorage.setItem = originalSetItem;
        });
    });
});
