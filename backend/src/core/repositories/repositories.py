"""
Repositories do sistema mvpdepsicologia.

Implementa o padrão Repository — isola completamente o acesso ao banco
de qualquer outra camada do sistema.

Cada repository é responsável por uma entidade específica.
Toda query usa parametrized statements (proteção contra SQL injection).
Toda operação de escrita registra auditoria (LGPD compliance).

Uso:
    from core.repositories.repositories import AtendimentoRepository
    repo = AtendimentoRepository()
    atendimentos = repo.list_all()
"""

from datetime import date, datetime
from typing import Any, Dict, List, Optional

from infrastructure.connection import connection_scope
from core.entities.models import (
    Arquivo,
    Atendimento,
    AtendimentoCreate,
    AtendimentoFilter,
    AtendimentoUpdate,
    AuditoriaEntry,
    DashboardStats,
    Documento,
    DocumentoCreate,
    Nota,
    NotaCreate,
)
from utils.constants import (
    AUDIT_ATTACH,
    AUDIT_CREATE,
    AUDIT_DELETE,
    AUDIT_DETACH,
    AUDIT_STATUS,
    AUDIT_UPDATE,
    TABLE_ATENDIMENTOS,
    TABLE_AUDITORIA,
    TABLE_ARQUIVOS,
    TABLE_DOCUMENTOS,
    TABLE_NOTAS,
    TABLE_PREFERENCES,
)
from utils.logger import get_logger

logger = get_logger(__name__)


# ─────────────────────────────────────────────────────────────
# Auditoria (base, usada pelos outros repositories)
# ─────────────────────────────────────────────────────────────

class AuditoriaRepository:
    """Registra e lista eventos de auditoria do sistema."""

    @staticmethod
    def registrar(
        acao: str,
        entidade: str,
        entidade_id: Optional[int],
        detalhes: Optional[str],
        usuario: Optional[str] = None,
    ) -> None:
        """
        Registra um evento de auditoria.
        Tolerante a falhas — nunca bloqueia o fluxo principal.

        LGPD: Nunca logar dados pessoais (nome, CPF, email) no campo detalhes.
        """
        try:
            # Tenta capturar usuário da sessão Streamlit se não informado
            if not usuario:
                try:
                    import streamlit as st  # type: ignore
                    usuario = st.session_state.get("user_name", "system")
                except Exception:
                    usuario = "system"

            with connection_scope() as conn:
                cur = conn.cursor()
                cur.execute(
                    f"""
                    INSERT INTO {TABLE_AUDITORIA}
                        (acao, entidade, entidade_id, detalhes, usuario)
                    VALUES (%s, %s, %s, %s, %s)
                    """,
                    (acao, entidade, entidade_id, detalhes, usuario),
                )
        except Exception as e:
            logger.warning(f"Falha ao registrar auditoria: {e}")

    @staticmethod
    def listar(limit: int = 100) -> List[AuditoriaEntry]:
        """Lista as últimas entradas de auditoria."""
        limit = max(1, min(int(limit or 100), 1000))
        try:
            with connection_scope(commit=False) as conn:
                cur = conn.cursor()
                cur.execute(
                    f"""
                    SELECT id, acao, entidade, entidade_id, detalhes, usuario, criado_em
                    FROM {TABLE_AUDITORIA}
                    ORDER BY id DESC
                    LIMIT %s
                    """,
                    (limit,),
                )
                return [
                    AuditoriaEntry(**dict(row))
                    for row in cur.fetchall()
                ]
        except Exception as e:
            logger.error(f"Erro ao listar auditoria: {e}")
            return []


# Instância global para uso dos outros repositories
_auditoria = AuditoriaRepository()


# ─────────────────────────────────────────────────────────────
# Atendimento Repository
# ─────────────────────────────────────────────────────────────

class AtendimentoRepository:
    """CRUD completo para a entidade Atendimento."""

    _COLUMNS = "id, empresa, nome, modalidade, data, hora, laudo_pdf, avaliacao_pdf, status, observacoes, criado_em"
    _ALLOWED_UPDATE_FIELDS = {
        "empresa", "nome", "modalidade", "data", "hora",
        "status", "observacoes", "laudo_pdf", "avaliacao_pdf",
    }

    def _row_to_model(self, row: Dict) -> Atendimento:
        """Converte uma row do banco para o model Atendimento."""
        return Atendimento(
            id=row["id"],
            empresa=row["empresa"],
            nome=row["nome"],
            modalidade=row["modalidade"],
            data=row["data"],
            hora=row["hora"],
            laudo_pdf=row.get("laudo_pdf"),
            avaliacao_pdf=row.get("avaliacao_pdf"),
            status=row.get("status", "Agendado"),
            observacoes=row.get("observacoes"),
            criado_em=row.get("criado_em"),
        )

    def list_all(self, filters: Optional[AtendimentoFilter] = None) -> List[Atendimento]:
        """
        Lista atendimentos com filtros opcionais.

        Args:
            filters: Filtros de busca (empresa, nome, status, período).

        Returns:
            Lista de Atendimento ordenada por data DESC.
        """
        filters = filters or AtendimentoFilter()
        conditions: List[str] = []
        params: List[Any] = []

        if filters.empresa:
            conditions.append("LOWER(empresa) LIKE LOWER(%s)")
            params.append(f"%{filters.empresa}%")
        if filters.nome:
            conditions.append("LOWER(nome) LIKE LOWER(%s)")
            params.append(f"%{filters.nome}%")
        if filters.modalidade:
            conditions.append("modalidade = %s")
            params.append(filters.modalidade)
        if filters.status:
            conditions.append("status = %s")
            params.append(filters.status)
        if filters.data_inicio:
            conditions.append("data >= %s")
            params.append(filters.data_inicio)
        if filters.data_fim:
            conditions.append("data <= %s")
            params.append(filters.data_fim)

        where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""
        params.extend([filters.limit, filters.offset])

        query = f"""
            SELECT {self._COLUMNS}
            FROM {TABLE_ATENDIMENTOS}
            {where_clause}
            ORDER BY data DESC, hora DESC
            LIMIT %s OFFSET %s
        """

        try:
            with connection_scope(commit=False) as conn:
                cur = conn.cursor()
                cur.execute(query, params)
                return [self._row_to_model(dict(row)) for row in cur.fetchall()]
        except Exception as e:
            logger.error(f"Erro ao listar atendimentos: {e}")
            return []

    def find_by_id(self, atendimento_id: int) -> Optional[Atendimento]:
        """Busca um atendimento pelo ID. Retorna None se não encontrado."""
        try:
            with connection_scope(commit=False) as conn:
                cur = conn.cursor()
                cur.execute(
                    f"SELECT {self._COLUMNS} FROM {TABLE_ATENDIMENTOS} WHERE id = %s",
                    (atendimento_id,),
                )
                row = cur.fetchone()
                return self._row_to_model(dict(row)) if row else None
        except Exception as e:
            logger.error(f"Erro ao buscar atendimento #{atendimento_id}: {e}")
            return None

    def create(self, data: AtendimentoCreate) -> int:
        """
        Cria novo atendimento.

        Returns:
            ID do registro criado, ou 0 em caso de falha.
        """
        query = f"""
            INSERT INTO {TABLE_ATENDIMENTOS}
                (empresa, nome, modalidade, data, hora,
                 laudo_pdf, avaliacao_pdf, observacoes, status)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, COALESCE(%s, 'Agendado'))
            RETURNING id
        """
        params = (
            data.empresa.strip()[:255],
            data.nome.strip()[:255],
            data.modalidade.strip()[:100],
            data.data,
            data.hora,
            data.laudo_pdf,
            data.avaliacao_pdf,
            (data.observacoes or "").strip(),
            (data.status or "").strip()[:50],
        )
        try:
            with connection_scope() as conn:
                cur = conn.cursor()
                cur.execute(query, params)
                row = cur.fetchone()
                new_id = int(row["id"]) if row else 0

            # LGPD: Auditoria registra apenas ID, sem dados pessoais
            _auditoria.registrar(
                AUDIT_CREATE, TABLE_ATENDIMENTOS, new_id,
                f"Novo atendimento criado (ID {new_id})"
            )
            logger.info(f"Atendimento #{new_id} criado.")
            return new_id
        except Exception as e:
            logger.error(f"Erro ao criar atendimento: {e}")
            return 0

    def update(self, atendimento_id: int, data: AtendimentoUpdate) -> bool:
        """
        Atualiza campos de um atendimento. Apenas campos não-None são atualizados.

        Returns:
            True se atualizado com sucesso.
        """
        updates = {k: v for k, v in data.to_dict().items() if k in self._ALLOWED_UPDATE_FIELDS}
        if not updates:
            return False

        set_parts = [f"{field} = %s" for field in updates]
        params: List[Any] = list(updates.values())
        params.append(atendimento_id)

        query = f"""
            UPDATE {TABLE_ATENDIMENTOS}
            SET {', '.join(set_parts)}
            WHERE id = %s
        """
        try:
            with connection_scope() as conn:
                cur = conn.cursor()
                cur.execute(query, params)
                success = cur.rowcount > 0

            if success:
                _auditoria.registrar(
                    AUDIT_UPDATE, TABLE_ATENDIMENTOS, atendimento_id,
                    f"Campos atualizados: {', '.join(updates.keys())}"
                )
            return success
        except Exception as e:
            logger.error(f"Erro ao atualizar atendimento #{atendimento_id}: {e}")
            return False

    def update_status(self, atendimento_id: int, status: str) -> bool:
        """Atualiza apenas o status de um atendimento."""
        status = (status or "").strip()
        if not status:
            return False
        try:
            with connection_scope() as conn:
                cur = conn.cursor()
                cur.execute(
                    f"UPDATE {TABLE_ATENDIMENTOS} SET status = %s WHERE id = %s",
                    (status, atendimento_id),
                )
                success = cur.rowcount > 0

            if success:
                # LGPD: Apenas status, sem PII
                _auditoria.registrar(
                    AUDIT_STATUS, TABLE_ATENDIMENTOS, atendimento_id,
                    f"Status alterado para: {status}"
                )
            return success
        except Exception as e:
            logger.error(f"Erro ao atualizar status do atendimento #{atendimento_id}: {e}")
            return False

    def set_anexo(self, atendimento_id: int, campo: str, marcador: Optional[str]) -> bool:
        """Vincula ou desvincula um arquivo PDF de um atendimento."""
        campo = (campo or "").strip().lower()
        if campo not in ("laudo_pdf", "avaliacao_pdf"):
            raise ValueError("Campo inválido: use 'laudo_pdf' ou 'avaliacao_pdf'")
        try:
            with connection_scope() as conn:
                cur = conn.cursor()
                cur.execute(
                    f"UPDATE {TABLE_ATENDIMENTOS} SET {campo} = %s WHERE id = %s",
                    (marcador, atendimento_id),
                )
                success = cur.rowcount > 0

            if success:
                acao = AUDIT_ATTACH if marcador else AUDIT_DETACH
                _auditoria.registrar(acao, TABLE_ATENDIMENTOS, atendimento_id, f"{campo} → {marcador}")
            return success
        except Exception as e:
            logger.error(f"Erro ao definir anexo {campo} para #{atendimento_id}: {e}")
            return False

    def delete(self, atendimento_id: int) -> bool:
        """Remove um atendimento. Retorna True se excluído com sucesso."""
        try:
            with connection_scope() as conn:
                cur = conn.cursor()
                cur.execute(
                    f"DELETE FROM {TABLE_ATENDIMENTOS} WHERE id = %s",
                    (atendimento_id,),
                )
                success = cur.rowcount > 0

            if success:
                _auditoria.registrar(AUDIT_DELETE, TABLE_ATENDIMENTOS, atendimento_id, "Registro excluído")
                logger.info(f"Atendimento #{atendimento_id} excluído.")
            return success
        except Exception as e:
            logger.error(f"Erro ao excluir atendimento #{atendimento_id}: {e}")
            return False

    def get_stats(self) -> DashboardStats:
        """Calcula estatísticas para o dashboard."""
        try:
            with connection_scope(commit=False) as conn:
                cur = conn.cursor()

                # Total e por status
                cur.execute(f"""
                    SELECT
                        COUNT(*) AS total,
                        COUNT(*) FILTER (WHERE status = 'Agendado')  AS agendados,
                        COUNT(*) FILTER (WHERE status = 'Atendido')  AS atendidos,
                        COUNT(*) FILTER (WHERE status = 'Concluído') AS concluidos,
                        COUNT(*) FILTER (WHERE status = 'Cancelado') AS cancelados,
                        COUNT(DISTINCT empresa) AS total_empresas,
                        COUNT(*) FILTER (WHERE data = CURRENT_DATE)  AS hoje,
                        COUNT(*) FILTER (WHERE date_trunc('month', data) = date_trunc('month', CURRENT_DATE)) AS mes
                    FROM {TABLE_ATENDIMENTOS}
                """)
                row = dict(cur.fetchone() or {})

                # Por modalidade
                cur.execute(f"""
                    SELECT modalidade, COUNT(*) AS total
                    FROM {TABLE_ATENDIMENTOS}
                    GROUP BY modalidade ORDER BY total DESC
                """)
                por_modalidade = {r["modalidade"]: r["total"] for r in cur.fetchall()}

                # Top 5 empresas
                cur.execute(f"""
                    SELECT empresa, COUNT(*) AS total
                    FROM {TABLE_ATENDIMENTOS}
                    GROUP BY empresa ORDER BY total DESC LIMIT 5
                """)
                por_empresa = {r["empresa"]: r["total"] for r in cur.fetchall()}

            return DashboardStats(
                total_atendimentos=row.get("total", 0),
                agendados=row.get("agendados", 0),
                atendidos=row.get("atendidos", 0),
                concluidos=row.get("concluidos", 0),
                cancelados=row.get("cancelados", 0),
                total_empresas=row.get("total_empresas", 0),
                atendimentos_hoje=row.get("hoje", 0),
                atendimentos_mes=row.get("mes", 0),
                por_modalidade=por_modalidade,
                por_empresa=por_empresa,
            )
        except Exception as e:
            logger.error(f"Erro ao calcular stats do dashboard: {e}")
            return DashboardStats()

    def list_empresas(self) -> List[str]:
        """Retorna lista de empresas distintas cadastradas."""
        try:
            with connection_scope(commit=False) as conn:
                cur = conn.cursor()
                cur.execute(
                    f"SELECT DISTINCT empresa FROM {TABLE_ATENDIMENTOS} ORDER BY empresa"
                )
                return [row["empresa"] for row in cur.fetchall()]
        except Exception:
            return []


# ─────────────────────────────────────────────────────────────
# Arquivo Repository
# ─────────────────────────────────────────────────────────────

class ArquivoRepository:
    """Gerencia arquivos PDF armazenados no banco (tabela arquivos)."""

    MAX_SIZE_BYTES = 50 * 1024 * 1024  # 50MB

    def save(self, filename: str, content: bytes, content_type: str = "application/pdf") -> int:
        """Salva arquivo no banco. Retorna o ID gerado."""
        if len(content) > self.MAX_SIZE_BYTES:
            raise ValueError(f"Arquivo excede o limite de 50MB.")

        try:
            import psycopg2
            with connection_scope() as conn:
                cur = conn.cursor()
                cur.execute(
                    f"""
                    INSERT INTO {TABLE_ARQUIVOS} (filename, content, content_type, size)
                    VALUES (%s, %s, %s, %s)
                    RETURNING id
                    """,
                    (filename, psycopg2.Binary(content), content_type, len(content)),
                )
                row = cur.fetchone()
                file_id = int(row["id"]) if row else 0

            logger.info(f"Arquivo '{filename}' salvo com ID #{file_id}.")
            return file_id
        except Exception as e:
            logger.error(f"Erro ao salvar arquivo '{filename}': {e}")
            return 0

    def find_by_id(self, file_id: int) -> Optional[Arquivo]:
        """Busca arquivo com conteúdo pelo ID."""
        try:
            with connection_scope(commit=False) as conn:
                cur = conn.cursor()
                cur.execute(
                    f"SELECT id, filename, content, content_type, size, criado_em FROM {TABLE_ARQUIVOS} WHERE id = %s",
                    (file_id,),
                )
                row = cur.fetchone()
                if not row:
                    return None
                return Arquivo(
                    id=row["id"],
                    filename=row["filename"],
                    content=bytes(row["content"]) if row["content"] else None,
                    content_type=row["content_type"],
                    size=row["size"],
                    criado_em=row.get("criado_em"),
                )
        except Exception as e:
            logger.error(f"Erro ao buscar arquivo #{file_id}: {e}")
            return None

    def list_all(self) -> List[Arquivo]:
        """Lista todos os arquivos sem o conteúdo (para listagem)."""
        try:
            with connection_scope(commit=False) as conn:
                cur = conn.cursor()
                cur.execute(
                    f"SELECT id, filename, content_type, size, criado_em FROM {TABLE_ARQUIVOS} ORDER BY criado_em DESC"
                )
                return [
                    Arquivo(
                        id=r["id"],
                        filename=r["filename"],
                        content_type=r["content_type"],
                        size=r["size"],
                        criado_em=r.get("criado_em"),
                    )
                    for r in cur.fetchall()
                ]
        except Exception as e:
            logger.error(f"Erro ao listar arquivos: {e}")
            return []

    def delete(self, file_id: int) -> bool:
        """Remove arquivo do banco e desvincula de atendimentos."""
        try:
            marker = f"db:{file_id}"
            with connection_scope() as conn:
                cur = conn.cursor()
                # Desvincula de atendimentos
                cur.execute(f"UPDATE {TABLE_ATENDIMENTOS} SET laudo_pdf = NULL WHERE laudo_pdf = %s", (marker,))
                cur.execute(f"UPDATE {TABLE_ATENDIMENTOS} SET avaliacao_pdf = NULL WHERE avaliacao_pdf = %s", (marker,))
                # Remove o arquivo
                cur.execute(f"DELETE FROM {TABLE_ARQUIVOS} WHERE id = %s", (file_id,))
                success = cur.rowcount > 0

            if success:
                _auditoria.registrar(AUDIT_DELETE, TABLE_ARQUIVOS, file_id, "Arquivo excluído")
            return success
        except Exception as e:
            logger.error(f"Erro ao excluir arquivo #{file_id}: {e}")
            return False


# ─────────────────────────────────────────────────────────────
# Preferences Repository
# ─────────────────────────────────────────────────────────────

class PreferencesRepository:
    """Gerencia preferências do usuário (chave-valor persistente)."""

    def save(self, key: str, value: str) -> bool:
        """Salva ou atualiza uma preferência (upsert)."""
        try:
            with connection_scope() as conn:
                cur = conn.cursor()
                cur.execute(
                    f"""
                    INSERT INTO {TABLE_PREFERENCES} (pref_key, pref_value, updated_at)
                    VALUES (%s, %s, NOW())
                    ON CONFLICT (pref_key)
                    DO UPDATE SET pref_value = EXCLUDED.pref_value, updated_at = NOW()
                    """,
                    (str(key)[:100], value),
                )
            return True
        except Exception as e:
            logger.error(f"Erro ao salvar preferência '{key}': {e}")
            return False

    def get(self, key: str, default: Optional[str] = None) -> Optional[str]:
        """Recupera uma preferência pelo key."""
        try:
            with connection_scope(commit=False) as conn:
                cur = conn.cursor()
                cur.execute(
                    f"SELECT pref_value FROM {TABLE_PREFERENCES} WHERE pref_key = %s",
                    (str(key)[:100],),
                )
                row = cur.fetchone()
                return row["pref_value"] if row else default
        except Exception:
            return default

    def delete(self, key: str) -> bool:
        """Remove uma preferência."""
        try:
            with connection_scope() as conn:
                cur = conn.cursor()
                cur.execute(f"DELETE FROM {TABLE_PREFERENCES} WHERE pref_key = %s", (str(key)[:100],))
                return cur.rowcount > 0
        except Exception:
            return False


# ─────────────────────────────────────────────────────────────
# Documento Repository (Google Docs)
# ─────────────────────────────────────────────────────────────

class DocumentoRepository:
    """Gerencia documentos Google Docs vinculados ao sistema."""

    def create(self, data: DocumentoCreate) -> int:
        """Vincula um Google Doc ao sistema."""
        try:
            with connection_scope() as conn:
                cur = conn.cursor()
                cur.execute(
                    f"""
                    INSERT INTO {TABLE_DOCUMENTOS} (titulo, google_doc_id, tipo, atendimento_id)
                    VALUES (%s, %s, %s, %s)
                    RETURNING id
                    """,
                    (data.titulo, data.google_doc_id, data.tipo, data.atendimento_id),
                )
                row = cur.fetchone()
                return int(row["id"]) if row else 0
        except Exception as e:
            logger.error(f"Erro ao criar documento: {e}")
            return 0

    def list_all(self) -> List[Documento]:
        """Lista todos os documentos cadastrados."""
        try:
            with connection_scope(commit=False) as conn:
                cur = conn.cursor()
                cur.execute(
                    f"SELECT id, titulo, google_doc_id, tipo, atendimento_id, criado_em FROM {TABLE_DOCUMENTOS} ORDER BY criado_em DESC"
                )
                return [
                    Documento(
                        id=r["id"],
                        titulo=r["titulo"],
                        google_doc_id=r["google_doc_id"],
                        tipo=r["tipo"],
                        atendimento_id=r.get("atendimento_id"),
                        criado_em=r.get("criado_em"),
                    )
                    for r in cur.fetchall()
                ]
        except Exception as e:
            logger.error(f"Erro ao listar documentos: {e}")
            return []

    def delete(self, doc_id: int) -> bool:
        """Remove um documento."""
        try:
            with connection_scope() as conn:
                cur = conn.cursor()
                cur.execute(f"DELETE FROM {TABLE_DOCUMENTOS} WHERE id = %s", (doc_id,))
                return cur.rowcount > 0
        except Exception:
            return False


# ─────────────────────────────────────────────────────────────
# Instâncias Singleton (prontas para uso)
# ─────────────────────────────────────────────────────────────

atendimento_repo = AtendimentoRepository()
arquivo_repo = ArquivoRepository()
preferences_repo = PreferencesRepository()
documento_repo = DocumentoRepository()
auditoria_repo = AuditoriaRepository()
