import { NextRequest } from "next/server";
import PDFDocument from "pdfkit";
import { requirePermission } from "@/lib/auth-helpers";
import { PERM_VIEW_DOCUMENTOS } from "@/lib/constants";
import { jsonError, errMessage } from "@/lib/utils";

export async function GET(
  request: NextRequest,
  { params }: { params: { pacienteId: string; attId: string } }
) {
  const auth = await requirePermission(request, PERM_VIEW_DOCUMENTOS);
  if (auth instanceof Response) return auth;

  const pacienteId = parseInt(params.pacienteId);
  const attId = parseInt(params.attId);
  if (Number.isNaN(pacienteId) || Number.isNaN(attId)) {
    return jsonError("IDs inválidos.", 400);
  }

  try {
    const tk = request.headers.get("authorization")?.replace("Bearer ", "") || "";
    const [pacRes, attRes] = await Promise.all([
      fetch(`${process.env.NEXT_PUBLIC_API_URL || "/api"}/pacientes/${pacienteId}`, {
        headers: { Authorization: `Bearer ${tk}` },
      }),
      fetch(`${process.env.NEXT_PUBLIC_API_URL || "/api"}/pacientes/${pacienteId}/atendimentos`, {
        headers: { Authorization: `Bearer ${tk}` },
      }),
    ]);

    const pacData = pacRes.ok ? await pacRes.json() : null;
    const atendimentos = attRes.ok ? await attRes.json() : [];
    const att = (atendimentos as Array<{ id: number; nome: string; empresa: string | null; modalidade: string; data: string | null; hora: string | null; status: string; observacoes?: string }>).find((a) => a.id === attId);

    if (!att) return jsonError("Atendimento não encontrado.", 404);

    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));

    const nomePaciente = (pacData as { nome?: string } | null)?.nome || "Paciente";

    doc.fontSize(20).font("Helvetica-Bold").fillColor("#1E7A46").text("Comprovante de Atendimento", { align: "center" });
    doc.moveDown();
    doc.fontSize(12).font("Helvetica").fillColor("#000000").text(`Paciente: ${nomePaciente}`);
    doc.text(`Atendimento #${att.id}`);
    doc.text(`Modalidade: ${att.modalidade}`);
    doc.text(`Empresa: ${att.empresa || "—"}`);
    doc.text(`Data: ${att.data ? new Date(att.data).toLocaleDateString("pt-BR") : "—"}`);
    doc.text(`Hora: ${att.hora || "—"}`);
    doc.text(`Status: ${att.status || "Agendado"}`);
    if (att.observacoes) {
      doc.moveDown();
      doc.text(`Observações: ${att.observacoes}`);
    }
    doc.moveDown();
    doc.fontSize(10).fillColor("#666666").text("Documento gerado pelo sistema de gestão clínica.", { align: "center" });

    doc.end();

    const buffers: Buffer[] = [];
    for await (const chunk of doc) {
      buffers.push(chunk);
    }
    const pdfBuffer = Buffer.concat(buffers);

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="atendimento_${attId}.pdf"`,
      },
    });
  } catch (e) {
    return jsonError("Erro ao gerar PDF: " + errMessage(e), 500);
  }
}
