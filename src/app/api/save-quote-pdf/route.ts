import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

import { verifyUser } from '@/lib/auth';
import { z } from 'zod';

const saveQuoteSchema = z.object({
  pdfBase64: z.string().min(1, 'pdfBase64 has to be defined'),
  clientName: z.string().min(1, 'clientName has to be defined'),
  quoteId: z.string().min(1, 'quoteId has to be defined'),
});

export async function POST(request: Request) {
  try {
    const user = await verifyUser(request);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const body = await request.json();
    const validation = saveQuoteSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Payload inválido', details: validation.error.format() }, { status: 400 });
    }
    const { pdfBase64, clientName, quoteId } = validation.data;

    // Extraer la parte de datos base64 eliminando el prefijo de data URI si existe
    const base64Data = pdfBase64.includes(',') ? pdfBase64.split(',')[1] : pdfBase64;
    const pdfBuffer = Buffer.from(base64Data, 'base64');

    // Normalizar el nombre del cliente para evitar caracteres no válidos en carpetas
    const safeClientName = clientName
      .replace(/[^a-zA-Z0-9_\-\s]/g, '')
      .trim();

    // Ruta base en la computadora del usuario (OneDrive)
    const baseDir = 'C:\\Users\\USUARIO FINAL\\OneDrive\\Documentos\\GEEKYSTORE\\Clientes';
    const clientDir = path.join(baseDir, safeClientName || 'Cliente_Sin_Nombre');

    // Crear la carpeta del cliente si no existe
    await fs.mkdir(clientDir, { recursive: true });

    // Ruta de destino completa del PDF
    const filePath = path.join(clientDir, `Cotizacion_${quoteId}.pdf`);

    // Guardar el archivo en el disco
    await fs.writeFile(filePath, pdfBuffer);

    console.log(`PDF de cotización guardado automáticamente en: ${filePath}`);
    
    return NextResponse.json({ success: true, filePath });
  } catch (error: any) {
    console.error('Error auto-saving quote PDF locally:', error);
    // Retornamos error pero de forma controlada para que el frontend lo ignore si corre en la nube
    return NextResponse.json({ error: 'Failed to write PDF locally', details: error.message }, { status: 500 });
  }
}
