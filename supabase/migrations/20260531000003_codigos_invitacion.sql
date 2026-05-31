-- ============================================================
-- SereneCare — Tabla códigos de invitación beta
-- ============================================================

CREATE TABLE IF NOT EXISTS codigos_invitacion (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo       TEXT UNIQUE NOT NULL,
  batch        INTEGER NOT NULL DEFAULT 1,
  variant_id   TEXT NOT NULL,
  precio       NUMERIC(10,2) NOT NULL,
  usado        BOOLEAN DEFAULT false,
  usado_por    TEXT,
  usado_at     TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE codigos_invitacion ENABLE ROW LEVEL SECURITY;

-- Lectura pública (para validar el código al registrarse)
CREATE POLICY "codigos_read" ON codigos_invitacion FOR SELECT USING (true);

-- Solo super_admin puede insertar/modificar
CREATE POLICY "codigos_write" ON codigos_invitacion FOR ALL
  USING (get_my_rol() = 'super_admin')
  WITH CHECK (get_my_rol() = 'super_admin');

-- ── Batch 1 — Fundadores (€29, variant 1728535) ───────────────
INSERT INTO codigos_invitacion (codigo, batch, variant_id, precio) VALUES
  ('BETA-FUND-001', 1, '1728535', 29),
  ('BETA-FUND-002', 1, '1728535', 29),
  ('BETA-FUND-003', 1, '1728535', 29),
  ('BETA-FUND-004', 1, '1728535', 29),
  ('BETA-FUND-005', 1, '1728535', 29),
  ('BETA-FUND-006', 1, '1728535', 29),
  ('BETA-FUND-007', 1, '1728535', 29),
  ('BETA-FUND-008', 1, '1728535', 29),
  ('BETA-FUND-009', 1, '1728535', 29),
  ('BETA-FUND-010', 1, '1728535', 29)
ON CONFLICT (codigo) DO NOTHING;

-- ── Batch 2 — Early Adopters (€39, variant 1728568) ───────────
INSERT INTO codigos_invitacion (codigo, batch, variant_id, precio) VALUES
  ('BETA-EARLY-001', 2, '1728568', 39),
  ('BETA-EARLY-002', 2, '1728568', 39),
  ('BETA-EARLY-003', 2, '1728568', 39),
  ('BETA-EARLY-004', 2, '1728568', 39),
  ('BETA-EARLY-005', 2, '1728568', 39),
  ('BETA-EARLY-006', 2, '1728568', 39),
  ('BETA-EARLY-007', 2, '1728568', 39),
  ('BETA-EARLY-008', 2, '1728568', 39),
  ('BETA-EARLY-009', 2, '1728568', 39),
  ('BETA-EARLY-010', 2, '1728568', 39),
  ('BETA-EARLY-011', 2, '1728568', 39),
  ('BETA-EARLY-012', 2, '1728568', 39),
  ('BETA-EARLY-013', 2, '1728568', 39),
  ('BETA-EARLY-014', 2, '1728568', 39),
  ('BETA-EARLY-015', 2, '1728568', 39),
  ('BETA-EARLY-016', 2, '1728568', 39),
  ('BETA-EARLY-017', 2, '1728568', 39),
  ('BETA-EARLY-018', 2, '1728568', 39),
  ('BETA-EARLY-019', 2, '1728568', 39),
  ('BETA-EARLY-020', 2, '1728568', 39)
ON CONFLICT (codigo) DO NOTHING;
