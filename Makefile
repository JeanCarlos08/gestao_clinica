# Makefile para Gerador de Laudos
# 
# Uso:
#   make streamlit    - Rodar Streamlit
#   make flask        - Rodar Flask
#   make test         - Testar conexão
#   make install      - Instalar dependências
#   make help         - Ver ajuda

.PHONY: help install streamlit flask test clean activate

PROJECT_DIR := /home/jean/gestao_clinica
VENV := $(PROJECT_DIR)/venv
PYTHON := $(VENV)/bin/python
PIP := $(VENV)/bin/pip

help:
	@echo ""
	@echo "╔═══════════════════════════════════════════════════════════════╗"
	@echo "║           Gerador de Laudos - Makefile                        ║"
	@echo "╚═══════════════════════════════════════════════════════════════╝"
	@echo ""
	@echo "Comandos disponíveis:"
	@echo ""
	@echo "  make streamlit      - Rodar app Streamlit (http://localhost:8501)"
	@echo "  make flask          - Rodar app Flask (http://localhost:5000)"
	@echo "  make test           - Testar conexão Google Docs API"
	@echo "  make install        - Instalar dependências"
	@echo "  make activate       - Ativar ambiente virtual"
	@echo "  make freeze         - Congelar dependências"
	@echo "  make clean          - Limpar arquivos temp"
	@echo "  make lint           - Verificar código"
	@echo "  make tests          - Rodar testes unitários"
	@echo "  make docs           - Ver documentação"
	@echo "  make help           - Esta mensagem"
	@echo ""

# ─────────────────────────────────────────────────────────────────

activate:
	@echo "✅ Ativando ambiente virtual..."
	@bash -c "source $(VENV)/bin/activate && bash"

install:
	@echo "📦 Instalando dependências..."
	@$(PIP) install --upgrade pip
	@$(PIP) install -r requirements.txt
	@echo "✅ Dependências instaladas!"

freeze:
	@echo "📋 Congelando dependências..."
	@$(PIP) freeze > requirements.txt
	@echo "✅ requirements.txt atualizado!"

streamlit: activate
	@echo ""
	@echo "🌐 Iniciando Streamlit..."
	@echo "✨ Acesse: http://localhost:8501"
	@echo ""
	@. $(VENV)/bin/activate && cd $(PROJECT_DIR) && streamlit run app_laudos_local.py

flask: activate
	@echo ""
	@echo "⚡ Iniciando Flask..."
	@echo "✨ Acesse: http://localhost:5000"
	@echo ""
	@. $(VENV)/bin/activate && cd $(PROJECT_DIR) && python api_laudos_local.py

test:
	@echo ""
	@echo "🧪 Testando conexão Google Docs API..."
	@echo ""
	@. $(VENV)/bin/activate && cd $(PROJECT_DIR) && \
		$(PYTHON) -c "from services.google_docs_api import get_google_docs_api; api = get_google_docs_api(); print('✅ Conexão estabelecida!'); print('✅ Google Docs API: OK')"

tests:
	@echo ""
	@echo "🧪 Rodando testes unitários..."
	@echo ""
	@. $(VENV)/bin/activate && cd $(PROJECT_DIR)/backend && pytest tests/test_google_docs.py -v

lint:
	@echo ""
	@echo "🔍 Verificando código..."
	@echo ""
	@. $(VENV)/bin/activate && cd $(PROJECT_DIR) && \
		python -m pylint services/google_docs_api.py services/laudo_service.py --disable=all --enable=E,F

clean:
	@echo "🧹 Limpando arquivos temporários..."
	@find $(PROJECT_DIR) -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	@find $(PROJECT_DIR) -type f -name "*.pyc" -delete
	@rm -rf $(PROJECT_DIR)/.pytest_cache
	@rm -rf $(PROJECT_DIR)/.streamlit
	@echo "✅ Limpeza concluída!"

docs:
	@echo ""
	@echo "📚 Documentação disponível:"
	@echo ""
	@echo "  • QUICK_START.md              - Início rápido"
	@echo "  • START_LOCAL.txt             - Sumário visual"
	@echo "  • LOCALHOST_README.md         - Guia completo"
	@echo "  • GOOGLE_DOCS_SETUP.md        - Setup Google Cloud"
	@echo "  • examples/exemplo_laudos.py  - Exemplos de código"
	@echo ""

# ─────────────────────────────────────────────────────────────────

.SILENT: help docs
