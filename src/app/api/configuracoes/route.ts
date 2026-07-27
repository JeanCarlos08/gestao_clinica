import { NextRequest } from "next/server";
import sql from "@/lib/db";
import { requirePermission, requireAuth } from "@/lib/auth-helpers";
import { PERM_VIEW_CONFIGURACOES, PERM_MANAGE_CONFIGURACOES } from "@/lib/constants";
import { jsonOk, jsonError } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, PERM_VIEW_CONFIGURACOES);
  if (auth instanceof Response) return auth;

  try {
    const prefs = await sql`SELECT pref_key, pref_value FROM user_preferences`;
    const config: Record<string, string> = {};
    prefs.forEach((p: any) => { config[p.pref_key] = p.pref_value; });

    const username = auth.sub || "";
    const users = await sql`SELECT id, username, display_name, email, role, created_at, last_login FROM users WHERE username = ${username}`;
    const user = users[0] || null;

    return jsonOk({
      clinica: config,
      usuario: {
        id: user?.id,
        username: user?.username || username,
        display_name: user?.display_name || "",
        email: user?.email || "",
        role: user?.role || "admin",
        created_at: user?.created_at,
        last_login: user?.last_login,
      },
    });
  } catch (e: any) {
    return jsonError("Erro: " + e.message, 500);
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requirePermission(request, PERM_MANAGE_CONFIGURACOES);
  if (auth instanceof Response) return auth;

  const body = await request.json();
  const entries = Object.entries(body).filter(([_, v]) => v !== null && v !== undefined);

  if (entries.length === 0) return jsonOk({ mensagem: "Nenhuma configuração para salvar." });

  try {
    for (const [key, value] of entries) {
      await sql`
        INSERT INTO user_preferences (pref_key, pref_value, updated_at)
        VALUES (${key}, ${String(value)}, NOW())
        ON CONFLICT (pref_key) DO UPDATE SET pref_value = ${String(value)}, updated_at = NOW()
      `;
    }
    return jsonOk({ mensagem: "Configurações salvas com sucesso.", campos_salvos: entries.map(([k]) => k) });
  } catch (e: any) {
    return jsonError("Erro ao salvar: " + e.message, 500);
  }
}
