"""baseline schema

Revision ID: 001_baseline
Revises: 
Create Date: 2026-07-14

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '001_baseline'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # atendimentos
    op.create_table(
        'atendimentos',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('empresa', sa.String(255), nullable=False),
        sa.Column('nome', sa.String(255), nullable=False),
        sa.Column('modalidade', sa.String(100), nullable=False),
        sa.Column('data', sa.Date, nullable=False),
        sa.Column('hora', sa.Time, nullable=False),
        sa.Column('laudo_pdf', sa.String(255)),
        sa.Column('avaliacao_pdf', sa.String(255)),
        sa.Column('status', sa.String(50), server_default='Agendado'),
        sa.Column('observacoes', sa.Text),
        sa.Column('criado_em', sa.TIMESTAMP(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('idx_atendimentos_data', 'atendimentos', [sa.text('data DESC'), sa.text('hora DESC')])
    op.create_index('idx_atendimentos_empresa', 'atendimentos', ['empresa'])
    op.create_index('idx_atendimentos_nome', 'atendimentos', ['nome'])
    op.create_index('idx_atendimentos_status', 'atendimentos', ['status'])

    # temporary_permissions
    op.create_table(
        'temporary_permissions',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('google_doc_id', sa.String(255), nullable=False),
        sa.Column('permission_id', sa.String(255), nullable=False),
        sa.Column('created_by', sa.String(255)),
        sa.Column('expires_at', sa.TIMESTAMP(timezone=True)),
        sa.Column('revoked', sa.Boolean, server_default='false'),
        sa.Column('criado_em', sa.TIMESTAMP(timezone=True), server_default=sa.func.now()),
    )

    # notas
    op.create_table(
        'notas',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('titulo', sa.String(255), nullable=False),
        sa.Column('conteudo', sa.Text),
        sa.Column('tags', sa.String(255)),
        sa.Column('favorita', sa.Integer, server_default='0'),
    )

    # arquivos
    op.create_table(
        'arquivos',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('filename', sa.String(255), nullable=False),
        sa.Column('content', sa.LargeBinary, nullable=False),
        sa.Column('content_type', sa.String(100)),
        sa.Column('size', sa.Integer),
        sa.Column('criado_em', sa.TIMESTAMP(timezone=True), server_default=sa.func.now()),
    )

    # auditoria
    op.create_table(
        'auditoria',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('acao', sa.String(100), nullable=False),
        sa.Column('entidade', sa.String(100), nullable=False),
        sa.Column('entidade_id', sa.Integer),
        sa.Column('detalhes', sa.Text),
        sa.Column('usuario', sa.String(120)),
        sa.Column('criado_em', sa.TIMESTAMP(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('idx_auditoria_entidade', 'auditoria', ['entidade', 'entidade_id'])

    # user_preferences
    op.create_table(
        'user_preferences',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('pref_key', sa.String(100), unique=True, nullable=False),
        sa.Column('pref_value', sa.Text),
        sa.Column('updated_at', sa.TIMESTAMP(timezone=True), server_default=sa.func.now()),
    )

    # documentos
    op.create_table(
        'documentos',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('titulo', sa.String(255), nullable=False),
        sa.Column('google_doc_id', sa.String(255), nullable=False),
        sa.Column('tipo', sa.String(50), server_default='template'),
        sa.Column('atendimento_id', sa.Integer, sa.ForeignKey('atendimentos.id', ondelete='SET NULL')),
        sa.Column('criado_em', sa.TIMESTAMP(timezone=True), server_default=sa.func.now()),
    )

    # users
    op.create_table(
        'users',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('username', sa.String(100), unique=True, nullable=False),
        sa.Column('display_name', sa.String(255), nullable=False),
        sa.Column('password_hash', sa.String(255), nullable=False),
        sa.Column('role', sa.String(50), nullable=False, server_default='admin'),
        sa.Column('email', sa.String(255)),
        sa.Column('is_active', sa.Boolean, server_default='true'),
        sa.Column('photo_base64', sa.Text),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), server_default=sa.func.now()),
        sa.Column('last_login', sa.TIMESTAMP(timezone=True)),
    )
    op.create_index('idx_users_username', 'users', [sa.text('LOWER(username)')])
    op.create_index('idx_users_role', 'users', ['role'])

    # consentimentos (LGPD)
    op.create_table(
        'consentimentos',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('titular_nome', sa.String(255), nullable=False),
        sa.Column('titular_email', sa.String(255)),
        sa.Column('finalidade', sa.Text, nullable=False),
        sa.Column('base_legal', sa.String(100), nullable=False),
        sa.Column('aceito', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('aceito_em', sa.TIMESTAMP(timezone=True)),
        sa.Column('revogado', sa.Boolean, server_default='false'),
        sa.Column('revogado_em', sa.TIMESTAMP(timezone=True)),
        sa.Column('ip_origem', sa.String(45)),
        sa.Column('user_agent', sa.Text),
        sa.Column('criado_em', sa.TIMESTAMP(timezone=True), server_default=sa.func.now()),
        sa.Column('provider', sa.String(50)),
    )
    op.create_index('idx_consentimentos_email', 'consentimentos', [sa.text('LOWER(titular_email)')])
    op.create_index('idx_consentimentos_aceito', 'consentimentos', ['aceito', 'revogado'])

    # login_attempts (LGPD brute force)
    op.create_table(
        'login_attempts',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('username', sa.String(100), nullable=False),
        sa.Column('ip_address', sa.String(45)),
        sa.Column('sucesso', sa.Boolean, nullable=False),
        sa.Column('tentado_em', sa.TIMESTAMP(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('idx_login_attempts_user', 'login_attempts', ['username', sa.text('tentado_em DESC')])
    op.create_index('idx_login_attempts_ip', 'login_attempts', ['ip_address', sa.text('tentado_em DESC')])

    # lgpd_esquecimentos
    op.create_table(
        'lgpd_esquecimentos',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('titular_hash', sa.String(64), nullable=False),
        sa.Column('consentimentos_removidos', sa.Integer, server_default='0'),
        sa.Column('atendimentos_anonimizados', sa.Integer, server_default='0'),
        sa.Column('executado_em', sa.TIMESTAMP(timezone=True), server_default=sa.func.now()),
        sa.Column('executado_por', sa.String(100)),
    )
    op.create_index('idx_esquecimentos_hash', 'lgpd_esquecimentos', ['titular_hash'])

    # lgpd_config
    op.create_table(
        'lgpd_config',
        sa.Column('chave', sa.String(100), primary_key=True),
        sa.Column('valor', sa.Text, nullable=False),
        sa.Column('updated_at', sa.TIMESTAMP(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table('lgpd_config')
    op.drop_table('lgpd_esquecimentos')
    op.drop_table('login_attempts')
    op.drop_table('consentimentos')
    op.drop_table('users')
    op.drop_table('documentos')
    op.drop_table('user_preferences')
    op.drop_table('auditoria')
    op.drop_table('arquivos')
    op.drop_table('notas')
    op.drop_table('temporary_permissions')
    op.drop_table('atendimentos')
