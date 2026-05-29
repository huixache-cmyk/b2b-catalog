CREATE TABLE IF NOT EXISTS public.quotes (
    id text PRIMARY KEY,
    date timestamp with time zone NOT NULL,
    client jsonb NOT NULL,
    items jsonb NOT NULL,
    total numeric NOT NULL,
    status text NOT NULL DEFAULT 'pending',
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_quotes_date ON public.quotes (date DESC);

CREATE TABLE IF NOT EXISTS public.b2b_companies (
    id text PRIMARY KEY,
    name text NOT NULL,
    industry text,
    city text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.b2b_signals (
    id text PRIMARY KEY,
    company_id text REFERENCES public.b2b_companies(id) ON DELETE CASCADE,
    signal_type text NOT NULL,
    signal_date timestamp with time zone NOT NULL,
    source_url text,
    description text,
    score numeric DEFAULT 0,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.b2b_contacts (
    id text PRIMARY KEY,
    company_id text REFERENCES public.b2b_companies(id) ON DELETE CASCADE,
    full_name text NOT NULL,
    job_title text,
    linkedin_url text,
    email text,
    phone text,
    confidence numeric DEFAULT 0,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.b2b_hooks (
    id text PRIMARY KEY,
    company_id text REFERENCES public.b2b_companies(id) ON DELETE CASCADE,
    hook_text text NOT NULL,
    recommended_kit text,
    estimated_budget numeric,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.b2b_opportunities (
    id text PRIMARY KEY,
    company_id text REFERENCES public.b2b_companies(id) ON DELETE CASCADE,
    total_score numeric DEFAULT 0,
    stage text NOT NULL DEFAULT 'Lead Detectado',
    next_action text,
    owner text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    hook_text text
);

CREATE TABLE IF NOT EXISTS public.b2b_scraper_config (
    id integer PRIMARY KEY DEFAULT 1,
    is_active boolean DEFAULT false,
    search_keywords text DEFAULT 'aperturas, crecimiento, nuevas oficinas',
    last_run_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    target_companies text DEFAULT '',
    target_sectors text DEFAULT ''
);

INSERT INTO public.b2b_scraper_config (id, is_active, search_keywords) 
VALUES (1, false, 'aperturas, crecimiento, nuevas oficinas') 
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS cost numeric DEFAULT 0;

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.b2b_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.b2b_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.b2b_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.b2b_hooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.b2b_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.b2b_scraper_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public select" ON public.products;
DROP POLICY IF EXISTS "Allow public insert to quotes" ON public.quotes;
DROP POLICY IF EXISTS "Allow public read to quotes" ON public.quotes;
DROP POLICY IF EXISTS "Allow public update to quotes" ON public.quotes;
DROP POLICY IF EXISTS "Allow public delete to quotes" ON public.quotes;
DROP POLICY IF EXISTS "Allow public read to settings" ON public.settings;
DROP POLICY IF EXISTS "Allow public update to settings" ON public.settings;
DROP POLICY IF EXISTS "Allow public all to b2b_companies" ON public.b2b_companies;
DROP POLICY IF EXISTS "Allow public all to b2b_signals" ON public.b2b_signals;
DROP POLICY IF EXISTS "Allow public all to b2b_contacts" ON public.b2b_contacts;
DROP POLICY IF EXISTS "Allow public all to b2b_hooks" ON public.b2b_hooks;
DROP POLICY IF EXISTS "Allow public all to b2b_opportunities" ON public.b2b_opportunities;
DROP POLICY IF EXISTS "Allow public all to b2b_scraper_config" ON public.b2b_scraper_config;

CREATE POLICY "Allow public select" ON public.products FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow admin manage products" ON public.products FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow public select" ON public.settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow admin manage settings" ON public.settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow public insert" ON public.quotes FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Allow admin manage quotes" ON public.quotes FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow admin manage b2b_companies" ON public.b2b_companies FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow admin manage b2b_signals" ON public.b2b_signals FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow admin manage b2b_contacts" ON public.b2b_contacts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow admin manage b2b_hooks" ON public.b2b_hooks FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow admin manage b2b_opportunities" ON public.b2b_opportunities FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow admin manage b2b_scraper_config" ON public.b2b_scraper_config FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Nueva actualización: Casilla para publicar y campos de compra mínima / descuentos por volumen
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS published boolean DEFAULT true;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS "minPurchase" integer DEFAULT 50;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS "discountQty1" integer DEFAULT 100;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS "discountQty2" integer DEFAULT 150;

-- ==========================================
-- Documentación: Tablas de Proveedores
-- NOTA: Actualmente la aplicación utiliza el almacenamiento dinámico en settings.home_settings
-- para evitar fallos de RLS / DDL en el despliegue automático.
-- Si deseas migrar a tablas dedicadas en el futuro, ejecuta el siguiente bloque SQL:
-- ==========================================

-- CREATE TABLE IF NOT EXISTS public.print_suppliers (
--     id text PRIMARY KEY,
--     name text NOT NULL,
--     contact text,
--     phone1 text,
--     phone2 text,
--     address text,
--     grabado_chico numeric DEFAULT 0,
--     grabado_grande numeric DEFAULT 0,
--     dtf numeric DEFAULT 0,
--     seri_1_tinta numeric DEFAULT 0,
--     seri_2_tintas numeric DEFAULT 0,
--     seri_3_tintas numeric DEFAULT 0,
--     seri_4_tintas numeric DEFAULT 0,
--     created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
-- );

-- CREATE TABLE IF NOT EXISTS public.product_suppliers (
--     id text PRIMARY KEY,
--     name text NOT NULL,
--     contact text,
--     phone1 text,
--     phone2 text,
--     address text,
--     created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
-- );

-- Habilitar RLS para ambas tablas:
-- ALTER TABLE public.print_suppliers ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.product_suppliers ENABLE ROW LEVEL SECURITY;

-- Crear políticas de acceso:
-- CREATE POLICY "Allow admin manage print_suppliers" ON public.print_suppliers FOR ALL TO authenticated USING (true) WITH CHECK (true);
-- CREATE POLICY "Allow admin manage product_suppliers" ON public.product_suppliers FOR ALL TO authenticated USING (true) WITH CHECK (true);


