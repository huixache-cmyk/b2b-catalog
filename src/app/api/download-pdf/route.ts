import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const pdfBase64 = formData.get('pdfBase64') as string;

    if (!pdfBase64) {
      return NextResponse.json({ error: 'No PDF data provided' }, { status: 400 });
    }

    // Extraer la parte de datos base64 eliminando el prefijo de data URI si existe
    const base64Data = pdfBase64.includes(',') ? pdfBase64.split(',')[1] : pdfBase64;
    const pdfBuffer = Buffer.from(base64Data, 'base64');

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        // Esto fuerza al navegador/entorno a guardar el archivo con el nombre exacto
        'Content-Disposition': 'attachment; filename="Catalogo_GeekyStore.pdf"',
        'Content-Length': pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Error in PDF download API:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
