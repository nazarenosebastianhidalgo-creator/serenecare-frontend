import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL      = 'https://wnuwuxenzwfqmhxagryk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndudXd1eGVuendmcW1oeGFncnlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxMjYwMDQsImV4cCI6MjA5NDcwMjAwNH0.9mlijBd57cKtso2acSSKnU2LKQFZ_sUEKuqtAguZk5o';
const EDGE_URL          = 'https://wnuwuxenzwfqmhxagryk.supabase.co/functions/v1';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── Helpers internos ───────────────────────────────────────────
async function uid() {
  return (await supabase.auth.getUser()).data.user?.id;
}
async function clinicaId() {
  const id = localStorage.getItem('tp_clinica_id');
  return id || null;
}

// ── Auth proxy (para Edge Functions) ──────────────────────────
export async function callEdge(fn, body) {
  const { data: { session } } = await supabase.auth.getSession();
  const headers = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_ANON_KEY,
  };
  if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;
  const res = await fetch(`${EDGE_URL}/${fn}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || `Edge function ${fn} failed`);
  return json;
}

// ── Sesión / perfil ────────────────────────────────────────────
export async function getPerfil() {
  const userId = await uid();
  if (!userId) return null;
  const { data } = await supabase.from('usuarios').select('*').eq('id', userId).single();
  return data;
}

// ── Pacientes ──────────────────────────────────────────────────
export async function getPacientes() {
  const cid = await clinicaId();
  const { data, error } = await supabase
    .from('pacientes')
    .select('*')
    .eq('clinica_id', cid)
    .order('apellido');
  if (error) throw error;
  return data;
}

export async function getPaciente(id) {
  const { data, error } = await supabase
    .from('pacientes')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function upsertPaciente(paciente) {
  const cid = await clinicaId();
  const { data, error } = await supabase
    .from('pacientes')
    .upsert({ ...paciente, clinica_id: cid })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ── Citas ──────────────────────────────────────────────────────
export async function getCitas(opts = {}) {
  const cid = await clinicaId();
  let q = supabase
    .from('citas')
    .select('*, pacientes(nombre, apellido, telefono), usuarios(nombre, apellido)')
    .eq('clinica_id', cid)
    .order('fecha').order('hora_inicio');
  if (opts.fecha)       q = q.eq('fecha', opts.fecha);
  if (opts.psicologoId) q = q.eq('psicologo_id', opts.psicologoId);
  if (opts.estado)      q = q.eq('estado', opts.estado);
  const { data, error } = await q;
  if (error) throw error;
  return data;
}

export async function upsertCita(cita) {
  const cid = await clinicaId();
  const { data, error } = await supabase
    .from('citas')
    .upsert({ ...cita, clinica_id: cid, updated_at: new Date().toISOString() })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ── Notas SOAP ─────────────────────────────────────────────────
export async function getNotasSOAP(pacienteId) {
  const { data, error } = await supabase
    .from('notas_soap')
    .select('*, usuarios(nombre, apellido)')
    .eq('paciente_id', pacienteId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function upsertNotaSOAP(nota) {
  const cid    = await clinicaId();
  const userId = await uid();
  const { data, error } = await supabase
    .from('notas_soap')
    .upsert({ ...nota, clinica_id: cid, psicologo_id: userId, updated_at: new Date().toISOString() })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ── Evaluaciones ───────────────────────────────────────────────
export async function getEvaluaciones(pacienteId) {
  const { data, error } = await supabase
    .from('evaluaciones')
    .select('*')
    .eq('paciente_id', pacienteId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function insertEvaluacion(evaluacion) {
  const cid = await clinicaId();
  const { data, error } = await supabase
    .from('evaluaciones')
    .insert({ ...evaluacion, clinica_id: cid })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getSolicitudesEscalas(pacienteId) {
  const { data, error } = await supabase
    .from('solicitudes_escalas')
    .select('*')
    .eq('paciente_id', pacienteId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function upsertSolicitudEscala(solicitud) {
  const cid = await clinicaId();
  const { data, error } = await supabase
    .from('solicitudes_escalas')
    .upsert({ ...solicitud, clinica_id: cid })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ── Ejercicios ─────────────────────────────────────────────────
export async function getEjercicios(pacienteId) {
  const { data, error } = await supabase
    .from('ejercicios')
    .select('*')
    .eq('paciente_id', pacienteId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function upsertEjercicio(ejercicio) {
  const cid    = await clinicaId();
  const userId = await uid();
  const { data, error } = await supabase
    .from('ejercicios')
    .upsert({ ...ejercicio, clinica_id: cid, psicologo_id: userId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ── Diario de ánimo ────────────────────────────────────────────
export async function getAnimo(pacienteId, dias = 30) {
  const desde = new Date();
  desde.setDate(desde.getDate() - dias);
  const { data, error } = await supabase
    .from('diario_animo')
    .select('*')
    .eq('paciente_id', pacienteId)
    .gte('fecha', desde.toISOString().split('T')[0])
    .order('fecha');
  if (error) throw error;
  return data;
}

export async function upsertAnimo(pacienteId, fecha, valor) {
  const { data, error } = await supabase
    .from('diario_animo')
    .upsert({ paciente_id: pacienteId, fecha, valor })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ── Informes IA ────────────────────────────────────────────────
export async function getInformes(pacienteId) {
  const { data, error } = await supabase
    .from('informes_ia')
    .select('*')
    .eq('paciente_id', pacienteId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function insertInforme(informe) {
  const cid    = await clinicaId();
  const userId = await uid();
  const { data, error } = await supabase
    .from('informes_ia')
    .insert({ ...informe, clinica_id: cid, psicologo_id: userId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ── Mensajes ───────────────────────────────────────────────────
export async function getMensajes(otroUsuarioId) {
  const userId = await uid();
  const { data, error } = await supabase
    .from('mensajes')
    .select('*, de:de_id(nombre, apellido)')
    .or(`and(de_id.eq.${userId},para_id.eq.${otroUsuarioId}),and(de_id.eq.${otroUsuarioId},para_id.eq.${userId})`)
    .order('created_at');
  if (error) throw error;
  await supabase.from('mensajes').update({ leido: true }).eq('para_id', userId).eq('de_id', otroUsuarioId);
  return data;
}

export async function enviarMensaje(paraId, texto) {
  const cid    = await clinicaId();
  const userId = await uid();
  const { error } = await supabase.from('mensajes').insert({ clinica_id: cid, de_id: userId, para_id: paraId, texto });
  if (error) throw error;
}

// ── Psicólogos ─────────────────────────────────────────────────
export async function getPsicologos() {
  const cid = await clinicaId();
  const { data, error } = await supabase
    .from('usuarios')
    .select('*')
    .eq('clinica_id', cid)
    .eq('rol', 'psicologo')
    .eq('activo', true)
    .order('apellido');
  if (error) throw error;
  return data;
}

// ── Lista de espera ────────────────────────────────────────────
export async function getListaEspera() {
  const cid = await clinicaId();
  const { data, error } = await supabase
    .from('lista_espera')
    .select('*, pacientes(nombre, apellido)')
    .eq('clinica_id', cid)
    .order('prioridad').order('created_at');
  if (error) throw error;
  return data;
}

// ── OpenAI (vía proxy) ─────────────────────────────────────────
export async function llamarOpenAI(messages, opts = {}) {
  return callEdge('openai-proxy', {
    model: opts.model || 'gpt-4o',
    temperature: opts.temperature ?? 0.7,
    max_tokens: opts.max_tokens,
    messages,
  });
}

// ── Daily.co (vía proxy) ───────────────────────────────────────
export async function crearSalaVideo(citaId) {
  const data = await callEdge('daily-proxy', {
    endpoint: 'rooms',
    method: 'POST',
    payload: {
      name: `serenecare-${citaId.substring(0, 8)}`,
      properties: { enable_chat: true, enable_knocking: true, max_participants: 2 },
    },
  });
  await supabase.from('citas').update({ sala_video_url: data.url }).eq('id', citaId);
  return data.url;
}
