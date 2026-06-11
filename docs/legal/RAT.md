# Registro de Actividades de Tratamiento (RAT) — art. 30 RGPD

> **BORRADOR técnico — no es asesoría legal.** Revisar antes de usar. Fecha: 2026-06-11. Versión: v1.0.
> **Responsable:** **[RESPONSABLE]** — persona física con NIE `[NIE]` (caducado, pendiente de regularizar) **o** `SereneCare Ltd`, company number `[COMPANY_NO]`, domicilio `[DOMICILIO]`.
> **Contacto privacidad:** `[EMAIL_PRIVACIDAD]`. DPO: no designado (valorar; ver nota final).

SereneCare actúa con **doble rol**:
- **RESPONSABLE** (art. 30.1) de los datos de sus propios usuarios profesionales, marketing/captación y facturación.
- **ENCARGADO** (art. 30.2) de los datos de pacientes, que trata **por cuenta de cada clínica** (responsable).

---

## PARTE 1 — Actividades como RESPONSABLE (art. 30.1)

### 1.1 Gestión de cuentas de usuarios profesionales
- **Fin:** prestación del servicio SaaS, autenticación, control de acceso y soporte.
- **Interesados:** personal de las clínicas (admin de clínica, psicólogos, secretarios/as).
- **Categorías de datos:** identificativos (nombre, apellidos), contacto (email, teléfono), credenciales (contraseña cifrada), rol y clínica, registros de actividad.
- **Base jurídica:** ejecución del contrato (art. 6.1.b).
- **Destinatarios:** subencargados de hosting/infra (ver `subencargados.md`).
- **Transferencias internacionales:** sí (hosting EE. UU.) → SCC.
- **Plazo de supresión:** durante la relación contractual + plazos legales aplicables tras la baja.

### 1.2 Captación y marketing (lista de espera + prospección B2B)
- **Fin:** dar a conocer el producto y captar clínicas. Incluye los **agentes automatizados** (cazador de leads, copywriter, emisor, nurturing).
- **Interesados:** suscriptores de la lista de espera; clínicas/profesionales prospecto.
- **Categorías de datos:** nombre, email, teléfono; datos públicos de la clínica (obtenidos de fuentes públicas tipo Google Maps: nombre, ciudad, web, valoraciones).
- **Base jurídica:** consentimiento para la lista de espera (art. 6.1.a); interés legítimo para la prospección B2B (art. 6.1.f) — **requiere registro del juicio de ponderación** y opción de oposición/baja en cada email.
- **Destinatarios:** Brevo (envío), Supabase (almacenamiento), Groq (generación de borradores).
- **Transferencias internacionales:** sí (Groq, EE. UU.) → SCC.
- **Plazo de supresión:** hasta baja o ejercicio del derecho de oposición; revisar leads inactivos periódicamente.

### 1.3 Facturación y cobro de suscripciones
- **Fin:** cobrar la suscripción (29 €/mes por plaza) y cumplir obligaciones fiscales.
- **Interesados:** administrador/titular de cada clínica.
- **Categorías de datos:** identificativos y de facturación (tratados por Lemon Squeezy como Merchant of Record).
- **Base jurídica:** ejecución del contrato (art. 6.1.b) y obligación legal (art. 6.1.c, fiscal).
- **Destinatarios:** Lemon Squeezy (MoR).
- **Transferencias internacionales:** sí (EE. UU.) → SCC.
- **Plazo de supresión:** plazos de conservación fiscal aplicables.

---

## PARTE 2 — Actividades como ENCARGADO (art. 30.2)

### 2.1 Alojamiento y procesamiento de datos clínicos por cuenta de las clínicas
- **Responsables (clientes):** cada clínica usuaria de SereneCare (relación de cada una en el sistema; el DPA se firma con cada una).
- **Tratamientos realizados por cuenta del responsable:** almacenamiento y gestión de agenda; historia clínica y notas SOAP; evaluaciones psicométricas (PHQ-9, GAD-7); telemedicina; gestión y firma de consentimientos; mensajería con pacientes (email/WhatsApp); apoyo de IA a la redacción clínica.
- **Categorías de interesados:** pacientes de las clínicas.
- **Categorías de datos:** identificativos, contacto y **datos de categoría especial — salud (art. 9)**.
- **Destinatarios / subencargados:** ver `subencargados.md` (Supabase, Railway, Daily.co, OpenAI, Anthropic, Brevo, Meta/WhatsApp, Google Calendar, Sentry).
- **Transferencias internacionales:** sí (varios subencargados en EE. UU.) → SCC. Almacenamiento principal en la UE (Supabase eu-central-1).
- **Supresión:** según instrucciones del responsable; a la finalización del contrato, devolución o supresión de los datos.

---

## Medidas de seguridad (art. 32) — resumen

- **Aislamiento multi-tenant** mediante Row Level Security (RLS) en Supabase: cada clínica solo accede a sus datos.
- **Cifrado** en tránsito (TLS/HTTPS) y en reposo (Supabase).
- **Control de acceso por rol** y re-verificación de sesión en cada pantalla; acceso a datos clínicos restringido al personal autorizado.
- **Registro de accesos** a datos clínicos (audit log `logs_acceso`: lecturas y escrituras con actor real).
- **Proxies con JWT y rate limiting** para las APIs de IA y vídeo (las claves no se exponen al cliente).
- **Consentimientos versionados** con snapshot del texto firmado y hash de integridad (SHA-256).
- **Copias de seguridad** gestionadas por Supabase.
- **Minimización** hacia la IA: enviar el mínimo de datos identificativos necesarios.

---

## Notas y pendientes para el responsable
- **DPO:** no obligatorio automáticamente, pero el tratamiento a gran escala de datos de salud puede requerirlo (art. 37.1.c). Revisar al crecer.
- **DPIA / EVI (art. 35):** **recomendable** por tratarse de datos de salud a escala. Hacerla con la herramienta gratuita de la AEPD *Gestiona EVI*.
- **Representante en la UE (art. 27):** si el responsable se constituye fuera de la UE (p. ej. `SereneCare Ltd` en UK) y se dirige a clínicas en España/UE, valorar designar representante en la UE.
- **Juicio de ponderación** del interés legítimo (actividad 1.2): documentarlo aparte.
- Mantener este RAT actualizado cuando cambien los tratamientos o los subencargados.
