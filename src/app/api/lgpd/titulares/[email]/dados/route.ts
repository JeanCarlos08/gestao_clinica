import { NextRequest } from "next/server";
import sql from "@/lib/db";
import { jsonOk, jsonError } from "@/lib/utils";

export async function GET(request: NextRequest, { params }: { params: { email: string } }) {
  const email = decodeURIComponent(params.email);

  const consentimentos = await sql`SELECT * FROM consentimentos WHERE titular_email = ${email} ORDER BY criado_em DESC`;
  const atendimentos = await sql`SELECT id, empresa, nome, modalidade, data, hora, status FROM atendimentos WHERE LOWER(nome) LIKE LOWER(${`%${email}%`}) LIMIT 500`;

  return jsonOk({
    exportado_em: new Date().toISOString(),
    titular_email: email,
    dpo_contato: process.env.DPO_EMAIL || "dpo@clinicaia.com.br",
    aviso: "Dados exportados conforme LGPD Art. 18, V - Portabilidade.",
    consentimentos,
    atendimentos,
  });
}
