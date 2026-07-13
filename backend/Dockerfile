# Dockerfile — gestao_clinica v3.0
# Compatível com Render (usa $PORT injetado pela plataforma)

FROM python:3.11-slim

# Metadados
LABEL maintainer="mvpdepsicologia"
LABEL version="3.0.0"
LABEL description="Sistema de Gestão Clínica Ocupacional"

# Variáveis de ambiente de sistema
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONFAULTHANDLER=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PYTHONPATH=/app/src

# Diretório de trabalho
WORKDIR /app

# Dependências do sistema (psycopg2 precisa de libpq)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Dependências Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Código da aplicação
COPY . .

# Cria diretórios necessários
RUN mkdir -p logs data

# Usuário não-root (segurança)
RUN useradd --create-home --shell /bin/bash appuser \
    && chown -R appuser:appuser /app
USER appuser

# Porta padrão (o Render sobrescreve com $PORT)
EXPOSE 8000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:${PORT:-8000}/api/health || exit 1

# Render injeta $PORT — usamos shell form para que a variável seja expandida
CMD uvicorn src.infrastructure.api.index:app --host 0.0.0.0 --port ${PORT:-8000}
