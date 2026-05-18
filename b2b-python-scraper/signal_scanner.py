import time
import os
import json
import urllib.parse
import feedparser
import requests
import google.generativeai as genai
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
        url = f"https://api.hunter.io/v2/domain-search?domain={domain}&department=executive,sales,marketing&limit=5&api_key={hunter_key}"
        resp = requests.get(url, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            emails = data.get('data', {}).get('emails', [])
            if emails:
                best_email = emails[0]
                return {
                    "full_name": f"{best_email.get('first_name', '')} {best_email.get('last_name', '')}".strip() or "Contacto Corporativo",
                    "email": best_email.get('value'),
                    "job_title": best_email.get('position') or "Manager",
                    "confidence": best_email.get('confidence', 50)
                }
    except Exception as e:
        print(f"Error buscando contacto en Hunter.io para {domain}: {e}")
    return None

def fetch_news(keyword):
    print(f"Buscando noticias para: '{keyword}'...")
    # Búsqueda en Google News México de los últimos 2 días
    query = urllib.parse.quote(f"{keyword} when:2d")
    url = f"https://news.google.com/rss/search?q={query}&hl=es-419&gl=MX&ceid=MX:es-419"
    
    feed = feedparser.parse(url)
    entries = feed.entries[:5] # Tomar solo los primeros 5 resultados
    
    news_items = []
    for entry in entries:
        news_items.append({
            "title": entry.title,
            "link": entry.link,
            "published": getattr(entry, 'published', 'N/A')
        })
    return news_items

def analyze_with_gemini(news_items):
    if not news_items:
        return []
        
    prompt = """
    Eres un analista experto en inteligencia comercial B2B. Analiza los siguientes titulares de noticias de México.
    Busca empresas reales que estén anunciando eventos que indiquen que podrían necesitar comprar regalos corporativos, kits de bienvenida, o promocionales (Ej. aperturas de sucursales, nuevas plantas, expansiones masivas, aniversarios corporativos importantes, contrataciones masivas).
    
    IMPORTANTE: Ignora noticias sobre política, deportes, crímenes o entidades gubernamentales, céntrate sólo en EMPRESAS CORPORATIVAS.
    
    Devuelve estrictamente un arreglo JSON donde cada objeto tenga esta estructura:
    {
      "company_name": "Nombre de la Empresa",
      "industry": "Industria estimada (ej. Manufactura, Tecnología, Logística)",
      "city": "Ciudad mencionada o 'N/A'",
      "signal_type": "Tipo de evento (ej. Expansión, Aniversario, Nueva Sucursal)",
      "description": "Resumen breve de la noticia justificando la oportunidad comercial",
      "score": número entero del 50 al 100 de qué tan buena oportunidad B2B es
    }
    
    Si no encuentras ninguna empresa relevante, devuelve un arreglo vacío [].
    
    NOTICIAS:
    """
    
    for item in news_items:
        prompt += f"\n- {item['title']} ({item['published']})"
        
    try:
        model = genai.GenerativeModel('gemini-2.5-flash')
        # Pedir explícitamente JSON usando el parámetro de respuesta
        response = model.generate_content(
            prompt,
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json"
            )
        )
        
        data = json.loads(response.text)
        return data
    except Exception as e:
        print(f"Error analizando con Gemini: {e}")
        return []

def run_scan_cycle(keywords=""):
    db = get_db()
    if not db:
        print("Error: Cliente de BD no inicializado.")
        return
        
    if not init_gemini():
        return
        
    keys = [k.strip() for k in keywords.split(',') if k.strip()]
    if not keys:
        print("No hay palabras clave configuradas.")
        return
        
    all_news = []
    for key in keys:
        news = fetch_news(key)
        all_news.extend(news)
        
    if not all_news:
        print("No se encontraron noticias recientes.")
        return
        
    print(f"Se recolectaron {len(all_news)} noticias. Analizando con Gemini AI...")
    
    # Procesar en lotes si son muchas, aquí enviamos todas juntas por simplicidad (máx 5 * len(keys))
    detected_opportunities = analyze_with_gemini(all_news)
    
    if not detected_opportunities:
        print("Gemini no detectó oportunidades B2B claras en las noticias actuales.")
        return
        
    print(f"¡Gemini encontró {len(detected_opportunities)} empresas potenciales!")
    
    for opp in detected_opportunities:
        # Generar IDs únicos
        timestamp = int(time.time() * 1000)
        company_id = f"COMP-{timestamp}"
        signal_id = f"SIG-{timestamp}"
        opp_id = f"OPP-{timestamp}"
        
        print(f"-> Procesando: {opp.get('company_name')} ({opp.get('signal_type')})")
        
        try:
            # 1. Insertar Empresa
            db.table("b2b_companies").insert({
                "id": company_id,
                "name": opp.get("company_name", "Desconocida"),
                "industry": opp.get("industry", "General"),
                "city": opp.get("city", "N/A")
            }).execute()
            
            # 2. Insertar Señal
            db.table("b2b_signals").insert({
                "id": signal_id,
                "company_id": company_id,
                "signal_type": opp.get("signal_type", "Oportunidad detectada"),
                "signal_date": time.strftime('%Y-%m-%d'),
                "description": opp.get("description", "Noticia detectada por el motor IA"),
                "score": opp.get("score", 70)
            }).execute()
            
            # 3. Contacto y Enriquecimiento (Hunter.io / Clearbit)
            contact_data = None
            domain = find_company_domain(opp.get("company_name", ""))
            if domain:
                print(f"  Dominio encontrado: {domain}")
                contact_data = find_decision_maker(domain)
                
            stage = "Lead Detectado"
            
            if contact_data:
                print(f"  Contacto encontrado: {contact_data['email']} ({contact_data['full_name']})")
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
                db.table("b2b_contacts").insert({
                    "id": f"CONT-{timestamp}",
                    "company_id": company_id,
                    "full_name": "Pendiente de Investigación",
                    "job_title": "Director / Compras",
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
            
            print(f"[OK] Lead de '{opp.get('company_name')}' insertado exitosamente en Supabase.")
            
        except Exception as e:
            print(f"[ERROR] Error al insertar lead en Supabase: {e}")

