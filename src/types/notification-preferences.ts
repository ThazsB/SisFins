/**
 * Preferências padrão de notificação para novos usuários
 */

import type { NotificationPreferences, NotificationChannel, NotificationCategory } from './notifications';

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
      channels: ['in_app' as NotificationChannel, 'push' as NotificationChannel],
      frequency: 'realtime',
      quietHoursRespected: true,
    },
    goal: {
      enabled: true,
      channels: ['in_app' as NotificationChannel, 'push' as NotificationChannel],
      frequency: 'realtime',
      quietHoursRespected: true,
    },
    transaction: {
      enabled: true,
      channels: ['in_app' as NotificationChannel],
      frequency: 'realtime',
      quietHoursRespected: true,
    },
    reminder: {
      enabled: true,
      channels: ['in_app' as NotificationChannel, 'push' as NotificationChannel],
      frequency: 'realtime',
      quietHoursRespected: true,
    },
    report: {
      enabled: true,
      channels: ['in_app' as NotificationChannel, 'email' as NotificationChannel],
      frequency: 'weekly',
      quietHoursRespected: false,
    },
    system: {
      enabled: true,
      channels: ['in_app' as NotificationChannel],
      frequency: 'realtime',
      quietHoursRespected: false,
    },
    insight: {
      enabled: true,
      channels: ['in_app' as NotificationChannel],
      frequency: 'daily',
      quietHoursRespected: true,
    },
    achievement: {
      enabled: true,
      channels: ['in_app' as NotificationChannel, 'push' as NotificationChannel],
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
    includeCategories: ['budget' as NotificationCategory, 'goal' as NotificationCategory, 'insight' as NotificationCategory],
  },
  privacy: {
    hideAmounts: false,
    hideDescriptions: false,
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  version: 1,
};

// Limites de notificação
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
