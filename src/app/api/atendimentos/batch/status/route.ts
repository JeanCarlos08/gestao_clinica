import { NextRequest } from "next/server";
import sql from "@/lib/db";
import { requirePermission } from "@/lib/auth-helpers";
import { PERM_EDIT_ATENDIMENTO } from "@/lib/constants";
import { jsonOk, jsonError } from "@/lib/utils";

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, PERM_EDIT_ATENDIMENTO);
  if (auth instanceof Response) return auth;

  const body = await request.json();
  const { ids, status } = body;

  if (!ids || !Array.isArray(ids) || ids.length === 0) return jsonError("Nenhum ID informado.");
  if (ids.length > 100) return jsonError("Máximo 100 IDs por operação batch.");

  let updated = 0;
  for (const id of ids) {
    const result = await sql`UPDATE atendimentos SET status = ${status} WHERE id = ${id}`;
    if (result.count > 0) updated++;
  }

  return jsonOk({ updated, total: ids.length });
}
