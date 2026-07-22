import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, motive, substitution } = body;

    if (!id || !motive) {
      return NextResponse.json({ error: 'Falta ID de factura y motivo de cancelación.' }, { status: 400 });
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

    // 2. Construir la URL de cancelación con parámetros
    // Facturapi DELETE request: https://api.facturapi.io/v1/invoices/{id}?motive={motive}&substitution={substitution}
    let cancelUrl = `https://api.facturapi.io/v1/invoices/${id}?motive=${motive}`;
    if (motive === '01' && substitution) {
      cancelUrl += `&substitution=${substitution}`;
    }

    // 3. Ejecutar la llamada DELETE
    const authHeader = `Basic ${Buffer.from(facturapiKey + ':').toString('base64')}`;
    const response = await fetch(cancelUrl, {
      method: 'DELETE',
      headers: {
        'Authorization': authHeader
      }
    });

    const resData = await response.json();
    if (!response.ok) {
      console.error("Facturapi Cancel Error:", resData);
      return NextResponse.json({ error: resData.message || 'Error al cancelar la factura.' }, { status: response.status });
    }

    return NextResponse.json({
      success: true,
      invoice: resData
    });

  } catch (error: any) {
    console.error('Error in cancelar-factura API:', error);
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}
