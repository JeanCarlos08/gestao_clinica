import { NextRequest } from "next/server";
import sql from "@/lib/db";
import { requirePermission } from "@/lib/auth-helpers";
import { PERM_VIEW_DASHBOARD } from "@/lib/constants";
import { jsonOk, jsonError } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, PERM_VIEW_DASHBOARD);
  if (auth instanceof Response) return auth;

  try {
    const [statsRows, porModalidade, porEmpresa] = await Promise.all([
      sql`
        SELECT
          (SELECT COUNT(*) FROM atendimentos) as total_atendimentos,
          (SELECT COUNT(*) FROM pacientes) as total_pacientes,
          (SELECT COUNT(*) FROM atendimentos WHERE status = 'Agendado') as agendados,
          (SELECT COUNT(*) FROM atendimentos WHERE status = 'Atendido') as atendidos,
          (SELECT COUNT(*) FROM atendimentos WHERE status IN ('Concluido','Concluído')) as concluidos,
          (SELECT COUNT(*) FROM atendimentos WHERE status = 'Cancelado') as cancelados,
          (SELECT COUNT(DISTINCT empresa) FROM atendimentos) as total_empresas,
          (SELECT COUNT(*) FROM atendimentos WHERE data = CURRENT_DATE) as atendimentos_hoje,
          (SELECT COUNT(*) FROM atendimentos WHERE data >= date_trunc('month', CURRENT_DATE)) as atendimentos_mes
      `,
      sql`SELECT modalidade, COUNT(*) as total FROM atendimentos GROUP BY modalidade ORDER BY total DESC`,
      sql`SELECT empresa, COUNT(*) as total FROM atendimentos GROUP BY empresa ORDER BY total DESC LIMIT 10`,
    ]);
    const stats = statsRows;

    return jsonOk({
      total_atendimentos: parseInt(stats[0]?.total_atendimentos ?? "0"),
      total_pacientes: parseInt(stats[0]?.total_pacientes ?? "0"),
      agendados: parseInt(stats[0]?.agendados ?? "0"),
      atendidos: parseInt(stats[0]?.atendidos ?? "0"),
      concluidos: parseInt(stats[0]?.concluidos ?? "0"),
      cancelados: parseInt(stats[0]?.cancelados ?? "0"),
      total_empresas: parseInt(stats[0]?.total_empresas ?? "0"),
      atendimentos_hoje: parseInt(stats[0]?.atendimentos_hoje ?? "0"),
      atendimentos_mes: parseInt(stats[0]?.atendimentos_mes ?? "0"),
      por_modalidade: Object.fromEntries(porModalidade.map(r => [r.modalidade, parseInt(String(r.total))])),
      por_empresa: Object.fromEntries(porEmpresa.map(r => [r.empresa, parseInt(String(r.total))])),
    });
  } catch (e: any) {
    return jsonError("Erro ao carregar estatísticas: " + e.message, 500);
  }
}
