"use client";

import Link from "next/link";

const PUBLIC_URL = "https://gestao-clinica.vercel.app";

const TERMS = `# Termos de Serviço — Clínica IA

Última atualização: 18/05/2026

Bem-vindo à Plataforma Clínica IA. Ao acessar ou usar nossos serviços, você concorda com estes Termos de Serviço e com a nossa Política de Privacidade.

1. Serviços
A Clínica IA fornece um sistema de gestão clínica, geração de laudos psicológicos e ferramentas de administração para profissionais e empresas.

2. Elegibilidade
Você declara que tem autoridade para usar a plataforma e que cumprirá as leis aplicáveis e normas profissionais.

3. Conta e Segurança
Você é responsável por manter a confidencialidade de suas credenciais. Notifique imediatamente sobre uso não autorizado.

4. Uso Aceitável
Sendo proibido: enviar ou armazenar material ilegal; tentar acessar recursos sem autorização.

5. Propriedade Intelectual
O software, conteúdo e marca pertencem à Clínica IA ou licenciantes. Usuários possuem direitos sobre dados e documentos que gerarem.

6. Limitação de Responsabilidade
A plataforma é fornecida "como está". Não garantimos resultados clínicos ou adequação a todos os casos.

7. Rescisão
Podemos suspender ou encerrar contas por violação destes Termos.

8. Lei Aplicável
Esses Termos são regidos pela legislação brasileira, especialmente LGPD.

9. Alterações
Podemos atualizar os Termos; notificaremos usuários de alterações materiais.

10. Contato
Encarregado de Dados (DPO): configure DPO_EMAIL no .env
`;

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--text-muted)] py-12 px-4">
      <div className="max-w-4xl mx-auto bg-[var(--card)] p-8 rounded-2xl border border-[var(--border)] shadow-lg">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white mb-1">Termos de Serviço</h1>
          <p className="text-xs text-[var(--text-muted)]">URL pública: <span className="text-[var(--primary)]">{PUBLIC_URL}/terms</span></p>
        </div>
        <p className="text-sm text-[var(--text-muted)] mb-6">Versão pública resumida — consulte o DPO para a versão completa.</p>
        <pre className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--text-muted)]">{TERMS}</pre>

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <Link href="/privacy" className="px-4 py-2 rounded-lg bg-white/[0.04] text-[var(--text-muted)] hover:text-white">Política de Privacidade</Link>
          <Link href="/" className="px-4 py-2 rounded-lg bg-white/[0.04] text-[var(--text-muted)] hover:text-white">Voltar</Link>
          <a
            href="https://github.com/JeanCarlos08/gestao_clinica/blob/main/docs/TERMS_OF_SERVICE.md"
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2 rounded-lg bg-[var(--primary)] text-black font-semibold hover:opacity-90"
          >
            Ver versão completa
          </a>
        </div>
      </div>
    </main>
  );
}
