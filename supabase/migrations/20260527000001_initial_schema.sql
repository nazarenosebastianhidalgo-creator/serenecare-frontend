-- ============================================================
-- SereneCare — Schema inicial
-- ============================================================

-- Clínicas
CREATE TABLE IF NOT EXISTS clinicas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  telefono TEXT,
  plan TEXT DEFAULT 'basico' CHECK (plan IN ('basico','profesional','enterprise')),
  activa BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Psicólogos
CREATE TABLE IF NOT EXISTS psicologos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id UUID REFERENCES clinicas(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  especialidad TEXT,
  matricula TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Pacientes
CREATE TABLE IF NOT EXISTS pacientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id UUID REFERENCES clinicas(id) ON DELETE CASCADE,
  psicologo_id UUID REFERENCES psicologos(id),
  nombre TEXT NOT NULL,
  email TEXT,
  telefono TEXT,
  fecha_nacimiento DATE,
  motivo_consulta TEXT,
  estado TEXT DEFAULT 'activo' CHECK (estado IN ('activo','alta','baja','lista_espera')),
  consentimiento_firmado BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Sesiones / Agenda
CREATE TABLE IF NOT EXISTS sesiones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id UUID REFERENCES clinicas(id) ON DELETE CASCADE,
  psicologo_id UUID REFERENCES psicologos(id),
  paciente_id UUID REFERENCES pacientes(id) ON DELETE CASCADE,
  fecha DATE NOT NULL,
  hora TIME NOT NULL,
  duracion_min INTEGER DEFAULT 50,
  modalidad TEXT DEFAULT 'presencial' CHECK (modalidad IN ('presencial','videollamada')),
  estado TEXT DEFAULT 'programada' CHECK (estado IN ('programada','completada','cancelada','no_asistio')),
  precio NUMERIC(10,2),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Notas SOAP
CREATE TABLE IF NOT EXISTS notas_soap (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sesion_id UUID REFERENCES sesiones(id) ON DELETE CASCADE,
  paciente_id UUID REFERENCES pacientes(id) ON DELETE CASCADE,
  psicologo_id UUID REFERENCES psicologos(id),
  subjetivo TEXT,
  objetivo TEXT,
  evaluacion TEXT,
  plan TEXT,
  nivel INTEGER DEFAULT 1 CHECK (nivel IN (1,2,3)),
  borrador BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Escalas de evaluación (PHQ-9, GAD-7, etc.)
CREATE TABLE IF NOT EXISTS evaluaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id UUID REFERENCES pacientes(id) ON DELETE CASCADE,
  psicologo_id UUID REFERENCES psicologos(id),
  tipo TEXT NOT NULL, -- 'PHQ9','GAD7','AUDIT','PCL5'
  respuestas JSONB NOT NULL DEFAULT '[]',
  puntuacion INTEGER,
  severidad TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Solicitudes de escalas (psicólogo solicita → paciente completa)
CREATE TABLE IF NOT EXISTS solicitudes_escalas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id UUID REFERENCES pacientes(id) ON DELETE CASCADE,
  psicologo_id UUID REFERENCES psicologos(id),
  tipo TEXT NOT NULL,
  estado TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente','completada')),
  created_at TIMESTAMPTZ DEFAULT now(),
  completada_at TIMESTAMPTZ
);

-- Ejercicios entre sesiones
CREATE TABLE IF NOT EXISTS ejercicios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id UUID REFERENCES pacientes(id) ON DELETE CASCADE,
  psicologo_id UUID REFERENCES psicologos(id),
  titulo TEXT NOT NULL,
  instrucciones TEXT,
  fecha_limite DATE,
  estado TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente','completado')),
  created_at TIMESTAMPTZ DEFAULT now(),
  completado_at TIMESTAMPTZ
);

-- Diario de ánimo
CREATE TABLE IF NOT EXISTS diario_animo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id UUID REFERENCES pacientes(id) ON DELETE CASCADE,
  fecha DATE NOT NULL,
  valor INTEGER NOT NULL CHECK (valor BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(paciente_id, fecha)
);

-- Informes IA
CREATE TABLE IF NOT EXISTS informes_ia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id UUID REFERENCES pacientes(id) ON DELETE CASCADE,
  psicologo_id UUID REFERENCES psicologos(id),
  tipo TEXT DEFAULT 'evolucion',
  contenido TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- RLS — Row Level Security
-- ============================================================

ALTER TABLE clinicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE psicologos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pacientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE sesiones ENABLE ROW LEVEL SECURITY;
ALTER TABLE notas_soap ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE solicitudes_escalas ENABLE ROW LEVEL SECURITY;
ALTER TABLE ejercicios ENABLE ROW LEVEL SECURITY;
ALTER TABLE diario_animo ENABLE ROW LEVEL SECURITY;
ALTER TABLE informes_ia ENABLE ROW LEVEL SECURITY;

-- Por ahora políticas permisivas para desarrollo (se endurecen en producción)
CREATE POLICY "dev_all_clinicas" ON clinicas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "dev_all_psicologos" ON psicologos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "dev_all_pacientes" ON pacientes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "dev_all_sesiones" ON sesiones FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "dev_all_notas_soap" ON notas_soap FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "dev_all_evaluaciones" ON evaluaciones FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "dev_all_solicitudes_escalas" ON solicitudes_escalas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "dev_all_ejercicios" ON ejercicios FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "dev_all_diario_animo" ON diario_animo FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "dev_all_informes_ia" ON informes_ia FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- Datos demo
-- ============================================================

INSERT INTO clinicas (id, nombre, email, telefono, plan) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Clínica SereneCare Demo', 'admin@serenecare.demo', '+34 91 000 0000', 'profesional')
ON CONFLICT DO NOTHING;

INSERT INTO psicologos (id, clinica_id, nombre, email, especialidad, matricula) VALUES
  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'Dra. Ana Martínez', 'ana@serenecare.demo', 'Terapia cognitivo-conductual', 'M-12345'),
  ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 'Dr. Luis Herrera', 'luis@serenecare.demo', 'Psicología clínica', 'M-23456'),
  ('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001', 'Dra. Sara Palacios', 'sara@serenecare.demo', 'Terapia de pareja', 'M-34567')
ON CONFLICT DO NOTHING;

INSERT INTO pacientes (id, clinica_id, psicologo_id, nombre, email, telefono, fecha_nacimiento, motivo_consulta, estado) VALUES
  ('00000000-0000-0000-0000-000000000100', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'María García López', 'maria@demo.com', '+34 612 345 678', '1990-03-15', 'Ansiedad generalizada', 'activo'),
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'Carlos Ruiz Pérez', 'carlos@demo.com', '+34 623 456 789', '1985-07-22', 'Depresión leve', 'activo'),
  ('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', 'Laura Sánchez', 'laura@demo.com', '+34 634 567 890', '1995-11-08', 'Estrés laboral', 'activo')
ON CONFLICT DO NOTHING;
