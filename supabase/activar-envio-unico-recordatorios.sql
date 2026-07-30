-- GREEN CHIMP CRM | ENVÍO ÚNICO POR SEGUIMIENTO
-- Ejecutar una sola vez en Supabase > SQL Editor.
--
-- Garantía:
-- Un mismo lead + una misma fecha reminder_at + un mismo correo destino
-- solo puede reservarse una vez. Aunque n8n vuelva a correr, no enviará
-- nuevamente ese mismo seguimiento.

create table if not exists public.crm_reminder_deliveries (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.crm_leads(id) on delete cascade,
  reminder_at timestamptz not null,
  email_to text not null,
  status text not null default 'claimed'
    check (status in ('claimed', 'sent', 'failed')),
  claimed_at timestamptz not null default now(),
  sent_at timestamptz,
  provider_message_id text,
  error_message text,
  created_at timestamptz not null default now(),

  constraint crm_reminder_deliveries_unique_followup
    unique (lead_id, reminder_at, email_to)
);

create index if not exists crm_reminder_deliveries_status_idx
  on public.crm_reminder_deliveries (status, claimed_at);

create index if not exists crm_reminder_deliveries_lead_idx
  on public.crm_reminder_deliveries (lead_id, reminder_at);

-- Normalizar registros antiguos.
update public.crm_leads
set reminder_completed = false
where reminder_at is not null
  and reminder_completed is null;

alter table public.crm_leads
  alter column reminder_completed set default false;

-- ============================================================
-- RPC 1: RESERVAR RECORDATORIOS VENCIDOS DE FORMA ATÓMICA
-- ============================================================

create or replace function public.claim_due_crm_reminders(
  p_email_to text default 'redfieldalex370@gmail.com',
  p_limit integer default 100
)
returns setof jsonb
language sql
security definer
set search_path = public
as $$
  with due as (
    select
      l.id,
      l.company_key,
      l.subscriber_id,
      l.whatsapp_phone,
      l.nombre_paciente,
      l.service,
      l.classification,
      l.assigned_to,
      l.ultimo_mensaje_cliente,
      l.reminder_text,
      l.reminder_at,
      l.reminder_completed,
      l.raw_payload
    from public.crm_leads l
    where l.reminder_at is not null
      and coalesce(l.reminder_completed, false) = false
      and l.reminder_at <= now()
    order by l.reminder_at asc
    limit greatest(1, least(coalesce(p_limit, 100), 500))
  ),
  claimed as (
    insert into public.crm_reminder_deliveries (
      lead_id,
      reminder_at,
      email_to,
      status
    )
    select
      d.id,
      d.reminder_at,
      p_email_to,
      'claimed'
    from due d
    on conflict (lead_id, reminder_at, email_to)
      do nothing
    returning
      id as delivery_id,
      lead_id,
      reminder_at,
      email_to
  )
  select jsonb_build_object(
    'delivery_id', c.delivery_id,
    'id', d.id,
    'lead_id', d.id,
    'company_key', d.company_key,
    'subscriber_id', d.subscriber_id,
    'whatsapp_phone', d.whatsapp_phone,
    'nombre_paciente', d.nombre_paciente,
    'service', d.service,
    'classification', d.classification,
    'assigned_to', d.assigned_to,
    'ultimo_mensaje_cliente', d.ultimo_mensaje_cliente,
    'reminder_text', d.reminder_text,
    'reminder_at', d.reminder_at,
    'reminder_completed', d.reminder_completed,
    'raw_payload', d.raw_payload,
    'email_to', c.email_to
  )
  from claimed c
  join due d
    on d.id = c.lead_id
   and d.reminder_at = c.reminder_at;
$$;

-- ============================================================
-- RPC 2: MARCAR COMO ENVIADO SOLO EL SEGUIMIENTO RESERVADO
-- ============================================================

create or replace function public.complete_crm_reminder_delivery(
  p_delivery_id uuid,
  p_provider_message_id text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lead_id uuid;
  v_reminder_at timestamptz;
begin
  update public.crm_reminder_deliveries
  set
    status = 'sent',
    sent_at = coalesce(sent_at, now()),
    provider_message_id = coalesce(
      nullif(trim(p_provider_message_id), ''),
      provider_message_id
    ),
    error_message = null
  where id = p_delivery_id
    and status = 'claimed'
  returning lead_id, reminder_at
  into v_lead_id, v_reminder_at;

  if not found then
    return false;
  end if;

  -- Solo completa el recordatorio si la fecha sigue siendo la misma.
  -- Si el usuario ya programó otra fecha, no se pisa el nuevo seguimiento.
  update public.crm_leads
  set
    reminder_completed = true,
    reminder_sent_at = now()
  where id = v_lead_id
    and reminder_at = v_reminder_at
    and coalesce(reminder_completed, false) = false;

  return true;
end;
$$;

revoke all on function public.claim_due_crm_reminders(text, integer)
  from public, anon, authenticated;

revoke all on function public.complete_crm_reminder_delivery(uuid, text)
  from public, anon, authenticated;

grant execute on function public.claim_due_crm_reminders(text, integer)
  to service_role;

grant execute on function public.complete_crm_reminder_delivery(uuid, text)
  to service_role;

notify pgrst, 'reload schema';

-- ============================================================
-- DIAGNÓSTICO
-- ============================================================

select
  d.id as delivery_id,
  d.lead_id,
  d.reminder_at,
  d.email_to,
  d.status,
  d.claimed_at,
  d.sent_at,
  d.provider_message_id
from public.crm_reminder_deliveries d
order by d.created_at desc;
