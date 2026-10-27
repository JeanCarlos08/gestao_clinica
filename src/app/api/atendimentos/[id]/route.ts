import { NextRequest } from "next/server";
import sql from "@/lib/db";
import { requirePermission } from "@/lib/auth-helpers";
import { PERM_EDIT_ATENDIMENTO, PERM_DELETE_ATENDIMENTO } from "@/lib/constants";
import { jsonOk, jsonError, errMessage} from "@/lib/utils";

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requirePermission(request, PERM_EDIT_ATENDIMENTO);
  if (auth instanceof Response) return auth;

  const id = parseInt(params.id);
  const body = await request.json();
  const { empresa, nome, modalidade, data, hora, status, paciente_id, observacoes, laudo_pdf, avaliacao_pdf } = body;

  try {
    const result = await sql`
      UPDATE atendimentos SET
        empresa = ${empresa || "Particular"}, nome = ${nome}, modalidade = ${modalidade},
        data = ${data}, hora = ${hora}, status = ${status || "Agendado"},
        paciente_id = ${paciente_id || null},
        observacoes = COALESCE(${observacoes === undefined ? null : observacoes || null}, observacoes),
        laudo_pdf = COALESCE(${laudo_pdf === undefined ? null : laudo_pdf || null}, laudo_pdf),
        avaliacao_pdf = COALESCE(${avaliacao_pdf === undefined ? null : avaliacao_pdf || null}, avaliacao_pdf)
      WHERE id = ${id}
      RETURNING id
    `;

    if (result.length === 0) return jsonError("Atendimento não encontrado.", 404);
    return jsonOk({ mensagem: "Atendimento atualizado com sucesso." });
  } catch (e) {
    return jsonError("Erro ao atualizar: " + errMessage(e), 500);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requirePermission(request, PERM_DELETE_ATENDIMENTO);
  if (auth instanceof Response) return auth;

  const id = parseInt(params.id);
  try {
    const result = await sql`DELETE FROM atendimentos WHERE id = ${id} RETURNING id`;
    if (result.length === 0) return jsonError("Atendimento não encontrado.", 404);
    return jsonOk({ mensagem: "Atendimento excluído com sucesso." });
  } catch (e) {
    return jsonError("Erro ao excluir: " + errMessage(e), 500);
  }
}
