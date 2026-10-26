import { NextRequest } from "next/server";
import sql from "@/lib/db";
import { requirePermission } from "@/lib/auth-helpers";
import { PERM_VIEW_ATENDIMENTOS } from "@/lib/constants";
import { jsonOk, jsonError } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, PERM_VIEW_ATENDIMENTOS);
  if (auth instanceof Response) return auth;

  const url = new URL(request.url);
  const nome = (url.searchParams.get("nome") || "").trim();
  const cpf = (url.searchParams.get("cpf") || "").trim();

  if (!nome) return jsonOk([]);

  try {
    // Mesma regra do MVP Psicologia: nome exato (case-insensitive) OU CPF igual.
    const rows = await sql`
      SELECT id, nome, cpf, telefone, ativo FROM pacientes
      WHERE LOWER(nome) = LOWER(${nome})
         OR (${cpf !== ""} AND cpf = ${cpf})
    `;
    return jsonOk(rows.map(r => ({ id: r.id, nome: r.nome, cpf: r.cpf, telefone: r.telefone, ativo: !!r.ativo })));
  } catch {
    return jsonError("Erro ao verificar duplicidade.", 500);
  }
}
