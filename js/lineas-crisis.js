// ── Línea de crisis del SOS según la clínica del paciente ──────────────
// El número de crisis/emergencias depende del país de la clínica. auth.js lo
// guarda en localStorage (tp_crisis / tp_emergencia) al iniciar sesión. Este
// script (incluido en las pantallas del paciente) ajusta los enlaces del SOS.
// Si no hay valor en localStorage (p.ej. página pública por token), se deja el
// valor por defecto del HTML — nunca un número inventado.
(function () {
  function limpiar(n) { return (n || '').replace(/[^0-9+*#]/g, ''); }
  function aplicar() {
    var crisis = localStorage.getItem('tp_crisis');
    var emerg  = localStorage.getItem('tp_emergencia');
    if (crisis) {
      document.querySelectorAll('[data-crisis]').forEach(function (a) {
        a.setAttribute('href', 'tel:' + limpiar(crisis));
        a.querySelectorAll('[data-crisis-num]').forEach(function (n) { n.textContent = crisis; });
      });
    }
    if (emerg) {
      document.querySelectorAll('[data-emergency]').forEach(function (a) {
        a.setAttribute('href', 'tel:' + limpiar(emerg));
        a.querySelectorAll('[data-emergency-num]').forEach(function (n) { n.textContent = emerg; });
      });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', aplicar);
  else aplicar();
})();
