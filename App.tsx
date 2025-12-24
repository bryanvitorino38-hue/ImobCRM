
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  LayoutDashboard, 
  Plus, 
  Search, 
  RefreshCw,
  Phone,
  MapPin,
  Sun,
  Moon,
  Zap,
  ExternalLink,
  XCircle,
  Cpu,
  Trash2,
  AlertTriangle,
  LogOut,
  BarChart3,
  Menu, 
  X,
  Bot,
  Calendar,
  QrCode,
  Settings,
  CheckCircle2,
  Wifi,
  WifiOff,
  User,
  Crown,
  List,
  Columns,
  Filter,
  MessageCircle,
  Star,
  Loader2,
  Send,
  FileSpreadsheet,
  ArrowRight
} from 'lucide-react';
import { Session } from '@supabase/supabase-js';
import { Lead, LeadStatus, KanbanColumnType } from './types';
import { leadService, supabase, mapToAppLead, profileService } from './services/supabaseClient';
import { LeadModal } from './components/LeadModal';
import { Disparador } from './components/Disparador';
import { Dashboard } from './components/Dashboard'; 
import { AtendenteIA } from './components/AtendenteIA'; 
import { ConexaoWhatsapp } from './components/ConexaoWhatsapp';
import { Configuracoes } from './components/Configuracoes';
import { Login } from './components/Login';
import { UpdatePassword } from './components/UpdatePassword';
import { TriggerLogo } from './components/TriggerLogo';
import { SupportButton } from './components/SupportButton';
import { LeadTable } from './components/LeadTable';

const COLUMNS: KanbanColumnType[] = [
  { id: LeadStatus.FRIO, title: 'Novos / Frio', color: 'bg-blue-500' },
  { id: LeadStatus.SEGMENTADO, title: 'Em Atendimento', color: 'bg-yellow-500' },
  { id: LeadStatus.QUENTE, title: 'Visita / Quente', color: 'bg-orange-500' },
  { id: LeadStatus.VENDIDO, title: 'Vendido', color: 'bg-emerald-500' },
  { id: LeadStatus.PERDIDO, title: 'Desqualificado', color: 'bg-red-500' },
];

const getStatusColor = (status: LeadStatus) => {
  switch (status) {
    case LeadStatus.FRIO: return "text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-300 border-blue-100 dark:border-blue-800";
    case LeadStatus.SEGMENTADO: return "text-yellow-600 bg-yellow-50 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-100 dark:border-yellow-800";
    case LeadStatus.QUENTE: return "text-orange-600 bg-orange-50 dark:bg-orange-900/30 dark:text-orange-300 border-orange-100 dark:border-orange-800";
    case LeadStatus.VENDIDO: return "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-100 dark:border-emerald-800";
    case LeadStatus.PERDIDO: return "text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-300 border-red-100 dark:border-red-800";
    default: return "text-slate-600 bg-slate-50";
  }
};

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);

  const [currentView, setCurrentView] = useState<'crm' | 'disparador' | 'dashboard' | 'atendente' | 'configuracoes'>('dashboard');
  const [crmDisplay, setCrmDisplay] = useState<'pipeline' | 'list'>('pipeline');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filtros de CRM
  const [filterType, setFilterType] = useState<'all' | 'year' | 'month'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [onlyRadar, setOnlyRadar] = useState(false);
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  
  // Seleção e Disparo em Massa
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [isBulkMessageModalOpen, setIsBulkMessageModalOpen] = useState(false);
  const [isSendingBulk, setIsSendingBulk] = useState(false);
  
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [whatsappStatus, setWhatsappStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');
  const [isPro, setIsPro] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);

  const leadsFilteredByTime = useMemo(() => {
    return leads.filter(lead => {
      const date = new Date(lead.createdAt);
      if (filterType === 'all') return true;
      if (filterType === 'year') return date.getFullYear() === selectedYear;
      if (filterType === 'month') return date.getFullYear() === selectedYear && date.getMonth() === selectedMonth;
      return true;
    });
  }, [leads, filterType, selectedYear, selectedMonth]);

  const leadsFilteredBySearch = useMemo(() => {
    return leadsFilteredByTime.filter(l => 
      l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.phone.includes(searchTerm) ||
      (l.interestLocation && l.interestLocation.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [leadsFilteredByTime, searchTerm]);

  const checkWhatsAppStatus = useCallback(async (webhookUrl: string, name: string) => {
    if (!webhookUrl) return;
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instance: name || 'Standard', checkOnly: true })
      });
      if (response.ok) {
        const text = await response.text();
        const lowerText = text.toLowerCase();
        if (text.trim().toUpperCase() === "OK" || lowerText.includes('"state":"open"')) {
          setWhatsappStatus('connected');
          return;
        }
        setWhatsappStatus('disconnected');
      } else setWhatsappStatus('disconnected'); 
    } catch (e) { setWhatsappStatus('disconnected'); }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setSessionLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') setIsRecoveryMode(true);
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode]);

  useEffect(() => {
    if (session) {
      const initProfile = async () => {
        const profile = await profileService.getProfile();
        setUserName(profile?.name || null);
        const webhook = profile?.whatsapp_webhook_url;
        const hasWebhook = webhook && webhook !== '' && webhook !== 'null';
        setIsPro(!!hasWebhook);
        if (hasWebhook) {
          const name = profile?.whatsapp_instance || 'Standard';
          checkWhatsAppStatus(webhook, name);
        } else setWhatsappStatus('disconnected'); 
      };
      initProfile();
      loadLeads();
    }
  }, [session, checkWhatsAppStatus]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setLeads([]); setIsRecoveryMode(false); setWhatsappStatus('disconnected');
    setIsPro(false);
  };

  const loadLeads = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const data = await leadService.getAll();
      setLeads(data);
    } catch (err: any) { setErrorMsg(err.message || "Erro"); } finally { if (!silent) setIsLoading(false); }
  };

  const handleDrop = async (e: React.DragEvent, newStatus: LeadStatus) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData('leadId');
    const lead = leads.find(l => l.id === leadId);
    if (lead && lead.status !== newStatus) {
      try {
        const updatedLead = { ...lead, status: newStatus };
        setLeads(prev => prev.map(l => l.id === leadId ? updatedLead : l));
        await leadService.update(leadId, { status: newStatus });
      } catch (err: any) {
        setErrorMsg(err.message || "Erro ao atualizar status");
        loadLeads(true);
      }
    }
  };

  const confirmDelete = async () => {
    if (!leadToDelete) return;
    try {
      await leadService.delete(leadToDelete.id);
      setLeads(prev => prev.filter(l => l.id !== leadToDelete.id));
      setLeadToDelete(null);
    } catch (err: any) { alert(err.message || "Erro ao excluir lead"); }
  };

  const handleLeadClick = (lead: Lead) => { setSelectedLead(lead); setIsModalOpen(true); };
  const handleCloseModal = () => { setIsModalOpen(false); setSelectedLead(null); };

  const handleCreateLead = (status: LeadStatus) => {
    setSelectedLead({ id: `temp-new-${Date.now()}`, name: '', status, phone: '', email: '', interestLocation: '', grossIncome: 0, downPayment: 0, summary: '', createdAt: new Date().toISOString() });
    setIsModalOpen(true);
  };

  const handleSaveLead = async (leadToSave: Lead): Promise<boolean> => {
    try {
      if (leadToSave.id.startsWith('temp-new')) {
        const saved = await leadService.create(leadToSave);
        setLeads(prev => [saved, ...prev]);
      } else {
        setLeads(prev => prev.map(l => l.id === leadToSave.id ? { ...l, ...leadToSave } : l));
        await leadService.update(leadToSave.id, leadToSave);
      }
      setIsModalOpen(false); setSelectedLead(null); return true;
    } catch (err: any) { alert(err.message); return false; }
  };

  // Logica de Envio para "Planilha de Disparo"
  const handlePrepareBulkSend = () => {
    setIsBulkMessageModalOpen(true);
  };

  const handleConfirmBulkTransfer = async () => {
    setIsSendingBulk(true);
    await new Promise(r => setTimeout(r, 1500));
    setIsSendingBulk(false);
    setIsBulkMessageModalOpen(false);
    setSelectedLeadIds([]);
    setCurrentView('disparador'); 
    alert("Leads preparados! Agora configure sua mensagem e inicie o disparo.");
  };

  const NavItem = ({ view, icon: Icon, label }: { view: typeof currentView, icon: any, label: string }) => (
    <button 
      onClick={() => { setCurrentView(view); setIsMobileMenuOpen(false); }} 
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 group
        ${currentView === view ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700 hover:text-indigo-600'}`}
    >
      <Icon size={20} /> <span>{label}</span>
    </button>
  );

  if (sessionLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900"><TriggerLogo className="animate-pulse scale-150" /></div>;
  if (isRecoveryMode) return <UpdatePassword onSuccess={() => setIsRecoveryMode(false)} />;
  if (!session) return <Login />;

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 font-sans relative overflow-hidden">
      <div className={`fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm transition-opacity md:hidden ${isMobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setIsMobileMenuOpen(false)} />
      <aside className={`fixed top-0 left-0 z-50 h-full w-72 bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transform transition-transform md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}`}>
        <div className="p-8 flex items-center justify-between">
          <TriggerLogo />
          <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden text-slate-400"><X size={24} /></button>
        </div>
        <nav className="flex-1 px-4 space-y-2 mt-2">
          <NavItem view="dashboard" icon={BarChart3} label="Dashboard" />
          <NavItem view="crm" icon={LayoutDashboard} label="Leads CRM" />
          <NavItem view="disparador" icon={Zap} label="Disparador" />
          <NavItem view="atendente" icon={Bot} label="Atendente IA" />
          <NavItem view="configuracoes" icon={Settings} label="Configurações" />
        </nav>
        <div className="p-4 m-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm">
           <div className="flex items-center gap-3 mb-4">
              <div className="relative">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${isPro ? 'bg-indigo-600' : 'bg-slate-400'}`}>
                   {(userName || session.user.email)?.slice(0,1).toUpperCase()}
                </div>
                {isPro && <div className="absolute -top-1 -right-1 bg-amber-500 rounded-full p-0.5 border-2 border-white dark:border-slate-800"><Crown size={10} className="text-white fill-white" /></div>}
              </div>
              <div className="flex-1 min-w-0">
                 <p className="text-sm font-bold truncate">{userName || session.user.email}</p>
                 <div className="flex items-center gap-1.5 mt-0.5">
                   <div className={`w-2 h-2 rounded-full ${whatsappStatus === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></div>
                   <p className={`text-[10px] font-bold uppercase ${whatsappStatus === 'connected' ? 'text-emerald-500' : 'text-slate-400'}`}>WhatsApp: {whatsappStatus === 'connected' ? 'On' : 'Off'}</p>
                 </div>
              </div>
           </div>
           <div className="grid grid-cols-2 gap-2">
             <button onClick={() => setDarkMode(!darkMode)} className="flex items-center justify-center p-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors">{darkMode ? <Sun size={18} /> : <Moon size={18} />}</button>
             <button onClick={handleLogout} className="flex items-center justify-center p-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 border border-red-100 dark:border-red-900/30"><LogOut size={18} /></button>
           </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden md:pl-72 relative">
        <header className="md:hidden h-16 shrink-0 bg-white dark:bg-slate-900 border-b flex items-center px-4 z-20">
          <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 mr-3"><Menu size={24} /></button>
          <TriggerLogo className="scale-75" />
        </header>
        
        {currentView === 'dashboard' && <div className="flex-1 overflow-y-auto"><Dashboard leads={leads} onUpdateLead={handleSaveLead} onLeadClick={handleLeadClick} /></div>}
        
        {currentView === 'crm' && (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-slate-100 dark:bg-slate-950">
            <div className="px-6 py-4 flex flex-col lg:flex-row justify-between items-center bg-white dark:bg-slate-900 border-b border-slate-200 gap-4">
              <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <LayoutDashboard className="text-indigo-600" size={24} /> 
                  CRM
                </h2>
                
                <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-x-auto">
                  <div className="flex items-center gap-1.5 px-2 border-r border-slate-200 dark:border-slate-700">
                    <Filter size={14} className="text-slate-400" />
                    <select value={filterType} onChange={(e) => setFilterType(e.target.value as any)} className="bg-transparent border-none text-[10px] font-black text-slate-600 dark:text-slate-300 outline-none cursor-pointer uppercase">
                      <option value="all">Todo Tempo</option>
                      <option value="year">Por Ano</option>
                      <option value="month">Por Mês</option>
                    </select>
                  </div>
                  
                  <div className="flex items-center gap-1.5 px-2 border-r border-slate-200 dark:border-slate-700">
                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-transparent border-none text-[10px] font-black text-slate-600 dark:text-slate-300 outline-none cursor-pointer uppercase">
                      <option value="all">Todos Status</option>
                      {COLUMNS.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                    </select>
                  </div>

                  <button 
                    onClick={() => setOnlyRadar(!onlyRadar)}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all ${onlyRadar ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    <Star size={14} className={onlyRadar ? 'fill-amber-500' : ''} />
                    <span className="text-[10px] font-black uppercase">Radar</span>
                  </button>
                </div>

                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                  <button onClick={() => setCrmDisplay('pipeline')} className={`p-1.5 rounded-md transition-all ${crmDisplay === 'pipeline' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}><Columns size={18} /></button>
                  <button onClick={() => setCrmDisplay('list')} className={`p-1.5 rounded-md transition-all ${crmDisplay === 'list' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}><List size={18} /></button>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full lg:w-auto">
                <div className="relative flex-1 sm:flex-initial">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar leads..." className="w-full lg:w-48 bg-slate-50 dark:bg-slate-800 border rounded-xl py-2 pl-10 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <button onClick={() => loadLeads(false)} disabled={isLoading} className="p-2.5 bg-white dark:bg-slate-800 border rounded-xl hover:bg-slate-50 transition-colors"><RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} /></button>
                <button onClick={() => handleCreateLead(LeadStatus.FRIO)} className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-500/20 transition-all"><Plus size={18} /></button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-6 relative">
              {crmDisplay === 'pipeline' ? (
                <div className="flex gap-5 h-full min-w-[1400px]">
                  {COLUMNS.map(column => (
                    <div key={column.id} onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDrop(e, column.id)} className="flex-1 min-w-[280px] flex flex-col rounded-2xl bg-slate-200/50 dark:bg-slate-900/50 border border-slate-200/60">
                      <div className="p-3 flex items-center justify-between border-b border-slate-200/50">
                        <div className="flex items-center gap-2.5">
                          <span className={`w-3 h-3 rounded-full ${column.color}`}></span>
                          <h3 className="font-bold text-sm">{column.title}</h3>
                          <span className="bg-white dark:bg-slate-700 px-2 rounded-md text-xs font-bold text-slate-500">
                            {leadsFilteredBySearch.filter(l => l.status === column.id).length}
                          </span>
                        </div>
                        <button onClick={() => handleCreateLead(column.id)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white transition-colors"><Plus size={18} /></button>
                      </div>
                      <div className="flex-1 p-2 overflow-y-auto space-y-2.5 custom-scrollbar">
                        {leadsFilteredBySearch.filter(l => l.status === column.id).map(lead => (
                          <div key={lead.id} draggable onDragStart={(e) => e.dataTransfer.setData('leadId', lead.id)} onClick={() => handleLeadClick(lead)} className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-transparent hover:border-indigo-500/30 shadow-sm cursor-grab active:cursor-grabbing transition-all group relative">
                            <div className="flex justify-between items-start mb-2">
                              <div className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${getStatusColor(lead.status)}`}>{column.title.split('/')[0]}</div>
                              {lead.isHighPotential && <Star size={12} className="text-amber-500 fill-amber-500" />}
                            </div>
                            <h4 className="font-bold text-sm mb-1 text-slate-800 dark:text-slate-100 truncate">{lead.name}</h4>
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-2 italic"><Calendar size={12} /> {new Date(lead.createdAt).toLocaleDateString('pt-BR')}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="max-w-6xl mx-auto">
                   <LeadTable 
                      leads={leadsFilteredByTime} 
                      searchTerm={searchTerm} 
                      statusFilter={statusFilter}
                      onlyRadar={onlyRadar}
                      onEdit={handleLeadClick} 
                      onDelete={setLeadToDelete} 
                      selectedIds={selectedLeadIds}
                      onSelectToggle={(id) => setSelectedLeadIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])}
                      onSelectAll={setSelectedLeadIds}
                   />
                </div>
              )}

              {/* BARRA DE AÇÕES EM MASSA - DESIGN REFINADO PARA DESKTOP E MOBILE */}
              {selectedLeadIds.length > 0 && (
                <div className="fixed bottom-0 left-0 right-0 md:bottom-8 md:left-1/2 md:-translate-x-1/2 z-50 animate-in slide-in-from-bottom-20 duration-500 px-0 md:px-4">
                  <div className="bg-slate-900/90 dark:bg-slate-800/90 md:bg-slate-900 dark:md:bg-slate-800 text-white px-4 md:px-8 py-4 md:py-3.5 md:rounded-full shadow-[0_-8px_30px_rgb(0,0,0,0.2)] md:shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex flex-col md:flex-row items-center gap-4 md:gap-8 border-t md:border border-slate-700/50 backdrop-blur-xl md:max-w-3xl md:mx-auto">
                    
                    <div className="flex items-center justify-between w-full md:w-auto gap-4">
                      <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-4">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse"></div>
                          <span className="text-sm md:text-base font-black text-white uppercase md:capitalize tracking-widest md:tracking-normal leading-none">
                            {selectedLeadIds.length} <span className="hidden md:inline font-medium text-slate-300">leads selecionados</span>
                            <span className="md:hidden">selecionados</span>
                          </span>
                        </div>
                        <span className="text-[10px] md:hidden text-slate-400 mt-1 uppercase tracking-widest">Ações em massa</span>
                      </div>
                      <button onClick={() => setSelectedLeadIds([])} className="md:hidden p-2 text-slate-400 hover:text-white bg-white/10 rounded-full"><X size={18} /></button>
                    </div>

                    <div className="hidden md:block h-6 w-px bg-slate-700/50"></div>

                    <div className="flex items-center gap-2.5 w-full md:w-auto">
                      <button 
                        onClick={handlePrepareBulkSend}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 md:px-5 md:py-2 bg-indigo-600 hover:bg-indigo-500 rounded-2xl md:rounded-full text-sm md:text-xs font-black transition-all active:scale-95 shadow-lg shadow-indigo-600/20"
                      >
                        <Zap size={18} className="md:size-4" /> 
                        <span className="md:hidden">Preparar Disparo</span>
                        <span className="hidden md:inline">Mandar p/ Planilha</span>
                      </button>
                      
                      <button 
                        onClick={() => { if(confirm(`Excluir ${selectedLeadIds.length} leads permanentemente?`)) { /* logic delete */ } }}
                        className="flex items-center justify-center p-3 md:px-4 md:py-2 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white rounded-2xl md:rounded-full text-xs font-bold transition-all active:scale-95 border border-red-500/20"
                      >
                        <Trash2 size={18} className="md:size-4" />
                        <span className="hidden md:inline ml-2">Excluir</span>
                      </button>
                      
                      <button 
                        onClick={() => setSelectedLeadIds([])} 
                        className="hidden md:flex items-center justify-center w-8 h-8 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-all"
                      >
                        <X size={20} />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {currentView === 'disparador' && <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950"><Disparador onSave={handleSaveLead} user={session?.user} /></div>}
        {currentView === 'atendente' && <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950"><AtendenteIA /></div>}
        {currentView === 'configuracoes' && <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950"><Configuracoes session={session} whatsappStatus={whatsappStatus} onRefreshStatus={() => {
           profileService.getProfile().then(p => { if (p?.whatsapp_webhook_url) checkWhatsAppStatus(p.whatsapp_webhook_url, p.whatsapp_instance); });
        }} /></div>}
      </main>

      {isBulkMessageModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-lg border border-slate-200 dark:border-slate-800 scale-100 animate-in zoom-in-95 overflow-hidden">
             <div className="p-8 text-center bg-indigo-600 text-white relative">
                <div className="absolute top-4 right-4">
                   <button onClick={() => setIsBulkMessageModalOpen(false)} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"><X size={20} /></button>
                </div>
                <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
                   <FileSpreadsheet size={40} />
                </div>
                <h3 className="text-2xl font-black">Planilha de Disparo</h3>
                <p className="text-indigo-100 text-sm mt-2">Preparando {selectedLeadIds.length} leads para envio.</p>
             </div>
             
             <div className="p-8 space-y-6">
                <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl text-indigo-600 shrink-0">
                      <Zap size={24} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 dark:text-white">Ação Necessária</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                        Os contatos serão movidos para a <b>Fila de Disparo</b>. No próximo passo, você define a mensagem e inicia o envio automatizado.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <button 
                    onClick={handleConfirmBulkTransfer}
                    disabled={isSendingBulk}
                    className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-lg shadow-xl shadow-indigo-600/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
                  >
                    {isSendingBulk ? <Loader2 className="animate-spin" size={24} /> : <ArrowRight size={24} />}
                    {isSendingBulk ? 'Enviando...' : 'Confirmar Envio'}
                  </button>
                  <button 
                    onClick={() => setIsBulkMessageModalOpen(false)}
                    className="w-full py-3 text-slate-400 font-bold text-sm"
                  >
                    Voltar
                  </button>
                </div>
             </div>
          </div>
        </div>
      )}
      
      <LeadModal key={selectedLead ? selectedLead.id : 'modal'} isOpen={isModalOpen} lead={selectedLead} onClose={handleCloseModal} onSave={handleSaveLead} />
      {leadToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
           <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm border border-slate-200 dark:border-slate-800 p-6 space-y-5 text-center scale-100 animate-in zoom-in-95">
              <div className="p-4 bg-red-100 rounded-full w-fit mx-auto text-red-600"><AlertTriangle size={32} /></div>
              <h3 className="text-xl font-bold">Excluir Lead?</h3>
              <p className="text-sm text-slate-500">Deseja realmente excluir permanentemente <b>{leadToDelete.name}</b>?</p>
              <div className="grid grid-cols-2 gap-3 pt-2">
                 <button onClick={() => setLeadToDelete(null)} className="px-4 py-2.5 text-sm font-bold bg-slate-100 rounded-xl">Cancelar</button>
                 <button onClick={confirmDelete} className="px-4 py-2.5 text-sm font-bold bg-red-600 text-white rounded-xl shadow-lg shadow-red-600/20 active:scale-95 transition-all">Excluir</button>
              </div>
           </div>
        </div>
      )}
      <SupportButton />
    </div>
  );
}
export default App;
