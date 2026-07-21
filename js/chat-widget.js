// ── Mini-chat flotante (compartido por todas las pantallas del psicólogo) ──
// Cablea el widget cw-* con datos REALES: conversaciones = SUS pacientes + el
// equipo de la clínica (psicólogos + admin); mensajes reales de la tabla `mensajes`.
// Uso: <script type="module">import { initChatWidget } from '../js/chat-widget.js'; initChatWidget();</script>
// (el HTML del widget — cw-panel, fab-mensajes, etc. — ya está en cada pantalla).
import { supabase, getMensajes, enviarMensaje as sbEnviar } from './supabase-client.js';

const DOT = { online:'#4ade80', busy:'#fbbf24', offline:'#475569' };
let CONVS = [], userId = null, cwOpen = false, cwActive = null;

const $ = id => document.getElementById(id);

function iniciales(n) {
  return (n || '').trim().split(' ').map(w => w[0] || '').slice(0, 2).join('').toUpperCase();
}

export async function initChatWidget() {
  const panel = $('cw-panel');
  if (!panel) return;                       // la pantalla no tiene el widget

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;
  userId = session.user.id;
  const clinicaId = localStorage.getItem('tp_clinica_id');

  // No rastreamos "no leídos" → ocultar los contadores fijos (eran mock "2")
  ['cw-total-badge', 'fab-badge'].forEach(id => { const el = $(id); if (el) el.style.display = 'none'; });

  // Contactos reales: SUS pacientes + el personal de la clínica (psicólogos + admin)
  try {
    const [pacRes, staffRes] = await Promise.all([
      supabase.from('pacientes').select('nombre, apellido, usuario_id, psicologo_id')
        .eq('clinica_id', clinicaId).eq('psicologo_id', userId),
      supabase.from('usuarios').select('id, nombre, apellido, rol')
        .eq('clinica_id', clinicaId).in('rol', ['psicologo', 'admin_clinica']).eq('activo', true).neq('id', userId),
    ]);
    const pacs = (pacRes.data || []).filter(p => p.usuario_id).map(p => ({
      _sbId: p.usuario_id, nombre: ((p.nombre||'') + ' ' + (p.apellido||'')).trim(),
      rol: 'Paciente', dot: 'offline', msgs: [], cargado: false,
    }));
    const staff = (staffRes.data || []).map(c => ({
      _sbId: c.id, nombre: ((c.nombre||'') + ' ' + (c.apellido||'')).trim(),
      rol: c.rol === 'admin_clinica' ? 'Admin' : 'Colega', dot: 'offline', msgs: [], cargado: false,
    }));
    CONVS = [...staff, ...pacs].filter(c => c._sbId && c._sbId !== userId);
  } catch (e) { console.warn('chat-widget:', e.message); }

  // ── API global (la usa el HTML del widget por onclick) ──
  window.toggleChatWidget = function () {
    cwOpen = !cwOpen;
    if (cwOpen) {
      panel.style.pointerEvents = 'auto'; panel.style.opacity = '1';
      panel.style.transform = 'translateY(0) scale(1)';
      const fi = $('cw-fab-icon'); if (fi) fi.textContent = 'close';
      cwMostrarLista();
    } else {
      panel.style.opacity = '0'; panel.style.transform = 'translateY(14px) scale(0.97)';
      panel.style.pointerEvents = 'none';
      const fi = $('cw-fab-icon'); if (fi) fi.textContent = 'chat';
    }
  };

  window.cwVolverLista = cwMostrarLista;

  window.cwAbrirConv = async function (id) {
    cwActive = CONVS.find(c => c._sbId === id);
    if (!cwActive) return;
    $('cw-lista-wrap').style.display = 'none';
    const cw = $('cw-chat-wrap');
    cw.style.display = 'flex'; cw.style.flexDirection = 'column';
    $('cw-chat-title').textContent = cwActive.nombre;
    $('cw-chat-dot').style.background = DOT[cwActive.dot];
    $('cw-messages').innerHTML = '<p style="font-size:11px;color:#475569;text-align:center;margin:12px 0;">Cargando…</p>';
    try {
      const msgs = await getMensajes(cwActive._sbId);
      cwActive.msgs = (msgs || []).map(m => ({
        from: m.de_id === userId ? 'me' : 'them',
        text: m.texto,
        time: new Date(m.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
      }));
    } catch (_) { cwActive.msgs = []; }
    cwRenderMsgs();
    setTimeout(() => { const m = $('cw-messages'); if (m) m.scrollTop = m.scrollHeight; }, 40);
  };

  window.cwEnviar = async function () {
    if (!cwActive) return;
    const input = $('cw-input');
    const text = (input.value || '').trim();
    if (!text) return;
    input.value = '';
    try {
      await sbEnviar(cwActive._sbId, text);
      const t = new Date();
      cwActive.msgs.push({ from: 'me', text, time: t.getHours() + ':' + String(t.getMinutes()).padStart(2, '0') });
      cwRenderMsgs();
      setTimeout(() => { const m = $('cw-messages'); if (m) m.scrollTop = m.scrollHeight; }, 30);
    } catch (e) { console.warn('cwEnviar:', e.message); }
  };
}

function cwMostrarLista() {
  const lista = $('cw-lista-wrap'), chat = $('cw-chat-wrap');
  if (lista) lista.style.display = 'block';
  if (chat) chat.style.display = 'none';
  const cont = $('cw-conv-list');
  if (!cont) return;
  if (!CONVS.length) {
    cont.innerHTML = '<p style="font-size:11px;color:#475569;text-align:center;padding:24px 12px;">Sin contactos todavía.</p>';
    return;
  }
  cont.innerHTML = CONVS.map(c =>
    '<div onclick="cwAbrirConv(\'' + c._sbId + '\')" style="padding:12px 16px;cursor:pointer;display:flex;align-items:center;gap:10px;border-bottom:1px solid rgba(255,255,255,0.04);transition:background 0.15s;" onmouseover="this.style.background=\'rgba(255,255,255,0.04)\'" onmouseout="this.style.background=\'\'">'
    + '<div style="position:relative;flex-shrink:0;">'
    +   '<div style="width:38px;height:38px;border-radius:50%;background:rgba(139,92,246,0.15);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:#a78bfa;font-family:Manrope,sans-serif;">' + iniciales(c.nombre) + '</div>'
    +   '<span style="position:absolute;bottom:0;right:0;width:9px;height:9px;border-radius:50%;background:' + DOT[c.dot] + ';border:2px solid #0d1b2e;"></span>'
    + '</div>'
    + '<div style="flex:1;min-width:0;">'
    +   '<div style="font-family:Manrope,sans-serif;font-weight:700;font-size:12px;color:#e2e8f0;">' + c.nombre + '</div>'
    +   '<div style="font-size:11px;color:#64748b;">' + c.rol + '</div>'
    + '</div></div>'
  ).join('');
}

function cwRenderMsgs() {
  const cont = $('cw-messages');
  if (!cont || !cwActive) return;
  if (!cwActive.msgs.length) {
    cont.innerHTML = '<p style="font-size:11px;color:#475569;text-align:center;margin:12px 0;">Aún no hay mensajes. Escribe el primero.</p>';
    return;
  }
  cont.innerHTML = cwActive.msgs.map(m => {
    const me = m.from === 'me';
    return '<div style="display:flex;justify-content:' + (me ? 'flex-end' : 'flex-start') + ';animation:cwMsgIn 0.18s ease forwards;">'
      + '<div style="max-width:80%;padding:8px 11px;border-radius:14px;' + (me
        ? 'background:rgba(139,92,246,0.18);border:1px solid rgba(139,92,246,0.28);border-bottom-right-radius:4px;'
        : 'background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);border-bottom-left-radius:4px;') + '">'
      +   '<p style="font-size:12px;color:#e2e8f0;line-height:1.5;word-break:break-word;margin:0;">' + (m.text || '') + '</p>'
      +   '<p style="font-size:10px;color:#475569;margin:3px 0 0;text-align:' + (me ? 'right' : 'left') + ';">' + m.time + '</p>'
      + '</div></div>';
  }).join('');
}
