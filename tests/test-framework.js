/**
 * Lightweight Test Framework
 * Simple but comprehensive testing framework for the offline app
 */

class TestFramework {
    constructor() {
        this.tests = [];
        this.suites = new Map();
        this.results = {
            total: 0,
            passed: 0,
            failed: 0,
            skipped: 0
        };
        this.currentSuite = null;
        this.isRunning = false;
    }

    /**
     * Create a test suite
     */
    describe(suiteName, callback) {
        const suite = {
            name: suiteName,
            tests: [],
            beforeEach: null,
            afterEach: null,
            beforeAll: null,
            afterAll: null,
            results: { total: 0, passed: 0, failed: 0, skipped: 0 }
        };

        this.suites.set(suiteName, suite);
        this.currentSuite = suite;

        // Execute the suite definition
        callback();

        this.currentSuite = null;
        return suite;
    }

    /**
     * Define a test case
     */
    it(testName, testFunction, options = {}) {
        if (!this.currentSuite) {
            throw new Error('Test must be defined within a describe block');
        }

        const test = {
            name: testName,
            function: testFunction,
            suite: this.currentSuite.name,
            timeout: options.timeout || 5000,
            skip: options.skip || false,
            only: options.only || false,
            result: null,
            error: null,
            duration: 0
        };

        this.currentSuite.tests.push(test);
        this.tests.push(test);
    }

    /**
     * Setup function to run before each test
     */
    beforeEach(callback) {
        if (this.currentSuite) {
            this.currentSuite.beforeEach = callback;
        }
    }

    /**
     * Cleanup function to run after each test
     */
    afterEach(callback) {
        if (this.currentSuite) {
            this.currentSuite.afterEach = callback;
        }
    }

    /**
     * Setup function to run before all tests in suite
     */
    beforeAll(callback) {
        if (this.currentSuite) {
            this.currentSuite.beforeAll = callback;
        }
    }

    /**
     * Cleanup function to run after all tests in suite
     */
    afterAll(callback) {
        if (this.currentSuite) {
            this.currentSuite.afterAll = callback;
        }
    }

    /**
     * Run all tests
     */
    async runAllTests() {
        if (this.isRunning) {
            console.warn('Tests are already running');
            return;
        }

        this.isRunning = true;
        this.resetResults();

        try {
            // Filter tests (handle 'only' and 'skip')
            const testsToRun = this.getTestsToRun();

            for (const suiteName of this.suites.keys()) {
                const suite = this.suites.get(suiteName);
                const suiteTests = testsToRun.filter(t => t.suite === suiteName);
                
                if (suiteTests.length > 0) {
                    await this.runSuite(suite, suiteTests);
                }
            }

            this.logResult(`✅ Test run completed: ${this.results.passed}/${this.results.total} passed`);
        } catch (error) {
            this.logError(`❌ Test run failed: ${error.message}`);
        } finally {
            this.isRunning = false;
        }

        return this.results;
    }

    /**
     * Run tests in a specific suite
     */
    async runSuite(suite, tests) {
        this.logInfo(`📦 Running suite: ${suite.name}`);

        try {
            // Run beforeAll hook
            if (suite.beforeAll) {
                await this.executeWithTimeout(suite.beforeAll, 10000);
            }

            // Run each test
            for (const test of tests) {
                await this.runTest(test, suite);
            }

            // Run afterAll hook
            if (suite.afterAll) {
                await this.executeWithTimeout(suite.afterAll, 10000);
            }

        } catch (error) {
            this.logError(`Suite ${suite.name} failed: ${error.message}`);
        }
    }

    /**
     * Run a single test
     */
    async runTest(test, suite) {
        const startTime = performance.now();
        
        try {
            this.logInfo(`  🧪 ${test.name}`);

            // Skip test if marked
            if (test.skip) {
                test.result = 'skipped';
                this.results.skipped++;
                suite.results.skipped++;
                this.logWarn(`  ⏭️ Skipped: ${test.name}`);
                return;
            }

            // Run beforeEach hook
            if (suite.beforeEach) {
                await this.executeWithTimeout(suite.beforeEach, 5000);
            }

            // Run the test
            await this.executeWithTimeout(test.function, test.timeout);

            // Test passed
            test.result = 'passed';
            test.duration = performance.now() - startTime;
            this.results.passed++;
            suite.results.passed++;
            this.logSuccess(`  ✅ Passed: ${test.name} (${Math.round(test.duration)}ms)`);

        } catch (error) {
            // Test failed
            test.result = 'failed';
            test.error = error;
            test.duration = performance.now() - startTime;
            this.results.failed++;
            suite.results.failed++;
            this.logError(`  ❌ Failed: ${test.name} - ${error.message}`);

        } finally {
            // Run afterEach hook
            try {
                if (suite.afterEach) {
                    await this.executeWithTimeout(suite.afterEach, 5000);
                }
            } catch (error) {
                this.logError(`  ⚠️ afterEach failed: ${error.message}`);
            }

            this.results.total++;
            suite.results.total++;
        }
    }

    /**
     * Execute function with timeout
     */
    async executeWithTimeout(func, timeout) {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                reject(new Error(`Test timed out after ${timeout}ms`));
            }, timeout);

            try {
                const result = func();
                
                if (result && typeof result.then === 'function') {
                    // Handle promise
                    result
                        .then(resolve)
                        .catch(reject)
                        .finally(() => clearTimeout(timer));
                } else {
                    // Synchronous function
                    clearTimeout(timer);
                    resolve(result);
                }
            } catch (error) {
                clearTimeout(timer);
                reject(error);
            }
        });
    }

    /**
     * Get tests to run (handle only/skip flags)
     */
    getTestsToRun() {
        const onlyTests = this.tests.filter(t => t.only);
        return onlyTests.length > 0 ? onlyTests : this.tests.filter(t => !t.skip);
    }

    /**
     * Reset test results
     */
    resetResults() {
        this.results = { total: 0, passed: 0, failed: 0, skipped: 0 };
        
        for (const suite of this.suites.values()) {
            suite.results = { total: 0, passed: 0, failed: 0, skipped: 0 };
        }

        // Reset individual test results
        this.tests.forEach(test => {
            test.result = null;
            test.error = null;
            test.duration = 0;
        });
    }

    /**
     * Logging methods
     */
    logInfo(message) {
        console.log(`ℹ️ ${message}`);
    }

    logSuccess(message) {
        console.log(`✅ ${message}`);
    }

    logWarn(message) {
        console.warn(`⚠️ ${message}`);
    }

    logError(message) {
        console.error(`❌ ${message}`);
    }

    logResult(message) {
        console.log(`📊 ${message}`);
    }
}

/**
 * Assertion Library
 */
class Expect {
    constructor(actual) {
        this.actual = actual;
        this.isNot = false;
    }

    get not() {
        const newExpect = new Expect(this.actual);
        newExpected.isNot = !this.isNot;
        return newExpect;
    }

    toBe(expected) {
        const passes = Object.is(this.actual, expected);
        if (this.isNot ? passes : !passes) {
            throw new Error(`Expected ${this.actual} ${this.isNot ? 'not ' : ''}to be ${expected}`);
        }
    }

    toEqual(expected) {
        const passes = this.deepEqual(this.actual, expected);
        if (this.isNot ? passes : !passes) {
            throw new Error(`Expected ${JSON.stringify(this.actual)} ${this.isNot ? 'not ' : ''}to equal ${JSON.stringify(expected)}`);
        }
    }

    toBeNull() {
        const passes = this.actual === null;
        if (this.isNot ? passes : !passes) {
            throw new Error(`Expected ${this.actual} ${this.isNot ? 'not ' : ''}to be null`);
        }
    }

    toBeUndefined() {
        const passes = this.actual === undefined;
        if (this.isNot ? passes : !passes) {
            throw new Error(`Expected ${this.actual} ${this.isNot ? 'not ' : ''}to be undefined`);
        }
    }

    toBeTruthy() {
        const passes = !!this.actual;
        if (this.isNot ? passes : !passes) {
            throw new Error(`Expected ${this.actual} ${this.isNot ? 'not ' : ''}to be truthy`);
        }
    }

    toBeFalsy() {
        const passes = !this.actual;
        if (this.isNot ? passes : !passes) {
            throw new Error(`Expected ${this.actual} ${this.isNot ? 'not ' : ''}to be falsy`);
        }
    }

    toContain(expected) {
        const passes = this.actual && this.actual.includes && this.actual.includes(expected);
        if (this.isNot ? passes : !passes) {
            throw new Error(`Expected ${this.actual} ${this.isNot ? 'not ' : ''}to contain ${expected}`);
        }
    }

    toHaveLength(expected) {
        const passes = this.actual && this.actual.length === expected;
        if (this.isNot ? passes : !passes) {
            throw new Error(`Expected ${this.actual} ${this.isNot ? 'not ' : ''}to have length ${expected}, but got ${this.actual ? this.actual.length : 'undefined'}`);
        }
    }

    toBeInstanceOf(expected) {
        const passes = this.actual instanceof expected;
        if (this.isNot ? passes : !passes) {
            throw new Error(`Expected ${this.actual} ${this.isNot ? 'not ' : ''}to be instance of ${expected.name}`);
        }
    }

    toThrow(expectedError) {
        let threw = false;
        let error = null;

        try {
            if (typeof this.actual === 'function') {
                this.actual();
            }
        } catch (e) {
            threw = true;
            error = e;
        }

        if (this.isNot) {
            if (threw) {
                throw new Error(`Expected function not to throw, but it threw: ${error.message}`);
            }
        } else {
            if (!threw) {
                throw new Error('Expected function to throw, but it did not');
            }
            
            if (expectedError && !error.message.includes(expectedError)) {
                throw new Error(`Expected function to throw "${expectedError}", but it threw "${error.message}"`);
            }
        }
    }

    async toResolve() {
        try {
            await this.actual;
        } catch (error) {
            throw new Error(`Expected promise to resolve, but it rejected with: ${error.message}`);
        }
    }

    async toReject(expectedError) {
        try {
            await this.actual;
            throw new Error('Expected promise to reject, but it resolved');
        } catch (error) {
            if (expectedError && !error.message.includes(expectedError)) {
                throw new Error(`Expected promise to reject with "${expectedError}", but it rejected with "${error.message}"`);
            }
        }
    }

    deepEqual(a, b) {
        if (a === b) return true;
        if (a == null || b == null) return false;
        if (typeof a !== typeof b) return false;
        
        if (typeof a === 'object') {
            const keysA = Object.keys(a);
            const keysB = Object.keys(b);
            
            if (keysA.length !== keysB.length) return false;
            
            for (const key of keysA) {
                if (!keysB.includes(key)) return false;
                if (!this.deepEqual(a[key], b[key])) return false;
            }
            
            return true;
        }
        
        return false;
    }
}

/**
 * Test Runner with UI Integration
 */
class TestRunner extends TestFramework {
    constructor() {
        super();
        this.updateInterval = null;
    }

    async runAllTests() {
        this.startUIUpdates();
        const results = await super.runAllTests();
        this.stopUIUpdates();
        this.updateUI();
        return results;
    }

    async runStorageTests() {
        return this.runTestsByPattern(/storage/i);
    }

    async runNotesTests() {
        return this.runTestsByPattern(/notes/i);
    }

    async runUITests() {
        return this.runTestsByPattern(/ui/i);
    }

    async runThemeTests() {
        return this.runTestsByPattern(/theme/i);
    }

    async runTestsByPattern(pattern) {
        if (this.isRunning) return;

        this.isRunning = true;
        this.resetResults();
        this.startUIUpdates();

        try {
            for (const suiteName of this.suites.keys()) {
                if (pattern.test(suiteName)) {
                    const suite = this.suites.get(suiteName);
                    const suiteTests = this.tests.filter(t => t.suite === suiteName && !t.skip);
                    
                    if (suiteTests.length > 0) {
                        await this.runSuite(suite, suiteTests);
                    }
                }
            }
        } finally {
            this.isRunning = false;
            this.stopUIUpdates();
            this.updateUI();
        }

        return this.results;
    }

    startUIUpdates() {
        this.updateUI();
        this.updateInterval = setInterval(() => this.updateUI(), 100);
    }

    stopUIUpdates() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    updateUI() {
        this.updateSummary();
        this.updateProgress();
        this.updateSuites();
    }

    updateSummary() {
        const summaryEl = document.getElementById('test-summary');
        if (!summaryEl) return;

        summaryEl.innerHTML = `
            <div class="summary-card total">
                <span class="summary-number">${this.results.total}</span>
                <div>Total Tests</div>
            </div>
            <div class="summary-card passed">
                <span class="summary-number">${this.results.passed}</span>
                <div>Passed</div>
            </div>
            <div class="summary-card failed">
                <span class="summary-number">${this.results.failed}</span>
                <div>Failed</div>
            </div>
            <div class="summary-card skipped">
                <span class="summary-number">${this.results.skipped}</span>
                <div>Skipped</div>
            </div>
        `;
    }

    updateProgress() {
        const progressEl = document.getElementById('progress-fill');
        if (!progressEl) return;

        const totalTests = this.tests.filter(t => !t.skip).length;
        const completedTests = this.results.passed + this.results.failed + this.results.skipped;
        const progress = totalTests > 0 ? (completedTests / totalTests) * 100 : 0;
        
        progressEl.style.width = `${progress}%`;
    }

    updateSuites() {
        const suitesEl = document.getElementById('test-suites');
        if (!suitesEl) return;

        let html = '';
        
        for (const [suiteName, suite] of this.suites) {
            const suiteStatus = suite.results.failed > 0 ? 'failed' : 'passed';
            
            html += `
                <div class="test-suite">
                    <div class="suite-header">
                        <span>${suiteName}</span>
                        <span class="suite-status ${suiteStatus}">
                            ${suite.results.passed}/${suite.results.total} passed
                        </span>
                    </div>
                    ${suite.tests.map(test => this.renderTest(test)).join('')}
                </div>
            `;
        }
        
        suitesEl.innerHTML = html;
    }

    renderTest(test) {
        const status = test.result || (this.isRunning ? 'running' : 'pending');
        const duration = test.duration ? `<span class="test-duration">${Math.round(test.duration)}ms</span>` : '';
        const error = test.error ? `<div class="test-error">${test.error.message}\n${test.error.stack || ''}</div>` : '';
        
        return `
            <div class="test-case">
                <div class="test-name">${test.name}</div>
                <div>
                    <span class="test-status ${status}">${status.toUpperCase()}</span>
                    ${duration}
                </div>
            </div>
            ${error}
        `;
    }

    clearResults() {
        this.resetResults();
        this.updateUI();
        this.logInfo('Test results cleared');
    }

    logInfo(message) {
        super.logInfo(message);
        this.addLogEntry(message, 'info');
    }

    logSuccess(message) {
        super.logSuccess(message);
        this.addLogEntry(message, 'success');
    }

    logWarn(message) {
        super.logWarn(message);
        this.addLogEntry(message, 'warn');
    }

    logError(message) {
        super.logError(message);
        this.addLogEntry(message, 'error');
    }

    addLogEntry(message, type) {
        const logEl = document.getElementById('test-log');
        if (!logEl) return;

        const timestamp = new Date().toLocaleTimeString();
        const entry = document.createElement('div');
        entry.className = `log-entry ${type}`;
        entry.textContent = `[${timestamp}] ${message}`;
        
        logEl.appendChild(entry);
        logEl.scrollTop = logEl.scrollHeight;
    }
}

// Global functions for test definitions
function describe(suiteName, callback) {
    if (!window.testFramework) {
        window.testFramework = new TestFramework();
    }
    return window.testFramework.describe(suiteName, callback);
}

function it(testName, testFunction, options) {
    if (!window.testFramework) {
        throw new Error('Tests must be defined within a describe block');
    }
    return window.testFramework.it(testName, testFunction, options);
}

function beforeEach(callback) {
    if (!window.testFramework) {
        throw new Error('beforeEach must be defined within a describe block');
    }
    return window.testFramework.beforeEach(callback);
}

function afterEach(callback) {
    if (!window.testFramework) {
        throw new Error('afterEach must be defined within a describe block');
    }
    return window.testFramework.afterEach(callback);
}

function beforeAll(callback) {
    if (!window.testFramework) {
        throw new Error('beforeAll must be defined within a describe block');
    }
    return window.testFramework.beforeAll(callback);
}

function afterAll(callback) {
    if (!window.testFramework) {
        throw new Error('afterAll must be defined within a describe block');
    }
    return window.testFramework.afterAll(callback);
}

function expect(actual) {
    return new Expect(actual);
}

// Export classes
window.TestFramework = TestFramework;
window.TestRunner = TestRunner;
window.Expect = Expect;
