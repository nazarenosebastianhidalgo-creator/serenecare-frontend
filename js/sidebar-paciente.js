/* Sidebar unificado del Portal Paciente.
   Inyección SÍNCRONA en <div id="paciente-sidebar"></div> antes del JS de la
   página. Editar el menú del paciente: SOLO este archivo. */
(function () {
  var here = (location.pathname.split('/').pop() || '').toLowerCase();

  var items = [
    ['portal_paciente_inicio.html', 'home',       'Inicio'],
    ['historial_sesiones.html',     'event_note', 'Mis Sesiones'],
    ['asistente_ia_paciente.html',  'psychology', 'Asistente IA'],
    ['escalas_paciente.html',       'assignment', 'Mis Escalas']
  ];

  var nav = items.map(function (it) {
    if (it[0] === '---') return '<div class="my-2 border-t border-slate-800/50"></div>';
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
      '<div class="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style="background:rgba(52,211,153,0.2);border:1px solid rgba(52,211,153,0.3);">' +
        '<span class="material-symbols-outlined text-lg" style="color:#34d399;font-variation-settings:\'FILL\' 1;">spa</span>' +
      '</div>' +
      '<div class="overflow-hidden">' +
        '<p id="nombre-clinica" class="text-sm font-bold text-white truncate font-headline">Mi Clínica</p>' +
        '<p class="text-[10px] font-bold uppercase tracking-widest" style="color:#34d399;">Portal Paciente</p>' +
      '</div>' +
    '</div>' +
    '<nav class="flex-1 flex flex-col gap-1">' + nav + '</nav>' +
    '<div id="demo-badge" class="hidden mb-3 px-3 py-2 rounded-xl text-center" style="background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.2);">' +
      '<p class="text-[10px] text-amber-400 font-bold uppercase tracking-widest">Modo Demo</p>' +
    '</div>' +
    '<div class="border-t border-slate-800/40 pt-3 relative">' +
      '<div id="user-menu" class="hidden" style="position:absolute;bottom:calc(100% + 6px);left:0;right:0;background:#0d1b2e;border:1px solid rgba(255,255,255,0.12);border-radius:14px;overflow:hidden;box-shadow:0 -12px 36px rgba(0,0,0,0.5);z-index:60;">' +
        '<button onclick="window.__toggleTheme()" class="flex items-center gap-3 px-4 py-3 w-full hover:bg-white/5 transition-colors" style="border:none;background:none;cursor:pointer;text-align:left;border-bottom:1px solid rgba(255,255,255,0.06);width:100%;">' +
          '<span id="theme-menu-icon" class="material-symbols-outlined" style="color:#94a3b8;font-size:17px;">light_mode</span>' +
          '<span id="theme-menu-label" class="text-sm font-semibold" style="color:#94a3b8;">Modo día</span>' +
        '</button>' +
        '<a href="#" onclick="__pacLogout(event)" class="flex items-center gap-3 px-4 py-3 w-full hover:bg-red-400/5 transition-colors" style="text-decoration:none;">' +
          '<span class="material-symbols-outlined" style="color:#f87171;font-size:17px;">logout</span>' +
          '<span class="text-sm font-semibold" style="color:#f87171;">Cerrar sesión</span>' +
        '</a>' +
      '</div>' +
      '<button onclick="document.getElementById(\'user-menu\').classList.toggle(\'hidden\')" class="flex items-center gap-3 w-full px-2 py-2 rounded-xl hover:bg-white/5 transition-colors" style="border:none;background:none;cursor:pointer;">' +
        '<div id="user-avatar" class="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0" style="background:rgba(52,211,153,0.2);color:#34d399;">P</div>' +
        '<div class="flex-1 overflow-hidden text-left">' +
          '<p id="user-nombre" class="text-sm font-bold text-white truncate">Paciente</p>' +
          '<p class="text-[10px] text-slate-500">Portal Paciente</p>' +
        '</div>' +
        '<span class="material-symbols-outlined text-slate-600 text-base">unfold_more</span>' +
      '</button>' +
    '</div>' +
  '</aside>';

  var mount = document.getElementById('paciente-sidebar');
  if (mount) { mount.outerHTML = html; } else { document.write(html); }

  // Logout robusto e independiente: cierra la sesión de Supabase de verdad,
  // limpia localStorage y lleva al acceso del paciente. Funciona aunque la
  // página no defina window._cerrarSesion.
  window.__pacLogout = async function (e) {
    if (e && e.preventDefault) e.preventDefault();
    try {
      var m = await import('/js/supabase-client.js');
      await m.supabase.auth.signOut();
    } catch (err) { /* si falla el signOut, igualmente limpiamos y salimos */ }
    ['tp_rol', 'tp_clinica_id', 'tp_nombre', 'tp_clinica', 'tp_demo'].forEach(function (k) {
      try { localStorage.removeItem(k); } catch (e2) {}
    });
    window.location.href = '/screens/acceso_paciente.html';
  };
})();
