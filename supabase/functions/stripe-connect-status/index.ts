// ============================================================
// stripe-connect-status
// Devuelve el estado de la cuenta Stripe Connect del psicólogo.
//   · psicologo                 → su propio estado (refresca desde Stripe)
//   · admin_clinica + psicologoId → estado de ese psicólogo (refresca desde Stripe)
//   · admin_clinica (sin id)    → lista de psicólogos de la clínica con su estado (desde BD)
// El webhook account.updated mantiene los flags de BD al día.
// ============================================================
import Stripe from 'https://esm.sh/stripe@14?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', { apiVersion: '2024-04-10' })

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey',
}

async function syncDesdeStripe(admin: ReturnType<typeof createClient>, psico: any) {
  if (!psico.stripe_account_id) {
    return { conectado: false, charges_enabled: false, details_submitted: false, payouts_enabled: false }
  }
  const acct = await stripe.accounts.retrieve(psico.stripe_account_id)
  const estado = {
    conectado: true,
    charges_enabled:   acct.charges_enabled,
    details_submitted: acct.details_submitted,
    payouts_enabled:   acct.payouts_enabled,
  }
  await admin.from('psicologos').update({
    stripe_charges_enabled:   estado.charges_enabled,
    stripe_payouts_enabled:   estado.payouts_enabled,
    stripe_details_submitted: estado.details_submitted,
    stripe_onboarding_at: estado.details_submitted ? new Date().toISOString() : psico.stripe_onboarding_at,
  }).eq('id', psico.id)
  return estado
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
      .from('usuarios').select('rol, clinica_id, email').eq('id', user.id).single()

    if (!caller || !['psicologo', 'admin_clinica'].includes(caller.rol)) {
      return Response.json({ error: 'Sin permisos' }, { status: 403, headers: CORS })
    }

    const body = await req.json().catch(() => ({}))
    const psicologoId: string | undefined = body.psicologoId

    // ── Modo lista (admin sin psicologoId): estado de toda la clínica desde BD ──
    if (caller.rol === 'admin_clinica' && !psicologoId) {
      const { data: lista } = await admin.from('psicologos')
        .select('id, nombre, email, stripe_account_id, stripe_charges_enabled, stripe_details_submitted, stripe_payouts_enabled')
        .eq('clinica_id', caller.clinica_id)
        .order('nombre')
      const psicologos = (lista ?? []).map((p) => ({
        id: p.id, nombre: p.nombre, email: p.email,
        conectado: !!p.stripe_account_id,
        charges_enabled: !!p.stripe_charges_enabled,
        details_submitted: !!p.stripe_details_submitted,
        payouts_enabled: !!p.stripe_payouts_enabled,
      }))
      return Response.json({ psicologos }, { headers: CORS })
    }

    // ── Modo individual: refrescar desde Stripe ──
    let q = admin.from('psicologos')
      .select('id, nombre, email, clinica_id, stripe_account_id, stripe_onboarding_at')
      .eq('clinica_id', caller.clinica_id)

    if (caller.rol === 'admin_clinica') q = q.eq('id', psicologoId)
    else                                q = q.eq('email', caller.email)

    const { data: psico } = await q.maybeSingle()
    if (!psico) return Response.json({ error: 'No se encontró la ficha de psicólogo' }, { status: 404, headers: CORS })

    const estado = await syncDesdeStripe(admin, psico)
    return Response.json({ psicologoId: psico.id, ...estado }, { headers: CORS })

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[stripe-connect-status]', msg)
    return Response.json({ error: msg }, { status: 500, headers: CORS })
  }
})
