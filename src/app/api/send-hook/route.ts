import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { supabase } from '@/lib/supabase';

const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy');

import { verifyUser } from '@/lib/auth';
import { z } from 'zod';

const sendHookSchema = z.object({
  opp_id: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional().nullable(),
  contact_name: z.string().optional().nullable(),
  hook_text: z.string().min(1),
  company_name: z.string().optional().nullable(),
  signal_desc: z.string().optional().nullable(),
});

export async function POST(request: Request) {
  try {
    const user = await verifyUser(request);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const body = await request.json();
    const validation = sendHookSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Payload inválido', details: validation.error.format() }, { status: 400 });
    }
    const { opp_id, email, phone, contact_name, hook_text, company_name, signal_desc } = validation.data;

    // 1. Send Email via Resend
    let emailSent = false;
    if (process.env.RESEND_API_KEY) {
      // Intentamos extraer el asunto de la primera línea del hook (o usar uno por defecto)
      const lines = hook_text.split('\n').filter((l: string) => l.trim().length > 0);
      const subject = lines.length > 0 && lines[0].toLowerCase().includes('asunto:') 
        ? lines[0].replace(/asunto:/i, '').trim()
        : `Propuesta Geekystore para ${company_name}`;
      
      // Limpiar el hook text (quitar la línea del asunto si existe)
      const emailBody = hook_text.replace(/^.*asunto:.*$/im, '').trim().replace(/\n/g, '<br/>');

      const { error: emailError } = await resend.emails.send({
        from: 'Geekystore B2B <ventas@geekystore.mx>',
        to: email,
        subject: subject,
        html: `<div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px;">
                ${emailBody}
               </div>`,
      });

      if (emailError) {
        console.error('Error enviando email:', emailError);
        return NextResponse.json({ error: 'Error enviando el correo electrónico' }, { status: 500 });
      }
      emailSent = true;
    } else {
      console.warn("No hay RESEND_API_KEY configurada. Simulación de correo.");
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

        // Se utiliza la plantilla preaprobada (Opción A). 
        // Nota: Asegúrate de crear esta plantilla en Meta con el nombre "prospeccion_b2b"
        const waPayload = {
          messaging_product: "whatsapp",
          to: destinationPhone,
          type: "template",
          template: {
            name: "prospeccion_b2b",
            language: { code: "es_MX" },
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
              },
              {
                type: "body",
                parameters: [
                  { type: "text", text: contact_name || "Gerente" },
                  { type: "text", text: email || "tu correo" },
                  { type: "text", text: signal_desc || "sus recientes noticias" }
                ]
              }
            ]
          }
        };

        const waResponse = await fetch(`https://graph.facebook.com/v19.0/${waPhoneId}/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${waToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(waPayload)
        });

        if (waResponse.ok) {
          waSent = true;
        } else {
          const waErr = await waResponse.json();
          console.error("WhatsApp API Error:", waErr);
          // Si falla WA, no bloqueamos el éxito porque el correo sí salió.
        }
      }
    }

    // 3. Update Supabase Stage
    const { error: dbError } = await supabase
      .from('b2b_opportunities')
      .update({ 
        stage: 'Mensaje Enviado',
        updated_at: new Date().toISOString()
      })
      .eq('id', opp_id);

    if (dbError) {
      return NextResponse.json({ error: 'Mensaje enviado, pero falló la actualización en la base de datos' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      emailSent,
      waSent 
    });

  } catch (error: any) {
    console.error('API Error (send-hook):', error);
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}
