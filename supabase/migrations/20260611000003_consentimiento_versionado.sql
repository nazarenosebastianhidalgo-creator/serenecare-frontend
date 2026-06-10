-- ═══════════════════════════════════════════════════════════════════
-- RGPD — Versionado de consentimientos  11/06/2026
-- ═══════════════════════════════════════════════════════════════════
-- Permite probar QUÉ versión del texto firmó cada paciente.
-- Foundation DB; el backend (/api/consents/sign) debe estampar
-- version + documento_texto + documento_hash al firmar (TODO backend).

-- Snapshot/versión en cada consentimiento firmado
alter table consentimientos add column if not exists version         text default 'v1.0';
alter table consentimientos add column if not exists documento_texto text;   -- texto exacto firmado (snapshot)
alter table consentimientos add column if not exists documento_hash  text;   -- hash del texto (integridad)

-- Plantillas canónicas versionadas (fuente de verdad del texto por tipo+versión)
create table if not exists plantillas_consentimiento (
  id         uuid primary key default gen_random_uuid(),
  tipo       text not null,    -- terapeutico|videollamada|datos
  version    text not null,    -- v1.0
  titulo     text,
  texto      text,
  vigente    boolean default true,
  created_at timestamptz default now(),
  unique (tipo, version)
);

alter table plantillas_consentimiento enable row level security;
drop policy if exists plantillas_consent_read  on plantillas_consentimiento;
drop policy if exists plantillas_consent_write on plantillas_consentimiento;
-- Lectura: cualquier usuario autenticado (necesita ver el texto para firmar)
create policy plantillas_consent_read  on plantillas_consentimiento for select using (auth.role() = 'authenticated');
-- Escritura: solo super_admin
create policy plantillas_consent_write on plantillas_consentimiento for all
  using (get_my_rol() = 'super_admin') with check (get_my_rol() = 'super_admin');

-- Seed v1.0 (BORRADOR — el texto legal real lo valida el abogado)
insert into plantillas_consentimiento (tipo, version, titulo, texto, vigente) values
 ('terapeutico','v1.0','Consentimiento informado de tratamiento','[BORRADOR — texto a validar por abogado] Consiento el inicio del tratamiento psicológico y el tratamiento de mis datos de salud con fines asistenciales conforme a la Política de Privacidad.', true),
 ('videollamada','v1.0','Autorización de videollamada','[BORRADOR — texto a validar por abogado] Autorizo la realización de sesiones por videollamada y el tratamiento técnico necesario para ello.', true),
 ('datos','v1.0','Manejo de datos sensibles (LOPD)','[BORRADOR — texto a validar por abogado] Consiento el tratamiento de mis datos personales de categoría especial conforme al art. 9 RGPD y la normativa LOPDGDD.', true)
on conflict (tipo, version) do nothing;
