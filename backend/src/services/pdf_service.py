"""
Serviço de geração de PDF/CSV do sistema mvpdepsicologia.

Responsável por:
- Geração de relatório em PDF via fpdf2
- Exportação de dados em CSV via pandas

Uso:
    from services.pdf_service import pdf_service
    pdf_bytes = pdf_service.generate_report(atendimentos)
"""

import io
from datetime import datetime
from typing import List, Optional

from utils.helpers import format_date_br, format_time_br
from utils.logger import get_logger

logger = get_logger(__name__)


class PDFService:
    """Serviço de geração de relatórios em PDF e exportação CSV."""

    APP_NAME = "mvpdepsicologia"
    APP_SUBTITLE = "Sistema de Gestão Clínica Ocupacional"

    def generate_report(self, atendimentos: list, title: str = "Relatório de Atendimentos") -> bytes:
        """
        Gera relatório PDF com lista de atendimentos.

        Args:
            atendimentos: Lista de objetos Atendimento ou dicts.
            title: Título do relatório.

        Returns:
            Bytes do PDF gerado.
        """
        try:
            from fpdf import FPDF

            pdf = FPDF()
            pdf.set_auto_page_break(auto=True, margin=15)
            pdf.add_page()

            # ── Cabeçalho ──────────────────────────────────────
            pdf.set_font("Helvetica", "B", 16)
            pdf.cell(0, 10, self.APP_NAME, ln=True, align="C")

            pdf.set_font("Helvetica", "", 10)
            pdf.cell(0, 6, self.APP_SUBTITLE, ln=True, align="C")
            pdf.ln(4)

            # Linha divisória
            pdf.set_draw_color(100, 100, 100)
            pdf.line(10, pdf.get_y(), 200, pdf.get_y())
            pdf.ln(4)

            # ── Título ─────────────────────────────────────────
            pdf.set_font("Helvetica", "B", 13)
            pdf.cell(0, 8, title, ln=True)

            pdf.set_font("Helvetica", "", 9)
            pdf.cell(0, 6, f"Gerado em: {datetime.now().strftime('%d/%m/%Y às %H:%M')}", ln=True)
            pdf.cell(0, 6, f"Total de registros: {len(atendimentos)}", ln=True)
            pdf.ln(5)

            # ── Tabela ─────────────────────────────────────────
            # Header
            pdf.set_fill_color(30, 41, 59)  # dark blue
            pdf.set_text_color(255, 255, 255)
            pdf.set_font("Helvetica", "B", 9)

            cols = [
                ("ID", 12), ("Empresa", 45), ("Paciente", 45),
                ("Modalidade", 30), ("Data", 22), ("Status", 26),
            ]
            for col_name, col_width in cols:
                pdf.cell(col_width, 8, col_name, border=1, fill=True, align="C")
            pdf.ln()

            # Dados
            pdf.set_text_color(0, 0, 0)
            pdf.set_font("Helvetica", "", 8)
            fill = False

            for a in atendimentos:
                # Suporta tanto dict quanto objeto Atendimento
                if isinstance(a, dict):
                    aid = str(a.get("id", ""))
                    empresa = str(a.get("empresa", ""))[:20]
                    nome = str(a.get("nome", ""))[:20]
                    modalidade = str(a.get("modalidade", ""))[:15]
                    data_val = a.get("data", "")
                    status = str(a.get("status", ""))[:12]
                else:
                    aid = str(a.id)
                    empresa = str(a.empresa)[:20]
                    nome = str(a.nome)[:20]
                    modalidade = str(a.modalidade)[:15]
                    data_val = a.data
                    status = str(a.status)[:12]

                data_fmt = format_date_br(data_val) if data_val else "-"

                if fill:
                    pdf.set_fill_color(248, 250, 252)
                else:
                    pdf.set_fill_color(255, 255, 255)

                row_data = [
                    (aid, 12), (empresa, 45), (nome, 45),
                    (modalidade, 30), (data_fmt, 22), (status, 26),
                ]
                for val, w in row_data:
                    pdf.cell(w, 7, val, border=1, fill=True)
                pdf.ln()
                fill = not fill

            pdf.ln(8)
            pdf.set_font("Helvetica", "I", 8)
            pdf.set_text_color(100, 100, 100)
            pdf.cell(0, 6, f"Documento gerado automaticamente pelo {self.APP_NAME} — Uso restrito.", ln=True, align="C")

            return bytes(pdf.output())

        except ImportError:
            logger.error("PDF: fpdf2 não instalado. Execute: pip install fpdf2")
            return b""
        except Exception as e:
            logger.error(f"PDF: Erro na geração do relatório: {e}")
            return b""

    def generate_atendimento_pdf(
        self,
        atendimento_id: int,
        nome: str,
        empresa: str,
        modalidade: str,
        data_str: str,
        hora_str: str,
        observacoes: str = "",
        ai_parecer: str = "",
    ) -> bytes:
        """
        Gera PDF individual de um atendimento (para download).

        Args:
            atendimento_id: ID do atendimento.
            nome: Nome do paciente.
            empresa: Empresa.
            modalidade: Tipo de avaliação.
            data_str: Data formatada.
            hora_str: Hora formatada.
            observacoes: Observações do atendimento.
            ai_parecer: Parecer gerado pela IA (opcional).

        Returns:
            Bytes do PDF.
        """
        try:
            from fpdf import FPDF

            pdf = FPDF()
            pdf.add_page()
            pdf.set_auto_page_break(auto=True, margin=15)

            # Cabeçalho
            pdf.set_font("Helvetica", "B", 16)
            pdf.cell(0, 10, self.APP_NAME, ln=True, align="C")
            pdf.set_font("Helvetica", "", 10)
            pdf.cell(0, 6, self.APP_SUBTITLE, ln=True, align="C")
            pdf.ln(4)
            pdf.line(10, pdf.get_y(), 200, pdf.get_y())
            pdf.ln(6)

            # Título
            pdf.set_font("Helvetica", "B", 13)
            pdf.cell(0, 8, f"Atendimento #{atendimento_id}", ln=True)
            pdf.set_font("Helvetica", "", 9)
            pdf.cell(0, 6, f"Dica: Abra este arquivo no navegador e use Imprimir → Salvar como PDF.", ln=True)
            pdf.ln(4)

            # Dados do atendimento
            pdf.set_font("Helvetica", "B", 11)
            pdf.cell(0, 8, "Dados do Atendimento", ln=True)
            pdf.set_font("Helvetica", "", 10)

            fields = [
                ("Paciente", nome),
                ("Empresa", empresa),
                ("Modalidade", modalidade),
                ("Data", data_str),
                ("Hora", hora_str),
            ]
            for label, value in fields:
                pdf.set_font("Helvetica", "B", 10)
                pdf.cell(40, 7, f"{label}:", border=0)
                pdf.set_font("Helvetica", "", 10)
                pdf.cell(0, 7, value, ln=True)

            # Observações
            if observacoes:
                pdf.ln(4)
                pdf.set_font("Helvetica", "B", 11)
                pdf.cell(0, 8, "Observações", ln=True)
                pdf.set_font("Helvetica", "", 10)
                pdf.multi_cell(0, 6, observacoes)

            # Parecer IA
            if ai_parecer:
                pdf.ln(6)
                pdf.set_font("Helvetica", "B", 11)
                pdf.cell(0, 8, "Parecer Clínico (Gerado por IA)", ln=True)
                pdf.set_font("Helvetica", "", 10)
                # Remove markdown básico para o PDF
                clean_parecer = ai_parecer.replace("**", "").replace("*", "").replace("#", "")
                pdf.multi_cell(0, 6, clean_parecer)

            # Assinatura
            pdf.ln(20)
            pdf.line(30, pdf.get_y(), 100, pdf.get_y())
            pdf.ln(4)
            pdf.set_font("Helvetica", "", 10)
            pdf.cell(0, 6, "Data e Assinatura do Profissional", ln=True)

            pdf.ln(8)
            pdf.set_font("Helvetica", "I", 7)
            pdf.set_text_color(150, 150, 150)
            pdf.cell(0, 5, f"Gerado em {datetime.now().strftime('%d/%m/%Y às %H:%M')} — {self.APP_NAME}", align="C")

            return bytes(pdf.output())

        except ImportError:
            return b""
        except Exception as e:
            logger.error(f"PDF: Erro ao gerar PDF do atendimento #{atendimento_id}: {e}")
            return b""

    def to_csv(self, atendimentos: list) -> bytes:
        """
        Exporta lista de atendimentos para CSV.

        Returns:
            Bytes do CSV UTF-8.
        """
        try:
            import pandas as pd

            rows = []
            for a in atendimentos:
                if isinstance(a, dict):
                    rows.append(a)
                else:
                    rows.append({
                        "ID": a.id,
                        "Empresa": a.empresa,
                        "Paciente": a.nome,
                        "Modalidade": a.modalidade,
                        "Data": format_date_br(a.data),
                        "Hora": format_time_br(a.hora),
                        "Status": a.status,
                        "Observações": a.observacoes or "",
                        "Laudo": "✓" if a.has_laudo else "✗",
                        "Avaliação": "✓" if a.has_avaliacao else "✗",
                    })

            df = pd.DataFrame(rows)
            return df.to_csv(index=False, encoding="utf-8-sig").encode("utf-8-sig")

        except ImportError:
            logger.error("PDF: pandas não instalado.")
            return b""
        except Exception as e:
            logger.error(f"CSV: Erro na exportação: {e}")
            return b""


# Singleton global
pdf_service = PDFService()
