# 🔐 Guia de Segurança e Carregamento de Credenciais

## Resumo Rápido

O sistema implementa **carregamento inteligente de credenciais** com fallback automático:

1. **Secret Manager** (Google Cloud) — Recomendado para produção
2. **Arquivo Local** (`credentials.json`) — Para desenvolvimento
3. **Variável de Ambiente** (base64 ou JSON) — Alternativa simples

---

## 📋 Para Desenvolvimento Local

### Setup Inicial

1. **Copie seu Service Account JSON para a raiz:**
   ```bash
   cp ~/Downloads/seu-arquivo.json credentials.json
   chmod 600 credentials.json
   ```

2. **Instale dependências:**
   ```bash
   pip install -r backend/requirements.txt
   ```

3. **Verifique carregamento:**
   ```bash
   python -c "from services.credentials_loader import load_credentials; load_credentials(); print('✓ OK')"
   ```

4. **Configure `.env`:**
   ```bash
   cp .env.example .env
   # Edite: GOOGLE_DOCS_TEMPLATE_ID=seu-id
   ```

5. **Teste aplicação:**
   ```bash
   python app_laudos_local.py
   # ou
   python -m streamlit run app_laudos_local.py
   ```

### Proteger Credenciais

```bash
# Automaticamente via script
./scripts/secure_credentials.sh

# Ou manualmente
chmod 600 credentials.json
```

### Instalar Git Hooks (Evita Commits Acidentais)

```bash
./scripts/install_git_hooks.sh
# Isso previne commits de credentials.json mesmo que você esqueça
```

---

## 🚀 Para Produção (Google Cloud)

### 1. Habilitar Secret Manager

```bash
# Habilitar API
gcloud services enable secretmanager.googleapis.com --project=SEU_PROJECT_ID

# Criar secret
gcloud secrets create google-docs-sa-key \
  --data-file=credentials.json \
  --project=SEU_PROJECT_ID

# Conceder acesso à sua conta de serviço
gcloud secrets add-iam-policy-binding google-docs-sa-key \
  --member="serviceAccount:SEU-SA@SEU_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" \
  --project=SEU_PROJECT_ID
```

### 2. Configurar Deploy

**Cloud Run:**
```bash
gcloud run deploy gestao-clinica \
  --set-env-vars "CREDENTIALS_SOURCE=secret_manager,GOOGLE_CLOUD_PROJECT=SEU_PROJECT_ID,GOOGLE_SECRET_NAME=google-docs-sa-key" \
  --project=SEU_PROJECT_ID
```

**Vercel:**
1. Adicione variáveis de ambiente no painel Vercel:
   - `CREDENTIALS_SOURCE=secret_manager`
   - `GOOGLE_CLOUD_PROJECT=seu-project-id`
   - `GOOGLE_SECRET_NAME=google-docs-sa-key`
   - `GOOGLE_APPLICATION_CREDENTIALS=/tmp/creds.json` (opcional)

2. Ou use variável de ambiente base64:
   ```bash
   cat credentials.json | base64 -w 0 > creds.b64
   # Copie conteúdo de creds.b64 para GOOGLE_SERVICE_ACCOUNT_JSON_B64 no Vercel
   ```

### 3. Habilitar Cloud Audit Logs

```bash
# Habilitar Data Access logs para Google Docs API
gcloud logging sinks create audit-sink logging.googleapis.com/projects/SEU_PROJECT_ID/logs \
  --log-filter='resource.type="api"' \
  --project=SEU_PROJECT_ID
```

### 4. Restringir Service Account

```bash
# Ver papéis atuais
gcloud projects get-iam-policy SEU_PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:*"

# Remover papéis desnecessários
gcloud projects remove-iam-policy-binding SEU_PROJECT_ID \
  --member="serviceAccount:SEU-SA@SEU_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/editor"

# Adicionar apenas papél mínimo necessário
gcloud projects add-iam-policy-binding SEU_PROJECT_ID \
  --member="serviceAccount:SEU-SA@SEU_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/drive.file"
```

---

## 🔄 Como Funciona o Carregamento

### Diagrama de Fluxo

```
load_credentials()
  ├─ if CREDENTIALS_SOURCE == 'secret_manager' or 'auto'
  │  └─ _load_from_secret_manager()
  │     └─ if success: return creds_dict
  │     └─ else: continue
  │
  ├─ if CREDENTIALS_SOURCE == 'local' or 'auto'
  │  └─ _load_from_file()
  │     └─ if credentials.json exists: return creds_dict
  │     └─ else: continue
  │
  ├─ if CREDENTIALS_SOURCE == 'env' or 'auto'
  │  └─ _load_from_env()
  │     └─ if GOOGLE_SERVICE_ACCOUNT_JSON_B64 or GOOGLE_SERVICE_ACCOUNT_JSON: return creds_dict
  │     └─ else: continue
  │
  └─ raise ValueError("Sem fonte de credenciais!")
```

### Prioridades por `CREDENTIALS_SOURCE`

| Valor | Prioridade | Uso |
|-------|-----------|-----|
| `secret_manager` | Only Secret Manager | Produção GCP |
| `local` | Only arquivo local | Desenvolvimento |
| `env` | Only variável de ambiente | CI/CD, Vercel |
| `auto` (default) | SM → arquivo → env | Flexível, recomendado |

---

## 🛡️ Checklist de Segurança

### Local
- [ ] `credentials.json` com permissões 600
- [ ] `credentials.json` em `.gitignore`
- [ ] Git hooks instalados (evita commits acidentais)
- [ ] Teste de carregamento passou
- [ ] `.env` local configurado (não commitado)

### GCP
- [ ] Cloud Audit Logs habilitado
- [ ] Service Account com `roles/drive.file` (mínimo)
- [ ] Secret Manager criado e acessível
- [ ] Permissões de Secret Manager configuradas
- [ ] Cloud Run / Vercel com variáveis corretas

---

## 🧪 Testes

### Unitários
```bash
pytest tests/test_credentials_loader.py -v
```

### Manual
```bash
# Testar carregamento local
python -c "from services.credentials_loader import load_credentials; c = load_credentials(); print(c['project_id'])"

# Testar em Secret Manager
export CREDENTIALS_SOURCE=secret_manager
export GOOGLE_CLOUD_PROJECT=seu-projeto
python -c "from services.credentials_loader import load_credentials; c = load_credentials(); print(c['project_id'])"

# Testar via variável de ambiente
export GOOGLE_SERVICE_ACCOUNT_JSON_B64=$(cat credentials.json | base64 -w 0)
python -c "from services.credentials_loader import load_credentials; c = load_credentials(); print(c['project_id'])"
```

---

## 🆘 Troubleshooting

### Erro: "Não foi possível carregar credenciais"
1. Verificar se `credentials.json` existe no root
2. Ou definir `CREDENTIALS_SOURCE=secret_manager` e verificar acesso
3. Ou definir `GOOGLE_SERVICE_ACCOUNT_JSON_B64` e verificar base64

### Erro: "google.auth.exceptions.DefaultCredentialsError"
1. Pode ser erro de autenticação ao acessar Secret Manager
2. Executar: `gcloud auth application-default login`
3. Ou passar `GOOGLE_APPLICATION_CREDENTIALS=/caminho/para/sa.json`

### Secret Manager não encontrado
1. Verificar se API está habilitada:
   ```bash
   gcloud services list --enabled --project=SEU_PROJECT_ID | grep secretmanager
   ```
2. Se não, habilitar:
   ```bash
   gcloud services enable secretmanager.googleapis.com --project=SEU_PROJECT_ID
   ```

### Permissão negada ao acessar Secret Manager
1. Verificar se Service Account tem `roles/secretmanager.secretAccessor`:
   ```bash
   gcloud secrets get-iam-policy google-docs-sa-key --project=SEU_PROJECT_ID
   ```
2. Se não, conceder:
   ```bash
   gcloud secrets add-iam-policy-binding google-docs-sa-key \
     --member="serviceAccount:SEU-SA@SEU_PROJECT_ID.iam.gserviceaccount.com" \
     --role="roles/secretmanager.secretAccessor" \
     --project=SEU_PROJECT_ID
   ```

---

## 📚 Documentos Relacionados

- [SECURITY_SETUP.md](SECURITY_SETUP.md) — Guia completo de segurança
- [QUICK_SECURITY_CHECKLIST.md](QUICK_SECURITY_CHECKLIST.md) — Checklist rápido
- [PRIVACY_POLICY.md](PRIVACY_POLICY.md) — Política de privacidade
- [.env.example](.env.example) — Variáveis de ambiente

---

## 💡 Boas Práticas

1. **Desenvolvimento Local:** Use `credentials.json` protegido (chmod 600)
2. **Produção:** Use Secret Manager (nunca arquivo direto)
3. **CI/CD:** Use variável de ambiente base64 (cifrada no repo)
4. **Git:** Sempre adicione `credentials.json` ao `.gitignore`
5. **Hooks:** Instale git hooks para evitar commits acidentais
6. **Auditoria:** Ative Cloud Audit Logs para todas as ações
7. **Least Privilege:** Restrinja Service Account ao mínimo necessário
