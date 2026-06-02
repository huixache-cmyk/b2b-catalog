import { NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';

// Configure runtime to allow longer executions if needed
export const maxDuration = 60;

import { verifyUser } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const user = await verifyUser(req);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const { imageBase64 } = await req.json();

    if (!imageBase64) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    // Prepare prompt according to JSON requirements
    const prompt = `Analiza esta imagen y detecta el tipo de producto, categoría, material, uso, características clave o especificaciones. 
También genera consultas de búsqueda (keywords) optimizadas e individualizadas para Alibaba, Amazon México y Mercado Libre México.
Concéntrate en detalles específicos del diseño visual (ej. formas, tapas, hendiduras, texturas, capacidades estimadas, colores) que permitan localizar el producto EXACTO y no solo variantes genéricas.`;

    const { object } = await generateObject({
      model: google('gemini-flash-latest'),
      schema: z.object({
        productName: z.string().describe('Un nombre genérico y descriptivo del producto'),
        category: z.string().describe('Categoría B2B del producto (ej. Drinkware, Bags, Tech)'),
        material: z.string().describe('Material detectado (ej. Plástico libre de BPA, Acero Inoxidable)'),
        specifications: z.array(z.string()).describe('Lista de características (ej. tapa con asa, translúcida, deportiva)'),
        keywordsEn: z.string().describe('Keywords en inglés para búsqueda en Alibaba/Made-in-China (ej. "plastic water bottle with handle BPA free 700ml")'),
        keywordsEs: z.string().describe('Keywords en español para búsqueda (ej. "botella deportiva plástico con asa translúcida")'),
        searchQueries: z.array(z.string()).describe('3 consultas sugeridas exactas para buscar en Alibaba o Google Images'),
        alibabaQuery: z.string().describe('Consulta de búsqueda ultra específica y precisa en inglés para encontrar exactamente este producto en Alibaba, usando marca, modelo, material y especificaciones visuales detalladas (ej. "700ml frosted plastic water bottle with silicon handle loop leakproof")'),
        amazonQuery: z.string().describe('Consulta de búsqueda ultra específica en español para encontrar este producto exacto en Amazon México (ej. "termo acero inoxidable doble pared 500ml tapa de madera")'),
        mercadolibreQuery: z.string().describe('Consulta de búsqueda ultra específica en español para encontrar este producto exacto en Mercado Libre México (ej. "cilindro de plastico deportivo con popote 800ml")')
      }),
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image', image: new URL(imageBase64) }
          ]
        }
      ]
    });

    return NextResponse.json({ success: true, data: object });
  } catch (error: any) {
    console.error('Error analyzing image:', error);
    return NextResponse.json({ error: error.message || 'Error processing image' }, { status: 500 });
  }
}
