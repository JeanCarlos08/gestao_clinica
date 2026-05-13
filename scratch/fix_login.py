import os
import psycopg2
from dotenv import load_dotenv
import hashlib

# 1. Carregar variáveis do .env
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

def hash_password(password):
    """Gera hash SHA-256 (mesmo método usado no auth_service)."""
    return hashlib.sha256(password.encode()).hexdigest()

def force_admin_creation():
    if not DATABASE_URL:
        print("❌ DATABASE_URL não encontrada no .env")
        return

    try:
        # 2. Conectar ao banco
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()

        # 3. Garantir que a tabela users existe
        print("🛠️ Verificando tabela de usuários...")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id              SERIAL PRIMARY KEY,
                username        VARCHAR(100) UNIQUE NOT NULL,
                display_name    VARCHAR(255) NOT NULL,
                password_hash   VARCHAR(255) NOT NULL,
                role            VARCHAR(50) DEFAULT 'admin' NOT NULL,
                email           VARCHAR(255),
                is_active       BOOLEAN DEFAULT TRUE,
                photo_base64    TEXT,
                created_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                last_login      TIMESTAMPTZ
            );
        """)

        # 4. Criar ou Atualizar o admin
        username = os.getenv("APP_ADMIN_USER", "julianafeitosa")
        print(f"👤 Usuário: {username}")
        print("🔑 Senha: (oficial)")
        display_name = "Administrador"
        password_hash = hash_password(os.getenv("APP_ADMIN_PASS", "01202268Jf! "))
        
        print(f"👤 Criando/Atualizando usuário '{username}'...")
        cur.execute("""
            INSERT INTO users (username, display_name, password_hash, role)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (username) 
            DO UPDATE SET password_hash = EXCLUDED.password_hash, display_name = EXCLUDED.display_name
        """, (username, display_name, password_hash, "admin"))

        conn.commit()
        cur.close()
        conn.close()
        print(f"\n✅ SUCESSO! Usuário '{username}' pronto com a senha oficial.")
        print("🚀 Tente fazer o login agora no navegador.")

    except Exception as e:
        print(f"❌ Erro ao acessar o banco: {e}")

if __name__ == "__main__":
    force_admin_creation()
