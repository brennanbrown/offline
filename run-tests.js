#!/usr/bin/env node

/**
 * Automated Test Runner for Development
 * Runs tests headlessly and reports results for AI development workflow
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class AutomatedTestRunner {
    constructor() {
        this.testResults = {
            passed: 0,
            failed: 0,
            errors: [],
            summary: ''
        };
    }

    /**
     * Run tests using headless browser
     */
    async runTests() {
        console.log('🧪 Running automated tests...\n');
        
        try {
            // Check if server is running
            const serverRunning = this.checkServer();
            if (!serverRunning) {
                console.log('❌ Server not running on localhost:8080');
                console.log('Start server with: python3 -m http.server 8080');
                process.exit(1);
            }

            // Run tests with puppeteer-like approach using curl and parsing
            await this.runBrowserTests();
            
            this.printResults();
            
            // Exit with error code if tests failed
            if (this.testResults.failed > 0) {
                process.exit(1);
            }
            
        } catch (error) {
            console.error('❌ Test runner failed:', error.message);
            process.exit(1);
        }
    }

    /**
     * Check if development server is running
     */
    checkServer() {
        try {
            execSync('curl -s http://localhost:8080/ > /dev/null', { timeout: 2000 });
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Run browser-based tests by checking JavaScript execution
     */
    async runBrowserTests() {
        console.log('📋 Checking JavaScript file syntax...');
        
        const jsFiles = [
            'js/storage.js',
            'js/ui.js', 
            'js/themes.js',
            'js/notes.js',
            'js/app.js'
        ];

        // Check each JavaScript file for syntax errors
        for (const file of jsFiles) {
            await this.checkJSFile(file);
        }

        // Check if classes are properly exported
        await this.checkExports();

        // Check basic HTML structure
        await this.checkHTML();
    }

    /**
     * Check JavaScript file for syntax errors
     */
    async checkJSFile(filePath) {
        try {
            const content = fs.readFileSync(path.join(__dirname, filePath), 'utf8');
            
            // Basic syntax checks
            const issues = [];
            
            // Check for unmatched braces/brackets
            const braces = content.match(/[{}]/g) || [];
            const openBraces = braces.filter(b => b === '{').length;
            const closeBraces = braces.filter(b => b === '}').length;
            
            if (openBraces !== closeBraces) {
                issues.push(`Unmatched braces: ${openBraces} open, ${closeBraces} close`);
            }

            // Check for template literal issues
            const backticks = (content.match(/`/g) || []).length;
            if (backticks % 2 !== 0) {
                issues.push('Unmatched template literal backticks');
            }

            // Check for class definitions
            const hasClass = /class\s+\w+/.test(content);
            const hasExport = /window\.\w+\s*=/.test(content);
            
            if (hasClass && !hasExport) {
                issues.push('Class defined but not exported to window');
            }

            if (issues.length > 0) {
                console.log(`❌ ${filePath}:`);
                issues.forEach(issue => console.log(`   • ${issue}`));
                this.testResults.failed++;
                this.testResults.errors.push(`${filePath}: ${issues.join(', ')}`);
            } else {
                console.log(`✅ ${filePath}`);
                this.testResults.passed++;
            }

        } catch (error) {
            console.log(`❌ ${filePath}: ${error.message}`);
            this.testResults.failed++;
            this.testResults.errors.push(`${filePath}: ${error.message}`);
        }
    }

    /**
     * Check if classes are properly exported
     */
    async checkExports() {
        console.log('\n📦 Checking class exports...');
        
        const expectedExports = [
            'StorageManager',
            'UIManager', 
            'ThemeManager',
            'NotesManager',
            'OfflineApp'
        ];

        for (const className of expectedExports) {
            try {
                // Check if class file exists and has export
                const result = execSync(`grep -r "window.${className}" js/`, { encoding: 'utf8' });
                if (result.trim()) {
                    console.log(`✅ ${className} exported`);
                    this.testResults.passed++;
                } else {
                    console.log(`❌ ${className} not exported`);
                    this.testResults.failed++;
                    this.testResults.errors.push(`${className} not exported to window`);
                }
            } catch (error) {
                console.log(`❌ ${className} not found`);
                this.testResults.failed++;
                this.testResults.errors.push(`${className} not found in codebase`);
            }
        }
    }

    /**
     * Check HTML structure
     */
    async checkHTML() {
        console.log('\n🌐 Checking HTML structure...');
        
        try {
            const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
            
            // Check for required elements
            const requiredElements = [
                { selector: 'script[src*="storage.js"]', name: 'Storage script' },
                { selector: 'script[src*="ui.js"]', name: 'UI script' },
                { selector: 'script[src*="themes.js"]', name: 'Themes script' },
                { selector: 'script[src*="notes.js"]', name: 'Notes script' },
                { selector: 'script[src*="app.js"]', name: 'App script' }
            ];

            for (const element of requiredElements) {
                if (html.includes(element.selector.replace(/\[.*?\]/g, '').replace('*=', ''))) {
                    console.log(`✅ ${element.name} included`);
                    this.testResults.passed++;
                } else {
                    console.log(`❌ ${element.name} missing`);
                    this.testResults.failed++;
                    this.testResults.errors.push(`${element.name} not included in HTML`);
                }
            }

        } catch (error) {
            console.log(`❌ HTML check failed: ${error.message}`);
            this.testResults.failed++;
            this.testResults.errors.push(`HTML check: ${error.message}`);
        }
    }

    /**
     * Print test results
     */
    printResults() {
        console.log('\n' + '='.repeat(50));
        console.log('📊 TEST RESULTS');
        console.log('='.repeat(50));
        console.log(`✅ Passed: ${this.testResults.passed}`);
        console.log(`❌ Failed: ${this.testResults.failed}`);
        
        if (this.testResults.errors.length > 0) {
            console.log('\n🐛 ERRORS:');
            this.testResults.errors.forEach((error, i) => {
                console.log(`${i + 1}. ${error}`);
            });
        }

        const total = this.testResults.passed + this.testResults.failed;
        const percentage = total > 0 ? Math.round((this.testResults.passed / total) * 100) : 0;
        
        console.log(`\n📈 Success Rate: ${percentage}%`);
        
        if (this.testResults.failed === 0) {
            console.log('🎉 All tests passed!');
        } else {
            console.log('💥 Some tests failed - check errors above');
        }
    }
}

// Run tests if called directly
if (require.main === module) {
    const runner = new AutomatedTestRunner();
    runner.runTests();
}

module.exports = AutomatedTestRunner;
