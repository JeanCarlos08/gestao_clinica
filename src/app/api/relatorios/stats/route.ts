import { NextRequest } from "next/server";
import sql from "@/lib/db";
import { requirePermission } from "@/lib/auth-helpers";
import { PERM_VIEW_ATENDIMENTOS } from "@/lib/constants";
import { jsonOk, jsonError } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, PERM_VIEW_ATENDIMENTOS);
  if (auth instanceof Response) return auth;

  const url = new URL(request.url);
  const dataInicio = url.searchParams.get("data_inicio");
  const dataFim = url.searchParams.get("data_fim");

  try {
    let total, porStatus, porModalidade, porEmpresa, porMes, porPaciente;

    if (dataInicio || dataFim) {
      const start = dataInicio || "1900-01-01";
      const end = dataFim || "2099-12-31";

      [total, porStatus, porModalidade, porEmpresa, porMes, porPaciente] = await Promise.all([
        sql`SELECT COUNT(*) as cnt FROM atendimentos WHERE data >= ${start} AND data <= ${end}`,
        sql`SELECT status, COUNT(*) as total FROM atendimentos WHERE data >= ${start} AND data <= ${end} GROUP BY status ORDER BY total DESC`,
        sql`SELECT modalidade, COUNT(*) as total FROM atendimentos WHERE data >= ${start} AND data <= ${end} GROUP BY modalidade ORDER BY total DESC`,
        sql`SELECT empresa, COUNT(*) as total FROM atendimentos WHERE data >= ${start} AND data <= ${end} GROUP BY empresa ORDER BY total DESC LIMIT 10`,
        sql`SELECT TO_CHAR(data, 'YYYY-MM') as mes, COUNT(*) as total FROM atendimentos WHERE data >= ${start} AND data <= ${end} GROUP BY mes ORDER BY mes`,
        sql`SELECT COALESCE(p.nome, a.nome) as paciente, COUNT(*) as total FROM atendimentos a LEFT JOIN pacientes p ON p.id = a.paciente_id WHERE a.data >= ${start} AND a.data <= ${end} GROUP BY paciente ORDER BY total DESC LIMIT 10`,
      ]);
    } else {
      [total, porStatus, porModalidade, porEmpresa, porMes, porPaciente] = await Promise.all([
        sql`SELECT COUNT(*) as cnt FROM atendimentos`,
        sql`SELECT status, COUNT(*) as total FROM atendimentos GROUP BY status ORDER BY total DESC`,
        sql`SELECT modalidade, COUNT(*) as total FROM atendimentos GROUP BY modalidade ORDER BY total DESC`,
        sql`SELECT empresa, COUNT(*) as total FROM atendimentos GROUP BY empresa ORDER BY total DESC LIMIT 10`,
        sql`SELECT TO_CHAR(data, 'YYYY-MM') as mes, COUNT(*) as total FROM atendimentos GROUP BY mes ORDER BY mes`,
        sql`SELECT COALESCE(p.nome, a.nome) as paciente, COUNT(*) as total FROM atendimentos a LEFT JOIN pacientes p ON p.id = a.paciente_id GROUP BY paciente ORDER BY total DESC LIMIT 10`,
      ]);
    }

    return jsonOk({
      total: parseInt(total[0]?.cnt ?? "0"),
      por_status: Object.fromEntries(porStatus.map((r: any) => [r.status, parseInt(String(r.total))])),
      por_modalidade: Object.fromEntries(porModalidade.map((r: any) => [r.modalidade, parseInt(String(r.total))])),
      por_empresa: Object.fromEntries(porEmpresa.map((r: any) => [r.empresa, parseInt(String(r.total))])),
      por_mes: Object.fromEntries(porMes.map((r: any) => [r.mes, parseInt(String(r.total))])),
      por_paciente: Object.fromEntries(porPaciente.map((r: any) => [r.paciente, parseInt(String(r.total))])),
      periodo: { data_inicio: dataInicio, data_fim: dataFim },
    });
  } catch (e: any) {
    return jsonError("Erro: " + e.message, 500);
  }
}
