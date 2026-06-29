"""
API FastAPI — Clínica IA

Inclui:
- CORS restrito via ALLOWED_ORIGINS (.env)
- Pydantic models em todos os endpoints
- Brute force protection (MAX_LOGIN_ATTEMPTS / LOGIN_BLOCK_MINUTES)
- Endpoints LGPD: consentimento, portabilidade, direito ao esquecimento
- Auditoria de todas as ações sensíveis
"""

import os
from typing import Optional

import uvicorn
from fastapi import Depends, FastAPI, HTTPException, Request, status
from fastapi import UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr, Field

from core.config import settings
from infrastructure.connection import ensure_schema
from core.repositories.repositories import atendimento_repo, arquivo_repo, auditoria_repo, documento_repo
from core.entities.models import DocumentoCreate
from core.repositories.user_repositories import user_repo, clinic_config_repo
from core.repositories.repositories import preferences_repo
from services.lgpd_service import get_lgpd_service
from services.security import create_access_token, verify_access_token
from utils.helpers import verify_password
from utils.logger import get_logger
import base64
from utils.constants import CLINIC_PREF_USER_PHOTO, CLINIC_PREF_LOGO

logger = get_logger(__name__)

# ─────────────────────────────────────────────────────────────
# App e CORS
# ─────────────────────────────────────────────────────────────

app = FastAPI(
    title="Clínica IA API",
    version="2.1.0",
    description="API de gestão clínica com conformidade LGPD completa.",
)

# ─────────────────────────────────────────────────────────────
# Startup — schema & admin bootstrap
# ─────────────────────────────────────────────────────────────

@app.on_event("startup")
async def _startup() -> None:
    """Garante schema e admin inicial ao subir a API (Render/Docker)."""
    try:
        ensure_schema()
        logger.info("Startup: Schema verificado/criado com sucesso.")
    except Exception as e:
        logger.error(f"Startup: falha ao garantir schema: {e}")

    # Bootstrap do admin inicial (sem depender de Streamlit)
    try:
        from core.repositories.user_repositories import user_repo
        from utils.helpers import hash_password

        admin_user = settings.auth_username
        admin_pass = settings.auth_password
        if admin_pass:
            user_repo.bootstrap_admin(
                username=admin_user,
                display_name="Administrador",
                password_hash=hash_password(admin_pass),
            )
    except Exception as e:
        logger.warning(f"Startup: bootstrap do admin não concluído: {e}")

# CORS: lê domínios permitidos do .env — NUNCA usar "*" em produção
_raw_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000")
ALLOWED_ORIGINS = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/token")

# ─────────────────────────────────────────────────────────────
# Pydantic Schemas
# ─────────────────────────────────────────────────────────────


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class AtendimentoResponse(BaseModel):
    id: int
    empresa: str
    nome: str
    modalidade: str
    data: str
    hora: str
    status: str


class PacienteResponse(BaseModel):
    id: int
    nome: str
    empresa: Optional[str] = None
    total_atendimentos: int = 0
    ultimo_atendimento: Optional[str] = None
    status: Optional[str] = None
    modalidades_distintas: int = 0
    foto: Optional[str] = None


class PacienteSearchPayload(BaseModel):
    q: Optional[str] = None
    limit: int = 1000
    offset: int = 0


class ConsentimentoCreate(BaseModel):
    titular_nome: str = Field(..., min_length=3, max_length=255)
    titular_email: Optional[str] = Field(None, max_length=255)
    finalidade: str = Field(
        ...,
        description="Ex: laudos_psicologicos, agendamento, comunicacao",
    )
    base_legal: str = Field(
        default="consentimento",
        description="Base legal LGPD: consentimento, contrato, obrigacao_legal, tutela_saude",
    )


class ConsentimentoResponse(BaseModel):
    sucesso: bool
    consentimento_id: Optional[int] = None
    mensagem: Optional[str] = None
    erro: Optional[str] = None


class EsquecimentoRequest(BaseModel):
    email: str = Field(..., description="E-mail do titular para executar o esquecimento")
    nome: Optional[str] = Field(None, description="Nome para localizar e anonimizar atendimentos")
    confirmacao: str = Field(
        ...,
        description="Deve ser exatamente 'CONFIRMO_EXCLUSAO_PERMANENTE'",
    )


class EsquecimentoResponse(BaseModel):
    sucesso: bool
    executado_em: Optional[str] = None
    consentimentos_removidos: int = 0
    atendimentos_anonimizados: int = 0
    erro: Optional[str] = None


# ─────────────────────────────────────────────────────────────
# Router
# ─────────────────────────────────────────────────────────────

from fastapi import APIRouter, UploadFile, File, Form

api_router = APIRouter(prefix="/api")


# ─────────────────────────────────────────────────────────────
# Pydantic Schemas — Configurações
# ─────────────────────────────────────────────────────────────

class ConfigClinicaUpdate(BaseModel):
    clinic_name: Optional[str] = None
    clinic_phone: Optional[str] = None
    clinic_address: Optional[str] = None
    clinic_email: Optional[str] = None
    clinic_google_doc_id: Optional[str] = None
    clinic_n8n_url: Optional[str] = None
    user_display_name: Optional[str] = None
    user_email: Optional[str] = None


# ─────────────────────────────────────────────────────────────
# Dependência de Autenticação
# ─────────────────────────────────────────────────────────────


async def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    """Valida JWT e retorna o payload do usuário logado."""
    payload = verify_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido ou expirado.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return payload


def _get_client_ip(request: Request) -> str:
    """Extrai o IP real do cliente (considera proxies/Vercel)."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


# ─────────────────────────────────────────────────────────────
# Auth Endpoints
# ─────────────────────────────────────────────────────────────


@api_router.post("/token", response_model=TokenResponse, tags=["Auth"])
async def login_for_access_token(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
):
    """
    Login com proteção contra força bruta.
    Bloqueia após MAX_LOGIN_ATTEMPTS tentativas em LOGIN_BLOCK_MINUTES minutos.
    """
    lgpd = get_lgpd_service()
    ip = _get_client_ip(request)

    # ── Brute force check ─────────────────────────────────────
    if lgpd.verificar_bloqueio_login(form_data.username, ip):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=(
                f"Conta temporariamente bloqueada por excesso de tentativas. "
                f"Tente novamente em {os.getenv('LOGIN_BLOCK_MINUTES', '15')} minutos."
            ),
        )

    # ── Autenticação ──────────────────────────────────────────
    authenticated = False
    user_role = "admin"

    # Modo 1: usuário do banco
    user = user_repo.find_by_username(form_data.username)
    if user:
        stored_hash = user_repo.get_password_hash(user.username)
        if stored_hash and verify_password(form_data.password, stored_hash):
            authenticated = True
            user_role = user.role
            username_canonical = user.username

    # Modo 2: fallback .env (compatibilidade)
    if not authenticated and settings.auth_password:
        env_valid = (form_data.username == settings.auth_username) and (
            form_data.password == settings.auth_password
            or verify_password(form_data.password, settings.auth_password)
        )
        if env_valid:
            authenticated = True
            username_canonical = form_data.username

    # ── Resultado ─────────────────────────────────────────────
    lgpd.registrar_tentativa_login(form_data.username, authenticated, ip)

    if not authenticated:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuário ou senha incorretos.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(
        data={"sub": form_data.username, "role": user_role}
    )
    return {"access_token": access_token, "token_type": "bearer"}


# ─────────────────────────────────────────────────────────────
# Atendimentos Endpoints
# ─────────────────────────────────────────────────────────────


@api_router.get(
    "/atendimentos",
    response_model=list[AtendimentoResponse],
    tags=["Atendimentos"],
)
async def list_atendimentos(current_user: dict = Depends(get_current_user)):
    """Lista atendimentos (requer autenticação)."""
    from core.entities.models import AtendimentoFilter
    atendimentos = atendimento_repo.list_all(filters=AtendimentoFilter(limit=1000))
    def _slug_name(name: str) -> str:
        import re
        s = (name or "").strip().lower()
        s = re.sub(r"[^a-z0-9]+", "_", s)
        return s.strip("_")

    return [
        {
            "id": a.id,
            "empresa": a.empresa,
            "nome": a.nome,
            "modalidade": a.modalidade,
            "data": a.data.strftime("%Y-%m-%d") if a.data else "",
            "hora": a.hora.strftime("%H:%M") if a.hora else "",
            "status": a.status,
            "foto": preferences_repo.get(f"patient_photo:{_slug_name(a.nome)}", None),
        }
        for a in atendimentos
    ]


@api_router.get("/pacientes", response_model=list[PacienteResponse], tags=["Pacientes"])
async def list_pacientes(
    q: Optional[str] = None,
    limit: int = 1000,
    offset: int = 0,
    current_user: dict = Depends(get_current_user),
):
    pacientes = atendimento_repo.list_pacientes_resumo(q=q, limit=limit, offset=offset)
    return [
        {
            "id": p["id"],
            "nome": p["nome"],
            "empresa": p.get("empresa"),
            "total_atendimentos": p.get("total_atendimentos", 0),
            "ultimo_atendimento": p["ultimo_atendimento"].strftime("%Y-%m-%d") if p.get("ultimo_atendimento") else None,
            "status": p.get("status"),
            "modalidades_distintas": p.get("modalidades_distintas", 0),
        }
        for p in pacientes
    ]

class AtendimentoPayload(BaseModel):
    empresa: str
    nome: str
    modalidade: str
    data: str
    hora: str
    status: Optional[str] = "Agendado"

@api_router.post("/atendimentos", tags=["Atendimentos"])
async def create_atendimento(
    payload: AtendimentoPayload,
    current_user: dict = Depends(get_current_user)
):
    from datetime import date, time
    from core.entities.models import AtendimentoCreate
    
    try:
        new_id = atendimento_repo.create(AtendimentoCreate(
            empresa=payload.empresa,
            nome=payload.nome,
            modalidade=payload.modalidade,
            data=date.fromisoformat(payload.data),
            hora=time.fromisoformat(payload.hora),
            status=payload.status or "Agendado"
        ))
        if not new_id:
            raise HTTPException(status_code=500, detail="Erro ao criar atendimento.")
        return {"id": new_id, "mensagem": "Atendimento criado com sucesso."}
    except ValueError:
        raise HTTPException(status_code=400, detail="Formato de data ou hora inválido.")

@api_router.put("/atendimentos/{atendimento_id}", tags=["Atendimentos"])
async def update_atendimento(
    atendimento_id: int,
    payload: AtendimentoPayload,
    current_user: dict = Depends(get_current_user)
):
    from datetime import date, time
    from core.entities.models import AtendimentoUpdate
    
    try:
        success = atendimento_repo.update(atendimento_id, AtendimentoUpdate(
            empresa=payload.empresa,
            nome=payload.nome,
            modalidade=payload.modalidade,
            data=date.fromisoformat(payload.data),
            hora=time.fromisoformat(payload.hora),
            status=payload.status or "Agendado"
        ))
        if not success:
            raise HTTPException(status_code=404, detail="Atendimento não encontrado ou erro ao atualizar.")
        return {"mensagem": "Atendimento atualizado com sucesso."}
    except ValueError:
        raise HTTPException(status_code=400, detail="Formato de data ou hora inválido.")

@api_router.delete("/atendimentos/{atendimento_id}", tags=["Atendimentos"])
async def delete_atendimento(
    atendimento_id: int,
    current_user: dict = Depends(get_current_user)
):
    success = atendimento_repo.delete(atendimento_id)
    if not success:
        raise HTTPException(status_code=404, detail="Atendimento não encontrado.")
    return {"mensagem": "Atendimento excluído com sucesso."}



@api_router.get("/stats", tags=["Dashboard"])
async def get_stats(current_user: dict = Depends(get_current_user)):
    """Estatísticas do dashboard (requer autenticação)."""
    return atendimento_repo.get_stats()


# ─────────────────────────────────────────────────────────────
# IA Endpoints (Gerador de Parecer)
# ─────────────────────────────────────────────────────────────

class IAPayload(BaseModel):
    notas: str
    modalidade: str = "Psicologia Clínica"

@api_router.post("/ia/gerar-parecer", tags=["IA"])
async def gerar_parecer(payload: IAPayload, current_user: dict = Depends(get_current_user)):
    """Gera um parecer clínico formal usando Google Gemini."""
    if not settings.gemini_api_key:
        raise HTTPException(status_code=503, detail="Chave da API do Gemini não configurada no servidor.")
    
    import google.generativeai as genai
    genai.configure(api_key=settings.gemini_api_key)
    
    prompt = (
        f"Você é um psicólogo/psiquiatra experiente. Escreva um parágrafo formal e bem estruturado "
        f"de parecer clínico baseado nas anotações cruas abaixo. "
        f"A modalidade do atendimento é '{payload.modalidade}'. "
        f"Mantenha um tom profissional, técnico e objetivo, pronto para ir para um prontuário.\n\n"
        f"Anotações brutas:\n{payload.notas}"
    )
    
    try:
        model = genai.GenerativeModel(settings.gemini_model)
        response = model.generate_content(prompt)
        if not response.text:
            raise HTTPException(status_code=500, detail="A IA não retornou um texto válido.")
        return {"texto": response.text.strip()}
    except Exception as e:
        logger.error(f"Erro no Gemini: {str(e)}")
        raise HTTPException(status_code=500, detail="Erro ao gerar texto com IA.")

# ─────────────────────────────────────────────────────────────
# Laudos Endpoints (Google Docs)
# ─────────────────────────────────────────────────────────────


class LaudoPayload(BaseModel):
    nome_paciente: str = Field(..., min_length=2)
    data_nascimento: str = Field(..., description="YYYY-MM-DD ou DD/MM/YYYY")
    cpf: str = Field(..., min_length=11)
    empresa: str = ""
    data_exame: str = Field(..., description="YYYY-MM-DD ou DD/MM/YYYY")
    motivo_avaliacao: str = ""
    avaliacao_psicologica: bool = False
    admissional: bool = False
    periodica: bool = False
    pessoal: bool = False
    mudanca_funcao: bool = False
    itens_auxiliados: str = ""
    conclusao: str = ""
    psicologista_nome: str = "Dr. Psicólogo"
    psicologista_crp: str = "XX/XXXXX"


class LaudoResponse(BaseModel):
    id: str
    titulo: str
    url: str
    embed_url: str


def _format_date_br(value: str) -> str:
    """Converte YYYY-MM-DD para DD/MM/YYYY; mantém DD/MM/YYYY."""
    from datetime import datetime

    value = (value or "").strip()
    if not value:
        return ""
    for fmt in ("%Y-%m-%d", "%d/%m/%Y"):
        try:
            return datetime.strptime(value, fmt).strftime("%d/%m/%Y")
        except ValueError:
            continue
    return value


@api_router.get("/laudos", tags=["Laudos"])
async def list_laudos(current_user: dict = Depends(get_current_user)):
    """Lista todos os laudos gerados e persistidos no banco."""
    from services.google_docs_service import google_docs_service

    documentos = documento_repo.list_all()
    return [
        {
            "id": d.google_doc_id,
            "db_id": d.id,
            "titulo": d.titulo,
            "paciente": d.titulo.replace("Laudo - ", "", 1),
            "tipo": "Laudo",
            "data": d.criado_em.strftime("%d/%m/%Y") if d.criado_em else "",
            "status": "Gerado",
            "url": d.view_url,
            "embed_url": google_docs_service.get_embed_url(d.google_doc_id),
        }
        for d in documentos
        if d.tipo == "laudo"
    ]


@api_router.post("/laudos/gerar", response_model=LaudoResponse, tags=["Laudos"])
async def gerar_laudo(
    payload: LaudoPayload,
    current_user: dict = Depends(get_current_user),
):
    """Copia o template Google Docs, preenche os campos e persiste no banco."""
    from services.laudo_service import DadosLaudo, get_laudo_service
    from services.google_docs_service import google_docs_service

    try:
        dados = DadosLaudo(
            nome_paciente=payload.nome_paciente.strip(),
            data_nascimento=_format_date_br(payload.data_nascimento),
            cpf=payload.cpf.strip(),
            empresa=payload.empresa.strip(),
            data_exame=_format_date_br(payload.data_exame),
            motivo_avaliacao=payload.motivo_avaliacao.strip(),
            avaliacao_psicologica=payload.avaliacao_psicologica,
            admissional=payload.admissional,
            periodica=payload.periodica,
            pessoal=payload.pessoal,
            mudanca_funcao=payload.mudanca_funcao,
            itens_auxiliados=payload.itens_auxiliados.strip(),
            conclusao=payload.conclusao.strip(),
            psicologista_nome=payload.psicologista_nome.strip(),
            psicologista_crp=payload.psicologista_crp.strip(),
        )
        laudo_service = get_laudo_service()
        novo_doc = laudo_service.gerar_laudo(dados)
        doc_id = novo_doc["id"]
        titulo = novo_doc.get("title", f"Laudo - {payload.nome_paciente}")

        # Persiste no banco para listar em sessões futuras
        documento_repo.create(DocumentoCreate(
            titulo=titulo,
            google_doc_id=doc_id,
            tipo="laudo",
        ))

        return {
            "id": doc_id,
            "titulo": titulo,
            "url": novo_doc["url"],
            "embed_url": google_docs_service.get_embed_url(doc_id),
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Erro ao gerar laudo: {e}")
        raise HTTPException(
            status_code=503,
            detail="Falha ao gerar laudo. Verifique credenciais Google e template configurado.",
        )


@api_router.get("/laudos/{doc_id}/pdf", tags=["Laudos"])
async def exportar_laudo_pdf(
    doc_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Exporta um laudo Google Docs como PDF."""
    import io
    import tempfile
    from pathlib import Path

    from fastapi.responses import StreamingResponse
    from services.laudo_service import get_laudo_service

    try:
        laudo_service = get_laudo_service()
        with tempfile.TemporaryDirectory() as tmp:
            pdf_path = str(Path(tmp) / f"laudo_{doc_id}.pdf")
            laudo_service.api.export_as_pdf(doc_id, pdf_path)
            content = Path(pdf_path).read_bytes()
        return StreamingResponse(
            io.BytesIO(content),
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="laudo_{doc_id}.pdf"'},
        )
    except Exception as e:
        logger.error(f"Erro ao exportar PDF do laudo {doc_id}: {e}")
        raise HTTPException(status_code=503, detail="Falha ao exportar PDF do laudo.")


@api_router.get("/laudos/template-status", tags=["Laudos"])
async def laudo_template_status(current_user: dict = Depends(get_current_user)):
    """Verifica se o template Google Docs está configurado."""
    from services.laudo_service import resolve_template_id
    from services.google_docs_service import google_docs_service

    try:
        template_id = resolve_template_id()
        return {
            "configurado": True,
            "template_id": template_id,
            "embed_url": google_docs_service.get_embed_url(template_id),
        }
    except ValueError as e:
        return {"configurado": False, "erro": str(e)}


# ─────────────────────────────────────────────────────────────
# Relatórios Endpoints
# ─────────────────────────────────────────────────────────────


@api_router.get("/relatorios/stats", tags=["Relatórios"])
async def get_relatorios_stats(
    data_inicio: Optional[str] = None,
    data_fim: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
):
    """
    Estatísticas detalhadas para relatórios, com filtro opcional por período.
    Retorna contagens por status, modalidade e empresa.
    """
    from datetime import date
    from core.entities.models import AtendimentoFilter

    filters = AtendimentoFilter(limit=5000)
    if data_inicio:
        try:
            filters.data_inicio = date.fromisoformat(data_inicio)
        except ValueError:
            pass
    if data_fim:
        try:
            filters.data_fim = date.fromisoformat(data_fim)
        except ValueError:
            pass

    atendimentos = atendimento_repo.list_all(filters=filters)

    # Contar por status
    por_status: dict = {}
    por_modalidade: dict = {}
    por_empresa: dict = {}
    por_mes: dict = {}

    for a in atendimentos:
        # Status
        por_status[a.status] = por_status.get(a.status, 0) + 1
        # Modalidade
        por_modalidade[a.modalidade] = por_modalidade.get(a.modalidade, 0) + 1
        # Empresa (top 10)
        por_empresa[a.empresa] = por_empresa.get(a.empresa, 0) + 1
        # Por mês (YYYY-MM)
        if a.data:
            mes_key = a.data.strftime("%Y-%m")
            por_mes[mes_key] = por_mes.get(mes_key, 0) + 1

    # Top 10 empresas
    top_empresas = dict(
        sorted(por_empresa.items(), key=lambda x: x[1], reverse=True)[:10]
    )

    # Ordenar por mês
    por_mes_sorted = dict(sorted(por_mes.items()))

    return {
        "total": len(atendimentos),
        "por_status": por_status,
        "por_modalidade": por_modalidade,
        "por_empresa": top_empresas,
        "por_mes": por_mes_sorted,
        "periodo": {
            "data_inicio": data_inicio,
            "data_fim": data_fim,
        },
    }


@api_router.get("/relatorios/atendimentos", tags=["Relatórios"])
async def get_relatorios_atendimentos(
    data_inicio: Optional[str] = None,
    data_fim: Optional[str] = None,
    status: Optional[str] = None,
    modalidade: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
):
    """Lista de atendimentos filtrada para geração de relatórios."""
    from datetime import date
    from core.entities.models import AtendimentoFilter

    filters = AtendimentoFilter(limit=5000, status=status, modalidade=modalidade)
    if data_inicio:
        try:
            filters.data_inicio = date.fromisoformat(data_inicio)
        except ValueError:
            pass
    if data_fim:
        try:
            filters.data_fim = date.fromisoformat(data_fim)
        except ValueError:
            pass

    atendimentos = atendimento_repo.list_all(filters=filters)
    return [
        {
            "id": a.id,
            "empresa": a.empresa,
            "nome": a.nome,
            "modalidade": a.modalidade,
            "data": a.data.strftime("%d/%m/%Y") if a.data else "",
            "hora": a.hora.strftime("%H:%M") if a.hora else "",
            "status": a.status,
            "has_laudo": a.has_laudo,
            "has_avaliacao": a.has_avaliacao,
        }
        for a in atendimentos
    ]


# ─────────────────────────────────────────────────────────────
# Upload / Arquivos Endpoints
# ─────────────────────────────────────────────────────────────


@api_router.get("/arquivos", tags=["Upload"])
async def list_arquivos(current_user: dict = Depends(get_current_user)):
    """Lista todos os arquivos (PDFs) armazenados no banco."""
    arquivos = arquivo_repo.list_all()
    return [
        {
            "id": a.id,
            "filename": a.filename,
            "content_type": a.content_type,
            "size": a.size,
            "size_kb": round(a.size / 1024, 1),
            "criado_em": a.criado_em.isoformat() if a.criado_em else None,
        }
        for a in arquivos
    ]


@api_router.post("/arquivos", tags=["Upload"])
async def upload_arquivo(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    """Faz upload de um PDF para o banco de dados."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="Nome do arquivo inválido.")

    content = await file.read()
    if len(content) > 50 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Arquivo excede o limite de 50MB.")

    content_type = file.content_type or "application/pdf"
    file_id = arquivo_repo.save(
        filename=file.filename,
        content=content,
        content_type=content_type,
    )
    if not file_id:
        raise HTTPException(status_code=500, detail="Falha ao salvar arquivo.")

    return {"id": file_id, "filename": file.filename, "size": len(content), "mensagem": "Arquivo salvo com sucesso."}


@api_router.delete("/arquivos/{file_id}", tags=["Upload"])
async def delete_arquivo(
    file_id: int,
    current_user: dict = Depends(get_current_user),
):
    """Remove um arquivo do banco."""
    success = arquivo_repo.delete(file_id)
    if not success:
        raise HTTPException(status_code=404, detail="Arquivo não encontrado.")
    return {"mensagem": "Arquivo removido com sucesso."}


# ─────────────────────────────────────────────────────────────
# Configurações Endpoints
# ─────────────────────────────────────────────────────────────


@api_router.get("/configuracoes", tags=["Configurações"])
async def get_configuracoes(current_user: dict = Depends(get_current_user)):
    """Retorna todas as configurações da clínica."""
    config = clinic_config_repo.get_all_clinic_data()
    # Busca usuário logado para dados do perfil
    username = current_user.get("sub", "")
    user = user_repo.find_by_username(username)
    return {
        "clinica": config,
        "usuario": {
            "id": user.id if user else None,
            "username": user.username if user else username,
            "display_name": user.display_name if user else "",
            "email": user.email if user else "",
            "role": user.role if user else "admin",
            "created_at": user.created_at.isoformat() if user and user.created_at else None,
            "last_login": user.last_login.isoformat() if user and user.last_login else None,
        },
    }


@api_router.put("/configuracoes", tags=["Configurações"])
async def update_configuracoes(
    body: ConfigClinicaUpdate,
    current_user: dict = Depends(get_current_user),
):
    """Salva configurações da clínica."""
    data = {k: v for k, v in body.model_dump().items() if v is not None}
    if not data:
        return {"mensagem": "Nenhuma configuração para salvar."}
    success = clinic_config_repo.save_clinic_data(data)
    if not success:
        raise HTTPException(status_code=500, detail="Erro ao salvar configurações.")
    return {"mensagem": "Configurações salvas com sucesso.", "campos_salvos": list(data.keys())}



@api_router.post("/configuracoes/photo", tags=["Configurações"])
async def upload_config_photo(
    field: str = Form(...),
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    """Faz upload de imagem (logo ou foto do usuário) e salva como data-uri na configuração."""
    if field not in ("user_photo", "clinic_logo"):
        raise HTTPException(status_code=400, detail="Campo inválido. Use 'user_photo' ou 'clinic_logo'.")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Arquivo vazio.")

    try:
        b64 = base64.b64encode(content).decode("utf-8")
        data_uri = f"data:{file.content_type};base64,{b64}"
        key = CLINIC_PREF_USER_PHOTO if field == "user_photo" else CLINIC_PREF_LOGO
        ok = clinic_config_repo.save_clinic_data({key: data_uri})
        if not ok:
            raise HTTPException(status_code=500, detail="Falha ao salvar imagem.")
        return {"mensagem": "Imagem salva com sucesso.", "field": field}
    except Exception as e:
        logger.error(f"Erro ao salvar imagem de configuração: {e}")
        raise HTTPException(status_code=500, detail="Erro interno ao processar a imagem.")



@api_router.post("/pacientes/{slug}/photo", tags=["Pacientes"])
async def upload_paciente_photo(
    slug: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    """Faz upload de foto de paciente e salva em preferences como data-uri."""
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Arquivo vazio.")
    try:
        b64 = base64.b64encode(content).decode("utf-8")
        data_uri = f"data:{file.content_type};base64,{b64}"
        key = f"patient_photo:{slug}"
        ok = preferences_repo.save(key, data_uri)
        if not ok:
            raise HTTPException(status_code=500, detail="Falha ao salvar imagem.")
        return {"mensagem": "Foto do paciente salva com sucesso.", "slug": slug}
    except Exception as e:
        logger.error(f"Erro ao salvar foto de paciente {slug}: {e}")
        raise HTTPException(status_code=500, detail="Erro interno ao processar a imagem.")


@api_router.get("/pacientes/{slug}/photo", tags=["Pacientes"])
async def get_paciente_photo(slug: str, current_user: dict = Depends(get_current_user)):
    key = f"patient_photo:{slug}"
    photo = preferences_repo.get(key, None)
    return {"photo": photo}


@api_router.get("/auditoria", tags=["Configurações"])
async def get_auditoria(
    limit: int = 50,
    current_user: dict = Depends(get_current_user),
):
    """Retorna o log de auditoria do sistema."""
    entradas = auditoria_repo.listar(limit=min(limit, 200))
    return [
        {
            "id": e.id,
            "acao": e.acao,
            "entidade": e.entidade,
            "entidade_id": e.entidade_id,
            "detalhes": e.detalhes,
            "usuario": e.usuario,
            "criado_em": e.criado_em.isoformat() if e.criado_em else None,
        }
        for e in entradas
    ]


# ─────────────────────────────────────────────────────────────
# LGPD Endpoints — Consentimento
# ─────────────────────────────────────────────────────────────


@api_router.post(
    "/lgpd/consentimentos",
    response_model=ConsentimentoResponse,
    tags=["LGPD"],
    summary="Registrar consentimento do titular (LGPD Art. 8º)",
)
async def registrar_consentimento(request: Request, body: ConsentimentoCreate):
    """
    Registra o consentimento do titular para tratamento de dados pessoais.
    Armazena data/hora, IP, finalidade e base legal conforme exigido pela LGPD.
    """
    lgpd = get_lgpd_service()
    ip = _get_client_ip(request)
    user_agent = request.headers.get("user-agent", "")

    resultado = lgpd.registrar_consentimento(
        titular_nome=body.titular_nome,
        finalidade=body.finalidade,
        titular_email=body.titular_email,
        base_legal=body.base_legal,
        ip_origem=ip,
        user_agent=user_agent,
    )
    if not resultado["sucesso"]:
        raise HTTPException(status_code=400, detail=resultado.get("erro"))
    return resultado


@api_router.get(
    "/lgpd/consentimentos/{email}",
    tags=["LGPD"],
    summary="Consultar consentimentos do titular (Art. 18, I - Direito de acesso)",
)
async def consultar_consentimentos(email: str, current_user: dict = Depends(get_current_user)):
    """
    Retorna todos os consentimentos registrados para um e-mail.
    Requer autenticação (operador ou o próprio titular via token).
    """
    lgpd = get_lgpd_service()
    registros = lgpd.buscar_consentimentos(email)
    return {"email": email, "total": len(registros), "consentimentos": registros}


@api_router.delete(
    "/lgpd/consentimentos/{email}",
    tags=["LGPD"],
    summary="Revogar consentimento (LGPD Art. 8º, §5º)",
)
async def revogar_consentimento(email: str, current_user: dict = Depends(get_current_user)):
    """
    Revoga todos os consentimentos ativos de um titular.
    O consentimento pode ser revogado a qualquer momento (LGPD Art. 8º, §5º).
    """
    lgpd = get_lgpd_service()
    return lgpd.revogar_consentimento(email)


# ─────────────────────────────────────────────────────────────
# LGPD Endpoints — Direitos do Titular
# ─────────────────────────────────────────────────────────────


@api_router.get(
    "/lgpd/titulares/{email}/dados",
    tags=["LGPD"],
    summary="Portabilidade de dados (Art. 18, V)",
)
async def exportar_dados_titular(
    email: str,
    nome: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
):
    """
    Exporta todos os dados pessoais do titular em formato estruturado (JSON).
    Implementa o Direito à Portabilidade (LGPD Art. 18, V).
    """
    lgpd = get_lgpd_service()
    return lgpd.exportar_dados_titular(email=email, nome=nome)


@api_router.post(
    "/lgpd/titulares/esquecimento",
    response_model=EsquecimentoResponse,
    tags=["LGPD"],
    summary="Direito ao esquecimento / eliminação (Art. 18, VI)",
)
async def executar_esquecimento(
    body: EsquecimentoRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Remove permanentemente todos os dados pessoais do titular.
    Implementa o Direito ao Esquecimento (LGPD Art. 18, VI).

    ATENÇÃO: Operação IRREVERSÍVEL. Requer confirmação explícita.
    """
    if body.confirmacao != "CONFIRMO_EXCLUSAO_PERMANENTE":
        raise HTTPException(
            status_code=400,
            detail="Confirmação inválida. Envie confirmacao='CONFIRMO_EXCLUSAO_PERMANENTE'.",
        )
    lgpd = get_lgpd_service()
    return lgpd.executar_esquecimento(email=body.email, nome=body.nome)


# ─────────────────────────────────────────────────────────────
# LGPD Info Pública (sem autenticação)
# ─────────────────────────────────────────────────────────────


@api_router.get(
    "/lgpd/info",
    tags=["LGPD"],
    summary="Informações LGPD públicas (DPO, bases legais)",
)
async def info_lgpd():
    """
    Retorna informações públicas sobre o tratamento de dados:
    DPO, bases legais, finalidades e como exercer direitos.
    """
    lgpd = get_lgpd_service()
    return {
        "controlador": os.getenv("APP_NAME", "Clínica IA"),
        "dpo": lgpd.info_dpo(),
        "bases_legais": lgpd.bases_legais(),
        "direitos_titulares": {
            "acesso": "GET /api/lgpd/titulares/{email}/dados",
            "portabilidade": "GET /api/lgpd/titulares/{email}/dados",
            "revogacao": "DELETE /api/lgpd/consentimentos/{email}",
            "esquecimento": "POST /api/lgpd/titulares/esquecimento",
        },
        "lei": "LGPD — Lei nº 13.709/2018",
        "anpd": "https://www.gov.br/anpd",
    }


# ─────────────────────────────────────────────────────────────
# Health Check
# ─────────────────────────────────────────────────────────────


@api_router.get("/health", tags=["Sistema"])
async def health_check():
    """Health check público."""
    return {"status": "ok", "version": "2.1.0"}


# ─────────────────────────────────────────────────────────────
# Registro do router
# ─────────────────────────────────────────────────────────────

app.include_router(api_router)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
