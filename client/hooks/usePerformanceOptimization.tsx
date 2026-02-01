import { useEffect, useCallback } from 'react';

// Critical resource preloader - only for essential resources
export function useResourcePreloader() {
  const preloadCriticalResources = useCallback(() => {
    // Only preload truly critical routes, not all routes
    const criticalRoutes = ['/configurator']; // Reduced list

    // Use requestIdleCallback if available
    const preloadWhenIdle = () => {
      criticalRoutes.forEach(route => {
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = route;
        link.as = 'document';
        document.head.appendChild(link);
      });

      // Preload critical API endpoints only when needed
      if (window.location.pathname.includes('/configurator')) {
        fetch('/api/templates', { method: 'HEAD' }).catch(() => {});
      }
    };

    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(preloadWhenIdle, { timeout: 2000 });
    } else {
      setTimeout(preloadWhenIdle, 3000); // Delayed to not interfere with LCP
    }
  }, []);

  useEffect(() => {
    // Delay preloading to avoid impacting LCP
    const timer = setTimeout(preloadCriticalResources, 5000); // Increased delay
    return () => clearTimeout(timer);
  }, [preloadCriticalResources]);
}

// Lazy load non-critical CSS - optimized for LCP
export function useLazyCSS() {
  useEffect(() => {
    const loadCSS = (href: string) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.media = 'print';
      link.onload = () => {
        link.media = 'all';
        // Mark non-critical content as loaded
        document.documentElement.classList.add('css-loaded');
      };
      document.head.appendChild(link);
    };

    // Only load non-critical CSS after LCP
    const timer = setTimeout(() => {
      // Check if additional CSS is actually needed
      if (!document.querySelector('link[href*="components.css"]')) {
        loadCSS('/src/components.css');
      }
      if (!document.querySelector('link[href*="animations.css"]')) {
        loadCSS('/src/animations.css');
      }
    }, 1000); // Reduced delay for better UX

    return () => clearTimeout(timer);
  }, []);
}

// Performance observer for monitoring - with LCP focus
export function usePerformanceObserver() {
  useEffect(() => {
    if (!('PerformanceObserver' in window)) return;

    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        // Track LCP specifically for regression analysis
        if (entry.entryType === 'largest-contentful-paint') {
          console.log(`🎯 LCP: ${entry.startTime}ms`);
          if (entry.startTime > 4000) {
            console.warn('⚠️ LCP is slow:', entry);
          }
        }

        // Log slow operations only in development
        if (import.meta.env.DEV && entry.duration && entry.duration > 100) {
          console.warn(`Slow operation: ${entry.name} took ${entry.duration}ms`);
        }
      });
    });

    try {
      observer.observe({
        entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift']
      });
    } catch (e) {
      console.warn('Performance observer not fully supported');
    }

    return () => observer.disconnect();
  }, []);
}

// Image lazy loading optimization - enhanced for LCP
export function useImageOptimization() {
  useEffect(() => {
    if (!('IntersectionObserver' in window)) return;

    const imageObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement;
          if (img.dataset.src) {
            // Prioritize above-the-fold images
            const isAboveFold = entry.intersectionRatio > 0.1;
            if (isAboveFold) {
              img.loading = 'eager';
            }

            img.src = img.dataset.src;
            img.removeAttribute('data-src');
            imageObserver.unobserve(img);
          }
        }
      });
    }, {
      rootMargin: '20px 0px', // Reduced margin for better performance
      threshold: [0.1, 0.5] // Multiple thresholds for better detection
    });

    // Observe all lazy images
    const lazyImages = document.querySelectorAll('img[data-src]');
    lazyImages.forEach(img => imageObserver.observe(img));

    return () => imageObserver.disconnect();
  }, []);
}
