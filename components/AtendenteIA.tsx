
import React, { useState, useRef, useEffect } from 'react';
import { 
  Bot, 
  Sparkles, 
  Send, 
  Settings2, 
  MessageCircle, 
  Save, 
  Loader2, 
  FileSpreadsheet, 
  UserX, 
  Plus, 
  Trash2, 
  AlertCircle,
  ArrowLeft,
  AlertTriangle,
  BrainCircuit,
  ShieldAlert,
  ExternalLink,
  Lock,
  Crown,
  X,
  Wand2,
  ListOrdered,
  Mic,
  Square,
  RotateCcw
} from 'lucide-react';
import { aiSettingsService } from '../services/supabaseClient';
import { fetchRawSheetText } from '../services/sheetService';
import { AISettings } from '../types';

interface ChatMessage {
  id: string;
  role: 'user' | 'model' | 'system';
  text: string;
  isAudio?: boolean;
}

// Removemos 'estoque' e 'faq' pois agora são ações externas/modais
type ConfigSection = 'menu' | 'comportamento' | 'blacklist';

const N8N_WEBHOOK_URL = 'https://n8n.bryanvitorin77.shop/webhook/49a18176-d770-46ae-b80c-9dbdfda6ac3c';

// TEMPLATES DE PROMPT ATUALIZADOS PARA A NOVA ESTRUTURA
const PROMPT_TEMPLATES = {
  // 1. IDENTIDADE (Mapeado para 'personality')
  personality: [
    { 
      label: "👔 Corretor Elite", 
      text: "Você é um consultor imobiliário de alto padrão. Seu tom é sofisticado, culto e transmite exclusividade. Use termos técnicos adequados e trate o cliente com extrema cortesia (Sr./Sra.)." 
    },
    { 
      label: "🤝 Amigo do Bairro", 
      text: "Você é o 'amigo corretor'. Seu tom é jovem, acessível e empático. Use emojis pontuais (🏠, 🚀). Faça o cliente se sentir em casa desde a primeira mensagem." 
    },
    { 
      label: "⚡ Vendedor Agressivo", 
      text: "Você é focado em resultados rápidos. Seu tom é direto, energico e persuasivo. Use gatilhos de urgência ('últimas unidades', 'oportunidade única')." 
    }
  ],
  // 2. OBJETIVO PRINCIPAL (Mapeado para 'instruction')
  instruction: [
    { 
      label: "📅 Agendar Visita", 
      text: "Seu objetivo único é levar o cliente para uma visita presencial. Não resolva tudo pelo chat. Crie curiosidade sobre o imóvel e ofereça sempre dois horários para visita." 
    },
    { 
      label: "💰 Qualificar Lead", 
      text: "Seu objetivo é filtrar curiosos. Antes de passar detalhes, descubra: Renda familiar, Valor de entrada disponível e Urgência de mudança." 
    },
    { 
      label: "📞 Pegar WhatsApp", 
      text: "Seu objetivo é conseguir o número de WhatsApp do cliente para que um humano continue o atendimento. Tire dúvidas básicas e direcione para o telefone." 
    }
  ],
  // 3. FUNIL DA CONVERSA (Mapeado para 'examples')
  examples: [
    {
      label: "🔄 Fluxo Padrão",
      text: "1. Saudação e perguntar o nome.\n2. Perguntar o que procura (Bairro/Tipologia).\n3. Consultar a planilha e oferecer 1 opção.\n4. Tentar agendar a visita."
    },
    {
      label: "🏠 Fluxo Imóvel Específico",
      text: "1. Confirmar se o imóvel do anúncio ainda interessa.\n2. Perguntar se o pagamento é à vista ou financiamento.\n3. Se financiamento: perguntar renda bruta.\n4. Agendar visita se a renda for compatível."
    }
  ],
  // 4. O QUE FAZER (Mapeado para 'rules')
  rules: [
    { 
      label: "✅ Boas Práticas", 
      text: "- Sempre termine sua resposta com uma pergunta para manter o diálogo.\n- Consulte a planilha de estoque antes de afirmar disponibilidade.\n- Seja breve nas respostas (máximo 3 frases)." 
    },
    { 
      label: "📊 Dados Técnicos", 
      text: "- Use a metragem e valor do condomínio como argumentos de venda.\n- Se o cliente perguntar preço, fale o valor e pergunte a forma de pagamento." 
    }
  ],
  // 5. O QUE NÃO FAZER (Mapeado para 'limitations')
  limitations: [
    { 
      label: "🚫 Segurança", 
      text: "- NUNCA invente características que não estão na planilha.\n- NUNCA passe o endereço exato (número da rua) sem autorização.\n- NUNCA prometa aprovação de crédito garantida." 
    },
    { 
      label: "🙊 Comportamento", 
      text: "- Não seja rude, mesmo se o cliente for grosso.\n- Não fale sobre política ou religião.\n- Não mande textos muito longos ou 'textões'." 
    }
  ]
};

// Funções Auxiliares para Áudio
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

interface ConfigTextAreaProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  suggestions: { label: string; text: string }[];
}

const ConfigTextArea: React.FC<ConfigTextAreaProps> = ({ label, value, onChange, suggestions }) => {
  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm relative group/area">
      <div className="flex justify-between items-center mb-4">
        <label className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">{label}</label>
        <div className="relative group/tooltip">
           <button className="p-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl text-indigo-500 transition-colors">
              <Wand2 size={16} />
           </button>
           <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 p-2 z-20 opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all scale-95 group-hover/tooltip:scale-100 origin-top-right">
              <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700 mb-1">
                 <span className="text-[10px] font-black uppercase text-indigo-500">Sugestões de IA</span>
              </div>
              <div className="max-h-[200px] overflow-y-auto custom-scrollbar">
                {suggestions.map((suggestion, idx) => (
                  <button 
                    key={idx}
                    onClick={() => onChange(suggestion.text)}
                    className="w-full text-left p-3 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl transition-colors group/item"
                  >
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">{suggestion.label}</p>
                    <p className="text-[10px] text-slate-400 line-clamp-2">{suggestion.text}</p>
                  </button>
                ))}
              </div>
           </div>
        </div>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-32 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl p-4 text-sm outline-none resize-none focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder:text-slate-400 font-medium"
        placeholder="Digite aqui as instruções..."
      />
    </div>
  );
};

export const AtendenteIA = () => {
  const [activeTab, setActiveTab] = useState<'config' | 'chat'>('config');
  const [settings, setSettings] = useState<AISettings | null>(null);
  
  const [configSection, setConfigSection] = useState<ConfigSection>('menu');

  const [excludedNumbers, setExcludedNumbers] = useState<string[]>([]);
  const [newNumber, setNewNumber] = useState('');
  
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [inventoryContent, setInventoryContent] = useState<string | null>(null);

  // Estados de Gravação de Áudio
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Modals
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showSupportEditModal, setShowSupportEditModal] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const PHONE_NUMBER = '5521969332661'; 

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeTab]);

  const loadSettings = async () => {
    setIsLoadingSettings(true);
    try {
      const data = await aiSettingsService.getSettings();
      if (data) {
        setSettings(data);
        if (data.excluded_numbers) {
          const list = data.excluded_numbers.split(',')
            .map(n => n.trim())
            .filter(n => n.length > 0);
          setExcludedNumbers(list);
        }
        if (data.imoveis_sheet_link) {
          fetchRawSheetText(data.imoveis_sheet_link)
            .then(setInventoryContent)
            .catch(console.error);
        }
      }
    } catch (error) {
      console.error("Erro ao carregar configurações:", error);
    } finally {
      setIsLoadingSettings(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!settings) return;
    setIsSaving(true);
    try {
      const cleanList = excludedNumbers.map(n => n.trim()).filter(n => n.length >= 8);
      const csvString = cleanList.join(',');
      
      const payload: Omit<AISettings, 'user_id'> = { 
        ...settings, 
        excluded_numbers: csvString 
      };
      
      await aiSettingsService.saveSettings(payload);
      
      setExcludedNumbers(cleanList);
      setSettings(prev => prev ? ({ ...prev, excluded_numbers: csvString }) : null);
      
      alert("Configurações salvas com sucesso!");
      setConfigSection('menu'); 
    } catch (error: any) {
      console.error("Erro detalhado no salvamento:", error);
      let errorMessage = "Erro desconhecido";
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (typeof error === 'object') {
        errorMessage = error.message || error.error_description || JSON.stringify(error);
      }
      alert(`Erro ao salvar: ${errorMessage}`);
    } finally {
      setIsSaving(false);
    }
  };

  const addNumber = () => {
    const clean = newNumber.replace(/\D/g, '');
    if (!clean || clean.length < 8) {
      alert("Por favor, insira um número válido com DDD.");
      return;
    }
    if (excludedNumbers.includes(clean)) {
      setNewNumber('');
      return;
    }
    setExcludedNumbers(prev => [clean, ...prev]);
    setNewNumber('');
  };

  const removeNumber = (num: string) => {
    setExcludedNumbers(prev => prev.filter(n => n !== num));
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await handleSendMessage(undefined, audioBlob);
        
        // Parar todas as tracks para liberar o microfone
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Erro ao acessar microfone:", error);
      alert("Não foi possível acessar o microfone. Verifique as permissões.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleResetChat = async () => {
    if (isChatLoading) return;
    
    const confirmReset = window.confirm("Isso apagará o histórico da conversa atual e resetará a memória da IA. Continuar?");
    if (!confirmReset) return;

    setMessages([]);
    setIsChatLoading(true);

    try {
      // Usamos o ID do usuário como SessionID para o N8N saber qual memória limpar
      const sessionId = settings?.user_id || 'anonymous_session';

      // Envia sinal de reset para o N8N
      const response = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reset',
          sessionId: sessionId,
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
         // Tenta ler o erro do N8N
         let errorText = await response.text().catch(() => response.statusText);
         if (errorText.includes('<!DOCTYPE html>')) errorText = `Erro ${response.status} (Servidor N8N)`;
         throw new Error(errorText);
      }
      
      const data = await response.json();
      const msg = data.text || "Memória reiniciada.";

      // Mensagem do sistema local
      setMessages([{ 
        id: Date.now().toString(), 
        role: 'system', 
        text: msg
      }]);
    } catch (error: any) {
      console.error("Erro ao resetar:", error);
      const msg = error.message.includes('Failed to fetch') 
        ? 'Erro de conexão. Verifique se o workflow N8N está ativo.'
        : `Erro no N8N: ${error.message}`;
        
      setMessages([{ 
        id: Date.now().toString(), 
        role: 'system', 
        text: `Memória local limpa. ${msg}` 
      }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent, audioBlob?: Blob) => {
    e?.preventDefault();
    if ((!chatInput.trim() && !audioBlob) || !settings || isChatLoading) return;

    // Se for áudio, define um texto placeholder para o N8N não receber campo vazio
    const userText = chatInput.trim() || (audioBlob ? "[Áudio enviado pelo usuário]" : "");
    setChatInput('');
    
    // Adicionar mensagem do usuário à UI
    setMessages(prev => [
      ...prev, 
      { 
        id: Date.now().toString(), 
        role: 'user', 
        text: audioBlob ? "🎤 [Áudio Enviado]" : userText,
        isAudio: !!audioBlob
      }
    ]);
    
    setIsChatLoading(true);

    try {
      let audioBase64 = null;
      if (audioBlob) {
        audioBase64 = await blobToBase64(audioBlob);
      }
      
      // Usamos o ID do usuário como SessionID
      const sessionId = settings?.user_id || 'anonymous_session';

      // NOTE: Ajuste de payload para garantir que o N8N receba tudo corretamente
      const payload = {
        action: 'message',
        sessionId: sessionId,
        message: userText,
        audio: audioBase64,
        type: audioBlob ? 'audio' : 'text',
        
        // Configurações dinâmicas enviadas diretamente
        config: {
          personality: settings.personality,
          instruction: settings.instruction,
          rules: settings.rules,
          limitations: settings.limitations,
          context: settings.context,
          examples: settings.examples,
          inventory: inventoryContent || "Sem dados de imóveis."
        },
        timestamp: new Date().toISOString()
      };

      console.log('Enviando para N8N:', payload); // Debug Log

      const response = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
         let errorText = await response.text().catch(() => response.statusText);
         // Se for erro HTML (ex: 502 Bad Gateway), simplifica
         if (errorText.includes('<!DOCTYPE html>')) errorText = `Erro ${response.status} (Servidor N8N)`;
         throw new Error(errorText);
      }

      const data = await response.json();
      
      // Tenta extrair a resposta de vários campos possíveis que o N8N pode retornar
      const responseText = data.text || data.output || data.response || data.message || (typeof data === 'string' ? data : JSON.stringify(data));

      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: responseText }]);
    } catch (error: any) {
      console.error(error);
      const msg = error.message.includes('Failed to fetch')
        ? 'Erro de conexão com o N8N. Verifique se o workflow está ativo.'
        : `Erro: ${error.message}`;

      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'system', text: msg }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const openSupport = (msg: string) => {
    const link = `https://wa.me/${PHONE_NUMBER}?text=${encodeURIComponent(msg)}`;
    window.open(link, '_blank');
  };

  const isPro = !!settings?.imoveis_sheet_link && settings.imoveis_sheet_link.length > 5;
  const hasFAQ = !!settings?.context && settings.context.length > 10;

  const handleStockClick = () => {
    if (isPro && settings?.imoveis_sheet_link) {
      window.open(settings.imoveis_sheet_link, '_blank');
    } else {
      setShowUpgradeModal(true);
    }
  };

  const handleFAQClick = () => {
    if (isPro) {
      setShowSupportEditModal(true);
    } else {
      setShowUpgradeModal(true);
    }
  };

  if (isLoadingSettings || !settings) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400">
        <Loader2 className="animate-spin mb-2" size={32} />
        <p className="text-sm font-bold uppercase tracking-widest">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 font-sans relative">
      <div className="shrink-0 p-6 pb-0 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <Bot className="text-indigo-600" size={32} />
            Atendente IA
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Controle as automações e filtros de exclusão.</p>
        </div>

        {configSection !== 'menu' && activeTab === 'config' && (
          <button 
            onClick={handleSaveSettings}
            disabled={isSaving}
            className="flex items-center gap-2 px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-sm shadow-xl shadow-indigo-600/20 transition-all active:scale-95 disabled:opacity-50"
          >
            {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            SALVAR ALTERAÇÕES
          </button>
        )}
      </div>

      <div className="px-6 mt-6 shrink-0">
        <div className="flex gap-2 p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-fit shadow-sm">
          <button 
            onClick={() => { setActiveTab('config'); setConfigSection('menu'); }}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'config' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
          >
            <Settings2 size={18} /> Configurar
          </button>
          <button 
            onClick={() => setActiveTab('chat')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'chat' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
          >
            <MessageCircle size={18} /> Testar IA
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 p-6 pt-4">
        {activeTab === 'chat' ? (
          /* --- ABA DE CHAT --- */
          <div className="h-full flex flex-col bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300">
             
             {/* Header do Chat com Botão de Reset */}
             <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                <div className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                   <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Online via N8N</span>
                </div>
                <button 
                  onClick={handleResetChat}
                  disabled={isChatLoading}
                  className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                >
                  <RotateCcw size={12} /> Limpar Memória
                </button>
             </div>

             <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-slate-100/30 dark:bg-black/10">
                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 opacity-50">
                    <Bot size={48} className="mb-2" />
                    <p className="text-sm text-center px-4">Inicie um teste para validar as configurações.<br/>Você pode enviar texto ou áudio.</p>
                  </div>
                )}
                {messages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] px-5 py-3 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-br-none' : msg.role === 'system' ? 'bg-amber-100 text-amber-800 text-xs font-mono border border-amber-200' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-bl-none border border-slate-200 dark:border-slate-700 shadow-sm'}`}>
                      {msg.isAudio && <span className="mr-2">🎤</span>}
                      {msg.text}
                    </div>
                  </div>
                ))}
                {isChatLoading && <Loader2 className="animate-spin text-indigo-500" size={20} />}
                <div ref={messagesEndRef} />
             </div>
             
             {/* ÁREA DE INPUT DO CHAT */}
             <div className="p-4 pb-24 md:pb-4 bg-white dark:bg-slate-900 border-t flex gap-3 items-center">
                <form onSubmit={(e) => handleSendMessage(e)} className="flex-1 flex gap-3">
                  <input 
                    type="text" 
                    value={chatInput} 
                    onChange={e => setChatInput(e.target.value)} 
                    placeholder="Simule uma conversa..." 
                    disabled={isRecording || isChatLoading}
                    className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-6 py-4 text-sm outline-none disabled:opacity-50" 
                  />
                  
                  {isRecording ? (
                     <button 
                       type="button" 
                       onClick={stopRecording} 
                       className="p-4 bg-red-500 hover:bg-red-600 text-white rounded-2xl animate-pulse shadow-lg shadow-red-500/30 transition-all"
                       title="Parar e Enviar"
                     >
                       <Square size={24} fill="currentColor" />
                     </button>
                  ) : (
                    <>
                       {/* Se tiver texto, mostra botão de enviar. Se não, mostra microfone */}
                       {chatInput.trim() ? (
                         <button type="submit" disabled={isChatLoading} className="p-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50">
                           <Send size={24} />
                         </button>
                       ) : (
                         <button 
                           type="button" 
                           onClick={startRecording}
                           disabled={isChatLoading}
                           className="p-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-indigo-100 hover:text-indigo-600 dark:hover:bg-slate-700 rounded-2xl transition-all disabled:opacity-50"
                           title="Gravar Áudio"
                         >
                           <Mic size={24} />
                         </button>
                       )}
                    </>
                  )}
                </form>
             </div>
          </div>
        ) : (
          /* --- ABA DE CONFIGURAÇÃO --- */
          <div className="h-full overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-left-4 duration-300">
            
            {configSection === 'menu' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
                {/* Card Estoque */}
                <div 
                  onClick={handleStockClick}
                  className={`relative p-6 rounded-[2rem] border-2 cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99] group
                    ${isPro 
                      ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-500/50' 
                      : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 grayscale opacity-80'}`}
                >
                   <div className="flex justify-between items-start mb-4">
                      <div className={`p-3 rounded-2xl ${isPro ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-500'}`}>
                        <FileSpreadsheet size={24} />
                      </div>
                      <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${isPro ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {isPro ? 'Sincronizado' : 'Requer Pro'}
                      </div>
                   </div>
                   <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-1 flex items-center gap-2">
                     Estoque de Imóveis
                     {isPro && <ExternalLink size={14} className="text-slate-400" />}
                   </h3>
                   <p className="text-sm text-slate-500 dark:text-slate-400">
                     {isPro 
                       ? 'Clique para abrir e editar a planilha de imóveis no Google Sheets.' 
                       : 'Integre sua planilha de imóveis para que a IA possa vendê-los.'}
                   </p>
                   {!isPro && (
                     <div className="mt-4 flex items-center gap-2 text-amber-600 text-xs font-bold animate-pulse">
                       <Lock size={14} /> Atualize para Pro
                     </div>
                   )}
                </div>

                {/* Card FAQ/Contexto */}
                <div 
                  onClick={handleFAQClick}
                  className={`relative p-6 rounded-[2rem] border-2 cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99] group
                    ${isPro 
                      ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-500/50' 
                      : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 grayscale opacity-80'}`}
                >
                   <div className="flex justify-between items-start mb-4">
                      <div className={`p-3 rounded-2xl ${hasFAQ ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-200 text-slate-500'}`}>
                        <MessageCircle size={24} />
                      </div>
                      <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${isPro ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'}`}>
                        {isPro ? 'Gerenciado' : 'Requer Pro'}
                      </div>
                   </div>
                   <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-1 flex items-center gap-2">
                     Perguntas Frequentes
                     {isPro && <ShieldAlert size={14} className="text-slate-400" />}
                   </h3>
                   <p className="text-sm text-slate-500 dark:text-slate-400">
                     {hasFAQ 
                       ? 'Base de conhecimento ativa. Clique para solicitar alterações.' 
                       : 'Defina as regras e informações da sua imobiliária.'}
                   </p>
                   {!isPro && (
                     <div className="mt-4 flex items-center gap-2 text-amber-600 text-xs font-bold animate-pulse">
                       <Lock size={14} /> Atualize para Pro
                     </div>
                   )}
                </div>

                {/* Card Comportamento */}
                <div 
                  onClick={() => setConfigSection('comportamento')}
                  className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 hover:border-indigo-500/50 cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99]"
                >
                   <div className="flex justify-between items-start mb-4">
                      <div className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl">
                        <BrainCircuit size={24} />
                      </div>
                   </div>
                   <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-1">Comportamento da IA</h3>
                   <p className="text-sm text-slate-500 dark:text-slate-400">
                     Defina Identidade, Objetivos e Regras de interação (Funil).
                   </p>
                </div>

                {/* Card Lista Negra */}
                <div 
                  onClick={() => setConfigSection('blacklist')}
                  className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 hover:border-red-500/50 cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99]"
                >
                   <div className="flex justify-between items-start mb-4">
                      <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-2xl">
                        <ShieldAlert size={24} />
                      </div>
                      <div className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-500">
                        {excludedNumbers.length} Bloqueados
                      </div>
                   </div>
                   <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-1">Lista Negra</h3>
                   <p className="text-sm text-slate-500 dark:text-slate-400">
                     Números de telefone que a IA deve ignorar completamente.
                   </p>
                </div>
              </div>
            )}

            {/* SEÇÕES DE EDIÇÃO LOCAL - REORGANIZADO */}

            {configSection === 'comportamento' && (
              <div className="space-y-6 animate-in slide-in-from-right-8 pb-20">
                <button onClick={() => setConfigSection('menu')} className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-indigo-600 mb-4 transition-colors"><ArrowLeft size={16} /> Voltar ao Menu</button>

                <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-wider text-xs flex items-center gap-2 mb-6">
                  <ListOrdered className="text-amber-500" size={18} /> Etapas de Configuração
                </h3>
                
                <div className="grid grid-cols-1 gap-8">
                  {/* 1. IDENTIDADE -> personality */}
                  <ConfigTextArea 
                    label="1. Identidade (Quem é a IA?)" 
                    value={settings.personality} 
                    onChange={v => setSettings({...settings, personality: v})}
                    suggestions={PROMPT_TEMPLATES.personality}
                  />

                  {/* 2. OBJETIVO -> instruction */}
                  <ConfigTextArea 
                    label="2. Objetivo Principal" 
                    value={settings.instruction} 
                    onChange={v => setSettings({...settings, instruction: v})}
                    suggestions={PROMPT_TEMPLATES.instruction}
                  />

                  {/* 3. FUNIL -> examples (Novo uso para este campo) */}
                  <ConfigTextArea 
                    label="3. Funil da Conversa (Roteiro)" 
                    value={settings.examples} 
                    onChange={v => setSettings({...settings, examples: v})}
                    suggestions={PROMPT_TEMPLATES.examples}
                  />

                  {/* 4. O QUE FAZER -> rules */}
                  <ConfigTextArea 
                    label="4. O que Fazer (Regras Positivas)" 
                    value={settings.rules} 
                    onChange={v => setSettings({...settings, rules: v})}
                    suggestions={PROMPT_TEMPLATES.rules}
                  />

                  {/* 5. O QUE NÃO FAZER -> limitations */}
                  <ConfigTextArea 
                    label="5. O que NÃO Fazer (Restrições)" 
                    value={settings.limitations} 
                    onChange={v => setSettings({...settings, limitations: v})}
                    suggestions={PROMPT_TEMPLATES.limitations}
                  />
                </div>
              </div>
            )}

            {configSection === 'blacklist' && (
              <div className="space-y-6 animate-in slide-in-from-right-8">
                <button onClick={() => setConfigSection('menu')} className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-indigo-600 mb-4 transition-colors"><ArrowLeft size={16} /> Voltar ao Menu</button>

                <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-wider text-xs flex items-center gap-2">
                  <UserX className="text-red-500" size={16} /> Lista Negra (Ignorar Números)
                </h3>
                <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={newNumber} 
                      onChange={e => setNewNumber(e.target.value)} 
                      onKeyDown={e => e.key === 'Enter' && addNumber()}
                      placeholder="DDD + Número"
                      className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm outline-none"
                    />
                    <button onClick={addNumber} className="px-5 bg-slate-900 dark:bg-slate-700 text-white rounded-xl"><Plus size={18} /></button>
                  </div>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                    {excludedNumbers.map(num => (
                      <div key={num} className="flex justify-between items-center px-4 py-2 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800">
                        <span className="text-xs font-bold font-mono text-slate-700 dark:text-slate-300">{num}</span>
                        <button onClick={() => removeNumber(num)} className="text-red-500 p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"><Trash2 size={14} /></button>
                      </div>
                    ))}
                    {excludedNumbers.length === 0 && (
                      <p className="text-[10px] text-slate-400 italic text-center py-2">Nenhum número na lista negra.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

          </div>
        )}
      </div>

      {/* MODAL UPGRADE TO PRO (STOCK & FAQ CHECK) */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
           <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden text-center scale-100 animate-in zoom-in-95 relative">
              <button onClick={() => setShowUpgradeModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-red-500 transition-colors"><X size={24} /></button>
              <div className="bg-amber-500 p-10 flex flex-col items-center">
                 <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4"><Crown size={32} className="text-white" /></div>
                 <h3 className="text-xl font-black text-white">Recurso Pro</h3>
              </div>
              <div className="p-8">
                 <p className="text-sm text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
                   A integração de Estoque (Planilha) e a Personalização Avançada (FAQ) são exclusivas para usuários Pro.
                 </p>
                 <button onClick={() => openSupport("Olá, gostaria de ativar os recursos Pro (Estoque e FAQ) no meu CRM.")} className="w-full py-4 bg-emerald-500 text-white font-bold rounded-2xl flex items-center justify-center gap-2 mb-2 shadow-xl hover:bg-emerald-600 transition-all">
                    <MessageCircle size={20} /> Ativar Plano Pro
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* MODAL SUPPORT EDIT REQUEST (FAQ) */}
      {showSupportEditModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
           <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden text-center scale-100 animate-in zoom-in-95 relative">
              <button onClick={() => setShowSupportEditModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-red-500 transition-colors"><X size={24} /></button>
              <div className="bg-indigo-600 p-10 flex flex-col items-center">
                 <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4"><ShieldAlert size={32} className="text-white" /></div>
                 <h3 className="text-xl font-black text-white">Edição Protegida</h3>
              </div>
              <div className="p-8">
                 <p className="text-sm text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
                   Para garantir a consistência da IA, a Base de Conhecimento (FAQ) é gerenciada exclusivamente pela nossa equipe técnica.
                 </p>
                 <button onClick={() => openSupport("Olá, sou usuário Pro e gostaria de solicitar uma alteração nas Perguntas Frequentes (FAQ) da minha IA.")} className="w-full py-4 bg-indigo-600 text-white font-bold rounded-2xl flex items-center justify-center gap-2 mb-2 shadow-xl hover:bg-indigo-500 transition-all">
                    <MessageCircle size={20} /> Solicitar Alteração
                 </button>
              </div>
           </div>
        </div>
      )}

    </div>
  );
};
