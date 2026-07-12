import { supabase, callEdge } from './supabase-client.js'
import { verificarSesion } from './auth.js'

// Reutiliza la implementación central (proxy daily-proxy con JWT, sin key inline)
export { crearSalaVideo } from './supabase-client.js'

export async function guardaPaciente() {
  return await verificarSesion(['paciente'])
}

async function pacienteActual() {
  const uid = (await supabase.auth.getUser()).data.user?.id
  const { data } = await supabase.from('pacientes').select('*').eq('usuario_id', uid).single()
  return data
}

// ══════════════════════════════════════════
// INICIO DEL PORTAL
// ══════════════════════════════════════════

export async function obtenerDatosPaciente() {
  const uid = (await supabase.auth.getUser()).data.user?.id

  const paciente = await pacienteActual()
  if (!paciente) throw new Error('Perfil de paciente no encontrado.')

  const hoy   = new Date().toISOString().split('T')[0]
  const manana = new Date(Date.now() + 86400000).toISOString().split('T')[0]

  const [proximaCita, notificaciones, informes] = await Promise.all([
    supabase.from('citas')
      .select('id, fecha, hora_inicio, tipo, sala_video_url, usuarios(nombre, apellido)')
      .eq('paciente_id', paciente.id)
      .gte('fecha', hoy)
      .in('estado', ['pendiente', 'confirmada'])
      .order('fecha').order('hora_inicio')
      .limit(1),
    supabase.from('mensajes')
      .select('id', { count: 'exact' })
      .eq('para_id', uid).eq('leido', false),
    supabase.from('informes_ia')
      .select('id', { count: 'exact' })
      .eq('paciente_id', paciente.id).eq('compartido_con_paciente', true),
  ])

  return {
    paciente,
    proximaCita:         proximaCita.data?.[0] || null,
    notificacionesSinLeer: notificaciones.count || 0,
    totalInformes:       informes.count || 0,
  }
}

// ══════════════════════════════════════════
// CITAS DEL PACIENTE
// ══════════════════════════════════════════

export async function obtenerCitasPaciente() {
  const paciente = await pacienteActual()
  const { data, error } = await supabase.from('citas')
    .select('id, fecha, hora_inicio, hora_fin, tipo, estado, sala_video_url, usuarios(nombre, apellido)')
    .eq('paciente_id', paciente.id)
    .order('fecha', { ascending: false })
  if (error) throw new Error('Error al cargar citas.')
  return data || []
}

export async function confirmarCita(citaId) {
  const { error } = await supabase.from('citas')
    .update({ estado: 'confirmada' }).eq('id', citaId)
  if (error) throw new Error('No se pudo confirmar la cita.')
}

// ══════════════════════════════════════════
// DOCUMENTOS COMPARTIDOS CON EL PACIENTE
// ══════════════════════════════════════════

export async function obtenerDocumentosCompartidos() {
  const paciente = await pacienteActual()

  const [notas, informes] = await Promise.all([
    supabase.from('notas_soap')
      .select('id, created_at, plan, subjetivo, usuarios(nombre, apellido)')
      .eq('paciente_id', paciente.id)
      .eq('compartida_con_paciente', true)
      .order('created_at', { ascending: false }),
    supabase.from('informes_ia')
      .select('id, created_at, tipo, contenido')
      .eq('paciente_id', paciente.id)
      .eq('compartido_con_paciente', true)
      .order('created_at', { ascending: false }),
  ])

  return {
    notas:    notas.data    || [],
    informes: informes.data || [],
  }
}

// ══════════════════════════════════════════
// ASISTENTE IA 24/7
// ══════════════════════════════════════════

const HISTORIAL_KEY = 'tp_chat_historial'

export function obtenerHistorialChat() {
  try { return JSON.parse(sessionStorage.getItem(HISTORIAL_KEY) || '[]') }
  catch { return [] }
}

export function guardarHistorialChat(historial) {
  sessionStorage.setItem(HISTORIAL_KEY, JSON.stringify(historial.slice(-20)))
}

export async function enviarMensajeAsistente(texto) {
  const configIA  = JSON.parse(localStorage.getItem('tp_config_ia') || '{}')
  const historial = obtenerHistorialChat()

  const paciente = await pacienteActual()
  const messages = [
    {
      role: 'system',
      content: `${configIA.prompt_sistema || 'Eres un asistente terapéutico de acompañamiento.'}
Estás hablando con ${paciente?.nombre || 'el paciente'}. Tu rol es brindar apoyo emocional, psicoeducación y contención.
IMPORTANTE: No reemplazás la terapia profesional. Si detectás una crisis, indicá contactar al psicólogo o una línea de emergencia.`
    },
    ...historial.map(m => ({ role: m.rol, content: m.texto })),
    { role: 'user', content: texto },
  ]

  try {
    const json = await callEdge('openai-proxy', {
      model: configIA.modelo || 'gpt-4o-mini',
      temperature: 0.75,
      max_tokens: 600,
      messages,
    })
    const respuesta = json.choices?.[0]?.message?.content || 'No pude procesar tu mensaje.'
    const nuevo    = [...historial, { rol: 'user', texto }, { rol: 'assistant', texto: respuesta }]
    guardarHistorialChat(nuevo)
    return { rol: 'assistant', texto: respuesta }
  } catch (e) {
    const msg = e?.message || ''
    if (msg.includes('Demasiadas') || msg.includes('429')) {
      return { rol: 'assistant', texto: 'Estás enviando mensajes muy rápido. Esperá un momento e intentá de nuevo. 🙏' }
    }
    return { rol: 'assistant', texto: 'Hubo un error de conexión. Intentá nuevamente.' }
  }
}

// ══════════════════════════════════════════
// CUESTIONARIO PHQ-9
// ══════════════════════════════════════════

export const PREGUNTAS_PHQ9 = [
  'Poco interés o placer en hacer las cosas',
  'Sentirse decaído/a, deprimido/a o sin esperanza',
  'Problemas para dormir o dormir demasiado',
  'Sentirse cansado/a o con poca energía',
  'Poco apetito o comer en exceso',
  'Sentirse mal consigo mismo/a o fracasado/a',
  'Dificultad para concentrarse',
  'Moverse o hablar muy lento o estar muy inquieto/a',
  'Pensamientos de hacerse daño',
]

export function calcularPuntajePHQ9(respuestas) {
  const puntaje = respuestas.reduce((sum, r) => sum + (r || 0), 0)
  let severidad = ''
  if (puntaje <= 4)       severidad = 'Mínimo'
  else if (puntaje <= 9)  severidad = 'Leve'
  else if (puntaje <= 14) severidad = 'Moderado'
  else if (puntaje <= 19) severidad = 'Moderado-severo'
  else                    severidad = 'Severo'
  return { puntaje, severidad }
}

export async function guardarEvaluacion({ tipo, respuestas, puntaje, severidad }) {
  const paciente = await pacienteActual()
  const fila = {
    clinica_id:  paciente.clinica_id,
    paciente_id: paciente.id,
    tipo,
    respuestas:  { answers: respuestas },
    puntaje,
    puntuacion:  puntaje,   // la tabla tiene ambas columnas; las mantenemos en sync
  }
  if (severidad) fila.severidad = severidad
  const { error } = await supabase.from('evaluaciones').insert(fila)
  if (error) throw new Error('No se pudo guardar la evaluación.')
}

// ══════════════════════════════════════════
// TELEMEDICINA
// ══════════════════════════════════════════

export async function obtenerSalaTelemedicina(citaId) {
  const { data, error } = await supabase.from('citas')
    .select('id, sala_video_url, fecha, hora_inicio, hora_fin, usuarios(nombre, apellido)')
    .eq('id', citaId).single()
  if (error) throw new Error('Cita no encontrada.')
  return data
}

// crearSalaVideo() se re-exporta desde supabase-client.js (ver arriba).

// ══════════════════════════════════════════
// NOTIFICACIONES Y MENSAJES
// ══════════════════════════════════════════

export async function obtenerMensajesPaciente() {
  const uid = (await supabase.auth.getUser()).data.user?.id
  const { data, error } = await supabase.from('mensajes')
    .select('*, de:de_id(nombre, apellido, rol)')
    .eq('para_id', uid)
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) throw new Error('Error al cargar mensajes.')
  return data || []
}

export async function enviarMensajePaciente(texto) {
  const uid     = (await supabase.auth.getUser()).data.user?.id
  const paciente = await pacienteActual()

  // Obtener psicólogo asignado (el de la última cita)
  const { data: ultimaCita } = await supabase.from('citas')
    .select('psicologo_id')
    .eq('paciente_id', paciente.id)
    .order('fecha', { ascending: false })
    .limit(1).single()

  if (!ultimaCita?.psicologo_id) throw new Error('No tenés un psicólogo asignado aún.')

  const { error } = await supabase.from('mensajes').insert({
    clinica_id: paciente.clinica_id,
    de_id:      uid,
    para_id:    ultimaCita.psicologo_id,
    texto,
  })
  if (error) throw new Error('No se pudo enviar el mensaje.')
}

// ══════════════════════════════════════════
// HELPERS UI
// ══════════════════════════════════════════

export function formatearFechaHora(fecha, hora) {
  if (!fecha) return '—'
  const d    = new Date(`${fecha}T${hora || '00:00'}`)
  return d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' }) +
    (hora ? ` a las ${hora.substring(0, 5)}` : '')
}

export function bubbleIA(texto) {
  return `<div class="flex justify-start mb-4">
    <div class="flex items-start gap-3 max-w-sm">
      <div class="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
        <span class="material-symbols-outlined text-on-primary text-sm">smart_toy</span>
      </div>
      <div class="bg-surface-container px-4 py-3 rounded-2xl rounded-tl-none text-sm text-on-surface leading-relaxed">
        ${texto.replace(/\n/g, '<br>')}
      </div>
    </div>
  </div>`
}

export function bubbleUsuario(texto) {
  return `<div class="flex justify-end mb-4">
    <div class="max-w-sm px-4 py-3 rounded-2xl rounded-tr-none text-sm text-on-primary leading-relaxed"
         style="background: linear-gradient(135deg,#296777,#195a6a)">
      ${texto}
    </div>
  </div>`
}
