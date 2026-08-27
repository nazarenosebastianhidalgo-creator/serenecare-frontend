-- ═══════════════════════════════════════════════════════════════════
-- RGPD — Texto real de las plantillas de consentimiento  27/08/2026
-- ═══════════════════════════════════════════════════════════════════
-- Rellena las plantillas 'datos' y 'videollamada' (antes stub) con texto
-- BORRADOR completo. Sigue pendiente de validación por abogado de
-- protección de datos. [RESPONSABLE] se sustituye cuando se defina la
-- identidad legal (persona física / SereneCare Ltd). La 'terapeutico'
-- ya tenía texto completo.

update plantillas_consentimiento set texto =
'[BORRADOR — pendiente de validación por un abogado de protección de datos]

CONSENTIMIENTO PARA EL TRATAMIENTO DE DATOS DE CATEGORÍA ESPECIAL (SALUD)

Conforme al Reglamento (UE) 2016/679 (RGPD), art. 9, y a la Ley Orgánica 3/2018 (LOPDGDD), consiento de forma expresa e informada el tratamiento de mis datos personales de categoría especial —datos de salud, historia clínica, evaluaciones psicológicas y notas de sesión— en las siguientes condiciones:

1. Finalidad. Prestación de asistencia psicológica, seguimiento clínico, gestión de citas, comunicaciones relacionadas con mi tratamiento y cumplimiento de obligaciones legales sanitarias.

2. Base jurídica. Mi consentimiento explícito (art. 9.2.a RGPD) y la ejecución de la relación asistencial (art. 6.1.b RGPD).

3. Responsable y encargado. El responsable del tratamiento es mi centro o profesional. El soporte técnico lo presta la plataforma SereneCare (operada por [RESPONSABLE]) como encargado del tratamiento, mediante contrato de encargo (art. 28 RGPD) y medidas de seguridad conforme al art. 32 RGPD.

4. Confidencialidad. Mis datos están sujetos a secreto profesional y solo serán accesibles al personal autorizado. No se cederán a terceros salvo obligación legal o consentimiento adicional.

5. Conservación. Se conservarán durante la relación asistencial y, después, durante los plazos legalmente exigidos para la documentación clínica.

6. Derechos. Puedo ejercer mis derechos de acceso, rectificación, supresión, oposición, limitación y portabilidad ante mi centro o profesional, y reclamar ante la Agencia Española de Protección de Datos (AEPD).

He leído y comprendido esta información y presto mi consentimiento libre, específico e informado.'
where tipo = 'datos' and version = 'v1.0';

update plantillas_consentimiento set texto =
'[BORRADOR — pendiente de validación por un abogado de protección de datos]

AUTORIZACIÓN PARA SESIONES POR VIDEOLLAMADA (TELE-PSICOLOGÍA)

Conforme al RGPD y a la LOPDGDD, autorizo de forma expresa la realización de sesiones de asistencia psicológica por videollamada, en las siguientes condiciones:

1. Modalidad. Consiento recibir atención psicológica de forma telemática (videollamada), como alternativa o complemento a la presencial, entendiendo que su idoneidad la valora mi profesional.

2. Plataforma y datos técnicos. La videollamada se realiza a través de un proveedor técnico (p. ej. Daily.co), que trata los datos de conexión estrictamente necesarios para prestar el servicio, como encargado del tratamiento y con cifrado en tránsito.

3. Grabación. Las sesiones NO se graban. Cualquier grabación requeriría mi consentimiento específico y por escrito.

4. Confidencialidad y entorno. Me comprometo a conectarme desde un entorno privado y seguro. El profesional garantiza la confidencialidad en su lado conforme al secreto profesional.

5. Limitaciones. Comprendo que la modalidad online puede tener limitaciones técnicas (p. ej. cortes de conexión) y clínicas, y que ante una urgencia debo acudir a los servicios de emergencia (112).

6. Derechos. Puedo revocar esta autorización en cualquier momento y ejercer mis derechos RGPD ante mi centro o profesional, así como reclamar ante la AEPD.

He leído y comprendido esta información y presto mi autorización libre, específica e informada.'
where tipo = 'videollamada' and version = 'v1.0';
