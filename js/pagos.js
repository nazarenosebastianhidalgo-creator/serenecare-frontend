import { supabase } from './supabase-client.js'

const SUPABASE_URL = localStorage.getItem('tp_supabase_url') || ''

// ── Planes disponibles ──────────────────────────────────────────
export const PLANES = [
  {
    id:          'trial',
    nombre:      'Trial',
    precio:      0,
    descripcion: 'Para conocer la plataforma',
    features:    ['1 psicólogo', '10 pacientes', 'Sin IA'],
    color:       'bg-surface-container text-on-surface',
  },
  {
    id:          'basico',
    nombre:      'Básico',
    precio:      29.99,
    descripcion: 'Para consultorios pequeños',
    features:    ['3 psicólogos', '100 pacientes', 'Notas SOAP con IA', 'Recordatorios email'],
    color:       'bg-secondary-container text-on-secondary-container',
    popular:     false,
  },
  {
    id:          'profesional',
    nombre:      'Profesional',
    precio:      79.99,
    descripcion: 'Para clínicas en crecimiento',
    features:    ['10 psicólogos', '500 pacientes', 'IA completa', 'Telemedicina', 'Informes IA', 'Asistente 24/7'],
    color:       'bg-primary-container text-on-primary-container',
    popular:     true,
  },
  {
    id:          'enterprise',
    nombre:      'Enterprise',
    precio:      199.99,
    descripcion: 'Para grandes instituciones',
    features:    ['Ilimitado', 'IA personalizada', 'SLA garantizado', 'Soporte dedicado', 'API access'],
    color:       'bg-tertiary-container text-on-tertiary-container',
  },
]

// ── Crear sesión de pago en Stripe ──────────────────────────────
export async function iniciarCheckout(plan) {
  const { data: { user } } = await supabase.auth.getUser()
  const { data: perfil }   = await supabase.from('usuarios').select('clinica_id, email').eq('id', user.id).single()
  const { data: clinica }  = await supabase.from('clinicas').select('email_contacto').eq('id', perfil.clinica_id).single()

  const res = await fetch(`${SUPABASE_URL}/functions/v1/stripe-checkout`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      plan,
      clinicaId: perfil.clinica_id,
      email:     clinica?.email_contacto || perfil.email,
    }),
  })

  const json = await res.json()
  if (json.error) throw new Error(json.error)
  return json.url
}

// ── Abrir portal de facturación de Stripe ──────────────────────
export async function abrirPortalStripe() {
  const { data: { user } } = await supabase.auth.getUser()
  const { data: perfil }   = await supabase.from('usuarios').select('clinica_id').eq('id', user.id).single()

  const res = await fetch(`${SUPABASE_URL}/functions/v1/stripe-portal`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ clinicaId: perfil.clinica_id }),
  })

  const json = await res.json()
  if (json.error) throw new Error(json.error)
  return json.url
}

// ── Obtener suscripción actual ──────────────────────────────────
export async function obtenerSuscripcionActual() {
  const { data: { user } } = await supabase.auth.getUser()
  const { data: perfil }   = await supabase.from('usuarios').select('clinica_id').eq('id', user.id).single()

  const { data: clinica } = await supabase.from('clinicas')
    .select('status, config_ia, planes(nombre, precio_mensual, max_psicologos, max_pacientes)')
    .eq('id', perfil.clinica_id).single()

  return {
    status:        clinica?.status,
    plan:          clinica?.planes,
    stripeActivo:  !!clinica?.config_ia?.stripe?.customer_id,
    clinicaId:     perfil.clinica_id,
  }
}

// ── Historial de recordatorios enviados ────────────────────────
export async function obtenerHistorialRecordatorios() {
  const { data: { user } } = await supabase.auth.getUser()
  const { data: perfil }   = await supabase.from('usuarios').select('clinica_id').eq('id', user.id).single()

  const { data, error } = await supabase.from('recordatorios')
    .select('*, pacientes(nombre, apellido), citas(fecha, hora_inicio)')
    .eq('clinica_id', perfil.clinica_id)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) throw new Error('Error al cargar historial.')
  return data || []
}

// ── Disparar recordatorio manual ───────────────────────────────
export async function enviarRecordatorioManual() {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/send-reminder`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    '{}',
  })
  const json = await res.json()
  if (json.error) throw new Error(json.error)
  return json
}

// ── Calcular uso actual vs límites del plan ────────────────────
export async function obtenerUsoActual() {
  const { data: { user } } = await supabase.auth.getUser()
  const { data: perfil }   = await supabase.from('usuarios').select('clinica_id').eq('id', user.id).single()

  const [psicologos, pacientes] = await Promise.all([
    supabase.from('usuarios').select('id', { count: 'exact' })
      .eq('clinica_id', perfil.clinica_id).in('rol', ['psicologo', 'admin_clinica']),
    supabase.from('pacientes').select('id', { count: 'exact' })
      .eq('clinica_id', perfil.clinica_id),
  ])

  return {
    psicologos: psicologos.count || 0,
    pacientes:  pacientes.count  || 0,
  }
}

// ── Verificar si se puede agregar un recurso según el plan ─────
// tipo: 'psicologo' | 'paciente'
// Lanza un Error si el límite del plan está alcanzado.
export async function verificarLimitePlan(tipo) {
  const [suscripcion, uso] = await Promise.all([
    obtenerSuscripcionActual(),
    obtenerUsoActual(),
  ])

  const plan = suscripcion.plan
  if (!plan) return // sin plan definido, no bloquear

  if (tipo === 'psicologo') {
    const max = plan.max_psicologos
    if (max !== null && max !== undefined && uso.psicologos >= max) {
      throw new Error(
        `Tu plan "${plan.nombre}" permite máximo ${max} psicólogo${max !== 1 ? 's' : ''}. ` +
        `Actualizá tu plan para agregar más.`
      )
    }
  } else if (tipo === 'paciente') {
    const max = plan.max_pacientes
    if (max !== null && max !== undefined && uso.pacientes >= max) {
      throw new Error(
        `Tu plan "${plan.nombre}" permite máximo ${max} paciente${max !== 1 ? 's' : ''}. ` +
        `Actualizá tu plan para agregar más.`
      )
    }
  }
}
