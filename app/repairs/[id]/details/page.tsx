"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../../lib/supabase";

export default function RepairDetails() {
  const { id } = useParams();
  const [repair, setRepair] = useState(null);

  useEffect(() => {
    const fetchRepair = async () => {
      const { data: repairData } = await supabase.from("repairs").select("*").eq("id", id).single();

      if (!repairData) return;

      const { data: clientData } = await supabase
        .from("clients")
        .select("*")
        .eq("id", repairData.client_id)
        .single();

      setRepair({
        ...repairData,
        client: clientData,
      });
    };

    if (id) fetchRepair();
  }, [id]);

  if (!repair) {
    return <div className="p-6">Chargement...</div>;
  }

  return (
    <div className="p-6 max-w-xl mx-auto bg-white rounded-xl shadow">
      <h1 className="text-xl font-bold mb-4">🧾 Ticket MBX-{repair.id}</h1>

      <p>
        <strong>Client:</strong> {repair.client?.name}
      </p>
      <p>
        <strong>Téléphone:</strong> {repair.client?.phone}
      </p>
      <p>
        <strong>Appareil:</strong> {repair.device}
      </p>
      <p>
        <strong>Panne:</strong> {repair.issue}
      </p>
      <p>
        <strong>Description:</strong> {repair.description}
      </p>
      <p>
        <strong>IMEI:</strong> {repair.imei}
      </p>
      <p>
        <strong>Code:</strong> {repair.unlock_code}
      </p>
      <p>
        <strong>Prix:</strong> {repair.final_price} €
      </p>
      <p>
        <strong>Status:</strong> {repair.status}
      </p>
    </div>
  );
}
