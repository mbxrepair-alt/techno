"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, getCurrentUser } from "../../lib/supabase";
import Layout from "../../components/Layout";

export default function ReceiptsHistory() {
  const router = useRouter();
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    checkAuth();
    loadReceipts();
  }, []);

  const checkAuth = async () => {
    const { data } = await supabase.auth.getUser();
    if (!data?.user) router.push("/login");
  };

  const loadReceipts = async () => {
    setLoading(true);
    const user = await getCurrentUser();
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Récupérer les reçus sans jointure avec auth.users
      const { data, error } = await supabase
        .from("receipts")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Erreur chargement:", error);
        setReceipts([]);
      } else {
        setReceipts(data || []);
      }
    } catch (err) {
      console.error("Exception:", err);
      setReceipts([]);
    } finally {
      setLoading(false);
    }
  };

  const deleteReceipt = async (id) => {
    if (confirm("Supprimer définitivement ce reçu ?")) {
      const { error } = await supabase.from("receipts").delete().eq("id", id);
      if (error) {
        alert("Erreur lors de la suppression");
      } else {
        loadReceipts();
      }
    }
  };

  const viewReceipt = (receipt) => {
    const date = new Date(receipt.created_at).toLocaleString('fr-FR');
    const ticketListHtml = receipt.tickets.map((ticket, idx) => `
      <div style="border-bottom:1px solid #ddd; margin-bottom:16px; padding-bottom:12px;">
        <h3 style="margin:0 0 6px 0; font-size:16px;">Ticket n° MBX-${ticket.id}</h3>
        <p><strong>Appareil :</strong> ${ticket.device}</p>
        <p><strong>Panne :</strong> ${ticket.issue}</p>
        <p><strong>IMEI :</strong> ${ticket.imei || 'NC'}</p>
        <p><strong>Code :</strong> ${ticket.code || 'NC'}</p>
        <p><strong>Notes :</strong> ${ticket.notes || 'Aucune'}</p>
      </div>
    `).join('');
    
    const html = `<!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Reçu ${receipt.receipt_number}</title>
      <style>
        body { font-family: 'Courier New', monospace; margin: 20px; }
        .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
        .client-info { background: #f5f5f5; padding: 10px; margin-bottom: 20px; border-radius: 8px; }
        .footer { text-align: center; margin-top: 30px; font-size: 11px; color: #666; border-top: 1px solid #ccc; padding-top: 10px; }
        @media print { body { margin: 0; padding: 10px; } .no-print { display: none; } }
        button { margin-top: 20px; padding: 10px 20px; background: #333; color: white; border: none; border-radius: 5px; cursor: pointer; }
      </style>
    </head>
    <body>
      <div class="header">
        <h2>🔧 MBX Réparations</h2>
        <p>Reçu de dépôt<br>${date}</p>
        <p><strong>N° ${receipt.receipt_number}</strong></p>
      </div>
      <div class="client-info">
        <strong>👤 Client :</strong> ${receipt.client_name}<br>
        <strong>📞 Téléphone :</strong> ${receipt.client_phone}<br>
        <strong>✉️ Email :</strong> ${receipt.client_email}
      </div>
      <div>
        <strong>📦 Appareil(s) déposé(s) :</strong>
        ${ticketListHtml}
      </div>
      <div class="footer">
        Merci de votre confiance — Suivi sur notre espace client.<br>
        🔧 MBX Réparations
      </div>
      <div class="no-print" style="text-align:center;">
        <button onclick="window.print();">🖨️ Imprimer</button>
        <button onclick="window.close();" style="margin-left:10px;">Fermer</button>
      </div>
    </body>
    </html>`;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const filteredReceipts = receipts.filter(r => 
    r.client_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.receipt_number?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <Layout>
        <div className="text-center py-12">⏳ Chargement...</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">📜 Historique des reçus</h1>
          <button 
            onClick={loadReceipts}
            className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
          >
            🔄 Actualiser
          </button>
        </div>
        
        <input
          className="w-full p-2 border rounded-lg mb-4"
          placeholder="🔍 Rechercher par client ou numéro de reçu..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        
        {filteredReceipts.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            📭 Aucun reçu sauvegardé
          </div>
        )}
        
        <div className="space-y-3 max-h-[600px] overflow-auto">
          {filteredReceipts.map((receipt) => (
            <div 
              key={receipt.id} 
              className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition"
              onClick={() => viewReceipt(receipt)}
            >
              <div className="flex justify-between items-start flex-wrap gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold bg-gray-100 px-2 py-0.5 rounded">
                      {receipt.receipt_number}
                    </span>
                    <span className="text-xs text-gray-500">
                      📅 {formatDate(receipt.created_at)}
                    </span>
                  </div>
                  <div className="font-semibold mt-2">👤 {receipt.client_name}</div>
                  <div className="text-sm text-gray-500">📞 {receipt.client_phone}</div>
                  <div className="text-xs text-gray-400 mt-1">
                    📱 {receipt.tickets?.length || 0} appareil(s)
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      viewReceipt(receipt);
                    }}
                    className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                  >
                    🖨️ Imprimer
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteReceipt(receipt.id);
                    }}
                    className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                  >
                    🗑 Supprimer
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-4 pt-3 border-t text-xs text-gray-400 text-center">
          💾 Reçus sauvegardés définitivement dans la base de données
        </div>
      </div>
    </Layout>
  );
}