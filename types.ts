
export enum LeadStatus {
  FRIO = 'Frio',
  SEGMENTADO = 'Segmentando',
  QUENTE = 'Quente',
  VENDIDO = 'Vendido',
  PERDIDO = 'Desqualificado'
}

export interface Lead {
  id: string;
  name: string;
  status: LeadStatus;
  phone: string;
  email: string;
  interestLocation: string; // Local de interesse
  grossIncome: number;      // Renda bruta
  downPayment: number;      // Entrada
  summary: string;          // Resumo do lead
  createdAt: string;
  userPhone?: string;       // Telefone do dono da conta (para N8N)
  isHighPotential?: boolean; // Novo: Indica se é um lead de alto potencial (Radar)
  potentialNotes?: string;   // Novo: Anotações estratégicas do vendedor
  
  // Novos Campos do Radar e Venda
  radar?: string;             
  expectedSaleValue?: number; // Valor da Venda (Exclusivo status Vendido)
  expectedCommissionValue?: number; // Valor Comissão (Exclusivo status Vendido)
}

export interface KanbanColumnType {
  id: LeadStatus;
  title: string;
  color: string;
}

export interface AISettings {
  user_id?: string;
  instruction: string;
  personality: string;
  rules: string;
  context: string;
  limitations: string;
  examples: string;
  excluded_numbers?: string; // Novo: Números para ignorar
  imoveis_sheet_link?: string; 
}
