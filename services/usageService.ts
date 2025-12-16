import { supabase } from "./supabaseClient";
import { Resolution, UsageLog, UsageSummary, UIMode } from "../types";

// Pricing Rules
const COST_STD = 0.67; // 1K or 2K
const COST_HIGH = 1.20; // 4K

const calculateCost = (resolution: Resolution): number => {
  if (resolution === Resolution.UHD) {
    return COST_HIGH;
  }
  return COST_STD;
};

export const trackUsage = async (
  action: 'generate' | 'refine',
  resolution: Resolution,
  tokensInput: number = 0,
  tokensOutput: number = 0,
  presetName?: string,
  presetType?: 'predefined' | 'custom',
  uiMode?: UIMode
): Promise<void> => {
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return; // Não salva log se não estiver logado

  const cost = calculateCost(resolution);

  const { error } = await supabase.from('usage_logs').insert({
    user_id: user.id,
    action,
    resolution,
    tokens_input: tokensInput,
    tokens_output: tokensOutput,
    cost: cost
    // preset info pode ser adicionada ao DB se atualizar a tabela
  });

  if (error) console.error("Erro ao salvar log de uso:", error);
};

export const getLogs = async (): Promise<UsageLog[]> => {
  const { data, error } = await supabase
    .from('usage_logs')
    .select('*')
    .order('created_at', { ascending: false });

  if (error || !data) return [];

  return data.map((item: any) => ({
    id: item.id,
    timestamp: item.created_at,
    action: item.action,
    resolution: item.resolution as Resolution,
    tokensInput: item.tokens_input,
    tokensOutput: item.tokens_output,
    cost: item.cost,
    uiMode: 'DESIGNER' // Default fallback
  }));
};

export const getSummary = async (): Promise<UsageSummary> => {
  const logs = await getLogs();
  
  let images_generated = 0;
  let refines_used = 0;
  let tokens_input = 0;
  let tokens_output = 0;
  let estimated_cost_brl = 0;

  logs.forEach(log => {
    if (log.action === 'generate') images_generated++;
    if (log.action === 'refine') refines_used++;
    
    tokens_input += (log.tokensInput || 0);
    tokens_output += (log.tokensOutput || 0);
    estimated_cost_brl += log.cost;
  });

  const { data: { user } } = await supabase.auth.getUser();

  return {
    user_id: user?.id || 'anon',
    images_generated,
    refines_used,
    total_images: images_generated + refines_used,
    tokens_input,
    tokens_output,
    tokens_total: tokens_input + tokens_output,
    estimated_cost_brl: parseFloat(estimated_cost_brl.toFixed(2))
  };
};

export const resetUsage = async (): Promise<void> => {
  // Em um banco real, geralmente não deletamos logs de auditoria, 
  // mas para manter a funcionalidade do botão:
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await supabase.from('usage_logs').delete().eq('user_id', user.id);
  }
};