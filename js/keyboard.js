/**
 * keyboard.js - Enhanced virtual keyboard for Code Server PWA
 * 
 * This file implements an improved virtual keyboard overlay for terminal use
 * with expanded key set, proper event handling, visual feedback, and toggle functionality.
 * Now updated to work with same-origin iframes.
 */

class TerminalKeyboard {
    constructor(options = {}) {
        // Default configuration
        this.config = {
            containerId: options.containerId || 'keyboard-overlay',
            toggleButtonId: options.toggleButtonId || 'keyboard-toggle',
            iframeId: options.iframeId || 'codeServer',
            localStorageKey: 'terminalKeyboardVisible',
            keyRepeatDelay: 500,    // ms before key starts repeating
            keyRepeatRate: 50,      // ms between repeats
            ...options
        };

        // State
        this.isVisible = localStorage.getItem(this.config.localStorageKey) !== 'false';
        this.activeKeys = new Set();
        this.repeatIntervals = {};
        this.initialized = false;
        this.iframe = null;
        this.iframeDocument = null;
        this.iframeWindow = null;
        this.debugMode = false;
    }

    /**
     * Initialize the keyboard
     */
    init() {
        if (this.initialized) return;
        
        this.iframe = document.getElementById(this.config.iframeId);
        if (!this.iframe) {
            console.error('Iframe not found:', this.config.iframeId);
            return;
        }
        
        // Wait for iframe to load
        this.iframe.addEventListener('load', () => {
            this.setupIframeAccess();
        });
        
        // If iframe is already loaded
        if (this.iframe.contentWindow && this.iframe.contentDocument) {
            this.setupIframeAccess();
        }
        
        this.createKeyboardDOM();
        this.attachEventListeners();
        this.updateVisibility();
        
        // Toggle debug mode with Ctrl+Shift+D
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'd') {
                this.debugMode = !this.debugMode;
                console.log('Debug mode:', this.debugMode ? 'ON' : 'OFF');
                
                const debugPanel = document.getElementById('debug-panel');
                if (debugPanel) {
                    debugPanel.classList.toggle('visible', this.debugMode);
                }
                
                e.preventDefault();
            }
        });
        
        this.initialized = true;
        console.log('Terminal keyboard initialized');
    }
    
    /**
     * Set up access to the iframe content
     */
    setupIframeAccess() {
        try {
            // Since we're on the same origin, we can access the iframe's contentWindow and contentDocument
            this.iframeWindow = this.iframe.contentWindow;
            this.iframeDocument = this.iframe.contentDocument || this.iframeWindow.document;
            
            console.log('Successfully accessed iframe content');
            this.debugLog('Iframe access established');
            
            // Try to find the terminal element in the iframe
            this.findTerminalElement();
        } catch (error) {
            console.error('Error accessing iframe content:', error);
            this.debugLog('Error accessing iframe: ' + error.message);
        }
    }
    
    /**
     * Find the terminal element in the iframe
     */
    findTerminalElement() {
        if (!this.iframeDocument) return;
        
        try {
            // Try different selectors that might match the terminal element
            const selectors = [
                '.xterm-helper-textarea', // xterm.js terminal input
                '.terminal-wrapper textarea', // VS Code terminal
                '.monaco-editor textarea', // Monaco editor
                '.terminal textarea', // Generic terminal
                'textarea', // Any textarea
                '.xterm', // xterm.js container
                '.terminal', // Generic terminal container
                '.monaco-editor', // Monaco editor container
            ];
            
            for (const selector of selectors) {
                const elements = this.iframeDocument.querySelectorAll(selector);
                if (elements.length > 0) {
                    this.debugLog(`Found ${elements.length} elements matching "${selector}"`);
                    // Store the first matching element as our target
                    this.terminalElement = elements[0];
                    console.log('Found terminal element:', selector, this.terminalElement);
                    return;
                }
            }
            
            this.debugLog('No terminal element found');
            console.warn('Could not find terminal element in iframe');
        } catch (error) {
            console.error('Error finding terminal element:', error);
            this.debugLog('Error finding terminal: ' + error.message);
        }
    }

    /**
     * Create keyboard DOM elements
     */
    createKeyboardDOM() {
        // Create container if it doesn't exist
        let container = document.getElementById(this.config.containerId);
        if (!container) {
            container = document.createElement('div');
            container.id = this.config.containerId;
            container.className = 'keyboard-overlay';
            document.body.appendChild(container);
        }
        
        // Clear existing content
        container.innerHTML = '';
        
        // Create toggle button if it doesn't exist
        let toggleButton = document.getElementById(this.config.toggleButtonId);
        if (!toggleButton) {
            toggleButton = document.createElement('button');
            toggleButton.id = this.config.toggleButtonId;
            toggleButton.className = 'keyboard-toggle';
            toggleButton.innerHTML = '⌨️';
            toggleButton.title = 'Toggle Terminal Keyboard';
            document.body.appendChild(toggleButton);
        }

        // Define key groups
        const keyGroups = [
            {
                name: 'navigation',
                keys: [
                    { display: '↑', key: 'ArrowUp' },
                    { display: '↓', key: 'ArrowDown' },
                    { display: '←', key: 'ArrowLeft' },
                    { display: '→', key: 'ArrowRight' },
                    { display: 'Home', key: 'Home' },
                    { display: 'End', key: 'End' },
                    { display: 'PgUp', key: 'PageUp' },
                    { display: 'PgDn', key: 'PageDown' }
                ]
            },
            {
                name: 'control',
                keys: [
                    { display: 'Esc', key: 'Escape' },
                    { display: 'Tab', key: 'Tab' },
                    { display: '⌫', key: 'Backspace' },
                    { display: 'Del', key: 'Delete' }
                ]
            },
            {
                name: 'modifiers',
                keys: [
                    { display: 'Ctrl', key: 'Control', isModifier: true },
                    { display: 'Alt', key: 'Alt', isModifier: true },
                    { display: 'Shift', key: 'Shift', isModifier: true }
                ]
            },
            {
                name: 'function',
                keys: [
                    { display: 'F1', key: 'F1' },
                    { display: 'F2', key: 'F2' },
                    { display: 'F3', key: 'F3' },
                    { display: 'F4', key: 'F4' },
                    { display: 'F5', key: 'F5' },
                    { display: 'F6', key: 'F6' }
                ]
            },
            {
                name: 'common',
                keys: [
                    { display: 'C', key: 'c' },
                    { display: 'V', key: 'v' },
                    { display: 'D', key: 'd' },
                    { display: 'Z', key: 'z' },
                    { display: 'A', key: 'a' },
                    { display: 'K', key: 'k' },
                    { display: 'L', key: 'l' },
                    { display: 'R', key: 'r' }
                ]
            },
            {
                name: 'combinations',
                keys: [
                    { display: 'Ctrl+C', key: 'c', withModifiers: ['Control'] },
                    { display: 'Ctrl+D', key: 'd', withModifiers: ['Control'] },
                    { display: 'Ctrl+Z', key: 'z', withModifiers: ['Control'] }
                ]
            }
        ];

        // Create key groups
        keyGroups.forEach(group => {
            const groupEl = document.createElement('div');
            groupEl.className = `key-group ${group.name}`;
            
            group.keys.forEach(keyConfig => {
                const keyEl = document.createElement('div');
                keyEl.className = 'key';
                keyEl.dataset.key = keyConfig.key;
                keyEl.innerHTML = keyConfig.display;
                
                if (keyConfig.isModifier) {
                    keyEl.classList.add('modifier-key');
                }
                
                if (keyConfig.withModifiers) {
                    keyEl.dataset.withModifiers = JSON.stringify(keyConfig.withModifiers);
                    keyEl.classList.add('combination-key');
                }
                
                groupEl.appendChild(keyEl);
            });
            
            container.appendChild(groupEl);
        });
    }

    /**
     * Attach event listeners to keyboard elements
     */
    attachEventListeners() {
        // Toggle button click
        const toggleButton = document.getElementById(this.config.toggleButtonId);
        if (toggleButton) {
            toggleButton.addEventListener('click', (e) => {
                this.toggleVisibility();
                e.preventDefault();
                e.stopPropagation();
            });
        }
        
        // Keyboard shortcut for toggle (Ctrl+K)
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'k') {
                this.toggleVisibility();
                e.preventDefault();
            }
        });
        
        // Key press events
        const container = document.getElementById(this.config.containerId);
        if (container) {
            // Mouse events
            container.addEventListener('mousedown', (e) => {
                const keyEl = e.target.closest('.key');
                if (keyEl) {
                    this.handleKeyDown(keyEl);
                    e.preventDefault();
                    e.stopPropagation();
                }
            });
            
            container.addEventListener('mouseup', (e) => {
                const keyEl = e.target.closest('.key');
                if (keyEl) {
                    this.handleKeyUp(keyEl);
                    e.preventDefault();
                    e.stopPropagation();
                }
            });
            
            // Touch events for mobile
            container.addEventListener('touchstart', (e) => {
                const keyEl = e.target.closest('.key');
                if (keyEl) {
                    this.handleKeyDown(keyEl);
                    e.preventDefault();
                    e.stopPropagation();
                }
            });
            
            container.addEventListener('touchend', (e) => {
                const keyEl = e.target.closest('.key');
                if (keyEl) {
                    this.handleKeyUp(keyEl);
                    e.preventDefault();
                    e.stopPropagation();
                }
            });
            
            // Prevent context menu on long press
            container.addEventListener('contextmenu', (e) => {
                if (e.target.closest('.key')) {
                    e.preventDefault();
                    e.stopPropagation();
                }
            });
        }
    }

    /**
     * Handle key down event
     */
    handleKeyDown(keyEl) {
        if (!keyEl) return;
        
        const key = keyEl.dataset.key;
        if (!key) return;
        
        keyEl.classList.add('active');
        
        // Handle combination keys
        if (keyEl.dataset.withModifiers) {
            const modifiers = JSON.parse(keyEl.dataset.withModifiers);
            this.sendCombinationKey(key, modifiers);
            return;
        }
        
        // Handle regular keys
        this.activeKeys.add(key);
        this.sendKeyDown(key);
        
        // Set up key repeat
        if (this.repeatIntervals[key]) {
            clearTimeout(this.repeatIntervals[key]);
        }
        
        this.repeatIntervals[key] = setTimeout(() => {
            this.repeatIntervals[key] = setInterval(() => {
                if (this.activeKeys.has(key)) {
                    this.sendKeyDown(key);
                    this.sendKeyUp(key);
                } else {
                    clearInterval(this.repeatIntervals[key]);
                    delete this.repeatIntervals[key];
                }
            }, this.config.keyRepeatRate);
        }, this.config.keyRepeatDelay);
    }

    /**
     * Handle key up event
     */
    handleKeyUp(keyEl) {
        if (!keyEl) return;
        
        const key = keyEl.dataset.key;
        if (!key) return;
        
        keyEl.classList.remove('active');
        
        // Don't send keyup for combination keys
        if (keyEl.dataset.withModifiers) {
            return;
        }
        
        this.activeKeys.delete(key);
        this.sendKeyUp(key);
        
        // Clear repeat interval
        if (this.repeatIntervals[key]) {
            clearTimeout(this.repeatIntervals[key]);
            clearInterval(this.repeatIntervals[key]);
            delete this.repeatIntervals[key];
        }
    }

    /**
     * Send key down event to target window
     */
    sendKeyDown(key) {
        try {
            this.debugLog(`Sending keydown: ${key}`);
            
            // Try multiple approaches to send the key event
            this.tryMultipleKeyboardApproaches('keydown', key);
            
            // Show visual feedback
            this.showKeyPressEffect(key);
            
            console.log('Sent keydown:', key);
        } catch (error) {
            console.error('Error sending keydown event:', error);
            this.debugLog(`Error sending keydown: ${error.message}`);
        }
    }

    /**
     * Send key up event to target window
     */
    sendKeyUp(key) {
        try {
            this.debugLog(`Sending keyup: ${key}`);
            
            // Try multiple approaches to send the key event
            this.tryMultipleKeyboardApproaches('keyup', key);
            
            console.log('Sent keyup:', key);
        } catch (error) {
            console.error('Error sending keyup event:', error);
            this.debugLog(`Error sending keyup: ${error.message}`);
        }
    }

    /**
     * Send combination key (e.g., Ctrl+C)
     */
    sendCombinationKey(key, modifiers) {
        try {
            this.debugLog(`Sending combination: ${modifiers.join('+')}+${key}`);
            
            // Try multiple approaches to send the key combination
            this.tryMultipleKeyboardApproaches('keydown', key, modifiers);
            
            // Small delay before keyup
            setTimeout(() => {
                this.tryMultipleKeyboardApproaches('keyup', key, modifiers);
            }, 50);
            
            // Show visual feedback
            this.showKeyPressEffect(key, modifiers);
            
            console.log('Sent combination key:', modifiers.join('+') + '+' + key);
        } catch (error) {
            console.error('Error sending combination key event:', error);
            this.debugLog(`Error sending combination: ${error.message}`);
        }
    }
    
    /**
     * Try multiple approaches to send keyboard events
     */
    tryMultipleKeyboardApproaches(eventType, key, modifiers = []) {
        // Approach 1: Focus and send to terminal element if found
        if (this.terminalElement) {
            this.debugLog(`Approach 1: Using terminal element`);
            this.terminalElement.focus();
            this.sendKeyEventToElement(this.terminalElement, eventType, key, modifiers);
        }
        
        // Approach 2: Send to iframe document
        if (this.iframeDocument) {
            this.debugLog(`Approach 2: Using iframe document`);
            this.sendKeyEventToElement(this.iframeDocument, eventType, key, modifiers);
        }
        
        // Approach 3: Send to iframe window
        if (this.iframeWindow) {
            this.debugLog(`Approach 3: Using iframe window`);
            this.sendKeyEventToElement(this.iframeWindow, eventType, key, modifiers);
        }
        
        // Approach 4: Try to find active element in iframe
        if (this.iframeDocument && this.iframeDocument.activeElement) {
            this.debugLog(`Approach 4: Using active element in iframe`);
            this.sendKeyEventToElement(this.iframeDocument.activeElement, eventType, key, modifiers);
        }
        
        // Approach 5: Try to insert text directly for keydown events
        if (eventType === 'keydown' && this.terminalElement && 
            this.terminalElement.tagName === 'TEXTAREA' && 
            !modifiers.length && key.length === 1) {
            
            this.debugLog(`Approach 5: Direct text insertion`);
            
            // Save current selection
            const start = this.terminalElement.selectionStart;
            const end = this.terminalElement.selectionEnd;
            
            // Insert the character
            this.terminalElement.value = 
                this.terminalElement.value.substring(0, start) + 
                key + 
                this.terminalElement.value.substring(end);
            
            // Restore selection at new position
            this.terminalElement.selectionStart = this.terminalElement.selectionEnd = start + 1;
            
            // Trigger input event
            this.terminalElement.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }
    
    /**
     * Send a keyboard event to a specific element
     */
    sendKeyEventToElement(element, eventType, key, modifiers = []) {
        // Create event options
        const options = {
            key: key,
            code: this.getCodeFromKey(key),
            bubbles: true,
            cancelable: true,
            view: element.ownerDocument?.defaultView || window
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
        
        // Create and dispatch the event
        const event = new KeyboardEvent(eventType, options);
        element.dispatchEvent(event);
    }

    /**
     * Get the code value from a key (for KeyboardEvent)
     */
    getCodeFromKey(key) {
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

    /**
     * Show visual feedback for key press
     */
    showKeyPressEffect(key, modifiers = []) {
        // Create a visual effect element
        const effect = document.createElement('div');
        effect.className = 'key-press-effect';
        
        // Set the text based on the key and modifiers
        let keyText = key;
        if (modifiers.length > 0) {
            keyText = modifiers.join('+') + '+' + key;
        }
        
        effect.textContent = keyText;
        
        // Add to the document
        document.body.appendChild(effect);
        
        // Remove after animation
        setTimeout(() => {
            effect.classList.add('fade-out');
            setTimeout(() => {
                if (effect.parentNode) {
                    document.body.removeChild(effect);
                }
            }, 500);
        }, 500);
    }

    /**
     * Log message to debug panel
     */
    debugLog(message) {
        if (!this.debugMode) return;
        
        const debugPanel = document.getElementById('debug-panel');
        if (debugPanel) {
            const logEntry = document.createElement('div');
            logEntry.textContent = `${new Date().toLocaleTimeString()}: ${message}`;
            debugPanel.appendChild(logEntry);
            
            // Limit entries
            while (debugPanel.children.length > 20) {
                debugPanel.removeChild(debugPanel.firstChild);
            }
            
            // Auto-scroll
            debugPanel.scrollTop = debugPanel.scrollHeight;
        }
    }

    /**
     * Toggle keyboard visibility
     */
    toggleVisibility() {
        this.isVisible = !this.isVisible;
        localStorage.setItem(this.config.localStorageKey, this.isVisible.toString());
        this.updateVisibility();
    }

    /**
     * Update keyboard visibility based on current state
     */
    updateVisibility() {
        const container = document.getElementById(this.config.containerId);
        const toggleButton = document.getElementById(this.config.toggleButtonId);
        
        if (container) {
            container.style.display = this.isVisible ? 'flex' : 'none';
        }
        
        if (toggleButton) {
            toggleButton.classList.toggle('active', this.isVisible);
        }
    }
}

// Create and export keyboard instance
const terminalKeyboard = new TerminalKeyboard();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    terminalKeyboard.init();
});

// Export for use in other modules
window.terminalKeyboard = terminalKeyboard;