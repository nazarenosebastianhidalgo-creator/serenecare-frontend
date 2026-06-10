# SereneCare — Flywheel: Directorio + Agentes + Stripe

Mapa del modelo híbrido **SaaS + Marketplace**. Capa determinista (⚙️) vs capa IA (🧠).

---

## El volante de inercia

```
                    ┌──────────────────────────────────────────────┐
                    │                                              │
                    ▼                                              │
   1. Paciente busca en Google                                    │
      "psicólogo ansiedad Madrid"                                 │
                    │                                              │
       🧠 Agente SEO/contenido genera y                           │
          mantiene perfiles + blog                                │
                    │                                              │
                    ▼                                              │
   2. Aterriza en perfil público (SEO)        ⚙️ vista_directorio_publico
      /psicologo/sofia-palacios-madrid                            │
                    │                                              │
       🧠 Agente de MATCHING: "¿qué te trae                       │
          aquí?" → recomienda 3 psicólogos                        │
          (pgvector embedding + motivos)                          │
                    │                                              │
                    ▼                                              │
   3. Reserva online 24/7                      ⚙️ RPC huecos_libres_publicos
      (elige hueco libre)                      ⚙️ INSERT citas(origen='directorio')
                    │                                              │
                    ▼                                              │
   4. COBRO + reparto                          ⚙️ Stripe Connect (Forma B)
      application_fee = fee captación          ⚙️ citas.fee_aplicado_*
                    │                                              │
       🧠 Agente anti-no-show predice riesgo                      │
       ⚙️ Recordatorio WhatsApp/email (Brevo)                     │
                    │                                              │
                    ▼                                              │
   5. Sesión realizada                         ⚙️ telemedicina / presencial
                    │                                              │
       🧠 Agente CLÍNICO: SOAP auto, escalas,                     │
          transcripción (tu cuña diferencial)                     │
                    │                                              │
                    ▼                                              │
   6. Reseña verificada                        ⚙️ resenas (cita_id cerrada)
      (solo pacientes con cita real)                              │
                    │                                              │
       más reseñas → mejor rating → mejor ───────────────────────┘
       ranking SEO → más tráfico (vuelve a 1, amplificado)
```

---

## Las 3 patas de ingreso

```
┌─────────────────────────────┬──────────────────────┬─────────────────────┐
│ 1. Suscripción SaaS          │ 2. Fee directorio    │ 3. Reserva suelta   │
│    (recurrente, predecible)  │    (captación que TÚ │    (paciente propio)│
│                              │     generas)         │                     │
│  citas.origen = interna      │  origen=directorio   │  origen=interna     │
│  → fee 0                     │  → fee 5-15%         │  → fee 0 / simbólico │
│                              │  (Stripe app_fee)    │                     │
└─────────────────────────────┴──────────────────────┴─────────────────────┘
         Todo cobrado y repartido por el MISMO Stripe Connect ya montado.
```

---

## Capa determinista (⚙️) vs Agentes (🧠) — la línea roja

| Función | Capa | Por qué |
|---|---|---|
| Crear la cita | ⚙️ código + `citas` | Fiabilidad total |
| Cobrar y repartir fee | ⚙️ Stripe Connect | Dinero = nunca IA en el camino |
| Recordatorios | ⚙️ Brevo / WhatsApp | Workflow simple |
| Reglas de acceso a datos clínicos | ⚙️ RLS Supabase | Seguridad = nunca IA |
| **Matching paciente↔psicólogo** | 🧠 agente | Criterio que el filtro no tiene |
| **Contenido SEO / perfiles / blog** | 🧠 agente | Escala el flywheel |
| **Nurturing de leads** | 🧠 agente | Lenguaje + timing |
| **Predicción de no-show** | 🧠 agente | Patrón sobre histórico |
| **SOAP / escalas / transcripción** | 🧠 agente clínico | Diferenciador core |

> Regla: **nunca un LLM en el camino crítico de cobrar o reservar.**

---

## Reutiliza lo que YA tienes

- ✅ `citas` unificadas (modelo único)
- ✅ Stripe Connect Forma B + comisión (= el motor del fee)
- ✅ Onboarding/invitación de pacientes
- ✅ Brevo + 5 agentes Python en Railway (base para agentes SEO/nurturing)
- 🆕 Falta: vista pública + perfiles SEO + buscador + RPC de huecos

---

## Orden temporal

1. Construir el flywheel (perfiles + reservas) → tarda meses en traer tráfico SEO.
2. Encender el fee de directorio SOLO cuando haya reservas reales de directorio.
3. No cobrar fee antes de aportar el valor (paciente nuevo) o los psicólogos lo ven como impuesto.
