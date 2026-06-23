-- ═══════════════════════════════════════════════════════════════════
-- Permitir que el paciente INSERTE su propio consentimiento al
-- activar la cuenta (registro_paciente.html), que antes iba por
-- el backend Railway (service_role → bypass RLS).
-- ═══════════════════════════════════════════════════════════════════

-- El paciente solo puede insertar el consentimiento donde él es
-- el paciente_id y está asociado a su usuario_id.
DROP POLICY IF EXISTS consentimientos_paciente_insert ON public.consentimientos;
CREATE POLICY consentimientos_paciente_insert ON public.consentimientos
  FOR INSERT
  WITH CHECK (
    get_my_rol() = 'paciente'
    AND paciente_id IN (SELECT id FROM public.pacientes WHERE usuario_id = auth.uid())
  );
