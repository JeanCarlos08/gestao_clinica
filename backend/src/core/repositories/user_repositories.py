"""
Repository de Usuários e Configurações da Clínica.

Gerencia:
- CRUD de usuários (multi-role)
- Configurações da clínica (persistidas no banco)
- Bootstrap do usuário admin inicial

Compatível com a tabela `users` criada pelo ensure_schema() atualizado.
"""

from typing import Optional
from datetime import datetime

from infrastructure.connection import connection_scope
from core.entities.user_models import User, UserCreate, UserUpdate, SessionUser
from utils.constants import (
    ROLE_ADMIN,
    CLINIC_PREF_NAME, CLINIC_PREF_PHONE, CLINIC_PREF_ADDRESS,
    CLINIC_PREF_EMAIL, CLINIC_PREF_THEME, CLINIC_PREF_LAYOUT,
    CLINIC_PREF_GOOGLE_DOC_ID,
    CLINIC_PREF_LOGO, CLINIC_PREF_USER_NAME,
    CLINIC_PREF_USER_EMAIL, CLINIC_PREF_USER_PHOTO,
)
from utils.logger import get_logger

logger = get_logger(__name__)

# ─────────────────────────────────────────────────────────────
# User Repository
# ─────────────────────────────────────────────────────────────

class UserRepository:
    """
    CRUD de usuários com suporte a múltiplos roles.

    Arquitetura preparada para expansão SaaS — mesmo que inicialmente
    exista apenas 1 usuário admin.
    """

    TABLE = "users"

    def _row_to_model(self, row: dict) -> User:
        return User(
            id=row["id"],
            username=row["username"],
            display_name=row["display_name"],
            role=row.get("role", ROLE_ADMIN),
            email=row.get("email"),
            is_active=bool(row.get("is_active", True)),
            photo_base64=row.get("photo_base64"),
            created_at=row.get("created_at"),
            last_login=row.get("last_login"),
        )

    def find_by_username(self, username: str) -> Optional[User]:
        """Busca usuário pelo username (para login)."""
        try:
            with connection_scope(commit=False) as conn:
                cur = conn.cursor()
                cur.execute(
                    f"SELECT id, username, display_name, role, email, is_active, "
                    f"photo_base64, created_at, last_login FROM {self.TABLE} "
                    f"WHERE LOWER(username) = LOWER(%s) AND is_active = TRUE",
                    (username.strip(),),
                )
                row = cur.fetchone()
                return self._row_to_model(dict(row)) if row else None
        except Exception as e:
            logger.error(f"UserRepo: Erro ao buscar usuário '{username}': {e}")
            return None

    def get_password_hash(self, username: str) -> Optional[str]:
        """Retorna o hash da senha do usuário (separado por segurança)."""
        try:
            with connection_scope(commit=False) as conn:
                cur = conn.cursor()
                cur.execute(
                    f"SELECT password_hash FROM {self.TABLE} WHERE LOWER(username) = LOWER(%s)",
                    (username.strip(),),
                )
                row = cur.fetchone()
                return row["password_hash"] if row else None
        except Exception as e:
            logger.error(f"UserRepo: Erro ao buscar hash de '{username}': {e}")
            return None

    def find_by_id(self, user_id: int) -> Optional[User]:
        """Busca usuário pelo ID."""
        try:
            with connection_scope(commit=False) as conn:
                cur = conn.cursor()
                cur.execute(
                    f"SELECT id, username, display_name, role, email, is_active, "
                    f"photo_base64, created_at, last_login FROM {self.TABLE} WHERE id = %s",
                    (user_id,),
                )
                row = cur.fetchone()
                return self._row_to_model(dict(row)) if row else None
        except Exception as e:
            logger.error(f"UserRepo: Erro ao buscar user #{user_id}: {e}")
            return None

    def list_all(self) -> list[User]:
        """Lista todos os usuários (para gestão de usuários no painel admin)."""
        try:
            with connection_scope(commit=False) as conn:
                cur = conn.cursor()
                cur.execute(
                    f"SELECT id, username, display_name, role, email, is_active, "
                    f"photo_base64, created_at, last_login FROM {self.TABLE} ORDER BY id"
                )
                return [self._row_to_model(dict(r)) for r in cur.fetchall()]
        except Exception as e:
            logger.error(f"UserRepo: Erro ao listar usuários: {e}")
            return []

    def create(self, data: UserCreate) -> int:
        """Cria um novo usuário. Retorna o ID gerado."""
        try:
            with connection_scope() as conn:
                cur = conn.cursor()
                cur.execute(
                    f"""INSERT INTO {self.TABLE}
                        (username, display_name, password_hash, role, email, is_active)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    RETURNING id""",
                    (data.username, data.display_name, data.password_hash,
                     data.role, data.email, data.is_active),
                )
                row = cur.fetchone()
                new_id = int(row["id"]) if row else 0
            logger.info(f"UserRepo: Usuário '{data.username}' criado (ID #{new_id}, role={data.role})")
            return new_id
        except Exception as e:
            logger.error(f"UserRepo: Erro ao criar usuário '{data.username}': {e}")
            return 0

    def update(self, user_id: int, data: UserUpdate) -> bool:
        """Atualiza campos do usuário. Apenas campos não-None."""
        allowed = {
            "display_name", "email", "role", "is_active",
            "photo_base64", "password_hash",
        }
        updates = {k: v for k, v in data.__dict__.items() if v is not None and k in allowed}
        if not updates:
            return False
        set_parts = [f"{k} = %s" for k in updates]
        params = list(updates.values()) + [user_id]
        try:
            with connection_scope() as conn:
                cur = conn.cursor()
                cur.execute(
                    f"UPDATE {self.TABLE} SET {', '.join(set_parts)} WHERE id = %s",
                    params,
                )
                return cur.rowcount > 0
        except Exception as e:
            logger.error(f"UserRepo: Erro ao atualizar user #{user_id}: {e}")
            return False

    def update_last_login(self, user_id: int) -> None:
        """Atualiza o timestamp de último login."""
        try:
            with connection_scope() as conn:
                cur = conn.cursor()
                cur.execute(
                    f"UPDATE {self.TABLE} SET last_login = NOW() WHERE id = %s",
                    (user_id,),
                )
        except Exception:
            pass

    def deactivate(self, user_id: int) -> bool:
        """Desativa um usuário (soft delete)."""
        try:
            with connection_scope() as conn:
                cur = conn.cursor()
                cur.execute(
                    f"UPDATE {self.TABLE} SET is_active = FALSE WHERE id = %s",
                    (user_id,),
                )
                return cur.rowcount > 0
        except Exception as e:
            logger.error(f"UserRepo: Erro ao desativar user #{user_id}: {e}")
            return False

    def username_exists(self, username: str) -> bool:
        """Verifica se um username já está em uso."""
        try:
            with connection_scope(commit=False) as conn:
                cur = conn.cursor()
                cur.execute(
                    f"SELECT 1 FROM {self.TABLE} WHERE LOWER(username) = LOWER(%s)",
                    (username.strip(),),
                )
                return cur.fetchone() is not None
        except Exception:
            return False

    def bootstrap_admin(self, username: str, display_name: str, password_hash: str) -> bool:
        """
        Cria o usuário admin inicial SE não existir nenhum usuário no banco.
        Chamado uma única vez no startup do sistema.
        """
        try:
            with connection_scope(commit=False) as conn:
                cur = conn.cursor()
                cur.execute(f"SELECT COUNT(*) AS cnt FROM {self.TABLE}")
                row = cur.fetchone()
                if row and int(row["cnt"]) > 0:
                    return False  # Já existe pelo menos 1 usuário

            # Cria o admin inicial
            new_id = self.create(UserCreate(
                username=username,
                display_name=display_name,
                password_hash=password_hash,
                role=ROLE_ADMIN,
            ))
            if new_id:
                logger.info(f"Bootstrap: Admin inicial '{username}' criado (ID #{new_id})")
            return new_id > 0
        except Exception as e:
            logger.error(f"Bootstrap admin falhou: {e}")
            return False


# ─────────────────────────────────────────────────────────────
# Clinic Config Repository
# ─────────────────────────────────────────────────────────────

class ClinicConfigRepository:
    """
    Gerencia configurações da clínica e do sistema.
    Usa a tabela user_preferences como chave-valor persistente.
    """

    def __init__(self):
        from core.repositories.repositories import PreferencesRepository
        self._prefs = PreferencesRepository()

    def get(self, key: str, default: str = "") -> str:
        return self._prefs.get(key, default) or default

    def save(self, key: str, value: str) -> bool:
        return self._prefs.save(key, value)

    def get_all_clinic_data(self) -> dict:
        """Retorna todas as configurações da clínica de uma vez (1 query em vez de 11)."""
        keys = [
            CLINIC_PREF_NAME, CLINIC_PREF_PHONE, CLINIC_PREF_ADDRESS,
            CLINIC_PREF_EMAIL, CLINIC_PREF_THEME, CLINIC_PREF_LAYOUT,
            CLINIC_PREF_GOOGLE_DOC_ID,
            CLINIC_PREF_LOGO, CLINIC_PREF_USER_NAME,
            CLINIC_PREF_USER_EMAIL, CLINIC_PREF_USER_PHOTO,
        ]
        result = self._prefs.get_many_keys(keys)
        return {k: result.get(k, "") for k in keys}

    def save_clinic_data(self, data: dict) -> bool:
        """Salva múltiplas configurações de uma vez."""
        success = True
        for key, value in data.items():
            if value is not None:
                ok = self.save(key, str(value))
                if not ok:
                    success = False
        return success


# Singletons
user_repo = UserRepository()
clinic_config_repo = ClinicConfigRepository()
