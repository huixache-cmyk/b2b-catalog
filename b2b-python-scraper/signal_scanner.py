import time
import os
import json
import urllib.parse
import feedparser
import requests
import google.generativeai as genai
from googlesearch import search
from bs4 import BeautifulSoup
from db_client import get_db

def init_gemini():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("ADVERTENCIA: GEMINI_API_KEY no encontrada. No se podrá usar la IA.")
        return False
    genai.configure(api_key=api_key)
    return True

def find_company_domain(company_name):
    try:
        url = f"https://autocomplete.clearbit.com/v1/companies/suggest?query={urllib.parse.quote(company_name)}"
        resp = requests.get(url, timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            if data and len(data) > 0:
                return data[0].get('domain')
    except Exception as e:
        print(f"Error buscando dominio en Clearbit para {company_name}: {e}")
    return None

def find_decision_maker(domain):
    hunter_key = os.getenv("HUNTER_API_KEY")
    if not hunter_key:
        return None
        
    try:
        # Aumentamos el límite para tener más opciones
        url = f"https://api.hunter.io/v2/domain-search?domain={domain}&limit=30&api_key={hunter_key}"
        resp = requests.get(url, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            emails = data.get('data', {}).get('emails', [])
            
            # Roles objetivo estrictos
            target_keywords = ["trade marketing", "marketing", "mercadotecnia", "compras", "purchasing", "abastecimiento", "kam", "key account"]
            
            best_match = None
            fallback_match = None
            
            for email_data in emails:
                position = (email_data.get('position') or "").lower()
                
                # Guardar el primero como fallback por si acaso
                if not fallback_match:
                    fallback_match = email_data
                    
                # Si el rol hace match con nuestras palabras clave
                if any(tk in position for tk in target_keywords):
                    best_match = email_data
                    break
            
            selected = best_match if best_match else fallback_match
            
            if selected:
                return {
                    "full_name": f"{selected.get('first_name', '')} {selected.get('last_name', '')}".strip() or "Contacto Corporativo",
                    "email": selected.get('value'),
                    "job_title": selected.get('position') or "Manager",
                    "confidence": selected.get('confidence', 50)
                }
    except Exception as e:
        print(f"Error buscando contacto en Hunter.io para {domain}: {e}")
    return None

def fetch_news(keyword):
    print(f"Buscando noticias para: '{keyword}'...")
    # Eliminamos el when:2d para buscar eventos a futuro en general
    query = urllib.parse.quote(f"{keyword}")
    url = f"https://news.google.com/rss/search?q={query}&hl=es-419&gl=MX&ceid=MX:es-419"
    
    feed = feedparser.parse(url)
    entries = feed.entries[:5] 
    
    news_items = []
    for entry in entries:
        news_items.append({
            "title": entry.title,
            "link": entry.link,
            "published": getattr(entry, 'published', 'N/A')
        })
    return news_items

def analyze_events_with_gemini(news_items):
    if not news_items:
        return []
        
    prompt = """
    Eres un analista experto en inteligencia comercial B2B. Analiza los siguientes titulares de noticias de México.
    Busca empresas reales que estén anunciando eventos PLANIFICADOS PARA LOS PRÓXIMOS 2 A 3 MESES que indiquen que podrían necesitar comprar regalos corporativos, kits de bienvenida, o promocionales (Ej. próximas aperturas de sucursales, nuevas plantas, expansiones masivas planeadas, próximos aniversarios corporativos).
    
    IMPORTANTE: Descarta eventos que ya ocurrieron. Ignora noticias sobre política, deportes, crímenes o entidades gubernamentales, céntrate sólo en EMPRESAS CORPORATIVAS.
    
    Devuelve estrictamente un arreglo JSON donde cada objeto tenga esta estructura:
    {
      "company_name": "Nombre de la Empresa",
      "industry": "Industria estimada (ej. Manufactura, Tecnología, Logística)",
      "city": "Ciudad mencionada o 'N/A'",
      "signal_type": "Tipo de evento futuro (ej. Expansión, Aniversario, Nueva Sucursal)",
      "description": "Resumen breve de la noticia justificando la oportunidad comercial a futuro",
      "score": número entero del 50 al 100 de qué tan buena oportunidad B2B es
    }
    
    Si no encuentras ninguna empresa relevante, devuelve un arreglo vacío [].
    
    NOTICIAS:
    """
    for item in news_items:
        prompt += f"\n- {item['title']} ({item['published']})"
        
    try:
        model = genai.GenerativeModel('gemini-2.5-flash')
        response = model.generate_content(
            prompt,
            generation_config=genai.GenerationConfig(response_mime_type="application/json")
        )
        return json.loads(response.text)
    except Exception as e:
        print(f"Error analizando con Gemini (Eventos): {e}")
        return []

def get_companies_from_sector(sector_name):
    prompt = f"""
    Eres un experto en el mercado corporativo de México. Lista las 5 empresas más importantes, grandes o relevantes actualmente activas en México en el sector: "{sector_name}".
    Devuelve estrictamente un arreglo JSON de strings con los nombres de las empresas.
    Ejemplo: ["Empresa A", "Empresa B", "Empresa C", "Empresa D", "Empresa E"]
    """
    try:
        model = genai.GenerativeModel('gemini-2.5-flash')
        response = model.generate_content(
            prompt,
            generation_config=genai.GenerationConfig(response_mime_type="application/json")
        )
        return json.loads(response.text)
    except Exception as e:
        print(f"Error descubriendo empresas para sector {sector_name}: {e}")
        return []

def insert_lead(db, opp):
    company_name = opp.get("company_name", "Desconocida")
    print(f"-> Procesando: {company_name}")
    
    try:
        existing = db.table("b2b_companies").select("id").ilike("name", company_name).execute()
        if existing.data and len(existing.data) > 0:
            print(f"  [OMITIDO] '{company_name}' ya existe en la base de datos.")
            return
    except Exception as e:
        print(f"  Error verificando duplicados: {e}")
        return

    timestamp = int(time.time() * 1000)
    company_id = f"COMP-{timestamp}"
    signal_id = f"SIG-{timestamp}"
    opp_id = f"OPP-{timestamp}"
    
    try:
        # 1. Insertar Empresa
        db.table("b2b_companies").insert({
            "id": company_id,
            "name": company_name,
            "industry": opp.get("industry", "General"),
            "city": opp.get("city", "N/A")
        }).execute()
        
        # 2. Insertar Señal
        db.table("b2b_signals").insert({
            "id": signal_id,
            "company_id": company_id,
            "signal_type": opp.get("signal_type", "Oportunidad detectada"),
            "signal_date": time.strftime('%Y-%m-%d'),
            "description": opp.get("description", "Noticia o búsqueda directa"),
            "score": opp.get("score", 70)
        }).execute()
        
        # 3. Contacto y Enriquecimiento
        contact_data = None
        domain = opp.get("website")
        if domain:
            # Limpiar dominio de protocolo
            if "://" in domain:
                domain = domain.split("://")[1].split("/")[0]
            if domain.startswith("www."):
                domain = domain[4:]
        else:
            domain = find_company_domain(company_name)
            
        if domain:
            print(f"  Dominio a analizar: {domain}")
            contact_data = find_decision_maker(domain)
            
        stage = opp.get("stage", "Lead Detectado")
        phone = opp.get("phone", "")
        
        if contact_data:
            print(f"  Contacto encontrado: {contact_data['email']} ({contact_data['full_name']} - {contact_data['job_title']})")
            stage = "Contacto Identificado" if stage == "Lead Detectado" else stage
            db.table("b2b_contacts").insert({
                "id": f"CONT-{timestamp}",
                "company_id": company_id,
                "full_name": contact_data["full_name"],
                "job_title": contact_data["job_title"],
                "email": contact_data["email"],
                "phone": phone or contact_data.get("phone", ""),
                "confidence": contact_data["confidence"]
            }).execute()
        else:
            print("  No se encontró contacto específico.")
            db.table("b2b_contacts").insert({
                "id": f"CONT-{timestamp}",
                "company_id": company_id,
                "full_name": "Pendiente de Investigación",
                "job_title": "Compras / Marketing",
                "email": "por.definir@empresa.com",
                "phone": phone,
                "confidence": 0
            }).execute()
        
        # 4. Insertar la Oportunidad
        db.table("b2b_opportunities").insert({
            "id": opp_id,
            "company_id": company_id,
            "total_score": opp.get("score", 70),
            "stage": stage
        }).execute()
        
        print(f"[OK] Lead insertado exitosamente.")
        
    except Exception as e:
        print(f"[ERROR] Error al insertar lead: {e}")

# --- ESTRATEGIA A: Google Maps Search ---
def run_google_maps_strategy(db, maps_keywords, maps_locations):
    google_maps_key = os.getenv("GOOGLE_MAPS_KEY")
    if not google_maps_key:
        print("[Maps] ADVERTENCIA: GOOGLE_MAPS_KEY no configurada. Omitiendo búsqueda en Google Maps.")
        return

    keywords = [k.strip() for k in maps_keywords.split(',') if k.strip()]
    locations = [l.strip() for l in maps_locations.split(',') if l.strip()]

    if not keywords or not locations:
        print("[Maps] Falta configurar palabras clave o ciudades para Google Maps.")
        return

    print("\n--- EJECUTANDO ESTRATEGIA: Búsqueda en Google Maps ---")
    
    for location in locations:
        for keyword in keywords:
            query = f"{keyword} en {location}"
            print(f"[Maps] Buscando: '{query}'...")
            
            try:
                # 1. Text Search
                search_url = f"https://maps.googleapis.com/maps/api/place/textsearch/json?query={urllib.parse.quote(query)}&key={google_maps_key}"
                resp = requests.get(search_url, timeout=10)
                if resp.status_code != 200:
                    print(f"[Maps] Error en Text Search: {resp.status_code}")
                    continue
                    
                results = resp.json().get('results', [])[:3] # Tomar los top 3 por consulta
                
                for place in results:
                    place_id = place.get('place_id')
                    if not place_id:
                        continue
                        
                    # 2. Place Details
                    details_url = f"https://maps.googleapis.com/maps/api/place/details/json?place_id={place_id}&fields=name,formatted_phone_number,website,formatted_address&key={google_maps_key}"
                    d_resp = requests.get(details_url, timeout=10)
                    if d_resp.status_code != 200:
                        continue
                        
                    details = d_resp.json().get('result', {})
                    name = details.get('name')
                    website = details.get('website')
                    phone = details.get('formatted_phone_number')
                    address = details.get('formatted_address', location)
                    
                    if not name:
                        continue
                        
                    print(f"  Encontrado en Maps: {name} | Web: {website} | Tel: {phone}")
                    
                    opp = {
                        "company_name": name,
                        "industry": keyword.capitalize(),
                        "city": location,
                        "signal_type": "Google Maps Lead",
                        "description": f"Negocio localizado en Google Maps para la búsqueda '{query}'. Dirección: {address}.",
                        "score": 75,
                        "website": website,
                        "phone": phone
                    }
                    
                    insert_lead(db, opp)
                    
            except Exception as e:
                print(f"[Maps] Error buscando '{query}': {e}")

# --- ESTRATEGIA B: Licitaciones Públicas (CompraNet) ---
def run_tenders_strategy(db, tenders_keywords):
    keywords = [k.strip() for k in tenders_keywords.split(',') if k.strip()]
    if not keywords:
        print("[Tenders] Falta configurar palabras clave para Licitaciones.")
        return

    print("\n--- EJECUTANDO ESTRATEGIA: Búsqueda de Licitaciones Públicas (CompraNet) ---")
    all_news = []
    
    for keyword in keywords:
        query_str = f"licitación pública compranet {keyword}"
        print(f"[Tenders] Buscando licitaciones en Google News para: '{query_str}'...")
        query = urllib.parse.quote(query_str)
        url = f"https://news.google.com/rss/search?q={query}&hl=es-419&gl=MX&ceid=MX:es-419"
        
        try:
            feed = feedparser.parse(url)
            entries = feed.entries[:5]
            for entry in entries:
                all_news.append({
                    "title": entry.title,
                    "link": entry.link,
                    "published": getattr(entry, 'published', 'N/A')
                })
        except Exception as e:
            print(f"[Tenders] Error consultando RSS para {keyword}: {e}")

    if all_news:
        print(f"[Tenders] Se recolectaron {len(all_news)} anuncios. Analizando con Gemini AI...")
        prompt = """
        Eres un analista de licitaciones de compras públicas en México. Analiza los siguientes titulares.
        Identifica organismos públicos gubernamentales o dependencias federales (ej. IMSS, CFE, PEMEX, Secretarías, Gobiernos Estatales, Municipios) que estén solicitando artículos promocionales, regalos, kits de bienvenida, uniformes o papelería/impresión.
        
        Devuelve estrictamente un arreglo JSON donde cada objeto tenga esta estructura:
        {
          "company_name": "Nombre de la Dependencia/Organismo (ej. IMSS Aguascalientes)",
          "industry": "Gobierno / Sector Público",
          "city": "Ciudad o Estado mencionado o 'México'",
          "signal_type": "Licitación Pública",
          "description": "Detalle del objeto de la licitación y fecha límite si se menciona",
          "score": número del 70 al 100 de relevancia B2B
        }
        
        Si no hay licitaciones relevantes en los titulares, devuelve un arreglo vacío [].
        
        NOTICIAS / CONVOCATORIAS:
        """
        for item in all_news:
            prompt += f"\n- {item['title']} ({item['published']})"
            
        try:
            model = genai.GenerativeModel('gemini-2.5-flash')
            response = model.generate_content(
                prompt,
                generation_config=genai.GenerationConfig(response_mime_type="application/json")
            )
            detected_opportunities = json.loads(response.text)
            print(f"[Tenders] Gemini detectó {len(detected_opportunities)} licitaciones.")
            for opp in detected_opportunities:
                opp["stage"] = "Licitación Detectada"
                opp["signal_type"] = "Licitación CompraNet"
                insert_lead(db, opp)
        except Exception as e:
            print(f"[Tenders] Error analizando con Gemini: {e}")

# --- ESTRATEGIA C: Cámaras de Comercio ---
def run_chambers_strategy(db, chambers_targets):
    chambers = [c.strip() for c in chambers_targets.split(',') if c.strip()]
    if not chambers:
        print("[Chambers] Falta configurar las cámaras de interés.")
        return

    print("\n--- EJECUTANDO ESTRATEGIA: Búsqueda en Cámaras de Comercio (CANACO, COPARMEX, ANTAD) ---")
    regions = ["Aguascalientes", "Bajío", "CDMX"]
    
    prompt = f"""
    Eres un analista corporativo en México. Lista las principales empresas medianas o grandes afiliadas a las siguientes cámaras: {', '.join(chambers)} en las regiones de: {', '.join(regions)}.
    Queremos empresas que sean compradoras potenciales de artículos promocionales y regalos corporativos.
    
    Devuelve estrictamente un arreglo JSON donde cada objeto tenga esta estructura:
    {{
      "company_name": "Nombre de la Empresa",
      "industry": "Industria/Sector",
      "city": "Ciudad/Región de operación (debe ser Aguascalientes, Bajío o CDMX)",
      "signal_type": "Miembro de Cámara",
      "description": "Empresa destacada afiliada a la cámara en la región de interés",
      "score": 85
    }}
    """
    
    try:
        model = genai.GenerativeModel('gemini-2.5-flash')
        response = model.generate_content(
            prompt,
            generation_config=genai.GenerationConfig(response_mime_type="application/json")
        )
        detected_companies = json.loads(response.text)
        print(f"[Chambers] Gemini identificó {len(detected_companies)} empresas miembro en las regiones solicitadas.")
        for opp in detected_companies:
            opp["stage"] = "Lead Detectado"
            insert_lead(db, opp)
    except Exception as e:
        print(f"[Chambers] Error analizando con Gemini: {e}")

def run_scan_cycle(keywords="", target_companies="", target_sectors="", config=None):
    db = get_db()
    if not db:
        print("Error: Cliente de BD no inicializado.")
        return
        
    if not init_gemini():
        return

    # --- ESTRATEGIA 1: Búsqueda de Eventos por Keywords ---
    keys = [k.strip() for k in keywords.split(',') if k.strip()]
    if keys:
        print("\n--- EJECUTANDO ESTRATEGIA 1: Búsqueda de Eventos Futuros ---")
        all_news = []
        for key in keys:
            all_news.extend(fetch_news(key))
            
        if all_news:
            print(f"Se recolectaron {len(all_news)} noticias. Analizando con Gemini AI...")
            detected_opportunities = analyze_events_with_gemini(all_news)
            for opp in detected_opportunities:
                insert_lead(db, opp)
    
    # --- ESTRATEGIA 3: Descubrimiento por Sectores ---
    direct_companies_to_process = [c.strip() for c in target_companies.split(',') if c.strip()]
    sectors = [s.strip() for s in target_sectors.split(',') if s.strip()]
    
    if sectors:
        print("\n--- EJECUTANDO ESTRATEGIA 3: Descubrimiento de Empresas por Sector ---")
        for sector in sectors:
            print(f"Descubriendo Top 5 empresas en el sector: {sector}...")
            discovered_companies = get_companies_from_sector(sector)
            print(f"Empresas descubiertas: {discovered_companies}")
            direct_companies_to_process.extend(discovered_companies)

    # --- ESTRATEGIA 2: Extracción Directa por Empresas ---
    direct_companies_to_process = list(set(direct_companies_to_process))
    
    if direct_companies_to_process:
        print("\n--- EJECUTANDO ESTRATEGIA 2: Prospección Directa de Empresas ---")
        for comp_name in direct_companies_to_process:
            opp = {
                "company_name": comp_name,
                "industry": "Investigación Directa",
                "city": "México",
                "signal_type": "Prospección Proactiva",
                "description": "Empresa ingresada manualmente o extraída por el motor de inteligencia de sectores para prospección B2B directa.",
                "score": 85
            }
            insert_lead(db, opp)
            
    # --- NUEVAS ESTRATEGIAS EXPANDIDAS ---
    if config:
        # Búsqueda en Google Maps
        if config.get("enable_maps", False):
            run_google_maps_strategy(
                db, 
                config.get("maps_keywords", "corporativo, oficinas, planta industrial"), 
                config.get("maps_locations", "Aguascalientes, Queretaro, CDMX")
            )
            
        # Monitoreo de Licitaciones Públicas (CompraNet)
        if config.get("enable_tenders", False):
            run_tenders_strategy(
                db, 
                config.get("tenders_keywords", "artículos promocionales, regalos finos, uniformes")
            )
            
        # Prospección de Miembros de Cámaras
        if config.get("enable_chambers", False):
            run_chambers_strategy(
                db, 
                config.get("chambers_targets", "CANACO, COPARMEX, ANTAD, SIEM")
            )
            
    print("\n--- CICLO DE ESCANEO FINALIZADO ---")
