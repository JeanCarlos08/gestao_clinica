import { NextRequest } from "next/server";
import sql from "@/lib/db";
import { getClientIp, jsonOk, jsonError } from "@/lib/utils";

export async function POST(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return jsonError("Não autenticado.", 401);

  const body = await request.json();
  const { email, nome, confirmacao } = body;

  if (confirmacao !== "CONFIRMO_EXCLUSAO_PERMANENTE") {
    return jsonError("Confirmação obrigatória: CONFIRMO_EXCLUSAO_PERMANENTE");
  }

  try {
    const consentResult = await sql`DELETE FROM consentimentos WHERE titular_email = ${email} RETURNING id`;
    let anonimizados = 0;

    if (nome) {
      const r1 = await sql`UPDATE atendimentos SET nome = '[DADOS REMOVIDOS - LGPD Art.18]' WHERE LOWER(nome) LIKE LOWER(${`%${nome}%`}) RETURNING id`;
      const r2 = await sql`UPDATE pacientes SET nome = '[DADOS REMOVIDOS - LGPD Art.18]', cpf = NULL, telefone = NULL, email = NULL, endereco = NULL, observacoes = NULL, foto = NULL, atualizado_em = NOW() WHERE LOWER(nome) LIKE LOWER(${`%${nome}%`}) RETURNING id`;
      anonimizados = r1.length + r2.length;
    }

    const crypto = await import("crypto");
    const titularHash = crypto.createHash("sha256").update(email).digest("hex");

    const audit = await sql`
      INSERT INTO lgpd_esquecimentos (titular_email, titular_hash, consentimentos_removidos, atendimentos_anonimizados)
      VALUES (${email}, ${titularHash}, ${consentResult.length}, ${anonimizados})
      RETURNING id
    `;

    return jsonOk({
      executado_em: new Date().toISOString(),
      consentimentos_removidos: consentResult.length,
      atendimentos_anonimizados: anonimizados,
      auditoria_id: audit[0].id,
      sucesso: true,
    });
  } catch (e: any) {
    return jsonError("Erro ao executar esquecimento: " + e.message, 500);
  }
}
