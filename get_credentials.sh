#!/bin/bash
# 🔑 SCRIPT: Como Obter Credenciais Google Cloud
# 
# Este script abre automaticamente as páginas necessárias
# e guia você pelo processo passo a passo

clear

cat << 'EOF'

╔═══════════════════════════════════════════════════════════════════════════╗
║                                                                           ║
║           🔑 GUIA: OBTER CREDENCIAIS GOOGLE CLOUD                        ║
║                                                                           ║
║              Passo a Passo Visual - Google Cloud Console                 ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝


📋 O QUE VOCÊ VAI FAZER
═══════════════════════════════════════════════════════════════════════════

1. Criar um Google Cloud Project
2. Habilitar Google Docs API
3. Criar Service Account
4. Gerar chave JSON
5. Copiar o arquivo para o projeto


🚀 PASSO 1: Acessar Google Cloud Console
═══════════════════════════════════════════════════════════════════════════

Abra seu navegador e acesse:
👉 https://console.cloud.google.com

Pressione ENTER para abrir no navegador...
EOF

read -p ""

# Abrir Google Cloud Console
if command -v xdg-open &> /dev/null; then
    xdg-open "https://console.cloud.google.com" 2>/dev/null &
elif command -v open &> /dev/null; then
    open "https://console.cloud.google.com" 2>/dev/null &
else
    echo "⚠️ Abra manualmente: https://console.cloud.google.com"
fi

sleep 3

clear

cat << 'EOF'

✅ PASSO 2: Criar Novo Projeto
═══════════════════════════════════════════════════════════════════════════

No Google Cloud Console:

1. Clique em "Select a project" (canto superior esquerdo)
   └─ Ao lado do logo do Google Cloud

2. Clique em "NEW PROJECT"

3. Preencha:
   ├─ Project name: "Gestão Clínica"
   └─ Organization: (deixe em branco)

4. Clique em "CREATE"

5. Aguarde 2-3 minutos para o projeto ser criado

Quando terminar, pressione ENTER...
EOF

read -p ""

clear

cat << 'EOF'

✅ PASSO 3: Habilitar Google Docs API
═══════════════════════════════════════════════════════════════════════════

1. No painel esquerdo, clique em "APIs & Services"

2. Clique em "ENABLE APIS AND SERVICES"

3. Na caixa de busca, procure por:
   └─ "Google Docs API"

4. Clique no resultado "Google Docs API"

5. Clique em "ENABLE" (botão azul no topo)

6. Aguarde alguns segundos

Quando terminar, pressione ENTER...
EOF

read -p ""

clear

cat << 'EOF'

ℹ️ PASSO 3B: Habilitar Google Drive API Também
═══════════════════════════════════════════════════════════════════════════

1. Clique em "ENABLE APIS AND SERVICES" novamente

2. Procure por:
   └─ "Google Drive API"

3. Clique no resultado

4. Clique em "ENABLE"

Quando terminar, pressione ENTER...
EOF

read -p ""

clear

cat << 'EOF'

✅ PASSO 4: Criar Service Account
═══════════════════════════════════════════════════════════════════════════

1. Vá para "APIs & Services" > "Credentials"

2. Clique em "CREATE CREDENTIALS"

3. Selecione "Service Account"

4. Preencha:
   ├─ Service account name: "gestao-clinica-docs"
   ├─ Service account ID: (preenchido automaticamente)
   └─ Description: "Service para gerar laudos automaticamente"

5. Clique em "CREATE AND CONTINUE"

6. Grant roles:
   ├─ Clique no dropdown "Select a role"
   ├─ Procure por: "Editor"
   └─ Selecione: "Editor"

7. Clique em "CONTINUE"

8. Clique em "DONE"

Quando terminar, pressione ENTER...
EOF

read -p ""

clear

cat << 'EOF'

✅ PASSO 5: Gerar Chave JSON
═══════════════════════════════════════════════════════════════════════════

1. Na página de Credentials, procure por "Service Accounts"

2. Clique no email criado:
   └─ "gestao-clinica-docs@[seu-projeto].iam.gserviceaccount.com"

3. Clique na aba "KEYS"

4. Clique em "ADD KEY"

5. Selecione "Create new key"

6. Escolha formato: "JSON"

7. Clique em "CREATE"

⏬ Um arquivo JSON será baixado automaticamente!

IMPORTANTE: Não feche esta página ainda!

Quando terminar o download, pressione ENTER...
EOF

read -p ""

clear

cat << 'EOF'

✅ PASSO 6: Localizar Arquivo Baixado
═══════════════════════════════════════════════════════════════════════════

O arquivo foi salvo em:
📁 ~/Downloads/

Nome do arquivo será algo como:
📄 [seu-projeto]-[hash].json

Procure por um arquivo JSON recém-criado em Downloads.

Quando encontrar, pressione ENTER...
EOF

read -p ""

clear

cat << 'EOF'

✅ PASSO 7: Copiar Arquivo para o Projeto
═══════════════════════════════════════════════════════════════════════════

Execute este comando no terminal:

┌─────────────────────────────────────────────────────────────────────────┐
│ cp ~/Downloads/*.json /media/jean/7AF8AFA7F8AF5FDD/gestao_clinica/credentials.json │
└─────────────────────────────────────────────────────────────────────────┘

Ou copie manualmente:

1. Abra o arquivo em: ~/Downloads/[seu-arquivo].json
2. Copie o conteúdo completo
3. Crie novo arquivo: /media/jean/7AF8AFA7F8AF5FDD/gestao_clinica/credentials.json
4. Cole o conteúdo

Quando terminar, pressione ENTER...
EOF

read -p ""

clear

cat << 'EOF'

✅ PASSO 8: Criar Template no Google Docs
═══════════════════════════════════════════════════════════════════════════

1. Abra: https://docs.google.com/document/

2. Clique em "Blank document" (documento em branco)

3. Dê um nome ao documento:
   └─ "Laudo Psicossocial - Template"

4. Adicione placeholders que serão preenchidos automaticamente:

   Nome: {{NOME}}
   CPF: {{CPF}}
   Data Nascimento: {{DATA_NASCIMENTO}}
   Empresa: {{EMPRESA}}
   Data do Exame: {{DATA_EXAME}}
   
   Tipo de Avaliação:
   ☐ Admissional
   ☐ Periódica
   ☐ Pessoal
   ☐ Mudança de Função
   
   Conclusão:
   {{CONCLUSAO}}

5. Na URL da página, copie o ID:
   https://docs.google.com/document/d/[ID_AQUI]/edit
                                        ↑ COPIE ISTO

Quando terminar, pressione ENTER...
EOF

read -p ""

clear

cat << 'EOF'

✅ PASSO 9: Configurar .env
═══════════════════════════════════════════════════════════════════════════

Edite o arquivo: /media/jean/7AF8AFA7F8AF5FDD/gestao_clinica/.env

Procure pela linha:
   GOOGLE_DOCS_TEMPLATE_ID=1FDYCKMZaEMWAiOO1oqq8R0bQ0L4VfpEr6DGohccpJY

E substitua o ID pelo que você copiou:
   GOOGLE_DOCS_TEMPLATE_ID=seu_id_aqui

Salve o arquivo (CTRL+S).

Quando terminar, pressione ENTER...
EOF

read -p ""

clear

cat << 'EOF'

🎉 PRONTO! Tudo Configurado!
═══════════════════════════════════════════════════════════════════════════

Agora você tem:
✅ credentials.json na raiz do projeto
✅ .env configurado com ID do template
✅ Google Docs API habilitada
✅ Service Account criada

Próximas ações:

1. Volte ao navegador em localhost:8501

2. Clique em "🔌 Testar Conexão"

3. Se tudo der certo, você verá:
   ✅ Conexão estabelecida!

4. Então clique em "🚀 Gerar Laudo"

5. Um novo laudo será criado automaticamente!


❓ DÚVIDAS?
═══════════════════════════════════════════════════════════════════════════

Leia os guias:
├─ GOOGLE_DOCS_SETUP.md
├─ LOCALHOST_README.md
└─ QUICK_START.md

Links úteis:
├─ Google Cloud Console: https://console.cloud.google.com
├─ Google Docs API Docs: https://developers.google.com/docs/api
└─ Tutorial Oficial: https://cloud.google.com/docs/authentication/getting-started


═══════════════════════════════════════════════════════════════════════════

Pressione ENTER para terminar...
EOF

read -p ""

echo ""
echo "✅ Guia concluído!"
echo ""
