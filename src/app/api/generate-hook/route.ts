import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { verifyUser } from '@/lib/auth';
import { z } from 'zod';

const generateHookSchema = z.object({
  opp_id: z.string().min(1),
  company_name: z.string().min(1),
  contact_name: z.string().optional().nullable(),
  contact_title: z.string().optional().nullable(),
  signal_desc: z.string().optional().nullable(),
});

export async function POST(request: Request) {
  try {
    const user = await verifyUser(request);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const body = await request.json();
    const validation = generateHookSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Payload inválido', details: validation.error.format() }, { status: 400 });
    }
    const { opp_id, company_name, contact_name, contact_title, signal_desc } = validation.data;

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'API Key de Gemini no configurada' }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
Eres un director comercial experto en ventas B2B (Cold Emailing). 
Escribe un correo electrónico persuasivo y directo dirigido a:
- Nombre: ${contact_name || 'Director'}
- Puesto: ${contact_title || 'Toma de Decisiones'}
- Empresa: ${company_name}

El contexto o "excusa" para contactarlos es la siguiente noticia que acabas de leer sobre ellos: 
"${signal_desc || 'Expansión o crecimiento reciente'}"

El objetivo del correo es ofrecer los servicios de tu empresa "Geekystore" (https://www.geekystore.mx), la cual vende kits promocionales corporativos premium, regalos de bienvenida (onboarding) y artículos para inauguraciones o eventos.

Reglas del correo:
1. Asunto atractivo y corto (menor a 6 palabras).
2. Tono profesional pero cercano (no uses saludos anticuados como "Estimado").
3. Menciona la noticia para demostrar que investigaste.
4. Explica brevemente cómo los kits de Geekystore pueden aportar valor a su evento o crecimiento.
5. Termina con un llamado a la acción (Call to Action) de baja fricción (ej. "¿Te gustaría ver un catálogo rápido?").
6. Solo devuelve el asunto y el cuerpo del correo. No incluyas comentarios extra.
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    if (!responseText) {
      return NextResponse.json({ error: 'La IA no devolvió un texto válido' }, { status: 500 });
    }

    // Guardar en Supabase
    const { error } = await supabase
      .from('b2b_opportunities')
      .update({ 
        hook_text: responseText,
        stage: 'Hook Generado',
        updated_at: new Date().toISOString()
      })
      .eq('id', opp_id);

    if (error) {
      console.error('Supabase update error:', error);
      return NextResponse.json({ error: 'Error al guardar el hook en la base de datos' }, { status: 500 });
    }

    return NextResponse.json({ success: true, hook_text: responseText });

  } catch (error: any) {
    console.error('API Error (generate-hook):', error);
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}
