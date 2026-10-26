import { NextRequest } from "next/server";
import sql from "@/lib/db";
import { requirePermission } from "@/lib/auth-helpers";
import { PERM_VIEW_ATENDIMENTOS } from "@/lib/constants";
import { jsonOk, jsonError, errMessage } from "@/lib/utils";

// Histórico de atendimentos do prontuário (streamlit: aba 📅 Histórico de Atendimentos).
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requirePermission(request, PERM_VIEW_ATENDIMENTOS);
  if (auth instanceof Response) return auth;

  const id = parseInt(params.id);
  if (!Number.isInteger(id)) return jsonError("ID inválido.", 400);

  try {
    const rows = await sql`
      SELECT id, empresa, nome, modalidade, data, hora, status
      FROM atendimentos
      WHERE paciente_id = ${id}
      ORDER BY data DESC, hora DESC
      LIMIT 200
    `;
    return jsonOk(rows.map(r => ({
      id: r.id,
      empresa: r.empresa,
      nome: r.nome,
      modalidade: r.modalidade,
      data: r.data ? new Date(String(r.data)).toISOString().split("T")[0] : null,
      hora: typeof r.hora === "string" ? r.hora.slice(0, 5) : r.hora,
      status: r.status,
    })));
  } catch (e) {
    return jsonError("Erro ao listar atendimentos do paciente: " + errMessage(e), 500);
  }
}
