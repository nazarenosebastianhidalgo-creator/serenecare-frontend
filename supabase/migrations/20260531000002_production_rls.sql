-- ============================================================
-- SereneCare — RLS de producción (reemplaza dev_all_*)
-- ============================================================

-- ── Funciones helper (SECURITY DEFINER para evitar recursión) ──

CREATE OR REPLACE FUNCTION get_my_clinica_id()
RETURNS UUID LANGUAGE SQL SECURITY DEFINER STABLE AS $$
  SELECT clinica_id FROM usuarios WHERE id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION get_my_rol()
RETURNS TEXT LANGUAGE SQL SECURITY DEFINER STABLE AS $$
  SELECT rol FROM usuarios WHERE id = auth.uid() LIMIT 1;
$$;

-- ── Eliminar políticas de desarrollo ─────────────────────────

DROP POLICY IF EXISTS "dev_all_clinicas"            ON clinicas;
DROP POLICY IF EXISTS "dev_all_psicologos"          ON psicologos;
DROP POLICY IF EXISTS "dev_all_pacientes"           ON pacientes;
DO $$ BEGIN
  IF to_regclass('public.sesiones') IS NOT NULL THEN
    DROP POLICY IF EXISTS "dev_all_sesiones" ON sesiones;
  END IF;
END $$;
DROP POLICY IF EXISTS "dev_all_notas_soap"          ON notas_soap;
DROP POLICY IF EXISTS "dev_all_evaluaciones"        ON evaluaciones;
DROP POLICY IF EXISTS "dev_all_solicitudes_escalas" ON solicitudes_escalas;
DROP POLICY IF EXISTS "dev_all_ejercicios"          ON ejercicios;
DROP POLICY IF EXISTS "dev_all_diario_animo"        ON diario_animo;
DROP POLICY IF EXISTS "dev_all_informes_ia"         ON informes_ia;
DROP POLICY IF EXISTS "dev_all_planes"              ON planes;
DROP POLICY IF EXISTS "dev_all_usuarios"            ON usuarios;

-- ── clinicas ──────────────────────────────────────────────────
CREATE POLICY "clinicas_read" ON clinicas FOR SELECT USING (
  id = get_my_clinica_id()
  OR get_my_rol() = 'super_admin'
);
CREATE POLICY "clinicas_update" ON clinicas FOR UPDATE USING (
  (id = get_my_clinica_id() AND get_my_rol() = 'admin_clinica')
  OR get_my_rol() = 'super_admin'
);
CREATE POLICY "clinicas_insert" ON clinicas FOR INSERT WITH CHECK (
  get_my_rol() = 'super_admin'
);
CREATE POLICY "clinicas_delete" ON clinicas FOR DELETE USING (
  get_my_rol() = 'super_admin'
);

-- ── usuarios ──────────────────────────────────────────────────
CREATE POLICY "usuarios_read" ON usuarios FOR SELECT USING (
  id = auth.uid()
  OR (clinica_id = get_my_clinica_id() AND get_my_rol() IN ('admin_clinica'))
  OR get_my_rol() = 'super_admin'
);
CREATE POLICY "usuarios_insert" ON usuarios FOR INSERT WITH CHECK (
  get_my_rol() IN ('admin_clinica', 'super_admin')
);
CREATE POLICY "usuarios_update" ON usuarios FOR UPDATE USING (
  id = auth.uid()
  OR (clinica_id = get_my_clinica_id() AND get_my_rol() = 'admin_clinica')
  OR get_my_rol() = 'super_admin'
);
CREATE POLICY "usuarios_delete" ON usuarios FOR DELETE USING (
  get_my_rol() = 'super_admin'
  OR (clinica_id = get_my_clinica_id() AND get_my_rol() = 'admin_clinica')
);

-- ── planes ────────────────────────────────────────────────────
CREATE POLICY "planes_read"  ON planes FOR SELECT USING (true);
CREATE POLICY "planes_write" ON planes FOR INSERT WITH CHECK (get_my_rol() = 'super_admin');
CREATE POLICY "planes_update" ON planes FOR UPDATE USING (get_my_rol() = 'super_admin');
CREATE POLICY "planes_delete" ON planes FOR DELETE USING (get_my_rol() = 'super_admin');

-- ── psicologos ────────────────────────────────────────────────
CREATE POLICY "psicologos_all" ON psicologos FOR ALL USING (
  clinica_id = get_my_clinica_id()
  OR get_my_rol() = 'super_admin'
) WITH CHECK (
  clinica_id = get_my_clinica_id()
  OR get_my_rol() = 'super_admin'
);

-- ── pacientes ─────────────────────────────────────────────────
CREATE POLICY "pacientes_all" ON pacientes FOR ALL USING (
  clinica_id = get_my_clinica_id()
  OR get_my_rol() = 'super_admin'
  OR id = auth.uid()
) WITH CHECK (
  clinica_id = get_my_clinica_id()
  OR get_my_rol() = 'super_admin'
);

-- ── sesiones (tabla eliminada el 09/06 en la unificación citas/sesiones) ──
-- Guardado con to_regclass para que esta migración siga siendo re-ejecutable.
DO $$ BEGIN
  IF to_regclass('public.sesiones') IS NOT NULL THEN
    DROP POLICY IF EXISTS "sesiones_all" ON sesiones;
    EXECUTE $p$
      CREATE POLICY "sesiones_all" ON sesiones FOR ALL USING (
        clinica_id = get_my_clinica_id() OR get_my_rol() = 'super_admin'
      ) WITH CHECK (
        clinica_id = get_my_clinica_id() OR get_my_rol() = 'super_admin'
      )
    $p$;
  END IF;
END $$;

-- ── notas_soap (sin clinica_id — se verifica via psicologo) ───
CREATE POLICY "notas_soap_read" ON notas_soap FOR SELECT USING (
  paciente_id = auth.uid()
  OR psicologo_id = auth.uid()
  OR get_my_rol() = 'super_admin'
  OR EXISTS (
    SELECT 1 FROM psicologos p
    WHERE p.id = psicologo_id AND p.clinica_id = get_my_clinica_id()
  )
);
CREATE POLICY "notas_soap_insert" ON notas_soap FOR INSERT WITH CHECK (
  psicologo_id = auth.uid()
  OR get_my_rol() = 'super_admin'
);
CREATE POLICY "notas_soap_update" ON notas_soap FOR UPDATE USING (
  psicologo_id = auth.uid()
  OR get_my_rol() = 'super_admin'
  OR EXISTS (
    SELECT 1 FROM psicologos p
    WHERE p.id = psicologo_id AND p.clinica_id = get_my_clinica_id()
    AND get_my_rol() = 'admin_clinica'
  )
);
CREATE POLICY "notas_soap_delete" ON notas_soap FOR DELETE USING (
  psicologo_id = auth.uid()
  OR get_my_rol() IN ('admin_clinica','super_admin')
);

-- ── evaluaciones (sin clinica_id) ─────────────────────────────
CREATE POLICY "evaluaciones_all" ON evaluaciones FOR ALL USING (
  paciente_id = auth.uid()
  OR psicologo_id = auth.uid()
  OR get_my_rol() = 'super_admin'
  OR EXISTS (
    SELECT 1 FROM psicologos p
    WHERE p.id = psicologo_id AND p.clinica_id = get_my_clinica_id()
  )
) WITH CHECK (
  psicologo_id = auth.uid()
  OR get_my_rol() = 'super_admin'
);

-- ── solicitudes_escalas (sin clinica_id) ──────────────────────
CREATE POLICY "solicitudes_escalas_all" ON solicitudes_escalas FOR ALL USING (
  paciente_id = auth.uid()
  OR psicologo_id = auth.uid()
  OR get_my_rol() = 'super_admin'
  OR EXISTS (
    SELECT 1 FROM psicologos p
    WHERE p.id = psicologo_id AND p.clinica_id = get_my_clinica_id()
  )
) WITH CHECK (
  psicologo_id = auth.uid()
  OR get_my_rol() = 'super_admin'
);

-- ── ejercicios (sin clinica_id) ───────────────────────────────
CREATE POLICY "ejercicios_all" ON ejercicios FOR ALL USING (
  paciente_id = auth.uid()
  OR psicologo_id = auth.uid()
  OR get_my_rol() = 'super_admin'
  OR EXISTS (
    SELECT 1 FROM psicologos p
    WHERE p.id = psicologo_id AND p.clinica_id = get_my_clinica_id()
  )
) WITH CHECK (
  psicologo_id = auth.uid()
  OR get_my_rol() = 'super_admin'
);

-- ── diario_animo (solo paciente_id) ───────────────────────────
CREATE POLICY "diario_animo_all" ON diario_animo FOR ALL USING (
  paciente_id = auth.uid()
  OR get_my_rol() = 'super_admin'
  OR (
    get_my_rol() IN ('psicologo','admin_clinica')
    AND EXISTS (
      SELECT 1 FROM pacientes p
      WHERE p.id = paciente_id AND p.clinica_id = get_my_clinica_id()
    )
  )
) WITH CHECK (
  paciente_id = auth.uid()
  OR get_my_rol() IN ('psicologo','admin_clinica','super_admin')
);

-- ── informes_ia (sin clinica_id) ──────────────────────────────
CREATE POLICY "informes_ia_all" ON informes_ia FOR ALL USING (
  paciente_id = auth.uid()
  OR psicologo_id = auth.uid()
  OR get_my_rol() = 'super_admin'
  OR EXISTS (
    SELECT 1 FROM psicologos p
    WHERE p.id = psicologo_id AND p.clinica_id = get_my_clinica_id()
  )
) WITH CHECK (
  psicologo_id = auth.uid()
  OR get_my_rol() = 'super_admin'
);

-- ── Tablas adicionales (si existen) ──────────────────────────

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name = 'citas') THEN
    ALTER TABLE citas ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "dev_all_citas" ON citas;
    EXECUTE $p$
      CREATE POLICY "citas_all" ON citas FOR ALL USING (
        clinica_id = get_my_clinica_id()
        OR get_my_rol() = 'super_admin'
        OR paciente_id = auth.uid()
      ) WITH CHECK (
        clinica_id = get_my_clinica_id()
        OR get_my_rol() = 'super_admin'
      )
    $p$;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name = 'mensajes') THEN
    ALTER TABLE mensajes ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "dev_all_mensajes" ON mensajes;
    EXECUTE $p$
      CREATE POLICY "mensajes_own" ON mensajes FOR ALL USING (
        de_id = auth.uid() OR para_id = auth.uid()
        OR get_my_rol() IN ('admin_clinica','super_admin')
      ) WITH CHECK (
        de_id = auth.uid()
        OR get_my_rol() IN ('admin_clinica','super_admin')
      )
    $p$;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name = 'recordatorios') THEN
    ALTER TABLE recordatorios ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "dev_all_recordatorios" ON recordatorios;
    EXECUTE $p$
      CREATE POLICY "recordatorios_all" ON recordatorios FOR ALL USING (
        clinica_id = get_my_clinica_id()
        OR get_my_rol() = 'super_admin'
      ) WITH CHECK (
        clinica_id = get_my_clinica_id()
        OR get_my_rol() = 'super_admin'
      )
    $p$;
  END IF;
END $$;
