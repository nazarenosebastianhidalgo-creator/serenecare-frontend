-- ═══════════════════════════════════════════════════════════════════
-- Ejercicios interactivos: el paciente completa y guarda su respuesta  13/07/2026
-- ═══════════════════════════════════════════════════════════════════
-- Capa ADITIVA sobre recursos/recursos_asignados: para los recursos tipo
-- ejercicio, el paciente rellena su respuesta en la app y se guarda aquí.
-- La psicóloga la ve en la ficha del paciente. No toca el modelo de recursos.

create table if not exists respuestas_ejercicios (
  id          uuid primary key default gen_random_uuid(),
  recurso_id  uuid not null,
  paciente_id uuid not null,
  clinica_id  uuid,
  respuesta   text,
  updated_at  timestamptz not null default now(),
  created_at  timestamptz not null default now(),
  unique (recurso_id, paciente_id),
  constraint respuestas_ejercicios_recurso_fk  foreign key (recurso_id)  references recursos(id)  on delete cascade,
  constraint respuestas_ejercicios_paciente_fk foreign key (paciente_id) references pacientes(id) on delete cascade
);

create index if not exists idx_respuestas_ej_pac on respuestas_ejercicios(paciente_id, updated_at desc);

alter table respuestas_ejercicios enable row level security;

-- El paciente gestiona sus propias respuestas (insert/select/update)
drop policy if exists respej_paciente on respuestas_ejercicios;
create policy respej_paciente on respuestas_ejercicios for all
  using      (paciente_id in (select id from pacientes where usuario_id = auth.uid()))
  with check (paciente_id in (select id from pacientes where usuario_id = auth.uid()));

-- El staff ve las respuestas de los pacientes de su clínica
drop policy if exists respej_staff on respuestas_ejercicios;
create policy respej_staff on respuestas_ejercicios for select
  using (get_my_rol() in ('psicologo','admin_clinica','secretario') and clinica_id = get_my_clinica_id());
