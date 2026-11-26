import { NextRequest } from "next/server";
import sql from "@/lib/db";
import { requirePermission } from "@/lib/auth-helpers";
import { PERM_VIEW_ATENDIMENTOS } from "@/lib/constants";
import { jsonOk, jsonError, errMessage } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, PERM_VIEW_ATENDIMENTOS);
  if (auth instanceof Response) return auth;

  const url = new URL(request.url);
  const ano = parseInt(url.searchParams.get("ano") || new Date().getFullYear().toString());
  const mes = parseInt(url.searchParams.get("mes") || (new Date().getMonth() + 1).toString());

  if (Number.isNaN(ano) || Number.isNaN(mes) || mes < 1 || mes > 12) {
    return jsonError("Ano ou mês inválido.", 400);
  }

  const primeiroDia = `${ano}-${String(mes).padStart(2, "0")}-01`;
  const ultimoDiaMes = new Date(ano, mes, 0).getDate();
  const ultimoDia = `${ano}-${String(mes).padStart(2, "0")}-${String(ultimoDiaMes).padStart(2, "0")}`;

  try {
    const atendimentos = await sql`
      SELECT a.id, a.nome, a.modalidade, a.data, a.hora, a.status, a.empresa, a.paciente_id,
        p.foto
      FROM atendimentos a
      LEFT JOIN pacientes p ON p.id = a.paciente_id
      WHERE a.data >= ${primeiroDia} AND a.data <= ${ultimoDia}
      ORDER BY a.data ASC, a.hora ASC
    `;

    type AtendimentoItem = {
      id: number;
      nome: string;
      modalidade: string;
      data: string;
      hora: string | null;
      status: string;
      empresa: string | null;
      paciente_id: number | null;
      foto: string | null;
    };

    const porDia: Record<string, AtendimentoItem[]> = {};

    let totalAtendimentos = 0;
    let totalFaturamento = 0;

    for (const a of atendimentos) {
      const dia = a.data ? new Date(a.data).toISOString().split("T")[0] : "";
      if (!dia) continue;

      if (!porDia[dia]) porDia[dia] = [];

      const item = {
        id: a.id,
        nome: a.nome,
        modalidade: a.modalidade,
        data: a.data ? new Date(a.data).toISOString().split("T")[0] : "",
        hora: a.hora || "",
        status: a.status,
        empresa: a.empresa || null,
        paciente_id: a.paciente_id || null,
        foto: a.foto || null,
      };

      // Contar apenas atendimentos finalizados/concluídos para faturamento
      const status = (a.status || "").toLowerCase();
      const concluido = status === "finalizado" || status === "concluído" || status === "atendido";

      if (concluido) {
        totalAtendimentos++;
        totalFaturamento += 50;
      }

      porDia[dia].push(item);
    }

    const diasDoMes: Array<{
      dia: number;
      data: string;
      atendimentos: Array<{
        id: number; nome: string; modalidade: string; data: string; hora: string;
        status: string; empresa: string | null; paciente_id: number | null; foto: string | null;
      }>;
      totalAtendimentos: number;
      faturamento: number;
    }> = [];

    for (let d = 1; d <= ultimoDiaMes; d++) {
      const dataStr = `${ano}-${String(mes).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const items = porDia[dataStr] || [];
      const diaConcluidos = items.filter(i => {
        const s = (i.status || "").toLowerCase();
        return s === "finalizado" || s === "concluído" || s === "atendido";
      }).length;

      diasDoMes.push({
        dia: d,
        data: dataStr,
        atendimentos: items,
        totalAtendimentos: diaConcluidos,
        faturamento: diaConcluidos * 50,
      });
    }

    const hoje = new Date();
    const diaHoje = (hoje.getFullYear() === ano && hoje.getMonth() + 1 === mes) ? hoje.getDate() : null;

    return jsonOk({
      ano,
      mes,
      ultimoDiaMes,
      diaHoje,
      totalAtendimentos,
      totalFaturamento,
      diasDoMes,
      nomeMes: new Date(ano, mes - 1).toLocaleDateString("pt-BR", { month: "long" }),
    });
  } catch (e) {
    return jsonError("Erro ao buscar faturamento: " + errMessage(e), 500);
  }
}
