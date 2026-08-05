// ── Interruptor de Modo Mantenimiento (menú super admin) ──
// Escribe el flag global en config_sistema (RLS: solo super_admin puede).
// La barrera real la aplica js/mantenimiento-gate.js en los portales cliente.
// Uso: <script type="module">import { initMantenimientoToggle } from '../js/mantenimiento-toggle.js'; initMantenimientoToggle()</script>
import { supabase } from './supabase-client.js';

async function leerFlag() {
  try {
    const { data } = await supabase.from('config_sistema').select('mantenimiento').eq('id', 1).maybeSingle();
    return !!(data && data.mantenimiento);
  } catch { return false; }
}

async function sync() {
  const on = await leerFlag();
  const label = document.getElementById('label-mant');
  const icon = document.getElementById('icon-mant');
  if (label) { label.textContent = on ? 'Desactivar mantenimiento' : 'Modo mantenimiento'; label.style.color = on ? '#fbbf24' : '#cbd5e1'; }
  if (icon) icon.style.color = on ? '#ef4444' : '#f59e0b';
  return on;
}

function toast(msg, warn) {
  const t = document.createElement('div');
  t.textContent = msg;
  t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:' + (warn ? '#92400e' : '#166534') + ';color:#fff;padding:12px 22px;border-radius:12px;font-size:13px;font-weight:700;z-index:99999;box-shadow:0 8px 30px rgba(0,0,0,.45)';
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 4000);
}

window.toggleMantenimiento = async function () {
  const on = await leerFlag();
  if (!on) {
    if (!confirm('¿ACTIVAR modo mantenimiento?\n\nBloquearás el acceso a TODAS las clínicas, psicólogos y pacientes. Tú (super admin) seguirás pudiendo entrar. Úsalo solo para tareas delicadas (migraciones, incidentes).')) return;
    const mensaje = prompt('Mensaje que verán los usuarios (opcional):', 'Estamos aplicando mejoras en SereneCare. Volvemos en unos minutos.');
    if (mensaje === null) return; // canceló el prompt
    const { error } = await supabase.from('config_sistema')
      .update({ mantenimiento: true, mantenimiento_mensaje: mensaje.trim() || null, mantenimiento_desde: new Date().toISOString() })
      .eq('id', 1);
    if (error) return toast('No se pudo activar: ' + error.message, true);
    await sync();
    toast('🔧 Mantenimiento ACTIVADO — acceso de clientes bloqueado', true);
  } else {
    if (!confirm('¿Desactivar el modo mantenimiento y reabrir el acceso a todos?')) return;
    const { error } = await supabase.from('config_sistema').update({ mantenimiento: false }).eq('id', 1);
    if (error) return toast('No se pudo desactivar: ' + error.message, true);
    await sync();
    toast('✅ Mantenimiento desactivado — acceso restablecido', false);
  }
};

export function initMantenimientoToggle() { sync(); }
