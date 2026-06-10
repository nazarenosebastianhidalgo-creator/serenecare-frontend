-- ═══════════════════════════════════════════════════════════════════
-- RGPD — Registro de accesos a datos clínicos (audit log)  11/06/2026
-- ═══════════════════════════════════════════════════════════════════
-- Trazabilidad de quién accede/modifica datos de salud (art. 5.1.f / 30 RGPD).
-- Escrituras → triggers automáticos. Lecturas → RPC registrar_lectura().
-- El logging NUNCA bloquea la operación clínica (exception -> null).

create table if not exists logs_acceso (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid,                       -- auth.uid() de quien actúa
  actor_rol   text,
  clinica_id  uuid,                       -- clínica del DATO accedido
  accion      text,                       -- lectura|creacion|modificacion|borrado|exportacion|login
  recurso     text,                       -- pacientes|notas_soap|evaluaciones|citas|consentimientos
  recurso_id  uuid,
  paciente_id uuid,                       -- a qué paciente pertenece el dato
  ip          text,
  detalle     text,
  created_at  timestamptz default now()
);

create index if not exists idx_logs_acceso_clinica   on logs_acceso(clinica_id, created_at desc);
create index if not exists idx_logs_acceso_paciente  on logs_acceso(paciente_id, created_at desc);
create index if not exists idx_logs_acceso_actor     on logs_acceso(actor_id, created_at desc);

-- ── Función de trigger: log de ESCRITURAS (genérica vía to_jsonb) ──
create or replace function fn_log_acceso() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_row jsonb := to_jsonb(coalesce(NEW, OLD));
begin
  begin
    insert into logs_acceso(actor_id, actor_rol, clinica_id, accion, recurso, recurso_id, paciente_id)
    values (
      auth.uid(),
      get_my_rol(),
      nullif(v_row->>'clinica_id','')::uuid,
      case TG_OP when 'INSERT' then 'creacion' when 'UPDATE' then 'modificacion' else 'borrado' end,
      TG_TABLE_NAME,
      nullif(v_row->>'id','')::uuid,
      coalesce(nullif(v_row->>'paciente_id','')::uuid,
               case when TG_TABLE_NAME = 'pacientes' then nullif(v_row->>'id','')::uuid end)
    );
  exception when others then
    null;  -- el log nunca bloquea la operación clínica
  end;
  return coalesce(NEW, OLD);
end $$;

-- ── Adjuntar triggers a las tablas clínicas sensibles ──
do $$
declare t text;
begin
  foreach t in array array['pacientes','notas_soap','evaluaciones','citas','consentimientos'] loop
    if to_regclass('public.'||t) is not null then
      execute format('drop trigger if exists trg_log_acceso on public.%I', t);
      execute format('create trigger trg_log_acceso after insert or update or delete on public.%I for each row execute function fn_log_acceso()', t);
    end if;
  end loop;
end $$;

-- ── RPC para registrar LECTURAS (la app la llama al abrir una ficha) ──
create or replace function registrar_lectura(
  p_recurso text, p_recurso_id uuid,
  p_paciente_id uuid default null, p_clinica_id uuid default null
) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into logs_acceso(actor_id, actor_rol, clinica_id, accion, recurso, recurso_id, paciente_id)
  values (auth.uid(), get_my_rol(), coalesce(p_clinica_id, get_my_clinica_id()),
          'lectura', p_recurso, p_recurso_id, p_paciente_id);
exception when others then null;
end $$;
grant execute on function registrar_lectura(text, uuid, uuid, uuid) to authenticated;

-- ── RLS: super_admin todo; admin_clinica su clínica; paciente sus propios accesos ──
alter table logs_acceso enable row level security;
drop policy if exists logs_acceso_read on logs_acceso;
create policy logs_acceso_read on logs_acceso for select using (
  get_my_rol() = 'super_admin'
  or (get_my_rol() = 'admin_clinica' and clinica_id = get_my_clinica_id())
  or (paciente_id in (select id from pacientes where usuario_id = auth.uid()))
);
-- Sin política de INSERT: solo escriben las funciones SECURITY DEFINER (trigger/RPC).
