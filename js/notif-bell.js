// ── Campana de notificaciones (feed real, compartida por todas las pantallas) ──
// Uso: marca en el HTML el contenedor de la lista con [data-notif-list], el punto
// rojo con [data-notif-dot] y el botón "marcar leídas" con [data-notif-marcar].
// Luego: import { initCampana } from '../js/notif-bell.js'; initCampana();
import { supabase } from './supabase-client.js';

const BKN = 'https://serenecare-backend-production.up.railway.app';

function renderItem(n) {
  const leida = !!n.leida;
  return '<div style="display:flex;align-items:flex-start;gap:12px;padding:12px 16px;border-bottom:1px solid rgba(255,255,255,0.04);background:' + (leida ? 'transparent' : 'rgba(255,255,255,0.02)') + ';">'
    + '<div style="width:32px;height:32px;border-radius:10px;background:rgba(30,41,59,0.8);border:1px solid rgba(255,255,255,0.06);display:flex;align-items:center;justify-content:center;flex-shrink:0;"><span class="material-symbols-outlined" style="font-size:15px;color:' + (n.color || '#a78bfa') + ";font-variation-settings:'FILL' 1;\">" + (n.icono || 'notifications') + '</span></div>'
    + '<div style="flex:1;min-width:0;"><p style="font-size:12px;color:' + (leida ? '#64748b' : '#e2e8f0') + ';line-height:1.4;font-weight:' + (leida ? '400' : '600') + ';margin:0;">' + (n.titulo || '') + '</p><p style="font-size:10px;color:#475569;margin:2px 0 0;">' + (n.hora || '') + '</p></div>'
    + (leida ? '' : '<span style="width:7px;height:7px;border-radius:50%;background:#a78bfa;flex-shrink:0;margin-top:5px;"></span>')
    + '</div>';
}

export async function initCampana() {
  const list = document.querySelector('[data-notif-list]');
  if (!list) return;
  const dot = document.querySelector('[data-notif-dot]');
  const marcar = document.querySelector('[data-notif-marcar]');

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;
  const token = session.access_token;

  async function cargar() {
    try {
      const r = await fetch(BKN + '/api/notificaciones', { headers: { Authorization: 'Bearer ' + token } });
      const d = await r.json();
      const items = Array.isArray(d.notificaciones) ? d.notificaciones : [];
      if (dot) dot.style.display = (d.no_leidas > 0) ? '' : 'none';
      list.innerHTML = items.length
        ? items.map(renderItem).join('')
        : '<div style="padding:20px 16px;text-align:center;font-size:11px;color:#475569;">Estás al día ✨</div>';
    } catch (_) {}
  }

  if (marcar) {
    marcar.addEventListener('click', async function () {
      try { await fetch(BKN + '/api/notificaciones/marcar-leidas', { method: 'POST', headers: { Authorization: 'Bearer ' + token } }); } catch (_) {}
      if (dot) dot.style.display = 'none';
      cargar();
    });
  }

  cargar();
}
