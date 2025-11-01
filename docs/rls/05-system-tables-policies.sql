-- ============================================================================
-- RLS Policies: Tabelas de Sistema
-- Controla acesso a notifications, onboarding, conversations, etc.
-- ============================================================================

-- ============================================================================
-- PENDING_INVITES
-- ============================================================================
ALTER TABLE pending_invites ENABLE ROW LEVEL SECURITY;

-- SELECT: Membros da organização podem ver convites
DROP POLICY IF EXISTS "Users can view invites from their organization" ON pending_invites;
CREATE POLICY "Users can view invites from their organization"
ON pending_invites
FOR SELECT
TO authenticated
USING (user_belongs_to_org(organization_id));

-- INSERT: Admin ou membro pode convidar (qualquer membro pode convidar)
DROP POLICY IF EXISTS "Users can insert invites in their organization" ON pending_invites;
CREATE POLICY "Users can insert invites in their organization"
ON pending_invites
FOR INSERT
TO authenticated
WITH CHECK (
  user_belongs_to_org(organization_id) AND
  invited_by = get_current_user_id()
);

-- UPDATE: Admin ou quem criou o convite
DROP POLICY IF EXISTS "Users can update invites they created or admins can update" ON pending_invites;
CREATE POLICY "Users can update invites they created or admins can update"
ON pending_invites
FOR UPDATE
TO authenticated
USING (
  user_belongs_to_org(organization_id) AND
  (
    invited_by = get_current_user_id() OR
    is_org_admin(organization_id)
  )
)
WITH CHECK (
  user_belongs_to_org(organization_id) AND
  (
    invited_by = get_current_user_id() OR
    is_org_admin(organization_id)
  )
);

-- DELETE: Admin ou quem criou o convite
DROP POLICY IF EXISTS "Users can delete invites they created or admins can delete" ON pending_invites;
CREATE POLICY "Users can delete invites they created or admins can delete"
ON pending_invites
FOR DELETE
TO authenticated
USING (
  user_belongs_to_org(organization_id) AND
  (
    invited_by = get_current_user_id() OR
    is_org_admin(organization_id)
  )
);

-- ============================================================================
-- VERIFICATION_CODES
-- ============================================================================
ALTER TABLE verification_codes ENABLE ROW LEVEL SECURITY;

-- SELECT/INSERT/UPDATE: Apenas próprio registro
DROP POLICY IF EXISTS "Users can view their own verification codes" ON verification_codes;
CREATE POLICY "Users can view their own verification codes"
ON verification_codes
FOR SELECT
TO authenticated
USING (user_id = get_current_user_id());

DROP POLICY IF EXISTS "Users can insert their own verification codes" ON verification_codes;
CREATE POLICY "Users can insert their own verification codes"
ON verification_codes
FOR INSERT
TO authenticated
WITH CHECK (user_id = get_current_user_id());

DROP POLICY IF EXISTS "Users can update their own verification codes" ON verification_codes;
CREATE POLICY "Users can update their own verification codes"
ON verification_codes
FOR UPDATE
TO authenticated
USING (user_id = get_current_user_id())
WITH CHECK (user_id = get_current_user_id());

DROP POLICY IF EXISTS "Users can delete their own verification codes" ON verification_codes;
CREATE POLICY "Users can delete their own verification codes"
ON verification_codes
FOR DELETE
TO authenticated
USING (user_id = get_current_user_id());

-- ============================================================================
-- NOTIFICATIONS
-- ============================================================================
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- SELECT: Apenas próprias notificações
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
CREATE POLICY "Users can view their own notifications"
ON notifications
FOR SELECT
TO authenticated
USING (
  user_id = get_current_user_id() AND
  user_belongs_to_org(organization_id)
);

-- INSERT: Sistema pode criar (via service role), usuário não pode inserir diretamente
DROP POLICY IF EXISTS "Service role can insert notifications" ON notifications;
CREATE POLICY "Service role can insert notifications"
ON notifications
FOR INSERT
TO authenticated
WITH CHECK (false); -- Bloquear INSERT direto - usar service role

-- UPDATE: Apenas próprio registro
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
CREATE POLICY "Users can update their own notifications"
ON notifications
FOR UPDATE
TO authenticated
USING (user_id = get_current_user_id())
WITH CHECK (user_id = get_current_user_id());

-- DELETE: Apenas próprio registro
DROP POLICY IF EXISTS "Users can delete their own notifications" ON notifications;
CREATE POLICY "Users can delete their own notifications"
ON notifications
FOR DELETE
TO authenticated
USING (user_id = get_current_user_id());

-- ============================================================================
-- NOTIFICATION_HISTORY
-- ============================================================================
ALTER TABLE notification_history ENABLE ROW LEVEL SECURITY;

-- SELECT: Via notification (que já está protegido)
DROP POLICY IF EXISTS "Users can view notification history from their notifications" ON notification_history;
CREATE POLICY "Users can view notification history from their notifications"
ON notification_history
FOR SELECT
TO authenticated
USING (
  user_id = get_current_user_id() OR
  EXISTS (
    SELECT 1 FROM notifications
    WHERE notifications.id = notification_history.notification_id
    AND notifications.user_id = get_current_user_id()
  )
);

-- INSERT: Apenas service role (sistema)
DROP POLICY IF EXISTS "Service role can insert notification history" ON notification_history;
CREATE POLICY "Service role can insert notification history"
ON notification_history
FOR INSERT
TO authenticated
WITH CHECK (false); -- Bloquear INSERT direto - usar service role

-- UPDATE/DELETE: Bloqueado (histórico é read-only)
DROP POLICY IF EXISTS "Service role can update notification history" ON notification_history;
CREATE POLICY "Service role can update notification history"
ON notification_history
FOR UPDATE
TO authenticated
USING (false);

DROP POLICY IF EXISTS "Service role can delete notification history" ON notification_history;
CREATE POLICY "Service role can delete notification history"
ON notification_history
FOR DELETE
TO authenticated
USING (false);

-- ============================================================================
-- NOTIFICATION_TEMPLATES
-- ============================================================================
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;

-- SELECT: Todos autenticados (templates globais)
DROP POLICY IF EXISTS "Authenticated users can view notification templates" ON notification_templates;
CREATE POLICY "Authenticated users can view notification templates"
ON notification_templates
FOR SELECT
TO authenticated
USING (true);

-- INSERT/UPDATE/DELETE: Apenas service role (admin do sistema)
DROP POLICY IF EXISTS "Service role can manage notification templates" ON notification_templates;
CREATE POLICY "Service role can manage notification templates"
ON notification_templates
FOR INSERT
TO authenticated
WITH CHECK (false); -- Bloquear - usar service role

DROP POLICY IF EXISTS "Service role can update notification templates" ON notification_templates;
CREATE POLICY "Service role can update notification templates"
ON notification_templates
FOR UPDATE
TO authenticated
USING (false);

DROP POLICY IF EXISTS "Service role can delete notification templates" ON notification_templates;
CREATE POLICY "Service role can delete notification templates"
ON notification_templates
FOR DELETE
TO authenticated
USING (false);

-- ============================================================================
-- ONBOARDING_PROGRESS
-- ============================================================================
ALTER TABLE onboarding_progress ENABLE ROW LEVEL SECURITY;

-- SELECT: Próprio registro
DROP POLICY IF EXISTS "Users can view their own onboarding progress" ON onboarding_progress;
CREATE POLICY "Users can view their own onboarding progress"
ON onboarding_progress
FOR SELECT
TO authenticated
USING (
  user_id = get_current_user_id() AND
  user_belongs_to_org(organization_id)
);

-- INSERT: Criar próprio registro
DROP POLICY IF EXISTS "Users can insert their own onboarding progress" ON onboarding_progress;
CREATE POLICY "Users can insert their own onboarding progress"
ON onboarding_progress
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = get_current_user_id() AND
  user_belongs_to_org(organization_id)
);

-- UPDATE: Próprio registro
DROP POLICY IF EXISTS "Users can update their own onboarding progress" ON onboarding_progress;
CREATE POLICY "Users can update their own onboarding progress"
ON onboarding_progress
FOR UPDATE
TO authenticated
USING (
  user_id = get_current_user_id() AND
  user_belongs_to_org(organization_id)
)
WITH CHECK (
  user_id = get_current_user_id() AND
  user_belongs_to_org(organization_id)
);

-- DELETE: Próprio registro
DROP POLICY IF EXISTS "Users can delete their own onboarding progress" ON onboarding_progress;
CREATE POLICY "Users can delete their own onboarding progress"
ON onboarding_progress
FOR DELETE
TO authenticated
USING (
  user_id = get_current_user_id() AND
  user_belongs_to_org(organization_id)
);

-- ============================================================================
-- USER_TOURS
-- ============================================================================
ALTER TABLE user_tours ENABLE ROW LEVEL SECURITY;

-- SELECT: Próprio registro
DROP POLICY IF EXISTS "Users can view their own tours" ON user_tours;
CREATE POLICY "Users can view their own tours"
ON user_tours
FOR SELECT
TO authenticated
USING (
  user_id = get_current_user_id() AND
  user_belongs_to_org(organization_id)
);

-- INSERT: Criar próprio registro
DROP POLICY IF EXISTS "Users can insert their own tours" ON user_tours;
CREATE POLICY "Users can insert their own tours"
ON user_tours
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = get_current_user_id() AND
  user_belongs_to_org(organization_id)
);

-- UPDATE: Próprio registro
DROP POLICY IF EXISTS "Users can update their own tours" ON user_tours;
CREATE POLICY "Users can update their own tours"
ON user_tours
FOR UPDATE
TO authenticated
USING (
  user_id = get_current_user_id() AND
  user_belongs_to_org(organization_id)
)
WITH CHECK (
  user_id = get_current_user_id() AND
  user_belongs_to_org(organization_id)
);

-- DELETE: Próprio registro
DROP POLICY IF EXISTS "Users can delete their own tours" ON user_tours;
CREATE POLICY "Users can delete their own tours"
ON user_tours
FOR DELETE
TO authenticated
USING (
  user_id = get_current_user_id() AND
  user_belongs_to_org(organization_id)
);

-- ============================================================================
-- USER_PREFERENCES
-- ============================================================================
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- SELECT: Próprio registro
DROP POLICY IF EXISTS "Users can view their own preferences" ON user_preferences;
CREATE POLICY "Users can view their own preferences"
ON user_preferences
FOR SELECT
TO authenticated
USING (
  user_id = get_current_user_id() AND
  user_belongs_to_org(organization_id)
);

-- INSERT: Criar próprio registro
DROP POLICY IF EXISTS "Users can insert their own preferences" ON user_preferences;
CREATE POLICY "Users can insert their own preferences"
ON user_preferences
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = get_current_user_id() AND
  user_belongs_to_org(organization_id)
);

-- UPDATE: Próprio registro
DROP POLICY IF EXISTS "Users can update their own preferences" ON user_preferences;
CREATE POLICY "Users can update their own preferences"
ON user_preferences
FOR UPDATE
TO authenticated
USING (
  user_id = get_current_user_id() AND
  user_belongs_to_org(organization_id)
)
WITH CHECK (
  user_id = get_current_user_id() AND
  user_belongs_to_org(organization_id)
);

-- DELETE: Próprio registro
DROP POLICY IF EXISTS "Users can delete their own preferences" ON user_preferences;
CREATE POLICY "Users can delete their own preferences"
ON user_preferences
FOR DELETE
TO authenticated
USING (
  user_id = get_current_user_id() AND
  user_belongs_to_org(organization_id)
);

-- ============================================================================
-- CONVERSATIONS (backend WhatsApp)
-- ============================================================================
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- SELECT: Próprio registro ou membros da organização (para admin)
DROP POLICY IF EXISTS "Users can view conversations from their organization" ON conversations;
CREATE POLICY "Users can view conversations from their organization"
ON conversations
FOR SELECT
TO authenticated
USING (
  user_id = get_current_user_id() OR
  (
    user_belongs_to_org(organization_id) AND
    is_org_admin(organization_id)
  )
);

-- INSERT: Criar próprio registro
DROP POLICY IF EXISTS "Users can insert their own conversations" ON conversations;
CREATE POLICY "Users can insert their own conversations"
ON conversations
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = get_current_user_id() AND
  user_belongs_to_org(organization_id)
);

-- UPDATE: Próprio registro ou admin
DROP POLICY IF EXISTS "Users can update their own conversations or admins can update" ON conversations;
CREATE POLICY "Users can update their own conversations or admins can update"
ON conversations
FOR UPDATE
TO authenticated
USING (
  user_id = get_current_user_id() OR
  (
    user_belongs_to_org(organization_id) AND
    is_org_admin(organization_id)
  )
)
WITH CHECK (
  user_id = get_current_user_id() OR
  (
    user_belongs_to_org(organization_id) AND
    is_org_admin(organization_id)
  )
);

-- DELETE: Próprio registro ou admin
DROP POLICY IF EXISTS "Users can delete their own conversations or admins can delete" ON conversations;
CREATE POLICY "Users can delete their own conversations or admins can delete"
ON conversations
FOR DELETE
TO authenticated
USING (
  user_id = get_current_user_id() OR
  (
    user_belongs_to_org(organization_id) AND
    is_org_admin(organization_id)
  )
);

