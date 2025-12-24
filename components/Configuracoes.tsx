
import React, { useState, useEffect } from 'react';
import { 
  User, 
  Mail, 
  Phone, 
  Settings as SettingsIcon,
  Loader2,
  Smartphone,
  Crown,
  MessageCircle,
  Lock,
  ShieldCheck
} from 'lucide-react';
import { profileService } from '../services/supabaseClient';
import { ConexaoWhatsapp } from './ConexaoWhatsapp';

interface ConfiguracoesProps {
  session: any;
  whatsappStatus: 'connected' | 'disconnected' | 'checking';
  onRefreshStatus: () => void;
}

export const Configuracoes: React.FC<ConfiguracoesProps> = ({ session, whatsappStatus, onRefreshStatus }) => {
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const PHONE_NUMBER = '5521969332661'; 

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setIsLoading(true);
    try {
      const data = await profileService.getProfile();
      setProfile(data);
    } catch (err) {
      console.error("Erro ao carregar perfil:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const openSupport = (msg: string) => {
    const link = `https://wa.me/${PHONE_NUMBER}?text=${encodeURIComponent(msg)}`;
    window.open(link, '_blank');
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-[70vh] text-slate-400">
        <Loader2 size={32} className="animate-spin mb-4 text-indigo-500" />
        <p className="font-bold">Carregando perfil...</p>
      </div>
    );
  }

  const isPro = !!profile?.whatsapp_webhook_url && profile.whatsapp_webhook_url.startsWith('http');

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl text-indigo-600 dark:text-indigo-400">
            <SettingsIcon size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Configurações
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
              Visualize seus dados de conta e status de conexão.
            </p>
          </div>
        </div>

        {isPro && (
          <div className="bg-amber-100 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 px-4 py-2 rounded-xl flex items-center gap-2 border border-amber-200 dark:border-amber-800 shadow-sm">
             <Crown size={18} className="fill-amber-500" />
             <span className="text-xs font-black uppercase tracking-widest">Acesso Premium Ativo</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* LADO ESQUERDO: INFORMAÇÕES DO PERFIL (SOMENTE LEITURA) */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
              <User size={20} className="text-indigo-500" />
              <h2 className="font-bold text-slate-800 dark:text-white">Meus Dados</h2>
            </div>
            
            <div className="p-6 space-y-5">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Nome</label>
                  <div className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
                    {profile?.name || 'Não informado'}
                  </div>
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">E-mail de Login</label>
                  <div className="flex items-center gap-2 p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-500">
                    <Mail size={16} />
                    <span className="text-xs font-medium truncate">{session?.user?.email}</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">WhatsApp Vinculado</label>
                  <div className="flex items-center gap-2 p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-500">
                    <Phone size={16} />
                    <span className="text-xs font-medium">{profile?.phone || 'Não informado'}</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="bg-indigo-50 dark:bg-indigo-900/10 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-900/20">
                  <div className="flex items-start gap-3">
                    <Lock size={16} className="text-indigo-600 mt-1 shrink-0" />
                    <p className="text-[11px] text-indigo-700 dark:text-indigo-300 leading-relaxed font-medium">
                      Por segurança, a alteração de dados cadastrais e webhooks de integração é feita exclusivamente através do nosso suporte.
                    </p>
                  </div>
                  <button 
                    onClick={() => openSupport('Olá, gostaria de solicitar uma alteração nos meus dados de cadastro ou integração.')}
                    className="w-full mt-4 py-2.5 bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 rounded-xl text-xs font-bold border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center gap-2"
                  >
                    <MessageCircle size={14} /> Falar com Suporte
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
             <div className="flex items-center gap-3 mb-4">
                <ShieldCheck size={20} className="text-emerald-500" />
                <h3 className="font-bold text-sm">Segurança</h3>
             </div>
             <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
               Sua conta é protegida por criptografia de ponta a ponta e o acesso ao banco de dados segue os mais rígidos protocolos de privacidade.
             </p>
          </div>
        </div>

        {/* LADO DIREITO: CENTRAL DE SINCRONIZAÇÃO */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden min-h-[500px]">
            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Smartphone size={20} className="text-indigo-600" />
                <h2 className="font-bold text-slate-800 dark:text-white">Conexão WhatsApp</h2>
              </div>
              <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-2 shadow-sm
                ${whatsappStatus === 'connected' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
                <div className={`w-2 h-2 rounded-full ${whatsappStatus === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></div>
                {whatsappStatus === 'connected' ? 'Dispositivo Online' : 'Dispositivo Offline'}
              </div>
            </div>
            
            <div className="p-0">
               <ConexaoWhatsapp 
                  user={session?.user} 
                  globalStatus={whatsappStatus} 
                  onRefreshStatus={onRefreshStatus} 
               />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
