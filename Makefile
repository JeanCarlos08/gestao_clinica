.PHONY: dev test lint format docker-build docker-up backup

# ── Development ──
dev:
	cd backend && source ../venv/bin/activate && PYTHONPATH=src uvicorn infrastructure.api.index:app --reload --port 8000

# ── Tests ──
test:
	cd backend && source ../venv/bin/activate && PYTHONPATH=src python -m pytest tests/ -v --tb=short

test-cov:
	cd backend && source ../venv/bin/activate && PYTHONPATH=src python -m pytest tests/ --cov=src --cov-report=term-missing

# ── Lint ──
lint:
	cd backend && source ../venv/bin/activate && ruff check src/ tests/

format:
	cd backend && source ../venv/bin/activate && ruff format src/ tests/

# ── Docker ──
docker-build:
	docker compose build

docker-up:
	docker compose up -d

docker-down:
	docker compose down

# ── Backup ──
backup:
	bash scripts/backup_db.sh

# ── Security ──
security-scan:
	cd backend && bandit -c .bandit -r src/
