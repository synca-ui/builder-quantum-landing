import { useEffect } from 'react';

export function useServiceWorker() {
  useEffect(() => {
    // Register Service Worker only in production and when supported
    if ('serviceWorker' in navigator && import.meta.env.PROD) {
      // Register after initial page load to avoid blocking
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          updateViaCache: 'none' // Always check for updates
        })
          .then((registration) => {
            console.log('SW registered successfully:', registration.scope);

            // Check for updates periodically
            registration.addEventListener('updatefound', () => {
              const newWorker = registration.installing;
              if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                  if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    console.log('New SW version available');
                    // Optionally notify user about update
                    if (confirm('New version available! Reload to update?')) {
                      newWorker.postMessage({ action: 'skipWaiting' });
                      window.location.reload();
                    }
                  }
                });
              }
            });
          })
          .catch((error) => {
            console.warn('SW registration failed:', error);
          });
      });

      // Listen for SW updates
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('SW controller changed');
      });
    } else if (import.meta.env.DEV) {
      console.log('SW registration skipped in development');
    }
  }, []);
}

// Install prompt hook
export function useInstallPrompt() {
  useEffect(() => {
    let deferredPrompt: any;

    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      // Stash the event so it can be triggered later
      deferredPrompt = e;
    };

    const handleAppInstalled = () => {
      console.log('PWA was installed');
      deferredPrompt = null;
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);
}
