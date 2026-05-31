import Stripe from 'https://esm.sh/stripe@14?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno'

const stripe     = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', { apiVersion: '2024-04-10' })
const SITE_URL   = Deno.env.get('SITE_URL') ?? 'http://localhost:3000'
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''

// Mapeo de planes a Price IDs de Stripe (configurar en el dashboard de Stripe)
const PLANES_STRIPE: Record<string, string> = {
  basico:       Deno.env.get('STRIPE_PRICE_BASICO')       ?? '',
  profesional:  Deno.env.get('STRIPE_PRICE_PROFESIONAL')  ?? '',
  enterprise:   Deno.env.get('STRIPE_PRICE_ENTERPRISE')   ?? '',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin':  '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })
  }

  // Verificar JWT del usuario
  const authHeader = req.headers.get('authorization');
  if (!authHeader) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const supabaseAuth = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
  if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { plan, clinicaId, email } = await req.json()

    if (!plan || !clinicaId) {
      return Response.json({ error: 'Faltan parámetros: plan y clinicaId son requeridos.' }, { status: 400 })
    }

    const priceId = PLANES_STRIPE[plan.toLowerCase()]
    if (!priceId) {
      return Response.json({ error: `Plan "${plan}" no encontrado en Stripe.` }, { status: 400 })
    }

    const session = await stripe.checkout.sessions.create({
      mode:          'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: email,
      metadata:      { clinicaId, plan },
      success_url:   `${SITE_URL}/screens/saas_revenue.html?session_id={CHECKOUT_SESSION_ID}&success=1`,
      cancel_url:    `${SITE_URL}/screens/saas_revenue.html?cancelled=1`,
      subscription_data: {
        metadata: { clinicaId, plan },
      },
    })

    return Response.json({ url: session.url }, {
      headers: { 'Access-Control-Allow-Origin': '*' },
    })
  } catch (err) {
    console.error('stripe-checkout error:', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
})
