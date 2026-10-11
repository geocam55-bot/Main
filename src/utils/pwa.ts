export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;

export function isInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    Boolean((window.navigator as any).standalone) ||
    document.referrer.includes('android-app://')
  );
}

export function isIOS(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

export function isAndroid(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  return /android/i.test(navigator.userAgent);
}

export function getInstallInstructions(): string[] {
  if (isIOS()) {
    return [
      "Tap the Share button at the bottom of Safari",
      "Scroll down and tap 'Add to Home Screen'",
      "Tap 'Add' in the upper-right corner"
    ];
  }
  if (isAndroid()) {
    return [
      "Tap the menu button (three dots) in Chrome",
      "Tap 'Install app' or 'Add to Home Screen'",
      "Confirm installation"
    ];
  }
  return [
    "Look for the Install button in your browser address bar",
    "Click Install to add the app to your device"
  ];
}

export function listenForInstallPrompt(
  callback: (prompt: BeforeInstallPromptEvent) => void
): () => void {
  const handler = (e: Event) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    callback(deferredPrompt);
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('beforeinstallprompt', handler);
  }

  return () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('beforeinstallprompt', handler);
    }
  };
}

export async function showInstallPrompt(): Promise<'accepted' | 'dismissed'> {
  if (!deferredPrompt) {
    return 'dismissed';
  }
  try {
    await deferredPrompt.prompt();
    const choiceResult = await deferredPrompt.userChoice;
    deferredPrompt = null;
    return choiceResult.outcome;
  } catch (err) {
    console.error('Error showing install prompt:', err);
    return 'dismissed';
  }
}

export function isOnline(): boolean {
  if (typeof navigator === 'undefined') return true;
  return navigator.onLine;
}

export function listenForNetworkChanges(
  onOnline?: () => void,
  onOffline?: () => void
): () => void {
  const handleOnline = () => {
    onOnline?.();
  };
  const handleOffline = () => {
    onOffline?.();
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
  }

  return () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    }
  };
}

export async function registerServiceWorker(swUrl: string = '/sw.js'): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }
  try {
    const registration = await navigator.serviceWorker.register(swUrl);
    return registration;
  } catch (error) {
    console.error('Service worker registration failed:', error);
    return null;
  }
}

export async function unregisterServiceWorker(): Promise<boolean> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return false;
  }
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of registrations) {
      await registration.unregister();
    }
    return true;
  } catch (error) {
    console.error('Service worker unregistration failed:', error);
    return false;
  }
}
