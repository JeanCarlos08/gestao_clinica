import { jsonOk } from "@/lib/utils";
import { config } from "@/lib/config";

export async function GET() {
  return jsonOk({
    controlador: { nome: config.appName },
    encarregado: { nome: config.dpoNome, email: config.dpoEmail },
    bases_legais: {
      consentimento: "Art. 7º, I — Consentimento do titular",
      tutela_saude: "Art. 7º, VIII — Tutela da saúde",
    },
    direitos_titulares: {
      acesso: "GET /api/lgpd/titulares/{email}/dados",
      portabilidade: "GET /api/lgpd/titulares/{email}/dados",
      revogacao: "DELETE /api/lgpd/consentimentos/{email}",
      esquecimento: "POST /api/lgpd/titulares/esquecimento",
    },
  });
}
