import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { MODALIDADES, STATUS_ATENDIMENTO } from "@/lib/constants";
import { jsonOk } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;
  return jsonOk({ modalidades: MODALIDADES, status: STATUS_ATENDIMENTO });
}
