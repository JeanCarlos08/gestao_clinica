"""
Página: Gestão de Atendimentos.

CRUD completo de atendimentos com:
- Filtros avançados
- Tabela interativa com ações
- Formulário de cadastro/edição
- Upload e análise de PDFs via IA
- Download de relatórios
- Integração WhatsApp
"""

from datetime import date, datetime, time
from typing import Optional

import streamlit as st

from components.cards import render_info_banner, render_status_badge
from core.entities.models import AtendimentoCreate, AtendimentoFilter, AtendimentoUpdate
from core.repositories.repositories import arquivo_repo, atendimento_repo
from services.ai_service import ai_service
from services.pdf_service import pdf_service
from services.whatsapp_service import whatsapp_service
from services.n8n_service import n8n_service
from utils.constants import MODALIDADES, STATUS_ATENDIMENTO
from utils.helpers import format_date_br, format_time_br
from utils.logger import get_logger
from utils.validators import validate_atendimento

logger = get_logger(__name__)


# ─────────────────────────────────────────────────────────────
# Cache helpers
# ─────────────────────────────────────────────────────────────

@st.cache_data(ttl=60)
def _load_atendimentos(
    empresa: str,
    nome: str,
    modalidade: str,
    status: str,
) -> list:
    """Carrega atendimentos filtrados com cache de 60 segundos."""
    filters = AtendimentoFilter(
        empresa=empresa or None,
        nome=nome or None,
        modalidade=modalidade if modalidade != "Todos" else None,
        status=status if status != "Todos" else None,
        limit=200,
    )
    return atendimento_repo.list_all(filters)


def _invalidate_cache():
    """Invalida o cache de atendimentos após operações de escrita."""
    st.cache_data.clear()


# ─────────────────────────────────────────────────────────────
# Render Principal
# ─────────────────────────────────────────────────────────────

def render_atendimentos() -> None:
    """Renderiza a página de Gestão de Atendimentos estilo 'Clínica IA'."""
    
    # ── Header ────────────────────────────────────────────────
    st.markdown("""
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
            <div>
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="background: rgba(34, 197, 94, 0.1); color: var(--accent-green); padding: 8px; border-radius: 8px; font-size: 1.5rem;">📋</div>
                    <h1 style="color: var(--text-primary); margin: 0; font-size: 1.75rem;">Atendimentos</h1>
                </div>
                <p style="color: var(--text-muted); font-size: 0.9rem; margin-top: 4px;">Gerenciamento de Consultas e Procedimentos</p>
            </div>
            <div style="display: flex; gap: 16px; align-items: center;">
                <div style="color: var(--text-muted); font-size: 1.2rem;">🔍</div>
                <div style="color: var(--text-muted); font-size: 1.2rem;">🔔</div>
            </div>
        </div>
    """, unsafe_allow_html=True)

    # ── Métricas ──────────────────────────────────────────────
    from core.repositories.repositories import atendimento_repo
    from components.cards import render_stats_row
    stats = atendimento_repo.get_stats()
    render_stats_row(stats)
    st.markdown("<br>", unsafe_allow_html=True)

    # ── Filtros ──────────────────────────────────────────────
    st.markdown('<div class="filter-section"><div class="filter-title">▼ Filtros de Busca</div></div>', 
                unsafe_allow_html=True)
    
    col_f1, col_f2, col_f3, col_f4 = st.columns([3, 2, 2, 2])
    with col_f1:
        filtro_empresa = st.text_input("Pesquisar (Nome/Empresa)", placeholder="Digite para pesquisar...")
    with col_f2:
        filtro_modal = st.selectbox("Modalidade", ["Todas"] + MODALIDADES)
    with col_f3:
        filtro_status = st.selectbox("Status", ["Todos"] + STATUS_ATENDIMENTO)
    with col_f4:
        st.date_input("Data inicial", value=None, key="f_start")
        st.date_input("Data final", value=None, key="f_end")

    # ── Botões de Ação ───────────────────────────────────────
    ca1, ca2 = st.columns(2)
    with ca1:
        st.markdown("""
        <div class="action-card">
          <div class="action-card-left">
            <span class="action-card-icon">+</span>
            <div>
              <div class="action-card-title">Cadastrar Novo Atendimento</div>
              <div class="action-card-sub">Adicionar um novo atendimento ao sistema</div>
            </div>
          </div>
          <span class="action-card-arrow">›</span>
        </div>
        """, unsafe_allow_html=True)
    with ca2:
        st.markdown("""
        <div class="action-card">
          <div class="action-card-left">
            <span class="action-card-icon">✏</span>
            <div>
              <div class="action-card-title">Editar Atendimento</div>
              <div class="action-card-sub">Editar informações de um atendimento</div>
            </div>
          </div>
          <span class="action-card-arrow">›</span>
        </div>
        """, unsafe_allow_html=True)
    
    st.markdown("<br>", unsafe_allow_html=True)

    # ── Lista de Atendimentos (Tabela) ──────────────────────
    st.markdown("""
        <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 16px; padding: 1.5rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="color: var(--accent-green);">📋</span>
                    <span style="color: var(--text-primary); font-weight: 600;">Lista de Atendimentos</span>
                </div>
                <div style="display: flex; align-items: center; gap: 12px; font-size: 0.8rem; color: var(--text-muted);">
                    <span>Tamanho da página</span>
                    <select style="background: var(--bg-card2); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 4px; padding: 2px 8px;">
                        <option>20</option>
                    </select>
                </div>
            </div>
    """, unsafe_allow_html=True)

    # Carrega dados
    atendimentos = _load_atendimentos(
        filtro_empresa, "", filtro_modal if filtro_modal != "Todas" else "Todos", filtro_status
    )

    if not atendimentos:
        render_info_banner("Nenhum atendimento encontrado.", type="info")
    else:
        # Função helper para gerar badge de status conforme solicitado
        def get_badge_html(status_val):
            mapa = {
                "Concluído":    '<span class="badge-status badge-concluido">Concluído</span>',
                "Em andamento": '<span class="badge-status badge-andamento">Em andamento</span>',
                "Pendente":     '<span class="badge-status badge-pendente">Pendente</span>',
            }
            return mapa.get(status_val, f'<span class="badge-status" style="background:var(--bg-card2);color:var(--text-muted);">{status_val}</span>')

        rows = ""
        for i, a in enumerate(atendimentos[:10]):
            rows += f"""
            <tr>
              <td class="row-num">{i+1}</td>
              <td style="font-weight: 600;">{a.empresa}</td>
              <td style="color:var(--text-muted)">{a.nome}</td>
              <td>{a.modalidade}</td>
              <td>{get_badge_html(a.status)}</td>
              <td style="color:var(--text-muted)">{format_date_br(a.data)}</td>
              <td><div class="action-icons">
                <span class="action-icon icon-view" title="Visualizar">👁</span>
                <span class="action-icon icon-edit" title="Editar">✏</span>
                <span class="action-icon icon-del" title="Excluir">🗑</span>
              </div></td>
            </tr>"""
        
        table_html = f"""
        <div class="table-container">
          <div class="table-section-title">📋 Lista de Atendimentos Recentes</div>
          <table class="dark-table">
            <thead><tr>
              <th>#</th><th>Empresa</th><th>Paciente</th>
              <th>Modalidade</th><th>Status</th><th>Data</th><th>Ações</th>
            </tr></thead>
            <tbody>{rows}</tbody>
          </table>
          <div class="table-footer">
            <span>Mostrando 1 a {min(10, len(atendimentos))} de {len(atendimentos)} registros</span>
            <div class="pagination">
                <div class="page-btn"><</div>
                <div class="page-btn active">1</div>
                <div class="page-btn">2</div>
                <div class="page-btn">3</div>
                <div class="page-btn">></div>
            </div>
          </div>
        </div>"""
        st.markdown(table_html, unsafe_allow_html=True)

    # ── Rodapé Final ──────────────────────────────────────────
    st.markdown("<br>", unsafe_allow_html=True)
    col_foot1, col_foot2 = st.columns([1, 2])
    with col_foot1:
        if st.button("📥 Exportar CSV", use_container_width=True):
             st.info("Exportação iniciada...")
    with col_foot2:
        st.markdown("""
            <div style="background: var(--status-green-bg); border: 1px solid var(--border-color); border-radius: 12px; padding: 0.75rem 1rem; display: flex; align-items: center; gap: 12px;">
                <div style="color: var(--accent-green); font-size: 1.2rem;">✅</div>
                <div>
                    <div style="color: var(--text-primary); font-weight: 600; font-size: 0.85rem;">Relatório gerado com sucesso!</div>
                    <div style="color: var(--accent-green); font-size: 0.75rem; cursor: pointer;">Abrir CSV</div>
                </div>
            </div>
        """, unsafe_allow_html=True)

    st.markdown("<br>", unsafe_allow_html=True)
    
    # ── Acordeons de IA ──────────────────────────────────────
    with st.expander("🤖 Gerador de Parecer Clínico Automático (IA)"):
        st.write("Funcionalidade em desenvolvimento...")
    
    with st.expander("📊 Gerenciar por atendimento (visualizar/download/editar/status/exportar)"):
        st.write("Funcionalidade em desenvolvimento...")


    # Renderiza cada atendimento
    for a in atendimentos:
        with st.container():
            badge = render_status_badge(a.status)
            has_laudo_icon = "📄" if a.has_laudo else "⬜"
            has_aval_icon = "📄" if a.has_avaliacao else "⬜"

            with st.expander(
                f"#{a.id} · {a.nome} · {a.empresa} · {format_date_br(a.data)}",
                expanded=False,
            ):
                col_info, col_actions = st.columns([3, 2])

                with col_info:
                    st.markdown(
                        f"""
                        **Empresa:** {a.empresa}  
                        **Paciente:** {a.nome}  
                        **Modalidade:** {a.modalidade}  
                        **Data/Hora:** {format_date_br(a.data)} às {format_time_br(a.hora)}  
                        **Status:** {badge}  
                        **Laudo:** {has_laudo_icon} · **Avaliação:** {has_aval_icon}  
                        """,
                        unsafe_allow_html=True,
                    )
                    if a.observacoes:
                        st.markdown(f"**Observações:** {a.observacoes}")

                with col_actions:
                    _render_atendimento_actions(a)


def _render_atendimento_actions(a) -> None:
    """Renderiza botões de ação para um atendimento."""
    # Alterar status
    novo_status = st.selectbox(
        "Alterar Status",
        STATUS_ATENDIMENTO,
        index=STATUS_ATENDIMENTO.index(a.status) if a.status in STATUS_ATENDIMENTO else 0,
        key=f"status_{a.id}",
    )
    if novo_status != a.status:
        if st.button("✅ Atualizar Status", key=f"upd_status_{a.id}", type="primary"):
            if atendimento_repo.update_status(a.id, novo_status):
                _invalidate_cache()
                st.success(f"Status atualizado para **{novo_status}**!")
                st.rerun()

    # Upload de PDF
    st.markdown("**📎 Anexar Documentos:**")
    tipo_pdf = st.radio(
        "Tipo",
        ["Laudo", "Avaliação"],
        horizontal=True,
        key=f"tipo_pdf_{a.id}",
    )
    arquivo_upload = st.file_uploader(
        "Selecionar PDF",
        type=["pdf"],
        key=f"upload_{a.id}",
    )

    if arquivo_upload:
        col_a, col_b = st.columns(2)
        with col_a:
            if st.button("💾 Salvar PDF", key=f"save_pdf_{a.id}", type="primary"):
                _handle_pdf_upload(a.id, arquivo_upload, tipo_pdf)
        with col_b:
            if st.button("🤖 Analisar com IA", key=f"ai_pdf_{a.id}"):
                with st.spinner("Analisando com IA..."):
                    content = arquivo_upload.read()
                    resultado = ai_service.analyze_pdf_content(content, arquivo_upload.name)
                st.markdown("**📊 Resumo da IA:**")
                st.markdown(resultado)

    # WhatsApp
    telefone = st.text_input("📱 Telefone para WhatsApp", placeholder="11999998888", key=f"tel_{a.id}")
    if telefone:
        mensagem = whatsapp_service.build_agendamento_message(
            a.nome, a.empresa, a.modalidade,
            format_date_br(a.data), format_time_br(a.hora),
        )
        link = whatsapp_service.build_link(telefone, mensagem)
        st.link_button("📱 Abrir WhatsApp", url=link)

    # Excluir
    st.markdown("---")
    if st.button("🗑️ Excluir Atendimento", key=f"del_{a.id}", type="secondary"):
        if st.session_state.get(f"confirm_del_{a.id}"):
            if atendimento_repo.delete(a.id):
                _invalidate_cache()
                st.success("Atendimento excluído!")
                st.rerun()
        else:
            st.session_state[f"confirm_del_{a.id}"] = True
            st.warning("⚠️ Clique novamente para confirmar a exclusão.")


def _handle_pdf_upload(atendimento_id: int, arquivo, tipo: str) -> None:
    """Processa upload de PDF para um atendimento."""
    campo = "laudo_pdf" if tipo == "Laudo" else "avaliacao_pdf"
    content = arquivo.read()

    # Validação via IA (não bloqueia em falha)
    is_valid, error_msg = ai_service.validate_clinical_pdf(content)
    if not is_valid:
        st.warning(f"⚠️ {error_msg}")
        return

    file_id = arquivo_repo.save(arquivo.name, content, "application/pdf")
    if file_id:
        marcador = f"db:{file_id}"
        atendimento_repo.set_anexo(atendimento_id, campo, marcador)
        _invalidate_cache()
        st.success(f"✅ {tipo} salvo com sucesso! (ID: {file_id})")
    else:
        st.error("❌ Erro ao salvar o arquivo. Tente novamente.")


# ─────────────────────────────────────────────────────────────
# Formulário de Novo Atendimento
# ─────────────────────────────────────────────────────────────

def _render_formulario() -> None:
    """Renderiza formulário de cadastro de novo atendimento."""
    st.markdown("### ➕ Cadastrar Novo Atendimento")

    with st.form("form_novo_atendimento", clear_on_submit=True):
        col1, col2 = st.columns(2)

        with col1:
            empresa = st.text_input(
                "Empresa *",
                placeholder="Nome da empresa",
                max_chars=255,
            )
            nome = st.text_input(
                "Nome do Paciente *",
                placeholder="Nome completo",
                max_chars=255,
            )
            modalidade = st.selectbox("Modalidade *", MODALIDADES)

        with col2:
            data_atend = st.date_input(
                "Data *",
                value=date.today(),
                format="DD/MM/YYYY",
            )
            hora_atend = st.time_input(
                "Hora *",
                value=time(8, 0),
                step=900,  # 15 min
            )
            status = st.selectbox("Status", STATUS_ATENDIMENTO)

        observacoes = st.text_area(
            "Observações",
            placeholder="Anotações clínicas relevantes...",
            height=120,
            max_chars=5000,
        )

        # Gerar parecer IA a partir das obs
        gerar_parecer = st.checkbox("🤖 Gerar parecer clínico com IA após cadastro")

        submitted = st.form_submit_button(
            "💾 Cadastrar Atendimento",
            type="primary",
            use_container_width=True,
        )

        if submitted:
            # Validação
            errors = validate_atendimento(empresa, nome, modalidade, data_atend, hora_atend, observacoes)
            if errors:
                for err in errors:
                    st.error(f"❌ {err}")
            else:
                new_id = atendimento_repo.create(AtendimentoCreate(
                    empresa=empresa,
                    nome=nome,
                    modalidade=modalidade,
                    data=data_atend,
                    hora=hora_atend,
                    status=status,
                    observacoes=observacoes,
                ))

                if new_id:
                    _invalidate_cache()
                    st.success(f"✅ Atendimento #{new_id} cadastrado com sucesso!")

                    # Disparo n8n (assíncrono tolerante a falha)
                    ok, msg = n8n_service.trigger_atendimento_criado(
                        atendimento_id=new_id,
                        nome=nome,
                        empresa=empresa,
                        modalidade=modalidade,
                        data_str=format_date_br(data_atend),
                        hora_str=format_time_br(hora_atend),
                    )
                    if ok:
                        st.info(f"⚡ Automação n8n ativada.")

                    # Parecer IA
                    if gerar_parecer and observacoes:
                        with st.spinner("Gerando parecer clínico..."):
                            parecer = ai_service.generate_clinical_draft(
                                nome, empresa, modalidade, observacoes
                            )
                        st.markdown("### 📝 Parecer Clínico Gerado")
                        st.markdown(parecer)

                        # Download do parecer em PDF
                        pdf_bytes = pdf_service.generate_atendimento_pdf(
                            new_id, nome, empresa, modalidade,
                            format_date_br(data_atend), format_time_br(hora_atend),
                            observacoes, parecer,
                        )
                        if pdf_bytes:
                            st.download_button(
                                "⬇️ Baixar Parecer em PDF",
                                data=pdf_bytes,
                                file_name=f"parecer_{new_id}_{nome.replace(' ', '_')}.pdf",
                                mime="application/pdf",
                            )
                else:
                    st.error("❌ Erro ao cadastrar. Verifique a conexão com o banco.")


# ─────────────────────────────────────────────────────────────
# Relatórios
# ─────────────────────────────────────────────────────────────

def _render_relatorio() -> None:
    """Renderiza aba de exportação de relatórios."""
    st.markdown("### 📊 Exportar Relatórios")

    col1, col2 = st.columns(2)
    with col1:
        filtro_status_rel = st.multiselect(
            "Filtrar por Status",
            STATUS_ATENDIMENTO,
            default=STATUS_ATENDIMENTO,
        )
    with col2:
        filtro_modal_rel = st.multiselect(
            "Filtrar por Modalidade",
            MODALIDADES,
            default=MODALIDADES,
        )

    if st.button("🔄 Gerar Relatório", type="primary"):
        filters = AtendimentoFilter(
            modalidade=None,
            status=None,
            limit=1000,
        )
        todos = atendimento_repo.list_all(filters)

        # Aplica filtros de multiselect
        filtrados = [
            a for a in todos
            if a.status in filtro_status_rel and a.modalidade in filtro_modal_rel
        ]

        if not filtrados:
            render_info_banner("Nenhum dado para os filtros selecionados.", type="warning")
            return

        st.success(f"✅ {len(filtrados)} registro(s) encontrado(s).")

        col_pdf, col_csv = st.columns(2)

        with col_pdf:
            pdf_bytes = pdf_service.generate_report(filtrados, "Relatório de Atendimentos")
            if pdf_bytes:
                st.download_button(
                    "⬇️ Baixar Relatório PDF",
                    data=pdf_bytes,
                    file_name=f"relatorio_atendimentos_{date.today().strftime('%Y%m%d')}.pdf",
                    mime="application/pdf",
                    use_container_width=True,
                )

        with col_csv:
            csv_bytes = pdf_service.to_csv(filtrados)
            if csv_bytes:
                st.download_button(
                    "⬇️ Baixar Relatório CSV",
                    data=csv_bytes,
                    file_name=f"atendimentos_{date.today().strftime('%Y%m%d')}.csv",
                    mime="text/csv",
                    use_container_width=True,
                )
