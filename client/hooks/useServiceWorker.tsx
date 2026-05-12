import { useEffect } from "react";

export function useServiceWorker() {
  useEffect(() => {
    // Register Service Worker only in production and when supported
    if ("serviceWorker" in navigator && import.meta.env.PROD) {
      // Register after initial page load to avoid blocking
      // Register after initial page load to avoid blocking
      const registerSW = () => {
        navigator.serviceWorker
          .register("/sw.js", {
            scope: "/",
            updateViaCache: "none", // Always check for updates
          })
          .then((registration) => {
            if (import.meta.env.DEV) {
              console.log("SW registered successfully:", registration.scope);
            }

            // Check for updates periodically
            registration.addEventListener("updatefound", () => {
              const newWorker = registration.installing;
              if (newWorker) {
                newWorker.addEventListener("statechange", () => {
                  if (
                    newWorker.state === "installed" &&
                    navigator.serviceWorker.controller
                  ) {
                    if (import.meta.env.DEV) {
                      console.log("New SW version available");
                    }
                    // Optionally notify user about update
                    if (confirm("New version available! Reload to update?")) {
                      newWorker.postMessage({ action: "skipWaiting" });
                      window.location.reload();
                    }
                  }
                });
              }
            });
          })
          .catch((error) => {
            if (import.meta.env.DEV) {
              console.warn("SW registration failed:", error);
            }
          });
      };

      if ("requestIdleCallback" in window) {
        (window as any).requestIdleCallback(registerSW);
      } else {
        window.addEventListener("load", registerSW);
      }

      // Listen for SW updates
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (import.meta.env.DEV) {
          console.log("SW controller changed");
        }
      });
    } else if (import.meta.env.DEV) {
      // In development, we usually want to make sure no service worker is active
      // to avoid stale cache issues, but we should do it silently without reloading
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (let registration of registrations) {
          registration.unregister().then(() => {
            console.log("🧹 Existing SW unregistered for dev mode");
          });
        }
      });
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
      console.log("PWA was installed");
      deferredPrompt = null;
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);
}
