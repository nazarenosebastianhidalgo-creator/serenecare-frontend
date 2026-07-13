-- ═══════════════════════════════════════════════════════════════════
-- Línea de crisis por clínica (SOS del paciente)  13/07/2026
-- ═══════════════════════════════════════════════════════════════════
-- El número de crisis depende del país de la clínica. En vez de mantener
-- nosotros una tabla de números (arriesgado), cada clínica configura el suyo
-- en el registro/config. El SOS del paciente muestra el de su clínica.
-- Las clínicas existentes son españolas → se rellenan con 024/112.

alter table clinicas add column if not exists telefono_crisis      text;
alter table clinicas add column if not exists telefono_emergencias text;

-- Backfill de las clínicas actuales (mercado España) con los números oficiales
update clinicas
  set telefono_crisis      = coalesce(telefono_crisis, '024'),
      telefono_emergencias = coalesce(telefono_emergencias, '112')
  where telefono_crisis is null or telefono_emergencias is null;
