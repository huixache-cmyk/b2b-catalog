import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { original_invoice_id, payment_form, amount, installment_number, last_balance } = body;

    if (!original_invoice_id || !payment_form || !amount || !installment_number) {
      return NextResponse.json({ error: 'Faltan parámetros indispensables (ID factura, forma de pago, monto, número de parcialidad).' }, { status: 400 });
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

    // 2. Obtener la factura PPD original para copiar sus datos fiscales
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

    const balanceBeforePayment = Number(last_balance) || originalInvoice.total;
    const paidAmount = Number(amount);
    const taxBase = paidAmount / 1.16;
    const taxTotal = paidAmount - taxBase;

    // 3. Construir el recibo de pago (CFDI Tipo P - Pago)
    const paymentComplementPayload = {
      type: 'P', // Pago
      customer: {
        legal_name: originalInvoice.customer.legal_name,
        tax_id: originalInvoice.customer.tax_id,
        tax_system: originalInvoice.customer.tax_system || '601',
        address: {
          zip: originalInvoice.customer.address?.zip || '01000'
        }
      },
      complements: [
        {
          type: 'pago',
          data: [
            {
              payment_form: payment_form, // Ej. 03 (Transferencia)
              related_documents: [
                {
                  uuid: originalInvoice.uuid,
                  amount: paidAmount,
                  installment: Number(installment_number),
                  last_balance: balanceBeforePayment,
                  currency: 'MXN',
                  taxes: [
                    {
                      base: Number(taxBase.toFixed(2)),
                      name: 'IVA',
                      rate: 0.16,
                      total: Number(taxTotal.toFixed(2)),
                      is_retention: false
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    };

    // 4. Crear el Complemento de Pago en Facturapi
    const response = await fetch('https://www.facturapi.io/v2/invoices', {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(paymentComplementPayload)
    });

    const resData = await response.json();
    if (!response.ok) {
      console.error("Facturapi Payment Complement Error:", resData);
      return NextResponse.json({ error: resData.message || 'Error al emitir el complemento de pago.' }, { status: response.status });
    }

    return NextResponse.json({
      success: true,
      invoice: resData
    });

  } catch (error: any) {
    console.error('Error in complemento-pago API:', error);
    const detail = error.cause ? ` (${error.cause.code || error.cause.message || error.cause})` : '';
    return NextResponse.json({ 
      error: `Error al conectar con Facturapi: ${error.message}${detail}. Verifica la conexión a internet de la máquina o servidor.` 
    }, { status: 500 });
  }
}
