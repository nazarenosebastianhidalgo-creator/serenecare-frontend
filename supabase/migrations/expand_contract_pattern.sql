-- =============================================================
-- PATRÓN EXPAND-CONTRACT para migraciones sin downtime
-- =============================================================
-- Regla de oro: NUNCA modificar o eliminar estructura mientras
-- el código anterior todavía la esté usando.
-- El deploy debe poder fallar y rollback sin perder datos.
-- =============================================================

-- ┌─────────────────────────────────────────────────────────┐
-- │  FASE 1 — EXPAND (ejecutar ANTES del nuevo deploy)      │
-- │  El código VIEJO sigue funcionando, el NUEVO también.   │
-- └─────────────────────────────────────────────────────────┘

-- Añadir columna nueva como nullable (código viejo la ignora, el nuevo la usa):
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS telefono_verificado BOOLEAN DEFAULT FALSE;

-- Añadir tabla nueva (código viejo no la toca):
CREATE TABLE IF NOT EXISTS evaluaciones (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id UUID REFERENCES pacientes(id) ON DELETE CASCADE,
  clinica_id  UUID REFERENCES clinicas(id) ON DELETE CASCADE,
  tipo        TEXT NOT NULL CHECK (tipo IN ('PHQ-9','GAD-7')),
  puntaje     INTEGER NOT NULL,
  respuestas  JSONB,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Añadir índice sin CONCURRENTLY (Supabase lo soporta):
CREATE INDEX IF NOT EXISTS idx_evaluaciones_paciente ON evaluaciones(paciente_id, created_at DESC);

-- ┌─────────────────────────────────────────────────────────┐
-- │  FASE 2 — DEPLOY del nuevo código                       │
-- │  El nuevo código usa las columnas/tablas nuevas.        │
-- │  El código viejo sigue disponible como rollback.        │
-- └─────────────────────────────────────────────────────────┘

-- (aquí el nuevo código llega a producción via Vercel)

-- ┌─────────────────────────────────────────────────────────┐
-- │  FASE 3 — BACKFILL (ejecutar después de verificar)      │
-- │  Llenar datos históricos que el nuevo código necesita.  │
-- └─────────────────────────────────────────────────────────┘

-- Ejemplo de backfill seguro (batch para no bloquear tabla):
UPDATE pacientes
SET telefono_verificado = FALSE
WHERE telefono_verificado IS NULL;

-- ┌─────────────────────────────────────────────────────────┐
-- │  FASE 4 — CONTRACT (solo cuando el nuevo código         │
-- │  está estable en producción, mínimo 24h después)        │
-- └─────────────────────────────────────────────────────────┘

-- SOLO ENTONCES eliminar la estructura vieja:
-- ALTER TABLE pacientes DROP COLUMN telefono_viejo;
-- DROP TABLE IF EXISTS tabla_obsoleta;

-- =============================================================
-- CHECKLIST antes de ejecutar cualquier migración en PRODUCCIÓN
-- =============================================================
-- [ ] ¿La migración es reversible? (si no, hacer backup primero)
-- [ ] ¿Añado columnas como nullable o con DEFAULT? (nunca NOT NULL sin DEFAULT en tabla con datos)
-- [ ] ¿El código actual puede funcionar sin la columna nueva? (expand primero, deploy después)
-- [ ] ¿Hay una operación DROP/RENAME? → aplicar solo en Fase 4, no en Fase 1
-- [ ] ¿Tengo índice CONCURRENTLY? → Supabase ejecutar en SQL editor, no en migration file
-- [ ] ¿RLS activado en la tabla nueva? → activar siempre antes del deploy

-- RLS template para tabla nueva:
ALTER TABLE evaluaciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "psicologo_ve_sus_evaluaciones" ON evaluaciones
  FOR SELECT USING (
    paciente_id IN (
      SELECT id FROM pacientes WHERE clinica_id = (
        SELECT clinica_id FROM psicologos WHERE usuario_id = auth.uid()
      )
    )
  );

CREATE POLICY "psicologo_inserta_evaluaciones" ON evaluaciones
  FOR INSERT WITH CHECK (
    clinica_id = (
      SELECT clinica_id FROM psicologos WHERE usuario_id = auth.uid()
    )
  );
-- =============================================================
