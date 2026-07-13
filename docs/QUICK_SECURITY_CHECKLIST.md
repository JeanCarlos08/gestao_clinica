# Checklist Rápido - Segurança & LGPD

## ✅ Ações Locais (Faça AGORA)

### 1. Proteger credenciais locais
```bash
./scripts/secure_credentials.sh
# ou manual:
chmod 600 credentials.json
```

### 2. Instalar git hooks (evita commits acidentais)
```bash
./scripts/install_git_hooks.sh
```

### 3. Instalar pacote Secret Manager (opcional, para produção)
```bash
pip install -r backend/requirements.txt
# ou só o pacote:
pip install google-cloud-secret-manager
```

### 4. Testar carregamento de credenciais
```bash
python -c "from services.credentials_loader import load_credentials; creds = load_credentials(); print('✓ Credenciais carregadas com sucesso')"
```

---

## 📋 Ações no Console GCP

### Passo 1: Habilitar Cloud Audit Logs
- [ ] Abrir: https://console.cloud.google.com → seu projeto
- [ ] Menu: IAM & Admin → Audit Logs
- [ ] Procure: "Google Docs API"
- [ ] Marque: **Data Read** e **Data Write**
- [ ] Clique: **SAVE**
- [ ] ✓ Pronto!

### Passo 2: Restringir Service Account (Least Privilege)
- [ ] Menu: IAM & Admin → Service Accounts
- [ ] Clique no email da sua conta
- [ ] Aba: Permissions (ou IAM)
- [ ] **Remova**: qualquer papel que NÃO seja necessário
- [ ] **Adicione**: `roles/drive.file` (se não tiver)
- [ ] ✓ Pronto!

### Passo 3: Habilitar Secret Manager (Produção)
- [ ] Menu: APIs & Services → ENABLE APIS
- [ ] Procure: "Secret Manager API"
- [ ] Clique: **ENABLE**
- [ ] Menu: Security → Secret Manager
- [ ] Botão: **CREATE SECRET**
  - Nome: `google-docs-sa-key`
  - Secret value: copiar conteúdo de `credentials.json`
  - Clique: **CREATE SECRET**
- [ ] Clique no secret criado
- [ ] Aba: PERMISSIONS → Grant Access
  - Service Account: sua conta de serviço
  - Role: `roles/secretmanager.secretAccessor`
  - Clique: **SAVE**
- [ ] ✓ Pronto!

---

## 🚀 Deployment (Com Secret Manager)

### Configurar variáveis de ambiente:
```bash
export CREDENTIALS_SOURCE=secret_manager
export GOOGLE_CLOUD_PROJECT=seu-project-id
export GOOGLE_SECRET_NAME=google-docs-sa-key
```

### Testar:
```bash
python app_laudos_local.py
# Deve mostrar: ✓ Credenciais carregadas do Secret Manager
```

---

## 🔒 Segurança Local (Desenvolvimento)

Mantém `credentials.json` protegido:
- ✅ Arquivo com permissões 600 (`-rw-------`)
- ✅ Adicionado a `.gitignore`
- ✅ Git hook bloqueia commits acidentais
- ✅ Aplicação avisa se permissões estão inseguras

---

## 📊 Verificar Configuração

### Listar projetos GCP:
```bash
gcloud projects list
```

### Ver Service Account roles:
```bash
gcloud projects get-iam-policy SEU_PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:*@*.iam.gserviceaccount.com"
```

### Ver Cloud Audit Logs:
```bash
gcloud logging read "resource.type=google.docs" \
  --limit 10 --project=SEU_PROJECT_ID
```

### Acessar Secret Manager:
```bash
gcloud secrets list --project=SEU_PROJECT_ID
gcloud secrets versions access latest --secret="google-docs-sa-key" \
  --project=SEU_PROJECT_ID | head -20
```

---

## 📚 Referências

- [SECURITY_SETUP.md](SECURITY_SETUP.md) — Guia completo
- [.env.example](.env.example) — Variáveis de ambiente
- [audit.log](logs/audit.log) — Logs de auditoria local
- [PRIVACY_POLICY.md](PRIVACY_POLICY.md) — Política de privacidade
- [CONSENT_TEMPLATE.md](CONSENT_TEMPLATE.md) — Termo de consentimento

---

## ❓ Dúvidas?

Ver documentação:
- Arquivo local: `credentials.json` + `chmod 600` (desenvolvimento)
- Secret Manager: variáveis `CREDENTIALS_SOURCE=secret_manager` (produção)
- Env var: `GOOGLE_SERVICE_ACCOUNT_JSON_B64` (base64, mais simples)

Código aplica em ordem: Secret Manager → Arquivo local → Env var → Erro claro
