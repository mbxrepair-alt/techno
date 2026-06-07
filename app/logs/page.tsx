"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { getLogs } from "../../lib/logs";

export default function LogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState(null);
  const [currentTech, setCurrentTech] = useState(null);

  useEffect(() => {
    const storedCompanyId = sessionStorage.getItem("company_id");
    const storedTech = sessionStorage.getItem("technician_permissions");
    if (storedTech) {
      setCurrentTech(JSON.parse(storedTech));
    }
    if (storedCompanyId) {
      setCompanyId(storedCompanyId);
      loadLogs(storedCompanyId);
    }
  }, []);

  const loadLogs = async (cid) => {
    setLoading(true);
    const data = await getLogs(cid, 200);
    setLogs(data);
    setLoading(false);
  };

  const getActionBadge = (action) => {
    const badges = {
      login: "bg-green-100 text-green-700",
      create_technician: "bg-blue-100 text-blue-700",
      update_technician: "bg-yellow-100 text-yellow-700",
      delete_technician: "bg-red-100 text-red-700",
      activate_technician: "bg-green-100 text-green-700",
      deactivate_technician: "bg-orange-100 text-orange-700",
    };
    return badges[action] || "bg-gray-100 text-gray-700";
  };

  const getActionIcon = (action) => {
    const icons = {
      login: "🔐",
      create_technician: "➕",
      update_technician: "✏️",
      delete_technician: "🗑️",
      activate_technician: "✅",
      deactivate_technician: "⛔",
    };
    return icons[action] || "📝";
  };

  const getActionName = (action) => {
    const names = {
      login: "Connexion",
      create_technician: "Création technicien",
      update_technician: "Modification",
      delete_technician: "Suppression",
      activate_technician: "Activation",
      deactivate_technician: "Désactivation",
    };
    return names[action] || action;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">📋 Historique des actions</h1>
        <p className="text-gray-500 mt-1">Toutes les actions effectuées par les techniciens</p>
      </div>

      {logs.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center text-gray-400 border">
          Aucune trace pour le moment
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Action
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Technicien
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Détails
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${getActionBadge(log.action)}`}
                      >
                        {getActionIcon(log.action)} {getActionName(log.action)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {log.technicien_name || "Système"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto max-w-md">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
