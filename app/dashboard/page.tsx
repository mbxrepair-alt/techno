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
          .select("company_name, contact_phone, contact_address, email, siret")
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

  // Générer TICKET
  const generateCreditCardTicket = async (ticket, client, trackingUrl = null) => {
    let qrCodeDataUrl = null;
    if (client && client.client_code) {
      try {
        const suiviClientUrl = `https://technophone.vercel.app/suivi-client?code=${client.client_code}`;
        qrCodeDataUrl = await QRCode.toDataURL(suiviClientUrl, {
          width: 120,
          margin: 2,
          color: { dark: "#000000", light: "#ffffff" },
          errorCorrectionLevel: "H",
        });
      } catch (err) {
        console.error("Erreur génération QR Code:", err);
      }
    }

    let codeValue = ticket.unlock_code || ticket.code || "NC";
    if (
      codeValue === "" ||
      codeValue === "NC" ||
      codeValue === null ||
      codeValue === "Non fourni"
    ) {
      codeValue = "⚠️ NON FOURNI - Test impossible, pas pris en garantie";
    }

    const notesValue = ticket.description || ticket.notes || "";
    const descriptionFinale =
      notesValue && notesValue !== "" && notesValue !== "NC"
        ? `📝 ${notesValue}`
        : "📝 Aucune note spécifique";

    return `<!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Ticket suivi - ${companyInfo.name}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Courier New', monospace; background: #f0f0f0; display: flex; justify-content: center; align-items: center; min-height: 100vh; padding: 20px; }
        .card { width: 90mm; min-height: 64mm; background: white; border-radius: 5mm; padding: 4mm; box-shadow: 0 2px 5px rgba(0,0,0,0.1); display: flex; flex-direction: column; justify-content: space-between; }
        .cut-line { text-align: center; font-size: 8px; color: #ccc; margin-bottom: 2mm; letter-spacing: 2px; }
        .header { text-align: center; border-bottom: 1px solid #ddd; padding-bottom: 2mm; margin-bottom: 2mm; }
        .header h2 { font-size: 12px; font-weight: bold; margin: 0; }
        .header p { font-size: 9px; color: #666; margin: 2px 0; }
        .ticket-number { text-align: center; background: #f5f5f5; padding: 3mm; border-radius: 3mm; margin-bottom: 3mm; font-size: 11px; font-weight: bold; }
        .client-info { font-size: 9px; margin-bottom: 3mm; line-height: 1.4; background: #fafafa; padding: 3mm; border-radius: 2mm; }
        .client-info .label { font-weight: bold; background: #e0e0e0; padding: 1px 3px; border-radius: 2px; display: inline-block; margin-bottom: 2px; }
        .client-info .code-value { font-size: 12px; font-weight: bold; color: #2563eb; }
        .device-info { font-size: 9px; margin-bottom: 3mm; background: #fafafa; padding: 3mm; border-radius: 2mm; }
        .device-info .label { font-weight: bold; background: #e0e0e0; padding: 1px 3px; border-radius: 2px; display: inline-block; }
        .middle-section { display: flex; gap: 4mm; align-items: flex-start; justify-content: space-between; margin-bottom: 3mm; }
        .left-info { flex: 1; }
        .qr-area { text-align: center; min-width: 35mm; }
        .qr-area img { width: 30mm; height: 30mm; }
        .qr-text { font-size: 7px; color: #2563eb; text-align: center; margin-top: 1mm; font-weight: bold; }
        .notes { font-size: 8px; background: #fff8e1; padding: 2mm; border-radius: 2mm; margin-bottom: 3mm; border-left: 2px solid #ffc107; white-space: pre-line; }
        .code-info { font-size: 8px; background: ${codeValue.includes("NON FOURNI") ? "#ffebee" : "#e8f5e9"}; padding: 2mm; border-radius: 2mm; margin-bottom: 3mm; border-left: 2px solid ${codeValue.includes("NON FOURNI") ? "#f44336" : "#4caf50"}; font-weight: ${codeValue.includes("NON FOURNI") ? "bold" : "normal"}; }
        .footer { display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #ddd; padding-top: 2mm; font-size: 8px; color: #666; }
        @media print { body { background: white; margin: 0; padding: 0; } .card { box-shadow: none; page-break-after: avoid; page-break-inside: avoid; } .no-print { display: none; } }
        .no-print { text-align: center; margin-top: 5mm; }
        button { padding: 4mm 6mm; margin: 0 2mm; background: #333; color: white; border: none; border-radius: 3mm; font-size: 10px; cursor: pointer; }
      </style>
    </head>
    <body>
      <div>
        <div class="cut-line">----- Ticket à découper -----</div>
        <div class="card">
          <div class="header">
            <h2>🔧 ${companyInfo.name.substring(0, 22)}</h2>
            <p>${companyInfo.phone ? `📞 ${companyInfo.phone}` : ""}</p>
            <p>${companyInfo.address ? `${companyInfo.address.substring(0, 30)}` : ""}</p>
          </div>
          <div class="ticket-number">🎫 MBX-${ticket.id}</div>
          <div class="client-info">
            <span class="label">👤 Client</span> ${escapeHtml(client.name).substring(0, 30)}<br>
            <span class="label">📞 Téléphone</span> ${escapeHtml(client.phone) || "---"}<br>
            <span class="label">🔑 Code client</span> <span class="code-value">${client.client_code || "----"}</span><br>
            ${client.email && client.email !== "NC" ? `<span class="label">✉️ Email</span> ${escapeHtml(client.email).substring(0, 30)}` : ""}
          </div>
          <div class="middle-section">
            <div class="left-info">
              <div class="device-info">
                <div><span class="label">📱 Modèle</span><br>${escapeHtml(ticket.device).substring(0, 28)}</div>
                <div style="margin-top: 2mm;"><span class="label">🔧 Panne</span><br>${escapeHtml(ticket.issue).substring(0, 32)}</div>
                ${ticket.imei && ticket.imei !== "NC" ? `<div style="margin-top: 2mm;"><span class="label">🔢 IMEI</span><br>${ticket.imei}</div>` : ""}
              </div>
            </div>
            ${qrCodeDataUrl ? `<div class="qr-area"><img src="${qrCodeDataUrl}" /><div class="qr-text">🔗 Scannez pour suivre</div></div>` : ""}
          </div>
          <div class="code-info">🔑 <strong>Code:</strong> ${codeValue}</div>
          <div class="notes">${descriptionFinale}</div>
          <div class="footer">
            <span>⏱ ${new Date().toLocaleDateString("fr-FR")} ${new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
            <span>🔧 ${companyInfo.name.substring(0, 15)}</span>
          </div>
        </div>
        <div class="cut-line">----- Découpez ici -----</div>
        <div class="no-print">
          <button onclick="window.print();">🖨️ IMPRIMER</button>
          <button onclick="window.close();">❌ FERMER</button>
        </div>
      </div>
    </body>
    </html>`;
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

  // Calcul des statistiques
  const stats = {
    received: allRepairs.filter((r) => r.status === "🟡 Réceptionné").length,
    inProgress: allRepairs.filter((r) => r.status === "🔧 En réparation").length,
    done: allRepairs.filter((r) => r.status === "✅ Terminé").length,
    delivered: allRepairs.filter((r) => r.status === "📦 Rendu").length,
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

  return (
    <Layout>
      {message.text && (
        <div
          className={`fixed bottom-5 right-5 px-5 py-3 rounded-xl shadow-lg z-50 text-white ${message.type === "error" ? "bg-red-500" : "bg-green-500"}`}
        >
          {message.text}
        </div>
      )}

      {showReturnModal && selectedRepair && (
        <ReturnModal
          repair={selectedRepair}
          onClose={() => setShowReturnModal(false)}
          onSuccess={() => {
            setShowReturnModal(false);
            setSelectedRepair(null);
            loadAllData();
          }}
        />
      )}

      {/* MODAL SUCCÈS */}
      {showSuccessModal && recentTickets.length > 0 && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full">
            <div className="text-center mb-4">
              <div className="text-5xl mb-3">🎉</div>
              <h2 className="text-2xl font-bold text-gray-800">Succès !</h2>
              <p className="text-gray-500 mt-1">{recentTickets.length} ticket(s) créé(s)</p>
            </div>

            <div className="bg-gray-50 rounded-xl p-3 mb-5 max-h-40 overflow-auto">
              {recentTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="text-sm py-2 border-b last:border-0 flex justify-between"
                >
                  <span className="font-mono font-bold text-blue-600">MBX-{ticket.id}</span>
                  <span className="text-gray-600">{ticket.device}</span>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <button
                onClick={async () => {
                  const clientId = recentTickets[0]?.client_id;
                  if (clientId) {
                    const { data: clientData } = await supabase
                      .from("clients")
                      .select("*")
                      .eq("id", clientId)
                      .single();
                    if (clientData) {
                      for (const ticket of recentTickets) {
                        const trackingUrl = await genererLienSuivi(ticket, clientData);
                        await printTicket(ticket, clientData, trackingUrl);
                        await new Promise((r) => setTimeout(r, 1000));
                      }
                      showMessage(`${recentTickets.length} ticket(s) imprimé(s)`, "success");
                    }
                  }
                }}
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition text-base flex items-center justify-center gap-2"
              >
                🖨️ IMPRIMER ({recentTickets.length})
              </button>

              <button
                onClick={async () => {
                  const clientId = recentTickets[0]?.client_id;
                  if (clientId) {
                    const { data: clientData } = await supabase
                      .from("clients")
                      .select("*")
                      .eq("id", clientId)
                      .single();
                    if (clientData) {
                      let email = emailTo;
                      if (!email || email === "NC") {
                        email = prompt(
                          "Entrez l'email du client:",
                          clientData.email !== "NC" ? clientData.email : ""
                        );
                        if (!email) return;
                      }
                      const trackingUrl = await genererLienSuivi(recentTickets[0], clientData);
                      await sendEmailReceipt(recentTickets, clientData, email, trackingUrl);
                    }
                  }
                }}
                className="w-full bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 transition text-base flex items-center justify-center gap-2"
              >
                ✉️ ENVOYER EMAIL
              </button>

              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  setRecentTickets([]);
                }}
                className="w-full bg-gray-200 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-300 transition text-base"
              >
                ✕ FERMER
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== HEADER DASHBOARD AVEC BARRE DE RECHERCHE ========== */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <h1 className="text-3xl font-black text-white drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]">
          📊 Dashboard
        </h1>

        <div className="flex gap-3 w-full sm:w-auto">
          <div ref={searchContainerRef} className="relative flex-1 sm:w-96">
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl blur opacity-0 group-focus-within:opacity-100 transition duration-300"></div>
              <input
                ref={searchInputRef}
                className="relative w-full p-3 pl-12 bg-white border border-blue-200 rounded-xl focus:outline-none focus:border-blue-500 text-gray-800 placeholder-gray-400 shadow-[0_0_10px_rgba(59,130,246,0.1)] focus:shadow-[0_0_20px_rgba(59,130,246,0.3)] transition-all duration-300"
                placeholder="🔍 Rechercher par ticket, nom, modèle ou panne..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500 text-lg">
                🔍
              </div>
              {searchQuery && (
                <button
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-500 transition"
                  onClick={() => setSearchQuery("")}
                >
                  ✕
                </button>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* ========== STATS CARTES ========== */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-8">
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl blur opacity-0 group-hover:opacity-75 transition duration-500"></div>
          <div className="relative bg-white rounded-2xl p-5 border border-blue-200 text-center shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-3xl">🟡</span>
            </div>
            <div className="text-3xl font-black text-blue-600">{stats.received}</div>
            <div className="text-xs text-gray-500 mt-1">Réceptionnés</div>
          </div>
        </div>

        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl blur opacity-0 group-hover:opacity-75 transition duration-500"></div>
          <div className="relative bg-white rounded-2xl p-5 border border-blue-200 text-center shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-3xl">🔧</span>
            </div>
            <div className="text-3xl font-black text-blue-600">{stats.inProgress}</div>
            <div className="text-xs text-gray-500 mt-1">En réparation</div>
          </div>
        </div>

        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl blur opacity-0 group-hover:opacity-75 transition duration-500"></div>
          <div className="relative bg-white rounded-2xl p-5 border border-blue-200 text-center shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-3xl">✅</span>
            </div>
            <div className="text-3xl font-black text-blue-600">{stats.done}</div>
            <div className="text-xs text-gray-500 mt-1">Terminés</div>
          </div>
        </div>

        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl blur opacity-0 group-hover:opacity-75 transition duration-500"></div>
          <div className="relative bg-white rounded-2xl p-5 border border-blue-200 text-center shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-3xl">📦</span>
            </div>
            <div className="text-3xl font-black text-blue-600">{stats.delivered}</div>
            <div className="text-xs text-gray-500 mt-1">Rendus</div>
          </div>
        </div>
      </div>

      {/* ========== RÉSULTATS RECHERCHE ========== */}
      {showResults && searchResults.length > 0 && (
        <div className="space-y-3 mb-6">
          <h2 className="text-lg font-semibold text-blue-600">📋 Résultats de recherche</h2>
          {searchResults.map((r) => (
            <div
              key={r.id}
              className="group relative bg-white rounded-xl border border-blue-200 p-4 cursor-pointer hover:border-blue-500 transition-all duration-300 hover:shadow-[0_0_20px_rgba(59,130,246,0.2)] shadow-sm"
              onClick={() => showTicketDetails(r)}
            >
              <div className="relative flex justify-between items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-blue-600 text-lg">MBX-{r.id}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full text-white shadow-md ${statusColors[r.status] || "bg-yellow-500"}`}
                    >
                      {r.status || "🟡 Réceptionné"}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 mt-1">{r.client?.name}</div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    📱 {r.device} • 🔧 {r.issue}
                  </div>
                </div>
                <div className="text-blue-500 group-hover:translate-x-1 transition-transform duration-200">
                  →
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ========== FORMULAIRE NOUVELLE RÉPARATION ========== */}
      <div ref={formRef} className="bg-white rounded-2xl border border-blue-200 overflow-hidden shadow-lg">
        <div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-6 py-4">
          <h2 className="text-white font-semibold text-lg">➕ Nouvelle réparation</h2>
          <p className="text-blue-100 text-sm">Multi-appareils supporté</p>
        </div>
        <div className="p-6">
          <div className="space-y-5">
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
              <h3 className="font-medium mb-3 text-blue-600">👤 Client</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="relative">
                  <input
                    ref={clientInputRef}
                    className="border border-gray-200 p-3 rounded-xl w-full focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 transition"
                    placeholder="Nom du client *"
                    value={intakeClient}
                    onChange={(e) => handleClientSearch(e.target.value)}
                    onKeyDown={handleClientKeyDown}
                    autoComplete="off"
                  />
                  {showClientSuggestions && clientSuggestions.length > 0 && (
                    <div className="absolute z-10 bg-white border border-blue-200 rounded-xl shadow-lg max-h-48 overflow-auto w-full mt-1">
                      {clientSuggestions.map((c, idx) => (
                        <div
                          key={c.id}
                          className={`p-2 cursor-pointer hover:bg-blue-50 ${selectedClientIndex === idx ? "bg-blue-50" : ""}`}
                          onMouseDown={() => selectClient(c)}
                        >
                          <div className="font-medium">{c.name}</div>
                          <div className="text-xs text-gray-500">
                            {c.phone !== "NC" ? c.phone : ""}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="relative">
                  <input
                    ref={phoneInputRef}
                    className="border border-gray-200 p-3 rounded-xl w-full focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 transition"
                    placeholder="Téléphone"
                    value={intakePhone}
                    onChange={(e) => handlePhoneSearch(e.target.value)}
                    onKeyDown={handlePhoneKeyDown}
                    autoComplete="off"
                  />
                  {showPhoneSuggestions && phoneSuggestions.length > 0 && (
                    <div className="absolute z-10 bg-white border border-blue-200 rounded-xl shadow-lg max-h-48 overflow-auto w-full mt-1">
                      {phoneSuggestions.map((c, idx) => (
                        <div
                          key={c.id}
                          className={`p-2 cursor-pointer hover:bg-blue-50 ${selectedPhoneIndex === idx ? "bg-blue-50" : ""}`}
                          onMouseDown={() => selectPhoneSuggestion(c)}
                        >
                          <div className="font-medium">{c.phone}</div>
                          <div className="text-xs text-gray-500">{c.name}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <input
                  ref={emailInputRef}
                  className="border border-gray-200 p-3 rounded-xl md:col-span-2 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 transition"
                  placeholder="Email"
                  value={intakeEmail}
                  onChange={(e) => setIntakeEmail(e.target.value)}
                  onKeyDown={handleEmailKeyDown}
                />
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
              <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
                <div className="flex gap-2 items-end">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Nombre d'appareils</label>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={desiredRepairCount}
                      onChange={(e) => setDesiredRepairCount(Number(e.target.value))}
                      className="border border-gray-200 p-2 rounded-lg w-24 text-center focus:border-blue-400 focus:outline-none"
                      onKeyDown={handleNumberKeyDown}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={generateRepairSlots}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm"
                  >
                    Générer
                  </button>
                </div>
                <span className="text-xs text-gray-400">{repairsList.length} appareil(s)</span>
              </div>

              <div className="space-y-4">
                {repairsList.map((repair, idx) => (
                  <div key={repair.id} className="border border-gray-200 rounded-xl p-3 bg-white">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-semibold text-blue-600">
                        Appareil #{idx + 1}
                      </span>
                      {repairsList.length > 1 && (
                        <button
                          onClick={() => removeRepair(repair.id)}
                          className="text-red-500 text-xs hover:text-red-700 transition"
                        >
                          🗑 Supprimer
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="relative">
                        <input
                          className="border border-gray-200 p-2 rounded-lg w-full focus:border-blue-400 focus:outline-none"
                          placeholder="📱 Modèle *"
                          value={repair.device}
                          onChange={(e) => handleDeviceSearch(repair.id, e.target.value)}
                        />
                        {showDeviceSuggestionsMap[repair.id] &&
                          deviceSuggestionsMap[repair.id]?.length > 0 && (
                            <div className="absolute z-10 bg-white border border-blue-200 rounded-lg shadow-lg max-h-36 overflow-auto w-full mt-1">
                              {deviceSuggestionsMap[repair.id].map((d, i) => (
                                <div
                                  key={i}
                                  className="p-2 cursor-pointer hover:bg-blue-50 text-sm"
                                  onMouseDown={() => selectDevice(repair.id, d)}
                                >
                                  📱 {d}
                                </div>
                              ))}
                            </div>
                          )}
                      </div>
                      <div className="relative">
                        <input
                          className="border border-gray-200 p-2 rounded-lg w-full focus:border-blue-400 focus:outline-none"
                          placeholder="🔧 Panne *"
                          value={repair.issue}
                          onChange={(e) => handleIssueSearch(repair.id, e.target.value)}
                        />
                        {showIssueSuggestionsMap[repair.id] &&
                          issueSuggestionsMap[repair.id]?.length > 0 && (
                            <div className="absolute z-10 bg-white border border-blue-200 rounded-lg shadow-lg max-h-36 overflow-auto w-full mt-1">
                              {issueSuggestionsMap[repair.id].map((iss, i) => (
                                <div
                                  key={i}
                                  className="p-2 cursor-pointer hover:bg-blue-50 text-sm"
                                  onMouseDown={() => selectIssue(repair.id, iss)}
                                >
                                  🔧 {iss}
                                </div>
                              ))}
                            </div>
                          )}
                      </div>
                      <textarea
                        rows={2}
                        className="border border-gray-200 p-2 rounded-lg text-sm focus:border-blue-400 focus:outline-none"
                        placeholder="📝 Description (optionnel)"
                        value={repair.description || ""}
                        onChange={(e) =>
                          updateRepairField(repair.id, "description", e.target.value)
                        }
                      />
                      <input
                        className="border border-gray-200 p-2 rounded-lg focus:border-blue-400 focus:outline-none"
                        placeholder="💰 Prix estimé (€)"
                        type="number"
                        value={repair.estimatedPrice}
                        onChange={(e) =>
                          updateRepairField(repair.id, "estimatedPrice", e.target.value)
                        }
                      />
                      <div className="flex gap-2">
                        <input
                          className="border border-gray-200 p-2 rounded-lg flex-1 focus:border-blue-400 focus:outline-none"
                          placeholder="🔢 IMEI"
                          value={repair.imei}
                          onChange={(e) => updateRepairField(repair.id, "imei", e.target.value)}
                          maxLength={15}
                        />
                        <div className="relative flex-1">
                          <input
                            className="border border-gray-200 p-2 rounded-lg w-full focus:border-blue-400 focus:outline-none"
                            placeholder="🔑 Code"
                            value={repair.code}
                            onChange={(e) => {
                              updateRepairField(repair.id, "code", e.target.value);
                              searchCodeSuggestions(e.target.value, repair.id);
                            }}
                          />
                          {showCodeSuggestionsMap[repair.id] &&
                            codeSuggestionsMap[repair.id]?.length > 0 && (
                              <div className="absolute z-10 bg-white border border-blue-200 rounded-lg shadow-lg max-h-36 overflow-auto w-full mt-1">
                                {codeSuggestionsMap[repair.id].map((code, i) => (
                                  <div
                                    key={i}
                                    className="p-2 cursor-pointer hover:bg-blue-50 text-sm"
                                    onMouseDown={() => selectCodeForRepair(repair.id, code)}
                                  >
                                    🔑 {code}
                                  </div>
                                ))}
                              </div>
                            )}
                        </div>
                      </div>
                      <div className="md:col-span-2">
                        <PatternLock
                          onComplete={(pattern) =>
                            updateRepairField(repair.id, "unlockPattern", pattern.join("-"))
                          }
                          onClear={() => updateRepairField(repair.id, "unlockPattern", "")}
                        />
                        <p className="text-[10px] text-gray-400 mt-1">
                          ⚠️ NON FOURNI - Test impossible, pas pris en garantie
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={createIntake}
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-3 rounded-xl font-bold hover:from-blue-700 hover:to-cyan-700 transition-all duration-300 shadow-md hover:shadow-lg disabled:opacity-50"
            >
              {loading ? "⏳ Création..." : `📦 Créer ${repairsList.length} ticket(s)`}
            </button>
          </div>
        </div>
      </div>

      {/* MODALS AJOUT */}
      {showAddDevice && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-96 border border-blue-200 shadow-xl">
            <h3 className="text-lg font-bold text-gray-800 mb-4">➕ Ajouter un modèle</h3>
            <input
              type="text"
              className="border border-gray-200 p-2 rounded w-full mb-4 focus:border-blue-400 focus:outline-none"
              placeholder="Nom du modèle"
              value={newDeviceInput}
              onChange={(e) => setNewDeviceInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCustomDevice()}
            />
            <div className="flex gap-2">
              <button
                onClick={addCustomDevice}
                className="bg-blue-600 text-white px-4 py-2 rounded flex-1 hover:bg-blue-700"
              >
                Ajouter
              </button>
              <button
                onClick={() => setShowAddDevice(false)}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded flex-1 hover:bg-gray-300"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddIssue && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-96 border border-blue-200 shadow-xl">
            <h3 className="text-lg font-bold text-gray-800 mb-4">➕ Ajouter une panne</h3>
            <input
              type="text"
              className="border border-gray-200 p-2 rounded w-full mb-4 focus:border-blue-400 focus:outline-none"
              placeholder="Nom de la panne"
              value={newIssueInput}
              onChange={(e) => setNewIssueInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCustomIssue()}
            />
            <div className="flex gap-2">
              <button
                onClick={addCustomIssue}
                className="bg-blue-600 text-white px-4 py-2 rounded flex-1 hover:bg-blue-700"
              >
                Ajouter
              </button>
              <button
                onClick={() => setShowAddIssue(false)}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded flex-1 hover:bg-gray-300"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddCode && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-96 border border-blue-200 shadow-xl">
            <h3 className="text-lg font-bold text-gray-800 mb-4">➕ Ajouter un code</h3>
            <input
              type="text"
              className="border border-gray-200 p-2 rounded w-full mb-4 focus:border-blue-400 focus:outline-none"
              placeholder="Code téléphone"
              value={newCodeInput}
              onChange={(e) => setNewCodeInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCustomCode()}
            />
            <div className="flex gap-2">
              <button
                onClick={addCustomCode}
                className="bg-blue-600 text-white px-4 py-2 rounded flex-1 hover:bg-blue-700"
              >
                Ajouter
              </button>
              <button
                onClick={() => setShowAddCode(false)}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded flex-1 hover:bg-gray-300"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== MODAL DÉTAIL ========== */}
      {showDetailModal && selectedRepairDetail && selectedRepairClient && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={() => setShowDetailModal(false)}
        >
          <div
            className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-auto border border-blue-200 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white p-4 border-b border-blue-200">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold text-blue-600">
                    🔧 Détail MBX-{selectedRepairDetail.id}
                  </h2>
                  <p className="text-sm text-gray-500">{selectedRepairClient.name}</p>
                </div>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-gray-400 hover:text-blue-500 text-2xl transition"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="font-semibold text-gray-800">👤 {selectedRepairClient.name}</div>
                {selectedRepairClient.phone !== "NC" && (
                  <div className="text-sm text-gray-600">📞 {selectedRepairClient.phone}</div>
                )}
                {selectedRepairClient.email !== "NC" && (
                  <div className="text-sm text-gray-600">✉️ {selectedRepairClient.email}</div>
                )}
                {selectedRepairClient.client_code && (
                  <div className="text-sm font-mono text-blue-600">
                    🔑 Code: {selectedRepairClient.client_code}
                  </div>
                )}
              </div>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="grid grid-cols-2 border-b border-gray-200">
                  <div className="p-3 bg-gray-50 font-semibold">📱 Appareil</div>
                  <div className="p-3">{selectedRepairDetail.device}</div>
                </div>
                <div className="grid grid-cols-2">
                  <div className="p-3 bg-gray-50 font-semibold">🔧 Panne</div>
                  <div className="p-3">{selectedRepairDetail.issue}</div>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    const { data: clientData } = await supabase
                      .from("clients")
                      .select("*")
                      .eq("id", selectedRepairDetail.client_id)
                      .single();
                    if (clientData) {
                      const trackingUrl = await genererLienSuivi(selectedRepairDetail, clientData);
                      printTicket(selectedRepairDetail, clientData, trackingUrl);
                    }
                  }}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
                >
                  🖨️ Ticket
                </button>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition"
                >
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
