#!/usr/bin/env node

/**
 * Runtime Debug Tool
 * Checks actual browser execution and loading order
 */

const { execSync } = require('child_process');

class RuntimeDebugger {
    async checkBrowserExecution() {
        console.log('🔍 Debugging runtime execution...\n');
        
        // Check if we can access the files via HTTP
        await this.checkFileAccess();
        
        // Check script loading order in HTML
        await this.checkScriptOrder();
        
        // Check for browser console errors
        await this.checkConsoleErrors();
    }

    async checkFileAccess() {
        console.log('📁 Checking file accessibility...');
        
        const files = [
            'js/storage.js',
            'js/ui.js', 
            'js/themes.js',
            'js/notes.js',
            'js/app.js'
        ];

        for (const file of files) {
            try {
                const result = execSync(`curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/${file}`, { encoding: 'utf8' });
                if (result.trim() === '200') {
                    console.log(`✅ ${file} - HTTP 200`);
                } else {
                    console.log(`❌ ${file} - HTTP ${result.trim()}`);
                }
            } catch (error) {
                console.log(`❌ ${file} - Error: ${error.message}`);
            }
        }
    }

    async checkScriptOrder() {
        console.log('\n📜 Checking script loading order...');
        
        try {
            const html = execSync('curl -s http://localhost:8080/', { encoding: 'utf8' });
            const scriptMatches = html.match(/<script[^>]*src="[^"]*"[^>]*>/g) || [];
            
            console.log('Script loading order:');
            scriptMatches.forEach((script, i) => {
                const src = script.match(/src="([^"]*)"/) || ['', 'unknown'];
                console.log(`${i + 1}. ${src[1]}`);
            });
            
        } catch (error) {
            console.log(`❌ Could not fetch HTML: ${error.message}`);
        }
    }

    async checkConsoleErrors() {
        console.log('\n🐛 Checking for JavaScript execution...');
        
        // Check if ThemeManager is actually exported in the served file
        try {
            const themesJS = execSync('curl -s http://localhost:8080/js/themes.js', { encoding: 'utf8' });
            
            if (themesJS.includes('window.ThemeManager = ThemeManager')) {
                console.log('✅ ThemeManager export found in served file');
            } else {
                console.log('❌ ThemeManager export NOT found in served file');
                console.log('Last 10 lines of themes.js:');
                const lines = themesJS.split('\n').slice(-10);
                lines.forEach((line, i) => {
                    console.log(`${lines.length - 10 + i + 1}: ${line}`);
                });
            }
            
            // Check for syntax errors by trying to parse
            try {
                new Function(themesJS);
                console.log(`✅ themes.js - No syntax errors detected`);
            } catch (syntaxError) {
                console.log(`❌ Syntax error detected in themes.js`);
                console.log(`   Error: ${syntaxError.message}`);
                console.log(`   Line: ${syntaxError.lineNumber || 'unknown'}`);
            }
            
        } catch (error) {
            console.log(`❌ Could not fetch themes.js: ${error.message}`);
        }
    }

    checkBraces(content) {
        let braceCount = 0;
        let inString = false;
        let inTemplate = false;
        let stringChar = '';
        
        for (let i = 0; i < content.length; i++) {
            const char = content[i];
            const prevChar = i > 0 ? content[i - 1] : '';
            
            // Handle string literals
            if (!inTemplate && (char === '"' || char === "'") && prevChar !== '\\') {
                if (!inString) {
                    inString = true;
                    stringChar = char;
                } else if (char === stringChar) {
                    inString = false;
                    stringChar = '';
                }
                continue;
            }
            
            // Handle template literals
            if (char === '`' && prevChar !== '\\') {
                inTemplate = !inTemplate;
                continue;
            }
            
            // Count braces outside of strings
            if (!inString && !inTemplate) {
                if (char === '{') braceCount++;
                if (char === '}') braceCount--;
            }
        }
        
        return braceCount !== 0;
    }
}

// Run if called directly
if (require.main === module) {
    const runtimeDebugger = new RuntimeDebugger();
    runtimeDebugger.checkBrowserExecution();
}

module.exports = RuntimeDebugger;
