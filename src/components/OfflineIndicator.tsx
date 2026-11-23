import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';
import { isOnline, listenForNetworkChanges } from '../utils/pwa';

export function OfflineIndicator() {
  const [online, setOnline] = useState(isOnline());
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    const cleanup = listenForNetworkChanges(
      () => {
        setOnline(true);
        setShowReconnected(true);
        
        // Hide "reconnected" message after 3 seconds
        setTimeout(() => {
          setShowReconnected(false);
        }, 3000);
      },
      () => {
        setOnline(false);
        setShowReconnected(false);
      }
    );

    return cleanup;
  }, []);

  if (online && !showReconnected) {
    return null;
  }

  return (
    <div className="fixed top-16 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md px-4">
      <Alert
        className={`backdrop-blur-md shadow-xl ${
          online
            ? 'bg-emerald-950/90 border-emerald-500/40 animate-slide-down'
            : 'bg-amber-950/90 border-amber-500/40 animate-slide-down'
        }`}
      >
        {online ? (
          <Wifi className="h-4 w-4 text-emerald-400" />
        ) : (
          <WifiOff className="h-4 w-4 text-amber-400" />
        )}
        <AlertDescription className={online ? 'text-emerald-200' : 'text-amber-200'}>
          {online ? (
            <span className="font-medium">Back online! Data will sync automatically.</span>
          ) : (
            <span className="font-medium">You're offline. Some features may be limited.</span>
          )}
        </AlertDescription>
      </Alert>
    </div>
  );
}
