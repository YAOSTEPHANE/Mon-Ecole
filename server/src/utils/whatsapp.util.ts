/**
 * WhatsApp Cloud API (Meta) — envoi de messages texte.
 * Sans WHATSAPP_TOKEN / WHATSAPP_PHONE_NUMBER_ID : mode journal (dev).
 */

export function isWhatsAppConfigured(): boolean {
  return Boolean(
    process.env.WHATSAPP_TOKEN?.trim() && process.env.WHATSAPP_PHONE_NUMBER_ID?.trim()
  );
}

export function normalizeWaPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('00')) return digits.slice(2);
  if (digits.startsWith('0') && digits.length === 9) {
    const cc = (process.env.WHATSAPP_DEFAULT_COUNTRY_CODE || '237').replace(/\D/g, '');
    return `${cc}${digits.slice(1)}`;
  }
  return digits;
}

export async function sendWhatsAppText(
  phoneNumber: string,
  body: string
): Promise<{ success: boolean; messageId?: string; error?: string; mode: 'live' | 'sandbox' }> {
  const to = normalizeWaPhone(phoneNumber);
  if (!to || body.trim().length === 0) {
    return { success: false, error: 'Téléphone ou message invalide', mode: 'sandbox' };
  }

  if (!isWhatsAppConfigured()) {
    console.log('\n=== WhatsApp (non configuré) ===');
    console.log(`To: ${to}`);
    console.log(`Body: ${body}`);
    console.log('===========\n');
    return {
      success: true,
      messageId: `wa_sandbox_${Date.now()}`,
      mode: 'sandbox',
    };
  }

  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID!.trim();
  const token = process.env.WHATSAPP_TOKEN!.trim();
  const version = process.env.WHATSAPP_API_VERSION?.trim() || 'v19.0';

  try {
    const res = await fetch(`https://graph.facebook.com/${version}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { preview_url: false, body: body.slice(0, 4096) },
      }),
    });
    const data = (await res.json()) as {
      messages?: Array<{ id?: string }>;
      error?: { message?: string };
    };
    if (!res.ok) {
      return {
        success: false,
        error: data.error?.message || `WhatsApp HTTP ${res.status}`,
        mode: 'live',
      };
    }
    return {
      success: true,
      messageId: data.messages?.[0]?.id,
      mode: 'live',
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Erreur WhatsApp',
      mode: 'live',
    };
  }
}

/** Notifie un parent par WhatsApp si numéro disponible (sinon no-op). */
export async function notifyParentWhatsApp(
  phone: string | null | undefined,
  title: string,
  content: string
): Promise<void> {
  if (!phone?.trim()) return;
  const text = `*${title}*\n\n${content}`.slice(0, 4000);
  const result = await sendWhatsAppText(phone, text);
  if (!result.success) {
    console.error('WhatsApp notify failed:', result.error);
  }
}
