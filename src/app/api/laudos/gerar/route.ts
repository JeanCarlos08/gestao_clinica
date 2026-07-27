import { NextRequest } from "next/server";
import sql from "@/lib/db";
import { requirePermission } from "@/lib/auth-helpers";
import { PERM_MANAGE_DOCUMENTOS } from "@/lib/constants";
import { config } from "@/lib/config";
import { buildGoogleDocEmbedUrl, formatDateBr, jsonOk, jsonError } from "@/lib/utils";

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, PERM_MANAGE_DOCUMENTOS);
  if (auth instanceof Response) return auth;

  const body = await request.json();
  const { nome_paciente, data_nascimento, cpf, empresa, data_exame, motivo_avaliacao, avaliacao_psicologica, admissional, periodica, pessoal, mudanca_funcao, itens_auxiliados, conclusao, psicologista_nome, psicologista_crp } = body;

  if (!nome_paciente || !cpf || !data_exame || !psicologista_crp) {
    return jsonError("Campos obrigatórios: nome_paciente, cpf, data_exame, psicologista_crp.");
  }

  // Save to DB as document record (Google Docs integration would need googleapis)
  try {
    const titulo = `Laudo - ${nome_paciente}`;
    const result = await sql`
      INSERT INTO documentos (titulo, google_doc_id, tipo)
      VALUES (${titulo}, ${"pending-" + Date.now()}, 'laudo')
      RETURNING id, titulo
    `;

    return jsonOk({
      id: result[0].titulo,
      titulo: result[0].titulo,
      url: "",
      embed_url: "",
      mensagem: "Laudo registrado. Integração Google Docs requer configuração de service account.",
    }, 201);
  } catch (e: any) {
    return jsonError("Erro ao gerar laudo: " + e.message, 500);
  }
}
