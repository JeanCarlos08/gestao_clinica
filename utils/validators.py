"""
Validadores do sistema mvpdepsicologia.

Funções de validação puras (sem side effects) que retornam
erros de validação ou None quando válido.

Uso:
    from utils.validators import validate_atendimento
    error = validate_empresa("Empresa Teste")
    if error:
        st.error(error)
"""

import re
from datetime import date, time
from typing import Optional

from utils.constants import (
    ALLOWED_FILE_TYPES,
    MAX_EMPRESA_LEN,
    MAX_FILE_SIZE_BYTES,
    MAX_NOME_LEN,
    MAX_OBSERVACOES_LEN,
    MODALIDADES,
    STATUS_ATENDIMENTO,
)


# ─────────────────────────────────────────────────────────────
# Validadores de campos individuais
# ─────────────────────────────────────────────────────────────

def validate_empresa(empresa: str) -> Optional[str]:
    """Valida o campo empresa. Retorna mensagem de erro ou None."""
    if not empresa or not empresa.strip():
        return "O nome da empresa é obrigatório."
    if len(empresa.strip()) < 2:
        return "O nome da empresa deve ter pelo menos 2 caracteres."
    if len(empresa.strip()) > MAX_EMPRESA_LEN:
        return f"O nome da empresa deve ter no máximo {MAX_EMPRESA_LEN} caracteres."
    return None


def validate_nome(nome: str) -> Optional[str]:
    """Valida o nome do paciente/profissional. Retorna mensagem de erro ou None."""
    if not nome or not nome.strip():
        return "O nome do paciente é obrigatório."
    if len(nome.strip()) < 3:
        return "O nome deve ter pelo menos 3 caracteres."
    if len(nome.strip()) > MAX_NOME_LEN:
        return f"O nome deve ter no máximo {MAX_NOME_LEN} caracteres."
    # Verifica se contém apenas letras, espaços e caracteres acentuados
    pattern = r"^[A-Za-zÀ-ÖØ-öø-ÿ\s\-'\.]+$"
    if not re.match(pattern, nome.strip()):
        return "O nome deve conter apenas letras e espaços."
    return None


def validate_modalidade(modalidade: str) -> Optional[str]:
    """Valida se a modalidade é uma das opções permitidas."""
    if not modalidade:
        return "A modalidade é obrigatória."
    if modalidade not in MODALIDADES:
        return f"Modalidade inválida. Opções: {', '.join(MODALIDADES)}"
    return None


def validate_status(status: str) -> Optional[str]:
    """Valida se o status é um dos permitidos."""
    if not status:
        return "O status é obrigatório."
    if status not in STATUS_ATENDIMENTO:
        return f"Status inválido. Opções: {', '.join(STATUS_ATENDIMENTO)}"
    return None


def validate_data(data_atendimento: Optional[date]) -> Optional[str]:
    """Valida a data do atendimento."""
    if data_atendimento is None:
        return "A data do atendimento é obrigatória."
    return None


def validate_hora(hora_atendimento: Optional[time]) -> Optional[str]:
    """Valida o horário do atendimento."""
    if hora_atendimento is None:
        return "O horário do atendimento é obrigatório."
    return None


def validate_observacoes(observacoes: Optional[str]) -> Optional[str]:
    """Valida o campo de observações (opcional, mas com limite de tamanho)."""
    if observacoes and len(observacoes) > MAX_OBSERVACOES_LEN:
        return f"Observações devem ter no máximo {MAX_OBSERVACOES_LEN} caracteres."
    return None


def validate_telefone(telefone: Optional[str]) -> Optional[str]:
    """Valida formato básico de telefone brasileiro."""
    if not telefone:
        return None  # Telefone é opcional
    # Remove formatação
    digits = re.sub(r"\D", "", telefone)
    if len(digits) < 10 or len(digits) > 11:
        return "Telefone inválido. Informe DDD + número (10 ou 11 dígitos)."
    return None


def validate_file_upload(
    filename: str,
    file_size: int,
) -> Optional[str]:
    """
    Valida um arquivo antes do upload.

    Args:
        filename: Nome do arquivo.
        file_size: Tamanho em bytes.

    Returns:
        Mensagem de erro ou None se válido.
    """
    if not filename:
        return "Nome do arquivo inválido."

    extension = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if extension not in ALLOWED_FILE_TYPES:
        return f"Tipo de arquivo não permitido: '.{extension}'. Apenas PDF é aceito."

    if file_size > MAX_FILE_SIZE_BYTES:
        size_mb = file_size / (1024 * 1024)
        return f"Arquivo muito grande: {size_mb:.1f}MB. Limite: 50MB."

    return None


# ─────────────────────────────────────────────────────────────
# Validador de entidade completa
# ─────────────────────────────────────────────────────────────

def validate_atendimento(
    empresa: str,
    nome: str,
    modalidade: str,
    data_atendimento: Optional[date],
    hora_atendimento: Optional[time],
    observacoes: Optional[str] = None,
) -> list[str]:
    """
    Valida todos os campos de um atendimento de uma vez.

    Returns:
        Lista de mensagens de erro. Vazia se tudo válido.
    """
    errors: list[str] = []

    validators = [
        validate_empresa(empresa),
        validate_nome(nome),
        validate_modalidade(modalidade),
        validate_data(data_atendimento),
        validate_hora(hora_atendimento),
        validate_observacoes(observacoes),
    ]

    for error in validators:
        if error:
            errors.append(error)

    return errors
