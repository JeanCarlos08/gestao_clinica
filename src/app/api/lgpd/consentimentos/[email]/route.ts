import { NextRequest } from "next/server";
import sql from "@/lib/db";
import { jsonOk, jsonError } from "@/lib/utils";

export async function GET(request: NextRequest, { params }: { params: { email: string } }) {
  const email = decodeURIComponent(params.email);
  const result = await sql`SELECT * FROM consentimentos WHERE titular_email = ${email} ORDER BY criado_em DESC`;
  return jsonOk(result);
}

export async function DELETE(request: NextRequest, { params }: { params: { email: string } }) {
  const email = decodeURIComponent(params.email);
  const result = await sql`UPDATE consentimentos SET revogado = true WHERE titular_email = ${email} AND revogado = false`;
  return jsonOk({ sucesso: true, revogados: result.count, mensagem: `${result.count} consentimento(s) revogado(s).` });
}
