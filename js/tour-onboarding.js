// ─────────────────────────────────────────────────────────────────────────────
// Tour guiado de bienvenida (v1 — dashboard admin clínica). Spotlight con Driver.js.
// Toma el mando ~60s la PRIMERA vez y enseña dónde está cada cosa. Se puede saltar
// y no se repite (localStorage sc_tour_done).
//
// BOTÓN DE PRUEBA: solo visible para la cuenta de test (TEST_EMAIL) para afinar el
// tour. Quitar cuando esté listo (borrar el bloque "botón de prueba").
// ─────────────────────────────────────────────────────────────────────────────
import { supabase } from './supabase-client.js';

const DONE_KEY = 'sc_tour_done';
const DRIVER_CSS = 'https://cdnjs.cloudflare.com/ajax/libs/driver.js/1.3.1/driver.css';
const DRIVER_JS  = 'https://cdnjs.cloudflare.com/ajax/libs/driver.js/1.3.1/driver.js.iife.js';
const TEST_EMAIL = 'nazarenoo.sebastiann.hidalgoo@hotmail.com';

function yaHecho() { try { return !!localStorage.getItem(DONE_KEY); } catch { return false; } }
function marcarHecho() {
  try {
    localStorage.setItem(DONE_KEY, '1');
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

let driverCargado = false;
async function lanzarTour() {
  try {
    if (!driverCargado) { await cargar(DRIVER_CSS, true); await cargar(DRIVER_JS, false); driverCargado = true; }
  } catch { return; }
  const driver = window.driver && window.driver.js && window.driver.js.driver;
  if (!driver) return;

  const steps = PASOS
    .filter(p => !p.sel || document.querySelector(p.sel))
    .map(p => p.popover ? { popover: p.popover } : { element: p.sel, popover: { title: p.title, description: p.description } });
  if (steps.length <= 1) return;

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
  d.drive();
}
window.__scTour = lanzarTour;

// Botón de prueba (SOLO cuenta de test) para relanzar el tour al afinarlo.
async function botonPrueba() {
  let email = '';
  try { const { data: { session } } = await supabase.auth.getSession(); email = (session && session.user && session.user.email || '').toLowerCase(); } catch { return; }
  if (email !== TEST_EMAIL.toLowerCase()) return;
  if (document.getElementById('sc-tour-test')) return;
  const b = document.createElement('button');
  b.id = 'sc-tour-test';
  b.textContent = '▶ Recorrido (test)';
  b.style.cssText = 'position:fixed;right:24px;bottom:170px;z-index:9995;background:#7c3aed;color:#fff;border:none;border-radius:999px;padding:10px 16px;font:700 12px Manrope,system-ui,sans-serif;cursor:pointer;box-shadow:0 8px 24px rgba(124,58,237,.4)';
  b.addEventListener('click', () => { try { localStorage.removeItem(DONE_KEY); } catch {} lanzarTour(); });
  document.body.appendChild(b);
}

// Primera vez: arranca solo tras montar sidebar/FABs. Y pinta el botón de prueba.
setTimeout(() => { if (!yaHecho()) lanzarTour(); botonPrueba(); }, 1800);
