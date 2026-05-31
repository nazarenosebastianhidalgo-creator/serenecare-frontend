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
