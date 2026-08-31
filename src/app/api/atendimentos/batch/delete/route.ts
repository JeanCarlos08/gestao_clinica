import { NextRequest } from "next/server";
import sql from "@/lib/db";
import { requirePermission } from "@/lib/auth-helpers";
import { PERM_DELETE_ATENDIMENTO } from "@/lib/constants";
import { jsonOk, jsonError } from "@/lib/utils";

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, PERM_DELETE_ATENDIMENTO);
  if (auth instanceof Response) return auth;

  const body = await request.json();
  const { ids } = body;

  if (!ids || !Array.isArray(ids) || ids.length === 0) return jsonError("Nenhum ID informado.");
  if (ids.length > 100) return jsonError("Máximo 100 IDs por operação batch.");

  let deleted = 0;
  for (const id of ids) {
    const result = await sql`DELETE FROM atendimentos WHERE id = ${id} RETURNING id`;
    if (result.length > 0) deleted++;
  }

  return jsonOk({ deleted, total: ids.length });
}
