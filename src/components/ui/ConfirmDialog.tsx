/**
 * Modal de Confirmação Reutilizável do Fins
 * Substitui o confirm() nativo do navegador
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  AlertTriangle,
  Trash2,
  TrendingUp,
  TrendingDown,
  Target,
  Wallet,
  LogOut,
} from 'lucide-react';

// Tipos de confirmação
export type ConfirmType = 'transaction' | 'goal' | 'budget' | 'logout' | 'generic';

// Props do componente
interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message?: React.ReactNode;
  children?: React.ReactNode; // Conteúdo customizado
  type?: ConfirmType;
  details?: {
    label: string;
    value: string;
    icon?: React.ReactNode;
  }[];
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  onClose?: () => void;
  isDeleting?: boolean;
  isDestructive?: boolean;
  hideWarning?: boolean;
}

// Ícones por tipo
const getTypeIcon = (type: ConfirmType) => {
  switch (type) {
    case 'transaction':
      return <TrendingDown className="w-6 h-6 text-red-500" />;
    case 'goal':
      return <Target className="w-6 h-6 text-orange-500" />;
    case 'budget':
      return <Wallet className="w-6 h-6 text-green-500" />;
    case 'logout':
      return <LogOut className="w-6 h-6 text-blue-500" />;
    default:
      return <AlertTriangle className="w-6 h-6 text-yellow-500" />;
  }
};

// Obter título e cores baseadas no tipo
const getTypeConfig = (type: ConfirmType) => {
  switch (type) {
    case 'transaction':
      return {
        title: 'Excluir Transação',
        icon: <TrendingDown className="w-6 h-6 text-red-500" />,
        bgColor: 'bg-red-500/10',
        borderColor: 'border-red-500/30',
        iconBg: 'bg-red-500/20',
      };
    case 'goal':
      return {
        title: 'Excluir Meta',
        icon: <Target className="w-6 h-6 text-orange-500" />,
        bgColor: 'bg-orange-500/10',
        borderColor: 'border-orange-500/30',
        iconBg: 'bg-orange-500/20',
      };
    case 'budget':
      return {
        title: 'Excluir Orçamento',
        icon: <Wallet className="w-6 h-6 text-green-500" />,
        bgColor: 'bg-green-500/10',
        borderColor: 'border-green-500/30',
        iconBg: 'bg-green-500/20',
      };
    case 'logout':
      return {
        title: 'Sair da Conta',
        icon: <LogOut className="w-6 h-6 text-blue-500" />,
        bgColor: 'bg-blue-500/10',
        borderColor: 'border-blue-500/30',
        iconBg: 'bg-blue-500/20',
      };
    default:
      return {
        title: 'Confirmar Exclusão',
        icon: <AlertTriangle className="w-6 h-6 text-yellow-500" />,
        bgColor: 'bg-yellow-500/10',
        borderColor: 'border-yellow-500/30',
        iconBg: 'bg-yellow-500/20',
      };
  }
};

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  children,
  type = 'generic',
  details = [],
  confirmText = 'Excluir',
  cancelText = 'Cancelar',
  onConfirm,
  onCancel,
  onClose,
  isDeleting = false,
  isDestructive = true,
  hideWarning = false,
}) => {
  const [isExiting, setIsExiting] = useState(false);

  // Handle ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCancel();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
    }

    return () => {
      window.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleCancel = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      setIsExiting(false);
      onCancel();
      onClose?.();
    }, 200);
  }, [onCancel, onClose]);

  const handleConfirm = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      setIsExiting(false);
      onConfirm();
    }, 200);
  }, [onConfirm]);

  if (!isOpen) return null;

  const config = getTypeConfig(type);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-200 ${
          isExiting ? 'opacity-0' : 'opacity-100'
        }`}
        onClick={handleCancel}
      />

      {/* Modal */}
      <div
        className={`relative bg-card rounded-xl border border-border shadow-2xl w-full max-w-md mx-4 p-6 transform transition-all duration-200 ${
          isExiting ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
        }`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
      >
        {/* Header */}
        <div className="flex items-start gap-4 mb-4">
          <div className={`p-3 rounded-full ${config.iconBg}`}>{config.icon}</div>
          <div className="flex-1">
            <h2 id="confirm-dialog-title" className="text-xl font-semibold text-foreground">
              {config.title}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">{message}</p>
          </div>
          <button
            onClick={handleCancel}
            className="p-1 hover:bg-accent rounded-lg transition-colors"
            aria-label="Fechar"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Custom Content (children) */}
        {children && <div className="mb-4">{children}</div>}

        {/* Details */}
        {details.length > 0 && (
          <div className="mb-6 p-4 bg-muted/50 rounded-lg space-y-3">
            {details.map((detail, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{detail.label}</span>
                <div className="flex items-center gap-2">
                  {detail.icon}
                  <span className="text-sm font-medium text-foreground">{detail.value}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Warning */}
        {!hideWarning && (
          <div className="mb-6 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0" />
              <p className="text-sm text-yellow-500">Esta ação não pode ser desfeita.</p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleCancel}
            className="flex-1 px-4 py-2.5 bg-muted hover:bg-muted/80 text-foreground rounded-lg transition-colors font-medium"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            disabled={isDeleting}
            className={`flex-1 px-4 py-2.5 text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2 ${
              isDeleting
                ? 'bg-red-600/50 cursor-not-allowed'
                : isDestructive
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-primary hover:bg-primary/90'
            }`}
          >
            {isDeleting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Processando...
              </>
            ) : (
              <>
                {isDestructive && <Trash2 className="w-4 h-4" />}
                {confirmText}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// Hook para gerenciar diálogos de confirmação
export function useConfirmDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<{
    type: ConfirmType;
    title: string;
    message: React.ReactNode;
    details?: { label: string; value: string; icon?: React.ReactNode }[];
    onConfirm: () => void;
  } | null>(null);

  const confirm = useCallback(
    (
      type: ConfirmType,
      title: string,
      message: React.ReactNode,
      details?: { label: string; value: string; icon?: React.ReactNode }[],
      onConfirm?: () => void
    ) => {
      return new Promise<boolean>((resolve) => {
        setConfig({ type, title, message, details, onConfirm: onConfirm || (() => {}) });
        setIsOpen(true);

        // Override onConfirm to resolve promise
        if (config) {
          config.onConfirm = () => {
            onConfirm?.();
            resolve(true);
          };
        }
      });
    },
    []
  );

  const handleConfirm = useCallback(() => {
    config?.onConfirm();
    setIsOpen(false);
  }, [config]);

  const handleCancel = useCallback(() => {
    setIsOpen(false);
  }, []);

  return {
    isOpen,
    config,
    confirm,
    handleConfirm,
    handleCancel,
  };
}

export default ConfirmDialog;
