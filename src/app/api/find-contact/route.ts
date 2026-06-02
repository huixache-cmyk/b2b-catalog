import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

import { verifyUser } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const user = await verifyUser(request);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const { company_id, company_name, opp_id } = await request.json();
    
    if (!company_name || !company_id) {
      return NextResponse.json({ error: 'Faltan parámetros requeridos' }, { status: 400 });
    }

    const HUNTER_API_KEY = process.env.HUNTER_API_KEY;
    if (!HUNTER_API_KEY) {
      return NextResponse.json({ error: 'Falta HUNTER_API_KEY' }, { status: 500 });
    }

    // 1. Clearbit para el Dominio
    const clearbitUrl = `https://autocomplete.clearbit.com/v1/companies/suggest?query=${encodeURIComponent(company_name)}`;
    const clearbitRes = await fetch(clearbitUrl);
    
    let domain = null;
    if (clearbitRes.ok) {
      const data = await clearbitRes.json();
      if (data && data.length > 0) {
        domain = data[0].domain;
      }
    }

    if (!domain) {
      return NextResponse.json({ error: 'No se pudo encontrar el dominio web de la empresa' }, { status: 404 });
    }

    // 2. Hunter.io para Correos
    const hunterUrl = `https://api.hunter.io/v2/domain-search?domain=${domain}&limit=5&api_key=${HUNTER_API_KEY}`;
    const hunterRes = await fetch(hunterUrl);
    
    if (!hunterRes.ok) {
      return NextResponse.json({ error: 'Error en la API de Hunter.io' }, { status: 500 });
    }

    const hunterData = await hunterRes.json();
    const emails = hunterData?.data?.emails || [];

    if (emails.length === 0) {
      return NextResponse.json({ error: 'No se encontraron contactos públicos para este dominio' }, { status: 404 });
    }

    const bestEmail = emails[0];
    const contactData = {
      full_name: `${bestEmail.first_name || ''} ${bestEmail.last_name || ''}`.trim() || 'Contacto Corporativo',
      email: bestEmail.value,
      job_title: bestEmail.position || 'Manager',
      confidence: bestEmail.confidence || 50
    };

    // 3. Actualizar la base de datos (Contacto)
    const { error: contactError } = await supabase
      .from('b2b_contacts')
      .update(contactData)
      .eq('company_id', company_id);

    if (contactError) {
      return NextResponse.json({ error: 'Error al actualizar contacto en Supabase' }, { status: 500 });
    }

    // 4. Actualizar la Oportunidad a 'Contacto Identificado'
    if (opp_id) {
      await supabase
        .from('b2b_opportunities')
        .update({ stage: 'Contacto Identificado' })
        .eq('id', opp_id);
    }

    return NextResponse.json({ 
      success: true, 
      contact: contactData,
      domain: domain
    });

  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
