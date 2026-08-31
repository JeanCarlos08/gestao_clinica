import { NextRequest } from "next/server";
import sql from "@/lib/db";
import { verifyAccessToken } from "@/lib/jwt";
import { jsonOk, jsonError } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return jsonError("Não autenticado.", 401);
  const payload = await verifyAccessToken(auth.slice(7));
  if (!payload) return jsonError("Token inválido.", 401);

  const tables = ["atendimentos", "pacientes", "users", "arquivos", "auditoria", "user_preferences", "documentos", "consentimentos", "login_attempts", "lgpd_esquecimentos", "lgpd_config", "notas"] as const;
  const stats: Record<string, number> = {};

  for (const table of tables) {
    try {
      let result: Record<string, string>[] = [];
      // tabela é whitelisted acima, então o uso de switch garante query estática segura (sem sql.unsafe que não existe no neon serverless)
      switch (table) {
        case "atendimentos": result = await sql`SELECT COUNT(*) as cnt FROM atendimentos` as Record<string, string>[]; break;
        case "pacientes": result = await sql`SELECT COUNT(*) as cnt FROM pacientes` as Record<string, string>[]; break;
        case "users": result = await sql`SELECT COUNT(*) as cnt FROM users` as Record<string, string>[]; break;
        case "arquivos": result = await sql`SELECT COUNT(*) as cnt FROM arquivos` as Record<string, string>[]; break;
        case "auditoria": result = await sql`SELECT COUNT(*) as cnt FROM auditoria` as Record<string, string>[]; break;
        case "user_preferences": result = await sql`SELECT COUNT(*) as cnt FROM user_preferences` as Record<string, string>[]; break;
        case "documentos": result = await sql`SELECT COUNT(*) as cnt FROM documentos` as Record<string, string>[]; break;
        case "consentimentos": result = await sql`SELECT COUNT(*) as cnt FROM consentimentos` as Record<string, string>[]; break;
        case "login_attempts": result = await sql`SELECT COUNT(*) as cnt FROM login_attempts` as Record<string, string>[]; break;
        case "lgpd_esquecimentos": result = await sql`SELECT COUNT(*) as cnt FROM lgpd_esquecimentos` as Record<string, string>[]; break;
        case "lgpd_config": result = await sql`SELECT COUNT(*) as cnt FROM lgpd_config` as Record<string, string>[]; break;
        case "notas": result = await sql`SELECT COUNT(*) as cnt FROM notas` as Record<string, string>[]; break;
      }
      stats[table] = parseInt(result[0]?.cnt ?? "0");
    } catch {
      stats[table] = 0;
    }
  }

  return jsonOk(stats);
}
