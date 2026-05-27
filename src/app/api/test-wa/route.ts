import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const key = url.searchParams.get('key');
  const action = url.searchParams.get('action') || 'info'; // 'info', 'templates', 'send'
  const phone = url.searchParams.get('phone');
  const templateName = url.searchParams.get('template') || 'respuesta_automatica';
  const hasComponents = url.searchParams.get('components') !== 'false';
  const imageUrl = url.searchParams.get('image') || 'https://www.geekystore.mx/whatsapp-logo.png';

  if (key !== 'GeekyWeb2026') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const waToken = process.env.WA_TOKEN;
  const waPhoneId = process.env.WA_PHONE_NUMBER_ID;

  if (!waToken || !waPhoneId) {
    return NextResponse.json({
      error: 'WhatsApp credentials missing in environment variables',
      hasToken: !!waToken,
      hasPhoneId: !!waPhoneId
    }, { status: 500 });
  }

  try {
    // 1. Fetch Phone Number Details to get Business Account ID
    const phoneRes = await fetch(`https://graph.facebook.com/v19.0/${waPhoneId}?fields=name,display_phone_number,whatsapp_business_account`, {
      headers: { 'Authorization': `Bearer ${waToken}` }
    });
    const phoneData = await phoneRes.json();

    if (!phoneRes.ok) {
      return NextResponse.json({ error: 'Failed to fetch phone details from Meta', metaError: phoneData }, { status: phoneRes.status });
    }

    const businessAccountId = phoneData.whatsapp_business_account?.id;

    if (action === 'info') {
      return NextResponse.json({
        success: true,
        phoneDetails: phoneData,
        hasToken: !!waToken,
        hasPhoneId: !!waPhoneId
      });
    }

    if (action === 'templates') {
      if (!businessAccountId) {
        return NextResponse.json({ error: 'Could not retrieve WhatsApp Business Account ID from phone details' }, { status: 400 });
      }
      const templatesRes = await fetch(`https://graph.facebook.com/v19.0/${businessAccountId}/message_templates?limit=100`, {
        headers: { 'Authorization': `Bearer ${waToken}` }
      });
      const templatesData = await templatesRes.json();
      if (!templatesRes.ok) {
        return NextResponse.json({ error: 'Failed to fetch templates from Meta', metaError: templatesData }, { status: templatesRes.status });
      }
      return NextResponse.json({
        success: true,
        businessAccountId,
        templates: templatesData.data || []
      });
    }

    if (action === 'send') {
      if (!phone) {
        return NextResponse.json({ error: 'Parameter "phone" is required to send a message' }, { status: 400 });
      }

      const cleanPhone = phone.replace(/\D/g, '');
      let destinationPhone = cleanPhone;
      if (cleanPhone.length === 10) {
        destinationPhone = `52${cleanPhone}`;
      }

      const waPayload: any = {
        messaging_product: "whatsapp",
        to: destinationPhone,
        type: "template",
        template: {
          name: templateName,
          language: {
            code: "es_MX"
          }
        }
      };

      if (hasComponents) {
        waPayload.template.components = [
          {
            type: "header",
            parameters: [
              {
                type: "image",
                image: {
                  link: imageUrl
                }
              }
            ]
          }
        ];
      }

      const sendRes = await fetch(`https://graph.facebook.com/v19.0/${waPhoneId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${waToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(waPayload)
      });

      const sendData = await sendRes.json();
      return NextResponse.json({
        success: sendRes.ok,
        status: sendRes.status,
        payloadSent: waPayload,
        response: sendData
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
