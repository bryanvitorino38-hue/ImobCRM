
import { Lead, LeadStatus } from '../types';

// Helper to extract ID and GID (Tab ID)
const extractSheetDetails = (url: string) => {
  try {
    const urlObj = new URL(url);
    
    // Handle "Published to web" links
    if (url.includes('/d/e/')) {
      const match = url.match(/\/spreadsheets\/d\/e\/([a-zA-Z0-9-_]+)/);
      return match ? { id: match[1], isPublished: true, gid: null } : null;
    }
    
    // Handle standard "Edit" links
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1] && match[1] !== 'e') {
      const gid = urlObj.searchParams.get('gid') || (urlObj.hash.includes('gid=') ? urlObj.hash.split('gid=')[1] : null);
      return { id: match[1], isPublished: false, gid: gid };
    }
  } catch (e) {
    return null;
  }
  return null;
};

// Robust Line Parser (Handles CSV and TSV/Copy-Paste)
const parseLine = (line: string): string[] => {
  if (line.includes('\t')) {
    return line.split('\t').map(cell => cell.trim());
  }

  const re_value = /(?!\s*$)\s*(?:'([^'\\]*(?:\\[\S\s][^'\\]*)*)'|"([^"\\]*(?:\\[\S\s][^"\\]*)*)"|([^,'"\s\\]*(?:\s+[^,'"\s\\]+)*))\s*(?:,|$)/g;
  
  const a = [];
  line.replace(re_value, function(m0, m1, m2, m3) {
      if      (m1 !== undefined) a.push(m1.replace(/\\'/g, "'"));
      else if (m2 !== undefined) a.push(m2.replace(/\\"/g, '"'));
      else if (m3 !== undefined) a.push(m3);
      return '';
  });
  return a;
};

const mapStatus = (rawStatus: string): LeadStatus => {
  if (!rawStatus) return LeadStatus.FRIO;
  const s = rawStatus.toLowerCase().trim();
  if (s.includes('frio') || s.includes('novo') || s.includes('início')) return LeadStatus.FRIO;
  if (s.includes('segmentado') || s.includes('qualificado') || s.includes('morno')) return LeadStatus.SEGMENTADO;
  if (s.includes('quente') || s.includes('visita') || s.includes('proposta')) return LeadStatus.QUENTE;
  if (s.includes('fechado') || s.includes('vendido') || s.includes('contrato')) return LeadStatus.VENDIDO;
  if (s.includes('perdido') || s.includes('arquivado') || s.includes('desqualificado')) return LeadStatus.PERDIDO;
  return LeadStatus.FRIO;
};

export const parseSheetContent = (text: string): Lead[] => {
  if (text.trim().startsWith('<!DOCTYPE') || text.includes('<html')) {
    throw new Error('Conteúdo inválido (HTML detectado).');
  }

  const lines = text.split('\n').filter(l => l.trim().length > 0);
  if (lines.length < 1) return [];

  const headers = parseLine(lines[0]).map(h => h.toLowerCase().trim());
  
  const nameIndex = headers.findIndex(h => h.includes('nome') || h.includes('lead') || h.includes('cliente'));
  const statusIndex = headers.findIndex(h => h.includes('situação') || h.includes('status') || h.includes('fase'));
  const phoneIndex = headers.findIndex(h => h.includes('telefone') || h.includes('celular') || h.includes('whatsapp') || h.includes('fone'));
  const emailIndex = headers.findIndex(h => h.includes('email') || h.includes('e-mail'));
  const incomeIndex = headers.findIndex(h => h.includes('renda') || h.includes('salário'));
  const locationIndex = headers.findIndex(h => h.includes('local') || h.includes('bairro') || h.includes('interesse'));
  
  const validNameIndex = nameIndex !== -1 ? nameIndex : 0;
  const newLeads: Lead[] = [];

  for (let i = 1; i < lines.length; i++) {
    const columns = parseLine(lines[i]);
    if (columns.length <= validNameIndex) continue;

    const name = columns[validNameIndex];
    if (!name || name.toLowerCase() === 'nome') continue;

    const rawIncome = incomeIndex !== -1 ? columns[incomeIndex] : '0';
    const grossIncome = parseFloat(rawIncome.replace(/[^\d.,-]/g, '').replace(',', '.')) || 0;

    newLeads.push({
      id: `imported-${Date.now()}-${i}`,
      name: name.replace(/['"]/g, '').trim(),
      status: mapStatus(statusIndex !== -1 ? columns[statusIndex] : ''),
      phone: (phoneIndex !== -1 ? columns[phoneIndex] : '').replace(/['"]/g, '').trim(),
      email: (emailIndex !== -1 ? columns[emailIndex] : '').replace(/['"]/g, '').trim(),
      interestLocation: (locationIndex !== -1 ? columns[locationIndex] : '').replace(/['"]/g, '').trim(),
      grossIncome: grossIncome,
      downPayment: 0,
      summary: 'Importado',
      createdAt: new Date().toISOString()
    });
  }
  return newLeads;
}

/**
 * Busca o conteúdo bruto (CSV) da planilha para ser lido pela IA
 */
export const fetchRawSheetText = async (url: string): Promise<string> => {
  const details = extractSheetDetails(url);
  if (!details) throw new Error('URL da planilha inválida.');

  let csvUrl = '';
  if (details.isPublished) {
    csvUrl = `https://docs.google.com/spreadsheets/d/e/${details.id}/pub?output=csv`;
  } else {
    const gidParam = details.gid ? `&gid=${details.gid}` : '';
    csvUrl = `https://docs.google.com/spreadsheets/d/${details.id}/gviz/tq?tqx=out:csv${gidParam}`;
  }

  const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(csvUrl)}`;
  const response = await fetch(proxyUrl);
  if (!response.ok) throw new Error('Falha ao acessar planilha.');
  return await response.text();
};

export const fetchAndParseSheet = async (url: string): Promise<Lead[]> => {
  const text = await fetchRawSheetText(url);
  return parseSheetContent(text);
};
