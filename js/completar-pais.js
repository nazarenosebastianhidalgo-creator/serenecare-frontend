// ─────────────────────────────────────────────────────────────────────────────
// Completar país (obligatorio). Si la cuenta no tiene país guardado, muestra un
// aviso bloqueante al entrar y no deja seguir hasta que lo elija. Necesitamos el
// país para saber dónde está cada profesional y aplicar la verificación por país.
// Se incluye en las pantallas de entrada (dashboards) y en los perfiles.
// ─────────────────────────────────────────────────────────────────────────────
import { supabase } from './supabase-client.js';

const BK_PERFIL = 'https://serenecare-backend-production.up.railway.app';

// Países soportados (las tildes deben coincidir con los valores que usa el gate, p.ej. "México")
const PAISES = [
  'México', 'España', 'Argentina', 'Chile', 'Colombia', 'Perú', 'Ecuador',
  'Bolivia', 'Uruguay', 'Paraguay', 'Venezuela', 'Costa Rica', 'Panamá',
  'Guatemala', 'Honduras', 'El Salvador', 'Nicaragua', 'República Dominicana',
  'Puerto Rico', 'Estados Unidos', 'Otro',
];

async function init() {
  let token;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    token = session && session.access_token;
    if (!token) return; // sin sesión (pantalla pública): no hacemos nada
  } catch (_) { return; }

  const authH = { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' };

  // ¿Ya tiene país?
  let prof = {};
  try {
    prof = await (await fetch(BK_PERFIL + '/api/perfil/profesional', { headers: authH })).json();
  } catch (_) { return; } // si el backend falla, no bloqueamos al usuario
  if (prof && prof.pais && String(prof.pais).trim()) return; // ya tiene país, nada que hacer
  // Si no hay fila de psicólogo (p.ej. paciente/super admin sin ella), prof llega vacío → no bloquear
  if (!prof || Object.keys(prof).length === 0) return;

  mostrarModal(authH);
}

function mostrarModal(authH) {
  const overlay = document.createElement('div');
  overlay.id = 'pais-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:100000;background:rgba(2,6,23,0.85);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;padding:20px;';
  const opciones = PAISES.map((p) => `<option value="${p}">${p}</option>`).join('');
  overlay.innerHTML = `
    <div style="background:#0d1b2e;border:1px solid rgba(255,255,255,0.1);border-radius:24px;max-width:420px;width:100%;padding:28px;box-shadow:0 40px 120px rgba(0,0,0,0.6);font-family:Inter,system-ui,sans-serif;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
        <span class="material-symbols-outlined" style="color:#2dd4bf;">public</span>
        <h3 style="font-family:Manrope,sans-serif;font-weight:800;color:#f1f5f9;font-size:18px;margin:0;">¿Desde qué país ejerces?</h3>
      </div>
      <p style="color:#94a3b8;font-size:13px;line-height:1.6;margin:0 0 18px;">Necesitamos saber tu país para configurar tu cuenta correctamente (impuestos, verificación profesional y pacientes de tu zona). Solo se pide una vez.</p>
      <style>#pais-select option{color:#0f172a;background:#ffffff;}</style>
      <select id="pais-select" style="width:100%;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.12);color:#f1f5f9;border-radius:12px;padding:12px 14px;font-size:14px;outline:none;margin-bottom:16px;">
        <option value="" disabled selected>Selecciona tu país…</option>
        ${opciones}
      </select>
      <button id="pais-guardar" style="width:100%;background:#0d9488;color:#fff;border:none;border-radius:12px;padding:13px;font-size:14px;font-weight:700;cursor:pointer;font-family:Manrope,sans-serif;">Guardar y continuar</button>
      <p id="pais-error" style="color:#f87171;font-size:12px;margin:10px 0 0;display:none;"></p>
    </div>`;
  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden'; // bloquea el scroll de fondo

  const sel = overlay.querySelector('#pais-select');
  const btn = overlay.querySelector('#pais-guardar');
  const err = overlay.querySelector('#pais-error');

  btn.addEventListener('click', async () => {
    const pais = sel.value;
    if (!pais) { err.textContent = 'Elige tu país para continuar.'; err.style.display = 'block'; return; }
    btn.disabled = true; btn.textContent = 'Guardando…'; err.style.display = 'none';
    try {
      const r = await fetch(BK_PERFIL + '/api/perfil/profesional', { method: 'PUT', headers: authH, body: JSON.stringify({ pais }) });
      if (!r.ok) throw new Error('No se pudo guardar');
      overlay.remove();
      document.body.style.overflow = '';
    } catch (e) {
      btn.disabled = false; btn.textContent = 'Guardar y continuar';
      err.textContent = 'No se pudo guardar, inténtalo de nuevo.'; err.style.display = 'block';
    }
  });
}

init();
