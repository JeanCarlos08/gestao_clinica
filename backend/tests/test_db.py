import os
import psycopg2
from dotenv import load_dotenv

# Força o carregamento
load_dotenv()

def test_connection():
    url = os.getenv("DATABASE_URL")
    assert url is not None, "DATABASE_URL não encontrada no ambiente!"
    assert len(url) > 10, "DATABASE_URL parece inválida (muito curta)"
    
    try:
        conn = psycopg2.connect(url, connect_timeout=5)
        conn.close()
    except Exception as e:
        raise AssertionError(f"Falha ao conectar ao banco: {e}")

if __name__ == "__main__":
    test_connection()
