import { supabase } from './supabase-client.js'
import { verificarSesion, cerrarSesion } from './auth.js'

// ─── GUARDIA: solo super_admin puede entrar ───────────────────────
export async function guardaSuperAdmin() {
  const session = await verificarSesion(['super_admin'])
  if (!session) return null
  return session
}

// ─── STATS PARA DASHBOARD MAESTRO ────────────────────────────────
export async function obtenerStatsGlobales() {
  const [clinicasRes, usuariosRes, planesRes] = await Promise.all([
    supabase.from('clinicas').select('id, status, plan_id, planes(precio_mensual)'),
    supabase.from('usuarios').select('id, rol'),
    supabase.from('planes').select('*'),
  ])

  const clinicas   = clinicasRes.data || []
  const usuarios   = usuariosRes.data || []

  const totalClinicas   = clinicas.length
  const clinicasActivas = clinicas.filter(c => c.status === 'activa').length
  const clinicasTrial   = clinicas.filter(c => c.status === 'trial').length
  const suspendidas     = clinicas.filter(c => c.status === 'suspendida').length

  const ingresosMensuales = clinicas
    .filter(c => c.status === 'activa' && c.planes?.precio_mensual)
    .reduce((sum, c) => sum + Number(c.planes.precio_mensual), 0)

  const totalPsicologos = usuarios.filter(u => u.rol === 'psicologo').length
  const totalPacientes  = usuarios.filter(u => u.rol === 'paciente').length

  return {
    totalClinicas,
    clinicasActivas,
    clinicasTrial,
    suspendidas,
    ingresosMensuales: ingresosMensuales.toFixed(2),
    totalPsicologos,
    totalPacientes,
  }
}

// ─── LISTA DE CLÍNICAS ────────────────────────────────────────────
export async function obtenerClinicas({ plan = null, status = null } = {}) {
  let query = supabase
    .from('clinicas')
    .select(`
      id, nombre, logo_url, status, email_contacto, created_at,
      planes(nombre, precio_mensual),
      usuarios(count)
    `)
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)
  if (plan)   query = query.eq('planes.nombre', plan)

  const { data, error } = await query
  if (error) throw new Error('Error al cargar las clínicas.')
  return data || []
}

// ─── DETALLE DE UNA CLÍNICA ───────────────────────────────────────
export async function obtenerClinica(clinicaId) {
  const { data, error } = await supabase
    .from('clinicas')
    .select(`
      *,
      planes(nombre, precio_mensual, max_psicologos, max_pacientes),
      usuarios(id, nombre, apellido, rol, activo)
    `)
    .eq('id', clinicaId)
    .single()

  if (error) throw new Error('No se encontró la clínica.')
  return data
}

// ─── CAMBIAR ESTADO DE CLÍNICA ────────────────────────────────────
export async function cambiarEstadoClinica(clinicaId, nuevoStatus) {
  const { error } = await supabase
    .from('clinicas')
    .update({ status: nuevoStatus, updated_at: new Date().toISOString() })
    .eq('id', clinicaId)

  if (error) throw new Error('No se pudo cambiar el estado de la clínica.')
}

// ─── CAMBIAR PLAN DE CLÍNICA ──────────────────────────────────────
export async function cambiarPlanClinica(clinicaId, planId) {
  const { error } = await supabase
    .from('clinicas')
    .update({ plan_id: planId, updated_at: new Date().toISOString() })
    .eq('id', clinicaId)

  if (error) throw new Error('No se pudo cambiar el plan.')
}

// ─── CONFIGURACIÓN GLOBAL DE IA ───────────────────────────────────
export async function obtenerConfigIA() {
  // La config global de IA se guarda en la clínica del super_admin (clinica_id = null)
  // o en una tabla de configuración separada. Usamos localStorage como fallback.
  const local = localStorage.getItem('tp_config_ia')
  return local ? JSON.parse(local) : {
    modelo: 'gpt-4o-mini',
    temperatura: 0.7,
    max_tokens: 2000,
    prompt_sistema: 'Eres un asistente clínico especializado en psicología.',
    notas_soap_habilitado: true,
    informes_habilitado: true,
    asistente_paciente_habilitado: true,
  }
}

export async function guardarConfigIA(config) {
  // Guardar en Supabase como metadata global (en tabla clinicas del super_admin)
  // Por ahora también en localStorage para persistencia inmediata
  localStorage.setItem('tp_config_ia', JSON.stringify(config))

  // Actualizar config_ia en todas las clínicas activas
  const { error } = await supabase
    .from('clinicas')
    .update({ config_ia: config })
    .eq('status', 'activa')

  if (error) throw new Error('No se pudo guardar la configuración.')
}

// ─── OBTENER PLANES DISPONIBLES ──────────────────────────────────
export async function obtenerPlanes() {
  const { data, error } = await supabase
    .from('planes')
    .select('id, nombre, precio_mensual')
    .order('precio_mensual', { ascending: true })
  if (error) throw new Error('Error al cargar los planes.')
  return data || []
}

// ─── CREAR CLÍNICA ────────────────────────────────────────────────
export async function crearClinica({ nombre, email_contacto, plan_id, status = 'trial' }) {
  const { data, error } = await supabase
    .from('clinicas')
    .insert({ nombre, email_contacto, plan_id, status, created_at: new Date().toISOString() })
    .select()
    .single()
  if (error) throw new Error('No se pudo crear la clínica: ' + error.message)
  return data
}

// ─── HELPER: FORMATEAR MONEDA ─────────────────────────────────────
export function formatearMoneda(valor) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(valor)
}

// ─── HELPER: BADGE DE ESTADO ──────────────────────────────────────
export function badgeEstado(status) {
  const map = {
    activa:     { text: 'Activa',     class: 'bg-tertiary-container text-on-tertiary-container' },
    trial:      { text: 'Trial',      class: 'bg-secondary-container text-on-secondary-container' },
    suspendida: { text: 'Suspendida', class: 'bg-error-container text-on-error-container' },
  }
  const b = map[status] || { text: status, class: 'bg-surface-container text-on-surface' }
  return `<span class="px-3 py-1 rounded-full text-xs font-bold ${b.class}">${b.text}</span>`
}
