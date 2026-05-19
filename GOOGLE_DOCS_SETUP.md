# 🎯 Google Docs API - Setup Completo

## O que foi implementado?

✅ **Google Docs API Integration** - Integração oficial com Google Docs  
✅ **Geração Automática de Laudos** - Cria cópias do template e preenche campos  
✅ **Exportar como PDF** - Gera PDFs automaticamente  
✅ **Compartilhamento** - Compartilha laudos com pacientes  
✅ **Exemplos Prontos** - Código de exemplo para começar rápido  

---

## 📋 Pré-requisitos

1. **Conta Google** com acesso ao Google Cloud
2. **Google Cloud Project** criado
3. **Google Docs API** habilitada
4. **Service Account** para autenticação

---

## 🔧 Configuração Passo a Passo

### 1️⃣ Criar Google Cloud Project

```
1. Acesse: https://console.cloud.google.com
2. Clique em "Select a project" > "NEW PROJECT"
3. Nome: "Gestão Clínica"
4. Clique em "CREATE"
5. Aguarde a criação (2-3 minutos)
```

### 2️⃣ Habilitar Google Docs API

```
1. No Google Cloud Console, vá para "APIs & Services"
2. Clique em "ENABLE APIS AND SERVICES"
3. Procure por "Google Docs API"
4. Clique em "Google Docs API"
5. Clique no botão "ENABLE"
6. Também habilite "Google Drive API" (procure e clique ENABLE)
```

### 3️⃣ Criar Service Account

```
1. Vá para "APIs & Services" > "Credentials"
2. Clique em "CREATE CREDENTIALS" > "Service Account"
3. Preencha:
   - Service account name: "gestao-clinica-docs"
   - Description: "Service para gerar laudos"
4. Clique em "CREATE AND CONTINUE"
5. Grant roles:
   - Procure por "Editor" e selecione
   - Clique em "CONTINUE"
6. Clique em "DONE"
```

### 4️⃣ Gerar Chave JSON

```
1. Na página de Service Accounts, clique no email criado
2. Vá para a aba "KEYS"
3. Clique em "ADD KEY" > "Create new key"
4. Selecione "JSON"
5. Clique em "CREATE"
6. Um arquivo JSON será baixado automaticamente
```

### 5️⃣ Salvar Credenciais no Projeto

```bash
# Coloque o arquivo JSON baixado na pasta do projeto:
cp ~/Downloads/seu-arquivo.json ./credentials.json

# OU configure a variável de ambiente:
export GOOGLE_SERVICE_ACCOUNT_FILE=/caminho/completo/credentials.json
```

### 6️⃣ Atualizar .env

```bash
# Edite o arquivo .env e preencha:
GOOGLE_DOCS_TEMPLATE_ID=seu_id_aqui
# GOOGLE_SERVICE_ACCOUNT_FILE=/caminho/para/credentials.json (opcional)
```

---

## 📄 Criar Template no Google Docs

1. **Acesse Google Docs**: https://docs.google.com/document/
2. **Crie novo documento**: "Laudo Psicossocial - Template"
3. **Use placeholders** para campos que serão preenchidos:

```
Nome: {{NOME}}
CPF: {{CPF}}
Data Nascimento: {{DATA_NASCIMENTO}}
Empresa: {{EMPRESA}}
Data do Exame: {{DATA_EXAME}}
Motivo da Avaliação: {{MOTIVO_AVALIACAO}}

Avaliação Psicológica: {{CHECKBOX_PSICOLOGICA}}
Admissional: {{CHECKBOX_ADMISSIONAL}}
Periódica: {{CHECKBOX_PERIODICA}}

Itens Auxiliares:
{{ITENS_AUXILIADOS}}

Conclusão:
{{CONCLUSAO}}

---
{{PSICOLOGISTA_NOME}}
CRP: {{PSICOLOGISTA_CRP}}
Data: {{DATA_GERACAO}}
```

4. **Copie o ID** da URL:
```
https://docs.google.com/document/d/[ID_AQUI]/edit
                                     ↑
                              Copie este ID
```

5. **Cole no .env**:
```
GOOGLE_DOCS_TEMPLATE_ID=1FDYCKMZaEMWAiOO1oqq8R0bQ0L4VfpEr6DGohccpJY
```

---

## 🚀 Usar a API

### Exemplo Simples

```python
from services.laudo_service import get_laudo_service, DadosLaudo
from datetime import datetime

# Preparar dados
dados = DadosLaudo(
    nome_paciente="João Silva",
    data_nascimento="15/03/1985",
    cpf="123.456.789-00",
    empresa="Empresa XYZ",
    data_exame=datetime.now().strftime("%d/%m/%Y"),
    motivo_avaliacao="Avaliação para admissão",
    admissional=True,
    psicologista_nome="Dra. Juliana",
    psicologista_crp="07/12345"
)

# Gerar laudo
laudo_service = get_laudo_service()
novo_doc = laudo_service.gerar_laudo(dados)

print(f"Laudo: {novo_doc['url']}")
```

### Gerar e Exportar PDF

```python
pdf_path = laudo_service.gerar_e_exportar_pdf(
    dados,
    caminho_pdf="./laudos/joao_silva.pdf"
)
```

### Compartilhar com Paciente

```python
laudo_service.compartilhar_com_paciente(
    novo_doc["id"],
    "joao.silva@email.com"
)
```

---

## 📁 Arquivos Criados

```
services/
  ├── google_docs_api.py       # API client
  └── laudo_service.py         # Serviço de laudos

examples/
  └── exemplo_laudos.py        # Exemplos de uso

.env                           # Variáveis de ambiente
requirements.txt               # Dependências (atualizado)
```

---

## 🐛 Troubleshooting

### Erro: "GOOGLE_DOCS_TEMPLATE_ID não configurado"

```
✗ Solução: Adicione o ID do template no .env
```

### Erro: "credentials.json not found"

```
✗ Coloque o arquivo JSON na raiz do projeto
✗ OU configure GOOGLE_SERVICE_ACCOUNT_FILE no .env
```

### Erro: "Permission denied"

```
✗ Verifique se o Service Account foi criado corretamente
✗ Clique em "Grant roles" e selecione "Editor"
```

### Documento não está sendo preenchido

```
✗ Verifique se os placeholders {{NOME}} etc existem no template
✗ Os placeholders devem ser EXATOS (maiúsculas, chaves duplas)
```

---

## 📊 Integração com Banco de Dados

Para usar dados reais do seu banco:

```python
from database.repositories import atendimento_repository

# Buscar atendimento do banco
atendimento = atendimento_repository.buscar_por_id(atendimento_id)

# Converter para DadosLaudo
dados = DadosLaudo(
    nome_paciente=atendimento.paciente.nome,
    data_nascimento=atendimento.paciente.data_nascimento,
    cpf=atendimento.paciente.cpf,
    empresa=atendimento.empresa.nome,
    data_exame=atendimento.data.strftime("%d/%m/%Y"),
    motivo_avaliacao=atendimento.tipo,
    # ... outros campos
)

# Gerar laudo
novo_doc = laudo_service.gerar_laudo(dados)
```

---

## 📞 Suporte

Para dúvidas:
1. Consulte `examples/exemplo_laudos.py`
2. Verifique logs: `utils/logger.py`
3. Leia documentação oficial: https://developers.google.com/docs/api

---

**Status**: ✅ Pronto para usar!
