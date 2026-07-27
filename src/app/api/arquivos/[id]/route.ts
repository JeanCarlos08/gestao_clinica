import { NextRequest } from "next/server";
import sql from "@/lib/db";
import { requirePermission } from "@/lib/auth-helpers";
import { PERM_MANAGE_DOCUMENTOS } from "@/lib/constants";
import { jsonOk, jsonError } from "@/lib/utils";

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requirePermission(request, PERM_MANAGE_DOCUMENTOS);
  if (auth instanceof Response) return auth;

  const id = parseInt(params.id);
  try {
    const result = await sql`DELETE FROM arquivos WHERE id = ${id}`;
    if (result.count === 0) return jsonError("Arquivo não encontrado.", 404);
    return jsonOk({ mensagem: "Arquivo excluído com sucesso." });
  } catch (e: any) {
    return jsonError("Erro: " + e.message, 500);
  }
}
