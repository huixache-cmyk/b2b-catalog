import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { customer_id, coupon } = body;

    if (!customer_id || !coupon) {
      return NextResponse.json({ error: 'Faltan parámetros requeridos' }, { status: 400 });
    }

    // Secure validation of allowed self-claimed coupons
    const allowedCoupons = ['ENVIO_SIN_COSTO', 'MUESTRA_Y_ENVIO_GRATIS'];
    if (!allowedCoupons.includes(coupon)) {
      return NextResponse.json({ error: 'Cupón no permitido para auto-reclamo' }, { status: 400 });
    }

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Faltan credenciales de Supabase en el servidor' }, { status: 500 });
    }

    // Use service role client to bypass RLS securely on server
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify if discount already exists
    const { data: existing, error: checkError } = await supabase
      .from('customer_discounts')
      .select('*')
      .eq('customer_id', customer_id)
      .eq('discount_type', 'promotion')
      .eq('category_id', coupon);

    if (checkError) {
      return NextResponse.json({ error: checkError.message }, { status: 500 });
    }

    if (existing && existing.length > 0) {
      return NextResponse.json({ success: true, message: 'El cupón ya está registrado' });
    }

    // Insert new promotion discount
    const { error: insertError } = await supabase
      .from('customer_discounts')
      .insert([{
        customer_id,
        discount_type: 'promotion',
        category_id: coupon,
        discount_percent: 0,
        active: true
      }]);

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in claim-coupon API:', error);
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}
