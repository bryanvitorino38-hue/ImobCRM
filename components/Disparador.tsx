
import React, { useState, useRef, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  FileText, 
  Loader2, 
  Paperclip,
  Zap,
  Grid,
  CheckCircle,
  AlertCircle,
  Clock,
  Crown, 
  X,     
  MessageCircle,
  UploadCloud,
  ArrowRight,
  Sparkles,
  Send,
  User,
  Info,
  ShieldAlert
} from 'lucide-react';
import { Lead } from '../types';
import { profileService } from '../services/supabaseClient';

interface DisparadorProps {
  onSave: (lead: Lead) => Promise<any>; 
  user: any; 
}

interface TempLead {
  id: string;
  name: string;
  phone: string;
  source: 'manual' | 'arquivo';
  status: 'pending' | 'sending' | 'success' | 'error';
  feedback?: string; 
}

export const Disparador: React.FC<DisparadorProps> = ({ onSave, user }) => {
  const [leadList, setLeadList] = useState<TempLead[]>([]);
  const [manualName, setManualName] = useState('');
  const [manualPhone, setManualPhone] = useState('');
  const [message, setMessage] = useState('');
  const [minDelay, setMinDelay] = useState<number>(3);
  const [maxDelay, setMaxDelay] = useState<number>(5);
  const [useAI, setUseAI] = useState<boolean>(false);
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  
  const [hasInstance, setHasInstance] = useState<boolean | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const PHONE_NUMBER = '5521969332661'; 

  useEffect(() => {
    const checkAccess = async () => {
      setIsLoadingProfile(true);
      const profile = await profileService.getProfile();
      setHasInstance(!!profile?.whatsapp_instance);
      setIsLoadingProfile(false);
    };
    checkAccess();
  }, []);

  const insertVariable = (variable: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const before = text.substring(0, start);
    const after = text.substring(end, text.length);

    setMessage(before + variable + after);
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + variable.length, start + variable.length);
    }, 0);
  };

  const openSupport = (customText?: string) => {
    const msg = customText || 'Olá, gostaria de saber mais sobre o Plano Pro para Disparos.';
    const link = `https://wa.me/${PHONE_NUMBER}?text=${encodeURIComponent(msg)}`;
    window.open(link, '_blank');
  };

  const getUploadWebhook = () => user?.user_metadata?.n8n_upload_webhook;
  const getTriggerWebhook = () => user?.user_metadata?.n8n_trigger_webhook;
  
  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    setLogs(prev => [`[${time}] ${msg}`, ...prev].slice(0, 10));
  };

  const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const handleManualAdd = () => {
    if (!manualName.trim() || !manualPhone.trim()) return;
    addLeadToList(manualName, manualPhone, 'manual');
    setManualName('');
    setManualPhone('');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const processFile = async () => {
    if (!hasInstance) { setShowUpgradeModal(true); return; }
    if (!file) return;
    const webhookUrl = getUploadWebhook();
    if (!webhookUrl) { setShowUpgradeModal(true); return; }
    
    setIsProcessing(true);
    addLog(`Enviando arquivo ${file.name}...`);
    
    const formData = new FormData();
    formData.append('data', file); 

    try {
      const response = await fetch(webhookUrl, { method: 'POST', body: formData });
      if (!response.ok) throw new Error(`Erro HTTP ${response.status}`);
      const rawData = await response.json();
      
      const dataArray = Array.isArray(rawData) ? rawData : [rawData];
      let countAdded = 0;

      for (const item of dataArray) {
        // Pega as strings brutas de nome e número
        const rawName = item.nome || item.name || '';
        const rawPhone = item.numero || item.telefone || item.phone || '';

        // Transforma em arrays separando por vírgula (logica do n8n extractor)
        const nameList = String(rawName).split(',').map(n => n.trim());
        const phoneList = String(rawPhone).split(',').map(p => p.trim());

        // Identifica o maior tamanho para iterar e parear corretamente 1-para-1
        const maxLength = Math.max(nameList.length, phoneList.length);

        for (let i = 0; i < maxLength; i++) {
          const name = nameList[i] || ''; // Se não houver nome correspondente ao índice do número, fica vazio
          const phone = phoneList[i] || ''; // Se não houver número correspondente ao índice do nome, fica vazio

          // Só adiciona se pelo menos um dos campos tiver conteúdo para não poluir a lista
          if (name || phone) {
            addLeadToList(name, phone, 'arquivo');
            countAdded++;
          }
        }
      }
      
      addLog(`Sucesso: +${countAdded} contatos.`);
    } catch (error: any) {
      console.error("Erro no processamento:", error);
      alert("Erro ao processar arquivo. Verifique a resposta do servidor.");
    } finally {
      setIsProcessing(false);
    }
  };

  const addLeadToList = (name: string, phone: string, source: 'manual' | 'arquivo') => {
    const newLead: TempLead = {
      id: Math.random().toString(36).substr(2, 9),
      name, phone, source, status: 'pending'
    };
    setLeadList(prev => [...prev, newLead]);
  };

  const handleDisparar = async () => {
    if (!hasInstance) { setShowUpgradeModal(true); return; }
    const webhookUrl = getTriggerWebhook();
    if (!webhookUrl) { setShowUpgradeModal(true); return; }

    const pendingLeads = leadList.filter(l => l.status === 'pending' || l.status === 'error');
    if (pendingLeads.length === 0 || !message.trim()) return;
    
    setIsSending(true);
    addLog(`Iniciando disparo...`);

    try {
      for (const lead of pendingLeads) {
        setLeadList(prev => prev.map(l => l.id === lead.id ? { ...l, status: 'sending' } : l));
        const delayMs = Math.floor(Math.random() * (maxDelay - minDelay + 1) + minDelay) * 1000;
        
        try {
          const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              leads: [{ nome: lead.name, numero: lead.phone }], 
              mensagem: message,
              delayMin: 1, delayMax: 2, usarIA: Boolean(useAI)
            })
          });

          const data = await response.json();
          const newStatus = data.success === false ? 'error' : 'success';
          setLeadList(prev => prev.map(l => l.id === lead.id ? { ...l, status: newStatus } : l));
          addLog(`${newStatus === 'success' ? 'Sucesso' : 'Erro'} [${lead.name}]`);
        } catch (err) {
          setLeadList(prev => prev.map(l => l.id === lead.id ? { ...l, status: 'error' } : l));
        }
        if (pendingLeads.indexOf(lead) < pendingLeads.length - 1) await wait(delayMs);
      }
    } finally { setIsSending(false); }
  };

  if (isLoadingProfile) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-[70vh] text-slate-400">
        <Loader2 size={32} className="animate-spin mb-4" />
        <p>Carregando ferramentas...</p>
      </div>
    );
  }

  if (hasInstance === false) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 md:p-8 animate-in fade-in zoom-in-95 duration-500 min-h-[80vh]">
        <div className="max-w-2xl w-full bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden relative">
           <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full -mr-20 -mt-20 blur-3xl"></div>
           <div className="relative z-10 p-8 md:p-12 flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/30 rounded-3xl flex items-center justify-center shadow-2xl mb-8">
                 <Crown size={40} className="text-amber-600 dark:text-amber-500" />
              </div>
              <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-4">Disparador de Mensagens</h2>
              <p className="text-slate-500 dark:text-slate-400 text-lg mb-8 leading-relaxed">A ferramenta de disparos em massa requer uma assinatura <b>Plano Pro</b> ativa.</p>
              <button onClick={() => openSupport()} className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3">Ativar Disparador Pro <ArrowRight size={24} /></button>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 font-sans pb-40">
      <div className="flex flex-col items-center text-center gap-2 mb-4">
        <h1 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
          Disparador <span className="text-indigo-600">Pro</span>
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1 max-w-md text-sm md:text-base">Envios automatizados com inteligência anti-bloqueio.</p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden flex flex-col">
        <div className="p-4 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex flex-wrap gap-4 justify-between items-center">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
             <Grid size={18} className="text-indigo-500" /> Lista de Envios ({leadList.length})
          </div>
          <button onClick={() => setLeadList([])} className="text-xs font-bold text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors">Limpar Lista</button>
        </div>

        <div className="px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-100 dark:border-amber-800 flex items-center gap-3">
           <ShieldAlert size={18} className="text-amber-600 dark:text-amber-500 shrink-0" />
           <p className="text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-tight"><b>Dica de Segurança:</b> Recomendamos envios em lotes de até <b>20 contatos</b>.</p>
        </div>

        <div className="p-4 bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
           <div className="flex flex-col md:flex-row gap-2">
              <input type="text" value={manualName} onChange={(e) => setManualName(e.target.value)} placeholder="Nome" className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm outline-none shadow-sm focus:ring-2 focus:ring-indigo-500/20" />
              <input type="text" value={manualPhone} onChange={(e) => setManualPhone(e.target.value)} placeholder="WhatsApp" className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm outline-none shadow-sm focus:ring-2 focus:ring-indigo-500/20" />
              <button onClick={handleManualAdd} className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-xl font-bold transition-all active:scale-95 shadow-lg"><Plus size={18} /></button>
           </div>
        </div>

        <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-400 font-bold uppercase tracking-widest sticky top-0 z-10">
                <tr><th className="px-4 py-3 w-16 text-center">Status</th><th className="px-4 py-3">Nome</th><th className="px-4 py-3">Telefone</th><th className="px-4 py-3 w-12"></th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {leadList.length === 0 ? (
                  <tr><td colSpan={4} className="p-12 text-center text-slate-400 text-sm italic">Lista vazia.</td></tr>
                ) : (
                  leadList.map(lead => (
                    <tr key={lead.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-4 py-3 text-center">{lead.status === 'sending' ? <Loader2 size={16} className="animate-spin text-blue-500 mx-auto" /> : lead.status === 'success' ? <CheckCircle size={16} className="text-emerald-500 mx-auto" /> : lead.status === 'error' ? <AlertCircle size={16} className="text-red-500 mx-auto" /> : <Clock size={16} className="text-slate-300 mx-auto" />}</td>
                      <td className="px-4 py-2 text-sm font-bold text-slate-700 dark:text-slate-300">{lead.name}</td>
                      <td className="px-4 py-2 text-sm text-slate-500 font-mono">{lead.phone}</td>
                      <td className="px-4 py-2 text-center text-slate-300 hover:text-red-500 cursor-pointer" onClick={() => setLeadList(prev => prev.filter(l => l.id !== lead.id))}><Trash2 size={16} /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
         <div className="space-y-4">
           <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><UploadCloud size={18} className="text-blue-500" /> Importar Contatos</h3>
           <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 flex flex-col items-center justify-center cursor-pointer h-48 hover:border-indigo-500/50 transition-all group">
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*,application/pdf" onChange={handleFileChange} />
              {file ? (
                <div className="text-center animate-in zoom-in-95">
                  <FileText size={48} className="text-emerald-500 mx-auto mb-2" />
                  <p className="font-bold text-slate-700 dark:text-slate-200">{file.name}</p>
                </div>
              ) : (
                <div className="text-center text-slate-400 group-hover:text-indigo-500 transition-colors">
                  <Paperclip size={40} className="mx-auto mb-2 opacity-20 group-hover:opacity-100" />
                  <p className="text-sm font-bold">PDF ou Imagem da Planilha</p>
                </div>
              )}
           </div>
           <button onClick={processFile} disabled={!file || isProcessing} className="w-full bg-slate-900 dark:bg-slate-800 text-white rounded-2xl py-4 font-black flex items-center justify-center gap-3 disabled:opacity-50 transition-all shadow-lg active:scale-95">
              {isProcessing ? <Loader2 className="animate-spin" size={20} /> : <Zap size={20} className="text-amber-400" />} 
              {isProcessing ? 'Processando...' : 'Extrair Contatos com IA'}
           </button>
         </div>

         <div className="space-y-4">
           <div className="flex justify-between items-center">
             <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><MessageCircle size={18} className="text-emerald-500" /> Mensagem Principal</h3>
             <button onClick={() => insertVariable('{nome}')} className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg text-[10px] font-black uppercase border border-indigo-100 transition-all hover:bg-indigo-100"><User size={12} /> {`{nome}`}</button>
           </div>
           <textarea ref={textareaRef} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Olá {nome}..." className="w-full h-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-[2rem] p-6 text-sm outline-none resize-none shadow-sm focus:ring-2 focus:ring-indigo-500/20 transition-all" />
           <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
             <div className="flex items-center gap-3">
               <div className={`p-2 rounded-lg ${useAI ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}><Sparkles size={18} /></div>
               <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Variação com IA</p>
             </div>
             <button onClick={() => setUseAI(!useAI)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${useAI ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${useAI ? 'translate-x-6' : 'translate-x-1'}`} />
             </button>
           </div>
         </div>
      </div>

      {/* FOOTER FIXADO E SEPARADO PARA PC */}
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 p-8 shadow-2xl relative overflow-visible z-30 grid grid-cols-1 md:grid-cols-4 gap-8 items-center mt-12 mb-8">
         <div className="flex flex-col gap-4 md:col-span-2">
            <div className="flex gap-4">
              <div className="flex-1 space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Delay Mín (s)</label>
                <input type="number" value={minDelay} onChange={(e) => setMinDelay(Number(e.target.value))} className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-center font-black text-indigo-600 outline-none focus:ring-2 focus:ring-indigo-500/20" />
              </div>
              <div className="flex-1 space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Delay Máx (s)</label>
                <input type="number" value={maxDelay} onChange={(e) => setMaxDelay(Number(e.target.value))} className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-center font-black text-indigo-600 outline-none focus:ring-2 focus:ring-indigo-500/20" />
              </div>
            </div>
            <p className="text-[9px] font-bold text-slate-400 flex items-center gap-1.5"><Info size={12} className="text-indigo-500" /> Quanto maior o tempo do delay, menor a chance de banimento do número pelo WhatsApp.</p>
         </div>

         <div className="flex-1 md:col-span-2 flex flex-col items-center md:items-end w-full">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Confirmação de Envio em Lote</p>
            <button 
              onClick={handleDisparar} 
              disabled={leadList.length === 0 || isSending || !message.trim()} 
              className="w-full px-12 py-6 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-xl shadow-2xl shadow-indigo-600/30 flex items-center justify-center gap-4 transition-all active:scale-95 disabled:opacity-50"
            >
              {isSending ? <Loader2 className="animate-spin" size={28} /> : <Send size={28} />} 
              {isSending ? 'Processando Envios...' : 'INICIAR DISPARO EM MASSA'}
            </button>
         </div>
      </div>

      {showUpgradeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
           <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden text-center scale-100 animate-in zoom-in-95 relative">
              <button onClick={() => setShowUpgradeModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-red-500 transition-colors"><X size={24} /></button>
              <div className="bg-amber-500 p-10 flex flex-col items-center">
                 <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4"><Crown size={32} className="text-white" /></div>
                 <h3 className="text-xl font-black text-white">Plano Pro</h3>
              </div>
              <div className="p-8">
                 <p className="text-sm text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">O Disparador Pro requer uma instância ativa. Fale com nosso suporte para liberar agora.</p>
                 <button onClick={() => openSupport()} className="w-full py-4 bg-emerald-500 text-white font-bold rounded-2xl flex items-center justify-center gap-2 mb-2 shadow-xl hover:bg-emerald-600 transition-all"><MessageCircle size={20} /> Liberar Acesso Pro</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
