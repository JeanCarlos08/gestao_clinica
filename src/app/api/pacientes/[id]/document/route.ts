import { NextRequest } from "next/server";
import sql from "@/lib/db";
import { requirePermission } from "@/lib/auth-helpers";
import { PERM_VIEW_ATENDIMENTOS } from "@/lib/constants";
import { jsonOk, jsonError } from "@/lib/utils";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requirePermission(request, PERM_VIEW_ATENDIMENTOS);
  if (auth instanceof Response) return auth;

  const pacienteId = parseInt(params.id);
  try {
    const docs = await sql`
      SELECT d.google_doc_id, d.id as db_id, d.titulo
      FROM documentos d
      INNER JOIN atendimentos a ON a.id = d.atendimento_id
      WHERE a.paciente_id = ${pacienteId}
      ORDER BY d.criado_em DESC
      LIMIT 1
    `;

    if (docs.length === 0) return jsonError("Documento não encontrado para esse paciente.", 404);
    return jsonOk({ google_doc_id: docs[0].google_doc_id, db_id: docs[0].db_id, titulo: docs[0].titulo });
  } catch (e: any) {
    return jsonError("Erro: " + e.message, 500);
  }
}
