# Plano Técnico: Sistema de Notificações Robust para EcoFinance

## Sumário Executivo

Este documento apresenta um plano técnico abrangente para implementação de um sistema de notificações enterprise-grade no EcoFinance, inspirado nas melhores práde plataformas como Google Finance, Mint,YNAB e aplicativos bancários modernos. O sistema proposto oferece notificações em tempo real, personalização avançada, sincronização multi-dispositivo e inteligência contextual.

---

## 1. Análise do Sistema Atual

### 1.1 Componentes Existentes

| Componente | Arquivo | Status |
|------------|---------|--------|
| Módulo de Notificações (Legacy) | [`js/modules/notificacoes.js`](js/modules/notificacoes.js:1) | LocalStorage, funcionando |
| Hook de Push Notifications | [`src/hooks/usePushNotifications.ts`](src/hooks/usePushNotifications.ts:1) | Estruturado, VAPID pending |
| Plano de Melhorias Existente | [`plans/notification-system-enhancement-plan.md`](plans/notification-system-enhancement-plan.md:1) | Referência inicial |

### 1.2 Limitações Identificadas

- **Persistência local apenas** — sem sincronização entre dispositivos
- **Tipos limitados** — apenas 4 categorias (info, success, warning, error)
- **Sem preferências do usuário** — não há configuração de notificações
- **Push notifications incompleto** — estrutura existe mas VAPID não configurado
- **Sem categorização inteligente** — todas as notificações são tratadas igualmente
- **Ausência de ações nas notificações** — apenas visualização
- **Sem resumos automatizados** — falta de insights proativos
- **Sem notificações contextuais** —baseadas apenas em regras fixas

---

## 2. Arquitetura do Sistema

### 2.1 Diagrama de Arquitetura

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND LAYER                               │
├─────────────────────────────────────────────────────────────────────┤
│  ┌───────────────┐  ┌───────────────┐  ┌─────────────────────────┐  │
│  │ Notification  │  │    Toast      │  │ Push Notification       │  │
│  │    Center     │  │  Container    │  │   Handler               │  │
│  └───────┬───────┘  └───────┬───────┘  └───────────┬─────────────┘  │
│          │                  │                      │                 │
│          └──────────────────┼──────────────────────┘                 │
│                             ▼                                        │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │              Notification Context Provider                   │    │
│  │         (React Context + Zustand Store hibrido)             │    │
│  └───────────────────────────┬─────────────────────────────────┘    │
│                              ▼                                       │
├─────────────────────────────────────────────────────────────────────┤
│                         SERVICE LAYER                                │
├─────────────────────────────────────────────────────────────────────┤
│  ┌───────────────┐  ┌───────────────┐  ┌─────────────────────────┐  │
│  │ Notification  │  │   Preference  │  │    Scheduler            │  │
│  │   Service     │  │    Service    │  │    Service              │  │
│  └───────┬───────┘  └───────┬───────┘  └───────────┬─────────────┘  │
│          │                  │                      │                 │
│          └──────────────────┼──────────────────────┘                 │
│                             ▼                                        │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │              Notification Engine (Rules & Triggers)          │    │
│  └───────────────────────────┬─────────────────────────────────┘    │
│                              ▼                                       │
├─────────────────────────────────────────────────────────────────────┤
│                        DATA LAYER                                    │
├─────────────────────────────────────────────────────────────────────┤
│  ┌───────────────────┐  ┌───────────────────┐  ┌─────────────────┐  │
│  │    IndexedDB      │  │    Supabase       │  │   Web Push      │  │
│  │   (Local Cache)   │  │   (Cloud Sync)    │  │   Server        │  │
│  └───────────────────┘  └───────────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 Pilares Arquiteturais

| Pilar | Descrição | Implementação |
|-------|-----------|---------------|
| **Offline-First** | Funciona sem conexão, sincroniza quando online | IndexedDB + Supabase sync |
| **Event-Driven** | Sistema baseado em eventos para triggers | EventEmitter pattern |
| **Componentizado** | Componentes React isolados e reutilizáveis | Atomic design |
| **Type-Safe** | TypeScript em todas as camadas | Interfaces explícitas |
| **Performance-First** | Otimizado para carregamento rápido | Virtual scrolling, lazy loading |

---

## 3. Modelagem de Dados

### 3.1 Interface Principal de Notificação

```typescript
// src/types/notifications.ts

/**
 * Tipos de prioridade para notificações
 */
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

/**
 * Canais de entrega de notificações
 */
export type NotificationChannel = 
  | 'in_app'      // Toast, centro de notificações
  | 'push'        // Notificações nativas do navegador
  | 'email'       // Email (futuro)
  | 'sms';        // SMS (futuro)

/**
 * Categorias de notificação
 */
export type NotificationCategory = 
  | 'budget'          // Orçamentos
  | 'goal'            // Metas
  | 'transaction'     // Transações
  | 'reminder'        // Lembretes
  | 'report'          // Relatórios
  | 'system'          // Sistema
  | 'insight'         // Insights financeiros
  | 'achievement';    // Conquistas

/**
 * Status da notificação
 */
export type NotificationStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'dismissed';

/**
 * Ação disponível em uma notificação
 */
export interface NotificationAction {
  id: string;
  label: string;
  icon?: string;
  url?: string;
  handler?: string; // Nome da função handler
  dismissAfterAction?: boolean;
  primary?: boolean;
}

/**
 * Payload principal de notificação
 */
export interface NotificationPayload {
  // Identificação
  id: string;
  profileId: string;
  deviceId?: string;
  
  // Conteúdo
  title: string;
  message: string;
  shortMessage?: string; // Para notificações push limitadas
  
  // Classificação
  category: NotificationCategory;
  priority: NotificationPriority;
  tags?: string[];
  
  // Metadados
  timestamp: string;
  expiresAt?: string;
  readAt?: string;
  dismissedAt?: string;
  
  // Ações
  actions?: NotificationAction[];
  url?: string;
  
  // Entrega
  channels: NotificationChannel[];
  status: NotificationStatus;
  
  // Visual
  icon?: string;
  image?: string;
  color?: string;
  
  // Dados contextuais
  data?: Record<string, unknown>;
  
  // Tracking
  sentAt?: string;
  deliveredAt?: string;
  readAt?: string;
  engagementMetrics?: {
    timeToRead?: number;
    actionTaken?: string;
  };
}
```

### 3.2 Interface de Preferências do Usuário

```typescript
// src/types/notification-preferences.ts

/**
 * Configurações de horário de silêncio
 */
export interface QuietHours {
  enabled: boolean;
  startTime: string;  // "22:00"
  endTime: string;    // "08:00"
  timezone: string;   // "America/Sao_Paulo"
  excludeWeekends?: boolean;
  excludeHolidays?: boolean;
}

/**
 * Configurações de canal por categoria
 */
export interface CategoryChannelConfig {
  enabled: boolean;
  channels: NotificationChannel[];
  frequency?: 'realtime' | 'hourly' | 'daily' | 'weekly';
  quietHoursRespected: boolean;
}

/**
 Preferências completas do usuário
 */
export interface NotificationPreferences {
  userId: string;
  profileId: string;
  
  // Configurações globais
  globalEnabled: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  autoDismissing: boolean;
  autoDismissDelay: number; // em segundos
  
  // Horário de silêncio
  quietHours: QuietHours;
  
  // Configurações por categoria
  categories: Record<NotificationCategory, CategoryChannelConfig>;
  
  // Configurações de push
  push: {
    enabled: boolean;
    showPreview: 'always' | 'unlocked' | 'never';
    replaceOldNotifications: boolean;
  };
  
  // Configurações de resumo
  summary: {
    enabled: boolean;
    frequency: 'never' | 'daily' | 'weekly' | 'monthly';
    dayOfWeek?: number; // 0-6, para weekly
    dayOfMonth?: number; // 1-31, para monthly
    time?: string; // "09:00"
    includeCategories: NotificationCategory[];
  };
  
  // Configurações de privacidade
  privacy: {
    hideAmounts: boolean;
    hideDescriptions: boolean;
  };
  
  // Metadados
  createdAt: string;
  updatedAt: string;
  version: number;
}

/**
 * Preferncias default para novos usuários
 */
export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  userId: '',
  profileId: '',
  globalEnabled: true,
  soundEnabled: true,
  vibrationEnabled: true,
  autoDismissing: true,
  autoDismissDelay: 5,
  quietHours: {
    enabled: false,
    startTime: '22:00',
    endTime: '08:00',
    timezone: 'America/Sao_Paulo',
    excludeWeekends: true,
    excludeHolidays: false,
  },
  categories: {
    budget: {
      enabled: true,
      channels: ['in_app', 'push'],
      frequency: 'realtime',
      quietHoursRespected: true,
    },
    goal: {
      enabled: true,
      channels: ['in_app', 'push'],
      frequency: 'realtime',
      quietHoursRespected: true,
    },
    transaction: {
      enabled: true,
      channels: ['in_app'],
      frequency: 'realtime',
      quietHoursRespected: true,
    },
    reminder: {
      enabled: true,
      channels: ['in_app', 'push'],
      frequency: 'realtime',
      quietHoursRespected: true,
    },
    report: {
      enabled: true,
      channels: ['in_app', 'email'],
      frequency: 'weekly',
      quietHoursRespected: false,
    },
    system: {
      enabled: true,
      channels: ['in_app'],
      frequency: 'realtime',
      quietHoursRespected: false,
    },
    insight: {
      enabled: true,
      channels: ['in_app'],
      frequency: 'daily',
      quietHoursRespected: true,
    },
    achievement: {
      enabled: true,
      channels: ['in_app', 'push'],
      frequency: 'realtime',
      quietHoursRespected: false,
    },
  },
  push: {
    enabled: true,
    showPreview: 'always',
    replaceOldNotifications: true,
  },
  summary: {
    enabled: true,
    frequency: 'weekly',
    dayOfWeek: 1, // Segunda-feira
    time: '09:00',
    includeCategories: ['budget', 'goal', 'insight'],
  },
  privacy: {
    hideAmounts: false,
    hideDescriptions: false,
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  version: 1,
};
```

### 3.3 Interface de Regras de Notificação

```typescript
// src/types/notification-rules.ts

/**
 * Condição para trigger de notificação
 */
export type RuleCondition = 
  | { type: 'threshold'; field: string; operator: 'gt' | 'lt' | 'eq'; value: number }
  | { type: 'percentage'; field: string; operator: 'gt' | 'lt'; value: number }
  | { type: 'date'; field: string; operator: 'eq' | 'before' | 'after'; value: string }
  | { type: 'recurring'; cron?: string; interval?: number }
  | { type: 'pattern'; field: string; regex?: string };

/**
 * Ação a ser executada quando regra é satisfeita
 */
export interface RuleAction {
  type: 'create_notification';
  notification: Partial<NotificationPayload>;
  priority?: NotificationPriority;
  delay?: number; // Em minutos
  coalesce?: boolean;
}

/**
 * Regra de notificação configurável
 */
export interface NotificationRule {
  id: string;
  name: string;
  description: string;
  category: NotificationCategory;
  enabled: boolean;
  
  // Condições (todas devem ser verdadeiras)
  conditions: RuleCondition[];
  
  // Ações
  actions: RuleAction[];
  
  // Cooldown entre execuções
  cooldownMinutes: number;
  
  // Limite de ocorrências
  maxOccurrences?: number;
  occurrenceCount?: number;
  
  // Metadados
  createdAt: string;
  updatedAt: string;
}
```

---

## 4. Tipos de Notificação Detalhados

### 4.1 Notificações de Orçamento

| Tipo | Prioridade | Gatilhos | Ações Possíveis |
|------|------------|----------|-----------------|
| Orçamento crítico | Urgent | > 100% do limite | Ver detalhes, Aumentar limite, Adicionar transação |
| Alerta de orçamento | Alta | > 80% do limite | Ver detalhes, Revisar gastos |
| Orçamento saudável | Normal | < 50% do limite | Ver detalhes, Parabenizar |
| Orçamento estourado | Urgent | = 100% do limite | Ver detalhes, Criar novo orçamento |

```typescript
// Exemplo de payload
const budgetNotification: NotificationPayload = {
  id: generateUUID(),
  profileId: 'user_123',
  category: 'budget',
  priority: 'high',
  title: 'Alerta de Orçamento',
  message: 'Você atingiu 85% do seu orçamento de Alimentação. Restam R$ 150,00.',
  timestamp: new Date().toISOString(),
  channels: ['in_app', 'push'],
  status: 'pending',
  actions: [
    {
      id: 'view_details',
      label: 'Ver Detalhes',
      primary: true,
      url: '/budgets',
    },
    {
      id: 'add_expense',
      label: 'Adicionar Despesa',
      handler: 'openExpenseModal',
    },
  ],
  data: {
    budgetId: 'budget_456',
    category: 'Alimentação',
    percentage: 85,
    remaining: 150,
    currency: 'BRL',
  },
};
```

### 4.2 Notificações de Metas

| Tipo | Prioridade | Gatilhos | Ações Possíveis |
|------|------------|----------|-----------------|
| Meta alcançada | Alta | = 100% do alvo | Ver detalhes, Compartilhar, Celebrar |
| Meta próxima | Normal | > 75% do alvo | Ver progresso, Adicionar contribuição |
| Meta atrasada | Alta | Data passed, < 50% | Ver detalhes, Ajustar meta |
| Contribuição registrada | Baixa | Nova contribuição | Ver detalhes |

### 4.3 Notificações de Transações

| Tipo | Prioridade | Gatilhos | Ações Possíveis |
|------|------------|----------|-----------------|
| Transação recorrente | Normal | Dia do vencimento | Ver detalhes, Pagar, Adiarr |
| Transação suspeita | Alta | Padrão incomum | Ver detalhes, Confirmar, Reportar |
| Transferência recebida | Normal | Nova entrada | Ver detalhes |
| Limite de cartão | Alta | Aproximando limite | Ver detalhes |

### 4.4 Notificações de Insights

| Tipo | Prioridade | Gatilhos | Ações Possíveis |
|------|------------|----------|-----------------|
| Insight de economia | Normal | Padrão identificado | Ver detalhes, Implementar |
| Comparação mensal | Normal | Fim do mês | Ver relatório |
| Anomalia detectada | Alta | Gasto incomum | Ver detalhes |
| Oportunidade | Baixa | Condição favorável | Ver detalhes |

### 4.5 Notificações de Sistema

| Tipo | Prioridade | Gatilhos | Ações Possíveis |
|------|------------|----------|-----------------|
| Manutenção programada | Normal | Agenda definida | Ver detalhes |
| Atualização disponível | Normal | Nova versão | Atualizar agora |
| Alerta de segurança | Alta | Evento crítico | Ver detalhes, Acionar |
| Sincronização pendente | Baixa | Offline por tempo | Sincronizar agora |

---

## 5. Implementação Frontend

### 5.1 Store de Notificações (Zustand)

```typescript
// src/stores/notificationsStore.ts

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { NotificationPayload, NotificationPreferences, CategoryChannelConfig } from '@/types';
import { DEFAULT_NOTIFICATION_PREFERENCES } from '@/types/notification-preferences';

interface NotificationsState {
  // Estado das notificações
  notifications: NotificationPayload[];
  unreadCount: number;
  
  // Preferências
  preferences: NotificationPreferences;
  
  // Status de conexão
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncTime: string | null;
  
  // UI State
  isCenterOpen: boolean;
  isPermissionRequested: boolean;
  
  // Ações de notificação
  addNotification: (notification: Omit<NotificationPayload, 'id' | 'timestamp' | 'status'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  dismissNotification: (id: string) => void;
  deleteNotification: (id: string) => void;
  clearAll: () => void;
  
  // Ações de preferência
  updatePreferences: (prefs: Partial<NotificationPreferences>) => void;
  toggleCategory: (category: keyof typeof DEFAULT_NOTIFICATION_PREFERENCES.categories, channel: 'in_app' | 'push') => void;
  setQuietHours: (enabled: boolean, start?: string, end?: string) => void;
  
  // Ações de sincronização
  setOnlineStatus: (status: boolean) => void;
  syncWithServer: () => Promise<void>;
  mergeServerNotifications: (serverNotifications: NotificationPayload[]) => void;
  
  // UI Actions
  openCenter: () => void;
  closeCenter: () => void;
  setPermissionRequested: (requested: boolean) => void;
}

export const useNotificationsStore = create<NotificationsState>()(
  persist(
    (set, get) => ({
      // Estado inicial
      notifications: [],
      unreadCount: 0,
      preferences: DEFAULT_NOTIFICATION_PREFERENCES,
      isOnline: true,
      isSyncing: false,
      lastSyncTime: null,
      isCenterOpen: false,
      isPermissionRequested: false,
      
      // Ações de notificação
      addNotification: (notification) => {
        const newNotification: NotificationPayload = {
          ...notification,
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          status: 'sent',
        };
        
        set((state) => ({
          notifications: [newNotification, ...state.notifications].slice(0, 100),
          unreadCount: state.unreadCount + 1,
        }));
        
        // Trigger toast se configurado
        if (get().preferences.categories[notification.category]?.channels.includes('in_app')) {
          get().triggerToast(newNotification);
        }
      },
      
      markAsRead: (id) => {
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, status: 'read' as const, readAt: new Date().toISOString() } : n
          ),
          unreadCount: Math.max(0, state.unreadCount - 1),
        }));
      },
      
      markAllAsRead: () => {
        set((state) => ({
          notifications: state.notifications.map((n) => ({
            ...n,
            status: 'read' as const,
            readAt: n.readAt || new Date().toISOString(),
          })),
          unreadCount: 0,
        }));
      },
      
      dismissNotification: (id) => {
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, status: 'dismissed' as const, dismissedAt: new Date().toISOString() } : n
          ),
        }));
      },
      
      deleteNotification: (id) => {
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
          unreadCount: state.notifications.find((n) => n.id === id && n.status !== 'read')
            ? state.unreadCount - 1
            : state.unreadCount,
        }));
      },
      
      clearAll: () => {
        set({ notifications: [], unreadCount: 0 });
      },
      
      // Ações de preferência
      updatePreferences: (prefs) => {
        set((state) => ({
          preferences: {
            ...state.preferences,
            ...prefs,
            updatedAt: new Date().toISOString(),
            version: state.preferences.version + 1,
          },
        }));
      },
      
      toggleCategory: (category, channel) => {
        set((state) => {
          const currentConfig = state.preferences.categories[category];
          const channels = currentConfig?.channels.includes(channel)
            ? currentConfig.channels.filter((c) => c !== channel)
            : [...(currentConfig?.channels || []), channel];
          
          return {
            preferences: {
              ...state.preferences,
              categories: {
                ...state.preferences.categories,
                [category]: {
                  ...currentConfig!,
                  channels,
                  enabled: channels.length > 0,
                },
              },
              updatedAt: new Date().toISOString(),
            },
          };
        });
      },
      
      setQuietHours: (enabled, start, end) => {
        set((state) => ({
          preferences: {
            ...state.preferences,
            quietHours: {
              ...state.preferences.quietHours,
              enabled,
              startTime: start ?? state.preferences.quietHours.startTime,
              endTime: end ?? state.preferences.quietHours.endTime,
            },
          },
        }));
      },
      
      // Ações de sincronização
      setOnlineStatus: (status) => {
        set({ isOnline: status });
        if (status) {
          get().syncWithServer();
        }
      },
      
      syncWithServer: async () => {
        const { isOnline, preferences } = get();
        if (!isOnline) return;
        
        set({ isSyncing: true });
        try {
          // TODO: Implementar sincronização com Supabase
          const response = await fetch('/api/notifications/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              profileId: preferences.profileId,
              lastSync: get().lastSyncTime,
              localNotifications: get().notifications,
            }),
          });
          
          if (response.ok) {
            const data = await response.json();
            get().mergeServerNotifications(data.serverNotifications);
            set({ lastSyncTime: new Date().toISOString() });
          }
        } catch (error) {
          console.error('Sync failed:', error);
        } finally {
          set({ isSyncing: false });
        }
      },
      
      mergeServerNotifications: (serverNotifications) => {
        set((state) => {
          const localIds = new Set(state.notifications.map((n) => n.id));
          const newFromServer = serverNotifications.filter((n) => !localIds.has(n.id));
          return {
            notifications: [...newFromServer, ...state.notifications].slice(0, 100),
            unreadCount: state.unreadCount + newFromServer.filter((n) => n.status !== 'read').length,
          };
        });
      },
      
      // UI Actions
      openCenter: () => set({ isCenterOpen: true }),
      closeCenter: () => set({ isCenterOpen: false }),
      setPermissionRequested: (requested) => set({ isPermissionRequested: requested }),
      
      // Helper para trigger de toast
      triggerToast: (notification) => {
        if (typeof window !== 'undefined') {
          const event = new CustomEvent('app-toast', {
            detail: {
              title: notification.title,
              message: notification.message,
              type: notification.priority === 'urgent' ? 'error' : 
                    notification.priority === 'high' ? 'warning' : 'info',
              duration: notification.priority === 'urgent' ? 10000 : 
                        notification.priority === 'high' ? 7000 : 5000,
              action: notification.actions?.[0],
            },
          });
          window.dispatchEvent(event);
        }
      },
    }),
    {
      name: 'ecofinance-notifications',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        notifications: state.notifications.slice(0, 50),
        preferences: state.preferences,
        isPermissionRequested: state.isPermissionRequested,
      }),
    }
  )
);
```

### 5.2 Componente NotificationCenter

```typescript
// src/components/notifications/NotificationCenter.tsx

import React, { useState, useMemo } from 'react';
import { useNotificationsStore } from '@/stores/notificationsStore';
import type { NotificationCategory, NotificationPayload } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  X, 
  Check, 
  CheckCheck, 
  Trash2, 
  Bell, 
  Filter,
  Search,
  Settings,
  ChevronRight
} from 'lucide-react';

const CATEGORY_CONFIG: Record<NotificationCategory, { label: string; color: string; icon: string }> = {
  budget: { label: 'Orçamentos', color: 'text-orange-600', icon: '💰' },
  goal: { label: 'Metas', color: 'text-green-600', icon: '🎯' },
  transaction: { label: 'Transações', color: 'text-blue-600', icon: '💳' },
  reminder: { label: 'Lembretes', color: 'text-purple-600', icon: '⏰' },
  report: { label: 'Relatórios', color: 'text-indigo-600', icon: '📊' },
  system: { label: 'Sistema', color: 'text-gray-600', icon: '⚙️' },
  insight: { label: 'Insights', color: 'text-teal-600', icon: '💡' },
  achievement: { label: 'Conquistas', color: 'text-amber-600', icon: '🏆' },
};

export const NotificationCenter: React.FC = () => {
  const {
    notifications,
    unreadCount,
    preferences,
    isCenterOpen,
    closeCenter,
    markAsRead,
    markAllAsRead,
    dismissNotification,
    deleteNotification,
  } = useNotificationsStore();
  
  const [activeTab, setActiveTab] = useState<NotificationCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  
  // Filtrar notificações
  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      // Filtro por categoria
      if (activeTab !== 'all' && n.category !== activeTab) return false;
      
      // Filtro por busca
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          n.title.toLowerCase().includes(query) ||
          n.message.toLowerCase().includes(query)
        );
      }
      
      return true;
    });
  }, [notifications, activeTab, searchQuery]);
  
  if (!isCenterOpen) return null;
  
  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-40"
        onClick={closeCenter}
      />
      
      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white dark:bg-gray-900 shadow-xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h2 className="text-lg font-semibold">Notificações</h2>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-600 rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={markAllAsRead}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              title="Marcar todas como lidas"
            >
              <CheckCheck className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              title="Configurações"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button
              onClick={closeCenter}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* Search */}
        <div className="p-4 border-b dark:border-gray-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar notificações..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
            />
          </div>
        </div>
        
        {/* Settings Panel */}
        {showSettings && (
          <NotificationSettingsPanel />
        )}
        
        {/* Tabs */}
        <div className="flex gap-1 p-2 border-b dark:border-gray-700 overflow-x-auto">
          <TabButton
            active={activeTab === 'all'}
            onClick={() => setActiveTab('all')}
          >
            Todas
          </TabButton>
          {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
            <TabButton
              key={key}
              active={activeTab === key}
              onClick={() => setActiveTab(key as NotificationCategory)}
            >
              {config.icon} {config.label}
            </TabButton>
          ))}
        </div>
        
        {/* Notification List */}
        <div className="flex-1 overflow-y-auto">
          {filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <Bell className="w-12 h-12 mb-4 opacity-50" />
              <p>Nenhuma notificação</p>
            </div>
          ) : (
            <div className="divide-y dark:divide-gray-800">
              {filteredNotifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={() => markAsRead(notification.id)}
                  onDismiss={() => dismissNotification(notification.id)}
                  onDelete={() => deleteNotification(notification.id)}
                  onAction={(action) => {
                    if (action.handler) {
                      // Executar handler de ação
                      window.dispatchEvent(new CustomEvent('notification-action', {
                        detail: { notificationId: notification.id, action: action.id }
                      }));
                    }
                    if (action.url) {
                      window.location.href = action.url;
                    }
                    if (action.dismissAfterAction) {
                      markAsRead(notification.id);
                    }
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

// Subcomponentes...

const NotificationItem: React.FC<{
  notification: NotificationPayload;
  onMarkAsRead: () => void;
  onDismiss: () => void;
  onDelete: () => void;
  onAction: (action: any) => void;
}> = ({ notification, onMarkAsRead, onDismiss, onDelete, onAction }) => {
  const [showActions, setShowActions] = useState(false);
  const categoryConfig = CATEGORY_CONFIG[notification.category];
  
  const isUnread = notification.status !== 'read';
  
  return (
    <div 
      className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
        isUnread ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
      }`}
      onClick={() => {
        if (isUnread) onMarkAsRead();
        setShowActions(!showActions);
      }}
    >
      <div className="flex gap-3">
        {/* Category Icon */}
        <div className={`text-xl ${categoryConfig.color}`}>
          {categoryConfig.icon}
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className={`font-medium ${isUnread ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
              {notification.title}
            </h3>
            <span className="text-xs text-gray-500 whitespace-nowrap">
              {formatDistanceToNow(new Date(notification.timestamp), { locale: ptBR, addSuffix: true })}
            </span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
            {notification.message}
          </p>
          
          {/* Actions */}
          {showActions && notification.actions && (
            <div className="flex gap-2 mt-3">
              {notification.actions.map((action) => (
                <button
                  key={action.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onAction(action);
                  }}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    action.primary
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
        
        {/* Quick Actions */}
        <div className="flex flex-col gap-1">
          {isUnread && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMarkAsRead();
              }}
              className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
              title="Marcar como lida"
            >
              <Check className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDismiss();
            }}
            className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            title="Dispensar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

const TabButton: React.FC<{
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}> = ({ children, active, onClick }) => (
  <button
    onClick={onClick}
    className={`px-3 py-1.5 text-sm rounded-lg whitespace-nowrap transition-colors ${
      active
        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
        : 'hover:bg-gray-100 dark:hover:bg-gray-800'
    }`}
  >
    {children}
  </button>
);

const NotificationSettingsPanel: React.FC = () => {
  const { preferences, updatePreferences, setQuietHours } = useNotificationsStore();
  
  return (
    <div className="p-4 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
      <h3 className="font-medium mb-3">Configurações de Notificação</h3>
      
      {/* Global Toggle */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm">Notificações ativas</span>
        <button
          onClick={() => updatePreferences({ globalEnabled: !preferences.globalEnabled })}
          className={`w-11 h-6 rounded-full transition-colors ${
            preferences.globalEnabled ? 'bg-blue-600' : 'bg-gray-300'
          }`}
        >
          <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
            preferences.globalEnabled ? 'translate-x-5' : 'translate-x-0.5'
          }`} />
        </button>
      </div>
      
      {/* Sound Toggle */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm">Som</span>
        <button
          onClick={() => updatePreferences({ soundEnabled: !preferences.soundEnabled })}
          className={`w-11 h-6 rounded-full transition-colors ${
            preferences.soundEnabled ? 'bg-blue-600' : 'bg-gray-300'
          }`}
        >
          <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
            preferences.soundEnabled ? 'translate-x-5' : 'translate-x-0.5'
          }`} />
        </button>
      </div>
      
      {/* Quiet Hours */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm">Horário de silêncio</span>
          <button
            onClick={() => setQuietHours(
              !preferences.quietHours.enabled,
              preferences.quietHours.startTime,
              preferences.quietHours.endTime
            )}
            className={`w-11 h-6 rounded-full transition-colors ${
              preferences.quietHours.enabled ? 'bg-blue-600' : 'bg-gray-300'
            }`}
          >
            <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
              preferences.quietHours.enabled ? 'translate-x-5' : 'translate-x-0.5'
            }`} />
          </button>
        </div>
        {preferences.quietHours.enabled && (
          <div className="flex gap-2 text-sm">
            <input
              type="time"
              value={preferences.quietHours.startTime}
              onChange={(e) => setQuietHours(true, e.target.value, preferences.quietHours.endTime)}
              className="px-2 py-1 border rounded dark:bg-gray-700"
            />
            <span>às</span>
            <input
              type="time"
              value={preferences.quietHours.endTime}
              onChange={(e) => setQuietHours(true, preferences.quietHours.startTime, e.target.value)}
              className="px-2 py-1 border rounded dark:bg-gray-700"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationCenter;
```

### 5.3 Componente Toast Aprimorado

```typescript
// src/components/notifications/ToastContainer.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  CheckCircle, 
  AlertTriangle, 
  AlertCircle, 
  Info,
  Bell
} from 'lucide-react';
import type { NotificationAction } from '@/types';

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
  duration = 5000,
  action,
  onClose,
  onAction,
}) => {
  const [isExiting, setIsExiting] = useState(false);
  const [progress, setProgress] = useState(100);
  
  useEffect(() => {
    // Progress bar animation
    if (duration > 0) {
      const interval = 50;
      const decrement = 100 / (duration / interval);
      const timer = setInterval(() => {
        setProgress((prev) => Math.max(0, prev - decrement));
      }, interval);
      
      return () => clearInterval(timer);
    }
  }, [duration]);
  
  useEffect(() => {
    // Auto dismiss
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
    warning: <AlertTriangle className="w-5 h-5 text-amber-500" />,
    error: <AlertCircle className="w-5 h-5 text-red-500" />,
    info: <Info className="w-5 h-5 text-blue-500" />,
  };
  
  const colors = {
    success: 'border-green-500 bg-green-50 dark:bg-green-900/20',
    warning: 'border-amber-500 bg-amber-50 dark:bg-amber-900/20',
    error: 'border-red-500 bg-red-50 dark:bg-red-900/20',
    info: 'border-blue-500 bg-blue-50 dark:bg-blue-900/20',
  };
  
  return (
    <div
      className={`
        flex items-start gap-3 p-4 rounded-lg shadow-lg border-l-4
        transform transition-all duration-300 ease-out
        ${colors[type]}
        ${isExiting ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'}
        max-w-sm w-full
      `}
    >
      {/* Icon */}
      <div className="flex-shrink-0 mt-0.5">
        {icons[type]}
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-gray-900 dark:text-white">
          {title}
        </h4>
        <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5">
          {message}
        </p>
        
        {/* Action Button */}
        {action && (
          <button
            onClick={() => onAction?.(action)}
            className="mt-2 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
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
        className="flex-shrink-0 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
      >
        <X className="w-4 h-4 text-gray-500" />
      </button>
      
      {/* Progress Bar */}
      {duration > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-transparent">
          <div 
            className={`h-full transition-all duration-50 ${
              type === 'error' ? 'bg-red-500' :
              type === 'warning' ? 'bg-amber-500' :
              type === 'success' ? 'bg-green-500' : 'bg-blue-500'
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
      const { title, message, type = 'info', duration = 5000, action } = event.detail;
      const id = crypto.randomUUID();
      
      setToasts((prev) => [...prev, { id, title, message, type, duration, action }]);
    };
    
    window.addEventListener('app-toast', handleToast as EventListener);
    return () => window.removeEventListener('app-toast', handleToast as EventListener);
  }, []);
  
  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);
  
  const handleAction = useCallback((toast: ToastItem, action: NotificationAction) => {
    if (action.handler) {
      window.dispatchEvent(new CustomEvent('notification-action', {
        detail: { notificationId: toast.id, action: action.id }
      }));
    }
    if (action.url) {
      window.location.href = action.url;
    }
    removeToast(toast.id);
  }, [removeToast]);
  
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

export default ToastContainer;
```

### 5.4 Hook useNotificationScheduler

```typescript
// src/hooks/useNotificationScheduler.ts

import { useEffect, useCallback, useRef } from 'react';
import { useNotificationsStore } from '@/stores/notificationsStore';
import type { NotificationRule, NotificationPayload } from '@/types';
import { addHours, addDays, addWeeks, startOfDay, endOfDay, isWithinInterval } from 'date-fns';

interface ScheduledNotification {
  id: string;
  notification: Omit<NotificationPayload, 'id' | 'timestamp'>;
  scheduledFor: Date;
  ruleId?: string;
}

/**
 * Hook para gerenciar agendamento de notificações
 */
export function useNotificationScheduler() {
  const { preferences, addNotification, isOnline } = useNotificationsStore();
  const scheduledRef = useRef<Map<string, ScheduledNotification>>(new Map());
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Verificar horário de silêncio
  const isInQuietHours = useCallback(() => {
    if (!preferences.quietHours.enabled) return false;
    
    const now = new Date();
    const { startTime, endTime } = preferences.quietHours;
    
    // Se horário de silêncio cruza meia-noite
    if (startTime > endTime) {
      return now >= startOfDay(now) && now >= startTime || 
             now <= endOfDay(now) && now <= endTime;
    }
    
    // Mesmo dia
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);
    
    const start = new Date(now);
    start.setHours(startHour, startMinute, 0, 0);
    
    const end = new Date(now);
    end.setHours(endHour, endMinute, 0, 0);
    
    return isWithinInterval(now, { start, end });
  }, [preferences.quietHours]);
  
  // Agendar notificação
  const schedule = useCallback((notification: Omit<NotificationPayload, 'id' | 'timestamp'>, delayMs: number, ruleId?: string) => {
    const id = crypto.randomUUID();
    const scheduledFor = new Date(Date.now() + delayMs);
    
    const scheduled: ScheduledNotification = {
      id,
      notification,
      scheduledFor,
      ruleId,
    };
    
    scheduledRef.current.set(id, scheduled);
    
    // Iniciar timer
    const timer = setTimeout(() => {
      if (!isInQuietHours()) {
        addNotification(notification);
      }
      scheduledRef.current.delete(id);
    }, delayMs);
    
    timerRef.current = timer;
    
    return id;
  }, [addNotification, isInQuietHours]);
  
  // Agendar para hora específica
  const scheduleAt = useCallback((notification: Omit<NotificationPayload, 'id' | 'timestamp'>, date: Date, ruleId?: string) => {
    const delayMs = date.getTime() - Date.now();
    if (delayMs <= 0) {
      addNotification(notification);
      return null;
    }
    return schedule(notification, delayMs, ruleId);
  }, [addNotification, schedule]);
  
  // Cancelar agendamento
  const cancel = useCallback((id: string) => {
    const scheduled = scheduledRef.current.get(id);
    if (scheduled) {
      scheduledRef.current.delete(id);
      // Timer não pode ser cancelado diretamente, mas a notificação não será adicionada
    }
  }, []);
  
  // Limpar todos os agendamentos
  const clearAll = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    scheduledRef.current.clear();
  }, []);
  
  // Cleanup no unmount
  useEffect(() => {
    return () => {
      clearAll();
    };
  }, [clearAll]);
  
  return {
    schedule,
    scheduleAt,
    cancel,
    clearAll,
    isInQuietHours,
    pendingCount: scheduledRef.current.size,
  };
}
```

---

## 6. Sistema de Push Notifications

### 6.1 Service Worker Aprimorado

```typescript
// public/sw.js

const CACHE_NAME = 'ecofinance-notifications-v1';

// URLs para cache
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/notification-icon.png',
  '/icons/badge-icon.png',
];

// Instalar service worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Ativar service worker
self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Receber push notification
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  const data = event.data.json();
  
  const options = {
    body: data.message || 'Nova notificação do EcoFinance',
    icon: data.icon || '/icons/notification-icon.png',
    badge: data.badge || '/icons/badge-icon.png',
    tag: data.tag || 'default',
    renotify: data.replaceOldNotifications || true,
    requireInteraction: data.priority === 'urgent' || data.priority === 'high',
    silent: data.silent || false,
    vibrate: data.vibrate || [200, 100, 200],
    data: {
      url: data.url || '/',
      notificationId: data.id,
      timestamp: Date.now(),
      ...data.data,
    },
    actions: data.actions?.map((action, index) => ({
      action: String(index),
      title: action.label,
      icon: action.icon,
    })) || [],
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
  
  // Atualizar badge
  updateBadgeCount();
});

// Clique em notificação
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const data = event.notification.data;
  const url = data?.url || '/';
  
  // Focar na janela existente ou abrir nova
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Tentar focar janela existente
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      // Abrir nova janela
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
  
  // Reportar clique para analytics
  reportNotificationClick(data?.notificationId, event.action);
});

// Ação em notificação (legacy)
self.addEventListener('notificationclose', (event) => {
  const data = event.notification.data;
  reportNotificationDismiss(data?.notificationId);
});

// Atualizar contagem de badge
async function updateBadgeCount() {
  try {
    const cache = await caches.open(CACHE_NAME);
    const response = await cache.match('/api/notifications/unread-count');
    
    if (response) {
      const data = await response.json();
      const count = data.count || 0;
      
      // Atualizar badge do navegador
      if (navigator.setAppBadge) {
        navigator.setAppBadge(count);
      } else if (navigator.setBadge) {
        navigator.setBadge(count);
      }
    }
  } catch (error) {
    console.error('Failed to update badge:', error);
  }
}

// Reportar evento de notificação
async function reportNotificationClick(notificationId, action) {
  try {
    await fetch('/api/notifications/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'click',
        notificationId,
        action,
        timestamp: Date.now(),
      }),
    });
  } catch (error) {
    console.error('Failed to report notification click:', error);
  }
}

async function reportNotificationDismiss(notificationId) {
  try {
    await fetch('/api/notifications/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'dismiss',
        notificationId,
        timestamp: Date.now(),
      }),
    });
  } catch (error) {
    console.error('Failed to report notification dismiss:', error);
  }
}

// Sincronização em segundo plano
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-notifications') {
    event.waitUntil(syncNotifications());
  }
});

async function syncNotifications() {
  try {
    const response = await fetch('/api/notifications/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lastSync: localStorage.getItem('lastNotificationSync'),
      }),
    });
    
    if (response.ok) {
      localStorage.setItem('lastNotificationSync', Date.now().toString());
    }
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}
```

### 6.2 Backend Push Service

```typescript
// server/push-service.ts (exemplo para Node.js)

import webPush from 'web-push';
import type { NotificationPayload } from '../src/types';

// Configurar VAPID keys
const vapidKeys = {
  publicKey: process.env.VAPID_PUBLIC_KEY!,
  privateKey: process.env.VAPID_PRIVATE_KEY!,
};

webPush.setVapidDetails(
  'mailto:contato@ecofinance.app',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

// Store de assinaturas (em produção, usar banco de dados)
const subscriptions = new Map<string, webPush.PushSubscription[]>();

/**
 * Inscrever dispositivo para push notifications
 */
export async function subscribe(
  userId: string,
  subscription: webPush.PushSubscription
): Promise<void> {
  const userSubscriptions = subscriptions.get(userId) || [];
  
  // Verificar se já existe
  const exists = userSubscriptions.some(
    (s) => s.endpoint === subscription.endpoint
  );
  
  if (!exists) {
    userSubscriptions.push(subscription);
    subscriptions.set(userId, userSubscriptions);
  }
  
  // Persistir no banco de dados
  await saveSubscriptionToDatabase(userId, subscription);
}

/**
 * Cancelar assinatura
 */
export async function unsubscribe(
  userId: string,
  endpoint: string
): Promise<void> {
  const userSubscriptions = subscriptions.get(userId) || [];
  const filtered = userSubscriptions.filter((s) => s.endpoint !== endpoint);
  
  if (filtered.length === 0) {
    subscriptions.delete(userId);
  } else {
    subscriptions.set(userId, filtered);
  }
  
  await removeSubscriptionFromDatabase(userId, endpoint);
}

/**
 * Enviar notificação para usuário
 */
export async function sendPushNotification(
  userId: string,
  notification: NotificationPayload
): Promise<{ success: number; failed: number; errors: string[] }> {
  const userSubscriptions = subscriptions.get(userId) || [];
  const results = await Promise.allSettled(
    userSubscriptions.map((subscription) =>
      webPush.sendNotification(subscription, JSON.stringify(notification))
    )
  );
  
  let success = 0;
  let failed = 0;
  const errors: string[] = [];
  
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      success++;
    } else {
      failed++;
      const error = result.reason as Error;
      errors.push(`Subscription ${index}: ${error.message}`);
      
      // Se assinatura expirada, remover
      if (error.statusCode === 410) {
        const expiredSubscription = userSubscriptions[index];
        if (expiredSubscription) {
          unsubscribe(userId, expiredSubscription.endpoint);
        }
      }
    }
  });
  
  return { success, failed, errors };
}

/**
 * Enviar notificação para múltiplos usuários
 */
export async function sendBulkPushNotification(
  userIds: string[],
  notification: NotificationPayload
): Promise<Map<string, { success: number; failed: number; errors: string[] }>> {
  const results = new Map<string, { success: number; failed: number; errors: string[] }>();
  
  await Promise.all(
    userIds.map(async (userId) => {
      const result = await sendPushNotification(userId, notification);
      results.set(userId, result);
    })
  );
  
  return results;
}

// Database helpers (implementar conforme banco usado)
async function saveSubscriptionToDatabase(
  userId: string,
  subscription: webPush.PushSubscription
): Promise<void> {
  // Implementar inserção no banco
}

async function removeSubscriptionFromDatabase(
  userId: string,
  endpoint: string
): Promise<void> {
  // Implementar remoção do banco
}
```

---

## 7. Engine de Regras e Triggers

### 7.1 Sistema de Regras

```typescript
// src/engine/notification-engine.ts

import type { NotificationRule, NotificationPayload, RuleCondition } from '@/types';
import { useNotificationsStore } from '@/stores/notificationsStore';
import { useNotificationScheduler } from '@/hooks/useNotificationScheduler';

interface RuleContext {
  budgets: BudgetStatus[];
  goals: Goal[];
  transactions: Transaction[];
  userProfile: UserProfile;
  date: Date;
  [key: string]: unknown;
}

/**
 * Engine principal de processamento de regras de notificação
 */
export class NotificationEngine {
  private rules: NotificationRule[] = [];
  private context: RuleContext | null = null;
  private scheduler = useNotificationScheduler.getState();
  
  constructor() {
    this.loadRules();
  }
  
  // Carregar regras do armazenamento
  private async loadRules(): Promise<void> {
    // TODO: Carregar do backend ou localStorage
    this.rules = this.getDefaultRules();
  }
  
  // Regras padrão
  private getDefaultRules(): NotificationRule[] {
    return [
      {
        id: 'budget-80-percent',
        name: 'Orçamento em 80%',
        description: 'Notificar quando orçamento atingir 80% do limite',
        category: 'budget',
        enabled: true,
        conditions: [
          {
            type: 'percentage',
            field: 'spent',
            operator: 'gt',
            value: 80,
          },
        ],
        actions: [
          {
            type: 'create_notification',
            notification: {
              title: 'Alerta de Orçamento',
              message: 'Você atingiu {{percent}}% do seu orçamento de {{category}}',
              category: 'budget',
              priority: 'high',
              channels: ['in_app', 'push'],
              data: {
                budgetId: '{{budgetId}}',
                category: '{{category}}',
                percent: '{{percent}}',
              },
            },
            priority: 'high',
          },
        ],
        cooldownMinutes: 360, // Uma vez por dia
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'budget-100-percent',
        name: 'Orçamento Estourado',
        description: 'Notificar quando orçamento atingir 100% do limite',
        category: 'budget',
        enabled: true,
        conditions: [
          {
            type: 'percentage',
            field: 'spent',
            operator: 'gt',
            value: 100,
          },
        ],
        actions: [
          {
            type: 'create_notification',
            notification: {
              title: 'Orçamento Estourado!',
              message: 'Você ultrapassou o limite de {{category}}. Gasto: {{spent}}, Limite: {{limit}}',
              category: 'budget',
              priority: 'urgent',
              channels: ['in_app', 'push'],
              actions: [
                {
                  id: 'view_budget',
                  label: 'Ver Detalhes',
                  url: '/budgets',
                  primary: true,
                },
                {
                  id: 'adjust_budget',
                  label: 'Ajustar Orçamento',
                  handler: 'openBudgetModal',
                },
              ],
            },
            priority: 'urgent',
          },
        ],
        cooldownMinutes: 720, // Duas vezes por dia
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'goal-completed',
        name: 'Meta Atingida',
        description: 'Notificar quando uma meta for alcançada',
        category: 'goal',
        enabled: true,
        conditions: [
          {
            type: 'threshold',
            field: 'current',
            operator: 'eq',
            value: 100, // Vai ser interpolado com o target
          },
        ],
        actions: [
          {
            type: 'create_notification',
            notification: {
              title: 'Meta Atingida! 🎉',
              message: 'Parabéns! Você completou a meta "{{name}}"',
              category: 'goal',
              priority: 'high',
              channels: ['in_app', 'push'],
              actions: [
                {
                  id: 'celebrate',
                  label: 'Celebrar',
                  handler: 'showCelebration',
                  dismissAfterAction: true,
                },
                {
                  id: 'view_goal',
                  label: 'Ver Detalhes',
                  url: '/goals',
                },
                {
                  id: 'share',
                  label: 'Compartilhar',
                  handler: 'shareAchievement',
                },
              ],
            },
            priority: 'high',
          },
        ],
        cooldownMinutes: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'weekly-summary',
        name: 'Resumo Semanal',
        description: 'Enviar resumo financeiro semanal',
        category: 'report',
        enabled: true,
        conditions: [
          {
            type: 'recurring',
            interval: 7 * 24 * 60 * 60 * 1000, // 7 dias em ms
          },
        ],
        actions: [
          {
            type: 'create_notification',
            notification: {
              title: 'Seu Resumo Semanal',
              message: 'Você gastou {{totalSpent}} esta semana. Clique para ver os detalhes.',
              category: 'report',
              priority: 'normal',
              channels: ['in_app', 'email'],
              actions: [
                {
                  id: 'view_report',
                  label: 'Ver Relatório',
                  url: '/reports?period=week',
                  primary: true,
                },
              ],
            },
            priority: 'normal',
            delay: 60, // 1 minuto após trigger
          },
        ],
        cooldownMinutes: 10080, // Uma vez por semana
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
  }
  
  // Atualizar contexto
  setContext(context: RuleContext): void {
    this.context = context;
  }
  
  // Processar regras
  async processRules(): Promise<NotificationPayload[]> {
    if (!this.context) {
      console.warn('NotificationEngine: Context not set');
      return [];
    }
    
    const notifications: NotificationPayload[] = [];
    
    for (const rule of this.rules) {
      if (!rule.enabled) continue;
      
      try {
        const matches = await this.evaluateRule(rule, this.context);
        
        if (matches) {
          // Verificar cooldown
          if (this.isInCooldown(rule)) continue;
          
          // Gerar notificações das ações
          for (const action of rule.actions) {
            if (action.type === 'create_notification') {
              const notification = this.buildNotification(action, this.context);
              notifications.push(notification);
              
              // Atualizar cooldown
              this.updateCooldown(rule);
            }
          }
        }
      } catch (error) {
        console.error(`Error processing rule ${rule.id}:`, error);
      }
    }
    
    return notifications;
  }
  
  // Avaliar se regra é satisfeita
  private async evaluateRule(rule: NotificationRule, context: RuleContext): Promise<boolean> {
    // Todas as condições devem ser verdadeiras
    for (const condition of rule.conditions) {
      if (!(await this.evaluateCondition(condition, context))) {
        return false;
      }
    }
    return true;
  }
  
  // Avaliar condição individual
  private async evaluateCondition(condition: RuleCondition, context: RuleContext): Promise<boolean> {
    switch (condition.type) {
      case 'threshold': {
        const value = this.getNestedValue(context, condition.field);
        return this.compareValues(value, condition.operator, condition.value);
      }
      
      case 'percentage': {
        const budget = context.budgets.find((b) => b.category === condition.field);
        if (!budget) return false;
        
        const percent = (budget.spent / budget.limit) * 100;
        return this.compareValues(percent, condition.operator, condition.value);
      }
      
      case 'date': {
        const value = this.getNestedValue(context, condition.field);
        const dateValue = new Date(value);
        
        switch (condition.operator) {
          case 'eq':
            return dateValue.toDateString() === new Date(condition.value).toDateString();
          case 'before':
            return dateValue < new Date(condition.value);
          case 'after':
            return dateValue > new Date(condition.value);
          default:
            return false;
        }
      }
      
      case 'recurring': {
        // Verificar se tempo desde última execução >= intervalo
        const lastRun = localStorage.getItem(`rule_${rule.id}_lastRun`);
        if (!lastRun) return true;
        
        const elapsed = Date.now() - parseInt(lastRun);
        return elapsed >= (condition.interval || 0);
      }
      
      default:
        return false;
    }
  }
  
  // Comparar valores
  private compareValues(a: number, operator: string, b: number): boolean {
    switch (operator) {
      case 'gt': return a > b;
      case 'lt': return a < b;
      case 'eq': return a === b;
      case 'gte': return a >= b;
      case 'lte': return a <= b;
      default: return false;
    }
  }
  
  // Obter valor aninhado
  private getNestedValue(obj: object, path: string): unknown {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }
  
  // Construir notificação
  private buildNotification(action: { notification: Partial<NotificationPayload> }, context: RuleContext): NotificationPayload {
    const notification = action.notification;
    
    // Interpolação de variáveis
    const title = this.interpolate(notification.title || '', context);
    const message = this.interpolate(notification.message || '', context);
    
    return {
      id: crypto.randomUUID(),
      profileId: context.userProfile.id,
      title,
      message,
      category: notification.category || 'system',
      priority: notification.priority || 'normal',
      timestamp: new Date().toISOString(),
      channels: notification.channels || ['in_app'],
      status: 'pending',
      actions: notification.actions,
      url: notification.url,
      data: notification.data ? this.interpolateObject(notification.data, context) : undefined,
    };
  }
  
  // Interpolação de strings
  private interpolate(template: string, context: RuleContext): string {
    return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
      const value = this.getNestedValue(context, path.trim());
      return value !== undefined ? String(value) : match;
    });
  }
  
  // Interpolação de objetos
  private interpolateObject(obj: Record<string, unknown>, context: RuleContext): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        result[key] = this.interpolate(value, context);
      } else {
        result[key] = value;
      }
    }
    
    return result;
  }
  
  // Verificar cooldown
  private isInCooldown(rule: NotificationRule): boolean {
    const lastRun = localStorage.getItem(`rule_${rule.id}_lastRun`);
    if (!lastRun) return false;
    
    const elapsed = Date.now() - parseInt(lastRun);
    return elapsed < rule.cooldownMinutes * 60 * 1000;
  }
  
  // Atualizar timestamp de cooldown
  private updateCooldown(rule: NotificationRule): void {
    localStorage.setItem(`rule_${rule.id}_lastRun`, Date.now().toString());
    
    // Atualizar contador de ocorrências
    const count = parseInt(localStorage.getItem(`rule_${rule.id}_count`) || '0');
    localStorage.setItem(`rule_${rule.id}_count`, String(count + 1));
  }
}

// Singleton instance
let engineInstance: NotificationEngine | null = null;

export function getNotificationEngine(): NotificationEngine {
  if (!engineInstance) {
    engineInstance = new NotificationEngine();
  }
  return engineInstance;
}
```

---

## 8. Banco de Dados Supabase

### 8.1 Schema de Notificações

```sql
-- Tabela de notificações
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Conteúdo
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    short_message VARCHAR(100),
    
    -- Classificação
    category VARCHAR(50) NOT NULL,
    priority VARCHAR(20) DEFAULT 'normal',
    tags TEXT[],
    
    -- Metadados
    created_at TIMESTAMPTZ DEFAULT NOW(),
    read_at TIMESTAMPTZ,
    dismissed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    
    -- Entrega
    channels TEXT[] DEFAULT ARRAY['in_app'],
    status VARCHAR(20) DEFAULT 'pending',
    
    -- Ações
    actions JSONB,
    url VARCHAR(500),
    
    -- Visual
    icon VARCHAR(500),
    image VARCHAR(500),
    color VARCHAR(20),
    
    -- Dados contextuais
    data JSONB DEFAULT '{}',
    
    -- Device info para push
    device_id VARCHAR(100),
    
    -- Soft delete
    deleted_at TIMESTAMPTZ
);

-- Index para performance
CREATE INDEX idx_notifications_profile_created ON notifications(profile_id, created_at DESC);
CREATE INDEX idx_notifications_profile_status ON notifications(profile_id, status) WHERE status = 'pending';
CREATE INDEX idx_notifications_profile_category ON notifications(profile_id, category);
CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);

-- Tabela de preferências de notificação
CREATE TABLE notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Configurações globais
    global_enabled BOOLEAN DEFAULT true,
    sound_enabled BOOLEAN DEFAULT true,
    vibration_enabled BOOLEAN DEFAULT true,
    auto_dismissing BOOLEAN DEFAULT true,
    auto_dismiss_delay INTEGER DEFAULT 5,
    
    -- Horário de silêncio
    quiet_hours_enabled BOOLEAN DEFAULT false,
    quiet_hours_start TIME DEFAULT '22:00',
    quiet_hours_end TIME DEFAULT '08:00',
    quiet_hours_timezone VARCHAR(50) DEFAULT 'America/Sao_Paulo',
    quiet_hours_exclude_weekends BOOLEAN DEFAULT true,
    
    -- Configurações por categoria (JSONB para flexibilidade)
    category_settings JSONB DEFAULT '{
        "budget": { "enabled": true, "channels": ["in_app", "push"] },
        "goal": { "enabled": true, "channels": ["in_app", "push"] },
        "transaction": { "enabled": true, "channels": ["in_app"] },
        "reminder": { "enabled": true, "channels": ["in_app", "push"] },
        "report": { "enabled": true, "channels": ["in_app", "email"] },
        "system": { "enabled": true, "channels": ["in_app"] },
        "insight": { "enabled": true, "channels": ["in_app"] },
        "achievement": { "enabled": true, "channels": ["in_app", "push"] }
    }',
    
    -- Configurações de push
    push_enabled BOOLEAN DEFAULT true,
    push_show_preview VARCHAR(20) DEFAULT 'always',
    push_replace_old BOOLEAN DEFAULT true,
    
    -- Configurações de resumo
    summary_enabled BOOLEAN DEFAULT true,
    summary_frequency VARCHAR(20) DEFAULT 'weekly',
    summary_day_of_week INTEGER DEFAULT 1,
    summary_day_of_month INTEGER DEFAULT 1,
    summary_time TIME DEFAULT '09:00',
    summary_categories TEXT[],
    
    -- Privacidade
    hide_amounts BOOLEAN DEFAULT false,
    hide_descriptions BOOLEAN DEFAULT false,
    
    -- Metadados
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    version INTEGER DEFAULT 1,
    
    UNIQUE(user_id, profile_id)
);

-- Tabela de assinaturas push
CREATE TABLE push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Subscription data
    endpoint TEXT NOT NULL,
    keys JSONB NOT NULL,
    
    -- Device info
    device_id VARCHAR(100),
    device_name VARCHAR(255),
    device_type VARCHAR(50),
    browser_name VARCHAR(100),
    browser_version VARCHAR(50),
    
    -- Status
    active BOOLEAN DEFAULT true,
    last_used_at TIMESTAMPTZ,
    
    -- Metadados
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(endpoint)
);

CREATE INDEX idx_push_subscriptions_user ON push_subscriptions(user_id);
CREATE INDEX idx_push_subscriptions_profile ON push_subscriptions(profile_id);

-- Tabela de tracking de notificações
CREATE TABLE notification_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    event_type VARCHAR(50) NOT NULL, -- sent, delivered, read, clicked, dismissed
    event_timestamp TIMESTAMPTZ DEFAULT NOW(),
    
    -- Contexto
    device_id VARCHAR(100),
    platform VARCHAR(50),
    browser VARCHAR(100),
    
    -- Dados adicionais
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_notification_analytics_notification ON notification_analytics(notification_id);
CREATE INDEX idx_notification_analytics_user ON notification_analytics(user_id);
CREATE INDEX idx_notification_analytics_event ON notification_analytics(event_type, event_timestamp);

-- Tabela de regras de notificação (customizáveis pelo usuário)
CREATE TABLE notification_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    
    enabled BOOLEAN DEFAULT true,
    
    conditions JSONB NOT NULL,
    actions JSONB NOT NULL,
    
    cooldown_minutes INTEGER DEFAULT 60,
    max_occurrences INTEGER,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Funções e triggers para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_notifications_updated_at
    BEFORE UPDATE ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_preferences_updated_at
    BEFORE UPDATE ON notification_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_push_subscriptions_updated_at
    BEFORE UPDATE ON push_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

### 8.2 Row Level Security (RLS)

```sql
-- RLS para notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
    ON notifications FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notifications"
    ON notifications FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
    ON notifications FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications"
    ON notifications FOR DELETE
    USING (auth.uid() = user_id);

-- RLS para notification_preferences
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own preferences"
    ON notification_preferences FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own preferences"
    ON notification_preferences FOR ALL
    USING (auth.uid() = user_id);

-- RLS para push_subscriptions
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own push subscriptions"
    ON push_subscriptions FOR ALL
    USING (auth.uid() = user_id);

-- RLS para notification_rules
ALTER TABLE notification_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own rules"
    ON notification_rules FOR ALL
    USING (auth.uid() = user_id);
```

### 8.3 Realtime Subscription

```sql
-- Habilitar realtime para notifications
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE notification_analytics;
```

---

## 9. Estratégia de Implementação em Fases

### Fase 1: Fundação (Semanas 1-2)

| Tarefa | Duração | Dependência |
|--------|---------|-------------|
| Criar types e interfaces TypeScript | 2 dias | - |
| Implementar nova store Zustand | 3 dias | Types |
| Migrar módulo legacy para React | 2 dias | Store |
| Configurar IndexedDB para cache | 2 dias | - |
| Configurar Supabase schema | 1 dia | - |

**Entregáveis:**
- [`src/types/notifications.ts`](src/types/notifications.ts) - Types completos
- [`src/stores/notificationsStore.ts`](src/stores/notificationsStore.ts) - Store com persistência
- Schema Supabase implementado

### Fase 2: Interface do Usuário (Semanas 3-4)

| Tarefa | Duração | Dependência |
|--------|---------|-------------|
| Implementar NotificationCenter | 4 dias | Store |
| Implementar ToastContainer | 2 dias | Store |
| Criar NotificationSettings | 3 dias | Store |
| Adicionar animações Framer Motion | 2 dias | Componentes |
| Implementar filtros e busca | 2 dias | NotificationCenter |

**Entregáveis:**
- [`src/components/notifications/NotificationCenter.tsx`](src/components/notifications/NotificationCenter.tsx)
- [`src/components/notifications/ToastContainer.tsx`](src/components/notifications/ToastContainer.tsx)
- Painel de configurações completo

### Fase 3: Push Notifications (Semanas 5-6)

| Tarefa | Duração | Dependência |
|--------|---------|-------------|
| Configurar VAPID keys | 1 dia | - |
| Atualizar Service Worker | 2 dias | - |
| Implementar backend push service | 3 dias | Schema |
| Integrar hook usePushNotifications | 2 dias | Backend |
| Implementar device management | 2 dias | Push service |

**Entregáveis:**
- Keys configuradas no .env
- [`public/sw.js`](public/sw.js) atualizado
- Backend push service operacional
- Sincronização push funcionando

### Fase 4: Engine de Regras (Semanas 7-8)

| Tarefa | Duração | Dependência |
|--------|---------|-------------|
| Implementar NotificationEngine | 4 dias | - |
| Criar regras default | 2 dias | Engine |
| Implementar scheduler | 2 dias | Engine |
| Adicionar regras customizáveis | 3 dias | Backend |
| Testes de integração | 2 dias | - |

**Entregáveis:**
- [`src/engine/notification-engine.ts`](src/engine/notification-engine.ts)
- Sistema de regras completo
- Resumos automatizados funcionando

### Fase 5: Inteligência e Analytics (Semanas 9-10)

| Tarefa | Duração | Dependência |
|--------|---------|-------------|
| Implementar notification analytics | 3 dias | Schema |
| Criar dashboard de métricas | 3 dias | Analytics |
| Implementar insights contextuais | 4 dias | Analytics |
| A/B testing de notificações | 3 dias | Analytics |
| Otimização de performance | 2 dias | - |

**Entregáveis:**
- Dashboard de métricas de notificação
- Sistema de insights baseado em ML/heurísticas
- A/B testing framework

---

## 10. Performance e Otimização

### 10.1 Estratégias de Otimização

| Estratégia | Implementação | Ganho Esperado |
|------------|---------------|----------------|
| **Virtual Scrolling** | Para listas > 100 notificações | ~80% memória |
| **Lazy Loading** | Carregar componentes sob demanda | ~50% tempo inicial |
| **Debouncing** | Para buscas e filtros | UI responsiva |
| **Memoização** | React.memo, useMemo | Re-renders mínimos |
| **IndexedDB** | Persistência eficiente | ~10x vs localStorage |
| **Compression** | Comprimir payloads | ~60% bandwidth |

### 10.2 Limites e Thresholds

```typescript
// src/config/notifications.ts

export const NOTIFICATION_LIMITS = {
  // Máximo de notificações armazenadas localmente
  maxLocalNotifications: 100,
  
  // Máximo de notificações por sincronização
  maxSyncBatchSize: 50,
  
  // Tempo máximo de retenção (30 dias)
  retentionDays: 30,
  
  // Limites por categoria por dia
  dailyLimits: {
    budget: 5,
    goal: 3,
    transaction: 10,
    reminder: 5,
    report: 1,
    system: 3,
    insight: 5,
    achievement: 2,
  },
  
  // Cooldowns mínimos (minutos)
  minCooldowns: {
    budget: 30,
    goal: 60,
    transaction: 5,
    reminder: 15,
    report: 10080, // 1 semana
    system: 10,
    insight: 60,
    achievement: 0,
  },
};

export const PERFORMANCE_THRESHOLDS = {
  // Renderização máxima esperada (ms)
  renderTime: 16, // 60fps
  
  // Tempo de resposta para interações (ms)
  interactionResponse: 100,
  
  // Tempo para sincronização (ms)
  syncTimeout: 5000,
  
  // Tamanho máximo de payload (KB)
  maxPayloadSize: 10,
};
```

---

## 11. Segurança e Privacidade

### 11.1 Medidas de Segurança

```typescript
// src/security/notification-security.ts

/**
 * Sanitização de notificações
 */
export function sanitizeNotification(notification: NotificationPayload): NotificationPayload {
  return {
    ...notification,
    title: sanitizeString(notification.title),
    message: sanitizeString(notification.message),
    shortMessage: notification.shortMessage ? sanitizeString(notification.shortMessage) : undefined,
    url: sanitizeUrl(notification.url),
    data: sanitizeObject(notification.data),
    actions: notification.actions?.map((action) => ({
      ...action,
      label: sanitizeString(action.label),
      url: action.url ? sanitizeUrl(action.url) : undefined,
      handler: sanitizeHandler(action.handler),
    })),
  };
}

/**
 * Sanitizar string contra XSS
 */
function sanitizeString(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Validar URL
 */
function sanitizeUrl(url?: string): string | undefined {
  if (!url) return undefined;
  
  try {
    const parsed = new URL(url, window.location.origin);
    // Apenas URLs permitidas
    const allowedProtocols = ['http:', 'https:'];
    if (!allowedProtocols.includes(parsed.protocol)) {
      return undefined;
    }
    return parsed.toString();
  } catch {
    return undefined;
  }
}

/**
 * Validar nome de handler
 */
function sanitizeHandler(handler?: string): string | undefined {
  if (!handler) return undefined;
  
  // Apenas caracteres alfanuméricos e underscores
  if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(handler)) {
    return handler;
  }
  return undefined;
}

/**
 * Sanitizar objeto
 */
function sanitizeObject(obj?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!obj) return undefined;
  
  const sanitized: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const sanitizedKey = sanitizeString(key);
    
    if (typeof value === 'string') {
      sanitized[sanitizedKey] = sanitizeString(value);
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      sanitized[sanitizedKey] = value;
    } else if (Array.isArray(value)) {
      sanitized[sanitizedKey] = value; // Arrays requerem sanitização mais complexa
    } else if (typeof value === 'object') {
      sanitized[sanitizedKey] = sanitizeObject(value as Record<string, unknown>);
    }
  }
  
  return sanitized;
}

/**
 * Verificar privacidade de dados
 */
export function applyPrivacyFilters(
  notification: NotificationPayload,
  privacySettings: { hideAmounts: boolean; hideDescriptions: boolean }
): NotificationPayload {
  if (privacySettings.hideAmounts) {
    notification = {
      ...notification,
      message: notification.message.replace(/R\$\s*[\d.,]+/g, 'R$ ***'),
      data: {
        ...notification.data,
        amount: '***',
        previousAmount: '***',
      },
    };
  }
  
  if (privacySettings.hideDescriptions) {
    notification = {
      ...notification,
      message: 'Nova atividade registrada em sua conta',
    };
  }
  
  return notification;
}
```

---

## 12. Métricas e Monitoramento

### 12.1 KPIs de Notificação

| Métrica | Descrição | Meta |
|---------|-----------|------|
| Taxa de Entrega | % de notificações entregues com sucesso | > 99% |
| Taxa de Abertura | % de notificações abertas | > 40% |
| Tempo até Abertura | Tempo médio entre entrega e abertura | < 5 min |
| Taxa de Rejeição | % de notificações dispensadas | < 20% |
| Opt-out Rate | % de usuários que desativam notificações | < 5% |
| ROI de Engajamento | Aumento de retenção com notificações | > 15% |

### 12.2 Dashboard de Analytics

```typescript
// src/components/notifications/NotificationAnalytics.tsx

interface NotificationAnalytics {
  // Counts
  totalSent: number;
  totalDelivered: number;
  totalRead: number;
  totalClicked: number;
  totalDismissed: number;
  
  // Rates
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  dismissRate: number;
  
  // By Category
  byCategory: Record<string, CategoryMetrics>;
  
  // By Channel
  byChannel: Record<string, ChannelMetrics>;
  
  // Trends
  dailyTrend: DailyMetric[];
  
  // Engagement
  avgTimeToOpen: number;
  topPerformingNotifications: NotificationMetric[];
}

interface CategoryMetrics {
  sent: number;
  delivered: number;
  read: number;
  clicked: number;
  openRate: number;
}

interface ChannelMetrics {
  sent: number;
  delivered: number;
  read: number;
  cost?: number;
}

interface DailyMetric {
  date: string;
  sent: number;
  delivered: number;
  read: number;
  clicked: number;
}

interface NotificationMetric {
  id: string;
  title: string;
  category: string;
  sentAt: string;
  openRate: number;
  clickRate: number;
}
```

---

## 13. Testes

### 13.1 Estratégia de Testes

```typescript
// src/tests/notifications.test.ts

describe('Notification System', () => {
  describe('Notification Store', () => {
    it('should add notification with correct structure', () => {
      const store = useNotificationsStore.getState();
      
      store.addNotification({
        title: 'Test',
        message: 'Test message',
        category: 'budget',
        priority: 'high',
        channels: ['in_app'],
      });
      
      const notifications = useNotificationsStore.getState().notifications;
      expect(notifications.length).toBeGreaterThan(0);
      expect(notifications[0].title).toBe('Test');
    });
    
    it('should mark notification as read', () => {
      const store = useNotificationsStore.getState();
      const id = store.notifications[0]?.id;
      
      if (id) {
        store.markAsRead(id);
        const notification = store.notifications.find((n) => n.id === id);
        expect(notification?.status).toBe('read');
      }
    });
    
    it('should update unread count correctly', () => {
      const count = useNotificationsStore.getState().unreadCount;
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });
  
  describe('Notification Engine', () => {
    it('should evaluate conditions correctly', () => {
      const engine = getNotificationEngine();
      engine.setContext({
        budgets: [{ category: 'Food', spent: 85, limit: 100 }],
        goals: [],
        transactions: [],
        userProfile: { id: 'test' },
        date: new Date(),
      });
      
      // Condição: percentage > 80
      expect(engine.evaluateCondition(
        { type: 'percentage', field: 'Food', operator: 'gt', value: 80 },
        { budgets: [{ category: 'Food', spent: 85, limit: 100 }] }
      )).toBe(true);
    });
  });
  
  describe('Toast Component', () => {
    it('should render with correct type', () => {
      // Test render
    });
    
    it('should auto-dismiss after duration', () => {
      // Test auto dismiss
    });
  });
});
```

---

## 14. Considerações Finais

### 14.1 Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Usuários desativam notificações | Média | Alto | Oferecer valor claro, granularidade de preferências |
| Spam de notificações | Média | Alto | Limites por categoria, cooldown inteligente |
| Performance degradada | Baixa | Médio | Virtual scrolling, lazy loading |
| Falhas de sincronização | Baixa | Médio | Retry logic, conflict resolution |
| Privacidade de dados | Baixa | Crítico | Criptografia, sanitização, filtros de privacidade |

### 14.2 Próximos Passos

1. **Revisão do plano** - Validar com stakeholders
2. **Setup do ambiente** - Configurar Supabase, gerar VAPID keys
3. **Iniciar Fase 1** - Types, store, schema
4. **Implementação incremental** - Deploy progressivo
5. **Monitoramento** - Acompanhar métricas desde o início

### 14.3 Recursos Adicionais

- [Web Push API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [Service Worker Guide](https://developer.chrome.com/docs/workbox/service-worker-overview/)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)
- [Zustand Documentation](https://github.com/pmndrs/zustand)

---

## Referências dos Arquivos do Projeto

| Arquivo | Propósito |
|---------|-----------|
| [`js/modules/notificacoes.js`](js/modules/notificacoes.js) | Sistema legacy atual |
| [`src/hooks/usePushNotifications.ts`](src/hooks/usePushNotifications.ts) | Hook de push existente |
| [`src/stores/notificationsStore.ts`](src/stores/notificationsStore.ts) | Nova store (implementar) |
| [`src/components/notifications/NotificationCenter.tsx`](src/components/notifications/NotificationCenter.tsx) | Componente novo |
| [`src/components/notifications/ToastContainer.tsx`](src/components/notifications/ToastContainer.tsx) | Componente novo |
| [`public/sw.js`](public/sw.js) | Service Worker (atualizar) |
| [`plans/notification-system-enhancement-plan.md`](plans/notification-system-enhancement-plan.md) | Plano anterior |

---

*Documento criado em: Fevereiro 2025*
*Versão: 1.0*
*Autor: Sistema de Notificações EcoFinance*
