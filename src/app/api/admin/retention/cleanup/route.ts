import { NextRequest } from "next/server";
import sql from "@/lib/db";
import { requirePermission } from "@/lib/auth-helpers";
import { PERM_MANAGE_CONFIGURACOES } from "@/lib/constants";
import { jsonOk, jsonError } from "@/lib/utils";

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, PERM_MANAGE_CONFIGURACOES);
  if (auth instanceof Response) return auth;

  const body = await request.json().catch(() => ({}));
  const auditDays = body.audit_days || 365;
  const loginDays = body.login_days || 90;

  try {
    const auditCutoff = new Date(Date.now() - auditDays * 86400000).toISOString();
    const loginCutoff = new Date(Date.now() - loginDays * 86400000).toISOString();

    const auditResult = await sql`DELETE FROM auditoria WHERE criado_em < ${auditCutoff}`;
    const loginResult = await sql`DELETE FROM login_attempts WHERE tentado_em < ${loginCutoff}`;

    return jsonOk({
      audit_logs_removed: auditResult.count,
      login_attempts_removed: loginResult.count,
      audit_retention_days: auditDays,
      login_retention_days: loginDays,
    });
  } catch (e: any) {
    return jsonError("Erro na limpeza: " + e.message, 500);
  }
}
