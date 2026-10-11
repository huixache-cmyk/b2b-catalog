-- ==============================================================================
-- FRIMART OS & SISTEMA DE INTELIGENCIA COMERCIAL LA HUERTA
-- ARCHIVO DE MIGRACIÓN SUPABASE: supabase_frimart_setup.sql
-- ==============================================================================

-- 1. TABLA DE CEDIS (Centros de Distribución)
CREATE TABLE IF NOT EXISTS public.frimart_cedis (
    id TEXT PRIMARY KEY,
    codigo TEXT UNIQUE NOT NULL,
    nombre TEXT NOT NULL,
    ciudad TEXT NOT NULL,
    direccion TEXT,
    latitud NUMERIC(10,6),
    longitud NUMERIC(10,6),
    telefono TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. TABLA DE USUARIOS Y ROLES (Control de Acceso por PIN)
CREATE TABLE IF NOT EXISTS public.frimart_usuarios (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    email TEXT,
    pin TEXT NOT NULL,
    rol TEXT NOT NULL CHECK (rol IN ('vendedor', 'supervisor', 'gerente_cedis', 'director_comercial', 'propietario')),
    cedis_id TEXT REFERENCES public.frimart_cedis(id) ON DELETE SET NULL,
    activo BOOLEAN DEFAULT true NOT NULL,
    permisos JSONB DEFAULT '{"ventas": true, "rutas": true, "congeladores": true, "auditorias": true, "reportes": false, "admin": false}'::jsonb,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. TABLA DE PUNTOS DE VENTA (Clientes en Ruta)
CREATE TABLE IF NOT EXISTS public.frimart_puntos_venta (
    id TEXT PRIMARY KEY,
    codigo TEXT NOT NULL,
    nombre TEXT NOT NULL,
    direccion TEXT NOT NULL,
    ciudad TEXT NOT NULL,
    latitud NUMERIC(10,6) NOT NULL,
    longitud NUMERIC(10,6) NOT NULL,
    radio_geocerca INT DEFAULT 100 NOT NULL,
    cedis_id TEXT REFERENCES public.frimart_cedis(id) ON DELETE CASCADE,
    ruta_id TEXT,
    estatus TEXT DEFAULT 'pending' CHECK (estatus IN ('pending', 'in_progress', 'completed')),
    telefono TEXT,
    contacto TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. TABLA DE CONGELADORES LA HUERTA
CREATE TABLE IF NOT EXISTS public.frimart_congeladores (
    id TEXT PRIMARY KEY,
    codigo_qr TEXT UNIQUE NOT NULL,
    modelo TEXT NOT NULL,
    tienda_id TEXT REFERENCES public.frimart_puntos_venta(id) ON DELETE SET NULL,
    temperatura_actual NUMERIC(4,1) DEFAULT -18.4,
    temperatura_alerta NUMERIC(4,1) DEFAULT -15.0,
    ultima_auditoria TIMESTAMP WITH TIME ZONE,
    estatus TEXT DEFAULT 'optimo' CHECK (estatus IN ('optimo', 'advertencia', 'critico', 'mantenimiento')),
    foto_evidencia_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. TABLA DE MODELOS Y PLANOGRAMAS MAESTROS
CREATE TABLE IF NOT EXISTS public.frimart_planogramas (
    id TEXT PRIMARY KEY,
    modelo_congelador TEXT UNIQUE NOT NULL,
    nombre_modelo TEXT NOT NULL,
    tipo TEXT NOT NULL, -- 'horizontal' | 'vertical' | 'isla'
    capacidad_cajas INT NOT NULL,
    niveles INT NOT NULL,
    frentes_por_nivel INT NOT NULL,
    matriz_niveles JSONB NOT NULL, -- Productos oficiales obligatorios por nivel y posición
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. TABLA DE PRODUCTOS Y CATÁLOGO MAESTRO LA HUERTA
CREATE TABLE IF NOT EXISTS public.frimart_productos (
    id TEXT PRIMARY KEY,
    sku TEXT UNIQUE NOT NULL,
    codigo_barras TEXT,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    categoria TEXT NOT NULL, -- 'Helados' | 'Paletas' | 'Verduras Congeladas' | 'Frutas' | 'Hielo'
    precio_venta NUMERIC(10,2) NOT NULL,
    costo_unitario NUMERIC(10,2) NOT NULL,
    piezas_por_caja INT DEFAULT 12 NOT NULL,
    peso_kg NUMERIC(6,3),
    imagen_url TEXT,
    activo BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. TABLA DE METAS DIARIAS POR VENDEDOR
CREATE TABLE IF NOT EXISTS public.frimart_metas_diarias (
    id TEXT PRIMARY KEY,
    vendedor_id TEXT REFERENCES public.frimart_usuarios(id) ON DELETE CASCADE,
    fecha DATE DEFAULT CURRENT_DATE NOT NULL,
    meta_dinero NUMERIC(12,2) NOT NULL,
    avance_dinero NUMERIC(12,2) DEFAULT 0,
    meta_cajas INT NOT NULL,
    avance_cajas INT DEFAULT 0,
    visitas_meta INT DEFAULT 10,
    visitas_completadas INT DEFAULT 0,
    tasa_comision_pct NUMERIC(5,2) DEFAULT 4.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. TABLA DE ENCABEZADO DE VENTAS (Transacciones / Auditoría)
CREATE TABLE IF NOT EXISTS public.frimart_ventas (
    id TEXT PRIMARY KEY,
    folio TEXT UNIQUE NOT NULL,
    fecha TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    cedis_id TEXT REFERENCES public.frimart_cedis(id) ON DELETE CASCADE,
    supervisor_id TEXT,
    ruta_id TEXT NOT NULL,
    vendedor_id TEXT REFERENCES public.frimart_usuarios(id) ON DELETE CASCADE,
    cliente_id TEXT REFERENCES public.frimart_puntos_venta(id) ON DELETE CASCADE,
    subtotal NUMERIC(12,2) NOT NULL,
    descuento NUMERIC(12,2) DEFAULT 0,
    impuestos NUMERIC(12,2) DEFAULT 0,
    total NUMERIC(12,2) NOT NULL,
    metodo_pago TEXT DEFAULT 'contado', -- 'contado' | 'credito' | 'transferencia'
    estatus TEXT DEFAULT 'completada' CHECK (estatus IN ('completada', 'cancelada', 'pendiente_pago')),
    latitud_gps NUMERIC(10,6),
    longitud_gps NUMERIC(10,6),
    notas TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. TABLA DE DETALLE DE VENTAS (Partidas, Rentabilidad y Categorías)
CREATE TABLE IF NOT EXISTS public.frimart_detalle_ventas (
    id TEXT PRIMARY KEY,
    venta_id TEXT REFERENCES public.frimart_ventas(id) ON DELETE CASCADE,
    producto_id TEXT REFERENCES public.frimart_productos(id) ON DELETE CASCADE,
    sku TEXT NOT NULL,
    nombre_producto TEXT NOT NULL,
    categoria TEXT NOT NULL,
    cajas_vendidas INT NOT NULL,
    piezas_por_caja INT NOT NULL,
    precio_unitario NUMERIC(10,2) NOT NULL,
    costo_unitario NUMERIC(10,2) NOT NULL,
    importe_total NUMERIC(12,2) NOT NULL,
    utilidad_bruta NUMERIC(12,2) NOT NULL,
    margen_rentabilidad_pct NUMERIC(5,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. TABLA DE INVENTARIOS (En Bodega CEDIS y en Camión de Reparto)
CREATE TABLE IF NOT EXISTS public.frimart_inventarios (
    id TEXT PRIMARY KEY,
    ubicacion_tipo TEXT NOT NULL CHECK (ubicacion_tipo IN ('cedis', 'camioneta_vendedor')),
    ubicacion_id TEXT NOT NULL,
    producto_id TEXT REFERENCES public.frimart_productos(id) ON DELETE CASCADE,
    stock_cajas INT DEFAULT 0 NOT NULL,
    stock_minimo INT DEFAULT 10 NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ÍNDICES DE ALTO RENDIMIENTO PARA CONSULTAS Y AGREGACIONES
CREATE INDEX IF NOT EXISTS idx_frimart_ventas_fecha ON public.frimart_ventas (fecha DESC);
CREATE INDEX IF NOT EXISTS idx_frimart_ventas_cedis ON public.frimart_ventas (cedis_id);
CREATE INDEX IF NOT EXISTS idx_frimart_ventas_vendedor ON public.frimart_ventas (vendedor_id);
CREATE INDEX IF NOT EXISTS idx_frimart_ventas_ruta ON public.frimart_ventas (ruta_id);
CREATE INDEX IF NOT EXISTS idx_frimart_detalle_categoria ON public.frimart_detalle_ventas (categoria);
CREATE INDEX IF NOT EXISTS idx_frimart_detalle_producto ON public.frimart_detalle_ventas (producto_id);

-- HABILITACIÓN DE POLÍTICAS DE SEGURIDAD (RLS)
ALTER TABLE public.frimart_cedis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.frimart_usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.frimart_puntos_venta ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.frimart_congeladores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.frimart_planogramas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.frimart_productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.frimart_metas_diarias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.frimart_ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.frimart_detalle_ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.frimart_inventarios ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS PÚBLICAS Y AUTENTICADAS (Lectura y Escritura para App Móvil y Panel)
DROP POLICY IF EXISTS "Public select frimart_cedis" ON public.frimart_cedis;
CREATE POLICY "Public select frimart_cedis" ON public.frimart_cedis FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public select frimart_usuarios" ON public.frimart_usuarios;
CREATE POLICY "Public select frimart_usuarios" ON public.frimart_usuarios FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public select frimart_puntos_venta" ON public.frimart_puntos_venta;
CREATE POLICY "Public select frimart_puntos_venta" ON public.frimart_puntos_venta FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public select frimart_congeladores" ON public.frimart_congeladores;
CREATE POLICY "Public select frimart_congeladores" ON public.frimart_congeladores FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public select frimart_planogramas" ON public.frimart_planogramas;
CREATE POLICY "Public select frimart_planogramas" ON public.frimart_planogramas FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public select frimart_productos" ON public.frimart_productos;
CREATE POLICY "Public select frimart_productos" ON public.frimart_productos FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public select frimart_metas_diarias" ON public.frimart_metas_diarias;
CREATE POLICY "Public select frimart_metas_diarias" ON public.frimart_metas_diarias FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public select frimart_ventas" ON public.frimart_ventas;
CREATE POLICY "Public select frimart_ventas" ON public.frimart_ventas FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public select frimart_detalle_ventas" ON public.frimart_detalle_ventas;
CREATE POLICY "Public select frimart_detalle_ventas" ON public.frimart_detalle_ventas FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public select frimart_inventarios" ON public.frimart_inventarios;
CREATE POLICY "Public select frimart_inventarios" ON public.frimart_inventarios FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ==============================================================================
-- DATOS SEMILLA INICIALES (CEDIS AGUASCALIENTES Y CANCÚN)
-- ==============================================================================

-- 1. CEDIS
INSERT INTO public.frimart_cedis (id, codigo, nombre, ciudad, direccion, latitud, longitud, telefono)
VALUES
    ('CEDIS-AGS', '1205', 'CEDIS Aguascalientes (1205)', 'Aguascalientes', 'Av. Aguascalientes Poniente #102, Pocitos, Ags.', 21.885300, -102.291600, '449-910-5200'),
    ('CEDIS-CUN', '0101', 'CEDIS Cancún (01)', 'Cancún', 'Av. Nichupté Sm. 51, Cancún, Q.Roo', 21.161900, -86.851500, '998-880-1420')
ON CONFLICT (id) DO NOTHING;

-- 2. USUARIOS CON PIN DE ACCESO
INSERT INTO public.frimart_usuarios (id, nombre, email, pin, rol, cedis_id, activo, permisos, avatar_url)
VALUES
    ('USR-VEND-104', 'Carlos Mendoza', 'carlos.mendoza@frimart.com.mx', '1041', 'vendedor', 'CEDIS-AGS', true, '{"ventas": true, "rutas": true, "auditoria": true, "escanner": true}'::jsonb, 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'),
    ('USR-002', 'Roberto Garza', 'roberto.garza@frimart.com.mx', '2022', 'supervisor', 'CEDIS-AGS', true, '{"supervision": true, "aprobaciones": true, "rutas": true, "metricas": true}'::jsonb, 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80'),
    ('USR-003', 'Ing. Fernando Valenzuela', 'fernando.valenzuela@frimart.com.mx', '3033', 'gerente_cedis', 'CEDIS-AGS', true, '{"cedis_completo": true, "metas": true, "inventarios": true, "vendedores": true}'::jsonb, 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80'),
    ('USR-004', 'Lic. Valeria Morales', 'valeria.morales@frimart.com.mx', '4044', 'director_comercial', NULL, true, '{"todos_cedis": true, "precios": true, "rentabilidad": true, "planogramas": true}'::jsonb, 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&auto=format&fit=crop&q=80'),
    ('USR-005', 'Gerardo Rodríguez', 'huixache@gmail.com', '9999', 'propietario', NULL, true, '{"admin_total": true, "claves_acceso": true, "actualizaciones_ota": true, "master": true}'::jsonb, 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&auto=format&fit=crop&q=80')
ON CONFLICT (id) DO NOTHING;

-- 3. PRODUCTOS LA HUERTA
INSERT INTO public.frimart_productos (id, sku, codigo_barras, nombre, categoria, precio_venta, costo_unitario, piezas_por_caja, imagen_url)
VALUES
    ('PROD-01', 'LH-FRESA-1KG', '7501052410012', 'Fresa Congelada Entera La Huerta 1kg', 'Frutas', 98.50, 62.00, 10, 'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=200&auto=format&fit=crop&q=80'),
    ('PROD-02', 'LH-BROCOLI-500G', '7501052410029', 'Floretes de Brócoli La Huerta 500g', 'Verduras Congeladas', 42.00, 24.50, 15, 'https://images.unsplash.com/photo-1584270354949-c26b0d5b4a0c?w=200&auto=format&fit=crop&q=80'),
    ('PROD-03', 'LH-VERD-CAMP-500G', '7501052410036', 'Verduras Campestres La Huerta 500g', 'Verduras Congeladas', 38.00, 21.00, 15, 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=200&auto=format&fit=crop&q=80'),
    ('PROD-04', 'LH-MANGO-CUBO-1KG', '7501052410043', 'Mango en Cubos Selección La Huerta 1kg', 'Frutas', 89.00, 54.00, 10, 'https://images.unsplash.com/photo-1553279768-865429fa0078?w=200&auto=format&fit=crop&q=80'),
    ('PROD-05', 'FRM-HEL-CHOCO-1L', '7501052420011', 'Helado Premium Frimart Chocolate Belga 1L', 'Helados', 74.00, 42.00, 8, 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=200&auto=format&fit=crop&q=80'),
    ('PROD-06', 'FRM-HEL-VAIN-1L', '7501052420028', 'Helado Cremoso Vainilla Papantla Frimart 1L', 'Helados', 68.00, 38.00, 8, 'https://images.unsplash.com/photo-1570197788417-0e82375c9371?w=200&auto=format&fit=crop&q=80'),
    ('PROD-07', 'FRM-PAL-FRESA-CREMA', '7501052420035', 'Paleta Artesanal Fresa con Crema Frimart', 'Paletas', 24.00, 11.50, 24, 'https://images.unsplash.com/photo-1505394033641-40c6ad1178d7?w=200&auto=format&fit=crop&q=80')
ON CONFLICT (id) DO NOTHING;

-- 4. PUNTOS DE VENTA (AGUASCALIENTES REALES)
INSERT INTO public.frimart_puntos_venta (id, codigo, nombre, direccion, ciudad, latitud, longitud, cedis_id, ruta_id, estatus)
VALUES
    ('STORE-01', 'OXXO-BARA-01', 'Cadena Comercial OXXO - Bara San Lorenzo', 'Av. San Gabriel esq. San Lorenzo #302, Aguascalientes', 'Aguascalientes', 21.884500, -102.290200, 'CEDIS-AGS', 'RUTA-AGS-01', 'pending'),
    ('STORE-02', 'CASA-BLANCA-02', 'Súper Casa Blanca', 'Calle Paulino N. Martí #112, Col. Casa Blanca, Aguascalientes', 'Aguascalientes', 21.887200, -102.292400, 'CEDIS-AGS', 'RUTA-AGS-01', 'pending'),
    ('STORE-03', 'CREM-BENJ-03', 'Cremería Nueva Benjamín de Alba', 'Centro Comercial Agropecuario, Andador Benjamín de Alba #214, Ags.', 'Aguascalientes', 21.912400, -102.284500, 'CEDIS-AGS', 'RUTA-AGS-01', 'in_progress'),
    ('STORE-04', 'CARN-TEPEY-04', 'Carnicería y Cremería Tepeyac', 'Calle Tepeyac #405, Col. El Llanito, Aguascalientes', 'Aguascalientes', 21.879100, -102.294100, 'CEDIS-AGS', 'RUTA-AGS-01', 'completed'),
    ('STORE-05', 'TIENDAMAX-05', 'Tiendamax Pocitos Universidad', 'Av. Eugenio Garza Sada #108, Pocitos, Aguascalientes', 'Aguascalientes', 21.924800, -102.315000, 'CEDIS-AGS', 'RUTA-AGS-01', 'pending')
ON CONFLICT (id) DO NOTHING;

-- 5. CONGELADORES LA HUERTA
INSERT INTO public.frimart_congeladores (id, codigo_qr, modelo, tienda_id, temperatura_actual, estatus)
VALUES
    ('FRM-0520', 'FRM-0520', 'Torrey Horizontal Cristal 1.5m', 'STORE-01', -18.4, 'optimo'),
    ('FRM-0521', 'FRM-0521', 'Torrey Horizontal Cristal 1.5m', 'STORE-02', -19.1, 'optimo'),
    ('FRM-0522', 'FRM-0522', 'Criotec Vertical 2 Puertas', 'STORE-03', -17.8, 'optimo'),
    ('FRM-0523', 'FRM-0523', 'Torrey Horizontal Cristal 1.5m', 'STORE-04', -18.2, 'optimo'),
    ('FRM-0524', 'FRM-0524', 'Ojeda Isla Panorámica 2.0m', 'STORE-05', -18.9, 'optimo')
ON CONFLICT (id) DO NOTHING;

-- 6. PLANOGRAMAS MAESTROS
INSERT INTO public.frimart_planogramas (id, modelo_congelador, nombre_modelo, tipo, capacidad_cajas, niveles, frentes_por_nivel, matriz_niveles)
VALUES
    ('PLANO-TORREY-15', 'Torrey Horizontal Cristal 1.5m', 'Congelador Tapa Cristal 1.5m', 'horizontal', 40, 3, 4, '[
        {"nivel": 1, "nombre": "Superior Frontal", "productos": ["LH-FRESA-1KG", "LH-MANGO-CUBO-1KG", "FRM-HEL-CHOCO-1L", "FRM-HEL-VAIN-1L"]},
        {"nivel": 2, "nombre": "Nivel Medio", "productos": ["LH-BROCOLI-500G", "LH-VERD-CAMP-500G", "LH-BROCOLI-500G", "LH-VERD-CAMP-500G"]},
        {"nivel": 3, "nombre": "Fondo / Base", "productos": ["FRM-PAL-FRESA-CREMA", "FRM-PAL-FRESA-CREMA", "FRM-PAL-FRESA-CREMA", "FRM-PAL-FRESA-CREMA"]}
    ]'::jsonb),
    ('PLANO-CRIOTEC-VERT', 'Criotec Vertical 2 Puertas', 'Exhibidor Vertical 2 Puertas', 'vertical', 65, 4, 3, '[
        {"nivel": 1, "nombre": "Nivel Superior Ojos", "productos": ["FRM-HEL-CHOCO-1L", "FRM-HEL-VAIN-1L", "FRM-PAL-FRESA-CREMA"]},
        {"nivel": 2, "nombre": "Nivel Medio Alto", "productos": ["LH-FRESA-1KG", "LH-MANGO-CUBO-1KG", "LH-FRESA-1KG"]},
        {"nivel": 3, "nombre": "Nivel Medio Bajo", "productos": ["LH-BROCOLI-500G", "LH-VERD-CAMP-500G", "LH-BROCOLI-500G"]},
        {"nivel": 4, "nombre": "Nivel Base", "productos": ["FRM-PAL-FRESA-CREMA", "FRM-PAL-FRESA-CREMA", "FRM-PAL-FRESA-CREMA"]}
    ]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- 7. VENTAS HISTÓRICAS PARA ANÁLISIS MULTIDIMENSIONAL
INSERT INTO public.frimart_ventas (id, folio, fecha, cedis_id, supervisor_id, ruta_id, vendedor_id, cliente_id, subtotal, impuestos, total, metodo_pago, estatus)
VALUES
    ('VTA-2026-001', 'FOL-AGS-8901', NOW() - INTERVAL '1 day', 'CEDIS-AGS', 'USR-002', 'RUTA-AGS-01', 'USR-VEND-104', 'STORE-04', 4520.00, 0, 4520.00, 'contado', 'completada'),
    ('VTA-2026-002', 'FOL-AGS-8902', NOW() - INTERVAL '2 days', 'CEDIS-AGS', 'USR-002', 'RUTA-AGS-01', 'USR-VEND-104', 'STORE-03', 3890.00, 0, 3890.00, 'credito', 'completada'),
    ('VTA-2026-003', 'FOL-AGS-8903', NOW() - INTERVAL '3 days', 'CEDIS-AGS', 'USR-002', 'RUTA-AGS-01', 'USR-VEND-104', 'STORE-01', 6120.00, 0, 6120.00, 'contado', 'completada'),
    ('VTA-2026-004', 'FOL-CUN-4101', NOW() - INTERVAL '1 day', 'CEDIS-CUN', 'USR-002', 'RUTA-CUN-01', 'USR-VEND-104', 'STORE-02', 7840.00, 0, 7840.00, 'contado', 'completada')
ON CONFLICT (id) DO NOTHING;

-- 8. PARTIDAS DE VENTAS
INSERT INTO public.frimart_detalle_ventas (id, venta_id, producto_id, sku, nombre_producto, categoria, cajas_vendidas, piezas_por_caja, precio_unitario, costo_unitario, importe_total, utilidad_bruta, margen_rentabilidad_pct)
VALUES
    ('DET-001-1', 'VTA-2026-001', 'PROD-01', 'LH-FRESA-1KG', 'Fresa Congelada Entera La Huerta 1kg', 'Frutas', 2, 10, 98.50, 62.00, 1970.00, 730.00, 37.06),
    ('DET-001-2', 'VTA-2026-001', 'PROD-05', 'FRM-HEL-CHOCO-1L', 'Helado Premium Frimart Chocolate Belga 1L', 'Helados', 3, 8, 74.00, 42.00, 1776.00, 768.00, 43.24),
    ('DET-001-3', 'VTA-2026-001', 'PROD-07', 'FRM-PAL-FRESA-CREMA', 'Paleta Artesanal Fresa con Crema Frimart', 'Paletas', 1, 24, 24.00, 11.50, 576.00, 300.00, 52.08),
    ('DET-002-1', 'VTA-2026-002', 'PROD-02', 'LH-BROCOLI-500G', 'Floretes de Brócoli La Huerta 500g', 'Verduras Congeladas', 4, 15, 42.00, 24.50, 2520.00, 1050.00, 41.67),
    ('DET-002-2', 'VTA-2026-002', 'PROD-03', 'LH-VERD-CAMP-500G', 'Verduras Campestres La Huerta 500g', 'Verduras Congeladas', 2, 15, 38.00, 21.00, 1140.00, 510.00, 44.74),
    ('DET-003-1', 'VTA-2026-003', 'PROD-01', 'LH-FRESA-1KG', 'Fresa Congelada Entera La Huerta 1kg', 'Frutas', 4, 10, 98.50, 62.00, 3940.00, 1460.00, 37.06),
    ('DET-003-2', 'VTA-2026-003', 'PROD-04', 'LH-MANGO-CUBO-1KG', 'Mango en Cubos Selección La Huerta 1kg', 'Frutas', 2, 10, 89.00, 54.00, 1780.00, 700.00, 39.33)
ON CONFLICT (id) DO NOTHING;

-- 9. INVENTARIOS
INSERT INTO public.frimart_inventarios (id, ubicacion_tipo, ubicacion_id, producto_id, stock_cajas, stock_minimo)
VALUES
    ('INV-CEDIS-01', 'cedis', 'CEDIS-AGS', 'PROD-01', 350, 50),
    ('INV-CEDIS-02', 'cedis', 'CEDIS-AGS', 'PROD-02', 480, 80),
    ('INV-CEDIS-03', 'cedis', 'CEDIS-AGS', 'PROD-03', 420, 60),
    ('INV-CEDIS-04', 'cedis', 'CEDIS-AGS', 'PROD-04', 290, 40),
    ('INV-CEDIS-05', 'cedis', 'CEDIS-AGS', 'PROD-05', 210, 30),
    ('INV-CEDIS-06', 'cedis', 'CEDIS-AGS', 'PROD-06', 195, 30),
    ('INV-CEDIS-07', 'cedis', 'CEDIS-AGS', 'PROD-07', 520, 100),
    ('INV-CAMION-01', 'camioneta_vendedor', 'USR-VEND-104', 'PROD-01', 12, 4),
    ('INV-CAMION-02', 'camioneta_vendedor', 'USR-VEND-104', 'PROD-02', 18, 5),
    ('INV-CAMION-03', 'camioneta_vendedor', 'USR-VEND-104', 'PROD-03', 15, 5),
    ('INV-CAMION-04', 'camioneta_vendedor', 'USR-VEND-104', 'PROD-05', 10, 3),
    ('INV-CAMION-05', 'camioneta_vendedor', 'USR-VEND-104', 'PROD-07', 25, 8)
ON CONFLICT (id) DO NOTHING;

-- FIN DE MIGRACIÓN FRIMART OS
