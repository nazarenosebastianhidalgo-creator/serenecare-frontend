import { supabase } from './supabase-client.js'
import { verificarSesion } from './auth.js'

const ROLES_CLINICA = ['admin_clinica', 'psicologo', 'secretario']

export async function guardaClinica() {
  return await verificarSesion(ROLES_CLINICA)
}

function clinicaId() {
  return localStorage.getItem('tp_clinica_id')
}

function usuarioId() {
  return supabase.auth.getUser().then(r => r.data.user?.id)
}

// ══════════════════════════════════════════
// DASHBOARD
// ══════════════════════════════════════════

export async function obtenerDashboardPsicologo() {
  const uid = (await supabase.auth.getUser()).data.user.id
  const hoy = new Date().toISOString().split('T')[0]

  const [citasHoy, citasSemana, pacientes, pendientes] = await Promise.all([
    supabase.from('citas').select('id, estado, hora_inicio, hora_fin, pacientes(nombre, apellido)')
      .eq('clinica_id', clinicaId()).eq('psicologo_id', uid).eq('fecha', hoy)
      .order('hora_inicio'),
    supabase.from('citas').select('id', { count: 'exact' })
      .eq('clinica_id', clinicaId()).eq('psicologo_id', uid)
      .gte('fecha', hoy).lte('fecha', fechaSemana()),
    supabase.from('pacientes').select('id', { count: 'exact' })
      .eq('clinica_id', clinicaId()),
    supabase.from('citas').select('id', { count: 'exact' })
      .eq('clinica_id', clinicaId()).eq('estado', 'pendiente'),
  ])

  return {
    citasHoy:       citasHoy.data || [],
    totalCitasSemana: citasSemana.count || 0,
    totalPacientes: pacientes.count || 0,
    citasPendientes: pendientes.count || 0,
  }
}

function fechaSemana() {
  const d = new Date()
  d.setDate(d.getDate() + 7)
  return d.toISOString().split('T')[0]
}

// ══════════════════════════════════════════
// CITAS
// ══════════════════════════════════════════

export async function obtenerCitas({ fecha = null, estado = null, psicologoId = null } = {}) {
  let q = supabase.from('citas')
    .select(`id, fecha, hora_inicio, hora_fin, tipo, estado, sala_video_url,
             pacientes(id, nombre, apellido, email),
             usuarios(nombre, apellido)`)
    .eq('clinica_id', clinicaId())
    .order('fecha').order('hora_inicio')

  if (fecha)       q = q.eq('fecha', fecha)
  if (estado)      q = q.eq('estado', estado)
  if (psicologoId) q = q.eq('psicologo_id', psicologoId)

  const { data, error } = await q
  if (error) throw new Error('Error al cargar citas.')
  return data || []
}

export async function crearCita(datos) {
  const { error } = await supabase.from('citas').insert({
    ...datos,
    clinica_id: clinicaId(),
  })
  if (error) throw new Error('No se pudo crear la cita.')
}

export async function actualizarEstadoCita(citaId, estado) {
  const { error } = await supabase.from('citas')
    .update({ estado, updated_at: new Date().toISOString() })
    .eq('id', citaId).eq('clinica_id', clinicaId())
  if (error) throw new Error('No se pudo actualizar la cita.')
}

export async function eliminarCita(citaId) {
  const { error } = await supabase.from('citas')
    .delete().eq('id', citaId).eq('clinica_id', clinicaId())
  if (error) throw new Error('No se pudo eliminar la cita.')
}

// ══════════════════════════════════════════
// PACIENTES
// ══════════════════════════════════════════

export async function obtenerPacientes(busqueda = '') {
  let q = supabase.from('pacientes')
    .select('id, nombre, apellido, email, telefono, created_at, motivo_consulta')
    .eq('clinica_id', clinicaId())
    .order('apellido')

  if (busqueda) {
    q = q.or(`nombre.ilike.%${busqueda}%,apellido.ilike.%${busqueda}%,email.ilike.%${busqueda}%`)
  }

  const { data, error } = await q
  if (error) throw new Error('Error al cargar pacientes.')
  return data || []
}

export async function obtenerPaciente(pacienteId) {
  const { data, error } = await supabase.from('pacientes')
    .select(`*,
      citas(id, fecha, hora_inicio, estado, tipo, usuarios(nombre, apellido)),
      notas_soap(id, created_at, plan, asistida_por_ia),
      evaluaciones(id, tipo, puntaje, created_at)`)
    .eq('id', pacienteId).eq('clinica_id', clinicaId())
    .single()
  if (error) throw new Error('No se encontró el paciente.')
  return data
}

export async function crearPaciente(datos) {
  const { data, error } = await supabase.from('pacientes').insert({
    ...datos,
    clinica_id: clinicaId(),
  }).select().single()
  if (error) throw new Error('No se pudo crear el paciente.')
  return data
}

// ══════════════════════════════════════════
// NOTAS SOAP
// ══════════════════════════════════════════

export async function obtenerNotas(pacienteId) {
  const { data, error } = await supabase.from('notas_soap')
    .select('*, usuarios(nombre, apellido)')
    .eq('paciente_id', pacienteId).eq('clinica_id', clinicaId())
    .order('created_at', { ascending: false })
  if (error) throw new Error('Error al cargar notas.')
  return data || []
}

export async function obtenerTodasLasNotas({ limite = 100 } = {}) {
  const uid = (await supabase.auth.getUser()).data.user.id
  const { data, error } = await supabase.from('notas_soap')
    .select('id, subjetivo, objetivo, evaluacion, plan, asistida_por_ia, compartida_con_paciente, created_at, updated_at, pacientes(id, nombre, apellido)')
    .eq('clinica_id', clinicaId())
    .eq('psicologo_id', uid)
    .order('created_at', { ascending: false })
    .limit(limite)
  if (error) throw new Error('Error al cargar notas.')
  return data || []
}

export async function guardarNota(datos) {
  const uid = (await supabase.auth.getUser()).data.user.id
  const payload = { ...datos, clinica_id: clinicaId(), psicologo_id: uid }

  if (datos.id) {
    const { error } = await supabase.from('notas_soap')
      .update({ ...payload, updated_at: new Date().toISOString() }).eq('id', datos.id)
    if (error) throw new Error('No se pudo guardar la nota.')
  } else {
    const { error } = await supabase.from('notas_soap').insert(payload)
    if (error) throw new Error('No se pudo crear la nota.')
  }
}

export async function compartirNota(notaId, compartir) {
  const { error } = await supabase.from('notas_soap')
    .update({ compartida_con_paciente: compartir }).eq('id', notaId)
  if (error) throw new Error('No se pudo actualizar la nota.')
}

// ══════════════════════════════════════════
// INFORMES IA
// ══════════════════════════════════════════

export async function obtenerInformes(pacienteId) {
  const { data, error } = await supabase.from('informes_ia')
    .select('*').eq('paciente_id', pacienteId).eq('clinica_id', clinicaId())
    .order('created_at', { ascending: false })
  if (error) throw new Error('Error al cargar informes.')
  return data || []
}

export async function generarInformeIA({ pacienteId, tipo, contexto }) {
  const uid = (await supabase.auth.getUser()).data.user.id

  // Obtener historial del paciente para el prompt
  const paciente = await obtenerPaciente(pacienteId)
  const notas    = await obtenerNotas(pacienteId)

  const resumenNotas = notas.slice(0, 5).map(n =>
    `Sesión ${n.created_at?.split('T')[0]}: S: ${n.subjetivo || ''} | O: ${n.objetivo || ''} | E: ${n.evaluacion || ''} | P: ${n.plan || ''}`
  ).join('\n')

  // Llamar a la API de IA (configurada en config_ia)
  const configIA = JSON.parse(localStorage.getItem('tp_config_ia') || '{}')

  let contenido = { error: 'Error al conectar con la IA.' }

  try {
    const { data: { session: _ses } } = await supabase.auth.getSession()
    const res = await fetch('https://wnuwuxenzwfqmhxagryk.supabase.co/functions/v1/openai-proxy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndudXd1eGVuendmcW1oeGFncnlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxMjYwMDQsImV4cCI6MjA5NDcwMjAwNH0.9mlijBd57cKtso2acSSKnU2LKQFZ_sUEKuqtAguZk5o',
        'Authorization': `Bearer ${_ses?.access_token}`,
      },
      body: JSON.stringify({
        model: configIA.modelo || 'gpt-4o',
        temperature: configIA.temperatura || 0.7,
        messages: [
          { role: 'system', content: configIA.prompt_sistema || 'Eres un asistente clínico especializado en psicología.' },
          { role: 'user',   content: `Genera un informe de tipo "${tipo}" para el paciente ${paciente.nombre} ${paciente.apellido}.\n\nMotivo de consulta: ${paciente.motivo_consulta || 'No especificado'}\n\nÚltimas notas clínicas:\n${resumenNotas}\n\nContexto adicional: ${contexto || ''}` },
        ],
      }),
    })
    const json = await res.json()
    contenido = { texto: json.choices?.[0]?.message?.content || 'Sin respuesta', tipo }
  } catch {
    contenido = { error: 'Error al conectar con la IA.' }
  }

  const { data, error } = await supabase.from('informes_ia').insert({
    clinica_id: clinicaId(),
    paciente_id: pacienteId,
    psicologo_id: uid,
    tipo,
    contenido,
    compartido_con_paciente: false,
  }).select().single()

  if (error) throw new Error('No se pudo guardar el informe.')
  return data
}

export async function compartirInforme(informeId, compartir) {
  const { error } = await supabase.from('informes_ia')
    .update({ compartido_con_paciente: compartir }).eq('id', informeId)
  if (error) throw new Error('No se pudo actualizar el informe.')
}

// ══════════════════════════════════════════
// MENSAJERÍA
// ══════════════════════════════════════════

export async function obtenerConversaciones() {
  const uid = (await supabase.auth.getUser()).data.user.id
  const { data, error } = await supabase.from('mensajes')
    .select('*, de:de_id(nombre, apellido), para:para_id(nombre, apellido)')
    .eq('clinica_id', clinicaId())
    .or(`de_id.eq.${uid},para_id.eq.${uid}`)
    .order('created_at', { ascending: false })
  if (error) throw new Error('Error al cargar mensajes.')
  return data || []
}

export async function obtenerMensajes(otroUsuarioId) {
  const uid = (await supabase.auth.getUser()).data.user.id
  const { data, error } = await supabase.from('mensajes')
    .select('*, de:de_id(nombre, apellido)')
    .eq('clinica_id', clinicaId())
    .or(`and(de_id.eq.${uid},para_id.eq.${otroUsuarioId}),and(de_id.eq.${otroUsuarioId},para_id.eq.${uid})`)
    .order('created_at')
  if (error) throw new Error('Error al cargar mensajes.')

  // Marcar como leídos
  await supabase.from('mensajes').update({ leido: true })
    .eq('para_id', uid).eq('de_id', otroUsuarioId)

  return data || []
}

export async function enviarMensaje(paraId, texto) {
  const uid = (await supabase.auth.getUser()).data.user.id
  const { error } = await supabase.from('mensajes').insert({
    clinica_id: clinicaId(),
    de_id: uid,
    para_id: paraId,
    texto,
  })
  if (error) throw new Error('No se pudo enviar el mensaje.')
}

export function suscribirMensajes(otroUsuarioId, callback) {
  return supabase.channel('mensajes-live')
    .on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'mensajes',
      filter: `clinica_id=eq.${clinicaId()}`,
    }, payload => callback(payload.new))
    .subscribe()
}

// ══════════════════════════════════════════
// LISTA DE ESPERA
// ══════════════════════════════════════════

export async function obtenerListaEspera() {
  const { data, error } = await supabase.from('lista_espera')
    .select('*, pacientes(nombre, apellido, email, telefono), usuarios(nombre, apellido)')
    .eq('clinica_id', clinicaId())
    .order('prioridad').order('created_at')
  if (error) throw new Error('Error al cargar lista de espera.')
  return data || []
}

export async function actualizarListaEspera(id, datos) {
  const { error } = await supabase.from('lista_espera')
    .update(datos).eq('id', id).eq('clinica_id', clinicaId())
  if (error) throw new Error('No se pudo actualizar.')
}

export async function removerDeEspera(id) {
  const { error } = await supabase.from('lista_espera')
    .delete().eq('id', id).eq('clinica_id', clinicaId())
  if (error) throw new Error('No se pudo remover de la lista.')
}

// ══════════════════════════════════════════
// PERSONAL (STAFF)
// ══════════════════════════════════════════

export async function obtenerStaff() {
  const { data, error } = await supabase.from('usuarios')
    .select('id, nombre, apellido, email, rol, activo, created_at')
    .eq('clinica_id', clinicaId())
    .in('rol', ['admin_clinica', 'psicologo', 'secretario'])
    .order('rol').order('apellido')
  if (error) throw new Error('Error al cargar el personal.')
  return data || []
}

export async function invitarStaff({ email, rol }) {
  const { error } = await supabase.auth.admin.inviteUserByEmail(email, {
    data: { rol, clinica_id: clinicaId() },
  })
  if (error) throw new Error('No se pudo enviar la invitación.')
}

export async function toggleStaffActivo(usuarioId, activo) {
  const { error } = await supabase.from('usuarios')
    .update({ activo, updated_at: new Date().toISOString() })
    .eq('id', usuarioId).eq('clinica_id', clinicaId())
  if (error) throw new Error('No se pudo actualizar el estado.')
}

// ══════════════════════════════════════════
// CONFIGURACIÓN DE LA CLÍNICA
// ══════════════════════════════════════════

export async function obtenerConfigClinica() {
  const { data, error } = await supabase.from('clinicas')
    .select('*, planes(nombre, precio_mensual, max_psicologos, max_pacientes)')
    .eq('id', clinicaId()).single()
  if (error) throw new Error('Error al cargar configuración.')
  return data
}

export async function actualizarConfigClinica(datos) {
  const { error } = await supabase.from('clinicas')
    .update({ ...datos, updated_at: new Date().toISOString() })
    .eq('id', clinicaId())
  if (error) throw new Error('No se pudo guardar la configuración.')
}

// ══════════════════════════════════════════
// HELPERS UI
// ══════════════════════════════════════════

export function formatearFecha(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatearHora(hora) {
  if (!hora) return '—'
  return hora.substring(0, 5)
}

export function badgeEstadoCita(estado) {
  const map = {
    pendiente:   { text: 'Pendiente',   cls: 'bg-secondary-container text-on-secondary-container' },
    confirmada:  { text: 'Confirmada',  cls: 'bg-tertiary-container text-on-tertiary-container' },
    completada:  { text: 'Completada',  cls: 'bg-primary-container text-on-primary-container' },
    cancelada:   { text: 'Cancelada',   cls: 'bg-error-container text-on-error-container' },
    no_asistio:  { text: 'No asistió',  cls: 'bg-surface-container-highest text-on-surface-variant' },
  }
  const b = map[estado] || { text: estado, cls: 'bg-surface-container text-on-surface' }
  return `<span class="px-3 py-1 rounded-full text-xs font-bold ${b.cls}">${b.text}</span>`
}

export function iniciarRealtime(tabla, filtro, callback) {
  return supabase.channel(`rt-${tabla}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: tabla, filter: filtro }, callback)
    .subscribe()
}
