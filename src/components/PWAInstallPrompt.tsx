import React, { useState, useEffect } from 'react';
import { X, Download, Smartphone, Monitor } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import {
  isInstalled,
  showInstallPrompt,
  listenForInstallPrompt,
  isIOS,
  isAndroid,
  getInstallInstructions,
  type BeforeInstallPromptEvent
} from '../utils/pwa';

export function PWAInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [installPromptAvailable, setInstallPromptAvailable] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Don't show in Figma preview/iframe environments
    const isFigmaPreview = window.location.hostname.includes('figma.site') || 
                          window.location !== window.parent.location;
    
    if (isFigmaPreview) {
      return;
    }

    // Don't show if already installed
    if (isInstalled()) {
      return;
    }

    // Check if user has dismissed the prompt before
    const dismissedTime = localStorage.getItem('pwa-install-dismissed');
    if (dismissedTime) {
      const daysSinceDismissed = (Date.now() - parseInt(dismissedTime)) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < 7) {
        // Don't show again for 7 days
        return;
      }
    }

    // Listen for the install prompt event
    listenForInstallPrompt((prompt: BeforeInstallPromptEvent) => {
      setInstallPromptAvailable(true);
      setShowPrompt(true);
    });

    // For iOS, show custom prompt after a delay
    if (isIOS()) {
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 5000); // Show after 5 seconds

      return () => clearTimeout(timer);
    }
  }, []);

  const handleInstall = async () => {
    if (installPromptAvailable) {
      // Use native install prompt (Android/Desktop)
      const result = await showInstallPrompt();
      
      if (result === 'accepted') {
        setShowPrompt(false);
        setDismissed(true);
      }
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setDismissed(true);
    
    // Remember dismissal for 7 days
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  if (!showPrompt || dismissed || isInstalled()) {
    return null;
  }

  const isIOSDevice = isIOS();
  const isAndroidDevice = isAndroid();
  const instructions = getInstallInstructions();

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96 animate-slide-up">
      <Card className="shadow-lg border-2 border-blue-500">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              {isIOSDevice || isAndroidDevice ? (
                <Smartphone className="h-6 w-6 text-blue-600" />
              ) : (
                <Monitor className="h-6 w-6 text-blue-600" />
              )}
              <CardTitle className="text-lg">Install ProSpaces CRM</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Install ProSpaces CRM on your {isIOSDevice ? 'iPhone' : isAndroidDevice ? 'Android device' : 'computer'} for:
          </p>
          
          <ul className="space-y-2 text-sm text-foreground">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">✓</span>
              <span>Quick access from your home screen</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">✓</span>
              <span>Works offline with cached data</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">✓</span>
              <span>Full-screen experience without browser UI</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">✓</span>
              <span>Push notifications for important updates</span>
            </li>
          </ul>

          {isIOSDevice ? (
            // iOS manual instructions
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
              <p className="text-sm font-medium text-blue-900">To install:</p>
              <ol className="space-y-1 text-xs text-blue-800 list-decimal list-inside">
                {instructions.map((instruction, index) => (
                  <li key={index}>{instruction}</li>
                ))}
              </ol>
            </div>
          ) : (
            // Android/Desktop install button
            <div className="flex gap-2">
              <Button
                onClick={handleInstall}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                disabled={!installPromptAvailable}
              >
                <Download className="h-4 w-4 mr-2" />
                Install Now
              </Button>
              <Button
                onClick={handleDismiss}
                variant="outline"
              >
                Later
              </Button>
            </div>
          )}

          {isIOSDevice && (
            <Button
              onClick={handleDismiss}
              variant="outline"
              className="w-full"
            >
              Got it!
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}