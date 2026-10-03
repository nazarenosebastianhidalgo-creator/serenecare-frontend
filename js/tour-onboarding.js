// ─────────────────────────────────────────────────────────────────────────────
// Tour guiado MULTI-PANTALLA — motor PROPIO (sin librería externa). Spotlight con
// divs normales (box-shadow) + tooltip. Garantizado que renderiza en cualquier
// navegador/tablet. Entra en cada sección y resalta el botón real.
//
// ⚠️ CAPADO a TEST_EMAIL mientras se afina. Para hacerlo general: borrar el GATE.
// Incluir en: dashboard_admin_clinica, pacientes_clinica, recepcion_config, agenda_clinica.
// ─────────────────────────────────────────────────────────────────────────────
import { supabase } from './supabase-client.js';

const K_ON = 'sc_tour_on', K_I = 'sc_tour_i', K_DONE = 'sc_tour_done';

const pagina = () => location.pathname.split('/').pop();
const getI = () => { try { return parseInt(localStorage.getItem(K_I) || '0', 10) || 0; } catch { return 0; } };
const setI = (n) => { try { localStorage.setItem(K_I, String(n)); } catch {} };
const activo = () => { try { return localStorage.getItem(K_ON) === '1'; } catch { return false; } };
const setActivo = (v) => { try { v ? localStorage.setItem(K_ON, '1') : localStorage.removeItem(K_ON); } catch {} };
const hecho = () => { try { return !!localStorage.getItem(K_DONE); } catch { return false; } };

const PAGES = [
  // 1 · Bienvenida (dashboard) → navega al perfil
  { page: 'dashboard_admin_clinica.html', steps: [
    { title: 'Bienvenido a SereneCare', description: 'En menos de 1 minuto te dejo la consulta lista para recibir pacientes. Puedes saltarlo cuando quieras.' },
  ] },
  // 2 · Completa tu ficha (perfil)
  { page: 'perfil_clinica.html', steps: [
    { el: '#tab-profesional', title: 'Completa tu ficha', description: 'Abre "Perfil profesional" y rellena tu especialidad y una breve descripción. Es lo que ven tus pacientes y lo que te hace aparecer.' },
  ] },
  // 3 · Trae tus pacientes (el paso que más activa)
  { page: 'pacientes_clinica.html', steps: [
    { el: '#btn-nuevo-paciente', title: 'Trae tus pacientes', description: 'Mete a los que ya tienes en consulta y gestiónalo todo gratis desde aquí: agenda, historia y recordatorios en un sitio.' },
  ] },
  // 4 · Activa las reservas (recepción)
  { page: 'recepcion_config.html', steps: [
    { el: '#t-activo', title: 'Tu página de reservas', description: 'Enciende esto para tener tu página pública donde los pacientes te encuentran.' },
    { el: '#t-reservas', title: 'Activa las reservas', description: 'Y con esto te reservan cita solos 24/7 desde tu enlace, sin llamarte.' },
  ] },
  // 5 · Conecta tu calendario (todo en un sitio)
  { page: 'integraciones_clinica.html', steps: [
    { el: '#gcal-card', title: 'Conecta tu calendario', description: 'Enlaza tu Google Calendar y tendrás tus citas de SereneCare y tu agenda personal en un mismo sitio, sin choques de horarios.' },
  ] },
  // 6 · Dónde pedir ayuda (vuelta al dashboard) + cierre
  { page: 'dashboard_admin_clinica.html', steps: [
    { el: '#sop-fab', title: '¿Dudas? Soporte', description: 'Escríbenos desde aquí, sin salir de SereneCare ni buscar un correo.' },
    { el: '#sc-guia-btn', title: 'Tu asistente', description: 'Y cuando no sepas cómo hacer algo, este asistente te guía paso a paso siempre.' },
    { title: '¡Listo!', description: 'Ya conoces lo esencial. Empieza por traer tus pacientes y activar tus reservas.' },
  ] },
];

function limpiar() { document.querySelectorAll('.sc-tour-el').forEach(e => e.remove()); }
function parar() { limpiar(); setActivo(false); try { localStorage.setItem(K_DONE, '1'); } catch {} }

function avanzar() {
  const i = getI() + 1; setI(i);
  if (!PAGES[i]) { parar(); return; }
  if (PAGES[i].page === pagina()) renderPaso(PAGES[i].steps, 0);
  else window.location.href = PAGES[i].page;
}

function renderPaso(stops, i) {
  limpiar();
  const s = stops[i];
  const el = s.el ? document.querySelector(s.el) : null;
  const total = stops.length;
  const ultimaPagina = !PAGES[getI() + 1];
  const esUltimoPaso = (i === total - 1);

  // Spotlight / oscurecido
  const spot = document.createElement('div'); spot.className = 'sc-tour-el';
  if (el) {
    try { el.scrollIntoView({ block: 'center', inline: 'center' }); } catch {}
    const r = el.getBoundingClientRect();
    spot.style.cssText = 'position:fixed;left:' + (r.left - 6) + 'px;top:' + (r.top - 6) + 'px;width:' + (r.width + 12) + 'px;height:' + (r.height + 12) + 'px;border:2px solid #2dd4bf;border-radius:12px;box-shadow:0 0 0 9999px rgba(2,6,23,.78);z-index:2147483000;pointer-events:none';
  } else {
    spot.style.cssText = 'position:fixed;inset:0;background:rgba(2,6,23,.80);z-index:2147483000';
  }
  document.body.appendChild(spot);

  // Tooltip
  const tip = document.createElement('div'); tip.className = 'sc-tour-el';
  tip.style.cssText = 'position:fixed;z-index:2147483001;max-width:320px;width:calc(100vw - 32px);background:#0d1b2e;border:1px solid rgba(255,255,255,.12);border-radius:16px;padding:18px;box-shadow:0 24px 60px rgba(0,0,0,.6);font-family:Inter,system-ui,sans-serif;color:#e2e8f0';
  tip.innerHTML =
    '<div style="font-family:Manrope,sans-serif;font-weight:800;font-size:16px;color:#fff;margin-bottom:6px">' + s.title + '</div>' +
    '<div style="font-size:14px;line-height:1.55;color:#cbd5e1">' + s.description + '</div>' +
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-top:16px;gap:8px">' +
      '<button data-act="skip" style="background:none;border:none;color:#64748b;font-size:12px;cursor:pointer;padding:4px">Saltar</button>' +
      '<div style="display:flex;gap:8px">' +
        (i > 0 ? '<button data-act="prev" style="background:rgba(255,255,255,.06);color:#cbd5e1;border:none;border-radius:10px;padding:8px 12px;font-weight:700;font-size:13px;cursor:pointer">Atrás</button>' : '') +
        '<button data-act="next" style="background:linear-gradient(135deg,#0f766e,#2dd4bf);color:#021613;border:none;border-radius:10px;padding:8px 14px;font-weight:800;font-size:13px;cursor:pointer">' + (esUltimoPaso ? (ultimaPagina ? 'Terminar' : 'Siguiente →') : 'Siguiente') + '</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(tip);

  // Posicionar el tooltip junto al elemento o centrado
  requestAnimationFrame(() => {
    const tr = tip.getBoundingClientRect();
    if (el) {
      const r = el.getBoundingClientRect();
      let top = r.bottom + 12;
      if (top + tr.height > window.innerHeight - 12) top = Math.max(12, r.top - tr.height - 12);
      let left = Math.min(Math.max(12, r.left), window.innerWidth - tr.width - 12);
      tip.style.top = top + 'px'; tip.style.left = left + 'px';
    } else {
      tip.style.top = Math.max(12, (window.innerHeight - tr.height) / 2) + 'px';
      tip.style.left = Math.max(12, (window.innerWidth - tr.width) / 2) + 'px';
    }
  });

  tip.addEventListener('click', (e) => {
    const a = e.target && e.target.getAttribute && e.target.getAttribute('data-act');
    if (!a) return;
    if (a === 'skip') parar();
    else if (a === 'prev') renderPaso(stops, i - 1);
    else if (a === 'next') { if (i < total - 1) renderPaso(stops, i + 1); else { limpiar(); avanzar(); } }
  });
}

function empezar() { setActivo(true); setI(0); if (pagina() === PAGES[0].page) renderPaso(PAGES[0].steps, 0); else window.location.href = PAGES[0].page; }
window.__scTour = () => { try { localStorage.removeItem(K_DONE); } catch {} empezar(); };

async function init() {
  // GENERAL para todos los admin de clínica con sesión. Arranca solo la 1ª vez
  // (sc_tour_done). Relanzable con window.__scTour().
  try { const { data: { session } } = await supabase.auth.getSession(); if (!session) return; } catch { return; }

  if (activo()) {
    const cur = PAGES[getI()];
    if (cur && cur.page === pagina()) renderPaso(cur.steps, 0);
  } else if (!hecho() && pagina() === PAGES[0].page) {
    empezar();
  }
}

setTimeout(init, 1500);
