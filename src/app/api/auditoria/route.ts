import { NextRequest } from "next/server";
import sql from "@/lib/db";
import { requirePermission } from "@/lib/auth-helpers";
import { PERM_VIEW_LOGS } from "@/lib/constants";
import { jsonOk, jsonError } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, PERM_VIEW_LOGS);
  if (auth instanceof Response) return auth;

  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 200);

  try {
    const logs = await sql`SELECT * FROM auditoria ORDER BY criado_em DESC LIMIT ${limit}`;
    return jsonOk(logs.map((e: any) => ({
      id: e.id,
      acao: e.acao,
      entidade: e.entidade,
      entidade_id: e.entidade_id,
      detalhes: e.detalhes,
      usuario: e.usuario,
      criado_em: e.criado_em,
    })));
  } catch (e: any) {
    return jsonError("Erro: " + e.message, 500);
  }
}
