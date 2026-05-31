import Stripe from 'https://esm.sh/stripe@14?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno'

const stripe       = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', { apiVersion: '2024-04-10' })
const WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? ''

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')               ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')  ?? '',
)

// Mapeo de Price ID → nombre del plan + ID en la tabla planes
async function obtenerPlanId(priceId: string): Promise<string | null> {
  const nombrePlan = priceId.includes('basico') ? 'Basico'
    : priceId.includes('profesional') ? 'Profesional'
    : priceId.includes('enterprise')  ? 'Enterprise'
    : null
  if (!nombrePlan) return null
  const { data } = await supabase.from('planes').select('id').eq('nombre', nombrePlan).single()
  return data?.id ?? null
}

Deno.serve(async (req) => {
  const signature = req.headers.get('stripe-signature')
  const body      = await req.text()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature ?? '', WEBHOOK_SECRET)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return new Response('Webhook error', { status: 400 })
  }

  try {
    switch (event.type) {

      // Pago exitoso → activar clínica y asignar plan
      case 'checkout.session.completed': {
        const session   = event.data.object as Stripe.Checkout.Session
        const clinicaId = session.metadata?.clinicaId
        const plan      = session.metadata?.plan
        if (!clinicaId) break

        const planId = await obtenerPlanId(plan ?? '')
        await supabase.from('clinicas').update({
          status:             'activa',
          plan_id:            planId,
          updated_at:         new Date().toISOString(),
        }).eq('id', clinicaId)

        // Guardar stripe_customer_id y subscription_id para futuras operaciones
        await supabase.from('clinicas').update({
          config_ia: supabase.rpc('jsonb_set_safe', {
            target: 'config_ia',
            path:   '{stripe}',
            value:  JSON.stringify({
              customer_id:     session.customer,
              subscription_id: session.subscription,
            }),
          }),
        }).eq('id', clinicaId)

        console.log(`✅ Clínica ${clinicaId} activada con plan ${plan}`)
        break
      }

      // Suscripción cancelada → suspender clínica
      case 'customer.subscription.deleted': {
        const sub       = event.data.object as Stripe.Subscription
        const clinicaId = sub.metadata?.clinicaId
        if (!clinicaId) break

        await supabase.from('clinicas').update({
          status:     'suspendida',
          updated_at: new Date().toISOString(),
        }).eq('id', clinicaId)

        console.log(`⚠️  Clínica ${clinicaId} suspendida por cancelación`)
        break
      }

      // Pago fallido → notificar (no suspender aún, Stripe reintenta)
      case 'invoice.payment_failed': {
        const invoice   = event.data.object as Stripe.Invoice
        const sub       = await stripe.subscriptions.retrieve(invoice.subscription as string)
        const clinicaId = sub.metadata?.clinicaId
        if (!clinicaId) break
        console.log(`💳 Pago fallido para clínica ${clinicaId}`)
        break
      }

      // Renovación exitosa → mantener activa
      case 'invoice.paid': {
        const invoice   = event.data.object as Stripe.Invoice
        const sub       = await stripe.subscriptions.retrieve(invoice.subscription as string)
        const clinicaId = sub.metadata?.clinicaId
        if (!clinicaId) break

        await supabase.from('clinicas').update({
          status:     'activa',
          updated_at: new Date().toISOString(),
        }).eq('id', clinicaId)
        break
      }
    }
  } catch (err) {
    console.error('Error procesando webhook:', err)
    return new Response('Error interno', { status: 500 })
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
