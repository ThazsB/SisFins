/**
 * Store Zustand para gerenciamento de notificações
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { 
  NotificationPayload, 
  NotificationCategory,
  CategoryChannelConfig 
} from '@/types/notifications';
import type { NotificationPreferences } from '@/types/notifications';
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
  toggleCategory: (category: NotificationCategory, channel: 'in_app' | 'push') => void;
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
        const { preferences } = get();
        
        // Verificar se global está habilitado
        if (!preferences.globalEnabled) return;
        
        // Verificar horário de silêncio
        if (preferences.quietHours.enabled && isInQuietHours(preferences.quietHours)) {
          // Adicionar à fila para entrega posterior
          const queued = JSON.parse(localStorage.getItem('notification_queue') || '[]');
          queued.push({
            ...notification,
            queuedAt: new Date().toISOString(),
          });
          localStorage.setItem('notification_queue', JSON.stringify(queued.slice(-50)));
          return;
        }
        
        // Verificar limite diário por categoria
        const categoryLimit = getCategoryDailyLimit(notification.category);
        if (categoryLimit > 0) {
          const todayNotifications = get().notifications.filter(n => 
            n.category === notification.category &&
            new Date(n.timestamp).toDateString() === new Date().toDateString()
          );
          if (todayNotifications.length >= categoryLimit) {
            return; // Limite atingido
          }
        }
        
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
        const categoryConfig = preferences.categories[notification.category];
        if (categoryConfig?.channels.includes('in_app')) {
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
          get().processQueuedNotifications();
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
      
      // Processar notificações em fila
      processQueuedNotifications: () => {
        const queued = JSON.parse(localStorage.getItem('notification_queue') || '[]');
        if (queued.length === 0) return;
        
        const { preferences, addNotification } = get();
        if (preferences.quietHours.enabled && isInQuietHours(preferences.quietHours)) {
          return; // Ainda em horário de silêncio
        }
        
        const processed = [];
        for (const item of queued) {
          addNotification(item);
          processed.push(item);
        }
        
        // Remover processados da fila
        const remaining = queued.filter(item => !processed.includes(item));
        localStorage.setItem('notification_queue', JSON.stringify(remaining));
      },
      
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

// Helper functions
function isInQuietHours(quietHours: typeof DEFAULT_NOTIFICATION_PREFERENCES.quietHours): boolean {
  if (!quietHours.enabled) return false;
  
  const now = new Date();
  const { startTime, endTime, excludeWeekends } = quietHours;
  
  // Verificar fins de semana
  if (excludeWeekends && (now.getDay() === 0 || now.getDay() === 6)) {
    return false;
  }
  
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);
  
  const start = new Date(now);
  start.setHours(startHour, startMinute, 0, 0);
  
  const end = new Date(now);
  end.setHours(endHour, endMinute, 0, 0);
  
  // Se horário cruza meia-noite
  if (startTime > endTime) {
    return now >= start || now <= end;
  }
  
  return now >= start && now <= end;
}

function getCategoryDailyLimit(category: NotificationCategory): number {
  const limits: Record<NotificationCategory, number> = {
    budget: 5,
    goal: 3,
    transaction: 10,
    reminder: 5,
    report: 1,
    system: 3,
    insight: 5,
    achievement: 2,
  };
  return limits[category] || 5;
}

// Selectors otimizados
export const notificationSelectors = {
  unreadCount: (state: NotificationsState) => state.unreadCount,
  notifications: (state: NotificationsState) => state.notifications,
  unreadNotifications: (state: NotificationsState) => 
    state.notifications.filter((n) => n.status !== 'read'),
  byCategory: (category: NotificationCategory) => (state: NotificationsState) =>
    state.notifications.filter((n) => n.category === category),
  isCenterOpen: (state: NotificationsState) => state.isCenterOpen,
  preferences: (state: NotificationsState) => state.preferences,
};
