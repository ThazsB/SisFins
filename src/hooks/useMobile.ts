import { useState, useEffect, useCallback } from 'react';

interface MobileInfo {
  isMobile: boolean;
  isNative: boolean;
  platform: 'web' | 'android' | 'ios';
  isOnline: boolean;
  hasNotch: boolean;
  safeAreaInsets: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
}

export function useMobile(): MobileInfo {
  const [info, setInfo] = useState<MobileInfo>({
    isMobile: false,
    isNative: false,
    platform: 'web',
    isOnline: navigator.onLine,
    hasNotch: false,
    safeAreaInsets: { top: 0, bottom: 0, left: 0, right: 0 },
  });

  useEffect(() => {
    const checkMobile = async () => {
      // Detectar se é dispositivo móvel por User Agent
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
        userAgent
      );

      // Detectar plataforma nativa
      let isNative = false;
      let platform: 'web' | 'android' | 'ios' = 'web';

      try {
        const { Capacitor } = await import('@capacitor/core');
        isNative = Capacitor.isNativePlatform();
        platform = Capacitor.getPlatform() as 'web' | 'android' | 'ios';
      } catch {
        // Capacitor não disponível
      }

      // Detectar notch/safe area
      const computedStyle = getComputedStyle(document.documentElement);
      const safeAreaTop = parseInt(computedStyle.getPropertyValue('--sat') || '0');
      const safeAreaBottom = parseInt(computedStyle.getPropertyValue('--sab') || '0');
      const safeAreaLeft = parseInt(computedStyle.getPropertyValue('--sal') || '0');
      const safeAreaRight = parseInt(computedStyle.getPropertyValue('--sar') || '0');

      const hasNotch = safeAreaTop > 0 || safeAreaBottom > 0;

      setInfo({
        isMobile: isMobileDevice || isNative,
        isNative,
        platform,
        isOnline: navigator.onLine,
        hasNotch,
        safeAreaInsets: {
          top: safeAreaTop,
          bottom: safeAreaBottom,
          left: safeAreaLeft,
          right: safeAreaRight,
        },
      });
    };

    checkMobile();

    // Listener para mudanças de conexão
    const handleOnline = () => setInfo((prev) => ({ ...prev, isOnline: true }));
    const handleOffline = () => setInfo((prev) => ({ ...prev, isOnline: false }));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return info;
}

// Hook para feedback háptico
export function useHaptics() {
  const haptic = useCallback(async (style: 'light' | 'medium' | 'heavy' = 'light') => {
    try {
      const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
      const styleMap = {
        light: ImpactStyle.Light,
        medium: ImpactStyle.Medium,
        heavy: ImpactStyle.Heavy,
      };
      await Haptics.impact({ style: styleMap[style] });
    } catch {
      // Haptics não disponível
    }
  }, []);

  const notification = useCallback(async (type: 'success' | 'warning' | 'error' = 'success') => {
    try {
      const { Haptics, NotificationType } = await import('@capacitor/haptics');
      const typeMap = {
        success: NotificationType.Success,
        warning: NotificationType.Warning,
        error: NotificationType.Error,
      };
      await Haptics.notification({ type: typeMap[type] });
    } catch {
      // Haptics não disponível
    }
  }, []);

  return { haptic, notification };
}

// Hook para status bar
export function useStatusBar() {
  const setStyle = useCallback(async (style: 'dark' | 'light') => {
    try {
      const { StatusBar, Style } = await import('@capacitor/status-bar');
      await StatusBar.setStyle({ style: style === 'dark' ? Style.Dark : Style.Light });
    } catch {
      // StatusBar não disponível
    }
  }, []);

  const setColor = useCallback(async (color: string) => {
    try {
      const { StatusBar } = await import('@capacitor/status-bar');
      await StatusBar.setBackgroundColor({ color });
    } catch {
      // StatusBar não disponível
    }
  }, []);

  const hide = useCallback(async () => {
    try {
      const { StatusBar } = await import('@capacitor/status-bar');
      await StatusBar.hide();
    } catch {
      // StatusBar não disponível
    }
  }, []);

  const show = useCallback(async () => {
    try {
      const { StatusBar } = await import('@capacitor/status-bar');
      await StatusBar.show();
    } catch {
      // StatusBar não disponível
    }
  }, []);

  return { setStyle, setColor, hide, show };
}

// Hook para preferências nativas (armazenamento)
export function usePreferences() {
  const get = useCallback(async <T>(key: string): Promise<T | null> => {
    try {
      const { Preferences } = await import('@capacitor/preferences');
      const { value } = await Preferences.get({ key });
      return value ? JSON.parse(value) : null;
    } catch {
      // Fallback para localStorage
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : null;
    }
  }, []);

  const set = useCallback(async <T>(key: string, value: T): Promise<void> => {
    try {
      const { Preferences } = await import('@capacitor/preferences');
      await Preferences.set({ key, value: JSON.stringify(value) });
    } catch {
      // Fallback para localStorage
      localStorage.setItem(key, JSON.stringify(value));
    }
  }, []);

  const remove = useCallback(async (key: string): Promise<void> => {
    try {
      const { Preferences } = await import('@capacitor/preferences');
      await Preferences.remove({ key });
    } catch {
      // Fallback para localStorage
      localStorage.removeItem(key);
    }
  }, []);

  return { get, set, remove };
}

export default useMobile;
