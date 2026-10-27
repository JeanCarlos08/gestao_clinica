import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth-helpers";
import { PERM_TRIGGER_AUTOMACOES } from "@/lib/constants";
import { config } from "@/lib/config";
import { jsonOk, jsonError, errMessage } from "@/lib/utils";

const PDF_PROMPT = `Você é um assistente especializado em gestão clínica de psicologia e medicina do trabalho.
Analise o conteúdo deste arquivo PDF e forneça um resumo executivo:
1. Pontos principais do laudo/avaliação.
2. Recomendações ou conclusões principais.
3. Algum dado de saúde crítico que mereça atenção.

Seja conciso e profissional. Se não conseguir ler os dados, informe.
Responda em Português do Brasil.`;

const VALIDATE_PROMPT = `Você é um classificador de segurança de dados.
Analise a primeira página deste PDF e responda APENAS com "VALIDO" ou "INVALIDO".

Regra: Deve ser considerado VALIDO apenas se parecer com um documento médico, psicológico, laudo, atestado, receita, ficha de RH, anamnese ou formulário clínico.
Se parecer uma conta de luz, recibo de supermercado, foto engraçada ou documento de carro, responda INVALIDO.`;

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, PERM_TRIGGER_AUTOMACOES);
  if (auth instanceof Response) return auth;

  if (!config.geminiApiKey) {
    return jsonError("IA (Gemini) não configurada. Defina GOOGLE_API_KEY.", 503);
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return jsonError("Envio inválido (multipart/form-data esperado).");
  }

  const mode = String(formData.get("mode") || "resumo");
  const file = formData.get("pdf") as File | null;
  if (!file) return jsonError("PDF não fornecido (campo 'pdf').");
  if (file.size > 20 * 1024 * 1024) return jsonError("PDF excede o limite de 20MB.");

  const bytes = Buffer.from(await file.arrayBuffer());
  if (bytes.subarray(0, 5).toString("ascii") !== "%PDF-") {
    return jsonError(`O arquivo '${file.name}' não é um PDF válido.`);
  }

  try {
    const { GoogleGenAI } = await import("@google/genai");
    const genai = new GoogleGenAI({ apiKey: config.geminiApiKey });

    const data = mode === "validar" ? bytes.subarray(0, 500000) : bytes;
    const response = await genai.models.generateContent({
      model: config.geminiModel,
      contents: [
        mode === "validar" ? VALIDATE_PROMPT : PDF_PROMPT,
        { inlineData: { mimeType: "application/pdf", data: data.toString("base64") } },
      ],
    });

    const res = (response.text || "").trim();
    if (mode === "validar") {
      const valido = res.toUpperCase().includes("VALIDO") && !res.toUpperCase().includes("INVALIDO");
      return jsonOk({ valido, msg: valido ? "Documento clínico aceito." : "Selecione um PDF clínico (ex.: laudo, atestado, exame)." });
    }
    return jsonOk({ texto: res || "A IA não retornou uma resposta válida." });
  } catch (e) {
    return jsonError("A IA não pôde analisar o PDF agora: " + errMessage(e), 503);
  }
}
