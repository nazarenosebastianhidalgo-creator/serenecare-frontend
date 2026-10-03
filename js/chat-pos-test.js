// ─────────────────────────────────────────────────────────────────────────────
// AJUSTE DE PRUEBA (capado a TEST_EMAIL): baja el chat interno (#fab-mensajes) para
// que no choque con el botón del bot de ayuda (#sc-guia-btn), que se queda arriba.
// Cuando el usuario dé el OK, se aplica para todos en el HTML y se borra este archivo.
// ─────────────────────────────────────────────────────────────────────────────
import { supabase } from './supabase-client.js';

const TEST_EMAIL = 'nazarenoo.sebastiann.hidalgoo@hotmail.com';

(async function () {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const email = (session && session.user && session.user.email || '').toLowerCase();
    if (email !== TEST_EMAIL.toLowerCase()) return;
  } catch { return; }
  const aplicar = () => {
    const fab = document.getElementById('fab-mensajes');
    const panel = document.getElementById('cw-panel');
    if (fab) fab.style.setProperty('bottom', '24px', 'important');   // chat interno abajo
    if (panel) panel.style.setProperty('bottom', '88px', 'important'); // su panel justo encima
  };
  aplicar();
  setTimeout(aplicar, 1200); // por si el widget se monta tarde
})();
