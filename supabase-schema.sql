-- Script de configuração do Supabase para EcoFinance
-- Execute este script no SQL Editor do Supabase

-- 1. Criar tabela de notificações
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  category TEXT NOT NULL DEFAULT 'sistema',
  priority TEXT NOT NULL DEFAULT 'normal',
  date TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  archived BOOLEAN NOT NULL DEFAULT false,
  snoozed_until TEXT,
  device_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (now()::text),
  updated_at TEXT NOT NULL DEFAULT (now()::text),
  
  CONSTRAINT fk_profile FOREIGN KEY (profile_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 2. Criar tabela de sessões de dispositivos
CREATE TABLE IF NOT EXISTS device_sessions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  profile_id TEXT NOT NULL,
  device_id TEXT NOT NULL,
  device_name TEXT NOT NULL,
  device_type TEXT NOT NULL CHECK (device_type IN ('desktop', 'mobile', 'tablet')),
  last_active TEXT NOT NULL,
  is_current BOOLEAN NOT NULL DEFAULT false,
  created_at TEXT NOT NULL DEFAULT (now()::text),
  updated_at TEXT NOT NULL DEFAULT (now()::text),
  
  CONSTRAINT fk_profile_device FOREIGN KEY (profile_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT unique_device_profile UNIQUE (profile_id, device_id)
);

-- 3. Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_notifications_profile ON notifications(profile_id);
CREATE INDEX IF NOT EXISTS idx_notifications_date ON notifications(date DESC);
CREATE INDEX IF NOT EXISTS idx_device_sessions_profile ON device_sessions(profile_id);
CREATE INDEX IF NOT EXISTS idx_device_sessions_active ON device_sessions(profile_id, last_active DESC);

-- 4. Habilitar Realtime para as tabelas
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE device_sessions;

-- 5. Criar política de segurança (RLS) para notificações
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_sessions ENABLE ROW LEVEL SECURITY;

-- 6. Criar políticas RLS
-- Notificações: usuário só vê suas próprias notificações
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (auth.uid()::text = profile_id);

CREATE POLICY "Users can insert own notifications" ON notifications
  FOR INSERT WITH CHECK (auth.uid()::text = profile_id);

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (auth.uid()::text = profile_id);

CREATE POLICY "Users can delete own notifications" ON notifications
  FOR DELETE USING (auth.uid()::text = profile_id);

-- Device sessions: usuário só vê e gerencia suas próprias sessões
CREATE POLICY "Users can view own device sessions" ON device_sessions
  FOR SELECT USING (auth.uid()::text = profile_id);

CREATE POLICY "Users can insert own device sessions" ON device_sessions
  FOR INSERT WITH CHECK (auth.uid()::text = profile_id);

CREATE POLICY "Users can update own device sessions" ON device_sessions
  FOR UPDATE USING (auth.uid()::text = profile_id);

CREATE POLICY "Users can delete own device sessions" ON device_sessions
  FOR DELETE USING (auth.uid()::text = profile_id);

-- 7. Criar função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now()::text;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 8. Criar triggers para updated_at
CREATE TRIGGER update_notifications_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_device_sessions_updated_at
  BEFORE UPDATE ON device_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 9. Criar função para cleanup automático de sessões antigas
CREATE OR REPLACE FUNCTION cleanup_old_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM device_sessions 
  WHERE last_active < (now() - INTERVAL '30 days')::text
  AND NOT is_current;
END;
$$ language 'plpgsql';

-- Executar cleanup a cada dia (opcional - configurar no Supabase Cron se desejado)
-- SELECT cleanup_old_sessions();

-- 10. Comentários
COMMENT ON TABLE notifications IS 'Notificações sincronizadas entre dispositivos do usuário';
COMMENT ON TABLE device_sessions IS 'Sessões de dispositivos ativas do usuário';
COMMENT ON COLUMN notifications.profile_id IS 'ID do usuário (auth.users)';
COMMENT ON COLUMN device_sessions.profile_id IS 'ID do usuário (auth.users)';

-- ============================================================
-- SISTEMA AVANÇADO DE NOTIFICAÇÕES
-- Adicionado: Fevereiro 2025
-- ============================================================

-- 11. Criar tabela de preferências de notificação
CREATE TABLE IF NOT EXISTS notification_preferences (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL,
  profile_id TEXT NOT NULL,
  
  -- Configurações globais
  global_enabled BOOLEAN NOT NULL DEFAULT true,
  sound_enabled BOOLEAN NOT NULL DEFAULT true,
  vibration_enabled BOOLEAN NOT NULL DEFAULT true,
  auto_dismissing BOOLEAN NOT NULL DEFAULT true,
  auto_dismiss_delay INTEGER NOT NULL DEFAULT 5,
  
  -- Horário de silêncio
  quiet_hours_enabled BOOLEAN NOT NULL DEFAULT false,
  quiet_hours_start TIME NOT NULL DEFAULT '22:00',
  quiet_hours_end TIME NOT NULL DEFAULT '08:00',
  quiet_hours_timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  quiet_hours_exclude_weekends BOOLEAN NOT NULL DEFAULT true,
  quiet_hours_exclude_holidays BOOLEAN NOT NULL DEFAULT false,
  
  -- Configurações por categoria (JSONB)
  category_settings JSONB NOT NULL DEFAULT '{
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
  push_enabled BOOLEAN NOT NULL DEFAULT true,
  push_show_preview TEXT NOT NULL DEFAULT 'always',
  push_replace_old BOOLEAN NOT NULL DEFAULT true,
  
  -- Configurações de resumo
  summary_enabled BOOLEAN NOT NULL DEFAULT true,
  summary_frequency TEXT NOT NULL DEFAULT 'weekly',
  summary_day_of_week INTEGER,
  summary_day_of_month INTEGER,
  summary_time TIME DEFAULT '09:00',
  summary_categories TEXT[],
  
  -- Privacidade
  hide_amounts BOOLEAN NOT NULL DEFAULT false,
  hide_descriptions BOOLEAN NOT NULL DEFAULT false,
  
  -- Metadados
  created_at TEXT NOT NULL DEFAULT (now()::text),
  updated_at TEXT NOT NULL DEFAULT (now()::text),
  version INTEGER NOT NULL DEFAULT 1,
  
  CONSTRAINT fk_user_pref FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT fk_profile_pref FOREIGN KEY (profile_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT unique_user_profile_pref UNIQUE (user_id, profile_id)
);

-- 12. Criar tabela de assinaturas push
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL,
  profile_id TEXT NOT NULL,
  
  -- Subscription data
  endpoint TEXT NOT NULL,
  keys JSONB NOT NULL,
  
  -- Device info
  device_id TEXT,
  device_name TEXT,
  device_type TEXT,
  browser_name TEXT,
  browser_version TEXT,
  
  -- Status
  active BOOLEAN NOT NULL DEFAULT true,
  last_used_at TEXT,
  
  -- Metadados
  created_at TEXT NOT NULL DEFAULT (now()::text),
  updated_at TEXT NOT NULL DEFAULT (now()::text),
  
  CONSTRAINT fk_user_push FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT fk_profile_push FOREIGN KEY (profile_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 13. Criar tabela de regras de notificação (customizáveis pelo usuário)
CREATE TABLE IF NOT EXISTS notification_rules (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL,
  profile_id TEXT NOT NULL,
  
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  
  enabled BOOLEAN NOT NULL DEFAULT true,
  
  conditions JSONB NOT NULL,
  actions JSONB NOT NULL,
  
  cooldown_minutes INTEGER NOT NULL DEFAULT 60,
  max_occurrences INTEGER,
  occurrence_count INTEGER DEFAULT 0,
  
  created_at TEXT NOT NULL DEFAULT (now()::text),
  updated_at TEXT NOT NULL DEFAULT (now()::text),
  
  CONSTRAINT fk_user_rules FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT fk_profile_rules FOREIGN KEY (profile_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 14. Criar tabela de analytics de notificação
CREATE TABLE IF NOT EXISTS notification_analytics (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  notification_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  
  event_type TEXT NOT NULL, -- sent, delivered, read, clicked, dismissed
  event_timestamp TEXT NOT NULL DEFAULT (now()::text),
  
  -- Contexto
  device_id TEXT,
  platform TEXT,
  browser TEXT,
  
  -- Dados adicionais
  metadata JSONB DEFAULT '{}',
  
  CONSTRAINT fk_notification_analytics FOREIGN KEY (notification_id) REFERENCES notifications(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_analytics FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 15. Criar índices para as novas tabelas
CREATE INDEX IF NOT EXISTS idx_notif_prefs_user ON notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_notif_prefs_profile ON notification_preferences(profile_id);

CREATE INDEX IF NOT EXISTS idx_push_subs_user ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subs_profile ON push_subscriptions(profile_id);
CREATE INDEX IF NOT EXISTS idx_push_subs_endpoint ON push_subscriptions(endpoint);

CREATE INDEX IF NOT EXISTS idx_notif_rules_user ON notification_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_notif_rules_profile ON notification_rules(profile_id);

CREATE INDEX IF NOT EXISTS idx_notif_analytics_notification ON notification_analytics(notification_id);
CREATE INDEX IF NOT EXISTS idx_notif_analytics_user ON notification_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_notif_analytics_event ON notification_analytics(event_type, event_timestamp);

-- 16. Habilitar Realtime para as novas tabelas
ALTER PUBLICATION supabase_realtime ADD TABLE notification_preferences;
ALTER PUBLICATION supabase_realtime ADD TABLE push_subscriptions;
ALTER PUBLICATION supabase_realtime ADD TABLE notification_rules;
ALTER PUBLICATION supabase_realtime ADD TABLE notification_analytics;

-- 17. Habilitar RLS para as novas tabelas
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_analytics ENABLE ROW LEVEL SECURITY;

-- 18. Criar políticas RLS para notification_preferences
CREATE POLICY "Users can manage own notification preferences" ON notification_preferences
  FOR ALL USING (auth.uid()::text = user_id);

-- 19. Criar políticas RLS para push_subscriptions
CREATE POLICY "Users can manage own push subscriptions" ON push_subscriptions
  FOR ALL USING (auth.uid()::text = user_id);

-- 20. Criar políticas RLS para notification_rules
CREATE POLICY "Users can manage own notification rules" ON notification_rules
  FOR ALL USING (auth.uid()::text = user_id);

-- 21. Criar políticas RLS para notification_analytics
CREATE POLICY "Users can view own notification analytics" ON notification_analytics
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own notification analytics" ON notification_analytics
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- 22. Criar triggers updated_at para novas tabelas
CREATE TRIGGER update_notif_prefs_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_push_subs_updated_at
  BEFORE UPDATE ON push_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notif_rules_updated_at
  BEFORE UPDATE ON notification_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 23. Comentários para novas tabelas
COMMENT ON TABLE notification_preferences IS 'Preferências de notificação do usuário';
COMMENT ON TABLE push_subscriptions IS 'Assinaturas de push notifications por dispositivo';
COMMENT ON TABLE notification_rules IS 'Regras customizáveis de notificação';
COMMENT ON TABLE notification_analytics IS 'Analytics de engajamento de notificações';

-- 24. Função para obter contagem de não lidas
CREATE OR REPLACE FUNCTION get_unread_count(profile_id_val TEXT)
RETURNS INTEGER AS $
BEGIN
  RETURN COUNT(*)::INTEGER FROM notifications
  WHERE profile_id = profile_id_val
  AND read = false
  AND archived = false;
END;
$ LANGUAGE plpgsql;

-- 25. Função para marcar todas como lidas
CREATE OR REPLACE FUNCTION mark_all_as_read(profile_id_val TEXT)
RETURNS void AS $
BEGIN
  UPDATE notifications
  SET read = true, updated_at = now()::text
  WHERE profile_id = profile_id_val AND read = false;
END;
$ LANGUAGE plpgsql;

-- 26. Função para cleanup de notificações antigas
CREATE OR REPLACE FUNCTION cleanup_old_notifications(days_old INTEGER DEFAULT 30)
RETURNS INTEGER AS $
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM notifications
  WHERE created_at < (now() - INTERVAL '1 day' * days_old)::text
  AND read = true
  AND archived = true;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$ LANGUAGE plpgsql;
