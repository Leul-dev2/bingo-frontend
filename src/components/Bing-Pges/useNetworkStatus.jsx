// src/hooks/useNetworkStatus.js

import { useState, useEffect } from 'react';

const getOnlineStatus = () => {
  // Use a fallback for server-side rendering
  if (typeof window === 'undefined' || typeof navigator.onLine === 'undefined') {
    return true; // Assume online if not in a browser environment
  }
  return navigator.onLine;
};

export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(getOnlineStatus());

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Cleanup listeners when the component unmounts
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
};