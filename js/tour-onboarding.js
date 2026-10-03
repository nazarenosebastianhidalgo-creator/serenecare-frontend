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

// CSS de Driver.js INCRUSTADO (no depende de cargar /js/driver.css → se aplica siempre).
const DRIVER_CSS_INLINE = `.driver-active .driver-overlay,.driver-active *{pointer-events:none}.driver-active .driver-active-element,.driver-active .driver-active-element *,.driver-popover,.driver-popover *{pointer-events:auto}@keyframes animate-fade-in{0%{opacity:0}to{opacity:1}}.driver-fade .driver-overlay{animation:animate-fade-in .2s ease-in-out}.driver-fade .driver-popover{animation:animate-fade-in .2s}.driver-popover{all:unset;box-sizing:border-box;color:#2d2d2d;margin:0;padding:15px;border-radius:5px;min-width:250px;max-width:300px;box-shadow:0 1px 10px #0006;z-index:1000000000;position:fixed;top:0;right:0;background-color:#fff}.driver-popover *{font-family:Helvetica Neue,Inter,ui-sans-serif,"Apple Color Emoji",Helvetica,Arial,sans-serif}.driver-popover-title{font:19px/normal sans-serif;font-weight:700;display:block;position:relative;line-height:1.5;zoom:1;margin:0}.driver-popover-close-btn{all:unset;position:absolute;top:0;right:0;width:32px;height:28px;cursor:pointer;font-size:18px;font-weight:500;color:#d2d2d2;z-index:1;text-align:center;transition:color;transition-duration:.2s}.driver-popover-close-btn:hover,.driver-popover-close-btn:focus{color:#2d2d2d}.driver-popover-title[style*=block]+.driver-popover-description{margin-top:5px}.driver-popover-description{margin-bottom:0;font:14px/normal sans-serif;line-height:1.5;font-weight:400;zoom:1}.driver-popover-footer{margin-top:15px;text-align:right;zoom:1;display:flex;align-items:center;justify-content:space-between}.driver-popover-progress-text{font-size:13px;font-weight:400;color:#727272;zoom:1}.driver-popover-footer button{all:unset;display:inline-block;box-sizing:border-box;padding:3px 7px;text-decoration:none;text-shadow:1px 1px 0 #fff;background-color:#fff;color:#2d2d2d;font:12px/normal sans-serif;cursor:pointer;outline:0;zoom:1;line-height:1.3;border:1px solid #ccc;border-radius:3px}.driver-popover-footer .driver-popover-btn-disabled{opacity:.5;pointer-events:none}:not(body):has(>.driver-active-element){overflow:hidden!important}.driver-no-interaction,.driver-no-interaction *{pointer-events:none!important}.driver-popover-footer button:hover,.driver-popover-footer button:focus{background-color:#f7f7f7}.driver-popover-navigation-btns{display:flex;flex-grow:1;justify-content:flex-end}.driver-popover-navigation-btns button+button{margin-left:4px}.driver-popover-arrow{content:"";position:absolute;border:5px solid #fff}.driver-popover-arrow-side-over{display:none}.driver-popover-arrow-side-left{left:100%;border-right-color:transparent;border-bottom-color:transparent;border-top-color:transparent}.driver-popover-arrow-side-right{right:100%;border-left-color:transparent;border-bottom-color:transparent;border-top-color:transparent}.driver-popover-arrow-side-top{top:100%;border-right-color:transparent;border-bottom-color:transparent;border-left-color:transparent}.driver-popover-arrow-side-bottom{bottom:100%;border-left-color:transparent;border-top-color:transparent;border-right-color:transparent}.driver-popover-arrow-side-center{display:none}.driver-popover-arrow-align-end.driver-popover-arrow-side-left,.driver-popover-arrow-align-end.driver-popover-arrow-side-right{bottom:15px}.driver-popover-arrow-none{display:none}`;
let driverCargado = false;
async function cargarDriver() {
  if (driverCargado) return true;
  // CSS incrustado vía <style> (garantizado, sin esperar red ni onload).
  if (!document.getElementById('driver-css-inline')) {
    const st = document.createElement('style'); st.id = 'driver-css-inline'; st.textContent = DRIVER_CSS_INLINE; document.head.appendChild(st);
  }
  // JS: aquí sí esperamos onload (fiable en <script>); onerror también resuelve para no colgar.
  if (!(window.driver && window.driver.js && window.driver.js.driver)) {
    await new Promise((ok) => { const s = document.createElement('script'); s.src = DRIVER_JS; s.onload = ok; s.onerror = ok; document.head.appendChild(s); });
  }
  driverCargado = !!(window.driver && window.driver.js && window.driver.js.driver);
  return driverCargado;
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
  const loaded = await cargarDriver();
  const g = !!(window.driver && window.driver.js && window.driver.js.driver);
  alert('DIAG 1 · load=' + loaded + ' global=' + g + ' tipo=' + (g ? typeof window.driver.js.driver : 'n/a'));
  if (!g) return;
  const driver = window.driver.js.driver;
  const steps = stops
    .filter(s => !s.el || document.querySelector(s.el))
    .map(s => s.el ? { element: s.el, popover: { title: s.title, description: s.description } } : { popover: { title: s.title, description: s.description } });
  alert('DIAG 2 · pasos=' + steps.length);
  if (!steps.length) { avanzar(); return; }  // nada que enseñar aquí → siguiente pantalla
  const ultimaPantalla = !PAGES[getI() + 1];
  let skip = false;
  let d;
  try {
    d = driver({
    showProgress: true, progressText: '{{current}} de {{total}}',
    nextBtnText: 'Siguiente', prevBtnText: 'Atrás',
    doneBtnText: ultimaPantalla ? 'Terminar' : 'Siguiente →',
    allowClose: true, overlayColor: '#020617', stagePadding: 6,
    onCloseClick: () => { skip = true; d.destroy(); },
    onDestroyed: () => { if (skip) parar(); else avanzar(); },
    });
    alert('DIAG 3 · driver creado, llamando drive()');
    d.drive();
    alert('DIAG 4 · drive() llamado OK');
    setTimeout(() => {
      const pop = document.querySelector('.driver-popover');
      const ov = document.querySelector('.driver-overlay') || document.querySelector('svg.driver-overlay');
      if (!pop && !ov) { alert('DIAG 5 · NO hay elementos driver en el DOM'); return; }
      const r = pop ? pop.getBoundingClientRect() : { width: 0, height: 0 };
      const cs = pop ? getComputedStyle(pop) : {};
      alert('DIAG 5 · popover=' + !!pop + ' overlay=' + !!ov + ' tam=' + Math.round(r.width) + 'x' + Math.round(r.height) + ' display=' + (cs.display || '?') + ' vis=' + (cs.visibility || '?') + ' z=' + (cs.zIndex || '?'));
    }, 400);
  } catch (e) { alert('DIAG ERROR · ' + (e && e.message ? e.message : e)); }
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
    b.id = 'sc-tour-test'; b.textContent = '▶ Recorrido v12';
    b.style.cssText = 'position:fixed;top:112px;right:16px;z-index:2147483000;background:#7c3aed;color:#fff;border:none;border-radius:999px;padding:10px 16px;font:700 12px Manrope,system-ui,sans-serif;cursor:pointer;box-shadow:0 8px 24px rgba(124,58,237,.5)';
    b.addEventListener('click', async () => {
      try {
        try { localStorage.removeItem(K_DONE); } catch {}
        setActivo(true); setI(0);
        const okLoad = await cargarDriver();
        const okGlobal = !!(window.driver && window.driver.js && window.driver.js.driver);
        if (!okLoad || !okGlobal) { alert('Driver no cargó. load=' + okLoad + ' global=' + okGlobal); return; }
        await correr(PAGES[0].steps);   // await => cualquier error del tour sale por el catch
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
