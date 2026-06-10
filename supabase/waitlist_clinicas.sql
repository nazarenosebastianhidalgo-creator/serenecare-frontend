-- Añadir columnas a la tabla lista_espera existente
-- para capturar más datos del formulario de la landing
ALTER TABLE lista_espera
  ADD COLUMN IF NOT EXISTS nombre  TEXT,
  ADD COLUMN IF NOT EXISTS clinica TEXT,
  ADD COLUMN IF NOT EXISTS ciudad  TEXT,
  ADD COLUMN IF NOT EXISTS tamano  TEXT,
  ADD COLUMN IF NOT EXISTS fuente  TEXT DEFAULT 'landing';
