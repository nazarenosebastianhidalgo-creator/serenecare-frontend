// ─────────────────────────────────────────────────────────────────────────────
// Completar datos obligatorios (país + teléfono). Si a la cuenta le falta el país
// o el teléfono, muestra un aviso BLOQUEANTE al entrar y no deja seguir hasta
// rellenarlo. El país lo necesitamos para la zona/verificación; el teléfono para
// poder contactar/llamar al profesional. Solo pide lo que falte.
// Se incluye en las pantallas de entrada (dashboards) y en los perfiles.
// ─────────────────────────────────────────────────────────────────────────────
import { supabase } from './supabase-client.js';

const BK_PERFIL = 'https://serenecare-backend-production.up.railway.app';

const PAISES = [
  'México', 'España', 'Argentina', 'Chile', 'Colombia', 'Perú', 'Ecuador',
  'Bolivia', 'Uruguay', 'Paraguay', 'Venezuela', 'Costa Rica', 'Panamá',
  'Guatemala', 'Honduras', 'El Salvador', 'Nicaragua', 'República Dominicana',
  'Puerto Rico', 'Estados Unidos', 'Otro',
];
const digitos = (s) => String(s || '').replace(/\D/g, '');

async function init() {
  let token, userId;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    token = session && session.access_token;
    userId = session && session.user && session.user.id;
    if (!token || !userId) return; // sin sesión → nada
  } catch (_) { return; }

  const authH = { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' };

  // País: desde el perfil profesional (tabla psicologos)
  let prof = {};
  try {
    prof = await (await fetch(BK_PERFIL + '/api/perfil/profesional', { headers: authH })).json();
  } catch (_) { return; }
  // Si no hay fila de psicólogo (paciente/super admin), no bloqueamos
  if (!prof || Object.keys(prof).length === 0) return;

  // Teléfono: desde usuarios
  let tel = '';
  try {
    const { data } = await supabase.from('usuarios').select('telefono').eq('id', userId).maybeSingle();
    tel = data && data.telefono ? data.telefono : '';
  } catch (_) {}

  const faltaPais = !(prof.pais && String(prof.pais).trim());
  const faltaTel = digitos(tel).length < 6;
  if (!faltaPais && !faltaTel) return; // todo completo

  mostrarModal(authH, userId, faltaPais, faltaTel);
}

function mostrarModal(authH, userId, faltaPais, faltaTel) {
  const overlay = document.createElement('div');
  overlay.id = 'datos-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:100000;background:rgba(2,6,23,0.85);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;padding:20px;';

  const titulo = (faltaPais && faltaTel) ? 'Completa tus datos'
    : faltaTel ? 'Añade tu teléfono' : '¿Desde qué país ejerces?';
  const sub = (faltaTel && faltaPais) ? 'Nos hacen falta para configurar tu cuenta y poder contactarte. Solo se piden una vez.'
    : faltaTel ? 'Lo usamos para avisarte de tus citas y poder contactarte. Solo se pide una vez.'
    : 'Lo necesitamos para tu zona y la verificación profesional. Solo se pide una vez.';
  const opciones = PAISES.map((p) => `<option value="${p}">${p}</option>`).join('');

  const campoPais = faltaPais ? `
    <label style="display:block;font-size:12px;font-weight:700;color:#94a3b8;margin:0 0 6px;">País</label>
    <style>#d-pais option{color:#0f172a;background:#ffffff;}</style>
    <select id="d-pais" style="width:100%;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.12);color:#f1f5f9;border-radius:12px;padding:12px 14px;font-size:14px;outline:none;margin-bottom:14px;">
      <option value="" disabled selected>Selecciona tu país…</option>${opciones}
    </select>` : '';
  const campoTel = faltaTel ? `
    <label style="display:block;font-size:12px;font-weight:700;color:#94a3b8;margin:0 0 6px;">Teléfono (con prefijo)</label>
    <input id="d-tel" type="tel" inputmode="tel" placeholder="+34 600 000 000" style="width:100%;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.12);color:#f1f5f9;border-radius:12px;padding:12px 14px;font-size:14px;outline:none;margin-bottom:14px;"/>` : '';

  overlay.innerHTML = `
    <div style="background:#0d1b2e;border:1px solid rgba(255,255,255,0.1);border-radius:24px;max-width:420px;width:100%;padding:28px;box-shadow:0 40px 120px rgba(0,0,0,0.6);font-family:Inter,system-ui,sans-serif;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
        <span class="material-symbols-outlined" style="color:#2dd4bf;">contact_page</span>
        <h3 style="font-family:Manrope,sans-serif;font-weight:800;color:#f1f5f9;font-size:18px;margin:0;">${titulo}</h3>
      </div>
      <p style="color:#94a3b8;font-size:13px;line-height:1.6;margin:0 0 18px;">${sub}</p>
      ${campoPais}${campoTel}
      <button id="d-guardar" style="width:100%;background:#0d9488;color:#fff;border:none;border-radius:12px;padding:13px;font-size:14px;font-weight:700;cursor:pointer;font-family:Manrope,sans-serif;">Guardar y continuar</button>
      <p id="d-error" style="color:#f87171;font-size:12px;margin:10px 0 0;display:none;"></p>
    </div>`;
  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';

  const btn = overlay.querySelector('#d-guardar');
  const err = overlay.querySelector('#d-error');
  const paisSel = overlay.querySelector('#d-pais');
  const telInp = overlay.querySelector('#d-tel');

  btn.addEventListener('click', async () => {
    const pais = paisSel ? paisSel.value : null;
    const tel = telInp ? telInp.value.trim() : null;
    if (faltaPais && !pais) { err.textContent = 'Elige tu país.'; err.style.display = 'block'; return; }
    if (faltaTel && digitos(tel).length < 6) { err.textContent = 'Escribe un teléfono válido (con prefijo).'; err.style.display = 'block'; return; }
    btn.disabled = true; btn.textContent = 'Guardando…'; err.style.display = 'none';
    try {
      if (faltaPais) {
        const r = await fetch(BK_PERFIL + '/api/perfil/profesional', { method: 'PUT', headers: authH, body: JSON.stringify({ pais }) });
        if (!r.ok) throw new Error('pais');
      }
      if (faltaTel) {
        const { error } = await supabase.from('usuarios').update({ telefono: tel }).eq('id', userId);
        if (error) throw new Error('tel');
      }
      overlay.remove();
      document.body.style.overflow = '';
    } catch (e) {
      btn.disabled = false; btn.textContent = 'Guardar y continuar';
      err.textContent = 'No se pudo guardar, inténtalo de nuevo.'; err.style.display = 'block';
    }
  });
}

init();
