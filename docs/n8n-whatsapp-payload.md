# Payload recomendado para n8n / WhatsApp

n8n debe llamar la Edge Function `upsert-lead` cada vez que detecte uno de estos eventos:

- Primer mensaje: etapa `Contactos nuevos`.
- Pregunta por disponibilidad, fechas u horarios: etapa `Preguntaron por fechas`.
- Cita confirmada: etapa `Cita agendada` y campo `appointmentAt`.

```json
{
  "companyId": "UUID_DE_LA_EMPRESA",
  "phone": "524271152040",
  "name": "Mariana Torres",
  "service": "Rinoplastia",
  "source": "WhatsApp",
  "lastMessage": "¿Qué fechas tienen disponibles?",
  "stageId": "UUID_DE_LA_ETAPA",
  "appointmentAt": null,
  "externalContactId": "manychat-o-whatsapp-id"
}
```

Encabezados:

```text
Content-Type: application/json
x-webhook-secret: TU_SECRETO_COMPARTIDO
```

Regla importante: después de `Cita agendada`, n8n no debe mover la tarjeta a etapas manuales. Esas etapas se modifican desde el CRM.
