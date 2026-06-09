-- ═══════════════════════════════════════════════════════════════════
-- Rate limiting para Edge Functions (openai-proxy, daily-proxy) — 09/06/2026
-- ═══════════════════════════════════════════════════════════════════
-- Las Edge Functions son stateless: el conteo se guarda en Postgres.
-- check_rate_limit() es SECURITY DEFINER → corre como owner y puede escribir
-- en rate_limits aunque el rol authenticated no tenga acceso directo (RLS
-- habilitada sin políticas = tabla cerrada salvo vía esta función).
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.rate_limits (
  bucket       text PRIMARY KEY,
  count        integer NOT NULL DEFAULT 0,
  window_start timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
-- Sin políticas: nadie accede directo. Solo vía check_rate_limit (SECURITY DEFINER).

CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_bucket         text,
  p_max            integer,
  p_window_seconds integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
  v_start timestamptz;
BEGIN
  SELECT count, window_start INTO v_count, v_start
  FROM public.rate_limits WHERE bucket = p_bucket FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.rate_limits(bucket, count, window_start)
    VALUES (p_bucket, 1, now())
    ON CONFLICT (bucket) DO UPDATE SET count = rate_limits.count + 1;
    RETURN true;
  END IF;

  -- Ventana expirada → reiniciar contador
  IF v_start < now() - make_interval(secs => p_window_seconds) THEN
    UPDATE public.rate_limits SET count = 1, window_start = now() WHERE bucket = p_bucket;
    RETURN true;
  END IF;

  -- Dentro de la ventana: ¿superó el máximo?
  IF v_count >= p_max THEN
    RETURN false;
  END IF;

  UPDATE public.rate_limits SET count = count + 1 WHERE bucket = p_bucket;
  RETURN true;
END;
$$;

-- El rol authenticated puede ejecutar la función (no la tabla)
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, integer, integer) TO authenticated;
