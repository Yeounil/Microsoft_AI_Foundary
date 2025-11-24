'use client';

import { useState, useEffect } from 'react';

interface NetworkStatus {
  isOnline: boolean;
  effectiveType: string | null; // 4g, 3g, 2g, slow-2g
  downlink: number | null; // Mbps
  rtt: number | null; // ms
  saveData: boolean;
}

export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>({
    isOnline: true,
    effectiveType: null,
    downlink: null,
    rtt: null,
    saveData: false,
  });

  useEffect(() => {
    const updateStatus = () => {
      const connection = (navigator as Navigator & {
        connection?: {
          effectiveType: string;
          downlink: number;
          rtt: number;
          saveData: boolean;
        };
      }).connection;

      setStatus({
        isOnline: navigator.onLine,
        effectiveType: connection?.effectiveType || null,
        downlink: connection?.downlink || null,
        rtt: connection?.rtt || null,
        saveData: connection?.saveData || false,
      });
    };

    updateStatus();

    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);

    const connection = (navigator as Navigator & {
      connection?: EventTarget;
    }).connection;

    if (connection) {
      connection.addEventListener('change', updateStatus);
    }

    return () => {
      window.removeEventListener('online', updateStatus);
      window.removeEventListener('offline', updateStatus);
      if (connection) {
        connection.removeEventListener('change', updateStatus);
      }
    };
  }, []);

  return status;
}

// 저대역폭 모드 체크
export function useIsLowBandwidth(): boolean {
  const { effectiveType, saveData } = useNetworkStatus();

  if (saveData) return true;
  if (effectiveType === '2g' || effectiveType === 'slow-2g') return true;

  return false;
}
