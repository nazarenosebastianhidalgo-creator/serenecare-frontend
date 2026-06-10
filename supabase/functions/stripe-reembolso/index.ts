// ============================================================
// stripe-reembolso
// Reembolsa una factura pagada (Opción 1: se devuelve también la
// comisión de la plataforma → refund_application_fee: true).
// El reembolso se ejecuta sobre la cuenta conectada del psicólogo.
//
// Llamadores: psicologo (sus propias facturas) | admin_clinica (de su clínica).
// ============================================================
import Stripe from 'https://esm.sh/stripe@14?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', { apiVersion: '2024-04-10' })

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
      .from('usuarios').select('rol, clinica_id, email').eq('id', user.id).single()
    if (!caller || !['psicologo', 'admin_clinica'].includes(caller.rol)) {
      return Response.json({ error: 'Sin permisos' }, { status: 403, headers: CORS })
    }

    const { facturaId } = await req.json().catch(() => ({}))
    if (!facturaId) return Response.json({ error: 'Falta facturaId' }, { status: 400, headers: CORS })

    const { data: factura } = await admin.from('facturas')
      .select('*').eq('id', facturaId).maybeSingle()
    if (!factura) return Response.json({ error: 'Factura no encontrada' }, { status: 404, headers: CORS })

    // ── Autorización por clínica / propiedad ──
    if (factura.clinica_id !== caller.clinica_id) {
      return Response.json({ error: 'Sin permisos sobre esta factura' }, { status: 403, headers: CORS })
    }
    if (caller.rol === 'psicologo') {
      const { data: psico } = await admin.from('psicologos')
        .select('id').eq('clinica_id', caller.clinica_id).eq('email', caller.email).maybeSingle()
      if (!psico || psico.id !== factura.psicologo_id) {
        return Response.json({ error: 'Solo puedes reembolsar tus propias facturas' }, { status: 403, headers: CORS })
      }
    }

    if (factura.estado !== 'pagada') {
      return Response.json({ error: `No se puede reembolsar una factura en estado "${factura.estado}"` }, { status: 409, headers: CORS })
    }
    if (!factura.stripe_account_id) {
      return Response.json({ error: 'Factura sin cuenta Stripe asociada' }, { status: 409, headers: CORS })
    }

    const reqOpts = { stripeAccount: factura.stripe_account_id }

    // ── Asegurar payment_intent (lo rellena el webhook; si faltara, lo recuperamos) ──
    let paymentIntent = factura.stripe_payment_intent_id
    if (!paymentIntent && factura.stripe_checkout_session_id) {
      const sess = await stripe.checkout.sessions.retrieve(factura.stripe_checkout_session_id, reqOpts)
      paymentIntent = typeof sess.payment_intent === 'string' ? sess.payment_intent : null
    }
    if (!paymentIntent) {
      return Response.json({ error: 'No se encontró el pago a reembolsar' }, { status: 409, headers: CORS })
    }

    // ── Reembolso con devolución de comisión (Opción 1) ──
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntent,
      refund_application_fee: true,
    }, reqOpts)

    await admin.from('facturas').update({
      estado:          'reembolsada',
      stripe_refund_id: refund.id,
      fecha_reembolso: new Date().toISOString(),
      updated_at:      new Date().toISOString(),
    }).eq('id', factura.id)

    return Response.json({ ok: true, refundId: refund.id }, { headers: CORS })

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[stripe-reembolso]', msg)
    return Response.json({ error: msg }, { status: 500, headers: CORS })
  }
})
