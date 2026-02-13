/**
 * Toast Container do Fins
 * Sistema de notificações toast/snackbar com suporte a fila, retry e responsividade
 * Estilizado para combinar com o tema Midnight Slate
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { ToastType, TransactionType } from '../../types/notifications';
import { StringSimilarity } from '../../utils/similarity/stringSimilarity';
import { checkToastDuplicate } from '../../services/deduplicationService';
import {
  X,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Info,
  RefreshCw,
  ArrowDownCircle,
  ArrowUpCircle,
  Trash2,
} from 'lucide-react';

// Constantes de configuração
const TOAST_DURATION = 3000; // 3 segundos padrão
const TOAST_DISPLAY_INTERVAL = 400; // ms entre toasts na fila
const MAX_TOASTS_DESKTOP = 5;
const MAX_TOASTS_MOBILE = 3;

// Interface do item de toast
interface ToastItem {
  id: string;
  title: string;
  message: string;
  type: ToastType;
  duration?: number;
  action?: ToastAction;
  createdAt: number;
  retryAction?: () => void;
  transactionType?: TransactionType; // Para estilização específica de transação
}

// Interface de ação para toast
interface ToastAction {
  id: string;
  label: string;
  icon?: React.ReactNode;
  primary?: boolean;
  onClick?: () => void;
}

// Configuração de cores por tipo (incluindo distinction expense/income)
const getToastColors = (type: ToastType, transactionType?: TransactionType) => {
  // Se for transação de despesa, usar tons vermelhos mesmo no "sucesso"
  if (transactionType === 'expense') {
    return {
      border:
        'border-l-red-500 bg-gradient-to-r from-red-500/20 to-red-500/5 dark:from-red-500/10 dark:to-red-500/5',
      iconBg: 'bg-red-100 dark:bg-red-900/50',
      iconColor: 'text-red-600 dark:text-red-400',
      progress: 'bg-red-500',
    };
  }

  // Se for receita, usar tons verdes
  if (transactionType === 'income') {
    return {
      border:
        'border-l-green-500 bg-gradient-to-r from-green-500/20 to-green-500/5 dark:from-green-500/10 dark:to-green-500/5',
      iconBg: 'bg-green-100 dark:bg-green-900/50',
      iconColor: 'text-green-600 dark:text-green-400',
      progress: 'bg-green-500',
    };
  }

  const colors = {
    success: {
      border:
        'border-l-green-500 bg-gradient-to-r from-green-500/20 to-green-500/5 dark:from-green-500/10 dark:to-green-500/5',
      iconBg: 'bg-green-100 dark:bg-green-900/50',
      iconColor: 'text-green-600 dark:text-green-400',
      progress: 'bg-green-500',
    },
    error: {
      border:
        'border-l-red-500 bg-gradient-to-r from-red-500/20 to-red-500/5 dark:from-red-500/10 dark:to-red-500/5',
      iconBg: 'bg-red-100 dark:bg-red-900/50',
      iconColor: 'text-red-600 dark:text-red-400',
      progress: 'bg-red-500',
    },
    warning: {
      border:
        'border-l-yellow-500 bg-gradient-to-r from-yellow-500/20 to-yellow-500/5 dark:from-yellow-500/10 dark:to-yellow-500/5',
      iconBg: 'bg-yellow-100 dark:bg-yellow-900/50',
      iconColor: 'text-yellow-600 dark:text-yellow-400',
      progress: 'bg-yellow-500',
    },
    info: {
      border:
        'border-l-blue-500 bg-gradient-to-r from-blue-500/20 to-blue-500/5 dark:from-blue-500/10 dark:to-blue-500/5',
      iconBg: 'bg-blue-100 dark:bg-blue-900/50',
      iconColor: 'text-blue-600 dark:text-blue-400',
      progress: 'bg-blue-500',
    },
    delete: {
      border:
        'border-l-gray-500 bg-gradient-to-r from-gray-500/20 to-gray-500/5 dark:from-gray-500/10 dark:to-gray-500/5',
      iconBg: 'bg-gray-100 dark:bg-gray-900/50',
      iconColor: 'text-gray-600 dark:text-gray-400',
      progress: 'bg-gray-500',
    },
  };

  return colors[type] || colors.info;
};

// Obter ícone baseado no tipo
const getToastIcon = (type: ToastType, transactionType?: string) => {
  // Transações de exclusão têm ícone de lixeira
  if (type === 'delete') {
    return <Trash2 className="w-5 h-5" />;
  }

  // Transações têm ícones específicos
  if (transactionType === 'expense') {
    return <ArrowDownCircle className="w-5 h-5" />;
  }
  if (transactionType === 'income') {
    return <ArrowUpCircle className="w-5 h-5" />;
  }

  const icons = {
    success: <CheckCircle className="w-5 h-5" />,
    error: <AlertCircle className="w-5 h-5" />,
    warning: <AlertTriangle className="w-5 h-5" />,
    info: <Info className="w-5 h-5" />,
    delete: <Trash2 className="w-5 h-5" />,
  };

  return icons[type] || icons.info;
};

// Componente Toast Individual
interface ToastProps {
  item: ToastItem;
  onClose: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({ item, onClose }) => {
  const [isExiting, setIsExiting] = useState(false);
  const [progress, setProgress] = useState(100);
  const startTimeRef = useRef(Date.now());
  const duration = item.duration || TOAST_DURATION;
  const colors = getToastColors(item.type, item.transactionType);

  // Timer para remoção automática
  useEffect(() => {
    if (duration <= 0) return;

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = Math.max(0, ((duration - elapsed) / duration) * 100);
      setProgress(remaining);

      if (elapsed >= duration) {
        setIsExiting(true);
        setTimeout(() => onClose(item.id), 300);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [duration, item.id, onClose]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => onClose(item.id), 300);
  };

  return (
    <div
      className={`
        toast-item
        flex items-start gap-3 p-4 rounded-lg shadow-lg
        border-l-4 backdrop-blur-sm
        transform transition-all duration-300 ease-out
        ${colors.border}
        ${isExiting ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'}
        w-full max-w-sm
        md:max-w-md
        pointer-events-auto
      `}
      role="alert"
      aria-live="polite"
    >
      {/* Icon */}
      <div className={`flex-shrink-0 mt-0.5 p-2 rounded-full ${colors.iconBg} ${colors.iconColor}`}>
        {getToastIcon(item.type, item.transactionType)}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-foreground text-sm md:text-base">{item.title}</h4>
        <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{item.message}</p>

        {/* Action Buttons */}
        {item.action && (
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => {
                item.action?.onClick?.();
                handleClose();
              }}
              className={`
                text-sm font-medium px-3 py-1.5 rounded transition-colors
                ${
                  item.action.primary
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                    : 'bg-accent text-accent-foreground hover:bg-accent/80'
                }
              `}
            >
              <span className="flex items-center gap-1">
                {item.action.icon}
                {item.action.label}
              </span>
            </button>

            {/* Retry Button for Error Toasts */}
            {item.type === 'error' && item.retryAction && (
              <button
                onClick={() => {
                  item.retryAction?.();
                  handleClose();
                }}
                className="text-sm font-medium px-3 py-1.5 rounded
                         bg-orange-100 text-orange-700 hover:bg-orange-200
                         dark:bg-orange-900/30 dark:text-orange-400 dark:hover:bg-orange-900/50
                         flex items-center gap-1"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Tentar Novamente
              </button>
            )}
          </div>
        )}
      </div>

      {/* Close Button */}
      <button
        onClick={handleClose}
        className="flex-shrink-0 p-1.5 hover:bg-accent rounded transition-colors
                 focus:outline-none focus:ring-2 focus:ring-primary"
        aria-label="Fechar notificação"
      >
        <X className="w-4 h-4 text-muted-foreground" />
      </button>

      {/* Progress Bar */}
      {duration > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-transparent rounded-b-lg overflow-hidden">
          <div
            className={`h-full transition-all duration-50 ${colors.progress}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
};

// Container de Toast com sistema de fila
export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [queue, setQueue] = useState<ToastItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [lastDataLoadingToastTime, setLastDataLoadingToastTime] = useState<number>(0);
  const [dataLoadingToastId, setDataLoadingToastId] = useState<string | null>(null);

  // Detectar se é mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Calcular máximo de toasts baseado no dispositivo
  const maxToasts = isMobile ? MAX_TOASTS_MOBILE : MAX_TOASTS_DESKTOP;

  // Processar fila de notificações
  useEffect(() => {
    if (queue.length > 0 && toasts.length < maxToasts && !isProcessing) {
      setIsProcessing(true);

      const processNext = () => {
        const nextToast = queue[0];
        setToasts((prev) => [...prev, nextToast]);
        setQueue((prev) => prev.slice(1));
        setIsProcessing(false);
      };

      // Adicionar com pequeno intervalo para suavidade
      setTimeout(processNext, TOAST_DISPLAY_INTERVAL);
    }
  }, [queue, toasts.length, maxToasts, isProcessing]);

  // Configurações de debounce
  const DEBOUNCE_TIME = 3000; // 3 segundos
  const DUPLICATE_THRESHOLD = 0.85; // 85% de similaridade

  // Estado para debounce
  const [lastToastTime, setLastToastTime] = useState<number>(0);
  const [lastToastContent, setLastToastContent] = useState<string>('');

  // Listen for toast events
  useEffect(() => {
    const handleToast = (event: CustomEvent) => {
      const {
        title,
        message,
        type = 'info',
        duration = TOAST_DURATION,
        action,
        retryAction,
        transactionType,
      } = event.detail;

      const currentTime = Date.now();
      const contentHash = `${type}:${title}:${message}`;

      // Verificar debounce
      const timeSinceLast = currentTime - lastToastTime;
      const isWithinDebounce = timeSinceLast < DEBOUNCE_TIME;
      const isSimilarContent = StringSimilarity.quickCheck(
        lastToastContent,
        contentHash,
        DUPLICATE_THRESHOLD
      );

      // Se for dentro do debounce e conteúdo similar, atualizar o existente
      if (isWithinDebounce && isSimilarContent) {
        setToasts((prev) =>
          prev.map((t) =>
            t.title === title && t.message === message ? { ...t, createdAt: currentTime } : t
          )
        );
        return;
      }

      // Verificar duplicata usando o serviço de deduplicação (mais robusto)
      const isDuplicate = checkToastDuplicate(title, message, 'system').isDuplicate;

      if (isDuplicate) {
        // Atualizar timestamp do toast existente em vez de criar novo
        setToasts((prev) =>
          prev.map((t) =>
            t.title === title && t.message === message ? { ...t, createdAt: currentTime } : t
          )
        );
        return;
      }

      // Verificar duplicata adicional para toasts de carregamento de dados
      const isLoadingToast =
        message.toLowerCase().includes('carregando dados') ||
        message.toLowerCase().includes('preparando seu painel financeiro');
      const isDataLoadedToast = message.toLowerCase().includes('dados carregados');

      if (isLoadingToast && dataLoadingToastId) {
        // Se já houver um toast de carregamento e vier outro toast de carregamento,
        // apenas atualizar timestamp e impedir duplicação
        setToasts((prev) =>
          prev.map((t) => (t.id === dataLoadingToastId ? { ...t, createdAt: currentTime } : t))
        );
        return;
      }

      // Se for toast de "Dados carregados", limpar o ID de carregamento anterior
      // para permitir que o toast de sucesso seja criado
      if (isDataLoadedToast && dataLoadingToastId) {
        setDataLoadingToastId(null);
      }

      const id = crypto.randomUUID();
      const newToast: ToastItem = {
        id,
        title,
        message,
        type,
        duration,
        action,
        retryAction,
        createdAt: currentTime,
        transactionType,
      };

      // Registrar ID do toast de carregamento se for um toast de carregamento
      if (isLoadingToast) {
        setDataLoadingToastId(id);
      }

      // Atualizar estado de debounce
      setLastToastTime(currentTime);
      setLastToastContent(contentHash);

      // Adicionar à fila se limite atingido
      if (toasts.length >= maxToasts) {
        setQueue((prev) => [...prev, newToast]);
      } else {
        setToasts((prev) => [...prev, newToast]);
      }
    };

    window.addEventListener('app-toast', handleToast as EventListener);
    return () => window.removeEventListener('app-toast', handleToast as EventListener);
  }, [toasts.length, queue.length, maxToasts, lastToastTime, lastToastContent, dataLoadingToastId]);

  // Remover toast
  const removeToast = useCallback(
    (id: string) => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      // Limpar ID do toast de carregamento se for o toast que está sendo removido
      if (dataLoadingToastId === id) {
        setDataLoadingToastId(null);
      }
    },
    [dataLoadingToastId]
  );

  // Render via portal para evitar problemas de z-index
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className={`
        fixed bottom-4 right-4 z-[9999]
        flex flex-col gap-2
        w-full max-w-sm px-4
        md:max-w-md md:px-0
        md:w-auto
        pointer-events-none
        ${isMobile ? 'bottom-4 right-4' : 'bottom-6 right-6'}
        force-size
      `}
      style={{
        width: '100%',
        maxWidth: isMobile ? '24rem' : '28rem',
      }}
      aria-live="polite"
      aria-label="Notificações"
    >
      {toasts.map((toast) => (
        <Toast key={toast.id} item={toast} onClose={removeToast} />
      ))}

      {/* Fila de espera */}
      {queue.length > 0 && (
        <div className="text-xs text-muted-foreground text-center mt-2">
          +{queue.length} notificação{queue.length > 1 ? 's' : ''} na fila
        </div>
      )}
    </div>,
    document.body
  );
};

// Hook useToast - hook básico para mostrar toasts
export const useToast = () => {
  const showToast = useCallback(
    (toast: {
      title: string;
      message: string;
      type?: ToastType;
      duration?: number;
      action?: ToastAction;
      retryAction?: () => void;
      transactionType?: TransactionType;
    }) => {
      window.dispatchEvent(new CustomEvent('app-toast', { detail: toast }));
    },
    []
  );

  return { showToast };
};

// Função notify - função utilitária para mostrar toasts (pode ser usada diretamente)
interface NotifyProps {
  title: string;
  message: string;
  type?: ToastType;
  duration?: number;
  action?: ToastAction;
  retryAction?: () => void;
  transactionType?: TransactionType;
}

export const notify = ({
  title,
  message,
  type = 'info',
  duration = TOAST_DURATION,
  action,
  retryAction,
  transactionType,
}: NotifyProps) => {
  window.dispatchEvent(
    new CustomEvent('app-toast', {
      detail: { title, message, type, duration, action, retryAction, transactionType },
    })
  );
};

import {
  TOAST_MESSAGES,
  formatCurrencyForToast,
  getTransactionTypePortuguese,
} from '../../utils/toast-messages';

// Hook useTransactionToast - hook especializado para notificações de transações
export const useTransactionToast = () => {
  const showTransactionSuccess = useCallback(
    (data: {
      type: 'income' | 'expense';
      action: 'add' | 'edit';
      description: string;
      amount: number;
    }) => {
      const { type: transactionType, action, description, amount } = data;

      const transactionTypePT = getTransactionTypePortuguese(transactionType);
      const formattedAmount = formatCurrencyForToast(amount);

      let messageConfig;
      switch (action) {
        case 'add':
          messageConfig = TOAST_MESSAGES.TRANSACTION.ADDED;
          break;
        case 'edit':
          messageConfig = TOAST_MESSAGES.TRANSACTION.UPDATED;
          break;
        default:
          messageConfig = TOAST_MESSAGES.TRANSACTION.ADDED;
      }

      window.dispatchEvent(
        new CustomEvent('app-toast', {
          detail: {
            title: messageConfig.TITLE,
            message: messageConfig.MESSAGE(transactionTypePT, description, formattedAmount),
            type: transactionType === 'expense' ? 'warning' : 'success',
            duration: TOAST_DURATION,
            transactionType,
          },
        })
      );
    },
    []
  );

  const showTransactionError = useCallback(
    (data: {
      type: 'income' | 'expense';
      description: string;
      amount: number;
      error?: string;
      retryAction?: () => void;
    }) => {
      const { type: transactionType, description, amount, error, retryAction } = data;

      const transactionTypePT = getTransactionTypePortuguese(transactionType);
      const formattedAmount = formatCurrencyForToast(amount);
      const messageConfig = TOAST_MESSAGES.TRANSACTION.ERROR;

      window.dispatchEvent(
        new CustomEvent('app-toast', {
          detail: {
            title: messageConfig.TITLE,
            message: messageConfig.MESSAGE(transactionTypePT, description, formattedAmount, error),
            type: 'error',
            duration: TOAST_DURATION,
            retryAction,
          },
        })
      );
    },
    []
  );

  const showTransactionDelete = useCallback(
    (data: { type: 'income' | 'expense'; description: string; amount: number }) => {
      const { type: transactionType, description, amount } = data;

      const transactionTypePT = getTransactionTypePortuguese(transactionType);
      const formattedAmount = formatCurrencyForToast(amount);
      const messageConfig = TOAST_MESSAGES.TRANSACTION.DELETED;

      window.dispatchEvent(
        new CustomEvent('app-toast', {
          detail: {
            title: messageConfig.TITLE,
            message: messageConfig.MESSAGE(transactionTypePT, description, formattedAmount),
            type: 'delete',
            duration: TOAST_DURATION,
            transactionType,
          },
        })
      );
    },
    []
  );

  return { showTransactionSuccess, showTransactionError, showTransactionDelete };
};

// Hook useGoalToast - hook especializado para notificações de metas
export const useGoalToast = () => {
  const showGoalCreated = useCallback((data: { name: string; target: number }) => {
    const { name, target } = data;
    const formattedTarget = formatCurrencyForToast(target);
    const messageConfig = TOAST_MESSAGES.GOAL.CREATED;

    window.dispatchEvent(
      new CustomEvent('app-toast', {
        detail: {
          title: messageConfig.TITLE,
          message: messageConfig.MESSAGE(name, formattedTarget),
          type: 'success',
          duration: TOAST_DURATION,
        },
      })
    );
  }, []);

  const showGoalContribution = useCallback(
    (data: { name: string; current: number; target: number; progress?: number }) => {
      const { name, current, target, progress } = data;
      const formattedCurrent = formatCurrencyForToast(current);
      // Se temos progress, calculamos a porcentagem do progresso total
      // Caso contrário, calculamos a contribuição em relação ao target
      const percentage =
        progress !== undefined
          ? Math.round((progress / target) * 100)
          : Math.round((current / target) * 100);
      const messageConfig = TOAST_MESSAGES.GOAL.CONTRIBUTION;

      window.dispatchEvent(
        new CustomEvent('app-toast', {
          detail: {
            title: messageConfig.TITLE,
            message: messageConfig.MESSAGE(formattedCurrent, name, percentage),
            type: 'success',
            duration: TOAST_DURATION,
          },
        })
      );
    },
    []
  );

  const showGoalError = useCallback(
    (data: { name: string; error?: string; retryAction?: () => void }) => {
      const { name, error, retryAction } = data;
      const messageConfig = TOAST_MESSAGES.GOAL.ERROR;

      window.dispatchEvent(
        new CustomEvent('app-toast', {
          detail: {
            title: messageConfig.TITLE,
            message: messageConfig.MESSAGE(name, error),
            type: 'error',
            duration: TOAST_DURATION,
            retryAction,
          },
        })
      );
    },
    []
  );

  const showGoalDelete = useCallback((data: { name: string }) => {
    const { name } = data;
    const messageConfig = TOAST_MESSAGES.GOAL.DELETED;

    window.dispatchEvent(
      new CustomEvent('app-toast', {
        detail: {
          title: messageConfig.TITLE,
          message: messageConfig.MESSAGE(name),
          type: 'delete',
          duration: TOAST_DURATION,
        },
      })
    );
  }, []);

  return { showGoalCreated, showGoalContribution, showGoalError, showGoalDelete };
};

// Hook useBudgetToast - hook especializado para notificações de orçamentos
export const useBudgetToast = () => {
  const showBudgetCreated = useCallback((data: { category: string; limit: number }) => {
    const { category, limit } = data;
    const formattedLimit = formatCurrencyForToast(limit);
    const messageConfig = TOAST_MESSAGES.BUDGET.CREATED;

    window.dispatchEvent(
      new CustomEvent('app-toast', {
        detail: {
          title: messageConfig.TITLE,
          message: messageConfig.MESSAGE(category, formattedLimit),
          type: 'success',
          duration: TOAST_DURATION,
        },
      })
    );
  }, []);

  const showBudgetError = useCallback(
    (data: { category: string; error?: string; retryAction?: () => void }) => {
      const { category, error, retryAction } = data;
      const messageConfig = TOAST_MESSAGES.BUDGET.ERROR;

      window.dispatchEvent(
        new CustomEvent('app-toast', {
          detail: {
            title: messageConfig.TITLE,
            message: messageConfig.MESSAGE(category, error),
            type: 'error',
            duration: TOAST_DURATION,
            retryAction,
          },
        })
      );
    },
    []
  );

  const showBudgetDelete = useCallback((data: { category: string }) => {
    const { category } = data;
    const messageConfig = TOAST_MESSAGES.BUDGET.DELETED;

    window.dispatchEvent(
      new CustomEvent('app-toast', {
        detail: {
          title: messageConfig.TITLE,
          message: messageConfig.MESSAGE(category),
          type: 'delete',
          duration: TOAST_DURATION,
        },
      })
    );
  }, []);

  return { showBudgetCreated, showBudgetError, showBudgetDelete };
};

export default ToastContainer;
