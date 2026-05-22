export interface NotificationOptions {
  body?: string;
  icon?: string;
  badge?: string;
  tag?: string;
  requireInteraction?: boolean;
  data?: any;
}

const NOTIFICATION_SOUND_URL = '/sounds/new-message.wav';

/**
 * Requests notification permission from the user if not already granted.
 * @returns A promise that resolves to the current permission state.
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission;
  }

  return 'denied';
}

/**
 * Sends a system-level desktop or mobile notification if permission is granted.
 * Automatically requests permission if it hasn't been requested yet.
 * 
 * @param title The title of the notification
 * @param options Additional options like body, icon, etc.
 * @returns A promise that resolves to a boolean indicating whether the notification was sent.
 */
export async function sendSystemNotification(
  title: string, 
  options?: NotificationOptions
): Promise<boolean> {
  if (!('Notification' in window)) {
    return false;
  }

  let permission = Notification.permission;
  if (permission === 'default') {
    permission = await requestNotificationPermission();
  }

  if (permission === 'granted') {
    try {
      // 1. Try to use Service Worker to show notification (REQUIRED for iOS)
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration && 'showNotification' in registration) {
          await registration.showNotification(title, {
            icon: '/favicon.ico',
            ...options,
          });
          return true;
        }
      }

      // 2. Fallback to standard Notification constructor (Desktop / Android Chrome)
      const notification = new Notification(title, {
        icon: '/favicon.ico', // Default icon, can be overridden via options
        ...options,
      });

      // Optional: close after a few seconds if requireInteraction is not set
      if (!options?.requireInteraction) {
        setTimeout(() => notification.close(), 5000);
      }

      // Optional: focus the window when clicked
      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      return true;
    } catch (error) {
      // Note: Do not use frontend console.* statements as per architecture rules
      return false;
    }
  }

  return false;
}

/**
 * Plays the bundled notification chime for message alerts.
 * This is best-effort and silently fails when the browser blocks playback.
 */
export async function playNotificationSound(src: string = NOTIFICATION_SOUND_URL): Promise<boolean> {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    const audio = new Audio(src);
    audio.volume = 0.35;
    audio.preload = 'auto';
    await audio.play();
    return true;
  } catch {
    return false;
  }
}
