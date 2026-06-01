import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno'

const CORS = {
  'Access-Control-Allow-Origin':  'https://serenecare-app.vercel.app',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey',
}

const FRONTEND_URL = 'https://serenecare-app.vercel.app'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS })
  }

  try {
    // Verificar sesión del llamador
    const authHeader = req.headers.get('Authorization') ?? ''
    if (!authHeader) {
      return Response.json({ error: 'No autorizado' }, { status: 401, headers: CORS })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    )

    const { data: { user }, error: userErr } = await supabaseUser.auth.getUser()
    if (userErr || !user) {
      return Response.json({ error: 'Sesión inválida' }, { status: 401, headers: CORS })
    }

    // Verificar rol del llamador
    const { data: caller } = await supabaseAdmin
      .from('usuarios')
      .select('rol, clinica_id')
      .eq('id', user.id)
      .single()

    const rolesPermitidos = ['psicologo', 'secretario', 'admin_clinica', 'super_admin']
    if (!caller || !rolesPermitidos.includes(caller.rol)) {
      return Response.json({ error: 'Sin permisos' }, { status: 403, headers: CORS })
    }

    const body = await req.json()
    const { nombre, apellido = '', email, telefono = '' } = body
    const clinicaId = caller.clinica_id

    if (!nombre || !email) {
      return Response.json({ error: 'nombre y email son requeridos' }, { status: 400, headers: CORS })
    }

    // 1. Invitar usuario — Supabase envía el email con el link de activación
    const redirectTo = `${FRONTEND_URL}/screens/registro_paciente.html`
    const { data: authData, error: inviteErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo,
      data: { nombre, apellido, clinica_id: clinicaId, rol: 'paciente' },
    })

    if (inviteErr && !inviteErr.message.toLowerCase().includes('already')) {
      throw inviteErr
    }

    // Obtener userId (recién creado o ya existente)
    let userId = authData?.user?.id
    if (!userId) {
      const { data: list } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
      userId = list?.users?.find((u: { email: string }) => u.email === email)?.id
    }
    if (!userId) throw new Error('No se pudo obtener el ID del usuario')

    // 2. Crear registro en usuarios si no existe
    const { data: existingUser } = await supabaseAdmin
      .from('usuarios')
      .select('id')
      .eq('id', userId)
      .single()

    if (!existingUser) {
      const { error: usuErr } = await supabaseAdmin.from('usuarios').insert({
        id:         userId,
        clinica_id: clinicaId,
        nombre,
        apellido,
        email,
        rol:        'paciente',
        activo:     true,
      })
      if (usuErr) console.error('Error insertando usuarios:', usuErr.message)
    }

    // 3. Crear registro en pacientes si no existe
    const { data: existingPac } = await supabaseAdmin
      .from('pacientes')
      .select('id')
      .eq('email', email)
      .eq('clinica_id', clinicaId)
      .maybeSingle()

    let pacienteId = existingPac?.id
    if (!existingPac) {
      const { data: newPac, error: pacErr } = await supabaseAdmin.from('pacientes').insert({
        clinica_id:  clinicaId,
        usuario_id:  userId,
        nombre,
        apellido,
        email,
        telefono,
      }).select('id').single()

      if (pacErr) throw new Error('No se pudo crear el paciente: ' + pacErr.message)
      pacienteId = newPac?.id
    }

    console.log(`[invitar-paciente] Paciente invitado: ${email} → clinica ${clinicaId}`)

    return Response.json({ ok: true, userId, pacienteId }, { headers: CORS })

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[invitar-paciente] Error:', msg)
    return Response.json({ error: msg }, { status: 500, headers: CORS })
  }
})
