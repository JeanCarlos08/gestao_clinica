# 🧠 mvpdepsicologia — Sistema de Gestão Clínica Ocupacional

> Sistema SaaS modular para gestão de atendimentos clínicos ocupacionais.  
> Construído com Streamlit, PostgreSQL, Google Gemini AI, n8n e Google Docs.

---

## 🚀 Início Rápido

### 1. Pré-requisitos
- Python 3.11+
- PostgreSQL (ou banco cloud: Neon, Supabase, Railway)
- Opcional: Google API Key (Gemini AI), n8n Cloud

### 2. Instalação

```bash
# 1. Clonar e entrar no diretório
cd JULIANA_MVP

# 2. Criar ambiente virtual
python -m venv venv
source venv/bin/activate   # Linux/Mac
# venv\Scripts\activate   # Windows

# 3. Instalar dependências
pip install -r requirements.txt

# 4. Configurar variáveis de ambiente
cp .env.example .env
# Edite o .env com suas credenciais

# 5. Rodar
streamlit run app.py
```

### 3. Configuração mínima (`.env`)

```env
DATABASE_URL=postgresql://usuario:senha@host:5432/banco?sslmode=require
APP_ADMIN_USER=admin
APP_ADMIN_PASS=sua_senha_aqui
APP_REQUIRE_AUTH=true
```

---

## 🏗️ Arquitetura

```
JULIANA_MVP/
├── app.py                  # Router principal (~90 linhas)
├── config.py               # Settings centralizados
├── database/
│   ├── connection.py       # Conexão PostgreSQL + schema
│   ├── models.py           # Dataclasses tipadas (Atendimento, etc.)
│   ├── repositories.py     # Repository pattern (CRUD)
│   ├── user_models.py      # User, SessionUser, roles
│   └── user_repositories.py # UserRepository + ClinicConfigRepository
├── services/
│   ├── auth_service.py     # Login, logout, roles, permissões
│   ├── ai_service.py       # Google Gemini (análise PDF, pareceres)
│   ├── n8n_service.py      # Webhooks n8n (automações)
│   ├── google_docs_service.py # Google Docs embed
│   ├── pdf_service.py      # Geração PDF/CSV
│   └── whatsapp_service.py # Links wa.me
├── pages/
│   ├── dashboard.py        # Métricas e insights
│   ├── atendimentos.py     # CRUD completo
│   ├── documentos.py       # Google Docs integrado
│   ├── automacoes.py       # n8n + log de auditoria
│   └── configuracoes.py    # 7 seções completas
├── components/
│   ├── sidebar.py          # Navegação lateral
│   ├── cards.py            # Métricas, badges
│   ├── tables.py           # Tabela de atendimentos
│   └── forms.py            # Formulários reutilizáveis
├── utils/
│   ├── constants.py        # Roles, permissões, constantes de domínio
│   ├── validators.py       # Validação pura (sem side effects)
│   ├── helpers.py          # Formatação, hashing, utils
│   └── logger.py           # Logger com rotação de arquivos
└── exceptions/
    └── custom_exceptions.py # Hierarquia de erros por domínio
```

---

## 👥 Sistema de Usuários e Permissões

### Roles disponíveis

| Role | Ícone | Permissões |
|------|-------|------------|
| `admin` | 👑 | Acesso total (CRUD, config, logs, gestão de usuários) |
| `psicologo` | 🧠 | Atendimentos, documentos, automações (view), config (view) |
| `recepcionista` | 📋 | Dashboard, atendimentos (view + create + edit), documentos (view) |

### Criar usuários adicionais
Acesse **Configurações → Perfil → Gestão de Usuários** (requer role `admin`).

---

## 🔧 Integrações

### Google Docs (Fase 1 — Ativa)
- Embed via iframe de documentos públicos
- Configure em: **Configurações → Google Docs**

### n8n Cloud (Automações)
- Webhooks para WhatsApp, relatórios, lembretes
- Configure: `N8N_WEBHOOK_BASE_URL` no `.env`
- Eventos: `atendimento-criado`, `lembrete-agendamento`, `relatorio-semanal`

### Google Gemini AI
- Análise automática de PDFs clínicos
- Geração de pareceres técnicos
- Configure: `GOOGLE_API_KEY` no `.env`

### WhatsApp (Fase 1 — Ativa)
- Links `wa.me` gerados automaticamente em cada atendimento
- Mensagens pré-formatadas de confirmação e lembrete

---

## 🐳 Docker

```bash
# Rodar com Docker Compose (app + n8n local)
docker-compose up -d

# Apenas o app
docker build -t mvpdepsicologia .
docker run -p 8501:8501 --env-file .env mvpdepsicologia
```

---

## 🧪 Testes

```bash
pytest tests/ -v
```

---

## 📋 Roadmap

| Fase | Status | Funcionalidade |
|------|--------|----------------|
| 1 | ✅ **Completo** | CRUD atendimentos, Google Docs embed, WhatsApp links, IA básica |
| 2 | 🔜 Próximo | PostgreSQL cloud (Neon), deploy Streamlit Cloud |
| 3 | 🔜 Futuro | Google Docs API (laudos automáticos), Evolution API WhatsApp |
| 4 | 🔜 Futuro | Multi-tenant SaaS, OAuth, domínio próprio |

---

## 📄 Licença

Projeto privado — uso restrito.
