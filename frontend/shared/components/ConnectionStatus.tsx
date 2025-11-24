'use client';

import { useEffect, useState } from 'react';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getFMPWebSocketClient } from '@/lib/websocket/fmp-websocket-client';

interface ConnectionStatusProps {
  className?: string;
  showLabel?: boolean;
}

export function ConnectionStatus({ className, showLabel = false }: ConnectionStatusProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  // 초기값을 브라우저 상태로 설정
  const [isOnline, setIsOnline] = useState(() =>
    typeof window !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    // 브라우저 온라인 상태 감지
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // WebSocket 연결 상태 감지
    const wsClient = getFMPWebSocketClient();

    const updateStatus = () => {
      const status = wsClient.getConnectionStatus();
      setIsConnected(status.isConnected);
      setIsConnecting(status.isConnecting);
    };

    wsClient.onConnectionChange((connected) => {
      setIsConnected(connected);
      setIsConnecting(false);
    });

    // 초기 상태 설정
    updateStatus();

    // 주기적으로 상태 업데이트
    const interval = setInterval(updateStatus, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  if (!isOnline) {
    return (
      <div className={cn('flex items-center gap-1.5', className)}>
        <WifiOff className="h-4 w-4 text-destructive" />
        {showLabel && <span className="text-xs text-destructive">오프라인</span>}
      </div>
    );
  }

  if (isConnecting) {
    return (
      <div className={cn('flex items-center gap-1.5', className)}>
        <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
        {showLabel && <span className="text-xs text-muted-foreground">연결 중...</span>}
      </div>
    );
  }

  if (isConnected) {
    return (
      <div className={cn('flex items-center gap-1.5', className)}>
        <Wifi className="h-4 w-4 text-green-500" />
        {showLabel && <span className="text-xs text-green-600">실시간</span>}
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <WifiOff className="h-4 w-4 text-muted-foreground" />
      {showLabel && <span className="text-xs text-muted-foreground">연결 끊김</span>}
    </div>
  );
}
