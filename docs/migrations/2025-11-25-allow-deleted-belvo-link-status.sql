-- ============================================================================
-- Migration: Allow "deleted" status for Belvo links
-- Date: 25/11/2025
-- Descrição: Ajusta a constraint para aceitar o status "deleted", usado ao
--            revogar um link Belvo no painel de configurações.
-- ============================================================================

ALTER TABLE belvo_links
  DROP CONSTRAINT IF EXISTS belvo_links_status_check;

ALTER TABLE belvo_links
  ADD CONSTRAINT belvo_links_status_check
  CHECK (
    status IN ('pending_sync', 'synced', 'expired', 'error', 'deleted')
  );

