-- ============================================================
-- POLÍTICAS DE SEGURIDAD ROW LEVEL SECURITY (RLS)
-- SereneCare — Multi-tenant SaaS para clínicas psicológicas
--
-- INSTRUCCIONES:
--   Ejecutar en Supabase → SQL Editor
--   Requiere permisos de superusuario (postgres)
--   Idempotente: puede re-ejecutarse sin errores
-- ============================================================


-- ============================================================
-- 1. FUNCIONES AUXILIARES (SECURITY DEFINER para evitar
--    recursión infinita al consultar la tabla usuarios)
-- ============================================================

CREATE OR REPLACE FUNCTION auth.get_clinica_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT clinica_id FROM public.usuarios WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION auth.get_user_rol()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT rol FROM public.usuarios WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION auth.is_super_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND rol = 'super_admin'
  )
$$;

CREATE OR REPLACE FUNCTION auth.is_admin_clinica()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND rol = 'admin_clinica'
  )
$$;


-- ============================================================
-- 2. HABILITAR RLS EN TODAS LAS TABLAS
-- ============================================================

ALTER TABLE public.usuarios           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinicas           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pacientes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.citas              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recordatorios      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sesiones_terapia   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notas_soap         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documentos         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escalas            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mensajes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planes             ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- 3. TABLA: usuarios
-- ============================================================

DROP POLICY IF EXISTS "usuarios_select" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_insert" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_update" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_delete" ON public.usuarios;

-- SELECT: propio registro + misma clínica (admin ve todo, psicologo solo su clínica)
CREATE POLICY "usuarios_select" ON public.usuarios FOR SELECT
  USING (
    auth.is_super_admin()
    OR id = auth.uid()
    OR clinica_id = auth.get_clinica_id()
  );

-- INSERT: solo admin_clinica puede crear usuarios en su propia clínica; super_admin en cualquiera
CREATE POLICY "usuarios_insert" ON public.usuarios FOR INSERT
  WITH CHECK (
    auth.is_super_admin()
    OR (auth.is_admin_clinica() AND clinica_id = auth.get_clinica_id())
  );

-- UPDATE: propio registro (datos personales) + admin puede modificar usuarios de su clínica
CREATE POLICY "usuarios_update" ON public.usuarios FOR UPDATE
  USING (
    auth.is_super_admin()
    OR id = auth.uid()
    OR (auth.is_admin_clinica() AND clinica_id = auth.get_clinica_id())
  );

-- DELETE: solo super_admin puede eliminar registros (preferir activo=false)
CREATE POLICY "usuarios_delete" ON public.usuarios FOR DELETE
  USING (auth.is_super_admin());


-- ============================================================
-- 4. TABLA: clinicas
-- ============================================================

DROP POLICY IF EXISTS "clinicas_select" ON public.clinicas;
DROP POLICY IF EXISTS "clinicas_insert" ON public.clinicas;
DROP POLICY IF EXISTS "clinicas_update" ON public.clinicas;
DROP POLICY IF EXISTS "clinicas_delete" ON public.clinicas;

-- SELECT: admin ve su propia clínica; super_admin ve todas
CREATE POLICY "clinicas_select" ON public.clinicas FOR SELECT
  USING (
    auth.is_super_admin()
    OR id = auth.get_clinica_id()
  );

-- INSERT: solo super_admin o registro automático vía service role
CREATE POLICY "clinicas_insert" ON public.clinicas FOR INSERT
  WITH CHECK (auth.is_super_admin());

-- UPDATE: admin_clinica puede actualizar SU clínica (restricción de plan_id via trigger)
CREATE POLICY "clinicas_update" ON public.clinicas FOR UPDATE
  USING (
    auth.is_super_admin()
    OR (auth.is_admin_clinica() AND id = auth.get_clinica_id())
  );

-- DELETE: solo super_admin
CREATE POLICY "clinicas_delete" ON public.clinicas FOR DELETE
  USING (auth.is_super_admin());


-- ============================================================
-- 5. TABLA: pacientes
-- ============================================================

DROP POLICY IF EXISTS "pacientes_select" ON public.pacientes;
DROP POLICY IF EXISTS "pacientes_insert" ON public.pacientes;
DROP POLICY IF EXISTS "pacientes_update" ON public.pacientes;
DROP POLICY IF EXISTS "pacientes_delete" ON public.pacientes;

CREATE POLICY "pacientes_select" ON public.pacientes FOR SELECT
  USING (
    auth.is_super_admin()
    OR clinica_id = auth.get_clinica_id()
  );

CREATE POLICY "pacientes_insert" ON public.pacientes FOR INSERT
  WITH CHECK (
    auth.is_super_admin()
    OR clinica_id = auth.get_clinica_id()
  );

CREATE POLICY "pacientes_update" ON public.pacientes FOR UPDATE
  USING (
    auth.is_super_admin()
    OR clinica_id = auth.get_clinica_id()
  );

-- Solo admin o super_admin pueden eliminar pacientes
CREATE POLICY "pacientes_delete" ON public.pacientes FOR DELETE
  USING (
    auth.is_super_admin()
    OR (auth.is_admin_clinica() AND clinica_id = auth.get_clinica_id())
  );


-- ============================================================
-- 6. TABLA: citas
-- ============================================================

DROP POLICY IF EXISTS "citas_select" ON public.citas;
DROP POLICY IF EXISTS "citas_insert" ON public.citas;
DROP POLICY IF EXISTS "citas_update" ON public.citas;
DROP POLICY IF EXISTS "citas_delete" ON public.citas;

CREATE POLICY "citas_select" ON public.citas FOR SELECT
  USING (
    auth.is_super_admin()
    OR clinica_id = auth.get_clinica_id()
  );

CREATE POLICY "citas_insert" ON public.citas FOR INSERT
  WITH CHECK (
    auth.is_super_admin()
    OR clinica_id = auth.get_clinica_id()
  );

CREATE POLICY "citas_update" ON public.citas FOR UPDATE
  USING (
    auth.is_super_admin()
    OR clinica_id = auth.get_clinica_id()
  );

CREATE POLICY "citas_delete" ON public.citas FOR DELETE
  USING (
    auth.is_super_admin()
    OR (auth.is_admin_clinica() AND clinica_id = auth.get_clinica_id())
  );


-- ============================================================
-- 7. TABLA: sesiones_terapia / notas_soap
-- ============================================================

DROP POLICY IF EXISTS "sesiones_terapia_select" ON public.sesiones_terapia;
DROP POLICY IF EXISTS "sesiones_terapia_insert" ON public.sesiones_terapia;
DROP POLICY IF EXISTS "sesiones_terapia_update" ON public.sesiones_terapia;

DROP POLICY IF EXISTS "notas_soap_select" ON public.notas_soap;
DROP POLICY IF EXISTS "notas_soap_insert" ON public.notas_soap;
DROP POLICY IF EXISTS "notas_soap_update" ON public.notas_soap;

CREATE POLICY "sesiones_terapia_select" ON public.sesiones_terapia FOR SELECT
  USING (auth.is_super_admin() OR clinica_id = auth.get_clinica_id());

CREATE POLICY "sesiones_terapia_insert" ON public.sesiones_terapia FOR INSERT
  WITH CHECK (auth.is_super_admin() OR clinica_id = auth.get_clinica_id());

CREATE POLICY "sesiones_terapia_update" ON public.sesiones_terapia FOR UPDATE
  USING (auth.is_super_admin() OR clinica_id = auth.get_clinica_id());

CREATE POLICY "notas_soap_select" ON public.notas_soap FOR SELECT
  USING (auth.is_super_admin() OR clinica_id = auth.get_clinica_id());

CREATE POLICY "notas_soap_insert" ON public.notas_soap FOR INSERT
  WITH CHECK (auth.is_super_admin() OR clinica_id = auth.get_clinica_id());

CREATE POLICY "notas_soap_update" ON public.notas_soap FOR UPDATE
  USING (auth.is_super_admin() OR clinica_id = auth.get_clinica_id());


-- ============================================================
-- 8. TABLA: recordatorios
-- ============================================================

DROP POLICY IF EXISTS "recordatorios_select" ON public.recordatorios;
DROP POLICY IF EXISTS "recordatorios_insert" ON public.recordatorios;

CREATE POLICY "recordatorios_select" ON public.recordatorios FOR SELECT
  USING (auth.is_super_admin() OR clinica_id = auth.get_clinica_id());

CREATE POLICY "recordatorios_insert" ON public.recordatorios FOR INSERT
  WITH CHECK (auth.is_super_admin() OR clinica_id = auth.get_clinica_id());


-- ============================================================
-- 9. TABLA: documentos / escalas
-- ============================================================

DROP POLICY IF EXISTS "documentos_select" ON public.documentos;
DROP POLICY IF EXISTS "documentos_insert" ON public.documentos;
DROP POLICY IF EXISTS "documentos_update" ON public.documentos;

DROP POLICY IF EXISTS "escalas_select" ON public.escalas;
DROP POLICY IF EXISTS "escalas_insert" ON public.escalas;

CREATE POLICY "documentos_select" ON public.documentos FOR SELECT
  USING (auth.is_super_admin() OR clinica_id = auth.get_clinica_id());

CREATE POLICY "documentos_insert" ON public.documentos FOR INSERT
  WITH CHECK (auth.is_super_admin() OR clinica_id = auth.get_clinica_id());

CREATE POLICY "documentos_update" ON public.documentos FOR UPDATE
  USING (auth.is_super_admin() OR clinica_id = auth.get_clinica_id());

CREATE POLICY "escalas_select" ON public.escalas FOR SELECT
  USING (auth.is_super_admin() OR clinica_id = auth.get_clinica_id());

CREATE POLICY "escalas_insert" ON public.escalas FOR INSERT
  WITH CHECK (auth.is_super_admin() OR clinica_id = auth.get_clinica_id());


-- ============================================================
-- 10. TABLA: mensajes
-- ============================================================

DROP POLICY IF EXISTS "mensajes_select" ON public.mensajes;
DROP POLICY IF EXISTS "mensajes_insert" ON public.mensajes;

CREATE POLICY "mensajes_select" ON public.mensajes FOR SELECT
  USING (auth.is_super_admin() OR clinica_id = auth.get_clinica_id());

CREATE POLICY "mensajes_insert" ON public.mensajes FOR INSERT
  WITH CHECK (auth.is_super_admin() OR clinica_id = auth.get_clinica_id());


-- ============================================================
-- 11. TABLA: planes (catálogo global, solo lectura para todos)
-- ============================================================

DROP POLICY IF EXISTS "planes_select" ON public.planes;
DROP POLICY IF EXISTS "planes_insert" ON public.planes;
DROP POLICY IF EXISTS "planes_update" ON public.planes;
DROP POLICY IF EXISTS "planes_delete" ON public.planes;

-- Todos los usuarios autenticados pueden leer el catálogo de planes
CREATE POLICY "planes_select" ON public.planes FOR SELECT
  USING (auth.role() = 'authenticated');

-- Solo super_admin puede crear/modificar/borrar planes
CREATE POLICY "planes_insert" ON public.planes FOR INSERT
  WITH CHECK (auth.is_super_admin());

CREATE POLICY "planes_update" ON public.planes FOR UPDATE
  USING (auth.is_super_admin());

CREATE POLICY "planes_delete" ON public.planes FOR DELETE
  USING (auth.is_super_admin());


-- ============================================================
-- 12. TRIGGER: Protección de cambio de plan
--     Solo super_admin puede modificar plan_id en clinicas.
--     Esto aplica incluso si RLS dejara pasar el UPDATE.
-- ============================================================

CREATE OR REPLACE FUNCTION public.protect_plan_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF OLD.plan_id IS DISTINCT FROM NEW.plan_id THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.usuarios
      WHERE id = auth.uid() AND rol = 'super_admin'
    ) THEN
      RAISE EXCEPTION
        'Acceso denegado: solo el super administrador puede modificar el plan de suscripción.'
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_plan_change ON public.clinicas;

CREATE TRIGGER trg_protect_plan_change
  BEFORE UPDATE ON public.clinicas
  FOR EACH ROW EXECUTE FUNCTION public.protect_plan_change();


-- ============================================================
-- 13. TRIGGER: Protección de cambio de rol
--     Solo super_admin puede cambiar el rol de un usuario.
-- ============================================================

CREATE OR REPLACE FUNCTION public.protect_rol_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF OLD.rol IS DISTINCT FROM NEW.rol THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.usuarios
      WHERE id = auth.uid() AND rol = 'super_admin'
    ) THEN
      RAISE EXCEPTION
        'Acceso denegado: solo el super administrador puede modificar roles de usuario.'
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_rol_change ON public.usuarios;

CREATE TRIGGER trg_protect_rol_change
  BEFORE UPDATE ON public.usuarios
  FOR EACH ROW EXECUTE FUNCTION public.protect_rol_change();


-- ============================================================
-- 14. TRIGGER: Protección de cambio de clinica_id en usuarios
--     Impedir que un usuario se mueva a otra clínica.
-- ============================================================

CREATE OR REPLACE FUNCTION public.protect_clinica_id_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF OLD.clinica_id IS DISTINCT FROM NEW.clinica_id THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.usuarios
      WHERE id = auth.uid() AND rol = 'super_admin'
    ) THEN
      RAISE EXCEPTION
        'Acceso denegado: no se puede cambiar la clínica asignada a un usuario.'
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_clinica_id_change ON public.usuarios;

CREATE TRIGGER trg_protect_clinica_id_change
  BEFORE UPDATE ON public.usuarios
  FOR EACH ROW EXECUTE FUNCTION public.protect_clinica_id_change();


-- ============================================================
-- VERIFICACIÓN FINAL
-- ============================================================

SELECT
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'usuarios','clinicas','pacientes','citas','recordatorios',
    'sesiones_terapia','notas_soap','documentos','escalas',
    'mensajes','planes'
  )
ORDER BY tablename;
