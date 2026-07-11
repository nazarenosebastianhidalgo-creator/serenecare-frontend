// ============================================================
// stripe-reembolso-cita
// Reembolsa el pago de una CITA (flujo recepción, sin login) cuando se
// cancela. Se asegura con el token_gestion de la cita (service-role).
// Devuelve también la comisión (refund_application_fee: true).
// Si la cita no está pagada, no hace nada (ok:false, note).
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
    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )
    const { token } = await req.json().catch(() => ({}))
    if (!token) return Response.json({ error: 'Falta token' }, { status: 400, headers: CORS })

    const { data: cita } = await admin.from('citas').select('id, factura_id').eq('token_gestion', token).maybeSingle()
    if (!cita?.factura_id) return Response.json({ ok: false, note: 'sin pago' }, { headers: CORS })

    const { data: factura } = await admin.from('facturas').select('*').eq('id', cita.factura_id).maybeSingle()
    if (!factura || factura.estado !== 'pagada') return Response.json({ ok: false, note: 'no pagada' }, { headers: CORS })
    if (!factura.stripe_account_id) return Response.json({ ok: false, note: 'sin cuenta' }, { headers: CORS })

    const reqOpts = { stripeAccount: factura.stripe_account_id }
    let pi = factura.stripe_payment_intent_id
    if (!pi && factura.stripe_checkout_session_id) {
      const sess = await stripe.checkout.sessions.retrieve(factura.stripe_checkout_session_id, reqOpts)
      pi = typeof sess.payment_intent === 'string' ? sess.payment_intent : null
    }
    if (!pi) return Response.json({ ok: false, note: 'sin payment_intent' }, { headers: CORS })

    const refund = await stripe.refunds.create({ payment_intent: pi, refund_application_fee: true }, reqOpts)
    await admin.from('facturas').update({
      estado: 'reembolsada', stripe_refund_id: refund.id,
      fecha_reembolso: new Date().toISOString(), updated_at: new Date().toISOString(),
    }).eq('id', factura.id)

    return Response.json({ ok: true, refundId: refund.id }, { headers: CORS })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[stripe-reembolso-cita]', msg)
    return Response.json({ error: msg }, { status: 500, headers: CORS })
  }
})
