// ============================================================
// connect.js — Cobros con Stripe Connect (paciente → psicólogo)
//
// Modelo "Forma B": el dinero del paciente cae directo en la cuenta
// Stripe del psicólogo; la plataforma solo cobra su comisión (3%).
// Reembolsos con devolución de comisión (Opción 1).
//
// Toda la lógica sensible vive en Edge Functions; aquí solo wrappers.
// ============================================================
import { supabase, callEdge } from './supabase-client.js'

// Comisión de la plataforma (debe coincidir con PLATFORM_FEE_PERCENT del backend)
export const COMISION_PORCENTAJE = 3

export function calcularComision(importe) {
  const c = Math.round(Number(importe) * (COMISION_PORCENTAJE / 100) * 100) / 100
  return {
    importe:  Number(importe),
    comision: c,
    neto:     Math.round((Number(importe) - c) * 100) / 100,
  }
}

// ── Onboarding: alta del psicólogo en Stripe ───────────────────
// Devuelve la URL de onboarding de Stripe (redirigir al usuario allí).
// admin_clinica debe pasar psicologoId; el psicólogo no necesita pasarlo.
export async function iniciarOnboardingStripe(psicologoId = null) {
  const { url } = await callEdge('stripe-connect-onboard', psicologoId ? { psicologoId } : {})
  return url
}

// ── Estado del alta de un psicólogo ────────────────────────────
// { conectado, charges_enabled, details_submitted, payouts_enabled }
export async function estadoStripe(psicologoId = null) {
  return callEdge('stripe-connect-status', psicologoId ? { psicologoId } : {})
}

// ── Estado de TODOS los psicólogos de la clínica (solo admin) ──
// { psicologos: [{ id, nombre, email, conectado, charges_enabled, ... }] }
export async function estadoStripeClinica() {
  return callEdge('stripe-connect-status', {})
}

// ── Cobrar una sesión al paciente ──────────────────────────────
// Crea la factura + Stripe Checkout. Devuelve { url, facturaId, comision }.
// Enviar `url` al paciente (o abrirla) para que pague.
//   pacienteId  (req)  · paciente al que se cobra
//   psicologoId (admin)· obligatorio si lo llama admin_clinica
//   importe     · €; si se omite se toma de citas.precio (requiere sesionId)
//   sesionId    · opcional, id de la cita; vincula el cobro a esa cita
//   concepto    · texto del cargo (def. "Sesión de terapia")
export async function cobrarSesion({ pacienteId, psicologoId, importe, sesionId, concepto } = {}) {
  if (!pacienteId) throw new Error('Falta el paciente')
  return callEdge('stripe-cobro-sesion', { pacienteId, psicologoId, importe, sesionId, concepto })
}

// ── Reembolsar una factura pagada (devuelve también la comisión) ─
export async function reembolsarFactura(facturaId) {
  if (!facturaId) throw new Error('Falta la factura')
  return callEdge('stripe-reembolso', { facturaId })
}

// ── Listado de facturas (historial de pagos) ───────────────────
export async function getFacturas(opts = {}) {
  const cid = localStorage.getItem('tp_clinica_id')
  let q = supabase
    .from('facturas')
    .select('*, pacientes(nombre, email), psicologos(nombre)')
    .order('created_at', { ascending: false })
  if (cid)            q = q.eq('clinica_id', cid)
  if (opts.estado)    q = q.eq('estado', opts.estado)
  if (opts.psicologoId) q = q.eq('psicologo_id', opts.psicologoId)
  if (opts.pacienteId)  q = q.eq('paciente_id', opts.pacienteId)
  if (opts.limit)     q = q.limit(opts.limit)
  const { data, error } = await q
  if (error) throw error
  return data || []
}
