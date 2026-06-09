-- ═══════════════════════════════════════════════════════════════════
-- Fix RLS — role-gate de las políticas de clínica (PHI cross-access) — 09/06/2026
-- ═══════════════════════════════════════════════════════════════════
-- Problema: varias políticas conceden acceso "clinica_id = get_my_clinica_id()"
-- (o IN (SELECT clinica_id FROM usuarios WHERE id=auth.uid())) SIN filtrar por rol.
-- get_my_clinica_id() lee usuarios.clinica_id, y los PACIENTES también tienen
-- clinica_id en usuarios → un paciente logueado podía leer/editar pacientes,
-- citas, notas_soap, informes_ia, evaluaciones y consentimientos de TODA su clínica.
--
-- Fix: gatear la rama de clínica a roles de staff. El paciente conserva SOLO
-- su acceso propio (políticas *_own_* / *_paciente_* ya existentes).
-- super_admin mantiene acceso (rama explícita).
--
-- Las ramas EXISTS sobre la tabla `psicologos` (evaluaciones_all, informes_ia_all,
-- solicitudes_escalas_all, ejercicios_all) NO se tocan: están muertas en datos
-- reales (psicologo_id apunta a auth.users/usuarios, no a psicologos.id) y tocarlas
-- arriesgaría las escrituras de staff. No filtran a pacientes en la práctica.
--
-- G = condición de staff de la clínica (reutilizada en todas las políticas):
--   super_admin  OR  (rol ∈ {psicologo,admin_clinica,secretario} AND clinica_id = la mía)
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- ── pacientes ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS pacientes_all           ON public.pacientes;
DROP POLICY IF EXISTS pacientes_clinica_read  ON public.pacientes;
DROP POLICY IF EXISTS pacientes_clinica_write ON public.pacientes;
-- (se conserva pacientes_own_read: usuario_id = auth.uid())

CREATE POLICY pacientes_staff_all ON public.pacientes FOR ALL
  USING (
    get_my_rol() = 'super_admin'
    OR (get_my_rol() = ANY (ARRAY['psicologo','admin_clinica','secretario']) AND clinica_id = get_my_clinica_id())
  )
  WITH CHECK (
    get_my_rol() = 'super_admin'
    OR (get_my_rol() = ANY (ARRAY['psicologo','admin_clinica','secretario']) AND clinica_id = get_my_clinica_id())
  );

-- El paciente puede editar SU propia ficha (perfil, preferencias)
CREATE POLICY pacientes_own_update ON public.pacientes FOR UPDATE
  USING ( usuario_id = auth.uid() )
  WITH CHECK ( usuario_id = auth.uid() );

-- Onboarding: el paciente reclama la ficha que le crearon con SU email verificado
-- (auth.jwt()->>'email' = email del token, no manipulable). Solo si está sin vincular.
-- Hace falta SELECT además de UPDATE: el `update().eq('id',...)` filtra la fila por
-- WHERE y Postgres exige visibilidad de SELECT para encontrarla.
CREATE POLICY pacientes_claim_read ON public.pacientes FOR SELECT
  USING ( usuario_id IS NULL AND lower(email) = lower(auth.jwt() ->> 'email') );

CREATE POLICY pacientes_claim_invite ON public.pacientes FOR UPDATE
  USING ( usuario_id IS NULL AND lower(email) = lower(auth.jwt() ->> 'email') )
  WITH CHECK ( usuario_id = auth.uid() );

-- ── citas ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS citas_clinica_all ON public.citas;
CREATE POLICY citas_clinica_all ON public.citas FOR ALL
  USING (
    get_my_rol() = 'super_admin'
    OR (get_my_rol() = ANY (ARRAY['psicologo','admin_clinica','secretario']) AND clinica_id = get_my_clinica_id())
  )
  WITH CHECK (
    get_my_rol() = 'super_admin'
    OR (get_my_rol() = ANY (ARRAY['psicologo','admin_clinica','secretario']) AND clinica_id = get_my_clinica_id())
  );

-- ── consentimientos ───────────────────────────────────────────────
DROP POLICY IF EXISTS consentimientos_clinica_all ON public.consentimientos;
CREATE POLICY consentimientos_clinica_all ON public.consentimientos FOR ALL
  USING (
    get_my_rol() = 'super_admin'
    OR (get_my_rol() = ANY (ARRAY['psicologo','admin_clinica','secretario']) AND clinica_id = get_my_clinica_id())
  )
  WITH CHECK (
    get_my_rol() = 'super_admin'
    OR (get_my_rol() = ANY (ARRAY['psicologo','admin_clinica','secretario']) AND clinica_id = get_my_clinica_id())
  );

-- ── evaluaciones (lectura de staff) ───────────────────────────────
DROP POLICY IF EXISTS evaluaciones_clinica_read ON public.evaluaciones;
CREATE POLICY evaluaciones_clinica_read ON public.evaluaciones FOR SELECT
  USING (
    get_my_rol() = 'super_admin'
    OR (get_my_rol() = ANY (ARRAY['psicologo','admin_clinica','secretario']) AND clinica_id = get_my_clinica_id())
  );

-- ── informes_ia ───────────────────────────────────────────────────
DROP POLICY IF EXISTS informes_clinica_all ON public.informes_ia;
CREATE POLICY informes_clinica_all ON public.informes_ia FOR ALL
  USING (
    get_my_rol() = 'super_admin'
    OR (get_my_rol() = ANY (ARRAY['psicologo','admin_clinica','secretario']) AND clinica_id = get_my_clinica_id())
  )
  WITH CHECK (
    get_my_rol() = 'super_admin'
    OR (get_my_rol() = ANY (ARRAY['psicologo','admin_clinica','secretario']) AND clinica_id = get_my_clinica_id())
  );

-- ── notas_soap ────────────────────────────────────────────────────
DROP POLICY IF EXISTS notas_clinica_all ON public.notas_soap;
CREATE POLICY notas_clinica_all ON public.notas_soap FOR ALL
  USING (
    get_my_rol() = 'super_admin'
    OR (get_my_rol() = ANY (ARRAY['psicologo','admin_clinica','secretario']) AND clinica_id = get_my_clinica_id())
  )
  WITH CHECK (
    get_my_rol() = 'super_admin'
    OR (get_my_rol() = ANY (ARRAY['psicologo','admin_clinica','secretario']) AND clinica_id = get_my_clinica_id())
  );

-- notas_soap_read mezclaba clinica sin gate → gatear; el paciente lee notas
-- compartidas vía notas_paciente_shared (intacta).
DROP POLICY IF EXISTS notas_soap_read ON public.notas_soap;
CREATE POLICY notas_soap_read ON public.notas_soap FOR SELECT
  USING (
    psicologo_id = auth.uid()
    OR get_my_rol() = 'super_admin'
    OR (get_my_rol() = ANY (ARRAY['psicologo','admin_clinica','secretario']) AND clinica_id = get_my_clinica_id())
  );

COMMIT;
