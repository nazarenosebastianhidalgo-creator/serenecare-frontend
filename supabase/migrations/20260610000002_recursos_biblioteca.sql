-- ═══════════════════════════════════════════════════════════════════
-- Biblioteca de recursos clínicos (global) — 10/06/2026
-- MVP: biblioteca global de instrumentos/guías estándar, descargables.
-- El contenido va como HTML imprimible en la propia tabla (sin Storage).
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.recursos (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo           text NOT NULL,                 -- ficha | escala | guia | paciente
  titulo         text NOT NULL UNIQUE,
  descripcion    text,
  tags           text[] DEFAULT '{}',
  icono          text DEFAULT 'description',
  color          text DEFAULT '#a78bfa',
  formato        text DEFAULT 'HTML',
  paginas        integer DEFAULT 1,
  contenido_html text,
  orden          integer DEFAULT 0,
  activo         boolean DEFAULT true,
  created_at     timestamptz DEFAULT now()
);

ALTER TABLE public.recursos ENABLE ROW LEVEL SECURITY;

-- Biblioteca global: cualquier usuario autenticado lee los recursos activos
DROP POLICY IF EXISTS recursos_read ON public.recursos;
CREATE POLICY recursos_read ON public.recursos FOR SELECT TO authenticated USING (activo = true);

-- Escritura solo super_admin (service_role bypassa RLS para seeds/cargas)
DROP POLICY IF EXISTS recursos_admin ON public.recursos;
CREATE POLICY recursos_admin ON public.recursos FOR ALL
  USING (get_my_rol() = 'super_admin') WITH CHECK (get_my_rol() = 'super_admin');

-- ── Seed (idempotente por UNIQUE(titulo)) ─────────────────────────
INSERT INTO public.recursos (tipo, titulo, descripcion, tags, icono, color, paginas, orden, contenido_html) VALUES

('escala', 'PHQ-9 — Cuestionario de Salud del Paciente',
 'Instrumento de 9 ítems para la detección y seguimiento de la depresión mayor en adultos.',
 ARRAY['Depresión','Evaluación','Cribado'], 'monitor_heart', '#f87171', 1, 10,
$html$<!doctype html><html lang="es"><head><meta charset="utf-8"><title>PHQ-9</title>
<style>body{font-family:Arial,sans-serif;max-width:720px;margin:30px auto;color:#1a1a1a;line-height:1.5}h1{font-size:20px}.tabla{width:100%;border-collapse:collapse;margin-top:14px}.tabla th,.tabla td{border:1px solid #ccc;padding:6px 8px;font-size:13px;text-align:left}.tabla th{background:#f3f3f3}.op{text-align:center}.foot{margin-top:18px;font-size:13px;border-top:1px solid #ccc;padding-top:10px}</style></head>
<body><h1>PHQ-9 — Cuestionario sobre la Salud del Paciente</h1>
<p><b>Durante las últimas 2 semanas, ¿con qué frecuencia le han molestado los siguientes problemas?</b></p>
<p>0 = Nunca · 1 = Varios días · 2 = Más de la mitad de los días · 3 = Casi todos los días</p>
<table class="tabla"><tr><th>#</th><th>Ítem</th><th class="op">0</th><th class="op">1</th><th class="op">2</th><th class="op">3</th></tr>
<tr><td>1</td><td>Poco interés o placer en hacer las cosas</td><td class="op">□</td><td class="op">□</td><td class="op">□</td><td class="op">□</td></tr>
<tr><td>2</td><td>Sentirse decaído/a, deprimido/a o sin esperanza</td><td class="op">□</td><td class="op">□</td><td class="op">□</td><td class="op">□</td></tr>
<tr><td>3</td><td>Problemas para dormir o dormir demasiado</td><td class="op">□</td><td class="op">□</td><td class="op">□</td><td class="op">□</td></tr>
<tr><td>4</td><td>Sentirse cansado/a o con poca energía</td><td class="op">□</td><td class="op">□</td><td class="op">□</td><td class="op">□</td></tr>
<tr><td>5</td><td>Poco apetito o comer en exceso</td><td class="op">□</td><td class="op">□</td><td class="op">□</td><td class="op">□</td></tr>
<tr><td>6</td><td>Sentirse mal consigo mismo/a o que es un fracaso</td><td class="op">□</td><td class="op">□</td><td class="op">□</td><td class="op">□</td></tr>
<tr><td>7</td><td>Dificultad para concentrarse</td><td class="op">□</td><td class="op">□</td><td class="op">□</td><td class="op">□</td></tr>
<tr><td>8</td><td>Moverse o hablar muy lento, o estar muy inquieto/a</td><td class="op">□</td><td class="op">□</td><td class="op">□</td><td class="op">□</td></tr>
<tr><td>9</td><td>Pensamientos de que estaría mejor muerto/a o de hacerse daño</td><td class="op">□</td><td class="op">□</td><td class="op">□</td><td class="op">□</td></tr></table>
<div class="foot"><b>Puntuación total: ____ / 27.</b> Interpretación: 0-4 mínima · 5-9 leve · 10-14 moderada · 15-19 moderada-grave · 20-27 grave. El ítem 9 positivo requiere valoración del riesgo.</div>
</body></html>$html$),

('escala', 'GAD-7 — Escala de Ansiedad Generalizada',
 'Cuestionario de 7 ítems validado para el cribado y la medición de la severidad de la ansiedad.',
 ARRAY['Ansiedad','Evaluación','Cribado'], 'monitor_heart', '#60a5fa', 1, 20,
$html$<!doctype html><html lang="es"><head><meta charset="utf-8"><title>GAD-7</title>
<style>body{font-family:Arial,sans-serif;max-width:720px;margin:30px auto;color:#1a1a1a;line-height:1.5}h1{font-size:20px}.tabla{width:100%;border-collapse:collapse;margin-top:14px}.tabla th,.tabla td{border:1px solid #ccc;padding:6px 8px;font-size:13px;text-align:left}.tabla th{background:#f3f3f3}.op{text-align:center}.foot{margin-top:18px;font-size:13px;border-top:1px solid #ccc;padding-top:10px}</style></head>
<body><h1>GAD-7 — Escala de Ansiedad Generalizada</h1>
<p><b>Durante las últimas 2 semanas, ¿con qué frecuencia le han molestado los siguientes problemas?</b></p>
<p>0 = Nunca · 1 = Varios días · 2 = Más de la mitad de los días · 3 = Casi todos los días</p>
<table class="tabla"><tr><th>#</th><th>Ítem</th><th class="op">0</th><th class="op">1</th><th class="op">2</th><th class="op">3</th></tr>
<tr><td>1</td><td>Sentirse nervioso/a, intranquilo/a o con los nervios de punta</td><td class="op">□</td><td class="op">□</td><td class="op">□</td><td class="op">□</td></tr>
<tr><td>2</td><td>No poder dejar de preocuparse o controlar la preocupación</td><td class="op">□</td><td class="op">□</td><td class="op">□</td><td class="op">□</td></tr>
<tr><td>3</td><td>Preocuparse demasiado por diferentes cosas</td><td class="op">□</td><td class="op">□</td><td class="op">□</td><td class="op">□</td></tr>
<tr><td>4</td><td>Dificultad para relajarse</td><td class="op">□</td><td class="op">□</td><td class="op">□</td><td class="op">□</td></tr>
<tr><td>5</td><td>Estar tan inquieto/a que es difícil permanecer sentado/a</td><td class="op">□</td><td class="op">□</td><td class="op">□</td><td class="op">□</td></tr>
<tr><td>6</td><td>Irritarse o enfadarse con facilidad</td><td class="op">□</td><td class="op">□</td><td class="op">□</td><td class="op">□</td></tr>
<tr><td>7</td><td>Sentir miedo como si algo terrible fuera a pasar</td><td class="op">□</td><td class="op">□</td><td class="op">□</td><td class="op">□</td></tr></table>
<div class="foot"><b>Puntuación total: ____ / 21.</b> Interpretación: 0-4 mínima · 5-9 leve · 10-14 moderada · 15-21 grave.</div>
</body></html>$html$),

('escala', 'PSS-10 — Escala de Estrés Percibido',
 'Escala de 10 ítems que mide el grado en que el paciente percibe su vida como incontrolable o imprevisible.',
 ARRAY['Estrés','Evaluación'], 'monitor_heart', '#60a5fa', 1, 30,
$html$<!doctype html><html lang="es"><head><meta charset="utf-8"><title>PSS-10</title>
<style>body{font-family:Arial,sans-serif;max-width:720px;margin:30px auto;color:#1a1a1a;line-height:1.5}h1{font-size:20px}.tabla{width:100%;border-collapse:collapse;margin-top:14px}.tabla th,.tabla td{border:1px solid #ccc;padding:6px 8px;font-size:13px}.tabla th{background:#f3f3f3}.foot{margin-top:18px;font-size:13px;border-top:1px solid #ccc;padding-top:10px}</style></head>
<body><h1>PSS-10 — Escala de Estrés Percibido</h1>
<p><b>En el último mes, ¿con qué frecuencia...?</b> &nbsp; 0 = Nunca · 1 = Casi nunca · 2 = De vez en cuando · 3 = A menudo · 4 = Muy a menudo</p>
<table class="tabla"><tr><th>#</th><th>Ítem</th><th>0-4</th></tr>
<tr><td>1</td><td>...se ha sentido afectado/a por algo que ocurrió inesperadamente?</td><td>____</td></tr>
<tr><td>2</td><td>...ha sentido que no podía controlar las cosas importantes de su vida?</td><td>____</td></tr>
<tr><td>3</td><td>...se ha sentido nervioso/a o estresado/a?</td><td>____</td></tr>
<tr><td>4</td><td>...se ha sentido seguro/a sobre su capacidad de manejar sus problemas? (inverso)</td><td>____</td></tr>
<tr><td>5</td><td>...ha sentido que las cosas le iban bien? (inverso)</td><td>____</td></tr>
<tr><td>6</td><td>...se ha dado cuenta de que no podía afrontar todas sus obligaciones?</td><td>____</td></tr>
<tr><td>7</td><td>...ha podido controlar las irritaciones de su vida? (inverso)</td><td>____</td></tr>
<tr><td>8</td><td>...ha sentido que tenía todo bajo control? (inverso)</td><td>____</td></tr>
<tr><td>9</td><td>...se ha enfadado por cosas fuera de su control?</td><td>____</td></tr>
<tr><td>10</td><td>...ha sentido que las dificultades se acumulaban tanto que no podía superarlas?</td><td>____</td></tr></table>
<div class="foot"><b>Puntuación: 0-40.</b> Ítems 4,5,7,8 se puntúan de forma inversa (0=4,1=3,2=2,3=1,4=0). Mayor puntuación = mayor estrés percibido.</div>
</body></html>$html$),

('ficha', 'Técnica de grounding 5-4-3-2-1',
 'Ficha de anclaje sensorial para reducir la disociación, la ansiedad aguda y las crisis de pánico.',
 ARRAY['Grounding','Pánico','Ansiedad'], 'spa', '#a78bfa', 1, 40,
$html$<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Grounding 5-4-3-2-1</title>
<style>body{font-family:Arial,sans-serif;max-width:720px;margin:30px auto;color:#1a1a1a;line-height:1.6}h1{font-size:20px}li{margin-bottom:8px}.box{border:1px solid #ccc;border-radius:8px;padding:14px 18px;margin-top:12px}</style></head>
<body><h1>Técnica de grounding 5-4-3-2-1</h1>
<p>Cuando notes ansiedad intensa, disociación o una crisis de pánico, anclá tu atención en el presente recorriendo tus cinco sentidos, sin prisa, respirando lento:</p>
<div class="box"><ol>
<li><b>5 cosas que puedas VER.</b> Nómbralas en voz baja (una pared, una lámpara, tus manos...).</li>
<li><b>4 cosas que puedas TOCAR.</b> Siente su textura (la ropa, la silla, el suelo bajo tus pies).</li>
<li><b>3 cosas que puedas OÍR.</b> Sonidos cercanos o lejanos (tu respiración, un coche, el reloj).</li>
<li><b>2 cosas que puedas OLER.</b> Si no percibes ninguno, recuerda dos olores que te gusten.</li>
<li><b>1 cosa que puedas SABOREAR.</b> Un sorbo de agua, o el sabor de tu boca.</li>
</ol></div>
<p style="margin-top:14px">Terminá con tres respiraciones profundas: inhalá 4 segundos, sostené 4, exhalá 6. Repetí el ejercicio si lo necesitás.</p>
</body></html>$html$),

('guia', 'Guía de relajación muscular progresiva (Jacobson)',
 'Protocolo paso a paso para reducir la tensión muscular y la activación fisiológica del estrés.',
 ARRAY['Relajación','Ansiedad','Técnica'], 'self_improvement', '#34d399', 2, 50,
$html$<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Relajación muscular progresiva</title>
<style>body{font-family:Arial,sans-serif;max-width:720px;margin:30px auto;color:#1a1a1a;line-height:1.6}h1{font-size:20px}h2{font-size:15px;margin-top:18px}li{margin-bottom:6px}</style></head>
<body><h1>Relajación muscular progresiva (Jacobson)</h1>
<p>Sentado o tumbado en un lugar tranquilo. En cada grupo muscular: <b>tensa 5 segundos</b> y luego <b>suelta de golpe 15-20 segundos</b>, notando el contraste. Respira lento durante todo el ejercicio.</p>
<h2>Secuencia (de la cabeza a los pies)</h2>
<ol>
<li><b>Manos y antebrazos:</b> cierra los puños con fuerza.</li>
<li><b>Brazos:</b> lleva las manos a los hombros, tensa los bíceps.</li>
<li><b>Frente:</b> sube las cejas; luego frunce el ceño.</li>
<li><b>Ojos y nariz:</b> aprieta los párpados y arruga la nariz.</li>
<li><b>Mandíbula y boca:</b> aprieta los dientes y los labios.</li>
<li><b>Cuello:</b> empuja la barbilla hacia el pecho.</li>
<li><b>Hombros:</b> súbelos hacia las orejas.</li>
<li><b>Pecho y espalda:</b> inspira hondo y arquea ligeramente la espalda.</li>
<li><b>Abdomen:</b> endurece como si fueras a recibir un golpe.</li>
<li><b>Piernas:</b> estira y tensa muslos y pantorrillas.</li>
<li><b>Pies:</b> curva los dedos hacia abajo.</li>
</ol>
<p style="margin-top:14px">Al terminar, permanece 2-3 minutos notando la sensación de pesadez y calma. Practícalo a diario.</p>
</body></html>$html$),

('paciente', 'Psicoeducación sobre la ansiedad',
 'Material en lenguaje accesible para explicar al paciente qué es la ansiedad y cómo manejarla.',
 ARRAY['Para paciente','Ansiedad','Psicoeducación'], 'menu_book', '#2dd4bf', 2, 60,
$html$<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Entendiendo la ansiedad</title>
<style>body{font-family:Arial,sans-serif;max-width:720px;margin:30px auto;color:#1a1a1a;line-height:1.6}h1{font-size:20px}h2{font-size:15px;margin-top:18px}li{margin-bottom:6px}</style></head>
<body><h1>Entendiendo la ansiedad</h1>
<h2>¿Qué es?</h2>
<p>La ansiedad es una respuesta <b>normal y adaptativa</b> de tu cuerpo ante algo que percibe como una amenaza. Activa el sistema de "lucha o huida": el corazón late más rápido, la respiración se acelera y los músculos se tensan para prepararte a reaccionar. El problema no es la ansiedad en sí, sino cuando aparece de forma intensa o frecuente sin un peligro real.</p>
<h2>No es peligrosa</h2>
<p>Aunque las sensaciones son muy molestas (palpitaciones, mareo, falta de aire), <b>no son dañinas</b>. Una crisis de ansiedad alcanza su pico y baja sola, normalmente en pocos minutos. No vas a desmayarte ni a perder el control por ella.</p>
<h2>El círculo de la ansiedad</h2>
<p>Sensación física → pensamiento catastrófico ("me va a pasar algo malo") → más miedo → más sensaciones. Romper ese círculo es la clave del tratamiento.</p>
<h2>Qué ayuda</h2>
<ul>
<li><b>Respiración lenta:</b> inhala 4 seg, sostén 4, exhala 6. Reduce la activación.</li>
<li><b>No evitar:</b> evitar lo que temes alivia a corto plazo pero alimenta la ansiedad.</li>
<li><b>Cuestionar el pensamiento:</b> ¿qué evidencia real hay? ¿qué es lo más probable?</li>
<li><b>Rutinas:</b> sueño, ejercicio y reducir cafeína bajan tu nivel de base.</li>
</ul>
<p style="margin-top:14px">Habla con tu psicólogo/a sobre cualquier duda. La ansiedad tiene tratamiento y mejora.</p>
</body></html>$html$)

ON CONFLICT (titulo) DO NOTHING;
