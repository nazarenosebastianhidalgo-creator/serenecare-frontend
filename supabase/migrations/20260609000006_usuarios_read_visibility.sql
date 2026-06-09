-- ═══════════════════════════════════════════════════════════════════
-- usuarios: visibilidad de lectura — 09/06/2026
-- ═══════════════════════════════════════════════════════════════════
-- En la DB viva, `usuarios` solo tenía usuarios_self_read (cada uno su propia
-- fila). Eso rompe los joins del portal: el paciente no podía leer la fila de
-- su psicólogo → "Dr/a. " sin nombre en próxima cita / historial / telemedicina;
-- y el staff no podía listar colegas (getPsicologos).
--
-- Fix aditivo y seguro:
--   • super_admin → ve todos.
--   • staff (psicologo/admin_clinica/secretario) → ve todos los usuarios de su clínica.
--   • paciente → ve SOLO al staff de su clínica (su terapeuta), NO a otros pacientes.
-- usuarios_self_read sigue cubriendo la propia fila.
-- ═══════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS usuarios_clinica_read ON public.usuarios;
CREATE POLICY usuarios_clinica_read ON public.usuarios FOR SELECT
USING (
  get_my_rol() = 'super_admin'
  OR (
    clinica_id = get_my_clinica_id()
    AND (
      get_my_rol() = ANY (ARRAY['psicologo','admin_clinica','secretario'])
      OR rol = ANY (ARRAY['psicologo','admin_clinica','secretario'])
    )
  )
);
