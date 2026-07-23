# Política de Privacidade — Clínica IA

**Controlador de Dados:** Clínica IA / mvpdepsicologia  
**Encarregado de Dados (DPO):** Configurado em variável `DPO_NOME` / `DPO_EMAIL`  
**Vigência:** A partir de 18/05/2026  
**Lei aplicável:** LGPD — Lei nº 13.709/2018

---

## 1. Quem Somos

A **Clínica IA** é um sistema de gestão clínica e elaboração de laudos psicológicos,
desenvolvido para auxiliar profissionais de psicologia no atendimento a empresas e pacientes.

**Contato do Encarregado de Dados (DPO):**
- E-mail: *(configurar `DPO_EMAIL` no `.env`)*
- Para exercer seus direitos: envie e-mail com o assunto **"Direitos LGPD"**

---

## 2. Quais Dados Coletamos e Por Quê

| Dado | Finalidade | Base Legal (LGPD) |
|------|-----------|-------------------|
| Nome completo | Identificar o avaliado nos atendimentos | Art. 7º, V — Execução de contrato |
| Empresa/empregador | Vincular atendimento à empresa contratante | Art. 7º, V — Execução de contrato |
| Data e hora do atendimento | Controle de agenda | Art. 7º, V — Execução de contrato |
| Modalidade de atendimento | Classificação do tipo de serviço | Art. 7º, V — Execução de contrato |
| Conteúdo de laudos (dado de saúde) | Elaborar laudos psicológicos | Art. 11, II, f — Tutela da saúde |
| Username e senha (hash) | Autenticar usuários do sistema | Art. 7º, II — Obrigação legal de segurança |
| Logs de acesso e auditoria | Segurança e conformidade | Art. 7º, II — Obrigação legal |
| IP e user-agent (consentimento) | Comprovar consentimento | Art. 7º, I — Consentimento |

### Dados que NÃO coletamos
- CPF ou RG dos avaliados (não é campo do sistema)
- Dados bancários ou financeiros
- Geolocalização
- Dados de navegação além do necessário para autenticação

---

## 3. Como Usamos Seus Dados

Os dados são utilizados **exclusivamente** para:

1. **Gestão de atendimentos** — agendar, controlar e registrar sessões clínicas
2. **Elaboração de laudos** — gerar laudos psicológicos com auxílio de inteligência artificial
3. **Comunicação** — enviar resultados à empresa contratante
4. **Auditoria e segurança** — manter registro de ações no sistema (LGPD Art. 46)
5. **Conformidade legal** — cumprir obrigações do Conselho Federal de Psicologia (CFP)

**Não** vendemos, alugamos ou compartilhamos dados pessoais com terceiros para fins comerciais.

---

## 4. Com Quem Compartilhamos

| Destinatário | O que é Compartilhado | Motivo |
|-------------|----------------------|--------|
| Empresa contratante | Laudo final (resultado) | Finalidade do serviço |
| Google LLC (Docs/Gemini) | Conteúdo de laudos | Elaboração e armazenamento |
| Neon.tech | Banco de dados completo | Hospedagem |
| Vercel Inc. | Dados de requisição HTTP | Hospedagem do sistema |

Todas as transferências internacionais (Google, Vercel) são realizadas com base em
**Cláusulas Contratuais Padrão (SCCs)**, conforme LGPD Art. 33, II.

---

## 5. Por Quanto Tempo Mantemos Seus Dados

| Tipo de Dado | Prazo | Base |
|-------------|-------|------|
| Laudos psicológicos | **7 anos** | CFP Resolução 001/2009; Código Civil Art. 206 |
| Registros de atendimento | **5 anos** | Obrigação contratual |
| Logs de auditoria | **3 anos** | Conformidade LGPD |
| Registros de consentimento | **5 anos após revogação** | Comprovação de conformidade |
| Tentativas de login | **90 dias** | Segurança (minimização LGPD) |
| Arquivos temporários | **30 dias** | Minimização de dados |

Após o prazo, os dados são **deletados permanentemente ou anonimizados**.

---

## 6. Seus Direitos como Titular (LGPD Art. 18)

Você tem os seguintes direitos sobre seus dados:

| Direito | Como Exercer |
|---------|-------------|
| **Acesso** — saber quais dados temos | E-mail ao DPO com assunto "Direito de Acesso" |
| **Retificação** — corrigir dados incorretos | E-mail ao DPO com assunto "Retificação de Dados" |
| **Anonimização/Bloqueio** — limitar tratamento | E-mail ao DPO |
| **Portabilidade** — receber seus dados | E-mail ao DPO ou API: `GET /api/lgpd/titulares/{email}/dados` |
| **Eliminação (Esquecimento)** — apagar seus dados | E-mail ao DPO ou API: `POST /api/lgpd/titulares/esquecimento` |
| **Revogação do Consentimento** | E-mail ao DPO ou API: `DELETE /api/lgpd/consentimentos/{email}` |
| **Oposição** — opor-se ao tratamento | E-mail ao DPO |
| **Informação** — saber com quem compartilhamos | Esta Política de Privacidade |

**Prazo de resposta:** Até **15 dias úteis** após a solicitação (LGPD Art. 18, §5º).

**Reclamação à ANPD:** Se não ficou satisfeito com nossa resposta, você pode registrar
uma reclamação na Autoridade Nacional de Proteção de Dados:
- Site: [www.gov.br/anpd](https://www.gov.br/anpd)
- E-mail: protecaodados@anpd.gov.br

---

## 7. Segurança dos Dados

Implementamos as seguintes medidas técnicas para proteger seus dados:

- ✅ **Autenticação** com JWT e senhas com hash bcrypt
- ✅ **Controle de acesso** por função (RBAC: admin, psicólogo, recepcionista)
- ✅ **Criptografia em trânsito** (HTTPS/TLS em todas as conexões)
- ✅ **Pseudonimização** de dados pessoais em logs de sistema
- ✅ **Log de auditoria** de todas as ações relevantes
- ✅ **Proteção contra força bruta** (bloqueio após 5 tentativas falhas)
- ✅ **Rate limiting** (100 requisições/hora por IP)
- ✅ **Resposta a incidentes** documentada (`INCIDENT_RESPONSE.md`)
- ✅ **Backups** com criptografia e acesso restrito

Em caso de incidente de segurança que possa afetar seus dados, notificaremos a **ANPD**
em até **48 horas** e os titulares afetados em até **72 horas** (LGPD Art. 48).

---

## 8. Consentimento

Quando a base legal for o **consentimento**, você:

- Será informado **antes** da coleta sobre: quais dados, para qual finalidade, por quanto tempo
- Pode **revogar** o consentimento a qualquer momento sem penalidade (LGPD Art. 8º, §5º)
- A revogação **não afeta** o tratamento realizado com base em outras bases legais (ex: contrato)

---

## 9. Cookies e Tecnologias de Rastreamento

O sistema utiliza:
- **Cookies de sessão** (autenticação JWT) — necessários para o funcionamento
- **Não** utiliza cookies de rastreamento, analytics de terceiros ou pixels de publicidade

---

## 10. Alterações nesta Política

Esta política pode ser atualizada periodicamente. Em caso de alterações significativas,
notificaremos os usuários do sistema com antecedência mínima de **30 dias**.

**Histórico:**

| Versão | Data | Alteração |
|--------|------|-----------|
| 1.0 | 2026-05-18 | Versão inicial completa |

---

## 11. Contato

Para qualquer dúvida sobre esta Política ou para exercer seus direitos:

**Encarregado de Dados (DPO)**
- E-mail: *(configurar `DPO_EMAIL` no `.env`)*
- Assunto: "Privacidade de Dados — Clínica IA"

**Autoridade Nacional de Proteção de Dados (ANPD)**
- Site: [www.gov.br/anpd](https://www.gov.br/anpd)

---

*Esta Política foi elaborada em conformidade com a Lei Geral de Proteção de Dados
(LGPD — Lei nº 13.709/2018) e entrou em vigor em 18/05/2026.*
