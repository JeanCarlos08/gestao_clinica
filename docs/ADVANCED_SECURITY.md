# Guia Avançado de Segurança - LGPD

Documentação técnica completa para as camadas avançadas de segurança implementadas.

---

## 1. Pseudonymization & Anonymization

### Objetivo
Ofuscar dados pessoais (PII) em logs e relatórios sem perder rastreabilidade.

### Uso Básico

```python
from utils.anonymizer import get_pseudonymizer, anonymize_for_logging

ps = get_pseudonymizer()

# Ofuscar campos individuais
cpf_anon = ps.pseudonymize_cpf("123.456.789-00")        # "CPF-***-7890"
email_anon = ps.pseudonymize_email("joao@example.com")  # "***@example.com"
phone_anon = ps.pseudonymize_phone("11987654321")       # "***-4321"
name_anon = ps.pseudonymize_name("João Silva Santos")   # "J*** S***"

# Ofuscar dicionário inteiro
data = {
    "nome_paciente": "João Silva",
    "cpf": "123.456.789-00",
    "email": "joao@example.com",
    "telefone": "11987654321"
}

safe_data = anonymize_for_logging(data)
# {
#   "nome_paciente": "J*** S***",
#   "cpf": "CPF-***-7890",
#   "email": "***@example.com",
#   "telefone": "***-4321"
# }

# Usar em logs
import logging
logger = logging.getLogger(__name__)
logger.info(f"Laudo criado: {safe_data}")  # Sem PII real em logs
```

### Usar em Auditoria Automática

```python
from utils.audit import log_event
from utils.anonymizer import anonymize_for_logging

dados_original = {
    "nome": "João Silva",
    "cpf": "123.456.789-00",
    "empresa": "ABC LTDA"
}

# Logar versão segura
dados_safe = anonymize_for_logging(dados_original)
log_event("laudo_criado", dados_safe)
```

### Função de Redação Genérica

```python
from utils.anonymizer import redact_sensitive_fields

texto = """
Laudo para João Silva (CPF: 123.456.789-00)
Email: joao@example.com
Telefone: (11) 98765-4321
Cartão: 1234-5678-9012-3456
"""

texto_seguro = redact_sensitive_fields(texto)
# "Laudo para João Silva (CPF: [CPF])
# Email: [EMAIL]
# Telefone: [PHONE]
# Cartão: [CARD]"
```

---

## 2. Data Retention & Automatic Cleanup

### Objetivo
Implementar políticas de retenção LGPD e deletar dados automaticamente.

### Políticas Padrão

```python
from utils.retention import get_retention_policy

policy = get_retention_policy()

# Retorna dias de retenção por tipo
print(policy.get_retention_days("laudos"))          # 2555 (~7 anos)
print(policy.get_retention_days("audit_logs"))      # 1095 (~3 anos)
print(policy.get_retention_days("temp_files"))      # 30
print(policy.get_retention_days("error_logs"))      # 90
```

### Customizar Políticas

```python
from utils.retention import RetentionPolicy, DataCleaner

# Criar política customizada
custom_policies = {
    "laudos": 1825,           # 5 anos ao invés de 7
    "audit_logs": 730,        # 2 anos
    "temp_files": 7,          # 7 dias
    "custom_data": 365        # 1 ano
}

policy = RetentionPolicy(policies=custom_policies)
cleaner = DataCleaner(policy=policy)
```

### Executar Limpeza Manual

```python
from utils.retention import get_data_cleaner

cleaner = get_data_cleaner()

# Limpar cada tipo
removed_audit = cleaner.cleanup_audit_logs()
removed_temp = cleaner.cleanup_temp_files()
removed_errors = cleaner.cleanup_error_logs()

print(f"Total removido: {removed_audit + removed_temp + removed_errors}")
```

### Deletar Dados de um Paciente (Right to be Forgotten)

```python
from utils.retention import get_data_cleaner

cleaner = get_data_cleaner()

# Implementar "Direito ao Esquecimento" (Art. 17, GDPR)
success = cleaner.cleanup_patient_data_after_deletion("123.456.789-00")
if success:
    print("✓ Dados do paciente deletados permanentemente")
```

### Agendar Limpeza Automática

#### Opção 1: Cronjob (Unix/Linux)

```bash
# Executar limpeza diariamente às 2am
0 2 * * * cd /media/jean/7AF8AFA7F8AF5FDD/gestao_clinica && python scripts/scheduler.py --cleanup

# Gerar relatório toda segunda-feira
0 8 * * 1 cd /media/jean/7AF8AFA7F8AF5FDD/gestao_clinica && python scripts/scheduler.py --report

# Rodar daemon em background (recomendado)
# Adicione ao systemd service ou supervisord
```

#### Opção 2: Systemd Service (Linux)

Crie `/etc/systemd/system/gestao-clinica-scheduler.service`:

```ini
[Unit]
Description=Gestão Clínica - Data Retention Scheduler
After=network.target

[Service]
Type=simple
User=jean
WorkingDirectory=/media/jean/7AF8AFA7F8AF5FDD/gestao_clinica
ExecStart=/usr/bin/python3 scripts/scheduler.py --daemon --interval 3600
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Depois:
```bash
sudo systemctl daemon-reload
sudo systemctl enable gestao-clinica-scheduler
sudo systemctl start gestao-clinica-scheduler
sudo systemctl status gestao-clinica-scheduler
```

#### Opção 3: Docker

```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY . .

# Instalar dependências
RUN pip install -q -r requirements.txt

# Executar scheduler em daemon
CMD ["python", "scripts/scheduler.py", "--daemon", "--interval", "3600"]
```

---

## 3. Incident Response

### Reportar um Incidente

```python
from services.incident_handler import (
    get_incident_handler,
    IncidentType,
    IncidentSeverity
)

handler = get_incident_handler()

# Reportar incidente
incident = handler.report_incident(
    incident_type=IncidentType.UNAUTHORIZED_ACCESS,
    severity=IncidentSeverity.HIGH,
    title="Acesso não autorizado detectado",
    description="IP 192.168.1.100 tentou acessar documentos sem permissão",
    affected_data=["laudos", "cpf", "email"],
    affected_users=5,
    notify=True  # Envia email automático
)

print(f"Incidente reportado: {incident.id}")
```

### Tipos de Incidente

```python
from services.incident_handler import IncidentType

IncidentType.UNAUTHORIZED_ACCESS       # Acesso não autorizado
IncidentType.DATA_BREACH              # Vazamento de dados
IncidentType.FAILED_AUTH              # Falha de autenticação
IncidentType.ANOMALOUS_ACTIVITY       # Atividade anômala
IncidentType.SYSTEM_FAILURE           # Falha de sistema
IncidentType.POLICY_VIOLATION         # Violação de política
IncidentType.CONFIGURATION_ERROR      # Erro de configuração
```

### Adicionar Notas ao Incidente

```python
incident = handler.get_incident("INC-20260517120000")
incident.add_note("Investigação em andamento - analisando logs")
incident.add_note("IP bloqueado - acessos cessados")
incident.add_note("Senha do usuário resetada")
handler._save_incident(incident)
```

### Fechar Incidente

```python
incident = handler.get_incident("INC-20260517120000")
incident.close(resolution="Acesso revogado, auditoria concluída, usuário treinado")
handler._save_incident(incident)
```

### Ver Estatísticas

```python
handler = get_incident_handler()

stats = handler.get_statistics()
print(f"Total de incidentes: {stats['total']}")
print(f"Por severidade: {stats['by_severity']}")
print(f"Por tipo: {stats['by_type']}")
print(f"5 mais recentes: {stats['recent']}")
```

### Obter Incidentes Abertos

```python
# Todos os incidentes abertos
open_incidents = handler.get_open_incidents()

# Apenas críticos/altos
critical = handler.get_open_incidents(severity=IncidentSeverity.CRITICAL)
high = handler.get_open_incidents(severity=IncidentSeverity.HIGH)
```

### Gerar Relatório para ANPD

```python
# Relatório de todos os incidentes
report = handler.generate_anpd_report()

# Relatório de incidentes específicos
report = handler.generate_anpd_report(
    incident_ids=['INC-20260517120000', 'INC-20260517130000']
)

# Salvar
import json
with open(f"ANPD_{report['report_id']}.json", "w") as f:
    json.dump(report, f, indent=2, ensure_ascii=False)
```

### Configurar Email de Alertas

Defina em `.env`:

```bash
# SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu-email@gmail.com
SMTP_PASSWORD=sua-senha-app

# Alertas de incidente
INCIDENT_ALERT_EMAIL=dpo@example.com
```

---

## 4. Rate Limiting (API Protection)

### Objetivo
Proteger APIs contra abuso e ataques de força bruta.

### Configuração Padrão

```python
from utils.rate_limiter import get_rate_limiter

limiter = get_rate_limiter()
# Padrão: 100 requisições por hora, por IP
```

### Uso no Flask

```python
from flask import Flask
from utils.rate_limiter import setup_rate_limiting

app = Flask(__name__)

# Ativar rate limiting automático
setup_rate_limiting(app)

@app.route("/api/gerar-laudo", methods=["POST"])
def gerar_laudo():
    # Limite: 100 por hora por IP
    # Se exceder: retorna HTTP 429 (Too Many Requests)
    ...
```

### Customizar Limites

```python
from utils.rate_limiter import SimpleRateLimiter, setup_rate_limiting

# 50 requisições por 30 minutos
limiter = SimpleRateLimiter(
    max_requests=50,
    window_seconds=1800
)

setup_rate_limiting(app, rate_limiter=limiter)
```

### Resposta de Rate Limit Excedido

```json
HTTP/1.1 429 Too Many Requests
Content-Type: application/json

{
  "error": "Rate limit exceeded",
  "remaining": 0,
  "reset_in_seconds": 1234
}
```

### Monitorar Rate Limiting

```python
from utils.rate_limiter import get_rate_limiter

limiter = get_rate_limiter()

# Ver requisições por IP
print(limiter.requests)
# {'192.168.1.1:': [datetime, datetime, ...], ...}

# Limpar dados antigos
limiter.cleanup()
```

---

## 5. Integração Completa

### Exemplo: Criar Laudo com Todas as Proteções

```python
from services.laudo_service import get_laudo_service, DadosLaudo
from services.incident_handler import get_incident_handler
from utils.anonymizer import anonymize_for_logging
from utils.audit import log_event

def criar_laudo_seguro(dados: DadosLaudo):
    """Cria laudo com auditoria, anonymization, e incident tracking."""
    
    handler = get_incident_handler()
    
    try:
        # 1. Log seguro de início
        dados_safe = anonymize_for_logging({
            "nome": dados.nome_paciente,
            "cpf": dados.cpf,
            "empresa": dados.empresa
        })
        log_event("laudo_iniciado", dados_safe)
        
        # 2. Criar laudo
        service = get_laudo_service()
        novo_doc = service.gerar_laudo(dados)
        
        # 3. Log seguro de sucesso
        log_event("laudo_criado", {"doc_id": novo_doc["id"]})
        
        return novo_doc
    
    except Exception as e:
        # 4. Reportar como incidente
        handler.report_incident(
            incident_type="falha_sistema",
            severity="ALTO",
            title=f"Erro ao criar laudo",
            description=str(e),
            affected_users=1,
            notify=True
        )
        raise
```

---

## 6. Checklist de Implementação

- [ ] Pseudonymization em todos os logs
- [ ] Retenção de dados configurada por tipo
- [ ] Limpeza automática agendada (cron/systemd)
- [ ] Incident handler integrado
- [ ] Email de alertas configurado (SMTP)
- [ ] Rate limiting ativo em APIs
- [ ] Testes de retenção executados
- [ ] Drill de incident response realizado
- [ ] Documentação de políticas atualizada
- [ ] Equipe treinada

---

## 7. Referências

- [INCIDENT_RESPONSE.md](INCIDENT_RESPONSE.md) — Plano de resposta
- [SECURITY_SETUP.md](SECURITY_SETUP.md) — Configuração de segurança
- [services/incident_handler.py](services/incident_handler.py)
- [utils/anonymizer.py](utils/anonymizer.py)
- [utils/retention.py](utils/retention.py)
- [utils/rate_limiter.py](utils/rate_limiter.py)
- [scripts/scheduler.py](scripts/scheduler.py)
