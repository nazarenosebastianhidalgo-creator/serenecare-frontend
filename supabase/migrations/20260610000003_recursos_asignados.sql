-- ═══════════════════════════════════════════════════════════════════
-- Asignación de recursos a pacientes — 10/06/2026
-- El psicólogo asigna un recurso de la biblioteca a un paciente; el paciente
-- lo ve y descarga en su portal.
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.recursos_asignados (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recurso_id   uuid NOT NULL REFERENCES public.recursos(id) ON DELETE CASCADE,
  paciente_id  uuid NOT NULL REFERENCES public.pacientes(id) ON DELETE CASCADE,
  psicologo_id uuid REFERENCES auth.users(id),
  clinica_id   uuid REFERENCES public.clinicas(id),
  nota         text,
  visto        boolean DEFAULT false,
  created_at   timestamptz DEFAULT now(),
  UNIQUE (recurso_id, paciente_id)
);

CREATE INDEX IF NOT EXISTS idx_recursos_asig_paciente ON public.recursos_asignados(paciente_id);

ALTER TABLE public.recursos_asignados ENABLE ROW LEVEL SECURITY;

-- Staff de la clínica gestiona las asignaciones de su clínica
DROP POLICY IF EXISTS recursos_asig_staff ON public.recursos_asignados;
CREATE POLICY recursos_asig_staff ON public.recursos_asignados FOR ALL
  USING (
    get_my_rol() = 'super_admin'
    OR (get_my_rol() = ANY (ARRAY['psicologo','admin_clinica','secretario']) AND clinica_id = get_my_clinica_id())
  )
  WITH CHECK (
    get_my_rol() = 'super_admin'
    OR (get_my_rol() = ANY (ARRAY['psicologo','admin_clinica','secretario']) AND clinica_id = get_my_clinica_id())
  );

-- El paciente ve (y marca visto) sus propias asignaciones
DROP POLICY IF EXISTS recursos_asig_paciente_read ON public.recursos_asignados;
CREATE POLICY recursos_asig_paciente_read ON public.recursos_asignados FOR SELECT
  USING (paciente_id IN (SELECT id FROM public.pacientes WHERE usuario_id = auth.uid()));

DROP POLICY IF EXISTS recursos_asig_paciente_update ON public.recursos_asignados;
CREATE POLICY recursos_asig_paciente_update ON public.recursos_asignados FOR UPDATE
  USING (paciente_id IN (SELECT id FROM public.pacientes WHERE usuario_id = auth.uid()))
  WITH CHECK (paciente_id IN (SELECT id FROM public.pacientes WHERE usuario_id = auth.uid()));
