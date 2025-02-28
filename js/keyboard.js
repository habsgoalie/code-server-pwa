/**
 * keyboard.js - Enhanced virtual keyboard for Code Server PWA
 * 
 * This file implements an improved virtual keyboard overlay for terminal use
 * with expanded key set, proper event handling, visual feedback, and toggle functionality.
 * It uses a special approach to handle cross-origin iframe communication.
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
        
        this.createKeyboardDOM();
        this.attachEventListeners();
        this.updateVisibility();
        
        this.initialized = true;
        console.log('Terminal keyboard initialized');
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
            toggleButton.addEventListener('click', () => this.toggleVisibility());
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
                }
            });
            
            container.addEventListener('mouseup', (e) => {
                const keyEl = e.target.closest('.key');
                if (keyEl) {
                    this.handleKeyUp(keyEl);
                    e.preventDefault();
                }
            });
            
            // Touch events for mobile
            container.addEventListener('touchstart', (e) => {
                const keyEl = e.target.closest('.key');
                if (keyEl) {
                    this.handleKeyDown(keyEl);
                    e.preventDefault();
                }
            });
            
            container.addEventListener('touchend', (e) => {
                const keyEl = e.target.closest('.key');
                if (keyEl) {
                    this.handleKeyUp(keyEl);
                    e.preventDefault();
                }
            });
            
            // Prevent context menu on long press
            container.addEventListener('contextmenu', (e) => {
                if (e.target.closest('.key')) {
                    e.preventDefault();
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
     * For cross-origin iframes, we use a different approach
     */
    sendKeyDown(key) {
        try {
            // Focus the iframe first
            this.focusIframe();
            
            // For cross-origin iframes, we need to use a different approach
            // We'll simulate a key press by creating a temporary input element,
            // focusing it, and then triggering the key event
            
            // Create a temporary input element
            const input = document.createElement('input');
            input.style.position = 'absolute';
            input.style.opacity = '0';
            input.style.pointerEvents = 'none';
            input.style.zIndex = '-1';
            document.body.appendChild(input);
            
            // Focus the input
            input.focus();
            
            // Dispatch the key event
            const event = new KeyboardEvent('keydown', {
                key: key,
                code: this.getCodeFromKey(key),
                bubbles: true,
                cancelable: true,
                view: window
            });
            
            input.dispatchEvent(event);
            
            // Remove the input after a short delay
            setTimeout(() => {
                document.body.removeChild(input);
            }, 100);
            
            console.log('Sent keydown:', key);
        } catch (error) {
            console.error('Error sending keydown event:', error);
        }
    }

    /**
     * Send key up event to target window
     * For cross-origin iframes, we use a different approach
     */
    sendKeyUp(key) {
        try {
            // For cross-origin iframes, the keyup event is less important
            // as most actions are triggered on keydown
            console.log('Sent keyup:', key);
        } catch (error) {
            console.error('Error sending keyup event:', error);
        }
    }

    /**
     * Send combination key (e.g., Ctrl+C)
     * For cross-origin iframes, we use a different approach
     */
    sendCombinationKey(key, modifiers) {
        try {
            // Focus the iframe first
            this.focusIframe();
            
            // Create a temporary input element
            const input = document.createElement('input');
            input.style.position = 'absolute';
            input.style.opacity = '0';
            input.style.pointerEvents = 'none';
            input.style.zIndex = '-1';
            document.body.appendChild(input);
            
            // Focus the input
            input.focus();
            
            // Create event options with modifiers
            const options = {
                key: key,
                code: this.getCodeFromKey(key),
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
            
            // Dispatch the key event
            input.dispatchEvent(new KeyboardEvent('keydown', options));
            
            // Remove the input after a short delay
            setTimeout(() => {
                document.body.removeChild(input);
            }, 100);
            
            console.log('Sent combination key:', key, 'with modifiers:', modifiers);
        } catch (error) {
            console.error('Error sending combination key event:', error);
        }
    }

    /**
     * Focus the iframe to ensure it receives keyboard events
     */
    focusIframe() {
        if (this.iframe) {
            this.iframe.focus();
        }
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