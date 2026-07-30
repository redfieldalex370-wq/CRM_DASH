export async function sendLeadEventToN8n(eventName, company, lead) {
  const url = import.meta.env.VITE_N8N_WEBHOOK_URL;
  if (!url) return { skipped: true };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event: eventName,
      companyId: company.id,
      companyName: company.name,
      lead,
      sentAt: new Date().toISOString(),
    }),
  });

  if (!response.ok) {
    throw new Error(`Webhook n8n respondió ${response.status}`);
  }

  return { skipped: false };
}
