import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { QuoteRequest, getColorName } from '@/types';

// The RESEND_API_KEY must be configured in Vercel / .env.local
const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy');

export async function POST(request: Request) {
  try {
    const quote: QuoteRequest = await request.json();

    if (!quote || !quote.client || !quote.items) {
      return NextResponse.json({ error: 'Datos de cotización incompletos' }, { status: 400 });
    }

    // Prepare HTML content for the email
    const printPrices: Record<string, number> = {
      "Sin Impresión": 0,
      "Grabado Chico": 15,
      "Grabado Grande": 25,
      "Impresión 1 tinta": 10,
      "Impresión 2 tintas": 18,
      "Impresión 3 tintas": 25,
      "Impresión 4 tintas": 30
    };

    // Prepare HTML content for the email
    const itemsHtml = quote.items.map(item => {
      const printPrice = printPrices[item.printOption] || 0;
      const productPrice = item.unitPrice - printPrice;
      const colorName = getColorName(item.color);
      return `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #ddd;">${item.sku}</td>
          <td style="padding: 10px; border-bottom: 1px solid #ddd;">
            ${item.productName}
            ${item.printOption && item.printOption !== 'Sin Impresión' ? `<br/><span style="font-size: 11px; color: #666;">(${item.printOption})</span>` : ''}
          </td>
          <td style="padding: 10px; border-bottom: 1px solid #ddd;">${colorName}</td>
          <td style="padding: 10px; border-bottom: 1px solid #ddd;">${item.quantity}</td>
          <td style="padding: 10px; border-bottom: 1px solid #ddd;">$${productPrice.toFixed(2)}</td>
          <td style="padding: 10px; border-bottom: 1px solid #ddd;">$${printPrice.toFixed(2)}</td>
          <td style="padding: 10px; border-bottom: 1px solid #ddd; font-weight: bold;">$${item.totalPrice.toFixed(2)}</td>
        </tr>
      `;
    }).join('');

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; color: #333;">
        <h1 style="color: #0b504d; border-bottom: 2px solid #40c0b9; padding-bottom: 10px;">Nueva Solicitud de Cotización B2B</h1>
        
        <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h2 style="margin-top: 0; color: #0b504d;">Datos del Cliente</h2>
          <p><strong>Empresa:</strong> ${quote.client.company}</p>
          <p><strong>Contacto:</strong> ${quote.client.name}</p>
          <p><strong>Email:</strong> ${quote.client.email}</p>
          <p><strong>Teléfono:</strong> ${quote.client.phone}</p>
          <p><strong>Destino:</strong> ${quote.client.city || ''}, ${quote.client.state || ''}</p>
          <p><strong>Dirección:</strong> ${quote.client.address || 'No especificada'}</p>
          <p><strong>Código Postal:</strong> ${quote.client.zip || 'No especificado'}</p>
          <p><strong>Comentarios:</strong> ${quote.client.comments || 'Ninguno'}</p>
        </div>

        <h2 style="color: #0b504d;">Artículos Solicitados</h2>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr style="background-color: #0b504d; color: white; text-align: left;">
              <th style="padding: 10px;">SKU</th>
              <th style="padding: 10px;">Producto</th>
              <th style="padding: 10px;">Color</th>
              <th style="padding: 10px;">Cant.</th>
              <th style="padding: 10px;">Precio Prod.</th>
              <th style="padding: 10px;">Impresión</th>
              <th style="padding: 10px;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div style="text-align: right; font-size: 20px; color: #0b504d;">
          <strong>Total Estimado: $${quote.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN</strong>
        </div>

        <p style="font-size: 12px; color: #777; margin-top: 40px; border-top: 1px solid #ddd; padding-top: 10px;">
          * Colores sujetos a disponibilidad al momento de confirmar el pedido.<br>
          * Condiciones de pago: 50% de anticipo para iniciar producción y 50% restante contra entrega.<br>
          * Los tiempos de entrega acordados comenzarán a correr una vez recibido el anticipo correspondiente.<br>
          * La presente cotización tiene una vigencia de 15 días naturales a partir de la fecha de emisión.
        </p>
      </div>
    `;

    if (process.env.RESEND_API_KEY) {
      const { data, error } = await resend.emails.send({
        from: 'GeekyStore B2B <ventas@geekystore.mx>',
        to: ['ventas@geekystore.mx', quote.client.email],
        subject: `Cotización B2B - ${quote.client.company}`,
        html: htmlContent,
      });
      if (error) {
        console.error("Resend error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    } else {
      console.warn("RESEND_API_KEY no encontrada. Simulando envío de correo...");
    }

    // --- NEW: WhatsApp Cloud API ---
    // Enviar WhatsApp de confirmación al cliente
    const waToken = process.env.WA_TOKEN;
    const waPhoneId = process.env.WA_PHONE_NUMBER_ID;
    
    if (waToken && waPhoneId && quote.client.phone) {
      // Limpiar el teléfono para que solo tenga números
      const cleanPhone = quote.client.phone.replace(/\D/g, '');
      // WhatsApp API requires country code. If Mexican number (10 digits), prepend 52
      let destinationPhone = cleanPhone;
      if (cleanPhone.length === 10) {
        destinationPhone = `52${cleanPhone}`;
      }

      const waPayload = {
        messaging_product: "whatsapp",
        to: destinationPhone,
        type: "template",
        template: {
          name: "respuestas_automaticas",
          language: {
            code: "es_MX"
          },
          components: [
            {
              type: "header",
              parameters: [
                {
                  type: "image",
                  image: {
                    link: "https://www.geekystore.mx/whatsapp-logo.png"
                  }
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
        if (!waResponse.ok) {
          console.error("Error from WhatsApp API:", waData);
          return NextResponse.json({ error: `WhatsApp Error: ${JSON.stringify(waData)}` }, { status: 500 });
        } else {
          console.log("WhatsApp message sent successfully:", waData);
        }
      } catch (err: any) {
        console.error("Error connecting to WhatsApp API:", err);
        return NextResponse.json({ error: `Connection Error: ${err.message}` }, { status: 500 });
      }
    } else {
      console.warn("Faltan credenciales de WhatsApp o teléfono del cliente. Omitiendo mensaje de WhatsApp.");
    }
    // --- END WhatsApp ---

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error sending email:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
