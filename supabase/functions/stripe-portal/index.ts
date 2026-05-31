import Stripe from 'https://esm.sh/stripe@14?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno'

const stripe   = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', { apiVersion: '2024-04-10' })
const SITE_URL = Deno.env.get('SITE_URL') ?? 'http://localhost:3000'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')              ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
)

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
    const { clinicaId } = await req.json()

    // Obtener stripe customer_id guardado en config_ia
    const { data: clinica } = await supabase
      .from('clinicas').select('config_ia').eq('id', clinicaId).single()

    const customerId = clinica?.config_ia?.stripe?.customer_id
    if (!customerId) {
      return Response.json({ error: 'Esta clínica no tiene suscripción activa en Stripe.' }, { status: 400 })
    }

    const session = await stripe.billingPortal.sessions.create({
      customer:   customerId,
      return_url: `${SITE_URL}/screens/saas_revenue.html`,
    })

    return Response.json({ url: session.url }, {
      headers: { 'Access-Control-Allow-Origin': '*' },
    })
  } catch (err) {
    console.error('stripe-portal error:', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
})
