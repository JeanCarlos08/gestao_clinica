import { NextRequest } from "next/server";
import sql from "@/lib/db";
import { getClientIp, jsonOk, jsonError } from "@/lib/utils";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { titular_nome, titular_email, finalidade, base_legal, provider } = body;
  const ip = getClientIp(request);
  const userAgent = request.headers.get("user-agent") || "";

  if (!titular_nome || !finalidade) {
    return jsonError("titular_nome e finalidade são obrigatórios.");
  }

  try {
    const result = await sql`
      INSERT INTO consentimentos (titular_nome, titular_email, finalidade, base_legal, aceito, ip_origem, user_agent)
      VALUES (${titular_nome}, ${titular_email || ""}, ${finalidade}, ${base_legal || "consentimento"}, true, ${ip}, ${userAgent})
      RETURNING id
    `;
    return jsonOk({ sucesso: true, consentimento_id: result[0].id, mensagem: "Consentimento registrado." }, 201);
  } catch (e: any) {
    return jsonError("Erro: " + e.message, 500);
  }
}

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return jsonError("Não autenticado.", 401);

  const url = new URL(request.url);
  const email = url.searchParams.get("email");

  if (email) {
    const result = await sql`SELECT * FROM consentimentos WHERE titular_email = ${email} ORDER BY criado_em DESC`;
    return jsonOk(result);
  }

  const result = await sql`SELECT * FROM consentimentos ORDER BY criado_em DESC LIMIT 100`;
  return jsonOk(result);
}
