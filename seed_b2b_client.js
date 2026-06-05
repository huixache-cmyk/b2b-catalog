const { createClient } = require('@supabase/supabase-js');
const { loadEnvConfig } = require('@next/env');

// Load environment variables
loadEnvConfig(process.cwd());

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Supabase environment variables not found in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedB2BClient() {
  console.log('Connecting to Supabase...');
  
  // 1. Check if tables exist
  const { error: tableErr } = await supabase.from('customers').select('id').limit(1);
  if (tableErr) {
    console.error('Error querying customers table. Have you run the supabase_crm_setup.sql migration script in the Supabase SQL editor?');
    console.error('Database Error details:', tableErr.message);
    process.exit(1);
  }

  // 2. Check if GS-B2B-TEST customer already exists
  const { data: existing } = await supabase
    .from('customers')
    .select('id')
    .eq('access_key', 'GS-B2B-TEST')
    .maybeSingle();

  if (existing) {
    console.log('Customer with access key "GS-B2B-TEST" already exists. Deleting to re-create...');
    await supabase.from('customers').delete().eq('id', existing.id);
  }

  // 3. Create test customer
  const newCustomer = {
    business_name: 'GeekyStore B2B Test S.A. de C.V.',
    commercial_name: 'Geeky B2B Client',
    rfc: 'XAXX010101000',
    customer_type: 'vip',
    price_level: 'wholesale',
    assigned_discount_percent: 10,
    credit_enabled: true,
    credit_limit: 50000,
    payment_terms: '30 días de crédito',
    notes: 'Cliente de pruebas para validación de escalas de precios y cotizaciones B2B.',
    accepts_marketing: true,
    marketing_channel: 'both',
    access_key: 'GS-B2B-TEST'
  };

  const { data: customer, error: custErr } = await supabase
    .from('customers')
    .insert([newCustomer])
    .select()
    .single();

  if (custErr) {
    console.error('Failed to create customer:', custErr.message);
    process.exit(1);
  }
  
  console.log('Created customer: Geeky B2B Client (access_key: GS-B2B-TEST)');

  // 4. Create contact
  const newContact = {
    customer_id: customer.id,
    name: 'Juan Pérez B2B',
    position: 'Gerente General de Compras',
    email: 'test@geekystore.mx',
    phone: '4491234567',
    whatsapp: '4491234567',
    is_primary: true,
    notes: 'Contacto primario autorizado para cotizar.'
  };

  const { error: conErr } = await supabase
    .from('customer_contacts')
    .insert([newContact]);

  if (conErr) {
    console.error('Failed to create contact:', conErr.message);
  } else {
    console.log('Created primary contact: Juan Pérez B2B (email: test@geekystore.mx)');
  }

  // 5. Create address
  const newAddress = {
    customer_id: customer.id,
    address_type: 'shipping',
    street: 'Av. Las Americas',
    exterior_number: '123',
    neighborhood: 'Las Americas',
    city: 'Aguascalientes',
    state: 'Aguascalientes',
    postal_code: '20196',
    country: 'México',
    reference: 'Frente al parque principal',
    is_default: true
  };

  const { error: addErr } = await supabase
    .from('customer_addresses')
    .insert([newAddress]);

  if (addErr) {
    console.error('Failed to create address:', addErr.message);
  } else {
    console.log('Created default shipping address: Av. Las Americas 123, Aguascalientes');
  }

  // 6. Create category discount for testing
  const newDiscount = {
    customer_id: customer.id,
    discount_type: 'category',
    category_id: 'Tecnología',
    discount_percent: 15,
    active: true
  };

  const { error: discErr } = await supabase
    .from('customer_discounts')
    .insert([newDiscount]);

  if (discErr) {
    console.error('Failed to create category discount:', discErr.message);
  } else {
    console.log('Created category discount rule: 15% off categories matching "Tecnología"');
  }

  console.log('B2B Client Seed completed successfully!');
}

seedB2BClient();
