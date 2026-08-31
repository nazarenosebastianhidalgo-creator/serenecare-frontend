/* Sidebar unificado del portal Super Admin.
   Inyección SÍNCRONA en <div id="superadmin-sidebar"></div> antes del JS de la
   página. Editar el menú del super admin: SOLO este archivo. */
(function () {
  var here = (location.pathname.split('/').pop() || '').toLowerCase();

  var items = [
    ['dashboard_maestro_super_admin.html', 'dashboard',                 'Dashboard'],
    ['gestion_clinicas_super_admin.html',  'medical_services',          'Clínicas'],
    ['revenue_super_admin.html',           'payments',                  'Revenue'],
    ['configuracion_ia_super_admin.html',  'settings_input_component',  'IA Config'],
    ['soporte_super_admin.html',           'contact_support',           'Soporte'],
    ['gestion_planes_super_admin.html',    'inventory_2',               'Planes SaaS']
  ];

  var nav = items.map(function (it) {
    var active = it[0].toLowerCase() === here;
    var cls = active
      ? 'flex items-center gap-3 px-4 py-3 bg-indigo-500/10 text-indigo-400 rounded-xl font-semibold active:scale-95 transition-all'
      : 'flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 rounded-xl transition-all active:scale-95';
    return '<a class="' + cls + '" href="' + it[0] + '">' +
             '<span class="material-symbols-outlined" data-icon="' + it[1] + '">' + it[1] + '</span>' +
             '<span class="font-headline tracking-tight">' + it[2] + '</span></a>';
  }).join('');

  var html =
  '<aside class="h-screen w-64 flex flex-col fixed left-0 top-0 sidebar-dark shadow-2xl shadow-slate-950/50 p-6 border-r border-slate-800/20 z-50">' +
    '<div class="mb-8 flex items-center gap-3">' +
      '<div class="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center">' +
        '<span class="material-symbols-outlined text-white" style="font-variation-settings:\'FILL\' 1;">medical_services</span>' +
      '</div>' +
      '<div>' +
        '<h1 class="text-xl font-bold tracking-tighter text-slate-50">SereneCare</h1>' +
        '<p class="text-[10px] uppercase tracking-widest text-indigo-400 font-bold">SaaS Enterprise</p>' +
      '</div>' +
    '</div>' +
    '<nav class="flex-1 flex flex-col gap-2">' + nav + '</nav>' +
    '<div class="mt-auto pt-6 border-t border-slate-800/40 relative">' +
      '<div id="user-menu" class="hidden" style="position:absolute;bottom:calc(100% + 6px);left:0;right:0;background:#0d1b2e;border:1px solid rgba(255,255,255,0.12);border-radius:14px;overflow:hidden;box-shadow:0 -12px 36px rgba(0,0,0,0.5);z-index:60;">' +
        '<button onclick="toggleTema()" class="flex items-center gap-3 px-4 py-3 w-full text-left hover:bg-white/5 transition-colors" style="border:none;background:none;cursor:pointer;">' +
          '<span id="icon-tema" class="material-symbols-outlined" style="color:#818cf8;font-size:17px;">dark_mode</span>' +
          '<span id="label-tema" class="text-sm font-semibold" style="color:#cbd5e1;">Modo claro</span>' +
        '</button>' +
        '<button onclick="cerrarTodasSesiones()" class="flex items-center gap-3 px-4 py-3 w-full text-left hover:bg-white/5 transition-colors" style="border:none;background:none;cursor:pointer;">' +
          '<span class="material-symbols-outlined" style="color:#f59e0b;font-size:17px;">no_accounts</span>' +
          '<span class="text-sm font-semibold" style="color:#cbd5e1;">Cerrar todas las sesiones</span>' +
        '</button>' +
        '<button onclick="toggleMantenimiento()" class="flex items-center gap-3 px-4 py-3 w-full text-left hover:bg-white/5 transition-colors" style="border:none;background:none;cursor:pointer;">' +
          '<span id="icon-mant" class="material-symbols-outlined" style="color:#f59e0b;font-size:17px;">construction</span>' +
          '<span id="label-mant" class="text-sm font-semibold" style="color:#cbd5e1;">Modo mantenimiento</span>' +
        '</button>' +
        '<div style="height:1px;background:rgba(255,255,255,0.06);margin:0 10px;"></div>' +
        '<a href="#" id="btn-logout" onclick="__saLogout(event)" class="flex items-center gap-3 px-4 py-3 w-full hover:bg-red-400/5 transition-colors" style="text-decoration:none;">' +
          '<span class="material-symbols-outlined" style="color:#f87171;font-size:17px;">logout</span>' +
          '<span class="text-sm font-semibold" style="color:#f87171;">Cerrar sesión</span>' +
        '</a>' +
      '</div>' +
      '<button id="btn-user" onclick="event.stopImmediatePropagation();document.getElementById(\'user-menu\').classList.toggle(\'hidden\')" class="flex items-center gap-3 w-full px-2 py-2 rounded-xl hover:bg-white/5 transition-colors" style="border:none;background:none;cursor:pointer;">' +
        '<div id="sa-avatar" class="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0" style="background:rgba(99,102,241,0.2);color:#818cf8;">SA</div>' +
        '<div class="flex-1 overflow-hidden text-left">' +
          '<p id="sa-nombre" class="text-sm font-bold text-slate-100 truncate">Super Admin</p>' +
          '<p class="text-[10px] text-slate-500">Super Administrador</p>' +
        '</div>' +
        '<span class="material-symbols-outlined text-slate-600 text-base">unfold_more</span>' +
      '</button>' +
    '</div>' +
  '</aside>';

  var mount = document.getElementById('superadmin-sidebar');
  if (mount) { mount.outerHTML = html; } else { document.write(html); }

  // Cerrar el desplegable de usuario al clicar fuera (uniforme en todas las
  // pantallas, sin depender del JS de cada página). El clic sobre el propio
  // botón no llega aquí porque su onclick corta la propagación.
  document.addEventListener('click', function (e) {
    var um = document.getElementById('user-menu');
    if (um && !e.target.closest('#user-menu') && !e.target.closest('#btn-user')) {
      um.classList.add('hidden');
    }
  });

  // Logout robusto: cierra la sesión de Supabase de verdad y va al acceso del super admin.
  window.__saLogout = async function (e) {
    if (e && e.preventDefault) e.preventDefault();
    try { var m = await import('/js/supabase-client.js'); await m.supabase.auth.signOut(); } catch (err) {}
    ['tp_rol', 'tp_user_id', 'tp_email', 'tp_nombre', 'tp_clinica_id'].forEach(function (k) { try { localStorage.removeItem(k); } catch (e2) {} });
    window.location.href = '/screens/acceso_super_admin.html';
  };
})();
