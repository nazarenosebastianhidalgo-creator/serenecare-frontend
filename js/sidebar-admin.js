/* Sidebar unificado del portal Admin Clínica.
   Se inyecta de forma SÍNCRONA (script normal, no module) en el punto
   <div id="admin-sidebar"></div>, ANTES de que corra el JS de la página,
   para que todo lo que rellena/usa el sidebar (nombre clínica, usuario,
   tema, feedback, logout) siga funcionando igual que cuando estaba inline.
   Para editar el menú del admin: SOLO este archivo. */
(function () {
  var here = (location.pathname.split('/').pop() || '').toLowerCase();

  // [href, icono, etiqueta]
  var items = [
    ['dashboard_admin_clinica.html', 'dashboard',      'Dashboard'],
    ['pacientes_clinica.html',       'group',          'Pacientes'],
    ['agenda_clinica.html',          'calendar_month', 'Agenda'],
    ['telemedicina_psicologo.html',  'videocam',       'Videollamada'],
    ['mensajes_clinica.html',        'chat',           'Mensajes'],
    ['marketing_ia.html',            'campaign',        'Marketing IA'],
    ['resenas_psicologo.html',       'reviews',        'Reputación &amp; Google'],
    ['consentimientos_clinica.html', 'history_edu',    'Consentimientos'],
    ['recepcion_config.html',        'support_agent',  'Recepción y Reservas'],
    ['recursos_psicologo.html',      'folder_shared',  'Recursos']
  ];

  var nav = items.map(function (it) {
    var active = it[0].toLowerCase() === here;
    var cls = active
      ? 'nav-active flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-sm font-headline'
      : 'nav-item flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-headline';
    return '<a href="' + it[0] + '" class="' + cls + '">' +
             '<span class="material-symbols-outlined text-lg">' + it[1] + '</span>' +
             '<span>' + it[2] + '</span></a>';
  }).join('');

  var html =
  '<aside class="h-screen w-64 flex flex-col fixed left-0 top-0 sidebar-dark border-r border-slate-800/30 p-5 z-50">' +
    '<div class="flex items-center gap-3 mb-8">' +
      '<div class="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style="background:rgba(20,184,166,0.2);border:1px solid rgba(20,184,166,0.3);">' +
        '<span class="material-symbols-outlined text-lg" style="color:#2dd4bf;font-variation-settings:\'FILL\' 1;">medical_services</span>' +
      '</div>' +
      '<div class="overflow-hidden">' +
        '<p id="nombre-clinica" class="text-sm font-bold text-white truncate font-headline">Clínica</p>' +
        '<p class="text-[10px] text-teal-500 font-bold uppercase tracking-widest">Admin Portal</p>' +
      '</div>' +
    '</div>' +
    '<nav class="flex-1 flex flex-col gap-1">' + nav + '</nav>' +
    '<div id="demo-badge" class="hidden mb-3 px-3 py-2 rounded-xl text-center" style="background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.2);">' +
      '<p class="text-[10px] text-amber-400 font-bold uppercase tracking-widest">Modo Demo</p>' +
    '</div>' +
    '<div class="border-t border-slate-800/40 pt-3 relative">' +
      '<div id="user-menu" class="hidden" style="position:absolute;bottom:calc(100% + 6px);left:0;right:0;background:#0d1b2e;border:1px solid rgba(255,255,255,0.12);border-radius:14px;overflow:hidden;box-shadow:0 -12px 36px rgba(0,0,0,0.5);z-index:60;">' +
        '<button onclick="toggleTema()" class="flex items-center gap-3 px-4 py-3 w-full text-left hover:bg-white/5 transition-colors" style="border:none;background:none;cursor:pointer;">' +
          '<span id="icon-tema" class="material-symbols-outlined" style="color:#818cf8;font-size:17px;">dark_mode</span>' +
          '<span id="label-tema" class="text-sm font-semibold" style="color:#cbd5e1;">Modo claro</span>' +
        '</button>' +
        '<div style="height:1px;background:rgba(255,255,255,0.06);margin:0 10px;"></div>' +
        '<button onclick="abrirFeedback()" class="flex items-center gap-3 px-4 py-3 w-full text-left hover:bg-amber-400/5 transition-colors" style="border:none;background:none;cursor:pointer;">' +
          '<span class="material-symbols-outlined" style="color:#fbbf24;font-size:17px;">lightbulb</span>' +
          '<span class="text-sm font-semibold" style="color:#fbbf24;">Sugerir mejora</span>' +
        '</button>' +
        '<div style="height:1px;background:rgba(255,255,255,0.06);margin:0 10px;"></div>' +
        '<a href="#" onclick="__admLogout(event)" id="btn-logout" class="flex items-center gap-3 px-4 py-3 w-full hover:bg-red-400/5 transition-colors" style="text-decoration:none;">' +
          '<span class="material-symbols-outlined" style="color:#f87171;font-size:17px;">logout</span>' +
          '<span class="text-sm font-semibold" style="color:#f87171;">Cerrar sesión</span>' +
        '</a>' +
      '</div>' +
      '<button id="btn-user-card" onclick="event.stopImmediatePropagation();document.getElementById(\'user-menu\').classList.toggle(\'hidden\')" class="flex items-center gap-3 w-full px-2 py-2 rounded-xl hover:bg-white/5 transition-colors" style="border:none;background:none;cursor:pointer;">' +
        '<div id="user-avatar" class="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0" style="background:rgba(20,184,166,0.2);color:#2dd4bf;">AC</div>' +
        '<div class="flex-1 overflow-hidden text-left">' +
          '<p id="user-nombre" class="text-sm font-bold text-white truncate">Admin</p>' +
          '<p class="text-[10px] text-slate-500">Admin Clínica</p>' +
        '</div>' +
        '<span id="chevron-user" class="material-symbols-outlined text-slate-600 text-base">unfold_more</span>' +
      '</button>' +
    '</div>' +
  '</aside>';

  var mount = document.getElementById('admin-sidebar');
  if (mount) {
    mount.outerHTML = html;
  } else {
    document.write(html);
  }

  // Cerrar el desplegable de usuario al clicar fuera (uniforme en todas las
  // pantallas, sin depender del JS de cada página). El clic sobre el propio
  // botón no llega aquí porque su onclick corta la propagación.
  document.addEventListener('click', function (e) {
    var um = document.getElementById('user-menu');
    if (um && !e.target.closest('#user-menu') && !e.target.closest('#btn-user-card')) {
      um.classList.add('hidden');
    }
  });

  // Logout robusto: cierra la sesión de Supabase de verdad y va al acceso de clínica.
  window.__admLogout = async function (e) {
    if (e && e.preventDefault) e.preventDefault();
    try { var m = await import('/js/supabase-client.js'); await m.supabase.auth.signOut(); } catch (err) {}
    ['tp_rol', 'tp_clinica_id', 'tp_nombre', 'tp_clinica', 'tp_demo'].forEach(function (k) { try { localStorage.removeItem(k); } catch (e2) {} });
    window.location.href = '/screens/acceso_clinica.html';
  };
})();
