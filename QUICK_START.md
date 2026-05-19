# ⚡ QUICK START - Rodar Localmente em 2 Minutos

## 🚀 Opção Mais Rápida

### Linux/Mac

```bash
cd /media/jean/7AF8AFA7F8AF5FDD/gestao_clinica

# Fazer script executável
chmod +x run_local.sh

# Rodar
bash run_local.sh
```

### Windows

```bash
# Duplo-clique em:
run_local.bat
```

---

## 📊 Escolher Entre Streamlit ou Flask

### ✨ Streamlit (Recomendado para testes)

```bash
bash run_local.sh streamlit
# ou
streamlit run app_laudos_local.py
```

**Acesse:** http://localhost:8501

**Vantagens:**
- Interface bonita
- 3 abas de funcionalidades
- Debug integrado

### ⚡ Flask (Mais leve)

```bash
bash run_local.sh flask
# ou
python api_laudos_local.py
```

**Acesse:** http://localhost:5000

**Vantagens:**
- Formulário HTML customizado
- API REST
- Menos recursos

---

## 🔧 Configuração Inicial (Primeira Vez)

### 1. Ativar Ambiente Virtual

```bash
source /media/jean/7AF8AFA7F8AF5FDD/gestao_clinica/.venv/bin/activate
```

### 2. Instalar Dependências

```bash
pip install -r requirements.txt
```

### 3. Obter credentials.json

1. Acesse: https://console.cloud.google.com
2. Crie/Selecione projeto
3. APIs & Services > Credentials
4. Create > Service Account
5. ADD KEY > Create new key > JSON
6. Copie o arquivo JSON para `./credentials.json`

### 4. Configurar .env

```env
GOOGLE_DOCS_TEMPLATE_ID=seu_id_aqui
```

---

## ✅ Testar Conexão

```bash
bash run_local.sh test
```

Ou:

```bash
python -c "from services.google_docs_api import get_google_docs_api; api = get_google_docs_api(); print('✅ OK')"
```

---

## 📋 Fluxo de Uso

```
1. Rodar app (Streamlit ou Flask)
2. Preencher dados do paciente
3. Clicar "Gerar Laudo"
4. ✅ Laudo criado no Google Docs
5. 🔗 Link automático para visualizar
```

---

## 🎯 Testar Gerar Laudo

### Via Streamlit

1. Abra http://localhost:8501
2. Clique "📝 Teste Rápido"
3. Clique "🚀 Gerar Laudo"

### Via Flask

1. Abra http://localhost:5000
2. Preencha formulário
3. Clique "🚀 Gerar Laudo"

### Via Python Direto

```python
from services.laudo_service import get_laudo_service, DadosLaudo
from datetime import datetime

dados = DadosLaudo(
    nome_paciente="João Silva",
    cpf="123.456.789-00",
    data_nascimento="15/03/1985",
    empresa="Empresa XYZ",
    data_exame=datetime.now().strftime("%d/%m/%Y"),
    motivo_avaliacao="Teste",
    psicologista_nome="Dra. Juliana",
    psicologista_crp="07/12345"
)

laudo_service = get_laudo_service()
novo_doc = laudo_service.gerar_laudo(dados)
print(novo_doc['url'])  # Link do Google Docs
```

---

## 🐛 Troubleshooting Rápido

| Erro | Solução |
|------|---------|
| `ModuleNotFoundError: google` | `pip install -r requirements.txt` |
| `GOOGLE_DOCS_TEMPLATE_ID not found` | Configure no `.env` |
| `credentials.json not found` | Copie o arquivo para raiz do projeto |
| `Permission denied` | Verifique roles na Google Cloud |

---

## 📱 Acessar de Outro Computador

```bash
# Descobrir IP local
hostname -I

# Então abrir em outro PC:
http://192.168.1.100:8501  # (substitua pelo IP)
```

---

## 📚 Documentação Completa

- **LOCALHOST_README.md** - Guia completo
- **GOOGLE_DOCS_SETUP.md** - Setup Google Cloud
- **examples/exemplo_laudos.py** - Exemplos de código
- **tests/test_google_docs.py** - Testes unitários

---

## 🎉 Pronto!

**Tudo está configurado e pronto para usar localmente!**

Dúvidas? Verifique os arquivos de documentação acima. ✨
