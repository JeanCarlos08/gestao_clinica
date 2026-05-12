import os
import psycopg2
from dotenv import load_dotenv

# Força o carregamento
load_dotenv()

def test_connection():
    url = os.getenv("DATABASE_URL")
    print(f"DEBUG: Tentando conectar ao banco...")
    print(f"DEBUG: URL encontrada: {url[:30]}... (escondida por segurança)")
    
    if not url:
        print("❌ ERRO: DATABASE_URL não encontrada no ambiente!")
        return

    try:
        conn = psycopg2.connect(url, connect_timeout=5)
        print("✅ SUCESSO: Conexão estabelecida com o Neon!")
        conn.close()
    except Exception as e:
        print(f"❌ ERRO TÉCNICO: {e}")
        print("\nDica: Se for erro de 'host', verifique se você está conectado à internet.")

if __name__ == "__main__":
    test_connection()
