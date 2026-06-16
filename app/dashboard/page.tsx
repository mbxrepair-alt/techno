"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { supabase, getCurrentUser } from "../../lib/supabase";
import { getCurrentTechnician, addHistoriqueAction } from "../../lib/historique";
import { useRouter } from "next/navigation";
import { DEVICES_LIST, getSmartIssueSuggestions, getQuickIssues } from "../../lib/devices-catalog";
import Layout from "../../components/Layout";
import QRCode from "qrcode";
import ReturnModal from "../../components/ReturnModal";
import PatternLock from "../../components/PatternLock";
import QrScanner from "../../components/QrScanner";
import CartValidationModal from "../../components/CartValidationModal";
import ClientResponsesBell from "../../components/ClientResponsesBell";
import type { ExtractedFormData } from "../../lib/ai";
import { ScanLine, ShoppingCart, X, Check } from "lucide-react";

interface Product {
  id: number;
  name: string;
  stock: number;
  sale_price: number;
  purchase_price: number;
  barcode: string;
}

export default function Dashboard() {
  const router = useRouter();
  const clientInputRef = useRef(null);
  const phoneInputRef = useRef(null);
  const emailInputRef = useRef(null);
  const repairRefs = useRef([]);
  const searchInputRef = useRef(null);
  const searchContainerRef = useRef(null);
  const formRef = useRef<HTMLDivElement>(null);
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  // SEARCH TICKETS
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [allRepairs, setAllRepairs] = useState([]);
  const [allClients, setAllClients] = useState([]);

  // MODAL DETAIL
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedRepairDetail, setSelectedRepairDetail] = useState(null);
  const [selectedRepairClient, setSelectedRepairClient] = useState(null);
  const [clientEmail, setClientEmail] = useState("");

  // RETOUR SAV
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [selectedRepair, setSelectedRepair] = useState(null);

  // INFOS ATELIER
  const [companyInfo, setCompanyInfo] = useState({
    name: "MBX Réparations",
    phone: "",
    email: "",
    address: "",
    siret: "",
  });

  // FORMULAIRE CLIENT
  const [intakeClient, setIntakeClient] = useState("");
  const [intakePhone, setIntakePhone] = useState("");
  const [intakeEmail, setIntakeEmail] = useState("");
  const [selectedClientIndex, setSelectedClientIndex] = useState(-1);
  const [selectedPhoneIndex, setSelectedPhoneIndex] = useState(-1);

  // GESTION DU NOMBRE D'APPAREILS
  const [desiredRepairCount, setDesiredRepairCount] = useState(1);
  const [repairsList, setRepairsList] = useState([
    {
      device: "",
      issue: "",
      imei: "",
      code: "",
      estimatedPrice: "",
      unlockPattern: "",
      description: "",
      id: Date.now(),
    },
  ]);

  // SUGGESTIONS clients existants
  const [clientSuggestions, setClientSuggestions] = useState([]);
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);
  const [phoneSuggestions, setPhoneSuggestions] = useState([]);
  const [showPhoneSuggestions, setShowPhoneSuggestions] = useState(false);

  // MODÈLES, PANNES, CODES
  const [customDevices, setCustomDevices] = useState([]);
  const allDevices = [...DEVICES_LIST, ...customDevices];

  // ========== VENTE PAR CODE-BARRES ==========
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [dashCartItems, setDashCartItems] = useState<{ product: Product; quantity: number }[]>(() => {
    try {
      const saved = typeof window !== "undefined" ? localStorage.getItem("dash_cart") : null;
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [showCartModal, setShowCartModal] = useState(false);
  const [outOfStockProduct, setOutOfStockProduct] = useState<Product | null>(null);
  const [dashLinkedRepair, setDashLinkedRepair] = useState<any>(() => {
    try { const s = typeof window !== "undefined" ? localStorage.getItem("dash_linked_repair") : null; return s ? JSON.parse(s) : null; } catch { return null; }
  });
  const [dashProducts, setDashProducts] = useState<Product[]>([]);
  const [userId, setUserId] = useState<string>("");

  // Chargement depuis Supabase (via /api/catalog)
  const loadCatalog = async () => {
    try {
      const res = await fetch("/api/catalog");
      const data = await res.json();
      if (data.success) {
        setCustomDevices(data.customDevices ?? []);
        setCustomIssues(data.customIssues ?? []);
        setHiddenIssues(new Set(data.hiddenIssues ?? []));
      }
    } catch (err) {
      console.error("Erreur chargement catalog:", err);
    }
  };

  useEffect(() => {
    loadCatalog();
    const savedCodes = localStorage.getItem("mbx_custom_codes");
    if (savedCodes) setCustomCodesList(JSON.parse(savedCodes));
  }, []);

  useEffect(() => {
    localStorage.setItem("dash_cart", JSON.stringify(dashCartItems));
  }, [dashCartItems]);

  useEffect(() => {
    if (dashLinkedRepair) localStorage.setItem("dash_linked_repair", JSON.stringify(dashLinkedRepair));
    else localStorage.removeItem("dash_linked_repair");
  }, [dashLinkedRepair]);

  const saveCustomDevices = async (newList) => {
    setCustomDevices(newList);
  };

  const defaultIssues = [
    "Écran cassé / brisé",
    "Batterie ne charge plus / gonflée",
    "Microphone HS / pas de son",
    "Appareil photo flou / cassé",
    "Plus de réseau / pas de SIM",
    "Bootloop / redémarrage en boucle",
    "Bouton power / volume HS",
    "Tombé dans l'eau / oxydation",
    "Haut-parleur grésille / pas de son",
    "GPS ne fonctionne pas",
    "Code oublié / verrouillage",
    "WiFi / Bluetooth ne marche pas",
    "Port de charge cassé",
    "Vitre arrière cassée",
    "Face ID / Touch ID ne fonctionne pas",
    "Overchauffe / téléphone chauffe",
    "Vibreur HS",
    "Proximité / écran qui reste noir",
    "Mise à jour bloquée",
    "Application qui plante",
  ];

  const [customIssues, setCustomIssues] = useState([]);
  const [hiddenIssues, setHiddenIssues] = useState<Set<string>>(new Set());
  const allIssues = [...defaultIssues, ...customIssues].filter((i) => !hiddenIssues.has(i));

  const saveCustomIssues = async (newList) => {
    setCustomIssues(newList);
  };

  const hideIssue = async (issue: string) => {
    setHiddenIssues((prev) => { const n = new Set(prev); n.add(issue); return n; });
    await fetch("/api/catalog", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: issue, hidden: true }),
    });
  };

  const restoreIssue = async (issue: string) => {
    setHiddenIssues((prev) => { const n = new Set(prev); n.delete(issue); return n; });
    await fetch("/api/catalog", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: issue, hidden: false }),
    });
  };

  const defaultCodesList = [
    "0000",
    "1234",
    "1111",
    "000000",
    "123456",
    "654321",
    "Code oublié",
    "Non fourni",
    "Motorola",
    "Samsung",
    "Xiaomi",
    "iPhone",
  ];
  const [customCodesList, setCustomCodesList] = useState([]);
  const allCodesList = [...defaultCodesList, ...customCodesList];

  const saveCustomCodes = (newList) => {
    setCustomCodesList(newList);
    localStorage.setItem("mbx_custom_codes", JSON.stringify(newList));
  };

  const getCategoryFromDevice = (device) => {
    const lower = device.toLowerCase();
    if (lower.includes("iphone")) return "🍎 iPhone";
    if (lower.includes("galaxy") || lower.includes("samsung")) return "📱 Samsung";
    if (lower.includes("xiaomi")) return "📱 Xiaomi";
    if (lower.includes("pixel")) return "📱 Google Pixel";
    if (lower.includes("oneplus")) return "📱 OnePlus";
    if (lower.includes("huawei")) return "📱 Huawei";
    if (lower.includes("oppo")) return "📱 Oppo";
    return "📱 Autre";
  };

  const [deviceSuggestionsMap, setDeviceSuggestionsMap] = useState({});
  const [issueSuggestionsMap, setIssueSuggestionsMap] = useState({});
  const [codeSuggestionsMap, setCodeSuggestionsMap] = useState({});
  const [showDeviceSuggestionsMap, setShowDeviceSuggestionsMap] = useState({});
  const [showIssueSuggestionsMap, setShowIssueSuggestionsMap] = useState({});
  const [showCodeSuggestionsMap, setShowCodeSuggestionsMap] = useState({});
  const [addModalSourceRepairId, setAddModalSourceRepairId] = useState<number | null>(null);
  const [deviceCategoryMap, setDeviceCategoryMap] = useState({});
  const [deviceSuggestionIndex, setDeviceSuggestionIndex] = useState({});
  const [issueSuggestionIndex, setIssueSuggestionIndex] = useState({});
  const [codeSuggestionIndex, setCodeSuggestionIndex] = useState({});

  const [recentTickets, setRecentTickets] = useState([]);
  const [showScanner, setShowScanner] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [emailTo, setEmailTo] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [currentTrackingUrl, setCurrentTrackingUrl] = useState(null);

  const [newDeviceInput, setNewDeviceInput] = useState("");
  const [newIssueInput, setNewIssueInput] = useState("");
  const [newCodeInput, setNewCodeInput] = useState("");
  const [showAddDevice, setShowAddDevice] = useState(false);
  const [showAddIssue, setShowAddIssue] = useState(false);
  const [showAddCode, setShowAddCode] = useState(false);

  // Charger les infos de l'atelier
  useEffect(() => {
    const loadCompanyInfo = async () => {
      const companyId = typeof window !== "undefined" ? localStorage.getItem("company_id") : null;
      if (!companyId) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_name, contact_phone, contact_address, email")
        .eq("id", companyId)
        .single();

      if (profile) {
        setCompanyInfo({
          name: profile.company_name || "MBX Réparations",
          phone: profile.contact_phone || "",
          email: profile.email || "",
          address: profile.contact_address || "",
          siret: "",
        });
      }
    };
    loadCompanyInfo();
  }, []);

  useEffect(() => {
    if (clientInputRef.current) clientInputRef.current.focus();
  }, []);

  // Charger toutes les données pour la recherche
  const loadAllData = async () => {
    const companyId = typeof window !== "undefined" ? localStorage.getItem("company_id") : null;
    if (!companyId) return;

    const { data: repairsData } = await supabase
      .from("repairs")
      .select("*")
      .eq("user_id", companyId)
      .order("id", { ascending: false });

    const { data: clientsData } = await supabase
      .from("clients")
      .select("id, name, phone, email, client_code")
      .eq("user_id", companyId);

    if (repairsData) setAllRepairs(repairsData);
    if (clientsData) setAllClients(clientsData);

    const { data: productsData } = await supabase.from("products").select("*").eq("user_id", companyId).order("name");
    if (productsData) setDashProducts(productsData as Product[]);
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Listen for "assistant:fillForm" events
  useEffect(() => {
    const handleFillForm = (e: Event) => {
      const data = (e as CustomEvent<ExtractedFormData>).detail;
      if (!data) return;

      if (data.clientName) setIntakeClient(data.clientName);
      if (data.clientPhone) setIntakePhone(data.clientPhone);
      if (data.clientEmail) setIntakeEmail(data.clientEmail);

      const incoming = Array.isArray(data.repairs) && data.repairs.length > 0
        ? data.repairs.slice(0, 20)
        : [];
      const count = Math.max(incoming.length, 1);
      setDesiredRepairCount(count);

      const now = Date.now();
      const newList = incoming.length > 0
        ? incoming.map((r, i) => ({
            id: now + i,
            device: r.device ?? "",
            issue: r.issue ?? "",
            imei: r.imei ?? "",
            code: r.code ?? "",
            estimatedPrice: r.estimatedPrice !== null ? String(r.estimatedPrice) : "",
            unlockPattern: "",
            description: r.description ?? "",
          }))
        : [{ id: now, device: "", issue: "", imei: "", code: "", estimatedPrice: "", unlockPattern: "", description: "" }];

      setRepairsList(newList);

      setDeviceSuggestionsMap({});
      setIssueSuggestionsMap({});
      setCodeSuggestionsMap({});
      setShowDeviceSuggestionsMap({});
      setShowIssueSuggestionsMap({});
      setShowCodeSuggestionsMap({});
      setDeviceCategoryMap({});
      setDeviceSuggestionIndex({});
      setIssueSuggestionIndex({});
      setCodeSuggestionIndex({});

      showMessage("✨ Formulaire rempli par l'assistant", "success");

      setTimeout(() => {
        formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 150);
    };

    window.addEventListener("assistant:fillForm", handleFillForm);
    return () => window.removeEventListener("assistant:fillForm", handleFillForm);
  }, []);

  const showMessage = (text, type = "success") => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: "", type: "" }), 3000);
  };

  const escapeHtml = (str) => {
    if (!str) return "";
    return str.replace(/[&<>]/g, function (m) {
      if (m === "&") return "&amp;";
      if (m === "<") return "&lt;";
      if (m === ">") return "&gt;";
      return m;
    });
  };

  const generateUniqueClientCode = async (name) => {
    const cleanName = name.trim();
    const parts = cleanName.split(/\s+/);

    let letters = "";

    if (parts.length === 1) {
      letters = parts[0].substring(0, 3).toUpperCase();
    } else {
      const firstWord = parts[0];
      const lastWord = parts[parts.length - 1];
      const firstLetter = firstWord.charAt(0).toUpperCase();
      const secondLetter = firstWord.charAt(1).toUpperCase() || "X";
      const lastLetter = lastWord.charAt(0).toUpperCase();
      letters = firstLetter + secondLetter + lastLetter;
    }

    while (letters.length < 3) {
      letters += "X";
    }

    let code = null;
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 100) {
      const numbers = Math.floor(100000 + Math.random() * 900000).toString();
      code = `${letters}${numbers}`;

      const { data: existing } = await supabase
        .from("clients")
        .select("client_code")
        .eq("client_code", code)
        .maybeSingle();

      if (!existing) isUnique = true;
      attempts++;
    }
    return code;
  };

  // RECHERCHE TICKETS
  const searchTickets = useCallback(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }
    const term = searchQuery.trim().toLowerCase();
    const clientMap = new Map();
    allClients.forEach((c) => clientMap.set(c.id, c));

    const isPhone = /^[\d\s\+\-\.]{6,}$/.test(searchQuery.trim());
    const filtered = allRepairs.filter((repair) => {
      const ticketMatch = repair.id.toString().includes(term) || `mbx-${repair.id}`.includes(term);
      const client = clientMap.get(repair.client_id);
      const clientName = client?.name?.toLowerCase() || "";
      const clientMatch = clientName.includes(term);
      const clientPhone = (client?.phone || "").replace(/\s/g, "");
      const searchPhone = searchQuery.trim().replace(/\s/g, "");
      const phoneMatch = isPhone && clientPhone === searchPhone;
      return ticketMatch || clientMatch || phoneMatch;
    });
    const results = filtered.map((repair) => ({
      ...repair,
      client: clientMap.get(repair.client_id) || { name: "Client inconnu", email: "" },
    }));
    setSearchResults(results);
    setShowResults(results.length > 0);
  }, [searchQuery, allRepairs, allClients]);

  useEffect(() => {
    const t = setTimeout(() => searchTickets(), 300);
    return () => clearTimeout(t);
  }, [searchQuery, searchTickets]);

  // RECHERCHE CLIENTS
  const searchClients = useCallback(async (term) => {
    if (!term.trim()) {
      setClientSuggestions([]);
      setShowClientSuggestions(false);
      setSelectedClientIndex(-1);
      return;
    }
    const companyId = typeof window !== "undefined" ? localStorage.getItem("company_id") : null;
    if (!companyId) return;

    const { data } = await supabase
      .from("clients")
      .select("id, name, phone, email")
      .eq("user_id", companyId)
      .or(`name.ilike.%${term}%, phone.ilike.%${term}%`)
      .limit(8);
    setClientSuggestions(data || []);
    setShowClientSuggestions(data && data.length > 0);
    setSelectedClientIndex(-1);
  }, []);

  const searchByPhone = useCallback(async (term) => {
    if (!term.trim()) {
      setPhoneSuggestions([]);
      setShowPhoneSuggestions(false);
      setSelectedPhoneIndex(-1);
      return;
    }
    const companyId = typeof window !== "undefined" ? localStorage.getItem("company_id") : null;
    if (!companyId) return;

    const { data } = await supabase
      .from("clients")
      .select("id, name, phone, email")
      .eq("user_id", companyId)
      .ilike("phone", `%${term}%`)
      .limit(5);
    setPhoneSuggestions(data || []);
    setShowPhoneSuggestions(data && data.length > 0);
    setSelectedPhoneIndex(-1);
  }, []);

  const handleClientKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (showClientSuggestions && clientSuggestions.length > 0) {
        setSelectedClientIndex((prev) => (prev + 1) % clientSuggestions.length);
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (showClientSuggestions && clientSuggestions.length > 0) {
        setSelectedClientIndex(
          (prev) => (prev - 1 + clientSuggestions.length) % clientSuggestions.length
        );
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (
        showClientSuggestions &&
        selectedClientIndex >= 0 &&
        clientSuggestions[selectedClientIndex]
      ) {
        selectClient(clientSuggestions[selectedClientIndex]);
      } else {
        phoneInputRef.current?.focus();
      }
    } else if (e.key === "Escape") {
      setShowClientSuggestions(false);
      setSelectedClientIndex(-1);
    }
  };

  const handlePhoneKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (showPhoneSuggestions && phoneSuggestions.length > 0) {
        setSelectedPhoneIndex((prev) => (prev + 1) % phoneSuggestions.length);
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (showPhoneSuggestions && phoneSuggestions.length > 0) {
        setSelectedPhoneIndex(
          (prev) => (prev - 1 + phoneSuggestions.length) % phoneSuggestions.length
        );
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (showPhoneSuggestions && selectedPhoneIndex >= 0 && phoneSuggestions[selectedPhoneIndex]) {
        selectPhoneSuggestion(phoneSuggestions[selectedPhoneIndex]);
      } else {
        emailInputRef.current?.focus();
      }
    } else if (e.key === "Escape") {
      setShowPhoneSuggestions(false);
      setSelectedPhoneIndex(-1);
    }
  };

  const handleEmailKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const numberInput = document.querySelector('input[type="number"]') as HTMLInputElement | null;
      if (numberInput) numberInput.focus();
    }
  };

  const handleClientSearch = (value) => {
    setIntakeClient(value);
    searchClients(value);
  };

  const handlePhoneSearch = (value) => {
    setIntakePhone(value);
    searchByPhone(value);
  };

  const selectClient = (client) => {
    setIntakeClient(client.name);
    setIntakePhone(client.phone || "");
    setIntakeEmail(client.email || "");
    setShowClientSuggestions(false);
    setShowPhoneSuggestions(false);
    setSelectedClientIndex(-1);
    phoneInputRef.current?.focus();
  };

  const selectPhoneSuggestion = (client) => {
    setIntakePhone(client.phone);
    setIntakeClient(client.name);
    setIntakeEmail(client.email || "");
    setShowPhoneSuggestions(false);
    setShowClientSuggestions(false);
    setSelectedPhoneIndex(-1);
  };

  const generateRepairSlots = () => {
    let count = Math.max(1, Number(desiredRepairCount) || 1);
    if (count > 20) {
      showMessage("Maximum 20 appareils par client", "error");
      count = 20;
      setDesiredRepairCount(20);
    }
    const newList = [];
    const now = Date.now();
    for (let i = 0; i < count; i++) {
      newList.push({
        device: "",
        issue: "",
        imei: "",
        code: "",
        estimatedPrice: "",
        unlockPattern: "",
        description: "",
        id: now + i,
      });
    }
    setRepairsList(newList);
    setDeviceSuggestionsMap({});
    setIssueSuggestionsMap({});
    setCodeSuggestionsMap({});
    setShowDeviceSuggestionsMap({});
    setShowIssueSuggestionsMap({});
    setShowCodeSuggestionsMap({});
    setDeviceCategoryMap({});
    setDeviceSuggestionIndex({});
    setIssueSuggestionIndex({});
    setCodeSuggestionIndex({});
    showMessage(`${count} emplacement(s) de réparation créé(s)`, "success");
  };

  const removeRepair = (id) => {
    if (repairsList.length === 1) {
      showMessage("Il doit y avoir au moins une réparation", "error");
      return;
    }
    setRepairsList((prev) => prev.filter((r) => r.id !== id));
  };

  const updateRepairField = (id, field, value) => {
    setRepairsList((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const getDeviceSuggestions = (input) => {
    if (!input.trim()) return [];
    const lower = input.toLowerCase();
    return allDevices.filter((d) => d.toLowerCase().includes(lower)).slice(0, 8);
  };

  const handleDeviceSearch = (id, value) => {
    updateRepairField(id, "device", value);
    const category = getCategoryFromDevice(value);
    setDeviceCategoryMap((prev) => ({ ...prev, [id]: category }));
    if (!value.trim()) {
      setDeviceSuggestionsMap((prev) => ({ ...prev, [id]: [] }));
      setShowDeviceSuggestionsMap((prev) => ({ ...prev, [id]: false }));
      return;
    }
    const filtered = getDeviceSuggestions(value);
    setDeviceSuggestionsMap((prev) => ({ ...prev, [id]: filtered }));
    setShowDeviceSuggestionsMap((prev) => ({ ...prev, [id]: filtered.length > 0 }));
  };

  const selectDevice = (id, device) => {
    updateRepairField(id, "device", device);
    const category = getCategoryFromDevice(device);
    setDeviceCategoryMap((prev) => ({ ...prev, [id]: category }));
    setShowDeviceSuggestionsMap((prev) => ({ ...prev, [id]: false }));
    const quickIssues = getQuickIssues(device);
    setIssueSuggestionsMap((prev) => ({ ...prev, [id]: quickIssues }));
    setShowIssueSuggestionsMap((prev) => ({ ...prev, [id]: false }));
  };

  const getIssueSuggestions = (input, deviceModel?: string) => {
    let results: string[];
    if (deviceModel) {
      results = getSmartIssueSuggestions(deviceModel, input);
    } else if (!input.trim()) {
      return [];
    } else {
      const lower = input.toLowerCase();
      results = allIssues.filter((i) => i.toLowerCase().includes(lower)).slice(0, 8);
    }
    return results.filter((s) => !hiddenIssues.has(s));
  };

  const handleIssueSearch = (id, value) => {
    updateRepairField(id, "issue", value);
    const deviceModel = repairsList.find((r) => r.id === id)?.device || "";
    if (!value.trim() && deviceModel) {
      const quick = getQuickIssues(deviceModel);
      setIssueSuggestionsMap((prev) => ({ ...prev, [id]: quick }));
      setShowIssueSuggestionsMap((prev) => ({ ...prev, [id]: true }));
      return;
    }
    if (!value.trim()) {
      setIssueSuggestionsMap((prev) => ({ ...prev, [id]: [] }));
      setShowIssueSuggestionsMap((prev) => ({ ...prev, [id]: false }));
      return;
    }
    const filtered = getIssueSuggestions(value, deviceModel || undefined);
    setIssueSuggestionsMap((prev) => ({ ...prev, [id]: filtered }));
    setShowIssueSuggestionsMap((prev) => ({ ...prev, [id]: filtered.length > 0 }));
  };

  const selectIssue = (id, issue) => {
    updateRepairField(id, "issue", issue);
    setShowIssueSuggestionsMap((prev) => ({ ...prev, [id]: false }));
  };

  const searchCodeSuggestions = (value, repairId) => {
    if (!value.trim()) {
      setCodeSuggestionsMap((prev) => ({ ...prev, [repairId]: [] }));
      setShowCodeSuggestionsMap((prev) => ({ ...prev, [repairId]: false }));
      return;
    }
    const filtered = allCodesList
      .filter((code) => code.toLowerCase().includes(value.toLowerCase()))
      .slice(0, 8);
    setCodeSuggestionsMap((prev) => ({ ...prev, [repairId]: filtered }));
    setShowCodeSuggestionsMap((prev) => ({ ...prev, [repairId]: filtered.length > 0 }));
  };

  const selectCodeForRepair = (repairId, code) => {
    updateRepairField(repairId, "code", code);
    setShowCodeSuggestionsMap((prev) => ({ ...prev, [repairId]: false }));
  };

  const addCustomDevice = async () => {
    if (!newDeviceInput.trim()) return;
    const newDevice = newDeviceInput.trim();
    const fullList = [...DEVICES_LIST, ...customDevices];
    if (fullList.some((d) => d.toLowerCase() === newDevice.toLowerCase())) {
      showMessage("Ce modèle existe déjà", "error");
      return;
    }
    await fetch("/api/catalog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "device", label: newDevice }),
    });
    const newList = [...customDevices, newDevice];
    setCustomDevices(newList);
    setNewDeviceInput("");
    setShowAddDevice(false);
    showMessage(`✅ "${newDevice}" ajouté`, "success");
    if (addModalSourceRepairId !== null) {
      const repair = repairsList.find((r) => r.id === addModalSourceRepairId);
      const currentVal = repair?.device || "";
      const updatedAll = [...DEVICES_LIST, ...newList];
      const filtered = currentVal.trim()
        ? updatedAll.filter((d) => d.toLowerCase().includes(currentVal.toLowerCase())).slice(0, 8)
        : updatedAll.filter((d) => d.toLowerCase().includes(newDevice.toLowerCase())).slice(0, 8);
      setDeviceSuggestionsMap((prev) => ({ ...prev, [addModalSourceRepairId]: filtered }));
      setShowDeviceSuggestionsMap((prev) => ({ ...prev, [addModalSourceRepairId]: filtered.length > 0 }));
    }
  };

  const addCustomIssue = async () => {
    if (!newIssueInput.trim()) return;
    const newIssue = newIssueInput.trim();
    if (allIssues.some((i) => i.toLowerCase() === newIssue.toLowerCase())) {
      showMessage("Cette panne existe déjà", "error");
      return;
    }
    await fetch("/api/catalog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "issue", label: newIssue }),
    });
    const newList = [...customIssues, newIssue];
    setCustomIssues(newList);
    setNewIssueInput("");
    showMessage(`✅ "${newIssue}" ajoutée`, "success");
    if (addModalSourceRepairId !== null) {
      const repair = repairsList.find((r) => r.id === addModalSourceRepairId);
      const currentVal = repair?.issue || "";
      const deviceModel = repair?.device || "";
      const filtered = getSmartIssueSuggestions(deviceModel, currentVal || newIssue);
      const withNew = [newIssue, ...filtered.filter((i) => i !== newIssue)].slice(0, 10);
      setIssueSuggestionsMap((prev) => ({ ...prev, [addModalSourceRepairId]: withNew }));
      setShowIssueSuggestionsMap((prev) => ({ ...prev, [addModalSourceRepairId]: true }));
    }
  };

  const addCustomCode = () => {
    if (!newCodeInput.trim()) return;
    const newCode = newCodeInput.trim();
    if (allCodesList.includes(newCode)) {
      showMessage("Ce code existe déjà", "error");
      return;
    }
    const newList = [...customCodesList, newCode];
    saveCustomCodes(newList);
    setNewCodeInput("");
    setShowAddCode(false);
    showMessage(`Code "${newCode}" ajouté`, "success");
  };

  const saveReceiptToSupabase = async (tickets, client) => {
    const companyId = typeof window !== "undefined" ? localStorage.getItem("company_id") : null;
    if (!companyId) return false;
    try {
      const receiptData = {
        receipt_number: `REC-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        user_id: companyId,
        client_name: client.name,
        client_phone: client.phone,
        client_email: client.email,
        tickets: tickets.map((t) => ({
          id: t.id,
          device: t.device,
          issue: t.issue,
          imei: t.imei || "NC",
          code: t.unlock_code || "NC",
          notes: t.description || "NC",
        })),
      };
      const { error } = await supabase.from("receipts").insert([receiptData]);
      if (error) throw error;
      return true;
    } catch (err) {
      console.error("Erreur sauvegarde reçu:", err);
      return false;
    }
  };

  const genererLienSuivi = async (repair, client) => {
    try {
      const { data: existingLink } = await supabase
        .from("tracking_links")
        .select("*")
        .eq("repair_id", repair.id)
        .eq("is_active", true)
        .maybeSingle();

      if (existingLink && new Date(existingLink.expires_at) > new Date()) {
        const existingUrl = `https://technophone.vercel.app/suivi/${existingLink.access_token}`;
        return existingUrl;
      }

      const token =
        Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);
      const newTrackingUrl = `https://technophone.vercel.app/suivi/${token}`;

      await supabase.from("tracking_links").insert({
        repair_id: repair.id,
        client_name: client.name,
        client_phone: client.phone,
        client_email: client.email,
        access_token: token,
        expires_at: expiresAt.toISOString(),
        is_active: true,
        view_count: 0,
      });

      return newTrackingUrl;
    } catch (error) {
      console.error("❌ Erreur:", error);
      return null;
    }
  };

  const generateCreditCardTicket = async (ticket, client, trackingUrl = null) => {
    const BASE_URL = "https://technophone.vercel.app";

    let qrTechUrl = null;
    try {
      qrTechUrl = await QRCode.toDataURL(`${BASE_URL}/repairs/${ticket.id}`, {
        width: 140, margin: 1,
        color: { dark: "#1e3a8a", light: "#ffffff" },
        errorCorrectionLevel: "M",
      });
    } catch (err) { console.error("QR tech:", err); }

    let qrClientUrl = null;
    if (client?.client_code) {
      try {
        qrClientUrl = await QRCode.toDataURL(`${BASE_URL}/suivi-client?code=${client.client_code}`, {
          width: 140, margin: 1,
          color: { dark: "#166534", light: "#ffffff" },
          errorCorrectionLevel: "H",
        });
      } catch (err) { console.error("QR client:", err); }
    }

    const rawCode = ticket.unlock_code || ticket.code || "";
    const hasCode = rawCode && rawCode !== "NC" && rawCode !== "Non fourni" && rawCode.trim() !== "";
    const codeValue = hasCode ? rawCode : null;
    const notesValue = ticket.description || ticket.notes || "";
    const note = notesValue && notesValue !== "NC" ? escapeHtml(notesValue) : "—";
    const dateStr = new Date().toLocaleDateString("fr-FR");
    const timeStr = new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

    return `<!DOCTYPE html>
    <html><head><meta charset="UTF-8"><title>Ticket MBX-${ticket.id}</title>
    <style>
      *{margin:0;padding:0;box-sizing:border-box}
      body{font-family:'Courier New',monospace;background:#e5e7eb;display:flex;justify-content:center;padding:16px}
      .wrapper{display:flex;flex-direction:column;align-items:center;gap:0;width:90mm}
      .tech-card{width:90mm;background:#fff;border-radius:4mm;padding:4mm;border:1px solid #c7d2fe}
      .tech-header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:1px solid #e0e7ff;padding-bottom:2mm;margin-bottom:2mm}
      .tech-header-left h2{font-size:11px;font-weight:900;color:#1e3a8a;letter-spacing:.5px}
      .tech-header-left p{font-size:8px;color:#64748b}
      .badge-tech{background:#1e3a8a;color:#fff;font-size:8px;font-weight:700;padding:1mm 2.5mm;border-radius:2mm}
      .ticket-id{text-align:center;font-size:20px;font-weight:900;color:#1e3a8a;letter-spacing:1px;padding:2mm 0;border-bottom:1px dashed #c7d2fe;margin-bottom:2mm}
      .row{display:flex;justify-content:space-between;align-items:flex-start;gap:3mm}
      .info-block{flex:1;font-size:8.5px;line-height:1.55}
      .lbl{font-weight:700;color:#334155;font-size:7.5px;text-transform:uppercase;letter-spacing:.5px}
      .val{color:#1e293b}
      .code-box{font-size:8px;padding:1.5mm 2mm;border-radius:2mm;margin-top:2mm;border-left:2.5px solid #22c55e;background:#f0fdf4;color:#166534}
      .code-box.no-code{border-left-color:#ef4444;background:#fef2f2;color:#991b1b;font-weight:700}
      .note-box{font-size:8px;background:#fffbeb;border-left:2.5px solid #f59e0b;padding:1.5mm 2mm;border-radius:2mm;margin-top:2mm;color:#78350f}
      .qr-tech-area{text-align:center;min-width:28mm}
      .qr-tech-area img{width:28mm;height:28mm;display:block}
      .qr-tech-label{font-size:6.5px;color:#1e3a8a;font-weight:700;text-align:center;margin-top:1mm;line-height:1.2}
      .tech-footer{display:flex;justify-content:space-between;font-size:7.5px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:1.5mm;margin-top:2mm}
      .cut{width:90mm;text-align:center;font-size:8px;color:#9ca3af;letter-spacing:2px;padding:1.5mm 0;border-top:1.5px dashed #9ca3af}
      .client-card{width:90mm;background:#fff;border-radius:4mm;padding:3mm 4mm;border:1px solid #bbf7d0}
      .client-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:2mm}
      .client-header-title{font-size:10px;font-weight:900;color:#166534}
      .client-header-title span{font-size:8px;font-weight:normal;color:#64748b;display:block}
      .badge-client{background:#166534;color:#fff;font-size:8px;font-weight:700;padding:1mm 2.5mm;border-radius:2mm}
      .client-info-row{display:flex;justify-content:space-between;align-items:flex-start;gap:3mm}
      .client-info-block{flex:1;font-size:8.5px;line-height:1.6}
      .client-code-big{font-size:15px;font-weight:900;color:#166534;letter-spacing:1px;margin:1mm 0}
      .qr-client-area{text-align:center;min-width:28mm}
      .qr-client-area img{width:28mm;height:28mm;display:block}
      .qr-client-label{font-size:6.5px;color:#166534;font-weight:700;text-align:center;margin-top:1mm;line-height:1.2}
      @media print{
        body{background:#fff;padding:0}
        .wrapper{gap:0}
        .no-print{display:none!important}
        .tech-card,.client-card,.cut{page-break-inside:avoid}
      }
      .no-print{text-align:center;margin-top:6mm;display:flex;gap:3mm;justify-content:center}
      button{padding:3mm 6mm;background:#1e3a8a;color:#fff;border:none;border-radius:3mm;font-size:10px;cursor:pointer}
      button.close{background:#64748b}
    </style></head>
    <body><div class="wrapper">
      <div class="tech-card">
        <div class="tech-header">
          <div class="tech-header-left">
            <h2>🔧 ${escapeHtml(companyInfo.name).substring(0, 22)}</h2>
            <p>${companyInfo.phone ? `📞 ${companyInfo.phone}` : ""} ${companyInfo.address ? `· ${companyInfo.address.substring(0, 25)}` : ""}</p>
          </div>
          <span class="badge-tech">ATELIER</span>
        </div>
        <div class="ticket-id">MBX-${ticket.id}</div>
        <div class="row">
          <div class="info-block">
            <div style="font-size:11px;font-weight:900;color:#1e293b;line-height:1.2">${escapeHtml(client.name).substring(0, 30)}</div>
            <div style="font-size:10px;font-weight:800;color:#1e3a8a;margin-top:1.5mm">${escapeHtml(ticket.device).substring(0, 28)}</div>
            <div style="font-size:9.5px;font-weight:700;color:#374151;margin-top:1mm;margin-bottom:2mm">${escapeHtml(ticket.issue).substring(0, 35)}</div>
            <div style="font-size:8px;color:#64748b">${escapeHtml(client.phone) || ""}</div>
            ${ticket.imei && ticket.imei !== "NC" ? `<div style="font-size:7.5px;color:#94a3b8;margin-top:1mm">IMEI : ${ticket.imei}</div>` : ""}
            ${codeValue ? `<div class="code-box">🔑 Code : ${escapeHtml(codeValue)}</div>` : ""}
            <div class="note-box">📝 ${note}</div>
          </div>
          <div class="qr-tech-area">
            ${qrTechUrl ? `<img src="${qrTechUrl}"/>` : ""}
            <div class="qr-tech-label">📲 Scanner pour<br>ouvrir la fiche</div>
          </div>
        </div>
        <div class="tech-footer">
          <span>⏱ ${dateStr} ${timeStr}</span>
          <span>Réparation · ${escapeHtml(companyInfo.name).substring(0, 15)}</span>
        </div>
      </div>
      <div class="cut">✂ - - - - - - - - -  DÉCOUPER · partie client  - - - - - - - - - ✂</div>
      <div class="client-card">
        <div class="client-header">
          <div class="client-header-title">
            🎫 MBX-${ticket.id}
            <span>${escapeHtml(ticket.device).substring(0, 30)} · ${dateStr}</span>
          </div>
          <span class="badge-client">CLIENT</span>
        </div>
        <div class="client-info-row">
          <div class="client-info-block">
            <div><span class="lbl">Client</span><br>${escapeHtml(client.name).substring(0, 28)}</div>
            <div style="margin-top:2mm"><span class="lbl">Panne déclarée</span><br>${escapeHtml(ticket.issue).substring(0, 30)}</div>
            ${ticket.estimated_price ? `<div style="margin-top:2mm"><span class="lbl">Prix estimé</span><br><span style="font-size:12px;font-weight:900;color:#166534">${Number(ticket.estimated_price).toFixed(2)} €</span></div>` : ""}
            ${!codeValue ? `<div style="font-size:7.5px;background:#fef2f2;border-left:2px solid #ef4444;color:#991b1b;font-weight:700;padding:1.5mm 2mm;border-radius:2mm;margin-top:2mm">⚠️ Appareil non testé — pas pris en garantie (code non fourni)</div>` : ""}
            <div style="margin-top:2mm">
              <span class="lbl">Votre code de suivi</span>
              <div class="client-code-big">${client.client_code || "—"}</div>
              <span style="font-size:7px;color:#64748b">→ technophone.vercel.app/suivi-client</span>
            </div>
          </div>
          <div class="qr-client-area">
            ${qrClientUrl ? `<img src="${qrClientUrl}"/>` : ""}
            <div class="qr-client-label">🔍 Suivre votre<br>réparation</div>
          </div>
        </div>
      </div>
      <div class="no-print">
        <button onclick="window.print()">🖨️ Imprimer</button>
        <button class="close" onclick="window.close()">✕ Fermer</button>
      </div>
    </div></body></html>`;
  };

  const printTicket = async (ticket, client, trackingUrl = null) => {
    try {
      const html = await generateCreditCardTicket(ticket, client, trackingUrl);

      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";

      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentWindow.document;
      iframeDoc.open();
      iframeDoc.write(html);
      iframeDoc.close();

      setTimeout(() => {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 1000);
      }, 500);
    } catch (error) {
      console.error("Erreur impression:", error);
      showMessage("Erreur lors de l'impression", "error");
    }
  };

  const sendEmailReceipt = async (tickets, client, recipientEmail, _trackingUrl?: string) => {
    if (!recipientEmail?.trim()) {
      showMessage("Adresse email requise", "error");
      return false;
    }
    setSendingEmail(true);
    try {
      const results = await Promise.all(
        tickets.map((t) =>
          fetch("/api/send-ticket-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ticketId: String(t.id),
              email: recipientEmail.trim(),
              atelierName: companyInfo.name,
              atelierPhone: companyInfo.phone,
              atelierAddress: companyInfo.address,
              atelierEmail: companyInfo.email,
            }),
          })
        )
      );
      const allOk = results.every((r) => r.ok);
      if (allOk) {
        showMessage(`✅ Email envoyé à ${recipientEmail}`, "success");
        return true;
      } else {
        showMessage("❌ Échec envoi email", "error");
        return false;
      }
    } catch (err) {
      console.error("sendEmailReceipt error:", err);
      showMessage("❌ Échec envoi email", "error");
      return false;
    } finally {
      setSendingEmail(false);
    }
  };

  const assignToConnectedTech = async (repairId, knownTech = undefined) => {
    const tech = getCurrentTechnician();
    if (!tech || tech.is_gerant) return;

    let oldTech = knownTech;
    if (oldTech === undefined) {
      const { data } = await supabase
        .from("repairs")
        .select("technician")
        .eq("id", repairId)
        .single();
      oldTech = data?.technician ?? null;
    }

    if (oldTech === tech.name) return;

    if (oldTech) {
      const ok = window.confirm(
        `Cette réparation est assignée à ${oldTech}.\nLa réassigner à vous (${tech.name}) ?`
      );
      if (!ok) return;
    }

    await supabase
      .from("repairs")
      .update({
        technician: tech.name,
        repaired_by: tech.name,
        assigned_at: new Date().toISOString(),
      })
      .eq("id", repairId);

    await addHistoriqueAction({
      repairId,
      action: "changement_technicien",
      description: `Assignation automatique à ${tech.name}`,
      oldValue: oldTech || "Non assigné",
      newValue: tech.name,
    });
  };

  const showTicketDetails = (ticket) => {
    setSelectedRepairDetail(ticket);
    setSelectedRepairClient(ticket.client);
    setClientEmail(ticket.client?.email || "");
    setShowDetailModal(true);
    setSearchQuery("");
    setShowResults(false);
  };

  const createIntake = async () => {
    const companyId = typeof window !== "undefined" ? localStorage.getItem("company_id") : null;
    if (!companyId) {
      showMessage("Session expirée, veuillez vous reconnecter", "error");
      return;
    }

    if (!intakeClient.trim()) {
      showMessage("Le nom du client est requis", "error");
      clientInputRef.current?.focus();
      return;
    }
    const hasEmptyRepair = repairsList.some((r) => !r.device.trim() || !r.issue.trim());
    if (hasEmptyRepair) {
      showMessage("Chaque réparation doit avoir un appareil et une panne", "error");
      return;
    }
    setLoading(true);
    try {
      const { data: existing, error: searchError } = await supabase
        .from("clients")
        .select("*")
        .eq("user_id", companyId)
        .ilike("name", intakeClient)
        .maybeSingle();

      if (searchError) throw new Error("Erreur recherche client: " + searchError.message);

      let clientId;
      let clientData;

      if (!existing) {
        const clientCode = await generateUniqueClientCode(intakeClient);
        const { data: newClient, error: insertError } = await supabase
          .from("clients")
          .insert([
            {
              name: intakeClient,
              phone: intakePhone || "NC",
              email: intakeEmail || "NC",
              user_id: companyId,
              client_code: clientCode,
            },
          ])
          .select()
          .single();

        if (insertError) throw insertError;
        clientId = newClient.id;
        clientData = newClient;
        showMessage(`✅ Code client généré: ${clientCode}`, "success");
      } else {
        clientId = existing.id;
        clientData = existing;
        if (
          (intakePhone && existing.phone !== intakePhone) ||
          (intakeEmail && existing.email !== intakeEmail)
        ) {
          await supabase
            .from("clients")
            .update({
              phone: intakePhone || existing.phone,
              email: intakeEmail || existing.email,
            })
            .eq("id", existing.id);
          clientData = {
            ...existing,
            phone: intakePhone || existing.phone,
            email: intakeEmail || existing.email,
          };
        }
      }

      const createdRepairs = [];
      for (const repair of repairsList) {
        const { data: newRepair, error: repairError } = await supabase
          .from("repairs")
          .insert([
            {
              client_id: clientId,
              device: repair.device,
              issue: repair.issue,
              imei: repair.imei || "NC",
              unlock_code: repair.code || "NC",
              unlock_pattern: repair.unlockPattern || "",
              description: repair.description || "NC",
              estimated_price: parseFloat(repair.estimatedPrice) || 0,
              final_price: 0,
              status: "🟡 Réceptionné",
              user_id: companyId,
            },
          ])
          .select()
          .single();

        if (repairError) throw repairError;
        createdRepairs.push(newRepair);
      }

      if (createdRepairs.length > 0 && clientData) {
        await saveReceiptToSupabase(createdRepairs, clientData);
      }

      showMessage(`✅ ${createdRepairs.length} ticket(s) créé(s)`, "success");
      setRecentTickets(createdRepairs);
      setEmailTo(clientData.email || "");
      setShowSuccessModal(true);

      setIntakeClient("");
      setIntakePhone("");
      setIntakeEmail("");
      setDesiredRepairCount(1);
      setRepairsList([
        {
          device: "",
          issue: "",
          imei: "",
          code: "",
          estimatedPrice: "",
          unlockPattern: "",
          description: "",
          id: Date.now(),
        },
      ]);
      setClientSuggestions([]);
      setPhoneSuggestions([]);
      setShowClientSuggestions(false);
      setShowPhoneSuggestions(false);
      clientInputRef.current?.focus();
    } catch (err) {
      console.error("❌ Erreur création:", err);
      showMessage("❌ Erreur: " + (err.message || "Erreur inconnue"), "error");
    } finally {
      setLoading(false);
    }
  };

  const handleNumberKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const firstRepair = repairRefs.current[0];
      if (firstRepair) firstRepair.focus();
    }
  };

  const statusColors = {
    "🟡 Réceptionné": "bg-yellow-500",
    "🔬 Diagnostic": "bg-blue-500",
    "✅ Validé client": "bg-green-500",
    "🔧 En réparation": "bg-cyan-500",
    "✅ Terminé": "bg-green-600",
    "📦 Rendu": "bg-gray-500",
    "❌ KO": "bg-red-500",
    "🚫 Refus client": "bg-pink-500",
    "🔐 Mot de passe incorrect": "bg-red-500",
    "📦 Attente pièce": "bg-purple-500",
    "⏳ Attente validation client": "bg-orange-500",
  };

  const inputCls ="w-full bg-[#1a1d2e] border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-gray-600 text-sm outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/15 transition-all duration-200";

  // SCANNER QR pour tickets (technicien)
  const handleQrScan = async (text: string) => {
    setShowScanner(false);
    if (!text) return;
    const value = text.trim();
    let repairId: string | null = null;

    const match = value.match(/\/repairs\/([^/?#]+)/);
    if (match) {
      repairId = match[1];
    } else if (/^\d+$/.test(value)) {
      repairId = value;
    } else {
      try {
        const url = new URL(value);
        if (url.pathname && url.pathname !== "/") {
          router.push(url.pathname + url.search);
          return;
        }
      } catch {
        // pas une URL
      }
    }

    if (repairId) {
      await assignToConnectedTech(repairId);
      router.push(`/repairs/${repairId}`);
    } else {
      alert("QR code non reconnu : " + value);
    }
  };

  // FONCTIONS VENTE PAR CODE-BARRES
  const searchProductByBarcode = async (barcode: string) => {
    if (!barcode.trim() || !userId) return;

    // QR multi-réparations : MBX-84,MBX-54
    if (/^(MBX-\d+,?)+$/i.test(barcode.trim())) {
      const ids = barcode.trim().split(",").map((s) => Number(s.replace(/^MBX-/i, "").trim())).filter(Boolean);
      if (ids.length > 1) {
        const { data } = await supabase.from("repairs").select("*,clients(id,name,phone,email)").in("id", ids).eq("user_id", userId);
        if (data && data.length > 0) {
          const sorted = ids.map((id) => data.find((r) => r.id === id)).filter(Boolean);
          const extras = sorted.slice(1).map((r) => ({ product: { id: r.id, name: `MBX-${r.id} — ${r.device}`, sale_price: r.final_price ?? r.estimated_price ?? 0, stock: 1, barcode: `MBX-${r.id}` } as any, quantity: 1 }));
          setDashCartItems((prev) => [...prev, ...extras]);
          setDashLinkedRepair(sorted[0]);
          setShowCartModal(true);
        } else showMessage("Réparations introuvables", "error");
        setBarcodeInput("");
        return;
      }
      // Code réparation unique MBX-xxx
      const repairId = ids[0];
      const { data } = await supabase.from("repairs").select("*,clients(id,name,phone,email)").eq("id", repairId).eq("user_id", userId).maybeSingle();
      if (data) { setDashLinkedRepair(data); setShowCartModal(true); }
      else showMessage(`Réparation MBX-${repairId} introuvable`, "error");
      setBarcodeInput("");
      return;
    }

    setIsScanning(true);
    try {
      const { data: results } = await supabase.from("products").select("*").eq("user_id", userId).eq("barcode", barcode.trim()).order("stock", { ascending: false });
      const data = results?.[0] ?? null;
      if (!data) {
        showMessage(`Produit non trouvé: ${barcode}`, "error");
      } else if (data.stock <= 0) {
        setOutOfStockProduct(data as Product);
      } else {
        setDashCartItems((prev) => {
          const idx = prev.findIndex((c) => c.product.id === data.id);
          if (idx >= 0) {
            const updated = [...prev];
            updated[idx] = { ...updated[idx], quantity: updated[idx].quantity + 1 };
            return updated;
          }
          return [...prev, { product: data as any, quantity: 1 }];
        });
        showMessage(`${data.name} ajouté au panier`, "success");
      }
    } catch (err) {
      console.error("Erreur recherche:", err);
      showMessage("Erreur lors de la recherche", "error");
    } finally {
      setIsScanning(false);
      setBarcodeInput("");
    }
  };


  const confirmSale = async () => {
    const items = dashCartItems.length > 0 ? dashCartItems : [];
    if (!items.length || !userId) return;

    const tech = getCurrentTechnician();
    const techName = tech?.name || "Boutique";

    for (const item of items) {
      const qty = item.quantity;
      if (qty > item.product.stock) {
        showMessage(`Stock insuffisant pour ${item.product.name} (${item.product.stock} dispo)`, "error");
        return;
      }
      const unit = Number(item.product.sale_price) || 0;
      const cost = Number(item.product.purchase_price) || 0;
      const { error: saleError } = await supabase.from("product_sales").insert({
        user_id: userId,
        product_id: item.product.id,
        product_name: item.product.name,
        quantity: qty,
        unit_price: unit,
        unit_cost: cost,
        total: unit * qty,
        sold_by: techName,
      });
      if (saleError) {
        console.error("Erreur vente:", saleError);
        showMessage("Erreur lors de la vente", "error");
        return;
      }
      await supabase.from("products").update({ stock: item.product.stock - qty }).eq("id", item.product.id);
    }

    const total = items.reduce((s, c) => s + Number(c.product.sale_price) * c.quantity, 0);
    showMessage(`✅ ${items.length} produit(s) vendu(s) — ${total.toFixed(2)} €`, "success");
    setDashCartItems([]);
  };

  return (
    <Layout>
      {/* SCANNER QR pour tickets */}
      {showScanner && (
        <QrScanner onScan={handleQrScan} onClose={() => setShowScanner(false)} />
      )}
      
      {/* MODAL SCANNER pour ventes */}
      {showBarcodeModal && (
        <QrScanner 
          onScan={(code) => {
            setShowBarcodeModal(false);
            searchProductByBarcode(code);
          }} 
          onClose={() => setShowBarcodeModal(false)} 
        />
      )}
      
      <style>{`
        @keyframes shimmer { 0% { transform: translateX(-150%); } 100% { transform: translateX(150%); } }
        @keyframes count-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .animate-shimmer { animation: shimmer 2.4s ease-in-out infinite; }
        .animate-count-in { animation: count-in 0.45s ease-out forwards; }
      `}</style>

      {message.text && (
        <div className={`fixed bottom-5 right-5 px-5 py-3.5 rounded-xl shadow-2xl z-50 border text-sm font-semibold tracking-tight flex items-center gap-2 ${
          message.type === "error" ? "bg-red-500/20 border-red-500/30 text-red-400" : "bg-green-500/20 border-green-500/30 text-green-400"
        }`}>
          {message.text}
        </div>
      )}

      {showReturnModal && selectedRepair && (
        <ReturnModal repair={selectedRepair} onClose={() => setShowReturnModal(false)}
          onSuccess={() => { setShowReturnModal(false); setSelectedRepair(null); loadAllData(); }} />
      )}

      {/* ========== HEADER AVEC SCANNER QR ET RECHERCHE ========== */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowScanner(true)}
          className="flex items-center gap-2 px-4 py-3 bg-orange-500/10 border border-orange-500/40 text-orange-300 rounded-xl text-sm font-semibold hover:bg-orange-500/20 hover:text-white transition-all duration-200 active:scale-95"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 7V5a1 1 0 011-1h2M4 17v2a1 1 0 001 1h2m10-16h2a1 1 0 011 1v2m-3 13h2a1 1 0 001-1v-2M7 12h10" />
          </svg>
          Scanner QR Ticket
          </button>
          {userId && <ClientResponsesBell userId={userId} />}
        </div>

        <div ref={searchContainerRef} className="relative w-full sm:w-96">
          <div className="flex items-center gap-3 bg-[#16161d] border border-white/10 rounded-xl px-4 py-3 focus-within:border-blue-500/50 focus-within:ring-2 focus-within:ring-blue-500/10 transition-all duration-200">
            <input autoComplete="new-password" 
              ref={searchInputRef} 
              className="flex-1 bg-transparent text-white placeholder-gray-600 text-sm outline-none"
              placeholder="Rechercher client, appareil, ticket..." 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
            />
            {searchQuery && (
              <button className="text-gray-500 hover:text-gray-300 transition flex-shrink-0" onClick={() => setSearchQuery("")}>
                ✕
              </button>
            )}
          </div>
          {showResults && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-[#16161d] border border-white/10 rounded-2xl shadow-2xl z-30 max-h-80 overflow-y-auto">
              <div className="px-4 py-2.5 border-b border-white/5">
                <span className="text-xs text-gray-500 font-semibold uppercase tracking-widest">{searchResults.length} résultat(s)</span>
              </div>
              <div className="divide-y divide-white/5">
                {searchResults.map((r) => (
                  <div key={r.id} className="px-4 py-3 hover:bg-white/5 cursor-pointer transition-all duration-150" onClick={() => showTicketDetails(r)}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-blue-400 text-sm">MBX-{r.id}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full text-white ${statusColors[r.status] || "bg-yellow-500"}`}>{r.status || "🟡 Réceptionné"}</span>
                      </div>
                      <span className="text-gray-500 text-xs">→</span>
                    </div>
                    <div className="text-gray-300 text-xs mt-0.5">{r.client?.name}</div>
                    <div className="text-gray-500 text-xs mt-0.5">📱 {r.device} · 🔧 {r.issue}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========== CAISSE ========== */}
      <div className="mb-8">
        <div className="bg-[#16161d] border border-white/8 rounded-2xl overflow-hidden shadow-xl">
          {/* Header Caisse */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/6">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-green-500/15 flex items-center justify-center">
                <ShoppingCart size={15} className="text-green-400" />
              </div>
              <span className="font-bold text-white text-sm">Caisse</span>
              {(dashCartItems.length > 0 || dashLinkedRepair) && (
                <span className="text-[10px] font-black bg-green-500 text-white px-2 py-0.5 rounded-full">
                  {dashCartItems.length + (dashLinkedRepair ? 1 : 0)}
                </span>
              )}
            </div>
            <button onClick={() => setShowCartModal(true)} className="text-xs text-green-400 hover:text-green-300 font-semibold transition">
              Ouvrir →
            </button>
          </div>

          {/* Barre code-barres */}
          <div className="px-5 py-3 border-b border-white/6">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 flex-1 bg-black/30 border border-white/8 rounded-xl px-3 py-2 focus-within:border-green-500/40 transition-all">
                <ScanLine size={14} className="text-gray-500 shrink-0" />
                <input autoComplete="new-password"
                  ref={barcodeInputRef}
                  type="text"
                  placeholder="Code-barres ou MBX-42..."
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && barcodeInput.trim()) {
                      searchProductByBarcode(barcodeInput);
                      setBarcodeInput("");
                    }
                  }}
                  className="flex-1 bg-transparent text-white text-sm outline-none placeholder-gray-600"
                />
              </div>
              <button
                onClick={() => setShowBarcodeModal(true)}
                className="p-2.5 bg-green-500/10 border border-green-500/20 text-green-400 rounded-xl hover:bg-green-500/20 transition"
              >
                <ScanLine size={15} />
              </button>
            </div>
          </div>

          {/* Alerte rupture de stock */}
          {outOfStockProduct && (
            <div className="mx-5 my-3 p-3 bg-amber-500/8 border border-amber-500/25 rounded-xl">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-amber-400 text-xs font-bold">⚠️ Rupture — {outOfStockProduct.name}</p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button onClick={() => { window.location.href = "/boutique"; }} className="px-2.5 py-1 bg-blue-500/15 text-blue-300 rounded-lg text-xs font-semibold border border-blue-500/20 transition hover:bg-blue-500/25">+ Stock</button>
                  <button onClick={() => { setDashCartItems((prev) => { const idx = prev.findIndex(c => c.product.id === outOfStockProduct!.id); if (idx >= 0) { const u = [...prev]; u[idx] = {...u[idx], quantity: u[idx].quantity + 1}; return u; } return [...prev, { product: outOfStockProduct as any, quantity: 1 }]; }); setOutOfStockProduct(null); }} className="px-2.5 py-1 bg-green-500/15 text-green-300 rounded-lg text-xs font-semibold border border-green-500/20 transition hover:bg-green-500/25">Ajouter</button>
                  <button onClick={() => setOutOfStockProduct(null)} className="p-1 hover:bg-white/10 rounded-lg transition"><X size={12} className="text-gray-500" /></button>
                </div>
              </div>
            </div>
          )}


          {/* Items panier */}
          {(dashCartItems.length > 0 || dashLinkedRepair) && (
            <div className="px-5 py-3 space-y-1.5">
              {dashLinkedRepair && (
                <div className="flex items-center gap-2 py-1.5">
                  <span className="font-mono text-[11px] text-indigo-400 shrink-0 bg-indigo-500/10 px-2 py-0.5 rounded-md">MBX-{dashLinkedRepair.id}</span>
                  <span className="text-gray-200 text-sm flex-1 truncate">{dashLinkedRepair.device}</span>
                  <span className="text-indigo-300 text-sm font-bold shrink-0">{Number(dashLinkedRepair.final_price ?? dashLinkedRepair.estimated_price ?? 0).toFixed(2)} €</span>
                  <button onClick={() => setDashLinkedRepair(null)} className="p-1 hover:bg-white/10 rounded-md transition"><X size={12} className="text-gray-500" /></button>
                </div>
              )}
              {dashCartItems.map((item, i) => (
                <div key={i} className="flex items-center gap-2 py-1.5">
                  <span className="text-gray-200 text-sm flex-1 truncate">{item.product.name}</span>
                  <span className="text-gray-500 text-xs shrink-0">× {item.quantity}</span>
                  <span className="text-green-400 text-sm font-bold shrink-0 w-16 text-right">{(Number(item.product.sale_price) * item.quantity).toFixed(2)} €</span>
                  <button onClick={() => setDashCartItems((prev) => prev.filter((_, j) => j !== i))} className="p-1 hover:bg-white/10 rounded-md transition"><X size={12} className="text-gray-500" /></button>
                </div>
              ))}
            </div>
          )}

          {/* Footer total + actions */}
          <div className="px-5 py-4 bg-black/20 flex items-center justify-between gap-3">
            {(dashCartItems.length > 0 || dashLinkedRepair) ? (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-white font-black text-lg">
                    {(Number(dashLinkedRepair?.final_price ?? dashLinkedRepair?.estimated_price ?? 0) + dashCartItems.reduce((s, c) => s + Number(c.product.sale_price) * c.quantity, 0)).toFixed(2)} €
                  </span>
                  <button onClick={() => { setDashCartItems([]); setDashLinkedRepair(null); }} className="p-1 hover:bg-red-500/15 rounded-lg transition" title="Vider">
                    <X size={13} className="text-red-400/60 hover:text-red-400" />
                  </button>
                </div>
                <button onClick={() => setShowCartModal(true)} className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-xl text-sm font-bold transition-all active:scale-95 shadow-lg shadow-green-900/30">
                  <Check size={15} /> Valider · Imprimer
                </button>
              </>
            ) : (
              <p className="text-gray-600 text-xs">Scanner un code-barres ou MBX-xxx pour commencer</p>
            )}
          </div>
        </div>
      </div>

      {showCartModal && (
        <CartValidationModal
          cartItems={dashCartItems as any}
          setCartItems={setDashCartItems as any}
          linkedRepair={dashLinkedRepair}
          setLinkedRepair={setDashLinkedRepair}
          products={dashProducts as any}
          userId={userId}
          soldBy={(() => { const t = getCurrentTechnician(); return t?.name || "Dashboard"; })()}
          onClose={() => { setShowCartModal(false); }}
          onSuccess={() => { setDashCartItems([]); setDashLinkedRepair(null); }}
        />
      )}

      {/* ========== SECTION NOUVELLE RÉPARATION ========== */}
      <div className="flex items-center gap-2 mb-4">
        <span className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
        <h2 className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Nouvelle réparation</h2>
      </div>

      <div ref={formRef} className="bg-[#16161d] border border-white/5 rounded-2xl overflow-hidden shadow-xl mb-6">
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 px-6 py-5">
          <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "18px 18px" }} />
          <h2 className="relative text-white font-black text-xl tracking-tight">✨ Nouvelle Réparation</h2>
          <p className="relative text-white/60 text-sm mt-0.5">Multi-appareils supporté</p>
        </div>

        <div className="p-6 space-y-6">
          {/* CLIENT - garder ton code existant */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">👤 Client</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="relative">
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Nom *</label>
                <input autoComplete="new-password" ref={clientInputRef} className={inputCls} placeholder="Nom du client"
                  value={intakeClient} onChange={(e) => handleClientSearch(e.target.value)}
                  onKeyDown={handleClientKeyDown} />
                {showClientSuggestions && clientSuggestions.length > 0 && (
                  <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-[#2d3159] border border-white/10 rounded-xl shadow-2xl max-h-48 overflow-auto">
                    <div className="divide-y divide-white/5 p-1">
                      {clientSuggestions.map((c, idx) => (
                        <div key={c.id}
                          className={`py-2.5 px-4 rounded-lg cursor-pointer text-sm transition-colors duration-150 ${selectedClientIndex === idx ? "bg-blue-500/20 text-blue-300" : "hover:bg-blue-500/10 hover:text-blue-400 text-gray-300"}`}
                          onMouseDown={() => selectClient(c)}>
                          <div className="font-medium">{c.name}</div>
                          {c.phone !== "NC" && <div className="text-xs text-gray-500">{c.phone}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="relative">
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Téléphone</label>
                <input autoComplete="new-password" ref={phoneInputRef} className={inputCls} placeholder="06 12 34 56 78"
                  value={intakePhone} onChange={(e) => handlePhoneSearch(e.target.value)}
                  onKeyDown={handlePhoneKeyDown} />
                {showPhoneSuggestions && phoneSuggestions.length > 0 && (
                  <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-[#2d3159] border border-white/10 rounded-xl shadow-2xl max-h-48 overflow-auto">
                    <div className="divide-y divide-white/5 p-1">
                      {phoneSuggestions.map((c, idx) => (
                        <div key={c.id}
                          className={`py-2.5 px-4 rounded-lg cursor-pointer text-sm transition-colors duration-150 ${selectedPhoneIndex === idx ? "bg-blue-500/20 text-blue-300" : "hover:bg-blue-500/10 hover:text-blue-400 text-gray-300"}`}
                          onMouseDown={() => selectPhoneSuggestion(c)}>
                          <div className="font-medium">{c.phone}</div>
                          <div className="text-xs text-gray-500">{c.name}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Email</label>
                <input autoComplete="new-password" ref={emailInputRef} className={inputCls} placeholder="client@email.com"
                  value={intakeEmail} onChange={(e) => setIntakeEmail(e.target.value)} onKeyDown={handleEmailKeyDown} />
              </div>
            </div>
          </div>

          {/* DEVICE COUNT */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">📱 Appareils</h3>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 bg-black/20 border border-white/10 rounded-xl px-4 py-2.5">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Nombre :</span>
                <input autoComplete="new-password" type="number" min={1} max={20} value={desiredRepairCount}
                  onChange={(e) => setDesiredRepairCount(Number(e.target.value))}
                  className="w-12 bg-transparent text-white text-sm text-center outline-none font-bold"
                  onKeyDown={handleNumberKeyDown} />
              </div>
              <button type="button" onClick={generateRepairSlots}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:from-blue-500 hover:to-purple-500 transition-all duration-200 active:scale-95 flex items-center gap-1.5">
                ✨ Générer
              </button>
              <span className="text-xs text-gray-500">{repairsList.length} appareil(s)</span>
            </div>
          </div>

          {/* REPAIR CARDS - garder ton code existant */}
          <div className="space-y-4">
            {repairsList.map((repair, idx) => (
              <div key={repair.id} className="bg-[#1a1d2e] border border-white/5 hover:border-blue-500/20 rounded-2xl overflow-hidden transition-all duration-200">
                <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/5 px-5 pt-4 pb-3 flex items-center justify-between">
                  <span className="text-xs font-black bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent tracking-tight">
                    Appareil #{idx + 1}
                  </span>
                  {repairsList.length > 1 && (
                    <button onClick={() => removeRepair(repair.id)} className="text-xs text-gray-500 hover:text-red-400 transition-colors duration-150">
                      🗑 Supprimer
                    </button>
                  )}
                </div>

                <div className="px-5 pb-5 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">
                        Modèle *
                        <button type="button" onClick={() => { setAddModalSourceRepairId(repair.id); setNewDeviceInput(repair.device || ""); setShowAddDevice(true); }}
                          className="w-4 h-4 rounded-full bg-white/10 hover:bg-blue-500/30 hover:text-blue-400 text-gray-500 flex items-center justify-center text-[10px] font-black transition-colors leading-none">+</button>
                      </label>
                      <div className="relative">
                        <input autoComplete="new-password" className={inputCls} placeholder="iPhone 15 Pro Max..." value={repair.device}
                          onChange={(e) => handleDeviceSearch(repair.id, e.target.value)} />
                        {showDeviceSuggestionsMap[repair.id] && deviceSuggestionsMap[repair.id]?.length > 0 && (
                          <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-[#2d3159] border border-white/10 rounded-xl shadow-2xl max-h-40 overflow-auto">
                            <div className="divide-y divide-white/5 p-1">
                              {deviceSuggestionsMap[repair.id].map((d, i) => (
                                <div key={i} className="py-2.5 px-4 rounded-lg cursor-pointer hover:bg-blue-500/10 hover:text-blue-400 text-gray-300 text-sm transition-colors duration-150"
                                  onMouseDown={() => selectDevice(repair.id, d)}>📱 {d}</div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">
                        Panne *
                        <button type="button" onClick={() => { setAddModalSourceRepairId(repair.id); setNewIssueInput(repair.issue || ""); setShowAddIssue(true); }}
                          className="w-4 h-4 rounded-full bg-white/10 hover:bg-blue-500/30 hover:text-blue-400 text-gray-500 flex items-center justify-center text-[10px] font-black transition-colors leading-none">+</button>
                        {repair.device && (
                          <span className="text-[10px] font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded-full normal-case tracking-normal">
                            ✨ Suggestions auto
                          </span>
                        )}
                      </label>
                      <div className="relative">
                        <input autoComplete="new-password"
                          className={inputCls}
                          placeholder={repair.device ? "Tapez ou cliquez pour voir les pannes fréquentes…" : "Écran cassé, batterie…"}
                          value={repair.issue}
                          onChange={(e) => handleIssueSearch(repair.id, e.target.value)}
                          onFocus={() => {
                            if (repair.device) {
                              const quick = getQuickIssues(repair.device).filter((s) => !hiddenIssues.has(s));
                              setIssueSuggestionsMap((prev) => ({ ...prev, [repair.id]: quick }));
                              setShowIssueSuggestionsMap((prev) => ({ ...prev, [repair.id]: true }));
                            }
                          }}
                          onBlur={() => setTimeout(() => setShowIssueSuggestionsMap((prev) => ({ ...prev, [repair.id]: false })), 150)}
                        />
                        {showIssueSuggestionsMap[repair.id] && issueSuggestionsMap[repair.id]?.length > 0 && (
                          <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-[#16161d] border border-white/10 rounded-xl shadow-2xl max-h-52 overflow-auto">
                            {repair.device && !repair.issue && (
                              <div className="px-3 pt-2 pb-1 text-[10px] font-bold text-blue-400/70 uppercase tracking-widest border-b border-white/5">
                                Pannes fréquentes — {repair.device}
                              </div>
                            )}
                            <div className="divide-y divide-white/5 p-1">
                              {issueSuggestionsMap[repair.id].map((iss, i) => (
                                <div
                                  key={i}
                                  className="py-2 px-3 rounded-lg cursor-pointer hover:bg-blue-500/10 hover:text-blue-300 text-gray-300 text-sm transition-colors duration-100 flex items-center gap-2"
                                  onMouseDown={() => selectIssue(repair.id, iss)}
                                >
                                  <span className="text-[11px] text-blue-400/50">
                                    {iss.startsWith("Remplacement") ? "🔩" : "🔧"}
                                  </span>
                                  {iss}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Notes</label>
                    <textarea rows={3} className={`${inputCls} resize-none`} placeholder="Description / observations..."
                      value={repair.description || ""} onChange={(e) => updateRepairField(repair.id, "description", e.target.value)} />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Prix (€)</label>
                      <input autoComplete="new-password" className={inputCls} placeholder="0" type="number" value={repair.estimatedPrice}
                        onChange={(e) => updateRepairField(repair.id, "estimatedPrice", e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">IMEI</label>
                      <input autoComplete="new-password" className={inputCls} placeholder="15 chiffres" value={repair.imei}
                        onChange={(e) => updateRepairField(repair.id, "imei", e.target.value)} maxLength={15} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Code</label>
                      <div className="relative">
                        <input autoComplete="new-password" className={inputCls} placeholder="PIN..." value={repair.code}
                          onChange={(e) => { updateRepairField(repair.id, "code", e.target.value); searchCodeSuggestions(e.target.value, repair.id); }} />
                        {showCodeSuggestionsMap[repair.id] && codeSuggestionsMap[repair.id]?.length > 0 && (
                          <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-[#2d3159] border border-white/10 rounded-xl shadow-2xl max-h-40 overflow-auto">
                            <div className="divide-y divide-white/5 p-1">
                              {codeSuggestionsMap[repair.id].map((code, i) => (
                                <div key={i} className="py-2.5 px-4 rounded-lg cursor-pointer hover:bg-blue-500/10 hover:text-blue-400 text-gray-300 text-sm transition-colors duration-150"
                                  onMouseDown={() => selectCodeForRepair(repair.id, code)}>🔑 {code}</div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-white/5 pt-4">
                    <PatternLock
                      onComplete={(pattern) => updateRepairField(repair.id, "unlockPattern", pattern.join("-"))}
                      onClear={() => updateRepairField(repair.id, "unlockPattern", "")} />
                    <p className="text-[10px] text-blue-400/60 mt-1.5">⚠️ NON FOURNI — Test impossible, pas pris en garantie</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button onClick={createIntake} disabled={loading}
            className="relative w-full overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:opacity-90 hover:scale-[1.01] hover:shadow-lg hover:shadow-purple-500/30 active:scale-[0.99] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
            <span className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/15 to-transparent pointer-events-none" />
            <span className="relative">{loading ? "⏳ Création en cours..." : `🎫 Créer ${repairsList.length} ticket(s)  →`}</span>
          </button>
        </div>
      </div>

      {/* ADD MODALS - garder ton code existant */}
      {showAddDevice && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowAddDevice(false)}>
          <div className="bg-[#16161d] border-t-2 border-t-blue-500 border border-white/10 rounded-2xl p-5 w-full max-w-sm shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white tracking-tight">Modèles personnalisés</h3>
              <button onClick={() => setShowAddDevice(false)} className="w-7 h-7 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-gray-400 transition text-xs">✕</button>
            </div>
            <div className="flex gap-2 mb-4">
              <input autoComplete="new-password" type="text" className={`${inputCls} flex-1 !py-2.5`} placeholder="Ex: Samsung Galaxy S25"
                value={newDeviceInput} onChange={(e) => setNewDeviceInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addCustomDevice()} autoFocus />
              <button onClick={addCustomDevice} className="px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold transition-colors">+</button>
            </div>
            {customDevices.length > 0 && (
              <div>
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Mes modèles ({customDevices.length})</div>
                <div className="max-h-52 overflow-auto space-y-1">
                  {customDevices.map((d, i) => (
                    <div key={i} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2 group">
                      <span className="text-sm text-gray-300">{d}</span>
                      <button onClick={async () => {
                          await fetch("/api/catalog", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "device", label: d }) });
                          setCustomDevices((prev) => prev.filter((_, j) => j !== i));
                        }}
                        className="w-5 h-5 rounded-full bg-red-500/0 hover:bg-red-500/20 text-gray-600 hover:text-red-400 flex items-center justify-center text-xs transition-colors opacity-0 group-hover:opacity-100">✕</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {customDevices.length === 0 && (
              <p className="text-xs text-gray-600 text-center py-2">Aucun modèle personnalisé</p>
            )}
          </div>
        </div>
      )}

      {showAddIssue && (() => {
        const sourceRepair = repairsList.find((r) => r.id === addModalSourceRepairId);
        const deviceModel = sourceRepair?.device || "";
        const catalogSuggestions = deviceModel
          ? getSmartIssueSuggestions(deviceModel, "")
          : [...defaultIssues];
        const allSuggestions = [
          ...customIssues.filter((c) => !catalogSuggestions.includes(c)),
          ...catalogSuggestions,
        ];
        const visibleSuggestions = allSuggestions.filter((s) => !hiddenIssues.has(s));
        const hiddenList = allSuggestions.filter((s) => hiddenIssues.has(s));
        return (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowAddIssue(false)}>
            <div className="bg-[#16161d] border-t-2 border-t-blue-500 border border-white/10 rounded-2xl p-5 w-full max-w-md shadow-2xl max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4 shrink-0">
                <div>
                  <h3 className="text-sm font-bold text-white tracking-tight">Gérer les pannes</h3>
                  {deviceModel && <p className="text-[10px] text-blue-400/70 mt-0.5">{deviceModel}</p>}
                </div>
                <button onClick={() => setShowAddIssue(false)} className="w-7 h-7 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-gray-400 transition text-xs">✕</button>
              </div>

              <div className="flex gap-2 mb-4 shrink-0">
                <input autoComplete="new-password" type="text" className={`${inputCls} flex-1 !py-2.5`} placeholder="Ajouter une panne…"
                  value={newIssueInput} onChange={(e) => setNewIssueInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addCustomIssue()} autoFocus />
                <button onClick={addCustomIssue} className="px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold transition-colors">+</button>
              </div>

              <div className="overflow-auto flex-1 space-y-3">
                {visibleSuggestions.length > 0 && (
                  <div>
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                      Suggestions actives ({visibleSuggestions.length})
                    </div>
                    <div className="space-y-1">
                      {visibleSuggestions.map((iss, i) => (
                        <div key={i} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2 group hover:bg-white/8">
                          <span className="text-sm text-gray-300 flex-1 mr-2">{iss}</span>
                          <button onClick={() => hideIssue(iss)}
                            className="w-5 h-5 rounded-full bg-red-500/0 hover:bg-red-500/20 text-gray-600 hover:text-red-400 flex items-center justify-center text-xs transition-all opacity-0 group-hover:opacity-100 shrink-0">✕</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {hiddenList.length > 0 && (
                  <div>
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                      Masquées ({hiddenList.length}) — clic pour restaurer
                    </div>
                    <div className="space-y-1">
                      {hiddenList.map((iss, i) => (
                        <div key={i} className="flex items-center justify-between bg-white/3 rounded-lg px-3 py-2 group hover:bg-white/6 opacity-50 hover:opacity-80 cursor-pointer"
                          onClick={() => restoreIssue(iss)}>
                          <span className="text-sm text-gray-500 line-through flex-1 mr-2">{iss}</span>
                          <span className="text-[10px] text-gray-600 group-hover:text-blue-400 transition-colors shrink-0">↩ restaurer</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {showAddCode && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-[#16161d] border-t-2 border-t-blue-500 border border-white/10 rounded-2xl p-6 w-96 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white tracking-tight">➕ Ajouter un code</h3>
              <button onClick={() => setShowAddCode(false)} className="w-7 h-7 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-gray-400 transition text-xs">✕</button>
            </div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Code téléphone</label>
            <input autoComplete="new-password" type="text" className={`${inputCls} mb-4`} placeholder="Ex: 2580"
              value={newCodeInput} onChange={(e) => setNewCodeInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCustomCode()} />
            <div className="flex gap-2">
              <button onClick={addCustomCode} className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2.5 rounded-xl font-semibold text-sm hover:from-blue-500 hover:to-purple-500 transition-all duration-200">Ajouter</button>
              <button onClick={() => setShowAddCode(false)} className="flex-1 bg-white/5 hover:bg-white/10 text-gray-300 py-2.5 rounded-xl font-semibold text-sm border border-white/10 transition-all duration-200">Annuler</button>
            </div>
          </div>
        </div>
      )}

      {/* DETAIL MODAL */}
      {showDetailModal && selectedRepairDetail && selectedRepairClient && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setShowDetailModal(false)}>
          <div className="bg-[#16161d] border-t-2 border-t-blue-500 border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-[#16161d] border-b border-white/10 px-5 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">🔧 Détail MBX-{selectedRepairDetail.id}</h2>
                <p className="text-gray-400 text-sm">{selectedRepairClient.name}</p>
              </div>
              <button onClick={() => setShowDetailModal(false)} className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-gray-400 transition text-sm">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-bold text-white ${statusColors[selectedRepairDetail.status] || "bg-gray-500"}`}>
                  {selectedRepairDetail.status || "📥 Réceptionné"}
                </span>
                <span className="text-xs text-gray-500">#{selectedRepairDetail.id}</span>
              </div>
              <div className="bg-black/20 border border-white/10 rounded-xl p-4 space-y-1.5">
                <div className="font-semibold text-white">👤 {selectedRepairClient.name}</div>
                {selectedRepairClient.phone !== "NC" && <div className="text-sm text-gray-400">📞 {selectedRepairClient.phone}</div>}
                {selectedRepairClient.email !== "NC" && <div className="text-sm text-gray-400">✉️ {selectedRepairClient.email}</div>}
                {selectedRepairClient.client_code && <div className="text-sm font-mono text-blue-400">🔑 Code : {selectedRepairClient.client_code}</div>}
              </div>
              <div className="bg-black/20 border border-white/10 rounded-xl overflow-hidden">
                {[
                  { label: "📱 Appareil", value: selectedRepairDetail.device },
                  { label: "🔧 Panne", value: selectedRepairDetail.issue },
                  selectedRepairDetail.imei && selectedRepairDetail.imei !== "NC" ? { label: "🔍 IMEI", value: selectedRepairDetail.imei } : null,
                  selectedRepairDetail.technician ? { label: "👷 Technicien", value: selectedRepairDetail.technician } : null,
                  { label: "💰 Prix estimé", value: selectedRepairDetail.estimated_price ? `${Number(selectedRepairDetail.estimated_price).toFixed(2)} €` : "—" },
                  selectedRepairDetail.final_price ? { label: "✅ Prix final", value: `${Number(selectedRepairDetail.final_price).toFixed(2)} €` } : null,
                ].filter(Boolean).map((row, i, arr) => (
                  <div key={i} className={`grid grid-cols-2 ${i < arr.length - 1 ? "border-b border-white/10" : ""}`}>
                    <div className="px-4 py-2.5 text-gray-400 text-xs font-semibold uppercase tracking-widest bg-white/5">{row!.label}</div>
                    <div className="px-4 py-2.5 text-white text-sm">{row!.value}</div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 flex-wrap">
                <button onClick={async () => {
                  const { data: clientData } = await supabase.from("clients").select("*").eq("id", selectedRepairDetail.client_id).single();
                  if (clientData) {
                    const trackingUrl = await genererLienSuivi(selectedRepairDetail, clientData);
                    printTicket(selectedRepairDetail, clientData, trackingUrl);
                  }
                }} className="flex-1 bg-gradient-to-r from-blue-600 to-blue-500 text-white py-2.5 rounded-xl font-semibold text-sm hover:from-blue-500 hover:to-blue-400 transition-all duration-200">
                  🖨️ Imprimer ticket
                </button>
                <button onClick={async () => { await assignToConnectedTech(selectedRepairDetail.id, selectedRepairDetail.technician ?? null); setShowDetailModal(false); window.location.href = `/repairs/${selectedRepairDetail.id}`; }}
                  className="flex-1 bg-gradient-to-r from-orange-600 to-orange-500 text-white py-2.5 rounded-xl font-semibold text-sm hover:from-orange-500 hover:to-orange-400 transition-all duration-200">
                  🔧 Ouvrir fiche
                </button>
              </div>
              {!["📦 Rendu", "❌ KO", "🚫 Refus client"].includes(selectedRepairDetail.status) && (
                <button onClick={async () => {
                  const { error } = await supabase.from("repairs").update({ status: "📦 Rendu" }).eq("id", selectedRepairDetail.id);
                  if (!error) {
                    setSelectedRepairDetail({ ...selectedRepairDetail, status: "📦 Rendu" });
                    setAllRepairs((prev) => prev.map((r) => r.id === selectedRepairDetail.id ? { ...r, status: "📦 Rendu" } : r));
                    showMessage("✅ Statut mis à jour : Rendu", "success");
                  }
                }} className="w-full bg-gray-600 hover:bg-gray-500 text-white py-2.5 rounded-xl font-semibold text-sm transition-all duration-200">
                  📦 Marquer comme Rendu au client
                </button>
              )}
              <button onClick={() => setShowDetailModal(false)}
                className="w-full bg-white/5 hover:bg-white/10 text-gray-300 py-2 rounded-xl font-semibold text-sm border border-white/10 transition-all duration-200">
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUCCESS MODAL */}
      {showSuccessModal && recentTickets.length > 0 && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#16161d] border-t-2 border-t-blue-500 border border-white/10 rounded-2xl shadow-2xl p-6 max-w-md w-full">
            <div className="text-center mb-5">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center text-4xl mx-auto mb-3 border border-green-500/30 animate-pulse">🎉</div>
              <h2 className="text-xl font-black text-white tracking-tight">{recentTickets.length} ticket(s) créé(s)</h2>
              <p className="text-gray-400 text-sm mt-1">Impression ou envoi par email</p>
            </div>
            <div className="bg-black/20 rounded-xl border border-white/5 p-3 mb-5 max-h-40 overflow-auto space-y-0.5">
              {recentTickets.map((ticket) => (
                <div key={ticket.id} className="flex justify-between items-center py-1.5 px-2 rounded-lg hover:bg-white/5">
                  <span className="font-mono font-bold text-blue-400 text-sm">MBX-{ticket.id}</span>
                  <span className="text-gray-400 text-sm">{ticket.device}</span>
                </div>
              ))}
            </div>
            <div className="space-y-2.5">
              <button onClick={async () => {
                const clientId = recentTickets[0]?.client_id;
                if (clientId) {
                  const { data: clientData } = await supabase.from("clients").select("*").eq("id", clientId).single();
                  if (clientData) {
                    for (const ticket of recentTickets) {
                      const trackingUrl = await genererLienSuivi(ticket, clientData);
                      await printTicket(ticket, clientData, trackingUrl);
                      await new Promise((r) => setTimeout(r, 1000));
                    }
                    showMessage(`${recentTickets.length} ticket(s) imprimé(s)`, "success");
                  }
                }
              }} className="w-full bg-gradient-to-r from-blue-600 to-blue-500 text-white py-3 rounded-xl font-bold hover:from-blue-500 hover:to-blue-400 transition-all duration-200 text-sm flex items-center justify-center gap-2">
                🖨️ Imprimer ({recentTickets.length})
              </button>
              <button onClick={async () => {
                const clientId = recentTickets[0]?.client_id;
                if (clientId) {
                  const { data: clientData } = await supabase.from("clients").select("*").eq("id", clientId).single();
                  if (clientData) {
                    let email = emailTo;
                    if (!email || email === "NC") {
                      email = prompt("Entrez l'email du client:", clientData.email !== "NC" ? clientData.email : "");
                      if (!email) return;
                    }
                    const trackingUrl = await genererLienSuivi(recentTickets[0], clientData);
                    await sendEmailReceipt(recentTickets, clientData, email, trackingUrl);
                  }
                }
              }} className="w-full bg-gradient-to-r from-green-600 to-green-500 text-white py-3 rounded-xl font-bold hover:from-green-500 hover:to-green-400 transition-all duration-200 text-sm flex items-center justify-center gap-2">
                ✉️ Envoyer par email
              </button>
              <button onClick={() => { setShowSuccessModal(false); setRecentTickets([]); }}
                className="w-full bg-white/5 hover:bg-white/10 text-gray-300 py-3 rounded-xl font-semibold border border-white/10 transition-all duration-200 text-sm">
                ✕ Fermer
              </button>
            </div>
          </div>
        </div>
      )}

    </Layout>
  );
}