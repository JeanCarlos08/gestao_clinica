"""
Pseudonymization & Anonymization utilities para LGPD

Ofusca dados pessoais (PII) em logs, auditorias e relatórios.
"""

import re
import hashlib
from typing import Any, Dict
from datetime import datetime


class Pseudonymizer:
    """Ofusca dados pessoais mantendo referência única."""
    
    def __init__(self, salt: str = "lgpd-pseudonym"):
        self.salt = salt.encode()
    
    def pseudonymize_cpf(self, cpf: str) -> str:
        """Ofusca CPF: mantém últimos 4 dígitos."""
        if not cpf or len(cpf) < 4:
            return "CPF-INVALID"
        # Remove pontuação
        clean = re.sub(r'\D', '', cpf)
        return f"CPF-***-{clean[-4:]}"
    
    def pseudonymize_email(self, email: str) -> str:
        """Ofusca email: mostra apenas domínio."""
        if not email or '@' not in email:
            return "email-INVALID"
        domain = email.split('@')[1]
        return f"***@{domain}"
    
    def pseudonymize_phone(self, phone: str) -> str:
        """Ofusca telefone: mantém últimos 3 dígitos."""
        if not phone or len(phone) < 3:
            return "PHONE-INVALID"
        clean = re.sub(r'\D', '', phone)
        return f"***-{clean[-3:]}"
    
    def pseudonymize_name(self, name: str) -> str:
        """Ofusca nome: mostra apenas primeira e última letra."""
        if not name or len(name) < 2:
            return "NAME-INVALID"
        words = name.split()
        if len(words) == 1:
            return f"{words[0][0]}***"
        return f"{words[0][0]}*** {words[-1][0]}***"
    
    def hash_id(self, value: str) -> str:
        """Cria hash determinístico para IDs (não reversível)."""
        message = f"{value}{self.salt.decode()}".encode()
        return hashlib.sha256(message).hexdigest()[:12]
    
    def anonymize_dict(self, data: Dict[str, Any], keys_to_anonymize: list = None) -> Dict[str, Any]:
        """
        Anonimiza dicionário de dados.
        
        Args:
            data: Dicionário com dados
            keys_to_anonymize: Lista de chaves a anonimizar ex: ['cpf', 'email', 'name']
        
        Returns:
            Dicionário com dados anonimizados
        """
        if keys_to_anonymize is None:
            keys_to_anonymize = ['cpf', 'email', 'phone', 'name', 'paciente', 'patient']
        
        anonymized = data.copy()
        
        for key, value in anonymized.items():
            if not isinstance(value, str):
                continue
            
            # Detectar tipo e anonimizar
            if 'cpf' in key.lower():
                anonymized[key] = self.pseudonymize_cpf(value)
            elif 'email' in key.lower():
                anonymized[key] = self.pseudonymize_email(value)
            elif 'phone' in key.lower() or 'telefone' in key.lower():
                anonymized[key] = self.pseudonymize_phone(value)
            elif 'name' in key.lower() or 'nome' in key.lower() or 'paciente' in key.lower():
                anonymized[key] = self.pseudonymize_name(value)
        
        return anonymized


# Instância global
_pseudonymizer = None


def get_pseudonymizer() -> Pseudonymizer:
    """Retorna instância singleton."""
    global _pseudonymizer
    if _pseudonymizer is None:
        _pseudonymizer = Pseudonymizer()
    return _pseudonymizer


# Funções de conveniência
def anonymize_for_logging(data: Dict[str, Any]) -> Dict[str, Any]:
    """Anonimiza dados para logging seguro."""
    ps = get_pseudonymizer()
    return ps.anonymize_dict(data)


def redact_sensitive_fields(text: str) -> str:
    """Remove campos sensíveis de texto (padrão).
    
    Detecta: CPF, email, telefone, cartão.
    """
    # CPF: XXX.XXX.XXX-XX
    text = re.sub(r'\d{3}\.\d{3}\.\d{3}-\d{2}', '[CPF]', text)
    
    # Email
    text = re.sub(r'[\w\.-]+@[\w\.-]+', '[EMAIL]', text)
    
    # Telefone: (XX) XXXXX-XXXX
    text = re.sub(r'\(\d{2}\)\s?\d{4,5}-\d{4}', '[PHONE]', text)
    
    # Cartão: XXXX-XXXX-XXXX-XXXX
    text = re.sub(r'\d{4}-\d{4}-\d{4}-\d{4}', '[CARD]', text)
    
    return text


def safe_log_dict(data: Dict[str, Any]) -> str:
    """Converte dicionário para string segura (sem PII)."""
    anonymized = anonymize_for_logging(data)
    return str(anonymized)
