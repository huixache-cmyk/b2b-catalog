-- maint_setup.sql
-- Create table for service health
CREATE TABLE IF NOT EXISTS public.service_health (
    id text PRIMARY KEY,
    status text NOT NULL CHECK (status IN ('OK', 'WARNING', 'ERROR')),
    latency integer NOT NULL DEFAULT 0,
    message text,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.service_health ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow public select" ON public.service_health;
DROP POLICY IF EXISTS "Allow admin manage service_health" ON public.service_health;

-- Create policies
CREATE POLICY "Allow public select" ON public.service_health FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow admin manage service_health" ON public.service_health FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Create table for vendor notifications
CREATE TABLE IF NOT EXISTS public.vendor_notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    provider text NOT NULL,
    subject text NOT NULL,
    summary text NOT NULL,
    severity text NOT NULL CHECK (severity IN ('low', 'medium', 'critical')),
    action_required text,
    raw_content text,
    resolved boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.vendor_notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow admin manage vendor_notifications" ON public.vendor_notifications;
DROP POLICY IF EXISTS "Allow public select vendor_notifications" ON public.vendor_notifications;

-- Create policies
CREATE POLICY "Allow public select vendor_notifications" ON public.vendor_notifications FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow admin manage vendor_notifications" ON public.vendor_notifications FOR ALL TO authenticated USING (true) WITH CHECK (true);
