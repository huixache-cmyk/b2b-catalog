import os
import time
import schedule
from dotenv import load_dotenv

from db_client import init_db, get_db
from signal_scanner import run_scan_cycle

def fetch_config_and_run():
    db = get_db()
    if not db:
        print("No se pudo obtener el cliente de DB.")
        return
        
    print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] Cargando credenciales y configuración en Supabase...")
    
    try:
        # 1. Cargar credenciales dinámicas de la tabla settings
        settings_resp = db.table('settings').select('home_settings').eq('id', 1).execute()
        if settings_resp.data:
            home_settings = settings_resp.data[0].get('home_settings', {})
            api_creds = home_settings.get('api_credentials', {})
            for key, val in api_creds.items():
                if val:
                    os.environ[key] = val
                    
        # 2. Cargar configuración del scraper
        response = db.table('b2b_scraper_config').select('*').eq('id', 1).execute()
        config = response.data[0] if response.data else None
        
        if not config:
            print("No se encontró configuración en Supabase.")
            return
            
        if not config.get('is_active', False):
            print("El motor está APAGADO desde el panel de control. Ignorando ejecución.")
            return
            
        keywords = config.get('search_keywords', '')
        target_companies = config.get('target_companies', '')
        target_sectors = config.get('target_sectors', '')
        
        print(f"Motor ENCENDIDO.")
        print(f"Palabras clave (Eventos): {keywords}")
        print(f"Empresas Objetivo: {target_companies}")
        print(f"Sectores: {target_sectors}")
        print("Iniciando escaneo...")
        
        # Ejecutar el escáner pasando las tres variables y la config completa
        run_scan_cycle(keywords, target_companies, target_sectors, config)
        
        # Actualizar last_run_at en Supabase
        db.table('b2b_scraper_config').update({
            'last_run_at': time.strftime('%Y-%m-%dT%H:%M:%S%z')
        }).eq('id', 1).execute()
        
        print("Escaneo finalizado y fecha de ejecución actualizada.")
        
    except Exception as e:
        print(f"Error durante el ciclo de escaneo: {e}")

def main():
    load_dotenv()
    init_db()
    
    print("Iniciando Agente B2B (Modo: Programación Diaria)...")
    print("El script despertará todos los días a las 09:00 AM para leer la configuración de la web.")
    
    # Programar a las 09:00, 12:00, 15:00 y 20:00 todos los días
    schedule.every().day.at("09:00").do(fetch_config_and_run)
    schedule.every().day.at("12:00").do(fetch_config_and_run)
    schedule.every().day.at("15:00").do(fetch_config_and_run)
    schedule.every().day.at("20:00").do(fetch_config_and_run)
    
    # Descomenta esta línea si deseas probarlo una vez en cuanto arranque:
    # fetch_config_and_run()
    
    while True:
        schedule.run_pending()
        time.sleep(60)

if __name__ == "__main__":
    main()
