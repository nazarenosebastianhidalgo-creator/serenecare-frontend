// ============================================================
// stripe-connect-webhook
// Webhook DEDICADO a eventos de Stripe Connect (cuentas conectadas).
// Configurar en Stripe como endpoint "Connect" (eventos en cuentas
// conectadas) con su propio secreto: STRIPE_CONNECT_WEBHOOK_SECRET.
//
// Eventos:
//   · account.updated            → sincroniza el estado del alta del psicólogo
//   · checkout.session.completed → marca la factura como pagada
//   · charge.refunded            → marca la factura como reembolsada
//                                  (cubre reembolsos hechos desde el panel de Stripe)
// ============================================================
import Stripe from 'https://esm.sh/stripe@14?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', { apiVersion: '2024-04-10' })
const WEBHOOK_SECRET = Deno.env.get('STRIPE_CONNECT_WEBHOOK_SECRET') ?? ''

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
)

Deno.serve(async (req) => {
  const signature = req.headers.get('stripe-signature')
  const bodyText  = await req.text()

  let event: Stripe.Event
  try {
    // constructEventAsync → necesario en Deno (crypto asíncrono)
    event = await stripe.webhooks.constructEventAsync(bodyText, signature ?? '', WEBHOOK_SECRET)
  } catch (err) {
    console.error('[connect-webhook] firma inválida:', err)
    return new Response('Webhook error', { status: 400 })
  }

  try {
    switch (event.type) {

      // ── Alta / cambios de la cuenta conectada del psicólogo ──
      case 'account.updated': {
        const acct = event.data.object as Stripe.Account
        await supabase.from('psicologos').update({
          stripe_charges_enabled:   acct.charges_enabled,
          stripe_payouts_enabled:   acct.payouts_enabled,
          stripe_details_submitted: acct.details_submitted,
          stripe_onboarding_at:     acct.details_submitted ? new Date().toISOString() : null,
        }).eq('stripe_account_id', acct.id)
        console.log(`[connect-webhook] account.updated ${acct.id} charges=${acct.charges_enabled}`)
        break
      }

      // ── Pago del paciente completado → factura pagada ──
      case 'checkout.session.completed': {
        const session   = event.data.object as Stripe.Checkout.Session
        const facturaId  = session.metadata?.factura_id
        if (!facturaId) break
        await supabase.from('facturas').update({
          estado:                   'pagada',
          stripe_payment_intent_id: typeof session.payment_intent === 'string' ? session.payment_intent : null,
          fecha_pago:               new Date().toISOString(),
          updated_at:               new Date().toISOString(),
        }).eq('id', facturaId)
        console.log(`[connect-webhook] factura ${facturaId} pagada`)

        // Si es una cita de recepción: crear la sala Daily (el poller del backend manda el email).
        const citaId = session.metadata?.cita_id
        if (citaId) {
          try {
            const dk = Deno.env.get('DAILY_KEY')
            if (dk) {
              const rr = await fetch('https://api.daily.co/v1/rooms', {
                method: 'POST', headers: { Authorization: `Bearer ${dk}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ properties: { exp: Math.floor(Date.now() / 1000) + 30 * 864e2 } }),
              })
              const rd = await rr.json()
              if (rd.url) await supabase.from('citas').update({ sala_video_url: rd.url }).eq('id', citaId)
              console.log(`[connect-webhook] sala Daily para cita ${citaId}: ${rd.url || rd.error}`)
            }
          } catch (e) { console.error('[connect-webhook] daily room:', e) }
        }
        break
      }

      // ── Reembolso (también si se hace desde el panel de Stripe) ──
      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge
        const pi = typeof charge.payment_intent === 'string' ? charge.payment_intent : null
        if (!pi) break
        await supabase.from('facturas').update({
          estado:          'reembolsada',
          fecha_reembolso: new Date().toISOString(),
          updated_at:      new Date().toISOString(),
        }).eq('stripe_payment_intent_id', pi).neq('estado', 'reembolsada')
        console.log(`[connect-webhook] charge.refunded pi=${pi}`)
        break
      }
    }
  } catch (err) {
    console.error('[connect-webhook] error procesando evento:', err)
    return new Response('Error interno', { status: 500 })
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
