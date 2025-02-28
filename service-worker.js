/**
 * Service Worker for Code Server PWA
 * 
 * This service worker provides offline capabilities and caching for the PWA.
 */

// Cache name with version
const CACHE_NAME = 'code-server-pwa-v1';

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/js/app.js',
  '/js/keyboard.js',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/favicon.ico'
];

// Install event - cache static assets
self.addEventListener('install', event => {
  console.log('[Service Worker] Installing');
  
  // Skip waiting to ensure the new service worker activates immediately
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .catch(error => {
        console.error('[Service Worker] Cache install error:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activating');
  
  // Claim clients to ensure the service worker controls all pages immediately
  event.waitUntil(self.clients.claim());
  
  // Clean up old caches
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
              console.log('[Service Worker] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
  );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', event => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }
  
  // Skip requests to the Code Server iframe content
  if (event.request.url.includes('your-code-server-url')) {
    return;
  }
  
  // Handle static asset requests with cache-first strategy
  if (isStaticAsset(event.request.url)) {
    event.respondWith(
      caches.match(event.request)
        .then(cachedResponse => {
          if (cachedResponse) {
            return cachedResponse;
          }
          
          // If not in cache, fetch from network and cache
          return fetch(event.request)
            .then(response => {
              // Clone the response as it can only be consumed once
              const responseToCache = response.clone();
              
              caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(event.request, responseToCache);
                });
              
              return response;
            })
            .catch(error => {
              console.error('[Service Worker] Fetch error:', error);
              return caches.match('/offline.html');
            });
        })
    );
  } else {
    // For non-static assets, use network-first strategy
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return caches.match(event.request)
            .then(cachedResponse => {
              if (cachedResponse) {
                return cachedResponse;
              }
              
              // If the request is for an HTML page, show offline page
              if (event.request.headers.get('accept').includes('text/html')) {
                return caches.match('/offline.html');
              }
              
              // For other resources, return a simple error response
              return new Response('Network error', {
                status: 408,
                headers: { 'Content-Type': 'text/plain' }
              });
            });
        })
    );
  }
});

// Check if URL is for a static asset
function isStaticAsset(url) {
  const parsedUrl = new URL(url);
  const path = parsedUrl.pathname;
  
  // Check if the path matches any of our static assets
  return STATIC_ASSETS.some(asset => {
    return path === asset || path.endsWith('.css') || path.endsWith('.js') || path.endsWith('.png') || path.endsWith('.ico');
  });
}

// Create a simple offline page if it doesn't exist
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        // Create a simple offline page if it doesn't exist
        return cache.match('/offline.html')
          .then(response => {
            if (!response) {
              const offlineHtml = `
                <!DOCTYPE html>
                <html lang="en">
                <head>
                  <meta charset="UTF-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                  <title>Offline - Code Server PWA</title>
                  <style>
                    body {
                      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
                      display: flex;
                      flex-direction: column;
                      align-items: center;
                      justify-content: center;
                      height: 100vh;
                      margin: 0;
                      padding: 20px;
                      text-align: center;
                      background-color: #1e1e1e;
                      color: #ffffff;
                    }
                    .offline-icon {
                      font-size: 64px;
                      margin-bottom: 20px;
                    }
                    h1 {
                      margin-bottom: 10px;
                    }
                    p {
                      margin-bottom: 20px;
                      opacity: 0.8;
                    }
                    button {
                      background-color: #0078d4;
                      color: white;
                      border: none;
                      padding: 10px 20px;
                      border-radius: 4px;
                      cursor: pointer;
                      font-size: 16px;
                    }
                    button:hover {
                      background-color: #106ebe;
                    }
                  </style>
                </head>
                <body>
                  <div class="offline-icon">📡</div>
                  <h1>You're Offline</h1>
                  <p>The Code Server PWA requires an internet connection to function properly.</p>
                  <button onclick="window.location.reload()">Try Again</button>
                </body>
                </html>
              `;
              
              return cache.put(
                new Request('/offline.html'),
                new Response(offlineHtml, {
                  headers: { 'Content-Type': 'text/html' }
                })
              );
            }
          });
      })
  );
});

// Listen for messages from the client
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});