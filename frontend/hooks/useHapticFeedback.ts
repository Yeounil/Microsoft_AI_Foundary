'use client';

// 햅틱 피드백 타입
type HapticType = 'light' | 'medium' | 'heavy' | 'selection' | 'success' | 'warning' | 'error';

export function useHapticFeedback() {
  const vibrate = (pattern: number | number[]) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  };

  const trigger = (type: HapticType = 'light') => {
    switch (type) {
      case 'light':
        vibrate(10);
        break;
      case 'medium':
        vibrate(20);
        break;
      case 'heavy':
        vibrate(30);
        break;
      case 'selection':
        vibrate(5);
        break;
      case 'success':
        vibrate([10, 50, 10]);
        break;
      case 'warning':
        vibrate([20, 50, 20]);
        break;
      case 'error':
        vibrate([30, 50, 30, 50, 30]);
        break;
    }
  };

  return { trigger, vibrate };
}

// 스와이프 액션 훅
export function useSwipeAction(
  onSwipeLeft?: () => void,
  onSwipeRight?: () => void,
  threshold = 100
) {
  const { trigger } = useHapticFeedback();

  const handleSwipeLeft = () => {
    trigger('medium');
    onSwipeLeft?.();
  };

  const handleSwipeRight = () => {
    trigger('medium');
    onSwipeRight?.();
  };

  return {
    onSwipeLeft: handleSwipeLeft,
    onSwipeRight: handleSwipeRight,
    threshold,
  };
}
