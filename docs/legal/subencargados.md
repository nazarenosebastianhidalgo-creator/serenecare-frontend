# Lista de subencargados del tratamiento (sub-procesadores)

> **BORRADOR técnico — no es asesoría legal.** Revisar antes de publicar. Fecha: 2026-06-11.
> Responsable del tratamiento: **[RESPONSABLE]** (pendiente de fijar: persona física con NIE `[NIE]`, o `SereneCare Ltd` — empresa UK con company number `[COMPANY_NO]`).

Esta lista identifica a los terceros (encargados / sub-encargados) que tratan datos por cuenta de SereneCare. Es obligatoria para la Política de Privacidad (art. 13-14 RGPD), el RAT (art. 30) y el contrato de encargado (DPA, art. 28) que cada clínica firma con SereneCare.

**Leyenda transferencia internacional:** EEE = dentro del Espacio Económico Europeo (sin transferencia). SCC = transferencia a tercer país amparada en Cláusulas Contractuales Tipo de la Comisión Europea (art. 46 RGPD). Marcar ✅ cuando el DPA/SCC del proveedor esté firmado/aceptado.

## A. Subencargados que tratan datos de pacientes (categoría especial — salud, art. 9)

| Subencargado | Servicio / finalidad | Datos tratados | Ubicación | Transferencia | DPA |
|---|---|---|---|---|---|
| **Supabase Inc.** | Base de datos y autenticación. Almacena pacientes, citas, notas SOAP, evaluaciones, consentimientos. | Identificativos, contacto, datos de salud | Proyecto en **eu-central-1 (Frankfurt, Alemania)** | **EEE** (almacenamiento en UE) | ☐ |
| **Railway Corp.** | Hosting del backend (Express) y los agentes. Procesa datos en tránsito. | Todos (en procesamiento) | EE. UU. | SCC | ☐ |
| **Daily.co (Daily)** | Videollamadas de telemedicina. | Vídeo/audio de la sesión (salud) | EE. UU. | SCC + cifrado E2E | ☐ |
| **OpenAI, L.L.C.** | IA: generación de notas SOAP y asistente. (API; no se entrena con los datos) | Texto clínico (salud) | EE. UU. | SCC | ☐ |
| **Anthropic, PBC** | IA: procesamiento de texto clínico (backend usa `@anthropic-ai/sdk`). | Texto clínico (salud) | EE. UU. | SCC | ☐ |
| **Sendinblue (Brevo)** | Emails transaccionales: invitaciones, recordatorios, firma de consentimientos. | Nombre, email, contexto de cita | **Francia** | **EEE** | ☐ |
| **Meta Platforms Ireland** | WhatsApp Cloud API: recordatorios y mensajería con pacientes. | Teléfono, contenido del mensaje | Irlanda / EE. UU. | SCC | ☐ |
| **Google LLC** | Google Calendar (sincronización de agenda del profesional). | Datos de cita (puede incluir nombre paciente) | EE. UU. | SCC | ☐ |
| **Functional Software (Sentry)** | Monitorización de errores del backend. | Posibles datos en trazas de error (configurar scrubbing de PII) | EE. UU. | SCC | ☐ |

## B. Subencargados que NO tratan datos de pacientes (cuentas, marketing, pagos)

| Subencargado | Servicio / finalidad | Datos tratados | Ubicación | Transferencia |
|---|---|---|---|---|
| **Vercel Inc.** | Hosting del frontend (app web). | Datos de uso de la app (no almacena PHI) | EE. UU. | SCC |
| **Netlify Inc.** | Hosting de la landing / lista de espera. | Email de la lista de espera | EE. UU. | SCC |
| **Lemon Squeezy LLC** (Merchant of Record) | Cobros y facturación de las clínicas. Actúa como responsable propio de los datos fiscales. | Datos de facturación del admin de la clínica | EE. UU. | SCC |
| **Groq, Inc.** | IA de los agentes de captación (genera borradores de email a clínicas prospecto). | Datos de leads (clínicas públicas), no pacientes | EE. UU. | SCC |
| **Google (Analytics) / Microsoft (Clarity)** | Analítica de la landing. | Datos de navegación (anonimizables) | EE. UU. | SCC |

## Notas para el responsable
- **Punto sensible:** Daily.co, OpenAI y Anthropic tratan **datos de salud en EE. UU.** → asegurar SCC firmadas y minimizar lo que se les envía (p. ej., no mandar identificadores directos a la IA cuando se pueda evitar).
- **Almacenamiento principal en la UE** (Supabase eu-central-1): es un punto fuerte de cumplimiento, mantenerlo.
- Configurar **Sentry** para no capturar PII en los logs de error.
- Cada vez que se añada/quite un proveedor, actualizar esta lista, la Política de Privacidad y notificar a las clínicas (lo exige el DPA).
- Verificar y archivar el **DPA/SCC de cada proveedor** (casi todos los tienen públicos en su web) y marcar la casilla ☐ cuando esté hecho.
