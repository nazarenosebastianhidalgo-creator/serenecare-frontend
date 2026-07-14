-- ═══════════════════════════════════════════════════════════════════
-- Notas privadas del paciente durante la sesión (solo él las ve)  14/07/2026
-- ═══════════════════════════════════════════════════════════════════
-- Antes se guardaban solo en localStorage (se perdían al cambiar de
-- dispositivo). Ahora persisten en BD, una por cita (o una general si no
-- hay cita). RLS: el paciente solo accede a las suyas; el staff NO las ve.

create table if not exists notas_paciente (
  id           uuid primary key default gen_random_uuid(),
  paciente_id  uuid not null references pacientes(id) on delete cascade,
  cita_id      uuid references citas(id) on delete set null,
  clinica_id   uuid,
  contenido    text default '',
  updated_at   timestamptz default now(),
  created_at   timestamptz default now()
);

create index if not exists idx_notas_paciente_pac  on notas_paciente(paciente_id);
create index if not exists idx_notas_paciente_cita on notas_paciente(cita_id);

alter table notas_paciente enable row level security;

-- Solo el paciente dueño ve/edita sus notas (ni siquiera su psicólogo).
drop policy if exists notas_pac_all on notas_paciente;
create policy notas_pac_all on notas_paciente for all to authenticated
  using      (paciente_id in (select id from pacientes where usuario_id = auth.uid()))
  with check (paciente_id in (select id from pacientes where usuario_id = auth.uid()));
