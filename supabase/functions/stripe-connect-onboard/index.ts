// ============================================================
// stripe-connect-onboard
// Crea (o recupera) la cuenta Stripe Connect Express del psicólogo
// y devuelve un AccountLink para que complete el onboarding/KYC.
//
// "Forma B": el psicólogo es el comerciante de registro → cuenta propia.
// Llamadores permitidos:
//   · psicologo      → onboard de SU propia cuenta
//   · admin_clinica  → onboard de cualquier psicólogo de su clínica (pasa psicologoId)
// ============================================================
import Stripe from 'https://esm.sh/stripe@14?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno'

const stripe   = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', { apiVersion: '2024-04-10' })
const SITE_URL = Deno.env.get('SITE_URL') ?? Deno.env.get('FRONTEND_URL') ?? 'https://serenecare-app.vercel.app'

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    if (!authHeader) return Response.json({ error: 'No autorizado' }, { status: 401, headers: CORS })

    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )
    const asUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    )

    const { data: { user }, error: userErr } = await asUser.auth.getUser()
    if (userErr || !user) return Response.json({ error: 'Sesión inválida' }, { status: 401, headers: CORS })

    const { data: caller } = await admin
      .from('usuarios')
      .select('rol, clinica_id, email, nombre')
      .eq('id', user.id)
      .single()

    if (!caller || !['psicologo', 'admin_clinica'].includes(caller.rol)) {
      return Response.json({ error: 'Sin permisos' }, { status: 403, headers: CORS })
    }

    const body = await req.json().catch(() => ({}))
    const psicologoId: string | undefined = body.psicologoId

    // Resolver el psicólogo destino dentro de la clínica del llamador
    let q = admin.from('psicologos')
      .select('id, nombre, email, clinica_id, stripe_account_id')
      .eq('clinica_id', caller.clinica_id)

    if (caller.rol === 'admin_clinica') {
      if (!psicologoId) {
        return Response.json({ error: 'Falta psicologoId' }, { status: 400, headers: CORS })
      }
      q = q.eq('id', psicologoId)
    } else {
      // psicólogo: su propia ficha clínica se localiza por email
      q = q.eq('email', caller.email)
    }

    const { data: psico, error: psicoErr } = await q.maybeSingle()
    if (psicoErr || !psico) {
      return Response.json({ error: 'No se encontró la ficha de psicólogo' }, { status: 404, headers: CORS })
    }

    // 1. Crear cuenta Express si aún no existe
    let accountId = psico.stripe_account_id
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        country: body.country ?? 'ES',
        email: psico.email ?? caller.email,
        business_type: 'individual',
        capabilities: {
          card_payments: { requested: true },
          transfers:     { requested: true },
        },
        business_profile: {
          mcc: '8011', // Doctors / Médicos
          product_description: 'Sesiones de psicología y terapia',
        },
        metadata: { psicologo_id: psico.id, clinica_id: psico.clinica_id },
      })
      accountId = account.id

      await admin.from('psicologos')
        .update({ stripe_account_id: accountId })
        .eq('id', psico.id)
    }

    // 2. Generar AccountLink de onboarding
    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${SITE_URL}/screens/integraciones_psicologo.html?stripe=refresh`,
      return_url:  `${SITE_URL}/screens/integraciones_psicologo.html?stripe=ok`,
      type: 'account_onboarding',
    })

    return Response.json({ url: link.url, accountId }, { headers: CORS })

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[stripe-connect-onboard]', msg)
    return Response.json({ error: msg }, { status: 500, headers: CORS })
  }
})
