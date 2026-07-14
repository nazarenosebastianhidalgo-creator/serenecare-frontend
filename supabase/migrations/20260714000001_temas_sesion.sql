-- ═══════════════════════════════════════════════════════════════════
-- "Para tu próxima sesión"  14/07/2026
-- ═══════════════════════════════════════════════════════════════════
-- El paciente apunta los temas/dudas que quiere tratar en su próxima sesión.
-- El terapeuta los ve en la ficha y durante la videollamada. Capa aditiva.

create table if not exists temas_sesion (
  id          uuid primary key default gen_random_uuid(),
  paciente_id uuid not null unique,
  clinica_id  uuid,
  contenido   text,
  updated_at  timestamptz not null default now(),
  created_at  timestamptz not null default now(),
  constraint temas_sesion_paciente_fk foreign key (paciente_id) references pacientes(id) on delete cascade
);

create index if not exists idx_temas_sesion_pac on temas_sesion(paciente_id);

alter table temas_sesion enable row level security;

-- El paciente gestiona sus propios temas
drop policy if exists temas_paciente on temas_sesion;
create policy temas_paciente on temas_sesion for all
  using      (paciente_id in (select id from pacientes where usuario_id = auth.uid()))
  with check (paciente_id in (select id from pacientes where usuario_id = auth.uid()));

-- El staff ve los temas de los pacientes de su clínica
drop policy if exists temas_staff on temas_sesion;
create policy temas_staff on temas_sesion for select
  using (get_my_rol() in ('psicologo','admin_clinica','secretario') and clinica_id = get_my_clinica_id());
