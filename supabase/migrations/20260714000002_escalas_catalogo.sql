-- ═══════════════════════════════════════════════════════════════════
-- Motor de escalas: biblioteca de escalas (definiciones-como-datos)  14/07/2026
-- ═══════════════════════════════════════════════════════════════════
-- Cada escala es DATOS (ítems + opciones + bandas), no código. Una pantalla
-- genérica las pinta todas. El psicólogo elige una y la envía (solicitudes_escalas,
-- tipo = codigo). El paciente la completa y el resultado va a evaluaciones.

create table if not exists escalas_catalogo (
  id           uuid primary key default gen_random_uuid(),
  clinica_id   uuid,                       -- null = escala global de fábrica; si no, propia de la clínica
  codigo       text not null,              -- 'PHQ-9' — coincide con solicitudes_escalas.tipo
  nombre       text not null,
  descripcion  text,
  categoria    text,                       -- depresión, ansiedad, bienestar, estrés, trauma…
  instruccion  text,                       -- encabezado ("Durante las últimas 2 semanas…")
  items        jsonb not null default '[]',     -- ["¿...?", "¿...?", ...]
  opciones     jsonb not null default '[]',     -- [{"texto":"Nunca","valor":0}, ...]  (Likert uniforme)
  invertidos   jsonb default '[]',              -- índices (0-based) de ítems con puntuación invertida
  bandas       jsonb default '[]',              -- [{"min":0,"max":4,"label":"Mínima","color":"#..."}]
  mejor        text default 'menos',            -- 'menos' = menor puntuación es mejor; 'mas' = mayor es mejor (bienestar)
  activa       boolean default true,
  created_at   timestamptz default now()
);

create index if not exists idx_escalas_cat_codigo on escalas_catalogo(codigo);

alter table escalas_catalogo enable row level security;

-- Lectura: cualquier autenticado ve las globales activas o las de su clínica
drop policy if exists escalas_cat_read on escalas_catalogo;
create policy escalas_cat_read on escalas_catalogo for select to authenticated
  using (activa = true and (clinica_id is null or clinica_id = get_my_clinica_id()));

-- Crear: el staff crea escalas propias de su clínica
drop policy if exists escalas_cat_staff on escalas_catalogo;
create policy escalas_cat_staff on escalas_catalogo for insert to authenticated
  with check (get_my_rol() in ('psicologo','admin_clinica') and clinica_id = get_my_clinica_id());
