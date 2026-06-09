-- ═══════════════════════════════════════════════════════════════════
-- Fix RLS Portal Paciente — 09/06/2026
-- ═══════════════════════════════════════════════════════════════════
-- Problema: las políticas de producción (20260531000002_production_rls.sql)
-- usan `paciente_id = auth.uid()`, pero paciente_id = pacientes.id, NO el
-- auth.uid(). El vínculo real es pacientes.usuario_id = auth.uid().
--
-- En tablas como evaluaciones / informes_ia / notas_soap / citas / pacientes
-- ya convive la política correcta de schema_portal_paciente.sql (acceso OK
-- por OR permissive). Pero solicitudes_escalas, diario_animo y ejercicios
-- SOLO tienen la política equivocada → el paciente no puede acceder a sus
-- propios datos.
--
-- Este fix es ADITIVO: agrega la política de autoacceso correcta del paciente
-- sin tocar las políticas de staff existentes (que conservan su acceso).
-- Patrón: paciente_id IN (SELECT id FROM pacientes WHERE usuario_id = auth.uid())
-- ═══════════════════════════════════════════════════════════════════

-- ── solicitudes_escalas ───────────────────────────────────────────
DROP POLICY IF EXISTS "solicitudes_escalas_own_all" ON public.solicitudes_escalas;
CREATE POLICY "solicitudes_escalas_own_all" ON public.solicitudes_escalas
  FOR ALL
  USING (
    paciente_id IN (SELECT id FROM public.pacientes WHERE usuario_id = auth.uid())
  )
  WITH CHECK (
    paciente_id IN (SELECT id FROM public.pacientes WHERE usuario_id = auth.uid())
  );

-- ── diario_animo ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "diario_animo_own_all" ON public.diario_animo;
CREATE POLICY "diario_animo_own_all" ON public.diario_animo
  FOR ALL
  USING (
    paciente_id IN (SELECT id FROM public.pacientes WHERE usuario_id = auth.uid())
  )
  WITH CHECK (
    paciente_id IN (SELECT id FROM public.pacientes WHERE usuario_id = auth.uid())
  );

-- ── ejercicios ────────────────────────────────────────────────────
DROP POLICY IF EXISTS "ejercicios_own_all" ON public.ejercicios;
CREATE POLICY "ejercicios_own_all" ON public.ejercicios
  FOR ALL
  USING (
    paciente_id IN (SELECT id FROM public.pacientes WHERE usuario_id = auth.uid())
  )
  WITH CHECK (
    paciente_id IN (SELECT id FROM public.pacientes WHERE usuario_id = auth.uid())
  );

-- ═══════════════════════════════════════════════════════════════════
-- consentimientos — RLS estaba DESHABILITADA (tabla abierta).
-- La firma del paciente y la gestión de staff van por el backend Express
-- (service_role → bypassa RLS), así que habilitar RLS no rompe esos flujos.
-- Pero el portal del paciente ahora lee su consentimiento pendiente directo
-- por Supabase para construir el link de firma → necesita política de lectura.
-- ═══════════════════════════════════════════════════════════════════
ALTER TABLE public.consentimientos ENABLE ROW LEVEL SECURITY;

-- Paciente puede ver SUS propios consentimientos (para obtener el token de firma)
DROP POLICY IF EXISTS "consentimientos_own_read" ON public.consentimientos;
CREATE POLICY "consentimientos_own_read" ON public.consentimientos
  FOR SELECT
  USING (
    paciente_id IN (SELECT id FROM public.pacientes WHERE usuario_id = auth.uid())
  );

-- Staff de la clínica gestiona los consentimientos de su clínica
DROP POLICY IF EXISTS "consentimientos_clinica_all" ON public.consentimientos;
CREATE POLICY "consentimientos_clinica_all" ON public.consentimientos
  FOR ALL
  USING (
    clinica_id IN (SELECT clinica_id FROM public.usuarios WHERE id = auth.uid())
  )
  WITH CHECK (
    clinica_id IN (SELECT clinica_id FROM public.usuarios WHERE id = auth.uid())
  );
