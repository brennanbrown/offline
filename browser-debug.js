// Browser debug script to test functionality
console.log('🔍 Starting browser debug...');

// Test 1: Check if DOM elements exist
function testDOMElements() {
    console.log('\n📋 Testing DOM Elements:');
    const elements = {
        'new-folder-btn': document.getElementById('new-folder-btn'),
        'new-note-btn': document.getElementById('new-note-btn'),
        'search-input': document.getElementById('search-input'),
        'editor-container': document.getElementById('editor-container')
    };
    
    Object.entries(elements).forEach(([id, el]) => {
        console.log(el ? `✅ ${id}` : `❌ ${id} NOT FOUND`);
    });
    
    return elements;
}

// Test 2: Check if JavaScript classes are loaded
function testJSClasses() {
    console.log('\n🔧 Testing JavaScript Classes:');
    const classes = {
        'StorageManager': typeof StorageManager,
        'UIManager': typeof UIManager,
        'ThemeManager': typeof ThemeManager,
        'NotesManager': typeof NotesManager,
        'OfflineApp': typeof OfflineApp
    };
    
    Object.entries(classes).forEach(([name, type]) => {
        console.log(type === 'function' ? `✅ ${name}` : `❌ ${name}: ${type}`);
    });
    
    return classes;
}

// Test 3: Check if app is initialized
function testAppInitialization() {
    console.log('\n🚀 Testing App Initialization:');
    if (window.offlineApp) {
        console.log('✅ OfflineApp instance exists');
        console.log('Initialized:', window.offlineApp.isInitialized);
        return window.offlineApp;
    } else {
        console.log('❌ OfflineApp instance NOT found');
        return null;
    }
}

// Test 4: Test folder button functionality
function testFolderButton() {
    console.log('\n📁 Testing Folder Button:');
    const btn = document.getElementById('new-folder-btn');
    if (!btn) {
        console.log('❌ Folder button not found');
        return;
    }
    
    console.log('✅ Folder button found');
    
    // Check if event listener is attached
    const events = getEventListeners ? getEventListeners(btn) : 'getEventListeners not available';
    console.log('Event listeners:', events);
    
    // Try clicking programmatically
    try {
        btn.click();
        console.log('✅ Button click executed');
    } catch (error) {
        console.log('❌ Button click failed:', error.message);
    }
}

// Test 5: Test Quill.js
function testQuill() {
    console.log('\n📝 Testing Quill.js:');
    if (typeof Quill === 'undefined') {
        console.log('❌ Quill not loaded');
        return;
    }
    
    console.log('✅ Quill loaded');
    
    // Try creating a test editor
    try {
        const testDiv = document.createElement('div');
        testDiv.id = 'test-quill';
        document.body.appendChild(testDiv);
        
        const editor = new Quill('#test-quill', { theme: 'snow' });
        console.log('✅ Quill editor created successfully');
        
        // Clean up
        document.body.removeChild(testDiv);
    } catch (error) {
        console.log('❌ Quill editor creation failed:', error.message);
    }
}

// Run all tests
function runAllTests() {
    console.log('🧪 Running comprehensive debug tests...\n');
    
    const results = {
        dom: testDOMElements(),
        classes: testJSClasses(),
        app: testAppInitialization(),
        folder: testFolderButton(),
        quill: testQuill()
    };
    
    console.log('\n📊 Debug Summary:');
    console.log('DOM Elements:', Object.values(results.dom).filter(Boolean).length + '/4 found');
    console.log('JS Classes:', Object.values(results.classes).filter(t => t === 'function').length + '/5 loaded');
    console.log('App Initialized:', results.app?.isInitialized || false);
    
    return results;
}

// Auto-run tests when script loads
setTimeout(runAllTests, 1000);

// Make functions available globally for manual testing
window.debugTests = {
    runAllTests,
    testDOMElements,
    testJSClasses,
    testAppInitialization,
    testFolderButton,
    testQuill
};

console.log('🔧 Debug script loaded. Run debugTests.runAllTests() to test manually.');
