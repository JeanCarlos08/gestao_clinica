# 🚀 Como Rodar Localmente (localhost)

## Opção 1️⃣: Streamlit (Recomendado)

### Executar

```bash
# Terminal ativado com venv
cd /media/jean/7AF8AFA7F8AF5FDD/gestao_clinica

# Rodar app Streamlit
streamlit run app_laudos_local.py
```

### Acessar

```
🌐 http://localhost:8501
```

### Funcionalidades

| Aba | O que faz |
|-----|-----------|
| 📝 Teste Rápido | Testar conexão e gerar laudo de teste |
| 🔧 Debug | Ver status de arquivos e variáveis |
| 📊 Configurações | Ver setup e guia de instalação |

---

## Opção 2️⃣: Flask (Mais Leve)

### Instalar Flask

```bash
pip install flask
```

### Executar

```bash
# Terminal ativado com venv
python api_laudos_local.py
```

### Acessar

```
🌐 http://localhost:5000
```

### Interface

- ✨ Formulário bonito e responsivo
- 📝 Preencha os dados do paciente
- 🚀 Clique "Gerar Laudo"
- 🔗 Link automático para Google Docs

---

## 🔧 Antes de Rodar

### 1. Ativar Ambiente Virtual

```bash
cd /media/jean/7AF8AFA7F8AF5FDD/gestao_clinica
source .venv/bin/activate
```

### 2. Instalar Dependências

```bash
pip install -r backend/requirements.txt
```

### 3. Configurar Credenciais

```bash
# Opção A: Copiar arquivo JSON
cp ~/Downloads/seu-credentials.json ./credentials.json

# Opção B: Configurar variável de ambiente
export GOOGLE_SERVICE_ACCOUNT_FILE=/caminho/para/credentials.json
```

### 4. Configurar .env

```env
GOOGLE_DOCS_TEMPLATE_ID=seu_id_do_template_aqui
GOOGLE_SERVICE_ACCOUNT_FILE=./credentials.json (opcional)
```

---

## 📋 Testar Conexão

### Via Streamlit

1. Abra http://localhost:8501
2. Clique em "Teste Rápido"
3. Clique em "🔌 Testar Conexão"
4. Se ✅ OK, está funcionando!

### Via Python Direto

```bash
python -c "from services.google_docs_api import get_google_docs_api; api = get_google_docs_api(); print('✅ Conexão OK!')"
```

---

## 🐛 Erros Comuns

### ❌ "ModuleNotFoundError: No module named 'google'"

**Solução:**
```bash
# Instalar pacotes do Google
pip install google-auth-oauthlib google-auth-httplib2 google-api-python-client
```

### ❌ "GOOGLE_DOCS_TEMPLATE_ID not found"

**Solução:**
1. Abra seu template no Google Docs
2. Na URL: `https://docs.google.com/document/d/[ID]/edit`
3. Copie o ID
4. Cole em `.env`: `GOOGLE_DOCS_TEMPLATE_ID=seu_id`

### ❌ "credentials.json not found"

**Solução:**
1. Vá ao Google Cloud Console
2. Crie Service Account
3. Baixe JSON
4. Coloque em `/media/jean/7AF8AFA7F8AF5FDD/gestao_clinica/credentials.json`

### ❌ "Permission denied"

**Solução:**
1. Verifique se Service Account foi criado
2. Verifique se "Editor" role foi adicionado
3. Verifique se Google Docs API está habilitada

---

## 📊 Verificar Logs

### Streamlit

Logs aparecem no terminal onde você rodou `streamlit run`

### Flask

Logs aparecem no terminal onde você rodou `python api_laudos_local.py`

---

## 🎯 Fluxo Completo

```
1. Ativar venv
2. Rodar app (Streamlit ou Flask)
3. Preencher dados do paciente
4. Clicar "Gerar Laudo"
5. Laudo é criado no Google Docs
6. Clique no link para visualizar/editar
```

---

## 📱 Testar em Outro Computador

### Se rodando em outro PC

```bash
# Em vez de localhost:8501, use o IP da máquina:
# Descubra o IP:
hostname -I

# Então acesse:
http://192.168.1.100:8501  (substitua pelo seu IP)
```

---

## 🚀 Deploy em Produção

Quando estiver pronto, veja:
- `VERCEL_README.md` - Para Vercel
- `docker-compose.yml` - Para Docker

---

## 💡 Dicas

- 📝 Streamlit é melhor para testes rápidos
- ⚡ Flask é mais leve para API
- 🔍 Use "Debug" no Streamlit para diagnosticar
- 📊 Logs detalhados em `utils/logger.py`

---

**Status:** ✅ Pronto para testar localmente!
