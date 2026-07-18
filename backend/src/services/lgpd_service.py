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
from datetime import datetime, UTC
from typing import Any, Dict, List, Optional

from core.repositories.lgpd_repositories import (
    consentimento_repo, login_attempt_repo,
    esquecimento_auditoria_repo, dpo_config_repo,
)
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
            "exportado_em": datetime.now(UTC).isoformat().replace("+00:00", "Z"),
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
            "executado_em": datetime.now(UTC).isoformat().replace("+00:00", "Z"),
            "consentimentos_removidos": 0,
            "atendimentos_anonimizados": 0,
            "sucesso": False,
        }

        try:
            # 1. Deletar consentimentos
            resultado["consentimentos_removidos"] = consentimento_repo.deletar_por_email(email)

            # 2. Anonimizar atendimentos e paciente (não deleta — mantém estatísticas)
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

                        cur.execute(
                            """
                            UPDATE pacientes
                            SET nome = '[DADOS REMOVIDOS - LGPD Art.18]',
                                cpf = NULL, telefone = NULL, email = NULL,
                                endereco = NULL, observacoes = NULL, foto = NULL,
                                atualizado_em = NOW()
                            WHERE LOWER(nome) LIKE LOWER(%s)
                            """,
                            (f"%{nome}%",),
                        )
                except Exception as e:
                    logger.error(f"Erro ao anonimizar atendimentos/paciente: {e}")

            # 3. Limpar tentativas de login
            login_attempt_repo.resetar_usuario(email)

            # 4. Limpar dados temporários
            cleaner = get_data_cleaner()
            cleaner.cleanup_patient_data_after_deletion(email)

            resultado["sucesso"] = True

            # 5. Registrar auditoria imutável no banco (sem PII)
            auditoria_id = esquecimento_auditoria_repo.registrar(
                titular_email=email,
                consentimentos_removidos=resultado["consentimentos_removidos"],
                atendimentos_anonimizados=resultado["atendimentos_anonimizados"],
            )
            resultado["auditoria_id"] = auditoria_id

            # 6. Registrar também no log de auditoria (arquivo)
            safe = anonymize_for_logging({"email": email, "nome": nome or ""})
            log_event("direito_esquecimento_executado", {
                "titular": safe,
                "auditoria_id": auditoria_id,
                "consentimentos_removidos": resultado["consentimentos_removidos"],
                "atendimentos_anonimizados": resultado["atendimentos_anonimizados"],
            })

            logger.warning(f"ESQUECIMENTO executado (auditoria #{auditoria_id}): {resultado}")

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
        cfg = dpo_config_repo.get_all()
        return {
            "dpo_nome": cfg.get("dpo_nome", DPO_NOME),
            "dpo_email": cfg.get("dpo_email", DPO_EMAIL),
            "dpo_telefone": cfg.get("dpo_telefone", ""),
            "lei": "LGPD - Lei nº 13.709/2018",
            "autoridade": "ANPD - Autoridade Nacional de Proteção de Dados",
            "contato_anpd": "https://www.gov.br/anpd",
        }

    def atualizar_dpo(self, dados: Dict[str, str]) -> bool:
        """Atualiza dados do DPO (admin only)."""
        campos_permitidos = {"dpo_nome", "dpo_email", "dpo_telefone", "empresa_nome", "empresa_cnpj", "empresa_endereco"}
        ok = True
        for chave, valor in dados.items():
            if chave in campos_permitidos:
                if not dpo_config_repo.set(chave, str(valor)):
                    ok = False
        log_event("dpo_config_atualizado", {"campos": list(dados.keys())})
        return ok

    def bases_legais(self) -> Dict[str, str]:
        """Retorna as bases legais utilizadas no sistema."""
        return {
            "consentimento": "Art. 7º, I — Consentimento do titular",
            "contrato": "Art. 7º, V — Execução de contrato",
            "obrigacao_legal": "Art. 7º, II — Cumprimento de obrigação legal",
            "tutela_saude": "Art. 7º, VIII — Tutela da saúde (dados de saúde: Art. 11, II, f)",
        }

    def gerar_ropa(self) -> Dict[str, Any]:
        """Gera o Registro de Atividades de Tratamento (ROPA) dinamicamente."""
        cfg = dpo_config_repo.get_all()
        try:
            with __import__("infrastructure.connection", fromlist=["connection_scope"]).connection_scope(commit=False) as conn:
                cur = conn.cursor()
                cur.execute("SELECT COUNT(*) AS total FROM consentimentos WHERE revogado = FALSE")
                total_consentimentos = (cur.fetchone() or {}).get("total", 0)
                cur.execute("SELECT COUNT(*) AS total FROM atendimentos")
                total_atendimentos = (cur.fetchone() or {}).get("total", 0)
                cur.execute("SELECT COUNT(*) AS total FROM lgpd_esquecimentos")
                total_esquecimentos = (cur.fetchone() or {}).get("total", 0)
        except Exception:
            total_consentimentos = total_atendimentos = total_esquecimentos = 0

        return {
            "versao": "1.0",
            "gerado_em": datetime.now(UTC).isoformat().replace("+00:00", "Z"),
            "lei": "LGPD — Lei nº 13.709/2018",
            "controlador": {
                "nome": cfg.get("empresa_nome", "Clínica IA"),
                "cnpj": cfg.get("empresa_cnpj", "Não informado"),
                "endereco": cfg.get("empresa_endereco", "Não informado"),
            },
            "dpo": {
                "nome": cfg.get("dpo_nome", DPO_NOME),
                "email": cfg.get("dpo_email", DPO_EMAIL),
                "telefone": cfg.get("dpo_telefone", ""),
            },
            "atividades_tratamento": [
                {
                    "nome": "Gestão de atendimentos clínicos",
                    "finalidade": "Agendamento, acompanhamento e histórico de atendimentos psicológicos",
                    "base_legal": "Art. 7º, VIII — Tutela da saúde",
                    "dados_tratados": ["nome", "data_atendimento", "modalidade", "observações clínicas"],
                    "titulares": "Pacientes",
                    "compartilhamento": "Sem compartilhamento com terceiros",
                    "retencao": "7 anos (obrigação legal — CFP)",
                    "total_registros": total_atendimentos,
                },
                {
                    "nome": "Consentimento do titular",
                    "finalidade": "Registro formal de consentimento para tratamento de dados",
                    "base_legal": "Art. 7º, I — Consentimento",
                    "dados_tratados": ["nome", "e-mail", "IP de origem", "finalidade aceita"],
                    "titulares": "Pacientes e usuários",
                    "compartilhamento": "Sem compartilhamento",
                    "retencao": "Até revogação ou esquecimento",
                    "total_registros": total_consentimentos,
                },
                {
                    "nome": "Elaboração de laudos psicológicos",
                    "finalidade": "Geração de laudos via IA e Google Docs",
                    "base_legal": "Art. 7º, VIII — Tutela da saúde",
                    "dados_tratados": ["nome", "dados clínicos"],
                    "titulares": "Pacientes",
                    "compartilhamento": "Google Docs (processamento)",
                    "retencao": "7 anos",
                    "total_registros": None,
                },
            ],
            "direitos_titulares": {
                "acesso": "GET /api/lgpd/titulares/{email}/dados",
                "portabilidade": "GET /api/lgpd/titulares/{email}/dados",
                "revogacao": "DELETE /api/lgpd/consentimentos/{email}",
                "esquecimento": "POST /api/lgpd/titulares/esquecimento",
                "dpo_contato": cfg.get("dpo_email", DPO_EMAIL),
            },
            "auditoria": {
                "total_esquecimentos_executados": total_esquecimentos,
            },
        }

    def historico_esquecimentos(self, limit: int = 100) -> list:
        """Lista histórico de esquecimentos executados (sem PII)."""
        return esquecimento_auditoria_repo.listar(limit=limit)


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
