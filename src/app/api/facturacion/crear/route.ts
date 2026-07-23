import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { client, items, payment_form, payment_method, use, relation, series, folio } = body;

    if (!client || !items || items.length === 0) {
      return NextResponse.json({ error: 'Datos incompletos para facturación.' }, { status: 400 });
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

    // 2. Mapear conceptos al formato de Facturapi
    const isMoral = client.rfc && client.rfc.replace(/[^A-Za-z0-9]/g, '').length === 12;

    const mappedItems = items.map((item: any) => {
      const itemTaxes: any[] = [
        {
          rate: 0.16, // IVA 16%
          type: 'IVA',
          factor: 'Tasa'
        }
      ];

      if (isMoral) {
        itemTaxes.push({
          rate: 0.0125, // ISR Retenido 1.25%
          type: 'ISR',
          factor: 'Tasa',
          withholding: true
        });
      }

      return {
        quantity: Number(item.cantidad) || 1,
        product: {
          description: item.descripcion,
          price: Number(item.valorUnitario),
          product_key: item.claveSat || '84111506', // Código genérico de servicios de facturación
          unit_key: item.claveUnidad || 'ACT',
          tax_included: false, // Indica que el precio unitario ingresado NO incluye IVA (es más IVA)
          taxes: itemTaxes
        }
      };
    });

    const facturapiPayload: any = {
      type: 'I', // CFDI de Ingreso por defecto
      customer: {
        legal_name: client.razonSocial || client.name,
        tax_id: client.rfc.toUpperCase().trim(),
        tax_system: client.regimenFiscal || '601', // General de Ley Personas Morales
        address: {
          zip: client.codigoPostal || '01000'
        }
      },
      items: mappedItems,
      payment_form: payment_form || '03', // Por defecto Transferencia Electrónica
      payment_method: payment_method || 'PUE', // Pago en una sola exhibición
      use: use || 'G03' // Gastos en general
    };

    if (series !== undefined) {
      facturapiPayload.series = series;
    }
    if (folio !== undefined) {
      facturapiPayload.folio_number = folio;
    }

    // Si hay una sustitución de CFDI previo (Relación 04)
    if (relation && relation.uuid) {
      facturapiPayload.related_documents = [
        {
          relationship: '04', // Sustitución de los CFDIs previos
          documents: [relation.uuid]
        }
      ];
    }

    // 3. Llamar a Facturapi
    const response = await fetch('https://www.facturapi.io/v2/invoices', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${facturapiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(facturapiPayload)
    });

    const resData = await response.json();
    if (!response.ok) {
      console.error("Facturapi Error response:", resData);
      return NextResponse.json({ error: resData.message || 'Error al timbrar en Facturapi.' }, { status: response.status });
    }

    return NextResponse.json({
      success: true,
      invoice: resData
    });

  } catch (error: any) {
    console.error('Error in crear-factura API:', error);
    const detail = error.cause ? ` (${error.cause.code || error.cause.message || error.cause})` : '';
    return NextResponse.json({ 
      error: `Error al conectar con Facturapi: ${error.message}${detail}. Verifica la conexión a internet de la máquina o servidor.` 
    }, { status: 500 });
  }
}
