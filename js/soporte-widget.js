// ── Widget "Contactar soporte" (admin clínica + psicólogo) ──
// Botón flotante abajo-izquierda + modal → crea un ticket en `tickets_soporte`
// que el super admin ve en su bandeja (soporte_super_admin.html).
// Uso: <script type="module">import { initSoporte } from '../js/soporte-widget.js'; initSoporte()</script>
import { supabase } from './supabase-client.js';

export async function initSoporte() {
  if (document.getElementById('sop-fab')) return;               // ya montado
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;
  const userId = session.user.id;

  // Datos del usuario (rol, clínica, nombre, email) para estampar el ticket
  let perfil = { rol: null, clinica_id: null, nombre: '', apellido: '', email: session.user.email };
  try {
    const { data } = await supabase.from('usuarios')
      .select('rol, clinica_id, nombre, apellido, email').eq('id', userId).maybeSingle();
    if (data) perfil = { ...perfil, ...data };
  } catch (_) {}
  // Solo para clientes de pago: admin de clínica y psicólogo
  if (!['admin_clinica', 'psicologo'].includes(perfil.rol)) return;

  const nombre = (perfil.nombre || '').trim() + (perfil.apellido ? ' ' + perfil.apellido : '');

  // ── Botón flotante (abajo-izquierda, para no chocar con el chat) ──
  const fab = document.createElement('button');
  fab.id = 'sop-fab';
  fab.title = 'Contactar soporte';
  fab.innerHTML = '<span class="material-symbols-outlined" style="font-size:22px;color:#fff">support_agent</span>';
  fab.style.cssText = 'position:fixed;bottom:24px;left:24px;z-index:48;width:48px;height:48px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#6366f1,#4f46e5);box-shadow:0 8px 24px rgba(79,70,229,.4);border:none;cursor:pointer;transition:transform .2s';
  fab.onmouseover = () => fab.style.transform = 'scale(1.08)';
  fab.onmouseout = () => fab.style.transform = 'scale(1)';
  document.body.appendChild(fab);

  // ── Modal ──
  const modal = document.createElement('div');
  modal.id = 'sop-modal';
  modal.style.cssText = 'display:none;position:fixed;inset:0;z-index:9998;align-items:center;justify-content:center;padding:16px;background:rgba(0,0,0,.6);backdrop-filter:blur(4px)';
  modal.innerHTML = `
    <div id="sop-box" style="background:#0d1b2e;border:1px solid rgba(255,255,255,.1);border-radius:20px;width:100%;max-width:440px;padding:24px;box-shadow:0 30px 80px rgba(0,0,0,.6)">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
        <h3 style="font-family:Manrope,sans-serif;font-weight:800;font-size:1.05rem;color:#f1f5f9">Contactar soporte</h3>
        <button id="sop-x" style="background:none;border:none;cursor:pointer;color:#94a3b8"><span class="material-symbols-outlined" style="font-size:20px">close</span></button>
      </div>
      <p style="font-size:.75rem;color:#64748b;margin-bottom:16px">Cuéntanos qué necesitas. El equipo de SereneCare lo revisará y te responderá.</p>
      <div style="display:flex;flex-direction:column;gap:12px">
        <div>
          <label style="font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#64748b;display:block;margin-bottom:6px">Asunto</label>
          <input id="sop-asunto" type="text" placeholder="Resumen breve del problema" style="width:100%;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:10px 12px;color:#f1f5f9;font-size:.85rem;outline:none"/>
        </div>
        <div style="display:flex;gap:10px">
          <div style="flex:1">
            <label style="font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#64748b;display:block;margin-bottom:6px">Categoría</label>
            <select id="sop-cat" style="width:100%;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:10px 12px;color:#f1f5f9;font-size:.85rem;outline:none">
              <option value="tecnico">Problema técnico</option>
              <option value="facturacion">Facturación / pagos</option>
              <option value="cuenta">Cuenta / acceso</option>
              <option value="general" selected>Consulta general</option>
            </select>
          </div>
          <div style="flex:1">
            <label style="font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#64748b;display:block;margin-bottom:6px">Urgencia</label>
            <select id="sop-prio" style="width:100%;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:10px 12px;color:#f1f5f9;font-size:.85rem;outline:none">
              <option value="baja">Baja</option>
              <option value="media" selected>Media</option>
              <option value="alta">Alta</option>
            </select>
          </div>
        </div>
        <div>
          <label style="font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#64748b;display:block;margin-bottom:6px">Mensaje</label>
          <textarea id="sop-msg" rows="4" placeholder="Describe qué ocurre, con el mayor detalle posible…" style="width:100%;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:10px 12px;color:#f1f5f9;font-size:.85rem;outline:none;resize:none"></textarea>
        </div>
        <div id="sop-err" style="display:none;font-size:.8rem;color:#fb7185;background:rgba(244,63,94,.1);border:1px solid rgba(244,63,94,.2);border-radius:10px;padding:8px 12px"></div>
      </div>
      <div style="display:flex;gap:10px;margin-top:18px">
        <button id="sop-cancel" style="flex:1;padding:10px;border-radius:10px;border:1px solid rgba(255,255,255,.1);background:none;color:#94a3b8;font-size:.85rem;font-weight:600;cursor:pointer">Cancelar</button>
        <button id="sop-send" style="flex:2;padding:10px;border-radius:10px;border:none;background:#4f46e5;color:#fff;font-size:.85rem;font-weight:700;cursor:pointer">Enviar</button>
      </div>
    </div>`;
  document.body.appendChild(modal);

  const $ = id => document.getElementById(id);
  const abrir = () => { modal.style.display = 'flex'; $('sop-err').style.display = 'none'; };
  const cerrar = () => { modal.style.display = 'none'; };
  fab.addEventListener('click', abrir);
  $('sop-x').addEventListener('click', cerrar);
  $('sop-cancel').addEventListener('click', cerrar);
  modal.addEventListener('click', e => { if (e.target === modal) cerrar(); });

  $('sop-send').addEventListener('click', async () => {
    const asunto = $('sop-asunto').value.trim();
    const mensaje = $('sop-msg').value.trim();
    if (!asunto || !mensaje) { $('sop-err').textContent = 'Rellena el asunto y el mensaje.'; $('sop-err').style.display = 'block'; return; }
    $('sop-send').disabled = true; $('sop-send').textContent = 'Enviando…';
    const { error } = await supabase.from('tickets_soporte').insert({
      clinica_id: perfil.clinica_id || null,
      usuario_id: userId,
      rol: perfil.rol,
      nombre: nombre || null,
      email: perfil.email || null,
      asunto, mensaje,
      categoria: $('sop-cat').value,
      prioridad: $('sop-prio').value,
      estado: 'abierto',
    });
    $('sop-send').disabled = false; $('sop-send').textContent = 'Enviar';
    if (error) { $('sop-err').textContent = 'No se pudo enviar: ' + error.message; $('sop-err').style.display = 'block'; return; }
    cerrar();
    $('sop-asunto').value = ''; $('sop-msg').value = '';
    const t = document.createElement('div');
    t.textContent = '✓ Ticket enviado. Te responderemos pronto.';
    t.style.cssText = 'position:fixed;bottom:28px;left:50%;transform:translateX(-50%);background:#0d1b2e;border:1px solid rgba(99,102,241,.4);border-radius:12px;padding:12px 20px;color:#a5b4fc;font-weight:700;font-size:13px;z-index:9999';
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3500);
  });
}
