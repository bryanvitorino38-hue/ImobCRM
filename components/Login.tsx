
import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { TriggerLogo } from './TriggerLogo';
import { Mail, Lock, Loader2, AlertCircle, ArrowRight, ArrowLeft, Send, KeyRound, CheckCircle, Edit2, UserPlus, LogIn, Phone, Eye, EyeOff, User } from 'lucide-react';
import { SupportButton } from './SupportButton';

export const Login = () => {
  const [view, setView] = useState<'login' | 'signup' | 'forgot' | 'verify_signup'>('login');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userName, setUserName] = useState('');
  const [userPhone, setUserPhone] = useState(''); 
  const [rememberMe, setRememberMe] = useState(false);
  
  const [recoveryStep, setRecoveryStep] = useState<'email' | 'otp' | 'new_password'>('email');
  const [otp, setOtp] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    const savedEmail = localStorage.getItem('trigger_saved_email');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (rememberMe) {
      localStorage.setItem('trigger_saved_email', email);
    } else {
      localStorage.removeItem('trigger_saved_email');
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos.' : err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    if (!userName.trim()) {
      setError('Por favor, informe seu nome completo.');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('A senha precisa ter no mínimo 6 caracteres.');
      setLoading(false);
      return;
    }

    if (!userPhone || userPhone.length < 8) {
      setError('Por favor, insira um telefone válido para contato.');
      setLoading(false);
      return;
    }

    const cleanPhone = userPhone.replace(/\D/g, '');

    try {
      const { data, error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          data: {
            full_name: userName,
            phone: cleanPhone 
          }
        }
      });
      
      if (error) throw error;

      if (data.user && !data.session) {
        setSuccessMsg('Cadastro iniciado! Enviamos um código para seu e-mail.');
        setView('verify_signup'); 
      } else if (data.session) {
        setSuccessMsg('Conta criada com sucesso! Entrando...');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySignUpOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'signup'
      });

      if (error) throw error;
      setSuccessMsg('Conta verificada com sucesso! Entrando...');
    } catch (err: any) {
      setError('Código incorreto ou expirado.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendRecoveryCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      setSuccessMsg(`Código enviado para ${email}`);
      setRecoveryStep('otp');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'recovery',
      });
      if (error) throw error;
      setSuccessMsg('Código verificado! Defina sua nova senha.');
      setRecoveryStep('new_password');
    } catch (err: any) {
      setError('Código inválido ou expirado.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setSuccessMsg('Senha redefinida com sucesso!');
      window.location.reload(); 
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setError(null);
    setSuccessMsg(null);
    setPassword('');
    setOtp('');
    setConfirmPassword('');
    setUserPhone('');
    setUserName('');
    setRecoveryStep('email');
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-4 transition-colors duration-200">
      
      <div className="w-full max-md animate-in fade-in zoom-in-95 duration-500">
        
        <div className="flex justify-center mb-8">
           <TriggerLogo className="scale-125" />
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden relative">
          
          {(view === 'login' || view === 'signup') && (
            <div className="flex border-b border-slate-200 dark:border-slate-700">
              <button
                onClick={() => { setView('login'); resetForm(); }}
                className={`flex-1 py-4 text-sm font-bold text-center transition-colors ${
                  view === 'login' 
                    ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/10' 
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                Entrar
              </button>
              <button
                onClick={() => { setView('signup'); resetForm(); }}
                className={`flex-1 py-4 text-sm font-bold text-center transition-colors ${
                  view === 'signup' 
                    ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/10' 
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                Teste Gratuitamente
              </button>
            </div>
          )}

          <div className="p-8 pb-6">
            
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white text-center mb-2">
              {view === 'login' && 'Bem-vindo de volta'}
              {view === 'signup' && 'Teste Gratuitamente'}
              {view === 'verify_signup' && 'Confirme seu Cadastro'}
              {view === 'forgot' && 'Recuperar Acesso'}
            </h2>
            
            <p className="text-slate-500 dark:text-slate-400 text-center text-sm mb-8">
              {view === 'login' && 'Acesse sua conta para gerenciar leads'}
              {view === 'signup' && 'Crie sua conta e organize seus leads'}
            </p>

            {error && (
              <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3 text-sm text-red-600 dark:text-red-400 animate-in slide-in-from-top-2">
                <AlertCircle size={18} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}
            {successMsg && !error && (
              <div className="mb-6 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg flex items-start gap-3 text-sm text-emerald-600 dark:text-emerald-400 animate-in slide-in-from-top-2">
                <CheckCircle size={18} className="shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}

            {(view === 'login' || view === 'signup') && (
              <form onSubmit={view === 'login' ? handleLogin : handleSignUp} className="space-y-4">
                
                {view === 'signup' && (
                  <div className="space-y-1.5 animate-in slide-in-from-top-1">
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Nome Completo</label>
                    <div className="relative group">
                      <User className="absolute left-3 top-3 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                      <input
                        type="text"
                        value={userName}
                        onChange={(e) => setUserName(e.target.value)}
                        required
                        placeholder="Seu nome"
                        className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">E-mail</label>
                  <div className="relative group">
                    <Mail className="absolute left-3 top-3 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="seu@email.com"
                      className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                     <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Senha</label>
                     {view === 'login' && (
                       <button type="button" onClick={() => { setView('forgot'); resetForm(); }} className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">
                         Esqueceu a senha?
                       </button>
                     )}
                  </div>
                  <div className="relative group">
                    <Lock className="absolute left-3 top-3 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                      className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 pl-10 pr-10 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-slate-400"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {view === 'signup' && (
                  <div className="space-y-1.5 animate-in slide-in-from-top-1">
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Seu WhatsApp</label>
                    <div className="relative group">
                      <Phone className="absolute left-3 top-3 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                      <input
                        type="text"
                        value={userPhone}
                        onChange={(e) => setUserPhone(e.target.value)}
                        required
                        placeholder="(00) 00000-0000"
                        className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      />
                    </div>
                  </div>
                )}

                {view === 'login' && (
                  <div className="flex items-center ml-1">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-xs text-slate-600 dark:text-slate-400">Lembrar de mim</span>
                    </label>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70 mt-2"
                >
                  {loading ? <Loader2 className="animate-spin" size={20} /> : (
                    <>
                      {view === 'login' ? 'Entrar' : 'Criar Minha Conta'} 
                      {view === 'login' ? <LogIn size={18} /> : <UserPlus size={18} />}
                    </>
                  )}
                </button>
              </form>
            )}

            {view === 'verify_signup' && (
              <form onSubmit={handleVerifySignUpOtp} className="space-y-5 text-center">
                <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-900/30 text-sm">
                   <p className="text-indigo-600 dark:text-indigo-300">Código enviado para <b>{email}</b></p>
                </div>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                  placeholder="123456"
                  className="w-full text-center text-2xl font-black tracking-widest bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-3 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                <button type="submit" disabled={loading} className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl flex items-center justify-center gap-2">
                   {loading ? <Loader2 className="animate-spin" /> : <>Confirmar Cadastro <ArrowRight size={18} /></>}
                </button>
              </form>
            )}

            {view === 'forgot' && (
              <div className="space-y-5">
                {recoveryStep === 'email' && (
                   <form onSubmit={handleSendRecoveryCode} className="space-y-4">
                      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="Seu e-mail" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-4 outline-none" />
                      <button type="submit" disabled={loading} className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl">Enviar Código</button>
                   </form>
                )}
                <button onClick={() => setView('login')} className="text-sm text-slate-500 flex items-center gap-2 mx-auto"><ArrowLeft size={16}/> Voltar para Login</button>
              </div>
            )}
          </div>
        </div>
      </div>
      <SupportButton />
    </div>
  );
};
