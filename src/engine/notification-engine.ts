/**
 * Engine de Regras de Notificação do EcoFinance
 * Sistema de triggers e regras para notificações automáticas
 */

import type {
  NotificationPayload,
  NotificationRule,
  NotificationCategory,
  RuleCondition,
  RuleAction,
} from '@/types/notifications';
import { useNotificationsStore } from '@/stores/notificationsStore';

interface RuleContext {
  budgets?: BudgetStatus[];
  goals?: GoalStatus[];
  transactions?: TransactionStatus[];
  userProfile?: UserProfile;
  date?: Date;
  [key: string]: unknown;
}

interface BudgetStatus {
  category: string;
  spent: number;
  limit: number;
}

interface GoalStatus {
  id: string;
  name: string;
  current: number;
  target: number;
}

interface TransactionStatus {
  id: string;
  amount: number;
  category: string;
  date: string;
}

interface UserProfile {
  id: string;
  name: string;
}

/**
 * Engine principal de processamento de regras de notificação
 */
export class NotificationEngine {
  private rules: NotificationRule[] = [];
  private context: RuleContext | null = null;
  private store = useNotificationsStore.getState();

  constructor() {
    this.loadDefaultRules();
  }

  /**
   * Carregar regras padrão
   */
  private loadDefaultRules(): void {
    this.rules = [
      {
        id: 'budget-80-percent',
        name: 'Orçamento em 80%',
        description: 'Notificar quando orçamento atingir 80% do limite',
        category: 'budget',
        enabled: true,
        conditions: [
          {
            type: 'percentage',
            field: 'budgets',
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
            },
            priority: 'high',
          },
        ],
        cooldownMinutes: 360,
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
            field: 'budgets',
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
              ],
            },
            priority: 'urgent',
          },
        ],
        cooldownMinutes: 720,
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
            field: 'goals',
            operator: 'eq',
            value: 100, // Meta atingida = 100%
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
            type: 'date',
            field: 'date',
            operator: 'eq',
            value: 'monday', // Segunda-feira
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
              channels: ['in_app'],
            },
            priority: 'normal',
          },
        ],
        cooldownMinutes: 10080,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
  }

  /**
   * Atualizar contexto da engine
   */
  setContext(context: RuleContext): void {
    this.context = { ...context, date: new Date() };
  }

  /**
   * Adicionar regra customizada
   */
  addRule(rule: NotificationRule): void {
    this.rules.push(rule);
  }

  /**
   * Remover regra
   */
  removeRule(ruleId: string): void {
    this.rules = this.rules.filter((r) => r.id !== ruleId);
  }

  /**
   * Habilitar/desabilitar regra
   */
  toggleRule(ruleId: string, enabled: boolean): void {
    const rule = this.rules.find((r) => r.id === ruleId);
    if (rule) {
      rule.enabled = enabled;
      rule.updatedAt = new Date().toISOString();
    }
  }

  /**
   * Obter todas as regras
   */
  getRules(): NotificationRule[] {
    return [...this.rules];
  }

  /**
   * Processar regras e gerar notificações
   */
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
              const notification = this.buildNotification(
                action,
                this.context
              );
              notifications.push(notification);
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

  /**
   * Avaliar se regra é satisfeita
   */
  private async evaluateRule(
    rule: NotificationRule,
    context: RuleContext
  ): Promise<boolean> {
    // Todas as condições devem ser verdadeiras
    for (const condition of rule.conditions) {
      if (!(await this.evaluateCondition(condition, context))) {
        return false;
      }
    }
    return true;
  }

  /**
   * Avaliar condição individual
   */
  private async evaluateCondition(
    condition: RuleCondition,
    context: RuleContext
  ): Promise<boolean> {
    switch (condition.type) {
      case 'threshold': {
        const value = this.getNestedValue(context, condition.field);
        return this.compareValues(
          Number(value) || 0,
          condition.operator,
          condition.value
        );
      }

      case 'percentage': {
        if (condition.field === 'budgets' && context.budgets) {
          for (const budget of context.budgets) {
            const percent = (budget.spent / budget.limit) * 100;
            if (this.compareValues(percent, condition.operator, condition.value)) {
              return true;
            }
          }
        }
        return false;
      }

      case 'date': {
        const now = context.date || new Date();
        const dayName = now.toLocaleDateString('en-US', { weekday: 'long' });
        
        if (condition.value === 'monday' && dayName === 'Monday') {
          return true;
        }
        return false;
      }

      case 'recurring': {
        const ruleId = (condition as { ruleId?: string }).ruleId || 'default';
        const lastRun = localStorage.getItem(`rule_${ruleId}_lastRun`);
        if (!lastRun) return true;

        const elapsed = Date.now() - parseInt(lastRun);
        return elapsed >= (condition.interval || 7 * 24 * 60 * 60 * 1000);
      }

      default:
        return false;
    }
  }

  /**
   * Comparar valores
   */
  private compareValues(
    a: number,
    operator: string,
    b: number
  ): boolean {
    switch (operator) {
      case 'gt':
        return a > b;
      case 'lt':
        return a < b;
      case 'gte':
        return a >= b;
      case 'lte':
        return a <= b;
      case 'eq':
        return a === b;
      default:
        return false;
    }
  }

  /**
   * Obter valor aninhado
   */
  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce((current: unknown, key: string) => {
      if (current && typeof current === 'object' && key in current) {
        return (current as Record<string, unknown>)[key];
      }
      return undefined;
    }, obj);
  }

  /**
   * Construir notificação
   */
  private buildNotification(
    action: RuleAction,
    context: RuleContext
  ): NotificationPayload {
    const notification = action.notification;

    // Interpolação de variáveis
    const title = this.interpolate(notification.title || '', context);
    const message = this.interpolate(notification.message || '', context);

    return {
      id: crypto.randomUUID(),
      profileId: context.userProfile?.id || 'default',
      title,
      message,
      category: notification.category || 'system',
      priority: notification.priority || 'normal',
      timestamp: new Date().toISOString(),
      channels: notification.channels || ['in_app'],
      status: 'pending',
      actions: notification.actions,
      url: notification.url,
      data: notification.data,
    };
  }

  /**
   * Interpolação de strings
   */
  private interpolate(template: string, context: RuleContext): string {
    return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
      const value = this.getNestedValue(context, path.trim());
      return value !== undefined ? String(value) : match;
    });
  }

  /**
   * Verificar cooldown
   */
  private isInCooldown(rule: NotificationRule): boolean {
    const lastRun = localStorage.getItem(`rule_${rule.id}_lastRun`);
    if (!lastRun) return false;

    const elapsed = Date.now() - parseInt(lastRun);
    return elapsed < rule.cooldownMinutes * 60 * 1000;
  }

  /**
   * Atualizar timestamp de cooldown
   */
  private updateCooldown(rule: NotificationRule): void {
    localStorage.setItem(`rule_${rule.id}_lastRun`, Date.now().toString());

    const count =
      parseInt(localStorage.getItem(`rule_${rule.id}_count`) || '0') + 1;
    localStorage.setItem(`rule_${rule.id}_count`, String(count));

    // Atualizar contador na regra
    rule.occurrenceCount = count;
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

/**
 * Hook para usar a engine de notificações
 */
export function useNotificationEngine() {
  const engine = getNotificationEngine();
  const store = useNotificationsStore();

  const checkBudgetAlerts = useCallback(
    (budgets: BudgetStatus[]) => {
      engine.setContext({ budgets });
      engine.processRules().then((notifications) => {
        notifications.forEach((n) => store.addNotification(n));
      });
    },
    [engine, store]
  );

  const checkGoalAlerts = useCallback(
    (goals: GoalStatus[]) => {
      engine.setContext({ goals });
      engine.processRules().then((notifications) => {
        notifications.forEach((n) => store.addNotification(n));
      });
    },
    [engine, store]
  );

  return {
    engine,
    checkBudgetAlerts,
    checkGoalAlerts,
  };
}

// Import useCallback
import { useCallback } from 'react';
