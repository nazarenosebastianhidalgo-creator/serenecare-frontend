-- ═══════════════════════════════════════════════════════════════════
-- RGPD — Canal de derechos del PACIENTE  11/06/2026
-- ═══════════════════════════════════════════════════════════════════
-- El paciente puede solicitar sus derechos (copia/borrado) desde su portal.
-- Reutiliza solicitudes_rgpd (la clínica las ve en su centro de Compliance).

alter table solicitudes_rgpd add column if not exists paciente_id uuid;

-- El paciente gestiona (crea/lee) solo sus propias solicitudes
drop policy if exists solicitudes_rgpd_paciente on solicitudes_rgpd;
create policy solicitudes_rgpd_paciente on solicitudes_rgpd for all using (
  paciente_id in (select id from pacientes where usuario_id = auth.uid())
) with check (
  paciente_id in (select id from pacientes where usuario_id = auth.uid())
);
