"use client";

import { useState } from "react";
import { FileText, Plus, Search, Filter, Download, ExternalLink, X, Loader2, FileCheck, FileClock } from "lucide-react";

export default function LaudosPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const mockLaudos = [
    { id: "LAU-1029", paciente: "Carlos Almeida", tipo: "Avaliação Psicológica", data: "15/06/2026", status: "Gerado", url: "#" },
    { id: "LAU-1028", paciente: "Marina Silva", tipo: "Admissional", data: "14/06/2026", status: "Gerado", url: "#" },
    { id: "LAU-1027", paciente: "Rafael Costa", tipo: "Periódica", data: "10/06/2026", status: "Aguardando Assinatura", url: "#" },
  ];

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      setIsModalOpen(false);
      // Aqui integrariamos com a chamada fetch para o backend (laudo_service)
    }, 2000);
  };

  return (
    <div className="p-8 w-full h-full overflow-y-auto scrollbar-hide bg-[#050a06] relative">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight mb-2">Laudos e Documentos</h1>
          <p className="text-[var(--text-label)] font-medium">Gerenciamento automático de relatórios integrados ao Google Docs.</p>
        </div>
        
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-gradient-to-r from-[var(--primary)] to-green-600 hover:from-green-500 hover:to-green-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-[0_4px_15px_rgba(34,197,94,0.3)] hover:shadow-[0_6px_20px_rgba(34,197,94,0.4)] hover:-translate-y-0.5 transition-all flex items-center gap-2"
        >
          <Plus size={18} strokeWidth={2.5} /> Novo Laudo Inteligente
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-[#0a100a] border border-[#1e2e1e] rounded-2xl p-5 shadow-lg flex items-center gap-4 hover:border-[#243024] transition-colors">
          <div className="bg-blue-500/10 p-3 rounded-xl border border-blue-500/20 text-blue-400"><FileText size={24} /></div>
          <div>
            <p className="text-[var(--text-label)] text-xs font-medium mb-0.5">Laudos no Mês</p>
            <h4 className="text-2xl font-bold text-white">42</h4>
          </div>
        </div>
        <div className="bg-[#0a100a] border border-[#1e2e1e] rounded-2xl p-5 shadow-lg flex items-center gap-4 hover:border-[#243024] transition-colors">
          <div className="bg-[var(--primary)]/10 p-3 rounded-xl border border-[var(--primary)]/20 text-[var(--primary)]"><FileCheck size={24} /></div>
          <div>
            <p className="text-[var(--text-label)] text-xs font-medium mb-0.5">Assinados (PDF)</p>
            <h4 className="text-2xl font-bold text-white">38</h4>
          </div>
        </div>
        <div className="bg-[#0a100a] border border-[#1e2e1e] rounded-2xl p-5 shadow-lg flex items-center gap-4 hover:border-[#243024] transition-colors">
          <div className="bg-amber-500/10 p-3 rounded-xl border border-amber-500/20 text-amber-400"><FileClock size={24} /></div>
          <div>
            <p className="text-[var(--text-label)] text-xs font-medium mb-0.5">Aguardando Assinatura</p>
            <h4 className="text-2xl font-bold text-white">4</h4>
          </div>
        </div>
      </div>

      {/* Lista de Laudos */}
      <div className="bg-[#0a100a] border border-[#1e2e1e] rounded-2xl shadow-xl overflow-hidden">
        <div className="p-5 border-b border-[#1e2e1e] flex flex-col sm:flex-row justify-between items-center gap-4">
          <h3 className="text-lg font-bold text-white">Documentos Recentes</h3>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b7c6b]" size={16} />
              <input type="text" placeholder="Buscar paciente..." className="w-full bg-[#111811] border border-[#1e2e1e] rounded-lg py-2 pl-9 pr-4 text-sm text-white focus:outline-none focus:border-[var(--primary)] transition-colors" />
            </div>
            <button className="bg-[#111811] border border-[#1e2e1e] p-2 rounded-lg text-[#9ca89c] hover:text-white hover:border-[#6b7c6b] transition-colors" title="Filtros avançados">
              <Filter size={18} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-[var(--text-label)]">
            <thead className="bg-[#111811] text-xs uppercase font-semibold tracking-wider text-[#6b7c6b]">
              <tr>
                <th className="px-6 py-4">ID do Doc</th>
                <th className="px-6 py-4">Paciente</th>
                <th className="px-6 py-4">Tipo de Avaliação</th>
                <th className="px-6 py-4">Data</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e2e1e]">
              {mockLaudos.map((laudo) => (
                <tr key={laudo.id} className="hover:bg-[#111811]/50 transition-colors group">
                  <td className="px-6 py-4 font-mono text-xs">{laudo.id}</td>
                  <td className="px-6 py-4 font-bold text-white">{laudo.paciente}</td>
                  <td className="px-6 py-4">{laudo.tipo}</td>
                  <td className="px-6 py-4">{laudo.data}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${laudo.status === 'Gerado' ? 'bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                      {laudo.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right flex items-center justify-end gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                    <button className="p-2 text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors" title="Editar no Google Docs">
                      <ExternalLink size={16} />
                    </button>
                    <button className="p-2 text-[var(--primary)] hover:bg-[var(--primary)]/10 rounded-lg transition-colors" title="Baixar PDF">
                      <Download size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL - Novo Laudo */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md transition-opacity duration-300" onClick={() => !isGenerating && setIsModalOpen(false)}></div>
          
          <div className="relative w-full max-w-4xl bg-[#0a100a] border border-[#1e2e1e] rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col transform transition-all">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-[#1e2e1e] flex justify-between items-center bg-gradient-to-r from-[#111811] to-[#0a100a]">
              <div className="flex items-center gap-3">
                <div className="bg-[var(--primary)]/10 p-2.5 rounded-xl border border-[var(--primary)]/20 text-[var(--primary)]">
                  <FileText size={22} />
                </div>
                <div>
                  <h2 className="text-xl font-extrabold text-white">Novo Laudo Inteligente</h2>
                  <p className="text-xs text-[#6b7c6b] mt-0.5">Preencha os dados para gerar o documento via Google Docs</p>
                </div>
              </div>
              <button disabled={isGenerating} onClick={() => setIsModalOpen(false)} className="bg-[#111811] border border-[#1e2e1e] p-2 rounded-lg text-[#6b7c6b] hover:text-white hover:border-[#6b7c6b] transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Modal Body (Form) */}
            <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar flex-1">
              <form id="laudo-form" onSubmit={handleGenerate} className="space-y-8">
                
                {/* Seção Paciente */}
                <div>
                  <h3 className="text-xs font-bold text-[var(--primary)] mb-4 flex items-center gap-2 uppercase tracking-widest border-b border-[#1e2e1e] pb-2">
                    <span className="w-5 h-5 rounded-full bg-[var(--primary)]/20 text-[var(--primary)] flex items-center justify-center text-[10px]">1</span>
                    Identificação do Paciente
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[#9ca89c]">Nome Completo</label>
                      <input required type="text" className="w-full bg-[#111811] border border-[#1e2e1e] rounded-xl p-3 text-sm text-white focus:outline-none focus:border-[var(--primary)] focus:bg-[#151f15] transition-colors shadow-inner" placeholder="Ex: João da Silva" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[#9ca89c]">CPF</label>
                      <input required type="text" className="w-full bg-[#111811] border border-[#1e2e1e] rounded-xl p-3 text-sm text-white focus:outline-none focus:border-[var(--primary)] focus:bg-[#151f15] transition-colors shadow-inner" placeholder="000.000.000-00" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[#9ca89c]">Data de Nascimento</label>
                      <input required type="date" className="w-full bg-[#111811] border border-[#1e2e1e] rounded-xl p-3 text-sm text-[#9ca89c] focus:outline-none focus:border-[var(--primary)] focus:text-white focus:bg-[#151f15] transition-colors shadow-inner" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[#9ca89c]">Empresa (opcional)</label>
                      <input type="text" className="w-full bg-[#111811] border border-[#1e2e1e] rounded-xl p-3 text-sm text-white focus:outline-none focus:border-[var(--primary)] focus:bg-[#151f15] transition-colors shadow-inner" placeholder="Nome da empresa" />
                    </div>
                  </div>
                </div>

                {/* Seção Avaliação */}
                <div>
                  <h3 className="text-xs font-bold text-[var(--primary)] mb-4 flex items-center gap-2 uppercase tracking-widest border-b border-[#1e2e1e] pb-2">
                    <span className="w-5 h-5 rounded-full bg-[var(--primary)]/20 text-[var(--primary)] flex items-center justify-center text-[10px]">2</span>
                    Detalhes da Avaliação
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[#9ca89c]">Data do Exame</label>
                      <input required type="date" className="w-full bg-[#111811] border border-[#1e2e1e] rounded-xl p-3 text-sm text-[#9ca89c] focus:outline-none focus:border-[var(--primary)] focus:text-white focus:bg-[#151f15] transition-colors shadow-inner" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[#9ca89c]">Motivo</label>
                      <input required type="text" className="w-full bg-[#111811] border border-[#1e2e1e] rounded-xl p-3 text-sm text-white focus:outline-none focus:border-[var(--primary)] focus:bg-[#151f15] transition-colors shadow-inner" placeholder="Ex: Avaliação Periódica Anual" />
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <label className="text-xs font-semibold text-[#9ca89c]">Tipo(s) de Avaliação</label>
                    <div className="flex flex-wrap gap-3">
                      {['Avaliação Psicológica', 'Admissional', 'Periódica', 'Pessoal', 'Mudança de Função'].map((tipo) => (
                        <label key={tipo} className="flex items-center gap-2 cursor-pointer bg-[#111811] border border-[#1e2e1e] px-4 py-2.5 rounded-xl hover:border-[#6b7c6b] hover:bg-[#151f15] transition-all has-[:checked]:border-[var(--primary)] has-[:checked]:bg-[var(--primary)]/5">
                          <input type="checkbox" className="accent-[var(--primary)] w-4 h-4 rounded border-[#1e2e1e] bg-[#0a100a] focus:ring-[var(--primary)]" />
                          <span className="text-sm text-[#e8f5e8] font-medium">{tipo}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Seção Conteúdo */}
                <div>
                  <h3 className="text-xs font-bold text-[var(--primary)] mb-4 flex items-center gap-2 uppercase tracking-widest border-b border-[#1e2e1e] pb-2">
                    <span className="w-5 h-5 rounded-full bg-[var(--primary)]/20 text-[var(--primary)] flex items-center justify-center text-[10px]">3</span>
                    Conteúdo Técnico
                  </h3>
                  <div className="space-y-5">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[#9ca89c]">Itens Auxiliados (Ferramentas/Testes aplicados)</label>
                      <textarea className="w-full bg-[#111811] border border-[#1e2e1e] rounded-xl p-4 text-sm text-white focus:outline-none focus:border-[var(--primary)] focus:bg-[#151f15] transition-colors shadow-inner min-h-[100px] resize-y" placeholder="Descreva os testes psicológicos ou métodos aplicados..."></textarea>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[#9ca89c]">Conclusão / Parecer</label>
                      <textarea className="w-full bg-[#111811] border border-[#1e2e1e] rounded-xl p-4 text-sm text-white focus:outline-none focus:border-[var(--primary)] focus:bg-[#151f15] transition-colors shadow-inner min-h-[120px] resize-y" placeholder="Parecer final do profissional..."></textarea>
                    </div>
                  </div>
                </div>

              </form>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-[#1e2e1e] bg-gradient-to-r from-[#111811] to-[#0a100a] flex justify-end gap-4">
              <button type="button" disabled={isGenerating} onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 rounded-xl font-bold text-[#9ca89c] hover:bg-[#1e2e1e] hover:text-white transition-colors">
                Cancelar
              </button>
              <button type="submit" form="laudo-form" disabled={isGenerating} className="bg-gradient-to-r from-[var(--primary)] to-green-600 hover:from-green-500 hover:to-green-700 text-[#052e16] px-8 py-2.5 rounded-xl font-extrabold shadow-[0_4px_15px_rgba(34,197,94,0.3)] hover:shadow-[0_6px_20px_rgba(34,197,94,0.4)] hover:-translate-y-0.5 transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none">
                {isGenerating ? (
                  <><Loader2 size={18} className="animate-spin text-[#052e16]" /> Integrando IA e Gerando PDF...</>
                ) : (
                  <><FileCheck size={18} /> Gerar Laudo</>
                )}
              </button>
            </div>
            
          </div>
        </div>
      )}

      {/* Global styles fix for custom scrollbar in modal if needed */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e2e1e; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #243024; }
      `}} />

    </div>
  );
}
