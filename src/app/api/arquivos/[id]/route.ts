import { NextRequest } from "next/server";
import sql from "@/lib/db";
import { requirePermission } from "@/lib/auth-helpers";
import { PERM_VIEW_DOCUMENTOS, PERM_MANAGE_DOCUMENTOS } from "@/lib/constants";
import { jsonOk, jsonError, errMessage } from "@/lib/utils";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requirePermission(request, PERM_VIEW_DOCUMENTOS);
  if (auth instanceof Response) return auth;

  const id = parseInt(params.id);
  if (!Number.isInteger(id)) return jsonError("ID inválido.");
  try {
    const rows = await sql`SELECT filename, content, content_type FROM arquivos WHERE id = ${id}`;
    if (rows.length === 0) return jsonError("Arquivo não encontrado.", 404);
    const a = rows[0];
    return new Response(new Uint8Array(a.content), {
      headers: {
        "Content-Type": a.content_type || "application/octet-stream",
        "Content-Disposition": `inline; filename="${a.filename || `arquivo-${id}`}"`,
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (e) {
    return jsonError("Erro: " + errMessage(e), 500);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requirePermission(request, PERM_MANAGE_DOCUMENTOS);
  if (auth instanceof Response) return auth;

  const id = parseInt(params.id);
  try {
    const result = await sql`DELETE FROM arquivos WHERE id = ${id} RETURNING id`;
    if (result.length === 0) return jsonError("Arquivo não encontrado.", 404);
    return jsonOk({ mensagem: "Arquivo excluído com sucesso." });
  } catch (e) {
    return jsonError("Erro: " + errMessage(e), 500);
  }
}
