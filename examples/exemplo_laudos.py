"""
EXEMPLO: Como usar Google Docs API para gerar laudos

Este arquivo mostra como integrar a geração de laudos
com seus dados de atendimentos do banco de dados.
"""

from datetime import datetime
from services.laudo_service import get_laudo_service, DadosLaudo
from utils.logger import get_logger

logger = get_logger(__name__)


def exemplo_1_gerar_laudo_simples():
    """Exemplo básico: gerar um laudo simples."""

    # Preparar dados do paciente
    dados = DadosLaudo(
        nome_paciente="João Silva Santos",
        data_nascimento="15/03/1985",
        cpf="123.456.789-00",
        empresa="Empresa XYZ LTDA",
        data_exame=datetime.now().strftime("%d/%m/%Y"),
        motivo_avaliacao="Avaliação psicológica para admissão",
        # Marcar tipo de avaliação
        admissional=True,
        avaliacao_psicologica=True,
        # Conteúdo do laudo
        itens_auxiliados="""
• Testes psicométricos realizados
• Entrevista clínica estruturada
• Avaliação de competências técnicas
• Análise comportamental e emocional
        """,
        conclusao="""
O candidato apresenta perfil compatível com a função,
demonstrando competências técnicas e habilidades comportamentais
adequadas. Recomenda-se a contratação.
        """,
        psicologista_nome="Dra. Juliana Feitosa",
        psicologista_crp="07/12345",
    )

    # Gerar laudo
    laudo_service = get_laudo_service()
    novo_doc = laudo_service.gerar_laudo(dados)

    logger.info(f"✓ Laudo gerado: {novo_doc['url']}")
    return novo_doc


def exemplo_2_gerar_e_exportar_pdf():
    """Exemplo: gerar laudo e exportar como PDF."""

    dados = DadosLaudo(
        nome_paciente="Maria Santos Oliveira",
        data_nascimento="22/07/1992",
        cpf="987.654.321-11",
        empresa="Tech Solutions Inc",
        data_exame=datetime.now().strftime("%d/%m/%Y"),
        motivo_avaliacao="Avaliação periódica anual",
        periodica=True,
        avaliacao_psicologica=True,
        itens_auxiliados="• Entrevista de acompanhamento\n• Testes de validação",
        conclusao="Colaboradora apta para continuidade nas funções.",
        psicologista_nome="Dra. Juliana Feitosa",
        psicologista_crp="07/12345",
    )

    laudo_service = get_laudo_service()

    # Gerar e exportar PDF
    pdf_path = laudo_service.gerar_e_exportar_pdf(
        dados,
        caminho_pdf="/media/jean/7AF8AFA7F8AF5FDD/gestao_clinica/laudos/maria_santos_2024.pdf",
    )

    logger.info(f"✓ PDF salvo em: {pdf_path}")
    return pdf_path


def exemplo_3_integrar_com_banco_dados():
    """Exemplo: gerar laudo a partir de dados do banco de dados."""

    # Aqui você faria uma query no banco de dados
    # SELECT * FROM atendimentos WHERE id = ?

    # Simulando dados do banco:
    atendimento = {
        "id": 1,
        "paciente_nome": "Pedro Oliveira",
        "paciente_data_nascimento": "10/05/1980",
        "paciente_cpf": "111.222.333-44",
        "empresa_nome": "Acme Corp",
        "data_atendimento": "17/05/2024",
        "tipo": "ADMISSIONAL",
        "observacoes": "Candidato com experiência relevante",
    }

    # Converter para DadosLaudo
    dados = DadosLaudo(
        nome_paciente=atendimento["paciente_nome"],
        data_nascimento=atendimento["paciente_data_nascimento"],
        cpf=atendimento["paciente_cpf"],
        empresa=atendimento["empresa_nome"],
        data_exame=atendimento["data_atendimento"],
        motivo_avaliacao=f"Avaliação {atendimento['tipo']}",
        admissional=atendimento["tipo"] == "ADMISSIONAL",
        periodica=atendimento["tipo"] == "PERIODICA",
        pessoal=atendimento["tipo"] == "PESSOAL",
        mudanca_funcao=atendimento["tipo"] == "MUDANÇA",
        itens_auxiliados=atendimento["observacoes"],
        psicologista_nome="Dra. Juliana Feitosa",
        psicologista_crp="07/12345",
    )

    laudo_service = get_laudo_service()
    novo_doc = laudo_service.gerar_laudo(dados)

    logger.info(f"✓ Laudo do banco gerado: {novo_doc['url']}")
    return novo_doc


def exemplo_4_compartilhar_com_paciente():
    """Exemplo: compartilhar laudo com o paciente via email."""

    # Gerar laudo (exemplo simplificado)
    dados = DadosLaudo(
        nome_paciente="Ana Costa",
        data_nascimento="30/11/1988",
        cpf="555.666.777-88",
        empresa="Consultoria ABC",
        data_exame=datetime.now().strftime("%d/%m/%Y"),
        motivo_avaliacao="Avaliação para mudança de função",
        mudanca_funcao=True,
        itens_auxiliados="",
        psicologista_nome="Dra. Juliana Feitosa",
        psicologista_crp="07/12345",
    )

    laudo_service = get_laudo_service()
    novo_doc = laudo_service.gerar_laudo(dados)

    # Compartilhar com o paciente
    email_paciente = "ana.costa@email.com"
    laudo_service.compartilhar_com_paciente(novo_doc["id"], email_paciente)

    logger.info(f"✓ Laudo compartilhado com {email_paciente}")


# ────────────────────────────────────────────────────────────────
# Como rodar estes exemplos:
# ────────────────────────────────────────────────────────────────
# Descomente a função que quer testar e execute:
#
# python -c "from examples.exemplo_laudos import exemplo_1_gerar_laudo_simples; exemplo_1_gerar_laudo_simples()"

if __name__ == "__main__":
    print("Escolha um exemplo para rodar:")
    print("1. Gerar laudo simples")
    print("2. Gerar e exportar PDF")
    print("3. Integrar com banco de dados")
    print("4. Compartilhar com paciente")

    choice = input("\nOpção (1-4): ").strip()

    try:
        if choice == "1":
            exemplo_1_gerar_laudo_simples()
        elif choice == "2":
            exemplo_2_gerar_e_exportar_pdf()
        elif choice == "3":
            exemplo_3_integrar_com_banco_dados()
        elif choice == "4":
            exemplo_4_compartilhar_com_paciente()
        else:
            print("Opção inválida!")
    except Exception as e:
        logger.error(f"Erro ao executar exemplo: {e}")
