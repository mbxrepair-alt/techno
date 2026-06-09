"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { supabase, getCurrentUser } from "../../lib/supabase";
import { useRouter } from "next/navigation";
import Layout from "../../components/Layout";
import emailjs from "@emailjs/browser";
import QRCode from "qrcode";
import ReturnModal from "../../components/ReturnModal";
import PatternLock from "../../components/PatternLock";
import type { ExtractedFormData } from "../../lib/ai";

export default function Dashboard() {
  const router = useRouter();
  const clientInputRef = useRef(null);
  const phoneInputRef = useRef(null);
  const emailInputRef = useRef(null);
  const repairRefs = useRef([]);
  const searchInputRef = useRef(null);
  const searchContainerRef = useRef(null);
  const formRef = useRef<HTMLDivElement>(null);

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
  const defaultDevices = [
    "iPhone 16 Pro Max",
    "iPhone 16 Pro",
    "iPhone 16 Plus",
    "iPhone 16",
    "iPhone 15 Pro Max",
    "iPhone 15 Pro",
    "iPhone 15 Plus",
    "iPhone 15",
    "iPhone 14 Pro Max",
    "iPhone 14 Pro",
    "iPhone 14 Plus",
    "iPhone 14",
    "iPhone 13 Pro Max",
    "iPhone 13 Pro",
    "iPhone 13",
    "iPhone 12 Pro Max",
    "iPhone 12 Pro",
    "iPhone 12",
    "iPhone 11 Pro Max",
    "iPhone 11 Pro",
    "iPhone 11",
    "iPhone SE 2022",
    "iPhone SE 2020",
    "Galaxy S24 Ultra",
    "Galaxy S24 Plus",
    "Galaxy S24",
    "Galaxy S23 Ultra",
    "Galaxy S23 Plus",
    "Galaxy S23",
    "Galaxy S22 Ultra",
    "Galaxy S22 Plus",
    "Galaxy S22",
    "Galaxy A54",
    "Galaxy A34",
    "Galaxy A14",
    "Xiaomi 14 Ultra",
    "Xiaomi 14 Pro",
    "Xiaomi 14",
    "Xiaomi 13 Pro",
    "Xiaomi 13",
    "Pixel 9 Pro",
    "Pixel 9",
    "Pixel 8 Pro",
    "Pixel 8",
    "OnePlus 12",
    "OnePlus 11",
    "Huawei P60 Pro",
    "Huawei P50",
    "Oppo Find X6",
    "Oppo Reno 10",
  ];

  const [customDevices, setCustomDevices] = useState([]);
  const allDevices = [...defaultDevices, ...customDevices];

  useEffect(() => {
    const savedDevices = localStorage.getItem("mbx_custom_devices");
    if (savedDevices) setCustomDevices(JSON.parse(savedDevices));
    const savedIssues = localStorage.getItem("mbx_custom_issues");
    if (savedIssues) setCustomIssues(JSON.parse(savedIssues));
    const savedCodes = localStorage.getItem("mbx_custom_codes");
    if (savedCodes) setCustomCodesList(JSON.parse(savedCodes));
  }, []);

  const saveCustomDevices = (newList) => {
    setCustomDevices(newList);
    localStorage.setItem("mbx_custom_devices", JSON.stringify(newList));
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
  const allIssues = [...defaultIssues, ...customIssues];

  const saveCustomIssues = (newList) => {
    setCustomIssues(newList);
    localStorage.setItem("mbx_custom_issues", JSON.stringify(newList));
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
  const [deviceCategoryMap, setDeviceCategoryMap] = useState({});
  const [deviceSuggestionIndex, setDeviceSuggestionIndex] = useState({});
  const [issueSuggestionIndex, setIssueSuggestionIndex] = useState({});
  const [codeSuggestionIndex, setCodeSuggestionIndex] = useState({});

  const [recentTickets, setRecentTickets] = useState([]);
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

  // EmailJS
  const EMAILJS_PUBLIC_KEY = "DezSbYxdfKhdK_HlF";
  const EMAILJS_SERVICE_ID = "service_1e02n3f";
  const EMAILJS_TEMPLATE_ID = "template_9q8ge09";

  // Charger les infos de l'atelier
  useEffect(() => {
    const loadCompanyInfo = async () => {
      const user = await getCurrentUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("company_name, contact_phone, contact_address, email")
          .eq("id", user.id)
          .single();

        if (profile) {
          setCompanyInfo({
            name: profile.company_name || "MBX Réparations",
            phone: profile.contact_phone || "",
            email: profile.email || user.email,
            address: profile.contact_address || "",
            siret: profile.siret || "",
          });
        }
      }
    };
    loadCompanyInfo();
  }, []);

  useEffect(() => {
    if (clientInputRef.current) clientInputRef.current.focus();
  }, []);

  // Charger toutes les données pour la recherche
  const loadAllData = async () => {
    const user = await getCurrentUser();
    if (!user) return;

    const { data: repairsData } = await supabase
      .from("repairs")
      .select("*")
      .eq("user_id", user.id)
      .order("id", { ascending: false });

    const { data: clientsData } = await supabase
      .from("clients")
      .select("id, name, phone, email, client_code")
      .eq("user_id", user.id);

    if (repairsData) setAllRepairs(repairsData);
    if (clientsData) setAllClients(clientsData);
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Listen for "assistant:fillForm" events dispatched by AssistantPro
  useEffect(() => {
    const handleFillForm = (e: Event) => {
      const data = (e as CustomEvent<ExtractedFormData>).detail;
      if (!data) return;

      // Fill client fields
      if (data.clientName) setIntakeClient(data.clientName);
      if (data.clientPhone) setIntakePhone(data.clientPhone);
      if (data.clientEmail) setIntakeEmail(data.clientEmail);

      // Build pre-filled repair slots in one atomic update
      // (equivalent to generateRepairSlots() followed by updateRepairField() for each field)
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

      // Reset all suggestion dropdowns
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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

    const filtered = allRepairs.filter((repair) => {
      const ticketMatch = repair.id.toString().includes(term) || `mbx-${repair.id}`.includes(term);
      const client = clientMap.get(repair.client_id);
      const clientName = client?.name?.toLowerCase() || "";
      const clientMatch = clientName.includes(term);
      const deviceMatch = repair.device?.toLowerCase().includes(term) || false;
      const issueMatch = repair.issue?.toLowerCase().includes(term) || false;
      return ticketMatch || clientMatch || deviceMatch || issueMatch;
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
    const user = await getCurrentUser();
    if (!user) return;

    const { data } = await supabase
      .from("clients")
      .select("id, name, phone, email")
      .eq("user_id", user.id)
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
    const user = await getCurrentUser();
    if (!user) return;

    const { data } = await supabase
      .from("clients")
      .select("id, name, phone, email")
      .eq("user_id", user.id)
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
  };

  const getIssueSuggestions = (input) => {
    if (!input.trim()) return [];
    const lower = input.toLowerCase();
    return allIssues.filter((i) => i.toLowerCase().includes(lower)).slice(0, 8);
  };

  const handleIssueSearch = (id, value) => {
    updateRepairField(id, "issue", value);
    if (!value.trim()) {
      setIssueSuggestionsMap((prev) => ({ ...prev, [id]: [] }));
      setShowIssueSuggestionsMap((prev) => ({ ...prev, [id]: false }));
      return;
    }
    const filtered = getIssueSuggestions(value);
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

  const addCustomDevice = () => {
    if (!newDeviceInput.trim()) return;
    const newDevice = newDeviceInput.trim();
    if (allDevices.includes(newDevice)) {
      showMessage("Ce modèle existe déjà", "error");
      return;
    }
    const newList = [...customDevices, newDevice];
    saveCustomDevices(newList);
    setNewDeviceInput("");
    setShowAddDevice(false);
    showMessage(`Modèle "${newDevice}" ajouté`, "success");
  };

  const addCustomIssue = () => {
    if (!newIssueInput.trim()) return;
    const newIssue = newIssueInput.trim();
    if (allIssues.includes(newIssue)) {
      showMessage("Cette panne existe déjà", "error");
      return;
    }
    const newList = [...customIssues, newIssue];
    saveCustomIssues(newList);
    setNewIssueInput("");
    setShowAddIssue(false);
    showMessage(`Panne "${newIssue}" ajoutée`, "success");
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

  // Sauvegarde reçu dans Supabase
  const saveReceiptToSupabase = async (tickets, client) => {
    const user = await getCurrentUser();
    if (!user) return false;
    try {
      const receiptData = {
        receipt_number: `REC-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        user_id: user.id,
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

  // GÉNÉRER OU RÉCUPÉRER LE LIEN DE SUIVI
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

  // Générer TICKET (2 parties : technicien + client)
  const generateCreditCardTicket = async (ticket, client, trackingUrl = null) => {
    const BASE_URL = "https://technophone.vercel.app";

    // QR 1 — Technicien : accès direct à la fiche réparation (scan zipette)
    let qrTechUrl = null;
    try {
      qrTechUrl = await QRCode.toDataURL(`${BASE_URL}/repairs/${ticket.id}`, {
        width: 140, margin: 1,
        color: { dark: "#1e3a8a", light: "#ffffff" },
        errorCorrectionLevel: "M",
      });
    } catch (err) { console.error("QR tech:", err); }

    // QR 2 — Client : suivi de réparation
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

      /* ── PARTIE TECHNICIEN ── */
      .tech-card{width:90mm;background:#fff;border-radius:4mm 4mm 0 0;padding:4mm;border:1px solid #c7d2fe;border-bottom:none}
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
      .note-box{font-size:8px;background:#fffbeb;border-left:2.5px solid #f59e0b;padding:1.5mm 2mm;border-radius:2mm;margin-top:2mm;color:#78350f}
      .qr-tech-area{text-align:center;min-width:28mm}
      .qr-tech-area img{width:28mm;height:28mm;display:block}
      .qr-tech-label{font-size:6.5px;color:#1e3a8a;font-weight:700;text-align:center;margin-top:1mm;line-height:1.2}
      .tech-footer{display:flex;justify-content:space-between;font-size:7.5px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:1.5mm;margin-top:2mm}

      /* ── LIGNE DE DÉCOUPE ── */
      .cut{width:90mm;text-align:center;font-size:8px;color:#9ca3af;letter-spacing:3px;padding:2mm 0;border-top:1px dashed #9ca3af;border-bottom:1px dashed #9ca3af;background:#f9fafb}

      /* ── PARTIE CLIENT ── */
      .client-card{width:90mm;background:#fff;border-radius:0 0 4mm 4mm;padding:3mm 4mm;border:1px solid #bbf7d0;border-top:none}
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

      <!-- PARTIE TECHNICIEN -->
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
            <div><span class="lbl">Client</span><br><span class="val">${escapeHtml(client.name).substring(0, 30)}</span></div>
            <div style="margin-top:2mm"><span class="lbl">Téléphone</span><br><span class="val">${escapeHtml(client.phone) || "—"}</span></div>
            <div style="margin-top:2mm"><span class="lbl">Appareil</span><br><span class="val">${escapeHtml(ticket.device).substring(0, 28)}</span></div>
            <div style="margin-top:2mm"><span class="lbl">Panne</span><br><span class="val">${escapeHtml(ticket.issue).substring(0, 32)}</span></div>
            ${ticket.imei && ticket.imei !== "NC" ? `<div style="margin-top:2mm"><span class="lbl">IMEI</span><br><span class="val">${ticket.imei}</span></div>` : ""}
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

      <!-- LIGNE DE DÉCOUPE -->
      <div class="cut">✂ &nbsp; &nbsp; À remettre au client &nbsp; &nbsp; ✂</div>

      <!-- PARTIE CLIENT -->
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

  const sendEmailReceipt = async (tickets, client, recipientEmail, trackingUrl = null) => {
    if (!recipientEmail || !recipientEmail.trim()) {
      showMessage("Adresse email requise", "error");
      return false;
    }
    setSendingEmail(true);
    try {
      const repairsHtml = tickets
        .map(
          (t) => `
        <div style="border-bottom:1px solid #ccc; margin-bottom:10px; padding-bottom:8px;">
          <strong>🔧 Ticket MBX-${t.id}</strong><br/>
          📱 Appareil : ${escapeHtml(t.device)}<br/>
          ⚠️ Panne : ${escapeHtml(t.issue)}<br/>
          🔢 IMEI : ${escapeHtml(t.imei || "NC")}<br/>
          🔑 Code : ${escapeHtml(t.unlock_code || "NC")}<br/>
          📝 Notes : ${escapeHtml(t.description || "Aucune")}
        </div>
      `
        )
        .join("");

      const templateParams = {
        company_name: companyInfo.name,
        company_address: companyInfo.address,
        company_phone: companyInfo.phone,
        company_email: companyInfo.email,
        company_siret: companyInfo.siret,
        client_name: client.name,
        client_phone: client.phone,
        client_email: client.email,
        client_code: client.client_code,
        date: new Date().toLocaleString("fr-FR"),
        repairs_html: repairsHtml,
        tracking_url: trackingUrl || "",
        to_email: recipientEmail.trim(),
        year: new Date().getFullYear(),
      };
      await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        templateParams,
        EMAILJS_PUBLIC_KEY
      );
      showMessage(`✅ Email envoyé à ${recipientEmail}`, "success");
      return true;
    } catch (err) {
      console.error("Erreur EmailJS:", err);
      showMessage(`❌ Échec envoi email`, "error");
      return false;
    } finally {
      setSendingEmail(false);
    }
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
    const user = await getCurrentUser();
    if (!user) {
      showMessage("Utilisateur non authentifié", "error");
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
        .eq("user_id", user.id)
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
              user_id: user.id,
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
              user_id: user.id,
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

  return (
    <Layout>
      {/* ── KEYFRAMES ── */}
      <style>{`
        @keyframes shimmer { 0% { transform: translateX(-150%); } 100% { transform: translateX(150%); } }
        @keyframes count-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .animate-shimmer { animation: shimmer 2.4s ease-in-out infinite; }
        .animate-count-in { animation: count-in 0.45s ease-out forwards; }
      `}</style>

      {/* ── TOAST ── */}
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

      {/* ── SUCCESS MODAL ── */}
      {showSuccessModal && recentTickets.length > 0 && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#232742] border-t-2 border-t-blue-500 border border-white/10 rounded-2xl shadow-2xl p-6 max-w-md w-full">
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

      {/* ════════════════ HEADER ════════════════ */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          {companyInfo.phone && (
            <span className="text-xs text-gray-400 bg-white/5 border border-white/10 rounded-full px-3 py-1">📞 {companyInfo.phone}</span>
          )}
        </div>
        <div ref={searchContainerRef} className="relative w-full sm:w-96">
          <div className="flex items-center gap-3 bg-[#232742] border border-white/10 rounded-xl px-4 py-3 focus-within:border-blue-500/50 focus-within:ring-2 focus-within:ring-blue-500/10 transition-all duration-200">
            <input ref={searchInputRef} className="flex-1 bg-transparent text-white placeholder-gray-600 text-sm outline-none"
              placeholder="Rechercher client, appareil, ticket..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            {searchQuery && <button className="text-gray-500 hover:text-gray-300 transition flex-shrink-0" onClick={() => setSearchQuery("")}>✕</button>}
          </div>
          {showResults && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-[#232742] border border-white/10 rounded-2xl shadow-2xl z-30 max-h-80 overflow-y-auto">
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

      {/* ════════════════ SECTION LABEL ════════════════ */}
      <div className="flex items-center gap-2 mb-4">
        <span className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
        <h2 className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Nouvelle réparation</h2>
      </div>

      {/* ════════════════ FORM ════════════════ */}
      <div ref={formRef} className="bg-[#232742] border border-white/5 rounded-2xl overflow-hidden shadow-xl mb-6">

        {/* FORM HEADER */}
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 px-6 py-5">
          <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "18px 18px" }} />
          <h2 className="relative text-white font-black text-xl tracking-tight">✨ Nouvelle Réparation</h2>
          <p className="relative text-white/60 text-sm mt-0.5">Multi-appareils supporté</p>
        </div>

        <div className="p-6 space-y-6">

          {/* CLIENT */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">👤 Client</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">

              <div className="relative">
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Nom *</label>
                <input ref={clientInputRef} className={inputCls} placeholder="Nom du client"
                  value={intakeClient} onChange={(e) => handleClientSearch(e.target.value)}
                  onKeyDown={handleClientKeyDown} autoComplete="off" />
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
                <input ref={phoneInputRef} className={inputCls} placeholder="06 12 34 56 78"
                  value={intakePhone} onChange={(e) => handlePhoneSearch(e.target.value)}
                  onKeyDown={handlePhoneKeyDown} autoComplete="off" />
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
                <input ref={emailInputRef} className={inputCls} placeholder="client@email.com"
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
                <input type="number" min={1} max={20} value={desiredRepairCount}
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

          {/* REPAIR CARDS */}
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
                      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Modèle *</label>
                      <div className="relative">
                        <input className={inputCls} placeholder="iPhone 15 Pro Max..." value={repair.device}
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
                      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Panne *</label>
                      <div className="relative">
                        <input className={inputCls} placeholder="Écran cassé, batterie..." value={repair.issue}
                          onChange={(e) => handleIssueSearch(repair.id, e.target.value)} />
                        {showIssueSuggestionsMap[repair.id] && issueSuggestionsMap[repair.id]?.length > 0 && (
                          <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-[#2d3159] border border-white/10 rounded-xl shadow-2xl max-h-40 overflow-auto">
                            <div className="divide-y divide-white/5 p-1">
                              {issueSuggestionsMap[repair.id].map((iss, i) => (
                                <div key={i} className="py-2.5 px-4 rounded-lg cursor-pointer hover:bg-blue-500/10 hover:text-blue-400 text-gray-300 text-sm transition-colors duration-150"
                                  onMouseDown={() => selectIssue(repair.id, iss)}>🔧 {iss}</div>
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
                      <input className={inputCls} placeholder="0" type="number" value={repair.estimatedPrice}
                        onChange={(e) => updateRepairField(repair.id, "estimatedPrice", e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">IMEI</label>
                      <input className={inputCls} placeholder="15 chiffres" value={repair.imei}
                        onChange={(e) => updateRepairField(repair.id, "imei", e.target.value)} maxLength={15} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Code</label>
                      <div className="relative">
                        <input className={inputCls} placeholder="PIN..." value={repair.code}
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

          {/* SUBMIT */}
          <button onClick={createIntake} disabled={loading}
            className="relative w-full overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:opacity-90 hover:scale-[1.01] hover:shadow-lg hover:shadow-purple-500/30 active:scale-[0.99] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
            <span className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/15 to-transparent pointer-events-none" />
            <span className="relative">{loading ? "⏳ Création en cours..." : `🎫 Créer ${repairsList.length} ticket(s)  →`}</span>
          </button>
        </div>
      </div>

      {/* ── ADD MODALS ── */}
      {showAddDevice && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-[#232742] border-t-2 border-t-blue-500 border border-white/10 rounded-2xl p-6 w-96 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white tracking-tight">➕ Ajouter un modèle</h3>
              <button onClick={() => setShowAddDevice(false)} className="w-7 h-7 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-gray-400 transition text-xs">✕</button>
            </div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Nom du modèle</label>
            <input type="text" className={`${inputCls} mb-4`} placeholder="Ex: Samsung Galaxy S25"
              value={newDeviceInput} onChange={(e) => setNewDeviceInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCustomDevice()} />
            <div className="flex gap-2">
              <button onClick={addCustomDevice} className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2.5 rounded-xl font-semibold text-sm hover:from-blue-500 hover:to-purple-500 transition-all duration-200">Ajouter</button>
              <button onClick={() => setShowAddDevice(false)} className="flex-1 bg-white/5 hover:bg-white/10 text-gray-300 py-2.5 rounded-xl font-semibold text-sm border border-white/10 transition-all duration-200">Annuler</button>
            </div>
          </div>
        </div>
      )}

      {showAddIssue && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-[#232742] border-t-2 border-t-blue-500 border border-white/10 rounded-2xl p-6 w-96 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white tracking-tight">➕ Ajouter une panne</h3>
              <button onClick={() => setShowAddIssue(false)} className="w-7 h-7 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-gray-400 transition text-xs">✕</button>
            </div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Nom de la panne</label>
            <input type="text" className={`${inputCls} mb-4`} placeholder="Ex: Circuit audio HS"
              value={newIssueInput} onChange={(e) => setNewIssueInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCustomIssue()} />
            <div className="flex gap-2">
              <button onClick={addCustomIssue} className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2.5 rounded-xl font-semibold text-sm hover:from-blue-500 hover:to-purple-500 transition-all duration-200">Ajouter</button>
              <button onClick={() => setShowAddIssue(false)} className="flex-1 bg-white/5 hover:bg-white/10 text-gray-300 py-2.5 rounded-xl font-semibold text-sm border border-white/10 transition-all duration-200">Annuler</button>
            </div>
          </div>
        </div>
      )}

      {showAddCode && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-[#232742] border-t-2 border-t-blue-500 border border-white/10 rounded-2xl p-6 w-96 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white tracking-tight">➕ Ajouter un code</h3>
              <button onClick={() => setShowAddCode(false)} className="w-7 h-7 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-gray-400 transition text-xs">✕</button>
            </div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Code téléphone</label>
            <input type="text" className={`${inputCls} mb-4`} placeholder="Ex: 2580"
              value={newCodeInput} onChange={(e) => setNewCodeInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCustomCode()} />
            <div className="flex gap-2">
              <button onClick={addCustomCode} className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2.5 rounded-xl font-semibold text-sm hover:from-blue-500 hover:to-purple-500 transition-all duration-200">Ajouter</button>
              <button onClick={() => setShowAddCode(false)} className="flex-1 bg-white/5 hover:bg-white/10 text-gray-300 py-2.5 rounded-xl font-semibold text-sm border border-white/10 transition-all duration-200">Annuler</button>
            </div>
          </div>
        </div>
      )}

      {/* ── DETAIL MODAL ── */}
      {showDetailModal && selectedRepairDetail && selectedRepairClient && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setShowDetailModal(false)}>
          <div className="bg-[#232742] border-t-2 border-t-blue-500 border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-[#232742] border-b border-white/10 px-5 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">🔧 Détail MBX-{selectedRepairDetail.id}</h2>
                <p className="text-gray-400 text-sm">{selectedRepairClient.name}</p>
              </div>
              <button onClick={() => setShowDetailModal(false)} className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-gray-400 transition text-sm">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-black/20 border border-white/10 rounded-xl p-4 space-y-1.5">
                <div className="font-semibold text-white">👤 {selectedRepairClient.name}</div>
                {selectedRepairClient.phone !== "NC" && <div className="text-sm text-gray-400">📞 {selectedRepairClient.phone}</div>}
                {selectedRepairClient.email !== "NC" && <div className="text-sm text-gray-400">✉️ {selectedRepairClient.email}</div>}
                {selectedRepairClient.client_code && <div className="text-sm font-mono text-blue-400">🔑 Code : {selectedRepairClient.client_code}</div>}
              </div>
              <div className="bg-black/20 border border-white/10 rounded-xl overflow-hidden">
                <div className="grid grid-cols-2 border-b border-white/10">
                  <div className="px-4 py-3 text-gray-400 text-xs font-semibold uppercase tracking-widest bg-white/5">📱 Appareil</div>
                  <div className="px-4 py-3 text-white text-sm">{selectedRepairDetail.device}</div>
                </div>
                <div className="grid grid-cols-2">
                  <div className="px-4 py-3 text-gray-400 text-xs font-semibold uppercase tracking-widest bg-white/5">🔧 Panne</div>
                  <div className="px-4 py-3 text-white text-sm">{selectedRepairDetail.issue}</div>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={async () => {
                  const { data: clientData } = await supabase.from("clients").select("*").eq("id", selectedRepairDetail.client_id).single();
                  if (clientData) {
                    const trackingUrl = await genererLienSuivi(selectedRepairDetail, clientData);
                    printTicket(selectedRepairDetail, clientData, trackingUrl);
                  }
                }} className="flex-1 bg-gradient-to-r from-blue-600 to-blue-500 text-white py-2.5 rounded-xl font-semibold text-sm hover:from-blue-500 hover:to-blue-400 transition-all duration-200">
                  🖨️ Imprimer ticket
                </button>
                <button onClick={() => setShowDetailModal(false)}
                  className="flex-1 bg-white/5 hover:bg-white/10 text-gray-300 py-2.5 rounded-xl font-semibold text-sm border border-white/10 transition-all duration-200">
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </Layout>
  );
}
