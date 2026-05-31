// Zero-downtime version polling — shows a non-blocking banner when a new deploy is detected.
// Include this script in every dashboard. The banner only appears when the build ID changes.
(function () {
  var VERSION_URL = '../version.json';
  var POLL_MS = 5 * 60 * 1000; // check every 5 min
  var _base = null;
  var _shown = false;

  function fetch_v(cb) {
    fetch(VERSION_URL + '?_=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(cb)
      .catch(function () {}); // silently ignore network errors
  }

  function showBanner() {
    if (_shown) return;
    _shown = true;

    var style = document.createElement('style');
    style.textContent = '@keyframes _scSlide{from{transform:translateY(-100%);opacity:0}to{transform:translateY(0);opacity:1}}';
    document.head.appendChild(style);

    var bar = document.createElement('div');
    bar.id = '_sc-update-bar';
    bar.style.cssText = [
      'position:fixed', 'top:0', 'left:0', 'right:0', 'z-index:2147483647',
      'background:linear-gradient(90deg,rgba(99,102,241,0.97),rgba(79,70,229,0.97))',
      'backdrop-filter:blur(8px)',
      'padding:10px 20px',
      'display:flex', 'align-items:center', 'justify-content:center', 'gap:12px',
      'font-family:Inter,sans-serif', 'font-size:13px', 'color:#fff',
      'box-shadow:0 4px 24px rgba(0,0,0,0.35)',
      'animation:_scSlide 0.35s cubic-bezier(0.16,1,0.3,1) forwards',
    ].join(';');

    bar.innerHTML =
      '<span style="font-family:\'Material Symbols Outlined\';font-size:17px;font-variation-settings:\'FILL\' 1;">system_update</span>' +
      '<span>Nueva versión de SereneCare disponible.</span>' +
      '<button onclick="window.location.reload()" style="background:rgba(255,255,255,0.18);border:1px solid rgba(255,255,255,0.35);color:#fff;padding:5px 16px;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;font-family:Manrope,sans-serif;transition:background 0.15s;" onmouseover="this.style.background=\'rgba(255,255,255,0.3)\'" onmouseout="this.style.background=\'rgba(255,255,255,0.18)\'">Actualizar ahora</button>' +
      '<button onclick="document.getElementById(\'_sc-update-bar\').remove()" style="background:none;border:none;color:rgba(255,255,255,0.55);cursor:pointer;font-size:20px;line-height:1;padding:2px 4px;" title="Cerrar">&times;</button>';

    // Push content down so the bar doesn't overlap the sticky header
    document.body.style.paddingTop = 'calc(' + (document.body.style.paddingTop || '0px') + ' + 44px)';
    document.body.insertBefore(bar, document.body.firstChild);
  }

  function check() {
    fetch_v(function (data) {
      if (!_base) { _base = data.build; return; }
      if (data.build !== _base) showBanner();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', check);
  } else {
    check();
  }
  setInterval(check, POLL_MS);

  // Also check when the tab becomes visible after being hidden (user switches back)
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible' && _base) check();
  });
})();
