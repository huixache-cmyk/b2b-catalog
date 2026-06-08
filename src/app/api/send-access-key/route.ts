import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy');

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, phone, contact_name, access_key } = body;

    if (!email || !access_key) {
      return NextResponse.json({ error: 'Faltan parámetros requeridos' }, { status: 400 });
    }

    // 1. Send Email via Resend
    let emailSent = false;
    if (process.env.RESEND_API_KEY) {
      const { error: emailError } = await resend.emails.send({
        from: 'GeekyStore B2B <ventas@geekystore.mx>',
        to: email,
        subject: 'Tu Clave de Acceso B2B - GeekyStore',
        html: `
          <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 8px;">
            <div style="text-align: center; border-bottom: 1px solid #eee; padding-bottom: 15px; margin-bottom: 20px;">
              <h2 style="color: #0b504d; margin: 0;">GeekyStore B2B</h2>
            </div>
            <p>Hola <strong>${contact_name || 'Cliente'}</strong>,</p>
            <p>Hemos registrado tu información comercial. Para que puedas acceder a nuestro catálogo con tus precios y condiciones preferenciales, utiliza la siguiente clave de acceso personalizada:</p>
            
            <div style="background-color: #f0fdf4; padding: 15px; border-radius: 8px; border: 1px solid #bbf7d0; text-align: center; margin: 20px 0;">
              <span style="font-size: 20px; font-weight: bold; color: #166534; letter-spacing: 1px;">${access_key}</span>
            </div>

            <p style="font-size: 13px; color: #555;">
              Puedes ingresar a tu cuenta desde el botón **Portal Clientes B2B** en la parte superior derecha de nuestro sitio web usando tu correo corporativo y esta clave.
            </p>
            <p style="font-size: 13px; color: #555; font-style: italic;">
              Nota: Te recomendamos cambiar tu clave por una personal y fácil de recordar una vez que ingreses a tu cuenta.
            </p>

            <div style="border-top: 1px solid #eee; padding-top: 15px; margin-top: 25px; font-size: 12px; color: #888; text-align: center;">
              Si tienes alguna duda o requieres asistencia, contáctanos por WhatsApp al 4492601779.
            </div>
          </div>
        `,
      });

      if (emailError) {
        console.error('Error enviando email de bienvenida:', emailError);
      } else {
        emailSent = true;
      }
    } else {
      console.warn("Simulación de correo: RESEND_API_KEY no configurada. Destinatario:", email, "Clave:", access_key);
      emailSent = true;
    }

    // 2. Send WhatsApp if phone exists
    let waSent = false;
    if (phone) {
      const waToken = process.env.WA_TOKEN;
      const waPhoneId = process.env.WA_PHONE_NUMBER_ID;

      if (waToken && waPhoneId) {
        const cleanPhone = phone.replace(/\D/g, '');
        let destinationPhone = cleanPhone;
        if (cleanPhone.length === 10) destinationPhone = `52${cleanPhone}`;

        // Enviar mensaje de texto directo con la clave autogenerada
        // Enviar plantilla de autenticación con la clave autogenerada (y botón para copiar código)
        const waPayload = {
          messaging_product: "whatsapp",
          to: destinationPhone,
          type: "template",
          template: {
            name: "acceso_b2b",
            language: {
              code: "es_MX"
            },
            components: [
              {
                type: "body",
                parameters: [
                  {
                    type: "text",
                    text: access_key
                  }
                ]
              },
              {
                type: "button",
                sub_type: "url",
                index: 0,
                parameters: [
                  {
                    type: "text",
                    text: access_key
                  }
                ]
              }
            ]
          }
        };

        try {
          const waResponse = await fetch(`https://graph.facebook.com/v19.0/${waPhoneId}/messages`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${waToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(waPayload)
          });

          const waData = await waResponse.json();
          if (waResponse.ok) {
            waSent = true;
          } else {
            console.error("WhatsApp API Error:", waData);
          }
        } catch (waErr) {
          console.error("WhatsApp Fetch Error:", waErr);
        }
      } else {
        console.warn("Simulación de WhatsApp: Omitiendo envío. Teléfono:", phone, "Mensaje: Clave B2B autogenerada:", access_key);
      }
    }

    return NextResponse.json({ success: true, emailSent, waSent });
  } catch (error: any) {
    console.error('Error in send-access-key API:', error);
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}
