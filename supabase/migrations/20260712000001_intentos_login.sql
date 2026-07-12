-- ═══════════════════════════════════════════════════════════════════
-- Tracking de intentos de login  12/07/2026
-- ═══════════════════════════════════════════════════════════════════
-- Alimenta el panel "Seguridad & Accesos" del super admin (antes mostraba
-- arrays hardcodeados de fallos/bloqueados). Registra cada intento fallido
-- de credenciales desde js/auth.js vía el RPC registrar_intento_login.
-- El fallo ocurre ANTES de autenticarse (anon) → por eso el RPC es
-- SECURITY DEFINER y callable por anon, en vez de abrir INSERT en la tabla.

create table if not exists intentos_login (
  id         uuid primary key default gen_random_uuid(),
  email      text,
  exito      boolean not null default false,
  motivo     text,            -- credenciales|otp|suspendida|clinica_mismatch
  ip         text,            -- best-effort desde el cliente (puede ser null)
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists idx_intentos_login_created on intentos_login(created_at desc);
create index if not exists idx_intentos_login_email   on intentos_login(lower(email), created_at desc);

-- ── RPC: registra un intento. SECURITY DEFINER escribe sin política INSERT ──
create or replace function registrar_intento_login(
  p_email  text,
  p_exito  boolean default false,
  p_motivo text default null,
  p_ip     text default null,
  p_ua     text default null
) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into intentos_login(email, exito, motivo, ip, user_agent)
  values (lower(nullif(p_email, '')), coalesce(p_exito, false), p_motivo, p_ip, left(p_ua, 300));
exception when others then
  null;  -- el logging NUNCA rompe el login
end $$;

grant execute on function registrar_intento_login(text, boolean, text, text, text) to anon, authenticated;

-- ── RLS: solo super_admin lee; nadie inserta directo (solo el RPC definer) ──
alter table intentos_login enable row level security;
drop policy if exists intentos_login_read on intentos_login;
create policy intentos_login_read on intentos_login for select using (
  get_my_rol() = 'super_admin'
);
