-- Script para crear la tabla de cotizaciones en Supabase
-- Ejecuta este script en el editor SQL de tu panel de control de Supabase.

CREATE TABLE IF NOT EXISTS public.quotes (
    id text PRIMARY KEY,
    date timestamp with time zone NOT NULL,
    client jsonb NOT NULL,
    items jsonb NOT NULL,
    total numeric NOT NULL,
    status text NOT NULL DEFAULT 'pending',
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Configurar permisos RLS (Row Level Security)
-- Si es un catálogo público donde cualquiera puede enviar cotizaciones,
-- necesitamos habilitar que usuarios anónimos inserten datos.
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

-- Política para permitir a cualquiera insertar cotizaciones (el cliente desde el catálogo web)
CREATE POLICY "Allow public insert to quotes" 
ON public.quotes FOR INSERT 
TO public 
WITH CHECK (true);

-- Política para permitir que solo administradores o lecturas públicas limitadas ocurran
-- (Nota: Para un panel B2B básico sin Auth, puedes permitir lectura pública. 
-- Si quieres mayor seguridad, ajusta esto según tu configuración de Auth de Supabase)
CREATE POLICY "Allow public read to quotes" 
ON public.quotes FOR SELECT 
TO public 
USING (true);

-- Política para permitir actualizaciones (para cambiar el status en el panel Admin)
CREATE POLICY "Allow public update to quotes" 
ON public.quotes FOR UPDATE 
TO public 
USING (true);

-- Política para permitir eliminaciones (para borrar cotizaciones en el panel Admin)
CREATE POLICY "Allow public delete to quotes" 
ON public.quotes FOR DELETE 
TO public 
USING (true);

-- Opcional: Índice para mejorar el rendimiento de ordenamiento por fecha
CREATE INDEX IF NOT EXISTS idx_quotes_date ON public.quotes (date DESC);

-- ==========================================
-- AGENTE DE INTELIGENCIA COMERCIAL B2B
-- ==========================================

CREATE TABLE IF NOT EXISTS public.b2b_companies (
    id text PRIMARY KEY,
    name text NOT NULL,
    industry text,
    city text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.b2b_signals (
    id text PRIMARY KEY,
    company_id text REFERENCES public.b2b_companies(id),
    signal_type text NOT NULL,
    signal_date timestamp with time zone NOT NULL,
    source_url text,
    description text,
    score numeric DEFAULT 0,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.b2b_contacts (
    id text PRIMARY KEY,
    company_id text REFERENCES public.b2b_companies(id),
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
    company_id text REFERENCES public.b2b_companies(id),
    hook_text text NOT NULL,
    recommended_kit text,
    estimated_budget numeric,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.b2b_opportunities (
    id text PRIMARY KEY,
    company_id text REFERENCES public.b2b_companies(id),
    total_score numeric DEFAULT 0,
    stage text NOT NULL DEFAULT 'Lead Detectado',
    next_action text,
    owner text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS para todas las nuevas tablas
ALTER TABLE public.b2b_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.b2b_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.b2b_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.b2b_hooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.b2b_opportunities ENABLE ROW LEVEL SECURITY;

-- Políticas permisivas para el panel admin (Ajustar en producción si se requiere Auth)
CREATE POLICY "Allow public all to b2b_companies" ON public.b2b_companies FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all to b2b_signals" ON public.b2b_signals FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all to b2b_contacts" ON public.b2b_contacts FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all to b2b_hooks" ON public.b2b_hooks FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all to b2b_opportunities" ON public.b2b_opportunities FOR ALL TO public USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.b2b_scraper_config (
    id integer PRIMARY KEY DEFAULT 1,
    is_active boolean DEFAULT false,
    search_keywords text DEFAULT 'aperturas, crecimiento, nuevas oficinas',
    last_run_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.b2b_scraper_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public all to b2b_scraper_config" ON public.b2b_scraper_config FOR ALL TO public USING (true) WITH CHECK (true);

INSERT INTO public.b2b_scraper_config (id, is_active, search_keywords) VALUES (1, false, 'aperturas, crecimiento, nuevas oficinas') ON CONFLICT (id) DO NOTHING;

-- Fase 6: Agregar campo para guardar correos generados por IA
ALTER TABLE public.b2b_opportunities ADD COLUMN IF NOT EXISTS hook_text TEXT;
