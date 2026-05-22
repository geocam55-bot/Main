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
        className={`${
          online
            ? 'bg-green-50 border-green-200 animate-slide-down'
            : 'bg-yellow-50 border-yellow-200 animate-slide-down'
        }`}
      >
        {online ? (
          <Wifi className="h-4 w-4 text-green-600" />
        ) : (
          <WifiOff className="h-4 w-4 text-yellow-600" />
        )}
        <AlertDescription className={online ? 'text-green-800' : 'text-yellow-800'}>
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
