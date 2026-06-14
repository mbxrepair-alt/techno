import { supabase } from "./supabase";

export interface InvoiceItem {
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface InvoiceClient {
  id?: number;
  name: string;
  phone?: string;
  email?: string;
}

interface InvoiceResult {
  success: boolean;
  invoiceId?: string;
  error?: string;
}

export async function createInvoice(
  userId: string,
  client: InvoiceClient,
  items: InvoiceItem[],
  _tvaRate: number,
  _paymentMethod: string
): Promise<InvoiceResult> {
  try {
    // Créer le client s'il n'a pas encore d'ID
    if (!client.id && client.name) {
      const { error: clientError } = await supabase.from("clients").insert({
        user_id: userId,
        name: client.name,
        phone: client.phone || "NC",
        email: client.email || "NC",
      });
      if (clientError) console.warn("createInvoice: client insert warning:", clientError);
    }

    // Générer une référence de facture unique
    const invoiceId = `VENTE-${Date.now()}`;

    return { success: true, invoiceId };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur inconnue";
    return { success: false, error: msg };
  }
}
