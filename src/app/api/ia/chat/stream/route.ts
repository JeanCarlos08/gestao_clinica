import { NextRequest } from "next/server";
import sql from "@/lib/db";
import { requirePermission } from "@/lib/auth-helpers";
import { PERM_VIEW_DASHBOARD } from "@/lib/constants";
import { config } from "@/lib/config";
import { jsonError } from "@/lib/utils";

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
      (SELECT COUNT(*) FROM pacientes) as pacientes
    `;
    const recentes = await sql`SELECT empresa, nome, modalidade, status, data FROM atendimentos ORDER BY data DESC LIMIT 30`;
    const context = JSON.stringify({ stats: stats[0], atendimentos_recentes: recentes });

    const { GoogleGenAI } = await import("@google/genai");
    const genai = new GoogleGenAI({ apiKey: config.geminiApiKey });

    const prompt = `Você é a 'IA Assistente', assistente de gestão clínica. Dados:\n${context}\n\nPergunta: ${pergunta}\n\nResponda em Português do Brasil.`;

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const response = await genai.models.generateContent({
            model: config.geminiModel,
            contents: prompt,
          });
          const text = response.text || "";
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        } catch (e: any) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: e.message })}\n\n`));
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (e: any) {
    return jsonError("Erro: " + e.message, 500);
  }
}
