"use client";

import Link from "next/link";

const POLICY = `# Política de Privacidade — MVP Psicologia

**Controlador de Dados:** MVP Psicologia  
**Encarregado de Dados (DPO):** Configurado em variável DPO_NOME / DPO_EMAIL  
**Vigência:** A partir de 18/05/2026  
**Lei aplicável:** LGPD — Lei nº 13.709/2018

---

## 1. Quem Somos

A **MVP Psicologia** é um sistema de prontuário, agenda e evoluções para psicólogos,
desenvolvido para auxiliar profissionais de psicologia no atendimento a empresas e pacientes.

**Contato do Encarregado de Dados (DPO):**
- E-mail: *(configurar DPO_EMAIL no .env)*
- Para exercer seus direitos: envie e-mail com o assunto **"Direitos LGPD"**

---

## 2. Quais Dados Coletamos e Por Quê

(Resumido — consulte o repositório para a versão completa)

- Nome completo — Identificação nos atendimentos (base: execução de contrato)
- Conteúdo de laudos (dados de saúde) — Elaboração de laudos (base: tutela da saúde)
- Username/senha (hash) — Autenticação
- Logs e IPs — Segurança e comprovação de consentimento

---

## 3. Como Usamos Seus Dados

Os dados são utilizados exclusivamente para gestão de atendimentos, elaboração de laudos, comunicação, auditoria e conformidade legal.

---

## 4. Com Quem Compartilhamos

Google (Docs/Gemini) para edição e processamento de laudos; Vercel/hostings para hospedagem.

---

## 5. Por Quanto Tempo Mantemos Seus Dados

- Laudos: 7 anos
- Logs de auditoria: 3 anos
- Consentimentos: 5 anos após revogação

---

## 6. Seus Direitos (LGPD Art.18)

Acesso, retificação, anonimização, portabilidade, eliminação, revogação do consentimento e oposição — contate o DPO.

---

## 7. Segurança dos Dados

Medidas técnicas: JWT, hashing de senhas, criptografia em trânsito, pseudonimização e auditoria.

---

## 11. Contato

Encarregado de Dados (DPO): configure DPO_EMAIL no .env

*Versão pública resumida. Consulte docs/PRIVACY_POLICY.md para a versão completa.*
`;

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--text-muted)] py-12 px-4">
      <div className="max-w-4xl mx-auto bg-[var(--card)] p-8 rounded-2xl border border-[var(--border)] shadow-lg">
        <h1 className="text-2xl font-bold text-white mb-4">Política de Privacidade</h1>
        <p className="text-sm text-[var(--text-muted)] mb-6">Versão pública resumida — consulte o DPO para a versão completa.</p>
        <pre className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--text-muted)]">{POLICY}</pre>

        <div className="mt-6 flex justify-end gap-3">
          <Link href="/" className="px-4 py-2 rounded-lg bg-white/[0.04] text-[var(--text-muted)]">Voltar</Link>
          <a href="/docs/PRIVACY_POLICY.md" target="_blank" rel="noreferrer" className="px-4 py-2 rounded-lg bg-[var(--primary)] text-black font-semibold">Ver versão completa</a>
        </div>
      </div>
    </main>
  );
}
