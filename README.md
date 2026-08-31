# Gestão Clínica

Sistema de gestão clínica full-stack, deploy 100% na **Vercel**.

- **Framework**: Next.js 14 (App Router) — API Routes substituem o antigo backend FastAPI
- **Banco**: PostgreSQL via Neon Serverless (`@neondatabase/serverless`)
- **Auth**: JWT (access + refresh) com `jose` e `bcryptjs`
- **IA**: Google Gemini (`@google/genai`) — diagnósticos, pareceres, chat
- **PWA**: Suporte a instalação com service worker (Workbox)

## Infraestrutura

- **Vercel** (framework `nextjs`) — configuração em `vercel.json`
- Banco Neon (serverless, edge-compatible)

## Variáveis de ambiente obrigatórias

| Variável | Descrição |
|---|---|
| `DATABASE_URL` | Connection string do PostgreSQL (Neon) |
| `APP_SECRET_KEY` | Chave secreta da aplicação |
| `JWT_SECRET_KEY` | Chave para assinar JWT |
| `JWT_REFRESH_SECRET_KEY` | Chave para refresh token |
| `APP_ADMIN_USER` | Login do admin inicial |
| `APP_ADMIN_PASS` | Senha do admin inicial |
| `ALLOWED_ORIGINS` | Origens permitidas (CORS) |
| `NEXT_PUBLIC_API_URL` | URL base da API (opcional, auto-detected) |

### IA / Laudos

| Variável | Descrição |
|---|---|
| `GOOGLE_API_KEY` | Chave da API Gemini |
| `GEMINI_MODEL` | Modelo Gemini (padrão: `gemini-2.5-flash`) |
| `GEMINI_FALLBACK_MODELS` | Modelos fallback (csv, opcional) |
| `GOOGLE_DOCS_TEMPLATE_ID` | Template para geração de laudos |
| `GOOGLE_SERVICE_ACCOUNT_JSON_B64` | Credencial service account (base64) |

### OAuth Social

| Variável | Descrição |
|---|---|
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Login com Google |
| `MICROSOFT_CLIENT_ID` / `MICROSOFT_CLIENT_SECRET` | Login com Microsoft |
| `APPLE_CLIENT_ID` / `APPLE_CLIENT_SECRET` | Login com Apple |
| `NEXT_PUBLIC_APP_URL` | URL pública da aplicação (para callbacks OAuth) |

## Execução local

```bash
npm install
npm run dev
```

## Upload de fotos

- Configuração (logo/foto do usuário): `POST /api/configuracoes/photo`
- Paciente: `POST /api/pacientes/{slug}/photo`

Imagens são salvas em base64 em `user_preferences`.

## Google Docs integration

Para testar a integração com Google Docs:

1. Configure `GOOGLE_SERVICE_ACCOUNT_JSON_B64` com as credenciais da service account (base64).
2. (Opcional) Configure `GOOGLE_DOCS_TEMPLATE_ID` para geração automática de laudos.
3. Crie um documento de teste:

```bash
npx tsx scripts/create_test_doc.ts
```
