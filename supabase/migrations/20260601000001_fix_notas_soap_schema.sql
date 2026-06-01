-- ============================================================
-- Fix notas_soap: añadir clinica_id + cambiar FK psicologo_id
-- de psicologos(id) → usuarios(id)
-- ============================================================

-- 1. Añadir clinica_id
ALTER TABLE notas_soap
  ADD COLUMN IF NOT EXISTS clinica_id UUID REFERENCES clinicas(id) ON DELETE CASCADE;

-- 2. Cambiar FK de psicologo_id: psicologos → usuarios
ALTER TABLE notas_soap DROP CONSTRAINT IF EXISTS notas_soap_psicologo_id_fkey;
ALTER TABLE notas_soap
  ADD CONSTRAINT notas_soap_psicologo_id_fkey
  FOREIGN KEY (psicologo_id) REFERENCES usuarios(id) ON DELETE SET NULL;

-- 3. Reemplazar políticas RLS (las actuales usan JOIN a psicologos que ya no aplica)
DROP POLICY IF EXISTS "notas_soap_read"   ON notas_soap;
DROP POLICY IF EXISTS "notas_soap_insert" ON notas_soap;
DROP POLICY IF EXISTS "notas_soap_update" ON notas_soap;
DROP POLICY IF EXISTS "notas_soap_delete" ON notas_soap;

CREATE POLICY "notas_soap_read" ON notas_soap FOR SELECT USING (
  clinica_id = get_my_clinica_id()
  OR psicologo_id = auth.uid()
  OR get_my_rol() = 'super_admin'
);

CREATE POLICY "notas_soap_insert" ON notas_soap FOR INSERT WITH CHECK (
  clinica_id = get_my_clinica_id()
  AND (psicologo_id = auth.uid() OR get_my_rol() IN ('admin_clinica','super_admin'))
);

CREATE POLICY "notas_soap_update" ON notas_soap FOR UPDATE USING (
  clinica_id = get_my_clinica_id()
  AND (psicologo_id = auth.uid() OR get_my_rol() IN ('admin_clinica','super_admin'))
);

CREATE POLICY "notas_soap_delete" ON notas_soap FOR DELETE USING (
  clinica_id = get_my_clinica_id()
  AND (psicologo_id = auth.uid() OR get_my_rol() IN ('admin_clinica','super_admin'))
);
