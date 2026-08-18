// ── portal-rol.js ──────────────────────────────────────────────────────────
// Convierte una pantalla COMPARTIDA del portal psicólogo en la versión admin
// cuando el usuario es admin_clinica, sin duplicar la pantalla:
//   - pinta el MISMO sidebar admin que el resto de pantallas admin (con el ítem
//     de la pantalla actual marcado activo → no "desaparece" del menú),
//   - reescribe otros enlaces sueltos psicólogo → admin (chat, etc.),
//   - reetiqueta la cabecera "Portal Clínico" → "Admin Portal" (teal + icono),
//   - sustituye el 9-puntos (4 del psicólogo) por el canónico admin (9).
// Para el psicólogo no hace nada (se queda su portal tal cual).
//
// Uso: al final del <body>:  <script type="module">import '../js/portal-rol.js'</script>
//
// NOTA (deuda técnica): el sidebar admin también está hardcodeado en las ~13
// pantallas admin. Idealmente sería un único componente compartido; mientras
// tanto, este ADMIN_NAV debe mantenerse en sync con ese sidebar.

import { initAppsMenu } from './apps-menu.js';

const rol = localStorage.getItem('tp_rol');
if (rol === 'admin_clinica') {
  // Sidebar admin canónico (mismo orden que las pantallas admin).
  const ADMIN_NAV = [
    ['dashboard_admin_clinica.html', 'dashboard',       'Dashboard'],
    ['pacientes_clinica.html',       'group',           'Pacientes'],
    ['agenda_clinica.html',          'calendar_month',  'Agenda'],
    ['telemedicina_psicologo.html',  'videocam',        'Videollamada'],
    ['mensajes_clinica.html',        'chat',            'Mensajes'],
    ['marketing_ia.html',            'campaign',         'Marketing IA'],
    ['resenas_psicologo.html',       'reviews',         'Reputación & Google'],
    ['consentimientos_clinica.html', 'history_edu',     'Consentimientos'],
    ['recepcion_config.html',        'support_agent',   'Recepción y Reservas'],
    ['recursos_psicologo.html',      'folder_shared',   'Recursos'],
  ];
  const cur = location.pathname.split('/').pop();

  // 1) Reemplazar el sidebar por el admin idéntico (activo = pantalla actual).
  const nav = document.querySelector('aside.sidebar-dark nav') || document.querySelector('aside nav');
  if (nav) {
    nav.innerHTML = ADMIN_NAV.map(function (item) {
      const href = item[0], icon = item[1], label = item[2];
      const active = href === cur;
      const style = active ? ' style="background:rgba(20,184,166,0.15);color:#2dd4bf;"' : '';
      return '<a href="' + href + '" class="nav-item flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-headline"' + style + '>'
           + '<span class="material-symbols-outlined text-lg">' + icon + '</span><span>' + label + '</span></a>';
    }).join('');
  }

  // 2) Otros enlaces sueltos psicólogo→admin fuera del sidebar (chat "Ver todo", etc.).
  const MAP = {
    'dashboard_psicologo.html':       'dashboard_admin_clinica.html',
    'agenda_psicologo.html':          'agenda_clinica.html',
    'pacientes_psicologo.html':       'pacientes_clinica.html',
    'mensajes_psicologo.html':        'mensajes_clinica.html',
    'consentimientos_psicologo.html': 'consentimientos_clinica.html',
    'integraciones_psicologo.html':   'integraciones_clinica.html',
    'perfil_psicologo.html':          'perfil_clinica.html',
  };
  document.querySelectorAll('a[href*="_psicologo.html"]').forEach(function (a) {
    const href = a.getAttribute('href'); if (!href) return;
    const base = href.split(/[?#]/)[0].split('/').pop();
    if (MAP[base]) a.setAttribute('href', href.replace(base, MAP[base]));
  });

  // 3) Reetiquetar la cabecera del sidebar a identidad admin (teal).
  document.querySelectorAll('aside p, aside span').forEach(function (el) {
    if (el.children.length === 0 && el.textContent.trim() === 'Portal Clínico') {
      el.textContent = 'Admin Portal';
      el.style.color = '#2dd4bf';
    }
  });
  document.querySelectorAll('aside .material-symbols-outlined').forEach(function (el) {
    if (el.textContent.trim() === 'psychology') {
      el.textContent = 'medical_services';
      el.style.color = '#2dd4bf';
      const box = el.parentElement;
      if (box) { box.style.background = 'rgba(20,184,166,0.2)'; box.style.borderColor = 'rgba(20,184,166,0.3)'; }
    }
  });

  // 4) Menú de 9-puntos canónico admin (elimina el overlay hardcodeado del psicólogo).
  try {
    initAppsMenu();
    const canonical = window.toggleAppsPanel;
    document.querySelectorAll('[onclick="toggleAppsPanel()"]').forEach(function (b) { b.onclick = canonical; });
  } catch (e) { /* si algo falla, se mantiene el menú original */ }
}
