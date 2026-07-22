import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { original_invoice_id, amount, description } = body;

    if (!original_invoice_id || !amount) {
      return NextResponse.json({ error: 'Falta el ID de la factura original o el monto de la nota de crédito.' }, { status: 400 });
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

    const authHeader = `Bearer ${facturapiKey}`;

    // 2. Obtener la factura de ingreso original para copiar el cliente y sus datos fiscales
    const originalRes = await fetch(`https://www.facturapi.io/v2/invoices/${original_invoice_id}`, {
      method: 'GET',
      headers: {
        'Authorization': authHeader
      }
    });

    if (!originalRes.ok) {
      const errData = await originalRes.json().catch(() => ({}));
      return NextResponse.json({ error: `No se pudo obtener la factura original: ${errData.message || 'Error de Facturapi'}` }, { status: originalRes.status });
    }

    const originalInvoice = await originalRes.json();
    if (!originalInvoice.uuid) {
      return NextResponse.json({ error: 'La factura original aún no ha sido timbrada ante el SAT (no tiene UUID).' }, { status: 400 });
    }

    // 3. Construir la nota de crédito (CFDI Tipo E - Egreso)
    const creditNotePayload = {
      type: 'E', // Egreso
      customer: {
        legal_name: originalInvoice.customer.legal_name,
        tax_id: originalInvoice.customer.tax_id,
        tax_system: originalInvoice.customer.tax_system || '601',
        address: {
          zip: originalInvoice.customer.address?.zip || '01000'
        }
      },
      items: [
        {
          quantity: 1,
          product: {
            description: description || 'Nota de crédito por descuento o devolución',
            price: Number(amount),
            product_key: '84111506', // Código estándar SAT para servicios de facturación/descuentos
            unit_key: 'ACT', // Unidad de actividad
            taxes: [
              {
                rate: 0.16, // IVA 16%
                type: 'IVA',
                factor: 'Tasa'
              }
            ]
          }
        }
      ],
      // Relacionar la nota de crédito al UUID de la factura de ingreso original
      related_documents: [
        {
          relationship: '01', // Nota de crédito de los documentos relacionados
          documents: [originalInvoice.uuid]
        }
      ],
      payment_form: originalInvoice.payment_form || '03', // Misma forma de pago de la original
      use: 'G02' // Devoluciones, descuentos o bonificaciones
    };

    // 4. Crear la Nota de Crédito en Facturapi
    const response = await fetch('https://www.facturapi.io/v2/invoices', {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(creditNotePayload)
    });

    const resData = await response.json();
    if (!response.ok) {
      console.error("Facturapi Credit Note Error:", resData);
      return NextResponse.json({ error: resData.message || 'Error al emitir la nota de crédito.' }, { status: response.status });
    }

    return NextResponse.json({
      success: true,
      invoice: resData
    });

  } catch (error: any) {
    console.error('Error in nota-credito API:', error);
    const detail = error.cause ? ` (${error.cause.code || error.cause.message || error.cause})` : '';
    return NextResponse.json({ 
      error: `Error al conectar con Facturapi: ${error.message}${detail}. Verifica la conexión a internet de la máquina o servidor.` 
    }, { status: 500 });
  }
}
