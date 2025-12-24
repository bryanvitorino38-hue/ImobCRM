
import { createClient } from '@supabase/supabase-js';
import { Lead, LeadStatus, AISettings } from '../types';

const SUPABASE_URL = 'https://bnsdzcinlcqyvpwuvyga.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJuc2R6Y2lubGNxeXZwd3V2eWdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4NjM3MDMsImV4cCI6MjA4MDQzOTcwM30._5aLijvqDpYdgHB3SfBdFzMuto86RgG69uiyz2hI46A';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Helper para normalizar status
const normalizeStatus = (rawStatus: any): LeadStatus => {
  if (!rawStatus) return LeadStatus.FRIO;
  const s = String(rawStatus).trim().toLowerCase();
  if (s.includes('frio') || s.includes('novo')) return LeadStatus.FRIO;
  if (s.includes('segmentado') || s.includes('qualificado')) return LeadStatus.SEGMENTADO;
  if (s.includes('quente') || s.includes('visita')) return LeadStatus.QUENTE;
  if (s.includes('fechado') || s.includes('vendido')) return LeadStatus.VENDIDO;
  return LeadStatus.PERDIDO;
};

const cleanPhone = (phone: any) => phone ? String(phone).replace(/\D/g, '') : '';
const safeNumber = (value: any) => (value === undefined || value === null || value === '') ? 0 : (isNaN(Number(value)) ? 0 : Number(value));

export const mapToAppLead = (dbLead: any): Lead => ({
  id: String(dbLead.id), 
  name: dbLead.name || 'Sem Nome',
  status: normalizeStatus(dbLead.status),
  phone: dbLead.phone || '',
  email: dbLead.email || '',
  interestLocation: dbLead.interest_location || '',
  grossIncome: Number(dbLead.gross_income) || 0,
  downPayment: Number(dbLead.down_payment) || 0,
  summary: dbLead.summary || '',
  createdAt: dbLead.created_at || new Date().toISOString(),
  userPhone: dbLead.user_phone || '', 
  isHighPotential: dbLead.is_high_potential === true, 
  potentialNotes: dbLead.potential_notes || '', 
  radar: dbLead.radar || '',
  expectedSaleValue: Number(dbLead.expected_sale_value) || 0,
  expectedCommissionValue: Number(dbLead.expected_commission_value) || 0,
});

const mapToDbLead = (lead: Partial<Lead>) => {
  const dbLead: any = {};
  if (lead.name !== undefined) dbLead.name = lead.name;
  if (lead.status !== undefined) dbLead.status = lead.status;
  if (lead.phone !== undefined) dbLead.phone = cleanPhone(lead.phone);
  if (lead.email !== undefined) dbLead.email = lead.email;
  if (lead.interestLocation !== undefined) dbLead.interest_location = lead.interestLocation;
  if (lead.grossIncome !== undefined) dbLead.gross_income = safeNumber(lead.grossIncome);
  if (lead.downPayment !== undefined) dbLead.down_payment = safeNumber(lead.downPayment);
  if (lead.summary !== undefined) dbLead.summary = lead.summary;
  if (lead.isHighPotential !== undefined) dbLead.is_high_potential = lead.isHighPotential;
  if (lead.potentialNotes !== undefined) dbLead.potential_notes = lead.potentialNotes;
  if (lead.expectedSaleValue !== undefined) dbLead.expected_sale_value = safeNumber(lead.expectedSaleValue);
  if (lead.expectedCommissionValue !== undefined) dbLead.expected_commission_value = safeNumber(lead.expectedCommissionValue);
  return dbLead;
};

export const leadService = {
  async getAll() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) return [];
    const { data, error } = await supabase.from('leads').select('*').eq('user_id', session.user.id); 
    if (error) throw error;
    return (data || []).map(mapToAppLead).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },
  async create(lead: Omit<Lead, 'id' | 'createdAt'>) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) throw new Error("Não autenticado");
    const { data, error } = await supabase.from('leads').insert([{ ...mapToDbLead(lead), user_id: session.user.id }]).select().single();
    if (error) throw error;
    return mapToAppLead(data);
  },
  async update(id: string, updates: Partial<Lead>) {
    const { data, error } = await supabase.from('leads').update(mapToDbLead(updates)).eq('id', id).select().single();
    if (error) throw error;
    return mapToAppLead(data);
  },
  async delete(id: string) {
    const { error } = await supabase.from('leads').delete().eq('id', id);
    if (error) throw error;
    return true;
  }
};

export const profileService = {
  async getProfile() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) return null;
    const { data, error } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
    if (error) return null;
    return data;
  },
  async updateProfile(updates: any) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) throw new Error("Não autenticado");
    // Usando update para evitar problemas de RLS com insert/upsert em profiles existentes
    const { data, error } = await supabase.from('profiles').update(updates).eq('id', session.user.id).select().single();
    if (error) throw error;
    return data;
  }
};

export const aiSettingsService = {
  async getSettings(): Promise<AISettings | null> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) return null;
    
    // Busca nas duas tabelas
    const [aiResult, profileResult] = await Promise.all([
      supabase.from('user_ai_settings').select('*').eq('user_id', session.user.id).maybeSingle(),
      supabase.from('profiles').select('imoveis_sheet_link, excluded_numbers').eq('id', session.user.id).maybeSingle()
    ]);
    
    // Cast to any to access properties safely even if null
    const aiData = (aiResult.data || {}) as any;
    const profileData = (profileResult.data || {}) as any;

    return {
      user_id: session.user.id,
      instruction: aiData.instruction || '',
      personality: aiData.personality || '',
      rules: aiData.rules || '',
      context: aiData.context || '',
      limitations: aiData.limitations || '',
      examples: aiData.examples || '',
      excluded_numbers: profileData.excluded_numbers || '',
      imoveis_sheet_link: profileData.imoveis_sheet_link || ''
    };
  },

  async saveSettings(settings: Omit<AISettings, 'user_id'>) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) throw new Error("Sessão expirada. Por favor, faça login novamente.");

    const userId = session.user.id;

    // 1. Configurações da IA (Tabela user_ai_settings)
    // Permite upsert pois geralmente a politica permite insert/update para user_id proprio
    const { error: aiError } = await supabase.from('user_ai_settings').upsert({
      user_id: userId,
      instruction: settings.instruction || '',
      personality: settings.personality || '',
      rules: settings.rules || '',
      context: settings.context || '',
      limitations: settings.limitations || '',
      examples: settings.examples || ''
    }, { onConflict: 'user_id' });

    if (aiError) {
      console.error("Erro ao salvar IA:", aiError);
      throw new Error(`Falha ao salvar configurações de IA: ${aiError.message || JSON.stringify(aiError)}`);
    }

    // 2. Dados de Perfil / Exclusão (Tabela profiles)
    // ALTERAÇÃO: Usar UPDATE em vez de UPSERT.
    // O erro "new row violates row-level security policy" ocorre porque o UPSERT tenta inserir
    // e a política RLS bloqueia o INSERT. O UPDATE funciona se a linha já existir (o que deve ser verdade para usuários logados).
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        excluded_numbers: settings.excluded_numbers || '',
        imoveis_sheet_link: settings.imoveis_sheet_link || ''
      })
      .eq('id', userId);

    if (profileError) {
      console.error("Erro ao salvar Profile:", profileError);
      // Garante que o objeto de erro seja convertido para string legível
      throw new Error(`Falha ao salvar lista negra no perfil: ${profileError.message || JSON.stringify(profileError)}`);
    }

    return { ...settings, user_id: userId };
  }
};
