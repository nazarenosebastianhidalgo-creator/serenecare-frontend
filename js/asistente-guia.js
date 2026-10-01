// ─────────────────────────────────────────────────────────────────────────────
// Asistente de configuración (guía interactiva estilo chat, GUIONIZADA).
// No usa IA: respuestas preparadas + enlaces a la pantalla exacta. Coste cero,
// sin alucinaciones. Muestra el progreso real de la cuenta (mi-elegibilidad).
// Capa 2 (IA libre con Groq) se añadirá encima más adelante.
//
// Uso: define window.__SC_ROL = 'admin_clinica' | 'psicologo' antes de cargarlo.
// ─────────────────────────────────────────────────────────────────────────────
import { supabase } from './supabase-client.js';

const BK = 'https://serenecare-backend-production.up.railway.app';
const ROL = (window.__SC_ROL === 'psicologo') ? 'psicologo' : 'admin_clinica';

// Resuelve pantallas que cambian según el rol (admin clínica vs psicólogo)
function pant(base) {
  const variantes = {
    perfil:        ROL === 'psicologo' ? 'perfil_psicologo.html'       : 'perfil_clinica.html',
    agenda:        ROL === 'psicologo' ? 'agenda_psicologo.html'       : 'agenda_clinica.html',
    pacientes:     ROL === 'psicologo' ? 'pacientes_psicologo.html'    : 'pacientes_clinica.html',
    integraciones: ROL === 'psicologo' ? 'integraciones_psicologo.html': 'integraciones_clinica.html',
  };
  // Pantallas compartidas (misma para ambos roles)
  const fijas = {
    recepcion: 'recepcion_config.html',
    recursos:  'recursos_psicologo.html',
    migracion: 'migracion.html',
  };
  return variantes[base] || fijas[base] || base;
}

// ── Base de conocimiento (temas guiados) ──────────────────────────────────────
const TEMAS = [
  {
    id: 'perfil', icono: 'badge', label: 'Completar mi ficha',
    pasos: [
      'Entra en <b>Mi perfil</b> → pestaña <b>Perfil profesional</b>.',
      'Rellena especialidad, años de experiencia y una <b>biografía</b> (lo que verán tus pacientes).',
      'Sube tu <b>foto</b> en la pestaña de información personal.',
      'Cuando esté completa, pulsa <b>Publicar ficha</b> para aparecer en el directorio.',
    ],
    cta: { label: 'Ir a Mi perfil', pant: 'perfil' },
  },
  {
    id: 'agenda', icono: 'event', label: 'Configurar horarios y reservas',
    pasos: [
      'Entra en <b>Recepción y Reservas</b>.',
      'Marca tus <b>días y franjas horarias</b> de atención.',
      'Activa el interruptor de <b>Reservas</b> para que te puedan pedir cita.',
      'Define la <b>duración</b> de la sesión y la antelación mínima.',
    ],
    cta: { label: 'Configurar reservas', pant: 'recepcion' },
  },
  {
    id: 'pacientes', icono: 'groups', label: 'Añadir o invitar pacientes',
    pasos: [
      'Entra en <b>Pacientes</b>.',
      'Pulsa <b>Añadir paciente</b> y rellena sus datos, o <b>invítale</b> por email para que complete su ficha.',
      'El paciente recibe un enlace para registrarse y ver sus citas y recursos.',
    ],
    cta: { label: 'Ir a Pacientes', pant: 'pacientes' },
  },
  {
    id: 'migracion', icono: 'upload_file', label: 'Migrar mis pacientes (CSV/Excel)',
    pasos: [
      'Entra en <b>Migración</b>.',
      'Sube tu archivo (CSV o Excel) con tus pacientes actuales.',
      'El sistema mapea las columnas automáticamente; revisa y confirma la importación.',
    ],
    cta: { label: 'Ir a Migración', pant: 'migracion' },
  },
  {
    id: 'recepcionista', icono: 'support_agent', label: 'Activar la recepcionista IA',
    pasos: [
      'Entra en <b>Recepción y Reservas</b>.',
      'Activa la <b>recepcionista IA</b>: responde a tus pacientes, ofrece huecos y agenda por ti.',
      'Revisa el mensaje de bienvenida y tus áreas de especialización (las usa para responder).',
      '<i>La recepcionista IA es una función Premium.</i>',
    ],
    cta: { label: 'Configurar recepción', pant: 'recepcion' },
  },
  {
    id: 'gcal', icono: 'calendar_month', label: 'Conectar Google Calendar',
    pasos: [
      'Entra en <b>Integraciones</b>.',
      'Pulsa <b>Conectar Google Calendar</b> y autoriza con tu cuenta de Google.',
      'A partir de ahí, tus citas se sincronizan con tu calendario automáticamente.',
    ],
    cta: { label: 'Ir a Integraciones', pant: 'integraciones' },
  },
  {
    id: 'recursos', icono: 'folder_shared', label: 'Compartir recursos con pacientes',
    pasos: [
      'Entra en <b>Recursos</b>.',
      'Sube documentos, ejercicios o materiales.',
      'Asígnalos a un paciente concreto; lo verá en su portal.',
    ],
    cta: { label: 'Ir a Recursos', pant: 'recursos' },
  },
];

// ── Estilos ───────────────────────────────────────────────────────────────────
const CSS = `
#sc-guia-btn{position:fixed;right:24px;bottom:96px;z-index:9996;display:flex;align-items:center;gap:8px;background:linear-gradient(135deg,#4f46e5,#818cf8);color:#fff;border:none;border-radius:999px;padding:12px 18px;font:700 13px Manrope,system-ui,sans-serif;cursor:pointer;box-shadow:0 10px 30px rgba(79,70,229,.45);}
#sc-guia-btn .material-symbols-outlined{font-size:20px;}
#sc-guia-panel{position:fixed;right:24px;bottom:96px;z-index:9997;width:360px;max-width:calc(100vw - 32px);height:520px;max-height:calc(100vh - 120px);background:#0d1b2e;border:1px solid rgba(255,255,255,.1);border-radius:20px;box-shadow:0 30px 80px rgba(0,0,0,.55);display:none;flex-direction:column;overflow:hidden;font-family:Inter,system-ui,sans-serif;}
#sc-guia-panel.open{display:flex;}
#sc-guia-head{display:flex;align-items:center;gap:10px;padding:16px;background:linear-gradient(135deg,#4f46e5,#6366f1);}
#sc-guia-head h4{margin:0;font:800 15px Manrope,sans-serif;color:#fff;}
#sc-guia-head p{margin:0;font-size:11px;color:rgba(255,255,255,.75);}
#sc-guia-close{margin-left:auto;background:none;border:none;color:#fff;cursor:pointer;opacity:.8;}
#sc-guia-body{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:12px;}
.sc-msg{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.07);border-radius:14px;border-top-left-radius:4px;padding:12px 14px;font-size:13px;line-height:1.55;color:#e2e8f0;max-width:92%;}
.sc-msg b{color:#fff;} .sc-msg ol{margin:8px 0 0;padding-left:18px;} .sc-msg li{margin-bottom:6px;}
.sc-prog{height:8px;border-radius:99px;background:rgba(255,255,255,.08);overflow:hidden;margin:8px 0 4px;}
.sc-prog>span{display:block;height:100%;background:linear-gradient(90deg,#34d399,#2dd4bf);}
.sc-chips{display:flex;flex-wrap:wrap;gap:8px;}
.sc-chip{display:inline-flex;align-items:center;gap:6px;background:rgba(129,140,248,.12);color:#c7d2fe;border:1px solid rgba(129,140,248,.3);border-radius:999px;padding:8px 12px;font:600 12px Inter,sans-serif;cursor:pointer;}
.sc-chip .material-symbols-outlined{font-size:15px;}
.sc-chip-fb{background:rgba(251,191,36,.12);color:#fcd34d;border-color:rgba(251,191,36,.3);}
.sc-cta{display:inline-flex;align-items:center;gap:6px;background:#0d9488;color:#fff;border-radius:10px;padding:9px 14px;font:700 12px Manrope,sans-serif;text-decoration:none;margin-top:4px;}
.sc-done{color:#34d399;} .sc-pend{color:#fbbf24;}
`;

let token = null;
let userId = null;
let perfil = { rol: null, clinica_id: null, nombre: '', apellido: '', email: '' };

async function init() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    token = session && session.access_token;
    if (!token) return; // sin sesión → no mostrar
    userId = session.user.id;
    perfil.email = session.user.email || '';
    try {
      const { data } = await supabase.from('usuarios').select('rol, clinica_id, nombre, apellido, email').eq('id', userId).maybeSingle();
      if (data) perfil = { ...perfil, ...data };
    } catch (_) {}
  } catch (_) { return; }
  montarUI();
}

function montarUI() {
  const style = document.createElement('style'); style.textContent = CSS; document.head.appendChild(style);

  const btn = document.createElement('button');
  btn.id = 'sc-guia-btn';
  btn.innerHTML = '<span class="material-symbols-outlined">waving_hand</span> ¿Cómo lo hago?';
  document.body.appendChild(btn);

  const panel = document.createElement('div');
  panel.id = 'sc-guia-panel';
  panel.innerHTML = `
    <div id="sc-guia-head">
      <span class="material-symbols-outlined" style="color:#fff">support_agent</span>
      <div><h4>Asistente SereneCare</h4><p>Te guío paso a paso</p></div>
      <button id="sc-guia-close"><span class="material-symbols-outlined">close</span></button>
    </div>
    <div id="sc-guia-body"></div>`;
  document.body.appendChild(panel);

  btn.addEventListener('click', () => { panel.classList.add('open'); btn.style.display = 'none'; abrir(); });
  panel.querySelector('#sc-guia-close').addEventListener('click', () => { panel.classList.remove('open'); btn.style.display = ''; });
}

const body = () => document.getElementById('sc-guia-body');
function msg(html) {
  const d = document.createElement('div'); d.className = 'sc-msg'; d.innerHTML = html;
  body().appendChild(d); body().scrollTop = body().scrollHeight; return d;
}

async function abrir() {
  body().innerHTML = '';
  msg('¡Hola! 👋 Soy tu asistente. Te ayudo a dejar tu consulta lista y a saber <b>cómo hacer cada cosa</b>, sin tener que preguntar a nadie.');
  await mostrarProgreso();
  menuPrincipal();
}

async function mostrarProgreso() {
  let data = null;
  try {
    const r = await fetch(BK + '/api/eap/mi-elegibilidad', { headers: { Authorization: 'Bearer ' + token } });
    if (r.ok) data = await r.json();
  } catch (_) {}
  if (!data || !data.checks) return;
  const total = data.checks.length;
  const hechos = data.checks.filter(c => c.done).length;
  const pct = Math.round((hechos / total) * 100);
  const pend = data.checks.filter(c => !c.done);
  let html = `Llevas <b>${hechos} de ${total}</b> pasos completados.<div class="sc-prog"><span style="width:${pct}%"></span></div>`;
  if (pend.length) {
    html += 'Te falta:<ol>' + pend.map(c => `<li class="sc-pend">${c.label}</li>`).join('') + '</ol>';
  } else {
    html += '<span class="sc-done">✓ ¡Lo tienes todo configurado! 🎉</span>';
  }
  msg(html);
  // Si falta algo, ofrece el primer pendiente como atajo
  if (pend.length) {
    const prim = pend[0];
    const d = msg(`Empieza por aquí 👇`);
    const a = document.createElement('a'); a.className = 'sc-cta'; a.href = prim.url || '#';
    a.innerHTML = '<span class="material-symbols-outlined" style="font-size:15px">arrow_forward</span> ' + prim.label;
    d.appendChild(document.createElement('br')); d.appendChild(a);
  }
}

function menuPrincipal() {
  const d = msg('¿Con qué te ayudo?');
  const chips = document.createElement('div'); chips.className = 'sc-chips';
  TEMAS.forEach(t => {
    const c = document.createElement('button'); c.className = 'sc-chip';
    c.innerHTML = `<span class="material-symbols-outlined">${t.icono}</span> ${t.label}`;
    c.addEventListener('click', () => responderTema(t));
    chips.appendChild(c);
  });
  // Siempre: salida a sugerencia/incidencia si no encuentra lo que busca
  const fb = document.createElement('button'); fb.className = 'sc-chip sc-chip-fb';
  fb.innerHTML = '<span class="material-symbols-outlined">forum</span> No encuentro lo que busco';
  fb.addEventListener('click', fallbackInicio);
  chips.appendChild(fb);
  d.appendChild(document.createElement('br')); d.appendChild(chips);
}

// ── Fallback: enviar sugerencia o incidencia al equipo ────────────────────────
function fallbackInicio() {
  const d = msg('Sin problema, te leo. ¿Qué quieres enviarnos?');
  const chips = document.createElement('div'); chips.className = 'sc-chips';
  const b1 = document.createElement('button'); b1.className = 'sc-chip';
  b1.innerHTML = '<span class="material-symbols-outlined">lightbulb</span> Una sugerencia';
  b1.addEventListener('click', () => formulario('sugerencia'));
  const b2 = document.createElement('button'); b2.className = 'sc-chip';
  b2.innerHTML = '<span class="material-symbols-outlined">bug_report</span> Reportar una incidencia';
  b2.addEventListener('click', () => formulario('incidencia'));
  chips.appendChild(b1); chips.appendChild(b2);
  d.appendChild(document.createElement('br')); d.appendChild(chips);
}

function formulario(tipo) {
  const esInc = tipo === 'incidencia';
  const d = msg(esInc
    ? 'Cuéntame qué <b>falla</b> con el mayor detalle posible (qué hacías, qué pasó). Nuestro equipo lo revisa.'
    : 'Cuéntame tu <b>idea o mejora</b>. La leemos todas y nos ayudan a priorizar.');
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;flex-direction:column;gap:8px;margin-top:8px;';
  wrap.innerHTML = `
    <input id="fb-asunto" placeholder="Asunto (opcional)" style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:9px 11px;color:#f1f5f9;font-size:13px;outline:none"/>
    <textarea id="fb-texto" rows="4" placeholder="${esInc ? 'Describe la incidencia…' : 'Escribe tu sugerencia…'}" style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:9px 11px;color:#f1f5f9;font-size:13px;outline:none;resize:none"></textarea>
    <button id="fb-enviar" style="background:#0d9488;color:#fff;border:none;border-radius:10px;padding:10px;font:700 13px Manrope,sans-serif;cursor:pointer">Enviar al equipo</button>
    <span id="fb-err" style="display:none;color:#fb7185;font-size:12px"></span>`;
  d.appendChild(wrap);
  wrap.querySelector('#fb-enviar').addEventListener('click', () => enviarTicket(tipo, wrap));
}

async function enviarTicket(tipo, wrap) {
  const asunto = (wrap.querySelector('#fb-asunto').value || '').trim();
  const texto = (wrap.querySelector('#fb-texto').value || '').trim();
  const err = wrap.querySelector('#fb-err');
  if (!texto) { err.textContent = 'Escribe un mensaje antes de enviar.'; err.style.display = 'block'; return; }
  const btn = wrap.querySelector('#fb-enviar'); btn.disabled = true; btn.textContent = 'Enviando…';
  const nombre = ((perfil.nombre || '') + (perfil.apellido ? ' ' + perfil.apellido : '')).trim();
  const titulo = asunto || (tipo === 'incidencia' ? 'Incidencia desde el asistente' : 'Sugerencia desde el asistente');
  try {
    const { error } = await supabase.from('tickets_soporte').insert({
      clinica_id: perfil.clinica_id || null, usuario_id: userId, rol: perfil.rol || null,
      nombre: nombre || null, email: perfil.email || null,
      asunto: titulo, mensaje: texto,
      categoria: tipo, prioridad: tipo === 'incidencia' ? 'alta' : 'media', estado: 'abierto',
    });
    if (error) throw error;
    msg(tipo === 'incidencia'
      ? '✓ Incidencia enviada. Nuestro equipo la revisa y te responde por el <b>widget de soporte</b> (abajo a la izquierda).'
      : '✓ ¡Gracias por tu sugerencia! La tendremos en cuenta. Te podemos responder por el <b>widget de soporte</b>.');
  } catch (e) {
    err.textContent = 'No se pudo enviar, inténtalo de nuevo.'; err.style.display = 'block';
    btn.disabled = false; btn.textContent = 'Enviar al equipo'; return;
  }
  const back = msg('¿Algo más?');
  const chips = document.createElement('div'); chips.className = 'sc-chips';
  const c = document.createElement('button'); c.className = 'sc-chip';
  c.innerHTML = '<span class="material-symbols-outlined">menu</span> Ver todos los temas';
  c.addEventListener('click', menuPrincipal);
  chips.appendChild(c); back.appendChild(document.createElement('br')); back.appendChild(chips);
}

function responderTema(t) {
  let html = `<b>${t.label}</b><ol>` + t.pasos.map(p => `<li>${p}</li>`).join('') + '</ol>';
  const d = msg(html);
  if (t.cta) {
    const a = document.createElement('a'); a.className = 'sc-cta'; a.href = pant(t.cta.pant);
    a.innerHTML = '<span class="material-symbols-outlined" style="font-size:15px">open_in_new</span> ' + t.cta.label;
    d.appendChild(a);
  }
  // volver al menú
  const back = msg('¿Algo más?');
  const chips = document.createElement('div'); chips.className = 'sc-chips';
  const c = document.createElement('button'); c.className = 'sc-chip';
  c.innerHTML = '<span class="material-symbols-outlined">menu</span> Ver todos los temas';
  c.addEventListener('click', menuPrincipal);
  chips.appendChild(c); back.appendChild(document.createElement('br')); back.appendChild(chips);
}

init();
