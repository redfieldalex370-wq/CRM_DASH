# CRM Kanban multiempresa

Raíz completa para desarrollo con React + Vite.

## Incluye

- Dr. Woolrich
- Zenda Café
- Especialidades Dentales
- Green Chimp Express con filtros Chatbot / Landing
- Seguimiento manual desde la ficha del contacto
- Botón visible **📅 Programar seguimiento**
- Integración Supabase
- SQL y workflow n8n para enviar cada seguimiento una sola vez

## Ejecutar

```bash
npm install
npm run dev
```

## Generar Hostinger

```bash
npm run build
```

El resultado queda en `dist/`.

## Seguimientos

1. Ejecuta `supabase/activar-seguimiento-manual-desde-pagina.sql`.
2. Ejecuta `supabase/activar-envio-unico-recordatorios.sql`.
3. Importa `n8n/seguimientos-correo-envio-unico.json`.
4. Configura la Service Role Key en n8n y la credencial Gmail.
