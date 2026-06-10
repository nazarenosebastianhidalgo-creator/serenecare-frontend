# Deploy de Edge Functions y Recordatorios

## 1. Instalar Supabase CLI

```bash
npm install -g supabase
supabase login
supabase link --project-ref TU_PROJECT_REF
```

## 2. Configurar variables de entorno en Supabase

En el dashboard: **Project Settings → Edge Functions → Secrets**
O por CLI:

```bash
supabase secrets set STRIPE_SECRET_KEY=sk_test_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
supabase secrets set STRIPE_PRICE_BASICO=price_...
supabase secrets set STRIPE_PRICE_PROFESIONAL=price_...
supabase secrets set STRIPE_PRICE_ENTERPRISE=price_...
supabase secrets set RESEND_API_KEY=re_...
supabase secrets set FROM_EMAIL=citas@tu-dominio.com
supabase secrets set SITE_URL=https://tu-dominio.com
```

## 3. Desplegar las Edge Functions

```bash
supabase functions deploy stripe-checkout
supabase functions deploy stripe-webhook
supabase functions deploy stripe-portal
supabase functions deploy send-reminder
```

## 4. Configurar webhook en Stripe

1. Ir a **Stripe Dashboard → Developers → Webhooks**
2. Agregar endpoint: `https://TU_PROYECTO.supabase.co/functions/v1/stripe-webhook`
3. Seleccionar eventos:
   - `checkout.session.completed`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
4. Copiar el **Signing Secret** (`whsec_...`) → pegarlo como `STRIPE_WEBHOOK_SECRET`

## 5. Crear productos en Stripe

En **Stripe → Products**, crear 3 productos con sus precios recurrentes mensuales:
- **Básico** → $29.99/mes → copiar Price ID → `STRIPE_PRICE_BASICO`
- **Profesional** → $79.99/mes → copiar Price ID → `STRIPE_PRICE_PROFESIONAL`
- **Enterprise** → $199.99/mes → copiar Price ID → `STRIPE_PRICE_ENTERPRISE`

## 6. Activar recordatorios automáticos

Ejecutar el SQL de `recordatorios_cron.sql` en **Supabase → SQL Editor**:
1. Reemplazar `TU_PROYECTO` y `TU_SERVICE_ROLE_KEY`
2. Ejecutar el script completo

## 7. Configurar Resend

1. Crear cuenta en [resend.com](https://resend.com) (plan gratis: 3000 emails/mes)
2. Verificar tu dominio o usar el dominio de prueba de Resend
3. Crear API Key → pegarlo como `RESEND_API_KEY`

## 8. Probar sin Stripe (modo local)

Para probar el flujo de pagos sin Stripe real:
```bash
stripe listen --forward-to localhost:54321/functions/v1/stripe-webhook
```
Y usar tarjeta de prueba: `4242 4242 4242 4242`

---

# Stripe Connect — Cobros paciente → psicólogo ("Forma B")

Modelo: el **psicólogo es el comerciante de registro**. El dinero del paciente
entra DIRECTO en la cuenta Stripe del psicólogo (direct charge); la plataforma
solo cobra su comisión vía `application_fee_amount` (3% por defecto). En los
reembolsos se devuelve también la comisión (`refund_application_fee: true`).

## A. Activar Connect en Stripe
1. **Stripe Dashboard → Connect → Empezar**. Elegir plataforma con cuentas
   **Express**. Completar el perfil de la plataforma (nombre, soporte, etc.).

## B. Migración de base de datos
```bash
supabase db push     # aplica supabase/migrations/20260609000001_stripe_connect.sql
```
(o pegar ese SQL en **Supabase → SQL Editor**). Crea la tabla `facturas` y las
columnas `stripe_*` en `psicologos`.

## C. Secrets adicionales
```bash
supabase secrets set PLATFORM_FEE_PERCENT=3
supabase secrets set STRIPE_CONNECT_WEBHOOK_SECRET=whsec_...   # ver paso E
```
(`STRIPE_SECRET_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
`SUPABASE_ANON_KEY` y `SITE_URL` ya deberían estar configurados.)

## D. Desplegar las Edge Functions de Connect
```bash
supabase functions deploy stripe-connect-onboard
supabase functions deploy stripe-connect-status
supabase functions deploy stripe-cobro-sesion
supabase functions deploy stripe-reembolso
supabase functions deploy stripe-connect-webhook
```

## E. Webhook DEDICADO de Connect
1. **Stripe → Developers → Webhooks → Add endpoint**.
2. URL: `https://TU_PROYECTO.supabase.co/functions/v1/stripe-connect-webhook`
3. Marcar **"Listen to events on Connected accounts"** (eventos en cuentas conectadas).
4. Eventos:
   - `account.updated`
   - `checkout.session.completed`
   - `charge.refunded`
5. Copiar su **Signing Secret** → `STRIPE_CONNECT_WEBHOOK_SECRET`
   (¡es distinto del secreto del webhook de suscripciones!).

## F. Flujo de uso
- **Psicólogo**: *Integraciones → Stripe → "Activar cobros"* → completa el alta
  (KYC + cuenta bancaria) en la página alojada por Stripe. Al volver, el webhook
  `account.updated` marca `stripe_charges_enabled = true`.
- **Cobrar una sesión** (psicólogo o admin_clinica): *Facturación → Nueva factura*
  o desde la ficha del paciente. Se genera un enlace de **Stripe Checkout** que se
  envía al paciente. Al pagar, la factura pasa a `pagada`.
- **Reembolso**: botón *Reembolsar* en Facturación → devuelve importe + comisión.

## G. Pruebas (modo test)
```bash
stripe listen --forward-connect-to localhost:54321/functions/v1/stripe-connect-webhook
```
Tarjeta de prueba: `4242 4242 4242 4242`. Para el onboarding Express de prueba,
Stripe permite rellenar datos ficticios.
