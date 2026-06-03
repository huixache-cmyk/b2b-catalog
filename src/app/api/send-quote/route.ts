import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { QuoteRequest, getColorName } from '@/types';
import { supabase } from '@/lib/supabase';

// The RESEND_API_KEY must be configured in Vercel / .env.local
const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy');

import { z } from 'zod';

const clientSchema = z.object({
  name: z.string().min(1),
  company: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1),
  state: z.string().min(1),
  city: z.string().min(1),
  comments: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  zip: z.string().optional().nullable(),
  deliveryTime: z.string().optional().nullable(),
});

const itemSchema = z.object({
  id: z.string().min(1),
  productId: z.string().min(1),
  productName: z.string().min(1),
  sku: z.string().min(1),
  image: z.string().min(1),
  color: z.string().min(1),
  quantity: z.number().int().positive(),
  isPersonalized: z.boolean(),
  printOption: z.string().min(1),
  unitPrice: z.number(),
  totalPrice: z.number(),
  blueprintImage: z.string().optional().nullable(),
  mockupImage: z.string().optional().nullable(),
  minPurchase: z.number().optional().nullable(),
  finalPrintPrice: z.number().nullable().optional(),
  finalShippingPrice: z.number().nullable().optional(),
});

const quoteRequestSchema = z.object({
  id: z.string().min(1),
  date: z.string().min(1),
  client: clientSchema,
  items: z.array(itemSchema),
  total: z.number(),
  status: z.enum(['pending', 'reviewed', 'completed']),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = quoteRequestSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Datos de cotización inválidos', details: validation.error.format() }, { status: 400 });
    }
    const quote = validation.data as QuoteRequest;

    // Fetch dynamic print prices from settings
    let dynamicPrices: Record<string, number> = {};
    try {
      const { data: settingsData } = await supabase
        .from('settings')
        .select('home_settings')
        .eq('id', 1)
        .single();
      if (settingsData?.home_settings?.print_prices) {
        dynamicPrices = settingsData.home_settings.print_prices;
      }
    } catch (e) {
      console.error("Error fetching print prices for email:", e);
    }

    const printPrices: Record<string, number> = {
      "Sin Impresión": 0,
      "Grabado Chico": 15,
      "Grabado Grande": 25,
      "DTF": 12,
      "Impresión 1 tinta": 10,
      "Impresión 2 tintas": 18,
      "Impresión 3 tintas": 25,
      "Impresión 4 tintas": 30,
      ...dynamicPrices
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
              <th style="padding: 10px;">Impresión Estimada</th>
              <th style="padding: 10px;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div style="text-align: right; font-size: 20px; color: #0b504d; margin-bottom: 20px;">
          <strong>Total Estimado: $${quote.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN</strong>
        </div>

        <div style="background-color: #e0f2f1; padding: 15px; border-radius: 8px; border-left: 4px solid #0b504d; margin: 20px 0; text-align: left;">
          <p style="margin: 0 0 6px 0; font-size: 15px; font-weight: bold; color: #0b504d;">¡Gracias por su solicitud!</p>
          <p style="margin: 0; font-size: 13px; color: #333;">Nuestro equipo se pondrá en contacto con Usted para entregarle una cotización final de acuerdo a sus necesidades.</p>
        </div>

        <p style="font-size: 12px; color: #777; margin-top: 40px; border-top: 1px solid #ddd; padding-top: 10px;">
          * Precios más IVA.<br>
          * Colores sujetos a disponibilidad al momento de confirmar el pedido.<br>
          * Condiciones de pago: 50% de anticipo para iniciar producción y 50% restante contra entrega.
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
          // Si falla WA, no bloqueamos el éxito de la cotización porque el email ya se procesó.
        } else {
          console.log("WhatsApp message sent successfully:", waData);
        }
      } catch (err: any) {
        console.error("Error connecting to WhatsApp API:", err);
        // Si falla WA, no bloqueamos el éxito de la cotización
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
