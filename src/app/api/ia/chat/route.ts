import { NextRequest } from "next/server";
import sql from "@/lib/db";
import { requirePermission } from "@/lib/auth-helpers";
import { PERM_VIEW_DASHBOARD } from "@/lib/constants";
import { config } from "@/lib/config";
import { jsonOk, jsonError, errMessage} from "@/lib/utils";

interface ChatMsg { role: "user" | "assistant"; text: string }

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, PERM_VIEW_DASHBOARD);
  if (auth instanceof Response) return auth;

  const body = await request.json();
  const { pergunta, historico } = body as { pergunta?: string; historico?: ChatMsg[] };

  if (!pergunta) return jsonError("Pergunta é obrigatória.");
  if (!config.geminiApiKey) return jsonError("IA não configurada.", 503);

  try {
    const stats = await sql`SELECT
      (SELECT COUNT(*) FROM atendimentos) as total,
      (SELECT COUNT(*) FROM pacientes) as pacientes,
      (SELECT COUNT(*) FROM atendimentos WHERE status = 'Agendado') as agendados
    `;
    const recentes = await sql`SELECT empresa, nome, modalidade, status, data FROM atendimentos ORDER BY data DESC LIMIT 30`;

    const context = JSON.stringify({ stats: stats[0], atendimentos_recentes: recentes });

    const { GoogleGenAI } = await import("@google/genai");
    const genai = new GoogleGenAI({ apiKey: config.geminiApiKey });

    const systemPrompt = `Você é a 'IA Assistente', uma assistente inteligente e conversacional, similar ao ChatGPT, dentro de um sistema de gestão clínica (prontuários, agenda e atendimentos de uma clínica de psicologia).

Regras:
- Você pode conversar sobre QUALQUER assunto (conhecimentos gerais, explicações, redação, resumos, ideias, etc.) como um assistente completo.
- Quando a pergunta envolver a clínica, pacientes, atendimentos, agenda ou relatórios, use OBRIGATORIAMENTE os dados JSON abaixo e cite nomes/empresas reais presentes neles.
- Seja prestativa, natural e direta. Use tabelas Markdown quando ajudar.
- Responda sempre em Português do Brasil.
- Mantenha a coerência com as mensagens anteriores da conversa (você lembra do histórico).

Dados atuais da clínica:
${context}`;

    // Histórico da conversa (memória) — só as últimas 20 mensagens
    const hist = (Array.isArray(historico) ? historico : [])
      .filter(m => (m.role === "user" || m.role === "assistant") && typeof m.text === "string" && m.text.trim())
      .slice(-20);

    const contents: { role: string; parts: { text: string }[] }[] = [
      ...hist.map(m => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.text }],
      })),
      { role: "user", parts: [{ text: pergunta }] },
    ];

    const models = [
      config.geminiModel,
      ...config.geminiFallbackModels.filter((m) => m && m !== config.geminiModel),
    ];

    let lastErr: unknown;
    for (const model of models) {
      try {
        const response = await genai.models.generateContent({
          model,
          contents,
          config: { systemInstruction: systemPrompt },
        });
        return jsonOk({ resposta: response.text || "Não obtive resposta da IA." });
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr instanceof Error ? lastErr : new Error("Falha ao consultar a IA.");
  } catch (e) {
    return jsonError("Erro no chat: " + errMessage(e), 500);
  }
}
