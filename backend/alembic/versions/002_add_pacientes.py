"""add pacientes table and FK to atendimentos

Revision ID: 002_add_pacientes
Revises: 001_baseline
Create Date: 2026-07-18

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '002_add_pacientes'
down_revision: Union[str, None] = '001_baseline'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Criar tabela pacientes
    op.create_table(
        'pacientes',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('nome', sa.String(255), nullable=False),
        sa.Column('slug', sa.String(255), unique=True, nullable=False),
        sa.Column('cpf', sa.String(14)),
        sa.Column('telefone', sa.String(20)),
        sa.Column('email', sa.String(255)),
        sa.Column('data_nascimento', sa.Date),
        sa.Column('sexo', sa.String(20)),
        sa.Column('estado_civil', sa.String(30)),
        sa.Column('profissao', sa.String(150)),
        sa.Column('convenio', sa.String(150)),
        sa.Column('numero_convenio', sa.String(50)),
        sa.Column('empresa', sa.String(255)),
        sa.Column('endereco', sa.Text),
        sa.Column('contato_emergencia', sa.String(255)),
        sa.Column('telefone_emergencia', sa.String(20)),
        sa.Column('observacoes', sa.Text),
        sa.Column('foto', sa.Text),
        sa.Column('criado_em', sa.TIMESTAMP(timezone=True), server_default=sa.func.now()),
        sa.Column('atualizado_em', sa.TIMESTAMP(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('idx_pacientes_nome', 'pacientes', ['nome'])
    op.create_index('idx_pacientes_slug', 'pacientes', ['slug'])
    op.create_index('idx_pacientes_cpf', 'pacientes', ['cpf'])

    # Adicionar FK em atendimentos
    op.add_column('atendimentos', sa.Column('paciente_id', sa.Integer, sa.ForeignKey('pacientes.id', ondelete='SET NULL')))
    op.create_index('idx_atendimentos_paciente_id', 'atendimentos', ['paciente_id'])


def downgrade() -> None:
    op.drop_index('idx_atendimentos_paciente_id', 'atendimentos')
    op.drop_column('atendimentos', 'paciente_id')
    op.drop_index('idx_pacientes_cpf', 'pacientes')
    op.drop_index('idx_pacientes_slug', 'pacientes')
    op.drop_index('idx_pacientes_nome', 'pacientes')
    op.drop_table('pacientes')
