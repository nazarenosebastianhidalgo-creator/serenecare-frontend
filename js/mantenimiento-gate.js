// ── Modo mantenimiento (barrera global) ──
// Consulta el RPC estado_mantenimiento(). Si está activo y el usuario NO es
// super_admin, reemplaza la pantalla por una de mantenimiento y devuelve true
// (para que la página que llama pueda abortar su carga).
// El super admin nunca se bloquea (así puede apagarlo).
import { supabase } from './supabase-client.js';

function pantallaMantenimiento(mensaje) {
  const msg = (mensaje && String(mensaje).trim())
    || 'Estamos aplicando mejoras en SereneCare. Volvemos en unos minutos. Gracias por tu paciencia.';
  document.documentElement.style.filter = '';
  document.body.innerHTML = `
    <div style="position:fixed;inset:0;display:flex;align-items:center;justify-content:center;padding:24px;background:#020617;font-family:'Inter',system-ui,sans-serif;z-index:99999">
      <div style="max-width:440px;text-align:center">
        <div style="width:72px;height:72px;margin:0 auto 24px;border-radius:20px;display:flex;align-items:center;justify-content:center;background:rgba(20,184,166,0.12);border:1px solid rgba(20,184,166,0.25)">
          <span class="material-symbols-outlined" style="font-size:38px;color:#2dd4bf">construction</span>
        </div>
        <h1 style="font-family:'Manrope',sans-serif;font-size:1.5rem;font-weight:800;color:#f1f5f9;margin:0 0 12px">En mantenimiento</h1>
        <p style="font-size:0.95rem;color:#94a3b8;line-height:1.6;margin:0 0 24px">${msg.replace(/</g, '&lt;')}</p>
        <button onclick="location.reload()" style="padding:10px 22px;border-radius:12px;border:1px solid rgba(20,184,166,0.3);background:rgba(20,184,166,0.12);color:#2dd4bf;font-weight:700;font-size:0.85rem;cursor:pointer">Reintentar</button>
      </div>
    </div>`;
  // Cargar los iconos por si la página no los tenía
  if (!document.querySelector('link[href*="Material+Symbols"]')) {
    const l = document.createElement('link'); l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Manrope:wght@700;800&family=Material+Symbols+Outlined&display=swap';
    document.head.appendChild(l);
  }
}

// Devuelve true si ha bloqueado la página (mantenimiento activo para este usuario).
export async function comprobarMantenimiento() {
  try {
    const { data, error } = await supabase.rpc('estado_mantenimiento');
    if (error || !data) return false;               // ante fallo, NO bloquear
    if (data.activo && !data.es_super_admin) {
      pantallaMantenimiento(data.mensaje);
      return true;
    }
  } catch (_) { /* red caída → no bloquear */ }
  return false;
}
