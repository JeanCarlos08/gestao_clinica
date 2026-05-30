"""
Camada de conexão com o banco de dados PostgreSQL.

Responsabilidade única: gerenciar conexões de forma segura e eficiente.
NÃO contém lógica de negócio nem queries de domínio.

Compatível com:
- Streamlit Cloud (st.secrets)
- Variáveis de ambiente (.env)
- DATABASE_URL completa
- Variáveis individuais (db_host, db_port, etc.)
"""

import os
from contextlib import contextmanager
from typing import Any, Dict, Generator, Optional, Tuple
from urllib.parse import parse_qs, unquote, urlparse

from utils.logger import get_logger

logger = get_logger(__name__)

# ─────────────────────────────────────────────────────────────
# Imports condicionais (tolerante a ambientes sem psycopg2)
# ─────────────────────────────────────────────────────────────

try:
    import psycopg2
    import psycopg2.extras
    POSTGRES_AVAILABLE = True
except ImportError:  # pragma: no cover
    POSTGRES_AVAILABLE = False
    logger.warning("psycopg2 não encontrado. Instale 'psycopg2-binary'.")

try:
    import streamlit as st  # type: ignore
except Exception:  # pragma: no cover
    st = None  # type: ignore

# ─────────────────────────────────────────────────────────────
# Configuração — Chaves aceitas
# ─────────────────────────────────────────────────────────────

_REQUIRED_KEYS: Tuple[str, ...] = ("db_host", "db_port", "db_name", "db_user", "db_password")
_URL_KEYS: Tuple[str, ...] = ("database_url", "db_url", "postgres_url", "postgresql_url")

# Cache da configuração para evitar re-leitura a cada conexão
_DB_CONFIG_CACHE: Optional[Dict[str, str]] = None


# ─────────────────────────────────────────────────────────────
# Parsing de configuração
# ─────────────────────────────────────────────────────────────

def _normalize_mapping(source: Any) -> Dict[str, str]:
    """Normaliza qualquer mapeamento (dict, st.secrets, etc.) para dict com chaves lowercase."""
    normalized: Dict[str, str] = {}
    try:
        items = source.items()
    except AttributeError:
        return normalized
    for key, value in items:
        if value is None or value == "":
            continue
        normalized[str(key).lower()] = str(value)
    return normalized


def _parse_database_url(url: str) -> Dict[str, str]:
    """
    Extrai configuração a partir de DATABASE_URL no formato:
    postgres://user:password@host:port/dbname?sslmode=require
    """
    parsed = urlparse(url)
    if parsed.scheme not in {"postgres", "postgresql"}:
        raise ValueError("DATABASE_URL inválida: use postgres:// ou postgresql://")

    if not parsed.hostname:
        raise ValueError("DATABASE_URL inválida: host ausente.")

    db_path = parsed.path.lstrip("/")
    if not db_path:
        raise ValueError("DATABASE_URL inválida: nome do banco ausente.")

    config: Dict[str, str] = {
        "db_host":     parsed.hostname,
        "db_port":     str(parsed.port or 5432),
        "db_name":     db_path,
        "db_user":     unquote(parsed.username or ""),
        "db_password": unquote(parsed.password or ""),
    }

    # SSL mode via query string (?sslmode=require)
    try:
        qs = parse_qs(parsed.query or "")
        if "sslmode" in qs and qs["sslmode"]:
            config["db_sslmode"] = qs["sslmode"][0]
    except Exception:
        pass

    return config


def _build_config_from_mapping(source: Any) -> Optional[Dict[str, str]]:
    """Tenta construir configuração de banco a partir de um mapping (st.secrets ou os.environ)."""
    normalized = _normalize_mapping(source)
    if not normalized:
        return None

    # Prioridade 1: DATABASE_URL
    for url_key in _URL_KEYS:
        if url_key in normalized:
            try:
                return _parse_database_url(normalized[url_key])
            except Exception as e:
                logger.warning(f"Falha ao parsear {url_key}: {e}")

    # Prioridade 2: Variáveis individuais
    if all(k in normalized for k in _REQUIRED_KEYS):
        config = {k: normalized[k] for k in _REQUIRED_KEYS}
        if "db_sslmode" in normalized:
            config["db_sslmode"] = normalized["db_sslmode"]
        return config

    return None


def _load_db_config() -> Dict[str, str]:
    """
    Carrega a configuração do banco com cache.
    Prioridade: st.secrets → os.environ
    """
    global _DB_CONFIG_CACHE
    if _DB_CONFIG_CACHE is not None:
        return _DB_CONFIG_CACHE

    # 1. Streamlit Secrets (Cloud)
    if st is not None:
        secrets = getattr(st, "secrets", None)
        if secrets is not None:
            config = _build_config_from_mapping(secrets)
            if config:
                _DB_CONFIG_CACHE = config
                logger.info("Configuração do banco carregada via st.secrets.")
                return _DB_CONFIG_CACHE

    # 2. Variáveis de Ambiente / .env
    config = _build_config_from_mapping(os.environ)
    if config:
        _DB_CONFIG_CACHE = config
        logger.info(f"Configuração do banco carregada via ENV. Host: {config.get('db_host', '?')}")
        return _DB_CONFIG_CACHE

    raise RuntimeError(
        "Banco não configurado. Defina DATABASE_URL ou as variáveis "
        "db_host, db_port, db_name, db_user, db_password no .env ou st.secrets."
    )


# ─────────────────────────────────────────────────────────────
# Conexão
# ─────────────────────────────────────────────────────────────

def get_connection():
    """
    Cria e retorna uma nova conexão PostgreSQL.

    Returns:
        psycopg2.connection com RealDictCursor configurado.

    Raises:
        RuntimeError: Se a configuração estiver ausente ou a conexão falhar.
        ImportError: Se psycopg2 não estiver instalado.
    """
    if not POSTGRES_AVAILABLE:
        raise ImportError("psycopg2 não instalado. Execute: pip install psycopg2-binary")

    cfg = _load_db_config()

    try:
        conn_kwargs: Dict[str, Any] = {
            "host":           cfg["db_host"],
            "port":           cfg["db_port"],
            "dbname":         cfg["db_name"],
            "user":           cfg["db_user"],
            "password":       cfg["db_password"],
            "cursor_factory": psycopg2.extras.RealDictCursor,
            "connect_timeout": 10,
        }
        # SSL mode (obrigatório na maioria dos clouds: Neon, Supabase, etc.)
        sslmode = cfg.get("db_sslmode")
        if sslmode:
            conn_kwargs["sslmode"] = sslmode

        conn = psycopg2.connect(**conn_kwargs)

        # Garante encoding UTF-8 consistente
        try:
            conn.set_client_encoding("UTF8")
        except Exception:
            pass

        return conn

    except psycopg2.OperationalError as e:
        # Log interno sem expor credenciais
        logger.error(f"Falha de conexão PostgreSQL: {type(e).__name__}")
        raise RuntimeError(
            "Falha ao conectar ao banco de dados. Verifique as credenciais e a conectividade."
        ) from None
    except Exception as e:
        logger.error(f"Erro inesperado ao conectar: {type(e).__name__}")
        raise RuntimeError("Erro inesperado ao conectar ao banco de dados.") from None


@contextmanager
def connection_scope(commit: bool = True) -> Generator:
    """
    Context manager para gerenciamento automático de conexão e transação.

    Garante:
    - Commit automático ao final (se commit=True)
    - Rollback automático em caso de exceção
    - Fechamento da conexão sempre (finally)

    Uso:
        with connection_scope() as conn:
            cur = conn.cursor()
            cur.execute(...)
    """
    conn = get_connection()
    try:
        yield conn
        if commit:
            conn.commit()
    except Exception:
        if hasattr(conn, "rollback"):
            conn.rollback()
        raise
    finally:
        try:
            conn.close()
        except Exception:
            pass


# ─────────────────────────────────────────────────────────────
# Schema e Migrations
# ─────────────────────────────────────────────────────────────

_SCHEMA_STATEMENTS = (
    """
    CREATE TABLE IF NOT EXISTS atendimentos (
        id          SERIAL PRIMARY KEY,
        empresa     VARCHAR(255) NOT NULL,
        nome        VARCHAR(255) NOT NULL,
        modalidade  VARCHAR(100) NOT NULL,
        data        DATE NOT NULL,
        hora        TIME NOT NULL,
        laudo_pdf   VARCHAR(255),
        avaliacao_pdf VARCHAR(255),
        status      VARCHAR(50) DEFAULT 'Agendado',
        observacoes TEXT,
        criado_em   TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS notas (
        id        SERIAL PRIMARY KEY,
        titulo    VARCHAR(255) NOT NULL,
        conteudo  TEXT,
        tags      VARCHAR(255),
        favorita  INTEGER DEFAULT 0
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS arquivos (
        id           SERIAL PRIMARY KEY,
        filename     VARCHAR(255) NOT NULL,
        content      BYTEA NOT NULL,
        content_type VARCHAR(100),
        size         INTEGER,
        criado_em    TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS auditoria (
        id          SERIAL PRIMARY KEY,
        acao        VARCHAR(100) NOT NULL,
        entidade    VARCHAR(100) NOT NULL,
        entidade_id INTEGER,
        detalhes    TEXT,
        usuario     VARCHAR(120),
        criado_em   TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS user_preferences (
        id          SERIAL PRIMARY KEY,
        pref_key    VARCHAR(100) UNIQUE NOT NULL,
        pref_value  TEXT,
        updated_at  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS documentos (
        id              SERIAL PRIMARY KEY,
        titulo          VARCHAR(255) NOT NULL,
        google_doc_id   VARCHAR(255) NOT NULL,
        tipo            VARCHAR(50) DEFAULT 'template',
        atendimento_id  INTEGER REFERENCES atendimentos(id) ON DELETE SET NULL,
        criado_em       TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
    """,
    # Índices
    "CREATE INDEX IF NOT EXISTS idx_atendimentos_data ON atendimentos (data DESC, hora DESC);",
    "CREATE INDEX IF NOT EXISTS idx_atendimentos_empresa ON atendimentos (empresa);",
    "CREATE INDEX IF NOT EXISTS idx_atendimentos_nome ON atendimentos (nome);",
    "CREATE INDEX IF NOT EXISTS idx_atendimentos_status ON atendimentos (status);",
    "CREATE INDEX IF NOT EXISTS idx_auditoria_entidade ON auditoria (entidade, entidade_id);",
    # Tabela de usuários (multi-role, preparada para SaaS)
    """
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
    """,
    "CREATE INDEX IF NOT EXISTS idx_users_username ON users (LOWER(username));",
    "CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);",
    # ── LGPD: Consentimentos dos titulares (Art. 8º) ──
    """
    CREATE TABLE IF NOT EXISTS consentimentos (
        id              SERIAL PRIMARY KEY,
        titular_nome    VARCHAR(255) NOT NULL,
        titular_email   VARCHAR(255),
        finalidade      TEXT NOT NULL,
        base_legal      VARCHAR(100) NOT NULL,
        aceito          BOOLEAN NOT NULL DEFAULT FALSE,
        aceito_em       TIMESTAMPTZ,
        revogado        BOOLEAN DEFAULT FALSE,
        revogado_em     TIMESTAMPTZ,
        ip_origem       VARCHAR(45),
        user_agent      TEXT,
        criado_em       TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
    """,
    "CREATE INDEX IF NOT EXISTS idx_consentimentos_email ON consentimentos (LOWER(titular_email));",
    "CREATE INDEX IF NOT EXISTS idx_consentimentos_aceito ON consentimentos (aceito, revogado);",
    # ── LGPD: Tentativas de login — brute force protection ──
    """
    CREATE TABLE IF NOT EXISTS login_attempts (
        id          SERIAL PRIMARY KEY,
        username    VARCHAR(100) NOT NULL,
        ip_address  VARCHAR(45),
        sucesso     BOOLEAN NOT NULL,
        tentado_em  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
    """,
    "CREATE INDEX IF NOT EXISTS idx_login_attempts_user ON login_attempts (username, tentado_em DESC);",
    "CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON login_attempts (ip_address, tentado_em DESC);",
)



def ensure_schema() -> None:
    """
    Garante que todas as tabelas e índices existam no banco.
    Idempotente — pode ser chamado múltiplas vezes com segurança.
    Também roda migrations automáticas de dados legados.
    """
    with connection_scope() as conn:
        cur = conn.cursor()
        for stmt in _SCHEMA_STATEMENTS:
            try:
                cur.execute(stmt)
            except Exception as e:
                logger.warning(f"Schema statement ignorado (pode já existir): {type(e).__name__}")

    # Migrations de dados legados
    _migrate_date_time_columns()
    _migrate_modalidade_periodico()
    logger.info("Schema verificado e migrations aplicadas.")


def _migrate_date_time_columns() -> None:
    """Migra colunas data/hora de VARCHAR para DATE/TIME se necessário (compatibilidade legado)."""
    try:
        with connection_scope() as conn:
            cur = conn.cursor()
            cur.execute("""
                SELECT data_type FROM information_schema.columns
                WHERE table_name = 'atendimentos' AND column_name = 'data'
            """)
            row = cur.fetchone()
            if row and row["data_type"] in ("character varying", "text"):
                cur.execute("""
                    ALTER TABLE atendimentos
                    ALTER COLUMN data TYPE DATE
                    USING TO_DATE(data, 'DD/MM/YYYY')
                """)
                cur.execute("""
                    ALTER TABLE atendimentos
                    ALTER COLUMN hora TYPE TIME
                    USING hora::TIME
                """)
                logger.info("Migration: colunas data/hora convertidas para DATE/TIME.")
    except Exception as e:
        logger.warning(f"Migration date_time ignorada: {e}")


def _migrate_modalidade_periodico() -> None:
    """Corrige registros antigos com modalidade 'Período' → 'Periódico'."""
    try:
        with connection_scope() as conn:
            cur = conn.cursor()
            cur.execute(
                "UPDATE atendimentos SET modalidade = %s WHERE modalidade = %s",
                ("Periódico", "Período"),
            )
            if cur.rowcount:
                logger.info(f"Migration: {cur.rowcount} registro(s) corrigidos para 'Periódico'.")
    except Exception:
        pass


def check_connection() -> bool:
    """Verifica se a conexão com o banco está funcional. Retorna True se OK."""
    try:
        with connection_scope(commit=False) as conn:
            cur = conn.cursor()
            cur.execute("SELECT 1")
        return True
    except Exception:
        return False


def get_diagnostics() -> Dict[str, str]:
    """Retorna diagnóstico do banco para a página de configurações."""
    try:
        cfg = _load_db_config()
        with connection_scope(commit=False) as conn:
            cur = conn.cursor()
            cur.execute(
                "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
            )
            tables = sorted([row["table_name"] for row in cur.fetchall()])
        return {
            "backend":  "PostgreSQL",
            "host":     cfg.get("db_host", "?"),
            "database": cfg.get("db_name", "?"),
            "tables":   ", ".join(tables),
            "status":   "Conectado ✅",
        }
    except Exception as e:
        return {"backend": "PostgreSQL", "status": f"Erro ❌: {str(e)[:100]}"}
