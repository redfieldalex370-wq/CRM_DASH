-- GREEN CHIMP CRM | SEGUIMIENTO MANUAL DESDE LA PÁGINA
-- Ejecutar una sola vez en Supabase > SQL Editor.
-- La fecha NO se toma de Excel. El CRM la guarda en reminder_at.

alter table public.crm_leads
  add column if not exists reminder_text text;

alter table public.crm_leads
  add column if not exists reminder_at timestamptz;

alter table public.crm_leads
  add column if not exists reminder_completed boolean not null default false;

alter table public.crm_leads
  add column if not exists reminder_sent_at timestamptz;

create index if not exists crm_leads_pending_manual_reminders_idx
  on public.crm_leads (reminder_at)
  where reminder_at is not null
    and reminder_completed = false;

comment on column public.crm_leads.reminder_text is
  'Nota capturada manualmente desde la ficha del lead en el CRM.';

comment on column public.crm_leads.reminder_at is
  'Fecha y hora seleccionadas manualmente desde la página del CRM.';

comment on column public.crm_leads.reminder_completed is
  'True después de atender manualmente el seguimiento o después del envío de n8n.';

comment on column public.crm_leads.reminder_sent_at is
  'Fecha real en que n8n envió el correo de recordatorio.';

notify pgrst, 'reload schema';

select
  column_name,
  data_type,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'crm_leads'
  and column_name in (
    'reminder_text',
    'reminder_at',
    'reminder_completed',
    'reminder_sent_at'
  )
order by column_name;
