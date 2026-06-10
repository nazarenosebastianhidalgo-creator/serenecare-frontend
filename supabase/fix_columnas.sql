ALTER TABLE public.notas_soap ADD COLUMN IF NOT EXISTS compartida_con_paciente boolean DEFAULT false;
ALTER TABLE public.informes_ia ADD COLUMN IF NOT EXISTS compartido_con_paciente boolean DEFAULT false;
ALTER TABLE public.informes_ia ADD COLUMN IF NOT EXISTS clinica_id uuid REFERENCES public.clinicas(id);

CREATE TABLE IF NOT EXISTS public.citas (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), clinica_id uuid REFERENCES public.clinicas(id), paciente_id uuid REFERENCES public.pacientes(id), psicologo_id uuid REFERENCES auth.users(id), fecha date NOT NULL, hora_inicio time NOT NULL, hora_fin time, tipo text DEFAULT 'presencial', estado text DEFAULT 'pendiente', sala_video_url text, created_at timestamptz DEFAULT now());

CREATE TABLE IF NOT EXISTS public.evaluaciones (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), clinica_id uuid REFERENCES public.clinicas(id), paciente_id uuid REFERENCES public.pacientes(id), tipo text NOT NULL, respuestas jsonb, puntaje integer, created_at timestamptz DEFAULT now());

CREATE TABLE IF NOT EXISTS public.mensajes (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), clinica_id uuid REFERENCES public.clinicas(id), de_id uuid REFERENCES auth.users(id), para_id uuid REFERENCES auth.users(id), texto text NOT NULL, leido boolean DEFAULT false, created_at timestamptz DEFAULT now());
