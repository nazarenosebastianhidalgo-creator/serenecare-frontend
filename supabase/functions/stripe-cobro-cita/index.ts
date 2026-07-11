// ============================================================
// stripe-cobro-cita
// Crea el link de pago para una CITA reservada desde la recepción IA,
// SIN que el paciente tenga cuenta. Se asegura con el token_gestion de
// la cita (no requiere JWT). Cargo directo sobre la cuenta Stripe del
// psicólogo (Forma B), igual que stripe-cobro-sesion.
//   token → cita → psicólogo (cuenta conectada) → factura + Checkout.
// El webhook (checkout.session.completed) marca la factura pagada;
// el backend (poller) crea la sala Daily y manda el link de sesión.
// ============================================================
import Stripe from 'https://esm.sh/stripe@14?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno'

const stripe   = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', { apiVersion: '2024-04-10' })
const SITE_URL = Deno.env.get('SITE_URL') ?? Deno.env.get('FRONTEND_URL') ?? 'https://serenecare-app.vercel.app'
const FEE_PERCENT = parseFloat(Deno.env.get('PLATFORM_FEE_PERCENT') ?? '3')

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

    // ── Cita por su token (secreto no adivinable) ──
    const { data: cita } = await admin.from('citas')
      .select('id, psicologo_id, paciente_id, clinica_id, precio, estado, fecha, hora_inicio, factura_id')
      .eq('token_gestion', token).maybeSingle()
    if (!cita) return Response.json({ error: 'Cita no encontrada' }, { status: 404, headers: CORS })
    if (cita.estado === 'cancelada') return Response.json({ error: 'La cita fue cancelada' }, { status: 409, headers: CORS })

    // ── Psicólogo que recibe el dinero ──
    const { data: psico } = await admin.from('psicologos')
      .select('id, nombre, stripe_account_id, stripe_charges_enabled')
      .eq('id', cita.psicologo_id).maybeSingle()
    if (!psico) return Response.json({ error: 'Psicólogo no encontrado' }, { status: 404, headers: CORS })
    if (!psico.stripe_account_id || !psico.stripe_charges_enabled) {
      return Response.json({ error: 'El profesional aún no tiene los cobros activos.', code: 'STRIPE_NOT_READY' }, { status: 409, headers: CORS })
    }

    // ── Importe: precio de la cita, o precio_sesion de la config ──
    let importe = Number(cita.precio)
    if (!importe || importe <= 0) {
      const { data: cfg } = await admin.from('recepcion_config').select('precio_sesion').eq('psicologo_id', cita.psicologo_id).maybeSingle()
      importe = Number(cfg?.precio_sesion)
    }
    if (!importe || importe <= 0) return Response.json({ error: 'La sesión no tiene precio configurado' }, { status: 400, headers: CORS })

    const unitAmount = Math.round(importe * 100)
    const feeAmount  = Math.round(unitAmount * (FEE_PERCENT / 100))

    const { data: paciente } = await admin.from('pacientes').select('id, nombre, email').eq('id', cita.paciente_id).maybeSingle()
    const concepto = 'Sesión de terapia'

    // ── 1. Factura pendiente (enlazada a la cita vía sesion_id) ──
    const { data: factura, error: facErr } = await admin.from('facturas').insert({
      clinica_id: cita.clinica_id, psicologo_id: cita.psicologo_id, paciente_id: cita.paciente_id,
      sesion_id: cita.id, concepto, moneda: 'eur', importe, comision: feeAmount / 100,
      estado: 'pendiente', stripe_account_id: psico.stripe_account_id,
    }).select('id').single()
    if (facErr) throw new Error('No se pudo crear la factura: ' + facErr.message)

    // ── 2. Checkout como cargo directo en la cuenta del psicólogo ──
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{
        quantity: 1,
        price_data: { currency: 'eur', unit_amount: unitAmount, product_data: { name: concepto, description: psico.nombre ? `Profesional: ${psico.nombre}` : undefined } },
      }],
      payment_intent_data: {
        application_fee_amount: feeAmount, description: concepto,
        metadata: { factura_id: factura.id, cita_id: cita.id, psicologo_id: cita.psicologo_id, paciente_id: cita.paciente_id },
      },
      customer_email: paciente?.email ?? undefined,
      metadata: { factura_id: factura.id, cita_id: cita.id, psicologo_id: cita.psicologo_id, paciente_id: cita.paciente_id },
      success_url: `${SITE_URL}/screens/pago_ok.html?cita=${cita.id}`,
      cancel_url:  `${SITE_URL}/screens/pago_ok.html?cancelado=1&cita=${cita.id}`,
    }, { stripeAccount: psico.stripe_account_id })

    // ── 3. Guardar refs en factura + enlazar en la cita ──
    await admin.from('facturas').update({
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id:   typeof session.payment_intent === 'string' ? session.payment_intent : null,
      checkout_url: session.url, updated_at: new Date().toISOString(),
    }).eq('id', factura.id)
    await admin.from('citas').update({ factura_id: factura.id }).eq('id', cita.id)

    return Response.json({ url: session.url, facturaId: factura.id, importe }, { headers: CORS })

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[stripe-cobro-cita]', msg)
    return Response.json({ error: msg }, { status: 500, headers: CORS })
  }
})
