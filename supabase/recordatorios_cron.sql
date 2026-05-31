-- ============================================================
-- RECORDATORIOS AUTOMÁTICOS CON pg_cron
-- Ejecutar en Supabase SQL Editor DESPUÉS de desplegar
-- la Edge Function send-reminder
-- ============================================================

-- 1. Habilitar pg_cron (solo si no está habilitado)
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- 2. Job que corre todos los días a las 9:00 AM (hora UTC)
--    Ajustá la hora según tu zona horaria
--    Para Argentina (UTC-3): 9am Argentina = 12:00 UTC
select cron.schedule(
  'recordatorios-diarios',
  '0 12 * * *',
  $$
  select net.http_post(
    url     := current_setting('app.supabase_url') || '/functions/v1/send-reminder',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    ),
    body    := '{}'::jsonb
  )
  $$
);

-- 3. Configurar variables de entorno para el cron
--    Reemplazá con tus valores reales
alter database postgres set app.supabase_url       = 'https://TU_PROYECTO.supabase.co';
alter database postgres set app.service_role_key   = 'TU_SERVICE_ROLE_KEY';

-- 4. Verificar que el job quedó registrado
select jobid, schedule, command, jobname from cron.job;

-- ============================================================
-- Para disparar manualmente (probar sin esperar el cron):
-- ============================================================
-- select net.http_post(
--   url     := 'https://TU_PROYECTO.supabase.co/functions/v1/send-reminder',
--   headers := '{"Content-Type":"application/json","Authorization":"Bearer TU_SERVICE_ROLE_KEY"}'::jsonb,
--   body    := '{}'::jsonb
-- );
