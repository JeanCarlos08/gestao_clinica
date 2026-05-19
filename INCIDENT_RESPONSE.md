# Plano de Resposta a Incidentes de Segurança (LGPD)

## 1. Objetivo

Este plano define procedimentos para detectar, responder e comunicar incidentes de segurança em conformidade com LGPD (Lei Geral de Proteção de Dados).

---

## 2. Definições

### Incidente de Segurança
Qualquer evento que viole a confidencialidade, integridade ou disponibilidade de dados pessoais, incluindo:
- **Unauthorized Access** — Acesso não autorizado a dados
- **Data Breach** — Vazamento de dados pessoais
- **Falha de Autenticação** — Tentativas de acesso falhadas repetidas
- **Atividade Anômala** — Comportamento incomum em sistemas
- **Falha do Sistema** — Indisponibilidade de serviços críticos
- **Violação de Política** — Não conformidade com políticas internas

### Severidade
- **CRÍTICO** — Comprometimento de muitos usuários/dados, risco imediato
- **ALTO** — Comprometimento significativo, risco considerável
- **MÉDIO** — Impacto limitado, risco moderado
- **BAIXO** — Impacto mínimo, risco baixo
- **INFORMATIVO** — Sem risco, apenas registro

---

## 3. Estrutura de Resposta

### 3.1 Fase 1: Detecção

**Responsável:** Monitoring / Operações

1. **Monitoramento Contínuo**
   - Logs de auditoria (`logs/audit.log`)
   - Logs de incidentes (`logs/incidents.jsonl`)
   - Alertas automáticos (email, Slack, etc.)

2. **Triggers Automáticos**
   ```python
   from services.incident_handler import get_incident_handler, IncidentType, IncidentSeverity
   
   handler = get_incident_handler()
   
   # Exemplo: Detectar múltiplas falhas de autenticação
   if failed_auth_count > 5:
       handler.report_incident(
           incident_type=IncidentType.FAILED_AUTH,
           severity=IncidentSeverity.HIGH,
           title="Múltiplas falhas de autenticação detectadas",
           description=f"IP {client_ip}: {failed_auth_count} tentativas falhadas",
           affected_users=1,
           notify=True  # Envia email para equipe
       )
   ```

3. **Checklist de Detecção**
   - [ ] Monitoramento em tempo real ativo
   - [ ] Alertas configurados para eventos críticos
   - [ ] Logs sendo armazenados com segurança
   - [ ] Timestamps em UTC (auditoria)

---

### 3.2 Fase 2: Análise & Contenção

**Responsável:** Time de Segurança / DPO

1. **Análise Imediata (< 1 hora)**
   - Confirmar incidente
   - Determinar escopo (quantos dados/usuários)
   - Identificar causa raiz
   - Assessor de risco inicial

2. **Contenção (< 4 horas)**
   - **Se vazamento:** Revogar tokens/sessions, resetar senhas
   - **Se falha auth:** Bloquear IP, investigar credenciais
   - **Se sistema:** Isolar servidor, verificar backups
   - **Se anomalia:** Revisar logs, desabilitar contas suspeitas

3. **Comandos Úteis**
   ```bash
   # Ver incidentes abertos
   python -c "from services.incident_handler import get_incident_handler; h = get_incident_handler(); print(h.get_statistics())"
   
   # Buscar incidente específico
   python -c "from services.incident_handler import get_incident_handler; h = get_incident_handler(); inc = h.get_incident('INC-20260517120000'); print(inc.to_dict())"
   
   # Ver logs de auditoria
   tail -f logs/audit.log | grep "paciente_id"
   
   # Ver tentativas de acesso
   grep "unauthorized\|denied\|failed" logs/audit.log | tail -20
   ```

4. **Checklist de Análise**
   - [ ] Incidente confirmado (não falso positivo)
   - [ ] Escopo determinado (dados, usuários, tempo)
   - [ ] Causa identificada
   - [ ] Ações de contenção iniciadas
   - [ ] Equipe notificada

---

### 3.3 Fase 3: Investigação Forense

**Responsável:** Time Técnico + Segurança

1. **Coleta de Evidências** (< 24 horas)
   ```bash
   # Copiar logs para análise
   cp logs/audit.log audit_backup_$(date +%Y%m%d_%H%M%S).log
   cp logs/incidents.jsonl incidents_backup_$(date +%Y%m%d_%H%M%S).jsonl
   
   # Criptografar e armazenar com segurança
   gpg --encrypt --recipient your-key audit_backup_*.log
   ```

2. **Análise Técnica**
   - Determinar como o incidente ocorreu
   - Identificar vulnerabilidades exploradas
   - Verificar evidências de comprometimento adicional
   - Estimar tempo de exposição

3. **Relatório Técnico**
   - Cronologia de eventos
   - Dados afetados (tipos, volume)
   - Sistemas envolvidos
   - Análise de impacto

---

### 3.4 Fase 4: Comunicação & Notificação

**Responsável:** DPO / Comunicação / Legal

#### 4.1 Timelines Legais (LGPD)

```
┌─ Incidente Detectado
│
├─ < 24 horas: DPO analisa
│
├─ < 48 horas: Notificar ANPD (se vazamento de dados pessoais)
│
├─ < 72 horas: Notificar titulares dos dados (se risco)
│
└─ Manter documentação por 5 anos
```

#### 4.2 Notificação à ANPD

1. **Quando Notificar**
   - Vazamento de dados pessoais
   - Risco de danificação de direitos
   - Acesso não autorizado
   - **NÃO precisa:** Dados já públicos, dados anonimizados

2. **O que Comunicar**
   ```python
   from services.incident_handler import get_incident_handler
   
   handler = get_incident_handler()
   report = handler.generate_anpd_report(incident_ids=['INC-...'])
   
   # Salvar relatório
   import json
   with open(f"ANPD_REPORT_{report['report_id']}.json", "w") as f:
       json.dump(report, f, indent=2, ensure_ascii=False)
   ```

3. **Conteúdo da Notificação**
   - Descrição do incidente
   - Dados pessoais afetados (tipos, volume estimado)
   - Possíveis consequências para titulares
   - Medidas de contenção tomadas
   - Contato: DPO / Responsável

4. **Template de Email (ANPD)**
   ```
   Assunto: Notificação de Incidente de Segurança - LGPD Art. 33
   
   Prezados Senhores,
   
   Conforme artigo 33 da LGPD, comunicamos incidente de segurança:
   
   - Tipo: [Data Breach / Unauthorized Access / ...]
   - Data/Hora: [ISO-8601]
   - Dados Afetados: [CPF, email, laudos, ...]
   - Usuários: [número estimado]
   - Causa: [descrição]
   - Ações: [medidas de contenção]
   
   [Anexar relatório técnico]
   
   DPO: [email]
   Telefone: [número]
   ```

5. **Notificação aos Titulares**
   - Se risco comprovado aos direitos
   - Sem necessidade de notificação se dados criptografados
   - Descrever incidente, dados, direitos (GDPR), próximos passos
   - Oferecer suporte (monitoramento crédito, etc.)

---

### 3.5 Fase 5: Recuperação & Lições Aprendidas

**Responsável:** Equipe de Operações + Segurança

1. **Recuperação**
   - [ ] Restaurar sistemas afetados
   - [ ] Verificar integridade de dados
   - [ ] Testar funcionalidade completa
   - [ ] Monitorar para reinfecção

2. **Pós-Incidente (< 1 semana)**
   - [ ] Reunião com stakeholders
   - [ ] Identificar melhorias
   - [ ] Atualizar políticas/procedimentos
   - [ ] Treinar equipe em novos riscos

3. **Documentação Final**
   ```python
   # Fechar incidente
   incident = handler.get_incident('INC-20260517120000')
   incident.close(resolution="Dados restaurados, acesso revogado, política atualizada")
   handler._save_incident(incident)
   ```

---

## 4. Contatos de Emergência

### Escalação de Severidade

| Severidade | Tempo de Resposta | Contato | Ação |
|-----------|------------------|---------|------|
| CRÍTICO | < 15 min | CEO + DPO + TI | Conferência imediata |
| ALTO | < 1 hora | DPO + TI | Reunião, notificações |
| MÉDIO | < 4 horas | DPO + TI | Análise, relatório |
| BAIXO | < 24 horas | TI | Investigação |

### Contatos

```
DPO (Data Protection Officer): [email] / [telefone]
CISO (Chief Info Security Officer): [email] / [telefone]
Gerente TI: [email] / [telefone]
Contato Legal: [email] / [telefone]
ANPD (Autoridade Nacional): protecaodados@gov.br
```

---

## 5. Ferramentas & Scripts

### 5.1 Gerar Relatório de Incidentes

```python
from services.incident_handler import get_incident_handler

handler = get_incident_handler()

# Obter estatísticas
stats = handler.get_statistics()
print(stats)

# Gerar relatório ANPD
report = handler.generate_anpd_report()
import json
with open(f"incident_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json", "w") as f:
    json.dump(report, f, indent=2)
```

### 5.2 Executar Limpeza Automática (Retenção)

```python
from utils.retention import run_scheduled_cleanup

result = run_scheduled_cleanup()
print(f"Removidos: {result['total']} itens")
```

### 5.3 Ver Dados Anonimizados em Logs

```python
from utils.anonymizer import anonymize_for_logging

sensitive_data = {
    "nome_paciente": "João Silva",
    "cpf": "123.456.789-00",
    "email": "joao@example.com"
}

safe_data = anonymize_for_logging(sensitive_data)
print(safe_data)  # {"nome_paciente": "J*** S***", "cpf": "CPF-***-7890", ...}
```

---

## 6. Checklist de Conformidade LGPD

- [ ] Plano de resposta documentado e comunicado
- [ ] Equipe treinada em procedimentos
- [ ] DPO designado
- [ ] Monitoramento ativo de incidentes
- [ ] Notificação ANPD testada (dry-run)
- [ ] Contatos de emergência atualizados
- [ ] Retenção de dados implementada (autolimpeza)
- [ ] Anonimização em logs
- [ ] Rate limiting ativo
- [ ] Audit logs centralizados
- [ ] Backups testados regularmente
- [ ] Plano de continuidade de negócios

---

## 7. Testes & Drills

### 7.1 Teste Mensal (Dry-Run)

```bash
# Simular detecção de incidente
python -c "
from services.incident_handler import get_incident_handler, IncidentType, IncidentSeverity

handler = get_incident_handler()
incident = handler.report_incident(
    incident_type=IncidentType.ANOMALOUS_ACTIVITY,
    severity=IncidentSeverity.MEDIUM,
    title='[TESTE] Atividade anômala detectada',
    description='Este é um teste de drill - NÃO é um incidente real',
    affected_users=0,
    notify=False
)
print(f'Incidente teste criado: {incident.id}')
"

# Verificar relatório
python -c "from services.incident_handler import get_incident_handler; h = get_incident_handler(); r = h.generate_anpd_report(); print(f'Total: {r[\"total_incidents\"]} incidentes')"
```

### 7.2 Teste de Retenção (Mensal)

```bash
# Simular limpeza de dados antigos
python -c "from utils.retention import run_scheduled_cleanup; print(run_scheduled_cleanup())"
```

---

## 8. Documentos Relacionados

- [SECURITY_SETUP.md](SECURITY_SETUP.md) — Configuração de segurança
- [PRIVACY_POLICY.md](PRIVACY_POLICY.md) — Política de privacidade
- [services/incident_handler.py](services/incident_handler.py) — Código
- [utils/retention.py](utils/retention.py) — Retenção de dados
- [utils/anonymizer.py](utils/anonymizer.py) — Anonimização

---

## 9. Versão & Histórico

| Versão | Data | Alterações |
|--------|------|-----------|
| 1.0 | 2026-05-17 | Versão inicial |

---

**Aprovado por:** _________________

**Data:** _________________
