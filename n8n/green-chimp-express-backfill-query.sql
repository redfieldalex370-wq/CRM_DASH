-- Nodo PostgreSQL: Leer gc_leads_estado para CRM
-- Credencial: Postgres account 3
-- Ejecutar una sola vez para recuperar los leads existentes.

select
  usuario_id,
  lead_id,
  chat_id,
  manychat_id,
  nombre_contacto,
  telefono,
  correo,
  nombre_negocio,
  tipo_negocio,
  producto_interes,
  paquete_recomendado,
  precio_paquete,
  setup_paquete,
  presupuesto_detectado,
  objetivo_sitio,
  funciones_requeridas,
  tiene_pagina_actual,
  dominio_deseado,
  estado,
  etapa,
  flow_status,
  requiere_asesor,
  venta_confirmada,
  link_pago_enviado,
  motivo_escalacion,
  motivo_no_compra,
  objeciones_precio,
  califico_sistema_pacientes,
  requiere_sitio_personalizado,
  resumen_conversacion,
  notas,
  ultimo_mensaje_usuario,
  ultima_respuesta_bot,
  fuente,
  campana,
  anuncio,
  asesor_contactado,
  alerta_enviada,
  fecha_alerta_asesor,
  fecha_creacion,
  fecha_actualizacion
from public.gc_leads_estado
where coalesce(borrado_en_portal, false) = false
order by fecha_actualizacion asc;
