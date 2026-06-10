# SereneCare — Esquema de datos: Directorio público + Matching

> **Fase 0** (hacer ya, sin desviarse del pre-launch): añadir/confirmar estos campos
> al guardar el perfil del psicólogo, para no migrar después. La construcción del
> directorio en sí es post-launch.
>
> Multitenant: todo cuelga de `clinica_id` salvo lo marcado como **cross-tenant**.

---

## 1. Extender tabla `psicologos` (campos que ya tiene + nuevos públicos)

Ya existentes en `perfil_psicologo.html`: nombre, apellido, email, teléfono, dirección,
especialidad principal, nº colegiado, años experiencia, idiomas, biografía,
duración sesión, intervalo, máx sesiones/día, anticipación reservas.

Nuevos campos para alimentar **directorio + matching**:

```sql
alter table psicologos add column if not exists slug              text unique;        -- URL pública: /psicologo/sofia-palacios-madrid
alter table psicologos add column if not exists publicado         boolean default false; -- el psicólogo decide aparecer en el directorio
alter table psicologos add column if not exists foto_url          text;
alter table psicologos add column if not exists ciudad            text;
alter table psicologos add column if not exists provincia         text;
alter table psicologos add column if not exists pais              text default 'ES';
alter table psicologos add column if not exists lat               numeric;            -- SEO local / "cerca de mí"
alter table psicologos add column if not exists lng               numeric;
alter table psicologos add column if not exists modalidad         text[];             -- {'online','presencial'}
alter table psicologos add column if not exists precio_sesion     numeric;            -- desde X €
alter table psicologos add column if not exists primera_gratis    boolean default false;
alter table psicologos add column if not exists acepta_reserva_online boolean default true;
alter table psicologos add column if not exists meta_titulo       text;               -- SEO override opcional
alter table psicologos add column if not exists meta_descripcion  text;
alter table psicologos add column if not exists rating_promedio   numeric default 0;  -- desnormalizado de reseñas
alter table psicologos add column if not exists num_resenas       int default 0;
alter table psicologos add column if not exists embedding         vector(1536);       -- pgvector, para matching semántico
```

---

## 2. Catálogos de matching (cross-tenant, compartidos)

Lo que DocFav NO tiene: filtrar por **enfoque terapéutico** y **motivo de consulta**.

```sql
-- Enfoques: TCC, EMDR, sistémica, psicoanálisis, humanista, gestalt, ACT...
create table if not exists enfoques_terapeuticos (
  id    serial primary key,
  slug  text unique not null,
  nombre text not null
);

-- Motivos de consulta: ansiedad, depresión, duelo, pareja, TCA, TOC, trauma, autoestima...
create table if not exists motivos_consulta (
  id    serial primary key,
  slug  text unique not null,
  nombre text not null,
  categoria text   -- agrupador para la UI
);

-- Poblaciones que atiende: adultos, adolescentes, infantil, parejas, familias, LGTBIQ+...
create table if not exists poblaciones (
  id serial primary key,
  slug text unique not null,
  nombre text not null
);
```

### Relaciones N:N psicólogo ↔ catálogos

```sql
create table if not exists psicologo_enfoques (
  psicologo_id uuid references psicologos(id) on delete cascade,
  enfoque_id   int  references enfoques_terapeuticos(id),
  primary key (psicologo_id, enfoque_id)
);

create table if not exists psicologo_motivos (
  psicologo_id uuid references psicologos(id) on delete cascade,
  motivo_id    int  references motivos_consulta(id),
  primary key (psicologo_id, motivo_id)
);

create table if not exists psicologo_poblaciones (
  psicologo_id uuid references psicologos(id) on delete cascade,
  poblacion_id int  references poblaciones(id),
  primary key (psicologo_id, poblacion_id)
);
```

---

## 3. Reseñas verificadas (solo con cita real cerrada)

```sql
create table if not exists resenas (
  id            uuid primary key default gen_random_uuid(),
  psicologo_id  uuid references psicologos(id) on delete cascade,
  cita_id       uuid references citas(id),          -- garantiza reseña verificada
  paciente_id   uuid references pacientes(id),
  clinica_id    uuid references clinicas(id),
  puntuacion    int  check (puntuacion between 1 and 5),
  comentario    text,
  publicada     boolean default false,             -- moderación
  created_at    timestamptz default now(),
  unique (cita_id)                                 -- 1 reseña por cita
);
```

> Trigger sugerido: al insertar/actualizar reseña publicada → recalcular
> `psicologos.rating_promedio` y `num_resenas` (desnormalizado para listados rápidos).

---

## 4. ⭐ Origen de la reserva (clave para el FEE por origen)

Esto es lo que conecta el modelo híbrido SaaS + marketplace. Marca de dónde vino
cada cita para aplicar `application_fee` distinto en Stripe Connect.

```sql
alter table citas add column if not exists origen text default 'interna'
  check (origen in ('interna','directorio','portal_paciente','recurrente'));
--   interna        = el psicólogo/clínica la creó (paciente propio)   -> fee 0 / bajo
--   directorio     = vino del marketplace público SereneCare          -> fee de captación
--   portal_paciente= paciente ya existente reservó desde su portal      -> fee 0
--   recurrente     = cita de seguimiento generada automáticamente       -> fee 0

alter table citas add column if not exists fee_aplicado_pct  numeric default 0;
alter table citas add column if not exists fee_aplicado_eur  numeric default 0;
alter table citas add column if not exists stripe_payment_intent text;
```

### Tabla de atribución (de dónde llegó el paciente del directorio)

```sql
create table if not exists atribucion_directorio (
  id            uuid primary key default gen_random_uuid(),
  cita_id       uuid references citas(id),
  psicologo_id  uuid references psicologos(id),
  utm_source    text,
  utm_campaign  text,
  landing_slug  text,             -- qué perfil/landing convirtió
  primer_contacto timestamptz,    -- cuándo vio el perfil por 1ª vez
  created_at    timestamptz default now()
);
```

---

## 5. Disponibilidad pública (huecos reservables sin login)

El directorio necesita leer huecos libres **sin** exponer datos de otras citas.
Resolver con una **vista/RPC** que solo devuelve slots libres, nunca PHI.

```sql
-- RPC de ejemplo: huecos libres de un psicólogo publicado en un rango
create or replace function huecos_libres_publicos(p_slug text, p_desde date, p_hasta date)
returns table (inicio timestamptz, fin timestamptz)
language sql security definer set search_path = public as $$
  -- ... calcula slots según horario del psicólogo menos citas ocupadas ...
  -- NUNCA devuelve paciente_id, motivo ni nada clínico
$$;
```

---

## 6. RLS — reglas mínimas

| Tabla | Lectura pública (anon) | Escritura |
|---|---|---|
| `psicologos` (solo columnas públicas) | ✅ **solo** `publicado = true` | dueño / admin clínica |
| `enfoques/motivos/poblaciones` | ✅ catálogo abierto | super admin |
| `resenas` | ✅ **solo** `publicada = true` | trigger desde cita cerrada |
| `citas` | ❌ nunca anon | staff con `clinica_id` (RLS ya existente) |
| `atribucion_directorio` | ❌ | sistema |

> ⚠️ Exponer `psicologos` a `anon` exige una **vista pública** con solo las columnas
> seguras (`vista_directorio_publico`), NO la tabla entera. Nunca exponer email/teléfono
> privado, colegiado interno, etc. salvo lo que el psicólogo marque como visible.

---

## 7. Índices para que el buscador vuele

```sql
create index if not exists idx_psico_ciudad   on psicologos(ciudad) where publicado;
create index if not exists idx_psico_rating    on psicologos(rating_promedio desc) where publicado;
create index if not exists idx_psico_slug      on psicologos(slug);
create index if not exists idx_psico_embedding on psicologos using ivfflat (embedding vector_cosine_ops); -- matching IA
```

---

## Orden de implementación

1. **Fase 0 (ya):** columnas en `psicologos` + `citas.origen`. Sin UI nueva, solo capturar.
2. **Fase 1 (post-launch):** vista pública + perfil individual + RPC de huecos + reserva → `citas(origen='directorio')`.
3. **Fase 2 (masa crítica):** catálogos de matching + reseñas + buscador + SEO (sitemap, schema.org).
4. **Fase 3:** `embedding` + agente de matching semántico + blog.
