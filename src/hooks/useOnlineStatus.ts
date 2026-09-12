import { useEffect, useState } from 'react';
import { OfflineQueueService } from '../services/offlineQueue';

export function useOnlineStatus() {
  const [isPhysicalOnline, setIsPhysicalOnline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });

  const [isManualOffline, setIsManualOffline] = useState<boolean>(() => {
    return OfflineQueueService.isManualOffline();
  });

  useEffect(() => {
    const handleOnline = () => setIsPhysicalOnline(true);
    const handleOffline = () => setIsPhysicalOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const unsubscribe = OfflineQueueService.subscribe(() => {
      setIsManualOffline(OfflineQueueService.isManualOffline());
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribe();
    };
  }, []);

  const isEffectiveOnline = isPhysicalOnline && !isManualOffline;

  return isEffectiveOnline;
}

export function useFullConnectivity() {
  const [isPhysicalOnline, setIsPhysicalOnline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });

  const [isManualOffline, setIsManualOffline] = useState<boolean>(() => {
    return OfflineQueueService.isManualOffline();
  });

  useEffect(() => {
    const handleOnline = () => setIsPhysicalOnline(true);
    const handleOffline = () => setIsPhysicalOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const unsubscribe = OfflineQueueService.subscribe(() => {
      setIsManualOffline(OfflineQueueService.isManualOffline());
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribe();
    };
  }, []);

  const isEffectiveOnline = isPhysicalOnline && !isManualOffline;

  const toggleManualOffline = () => {
    OfflineQueueService.toggleManualOffline();
  };

  return {
    isOnline: isEffectiveOnline,
    isPhysicalOnline,
    isManualOffline,
    toggleManualOffline,
  };
}
