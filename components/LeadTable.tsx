
import React from 'react';
import { Lead, LeadStatus } from '../types';
import { 
  Phone, 
  MapPin, 
  Calendar, 
  Edit2, 
  Trash2, 
  Star
} from 'lucide-react';

interface LeadTableProps {
  leads: Lead[];
  onEdit: (lead: Lead) => void;
  onDelete: (lead: Lead) => void;
  searchTerm: string;
  selectedIds: string[];
  onSelectToggle: (id: string) => void;
  onSelectAll: (ids: string[]) => void;
  statusFilter: string;
  onlyRadar: boolean;
}

export const LeadTable: React.FC<LeadTableProps> = ({ 
  leads, 
  onEdit, 
  onDelete, 
  searchTerm, 
  selectedIds, 
  onSelectToggle, 
  onSelectAll,
  statusFilter,
  onlyRadar
}) => {
  
  const filteredLeads = leads.filter(l => {
    const matchesSearch = l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         l.phone.includes(searchTerm) ||
                         (l.interestLocation && l.interestLocation.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || l.status === statusFilter;
    const matchesRadar = !onlyRadar || l.isHighPotential === true;

    return matchesSearch && matchesStatus && matchesRadar;
  });

  const getStatusStyle = (status: LeadStatus) => {
    switch (status) {
      case LeadStatus.FRIO: return "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300";
      case LeadStatus.SEGMENTADO: return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300";
      case LeadStatus.QUENTE: return "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300";
      case LeadStatus.VENDIDO: return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300";
      case LeadStatus.PERDIDO: return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300";
      default: return "bg-slate-100 text-slate-700";
    }
  };

  const handleToggleAll = () => {
    if (selectedIds.length === filteredLeads.length) {
      onSelectAll([]);
    } else {
      onSelectAll(filteredLeads.map(l => l.id));
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden animate-in fade-in duration-500">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
              <th className="px-6 py-4 w-10">
                <input 
                  type="checkbox" 
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  checked={filteredLeads.length > 0 && selectedIds.length === filteredLeads.length}
                  onChange={handleToggleAll}
                />
              </th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Lead</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Contato</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Interesse</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Data</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredLeads.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-slate-400 italic">
                  Nenhum lead encontrado.
                </td>
              </tr>
            ) : (
              filteredLeads.map((lead) => (
                <tr 
                  key={lead.id} 
                  className={`group transition-colors cursor-pointer ${selectedIds.includes(lead.id) ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                  onClick={() => onEdit(lead)}
                >
                  <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                    <input 
                      type="checkbox" 
                      className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      checked={selectedIds.includes(lead.id)}
                      onChange={() => onSelectToggle(lead.id)}
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 dark:text-white group-hover:text-indigo-600 transition-colors">{lead.name}</span>
                        {lead.isHighPotential && <Star size={12} className="text-amber-500 fill-amber-500" />}
                      </div>
                      <span className="text-[10px] text-slate-400 truncate max-w-[150px]">{lead.email || 'Sem e-mail'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider ${getStatusStyle(lead.status)}`}>
                      {lead.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400">
                      <Phone size={12} className="text-slate-300" />
                      {lead.phone}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400">
                      <MapPin size={12} className="text-slate-300" />
                      {lead.interestLocation || 'N/I'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
                      <Calendar size={12} className="text-slate-300" />
                      {new Date(lead.createdAt).toLocaleDateString('pt-BR')}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-2 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => onEdit(lead)}
                        className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-400 hover:text-indigo-600 transition-all shadow-sm"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        onClick={() => onDelete(lead)}
                        className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-400 hover:text-red-500 transition-all shadow-sm"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
