/**
 * Tipos para o sistema de notificações do EcoFinance
 */

// Tipos de prioridade para notificações
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

// Canais de entrega de notificações
export type NotificationChannel = 
  | 'in_app'      // Toast, centro de notificações
  | 'push'        // Notificações nativas do navegador
  | 'email'       // Email (futuro)
  | 'sms';        // SMS (futuro)

// Categorias de notificação
export type NotificationCategory = 
  | 'budget'          // Orçamentos
  | 'goal'            // Metas
  | 'transaction'     // Transações
  | 'reminder'        // Lembretes
  | 'report'          // Relatórios
  | 'system'          // Sistema
  | 'insight'         // Insights financeiros
  | 'achievement';    // Conquistas

// Status da notificação
export type NotificationStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'dismissed';

// Ação disponível em uma notificação
export interface NotificationAction {
  id: string;
  label: string;
  icon?: string;
  url?: string;
  handler?: string; // Nome da função handler
  dismissAfterAction?: boolean;
  primary?: boolean;
}

// Payload principal de notificação
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
  engagementMetrics?: {
    timeToRead?: number;
    actionTaken?: string;
  };
}

// Configuração de canal por categoria
export interface CategoryChannelConfig {
  enabled: boolean;
  channels: NotificationChannel[];
  frequency?: 'realtime' | 'hourly' | 'daily' | 'weekly';
  quietHoursRespected: boolean;
}

// Configurações de horário de silêncio
export interface QuietHours {
  enabled: boolean;
  startTime: string;  // "22:00"
  endTime: string;    // "08:00"
  timezone: string;   // "America/Sao_Paulo"
  excludeWeekends?: boolean;
  excludeHolidays?: boolean;
}

// Preferências completas do usuário
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

// Condição para trigger de notificação
export type RuleCondition = 
  | { type: 'threshold'; field: string; operator: 'gt' | 'lt' | 'eq'; value: number }
  | { type: 'percentage'; field: string; operator: 'gt' | 'lt'; value: number }
  | { type: 'date'; field: string; operator: 'eq' | 'before' | 'after'; value: string }
  | { type: 'recurring'; cron?: string; interval?: number }
  | { type: 'pattern'; field: string; regex?: string };

// Ação a ser executada quando regra é satisfeita
export interface RuleAction {
  type: 'create_notification';
  notification: Partial<NotificationPayload>;
  priority?: NotificationPriority;
  delay?: number; // Em minutos
  coalesce?: boolean;
}

// Regra de notificação configurável
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

// Configuração de categoria para UI
export const NOTIFICATION_CATEGORY_CONFIG: Record<NotificationCategory, {
  label: string;
  color: string;
  icon: string;
  defaultPriority: NotificationPriority;
}> = {
  budget: { 
    label: 'Orçamentos', 
    color: 'text-orange-600', 
    icon: '💰',
    defaultPriority: 'high'
  },
  goal: { 
    label: 'Metas', 
    color: 'text-green-600', 
    icon: '🎯',
    defaultPriority: 'high'
  },
  transaction: { 
    label: 'Transações', 
    color: 'text-blue-600', 
    icon: '💳',
    defaultPriority: 'normal'
  },
  reminder: { 
    label: 'Lembretes', 
    color: 'text-purple-600', 
    icon: '⏰',
    defaultPriority: 'normal'
  },
  report: { 
    label: 'Relatórios', 
    color: 'text-indigo-600', 
    icon: '📊',
    defaultPriority: 'normal'
  },
  system: { 
    label: 'Sistema', 
    color: 'text-gray-600', 
    icon: '⚙️',
    defaultPriority: 'normal'
  },
  insight: { 
    label: 'Insights', 
    color: 'text-teal-600', 
    icon: '💡',
    defaultPriority: 'normal'
  },
  achievement: { 
    label: 'Conquistas', 
    color: 'text-amber-600', 
    icon: '🏆',
    defaultPriority: 'high'
  },
};
