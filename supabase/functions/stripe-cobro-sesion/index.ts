// ============================================================
// stripe-cobro-sesion
// Cobra una sesión al paciente como DIRECT CHARGE sobre la cuenta
// Stripe del psicólogo (modelo "Forma B"):
//   · El cargo se crea en la cuenta conectada del psicólogo → el dinero
//     es suyo y él es el comerciante de registro.
//   · application_fee_amount = comisión de la plataforma (3% por defecto).
//   · Los costes de procesamiento de Stripe los asume el psicólogo.
//
// Registra una factura en estado 'pendiente' y devuelve la URL de
// Stripe Checkout para enviársela al paciente.
//
// Llamadores: psicologo (cobra a sus pacientes) | admin_clinica (cobra
// en nombre de un psicólogo de su clínica, pasando psicologoId).
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
    const { pacienteId, sesionId } = body
    let { psicologoId, importe, concepto } = body

    if (!pacienteId) return Response.json({ error: 'Falta pacienteId' }, { status: 400, headers: CORS })

    // ── Resolver el psicólogo (cuenta que recibe el dinero) ──
    let pq = admin.from('psicologos')
      .select('id, nombre, email, clinica_id, stripe_account_id, stripe_charges_enabled')
      .eq('clinica_id', caller.clinica_id)
    if (caller.rol === 'admin_clinica') {
      if (!psicologoId) return Response.json({ error: 'Falta psicologoId' }, { status: 400, headers: CORS })
      pq = pq.eq('id', psicologoId)
    } else {
      pq = pq.eq('email', caller.email)
    }
    const { data: psico } = await pq.maybeSingle()
    if (!psico) return Response.json({ error: 'No se encontró la ficha de psicólogo' }, { status: 404, headers: CORS })
    psicologoId = psico.id

    if (!psico.stripe_account_id || !psico.stripe_charges_enabled) {
      return Response.json({
        error: 'El psicólogo todavía no ha completado el alta de cobros en Stripe.',
        code: 'STRIPE_NOT_READY',
      }, { status: 409, headers: CORS })
    }

    // ── Importe: del body, o del precio de la sesión ──
    if (importe == null && sesionId) {
      const { data: ses } = await admin.from('citas').select('precio').eq('id', sesionId).maybeSingle()
      importe = ses?.precio ?? null
    }
    importe = Number(importe)
    if (!importe || importe <= 0) {
      return Response.json({ error: 'Importe inválido' }, { status: 400, headers: CORS })
    }

    const unitAmount = Math.round(importe * 100)              // céntimos
    const feeAmount  = Math.round(unitAmount * (FEE_PERCENT / 100))

    // ── Datos del paciente (email para el recibo) ──
    const { data: paciente } = await admin.from('pacientes')
      .select('id, nombre, email').eq('id', pacienteId).maybeSingle()

    concepto = concepto || 'Sesión de terapia'

    // ── 1. Crear la factura en estado pendiente ──
    const { data: factura, error: facErr } = await admin.from('facturas').insert({
      clinica_id:        psico.clinica_id,
      psicologo_id:      psicologoId,
      paciente_id:       pacienteId,
      sesion_id:         sesionId ?? null,
      concepto,
      moneda:            'eur',
      importe,
      comision:          feeAmount / 100,
      estado:            'pendiente',
      stripe_account_id: psico.stripe_account_id,
    }).select('id').single()
    if (facErr) throw new Error('No se pudo crear la factura: ' + facErr.message)

    // ── 2. Crear la Checkout Session como DIRECT CHARGE en la cuenta del psicólogo ──
    // El 2º argumento { stripeAccount } hace que el cargo se cree en la cuenta conectada.
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{
        quantity: 1,
        price_data: {
          currency: 'eur',
          unit_amount: unitAmount,
          product_data: {
            name: concepto,
            description: psico.nombre ? `Profesional: ${psico.nombre}` : undefined,
          },
        },
      }],
      payment_intent_data: {
        application_fee_amount: feeAmount,
        description: concepto,
        metadata: { factura_id: factura.id, psicologo_id: psicologoId, paciente_id: pacienteId },
      },
      customer_email: paciente?.email ?? undefined,
      metadata: { factura_id: factura.id, psicologo_id: psicologoId, paciente_id: pacienteId },
      success_url: `${SITE_URL}/screens/historial_pagos.html?pago=ok&factura=${factura.id}`,
      cancel_url:  `${SITE_URL}/screens/historial_pagos.html?pago=cancelado&factura=${factura.id}`,
    }, {
      stripeAccount: psico.stripe_account_id,
    })

    // ── 3. Guardar referencias de Stripe en la factura ──
    await admin.from('facturas').update({
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id:   typeof session.payment_intent === 'string' ? session.payment_intent : null,
      checkout_url:               session.url,
      updated_at:                 new Date().toISOString(),
    }).eq('id', factura.id)

    return Response.json({
      url: session.url,
      facturaId: factura.id,
      importe,
      comision: feeAmount / 100,
    }, { headers: CORS })

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[stripe-cobro-sesion]', msg)
    return Response.json({ error: msg }, { status: 500, headers: CORS })
  }
})
