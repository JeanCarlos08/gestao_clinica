# Gestão Clínica (Vercel + Render)

Estrutura simplificada para produção:

- `frontend/`: Next.js 14 (deploy na Vercel)
- `backend/`: FastAPI (deploy no Render)
- Banco: PostgreSQL via `DATABASE_URL`

## Infraestrutura alvo

- Frontend: Vercel com `Root Directory = frontend`
- Backend: Render Web Service usando `backend/Dockerfile`
- Comunicação: frontend chama `/api/*` e o rewrite aponta para o backend

## Variáveis obrigatórias

### Render (backend)

- `DATABASE_URL`
- `APP_SECRET_KEY`
- `JWT_SECRET_KEY`
- `APP_ADMIN_USER`
- `APP_ADMIN_PASS`
- `ALLOWED_ORIGINS`

### Render (IA / laudos)

- `GOOGLE_API_KEY`
- `GEMINI_MODEL` (opcional, padrão: `gemini-2.5-flash`)
- `GEMINI_FALLBACK_MODELS` (opcional, csv)
- `GOOGLE_DOCS_TEMPLATE_ID` (se usar laudos)
- `GOOGLE_SERVICE_ACCOUNT_JSON_B64` (se usar laudos)
- `CREDENTIALS_SOURCE=env` (se usar laudos)

### Vercel (frontend)

- `BACKEND_API_URL=https://SEU-BACKEND-RENDER`
- `NEXT_PUBLIC_API_URL` opcional

## Execução local

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn src.infrastructure.api.index:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Upload de fotos

- Configuração (logo/foto do usuário): `POST /api/configuracoes/photo`
- Paciente: `POST /api/pacientes/{slug}/photo`

Observação: imagens são salvas em base64 em `user_preferences`.
