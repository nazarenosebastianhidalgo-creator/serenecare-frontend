-- ============================================================
-- SereneCare — Unificación de citas/sesiones en una sola tabla
--
-- Existían dos tablas paralelas para lo mismo:
--   · citas    → usada por TODO el frontend (hora_inicio/hora_fin, tipo, sala_video_url)
--   · sesiones → usada por el bot de WhatsApp, el esquema inicial y Google Calendar
--                (hora, duracion_min, modalidad, precio, google_event_id)
-- Ambas estaban vacías. Se consolida en `citas` (la canónica del frontend) y se
-- elimina `sesiones`. El código que usaba `sesiones` se repunta a `citas`.
-- ============================================================

-- 1. Llevar a `citas` las columnas útiles que solo tenía `sesiones`
ALTER TABLE citas
  ADD COLUMN IF NOT EXISTS precio          NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS duracion_min    INTEGER DEFAULT 50,
  ADD COLUMN IF NOT EXISTS google_event_id TEXT,
  ADD COLUMN IF NOT EXISTS confirmada      BOOLEAN DEFAULT false;

-- 2. Repuntar las FKs que apuntaban a sesiones → citas (mismo nombre de columna)
ALTER TABLE notas_soap DROP CONSTRAINT IF EXISTS notas_soap_sesion_id_fkey;
ALTER TABLE notas_soap
  ADD CONSTRAINT notas_soap_sesion_id_fkey
  FOREIGN KEY (sesion_id) REFERENCES citas(id) ON DELETE SET NULL;

ALTER TABLE facturas DROP CONSTRAINT IF EXISTS facturas_sesion_id_fkey;
ALTER TABLE facturas
  ADD CONSTRAINT facturas_sesion_id_fkey
  FOREIGN KEY (sesion_id) REFERENCES citas(id) ON DELETE SET NULL;

-- 3. Eliminar la tabla redundante
DROP TABLE IF EXISTS sesiones;
