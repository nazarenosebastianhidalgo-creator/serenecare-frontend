// ─────────────────────────────────────────────────────────────────────────────
// Tour guiado MULTI-PANTALLA (Driver.js). Entra en cada sección y enseña ahí mismo
// dónde se hace cada cosa, pasando de una pantalla a la siguiente.
//
// ⚠️ CAPADO A LA CUENTA DE PRUEBA (TEST_EMAIL) mientras se afina. Cuando esté OK,
// quitar el candado (ver GATE más abajo) para que sea general.
//
// Incluir este script en: dashboard_admin_clinica, pacientes_clinica,
// recepcion_config, agenda_clinica (se auto-gatea por email, inofensivo en otras).
// ─────────────────────────────────────────────────────────────────────────────
import { supabase } from './supabase-client.js';

const TEST_EMAIL = 'nazarenoo.sebastiann.hidalgoo@hotmail.com';
const DRIVER_CSS = '/js/driver.css';        // vendorizado local (mismo origen, sin depender de CDN)
const DRIVER_JS  = '/js/driver.iife.js';
const K_ON = 'sc_tour_on';     // tour en curso
const K_I  = 'sc_tour_i';      // índice de pantalla actual
const K_DONE = 'sc_tour_done'; // ya completado alguna vez

const pagina = () => location.pathname.split('/').pop();
const getI = () => { try { return parseInt(localStorage.getItem(K_I) || '0', 10) || 0; } catch { return 0; } };
const setI = (n) => { try { localStorage.setItem(K_I, String(n)); } catch {} };
const activo = () => { try { return localStorage.getItem(K_ON) === '1'; } catch { return false; } };
const setActivo = (v) => { try { v ? localStorage.setItem(K_ON, '1') : localStorage.removeItem(K_ON); } catch {} };
const hecho = () => { try { return !!localStorage.getItem(K_DONE); } catch { return false; } };

// Secuencia de pantallas y qué enseñar en cada una.
const PAGES = [
  { page: 'dashboard_admin_clinica.html', steps: [
    { title: 'Bienvenido a SereneCare', description: 'Te enseño lo esencial en menos de 1 minuto, pantalla por pantalla. Puedes saltarlo con la X.' },
    { el: 'a[href="pacientes_clinica.html"]', title: 'Empezamos por Pacientes', description: 'Lo primero: tener a tus pacientes dentro. Vamos allí.' },
  ] },
  { page: 'pacientes_clinica.html', steps: [
    { el: '#btn-nuevo-paciente', title: 'Añade tu primer paciente', description: 'Desde aquí creas un paciente nuevo. El mejor arranque: mete a los que ya tienes en consulta.' },
  ] },
  { page: 'recepcion_config.html', steps: [
    { el: '#t-activo', title: 'Tu recepción', description: 'Aquí activas tu página de reservas para que los pacientes te encuentren y pidan cita.' },
    { el: '#t-reservas', title: 'Activa las reservas', description: 'Enciende esto y tus pacientes reservan solos 24/7 desde tu enlace, sin llamarte.' },
  ] },
  { page: 'agenda_clinica.html', steps: [
    { el: '#btn-nueva-cita', title: 'Tu agenda', description: 'Aquí ves todas tus citas y puedes crear una a mano cuando lo necesites.' },
  ] },
  { page: 'dashboard_admin_clinica.html', steps: [
    { el: '#sop-fab', title: 'Soporte', description: '¿Una duda? Escríbenos desde aquí, sin salir de SereneCare.' },
    { el: '#sc-guia-btn', title: 'Tu asistente', description: 'Y cuando no sepas cómo hacer algo, este asistente te guía paso a paso.' },
    { title: '¡Listo!', description: 'Ya conoces lo esencial. Ahora a trabajar.' },
  ] },
];

let driverCargado = false;
async function cargarDriver() {
  if (driverCargado) return true;
  try {
    await new Promise((ok, no) => { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = DRIVER_CSS; l.onload = ok; l.onerror = no; document.head.appendChild(l); });
    await new Promise((ok, no) => { const s = document.createElement('script'); s.src = DRIVER_JS; s.onload = ok; s.onerror = no; document.head.appendChild(s); });
    driverCargado = true;
  } catch { return false; }
  return !!(window.driver && window.driver.js && window.driver.js.driver);
}

function parar() { setActivo(false); try { localStorage.setItem(K_DONE, '1'); } catch {} }

function avanzar() {
  const i = getI() + 1;
  setI(i);
  if (!PAGES[i]) { parar(); return; }               // fin del tour
  if (PAGES[i].page === pagina()) { correr(PAGES[i].steps); }  // raro: misma pantalla seguida
  else { window.location.href = PAGES[i].page; }     // navega a la siguiente
}

async function correr(stops) {
  if (!(await cargarDriver())) return;
  const driver = window.driver.js.driver;
  const steps = stops
    .filter(s => !s.el || document.querySelector(s.el))
    .map(s => s.el ? { element: s.el, popover: { title: s.title, description: s.description } } : { popover: { title: s.title, description: s.description } });
  if (!steps.length) { avanzar(); return; }  // nada que enseñar aquí → siguiente pantalla
  const ultimaPantalla = !PAGES[getI() + 1];
  let skip = false;
  const d = driver({
    showProgress: true, progressText: '{{current}} de {{total}}',
    nextBtnText: 'Siguiente', prevBtnText: 'Atrás',
    doneBtnText: ultimaPantalla ? 'Terminar' : 'Siguiente →',
    allowClose: true, overlayColor: '#020617', stagePadding: 6,
    onCloseClick: () => { skip = true; d.destroy(); },
    onDestroyed: () => { if (skip) parar(); else avanzar(); },
  });
  d.drive();
}

function empezar() { setActivo(true); setI(0); if (pagina() === PAGES[0].page) correr(PAGES[0].steps); else window.location.href = PAGES[0].page; }
window.__scTour = () => { try { localStorage.removeItem(K_DONE); } catch {} empezar(); };

async function init() {
  // GATE: solo la cuenta de prueba. (Para hacerlo general: borrar este bloque de email.)
  let email = '';
  try { const { data: { session } } = await supabase.auth.getSession(); email = (session && session.user && session.user.email || '').toLowerCase(); } catch { return; }
  if (email !== TEST_EMAIL.toLowerCase()) return;

  // Botón de prueba para relanzar (solo en el dashboard)
  if (pagina() === 'dashboard_admin_clinica.html' && !document.getElementById('sc-tour-test')) {
    const b = document.createElement('button');
    b.id = 'sc-tour-test'; b.textContent = '▶ Recorrido (test)';
    b.style.cssText = 'position:fixed;right:24px;bottom:170px;z-index:9995;background:#7c3aed;color:#fff;border:none;border-radius:999px;padding:10px 16px;font:700 12px Manrope,system-ui,sans-serif;cursor:pointer;box-shadow:0 8px 24px rgba(124,58,237,.4)';
    b.addEventListener('click', async () => {
      try {
        const okLoad = await cargarDriver();
        const okGlobal = !!(window.driver && window.driver.js && window.driver.js.driver);
        if (!okLoad || !okGlobal) { alert('Driver no cargó. load=' + okLoad + ' global=' + okGlobal); return; }
        window.__scTour();
      } catch (e) { alert('TOUR ERROR: ' + (e && e.message ? e.message : e)); }
    });
    document.body.appendChild(b);
  }

  if (activo()) {
    // Reanudar en la pantalla que toca
    const cur = PAGES[getI()];
    if (cur && cur.page === pagina()) correr(cur.steps);
  } else if (!hecho() && pagina() === PAGES[0].page) {
    empezar(); // primer arranque automático (solo cuenta de prueba por ahora)
  }
}

// Espera a que monten sidebar y FABs (se cargan async) antes de arrancar.
setTimeout(init, 1800);
