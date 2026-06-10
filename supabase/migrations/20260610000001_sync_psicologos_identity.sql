-- ═══════════════════════════════════════════════════════════════════
-- Fix identidad psicólogos — 10/06/2026
-- ═══════════════════════════════════════════════════════════════════
-- Problema: los psicólogos reales viven en `usuarios` (rol=psicologo), pero
-- las integraciones (Google Calendar, Stripe Connect, iCal, config emails) y
-- consentimientos buscan al psicólogo en la tabla `psicologos` (solo demos) por
-- email → match = 0 → esas features están rotas para psicólogos reales.
--
-- Solución (sincronizar, no migrar — las columnas de integración viven en
-- `psicologos` y mucho código las usa): un trigger espeja cada psicólogo de
-- `usuarios` hacia `psicologos`. Además se gatea la RLS de `psicologos` a staff
-- (antes `clinica_id = get_my_clinica_id()` sin rol → un paciente leía datos de
-- los psicólogos de su clínica: emails, stripe_account_id, webhook_url).
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- 1. RLS: gatear la rama de clínica a staff (cierra fuga a pacientes)
ALTER TABLE public.psicologos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS psicologos_all ON public.psicologos;
CREATE POLICY psicologos_all ON public.psicologos FOR ALL
  USING (
    get_my_rol() = 'super_admin'
    OR (get_my_rol() = ANY (ARRAY['psicologo','admin_clinica','secretario']) AND clinica_id = get_my_clinica_id())
  )
  WITH CHECK (
    get_my_rol() = 'super_admin'
    OR (get_my_rol() = ANY (ARRAY['psicologo','admin_clinica','secretario']) AND clinica_id = get_my_clinica_id())
  );

-- 2. Trigger de sincronización usuarios(rol=psicologo) -> psicologos
--    Respeta el UNIQUE(email): si ya existe fila con ese email, la actualiza
--    (preservando id e integraciones); si no, inserta con id = usuarios.id.
CREATE OR REPLACE FUNCTION public.sync_psicologo_from_usuario()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  IF NEW.rol = 'psicologo' THEN
    IF EXISTS (SELECT 1 FROM psicologos WHERE email = NEW.email) THEN
      UPDATE psicologos
         SET nombre = trim(coalesce(NEW.nombre,'') || ' ' || coalesce(NEW.apellido,'')),
             clinica_id = NEW.clinica_id
       WHERE email = NEW.email;
    ELSE
      INSERT INTO psicologos (id, clinica_id, nombre, email)
      VALUES (NEW.id, NEW.clinica_id,
              trim(coalesce(NEW.nombre,'') || ' ' || coalesce(NEW.apellido,'')),
              NEW.email);
    END IF;
  END IF;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_sync_psicologo ON public.usuarios;
CREATE TRIGGER trg_sync_psicologo
AFTER INSERT OR UPDATE OF rol, email, nombre, apellido, clinica_id ON public.usuarios
FOR EACH ROW EXECUTE FUNCTION public.sync_psicologo_from_usuario();

-- 3. Backfill de los psicólogos reales que faltan en psicologos
INSERT INTO public.psicologos (id, clinica_id, nombre, email)
SELECT u.id, u.clinica_id,
       trim(coalesce(u.nombre,'') || ' ' || coalesce(u.apellido,'')), u.email
FROM public.usuarios u
WHERE u.rol = 'psicologo'
  AND NOT EXISTS (SELECT 1 FROM public.psicologos p WHERE p.email = u.email);

COMMIT;
