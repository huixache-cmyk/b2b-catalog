from dotenv import load_dotenv
from db_client import init_db
from main import fetch_config_and_run

if __name__ == "__main__":
    load_dotenv()
    init_db()
    
    print("Ejecutando escaneo único (Modo GitHub Actions)...")
    fetch_config_and_run()
    print("Escaneo finalizado. Saliendo.")
