/**
 * iframe-handler.js - Script to be injected into the iframe to handle keyboard events
 * 
 * This script listens for postMessage events from the parent window and
 * simulates keyboard events in the iframe context.
 */

(function() {
    // Check if we're in an iframe
    if (window.self !== window.top) {
        console.log('iframe-handler.js: Running in iframe');
        
        // Listen for messages from the parent window
        window.addEventListener('message', function(event) {
            // Make sure the message is from our parent
            if (event.source === window.parent) {
                handleParentMessage(event.data);
            }
        });
        
        // Handle messages from the parent window
        function handleParentMessage(data) {
            if (data && data.type === 'keyEvent') {
                console.log('iframe-handler.js: Received key event:', data);
                
                // Handle the key event
                if (data.eventType === 'keydown') {
                    console.log('iframe-handler.js: Processing keydown for key:', data.key);
                    simulateKeyDown(data.key, data.modifiers || []);
                } else if (data.eventType === 'keyup') {
                    console.log('iframe-handler.js: Processing keyup for key:', data.key);
                    simulateKeyUp(data.key, data.modifiers || []);
                }
            }
        }
        
        // Simulate a key down event
        function simulateKeyDown(key, modifiers = []) {
            console.log('iframe-handler.js: Simulating keydown for', key, 'with modifiers', modifiers);
            
            // Try multiple approaches
            
            // Approach 1: Create and dispatch a keyboard event
            try {
                const options = createKeyEventOptions(key, modifiers);
                console.log('iframe-handler.js: Created keyboard event options:', JSON.stringify(options));
                
                const event = new KeyboardEvent('keydown', options);
                console.log('iframe-handler.js: Created KeyboardEvent');
                
                // Check if the event was created with the correct properties
                console.log('iframe-handler.js: Event properties - key:', event.key,
                    'code:', event.code,
                    'ctrlKey:', event.ctrlKey,
                    'altKey:', event.altKey,
                    'shiftKey:', event.shiftKey);
                
                // Find the best target for the event
                const target = findBestTarget();
                if (target) {
                    console.log('iframe-handler.js: Dispatching keydown to', target.tagName);
                    const result = target.dispatchEvent(event);
                    console.log('iframe-handler.js: Event dispatch result:', result ? 'not cancelled' : 'cancelled');
                    
                    // Check if the event had any effect
                    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
                        console.log('iframe-handler.js: Target value after event:',
                            target.value ? target.value.substring(0, 20) + '...' : '(empty)');
                    }
                } else {
                    console.log('iframe-handler.js: Dispatching keydown to document');
                    document.dispatchEvent(event);
                }
            } catch (error) {
                console.error('iframe-handler.js: Error dispatching keydown event:', error);
            }
            
            // Approach 2: Try to find and use VS Code's API
            try {
                if (window.vscode) {
                    console.log('iframe-handler.js: VS Code API found');
                    // TODO: Use VS Code API if available
                }
            } catch (error) {
                console.error('iframe-handler.js: Error using VS Code API:', error);
            }
            
            // Approach 3: Try to insert text directly for simple keys
            if (key.length === 1 && !modifiers.length) {
                try {
                    const target = findBestTarget();
                    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
                        console.log('iframe-handler.js: Attempting direct text insertion for key:', key);
                        
                        const start = target.selectionStart;
                        const end = target.selectionEnd;
                        console.log('iframe-handler.js: Selection range:', start, 'to', end);
                        
                        const originalValue = target.value;
                        target.value =
                            target.value.substring(0, start) +
                            key +
                            target.value.substring(end);
                        
                        // Update selection
                        target.selectionStart = target.selectionEnd = start + 1;
                        
                        // Trigger input event
                        target.dispatchEvent(new Event('input', { bubbles: true }));
                        
                        console.log('iframe-handler.js: Inserted text directly. Before:',
                            originalValue ? originalValue.substring(0, 20) + '...' : '(empty)',
                            'After:', target.value ? target.value.substring(0, 20) + '...' : '(empty)');
                    } else {
                        console.log('iframe-handler.js: Direct text insertion not possible, target is not input/textarea');
                    }
                } catch (error) {
                    console.error('iframe-handler.js: Error inserting text:', error);
                }
            }
            
            // Add a final check to see if any approach worked
            console.log('iframe-handler.js: Completed keydown simulation for', key);
        }
        
        // Simulate a key up event
        function simulateKeyUp(key, modifiers = []) {
            try {
                const options = createKeyEventOptions(key, modifiers);
                const event = new KeyboardEvent('keyup', options);
                
                // Find the best target for the event
                const target = findBestTarget();
                if (target) {
                    console.log('iframe-handler.js: Dispatching keyup to', target.tagName);
                    target.dispatchEvent(event);
                } else {
                    console.log('iframe-handler.js: Dispatching keyup to document');
                    document.dispatchEvent(event);
                }
            } catch (error) {
                console.error('iframe-handler.js: Error dispatching keyup event:', error);
            }
        }
        
        // Create options for a keyboard event
        function createKeyEventOptions(key, modifiers = []) {
            const options = {
                key: key,
                code: getCodeFromKey(key),
                bubbles: true,
                cancelable: true,
                view: window
            };
            
            // Add modifier flags
            modifiers.forEach(modifier => {
                switch (modifier) {
                    case 'Control':
                        options.ctrlKey = true;
                        break;
                    case 'Alt':
                        options.altKey = true;
                        break;
                    case 'Shift':
                        options.shiftKey = true;
                        break;
                }
            });
            
            return options;
        }
        
        // Get the code value from a key (for KeyboardEvent)
        function getCodeFromKey(key) {
            // Map of keys to their corresponding code values
            const codeMap = {
                'ArrowUp': 'ArrowUp',
                'ArrowDown': 'ArrowDown',
                'ArrowLeft': 'ArrowLeft',
                'ArrowRight': 'ArrowRight',
                'Home': 'Home',
                'End': 'End',
                'PageUp': 'PageUp',
                'PageDown': 'PageDown',
                'Escape': 'Escape',
                'Tab': 'Tab',
                'Backspace': 'Backspace',
                'Delete': 'Delete',
                'Control': 'ControlLeft',
                'Alt': 'AltLeft',
                'Shift': 'ShiftLeft',
                'F1': 'F1',
                'F2': 'F2',
                'F3': 'F3',
                'F4': 'F4',
                'F5': 'F5',
                'F6': 'F6'
            };
            
            // For letter keys
            if (key.length === 1 && /[a-z]/i.test(key)) {
                return 'Key' + key.toUpperCase();
            }
            
            return codeMap[key] || key;
        }
        
        // Find the best target for keyboard events
        function findBestTarget() {
            console.log('iframe-handler.js: Finding best target for keyboard event');
            
            // First, try the active element
            if (document.activeElement &&
                document.activeElement !== document.body &&
                document.activeElement !== document.documentElement) {
                console.log('iframe-handler.js: Using activeElement as target:',
                    document.activeElement.tagName,
                    document.activeElement.id ? '#' + document.activeElement.id : '',
                    document.activeElement.className ? '.' + document.activeElement.className.replace(/ /g, '.') : '');
                return document.activeElement;
            }
            
            // Try to find a terminal or editor element
            const selectors = [
                '.xterm-helper-textarea', // xterm.js terminal input
                '.terminal-wrapper textarea', // VS Code terminal
                '.monaco-editor textarea', // Monaco editor
                '.terminal textarea', // Generic terminal
                'textarea', // Any textarea
                'input[type="text"]', // Any text input
                '.xterm', // xterm.js container
                '.terminal', // Generic terminal container
                '.monaco-editor', // Monaco editor container
            ];
            
            console.log('iframe-handler.js: Searching for target elements with selectors');
            
            for (const selector of selectors) {
                const elements = document.querySelectorAll(selector);
                if (elements.length > 0) {
                    console.log('iframe-handler.js: Found target with selector:', selector,
                        'count:', elements.length,
                        'element:', elements[0].tagName,
                        elements[0].id ? '#' + elements[0].id : '',
                        elements[0].className ? '.' + elements[0].className.replace(/ /g, '.') : '');
                    return elements[0];
                }
            }
            
            console.log('iframe-handler.js: No specific target found, falling back to document.body');
            // Fallback to document.body
            return document.body;
        }
        
        // Check if we can find the expected DOM elements
        function checkDomElements() {
            console.log('iframe-handler.js: Checking for DOM elements');
            
            // Check for terminal elements
            const terminalSelectors = [
                '.xterm-helper-textarea',
                '.terminal-wrapper textarea',
                '.monaco-editor textarea',
                '.terminal textarea',
                'textarea',
                '.xterm',
                '.terminal',
                '.monaco-editor'
            ];
            
            const foundElements = {};
            
            for (const selector of terminalSelectors) {
                const elements = document.querySelectorAll(selector);
                foundElements[selector] = elements.length;
                
                if (elements.length > 0) {
                    console.log(`iframe-handler.js: Found ${elements.length} elements matching "${selector}"`);
                    
                    // Log details about the first element
                    const el = elements[0];
                    console.log(`iframe-handler.js: First element - tagName: ${el.tagName}, id: ${el.id || '(none)'}, classes: ${el.className || '(none)'}`);
                    
                    // Try to focus the element
                    try {
                        el.focus();
                        console.log(`iframe-handler.js: Successfully focused element ${selector}`);
                        
                        // Try to dispatch a test event to this element
                        try {
                            const testEvent = new KeyboardEvent('keydown', {
                                key: 'a',
                                code: 'KeyA',
                                bubbles: true,
                                cancelable: true
                            });
                            
                            el.dispatchEvent(testEvent);
                            console.log(`iframe-handler.js: Successfully dispatched test event to ${selector}`);
                        } catch (eventError) {
                            console.error(`iframe-handler.js: Error dispatching test event to ${selector}:`, eventError);
                        }
                    } catch (focusError) {
                        console.error(`iframe-handler.js: Error focusing element ${selector}:`, focusError);
                    }
                }
            }
            
            // Send results to parent
            window.parent.postMessage({
                type: 'dom-elements-check',
                elements: foundElements
            }, '*');
        }
        
        // Run the check after a short delay to ensure the page is fully loaded
        setTimeout(checkDomElements, 2000);
        
        // Notify the parent window that we're ready
        window.parent.postMessage({ type: 'iframe-handler-ready' }, '*');
        console.log('iframe-handler.js: Initialized and ready');
    }
})();