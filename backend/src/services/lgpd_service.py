"""
LGPD Service — gestao_clinica

Serviço central para operações de conformidade LGPD:
- Registro e revogação de consentimento (Art. 7º e 8º)
- Direito de acesso do titular (Art. 18, I)
- Direito ao esquecimento / exclusão (Art. 18, VI)
- Portabilidade de dados (Art. 18, V)
"""

import json
import os
from datetime import datetime
from typing import Any, Dict, List, Optional

from core.repositories.lgpd_repositories import consentimento_repo, login_attempt_repo
from infrastructure.connection import connection_scope
from utils.logger import get_logger
from utils.audit import log_event
from utils.anonymizer import anonymize_for_logging
from utils.retention import get_data_cleaner

logger = get_logger(__name__)

# ─────────────────────────────────────────────────────────────
# Configuração
# ─────────────────────────────────────────────────────────────

MAX_LOGIN_ATTEMPTS = int(os.getenv("MAX_LOGIN_ATTEMPTS", "5"))
LOGIN_BLOCK_MINUTES = int(os.getenv("LOGIN_BLOCK_MINUTES", "15"))

DPO_EMAIL = os.getenv("DPO_EMAIL", "dpo@clinicaia.com.br")
DPO_NOME = os.getenv("DPO_NOME", "Encarregado de Dados (DPO)")

# Bases legais LGPD aceitas (Art. 7º)
BASES_LEGAIS_VALIDAS = {
    "consentimento",
    "contrato",
    "obrigacao_legal",
    "interesse_legitimo",
    "protecao_vida",
    "tutela_saude",
}

# Finalidades aceitas no sistema
FINALIDADES = {
    "laudos_psicologicos": "Elaboração de laudos psicológicos e relatórios clínicos",
    "agendamento": "Agendamento e gestão de atendimentos",
    "comunicacao": "Comunicação sobre atendimentos e resultados",
    "auditoria": "Auditoria interna e conformidade regulatória",
}


# ─────────────────────────────────────────────────────────────
# LGPD Service
# ─────────────────────────────────────────────────────────────

class LGPDService:
    """
    Serviço central de conformidade LGPD.

    Implementa os direitos dos titulares (Art. 18 LGPD):
    I   - Acesso aos dados
    III - Retificação
    IV  - Anonimização / bloqueio
    V   - Portabilidade
    VI  - Eliminação / Esquecimento
    VIII- Informação sobre compartilhamento
    """

    # ── Consentimento ─────────────────────────────────────────

    def registrar_consentimento(
        self,
        titular_nome: str,
        finalidade: str,
        titular_email: Optional[str] = None,
        base_legal: str = "consentimento",
        ip_origem: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Registra consentimento do titular (LGPD Art. 8º).

        Returns:
            Dict com id, status e mensagem.
        """
        if base_legal not in BASES_LEGAIS_VALIDAS:
            return {"sucesso": False, "erro": f"Base legal inválida: '{base_legal}'"}

        new_id = consentimento_repo.criar(
            titular_nome=titular_nome,
            finalidade=finalidade,
            base_legal=base_legal,
            titular_email=titular_email,
            aceito=True,
            ip_origem=ip_origem,
            user_agent=user_agent,
        )

        if new_id:
            safe = anonymize_for_logging({"nome": titular_nome, "email": titular_email or ""})
            log_event("consentimento_registrado", {
                "consentimento_id": new_id,
                "titular": safe,
                "finalidade": finalidade,
                "base_legal": base_legal,
            })
            return {"sucesso": True, "consentimento_id": new_id, "mensagem": "Consentimento registrado com sucesso."}

        return {"sucesso": False, "erro": "Falha ao registrar consentimento no banco."}

    def revogar_consentimento(self, email: str) -> Dict[str, Any]:
        """
        Revoga todos os consentimentos ativos de um titular (LGPD Art. 8º, §5º).

        Returns:
            Dict com quantos foram revogados.
        """
        count = consentimento_repo.revogar_por_email(email)
        safe = anonymize_for_logging({"email": email})
        log_event("consentimento_revogado", {"titular": safe, "total_revogados": count})
        return {
            "sucesso": True,
            "revogados": count,
            "mensagem": f"{count} consentimento(s) revogado(s).",
        }

    def buscar_consentimentos(self, email: str) -> List[Dict]:
        """
        Retorna lista de consentimentos do titular (Art. 18, I - Direito de acesso).
        """
        registros = consentimento_repo.buscar_por_email(email)
        return [r.to_dict() for r in registros]

    # ── Portabilidade (Art. 18, V) ────────────────────────────

    def exportar_dados_titular(self, email: str, nome: Optional[str] = None) -> Dict[str, Any]:
        """
        PORTABILIDADE: exporta todos os dados do titular em formato estruturado (JSON).
        Inclui: consentimentos, atendimentos vinculados ao nome.
        """
        resultado: Dict[str, Any] = {
            "exportado_em": datetime.utcnow().isoformat() + "Z",
            "titular_email": email,
            "dpo_contato": DPO_EMAIL,
            "aviso": "Dados exportados conforme LGPD Art. 18, V - Portabilidade.",
            "consentimentos": [],
            "atendimentos": [],
        }

        # Consentimentos
        consentimentos = consentimento_repo.buscar_por_email(email)
        resultado["consentimentos"] = [c.to_dict() for c in consentimentos]

        # Atendimentos (por nome, se fornecido)
        if nome:
            try:
                from core.repositories.repositories import atendimento_repo
                from core.entities.models import AtendimentoFilter
                filtro = AtendimentoFilter(nome=nome, limit=500)
                atendimentos = atendimento_repo.list_all(filtro)
                resultado["atendimentos"] = [
                    {
                        "id": a.id,
                        "empresa": a.empresa,
                        "nome": a.nome,
                        "modalidade": a.modalidade,
                        "data": str(a.data),
                        "hora": str(a.hora),
                        "status": a.status,
                        "criado_em": a.criado_em.isoformat() if a.criado_em else None,
                    }
                    for a in atendimentos
                ]
            except Exception as e:
                logger.error(f"Erro ao exportar atendimentos: {e}")

        safe = anonymize_for_logging({"email": email, "nome": nome or ""})
        log_event("portabilidade_solicitada", {"titular": safe, "total_consentimentos": len(consentimentos)})

        return resultado

    # ── Direito ao Esquecimento (Art. 18, VI) ─────────────────

    def executar_esquecimento(self, email: str, nome: Optional[str] = None) -> Dict[str, Any]:
        """
        DIREITO AO ESQUECIMENTO: apaga todos os dados identificáveis do titular.

        Processo:
        1. Revoga todos os consentimentos
        2. Deleta registros de consentimento
        3. Apaga dados de atendimentos associados ao nome
        4. Registra auditoria do esquecimento (sem PII)

        ATENÇÃO: Esta operação é irreversível.
        """
        resultado = {
            "executado_em": datetime.utcnow().isoformat() + "Z",
            "consentimentos_removidos": 0,
            "atendimentos_anonimizados": 0,
            "sucesso": False,
        }

        try:
            # 1. Deletar consentimentos
            resultado["consentimentos_removidos"] = consentimento_repo.deletar_por_email(email)

            # 2. Anonimizar atendimentos (não deleta — mantém estatísticas)
            if nome:
                try:
                    with connection_scope() as conn:
                        cur = conn.cursor()
                        cur.execute(
                            """
                            UPDATE atendimentos
                            SET nome = '[DADOS REMOVIDOS - LGPD Art.18]',
                                observacoes = NULL
                            WHERE LOWER(nome) LIKE LOWER(%s)
                            """,
                            (f"%{nome}%",),
                        )
                        resultado["atendimentos_anonimizados"] = cur.rowcount
                except Exception as e:
                    logger.error(f"Erro ao anonimizar atendimentos: {e}")

            # 3. Limpar tentativas de login
            login_attempt_repo.resetar_usuario(email)

            # 4. Limpar dados temporários
            cleaner = get_data_cleaner()
            cleaner.cleanup_patient_data_after_deletion(email)

            resultado["sucesso"] = True

            # 5. Registrar auditoria (sem PII real)
            safe = anonymize_for_logging({"email": email, "nome": nome or ""})
            log_event("direito_esquecimento_executado", {
                "titular": safe,
                "consentimentos_removidos": resultado["consentimentos_removidos"],
                "atendimentos_anonimizados": resultado["atendimentos_anonimizados"],
            })

            logger.warning(f"ESQUECIMENTO executado: {resultado}")

        except Exception as e:
            logger.error(f"Erro ao executar esquecimento: {e}")
            resultado["erro"] = str(e)

        return resultado

    # ── Brute Force ───────────────────────────────────────────

    def verificar_bloqueio_login(self, username: str, ip_address: Optional[str] = None) -> bool:
        """Verifica se usuário/IP está bloqueado por brute force."""
        return login_attempt_repo.esta_bloqueado(
            username=username,
            ip_address=ip_address,
            max_attempts=MAX_LOGIN_ATTEMPTS,
            janela_minutos=LOGIN_BLOCK_MINUTES,
        )

    def registrar_tentativa_login(self, username: str, sucesso: bool, ip_address: Optional[str] = None) -> None:
        """Registra tentativa de login (bem-sucedida ou não)."""
        login_attempt_repo.registrar(username=username, sucesso=sucesso, ip_address=ip_address)
        if sucesso:
            login_attempt_repo.resetar_usuario(username)

    # ── Info pública ──────────────────────────────────────────

    def info_dpo(self) -> Dict[str, str]:
        """Retorna informações públicas do DPO (Encarregado de Dados)."""
        return {
            "dpo_nome": DPO_NOME,
            "dpo_email": DPO_EMAIL,
            "lei": "LGPD - Lei nº 13.709/2018",
            "autoridade": "ANPD - Autoridade Nacional de Proteção de Dados",
            "contato_anpd": "https://www.gov.br/anpd",
        }

    def bases_legais(self) -> Dict[str, str]:
        """Retorna as bases legais utilizadas no sistema."""
        return {
            "consentimento": "Art. 7º, I — Consentimento do titular",
            "contrato": "Art. 7º, V — Execução de contrato",
            "obrigacao_legal": "Art. 7º, II — Cumprimento de obrigação legal",
            "tutela_saude": "Art. 7º, VIII — Tutela da saúde (dados de saúde: Art. 11, II, f)",
        }


# ─────────────────────────────────────────────────────────────
# Singleton
# ─────────────────────────────────────────────────────────────

_lgpd_service: Optional[LGPDService] = None


def get_lgpd_service() -> LGPDService:
    """Retorna instância singleton do LGPDService."""
    global _lgpd_service
    if _lgpd_service is None:
        _lgpd_service = LGPDService()
    return _lgpd_service
