-- ═══════════════════════════════════════════════════════════════════
-- RGPD — Solicitudes de derechos + config RGPD por clínica  11/06/2026
-- ═══════════════════════════════════════════════════════════════════

-- Solicitudes de ejercicio de derechos (acceso/rectif/supresión/portab/oposición)
create table if not exists solicitudes_rgpd (
  id                uuid primary key default gen_random_uuid(),
  clinica_id        uuid references clinicas(id) on delete cascade,
  tipo              text,    -- acceso|rectificacion|supresion|portabilidad|oposicion
  solicitante_email text,
  estado            text default 'pendiente',  -- pendiente|en_proceso|resuelta|rechazada
  notas             text,
  creada_por        uuid,
  created_at        timestamptz default now(),
  resuelta_at       timestamptz
);

create index if not exists idx_solic_rgpd_clinica on solicitudes_rgpd(clinica_id, created_at desc);

alter table solicitudes_rgpd enable row level security;
drop policy if exists solicitudes_rgpd_staff on solicitudes_rgpd;
create policy solicitudes_rgpd_staff on solicitudes_rgpd for all using (
  get_my_rol() = 'super_admin'
  or (clinica_id = get_my_clinica_id() and get_my_rol() in ('admin_clinica','psicologo'))
) with check (
  get_my_rol() = 'super_admin'
  or (clinica_id = get_my_clinica_id() and get_my_rol() in ('admin_clinica','psicologo'))
);

-- Configuración RGPD por clínica (toggles del centro de compliance)
alter table clinicas add column if not exists config_rgpd jsonb default '{}'::jsonb;
