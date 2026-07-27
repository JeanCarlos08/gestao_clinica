import { NextRequest } from "next/server";
import sql from "@/lib/db";
import { verifyAccessToken } from "@/lib/jwt";
import { jsonOk, jsonError } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return jsonError("Não autenticado.", 401);
  const payload = await verifyAccessToken(auth.slice(7));
  if (!payload) return jsonError("Token inválido.", 401);

  const tables = ["atendimentos", "pacientes", "users", "arquivos", "auditoria", "user_preferences", "documentos", "consentimentos", "login_attempts", "lgpd_esquecimentos", "lgpd_config", "notas"];
  const stats: Record<string, number> = {};

  for (const table of tables) {
    try {
      const result = await sql.unsafe(`SELECT COUNT(*) as cnt FROM ${table}`);
      stats[table] = parseInt(result[0]?.cnt ?? "0");
    } catch {
      stats[table] = 0;
    }
  }

  return jsonOk(stats);
}
