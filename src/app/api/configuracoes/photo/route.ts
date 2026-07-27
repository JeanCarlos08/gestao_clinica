import { NextRequest } from "next/server";
import sql from "@/lib/db";
import { requirePermission } from "@/lib/auth-helpers";
import { PERM_MANAGE_CONFIGURACOES, CLINIC_PREF_USER_PHOTO, CLINIC_PREF_LOGO } from "@/lib/constants";
import { jsonOk, jsonError } from "@/lib/utils";

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, PERM_MANAGE_CONFIGURACOES);
  if (auth instanceof Response) return auth;

  const formData = await request.formData();
  const field = formData.get("field") as string;
  const file = formData.get("file") as File;

  if (!field || !["user_photo", "clinic_logo"].includes(field)) {
    return jsonError("Campo inválido. Use 'user_photo' ou 'clinic_logo'.");
  }
  if (!file) return jsonError("Arquivo não fornecido.");
  if (file.size > 2 * 1024 * 1024) return jsonError("Imagem excede o limite de 2MB.");

  const bytes = Buffer.from(await file.arrayBuffer());
  const b64 = bytes.toString("base64");
  const dataUri = `data:${file.type};base64,${b64}`;
  const key = field === "user_photo" ? CLINIC_PREF_USER_PHOTO : CLINIC_PREF_LOGO;

  await sql`
    INSERT INTO user_preferences (pref_key, pref_value, updated_at) VALUES (${key}, ${dataUri}, NOW())
    ON CONFLICT (pref_key) DO UPDATE SET pref_value = ${dataUri}, updated_at = NOW()
  `;

  return jsonOk({ mensagem: "Imagem salva com sucesso.", field });
}
