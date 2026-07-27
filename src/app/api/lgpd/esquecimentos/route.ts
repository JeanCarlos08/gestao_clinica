import { NextRequest } from "next/server";
import sql from "@/lib/db";
import { jsonOk, jsonError } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return jsonError("Não autenticado.", 401);

  try {
    const result = await sql`SELECT id, titular_hash, consentimentos_removidos, atendimentos_anonimizados, executado_em FROM lgpd_esquecimentos ORDER BY executado_em DESC LIMIT 100`;
    return jsonOk(result);
  } catch (e: any) {
    return jsonError("Erro: " + e.message, 500);
  }
}
