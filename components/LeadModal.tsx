
import React, { useState } from 'react';
import { X, Save, DollarSign, MapPin, Phone, User, FileText, Activity, Mail, Trophy, Percent } from 'lucide-react';
import { Lead, LeadStatus } from '../types';

interface LeadModalProps {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedLead: Lead) => void;
}

export const LeadModal: React.FC<LeadModalProps> = ({ lead, isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState<Lead | null>(lead);

  if (!isOpen || !formData) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => prev ? ({
      ...prev,
      [name]: (name === 'grossIncome' || name === 'downPayment' || name === 'expectedSaleValue' || name === 'expectedCommissionValue') 
        ? parseFloat(value) || 0 
        : value
    }) : null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData) onSave(formData);
  };

  const isVendido = formData.status === LeadStatus.VENDIDO;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 transition-all animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto overflow-x-hidden flex flex-col scale-100 animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl transition-colors ${isVendido ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40' : 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600'}`}>
              {isVendido ? <Trophy size={24} /> : <User size={24} />}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {formData.id.startsWith('temp-new') ? 'Novo Lead' : 'Editar Lead'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Preencha os detalhes do cliente</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-8 space-y-8 flex-1">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Name */}
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Nome Completo</label>
              <div className="relative group">
                <User className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  autoFocus
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-3 pl-12 pr-4 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400"
                  placeholder="Nome do cliente"
                />
              </div>
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Fase do Funil</label>
              <div className="relative group">
                <Activity className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-3 pl-12 pr-4 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none appearance-none cursor-pointer transition-all"
                >
                  {Object.values(LeadStatus).map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Telefone / WhatsApp</label>
              <div className="relative group">
                <Phone className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-3 pl-12 pr-4 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400"
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>

            {/* SEÇÃO VENDIDO - CAMPOS EXCLUSIVOS */}
            {isVendido && (
              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl animate-in slide-in-from-top-4 duration-500">
                <div className="md:col-span-2 mb-2 flex items-center gap-2">
                  <Trophy className="text-emerald-500" size={18} />
                  <h3 className="text-sm font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">Detalhes da Venda</h3>
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider ml-1">Valor da Venda</label>
                  <div className="relative group">
                    <DollarSign className="absolute left-4 top-3.5 text-emerald-500" size={18} />
                    <input
                      type="number"
                      name="expectedSaleValue"
                      value={formData.expectedSaleValue || ''}
                      onChange={handleChange}
                      className="w-full bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 rounded-xl py-3 pl-12 pr-4 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider ml-1">Comissão Recebida</label>
                  <div className="relative group">
                    <Percent className="absolute left-4 top-3.5 text-emerald-500" size={18} />
                    <input
                      type="number"
                      name="expectedCommissionValue"
                      value={formData.expectedCommissionValue || ''}
                      onChange={handleChange}
                      className="w-full bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 rounded-xl py-3 pl-12 pr-4 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">E-mail</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                <input
                  type="email"
                  name="email"
                  value={formData.email || ''}
                  onChange={handleChange}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-3 pl-12 pr-4 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400"
                  placeholder="cliente@email.com"
                />
              </div>
            </div>

            {/* Location */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Local de Interesse</label>
              <div className="relative group">
                <MapPin className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                <input
                  type="text"
                  name="interestLocation"
                  value={formData.interestLocation}
                  onChange={handleChange}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-3 pl-12 pr-4 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400"
                  placeholder="Bairro ou Condomínio"
                />
              </div>
            </div>

            {/* Perfil Financeiro */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Renda Bruta</label>
              <div className="relative group">
                <DollarSign className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                <input
                  type="number"
                  name="grossIncome"
                  value={formData.grossIncome || ''}
                  onChange={handleChange}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-3 pl-12 pr-4 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400"
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Entrada Disponível</label>
              <div className="relative group">
                <DollarSign className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                <input
                  type="number"
                  name="downPayment"
                  value={formData.downPayment || ''}
                  onChange={handleChange}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-3 pl-12 pr-4 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Observações</label>
            <div className="relative group">
              <FileText className="absolute left-4 top-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
              <textarea
                name="summary"
                value={formData.summary}
                onChange={handleChange}
                rows={4}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-3 pl-12 pr-4 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none resize-none transition-all placeholder:text-slate-400"
                placeholder="Detalhes sobre o perfil, necessidades ou histórico..."
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end pt-6 border-t border-slate-100 dark:border-slate-800 gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className={`flex items-center gap-2 px-8 py-3 text-white font-bold rounded-xl shadow-lg active:scale-95 transition-all ${isVendido ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20' : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/20'}`}
            >
              <Save size={18} />
              {isVendido ? 'Finalizar Venda' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
