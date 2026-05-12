# Dockerfile — mvpdepsicologia v2.0
# ─────────────────────────────────────────────────────────────
# Multi-stage build para imagem otimizada

FROM python:3.11-slim AS base

# Metadados
LABEL maintainer="mvpdepsicologia"
LABEL version="2.0.0"
LABEL description="Sistema de Gestão Clínica Ocupacional"

# Variáveis de ambiente de sistema
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONFAULTHANDLER=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Diretório de trabalho
WORKDIR /app

# Dependências do sistema (psycopg2 precisa de libpq)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

# ── Dependências Python ───────────────────────────────────────
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ── Código da aplicação ───────────────────────────────────────
COPY . .

# Cria diretórios necessários
RUN mkdir -p logs data

# Usuário não-root (segurança)
RUN useradd --create-home --shell /bin/bash appuser \
    && chown -R appuser:appuser /app
USER appuser

# Porta padrão do Streamlit
EXPOSE 8501

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8501/_stcore/health || exit 1

# Comando de inicialização
CMD ["streamlit", "run", "app.py", \
     "--server.port=8501", \
     "--server.address=0.0.0.0", \
     "--server.headless=true", \
     "--browser.gatherUsageStats=false"]
