// ─────────────────────────────────────────────────────────────────────────────
// Tour guiado de bienvenida (v1 — dashboard admin clínica). Spotlight con Driver.js.
// Toma el mando ~60s la PRIMERA vez y enseña dónde está cada cosa. Se puede saltar
// y no se repite (localStorage sc_tour_done). El asistente de chat queda para el día
// a día; este tour es la primera impresión ("ah, esto es fácil").
// ─────────────────────────────────────────────────────────────────────────────
const DONE_KEY = 'sc_tour_done';
const DRIVER_CSS = 'https://cdnjs.cloudflare.com/ajax/libs/driver.js/1.3.1/driver.css';
const DRIVER_JS  = 'https://cdnjs.cloudflare.com/ajax/libs/driver.js/1.3.1/driver.js.iife.js';

function yaHecho() { try { return !!localStorage.getItem(DONE_KEY); } catch { return false; } }
function marcarHecho() {
  try {
    localStorage.setItem(DONE_KEY, '1');
    // Evita que el asistente de chat se auto-abra el mismo día que se hizo el tour
    localStorage.setItem('sc_guia_auto_' + new Date().toISOString().slice(0, 10), '1');
  } catch {}
}

function cargar(url, esCss) {
  return new Promise((ok, no) => {
    if (esCss) {
      const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = url;
      l.onload = ok; l.onerror = no; document.head.appendChild(l);
    } else {
      const s = document.createElement('script'); s.src = url;
      s.onload = ok; s.onerror = no; document.head.appendChild(s);
    }
  });
}

const PASOS = [
  { popover: { title: 'Bienvenido a SereneCare', description: 'Te enseñamos lo esencial en menos de 1 minuto. Puedes saltarlo cuando quieras con la X.' } },
  { sel: 'a[href="pacientes_clinica.html"]', title: 'Tus pacientes', description: 'Aquí gestionas a tus pacientes. El mejor primer paso es traer a los que ya tienes.' },
  { sel: 'a[href="agenda_clinica.html"]', title: 'Tu agenda', description: 'Todas tus citas en un solo lugar.' },
  { sel: 'a[href="recepcion_config.html"]', title: 'Recepción y reservas', description: 'Activa tu disponibilidad y la recepcionista con IA para que te reserven sin llamarte.' },
  { sel: 'a[href="mensajes_clinica.html"]', title: 'Mensajes', description: 'Habla con tus pacientes dentro de SereneCare.' },
  { sel: '#sop-fab', title: 'Soporte', description: '¿Una duda? Escríbenos desde aquí, sin salir de la plataforma ni buscar un correo.' },
  { sel: '#sc-guia-btn', title: 'Tu asistente', description: 'Y cuando no sepas cómo hacer algo, este asistente te guía paso a paso. Puedes volver a él cuando quieras.' },
  { popover: { title: '¡Listo!', description: 'Ya conoces lo esencial de SereneCare. Ahora puedes empezar a trabajar.' } },
];

async function run() {
  if (yaHecho()) return;
  try {
    await cargar(DRIVER_CSS, true);
    await cargar(DRIVER_JS, false);
  } catch { return; } // si el CDN falla, no pasa nada: no hay tour
  const driver = window.driver && window.driver.js && window.driver.js.driver;
  if (!driver) return;

  // Construye solo los pasos cuyo elemento exista (robustez ante cambios de UI)
  const steps = PASOS
    .filter(p => !p.sel || document.querySelector(p.sel))
    .map(p => p.popover ? { popover: p.popover } : { element: p.sel, popover: { title: p.title, description: p.description } });
  if (steps.length <= 1) return; // nada que enseñar

  const d = driver({
    showProgress: true,
    progressText: '{{current}} de {{total}}',
    nextBtnText: 'Siguiente',
    prevBtnText: 'Atrás',
    doneBtnText: 'Ir a mi panel',
    allowClose: true,
    overlayColor: '#020617',
    steps,
    onDestroyed: marcarHecho,
  });
  window.__scTour = () => { try { localStorage.removeItem(DONE_KEY); } catch {} d.drive(); }; // re-lanzable
  d.drive();
}

// Espera a que monten sidebar y FABs (se cargan async) antes de arrancar.
setTimeout(run, 1800);
