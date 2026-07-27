import { NextRequest } from "next/server";
import sql from "@/lib/db";
import { requirePermission } from "@/lib/auth-helpers";
import { PERM_VIEW_DOCUMENTOS, PERM_MANAGE_DOCUMENTOS } from "@/lib/constants";
import { jsonOk, jsonError } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, PERM_VIEW_DOCUMENTOS);
  if (auth instanceof Response) return auth;

  try {
    const arquivos = await sql`SELECT id, filename, content_type, size, criado_em FROM arquivos ORDER BY criado_em DESC`;
    return jsonOk(arquivos);
  } catch (e: any) {
    return jsonError("Erro: " + e.message, 500);
  }
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, PERM_MANAGE_DOCUMENTOS);
  if (auth instanceof Response) return auth;

  const formData = await request.formData();
  const file = formData.get("file") as File;
  if (!file) return jsonError("Arquivo não fornecido.");
  if (file.size > 50 * 1024 * 1024) return jsonError("Arquivo excede o limite de 50MB.");

  const bytes = Buffer.from(await file.arrayBuffer());
  const filename = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");

  try {
    const result = await sql`
      INSERT INTO arquivos (filename, content, content_type, size)
      VALUES (${filename}, ${bytes}, ${file.type}, ${file.size})
      RETURNING id
    `;
    return jsonOk({ id: result[0].id, mensagem: "Arquivo enviado com sucesso." }, 201);
  } catch (e: any) {
    return jsonError("Erro ao salvar: " + e.message, 500);
  }
}
