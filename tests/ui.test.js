/**
 * UI Manager Tests
 * Tests for user interface and responsive behavior
 */

describe('UI Manager', () => {
    let uiManager;
    let originalInnerWidth;

    beforeAll(() => {
        // Store original window width
        originalInnerWidth = window.innerWidth;
        
        // Mock window properties
        Object.defineProperty(window, 'innerWidth', {
            writable: true,
            configurable: true,
            value: 1200
        });
        
        Object.defineProperty(window, 'innerHeight', {
            writable: true,
            configurable: true,
            value: 800
        });
    });

    afterAll(() => {
        // Restore original window width
        Object.defineProperty(window, 'innerWidth', {
            writable: true,
            configurable: true,
            value: originalInnerWidth
        });
    });

    beforeEach(() => {
        // Reset DOM
        document.body.innerHTML = `
            <div id="app" class="app-container">
                <aside id="sidebar" class="sidebar">
                    <div class="sidebar-header"></div>
                </aside>
                <section id="notes-panel" class="notes-panel">
                    <div class="panel-header"></div>
                </section>
                <main id="main-editor" class="editor-panel">
                    <div id="editor-container"></div>
                </main>
            </div>
            <div id="toast-container" class="toast-container"></div>
            <div id="loading" class="loading-overlay"></div>
        `;
        
        // Create fresh UI manager
        uiManager = new UIManager();
    });

    describe('Initialization', () => {
        it('should initialize with correct screen size detection', () => {
            expect(uiManager.isMobile).toBe(false);
            expect(uiManager.isTablet).toBe(false);
            expect(uiManager.sidebarVisible).toBe(true);
            expect(uiManager.notesPanelVisible).toBe(true);
        });

        it('should detect mobile screen size', () => {
            window.innerWidth = 600;
            const mobileUI = new UIManager();
            
            expect(mobileUI.isMobile).toBe(true);
            expect(mobileUI.sidebarVisible).toBe(false);
            expect(mobileUI.notesPanelVisible).toBe(false);
        });

        it('should detect tablet screen size', () => {
            window.innerWidth = 900;
            const tabletUI = new UIManager();
            
            expect(tabletUI.isTablet).toBe(true);
            expect(tabletUI.isMobile).toBe(false);
        });
    });

    describe('Responsive Layout', () => {
        it('should update layout classes correctly', () => {
            const app = document.getElementById('app');
            
            uiManager.isMobile = false;
            uiManager.isTablet = false;
            uiManager.updateLayoutClasses();
            
            expect(app.classList.contains('desktop-layout')).toBe(true);
            expect(app.classList.contains('mobile-layout')).toBe(false);
        });

        it('should handle mobile layout', () => {
            const app = document.getElementById('app');
            const sidebar = document.getElementById('sidebar');
            
            uiManager.isMobile = true;
            uiManager.sidebarVisible = true;
            uiManager.updateLayoutClasses();
            
            expect(app.classList.contains('mobile-layout')).toBe(true);
            expect(sidebar.classList.contains('visible')).toBe(true);
        });

        it('should handle tablet layout', () => {
            const app = document.getElementById('app');
            const notesPanel = document.getElementById('notes-panel');
            
            uiManager.isTablet = true;
            uiManager.notesPanelVisible = true;
            uiManager.updateLayoutClasses();
            
            expect(app.classList.contains('tablet-layout')).toBe(true);
            expect(notesPanel.classList.contains('visible')).toBe(true);
        });
    });

    describe('Panel Management', () => {
        beforeEach(() => {
            uiManager.isMobile = true;
        });

        it('should toggle sidebar visibility', () => {
            const initialState = uiManager.sidebarVisible;
            uiManager.toggleSidebar();
            
            expect(uiManager.sidebarVisible).toBe(!initialState);
        });

        it('should show sidebar and hide notes panel', () => {
            uiManager.showSidebar();
            
            expect(uiManager.sidebarVisible).toBe(true);
            expect(uiManager.notesPanelVisible).toBe(false);
        });

        it('should show notes panel and hide sidebar', () => {
            uiManager.showNotesPanel();
            
            expect(uiManager.notesPanelVisible).toBe(true);
            expect(uiManager.sidebarVisible).toBe(false);
        });

        it('should hide notes panel', () => {
            uiManager.notesPanelVisible = true;
            uiManager.hideNotesPanel();
            
            expect(uiManager.notesPanelVisible).toBe(false);
        });
    });

    describe('Toast Notifications', () => {
        it('should show toast notification', () => {
            const toast = uiManager.showToast('Test message', 'info');
            
            expect(toast).toBeTruthy();
            expect(toast.classList.contains('toast')).toBe(true);
            expect(toast.classList.contains('info')).toBe(true);
            expect(toast.textContent).toContain('Test message');
        });

        it('should show different toast types', () => {
            const successToast = uiManager.showToast('Success', 'success');
            const errorToast = uiManager.showToast('Error', 'error');
            const warningToast = uiManager.showToast('Warning', 'warning');
            
            expect(successToast.classList.contains('success')).toBe(true);
            expect(errorToast.classList.contains('error')).toBe(true);
            expect(warningToast.classList.contains('warning')).toBe(true);
        });

        it('should auto-hide toast after duration', (done) => {
            const toast = uiManager.showToast('Auto hide', 'info', 100);
            
            setTimeout(() => {
                expect(toast.parentNode).toBeNull();
                done();
            }, 150);
        });

        it('should hide toast when close button clicked', () => {
            const toast = uiManager.showToast('Closeable', 'info', 0);
            const closeBtn = toast.querySelector('.toast-close');
            
            closeBtn.click();
            
            setTimeout(() => {
                expect(toast.parentNode).toBeNull();
            }, 350);
        });

        it('should escape HTML in toast messages', () => {
            const toast = uiManager.showToast('<script>alert("xss")</script>', 'info');
            
            expect(toast.innerHTML).not.toContain('<script>');
            expect(toast.textContent).toContain('<script>alert("xss")</script>');
        });
    });

    describe('Loading Overlay', () => {
        it('should show loading overlay', () => {
            const loading = document.getElementById('loading');
            
            uiManager.showLoading('Loading test...');
            
            expect(loading.classList.contains('visible')).toBe(true);
            expect(loading.getAttribute('aria-hidden')).toBe('false');
        });

        it('should hide loading overlay', () => {
            const loading = document.getElementById('loading');
            
            uiManager.showLoading();
            uiManager.hideLoading();
            
            expect(loading.classList.contains('visible')).toBe(false);
            expect(loading.getAttribute('aria-hidden')).toBe('true');
        });

        it('should update loading message', () => {
            uiManager.showLoading('Custom loading message');
            
            const loadingText = document.querySelector('#loading p');
            expect(loadingText.textContent).toBe('Custom loading message');
        });
    });

    describe('Keyboard Navigation', () => {
        it('should handle escape key', () => {
            uiManager.isMobile = true;
            uiManager.notesPanelVisible = true;
            
            const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
            uiManager.handleEscapeKey(escapeEvent);
            
            expect(uiManager.sidebarVisible).toBe(true);
            expect(uiManager.notesPanelVisible).toBe(false);
        });

        it('should get focusable elements', () => {
            document.body.innerHTML += `
                <button>Button 1</button>
                <a href="#">Link</a>
                <input type="text">
                <button disabled>Disabled Button</button>
                <div tabindex="0">Focusable Div</div>
            `;
            
            const focusable = uiManager.getFocusableElements();
            
            expect(focusable.length).toBe(4); // Should exclude disabled button
            expect(focusable.some(el => el.tagName === 'BUTTON' && !el.disabled)).toBe(true);
            expect(focusable.some(el => el.tagName === 'A')).toBe(true);
            expect(focusable.some(el => el.tagName === 'INPUT')).toBe(true);
            expect(focusable.some(el => el.tagName === 'DIV')).toBe(true);
        });
    });

    describe('Accessibility Features', () => {
        it('should create announcements region', () => {
            // Remove existing announcements if any
            const existing = document.getElementById('announcements');
            if (existing) existing.remove();
            
            uiManager.setupLiveRegions();
            
            const announcements = document.getElementById('announcements');
            expect(announcements).toBeTruthy();
            expect(announcements.getAttribute('aria-live')).toBe('polite');
            expect(announcements.classList.contains('visually-hidden')).toBe(true);
        });

        it('should announce messages to screen readers', () => {
            uiManager.announce('Test announcement');
            
            const announcements = document.getElementById('announcements');
            expect(announcements.textContent).toBe('Test announcement');
        });

        it('should detect high contrast preference', () => {
            // Mock media query
            const mockMediaQuery = {
                matches: true,
                addEventListener: () => {}
            };
            
            window.matchMedia = () => mockMediaQuery;
            
            uiManager.setupHighContrastMode();
            
            expect(document.documentElement.classList.contains('high-contrast-mode')).toBe(true);
        });

        it('should detect reduced motion preference', () => {
            const mockMediaQuery = {
                matches: true,
                addEventListener: () => {}
            };
            
            window.matchMedia = () => mockMediaQuery;
            
            uiManager.setupReducedMotion();
            
            expect(document.documentElement.classList.contains('reduced-motion')).toBe(true);
        });
    });

    describe('Window Resize Handling', () => {
        it('should update layout on window resize', () => {
            uiManager.isMobile = false;
            
            // Simulate resize to mobile
            window.innerWidth = 600;
            uiManager.handleResize();
            
            expect(uiManager.isMobile).toBe(true);
        });

        it('should reset panel visibility on desktop resize', () => {
            uiManager.isMobile = true;
            uiManager.sidebarVisible = false;
            uiManager.notesPanelVisible = false;
            
            // Simulate resize to desktop
            window.innerWidth = 1200;
            uiManager.handleResize();
            
            expect(uiManager.sidebarVisible).toBe(true);
            expect(uiManager.notesPanelVisible).toBe(true);
        });
    });

    describe('Theme Integration', () => {
        it('should handle theme change events', () => {
            let announcementMade = false;
            uiManager.announce = (message) => {
                announcementMade = true;
                expect(message).toContain('Theme changed to dark');
            };
            
            const themeEvent = new CustomEvent('themechange', {
                detail: { theme: 'dark' }
            });
            
            uiManager.handleThemeChange(themeEvent);
            expect(announcementMade).toBe(true);
        });
    });

    describe('Dialog Functions', () => {
        it('should show confirmation dialog', () => {
            // Mock window.confirm
            window.confirm = () => true;
            
            let confirmCalled = false;
            const result = uiManager.showConfirmDialog(
                'Test confirmation',
                () => { confirmCalled = true; },
                () => {}
            );
            
            expect(result).toBe(true);
            expect(confirmCalled).toBe(true);
        });

        it('should show input dialog', () => {
            // Mock window.prompt
            window.prompt = () => 'test input';
            
            let inputReceived = '';
            const result = uiManager.showInputDialog(
                'Test input',
                'default',
                (input) => { inputReceived = input; },
                () => {}
            );
            
            expect(result).toBe('test input');
            expect(inputReceived).toBe('test input');
        });
    });

    describe('Utility Functions', () => {
        it('should escape HTML correctly', () => {
            const html = '<div>Test & "quotes"</div>';
            const escaped = uiManager.escapeHtml(html);
            
            expect(escaped).toBe('&lt;div&gt;Test &amp; "quotes"&lt;/div&gt;');
        });

        it('should update document title', () => {
            uiManager.updateDocumentTitle('Test Note');
            expect(document.title).toBe('Test Note - Offline');
            
            uiManager.updateDocumentTitle('');
            expect(document.title).toBe('Offline - Your Notes, Your Device');
        });

        it('should provide viewport information', () => {
            const viewport = uiManager.getViewportInfo();
            
            expect(viewport).toHaveProperty('width');
            expect(viewport).toHaveProperty('height');
            expect(viewport).toHaveProperty('isMobile');
            expect(viewport).toHaveProperty('isTablet');
            expect(viewport).toHaveProperty('isDesktop');
            
            expect(typeof viewport.width).toBe('number');
            expect(typeof viewport.isMobile).toBe('boolean');
        });
    });

    describe('Error Handling', () => {
        it('should handle missing DOM elements gracefully', () => {
            // Remove required elements
            document.getElementById('toast-container').remove();
            document.getElementById('loading').remove();
            
            // Should not throw errors
            expect(() => {
                uiManager.showToast('Test');
                uiManager.showLoading();
                uiManager.hideLoading();
            }).not.toThrow();
        });

        it('should handle null elements in focusable search', () => {
            // Clear DOM
            document.body.innerHTML = '';
            
            const focusable = uiManager.getFocusableElements();
            expect(Array.isArray(focusable)).toBe(true);
            expect(focusable.length).toBe(0);
        });
    });

    describe('Performance', () => {
        it('should handle rapid toast notifications', () => {
            const startTime = performance.now();
            
            // Create many toasts rapidly
            for (let i = 0; i < 100; i++) {
                uiManager.showToast(`Toast ${i}`, 'info', 0);
            }
            
            const endTime = performance.now();
            const duration = endTime - startTime;
            
            expect(duration).toBeLessThan(1000); // Should be fast
            
            const toasts = document.querySelectorAll('.toast');
            expect(toasts.length).toBe(100);
        });

        it('should handle frequent layout updates', () => {
            const startTime = performance.now();
            
            // Simulate rapid resize events
            for (let i = 0; i < 50; i++) {
                window.innerWidth = 600 + (i % 2) * 600;
                uiManager.handleResize();
            }
            
            const endTime = performance.now();
            const duration = endTime - startTime;
            
            expect(duration).toBeLessThan(1000);
        });
    });
});
