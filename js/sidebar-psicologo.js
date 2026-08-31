/* Sidebar unificado del Portal Clínico (psicólogo).
   Inyección SÍNCRONA en <div id="psicologo-sidebar"></div> antes del JS de la
   página (para que el rellenado de usuario/clínica, tema, feedback y el logout
   —cableados por id btn-logout / btn-user— sigan funcionando igual).
   Editar el menú del psicólogo: SOLO este archivo. */
(function () {
  var here = (location.pathname.split('/').pop() || '').toLowerCase();

  // [href, icono, etiqueta, estilo-extra-opcional]
  var items = [
    ['dashboard_psicologo.html',      'dashboard',      'Dashboard',            ''],
    ['agenda_psicologo.html',         'calendar_month', 'Mi Agenda',            ''],
    ['pacientes_psicologo.html',      'group',          'Mis Pacientes',        ''],
    ['mensajes_psicologo.html',       'chat',           'Mensajes',             ''],
    ['telemedicina_psicologo.html',   'videocam',       'Videollamadas',        'green'],
    ['consentimientos_psicologo.html','history_edu',    'Consentimientos',      ''],
    ['integraciones_psicologo.html',  'cable',          'Integraciones',        ''],
    ['marketing_ia.html',             'campaign',        'Marketing IA',        ''],
    ['resenas_psicologo.html',        'reviews',        'Reputación &amp; Google', ''],
    ['recepcion_config.html',         'support_agent',  'Recepción y Reservas', '']
  ];

  var nav = items.map(function (it) {
    var active = it[0].toLowerCase() === here;
    var green = it[3] === 'green';
    var cls = active
      ? 'nav-active flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-sm font-headline'
      : 'nav-item flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-headline';
    var linkStyle = green ? ' style="color:#4ade80;"' : '';
    var iconStyle = green ? ' style="color:#4ade80;font-variation-settings:\'FILL\' 1;"' : '';
    return '<a href="' + it[0] + '" class="' + cls + '"' + linkStyle + '>' +
             '<span class="material-symbols-outlined text-lg"' + iconStyle + '>' + it[1] + '</span>' +
             '<span>' + it[2] + '</span></a>';
  }).join('');

  var html =
  '<aside class="h-screen w-64 flex flex-col fixed left-0 top-0 sidebar-dark border-r border-slate-800/30 p-5 z-50">' +
    '<div class="flex items-center gap-3 mb-8">' +
      '<div class="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style="background:rgba(139,92,246,0.2);border:1px solid rgba(139,92,246,0.3);">' +
        '<span class="material-symbols-outlined text-lg" style="color:#a78bfa;font-variation-settings:\'FILL\' 1;">psychology</span>' +
      '</div>' +
      '<div class="overflow-hidden">' +
        '<p id="nombre-clinica" class="text-sm font-bold text-white truncate font-headline">Clínica</p>' +
        '<p class="text-[10px] font-bold uppercase tracking-widest" style="color:#a78bfa;">Portal Clínico</p>' +
      '</div>' +
    '</div>' +
    '<nav class="flex-1 flex flex-col gap-1 overflow-y-auto min-h-0">' + nav + '</nav>' +
    '<div id="demo-badge" class="hidden mb-3 px-3 py-2 rounded-xl text-center" style="background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.2);">' +
      '<p class="text-[10px] text-amber-400 font-bold uppercase tracking-widest">Modo Demo</p>' +
    '</div>' +
    '<div class="border-t border-slate-800/40 pt-3 relative">' +
      '<div id="user-menu" class="hidden" style="position:absolute;bottom:calc(100% + 6px);left:0;right:0;background:#0d1b2e;border:1px solid rgba(255,255,255,0.12);border-radius:14px;overflow:hidden;box-shadow:0 -12px 36px rgba(0,0,0,0.5);z-index:60;">' +
        '<button onclick="toggleTema()" class="flex items-center gap-3 px-4 py-3 w-full text-left hover:bg-white/5 transition-colors" style="border:none;background:none;cursor:pointer;">' +
          '<span id="icon-tema" class="material-symbols-outlined" style="color:#818cf8;font-size:17px;">dark_mode</span>' +
          '<span id="label-tema" class="text-sm font-semibold" style="color:#cbd5e1;">Modo claro</span>' +
        '</button>' +
        '<button onclick="abrirFeedback()" class="flex items-center gap-3 px-4 py-3 w-full text-left hover:bg-white/5 transition-colors" style="border:none;background:none;cursor:pointer;">' +
          '<span class="material-symbols-outlined" style="color:#fbbf24;font-size:17px;">lightbulb</span>' +
          '<span class="text-sm font-semibold" style="color:#fbbf24;">Sugerir mejora</span>' +
        '</button>' +
        '<div style="height:1px;background:rgba(255,255,255,0.06);margin:0 10px;"></div>' +
        '<a href="#" id="btn-logout" class="flex items-center gap-3 px-4 py-3 w-full hover:bg-red-400/5 transition-colors" style="text-decoration:none;">' +
          '<span class="material-symbols-outlined" style="color:#f87171;font-size:17px;">logout</span>' +
          '<span class="text-sm font-semibold" style="color:#f87171;">Cerrar sesión</span>' +
        '</a>' +
      '</div>' +
      '<button id="btn-user" class="flex items-center gap-3 w-full px-2 py-2 rounded-xl hover:bg-white/5 transition-colors" style="border:none;background:none;cursor:pointer;">' +
        '<div id="user-avatar" class="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0" style="background:rgba(139,92,246,0.2);color:#a78bfa;">AM</div>' +
        '<div class="flex-1 overflow-hidden text-left">' +
          '<p id="user-nombre" class="text-sm font-bold text-white truncate">Psicólogo/a</p>' +
          '<p class="text-[10px] text-slate-500">Psicóloga clínica</p>' +
        '</div>' +
        '<span class="material-symbols-outlined text-slate-600 text-base">unfold_more</span>' +
      '</button>' +
    '</div>' +
  '</aside>';

  var mount = document.getElementById('psicologo-sidebar');
  if (mount) { mount.outerHTML = html; } else { document.write(html); }
})();
