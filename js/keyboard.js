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
            }
            
            // Use postMessage to communicate with the iframe
            if (this.iframe && this.iframe.contentWindow) {
                try {
                    const message = {
                        type: 'keyEvent',
                        eventType: 'keydown',
                        key: key,
                        activeKeys: Array.from(this.activeKeys)
                    };
                    
                    this.iframe.contentWindow.postMessage(message, '*');
                } catch (e) {
                    console.error('postMessage error:', e);
                }
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
            // Use postMessage to communicate with the iframe
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
            }
            
            // Use postMessage to communicate with the iframe
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
                        const upMessage = {
                            type: 'keyEvent',
                            eventType: 'keyup',
                            key: key,
                            modifiers: modifiers,
                            activeKeys: Array.from(this.activeKeys)
                        };
                        
                        this.iframe.contentWindow.postMessage(upMessage, '*');
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
