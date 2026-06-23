-- Migración: añadir columna fecha_baja a clinicas para el borrado automático a los 30 días
-- También añadimos notificado_dia_X para saber qué recordatorios ya se enviaron

alter table public.clinicas
  add column if not exists fecha_baja timestamptz,
  add column if not exists notificado_dia_7  boolean default false,
  add column if not exists notificado_dia_15 boolean default false,
  add column if not exists notificado_dia_28 boolean default false,
  -- Si no es NULL, significa que solo un psicólogo se dio de baja (no toda la clínica)
  add column if not exists psicologo_baja_id uuid references public.usuarios(id);

-- Añadir 'baja' al check de status si no existe ya
alter table public.clinicas
  drop constraint if exists clinicas_status_check,
  add constraint clinicas_status_check
    check (status in ('activa', 'suspendida', 'trial', 'baja'));

-- Índice para que el limpiador encuentre rápido las clínicas a borrar
create index if not exists idx_clinicas_fecha_baja
  on public.clinicas(fecha_baja)
  where status = 'baja' and fecha_baja is not null;
