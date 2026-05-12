"""
Modelos de dados para o sistema de usuários e autenticação multi-role.

Arquitetura preparada para múltiplos usuários com papéis e permissões,
mesmo que inicialmente exista apenas 1 usuário admin.

Esta estrutura permite expansão futura para:
- Múltiplos usuários (admin, psicólogo, recepcionista)
- Login com senha individual
- Auditoria por usuário
- SaaS multi-tenant

Tabela: users
- id, username, display_name, email, password_hash
- role (admin|psicologo|recepcionista)
- is_active, photo_base64
- created_at, last_login
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

from utils.constants import (
    ROLE_ADMIN,
    ROLE_PERMISSIONS,
    ALL_ROLES,
    ROLE_LABELS,
    ROLE_ICONS,
)


@dataclass
class User:
    """Representa um usuário do sistema."""
    id: int
    username: str
    display_name: str
    role: str = ROLE_ADMIN
    email: Optional[str] = None
    is_active: bool = True
    photo_base64: Optional[str] = None
    created_at: Optional[datetime] = None
    last_login: Optional[datetime] = None

    @property
    def role_label(self) -> str:
        return ROLE_LABELS.get(self.role, self.role)

    @property
    def role_icon(self) -> str:
        return ROLE_ICONS.get(self.role, "👤")

    @property
    def permissions(self) -> list[str]:
        """Retorna lista de permissões do usuário baseada no seu role."""
        return ROLE_PERMISSIONS.get(self.role, [])

    def has_permission(self, permission: str) -> bool:
        """Verifica se o usuário tem uma permissão específica."""
        return permission in self.permissions

    def is_admin(self) -> bool:
        return self.role == ROLE_ADMIN


@dataclass
class UserCreate:
    """DTO para criação de novo usuário."""
    username: str
    display_name: str
    password_hash: str
    role: str = ROLE_ADMIN
    email: Optional[str] = None
    is_active: bool = True


@dataclass
class UserUpdate:
    """DTO para atualização de usuário (apenas campos não-None)."""
    display_name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    photo_base64: Optional[str] = None
    password_hash: Optional[str] = None


@dataclass
class SessionUser:
    """
    Dados do usuário na sessão Streamlit.
    Leve — não carrega password_hash nem dados pesados.
    """
    user_id: int
    username: str
    display_name: str
    role: str
    email: Optional[str] = None
    photo_base64: Optional[str] = None
    permissions: list = field(default_factory=list)

    @classmethod
    def from_user(cls, user: User) -> "SessionUser":
        return cls(
            user_id=user.id,
            username=user.username,
            display_name=user.display_name,
            role=user.role,
            email=user.email,
            photo_base64=user.photo_base64,
            permissions=user.permissions,
        )

    def has_permission(self, permission: str) -> bool:
        return permission in self.permissions

    def is_admin(self) -> bool:
        return self.role == ROLE_ADMIN

    @property
    def role_label(self) -> str:
        return ROLE_LABELS.get(self.role, self.role)

    @property
    def role_icon(self) -> str:
        return ROLE_ICONS.get(self.role, "👤")
