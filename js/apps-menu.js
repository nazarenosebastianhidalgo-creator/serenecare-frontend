// ── Menú de módulos (9 puntitos) — overlay compartido del portal admin ──
// Fuente única de verdad. La pantalla solo necesita el botón:
//   <button onclick="toggleAppsPanel()" title="Módulos">…apps…</button>
// y arrancar el módulo:
//   <script type="module">import { initAppsMenu } from '../js/apps-menu.js'; initAppsMenu()</script>
// initAppsMenu() elimina cualquier overlay previo (evita ids duplicados y menús viejos),
// inyecta el canónico y define window.toggleAppsPanel / window.cerrarApps.

const MODULOS = [
  { href:'gestion_personal_admin.html', label:'Personal',      icon:'badge',         color:'#fbbf24', bg:'rgba(245,158,11,0.15)',  bd:'rgba(245,158,11,0.25)' },
  { href:'facturacion.html',            label:'Facturación',   icon:'payments',      color:'#34d399', bg:'rgba(16,185,129,0.15)',  bd:'rgba(16,185,129,0.25)' },
  { href:'estadisticas_clinica.html',   label:'Estadísticas',  icon:'bar_chart',     color:'#a78bfa', bg:'rgba(139,92,246,0.15)',  bd:'rgba(139,92,246,0.25)' },
  { href:'config_clinica.html',         label:'Configuración', icon:'settings',      color:'#f87171', bg:'rgba(248,113,113,0.15)', bd:'rgba(248,113,113,0.25)' },
  { href:'integraciones_clinica.html',  label:'Integraciones', icon:'cable',         color:'#2dd4bf', bg:'rgba(20,184,166,0.15)',  bd:'rgba(20,184,166,0.25)' },
  { href:'compliance_clinica.html',     label:'Compliance',    icon:'verified_user', color:'#818cf8', bg:'rgba(99,102,241,0.15)',  bd:'rgba(99,102,241,0.25)' },
];

function cardHTML(m) {
  const actual = location.pathname.split('/').pop() === m.href;
  return `<a href="${m.href}" class="app-card" style="display:flex;flex-direction:column;align-items:center;gap:0.6rem;padding:1.25rem 0.75rem;border-radius:1.25rem;background:${actual ? m.bg : 'rgba(255,255,255,0.03)'};border:1px solid ${actual ? m.bd : 'rgba(255,255,255,0.07)'};text-decoration:none;transition:all 0.2s;cursor:pointer;" onmouseover="this.style.background='${m.bg}';this.style.borderColor='${m.bd}'" onmouseout="this.style.background='${actual ? m.bg : 'rgba(255,255,255,0.03)'}';this.style.borderColor='${actual ? m.bd : 'rgba(255,255,255,0.07)'}'">`
    + `<div style="width:48px;height:48px;border-radius:14px;display:flex;align-items:center;justify-content:center;background:${m.bg};border:1px solid ${m.bd};"><span class="material-symbols-outlined" style="color:${m.color};font-size:22px;font-variation-settings:'FILL' 1;">${m.icon}</span></div>`
    + `<span style="font-size:0.7rem;font-weight:700;color:#cbd5e1;text-align:center;font-family:Manrope,sans-serif;">${m.label}</span></a>`;
}

export function initAppsMenu() {
  // Quitar cualquier overlay previo (evita ids duplicados y menús desactualizados)
  const viejo = document.getElementById('apps-overlay');
  if (viejo) viejo.remove();

  const nombre  = localStorage.getItem('tp_nombre')  || 'Admin';
  const clinica = localStorage.getItem('tp_clinica') || 'Mi clínica';
  const ini = (nombre.split(' ').map(w => w[0] || '').slice(0, 2).join('').toUpperCase()) || 'A';

  const overlay = document.createElement('div');
  overlay.id = 'apps-overlay';
  overlay.setAttribute('onclick', 'cerrarApps(event)');
  overlay.style.cssText = 'display:none;position:fixed;inset:0;z-index:200;background:rgba(0,0,0,0.7);backdrop-filter:blur(12px);align-items:center;justify-content:center;';
  overlay.innerHTML =
      `<div onclick="event.stopPropagation()" style="background:rgba(10,22,40,0.95);border:1px solid rgba(255,255,255,0.1);border-radius:2.5rem;width:100%;max-width:480px;padding:2.5rem;box-shadow:0 40px 120px rgba(0,0,0,0.6);">`
    +   `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:2rem;">`
    +     `<div><p style="font-family:Manrope,sans-serif;font-size:1.25rem;font-weight:800;color:#f1f5f9;letter-spacing:-0.02em;">Módulos</p><p style="font-size:0.75rem;color:#64748b;margin-top:2px;">Admin Portal</p></div>`
    +     `<button onclick="cerrarApps()" style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:12px;width:36px;height:36px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#94a3b8;"><span class="material-symbols-outlined" style="font-size:18px;">close</span></button>`
    +   `</div>`
    +   `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;">${MODULOS.map(cardHTML).join('')}</div>`
    +   `<div style="margin-top:2rem;padding-top:1.5rem;border-top:1px solid rgba(255,255,255,0.08);display:flex;align-items:center;gap:0.75rem;">`
    +     `<div style="width:36px;height:36px;border-radius:10px;background:rgba(20,184,166,0.2);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#2dd4bf;">${ini}</div>`
    +     `<div><p style="font-size:0.8rem;font-weight:700;color:#f1f5f9;font-family:Manrope,sans-serif;">${nombre}</p><p style="font-size:0.7rem;color:#64748b;">${clinica}</p></div>`
    +   `</div>`
    + `</div>`;
  document.body.appendChild(overlay);

  window.toggleAppsPanel = function () {
    overlay.style.display = overlay.style.display === 'flex' ? 'none' : 'flex';
  };
  window.cerrarApps = function (e) {
    if (e && e.target !== overlay) return;
    overlay.style.display = 'none';
  };
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') overlay.style.display = 'none';
  });
}
