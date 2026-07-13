# Makefile — Gestão Clínica v3.0

.PHONY: help install test lint clean dev dev-backend dev-frontend

PROJECT_DIR := /home/jean/gestao_clinica
VENV := $(PROJECT_DIR)/venv
PYTHON := $(VENV)/bin/python
PIP := $(VENV)/bin/pip

help:
	@echo ""
	@echo "╔═══════════════════════════════════════════════════════════════╗"
	@echo "║           Gestão Clínica — Makefile v3.0                     ║"
	@echo "╚═══════════════════════════════════════════════════════════════╝"
	@echo ""
	@echo "Comandos disponíveis:"
	@echo ""
	@echo "  make dev            - Rodar backend + frontend"
	@echo "  make dev-backend    - Rodar backend (FastAPI, port 8000)"
	@echo "  make dev-frontend   - Rodar frontend (Next.js, port 3000)"
	@echo "  make install        - Instalar dependências"
	@echo "  make test           - Rodar testes"
	@echo "  make lint           - Verificar código"
	@echo "  make clean          - Limpar arquivos temp"
	@echo "  make migrate        - Rodar migrações Alembic"
	@echo "  make migrate-create - Criar nova migração"
	@echo "  make help           - Esta mensagem"
	@echo ""

# ─────────────────────────────────────────────────────────────────

install:
	@echo "📦 Instalando dependências..."
	@$(PIP) install --upgrade pip
	@$(PIP) install -r backend/requirements.txt
	@echo "✅ Dependências instaladas!"

dev-backend:
	@echo ""
	@echo "⚡ Iniciando backend FastAPI..."
	@echo "✨ Acesse: http://localhost:8000/docs"
	@echo ""
	@. $(VENV)/bin/activate && cd $(PROJECT_DIR)/backend && PYTHONPATH=src uvicorn src.infrastructure.api.index:app --reload --host 0.0.0.0 --port 8000

dev-frontend:
	@echo ""
	@echo "🌐 Iniciando frontend Next.js..."
	@echo "✨ Acesse: http://localhost:3000"
	@echo ""
	@. $(VENV)/bin/activate && cd $(PROJECT_DIR)/frontend && npm run dev

dev: dev-backend

test:
	@echo ""
	@echo "🧪 Rodando testes..."
	@. $(VENV)/bin/activate && cd $(PROJECT_DIR)/backend && python -m pytest tests/ -v

lint:
	@echo ""
	@echo "🔍 Verificando código..."
	@. $(VENV)/bin/activate && cd $(PROJECT_DIR)/backend && python -m py_compile src/utils/helpers.py && python -m py_compile src/services/security.py && echo "✅ Syntax OK"

migrate:
	@echo ""
	@echo "🔄 Rodando migrações Alembic..."
	@. $(VENV)/bin/activate && cd $(PROJECT_DIR)/backend && alembic upgrade head

migrate-create:
	@echo ""
	@echo "📝 Criando nova migração..."
	@. $(VENV)/bin/activate && cd $(PROJECT_DIR)/backend && alembic revision --autogenerate -m "$(msg)"

clean:
	@echo "🧹 Limpando arquivos temporários..."
	@find $(PROJECT_DIR) -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	@find $(PROJECT_DIR) -type f -name "*.pyc" -delete
	@rm -rf $(PROJECT_DIR)/.pytest_cache
	@echo "✅ Limpeza concluída!"

# ─────────────────────────────────────────────────────────────────

.SILENT: help
