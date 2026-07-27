import { NextRequest } from "next/server";
import sql from "@/lib/db";
import { requirePermission } from "@/lib/auth-helpers";
import { PERM_VIEW_ATENDIMENTOS } from "@/lib/constants";
import { jsonOk, jsonError } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, PERM_VIEW_ATENDIMENTOS);
  if (auth instanceof Response) return auth;

  const url = new URL(request.url);
  const dataInicio = url.searchParams.get("data_inicio");
  const dataFim = url.searchParams.get("data_fim");
  const status = url.searchParams.get("status");
  const modalidade = url.searchParams.get("modalidade");

  try {
    let atendimentos;

    if (dataInicio || dataFim || status || modalidade) {
      const start = dataInicio || "1900-01-01";
      const end = dataFim || "2099-12-31";

      atendimentos = await sql`
        SELECT a.*, d.id as doc_id
        FROM atendimentos a
        LEFT JOIN documentos d ON d.atendimento_id = a.id
        WHERE a.data >= ${start} AND a.data <= ${end}
        ${status ? sql`AND a.status = ${status}` : sql``}
        ${modalidade ? sql`AND a.modalidade = ${modalidade}` : sql``}
        ORDER BY a.data DESC, a.hora DESC
        LIMIT 5000
      `;
    } else {
      atendimentos = await sql`
        SELECT a.*, d.id as doc_id
        FROM atendimentos a
        LEFT JOIN documentos d ON d.atendimento_id = a.id
        ORDER BY a.data DESC, a.hora DESC
        LIMIT 5000
      `;
    }

    return jsonOk(atendimentos.map((a: any) => ({
      id: a.id,
      empresa: a.empresa,
      nome: a.nome,
      modalidade: a.modalidade,
      data: a.data ? new Date(a.data).toLocaleDateString("pt-BR") : "",
      hora: a.hora || "",
      status: a.status,
      paciente_id: a.paciente_id,
      has_laudo: !!a.doc_id,
      has_avaliacao: false,
    })));
  } catch (e: any) {
    return jsonError("Erro: " + e.message, 500);
  }
}
