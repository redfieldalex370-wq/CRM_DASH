import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const secret = request.headers.get('x-webhook-secret');
  if (!secret || secret !== Deno.env.get('CRM_WEBHOOK_SECRET')) {
    return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  try {
    const payload = await request.json();
    const { companyId, phone, name, service, source = 'WhatsApp', lastMessage, stageId, appointmentAt, externalContactId } = payload;
    if (!companyId || !phone || !name) throw new Error('companyId, phone y name son obligatorios');

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: previous } = await supabase.from('leads').select('id,stage_id').eq('company_id', companyId).eq('phone', phone).maybeSingle();

    const { data: lead, error } = await supabase.from('leads').upsert({
      company_id: companyId,
      phone,
      full_name: name,
      service,
      source,
      last_message: lastMessage,
      last_contact_at: new Date().toISOString(),
      stage_id: stageId,
      appointment_at: appointmentAt || null,
      external_contact_id: externalContactId || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'company_id,phone' }).select().single();
    if (error) throw error;

    if (stageId && previous?.stage_id !== stageId) {
      await supabase.from('lead_history').insert({
        company_id: companyId,
        lead_id: lead.id,
        previous_stage_id: previous?.stage_id || null,
        new_stage_id: stageId,
        movement_source: 'automation',
        note: previous ? 'Etapa actualizada desde WhatsApp/n8n' : 'Lead creado desde WhatsApp/n8n',
      });
    }

    return new Response(JSON.stringify({ ok: true, lead }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
