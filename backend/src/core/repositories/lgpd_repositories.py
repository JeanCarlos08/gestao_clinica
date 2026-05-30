"""
Repositories LGPD — gestao_clinica

Gerencia:
- ConsentimentoRepository: registro e revogação de consentimento dos titulares (LGPD Art. 8º)
- LoginAttemptRepository: rastreamento de tentativas de login (brute force protection)
"""

from datetime import datetime, timedelta
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
                        datetime.utcnow() if aceito else None,
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
                    (datetime.utcnow(), email[:255]),
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
            since = datetime.utcnow() - timedelta(minutes=janela_minutos)
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
            since = datetime.utcnow() - timedelta(minutes=janela_minutos)
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
            cutoff = datetime.utcnow() - timedelta(days=dias)
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
