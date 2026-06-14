import { supabase } from './supabase';

export interface Vente {
  id: number;
  user_id: string;
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  unit_cost: number;
  total: number;
  sold_by: string | null;
  sold_at: string;
}

export interface VentesStats {
  totalVentes: number;
  totalBenefice: number;
  nombreVentes: number;
  nombreProduitsVendus: number;
  ventesParJour: Record<string, number>;
  topProduits: { name: string; quantity: number }[];
  dernieresVentes: Vente[];
  evolution: {
    evolution: number;
    tendance: 'hausse' | 'baisse' | 'stable';
    ventesActuelles: number;
    ventesAnciennes: number;
  };
}

export type Periode = 'jour' | 'semaine' | 'mois' | 'annee';

export async function getVentesStats(userId: string, periode: Periode = 'mois'): Promise<VentesStats | null> {
  if (!userId) return null;

  const now = new Date();
  let startDate = new Date();
  
  switch(periode) {
    case 'jour':
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'semaine':
      startDate.setDate(now.getDate() - 7);
      break;
    case 'mois':
      startDate.setMonth(now.getMonth() - 1);
      break;
    case 'annee':
      startDate.setFullYear(now.getFullYear() - 1);
      break;
  }

  const { data: ventes, error } = await supabase
    .from('product_sales')
    .select('*')
    .eq('user_id', userId)
    .gte('sold_at', startDate.toISOString())
    .order('sold_at', { ascending: false });

  if (error) {
    console.error('Erreur chargement ventes:', error);
    return null;
  }

  const ventesTyped = (ventes || []) as Vente[];

  const totalVentes = ventesTyped.reduce((sum, v) => sum + (Number(v.total) || 0), 0);
  const totalBenefice = ventesTyped.reduce((sum, v) => 
    sum + ((Number(v.unit_price) || 0) - (Number(v.unit_cost) || 0)) * (Number(v.quantity) || 0), 0);
  const nombreProduitsVendus = ventesTyped.reduce((sum, v) => sum + (Number(v.quantity) || 0), 0);

  const ventesParJour: Record<string, number> = {};
  ventesTyped.forEach(v => {
    const jour = new Date(v.sold_at).toLocaleDateString('fr-FR');
    ventesParJour[jour] = (ventesParJour[jour] || 0) + (Number(v.total) || 0);
  });

  const topProduits: Record<string, number> = {};
  ventesTyped.forEach(v => {
    topProduits[v.product_name] = (topProduits[v.product_name] || 0) + (Number(v.quantity) || 0);
  });

  const topProduitsListe = Object.entries(topProduits)
    .map(([name, quantity]) => ({ name, quantity }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  return {
    totalVentes,
    totalBenefice,
    nombreVentes: ventesTyped.length,
    nombreProduitsVendus,
    ventesParJour,
    topProduits: topProduitsListe,
    dernieresVentes: ventesTyped.slice(0, 10),
    evolution: { evolution: 0, tendance: 'stable', ventesActuelles: 0, ventesAnciennes: 0 }
  };
}

export async function getVentesAujourdhui(userId: string): Promise<number> {
  if (!userId) return 0;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const { data, error } = await supabase
    .from('product_sales')
    .select('total')
    .eq('user_id', userId)
    .gte('sold_at', today.toISOString());
  
  if (error) return 0;
  return (data || []).reduce((sum, v) => sum + (Number(v.total) || 0), 0);
}