import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const format = searchParams.get('format') || 'pdf'; // pdf, xml, zip

    if (!id) {
      return NextResponse.json({ error: 'Falta el ID de la factura.' }, { status: 400 });
    }

    // 1. Obtener la FACTURAPI_KEY dinámicamente desde Supabase
    let apiCredentials = { FACTURAPI_KEY: "" };
    try {
      const { data: settingsData, error } = await supabase
        .from('settings')
        .select('home_settings')
        .eq('id', 'global')
        .single();
      if (settingsData?.home_settings?.api_credentials) {
        apiCredentials = settingsData.home_settings.api_credentials;
      }
    } catch (dbErr) {
      console.warn("Could not read dynamic credentials from Supabase:", dbErr);
    }
    const facturapiKey = apiCredentials.FACTURAPI_KEY || process.env.FACTURAPI_KEY;

    if (!facturapiKey) {
      return NextResponse.json({ error: 'Falta configurar la FACTURAPI_KEY.' }, { status: 400 });
    }

    // 2. Descargar el archivo desde Facturapi
    const response = await fetch(`https://www.facturapi.io/v2/invoices/${id}/${format}`, {
      headers: {
        'Authorization': `Bearer ${facturapiKey}`
      }
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`Error downloading ${format} from Facturapi:`, errText);
      return NextResponse.json({ error: 'No se pudo descargar el archivo de Facturapi.' }, { status: response.status });
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const uint8Array = new Uint8Array(buffer);

    // Definir los tipos MIME y extensiones correctas
    const mimeTypes: Record<string, string> = {
      pdf: 'application/pdf',
      xml: 'text/xml',
      zip: 'application/zip'
    };

    const contentType = mimeTypes[format] || 'application/octet-stream';
    const filename = `factura_${id}.${format}`;

    return new NextResponse(uint8Array, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': uint8Array.length.toString(),
      },
    });

  } catch (error: any) {
    console.error('Error in descargar API:', error);
    return NextResponse.json({ error: `Internal Server Error: ${error.message}` }, { status: 500 });
  }
}
