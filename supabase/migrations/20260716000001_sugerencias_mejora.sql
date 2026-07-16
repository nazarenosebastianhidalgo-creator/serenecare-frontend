-- ═══════════════════════════════════════════════════════════════════
-- Sugerencias de mejora: feedback de usuarios → super admin  16/07/2026
-- ═══════════════════════════════════════════════════════════════════
-- Antes el widget "¿Qué mejorarías?" guardaba en localStorage (nunca salía
-- del navegador; el super admin no las veía de verdad). Ahora persisten en BD
-- y el super admin las ve todas (cross-tenant).

create table if not exists sugerencias_mejora (
  id             uuid primary key default gen_random_uuid(),
  usuario_id     uuid,
  rol            text,
  usuario_nombre text,
  clinica_id     uuid,
  clinica_nombre text,
  categoria      text,
  texto          text not null,
  prioridad      text,
  tamano         text,
  estado         text default 'pendiente',
  created_at     timestamptz default now()
);

create index if not exists idx_sugerencias_estado on sugerencias_mejora(estado);
create index if not exists idx_sugerencias_created on sugerencias_mejora(created_at desc);

alter table sugerencias_mejora enable row level security;

-- Insertar: cualquier usuario autenticado crea la suya (usuario_id = él mismo)
drop policy if exists sugerencias_insert on sugerencias_mejora;
create policy sugerencias_insert on sugerencias_mejora for insert to authenticated
  with check (usuario_id = auth.uid());

-- Leer: el super admin ve todas; el autor ve las suyas
drop policy if exists sugerencias_select on sugerencias_mejora;
create policy sugerencias_select on sugerencias_mejora for select to authenticated
  using (get_my_rol() = 'super_admin' or usuario_id = auth.uid());

-- Actualizar estado (revisada/descartada): solo el super admin
drop policy if exists sugerencias_update on sugerencias_mejora;
create policy sugerencias_update on sugerencias_mejora for update to authenticated
  using (get_my_rol() = 'super_admin') with check (get_my_rol() = 'super_admin');
