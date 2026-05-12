import uvicorn
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from datetime import timedelta

from config import settings
from database.user_repositories import user_repo
from database.repositories import atendimento_repo
from utils.helpers import verify_password
from services.security import create_access_token, verify_access_token

app = FastAPI(title="Clínica IA API", version="2.0.0")

# ── Configuração de CORS (Segurança para o Navegador) ──────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Em produção, mudaremos para o domínio da Vercel
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# ── Dependência de Autenticação ───────────────────────────────
async def get_current_user(token: str = Depends(oauth2_scheme)):
    payload = verify_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido ou expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return payload

# ── Rotas da API ─────────────────────────────────────────────

@app.post("/token")
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    """
    Endpoint de login que gera o Token JWT.
    """
    user = user_repo.find_by_username(form_data.username)
    if not user:
        # Fallback para o admin do .env se não houver no banco
        if form_data.username == settings.auth_username and settings.auth_password:
            if verify_password(form_data.password, settings.auth_password):
                access_token = create_access_token(data={"sub": form_data.username, "role": "admin"})
                return {"access_token": access_token, "token_type": "bearer"}
        
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuário ou senha incorretos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    stored_hash = user_repo.get_password_hash(user.username)
    if not verify_password(form_data.password, stored_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuário ou senha incorretos",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(data={"sub": user.username, "role": user.role})
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/atendimentos")
async def list_atendimentos(current_user: dict = Depends(get_current_user)):
    """
    Lista todos os atendimentos do banco de dados (Protegido).
    """
    atendimentos_raw = atendimento_repo.list_all(limit=100)
    
    # Converte objetos do Python (date, time) para string para o JSON não quebrar
    atendimentos_serializaveis = []
    for a in atendimentos_raw:
        atendimentos_serializaveis.append({
            "id": a.id,
            "empresa": a.empresa,
            "nome": a.nome,
            "modalidade": a.modalidade,
            "data": a.data.strftime("%d/%m/%Y") if a.data else "",
            "hora": a.hora.strftime("%H:%M") if a.hora else "",
            "status": a.status
        })
    
    return atendimentos_serializaveis


@app.get("/stats")
async def get_stats(current_user: dict = Depends(get_current_user)):
    """
    Retorna as estatísticas do dashboard (Protegido).
    """
    stats = atendimento_repo.get_stats()
    return stats

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
