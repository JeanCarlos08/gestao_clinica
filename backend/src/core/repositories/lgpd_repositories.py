"""
Repositories LGPD — gestao_clinica

Gerencia:
- ConsentimentoRepository: registro e revogação de consentimento dos titulares (LGPD Art. 8º)
- LoginAttemptRepository: rastreamento de tentativas de login (brute force protection)
"""

from datetime import datetime, timedelta, UTC
from typing import List, Optional

from infrastructure.connection import connection_scope
from utils.logger import get_logger

logger = get_logger(__name__)

TABLE_CONSENTIMENTOS = "consentimentos"
TABLE_LOGIN_ATTEMPTS = "login_attempts"


# ─────────────────────────────────────────────────────────────
# Model
# ─────────────────────────────────────────────────────────────

class Consentimento:
    """Representa o consentimento LGPD de um titular."""

    def __init__(self, row: dict):
        self.id: int = row["id"]
        self.titular_nome: str = row["titular_nome"]
        self.titular_email: Optional[str] = row.get("titular_email")
        self.finalidade: str = row["finalidade"]
        self.base_legal: str = row["base_legal"]
        self.aceito: bool = row["aceito"]
        self.aceito_em: Optional[datetime] = row.get("aceito_em")
        self.revogado: bool = row.get("revogado", False)
        self.revogado_em: Optional[datetime] = row.get("revogado_em")
        self.ip_origem: Optional[str] = row.get("ip_origem")
        self.criado_em: Optional[datetime] = row.get("criado_em")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "titular_nome": self.titular_nome,
            "titular_email": self.titular_email,
            "finalidade": self.finalidade,
            "base_legal": self.base_legal,
            "aceito": self.aceito,
            "aceito_em": self.aceito_em.isoformat() if self.aceito_em else None,
            "revogado": self.revogado,
            "revogado_em": self.revogado_em.isoformat() if self.revogado_em else None,
            "criado_em": self.criado_em.isoformat() if self.criado_em else None,
        }


# ─────────────────────────────────────────────────────────────
# Consentimento Repository
# ─────────────────────────────────────────────────────────────

class ConsentimentoRepository:
    """CRUD para registros de consentimento LGPD (Art. 8º)."""

    def criar(
        self,
        titular_nome: str,
        finalidade: str,
        base_legal: str,
        titular_email: Optional[str] = None,
        aceito: bool = True,
        ip_origem: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> Optional[int]:
        """Registra um consentimento do titular. Retorna o ID criado."""
        try:
            with connection_scope() as conn:
                cur = conn.cursor()
                cur.execute(
                    f"""
                    INSERT INTO {TABLE_CONSENTIMENTOS}
                        (titular_nome, titular_email, finalidade, base_legal,
                         aceito, aceito_em, ip_origem, user_agent)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING id
                    """,
                    (
                        titular_nome[:255],
                        (titular_email or None),
                        finalidade[:500],
                        base_legal[:100],
                        aceito,
                        (datetime.now(UTC) if aceito else None),
                        (ip_origem or None),
                        (user_agent or None),
                    ),
                )
                row = cur.fetchone()
                new_id = int(row["id"]) if row else None
            logger.info(f"Consentimento registrado: ID #{new_id}")
            return new_id
        except Exception as e:
            logger.error(f"Erro ao registrar consentimento: {e}")
            return None

    def buscar_por_email(self, email: str) -> List[Consentimento]:
        """Busca todos os consentimentos de um titular pelo e-mail."""
        try:
            with connection_scope(commit=False) as conn:
                cur = conn.cursor()
                cur.execute(
                    f"""
                    SELECT * FROM {TABLE_CONSENTIMENTOS}
                    WHERE LOWER(titular_email) = LOWER(%s)
                    ORDER BY criado_em DESC
                    """,
                    (email[:255],),
                )
                return [Consentimento(dict(row)) for row in cur.fetchall()]
        except Exception as e:
            logger.error(f"Erro ao buscar consentimentos: {e}")
            return []

    def buscar_por_id(self, consentimento_id: int) -> Optional[Consentimento]:
        """Busca um consentimento pelo ID."""
        try:
            with connection_scope(commit=False) as conn:
                cur = conn.cursor()
                cur.execute(
                    f"SELECT * FROM {TABLE_CONSENTIMENTOS} WHERE id = %s",
                    (consentimento_id,),
                )
                row = cur.fetchone()
                return Consentimento(dict(row)) if row else None
        except Exception as e:
            logger.error(f"Erro ao buscar consentimento #{consentimento_id}: {e}")
            return None

    def revogar_por_email(self, email: str) -> int:
        """
        Revoga todos os consentimentos ativos de um e-mail (LGPD Art. 8º, §5º).
        Não deleta — mantém histórico de auditoria.
        Returns: número de consentimentos revogados.
        """
        try:
            with connection_scope() as conn:
                cur = conn.cursor()
                cur.execute(
                    f"""
                    UPDATE {TABLE_CONSENTIMENTOS}
                    SET revogado = TRUE, revogado_em = %s
                    WHERE LOWER(titular_email) = LOWER(%s) AND revogado = FALSE
                    """,
                    (datetime.now(UTC), email[:255]),
                )
                count = cur.rowcount
            logger.info(f"Consentimentos revogados para '{email}': {count}")
            return count
        except Exception as e:
            logger.error(f"Erro ao revogar consentimentos de '{email}': {e}")
            return 0

    def deletar_por_email(self, email: str) -> int:
        """
        DIREITO AO ESQUECIMENTO (LGPD Art. 18, VI):
        Remove permanentemente todos os registros de consentimento do titular.
        Returns: número de registros deletados.
        """
        try:
            with connection_scope() as conn:
                cur = conn.cursor()
                cur.execute(
                    f"DELETE FROM {TABLE_CONSENTIMENTOS} WHERE LOWER(titular_email) = LOWER(%s)",
                    (email[:255],),
                )
                count = cur.rowcount
            logger.warning(f"ESQUECIMENTO: {count} consentimentos deletados para '{email}'")
            return count
        except Exception as e:
            logger.error(f"Erro ao deletar consentimentos de '{email}': {e}")
            return 0

    def listar_todos(self, limit: int = 200) -> List[Consentimento]:
        """Lista todos os consentimentos (painel admin)."""
        try:
            with connection_scope(commit=False) as conn:
                cur = conn.cursor()
                cur.execute(
                    f"SELECT * FROM {TABLE_CONSENTIMENTOS} ORDER BY criado_em DESC LIMIT %s",
                    (min(limit, 1000),),
                )
                return [Consentimento(dict(row)) for row in cur.fetchall()]
        except Exception as e:
            logger.error(f"Erro ao listar consentimentos: {e}")
            return []


# ─────────────────────────────────────────────────────────────
# Login Attempt Repository — Brute Force Protection
# ─────────────────────────────────────────────────────────────

class LoginAttemptRepository:
    """
    Registra tentativas de login para proteção contra força bruta.
    Configurável via env: MAX_LOGIN_ATTEMPTS, LOGIN_BLOCK_MINUTES.
    """

    def registrar(self, username: str, sucesso: bool, ip_address: Optional[str] = None) -> None:
        """Registra uma tentativa de login."""
        try:
            with connection_scope() as conn:
                cur = conn.cursor()
                cur.execute(
                    f"INSERT INTO {TABLE_LOGIN_ATTEMPTS} (username, ip_address, sucesso) VALUES (%s, %s, %s)",
                    (username[:100], (ip_address or None), sucesso),
                )
        except Exception as e:
            logger.warning(f"Falha ao registrar tentativa de login: {e}")

    def contar_falhas_recentes(self, username: str, janela_minutos: int = 15) -> int:
        """Conta falhas de login do usuário na janela de tempo."""
        try:
            since = datetime.now(UTC) - timedelta(minutes=janela_minutos)
            with connection_scope(commit=False) as conn:
                cur = conn.cursor()
                cur.execute(
                    f"""
                    SELECT COUNT(*) AS total FROM {TABLE_LOGIN_ATTEMPTS}
                    WHERE username = %s AND sucesso = FALSE AND tentado_em >= %s
                    """,
                    (username[:100], since),
                )
                row = cur.fetchone()
                return int(row["total"]) if row else 0
        except Exception as e:
            logger.error(f"Erro ao contar falhas de login: {e}")
            return 0

    def contar_falhas_por_ip(self, ip_address: str, janela_minutos: int = 15) -> int:
        """Conta falhas de login por IP na janela de tempo."""
        try:
            since = datetime.now(UTC) - timedelta(minutes=janela_minutos)
            with connection_scope(commit=False) as conn:
                cur = conn.cursor()
                cur.execute(
                    f"""
                    SELECT COUNT(*) AS total FROM {TABLE_LOGIN_ATTEMPTS}
                    WHERE ip_address = %s AND sucesso = FALSE AND tentado_em >= %s
                    """,
                    (ip_address[:45], since),
                )
                row = cur.fetchone()
                return int(row["total"]) if row else 0
        except Exception as e:
            logger.error(f"Erro ao contar falhas por IP: {e}")
            return 0

    def esta_bloqueado(
        self,
        username: str,
        ip_address: Optional[str] = None,
        max_attempts: int = 5,
        janela_minutos: int = 15,
    ) -> bool:
        """Verifica se usuário ou IP está bloqueado por excesso de tentativas."""
        if self.contar_falhas_recentes(username, janela_minutos) >= max_attempts:
            logger.warning(f"BRUTE FORCE: usuário '{username}' bloqueado")
            return True
        if ip_address and self.contar_falhas_por_ip(ip_address, janela_minutos) >= max_attempts * 2:
            logger.warning(f"BRUTE FORCE: IP '{ip_address}' bloqueado")
            return True
        return False

    def resetar_usuario(self, username: str) -> None:
        """Limpa tentativas falhas após login bem-sucedido."""
        try:
            with connection_scope() as conn:
                cur = conn.cursor()
                cur.execute(
                    f"DELETE FROM {TABLE_LOGIN_ATTEMPTS} WHERE username = %s AND sucesso = FALSE",
                    (username[:100],),
                )
        except Exception as e:
            logger.error(f"Erro ao resetar tentativas de '{username}': {e}")

    def limpar_antigos(self, dias: int = 90) -> int:
        """Remove tentativas mais antigas que X dias (retenção LGPD)."""
        try:
            cutoff = datetime.now(UTC) - timedelta(days=dias)
            with connection_scope() as conn:
                cur = conn.cursor()
                cur.execute(f"DELETE FROM {TABLE_LOGIN_ATTEMPTS} WHERE tentado_em < %s", (cutoff,))
                count = cur.rowcount
            if count:
                logger.info(f"Limpeza login_attempts: {count} registros removidos (>{dias} dias)")
            return count
        except Exception as e:
            logger.error(f"Erro ao limpar tentativas antigas: {e}")
            return 0


# ─────────────────────────────────────────────────────────────
# Singletons
# ─────────────────────────────────────────────────────────────

consentimento_repo = ConsentimentoRepository()
login_attempt_repo = LoginAttemptRepository()


# ─────────────────────────────────────────────────────────────
# Esquecimento Repository — Auditoria imutável (Art. 18, VI)
# ─────────────────────────────────────────────────────────────

class EsquecimentoAuditoriaRepository:
    """
    Registro imutável de esquecimentos executados.
    Nunca contém PII — apenas hash SHA-256 do e-mail do titular.
    """

    def registrar(
        self,
        titular_email: str,
        consentimentos_removidos: int,
        atendimentos_anonimizados: int,
        executado_por: str = "sistema",
    ) -> Optional[int]:
        import hashlib
        titular_hash = hashlib.sha256(titular_email.lower().encode()).hexdigest()
        try:
            with connection_scope() as conn:
                cur = conn.cursor()
                cur.execute(
                    """
                    INSERT INTO lgpd_esquecimentos
                        (titular_hash, consentimentos_removidos, atendimentos_anonimizados, executado_por)
                    VALUES (%s, %s, %s, %s)
                    RETURNING id
                    """,
                    (titular_hash, consentimentos_removidos, atendimentos_anonimizados, executado_por),
                )
                row = cur.fetchone()
                return int(row["id"]) if row else None
        except Exception as e:
            logger.error(f"Erro ao registrar auditoria de esquecimento: {e}")
            return None

    def listar(self, limit: int = 100) -> list:
        try:
            with connection_scope(commit=False) as conn:
                cur = conn.cursor()
                cur.execute(
                    "SELECT * FROM lgpd_esquecimentos ORDER BY executado_em DESC LIMIT %s",
                    (min(limit, 500),),
                )
                return [dict(r) for r in cur.fetchall()]
        except Exception as e:
            logger.error(f"Erro ao listar esquecimentos: {e}")
            return []


# ─────────────────────────────────────────────────────────────
# DPO Config Repository
# ─────────────────────────────────────────────────────────────

class DPOConfigRepository:
    """Configuração do DPO armazenada no banco (editável via admin)."""

    _DEFAULTS = {
        "dpo_nome": "Encarregado de Dados (DPO)",
        "dpo_email": "dpo@clinicaia.com.br",
        "dpo_telefone": "",
        "empresa_nome": "Clínica IA",
        "empresa_cnpj": "",
        "empresa_endereco": "",
        "lei": "LGPD — Lei nº 13.709/2018",
        "anpd_url": "https://www.gov.br/anpd",
    }

    def get(self, chave: str) -> Optional[str]:
        import os
        # Env vars têm prioridade
        env_map = {"dpo_nome": "DPO_NOME", "dpo_email": "DPO_EMAIL"}
        if chave in env_map and os.getenv(env_map[chave]):
            return os.getenv(env_map[chave])
        try:
            with connection_scope(commit=False) as conn:
                cur = conn.cursor()
                cur.execute("SELECT valor FROM lgpd_config WHERE chave = %s", (chave,))
                row = cur.fetchone()
                return row["valor"] if row else self._DEFAULTS.get(chave)
        except Exception:
            return self._DEFAULTS.get(chave)

    def set(self, chave: str, valor: str) -> bool:
        try:
            with connection_scope() as conn:
                cur = conn.cursor()
                cur.execute(
                    """
                    INSERT INTO lgpd_config (chave, valor, updated_at)
                    VALUES (%s, %s, NOW())
                    ON CONFLICT (chave) DO UPDATE SET valor = EXCLUDED.valor, updated_at = NOW()
                    """,
                    (chave[:100], valor[:2000]),
                )
            return True
        except Exception as e:
            logger.error(f"Erro ao salvar config DPO '{chave}': {e}")
            return False

    def get_all(self) -> dict:
        result = dict(self._DEFAULTS)
        try:
            with connection_scope(commit=False) as conn:
                cur = conn.cursor()
                cur.execute("SELECT chave, valor FROM lgpd_config")
                for row in cur.fetchall():
                    result[row["chave"]] = row["valor"]
        except Exception:
            pass
        return result


esquecimento_auditoria_repo = EsquecimentoAuditoriaRepository()
dpo_config_repo = DPOConfigRepository()
