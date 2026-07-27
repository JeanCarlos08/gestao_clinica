import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth-helpers";
import { PERM_VIEW_AUTOMACOES } from "@/lib/constants";
import { config } from "@/lib/config";
import { jsonOk } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, PERM_VIEW_AUTOMACOES);
  if (auth instanceof Response) return auth;

  return jsonOk({
    has_ai: !!config.geminiApiKey,
    gemini_key_set: !!config.geminiApiKey,
    uses_adc: false,
    gemini_model: config.geminiModel,
    gemini_fallback_models: config.geminiFallbackModels,
  });
}
