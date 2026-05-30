# Security Setup - Google Cloud & LGPD Compliance

Este guia detalha as três recomendações operacionais urgentes para segurança em produção.

## 1. Habilitar Cloud Audit Logs

O Cloud Audit Logs registra todas as ações em recursos do Google Cloud para conformidade LGPD/regulatória.

### Passo a Passo no Console GCP

1. **Abra o Console Google Cloud**
   - Acesse: https://console.cloud.google.com
   - Selecione seu **Project ID**

2. **Navegue para Audit Logs**
   - Menu lateral → **IAM & Admin** → **Audit Logs**

3. **Configure Admin Activity Logs (automático)**
   - Já vem habilitado por padrão.
   - Registra: criação/exclusão de Service Accounts, mudanças de roles, etc.

4. **Habilite Data Access Logs** (recomendado)
   - Tabela à direita → Procure por "Google Docs API"
   - Clique em "Google Docs API"
   - Marque **Data Read** e **Data Write** (opcional: Admin Activity já fica marcado)
   - Clique **SAVE**

5. **Habilite System Event Logs** (opcional)
   - Procure por "Google Drive API"
   - Marque **Data Read** e **Data Write**
   - Clique **SAVE**

6. **Visualize Logs**
   - Menu lateral → **Logging** → **Logs Explorer**
   - Filtro: `resource.type="service_account"`
   - Visualize eventos de acesso/criação

### Verificar Configuração

```bash
# Listar projetos
gcloud projects list

# Verificar Cloud Logging ativo
gcloud logging sinks list --project=SEU_PROJECT_ID
```

---

## 2. Restringir a Service Account (Least Privilege)

A conta de serviço deve ter **apenas** os papéis necessários para criar/editar documentos Google Docs.

### Papéis Recomendados

| Papel | Permissões | Necessário |
|-------|-----------|-----------|
| `roles/drive.file` | Criar/editar arquivos no Drive | ✅ SIM (mínimo) |
| `roles/docs.editor` | Editar documentos (opcional) | ⚠️ OPCIONAL |
| `roles/drive.viewer` | Apenas visualizar | ❌ NÃO |
| `roles/editor` | Acesso total (EVITAR) | ❌ NUNCA |

### Passo a Passo no Console

1. **Abra o Console Google Cloud**
   - Acesse: https://console.cloud.google.com
   - Projeto → seu projeto

2. **Navegue para Service Accounts**
   - Menu lateral → **IAM & Admin** → **Service Accounts**
   - Clique no email da sua conta de serviço

3. **Remova Roles Desnecessários**
   - Aba **Permissions** (ou **IAM & Admin**)
   - Para cada role que NÃO é necessária, clique no `X` para remover
   - Confirme remoção

4. **Adicione Role Mínimo**
   - Botão **Grant Access** ou **ADD ROLE**
   - Procure: `roles/drive.file`
   - Clique **ADD ROLE**
   - Clique **SAVE**

5. **Teste Acesso**
   - Verifique em **Credentials** que a conta tem `roles/drive.file`
   - Teste a conexão: `python app_laudos_local.py`

### Verificar via gcloud CLI

```bash
# Listar papéis da conta de serviço
gcloud projects get-iam-policy SEU_PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:NOME@SEU_PROJECT_ID.iam.gserviceaccount.com"

# Remover um papel
gcloud projects remove-iam-policy-binding SEU_PROJECT_ID \
  --member="serviceAccount:NOME@SEU_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/editor"

# Adicionar papel mínimo
gcloud projects add-iam-policy-binding SEU_PROJECT_ID \
  --member="serviceAccount:NOME@SEU_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/drive.file"
```

---

## 3. Migrar Credenciais para Secret Manager

### Opção A: Google Secret Manager (Recomendado para Produção)

Armazena o JSON de credenciais criptografado no Google Secret Manager, sem arquivo local.

#### Passo a Passo

1. **Habilite Secret Manager API**
   - Menu lateral → **APIs & Services** → **ENABLE APIS AND SERVICES**
   - Procure: "Secret Manager API"
   - Clique **ENABLE**

2. **Crie um Secret**
   - Menu lateral → **Security** → **Secret Manager**
   - Botão **CREATE SECRET**
   - Nome: `google-docs-sa-key`
   - Secret value: Copie todo o conteúdo do arquivo `credentials.json`
   - Clique **CREATE SECRET**

3. **Conceda Acesso à Conta de Serviço**
   - Clique no secret criado
   - Aba **PERMISSIONS** → **Grant Access**
   - Selecione: sua conta de serviço
   - Role: `roles/secretmanager.secretAccessor`
   - Clique **SAVE**

4. **Configure Aplicação**
   - No seu projeto, defina variáveis de ambiente:
   ```bash
   export GOOGLE_CLOUD_PROJECT=SEU_PROJECT_ID
   export GOOGLE_SECRET_NAME=google-docs-sa-key
   export CREDENTIALS_SOURCE=secret_manager  # ou 'local' / 'env'
   ```

5. **Teste Acesso**
   ```bash
   python app_laudos_local.py
   ```

#### Verificar via gcloud

```bash
# Listar secrets
gcloud secrets list --project=SEU_PROJECT_ID

# Ler um secret (para testes)
gcloud secrets versions access latest --secret="google-docs-sa-key" \
  --project=SEU_PROJECT_ID

# Verificar permissões
gcloud secrets get-iam-policy google-docs-sa-key \
  --project=SEU_PROJECT_ID
```

### Opção B: Variável de Ambiente (Mais Simples, Menos Segura)

Codifique o JSON em base64 e passe como variável de ambiente.

```bash
# Encode o JSON
base64 -w 0 credentials.json > creds.b64

# Em produção (Vercel, Cloud Run, etc.):
# GOOGLE_SERVICE_ACCOUNT_JSON_B64=$(cat creds.b64)

# Na aplicação:
import base64
import json
from pathlib import Path

json_b64 = os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON_B64")
if json_b64:
    creds_json = base64.b64decode(json_b64).decode()
    creds_dict = json.loads(creds_json)
    # usar creds_dict
```

### Opção C: Arquivo Local (Desenvolvimento Apenas)

Mantenha `credentials.json` local para testes, **nunca** commite.

```bash
# Já configurado em .gitignore
# Apenas certifique-se:
grep "credentials.json" .gitignore
chmod 600 credentials.json
```

---

## Fluxo de Carregamento de Credenciais (Implementado)

O código agora tenta carregar credenciais nesta ordem:

1. **Secret Manager** (se `CREDENTIALS_SOURCE=secret_manager`)
2. **Arquivo Local** (`./credentials.json`)
3. **Variável de Ambiente** (`GOOGLE_SERVICE_ACCOUNT_JSON_B64`)
4. **Falha** com mensagem clara

```python
# No seu código, use:
from services.credentials_loader import load_credentials

creds = load_credentials()
```

---

## Resumo de Segurança

| Item | Desenvolvimento | Produção |
|------|-----------------|----------|
| Credenciais | Arquivo local (`credentials.json`, chmod 600) | Secret Manager |
| Audit Logs | Não necessário | ✅ Habilitado |
| Service Account | `roles/drive.file` | ✅ `roles/drive.file` (mínimo) |
| `.env` | Local, não commitado | Variáveis de ambiente do servidor |
| `credentials.json` | ❌ NÃO comitar | Secret Manager |

---

## Comandos Rápidos

### Para Desenvolvimento Local

```bash
# 1. Permissões seguras
./scripts/secure_credentials.sh

# 2. Verificar logs locais
tail -f logs/audit.log

# 3. Testar aplicação
python app_laudos_local.py
```

### Para Produção (Google Cloud Run / Vercel)

```bash
# 1. Upload do secret
gcloud secrets create google-docs-sa-key --data-file=credentials.json

# 2. Configurar deploy
export CREDENTIALS_SOURCE=secret_manager
export GOOGLE_CLOUD_PROJECT=seu-projeto

# 3. Deploy
gcloud run deploy gestao-clinica \
  --set-env-vars="CREDENTIALS_SOURCE=secret_manager,GOOGLE_CLOUD_PROJECT=seu-projeto"
```

---

## Checklist LGPD

- [ ] Cloud Audit Logs habilitado
- [ ] Service Account restringido a `roles/drive.file`
- [ ] Credenciais em Secret Manager (produção) ou arquivo local protegido (desenvolvimento)
- [ ] `.gitignore` configurado com `credentials.json` e `logs/`
- [ ] Permissões do arquivo: `chmod 600 credentials.json`
- [ ] Git hooks instalados para evitar commits acidentais
- [ ] Testes de acesso ao Secret Manager realizados
- [ ] Documentação de retenção de dados e direitos dos titulares concluída

---

## Referências

- [Google Secret Manager Docs](https://cloud.google.com/secret-manager/docs)
- [Cloud Audit Logs Docs](https://cloud.google.com/logging/docs/audit)
- [Service Account Roles](https://cloud.google.com/iam/docs/understanding-service-accounts)
- [LGPD - Lei Geral de Proteção de Dados](https://www.gov.br/cidadania/pt-br/acesso-a-informacao/lgpd)
