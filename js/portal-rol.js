// ── portal-rol.js ──────────────────────────────────────────────────────────
// Convierte una pantalla COMPARTIDA del portal psicólogo en la versión admin
// cuando el usuario es admin_clinica, sin duplicar la pantalla:
//   - reescribe los enlaces del sidebar/nav psicólogo → admin,
//   - reetiqueta la cabecera "Portal Clínico" → "Admin Portal" (teal + icono),
//   - sustituye el menú de 9-puntos (4 del psicólogo) por el canónico admin (9).
// Para el psicólogo no hace nada (se queda su portal tal cual).
//
// Uso: al final del <body>:
//   <script type="module">import '../js/portal-rol.js'</script>
// (No choca con el toggleAppsPanel hardcodeado: este módulo, diferido, corre
//  después del script clásico y su initAppsMenu se impone; además reata el botón.)

import { initAppsMenu } from './apps-menu.js';

const rol = localStorage.getItem('tp_rol');
if (rol === 'admin_clinica') {
  // Enlaces psicólogo → admin (solo los que tienen equivalente real).
  const MAP = {
    'dashboard_psicologo.html':       'dashboard_admin_clinica.html',
    'agenda_psicologo.html':          'agenda_clinica.html',
    'pacientes_psicologo.html':       'pacientes_clinica.html',
    'mensajes_psicologo.html':        'mensajes_clinica.html',
    'consentimientos_psicologo.html': 'consentimientos_clinica.html',
    'integraciones_psicologo.html':   'integraciones_clinica.html',
    'perfil_psicologo.html':          'perfil_clinica.html',
    // Sin equivalente admin (se quedan igual, son compartidas o rol-aware):
    // resenas_psicologo, telemedicina_psicologo, recursos_psicologo, notificaciones_psicologo
  };
  const remap = (href) => {
    if (!href) return href;
    const base = href.split(/[?#]/)[0].split('/').pop();
    return MAP[base] ? href.replace(base, MAP[base]) : href;
  };

  document.querySelectorAll('a[href*="_psicologo.html"]').forEach((a) => {
    a.setAttribute('href', remap(a.getAttribute('href')));
  });

  // Reetiquetar la cabecera del sidebar a identidad admin (teal).
  document.querySelectorAll('aside p, aside span').forEach((el) => {
    if (el.children.length === 0 && el.textContent.trim() === 'Portal Clínico') {
      el.textContent = 'Admin Portal';
      el.style.color = '#2dd4bf';
    }
  });
  document.querySelectorAll('aside .material-symbols-outlined').forEach((el) => {
    if (el.textContent.trim() === 'psychology') {
      el.textContent = 'medical_services';
      el.style.color = '#2dd4bf';
      const box = el.parentElement;
      if (box) { box.style.background = 'rgba(20,184,166,0.2)'; box.style.borderColor = 'rgba(20,184,166,0.3)'; }
    }
  });

  // Menú de 9-puntos canónico admin (elimina el overlay hardcodeado del psicólogo).
  try {
    initAppsMenu();
    const canonical = window.toggleAppsPanel;
    document.querySelectorAll('[onclick="toggleAppsPanel()"]').forEach((b) => { b.onclick = canonical; });
  } catch (e) { /* si algo falla, se mantiene el menú original */ }
}
