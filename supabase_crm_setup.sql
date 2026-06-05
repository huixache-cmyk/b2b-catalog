-- Create custom constraints and types if they don't exist
DO $$ 
BEGIN
    -- Types are not strictly necessary as we use CHECK constraints,
    -- but creating indexes and clean schemas is good practice.
    NULL;
END $$;

-- 1. Tabla customers
CREATE TABLE IF NOT EXISTS public.customers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    business_name text NOT NULL,
    commercial_name text,
    rfc text,
    customer_type text NOT NULL DEFAULT 'prospect' CHECK (customer_type IN ('prospect', 'active', 'inactive', 'vip')),
    price_level text NOT NULL DEFAULT 'retail' CHECK (price_level IN ('retail', 'wholesale', 'distributor', 'special')),
    assigned_discount_percent numeric DEFAULT 0 CHECK (assigned_discount_percent >= 0 AND assigned_discount_percent <= 100),
    credit_enabled boolean DEFAULT false,
    credit_limit numeric DEFAULT 0 CHECK (credit_limit >= 0),
    payment_terms text DEFAULT 'Contado',
    notes text,
    accepts_marketing boolean DEFAULT true,
    marketing_channel text NOT NULL DEFAULT 'both' CHECK (marketing_channel IN ('whatsapp', 'email', 'both', 'none')),
    access_key text UNIQUE,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabla customer_contacts
CREATE TABLE IF NOT EXISTS public.customer_contacts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id uuid REFERENCES public.customers(id) ON DELETE CASCADE,
    name text NOT NULL,
    position text,
    email text,
    phone text,
    whatsapp text,
    is_primary boolean DEFAULT false,
    notes text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabla customer_addresses
CREATE TABLE IF NOT EXISTS public.customer_addresses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id uuid REFERENCES public.customers(id) ON DELETE CASCADE,
    address_type text NOT NULL DEFAULT 'shipping' CHECK (address_type IN ('shipping', 'billing', 'both')),
    street text NOT NULL,
    exterior_number text NOT NULL,
    interior_number text,
    neighborhood text NOT NULL,
    city text NOT NULL,
    state text NOT NULL,
    postal_code text NOT NULL,
    country text NOT NULL DEFAULT 'México',
    reference text,
    is_default boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Tabla customer_discounts
CREATE TABLE IF NOT EXISTS public.customer_discounts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id uuid REFERENCES public.customers(id) ON DELETE CASCADE,
    discount_type text NOT NULL DEFAULT 'global' CHECK (discount_type IN ('global', 'category', 'product', 'promotion')),
    category_id text,
    product_id text,
    discount_percent numeric DEFAULT 0 CHECK (discount_percent >= 0 AND discount_percent <= 100),
    valid_from timestamp with time zone,
    valid_until timestamp with time zone,
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Tabla customer_activity
CREATE TABLE IF NOT EXISTS public.customer_activity (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id uuid REFERENCES public.customers(id) ON DELETE CASCADE,
    activity_type text NOT NULL CHECK (activity_type IN ('quote', 'order', 'call', 'whatsapp', 'email', 'note', 'promotion_sent')),
    title text NOT NULL,
    description text,
    related_quote_id text, -- references quotes(id)
    related_order_id text,
    created_by text DEFAULT 'System',
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Tabla customer_segments
CREATE TABLE IF NOT EXISTS public.customer_segments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    rules_json jsonb DEFAULT '{}'::jsonb,
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Tabla customer_segment_members
CREATE TABLE IF NOT EXISTS public.customer_segment_members (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id uuid REFERENCES public.customers(id) ON DELETE CASCADE,
    segment_id uuid REFERENCES public.customer_segments(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(customer_id, segment_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_customers_rfc ON public.customers(rfc);
CREATE INDEX IF NOT EXISTS idx_customers_type ON public.customers(customer_type);
CREATE INDEX IF NOT EXISTS idx_customers_access_key ON public.customers(access_key);
CREATE INDEX IF NOT EXISTS idx_customer_contacts_customer_id ON public.customer_contacts(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_addresses_customer_id ON public.customer_addresses(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_discounts_customer_id ON public.customer_discounts(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_activity_customer_id ON public.customer_activity(customer_id);
CREATE INDEX IF NOT EXISTS idx_segment_members_customer_id ON public.customer_segment_members(customer_id);
CREATE INDEX IF NOT EXISTS idx_segment_members_segment_id ON public.customer_segment_members(segment_id);

-- Enable RLS
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_segment_members ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow admin manage customers" ON public.customers;
DROP POLICY IF EXISTS "Allow admin manage customer_contacts" ON public.customer_contacts;
DROP POLICY IF EXISTS "Allow admin manage customer_addresses" ON public.customer_addresses;
DROP POLICY IF EXISTS "Allow admin manage customer_discounts" ON public.customer_discounts;
DROP POLICY IF EXISTS "Allow admin manage customer_activity" ON public.customer_activity;
DROP POLICY IF EXISTS "Allow admin manage customer_segments" ON public.customer_segments;
DROP POLICY IF EXISTS "Allow admin manage customer_segment_members" ON public.customer_segment_members;

DROP POLICY IF EXISTS "Allow public read customers" ON public.customers;
DROP POLICY IF EXISTS "Allow public read contacts" ON public.customer_contacts;
DROP POLICY IF EXISTS "Allow public read addresses" ON public.customer_addresses;
DROP POLICY IF EXISTS "Allow public read discounts" ON public.customer_discounts;
DROP POLICY IF EXISTS "Allow public read activities" ON public.customer_activity;

-- Create Policies
CREATE POLICY "Allow admin manage customers" ON public.customers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow admin manage customer_contacts" ON public.customer_contacts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow admin manage customer_addresses" ON public.customer_addresses FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow admin manage customer_discounts" ON public.customer_discounts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow admin manage customer_activity" ON public.customer_activity FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow admin manage customer_segments" ON public.customer_segments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow admin manage customer_segment_members" ON public.customer_segment_members FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Allow public read/search for B2B client logins and pricing
CREATE POLICY "Allow public read customers" ON public.customers FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow public read contacts" ON public.customer_contacts FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow public read addresses" ON public.customer_addresses FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow public read discounts" ON public.customer_discounts FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow public read activities" ON public.customer_activity FOR SELECT TO anon, authenticated USING (true);

-- Allow public insert for registration requests
CREATE POLICY "Allow public insert customers" ON public.customers FOR INSERT TO anon, authenticated WITH CHECK (customer_type = 'prospect');
CREATE POLICY "Allow public insert contacts" ON public.customer_contacts FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Allow public insert activities" ON public.customer_activity FOR INSERT TO anon, authenticated WITH CHECK (activity_type = 'note' OR activity_type = 'whatsapp');
CREATE POLICY "Allow public insert addresses" ON public.customer_addresses FOR INSERT TO anon, authenticated WITH CHECK (true);

