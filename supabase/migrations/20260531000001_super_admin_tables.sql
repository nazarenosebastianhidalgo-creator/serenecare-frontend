-- ============================================================
-- SereneCare — Tablas y columnas para Super Admin
-- ============================================================

-- ── Tabla planes ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS planes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre          TEXT NOT NULL,
  slug            TEXT UNIQUE NOT NULL,
  precio_mensual  NUMERIC(10,2) NOT NULL DEFAULT 0,
  precio_anual    NUMERIC(10,2),
  max_psicologos  INTEGER DEFAULT 3,
  max_pacientes   INTEGER DEFAULT 50,
  limite_ia_tokens INTEGER DEFAULT 10000,
  almacenamiento_gb INTEGER DEFAULT 5,
  activo          BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now()
);

INSERT INTO planes (nombre, slug, precio_mensual, precio_anual, max_psicologos, max_pacientes, limite_ia_tokens, almacenamiento_gb) VALUES
  ('Básico',       'basico',       49,  470,  2,  30,  5000,   2),
  ('Profesional',  'profesional',  99,  950,  5,  100, 20000,  10),
  ('Enterprise',   'enterprise',   199, 1900, 20, 500, 100000, 50)
ON CONFLICT (slug) DO NOTHING;

ALTER TABLE planes ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "dev_all_planes" ON planes FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── Tabla usuarios (admins, super admins — separado de psicologos) ──
CREATE TABLE IF NOT EXISTS usuarios (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id  UUID REFERENCES clinicas(id) ON DELETE CASCADE,
  nombre      TEXT NOT NULL,
  apellido    TEXT,
  email       TEXT UNIQUE NOT NULL,
  rol         TEXT NOT NULL CHECK (rol IN ('super_admin','admin_clinica','psicologo','paciente')),
  activo      BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "dev_all_usuarios" ON usuarios FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── Columnas nuevas en clinicas ───────────────────────────────
ALTER TABLE clinicas
  ADD COLUMN IF NOT EXISTS status         TEXT DEFAULT 'activa' CHECK (status IN ('activa','trial','suspendida')),
  ADD COLUMN IF NOT EXISTS plan_id        UUID REFERENCES planes(id),
  ADD COLUMN IF NOT EXISTS email_contacto TEXT,
  ADD COLUMN IF NOT EXISTS logo_url       TEXT,
  ADD COLUMN IF NOT EXISTS config_ia      JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS updated_at     TIMESTAMPTZ DEFAULT now();

-- Inicializar status desde activa (boolean existente)
UPDATE clinicas SET status = CASE WHEN activa THEN 'activa' ELSE 'suspendida' END WHERE status IS NULL;

-- Vincular plan_id desde el campo plan (texto existente)
UPDATE clinicas c SET plan_id = p.id FROM planes p WHERE c.plan = p.slug AND c.plan_id IS NULL;
