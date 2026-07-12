-- ═══════════════════════════════════════════════════════════════════
-- Registro self-serve de creadores/afiliados  12/07/2026
-- ═══════════════════════════════════════════════════════════════════
-- El CTA de creadores.html (público, sin sesión) guarda el alta del
-- partner vía el RPC registrar_creador y devuelve un código provisional
-- de referido (se mapeará al programa de Lemon Squeezy cuando exista).
-- Mismo patrón que intentos_login: RPC SECURITY DEFINER callable por anon,
-- RLS de lectura solo super_admin.

create table if not exists creadores (
  id         uuid primary key default gen_random_uuid(),
  nombre     text,
  email      text,
  redes      text,          -- handle / enlaces a redes
  audiencia  text,          -- psicologos|clinicas|publico|otro
  mensaje    text,
  codigo     text unique default upper(substr(md5(gen_random_uuid()::text), 1, 8)),
  estado     text default 'pendiente',   -- pendiente|aprobado|rechazado
  created_at timestamptz not null default now()
);

create index if not exists idx_creadores_created on creadores(created_at desc);

-- ── RPC: alta de creador. SECURITY DEFINER escribe sin política INSERT ──
create or replace function registrar_creador(
  p_nombre    text,
  p_email     text,
  p_redes     text default null,
  p_audiencia text default null,
  p_mensaje   text default null
) returns text                       -- devuelve el código provisional de referido
language plpgsql security definer set search_path = public as $$
declare v_codigo text;
begin
  insert into creadores(nombre, email, redes, audiencia, mensaje)
  values (nullif(p_nombre, ''), lower(nullif(p_email, '')), p_redes, p_audiencia, p_mensaje)
  returning codigo into v_codigo;
  return v_codigo;
exception when others then
  return null;   -- nunca revienta el formulario público
end $$;

grant execute on function registrar_creador(text, text, text, text, text) to anon, authenticated;

-- ── RLS: solo super_admin lee; nadie inserta directo (solo el RPC definer) ──
alter table creadores enable row level security;
drop policy if exists creadores_read on creadores;
create policy creadores_read on creadores for select using (
  get_my_rol() = 'super_admin'
);
