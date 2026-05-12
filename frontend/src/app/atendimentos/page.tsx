"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Bell, Search, Filter, Plus, Pencil, Eye, Trash2, Download, Calendar, Moon, ChevronRight, ChevronLeft, CheckCircle2, Clock, AlertCircle, FileText, ClipboardList, BarChart2, Loader2 } from "lucide-react";

export default function AtendimentosPage() {
  const [atendimentos, setAtendimentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchAtendimentos = async () => {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const token = localStorage.getItem("token");
      
      if (!token) {
        router.push("/");
        return;
      }

      try {
        const response = await fetch(`${API_BASE}/atendimentos`, {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });

        if (response.status === 401) {
          localStorage.removeItem("token");
          router.push("/");
          return;
        }

        const data = await response.json();
        setAtendimentos(data);
      } catch (err) {
        console.error("Erro ao buscar atendimentos:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAtendimentos();
  }, [router]);


  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden p-8 scrollbar-hide">
      {/* Top Navigation */}
      <div className="flex justify-end items-center gap-4 mb-8">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
          <input 
            type="text" 
            placeholder="Pesquisar atendimentos..." 
            className="bg-[var(--card)] border border-[var(--border)] rounded-full py-2 pl-10 pr-12 text-sm focus:outline-none focus:border-[var(--primary)] w-64 text-white"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1">
            <kbd className="bg-[var(--background)] px-1.5 py-0.5 rounded text-[10px] text-[var(--text-muted)] border border-[var(--border)]">⌘</kbd>
            <kbd className="bg-[var(--background)] px-1.5 py-0.5 rounded text-[10px] text-[var(--text-muted)] border border-[var(--border)]">K</kbd>
          </div>
        </div>
        <button className="text-[var(--text-muted)] hover:text-white transition-colors relative">
          <Bell size={20} />
          <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>
        <button className="text-[var(--text-muted)] hover:text-white transition-colors">
          <Moon size={20} />
        </button>
        <img src="https://i.pravatar.cc/150?img=5" alt="Avatar" className="w-8 h-8 rounded-full border border-[var(--border)]" />
      </div>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="bg-[var(--primary)]/10 text-[var(--primary)] p-2 rounded-lg">
            <ClipboardList size={24} />
          </div>
          <h1 className="text-2xl font-bold">Atendimentos</h1>
        </div>
        <p className="text-[var(--text-muted)] text-sm">Gerenciamento de Consultas e Procedimentos</p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-[var(--card)] p-5 rounded-xl border border-[var(--border)] relative overflow-hidden">
          <div className="text-[11px] text-[var(--text-label)] font-semibold uppercase tracking-wider mb-2">Total de Atendimentos</div>
          <div className="text-3xl font-bold text-[var(--primary)] mb-1">1.248</div>
          <div className="text-xs text-[var(--text-muted)]">+12.5% este mês</div>
          {/* Faux Sparkline */}
          <svg className="absolute bottom-0 right-0 w-full h-12 opacity-50" viewBox="0 0 100 30" preserveAspectRatio="none">
            <path d="M0 30 L10 20 L20 25 L30 15 L40 22 L50 10 L60 18 L70 5 L80 12 L90 2 L100 8 L100 30 Z" fill="rgba(34, 197, 94, 0.1)" />
            <path d="M0 30 L10 20 L20 25 L30 15 L40 22 L50 10 L60 18 L70 5 L80 12 L90 2 L100 8" fill="none" stroke="var(--primary)" strokeWidth="2" />
          </svg>
        </div>
        
        <div className="bg-[var(--card)] p-5 rounded-xl border border-[var(--border)] relative">
          <div className="flex justify-between items-start mb-2">
            <div className="text-[11px] text-[var(--text-label)] font-semibold uppercase tracking-wider">Concluídos</div>
            <div className="w-8 h-8 rounded-full border-2 border-[var(--status-concluido)] flex items-center justify-center text-[var(--status-concluido)]">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div className="text-3xl font-bold mb-1">842</div>
          <div className="flex items-center gap-2">
            <div className="h-1 flex-1 bg-[var(--background)] rounded-full overflow-hidden">
              <div className="h-full bg-[var(--status-concluido)] w-[67.6%] rounded-full"></div>
            </div>
            <div className="text-[10px] text-[var(--text-muted)] whitespace-nowrap">67.6% do total</div>
          </div>
        </div>

        <div className="bg-[var(--card)] p-5 rounded-xl border border-[var(--border)] relative">
          <div className="flex justify-between items-start mb-2">
            <div className="text-[11px] text-[var(--text-label)] font-semibold uppercase tracking-wider">Em Andamento</div>
            <div className="w-8 h-8 rounded-full border-2 border-[var(--status-andamento)] flex items-center justify-center text-[var(--status-andamento)]">
              <Clock size={16} />
            </div>
          </div>
          <div className="text-3xl font-bold mb-1">256</div>
          <div className="flex items-center gap-2">
            <div className="h-1 flex-1 bg-[var(--background)] rounded-full overflow-hidden">
              <div className="h-full bg-[var(--status-andamento)] w-[20.5%] rounded-full"></div>
            </div>
            <div className="text-[10px] text-[var(--text-muted)] whitespace-nowrap">20.5% do total</div>
          </div>
        </div>

        <div className="bg-[var(--card)] p-5 rounded-xl border border-[var(--border)] relative">
          <div className="flex justify-between items-start mb-2">
            <div className="text-[11px] text-[var(--text-label)] font-semibold uppercase tracking-wider">Pendentes</div>
            <div className="w-8 h-8 rounded-full border-2 border-[var(--status-pendente)] flex items-center justify-center text-[var(--status-pendente)]">
              <AlertCircle size={16} />
            </div>
          </div>
          <div className="text-3xl font-bold mb-1">150</div>
          <div className="flex items-center gap-2">
            <div className="h-1 flex-1 bg-[var(--background)] rounded-full overflow-hidden">
              <div className="h-full bg-[var(--status-pendente)] w-[12.0%] rounded-full"></div>
            </div>
            <div className="text-[10px] text-[var(--text-muted)] whitespace-nowrap">12.0% do total</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-[var(--card)] p-5 rounded-xl border border-[var(--border)] mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Filter size={16} className="text-[var(--text-muted)]" /> Filtros
          </div>
          <ChevronRight size={16} className="text-[var(--text-muted)] rotate-90" />
        </div>
        
        <div className="grid grid-cols-4 gap-4">
          <div>
            <label className="block text-[11px] text-[var(--text-label)] font-medium mb-1.5">Pesquisar (Nome/Empresa)</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={14} />
              <input type="text" placeholder="Digite para pesquisar..." className="w-full bg-[var(--background)] border border-[var(--border-light)] rounded-lg py-2 pl-9 pr-3 text-sm focus:outline-none focus:border-[var(--primary)] text-white" />
            </div>
          </div>
          <div>
            <label className="block text-[11px] text-[var(--text-label)] font-medium mb-1.5">Modalidade</label>
            <select className="w-full bg-[var(--background)] border border-[var(--border-light)] rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-[var(--primary)] text-white appearance-none cursor-pointer">
              <option>Todas</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-[var(--text-label)] font-medium mb-1.5">Status</label>
            <select className="w-full bg-[var(--background)] border border-[var(--border-light)] rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-[var(--primary)] text-white appearance-none cursor-pointer">
              <option>Todos</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] text-[var(--text-label)] font-medium mb-1.5">Data inicial</label>
              <div className="relative">
                <input type="text" placeholder="dd/mm/aaaa" className="w-full bg-[var(--background)] border border-[var(--border-light)] rounded-lg py-2 pl-3 pr-8 text-sm focus:outline-none focus:border-[var(--primary)] text-white" />
                <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={14} />
              </div>
            </div>
            <div>
              <label className="block text-[11px] text-[var(--text-label)] font-medium mb-1.5">Data final</label>
              <div className="relative">
                <input type="text" placeholder="dd/mm/aaaa" className="w-full bg-[var(--background)] border border-[var(--border-light)] rounded-lg py-2 pl-3 pr-8 text-sm focus:outline-none focus:border-[var(--primary)] text-white" />
                <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={14} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <button className="bg-[var(--card)] border border-[var(--border)] hover:border-[var(--primary)] hover:bg-[var(--card-hover)] p-4 rounded-xl flex items-center justify-between group transition-all text-left">
          <div className="flex items-center gap-4">
            <div className="text-[var(--primary)] text-xl font-light">+</div>
            <div>
              <div className="text-sm font-semibold text-white mb-0.5">Cadastrar Novo Atendimento</div>
              <div className="text-xs text-[var(--text-muted)]">Adicionar um novo atendimento ao sistema</div>
            </div>
          </div>
          <ChevronRight size={18} className="text-[var(--text-muted)] group-hover:text-[var(--primary)] transition-colors" />
        </button>
        <button className="bg-[var(--card)] border border-[var(--border)] hover:border-[var(--primary)] hover:bg-[var(--card-hover)] p-4 rounded-xl flex items-center justify-between group transition-all text-left">
          <div className="flex items-center gap-4">
            <div className="text-yellow-500 text-lg"><Pencil size={18}/></div>
            <div>
              <div className="text-sm font-semibold text-white mb-0.5">Editar Atendimento</div>
              <div className="text-xs text-[var(--text-muted)]">Editar informações de um atendimento</div>
            </div>
          </div>
          <ChevronRight size={18} className="text-[var(--text-muted)] group-hover:text-[var(--primary)] transition-colors" />
        </button>
      </div>

      {/* Table */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden mb-6">
        <div className="p-5 border-b border-[var(--border)] flex justify-between items-center">
          <div className="flex items-center gap-2 font-semibold">
            <ClipboardList size={18} className="text-[var(--primary)]" />
            Lista de Atendimentos
          </div>
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
            <span>Tamanho da página</span>
            <select className="bg-[var(--card-hover)] border border-[var(--border-light)] text-white rounded px-2 py-1 text-xs focus:outline-none">
              <option>20</option>
            </select>
            <span className="ml-4">Página</span>
            <div className="flex items-center gap-1">
              <button className="w-6 h-6 flex items-center justify-center rounded border border-[var(--border-light)] bg-[var(--background)] hover:bg-[var(--card-hover)]"><ChevronLeft size={12}/></button>
              <button className="w-6 h-6 flex items-center justify-center rounded border border-[var(--border-light)] bg-[var(--background)] hover:bg-[var(--card-hover)]"><ChevronLeft size={12}/></button>
              <button className="w-6 h-6 flex items-center justify-center rounded border border-[var(--primary)] bg-[var(--primary)] text-black font-semibold">1</button>
              <button className="w-6 h-6 flex items-center justify-center rounded border border-[var(--border-light)] bg-[var(--background)] hover:bg-[var(--card-hover)]">3</button>
              <button className="w-6 h-6 flex items-center justify-center rounded border border-[var(--border-light)] bg-[var(--background)] hover:bg-[var(--card-hover)]">4</button>
              <button className="w-6 h-6 flex items-center justify-center rounded border border-[var(--border-light)] bg-[var(--background)] hover:bg-[var(--card-hover)]">5</button>
              <span className="px-1 text-[var(--text-muted)]">...</span>
              <button className="w-6 h-6 flex items-center justify-center rounded border border-[var(--border-light)] bg-[var(--background)] hover:bg-[var(--card-hover)]">12</button>
              <button className="w-6 h-6 flex items-center justify-center rounded border border-[var(--border-light)] bg-[var(--background)] hover:bg-[var(--card-hover)]"><ChevronRight size={12}/></button>
              <button className="w-6 h-6 flex items-center justify-center rounded border border-[var(--border-light)] bg-[var(--background)] hover:bg-[var(--card-hover)]"><ChevronRight size={12}/></button>
            </div>
          </div>
        </div>

        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[var(--border)] text-[10px] uppercase text-[var(--text-label)] tracking-wider">
              <th className="p-4 font-medium w-12">#</th>
              <th className="p-4 font-medium">Empresa</th>
              <th className="p-4 font-medium w-48">Paciente</th>
              <th className="p-4 font-medium w-32">Modalidade</th>
              <th className="p-4 font-medium w-32">Status</th>
              <th className="p-4 font-medium w-32">Data</th>
              <th className="p-4 font-medium w-32 text-center">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="p-10 text-center text-[var(--text-muted)] italic">
                  <Loader2 className="animate-spin inline-block mr-2" size={16} /> Carregando atendimentos...
                </td>
              </tr>
            ) : atendimentos.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-10 text-center text-[var(--text-muted)]">
                  Nenhum atendimento encontrado no banco de dados.
                </td>
              </tr>
            ) : (
              atendimentos.map((a, index) => (
                <tr key={a.id} className="border-b border-[var(--border)] hover:bg-[var(--card-hover)] transition-colors group">
                  <td className="p-4 text-xs text-[var(--text-muted)]">{index + 1}</td>
                  <td className="p-4 text-[13px] font-semibold text-white max-w-xs truncate">{a.empresa}</td>
                  <td className="p-4 text-xs text-[var(--text-muted)]">{a.nome}</td>
                  <td className="p-4 text-[13px] text-white">{a.modalidade}</td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold
                      ${a.status === 'Concluído' ? 'bg-[var(--status-concluido-bg)] text-[var(--status-concluido)]' : ''}
                      ${a.status === 'Em andamento' || a.status === 'Agendado' ? 'bg-[var(--status-andamento-bg)] text-[var(--status-andamento)]' : ''}
                      ${a.status === 'Pendente' ? 'bg-[var(--status-pendente-bg)] text-[var(--status-pendente)]' : ''}
                    `}>
                      {a.status}
                    </span>
                  </td>
                  <td className="p-4 text-[13px] text-[var(--text-muted)]">{a.data} {a.hora}</td>
                  <td className="p-4">
                    <div className="flex items-center justify-center gap-3">
                      <button className="text-[var(--primary)] opacity-70 hover:opacity-100 transition-opacity"><Eye size={16}/></button>
                      <button className="text-[var(--text-muted)] hover:text-white transition-colors"><Pencil size={16}/></button>
                      <button className="text-red-500 opacity-70 hover:opacity-100 transition-opacity"><Trash2 size={16}/></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>

        </table>
        <div className="p-4 text-xs text-[var(--text-muted)]">
          Mostrando 1 a 10 de 228 registros
        </div>
      </div>

      {/* Footer Actions */}
      <div className="grid grid-cols-[auto_1fr] gap-4 mb-8">
        <button className="bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-black font-semibold px-6 py-3 rounded-xl flex items-center gap-2 text-sm transition-colors shadow-[0_0_15px_rgba(34,197,94,0.3)]">
          <Download size={16} /> Exportar CSV
        </button>
        <div className="bg-[var(--status-concluido-bg)] border border-[var(--border-light)] rounded-xl p-3 flex items-center gap-3">
          <CheckCircle2 className="text-[var(--status-concluido)]" size={20} />
          <div>
            <div className="text-sm font-semibold text-white">Relatório gerado com sucesso!</div>
            <div className="text-xs text-[var(--primary)] cursor-pointer hover:underline">Abrir CSV</div>
          </div>
        </div>
      </div>
      
      {/* Accordions */}
      <div className="space-y-2 pb-8">
        <button className="w-full bg-[var(--card)] border border-[var(--border)] hover:border-[var(--border-light)] p-4 rounded-xl flex items-center justify-between text-sm font-semibold text-white transition-colors">
          <div className="flex items-center gap-3">
            <FileText size={18} className="text-[var(--text-muted)]"/> Gerador de Parecer Clínico Automático (IA)
          </div>
          <ChevronRight size={16} className="text-[var(--text-muted)] rotate-90" />
        </button>
        <button className="w-full bg-[var(--card)] border border-[var(--border)] hover:border-[var(--border-light)] p-4 rounded-xl flex items-center justify-between text-sm font-semibold text-white transition-colors">
          <div className="flex items-center gap-3">
            <BarChart2 size={18} className="text-[var(--text-muted)]"/> Gerenciar por atendimento (visualizar/download/editar/status/exportar)
          </div>
          <ChevronRight size={16} className="text-[var(--text-muted)] rotate-90" />
        </button>
      </div>
    </div>
  );
}
