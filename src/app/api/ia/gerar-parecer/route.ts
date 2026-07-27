import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth-helpers";
import { PERM_TRIGGER_AUTOMACOES } from "@/lib/constants";
import { config } from "@/lib/config";
import { jsonOk, jsonError } from "@/lib/utils";

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, PERM_TRIGGER_AUTOMACOES);
  if (auth instanceof Response) return auth;

  const body = await request.json();
  const { notas, modalidade } = body;

  if (!config.geminiApiKey) {
    return jsonError("IA (Gemini) não configurada. Defina GOOGLE_API_KEY.", 503);
  }

  try {
    const { GoogleGenAI } = await import("@google/genai");
    const genai = new GoogleGenAI({ apiKey: config.geminiApiKey });

    const prompt = `Você é um psicólogo/psiquiatra experiente. Escreva um parágrafo formal e bem estruturado de parecer clínico baseado nas anotações cruas abaixo. A modalidade do atendimento é '${modalidade || "Psicologia Clínica"}'. Mantenha um tom profissional, técnico e objetivo, pronto para ir para um prontuário.\n\nAnotações brutas:\n${notas}`;

    const response = await genai.models.generateContent({
      model: config.geminiModel,
      contents: prompt,
    });

    const text = response.text || "";
    return jsonOk({ texto: text.trim(), model: config.geminiModel });
  } catch (e: any) {
    return jsonError("Falha ao gerar texto com IA: " + e.message, 503);
  }
}
