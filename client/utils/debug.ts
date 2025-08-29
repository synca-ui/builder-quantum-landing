// Debug utilities for API connectivity issues

export interface DebugInfo {
  timestamp: string;
  userAgent: string;
  url: string;
  origin: string;
  protocol: string;
  host: string;
  port: string;
  pathname: string;
  apiBaseUrl: string;
  localStorageAvailable: boolean;
  cookiesEnabled: boolean;
  onlineStatus: boolean;
}

export function getDebugInfo(): DebugInfo {
  const location = window.location;
  
  return {
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: location.href,
    origin: location.origin,
    protocol: location.protocol,
    host: location.host,
    port: location.port,
    pathname: location.pathname,
    apiBaseUrl: `${location.origin}/api`,
    localStorageAvailable: isLocalStorageAvailable(),
    cookiesEnabled: navigator.cookieEnabled,
    onlineStatus: navigator.onLine,
  };
}

function isLocalStorageAvailable(): boolean {
  try {
    const test = '__localStorage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

export async function testApiConnectivity(): Promise<{
  pingSuccess: boolean;
  responseTime: number;
  error?: string;
  statusCode?: number;
}> {
  const startTime = Date.now();
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch('/api/ping', {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;
    
    if (response.ok) {
      return {
        pingSuccess: true,
        responseTime,
        statusCode: response.status,
      };
    } else {
      return {
        pingSuccess: false,
        responseTime,
        statusCode: response.status,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    if (error instanceof Error) {
      return {
        pingSuccess: false,
        responseTime,
        error: error.message,
      };
    }
    
    return {
      pingSuccess: false,
      responseTime,
      error: 'Unknown error',
    };
  }
}

export function logDebugInfo(context: string = 'General') {
  if (process.env.NODE_ENV === 'development') {
    const debugInfo = getDebugInfo();
    console.group(`🔍 Debug Info - ${context}`);
    console.table(debugInfo);
    console.groupEnd();
  }
}

export async function diagnoseApiIssue(): Promise<void> {
  if (process.env.NODE_ENV === 'development') {
    console.group('🚨 API Connectivity Diagnosis');
    
    // Basic environment info
    const debugInfo = getDebugInfo();
    console.log('Environment Info:', debugInfo);
    
    // Test API connectivity
    console.log('Testing API connectivity...');
    const connectivityTest = await testApiConnectivity();
    console.log('API Test Result:', connectivityTest);
    
    // Check localStorage
    if (!debugInfo.localStorageAvailable) {
      console.warn('⚠️ localStorage is not available - this may cause issues with offline functionality');
    }
    
    // Check online status
    if (!debugInfo.onlineStatus) {
      console.warn('⚠️ Browser reports offline status');
    }
    
    // Provide recommendations
    console.group('💡 Recommendations');
    if (!connectivityTest.pingSuccess) {
      console.log('1. Check if the development server is running');
      console.log('2. Verify the API endpoint is accessible at:', debugInfo.apiBaseUrl);
      console.log('3. Check for CORS issues in the browser network tab');
      console.log('4. Ensure no firewall or proxy is blocking the connection');
    }
    
    if (connectivityTest.responseTime > 5000) {
      console.log('5. API response time is slow - check server performance');
    }
    
    console.groupEnd();
    console.groupEnd();
  }
}

// Call this automatically when there's a fetch error
export function handleFetchError(error: Error, context?: string) {
  if (error.message.includes('Failed to fetch')) {
    console.warn(`Network error in ${context || 'unknown context'}:`, error.message);
    
    // Run diagnosis in development
    if (process.env.NODE_ENV === 'development') {
      setTimeout(diagnoseApiIssue, 100);
    }
  }
}
