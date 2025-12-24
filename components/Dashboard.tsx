
import React, { useState, useMemo } from 'react';
import { Lead, LeadStatus } from '../types';
import { 
  Users, 
  TrendingUp, 
  DollarSign, 
  Activity, 
  Target,
  Search,
  Plus,
  Save,
  Trash2,
  Filter,
  ArrowUpRight,
  Briefcase,
  ExternalLink,
  Loader2,
  HandCoins,
  Clock
} from 'lucide-react';

interface DashboardProps {
  leads: Lead[];
  onUpdateLead?: (lead: Lead) => Promise<boolean>;
  onLeadClick?: (lead: Lead) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ leads, onUpdateLead, onLeadClick }) => {
  const [filterType, setFilterType] = useState<'all' | 'year' | 'month'>('all');
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  
  // Estados para o Radar (Vendas Esperadas)
  const [leadSearch, setLeadSearch] = useState('');
  const [editsBuffer, setEditsBuffer] = useState<{[key: string]: Partial<Lead>}>({});
  const [isSaving, setIsSaving] = useState<string | null>(null);

  const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      const date = new Date(lead.createdAt);
      if (filterType === 'all') return true;
      if (filterType === 'year') return date.getFullYear() === selectedYear;
      if (filterType === 'month') return date.getFullYear() === selectedYear && date.getMonth() === selectedMonth;
      return true;
    });
  }, [leads, filterType, selectedYear, selectedMonth]);

  const highPotentialLeads = useMemo(() => leads.filter(l => l.isHighPotential === true), [leads]);

  const stats = useMemo(() => {
    const total = filteredLeads.length;
    const won = filteredLeads.filter(l => l.status === LeadStatus.VENDIDO).length;
    const lost = filteredLeads.filter(l => l.status === LeadStatus.PERDIDO).length;
    const servicing = filteredLeads.filter(l => l.status === LeadStatus.SEGMENTADO).length;
    const hot = filteredLeads.filter(l => l.status === LeadStatus.QUENTE).length;
    
    // Faturamento Total de Vendas (VGV Realizado)
    const vgvTotal = filteredLeads
      .filter(l => l.status === LeadStatus.VENDIDO)
      .reduce((acc, curr) => acc + (curr.expectedSaleValue || 0), 0);

    // Comissão Total Recebida (Realizada)
    const commissionTotal = filteredLeads
      .filter(l => l.status === LeadStatus.VENDIDO)
      .reduce((acc, curr) => acc + (curr.expectedCommissionValue || 0), 0);

    // Venda Esperada (Radar) - Soma dos leads de alto potencial
    const totalExpectedSale = highPotentialLeads.reduce((acc, curr) => acc + (curr.expectedSaleValue || 0), 0);
    
    // Comissão Esperada (Radar) - Soma das comissões projetadas
    const totalExpectedCommission = highPotentialLeads.reduce((acc, curr) => acc + (curr.expectedCommissionValue || 0), 0);

    return { total, won, lost, servicing, hot, vgvTotal, commissionTotal, totalExpectedSale, totalExpectedCommission };
  }, [filteredLeads, highPotentialLeads]);

  const conversionRate = stats.total > 0 ? ((stats.won / stats.total) * 100).toFixed(1) : '0';

  const leadsToAddToRadar = useMemo(() => {
    if (leadSearch.length < 2) return [];
    return leads
      .filter(l => !l.isHighPotential && l.name.toLowerCase().includes(leadSearch.toLowerCase()))
      .slice(0, 5);
  }, [leads, leadSearch]);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const updateBuffer = (leadId: string, field: keyof Lead, value: any) => {
    setEditsBuffer(prev => ({
      ...prev,
      [leadId]: { ...prev[leadId], [field]: value }
    }));
  };

  const handleSaveRadar = async (lead: Lead) => {
    const changes = editsBuffer[lead.id];
    if (onUpdateLead && changes) {
      setIsSaving(lead.id);
      try {
        const success = await onUpdateLead({ ...lead, ...changes } as Lead);
        if (success) {
          const newBuffer = { ...editsBuffer };
          delete newBuffer[lead.id];
          setEditsBuffer(newBuffer);
        }
      } finally {
        setIsSaving(null);
      }
    }
  };

  const handleAddToRadar = async (lead: Lead) => {
    if (onUpdateLead) {
      setIsSaving(lead.id);
      try {
        await onUpdateLead({ ...lead, isHighPotential: true } as Lead);
        setLeadSearch('');
      } finally {
        setIsSaving(null);
      }
    }
  };

  const handleRemoveFromRadar = async (lead: Lead) => {
    if (onUpdateLead) {
      if (!confirm(`Remover ${lead.name} do radar de prioridades?`)) return;
      setIsSaving(lead.id);
      try {
        await onUpdateLead({ ...lead, isHighPotential: false } as Lead);
      } finally {
        setIsSaving(null);
      }
    }
  };

  const getBufferedValue = <K extends keyof Lead>(lead: Lead, field: K): Lead[K] => {
    return (editsBuffer[lead.id]?.[field] ?? lead[field]) as Lead[K];
  };

  const funnelSteps = [
    { label: 'Leads Totais', count: stats.total, color: 'from-indigo-500 to-indigo-600' },
    { label: 'Em Atendimento', count: stats.servicing, color: 'from-blue-500 to-blue-600' },
    { label: 'Visita / Quente', count: stats.hot, color: 'from-orange-500 to-orange-600' },
    { label: 'Vendas Realizadas', count: stats.won, color: 'from-emerald-500 to-emerald-600' },
  ];

  return (
    <div className="p-4 md:p-8 space-y-8 bg-slate-50 dark:bg-slate-950 min-h-screen pb-24">
      {/* Header & Filtros */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Dashboard Comercial</h1>
          <p className="text-sm text-slate-500">Inteligência de vendas e faturamento em tempo real.</p>
        </div>
        
        <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <Filter size={16} className="text-slate-400 ml-2" />
          <select 
            value={filterType} 
            onChange={(e) => setFilterType(e.target.value as any)}
            className="bg-transparent border-none text-xs font-bold text-slate-600 dark:text-slate-300 outline-none cursor-pointer"
          >
            <option value="all">Todo Período</option>
            <option value="year">Por Ano</option>
            <option value="month">Por Mês</option>
          </select>
          {filterType !== 'all' && (
             <div className="flex gap-1">
               <select className="bg-slate-100 dark:bg-slate-800 border-none rounded-lg text-[10px] font-bold py-1 px-2" value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}>
                 {[2024, 2025].map(y => <option key={y} value={y}>{y}</option>)}
               </select>
               {filterType === 'month' && (
                 <select className="bg-slate-100 dark:bg-slate-800 border-none rounded-lg text-[10px] font-bold py-1 px-2" value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))}>
                    {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
                 </select>
               )}
             </div>
          )}
        </div>
      </div>

      {/* Métricas Superiores */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <MetricCard label="Total de Leads" value={stats.total} icon={Users} color="indigo" />
          <MetricCard label="Taxa Conversão" value={`${conversionRate}%`} icon={TrendingUp} color="blue" />
          <MetricCard label="Faturamento VGV" value={formatCurrency(stats.vgvTotal)} icon={DollarSign} color="emerald" />
          <MetricCard label="Comissão Recebida" value={formatCurrency(stats.commissionTotal)} icon={HandCoins} color="emerald" />
          <MetricCard label="Leads Desqualificados" value={stats.lost} icon={Activity} color="red" />
        </div>

        {/* NOVOS BLOCOS: Venda e Comissão Esperada */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 p-6 rounded-[2rem] shadow-xl text-white flex items-center justify-between group overflow-hidden relative transition-all hover:scale-[1.01]">
            <div className="absolute -right-4 -bottom-4 opacity-10 rotate-12 transition-transform group-hover:scale-110">
              <DollarSign size={120} />
            </div>
            <div className="relative z-10">
              <p className="text-[10px] font-black uppercase tracking-widest text-indigo-100 mb-1">Venda Esperada (Radar)</p>
              <h3 className="text-3xl font-black">{formatCurrency(stats.totalExpectedSale)}</h3>
              <p className="text-[10px] font-medium text-indigo-200 mt-1 flex items-center gap-1">
                <Clock size={10} /> Projeção baseada em leads prioritários
              </p>
            </div>
            <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-md">
              <Target size={32} />
            </div>
          </div>

          <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 p-6 rounded-[2rem] shadow-xl text-white flex items-center justify-between group overflow-hidden relative transition-all hover:scale-[1.01]">
            <div className="absolute -right-4 -bottom-4 opacity-10 rotate-12 transition-transform group-hover:scale-110">
              <HandCoins size={120} />
            </div>
            <div className="relative z-10">
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-100 mb-1">Comissão Esperada (Radar)</p>
              <h3 className="text-3xl font-black">{formatCurrency(stats.totalExpectedCommission)}</h3>
              <p className="text-[10px] font-medium text-emerald-200 mt-1 flex items-center gap-1">
                <TrendingUp size={10} /> Ganho futuro projetado
              </p>
            </div>
            <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-md">
              <HandCoins size={32} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* FUNIL ADAPTATIVO */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col h-full">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
               <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                 <Target className="text-indigo-500" size={18} /> Funil de Conversão
               </h3>
               <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Fluxo de Vendas</div>
            </div>
            
            <div className="p-8 flex flex-col items-center gap-3">
              {funnelSteps.map((step, idx) => {
                const prevCount = funnelSteps[idx - 1]?.count;
                const dropRate = prevCount ? ((step.count / prevCount) * 100).toFixed(0) : null;
                const width = 100 - (idx * 12);
                
                return (
                  <React.Fragment key={idx}>
                    {dropRate && (
                      <div className="flex items-center gap-3 py-1">
                        <div className="h-4 w-px bg-slate-200 dark:bg-slate-800"></div>
                        <span className="text-[10px] font-black text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-full">{dropRate}% retenção</span>
                        <div className="h-4 w-px bg-slate-200 dark:bg-slate-800"></div>
                      </div>
                    )}
                    <div 
                      className={`h-16 rounded-2xl bg-gradient-to-r shadow-md flex items-center justify-between px-6 transition-all hover:scale-[1.01] cursor-default ${step.color}`}
                      style={{ width: `${width}%` }}
                    >
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase tracking-widest text-white/60 leading-none mb-1">{step.label}</span>
                        <span className="text-xl font-black text-white">{step.count}</span>
                      </div>
                      <div className="p-2 bg-white/20 rounded-lg">
                        <ArrowUpRight size={18} className="text-white" />
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </div>

        {/* VENDAS ESPERADAS (ANTIGO RADAR) */}
        <div className="lg:col-span-6 flex flex-col gap-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex-1 flex flex-col overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-4">
               <div className="flex items-center justify-between">
                 <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                   <Briefcase className="text-emerald-500" size={18} /> Vendas Esperadas (Radar)
                 </h3>
                 <span className="bg-emerald-500 text-white text-[10px] font-black px-2 py-0.5 rounded-md">{highPotentialLeads.length} EM FOCO</span>
               </div>
               
               <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input 
                    type="text"
                    value={leadSearch}
                    onChange={(e) => setLeadSearch(e.target.value)}
                    placeholder="Adicionar lead às vendas esperadas..."
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 pl-9 pr-4 text-xs outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                  {leadsToAddToRadar.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl z-20 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                      {leadsToAddToRadar.map(l => (
                        <button 
                          key={l.id} 
                          onClick={() => handleAddToRadar(l)}
                          className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-between group"
                        >
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{l.name}</span>
                          <Plus size={14} className="text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      ))}
                    </div>
                  )}
               </div>
            </div>
            
            <div className="flex-1 overflow-y-auto max-h-[600px] divide-y divide-slate-100 dark:divide-slate-800 custom-scrollbar">
              {highPotentialLeads.length === 0 ? (
                <div className="p-12 text-center text-slate-400 italic text-xs">Nenhum lead prioritizado no momento.</div>
              ) : (
                highPotentialLeads.map(lead => (
                  <div key={lead.id} className="p-5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors relative group/card">
                    <div className="flex justify-between items-start mb-4">
                      <div className="cursor-pointer" onClick={() => onLeadClick?.(lead)}>
                        <h4 className="font-bold text-slate-800 dark:text-white group-hover/card:text-indigo-600 transition-colors truncate max-w-[220px]">{lead.name}</h4>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{lead.status}</p>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity">
                        <button onClick={() => onLeadClick?.(lead)} className="p-2 text-slate-400 hover:text-indigo-500 bg-white dark:bg-slate-800 rounded-lg shadow-sm"><ExternalLink size={14} /></button>
                        <button onClick={() => handleRemoveFromRadar(lead)} className="p-2 text-slate-400 hover:text-red-500 bg-white dark:bg-slate-800 rounded-lg shadow-sm"><Trash2 size={14} /></button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Valor do Imóvel</label>
                        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-950 p-2.5 rounded-xl border border-transparent focus-within:border-emerald-500/50 transition-colors">
                          <DollarSign size={12} className="text-emerald-500" />
                          <input 
                            type="number"
                            value={(getBufferedValue(lead, 'expectedSaleValue') as any) ?? ''}
                            onChange={e => updateBuffer(lead.id, 'expectedSaleValue', parseFloat(e.target.value))}
                            className="bg-transparent border-none text-[12px] font-black outline-none w-full text-slate-800 dark:text-slate-200"
                            placeholder="0,00"
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Comissão Prevista</label>
                        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-950 p-2.5 rounded-xl border border-transparent focus-within:border-indigo-500/50 transition-colors">
                          <HandCoins size={12} className="text-indigo-500" />
                          <input 
                            type="number"
                            value={(getBufferedValue(lead, 'expectedCommissionValue') as any) ?? ''}
                            onChange={e => updateBuffer(lead.id, 'expectedCommissionValue', parseFloat(e.target.value))}
                            className="bg-transparent border-none text-[12px] font-black outline-none w-full text-slate-800 dark:text-slate-200"
                            placeholder="0,00"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5 mb-4">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Estratégia de Fechamento</label>
                      <textarea 
                        value={(getBufferedValue(lead, 'potentialNotes') as any) ?? ''}
                        onChange={e => updateBuffer(lead.id, 'potentialNotes', e.target.value)}
                        className="w-full bg-slate-100 dark:bg-slate-950 border-none rounded-xl p-3 text-[11px] font-medium outline-none resize-none h-16 focus:ring-1 focus:ring-indigo-500/30 text-slate-600 dark:text-slate-400"
                        placeholder="Detalhes críticos para a venda..."
                      />
                    </div>

                    {editsBuffer[lead.id] && (
                      <button 
                        onClick={() => handleSaveRadar(lead)}
                        disabled={isSaving === lead.id}
                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2"
                      >
                        {isSaving === lead.id ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                        ATUALIZAR PROJEÇÃO
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

const MetricCard = ({ label, value, icon: Icon, color, trend }: any) => {
  const colors: any = {
    indigo: "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-800",
    blue: "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-800",
    emerald: "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800",
    amber: "bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-800",
    red: "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-red-100 dark:border-red-800",
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-5 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm group hover:border-indigo-500/30 transition-all">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-2.5 rounded-2xl ${colors[color]}`}>
          <Icon size={22} />
        </div>
        {trend && (
          <span className="text-[10px] font-black text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-full">{trend}</span>
        )}
      </div>
      <div>
        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">{label}</p>
        <h3 className="text-lg font-black text-slate-800 dark:text-white truncate">{value}</h3>
      </div>
    </div>
  );
};
