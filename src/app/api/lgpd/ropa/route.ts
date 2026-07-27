import { NextRequest } from "next/server";
import sql from "@/lib/db";
import { jsonOk, jsonError } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return jsonError("Não autenticado.", 401);

  try {
    const c = await sql`SELECT COUNT(*) as cnt FROM consentimentos WHERE revogado = false`;
    const a = await sql`SELECT COUNT(*) as cnt FROM atendimentos`;
    const e = await sql`SELECT COUNT(*) as cnt FROM lgpd_esquecimentos`;

    return jsonOk({
      versao: "1.0",
      gerado_em: new Date().toISOString(),
      lei: "LGPD — Lei nº 13.709/2018",
      atividades_tratamento: [
        { nome: "Gestão de atendimentos", total_registros: parseInt(a[0]?.cnt ?? "0") },
        { nome: "Consentimentos", total_registros: parseInt(c[0]?.cnt ?? "0") },
        { nome: "Esquecimentos executados", total_registros: parseInt(e[0]?.cnt ?? "0") },
      ],
    });
  } catch (e: any) {
    return jsonError("Erro: " + e.message, 500);
  }
}
