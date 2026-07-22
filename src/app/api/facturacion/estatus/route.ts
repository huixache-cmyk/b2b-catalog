import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Falta el ID de la factura para consultar estatus.' }, { status: 400 });
    }

    // 1. Obtener la llave dinámica de Facturapi
    let apiCredentials: any = {};
    try {
      const { data: settingsData } = await supabase
        .from('settings')
        .select('home_settings')
        .eq('id', 1)
        .single();
      if (settingsData?.home_settings?.api_credentials) {
        apiCredentials = settingsData.home_settings.api_credentials;
      }
    } catch (dbErr) {
      console.warn("Could not read dynamic credentials from Supabase:", dbErr);
    }
    const facturapiKey = apiCredentials.FACTURAPI_KEY || process.env.FACTURAPI_KEY;

    if (!facturapiKey) {
      return NextResponse.json({ error: 'Falta configurar la FACTURAPI_KEY en el panel de Diagnósticos.' }, { status: 400 });
    }

    // 2. Consultar Facturapi
    const response = await fetch(`https://www.facturapi.io/v2/invoices/${id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${facturapiKey}`
      }
    });

    const resData = await response.json();
    if (!response.ok) {
      console.error("Facturapi Get Error:", resData);
      return NextResponse.json({ error: resData.message || 'Error al obtener estatus de la factura.' }, { status: response.status });
    }

    return NextResponse.json({
      success: true,
      invoice: resData
    });

  } catch (error: any) {
    console.error('Error in estatus-factura API:', error);
    const detail = error.cause ? ` (${error.cause.code || error.cause.message || error.cause})` : '';
    return NextResponse.json({ 
      error: `Error al conectar con Facturapi: ${error.message}${detail}. Verifica la conexión a internet de la máquina o servidor.` 
    }, { status: 500 });
  }
}
