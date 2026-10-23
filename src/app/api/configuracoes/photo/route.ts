import { NextRequest } from "next/server";
import sql from "@/lib/db";
import { requirePermission } from "@/lib/auth-helpers";
import {
  PERM_MANAGE_CONFIGURACOES,
  CLINIC_PREF_USER_PHOTO, CLINIC_PREF_LOGO,
  CLINIC_PREF_USER_PHOTO_STORED, CLINIC_PREF_LOGO_STORED,
  CLINIC_PREF_APP_BG_CUSTOM, CLINIC_PREF_APP_BG_STORED,
} from "@/lib/constants";
import { jsonOk, jsonError } from "@/lib/utils";

const KEY_BY_FIELD: Record<string, string> = {
  user_photo: CLINIC_PREF_USER_PHOTO,
  clinic_logo: CLINIC_PREF_LOGO,
  app_background: CLINIC_PREF_APP_BG_CUSTOM,
};

const STORED_BY_FIELD: Record<string, string> = {
  user_photo: CLINIC_PREF_USER_PHOTO_STORED,
  clinic_logo: CLINIC_PREF_LOGO_STORED,
  app_background: CLINIC_PREF_APP_BG_STORED,
};

function isValidField(field: string): boolean {
  return Object.prototype.hasOwnProperty.call(KEY_BY_FIELD, field);
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, PERM_MANAGE_CONFIGURACOES);
  if (auth instanceof Response) return auth;

  const formData = await request.formData();
  const field = formData.get("field") as string;

  if (!field || !isValidField(field)) {
    return jsonError("Campo inválido. Use 'user_photo', 'clinic_logo' ou 'app_background'.");
  }

  const key = KEY_BY_FIELD[field];
  const storedKey = STORED_BY_FIELD[field];

  // Restaurar: recoloca a última foto guardada da biblioteca no slot ativo.
  if (formData.get("restore") === "1") {
    const rows = await sql`SELECT pref_value FROM user_preferences WHERE pref_key = ${storedKey}`;
    const restored = rows[0]?.pref_value as string | undefined;
    if (!restored) return jsonError("Nenhuma foto guardada para restaurar.");
    await sql`
      INSERT INTO user_preferences (pref_key, pref_value, updated_at) VALUES (${key}, ${restored}, NOW())
      ON CONFLICT (pref_key) DO UPDATE SET pref_value = ${restored}, updated_at = NOW()
    `;
    if (field === "app_background") {
      await sql`
        INSERT INTO user_preferences (pref_key, pref_value, updated_at) VALUES ('app_background', 'custom', NOW())
        ON CONFLICT (pref_key) DO UPDATE SET pref_value = 'custom', updated_at = NOW()
      `;
    }
    return jsonOk({ mensagem: "Foto restaurada da biblioteca.", field });
  }

  const file = formData.get("file") as File;
  if (!file) return jsonError("Arquivo não fornecido.");
  if (file.size > 2 * 1024 * 1024) return jsonError("Imagem excede o limite de 2MB.");

  const bytes = Buffer.from(await file.arrayBuffer());
  const b64 = bytes.toString("base64");
  const dataUri = `data:${file.type};base64,${b64}`;

  await sql`
    INSERT INTO user_preferences (pref_key, pref_value, updated_at) VALUES (${key}, ${dataUri}, NOW())
    ON CONFLICT (pref_key) DO UPDATE SET pref_value = ${dataUri}, updated_at = NOW()
  `;

  if (field === "app_background") {
    await sql`
      INSERT INTO user_preferences (pref_key, pref_value, updated_at) VALUES ('app_background', 'custom', NOW())
      ON CONFLICT (pref_key) DO UPDATE SET pref_value = 'custom', updated_at = NOW()
    `;
  }

  return jsonOk({ mensagem: "Imagem salva com sucesso.", field });
}

// Remover: tira a foto do slot ativo, mas guarda o dataUri na biblioteca (*_stored)
// para que o usuário possa reutilizar depois com o botão "Restaurar".
export async function DELETE(request: NextRequest) {
  const auth = await requirePermission(request, PERM_MANAGE_CONFIGURACOES);
  if (auth instanceof Response) return auth;

  const field = new URL(request.url).searchParams.get("field") || "";
  if (!isValidField(field)) {
    return jsonError("Campo inválido. Use 'user_photo', 'clinic_logo' ou 'app_background'.");
  }

  const key = KEY_BY_FIELD[field];
  const storedKey = STORED_BY_FIELD[field];

  try {
    const rows = await sql`SELECT pref_value FROM user_preferences WHERE pref_key = ${key}`;
    const current = rows[0]?.pref_value as string | undefined;

    if (current) {
      await sql`
        INSERT INTO user_preferences (pref_key, pref_value, updated_at) VALUES (${storedKey}, ${current}, NOW())
        ON CONFLICT (pref_key) DO UPDATE SET pref_value = ${current}, updated_at = NOW()
      `;
    }
    await sql`DELETE FROM user_preferences WHERE pref_key = ${key}`;

    if (field === "app_background") {
      await sql`
        INSERT INTO user_preferences (pref_key, pref_value, updated_at) VALUES ('app_background', 'clinica', NOW())
        ON CONFLICT (pref_key) DO UPDATE SET pref_value = 'clinica', updated_at = NOW()
      `;
    }

    return jsonOk({ mensagem: "Foto removida — guardada na biblioteca para reutilização.", field, guardada: Boolean(current) });
  } catch {
    return jsonError("Erro ao remover a foto.");
  }
}
