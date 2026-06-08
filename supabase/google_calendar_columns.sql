-- Columnas para integración Google Calendar en usuarios
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS google_refresh_token    TEXT,
  ADD COLUMN IF NOT EXISTS google_access_token     TEXT,
  ADD COLUMN IF NOT EXISTS google_token_expires_at TIMESTAMPTZ;

-- Columna para guardar el Google Event ID en cada sesión
ALTER TABLE sesiones
  ADD COLUMN IF NOT EXISTS google_event_id TEXT;
