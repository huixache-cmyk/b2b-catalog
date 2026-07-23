import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') || '50';
    const page = searchParams.get('page') || '1';

    // 1. Obtener la FACTURAPI_KEY dinámicamente desde Supabase
    let apiCredentials = { FACTURAPI_KEY: "" };
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
      console.warn("Could not read credentials from Supabase:", dbErr);
    }
    const facturapiKey = apiCredentials.FACTURAPI_KEY || process.env.FACTURAPI_KEY;

    if (!facturapiKey) {
      return NextResponse.json({ error: 'Falta configurar la FACTURAPI_KEY.' }, { status: 400 });
    }

    // 2. Consultar listado de facturas en Facturapi
    const response = await fetch(`https://www.facturapi.io/v2/invoices?limit=${limit}&page=${page}`, {
      headers: {
        'Authorization': `Bearer ${facturapiKey}`
      }
    });

    const resData = await response.json();
    if (!response.ok) {
      console.error("Facturapi list error:", resData);
      return NextResponse.json({ error: resData.message || 'Error al consultar historial de Facturapi.' }, { status: response.status });
    }

    return NextResponse.json({
      success: true,
      invoices: resData.data,
      total_pages: resData.total_pages
    });

  } catch (error: any) {
    console.error('Error in historial API:', error);
    return NextResponse.json({ error: `Internal Server Error: ${error.message}` }, { status: 500 });
  }
}
