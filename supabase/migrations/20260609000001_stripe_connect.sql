-- ============================================================
-- SereneCare — Stripe Connect (marketplace pago paciente → psicólogo)
--
-- Modelo "Forma B": el psicólogo es el comerciante de registro.
--   · El dinero del paciente cae DIRECTO en la cuenta Stripe del psicólogo
--     (direct charge sobre la cuenta conectada).
--   · La plataforma solo cobra su comisión vía application_fee_amount (3%).
--   · En reembolso se devuelve también la comisión (refund_application_fee).
-- ============================================================

-- ── Cuenta Stripe Connect (Express) por psicólogo ─────────────
ALTER TABLE psicologos
  ADD COLUMN IF NOT EXISTS stripe_account_id      TEXT,
  ADD COLUMN IF NOT EXISTS stripe_charges_enabled BOOLEAN     DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_payouts_enabled BOOLEAN     DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_details_submitted BOOLEAN   DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_onboarding_at   TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_psicologos_stripe_account ON psicologos(stripe_account_id);

-- ── Facturas / cobros de sesión ───────────────────────────────
CREATE TABLE IF NOT EXISTS facturas (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id     UUID REFERENCES clinicas(id)   ON DELETE CASCADE,
  psicologo_id   UUID REFERENCES psicologos(id) ON DELETE SET NULL,
  paciente_id    UUID REFERENCES pacientes(id)  ON DELETE SET NULL,
  sesion_id      UUID REFERENCES sesiones(id)   ON DELETE SET NULL,

  numero         TEXT,                                   -- nº de factura legible (lo emite el psicólogo)
  concepto       TEXT NOT NULL DEFAULT 'Sesión de terapia',
  moneda         TEXT NOT NULL DEFAULT 'eur',
  importe        NUMERIC(10,2) NOT NULL,                 -- total que paga el paciente
  comision       NUMERIC(10,2) NOT NULL DEFAULT 0,       -- nuestra comisión (application_fee)

  estado         TEXT NOT NULL DEFAULT 'pendiente'
                 CHECK (estado IN ('pendiente','pagada','reembolsada','cancelada')),

  -- Referencias Stripe (la cuenta conectada es la del psicólogo)
  stripe_account_id            TEXT,
  stripe_checkout_session_id   TEXT,
  stripe_payment_intent_id     TEXT,
  stripe_refund_id             TEXT,
  checkout_url                 TEXT,

  fecha_pago      TIMESTAMPTZ,
  fecha_reembolso TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_facturas_clinica     ON facturas(clinica_id);
CREATE INDEX IF NOT EXISTS idx_facturas_psicologo   ON facturas(psicologo_id);
CREATE INDEX IF NOT EXISTS idx_facturas_paciente    ON facturas(paciente_id);
CREATE INDEX IF NOT EXISTS idx_facturas_estado      ON facturas(estado);
CREATE INDEX IF NOT EXISTS idx_facturas_checkout    ON facturas(stripe_checkout_session_id);
CREATE INDEX IF NOT EXISTS idx_facturas_pi          ON facturas(stripe_payment_intent_id);

ALTER TABLE facturas ENABLE ROW LEVEL SECURITY;

-- Política permisiva de desarrollo (se endurece en producción, igual que el resto de tablas)
DO $$ BEGIN
  CREATE POLICY "dev_all_facturas" ON facturas FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
