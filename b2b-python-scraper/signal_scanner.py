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
        domain = find_company_domain(company_name)
        if domain:
            print(f"  Dominio encontrado: {domain}")
            contact_data = find_decision_maker(domain)
            
        stage = "Lead Detectado"
        
        if contact_data:
            print(f"  Contacto encontrado: {contact_data['email']} ({contact_data['full_name']} - {contact_data['job_title']})")
            stage = "Contacto Identificado"
            db.table("b2b_contacts").insert({
                "id": f"CONT-{timestamp}",
                "company_id": company_id,
                "full_name": contact_data["full_name"],
                "job_title": contact_data["job_title"],
                "email": contact_data["email"],
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

def run_scan_cycle(keywords="", target_companies="", target_sectors=""):
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
            # Agregamos las descubiertas a la lista de procesamiento directo
            direct_companies_to_process.extend(discovered_companies)

    # --- ESTRATEGIA 2: Extracción Directa por Empresas ---
    # Limpiar duplicados
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
            
    print("\n--- CICLO DE ESCANEO FINALIZADO ---")
