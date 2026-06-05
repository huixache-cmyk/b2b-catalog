import { supabase } from '@/lib/supabase';

export interface Customer {
  id?: string;
  business_name: string;
  commercial_name?: string;
  rfc?: string;
  customer_type: 'prospect' | 'active' | 'inactive' | 'vip';
  price_level: 'retail' | 'wholesale' | 'distributor' | 'special';
  assigned_discount_percent: number;
  credit_enabled: boolean;
  credit_limit: number;
  payment_terms: string;
  notes?: string;
  accepts_marketing: boolean;
  marketing_channel: 'whatsapp' | 'email' | 'both' | 'none';
  access_key?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CustomerContact {
  id?: string;
  customer_id: string;
  name: string;
  position?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  is_primary: boolean;
  notes?: string;
  created_at?: string;
}

export interface CustomerAddress {
  id?: string;
  customer_id: string;
  address_type: 'shipping' | 'billing' | 'both';
  street: string;
  exterior_number: string;
  interior_number?: string;
  neighborhood: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  reference?: string;
  is_default: boolean;
  created_at?: string;
}

export interface CustomerDiscount {
  id?: string;
  customer_id: string;
  discount_type: 'global' | 'category' | 'product' | 'promotion';
  category_id?: string;
  product_id?: string;
  discount_percent: number;
  valid_from?: string;
  valid_until?: string;
  active: boolean;
  created_at?: string;
}

export interface CustomerActivity {
  id?: string;
  customer_id: string;
  activity_type: 'quote' | 'order' | 'call' | 'whatsapp' | 'email' | 'note' | 'promotion_sent';
  title: string;
  description?: string;
  related_quote_id?: string;
  related_order_id?: string;
  created_by?: string;
  created_at?: string;
}

export interface CustomerSegment {
  id?: string;
  name: string;
  description?: string;
  rules_json: {
    city?: string;
    state?: string;
    postal_code?: string;
    customer_type?: string;
    price_level?: string;
    min_purchases?: number;
    interest_category?: string;
  };
  active: boolean;
  created_at?: string;
}

// CRM Service Implementation
export const crmService = {
  // --- CUSTOMERS CRUD ---
  async getCustomers(): Promise<Customer[]> {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('business_name', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async getCustomerById(id: string): Promise<{
    customer: Customer;
    contacts: CustomerContact[];
    addresses: CustomerAddress[];
    discounts: CustomerDiscount[];
    activities: CustomerActivity[];
  }> {
    const [custRes, contactsRes, addressesRes, discountsRes, activitiesRes] = await Promise.all([
      supabase.from('customers').select('*').eq('id', id).single(),
      supabase.from('customer_contacts').select('*').eq('customer_id', id),
      supabase.from('customer_addresses').select('*').eq('customer_id', id),
      supabase.from('customer_discounts').select('*').eq('customer_id', id),
      supabase.from('customer_activity').select('*').eq('customer_id', id).order('created_at', { ascending: false })
    ]);

    if (custRes.error) throw custRes.error;

    return {
      customer: custRes.data,
      contacts: contactsRes.data || [],
      addresses: addressesRes.data || [],
      discounts: discountsRes.data || [],
      activities: activitiesRes.data || []
    };
  },

  async createCustomer(
    customer: Omit<Customer, 'id' | 'created_at' | 'updated_at'>,
    contacts: Omit<CustomerContact, 'id' | 'customer_id' | 'created_at'>[],
    addresses: Omit<CustomerAddress, 'id' | 'customer_id' | 'created_at'>[],
    discounts: Omit<CustomerDiscount, 'id' | 'customer_id' | 'created_at'>[]
  ): Promise<Customer> {
    // 1. Insert Customer
    const { data: newCust, error: custErr } = await supabase
      .from('customers')
      .insert([customer])
      .select()
      .single();

    if (custErr) throw custErr;
    const customerId = newCust.id;

    // 2. Insert related lists sequentially
    if (contacts && contacts.length > 0) {
      const contactsToInsert = contacts.map(c => ({ ...c, customer_id: customerId }));
      const { error: conErr } = await supabase.from('customer_contacts').insert(contactsToInsert);
      if (conErr) console.error("Error inserting contacts:", conErr);
    }

    if (addresses && addresses.length > 0) {
      const addressesToInsert = addresses.map(a => ({ ...a, customer_id: customerId }));
      const { error: addErr } = await supabase.from('customer_addresses').insert(addressesToInsert);
      if (addErr) console.error("Error inserting addresses:", addErr);
    }

    if (discounts && discounts.length > 0) {
      const discountsToInsert = discounts.map(d => ({ ...d, customer_id: customerId }));
      const { error: discErr } = await supabase.from('customer_discounts').insert(discountsToInsert);
      if (discErr) console.error("Error inserting discounts:", discErr);
    }

    // Log Creation Activity
    await this.logCustomerActivity({
      customer_id: customerId,
      activity_type: 'note',
      title: 'Cliente Creado',
      description: 'El cliente fue registrado exitosamente en el sistema CRM.',
      created_by: 'Administrador'
    });

    return newCust;
  },

  async updateCustomer(id: string, customer: Partial<Customer>): Promise<Customer> {
    const { data, error } = await supabase
      .from('customers')
      .update({ ...customer, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteCustomer(id: string): Promise<void> {
    const { error } = await supabase.from('customers').delete().eq('id', id);
    if (error) throw error;
  },

  // --- CONTACTS CRUD ---
  async addCustomerContact(contact: CustomerContact): Promise<CustomerContact> {
    if (contact.is_primary) {
      // Set all other contacts of this customer to false
      await supabase
        .from('customer_contacts')
        .update({ is_primary: false })
        .eq('customer_id', contact.customer_id);
    }
    const { data, error } = await supabase.from('customer_contacts').insert([contact]).select().single();
    if (error) throw error;
    return data;
  },

  async updateCustomerContact(id: string, contact: Partial<CustomerContact>): Promise<CustomerContact> {
    if (contact.is_primary && contact.customer_id) {
      await supabase
        .from('customer_contacts')
        .update({ is_primary: false })
        .eq('customer_id', contact.customer_id);
    }
    const { data, error } = await supabase.from('customer_contacts').update(contact).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  async deleteCustomerContact(id: string): Promise<void> {
    const { error } = await supabase.from('customer_contacts').delete().eq('id', id);
    if (error) throw error;
  },

  // --- ADDRESSES CRUD ---
  async addCustomerAddress(address: CustomerAddress): Promise<CustomerAddress> {
    if (address.is_default) {
      await supabase
        .from('customer_addresses')
        .update({ is_default: false })
        .eq('customer_id', address.customer_id);
    }
    const { data, error } = await supabase.from('customer_addresses').insert([address]).select().single();
    if (error) throw error;
    return data;
  },

  async updateCustomerAddress(id: string, address: Partial<CustomerAddress>): Promise<CustomerAddress> {
    if (address.is_default && address.customer_id) {
      await supabase
        .from('customer_addresses')
        .update({ is_default: false })
        .eq('customer_id', address.customer_id);
    }
    const { data, error } = await supabase.from('customer_addresses').update(address).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  async deleteCustomerAddress(id: string): Promise<void> {
    const { error } = await supabase.from('customer_addresses').delete().eq('id', id);
    if (error) throw error;
  },

  // --- DISCOUNTS CRUD ---
  async addCustomerDiscount(discount: CustomerDiscount): Promise<CustomerDiscount> {
    const { data, error } = await supabase.from('customer_discounts').insert([discount]).select().single();
    if (error) throw error;
    return data;
  },

  async updateCustomerDiscount(id: string, discount: Partial<CustomerDiscount>): Promise<CustomerDiscount> {
    const { data, error } = await supabase.from('customer_discounts').update(discount).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  async deleteCustomerDiscount(id: string): Promise<void> {
    const { error } = await supabase.from('customer_discounts').delete().eq('id', id);
    if (error) throw error;
  },

  // --- ACTIVITIES ---
  async logCustomerActivity(activity: Omit<CustomerActivity, 'id' | 'created_at'>): Promise<CustomerActivity> {
    const { data, error } = await supabase.from('customer_activity').insert([activity]).select().single();
    if (error) throw error;
    return data;
  },

  // --- SEGMENTS CRUD ---
  async getSegments(): Promise<CustomerSegment[]> {
    const { data, error } = await supabase
      .from('customer_segments')
      .select('*')
      .order('name', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async createSegment(segment: Omit<CustomerSegment, 'id' | 'created_at'>): Promise<CustomerSegment> {
    const { data, error } = await supabase.from('customer_segments').insert([segment]).select().single();
    if (error) throw error;
    return data;
  },

  async updateSegment(id: string, segment: Partial<CustomerSegment>): Promise<CustomerSegment> {
    const { data, error } = await supabase.from('customer_segments').update(segment).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  async deleteSegment(id: string): Promise<void> {
    const { error } = await supabase.from('customer_segments').delete().eq('id', id);
    if (error) throw error;
  }
};
