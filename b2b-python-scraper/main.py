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
        
    print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] Revisando configuración en Supabase...")
    
    try:
        response = db.table('b2b_scraper_config').select('*').eq('id', 1).execute()
        config = response.data[0] if response.data else None
        
        if not config:
            print("No se encontró configuración en Supabase.")
            return
            
        if not config.get('is_active', False):
            print("El motor está APAGADO desde el panel de control. Ignorando ejecución.")
            return
            
        keywords = config.get('search_keywords', '')
        print(f"Motor ENCENDIDO. Palabras clave: {keywords}")
        print("Iniciando escaneo...")
        
        # Ejecutar el escáner pasando las palabras clave
        run_scan_cycle(keywords)
        
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
    
    # Programar a las 09:00 AM todos los días
    schedule.every().day.at("09:00").do(fetch_config_and_run)
    
    # Descomenta esta línea si deseas probarlo una vez en cuanto arranque:
    # fetch_config_and_run()
    
    while True:
        schedule.run_pending()
        time.sleep(60)

if __name__ == "__main__":
    main()
