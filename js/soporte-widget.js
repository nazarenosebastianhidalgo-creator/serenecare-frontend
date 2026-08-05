// ── Widget de soporte (admin clínica + psicólogo) ──
// Botón flotante abajo-izquierda → panel con "Mis conversaciones" + "Nuevo ticket".
// Conversación con hilo real (tabla tickets_mensajes) + Realtime + badge de no leídos.
// Uso: <script type="module">import { initSoporte } from '../js/soporte-widget.js'; initSoporte()</script>
import { supabase } from './supabase-client.js';

export async function initSoporte() {
  if (document.getElementById('sop-fab')) return;
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;
  const userId = session.user.id;

  let perfil = { rol: null, clinica_id: null, nombre: '', apellido: '', email: session.user.email };
  try {
    const { data } = await supabase.from('usuarios').select('rol, clinica_id, nombre, apellido, email').eq('id', userId).maybeSingle();
    if (data) perfil = { ...perfil, ...data };
  } catch (_) {}
  if (!['admin_clinica', 'psicologo'].includes(perfil.rol)) return;
  const nombre = ((perfil.nombre || '') + (perfil.apellido ? ' ' + perfil.apellido : '')).trim();

  let tickets = [];
  let vista = 'lista';      // lista | nuevo | hilo
  let ticketAbierto = null;
  let canalHilo = null;

  const seenKey = (id) => 'sop_seen_' + id;
  const marcarVisto = (id) => localStorage.setItem(seenKey(id), new Date().toISOString());
  const noLeido = (t) => t.ultimo_mensaje_rol === 'soporte' && t.ultimo_mensaje_at &&
    (!localStorage.getItem(seenKey(t.id)) || new Date(t.ultimo_mensaje_at) > new Date(localStorage.getItem(seenKey(t.id))));
  const totalNoLeidos = () => tickets.filter(noLeido).length;
  const hora = (ts) => new Date(ts).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  const fechaCorta = (ts) => new Date(ts).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' });
  const estadoTxt = { abierto: ['Abierto', '#2dd4bf'], en_progreso: ['En progreso', '#818cf8'], resuelto: ['Resuelto', '#4ade80'] };

  // ── FAB ──
  const fab = document.createElement('button');
  fab.id = 'sop-fab';
  fab.title = 'Soporte';
  fab.innerHTML = '<span class="material-symbols-outlined" style="font-size:22px;color:#fff">support_agent</span><span id="sop-dot" style="display:none;position:absolute;top:-2px;right:-2px;width:14px;height:14px;border-radius:50%;background:#f43f5e;border:2px solid #020617"></span>';
  fab.style.cssText = 'position:fixed;bottom:24px;left:24px;z-index:48;width:48px;height:48px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#6366f1,#4f46e5);box-shadow:0 8px 24px rgba(79,70,229,.4);border:none;cursor:pointer;transition:transform .2s';
  fab.onmouseover = () => fab.style.transform = 'scale(1.08)';
  fab.onmouseout = () => fab.style.transform = 'scale(1)';
  document.body.appendChild(fab);

  // ── Panel ──
  const panel = document.createElement('div');
  panel.id = 'sop-panel';
  panel.style.cssText = 'display:none;position:fixed;bottom:84px;left:24px;z-index:49;width:340px;height:480px;flex-direction:column;background:#0d1b2e;border:1px solid rgba(255,255,255,.1);border-radius:18px;overflow:hidden;box-shadow:0 24px 60px rgba(0,0,0,.55)';
  document.body.appendChild(panel);

  const $ = (id) => document.getElementById(id);
  const badge = (t) => { const [txt, c] = estadoTxt[t] || ['', '#94a3b8']; return `<span style="font-size:10px;font-weight:700;color:${c};background:${c}22;padding:2px 8px;border-radius:99px">${txt}</span>`; };

  function render() {
    if (vista === 'nuevo') return renderNuevo();
    if (vista === 'hilo') return renderHilo();
    renderLista();
  }

  function cabecera(titulo, back) {
    return `<div style="padding:12px 14px;border-bottom:1px solid rgba(255,255,255,.08);display:flex;align-items:center;gap:8px;flex-shrink:0">
      ${back ? `<button onclick="window._sopBack()" style="background:none;border:none;cursor:pointer;color:#64748b;display:flex"><span class="material-symbols-outlined" style="font-size:18px">arrow_back</span></button>` : `<span class="material-symbols-outlined" style="color:#818cf8;font-size:18px">support_agent</span>`}
      <span style="flex:1;font-family:Manrope,sans-serif;font-weight:700;font-size:14px;color:#f1f5f9">${titulo}</span>
      <button onclick="window._sopClose()" style="background:none;border:none;cursor:pointer;color:#64748b;display:flex"><span class="material-symbols-outlined" style="font-size:18px">close</span></button>
    </div>`;
  }

  function renderLista() {
    const filas = tickets.length ? tickets.map(t => `
      <div onclick="window._sopAbrir('${t.id}')" style="padding:12px 14px;cursor:pointer;border-bottom:1px solid rgba(255,255,255,.04)" onmouseover="this.style.background='rgba(255,255,255,.03)'" onmouseout="this.style.background=''">
        <div style="display:flex;align-items:center;gap:6px;justify-content:space-between">
          <span style="font-size:13px;font-weight:700;color:#e2e8f0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${t.asunto}</span>
          ${noLeido(t) ? '<span style="width:8px;height:8px;border-radius:50%;background:#f43f5e;flex-shrink:0"></span>' : ''}
        </div>
        <div style="display:flex;align-items:center;gap:6px;margin-top:4px">${badge(t.estado)}<span style="font-size:10px;color:#64748b">${fechaCorta(t.ultimo_mensaje_at || t.created_at)}</span></div>
      </div>`).join('') : '<p style="text-align:center;color:#64748b;font-size:12px;padding:32px 16px">Aún no tienes tickets.<br>Crea uno con “Nuevo”.</p>';
    panel.innerHTML = cabecera('Soporte') +
      `<div style="flex:1;overflow-y:auto">${filas}</div>
       <div style="padding:10px;border-top:1px solid rgba(255,255,255,.08)">
         <button onclick="window._sopNuevo()" style="width:100%;padding:9px;border-radius:10px;border:none;background:#4f46e5;color:#fff;font-size:13px;font-weight:700;cursor:pointer">+ Nuevo ticket</button>
       </div>`;
  }

  function renderNuevo() {
    panel.innerHTML = cabecera('Nuevo ticket', true) +
      `<div style="flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px">
        <input id="sop-asunto" type="text" placeholder="Asunto" style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:9px 11px;color:#f1f5f9;font-size:13px;outline:none"/>
        <div style="display:flex;gap:8px">
          <select id="sop-cat" style="flex:1;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:9px;color:#f1f5f9;font-size:12px;outline:none">
            <option value="tecnico">Técnico</option><option value="facturacion">Facturación</option><option value="cuenta">Cuenta</option><option value="general" selected>General</option>
          </select>
          <select id="sop-prio" style="flex:1;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:9px;color:#f1f5f9;font-size:12px;outline:none">
            <option value="baja">Baja</option><option value="media" selected>Media</option><option value="alta">Alta</option>
          </select>
        </div>
        <textarea id="sop-msg" rows="5" placeholder="Describe qué ocurre…" style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:9px 11px;color:#f1f5f9;font-size:13px;outline:none;resize:none"></textarea>
        <div id="sop-err" style="display:none;font-size:12px;color:#fb7185"></div>
      </div>
      <div style="padding:10px;border-top:1px solid rgba(255,255,255,.08)">
        <button onclick="window._sopEnviarNuevo()" style="width:100%;padding:9px;border-radius:10px;border:none;background:#4f46e5;color:#fff;font-size:13px;font-weight:700;cursor:pointer">Enviar</button>
      </div>`;
  }

  async function renderHilo() {
    panel.innerHTML = cabecera(ticketAbierto.asunto, true) +
      `<div id="sop-thread" style="flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px"></div>
       <div style="padding:10px;border-top:1px solid rgba(255,255,255,.08);display:flex;gap:8px">
         <input id="sop-reply" type="text" placeholder="Escribe…" style="flex:1;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:9px 11px;color:#f1f5f9;font-size:13px;outline:none"/>
         <button onclick="window._sopResponder()" style="width:40px;border-radius:10px;border:none;background:#4f46e5;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center"><span class="material-symbols-outlined" style="font-size:17px">send</span></button>
       </div>`;
    $('sop-reply').addEventListener('keydown', e => { if (e.key === 'Enter') window._sopResponder(); });
    await pintarHilo();
  }

  async function pintarHilo() {
    const cont = $('sop-thread');
    if (!cont) return;
    const burbuja = (rol, texto, ts) => {
      const mio = rol === 'cliente';
      return `<div style="display:flex;justify-content:${mio ? 'flex-end' : 'flex-start'}">
        <div style="max-width:82%;padding:8px 11px;border-radius:13px;${mio ? 'background:rgba(79,70,229,.2);border:1px solid rgba(79,70,229,.35);border-bottom-right-radius:4px' : 'background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-bottom-left-radius:4px'}">
          <p style="font-size:13px;color:#e2e8f0;line-height:1.5;white-space:pre-wrap;margin:0">${(texto || '').replace(/</g, '&lt;')}</p>
          <p style="font-size:10px;color:#64748b;margin:3px 0 0;text-align:${mio ? 'right' : 'left'}">${mio ? 'Tú' : 'Soporte'} · ${hora(ts)}</p>
        </div></div>`;
    };
    let html = burbuja('cliente', ticketAbierto.mensaje, ticketAbierto.created_at);
    const { data: msgs } = await supabase.from('tickets_mensajes').select('*').eq('ticket_id', ticketAbierto.id).order('created_at');
    html += (msgs || []).map(m => burbuja(m.autor_rol, m.texto, m.created_at)).join('');
    cont.innerHTML = html;
    cont.scrollTop = cont.scrollHeight;
  }

  async function cargarTickets() {
    const { data } = await supabase.from('tickets_soporte').select('*').eq('usuario_id', userId).order('ultimo_mensaje_at', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false });
    tickets = data || [];
    const dot = $('sop-dot');
    if (dot) dot.style.display = totalNoLeidos() > 0 ? 'block' : 'none';
    if (panel.style.display === 'flex' && vista === 'lista') render();
  }

  // ── API global (onclick del panel) ──
  window._sopClose = () => { panel.style.display = 'none'; if (canalHilo) { supabase.removeChannel(canalHilo); canalHilo = null; } };
  window._sopBack = () => { vista = 'lista'; if (canalHilo) { supabase.removeChannel(canalHilo); canalHilo = null; } cargarTickets(); render(); };
  window._sopNuevo = () => { vista = 'nuevo'; render(); };
  window._sopAbrir = async (id) => {
    ticketAbierto = tickets.find(t => t.id === id);
    if (!ticketAbierto) return;
    vista = 'hilo';
    marcarVisto(id);
    await render();
    const dot = $('sop-dot'); if (dot) dot.style.display = totalNoLeidos() > 0 ? 'block' : 'none';
    if (canalHilo) supabase.removeChannel(canalHilo);
    canalHilo = supabase.channel('sop-hilo-' + id)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tickets_mensajes', filter: 'ticket_id=eq.' + id }, () => { marcarVisto(id); pintarHilo(); })
      .subscribe();
  };
  window._sopResponder = async () => {
    const inp = $('sop-reply'); const texto = (inp.value || '').trim();
    if (!texto || !ticketAbierto) return;
    inp.value = '';
    const { error } = await supabase.from('tickets_mensajes').insert({ ticket_id: ticketAbierto.id, autor_id: userId, autor_rol: 'cliente', texto });
    if (error) { inp.value = texto; return; }
    marcarVisto(ticketAbierto.id);
    await pintarHilo();
  };
  window._sopEnviarNuevo = async () => {
    const asunto = $('sop-asunto').value.trim(), mensaje = $('sop-msg').value.trim();
    if (!asunto || !mensaje) { const e = $('sop-err'); e.textContent = 'Rellena asunto y mensaje.'; e.style.display = 'block'; return; }
    const { data, error } = await supabase.from('tickets_soporte').insert({
      clinica_id: perfil.clinica_id || null, usuario_id: userId, rol: perfil.rol,
      nombre: nombre || null, email: perfil.email || null, asunto, mensaje,
      categoria: $('sop-cat').value, prioridad: $('sop-prio').value, estado: 'abierto',
    }).select().maybeSingle();
    if (error) { const e = $('sop-err'); e.textContent = 'No se pudo enviar: ' + error.message; e.style.display = 'block'; return; }
    await cargarTickets();
    if (data) { marcarVisto(data.id); }
    vista = 'lista'; render();
  };

  fab.addEventListener('click', () => {
    const abrir = panel.style.display !== 'flex';
    panel.style.display = abrir ? 'flex' : 'none';
    if (abrir) { vista = 'lista'; cargarTickets().then(render); }
    else window._sopClose();
  });

  await cargarTickets();

  // Realtime: cuando soporte responde, se actualiza el badge/lista aunque el panel esté cerrado
  supabase.channel('sop-tickets-' + userId)
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tickets_soporte', filter: 'usuario_id=eq.' + userId }, () => cargarTickets())
    .subscribe();
}
