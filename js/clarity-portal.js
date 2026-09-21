/* Analítica de producto (mapa de calor) del PORTAL profesional de SereneCare.
   Microsoft Clarity — proyecto yeq6ojrhrm (el mismo que la calculadora PHQ-9).

   Sirve para ver, de forma AGREGADA, dónde clican / qué usan más / dónde se
   atascan los psicólogos dentro de la app (mapa de calor, scroll, dead/rage
   clicks). NO para espiar sesiones concretas.

   ⚠️ PROTECCIÓN DE DATOS (PHI): en el panel de Clarity hay que dejar el
   enmascarado en "Strict" (Settings → Masking) para que NUNCA se capture
   texto real (nombres, notas, datos de pacientes). Con Strict, incluso las
   grabaciones muestran solo bloques, sin datos legibles.

   Se carga SOLO desde los sidebars de admin y psicólogo (no paciente, no
   super admin) + la pantalla de onboarding. */
(function (c, l, a, r, i, t, y) {
  if (c[a]) return;                 // ya cargado en esta página
  c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
  t = l.createElement(r); t.async = 1; t.src = "https://www.clarity.ms/tag/" + i;
  y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
})(window, document, "clarity", "script", "yeq6ojrhrm");
