import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')              ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
)

const RESEND_API_KEY  = Deno.env.get('RESEND_API_KEY') ?? ''
const FROM_EMAIL      = Deno.env.get('FROM_EMAIL') ?? 'citas@therapeutic-perspective.com'
const CRON_SECRET     = Deno.env.get('CRON_SECRET') ?? ''

// ── Enviar email con Resend ─────────────────────────────────────
async function enviarEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  if (!RESEND_API_KEY) {
    console.log(`[RESEND-MOCK] Para: ${to} | Asunto: ${subject}`)
    return
  }

  const res = await fetch('https://api.resend.com/emails', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RESEND_API_KEY}` },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('Resend error:', err)
  }
}

// ── Template de email ───────────────────────────────────────────
function templateRecordatorio({
  nombrePaciente, nombrePsicologo, fecha, horaInicio, tipo, clinicaNombre, salaUrl
}: Record<string, string>) {
  const esTele = tipo === 'telemedicina'
  return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"/><style>
  body { font-family: 'Inter', Arial, sans-serif; background: #f8fafb; margin: 0; padding: 40px 20px; }
  .card { background: white; border-radius: 24px; max-width: 500px; margin: 0 auto; padding: 40px; box-shadow: 0 4px 24px rgba(41,103,119,0.08); }
  .logo { font-size: 28px; font-weight: 800; color: #296777; margin-bottom: 8px; }
  .badge { display: inline-block; padding: 4px 14px; border-radius: 99px; font-size: 13px; font-weight: 700; margin-bottom: 24px; }
  .badge-tele { background: #b2ecfd; color: #195968; }
  .badge-pres { background: #d7fde4; color: #2f503f; }
  h2 { font-size: 22px; color: #2c3436; margin: 0 0 8px; }
  p  { color: #596063; font-size: 15px; line-height: 1.6; margin: 0 0 12px; }
  .info-box { background: #f0f4f6; border-radius: 16px; padding: 20px; margin: 24px 0; }
  .info-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
  .info-label { color: #596063; font-weight: 500; }
  .info-value { color: #2c3436; font-weight: 700; }
  .btn { display: block; text-align: center; padding: 16px 32px; background: linear-gradient(135deg,#296777,#195a6a); color: white; text-decoration: none; border-radius: 16px; font-weight: 700; font-size: 16px; margin-top: 28px; }
  .footer { text-align: center; color: #acb3b6; font-size: 12px; margin-top: 32px; }
</style></head>
<body>
  <div class="card">
    <div class="logo">🧠 Therapeutic Perspective</div>
    <span class="badge ${esTele ? 'badge-tele' : 'badge-pres'}">${esTele ? '📹 Telemedicina' : '🏥 Presencial'}</span>
    <h2>Recordatorio de cita</h2>
    <p>Hola <strong>${nombrePaciente}</strong>, te recordamos que mañana tenés una sesión programada.</p>
    <div class="info-box">
      <div class="info-row"><span class="info-label">Psicólogo/a</span><span class="info-value">Dr. ${nombrePsicologo}</span></div>
      <div class="info-row"><span class="info-label">Fecha</span><span class="info-value">${fecha}</span></div>
      <div class="info-row"><span class="info-label">Hora</span><span class="info-value">${horaInicio}</span></div>
      <div class="info-row"><span class="info-label">Modalidad</span><span class="info-value">${esTele ? 'Videollamada' : 'Presencial'}</span></div>
      <div class="info-row"><span class="info-label">Clínica</span><span class="info-value">${clinicaNombre}</span></div>
    </div>
    ${esTele && salaUrl ? `<a href="${salaUrl}" class="btn">🎥 Unirse a la sesión</a>` : ''}
    <p style="margin-top:24px;font-size:13px;">Si necesitás cancelar o reprogramar, contactá a tu psicólogo con al menos 24 horas de anticipación.</p>
    <div class="footer">${clinicaNombre} · Powered by Therapeutic Perspective</div>
  </div>
</body>
</html>`
}

// ── Handler principal ───────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin':  'https://serenecare-app.vercel.app',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-cron-secret',
      },
    })
  }

  // Solo se puede llamar con el secret del cron (protege contra abuso externo)
  const incomingSecret = req.headers.get('x-cron-secret') ?? ''
  if (!CRON_SECRET || incomingSecret !== CRON_SECRET) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const manana = new Date()
    manana.setDate(manana.getDate() + 1)
    const fechaManana = manana.toISOString().split('T')[0]

    // Obtener todas las citas de mañana confirmadas o pendientes
    const { data: citas, error } = await supabase
      .from('citas')
      .select(`
        id, fecha, hora_inicio, tipo, sala_video_url,
        pacientes(nombre, apellido, email),
        usuarios(nombre, apellido),
        clinicas(nombre)
      `)
      .eq('fecha', fechaManana)
      .in('estado', ['confirmada', 'pendiente'])

    if (error) throw error

    console.log(`📅 Citas mañana (${fechaManana}): ${citas?.length ?? 0}`)

    let enviados = 0
    let errores  = 0

    for (const cita of (citas ?? [])) {
      const emailPaciente = cita.pacientes?.email
      if (!emailPaciente) { errores++; continue }

      const nombrePaciente  = `${cita.pacientes?.nombre} ${cita.pacientes?.apellido}`
      const nombrePsicologo = `${cita.usuarios?.nombre} ${cita.usuarios?.apellido}`
      const fecha           = new Date(cita.fecha + 'T00:00:00').toLocaleDateString('es-AR', {
        weekday: 'long', day: 'numeric', month: 'long',
      })

      try {
        await enviarEmail({
          to:      emailPaciente,
          subject: `Recordatorio: sesión mañana a las ${cita.hora_inicio.substring(0, 5)}`,
          html:    templateRecordatorio({
            nombrePaciente,
            nombrePsicologo,
            fecha,
            horaInicio: cita.hora_inicio.substring(0, 5),
            tipo:       cita.tipo,
            clinicaNombre: cita.clinicas?.nombre ?? '',
            salaUrl:    cita.sala_video_url ?? '',
          }),
        })

        // Registrar en tabla recordatorios
        await supabase.from('recordatorios').insert({
          clinica_id:  cita.clinicas?.id,
          cita_id:     cita.id,
          paciente_id: cita.pacientes?.id,
          canal:       'email',
          mensaje:     `Recordatorio cita ${cita.fecha} ${cita.hora_inicio}`,
          enviado:     true,
          fecha_envio: new Date().toISOString(),
        })

        enviados++
      } catch (e) {
        console.error(`Error enviando a ${emailPaciente}:`, e)
        errores++
      }
    }

    return Response.json({
      ok:       true,
      fecha:    fechaManana,
      total:    citas?.length ?? 0,
      enviados,
      errores,
    }, { headers: { 'Access-Control-Allow-Origin': '*' } })

  } catch (err) {
    console.error('send-reminder error:', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
})
