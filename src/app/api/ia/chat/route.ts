import { NextRequest } from "next/server";
import sql from "@/lib/db";
import { requirePermission } from "@/lib/auth-helpers";
import { PERM_VIEW_DASHBOARD } from "@/lib/constants";
import { config } from "@/lib/config";
import { jsonOk, jsonError, errMessage} from "@/lib/utils";

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, PERM_VIEW_DASHBOARD);
  if (auth instanceof Response) return auth;

  const body = await request.json();
  const { pergunta } = body;

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

    const prompt = `Você é a 'IA Assistente', assistente de gestão clínica. Com base nos dados abaixo (JSON), responda à pergunta do usuário.\n\nDados atuais:\n${context}\n\nPergunta: ${pergunta}\n\nSeja prestativa, use tabelas Markdown se necessário. Cite nomes ou empresas se presentes nos dados. Responda em Português do Brasil.`;

    const models = [
      config.geminiModel,
      ...config.geminiFallbackModels.filter((m) => m && m !== config.geminiModel),
    ];

    let lastErr: unknown;
    for (const model of models) {
      try {
        const response = await genai.models.generateContent({
          model,
          contents: prompt,
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
