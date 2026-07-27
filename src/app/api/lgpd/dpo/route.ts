import { NextRequest } from "next/server";
import sql from "@/lib/db";
import { config } from "@/lib/config";
import { jsonOk, jsonError } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return jsonError("Não autenticado.", 401);

  try {
    const cfg = await sql`SELECT chave, valor FROM lgpd_config`;
    const data: Record<string, string> = {};
    cfg.forEach((r: any) => { data[r.chave] = r.valor; });

    return jsonOk({
      dpo_nome: data.dpo_nome || config.dpoNome,
      dpo_email: data.dpo_email || config.dpoEmail,
      dpo_telefone: data.dpo_telefone || "",
    });
  } catch (e: any) {
    return jsonError("Erro: " + e.message, 500);
  }
}

export async function PUT(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return jsonError("Não autenticado.", 401);

  const body = await request.json();
  try {
    for (const [key, value] of Object.entries(body)) {
      await sql`
        INSERT INTO lgpd_config (chave, valor, updated_at) VALUES (${key}, ${String(value)}, NOW())
        ON CONFLICT (chave) DO UPDATE SET valor = ${String(value)}, updated_at = NOW()
      `;
    }
    return jsonOk({ mensagem: "DPO atualizado com sucesso." });
  } catch (e: any) {
    return jsonError("Erro: " + e.message, 500);
  }
}
