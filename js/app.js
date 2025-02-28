/**
 * app.js - Main application logic for Code Server PWA
 * 
 * This file handles the main application functionality including:
 * - Loading states and indicators
 * - Error handling for iframe loading
 * - Connection status monitoring
 * - Service worker registration
 */

class CodeServerApp {
    constructor(options = {}) {
        // Default configuration
        this.config = {
            iframeId: options.iframeId || 'codeServer',
            loadingOverlayId: options.loadingOverlayId || 'loading-overlay',
            errorOverlayId: options.errorOverlayId || 'error-overlay',
            statusIndicatorId: options.statusIndicatorId || 'status-indicator',
            codeServerUrl: options.codeServerUrl || this.getEnvVar('CODE_SERVER_URL', 'https://default-code-server-url'),
            loadTimeout: options.loadTimeout || 30000, // 30 seconds
            retryDelay: options.retryDelay || 5000,    // 5 seconds
            maxRetries: options.maxRetries || 3,
            ...options
        };

        // State
        this.iframe = null;
        this.loadingOverlay = null;
        this.errorOverlay = null;
        this.statusIndicator = null;
        this.loadingTimeout = null;
        this.retryCount = 0;
        this.connectionStatus = 'disconnected'; // 'connected', 'connecting', 'disconnected', 'error'
        this.initialized = false;
    }

    /**
     * Initialize the application
     */
    init() {
        if (this.initialized) return;
        
        this.createAppDOM();
        this.setupIframe();
        this.registerServiceWorker();
        this.attachEventListeners();
        
        this.initialized = true;
        console.log('Code Server App initialized');
    }

    /**
     * Create application DOM elements
     */
    createAppDOM() {
        // Get or create iframe
        this.iframe = document.getElementById(this.config.iframeId);
        if (!this.iframe) {
            this.iframe = document.createElement('iframe');
            this.iframe.id = this.config.iframeId;
            document.body.appendChild(this.iframe);
        }

        // Create loading overlay
        this.loadingOverlay = document.getElementById(this.config.loadingOverlayId);
        if (!this.loadingOverlay) {
            this.loadingOverlay = document.createElement('div');
            this.loadingOverlay.id = this.config.loadingOverlayId;
            this.loadingOverlay.className = 'loading-overlay';
            
            const spinner = document.createElement('div');
            spinner.className = 'spinner';
            
            const message = document.createElement('div');
            message.className = 'loading-message';
            message.textContent = 'Loading Code Server...';
            
            this.loadingOverlay.appendChild(spinner);
            this.loadingOverlay.appendChild(message);
            document.body.appendChild(this.loadingOverlay);
        }

        // Create error overlay
        this.errorOverlay = document.getElementById(this.config.errorOverlayId);
        if (!this.errorOverlay) {
            this.errorOverlay = document.createElement('div');
            this.errorOverlay.id = this.config.errorOverlayId;
            this.errorOverlay.className = 'error-overlay';
            
            const errorIcon = document.createElement('div');
            errorIcon.className = 'error-icon';
            errorIcon.innerHTML = '⚠️';
            
            const errorMessage = document.createElement('div');
            errorMessage.className = 'error-message';
            errorMessage.textContent = 'Failed to load Code Server';
            
            const retryButton = document.createElement('button');
            retryButton.className = 'retry-button';
            retryButton.textContent = 'Retry';
            retryButton.addEventListener('click', () => this.retryLoading());
            
            this.errorOverlay.appendChild(errorIcon);
            this.errorOverlay.appendChild(errorMessage);
            this.errorOverlay.appendChild(retryButton);
            document.body.appendChild(this.errorOverlay);
        }

        // Create status indicator
        this.statusIndicator = document.getElementById(this.config.statusIndicatorId);
        if (!this.statusIndicator) {
            this.statusIndicator = document.createElement('div');
            this.statusIndicator.id = this.config.statusIndicatorId;
            this.statusIndicator.className = 'status-indicator';
            document.body.appendChild(this.statusIndicator);
        }

        // Hide overlays initially
        this.errorOverlay.style.display = 'none';
        this.updateConnectionStatus('disconnected');
    }

    /**
     * Setup iframe and start loading
     */
    setupIframe() {
        // Show loading overlay
        this.loadingOverlay.style.display = 'flex';
        this.errorOverlay.style.display = 'none';
        this.updateConnectionStatus('connecting');
        
        // Set iframe source
        this.iframe.src = this.config.codeServerUrl;
        
        // Set loading timeout
        this.loadingTimeout = setTimeout(() => {
            this.handleLoadError('Timeout loading Code Server');
        }, this.config.loadTimeout);
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Iframe load event
        this.iframe.addEventListener('load', () => this.handleIframeLoad());
        
        // Iframe error event
        this.iframe.addEventListener('error', (e) => this.handleLoadError('Error loading Code Server', e));
        
        // Window online/offline events
        window.addEventListener('online', () => this.handleOnlineStatus(true));
        window.addEventListener('offline', () => this.handleOnlineStatus(false));
        
        // Check connection periodically
        setInterval(() => this.checkConnection(), 30000); // Check every 30 seconds
    }

    /**
     * Handle iframe load event
     */
    handleIframeLoad() {
        // Clear loading timeout
        if (this.loadingTimeout) {
            clearTimeout(this.loadingTimeout);
            this.loadingTimeout = null;
        }
        
        // Hide loading overlay
        this.loadingOverlay.style.display = 'none';
        this.errorOverlay.style.display = 'none';
        this.updateConnectionStatus('connected');
        
        // Reset retry count
        this.retryCount = 0;
        
        console.log('Code Server loaded successfully');
    }

    /**
     * Handle load error
     */
    handleLoadError(message, error = null) {
        // Clear loading timeout
        if (this.loadingTimeout) {
            clearTimeout(this.loadingTimeout);
            this.loadingTimeout = null;
        }
        
        if (error) {
            console.error('Code Server load error:', error);
        }
        
        // Update error message
        const errorMessage = this.errorOverlay.querySelector('.error-message');
        if (errorMessage) {
            errorMessage.textContent = message;
        }
        
        // Show error overlay
        this.loadingOverlay.style.display = 'none';
        this.errorOverlay.style.display = 'flex';
        this.updateConnectionStatus('error');
        
        // Auto-retry if under max retries
        if (this.retryCount < this.config.maxRetries) {
            const retryButton = this.errorOverlay.querySelector('.retry-button');
            if (retryButton) {
                retryButton.textContent = `Retrying in ${this.config.retryDelay / 1000} seconds...`;
                retryButton.disabled = true;
            }
            
            setTimeout(() => {
                this.retryLoading();
            }, this.config.retryDelay);
        }
    }

    /**
     * Retry loading the iframe
     */
    retryLoading() {
        this.retryCount++;
        
        const retryButton = this.errorOverlay.querySelector('.retry-button');
        if (retryButton) {
            retryButton.textContent = 'Retry';
            retryButton.disabled = false;
        }
        
        console.log(`Retrying Code Server load (attempt ${this.retryCount})`);
        this.setupIframe();
    }

    /**
     * Handle online/offline status changes
     */
    handleOnlineStatus(isOnline) {
        if (isOnline) {
            console.log('Browser is online, checking connection...');
            this.checkConnection();
        } else {
            console.log('Browser is offline');
            this.updateConnectionStatus('disconnected');
            
            // Show error if currently loading
            if (this.loadingOverlay.style.display === 'flex') {
                this.handleLoadError('Network connection lost');
            }
        }
    }

    /**
     * Check connection to Code Server
     */
    checkConnection() {
        // Only check if we're not already connecting or showing an error
        if (this.connectionStatus === 'connecting' || this.connectionStatus === 'error') {
            return;
        }
        
        // If we're offline, don't try to check
        if (!navigator.onLine) {
            this.updateConnectionStatus('disconnected');
            return;
        }
        
        // Simple ping to check if the server is reachable
        fetch(this.config.codeServerUrl, { method: 'HEAD', mode: 'no-cors', cache: 'no-store' })
            .then(() => {
                // If we get any response, consider it connected
                if (this.connectionStatus !== 'connected') {
                    this.updateConnectionStatus('connected');
                }
            })
            .catch(() => {
                // If we can't reach the server, consider it disconnected
                if (this.connectionStatus !== 'disconnected') {
                    this.updateConnectionStatus('disconnected');
                }
            });
    }

    /**
     * Update connection status indicator
     */
    updateConnectionStatus(status) {
        this.connectionStatus = status;
        
        // Update status indicator
        if (this.statusIndicator) {
            this.statusIndicator.className = `status-indicator ${status}`;
            
            let statusText = '';
            switch (status) {
                case 'connected':
                    statusText = 'Connected';
                    break;
                case 'connecting':
                    statusText = 'Connecting...';
                    break;
                case 'disconnected':
                    statusText = 'Disconnected';
                    break;
                case 'error':
                    statusText = 'Connection Error';
                    break;
            }
            
            this.statusIndicator.setAttribute('title', statusText);
        }
    }

    /**
     * Register service worker
     */
    registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/service-worker.js')
                    .then(registration => {
                        console.log('Service Worker registered with scope:', registration.scope);
                    })
                    .catch(error => {
                        console.error('Service Worker registration failed:', error);
                    });
            });
        } else {
            console.warn('Service Workers are not supported in this browser');
        }
    }

    /**
     * Get environment variable with fallback
     */
    getEnvVar(name, defaultValue) {
        return window?.ENV?.[name] || defaultValue;
    }
}

// Create and export app instance
const codeServerApp = new CodeServerApp();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    codeServerApp.init();
});

// Export for use in other modules
window.codeServerApp = codeServerApp;