import sys
import os
from dotenv import load_dotenv

# Carrega o .env manualmente para garantir que as credenciais do banco estejam disponíveis
load_dotenv()

# Adiciona o diretório atual ao path para importar os módulos
sys.path.append(os.getcwd())

from database.connection import ensure_schema
from services.auth_service import bootstrap_admin_if_needed
from utils.logger import get_logger

logger = get_logger("migration_script")

def run_migration():
    print("🚀 Iniciando atualização de schema e usuários...")
    try:
        # 1. Garante que as tabelas (incluindo 'users') existam
        ensure_schema()
        print("✅ Schema verificado.")
        
        # 2. Cria o admin inicial baseado no seu .env
        bootstrap_admin_if_needed()
        print("✅ Usuário admin verificado/criado.")
        
        print("\n✨ Tudo pronto! Agora você pode logar com as credenciais oficiais.")
        print(f"👤 Usuário: {os.getenv('APP_ADMIN_USER', 'julianafeitosa')}")
        print("🔑 Senha: (definida no .env)")
    except Exception as e:
        print(f"❌ Erro durante a atualização: {e}")

if __name__ == "__main__":
    run_migration()
