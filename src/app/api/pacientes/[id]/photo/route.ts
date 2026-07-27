import { NextRequest } from "next/server";
import sql from "@/lib/db";
import { requirePermission } from "@/lib/auth-helpers";
import { PERM_VIEW_ATENDIMENTOS, PERM_EDIT_ATENDIMENTO } from "@/lib/constants";
import { jsonOk, jsonError } from "@/lib/utils";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requirePermission(request, PERM_EDIT_ATENDIMENTO);
  if (auth instanceof Response) return auth;

  const id = parseInt(params.id);
  const paciente = await sql`SELECT id FROM pacientes WHERE id = ${id}`;
  if (paciente.length === 0) return jsonError("Paciente não encontrado.", 404);

  const formData = await request.formData();
  const file = formData.get("file") as File;
  if (!file) return jsonError("Arquivo não fornecido.");

  if (file.size > 2 * 1024 * 1024) return jsonError("Imagem excede o limite de 2MB.");

  const bytes = Buffer.from(await file.arrayBuffer());
  const b64 = bytes.toString("base64");
  const dataUri = `data:${file.type};base64,${b64}`;

  await sql`UPDATE pacientes SET foto = ${dataUri}, atualizado_em = NOW() WHERE id = ${id}`;
  return jsonOk({ mensagem: "Foto do paciente salva com sucesso.", paciente_id: id });
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requirePermission(request, PERM_VIEW_ATENDIMENTOS);
  if (auth instanceof Response) return auth;

  const id = parseInt(params.id);
  const result = await sql`SELECT foto FROM pacientes WHERE id = ${id}`;
  if (result.length === 0) return jsonError("Paciente não encontrado.", 404);
  return jsonOk({ photo: result[0].foto });
}
