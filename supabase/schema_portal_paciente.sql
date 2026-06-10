-- ═══════════════════════════════════════════════════════════════════
-- SereneCare — Schema completo + RLS para Portal Paciente
-- Pegar en Supabase > SQL Editor > New query > Run
-- Es seguro correr varias veces (todo usa IF NOT EXISTS)
-- ═══════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────
-- 1. CLÍNICAS
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.clinicas (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre     text NOT NULL,
  plan       text NOT NULL DEFAULT 'basico',
  activa     boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- ───────────────────────────────────────────────────────────────────
-- 2. USUARIOS (perfil extendido de auth.users)
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.usuarios (
  id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  clinica_id uuid REFERENCES public.clinicas(id),
  nombre     text NOT NULL DEFAULT '',
  apellido   text NOT NULL DEFAULT '',
  rol        text NOT NULL DEFAULT 'paciente'
                  CHECK (rol IN ('super_admin','admin_clinica','psicologo','paciente')),
  created_at timestamptz DEFAULT now()
);

-- Por si la tabla ya existía sin estas columnas:
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS clinica_id uuid REFERENCES public.clinicas(id);
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS apellido   text NOT NULL DEFAULT '';

-- ───────────────────────────────────────────────────────────────────
-- 3. PACIENTES
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pacientes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  clinica_id uuid REFERENCES public.clinicas(id),
  nombre     text NOT NULL DEFAULT '',
  apellido   text NOT NULL DEFAULT '',
  email      text,
  telefono   text,
  created_at timestamptz DEFAULT now()
);

-- ───────────────────────────────────────────────────────────────────
-- 4. CITAS
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.citas (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id     uuid REFERENCES public.clinicas(id),
  paciente_id    uuid REFERENCES public.pacientes(id),
  psicologo_id   uuid REFERENCES auth.users(id),
  fecha          date NOT NULL,
  hora_inicio    time NOT NULL,
  hora_fin       time,
  tipo           text DEFAULT 'presencial',
  estado         text DEFAULT 'pendiente'
                      CHECK (estado IN ('pendiente','confirmada','cancelada','completada')),
  sala_video_url text,
  created_at     timestamptz DEFAULT now()
);

ALTER TABLE public.citas ADD COLUMN IF NOT EXISTS sala_video_url text;

-- ───────────────────────────────────────────────────────────────────
-- 5. NOTAS SOAP
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notas_soap (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id              uuid REFERENCES public.clinicas(id),
  paciente_id             uuid REFERENCES public.pacientes(id),
  psicologo_id            uuid REFERENCES auth.users(id),
  subjetivo               text,
  objetivo                text,
  analisis                text,
  plan                    text,
  compartida_con_paciente boolean DEFAULT false,
  created_at              timestamptz DEFAULT now()
);

ALTER TABLE public.notas_soap ADD COLUMN IF NOT EXISTS compartida_con_paciente boolean DEFAULT false;

-- ───────────────────────────────────────────────────────────────────
-- 6. INFORMES IA
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.informes_ia (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id              uuid REFERENCES public.clinicas(id),
  paciente_id             uuid REFERENCES public.pacientes(id),
  tipo                    text,    -- 'progreso', 'resumen', 'riesgo', etc.
  contenido               text,
  compartido_con_paciente boolean DEFAULT false,
  created_at              timestamptz DEFAULT now()
);

ALTER TABLE public.informes_ia ADD COLUMN IF NOT EXISTS compartido_con_paciente boolean DEFAULT false;

-- ───────────────────────────────────────────────────────────────────
-- 7. EVALUACIONES (PHQ-9, GAD-7, feedback sesión)
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.evaluaciones (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id  uuid REFERENCES public.clinicas(id),
  paciente_id uuid REFERENCES public.pacientes(id),
  tipo        text NOT NULL,   -- 'phq9', 'gad7', 'feedback_sesion'
  respuestas  jsonb,           -- { "answers": [0,1,2,...] }
  puntaje     integer,
  created_at  timestamptz DEFAULT now()
);

-- ───────────────────────────────────────────────────────────────────
-- 8. MENSAJES (paciente ↔ psicólogo)
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.mensajes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id uuid REFERENCES public.clinicas(id),
  de_id      uuid REFERENCES auth.users(id),
  para_id    uuid REFERENCES auth.users(id),
  texto      text NOT NULL,
  leido      boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════════
-- HABILITAR ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════════
ALTER TABLE public.clinicas     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pacientes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.citas        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notas_soap   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.informes_ia  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mensajes     ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════════════
-- RLS: USUARIOS
-- ═══════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "usuarios_self_read"       ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_clinica_read"    ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_self_update"     ON public.usuarios;

-- Cada usuario puede ver su propio perfil
CREATE POLICY "usuarios_self_read" ON public.usuarios
  FOR SELECT USING (auth.uid() = id);

-- Usuarios de la misma clínica se ven entre sí (para mostrar nombre del psicólogo, etc.)
CREATE POLICY "usuarios_clinica_read" ON public.usuarios
  FOR SELECT USING (
    clinica_id IN (
      SELECT clinica_id FROM public.usuarios WHERE id = auth.uid()
    )
  );

-- Cada usuario puede actualizar su propio perfil
CREATE POLICY "usuarios_self_update" ON public.usuarios
  FOR UPDATE USING (auth.uid() = id);

-- ═══════════════════════════════════════════════════════════════════
-- RLS: CLÍNICAS
-- ═══════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "clinicas_member_read"  ON public.clinicas;

-- Miembros de la clínica pueden verla
CREATE POLICY "clinicas_member_read" ON public.clinicas
  FOR SELECT USING (
    id IN (SELECT clinica_id FROM public.usuarios WHERE id = auth.uid())
  );

-- ═══════════════════════════════════════════════════════════════════
-- RLS: PACIENTES
-- ═══════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "pacientes_own_read"      ON public.pacientes;
DROP POLICY IF EXISTS "pacientes_clinica_read"  ON public.pacientes;
DROP POLICY IF EXISTS "pacientes_own_update"    ON public.pacientes;

-- Paciente puede ver su propio perfil
CREATE POLICY "pacientes_own_read" ON public.pacientes
  FOR SELECT USING (usuario_id = auth.uid());

-- Staff de la clínica puede ver todos los pacientes de su clínica
CREATE POLICY "pacientes_clinica_read" ON public.pacientes
  FOR SELECT USING (
    clinica_id IN (
      SELECT clinica_id FROM public.usuarios WHERE id = auth.uid()
    )
  );

-- Staff puede crear/editar pacientes en su clínica
CREATE POLICY "pacientes_clinica_write" ON public.pacientes
  FOR ALL USING (
    clinica_id IN (
      SELECT clinica_id FROM public.usuarios WHERE id = auth.uid()
    )
  );

-- ═══════════════════════════════════════════════════════════════════
-- RLS: CITAS
-- ═══════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "citas_paciente_read"     ON public.citas;
DROP POLICY IF EXISTS "citas_paciente_confirm"  ON public.citas;
DROP POLICY IF EXISTS "citas_clinica_all"       ON public.citas;

-- Paciente puede ver sus propias citas
CREATE POLICY "citas_paciente_read" ON public.citas
  FOR SELECT USING (
    paciente_id IN (SELECT id FROM public.pacientes WHERE usuario_id = auth.uid())
  );

-- Paciente puede confirmar su propia cita (UPDATE de estado)
CREATE POLICY "citas_paciente_confirm" ON public.citas
  FOR UPDATE USING (
    paciente_id IN (SELECT id FROM public.pacientes WHERE usuario_id = auth.uid())
  );

-- Staff de la clínica gestiona todas las citas de su clínica
CREATE POLICY "citas_clinica_all" ON public.citas
  FOR ALL USING (
    clinica_id IN (
      SELECT clinica_id FROM public.usuarios WHERE id = auth.uid()
    )
  );

-- ═══════════════════════════════════════════════════════════════════
-- RLS: NOTAS SOAP
-- ═══════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "notas_paciente_shared"  ON public.notas_soap;
DROP POLICY IF EXISTS "notas_clinica_all"      ON public.notas_soap;

-- Paciente solo ve notas que el psicólogo marcó como compartidas
CREATE POLICY "notas_paciente_shared" ON public.notas_soap
  FOR SELECT USING (
    compartida_con_paciente = true
    AND paciente_id IN (SELECT id FROM public.pacientes WHERE usuario_id = auth.uid())
  );

-- Staff de la clínica gestiona todas las notas de su clínica
CREATE POLICY "notas_clinica_all" ON public.notas_soap
  FOR ALL USING (
    clinica_id IN (
      SELECT clinica_id FROM public.usuarios WHERE id = auth.uid()
    )
  );

-- ═══════════════════════════════════════════════════════════════════
-- RLS: INFORMES IA
-- ═══════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "informes_paciente_shared" ON public.informes_ia;
DROP POLICY IF EXISTS "informes_clinica_all"     ON public.informes_ia;

-- Paciente solo ve informes que el psicólogo compartió
CREATE POLICY "informes_paciente_shared" ON public.informes_ia
  FOR SELECT USING (
    compartido_con_paciente = true
    AND paciente_id IN (SELECT id FROM public.pacientes WHERE usuario_id = auth.uid())
  );

-- Staff de la clínica gestiona todos los informes de su clínica
CREATE POLICY "informes_clinica_all" ON public.informes_ia
  FOR ALL USING (
    clinica_id IN (
      SELECT clinica_id FROM public.usuarios WHERE id = auth.uid()
    )
  );

-- ═══════════════════════════════════════════════════════════════════
-- RLS: EVALUACIONES
-- ═══════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "evaluaciones_own_all"     ON public.evaluaciones;
DROP POLICY IF EXISTS "evaluaciones_clinica_read" ON public.evaluaciones;

-- Paciente puede leer y crear sus propias evaluaciones
CREATE POLICY "evaluaciones_own_all" ON public.evaluaciones
  FOR ALL USING (
    paciente_id IN (SELECT id FROM public.pacientes WHERE usuario_id = auth.uid())
  );

-- Staff de la clínica puede leer evaluaciones de sus pacientes
CREATE POLICY "evaluaciones_clinica_read" ON public.evaluaciones
  FOR SELECT USING (
    clinica_id IN (
      SELECT clinica_id FROM public.usuarios WHERE id = auth.uid()
    )
  );

-- ═══════════════════════════════════════════════════════════════════
-- RLS: MENSAJES
-- ═══════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "mensajes_read"       ON public.mensajes;
DROP POLICY IF EXISTS "mensajes_send"       ON public.mensajes;
DROP POLICY IF EXISTS "mensajes_mark_read"  ON public.mensajes;

-- Puede leer mensajes donde sea emisor o receptor
CREATE POLICY "mensajes_read" ON public.mensajes
  FOR SELECT USING (de_id = auth.uid() OR para_id = auth.uid());

-- Solo puede enviar mensajes como sí mismo
CREATE POLICY "mensajes_send" ON public.mensajes
  FOR INSERT WITH CHECK (de_id = auth.uid());

-- Solo el receptor puede marcar como leído
CREATE POLICY "mensajes_mark_read" ON public.mensajes
  FOR UPDATE USING (para_id = auth.uid());

-- ═══════════════════════════════════════════════════════════════════
-- ÍNDICES PARA PERFORMANCE
-- ═══════════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_usuarios_clinica      ON public.usuarios(clinica_id);
CREATE INDEX IF NOT EXISTS idx_pacientes_usuario     ON public.pacientes(usuario_id);
CREATE INDEX IF NOT EXISTS idx_pacientes_clinica     ON public.pacientes(clinica_id);
CREATE INDEX IF NOT EXISTS idx_citas_paciente        ON public.citas(paciente_id);
CREATE INDEX IF NOT EXISTS idx_citas_fecha           ON public.citas(fecha);
CREATE INDEX IF NOT EXISTS idx_evaluaciones_paciente ON public.evaluaciones(paciente_id);
CREATE INDEX IF NOT EXISTS idx_notas_paciente        ON public.notas_soap(paciente_id);
CREATE INDEX IF NOT EXISTS idx_informes_paciente     ON public.informes_ia(paciente_id);
CREATE INDEX IF NOT EXISTS idx_mensajes_para         ON public.mensajes(para_id);
CREATE INDEX IF NOT EXISTS idx_mensajes_de           ON public.mensajes(de_id);
