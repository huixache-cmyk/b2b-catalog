import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type') || '';
    let body: any = {};

    if (contentType.includes('application/json')) {
      body = await request.json();
    } else {
      // In case the inbound processor posts as form-data
      const formData = await request.formData();
      formData.forEach((value, key) => {
        body[key] = value;
      });
    }

    console.log("Inbound Email received. Body keys:", Object.keys(body));

    // Extract email parts (support multiple common inbound hook formats)
    const subject = body.subject || body.Subject || '';
    const from = body.from || body.From || '';
    const textBody = body.text || body.Text || body['body-plain'] || body.html || body.Html || '';

    if (!subject && !textBody) {
      return NextResponse.json({ error: 'Payload vacío o inválido' }, { status: 400 });
    }

    // Resolve Gemini Key
    let geminiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;
    try {
      const { data: settingsData } = await supabase
        .from('settings')
        .select('home_settings')
        .eq('id', 1)
        .single();
      
      if (settingsData?.home_settings?.api_credentials?.GEMINI_API_KEY) {
        geminiKey = settingsData.home_settings.api_credentials.GEMINI_API_KEY;
      }
    } catch (e) {
      console.warn("Could not load Gemini Key from database:", e);
    }

    if (!geminiKey) {
      console.error("Gemini API Key is not configured anywhere. Saving email raw.");
      // Save raw without AI parsing
      await supabase.from('vendor_notifications').insert({
        provider: 'unknown',
        subject: subject.substring(0, 200),
        summary: 'Correo recibido (Gemini no configurado para análisis)',
        severity: 'low',
        action_required: 'Verificar contenido crudo del correo.',
        raw_content: `De: ${from}\n\n${textBody.substring(0, 5000)}`,
        resolved: false
      });
      return NextResponse.json({ success: true, parsed: false });
    }

    // Run Gemini to analyze and categorize email
    const genAI = new GoogleGenerativeAI(geminiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
Analiza el siguiente correo electrónico enviado por un proveedor de servicios de infraestructura tecnológica.
Determina si contiene información crítica sobre límites de servicio, cobros, actualizaciones de términos, alertas de seguridad, cambios en APIs o subprocesadores de datos.

Asunto: "${subject}"
De: "${from}"
Cuerpo del correo:
"""
${textBody.substring(0, 8000)}
"""

Responde únicamente con un objeto JSON válido con la siguiente estructura (sin formato Markdown de bloque, solo el JSON puro):
{
  "is_vendor_alert": true,
  "provider": "nombre del proveedor en minúsculas (ej. vercel, resend, meta, supabase, hostinger, github, google)",
  "severity": "low",
  "summary": "resumen corto de 1 o 2 lineas",
  "action_required": "acción requerida detallada o 'Ninguna' si es puramente informativo"
}

Si determinas que NO es un correo de alerta de infraestructura (por ejemplo, spam o correo de cliente regular), marca "is_vendor_alert": false.
`;

    const aiResponse = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' }
    });

    const aiText = aiResponse.response.text().trim();
    console.log("Gemini parse result:", aiText);

    let parsedResult = {
      is_vendor_alert: true,
      provider: 'unknown',
      severity: 'low',
      summary: 'Aviso del proveedor',
      action_required: 'Revisar detalles en la consola del proveedor.'
    };

    try {
      parsedResult = JSON.parse(aiText);
    } catch (parseErr) {
      console.error("Failed to parse Gemini response as JSON. Raw response was:", aiText);
      // fallback parsing
      if (subject.toLowerCase().includes('vercel')) parsedResult.provider = 'vercel';
      else if (subject.toLowerCase().includes('resend')) parsedResult.provider = 'resend';
      else if (subject.toLowerCase().includes('whatsapp') || subject.toLowerCase().includes('meta')) parsedResult.provider = 'whatsapp';
    }

    // Only save if it's a valid vendor alert
    if (parsedResult.is_vendor_alert) {
      const { data, error } = await supabase.from('vendor_notifications').insert({
        provider: parsedResult.provider || 'unknown',
        subject: subject.substring(0, 200),
        summary: parsedResult.summary,
        severity: (parsedResult.severity || 'low').toLowerCase(),
        action_required: parsedResult.action_required || 'Ninguna',
        raw_content: `De: ${from}\n\n${textBody.substring(0, 3000)}`,
        resolved: false
      });

      if (error) {
        console.error("Error inserting notification to database:", error);
        throw error;
      }

      // If the alert is critical or medium, send a notification to the administrator
      if (parsedResult.severity === 'critical' || parsedResult.severity === 'medium') {
        // Send email/whatsapp alerts if configured (we can trigger this later or let the admin view it on dashboard)
        console.log(`⚠️ ALERTA DETECTADA [Severidad: ${parsedResult.severity}]: ${parsedResult.summary}`);
      }
    } else {
      console.log("Email filtered out: Not a vendor alert.");
    }

    return NextResponse.json({ success: true, parsed: parsedResult.is_vendor_alert, analysis: parsedResult });
  } catch (error: any) {
    console.error('Error in inbound-email API:', error);
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}
