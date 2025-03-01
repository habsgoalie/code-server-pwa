/**
 * keyboard.js - Enhanced virtual keyboard for Code Server PWA
 * 
 * This file implements an improved virtual keyboard overlay for terminal use
 * with expanded key set, proper event handling, visual feedback, and toggle functionality.
 */

class TerminalKeyboard {
    constructor(options = {}) {
        // Default configuration
        this.config = {
            containerId: options.containerId || 'keyboard-overlay',
            toggleButtonId: options.toggleButtonId || 'keyboard-toggle',
            iframeId: options.iframeId || 'codeServer',
            localStorageKey: 'terminalKeyboardVisible',
            ...options
        };

        // State
        this.isVisible = localStorage.getItem(this.config.localStorageKey) !== 'false';
        this.activeKeys = new Set();
        this.initialized = false;
        this.iframe = null;
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
        
        // Check iframe sandbox attributes
        this.checkIframeSandbox();
        
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
     * Check iframe sandbox attributes
     */
    checkIframeSandbox() {
        if (!this.iframe) return;
        
        console.log('Checking iframe sandbox attributes');
        
        const sandbox = this.iframe.getAttribute('sandbox');
        console.log('Iframe sandbox attribute:', sandbox);
        
        // Check if necessary permissions are present
        const requiredPermissions = [
            'allow-scripts',
            'allow-same-origin',
            'allow-forms'
        ];
        
        const missingPermissions = [];
        for (const permission of requiredPermissions) {
            if (!sandbox || !sandbox.includes(permission)) {
                missingPermissions.push(permission);
            }
        }
        
        if (missingPermissions.length > 0) {
            console.error('Iframe missing required sandbox permissions:', missingPermissions.join(', '));
        } else {
            console.log('Iframe has all required sandbox permissions');
        }
        
        // Try to access iframe content to check if same-origin policy is in effect
        try {
            const iframeDocument = this.iframe.contentDocument || this.iframe.contentWindow.document;
            console.log('Successfully accessed iframe document, same-origin confirmed');
        } catch (error) {
            console.error('Cannot access iframe document due to cross-origin restrictions:', error);
        }
    }
    
    /**
     * Get keyCode for special keys
     */
    getKeyCode(key) {
        const keyCodeMap = {
            'ArrowUp': 38,
            'ArrowDown': 40,
            'ArrowLeft': 37,
            'ArrowRight': 39,
            'Home': 36,
            'End': 35,
            'PageUp': 33,
            'PageDown': 34,
            'Escape': 27,
            'Tab': 9,
            'Backspace': 8,
            'Delete': 46,
            'Enter': 13,
            'Control': 17,
            'Alt': 18,
            'Shift': 16,
            'F1': 112,
            'F2': 113,
            'F3': 114,
            'F4': 115,
            'F5': 116,
            'F6': 117
        };
        
        return keyCodeMap[key] || 0;
    }
    
    /**
     * Get code for modifier keys
     */
    getModifierCode(modifier) {
        const modifierCodeMap = {
            'Control': 'ControlLeft',
            'Alt': 'AltLeft',
            'Shift': 'ShiftLeft'
        };
        
        return modifierCodeMap[modifier] || modifier;
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
    }

    /**
     * Send key down event to target window
     */
    sendKeyDown(key) {
        try {
            // Focus the iframe
            if (this.iframe) {
                this.iframe.focus();
                console.log('Focused iframe with id:', this.iframe.id);
                
                // Check if we can access iframe content
                try {
                    const iframeDocument = this.iframe.contentDocument || this.iframe.contentWindow.document;
                    console.log('Successfully accessed iframe document - same origin confirmed');
                    console.log('Iframe URL:', this.iframe.contentWindow.location.href);
                    console.log('Iframe document title:', iframeDocument.title);
                    
                    // Try to find the active element or a suitable target in the iframe
                    let target = null;
                    
                    // First, try the active element
                    if (iframeDocument.activeElement &&
                        iframeDocument.activeElement !== iframeDocument.body &&
                        iframeDocument.activeElement !== iframeDocument.documentElement) {
                        target = iframeDocument.activeElement;
                        console.log('Using iframe activeElement as target:', target.tagName);
                    } else {
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
                            const elements = iframeDocument.querySelectorAll(selector);
                            if (elements.length > 0) {
                                target = elements[0];
                                console.log('Found target in iframe with selector:', selector);
                                break;
                            }
                        }
                        
                        if (!target) {
                            console.log('No specific target found in iframe, using document.body');
                            target = iframeDocument.body;
                        }
                    }
                    
                    // For Monaco editor and VS Code, we need special handling
                    const isMonacoEditor = target.closest('.monaco-editor') !== null;
                    const isTerminal = target.closest('.terminal') !== null || target.closest('.xterm') !== null;
                    
                    // For terminal, use a specialized approach
                    if (isTerminal) {
                        try {
                            // Create a more specific keyboard event with additional properties
                            const terminalEvent = new KeyboardEvent('keydown', {
                                key: key,
                                code: key.length === 1 ? 'Key' + key.toUpperCase() : key,
                                keyCode: key.length === 1 ? key.charCodeAt(0) : this.getKeyCode(key),
                                which: key.length === 1 ? key.charCodeAt(0) : this.getKeyCode(key),
                                bubbles: true,
                                cancelable: true,
                                view: this.iframe.contentWindow,
                                composed: true
                            });
                            
                            console.log('Dispatching specialized terminal keydown event');
                            target.dispatchEvent(terminalEvent);
                            
                            // For character keys, also try to insert the character directly
                            if (key.length === 1) {
                                const inputEvent = new InputEvent('input', {
                                    data: key,
                                    inputType: 'insertText',
                                    bubbles: true
                                });
                                target.dispatchEvent(inputEvent);
                            }
                        } catch (terminalError) {
                            console.error('Error dispatching terminal event:', terminalError);
                        }
                    }
                    // For Monaco editor
                    else if (isMonacoEditor) {
                        try {
                            // Create keyboard event options with keyCode for Monaco
                            const editorOptions = {
                                key: key,
                                code: key.length === 1 ? 'Key' + key.toUpperCase() : key,
                                keyCode: key.length === 1 ? key.charCodeAt(0) : this.getKeyCode(key),
                                which: key.length === 1 ? key.charCodeAt(0) : this.getKeyCode(key),
                                bubbles: true,
                                cancelable: true,
                                view: this.iframe.contentWindow
                            };
                            
                            // Create and dispatch the event directly to the target
                            const editorEvent = new KeyboardEvent('keydown', editorOptions);
                            console.log('Dispatching specialized Monaco editor keydown event');
                            target.dispatchEvent(editorEvent);
                            
                            // For character keys in Monaco, we need to use the input event
                            if (key.length === 1) {
                                try {
                                    const inputEvent = new InputEvent('beforeinput', {
                                        data: key,
                                        inputType: 'insertText',
                                        bubbles: true,
                                        cancelable: true
                                    });
                                    target.dispatchEvent(inputEvent);
                                    
                                    // Also try composition events which Monaco uses
                                    const startEvent = new CompositionEvent('compositionstart', {
                                        data: '',
                                        bubbles: true
                                    });
                                    target.dispatchEvent(startEvent);
                                    
                                    const updateEvent = new CompositionEvent('compositionupdate', {
                                        data: key,
                                        bubbles: true
                                    });
                                    target.dispatchEvent(updateEvent);
                                    
                                    const endEvent = new CompositionEvent('compositionend', {
                                        data: key,
                                        bubbles: true
                                    });
                                    target.dispatchEvent(endEvent);
                                } catch (inputError) {
                                    console.error('Error dispatching input events to Monaco:', inputError);
                                }
                            }
                        } catch (editorError) {
                            console.error('Error dispatching Monaco editor event:', editorError);
                        }
                    }
                    // For regular inputs
                    else {
                        // Create standard keyboard event options
                        const options = {
                            key: key,
                            code: key.length === 1 ? 'Key' + key.toUpperCase() : key,
                            bubbles: true,
                            cancelable: true,
                            view: this.iframe.contentWindow
                        };
                        
                        // Create and dispatch the event directly to the target
                        const event = new KeyboardEvent('keydown', options);
                        console.log('Dispatching standard keydown event to target:', target.tagName);
                        target.dispatchEvent(event);
                        
                        // For text inputs, also try to insert the text directly
                        if (key.length === 1 && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
                            try {
                                // Get current selection
                                const start = target.selectionStart || 0;
                                const end = target.selectionEnd || 0;
                                
                                // Insert the character
                                const newValue = target.value.substring(0, start) + key + target.value.substring(end);
                                target.value = newValue;
                                
                                // Update selection
                                target.selectionStart = target.selectionEnd = start + 1;
                                
                                // Trigger input event
                                target.dispatchEvent(new Event('input', { bubbles: true }));
                                console.log('Directly inserted text into input element');
                            } catch (insertError) {
                                console.error('Error inserting text directly:', insertError);
                            }
                        }
                    }
                    
                } catch (accessError) {
                    console.error('Cannot access iframe document:', accessError);
                }
            } else {
                console.error('Iframe not found for focusing');
            }
            
            // Use postMessage as a fallback
            if (this.iframe && this.iframe.contentWindow) {
                try {
                    const message = {
                        type: 'keyEvent',
                        eventType: 'keydown',
                        key: key,
                        activeKeys: Array.from(this.activeKeys),
                        timestamp: Date.now() // Add timestamp for debugging
                    };
                    
                    console.log('Sending postMessage to iframe:', message);
                    this.iframe.contentWindow.postMessage(message, '*');
                    console.log('postMessage sent successfully');
                } catch (e) {
                    console.error('postMessage error:', e);
                }
            } else {
                console.error('Iframe or contentWindow not available for postMessage');
            }
            
            // Show visual feedback
            this.showKeyPressEffect(key);
            
            console.log('Sent keydown:', key);
        } catch (error) {
            console.error('Error sending keydown event:', error);
        }
    }

    /**
     * Send key up event to target window
     */
    sendKeyUp(key) {
        try {
            // Try to access iframe content
            if (this.iframe) {
                try {
                    const iframeDocument = this.iframe.contentDocument || this.iframe.contentWindow.document;
                    
                    // Try to find the active element or a suitable target in the iframe
                    let target = null;
                    
                    // First, try the active element
                    if (iframeDocument.activeElement &&
                        iframeDocument.activeElement !== iframeDocument.body &&
                        iframeDocument.activeElement !== iframeDocument.documentElement) {
                        target = iframeDocument.activeElement;
                    } else {
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
                            const elements = iframeDocument.querySelectorAll(selector);
                            if (elements.length > 0) {
                                target = elements[0];
                                break;
                            }
                        }
                        
                        if (!target) {
                            target = iframeDocument.body;
                        }
                    }
                    
                    // For Monaco editor and VS Code, we need special handling
                    const isMonacoEditor = target.closest('.monaco-editor') !== null;
                    const isTerminal = target.closest('.terminal') !== null || target.closest('.xterm') !== null;
                    
                    // For terminal, use a specialized approach
                    if (isTerminal) {
                        try {
                            // Create a more specific keyboard event with additional properties
                            const terminalEvent = new KeyboardEvent('keyup', {
                                key: key,
                                code: key.length === 1 ? 'Key' + key.toUpperCase() : key,
                                keyCode: key.length === 1 ? key.charCodeAt(0) : this.getKeyCode(key),
                                which: key.length === 1 ? key.charCodeAt(0) : this.getKeyCode(key),
                                bubbles: true,
                                cancelable: true,
                                view: this.iframe.contentWindow,
                                composed: true
                            });
                            
                            console.log('Dispatching specialized terminal keyup event');
                            target.dispatchEvent(terminalEvent);
                        } catch (terminalError) {
                            console.error('Error dispatching terminal keyup event:', terminalError);
                        }
                    }
                    // For Monaco editor
                    else if (isMonacoEditor) {
                        try {
                            // Create keyboard event options with keyCode for Monaco
                            const editorOptions = {
                                key: key,
                                code: key.length === 1 ? 'Key' + key.toUpperCase() : key,
                                keyCode: key.length === 1 ? key.charCodeAt(0) : this.getKeyCode(key),
                                which: key.length === 1 ? key.charCodeAt(0) : this.getKeyCode(key),
                                bubbles: true,
                                cancelable: true,
                                view: this.iframe.contentWindow
                            };
                            
                            // Create and dispatch the event directly to the target
                            const editorEvent = new KeyboardEvent('keyup', editorOptions);
                            console.log('Dispatching specialized Monaco editor keyup event');
                            target.dispatchEvent(editorEvent);
                        } catch (editorError) {
                            console.error('Error dispatching Monaco editor keyup event:', editorError);
                        }
                    }
                    // For regular inputs
                    else {
                        // Create standard keyboard event options
                        const options = {
                            key: key,
                            code: key.length === 1 ? 'Key' + key.toUpperCase() : key,
                            bubbles: true,
                            cancelable: true,
                            view: this.iframe.contentWindow
                        };
                        
                        // Create and dispatch the event directly to the target
                        const event = new KeyboardEvent('keyup', options);
                        console.log('Dispatching standard keyup event to target:', target.tagName);
                        target.dispatchEvent(event);
                    }
                    
                } catch (accessError) {
                    console.error('Cannot access iframe document for keyup:', accessError);
                }
            }
            
            // Use postMessage as a fallback
            if (this.iframe && this.iframe.contentWindow) {
                try {
                    const message = {
                        type: 'keyEvent',
                        eventType: 'keyup',
                        key: key,
                        activeKeys: Array.from(this.activeKeys)
                    };
                    
                    this.iframe.contentWindow.postMessage(message, '*');
                } catch (e) {
                    console.error('postMessage error:', e);
                }
            }
            
            console.log('Sent keyup:', key);
        } catch (error) {
            console.error('Error sending keyup event:', error);
        }
    }

    /**
     * Send combination key (e.g., Ctrl+C)
     */
    sendCombinationKey(key, modifiers) {
        try {
            // Focus the iframe
            if (this.iframe) {
                this.iframe.focus();
                console.log('Focused iframe for combination key:', modifiers.join('+') + '+' + key);
                
                // Try to access iframe content
                try {
                    const iframeDocument = this.iframe.contentDocument || this.iframe.contentWindow.document;
                    
                    // Try to find the active element or a suitable target in the iframe
                    let target = null;
                    
                    // First, try the active element
                    if (iframeDocument.activeElement &&
                        iframeDocument.activeElement !== iframeDocument.body &&
                        iframeDocument.activeElement !== iframeDocument.documentElement) {
                        target = iframeDocument.activeElement;
                    } else {
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
                            const elements = iframeDocument.querySelectorAll(selector);
                            if (elements.length > 0) {
                                target = elements[0];
                                break;
                            }
                        }
                        
                        if (!target) {
                            target = iframeDocument.body;
                        }
                    }
                    
                    // Create keyboard event options for keydown
                    const downOptions = {
                        key: key,
                        code: key.length === 1 ? 'Key' + key.toUpperCase() : key,
                        bubbles: true,
                        cancelable: true,
                        view: this.iframe.contentWindow
                    };
                    
                    // Add modifier flags
                    modifiers.forEach(modifier => {
                        switch (modifier) {
                            case 'Control': downOptions.ctrlKey = true; break;
                            case 'Alt': downOptions.altKey = true; break;
                            case 'Shift': downOptions.shiftKey = true; break;
                        }
                    });
                    
                    // Create and dispatch the keydown event
                    const downEvent = new KeyboardEvent('keydown', downOptions);
                    console.log('Dispatching direct combination keydown event to target');
                    target.dispatchEvent(downEvent);
                    
                    // Send keyup after a short delay
                    setTimeout(() => {
                        // Create keyboard event options for keyup
                        const upOptions = { ...downOptions };
                        const upEvent = new KeyboardEvent('keyup', upOptions);
                        target.dispatchEvent(upEvent);
                        console.log('Dispatched direct combination keyup event to target');
                        
                        // Also send keyup events for each modifier key to prevent them from getting stuck
                        modifiers.forEach(modifier => {
                            try {
                                const modifierUpOptions = {
                                    key: modifier,
                                    code: this.getModifierCode(modifier),
                                    keyCode: this.getKeyCode(modifier),
                                    which: this.getKeyCode(modifier),
                                    bubbles: true,
                                    cancelable: true,
                                    view: this.iframe.contentWindow
                                };
                                
                                const modifierUpEvent = new KeyboardEvent('keyup', modifierUpOptions);
                                target.dispatchEvent(modifierUpEvent);
                                console.log('Dispatched keyup for modifier:', modifier);
                            } catch (modifierError) {
                                console.error('Error dispatching modifier keyup:', modifierError);
                            }
                        });
                    }, 50);
                    
                } catch (accessError) {
                    console.error('Cannot access iframe document for combination key:', accessError);
                }
            }
            
            // Use postMessage as a fallback
            if (this.iframe && this.iframe.contentWindow) {
                try {
                    const message = {
                        type: 'keyEvent',
                        eventType: 'keydown',
                        key: key,
                        modifiers: modifiers,
                        activeKeys: Array.from(this.activeKeys)
                    };
                    
                    this.iframe.contentWindow.postMessage(message, '*');
                    
                    // Send keyup after a short delay
                    setTimeout(() => {
                        // Send keyup for the main key
                        const upMessage = {
                            type: 'keyEvent',
                            eventType: 'keyup',
                            key: key,
                            modifiers: modifiers,
                            activeKeys: Array.from(this.activeKeys)
                        };
                        
                        this.iframe.contentWindow.postMessage(upMessage, '*');
                        
                        // Also send keyup for each modifier to prevent them from getting stuck
                        modifiers.forEach(modifier => {
                            const modifierUpMessage = {
                                type: 'keyEvent',
                                eventType: 'keyup',
                                key: modifier,
                                activeKeys: Array.from(this.activeKeys)
                            };
                            
                            this.iframe.contentWindow.postMessage(modifierUpMessage, '*');
                            console.log('Sent modifier keyup via postMessage:', modifier);
                        });
                    }, 50);
                } catch (e) {
                    console.error('postMessage error:', e);
                }
            }
            
            // Show visual feedback
            this.showKeyPressEffect(key, modifiers);
            
            console.log('Sent combination key:', modifiers.join('+') + '+' + key);
        } catch (error) {
            console.error('Error sending combination key event:', error);
        }
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

// Add message listener to receive messages from the iframe
window.addEventListener('message', (event) => {
    // Check if the message is from our iframe
    if (event.source === document.getElementById('codeServer')?.contentWindow) {
        console.log('Received message from iframe:', event.data);
    }
});

// Export for use in other modules
window.terminalKeyboard = terminalKeyboard;
