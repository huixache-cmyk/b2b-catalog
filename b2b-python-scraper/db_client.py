import os
from supabase import create_client, Client

supabase_client: Client = None

def init_db():
    global supabase_client
    # Asegúrate de usar la SERVICE_ROLE_KEY de Supabase para poder escribir brincándote RLS si es necesario,
    # o la ANON_KEY si tus políticas RLS lo permiten.
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY")
    
    if not url or not key:
        print("ADVERTENCIA: Credenciales de Supabase no encontradas en el entorno.")
        return
        
    supabase_client = create_client(url, key)
    print("Conexión a Supabase inicializada.")

def get_db() -> Client:
    return supabase_client
