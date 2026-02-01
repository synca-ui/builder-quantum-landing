import { useEffect, useCallback } from 'react';

// Critical resource preloader
export function useResourcePreloader() {
  const preloadCriticalResources = useCallback(() => {
    // Preload critical routes
    const criticalRoutes = [
      '/configurator',
      '/auto-configurator',
      '/mode-selection'
    ];

    criticalRoutes.forEach(route => {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = route;
      document.head.appendChild(link);
    });

    // Preload critical API endpoints
    if ('fetch' in window) {
      // Prefetch API endpoints that are commonly used
      fetch('/api/templates', { method: 'HEAD' }).catch(() => {});
      fetch('/api/business-types', { method: 'HEAD' }).catch(() => {});
    }
  }, []);

  useEffect(() => {
    // Preload resources after initial page load
    const timer = setTimeout(preloadCriticalResources, 2000);
    return () => clearTimeout(timer);
  }, [preloadCriticalResources]);
}

// Lazy load non-critical CSS
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
        const elements = document.querySelectorAll('.non-critical');
        elements.forEach(el => el.classList.add('loaded'));
      };
      document.head.appendChild(link);
    };

    // Load non-critical CSS after critical path
    const timer = setTimeout(() => {
      loadCSS('/src/components.css');
      loadCSS('/src/animations.css');
    }, 300);

    return () => clearTimeout(timer);
  }, []);
}

// Performance observer for monitoring
export function usePerformanceObserver() {
  useEffect(() => {
    if (!('PerformanceObserver' in window)) return;

    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        // Log slow operations in development
        if (process.env.NODE_ENV === 'development' && entry.duration > 100) {
          console.warn(`Slow operation detected: ${entry.name} took ${entry.duration}ms`);
        }

        // Track LCP improvements
        if (entry.entryType === 'largest-contentful-paint') {
          console.log(`LCP: ${entry.startTime}ms`);
        }
      });
    });

    try {
      observer.observe({ entryTypes: ['measure', 'largest-contentful-paint'] });
    } catch (e) {
      console.warn('Performance observer not supported for these entry types');
    }

    return () => observer.disconnect();
  }, []);
}

// Image lazy loading optimization
export function useImageOptimization() {
  useEffect(() => {
    if (!('IntersectionObserver' in window)) return;

    const imageObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement;
          if (img.dataset.src) {
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
            imageObserver.unobserve(img);
          }
        }
      });
    }, {
      rootMargin: '50px 0px', // Start loading 50px before image enters viewport
      threshold: 0.1
    });

    // Observe all images with data-src attribute
    const lazyImages = document.querySelectorAll('img[data-src]');
    lazyImages.forEach(img => imageObserver.observe(img));

    return () => imageObserver.disconnect();
  }, []);
}
