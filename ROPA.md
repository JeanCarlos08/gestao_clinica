# ROPA — Registro de Atividades de Tratamento
## (Record of Processing Activities — LGPD Art. 37)

**Controlador:** Clínica IA / mvpdepsicologia  
**DPO:** `DPO_EMAIL` (configurado em `.env`)  
**Versão:** 1.0 — 2026-05-18  
**Próxima revisão:** 2026-11-18 (semestral)

> Este documento é obrigatório pela LGPD Art. 37 e deve ser mantido
> atualizado e disponível para a ANPD mediante solicitação.

---

## Atividades de Tratamento

### 1. Agendamento e Gestão de Atendimentos

| Campo | Detalhe |
|-------|---------|
| **Finalidade** | Agendar, controlar e registrar atendimentos clínicos/psicológicos |
| **Base Legal** | Art. 7º, V — Execução de contrato; Art. 7º, VIII — Tutela da saúde |
| **Dados Tratados** | Nome, empresa/empregador, modalidade, data/hora, status, observações clínicas |
| **Categorias de Titulares** | Pacientes/avaliados das empresas clientes |
| **Destinatários** | Psicólogos do sistema; empresas contratantes (apenas resultado final) |
| **Transferência Internacional** | Não (banco em servidor nacional) — ⚠️ Verificar localização Neon.tech |
| **Prazo de Retenção** | 5 anos após encerramento do contrato (CRP: mínimo 5 anos) |
| **Medidas de Segurança** | Autenticação JWT, RBAC, log de auditoria, banco criptografado em trânsito (SSL) |

---

### 2. Elaboração de Laudos Psicológicos

| Campo | Detalhe |
|-------|---------|
| **Finalidade** | Gerar laudos e relatórios psicológicos com auxílio de IA |
| **Base Legal** | Art. 7º, V — Contrato; Art. 11, II, f — Tutela da saúde (dado sensível) |
| **Dados Tratados** | Nome, dados clínicos, resultado de avaliação, laudo em PDF |
| **Categorias de Titulares** | Pacientes/avaliados |
| **Destinatários** | Empresa contratante, psicólogo responsável |
| **Transferência Internacional** | Google Docs API (servidores Google — EUA) → Cláusulas Contratuais Padrão |
| **Prazo de Retenção** | 7 anos (CFP Resolução 001/2009; Código Civil Art. 206) |
| **Medidas de Segurança** | PDFs no banco PostgreSQL, transmissão SSL, pseudonimização em logs |

---

### 3. Autenticação e Controle de Acesso

| Campo | Detalhe |
|-------|---------|
| **Finalidade** | Controlar acesso ao sistema e proteger dados dos pacientes |
| **Base Legal** | Art. 7º, II — Obrigação legal (LGPD Art. 46 — segurança); Art. 7º, IX — Legítimo interesse |
| **Dados Tratados** | Username, hash de senha (SHA-256/bcrypt), role, último login, IP de acesso |
| **Categorias de Titulares** | Usuários do sistema (psicólogos, recepcionistas, admins) |
| **Destinatários** | Apenas o próprio sistema (uso interno) |
| **Transferência Internacional** | Não |
| **Prazo de Retenção** | Enquanto o usuário estiver ativo + 1 ano após desativação |
| **Medidas de Segurança** | Hash bcrypt, JWT com expiração, brute force protection, log de auditoria |

---

### 4. Log de Auditoria

| Campo | Detalhe |
|-------|---------|
| **Finalidade** | Rastrear ações no sistema para conformidade LGPD e segurança |
| **Base Legal** | Art. 7º, II — Obrigação legal (LGPD Art. 46); Art. 7º, IX — Legítimo interesse |
| **Dados Tratados** | Username (pseudonimizado), ação realizada, entidade afetada, timestamp |
| **Categorias de Titulares** | Usuários do sistema |
| **Destinatários** | Administradores, DPO |
| **Transferência Internacional** | Não |
| **Prazo de Retenção** | 3 anos (`audit_logs` em `utils/retention.py`) |
| **Medidas de Segurança** | PII ofuscada pelo `anonymizer.py`, arquivo com acesso restrito |

---

### 5. Consentimento dos Titulares

| Campo | Detalhe |
|-------|---------|
| **Finalidade** | Registrar e comprovar o consentimento dos titulares para tratamento de dados |
| **Base Legal** | Art. 8º — Consentimento deve ser registrado de forma comprovável |
| **Dados Tratados** | Nome, e-mail, IP de origem, user-agent, data/hora, finalidade, base legal |
| **Categorias de Titulares** | Pacientes/avaliados |
| **Destinatários** | DPO, ANPD (sob solicitação) |
| **Transferência Internacional** | Não |
| **Prazo de Retenção** | Pelo menos 5 anos após revogação (comprovação de conformidade) |
| **Medidas de Segurança** | Banco PostgreSQL com SSL, acesso restrito por role |

---

### 6. Tentativas de Login (Brute Force Protection)

| Campo | Detalhe |
|-------|---------|
| **Finalidade** | Detectar e bloquear ataques de força bruta (LGPD Art. 46 — segurança) |
| **Base Legal** | Art. 7º, II — Obrigação legal; Art. 7º, IX — Legítimo interesse de segurança |
| **Dados Tratados** | Username (não real — pode ser inválido), IP de origem, resultado (sucesso/falha), timestamp |
| **Categorias de Titulares** | Qualquer pessoa que tente acessar o sistema |
| **Destinatários** | Apenas o sistema (automático) |
| **Transferência Internacional** | Não |
| **Prazo de Retenção** | 90 dias (`login_attempts` limpos pelo `retention.py`) |
| **Medidas de Segurança** | Dados mínimos, acesso restrito, limpeza automática agendada |

---

## Compartilhamento com Terceiros

| Terceiro | Dados Compartilhados | Base Legal | Contrato DPA? |
|----------|---------------------|------------|---------------|
| **Neon.tech** (banco) | Todos os dados do banco | Contrato | ⚠️ Verificar |
| **Vercel** (hosting) | Dados de requisição HTTP, logs | Contrato | ⚠️ Verificar |
| **Google Docs API** | Nome, conteúdo de laudos | Contrato + Consentimento | ⚠️ Verificar |
| **Google Gemini AI** | Texto dos laudos (anonimizado) | Contrato + Consentimento | ⚠️ Verificar |
| **n8n Cloud** | Webhooks com dados de atendimento | Contrato | ⚠️ Verificar |

> **Ação necessária:** Assinar DPA (Data Processing Agreement) com cada fornecedor.

---

## Transferências Internacionais (LGPD Art. 33)

| Destino | Fornecedor | Mecanismo de Legitimação |
|---------|-----------|--------------------------|
| EUA | Google (Docs, Gemini) | Cláusulas Contratuais Padrão (SCCs) |
| EUA | Vercel Inc. | Cláusulas Contratuais Padrão (SCCs) |
| EUA | Neon.tech | ⚠️ Verificar localização do servidor |

---

## Direitos dos Titulares e Como Exercê-los

| Direito | Art. LGPD | Como Exercer |
|---------|-----------|-------------|
| Confirmação de tratamento | Art. 18, I | GET `/api/lgpd/titulares/{email}/dados` |
| Acesso aos dados | Art. 18, II | GET `/api/lgpd/titulares/{email}/dados` |
| Retificação | Art. 18, III | Contato com DPO ou operador |
| Anonimização/bloqueio | Art. 18, IV | Contato com DPO |
| Portabilidade | Art. 18, V | GET `/api/lgpd/titulares/{email}/dados` |
| Eliminação (esquecimento) | Art. 18, VI | POST `/api/lgpd/titulares/esquecimento` |
| Revogação do consentimento | Art. 8º, §5º | DELETE `/api/lgpd/consentimentos/{email}` |
| Oposição | Art. 18, IX | Contato com DPO: `DPO_EMAIL` |

---

## Histórico de Revisões

| Versão | Data | Alteração | Responsável |
|--------|------|-----------|------------|
| 1.0 | 2026-05-18 | Versão inicial | DPO |

---

> **Aviso Legal:** Este documento deve ser revisado sempre que houver novas atividades
> de tratamento, mudança de fornecedores ou alteração das bases legais.
> A LGPD prevê que o ROPA deve ser disponibilizado à ANPD quando solicitado (Art. 37).
