
import React, { useState, useEffect } from 'react';
import { 
  Smartphone, 
  QrCode as QrIcon, 
  RefreshCcw, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Copy,
  Check,
  Zap,
  Clock,
  Crown,
  ArrowRight,
  Wifi,
  WifiOff,
  Key,
  X,
  MessageCircle
} from 'lucide-react';
import { profileService } from '../services/supabaseClient';

interface ConexaoWhatsappProps {
  user: any;
  globalStatus?: 'connected' | 'disconnected' | 'checking';
  onRefreshStatus?: () => void;
}

export const ConexaoWhatsapp: React.FC<ConexaoWhatsappProps> = ({ user, globalStatus = 'disconnected', onRefreshStatus }) => {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingProfile, setIsCheckingProfile] = useState(true);
  const [instanceName, setInstanceName] = useState<string | null>(null);
  const [userWebhook, setUserWebhook] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showAlreadyConnectedModal, setShowAlreadyConnectedModal] = useState(false);

  const PHONE_NUMBER = '5521969332661'; 

  useEffect(() => {
    const checkInstance = async () => {
      setIsCheckingProfile(true);
      try {
        const profile = await profileService.getProfile();
        if (profile) {
          if (profile.whatsapp_instance) {
            setInstanceName(String(profile.whatsapp_instance).trim());
          }
          if (profile.whatsapp_webhook_url) {
            setUserWebhook(String(profile.whatsapp_webhook_url).trim());
          }
        }
      } catch (err) {
        console.error("Erro ao verificar perfil:", err);
      } finally {
        setIsCheckingProfile(false);
      }
    };
    checkInstance();
  }, []);

  const handleCopyCode = () => {
    if (pairingCode) {
      navigator.clipboard.writeText(pairingCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleGenerateQR = async () => {
    if (!userWebhook) {
      setErrorMsg("Erro: Configuração de webhook não encontrada.");
      return;
    }
    
    setIsLoading(true);
    setErrorMsg(null);
    setQrCode(null);
    setPairingCode(null);

    try {
      const payload = { 
        userId: String(user?.id || 'unknown'),
        instance: String(instanceName || 'Standard').trim(),
        email: String(user?.email || ''),
        timestamp: new Date().toISOString()
      };

      const response = await fetch(userWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error(`Servidor respondeu com erro ${response.status}`);

      const contentType = response.headers.get('content-type') || '';
      
      if (contentType.includes('image')) {
        const blob = await response.blob();
        setQrCode(URL.createObjectURL(blob));
        setIsLoading(false);
        return;
      }

      const textResponse = await response.text();
      
      try {
        const rawData = JSON.parse(textResponse);
        const data = Array.isArray(rawData) ? rawData[0] : rawData;
        
        // Logica para detectar se ja esta conectado baseado no seu print do n8n
        // Estrutura: data.instance.state ou data.data.instance.state
        const stateFromData = data.data?.instance?.state || data.instance?.state || data.state || "";
        const state = String(stateFromData).toLowerCase();
        const isSuccess = data.success === true;
        
        if (state === 'open' || state === 'connected' || data.connected === true || (isSuccess && state === 'open')) {
          setShowAlreadyConnectedModal(true);
          if (onRefreshStatus) onRefreshStatus();
          setIsLoading(false);
          return;
        }

        const code = data.base64 || data.qrcode || data.data?.base64 || data.data?.qrcode;
        const pCode = data.pairingCode || data.data?.pairingCode;

        if (code) {
          setQrCode(code.includes('base64') ? code : `data:image/png;base64,${code}`);
        }
        
        if (pCode) {
          setPairingCode(pCode);
        }

        if (!code && !pCode && onRefreshStatus) onRefreshStatus();

      } catch (e) {
        if (onRefreshStatus) onRefreshStatus();
      }
    } catch (err: any) {
      console.error("Erro ao gerar QR:", err);
      setErrorMsg(err.message || 'Erro ao conectar com o serviço de WhatsApp.');
    } finally {
      setIsLoading(false);
    }
  };

  const openSupport = (customMsg?: string) => {
    const msg = customMsg || 'Olá, gostaria de ativar meu WhatsApp no Plano Pro do CRM.';
    const link = `https://wa.me/${PHONE_NUMBER}?text=${encodeURIComponent(msg)}`;
    window.open(link, '_blank');
  };

  if (isCheckingProfile) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-[70vh] p-8 text-slate-400">
        <Loader2 size={40} className="animate-spin mb-4 text-indigo-500" />
        <p className="font-bold">Verificando credenciais...</p>
      </div>
    );
  }

  // TELA DE BLOQUEIO PARA USUÁRIO SEM WEBHOOK (FREE)
  if (!userWebhook) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 md:p-8 animate-in fade-in zoom-in-95 duration-500 min-h-[80vh]">
        <div className="max-w-2xl w-full bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden relative">
           <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full -mr-20 -mt-20 blur-3xl"></div>
           <div className="relative z-10 p-8 md:p-12 flex flex-col items-center text-center">
              <div className="w-24 h-24 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-indigo-500/40 mb-8 animate-bounce duration-[3000ms]">
                 <Crown size={48} className="text-white drop-shadow-md" />
              </div>
              <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white mb-4">Conexão WhatsApp <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-500">PRO</span></h2>
              <p className="text-slate-500 dark:text-slate-400 text-lg mb-8 max-w-md">A sincronização direta com o WhatsApp e o Disparador são exclusivos para assinantes. Ative seu plano agora.</p>
              <button onClick={() => openSupport()} className="group w-full py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-xl shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-3">
                Ativar Plano Pro agora <ArrowRight size={24} className="group-hover:translate-x-1 transition-transform" />
              </button>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto animate-in fade-in duration-500 font-sans pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl text-indigo-600">
               <Smartphone size={28} />
            </div>
            Sincronização WhatsApp
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Sua conta possui acesso <span className="text-indigo-600 font-bold uppercase tracking-widest text-xs">Premium</span></p>
        </div>

        <div className={`flex items-center gap-3 px-5 py-2.5 rounded-2xl border shadow-sm transition-colors ${globalStatus === 'connected' ? 'bg-emerald-50 border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-800' : 'bg-slate-50 border-slate-100 dark:bg-slate-800 dark:border-slate-700'}`}>
           {globalStatus === 'connected' ? <Wifi size={18} className="text-emerald-500 animate-pulse" /> : <WifiOff size={18} className="text-slate-400" />}
           <span className={`text-sm font-bold uppercase tracking-wider ${globalStatus === 'connected' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}`}>
              {globalStatus === 'connected' ? 'Online' : globalStatus === 'checking' ? 'Sincronizando...' : 'Off'}
           </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 border border-slate-200 dark:border-slate-700 shadow-xl flex flex-col items-center text-center relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
             
             <div className="mb-6">
                <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-3xl mb-4 inline-block">
                   <QrIcon size={48} className="text-indigo-600" />
                </div>
                <h2 className="text-xl font-black text-slate-800 dark:text-white">Opção 1: Escanear QR Code</h2>
             </div>

             <div className="relative w-64 h-64 bg-slate-50 dark:bg-slate-900 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center overflow-hidden mb-6">
                {isLoading ? (
                  <div className="flex flex-col items-center gap-3">
                     <Loader2 size={40} className="animate-spin text-indigo-500" />
                     <span className="text-xs font-bold text-slate-400">Solicitando códigos...</span>
                  </div>
                ) : qrCode ? (
                  <img src={qrCode} alt="WhatsApp QR Code" className="w-full h-full object-contain p-4" />
                ) : globalStatus === 'connected' ? (
                  <div className="flex flex-col items-center gap-2">
                     <CheckCircle2 size={48} className="text-emerald-500" />
                     <span className="font-bold text-emerald-600">Dispositivo Ativo!</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-slate-300">
                     <QrIcon size={64} className="opacity-10" />
                     <span className="text-xs font-medium">Clique em Gerar Códigos</span>
                  </div>
                )}
             </div>

             <button 
                onClick={handleGenerateQR}
                disabled={isLoading}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-lg shadow-xl shadow-indigo-600/30 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
              >
                {isLoading ? <Loader2 className="animate-spin" /> : <RefreshCcw size={20} />}
                {globalStatus === 'connected' ? 'Forçar Nova Conexão' : 'Gerar Códigos de Conexão'}
              </button>
             
             {errorMsg && (
               <div className="mt-4 flex items-center gap-2 text-red-500 text-[10px] font-bold bg-red-50 dark:bg-red-900/10 p-2 rounded-lg border border-red-100 dark:border-red-900/20 text-center w-full">
                  <AlertCircle size={14} className="shrink-0" /> {errorMsg}
               </div>
             )}
          </div>

          {pairingCode && (
            <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl p-6 text-white shadow-xl animate-in slide-in-from-bottom-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-white/20 rounded-xl">
                  <Key size={20} />
                </div>
                <h3 className="font-black text-lg">Opção 2: Código de Pareamento</h3>
              </div>
              
              <p className="text-xs text-indigo-100 mb-4">
                No WhatsApp, use a opção <b>Conectar com número de telefone</b> e digite:
              </p>

              <div className="flex items-center gap-2">
                <div className="flex-1 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 text-center">
                  <span className="text-3xl font-black tracking-[0.3em] font-mono">
                    {pairingCode}
                  </span>
                </div>
                <button 
                  onClick={handleCopyCode}
                  className="p-4 bg-white text-indigo-600 rounded-2xl hover:bg-indigo-50 transition-colors shadow-lg active:scale-95"
                >
                  {copied ? <Check size={24} /> : <Copy size={24} />}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
           <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 border border-slate-200 dark:border-slate-700 shadow-sm">
              <h3 className="text-lg font-black text-slate-800 dark:text-white mb-6">Instruções:</h3>
              <div className="space-y-6">
                 {[
                   { s: 1, t: "Abra o WhatsApp e vá em Aparelhos Conectados." },
                   { s: 2, t: "Clique em Conectar um Aparelho." },
                   { s: 3, t: "Escolha entre escanear o QR ou usar o código numérico." }
                 ].map((item) => (
                   <div key={item.s} className="flex gap-4">
                      <div className="shrink-0 w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-sm border border-indigo-100 dark:border-indigo-800">
                         {item.s}
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-300 font-medium pt-1">{item.t}</p>
                   </div>
                 ))}
              </div>
           </div>

           <button onClick={() => onRefreshStatus && onRefreshStatus()} className="w-full flex items-center justify-center gap-3 p-5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-slate-600 dark:text-slate-300 transition-all shadow-sm active:scale-[0.98]">
              <RefreshCcw size={20} className="text-indigo-500" />
              Sincronizar Status do Aparelho
           </button>
        </div>
      </div>

      {/* MODAL DE STATUS JÁ CONECTADO */}
      {showAlreadyConnectedModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
           <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-sm overflow-hidden scale-100 animate-in zoom-in-95 relative">
              <button onClick={() => setShowAlreadyConnectedModal(false)} className="absolute top-4 right-4 p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"><X size={20} /></button>
              <div className="bg-emerald-500 p-10 text-center text-white">
                 <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                    <CheckCircle2 size={48} />
                 </div>
                 <h3 className="text-2xl font-black">WhatsApp Online</h3>
              </div>
              <div className="p-8 text-center">
                 <p className="text-slate-600 dark:text-slate-300 mb-8 text-sm leading-relaxed">
                   Seu dispositivo já está devidamente <b>conectado e sincronizado</b> com o sistema. Você já pode realizar disparos e usar o atendente IA.
                 </p>
                 <button onClick={() => setShowAlreadyConnectedModal(false)} className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl shadow-xl flex items-center justify-center gap-2 transition-all active:scale-95">
                    Entendido, vamos lá!
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
