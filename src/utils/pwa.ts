/**
 * PWA (Progressive Web App) utilities for ProSpaces CRM
 * Handles service worker registration, installation prompts, and offline detection
 */

/**
 * Register the service worker
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  // Don't even try in non-HTTPS or preview environments unless localhost
  const isHTTPS = window.location.protocol === 'https:';
  const isLocalhost = window.location.hostname === 'localhost' || 
                      window.location.hostname === '127.0.0.1';
  // Only block if we are actually running inside an iframe (like the Figma Make canvas)
  // We want to allow service workers on the actual published site
  const isIframe = window.location !== window.parent.location;
  
  // Service workers only work on HTTPS or localhost, and not in iframes
  if (!isHTTPS && !isLocalhost) {
    return null;
  }
  
  if (isIframe) {
    return null;
  }

  if (!('serviceWorker' in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/service-worker.js', {
      scope: '/',
      updateViaCache: 'none',
    });

    await registration.update();

    // Service Worker registered

    // Check for updates periodically
    setInterval(() => {
      registration.update();
    }, 60 * 60 * 1000); // Check every hour

    // Handle updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          // New service worker available - new version ready
          
          // Notify user about update
          if (confirm('A new version of ProSpaces CRM is available. Reload to update?')) {
            newWorker.postMessage({ type: 'SKIP_WAITING' });
            const reloadOnce = () => {
              window.location.reload();
            };
            navigator.serviceWorker.addEventListener('controllerchange', reloadOnce, { once: true });
          }
        }
      });
    });

    return registration;
  } catch (error) {
    // Silently handle registration errors - PWA features are optional
    return null;
  }
}

/**
 * Unregister all service workers (for debugging)
 */
export async function unregisterServiceWorker(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;

  const registrations = await navigator.serviceWorker.getRegistrations();
  for (const registration of registrations) {
    await registration.unregister();
  }
  // All service workers unregistered
}

/**
 * Online/Offline Detection
 */

/**
 * Check if the browser is currently online
 */
export function isOnline(): boolean {
  return navigator.onLine;
}

/**
 * Listen for network status changes
 */
export function listenForNetworkChanges(
  onOnline: () => void,
  onOffline: () => void
): () => void {
  const handleOnline = () => onOnline();
  const handleOffline = () => onOffline();

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Return cleanup function
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}

/**
 * PWA Installation
 */

let deferredPrompt: any = null;

/**
 * Listen for the beforeinstallprompt event
 */
export function listenForInstallPrompt(
  onPromptAvailable: () => void
): () => void {
  const handleBeforeInstallPrompt = (e: Event) => {
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();
    // Stash the event so it can be triggered later
    deferredPrompt = e;
    // Notify that install prompt is available
    onPromptAvailable();
  };

  window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

  // Return cleanup function
  return () => {
    window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  };
}

/**
 * Check if the app is already installed
 */
export function isInstalled(): boolean {
  // Check if running in standalone mode (installed PWA)
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  const isIOSStandalone = (window.navigator as any).standalone === true;
  
  return isStandalone || isIOSStandalone;
}

/**
 * Check if the device is iOS
 */
export function isIOS(): boolean {
  const userAgent = window.navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(userAgent);
}

/**
 * Check if the device is Android
 */
export function isAndroid(): boolean {
  const userAgent = window.navigator.userAgent.toLowerCase();
  return /android/.test(userAgent);
}

/**
 * Get installation instructions based on platform
 */
export function getInstallInstructions(): string {
  if (isIOS()) {
    return 'Tap the Share button and then "Add to Home Screen"';
  } else if (isAndroid()) {
    return 'Tap the menu button and then "Install app" or "Add to Home screen"';
  } else {
    return 'Click the install button in your browser\'s address bar';
  }
}

/**
 * Show the install prompt
 */
export async function showInstallPrompt(): Promise<boolean> {
  if (!deferredPrompt) {
    // Install prompt not available
    return false;
  }

  // Show the install prompt
  deferredPrompt.prompt();

  // Wait for the user to respond to the prompt
  const { outcome } = await deferredPrompt.userChoice;
  
  // User responded to install prompt

  // Clear the deferredPrompt
  deferredPrompt = null;

  return outcome === 'accepted';
}

/**
 * Cache Management
 */

/**
 * Get the current cache size
 */
export async function getCacheSize(): Promise<number> {
  if (!('caches' in window)) return 0;

  const cacheNames = await caches.keys();
  let totalSize = 0;

  for (const name of cacheNames) {
    const cache = await caches.open(name);
    const requests = await cache.keys();
    
    for (const request of requests) {
      const response = await cache.match(request);
      if (response) {
        const blob = await response.blob();
        totalSize += blob.size;
      }
    }
  }

  return totalSize;
}

/**
 * Clear all caches
 */
export async function clearAllCaches(): Promise<void> {
  if (!('caches' in window)) return;

  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames.map(name => caches.delete(name))
  );
  
  // All caches cleared
}

/**
 * Check current cache version
 */
export async function getCurrentCacheVersion(): Promise<string | null> {
  if (!('caches' in window)) return null;

  const cacheNames = await caches.keys();
  const prospacesCaches = cacheNames.filter(name => name.startsWith('prospaces-'));
  
  if (prospacesCaches.length === 0) return null;
  
  // Return the latest cache version
  return prospacesCaches.sort().pop() || null;
}

/**
 * Feature Detection
 */

/**
 * Check if PWA features are supported
 */
export function checkPWASupport(): {
  serviceWorker: boolean;
  manifest: boolean;
  notifications: boolean;
  storage: boolean;
} {
  return {
    serviceWorker: 'serviceWorker' in navigator,
    manifest: 'manifest' in document.createElement('link'),
    notifications: 'Notification' in window,
    storage: 'storage' in navigator && 'estimate' in navigator.storage,
  };
}

/**
 * Get storage quota information
 */
export async function getStorageQuota(): Promise<{
  usage: number;
  quota: number;
  percentage: number;
} | null> {
  if (!('storage' in navigator) || !('estimate' in navigator.storage)) {
    return null;
  }

  const estimate = await navigator.storage.estimate();
  const usage = estimate.usage || 0;
  const quota = estimate.quota || 0;
  const percentage = quota > 0 ? (usage / quota) * 100 : 0;

  return { usage, quota, percentage };
}

/**
 * Notifications
 */

/**
 * Request notification permission
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    return 'denied';
  }

  return await Notification.requestPermission();
}

/**
 * Show a notification
 */
export async function showNotification(
  title: string,
  options?: NotificationOptions
): Promise<void> {
  if (!('Notification' in window)) {
    // Notifications not supported
    return;
  }

  if (Notification.permission !== 'granted') {
    // Notification permission denied
    return;
  }

  const registration = await navigator.serviceWorker.ready;
  await registration.showNotification(title, {
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    vibrate: [200, 100, 200],
    ...options,
  });
}

/**
 * Background Sync
 */

/**
 * Register a background sync
 */
export async function registerBackgroundSync(tag: string): Promise<void> {
  if (!('serviceWorker' in navigator) || !('sync' in ServiceWorkerRegistration.prototype)) {
    // Background sync not supported
    return;
  }

  const registration = await navigator.serviceWorker.ready;
  await (registration as any).sync.register(tag);
  // Background sync registered
}

/**
 * Utility: Convert bytes to human-readable format
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}
