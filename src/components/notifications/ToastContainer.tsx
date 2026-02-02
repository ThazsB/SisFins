/**
 * Toast Container do EcoFinance
 * Sistema de notificações toast/snackbar
 * Estilizado para combinar com o tema Midnight Slate
 */

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Info,
} from 'lucide-react';
import type { NotificationAction } from '@/types/notifications';
import { useNotificationsStore } from '@/stores/notificationsStore';

interface ToastProps {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'warning' | 'error' | 'info';
  duration?: number;
  action?: NotificationAction;
  onClose: (id: string) => void;
  onAction?: (action: NotificationAction) => void;
}

const Toast: React.FC<ToastProps> = ({
  id,
  title,
  message,
  type,
  duration: propDuration,
  action,
  onClose,
  onAction,
}) => {
  const [isExiting, setIsExiting] = useState(false);
  const [progress, setProgress] = useState(100);
  const { preferences } = useNotificationsStore();
  
  // Usar a duração das preferências do usuário ou a duração passada como prop
  const isAutoDismissEnabled = preferences.autoDismissing;
  const userDismissDelay = preferences.autoDismissDelay * 1000; // converter para ms
  const duration = propDuration !== undefined 
    ? propDuration 
    : (isAutoDismissEnabled ? userDismissDelay : 0);

  // Animação da barra de progresso
  useEffect(() => {
    if (duration > 0) {
      const interval = 50;
      const decrement = 100 / (duration / interval);
      const timer = setInterval(() => {
        setProgress((prev) => Math.max(0, prev - decrement));
      }, interval);

      return () => clearInterval(timer);
    }
  }, [duration]);

  // Auto dismiss
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsExiting(true);
        setTimeout(() => onClose(id), 300);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, id, onClose]);

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-green-500" />,
    warning: <AlertTriangle className="w-5 h-5 text-orange-500" />,
    error: <AlertCircle className="w-5 h-5 text-destructive" />,
    info: <Info className="w-5 h-5 text-primary" />,
  };

  const colors = {
    success: 'border-l-green-500 bg-green-500/10',
    warning: 'border-l-orange-500 bg-orange-500/10',
    error: 'border-l-destructive bg-destructive/10',
    info: 'border-l-primary bg-primary/10',
  };

  const iconBgColors = {
    success: 'bg-green-500/20',
    warning: 'bg-orange-500/20',
    error: 'bg-destructive/20',
    info: 'bg-primary/20',
  };

  return (
    <div
      className={`
        flex items-start gap-3 p-4 rounded-lg shadow-lg border-l-4
        transform transition-all duration-300 ease-out
        bg-card ${colors[type]}
        ${isExiting ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'}
        max-w-sm w-full
      `}
    >
      {/* Icon */}
      <div className={`flex-shrink-0 mt-0.5 p-2 rounded-full ${iconBgColors[type]}`}>
        {icons[type]}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-foreground text-sm">
          {title}
        </h4>
        <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
          {message}
        </p>

        {/* Action Button */}
        {action && (
          <button
            onClick={() => onAction?.(action)}
            className="mt-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
          >
            {action.label}
          </button>
        )}
      </div>

      {/* Close Button */}
      <button
        onClick={() => {
          setIsExiting(true);
          setTimeout(() => onClose(id), 300);
        }}
        className="flex-shrink-0 p-1 hover:bg-accent rounded transition-colors"
      >
        <X className="w-4 h-4 text-muted-foreground" />
      </button>

      {/* Progress Bar */}
      {duration > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-transparent rounded-b-lg overflow-hidden">
          <div
            className={`h-full transition-all duration-50 ${
              type === 'error'
                ? 'bg-destructive'
                : type === 'warning'
                  ? 'bg-orange-500'
                  : type === 'success'
                    ? 'bg-green-500'
                    : 'bg-primary'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
};

interface ToastItem {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'warning' | 'error' | 'info';
  duration?: number;
  action?: NotificationAction;
}

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // Listen for toast events
  useEffect(() => {
    const handleToast = (event: CustomEvent) => {
      const {
        title,
        message,
        type = 'info',
        duration = 5000,
        action,
      } = event.detail;

      const id = crypto.randomUUID();

      setToasts((prev) => {
        // Limitar a 5 toasts visíveis
        const newToasts = [...prev, { id, title, message, type, duration, action }];
        if (newToasts.length > 5) {
          return newToasts.slice(-5);
        }
        return newToasts;
      });
    };

    window.addEventListener('app-toast', handleToast as EventListener);
    return () =>
      window.removeEventListener('app-toast', handleToast as EventListener);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handleAction = useCallback(
    (toast: ToastItem, action: NotificationAction) => {
      if (action.handler) {
        window.dispatchEvent(
          new CustomEvent('notification-action', {
            detail: { notificationId: toast.id, action: action.id },
          })
        );
      }
      if (action.url) {
        window.location.href = action.url;
      }
      removeToast(toast.id);
    },
    [removeToast]
  );

  // Use portal to render at document body
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast
            {...toast}
            onClose={removeToast}
            onAction={(action) => handleAction(toast, action)}
          />
        </div>
      ))}
    </div>,
    document.body
  );
};

// Hook para mostrar toasts
export function useToast() {
  const showToast = useCallback(
    (
      title: string,
      message: string,
      type: 'success' | 'warning' | 'error' | 'info' = 'info',
      duration?: number,
      action?: NotificationAction
    ) => {
      if (typeof window !== 'undefined') {
        const event = new CustomEvent('app-toast', {
          detail: { title, message, type, duration, action },
        });
        window.dispatchEvent(event);
      }
    },
    []
  );

  return { showToast };
}

// Função helper para criar toast rapidamente
export function notify(
  title: string,
  message: string,
  type: 'success' | 'warning' | 'error' | 'info' = 'info'
) {
  if (typeof window !== 'undefined') {
    const event = new CustomEvent('app-toast', {
      detail: { title, message, type, duration: 5000 },
    });
    window.dispatchEvent(event);
  }
}

export default ToastContainer;
