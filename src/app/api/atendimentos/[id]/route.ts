import { NextRequest } from "next/server";
import sql from "@/lib/db";
import { requirePermission } from "@/lib/auth-helpers";
import { PERM_EDIT_ATENDIMENTO, PERM_DELETE_ATENDIMENTO } from "@/lib/constants";
import { jsonOk, jsonError } from "@/lib/utils";

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requirePermission(request, PERM_EDIT_ATENDIMENTO);
  if (auth instanceof Response) return auth;

  const id = parseInt(params.id);
  const body = await request.json();
  const { empresa, nome, modalidade, data, hora, status, paciente_id } = body;

  try {
    const result = await sql`
      UPDATE atendimentos SET
        empresa = ${empresa}, nome = ${nome}, modalidade = ${modalidade},
        data = ${data}, hora = ${hora}, status = ${status || "Agendado"},
        paciente_id = ${paciente_id || null}
      WHERE id = ${id}
    `;

    if (result.count === 0) return jsonError("Atendimento não encontrado.", 404);
    return jsonOk({ mensagem: "Atendimento atualizado com sucesso." });
  } catch (e: any) {
    return jsonError("Erro ao atualizar: " + e.message, 500);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requirePermission(request, PERM_DELETE_ATENDIMENTO);
  if (auth instanceof Response) return auth;

  const id = parseInt(params.id);
  try {
    const result = await sql`DELETE FROM atendimentos WHERE id = ${id}`;
    if (result.count === 0) return jsonError("Atendimento não encontrado.", 404);
    return jsonOk({ mensagem: "Atendimento excluído com sucesso." });
  } catch (e: any) {
    return jsonError("Erro ao excluir: " + e.message, 500);
  }
}
