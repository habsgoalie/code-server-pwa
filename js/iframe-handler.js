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
                    simulateKeyDown(data.key, data.modifiers || []);
                } else if (data.eventType === 'keyup') {
                    simulateKeyUp(data.key, data.modifiers || []);
                }
            }
        }
        
        // Simulate a key down event
        function simulateKeyDown(key, modifiers = []) {
            // Try multiple approaches
            
            // Approach 1: Create and dispatch a keyboard event
            try {
                const options = createKeyEventOptions(key, modifiers);
                const event = new KeyboardEvent('keydown', options);
                
                // Find the best target for the event
                const target = findBestTarget();
                if (target) {
                    console.log('iframe-handler.js: Dispatching keydown to', target.tagName);
                    target.dispatchEvent(event);
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
                        const start = target.selectionStart;
                        const end = target.selectionEnd;
                        
                        target.value = 
                            target.value.substring(0, start) + 
                            key + 
                            target.value.substring(end);
                        
                        // Update selection
                        target.selectionStart = target.selectionEnd = start + 1;
                        
                        // Trigger input event
                        target.dispatchEvent(new Event('input', { bubbles: true }));
                        
                        console.log('iframe-handler.js: Inserted text directly');
                    }
                } catch (error) {
                    console.error('iframe-handler.js: Error inserting text:', error);
                }
            }
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
            // First, try the active element
            if (document.activeElement && 
                document.activeElement !== document.body && 
                document.activeElement !== document.documentElement) {
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
            
            for (const selector of selectors) {
                const elements = document.querySelectorAll(selector);
                if (elements.length > 0) {
                    return elements[0];
                }
            }
            
            // Fallback to document.body
            return document.body;
        }
        
        // Notify the parent window that we're ready
        window.parent.postMessage({ type: 'iframe-handler-ready' }, '*');
        console.log('iframe-handler.js: Initialized and ready');
    }
})();