-- ═══════════════════════════════════════════════════════════════════
-- Recursos: soporte de archivo subido (audios de relajación, PDF, etc.)  13/07/2026
-- ═══════════════════════════════════════════════════════════════════
-- La psicóloga puede crear un recurso propio con instrucciones y/o subir un
-- archivo (audio/pdf/imagen). Se guarda en el bucket público 'recursos' y su
-- URL en recursos.archivo_url. El paciente lo reproduce (audio) o lo descarga.

alter table recursos add column if not exists archivo_url  text;
alter table recursos add column if not exists archivo_tipo text;   -- audio|pdf|imagen|otro
alter table recursos add column if not exists clinica_id   uuid;   -- recurso propio de una clínica (los seed son globales = null)

-- ── Bucket público para los archivos de recursos ──
insert into storage.buckets (id, name, public)
values ('recursos', 'recursos', true)
on conflict (id) do nothing;

-- ── Políticas de Storage ──
-- Lectura: pública (bucket public) + policy explícita para listar
drop policy if exists recursos_obj_read on storage.objects;
create policy recursos_obj_read on storage.objects
  for select using (bucket_id = 'recursos');

-- Subida: cualquier usuario autenticado (psicólogo/admin) puede subir a este bucket
drop policy if exists recursos_obj_insert on storage.objects;
create policy recursos_obj_insert on storage.objects
  for insert to authenticated with check (bucket_id = 'recursos');

-- Borrado del propio archivo (por si rehace la subida)
drop policy if exists recursos_obj_delete on storage.objects;
create policy recursos_obj_delete on storage.objects
  for delete to authenticated using (bucket_id = 'recursos' and owner = auth.uid());

-- ── recursos: el staff puede CREAR recursos propios de su clínica ──
-- (antes solo super_admin vía recursos_admin). recursos_read (activo=true) ya
-- deja que paciente y psicóloga los lean.
drop policy if exists recursos_staff_insert on recursos;
create policy recursos_staff_insert on recursos
  for insert to authenticated
  with check (
    get_my_rol() in ('psicologo','admin_clinica','secretario')
    and clinica_id = get_my_clinica_id()
  );
