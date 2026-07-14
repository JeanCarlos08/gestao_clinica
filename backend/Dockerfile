FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY src/ src/
ENV PYTHONPATH=src

EXPOSE 8000

CMD ["uvicorn", "infrastructure.api.index:app", "--host", "0.0.0.0", "--port", "8000"]
