import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// Token de verificación para Meta (lo configuraremos en el portal de desarrolladores)
const VERIFY_TOKEN = "GeekyWeb2026";

// Función GET para verificar el Webhook (Requisito de Meta)
export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('Webhook verified successfully!');
    // Meta requiere que el challenge se devuelva como texto plano, no JSON.
    return new Response(challenge, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  }

  return NextResponse.json({ error: 'Invalid verification token' }, { status: 403 });
}

// Función POST para recibir los mensajes entrantes
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Verificamos que sea un evento de WhatsApp
    if (body.object === 'whatsapp_business_account') {
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;
      const messages = value?.messages;
      const contacts = value?.contacts;

      // Si hay un mensaje entrante
      if (messages && messages.length > 0) {
        const message = messages[0];
        const contact = contacts?.[0];
        
        const senderPhone = message.from;
        const senderName = contact?.profile?.name || "Cliente Sin Nombre";
        const messageType = message.type;
        
        let messageText = "";
        
        if (messageType === 'text') {
          messageText = message.text.body;
        } else if (messageType === 'interactive') {
           // En caso de que el cliente haya presionado un botón de respuesta rápida
           messageText = message.interactive?.button_reply?.title || message.interactive?.list_reply?.title || "Respuesta de botón interactivo";
        } else {
          messageText = `[Mensaje tipo: ${messageType}] (Puede ser una imagen, audio o documento, revisa en Meta Business Suite)`;
        }

        console.log(`Mensaje recibido de ${senderName} (${senderPhone}): ${messageText}`);

        // Enviar el mensaje por correo usando Resend
        await resend.emails.send({
          from: 'Geekystore B2B <cotizaciones@geekystore.mx>',
          to: 'ventas@geekystore.mx',
          subject: `Nuevo mensaje de WhatsApp de ${senderName}`,
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
              <h2 style="color: #25D366;">Nuevo Mensaje en WhatsApp</h2>
              <p>Has recibido un nuevo mensaje en la línea corporativa de WhatsApp.</p>
              
              <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p><strong>De:</strong> ${senderName}</p>
                <p><strong>Teléfono:</strong> +${senderPhone}</p>
                <p><strong>Mensaje:</strong></p>
                <blockquote style="font-size: 16px; font-style: italic; border-left: 4px solid #25D366; padding-left: 10px;">
                  ${messageText}
                </blockquote>
              </div>
              
              <p style="font-size: 14px; color: #666;">
                <em>Nota: Puedes contestarle a este cliente buscándolo en Meta Business Suite, o llamándole directamente a su número.</em>
              </p>
            </div>
          `
        });
      }

      // Siempre debemos responder con un 200 OK a Meta rápidamente
      return NextResponse.json({ status: 'success' }, { status: 200 });
    }

    return NextResponse.json({ status: 'not_whatsapp' }, { status: 404 });
  } catch (error) {
    console.error('Error procesando webhook de WhatsApp:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
