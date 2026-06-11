# Contrato de Encargado del Tratamiento (DPA) — art. 28 RGPD

> **BORRADOR técnico — no es asesoría legal.** Revisar antes de usar con clínicas reales. Versión: v1.0 · Fecha: 2026-06-11.

## Partes

- **RESPONSABLE del tratamiento:** la **Clínica** que contrata SereneCare (en adelante, "la Clínica"), identificada en su registro de alta (razón social, NIF, domicilio y email de contacto facilitados en el formulario de registro).
- **ENCARGADO del tratamiento:** **[RESPONSABLE]** — [persona física con NIE `[NIE]`] / [`SereneCare Ltd`, company number `[COMPANY_NO]`, domicilio `[DOMICILIO]`], titular del servicio **SereneCare** (en adelante, "el Encargado").

Ambas partes reconocen que, en la prestación del servicio SereneCare, el Encargado trata datos personales de pacientes **por cuenta de la Clínica**. Este contrato regula ese tratamiento conforme al art. 28 del Reglamento (UE) 2016/679 (RGPD).

## 1. Objeto y duración
El Encargado tratará los datos personales necesarios para prestar el servicio SereneCare (gestión de agenda, historia clínica y notas, evaluaciones, telemedicina, consentimientos, mensajería y apoyo de IA). El tratamiento durará mientras esté vigente la relación de servicio entre las partes. La descripción detallada figura en el **Anexo I**.

## 2. Instrucciones del Responsable
El Encargado tratará los datos **únicamente siguiendo instrucciones documentadas** de la Clínica (incluido el uso de la plataforma conforme a su finalidad). No usará los datos de pacientes para fines propios. Si una instrucción infringe la normativa de protección de datos, el Encargado lo informará.

## 3. Obligaciones del Encargado
- **Confidencialidad:** mantener la confidencialidad de los datos, también tras finalizar el contrato. El personal autorizado se compromete a la confidencialidad.
- **Seguridad (art. 32):** aplicar las medidas técnicas y organizativas del **Anexo II** (cifrado, aislamiento multi-tenant, control de acceso por rol, registro de accesos, copias de seguridad).
- **Asistencia a la Clínica:** ayudar a atender las solicitudes de los pacientes (acceso, rectificación, supresión, portabilidad, oposición) y a cumplir los arts. 32-36 (seguridad, brechas, evaluaciones de impacto).
- **Notificación de brechas (art. 33):** comunicar a la Clínica sin dilación indebida cualquier violación de seguridad de la que tenga conocimiento, con la información disponible.
- **Supresión o devolución:** al finalizar el servicio, y a elección de la Clínica, devolver o suprimir los datos de pacientes, salvo obligación legal de conservación.

## 4. Subencargados
La Clínica **autoriza de forma general** al Encargado a recurrir a los subencargados listados en `subencargados.md` (Anexo III) para prestar el servicio. El Encargado:
- Impondrá a cada subencargado obligaciones de protección equivalentes a las de este contrato.
- Informará a la Clínica de cualquier alta o baja de subencargados, dándole un plazo razonable para **oponerse** por motivos justificados.
- Responde ante la Clínica del cumplimiento de los subencargados.

## 5. Transferencias internacionales
Algunos subencargados están fuera del EEE (ver Anexo III). Dichas transferencias se amparan en las **Cláusulas Contractuales Tipo** de la Comisión Europea (art. 46 RGPD) u otra garantía adecuada. El almacenamiento principal de datos se realiza en la UE (Supabase, Frankfurt).

## 6. Demostración de cumplimiento
El Encargado pondrá a disposición de la Clínica la información necesaria para demostrar el cumplimiento de este contrato y permitirá auditorías razonables (incluida la entrega de su documentación de seguridad), con preaviso y sin comprometer la seguridad de otras clínicas.

## 7. Responsabilidad
Cada parte responde de los daños que cause por incumplimiento de la normativa que le corresponda según su rol. Nada en este contrato exime a la Clínica de sus obligaciones como responsable (p. ej., obtener el consentimiento de sus pacientes).

## 8. Duración y finalización
Este contrato es accesorio al contrato de servicio y termina con él. A su finalización se aplica la cláusula 3 (supresión/devolución).

---

## Anexo I — Descripción del tratamiento
- **Categorías de interesados:** pacientes de la Clínica.
- **Categorías de datos:** identificativos, contacto y **datos de salud (categoría especial, art. 9)**.
- **Finalidad:** prestación del servicio de gestión clínica descrito. Detalle en `RAT.md` (Parte 2).
- **Naturaleza:** almacenamiento, organización, consulta, comunicación y apoyo de IA.

## Anexo II — Medidas de seguridad
Las descritas en `RAT.md` (sección "Medidas de seguridad"): RLS multi-tenant, cifrado en tránsito y reposo, control de acceso por rol y re-verificación de sesión, registro de accesos (`logs_acceso`), proxies con JWT y rate limiting para IA/vídeo, consentimientos versionados con hash, copias de seguridad y minimización hacia la IA.

## Anexo III — Subencargados
Los listados en `subencargados.md`, que forma parte de este contrato.

---

## Aceptación (clickwrap)
La Clínica acepta este Contrato de Encargado del Tratamiento **al marcar la casilla correspondiente y completar su registro** en SereneCare. Se registrará la **fecha/hora**, la **versión del documento (v1.0)** y la **identificación de la Clínica** como prueba de aceptación, con plena validez conforme al art. 28.9 RGPD (formato electrónico).
