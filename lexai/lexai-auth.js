// Sesión compartida del panel LexAI. Requiere que antes se cargue supabase-js (UMD).
// Expone en window: lxSb (cliente), lxGuard (redirige a login si no hay sesión),
// lxApi (fetch con Authorization Bearer), lxLogout.
(function () {
  const SUPABASE_URL = 'https://wnuwuxenzwfqmhxagryk.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndudXd1eGVuendmcW1oeGFncnlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxMjYwMDQsImV4cCI6MjA5NDcwMjAwNH0.9mlijBd57cKtso2acSSKnU2LKQFZ_sUEKuqtAguZk5o';
  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  window.lxSb = sb;

  window.lxGuard = async function () {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) { location.replace('login.html'); return null; }
    return session;
  };

  window.lxApi = async function (path, opts) {
    opts = opts || {};
    const { data: { session } } = await sb.auth.getSession();
    const headers = Object.assign({}, opts.headers || {});
    if (session) headers['Authorization'] = 'Bearer ' + session.access_token;
    const res = await fetch(path, Object.assign({}, opts, { headers }));
    if (res.status === 401) { location.replace('login.html'); }
    return res;
  };

  window.lxLogout = async function () {
    await sb.auth.signOut();
    location.replace('login.html');
  };
})();
