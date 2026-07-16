"use client";

import Link from "next/link";
import { Search, Menu, Phone, Mail, ShoppingCart, User, Download, FileText, X, Edit, Plus, ChevronUp, ChevronDown, Trash2, Building2, KeyRound, Sliders } from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSettings } from "@/hooks/useSettings";
import { useCart } from "@/hooks/useCart";
import { useProducts } from "@/hooks/useProducts";
import { supabase } from "@/lib/supabase";
import { Product } from "@/types";
import { useClientAuth } from "@/hooks/useClientAuth";
import { ClientPortalView } from "./ClientPortalView";
import mexicoData from "@/utils/mexicoStates.json";

const MEXICO_STATES = Object.keys(mexicoData);

const validateZipCodeWithState = (zip: string, state: string): boolean => {
  if (!/^\d{5}$/.test(zip)) return false;
  const prefix = parseInt(zip.substring(0, 2), 10);
  
  switch (state) {
    case "Ciudad de México":
      return prefix >= 1 && prefix <= 16;
    case "Aguascalientes":
      return prefix === 20;
    case "Baja California":
      return prefix === 21 || prefix === 22;
    case "Baja California Sur":
      return prefix === 23;
    case "Campeche":
      return prefix === 24;
    case "Coahuila de Zaragoza":
      return prefix >= 25 && prefix <= 27;
    case "Colima":
      return prefix === 28;
    case "Chiapas":
      return prefix === 29 || prefix === 30;
    case "Chihuahua":
      return prefix >= 31 && prefix <= 33;
    case "Durango":
      return prefix === 34 || prefix === 35;
    case "Guanajuato":
      return prefix >= 36 && prefix <= 38;
    case "Guerrero":
      return prefix >= 39 && prefix <= 41;
    case "Hidalgo":
      return prefix === 42 || prefix === 43;
    case "Jalisco":
      return prefix >= 44 && prefix <= 49;
    case "México":
      return prefix >= 50 && prefix <= 57;
    case "Michoacán de Ocampo":
      return prefix >= 58 && prefix <= 61;
    case "Morelos":
      return prefix === 62;
    case "Nayarit":
      return prefix === 63;
    case "Nuevo León":
      return prefix >= 64 && prefix <= 67;
    case "Oaxaca":
      return prefix >= 68 && prefix <= 71;
    case "Puebla":
      return prefix >= 72 && prefix <= 75;
    case "Querétaro":
      return prefix === 76;
    case "Quintana Roo":
      return prefix === 77;
    case "San Luis Potosí":
      return prefix === 78 || prefix === 79;
    case "Sinaloa":
      return prefix >= 80 && prefix <= 82;
    case "Sonora":
      return prefix >= 83 && prefix <= 85;
    case "Tabasco":
      return prefix === 86;
    case "Tamaulipas":
      return prefix >= 87 && prefix <= 89;
    case "Tlaxcala":
      return prefix === 90;
    case "Veracruz de Ignacio de la Llave":
      return prefix >= 91 && prefix <= 96;
    case "Yucatán":
      return prefix === 97;
    case "Zacatecas":
      return prefix === 98 || prefix === 99;
    default:
      return false;
  }
};

const STATE_LADAS: Record<string, string[]> = {
  "Aguascalientes": ["449", "458", "495", "496"],
  "Baja California": ["615", "646", "653", "661", "664", "665", "686"],
  "Baja California Sur": ["612", "613", "624"],
  "Campeche": ["981", "982", "996"],
  "Coahuila de Zaragoza": ["842", "844", "861", "862", "864", "866", "867", "869", "871", "872", "873", "877", "878"],
  "Colima": ["312", "313", "314"],
  "Chiapas": ["961", "962", "963", "964", "965", "966", "967", "968", "992", "994"],
  "Chihuahua": ["614", "621", "625", "626", "627", "628", "629", "635", "636", "639", "648", "649", "652", "656"],
  "Ciudad de México": ["55", "56"],
  "Durango": ["618", "671", "674", "675", "676", "677", "871", "872"],
  "Guanajuato": ["411", "412", "413", "415", "417", "418", "419", "428", "429", "445", "456", "461", "462", "464", "466", "468", "469", "472", "473", "476", "477", "479"],
  "Guerrero": ["732", "733", "736", "741", "742", "744", "745", "747", "754", "755", "756", "757", "758", "762"],
  "Hidalgo": ["738", "743", "746", "748", "759", "761", "763", "771", "772", "773", "774", "775", "776", "778", "779", "789", "791"],
  "Jalisco": ["33", "315", "316", "317", "321", "322", "341", "342", "343", "344", "345", "346", "347", "348", "349", "354", "357", "374", "375", "376", "378", "382", "384", "385", "386", "388", "391", "392", "393", "431", "457", "474", "475", "495", "496"],
  "México": ["55", "56", "591", "592", "593", "594", "595", "596", "597", "599", "711", "712", "713", "714", "715", "716", "717", "718", "719", "721", "722", "723", "724", "725", "726", "728", "729", "761", "767"],
  "Michoacán de Ocampo": ["351", "352", "353", "355", "356", "359", "381", "383", "434", "435", "436", "438", "443", "447", "451", "452", "453", "454", "455", "459", "715", "753", "786"],
  "Morelos": ["734", "735", "737", "739", "751", "777"],
  "Nayarit": ["311", "319", "323", "324", "325", "327", "329", "389"],
  "Nuevo León": ["81", "821", "823", "824", "825", "826", "828", "829", "892"],
  "Oaxaca": ["951", "953", "954", "958", "971", "972", "994", "995"],
  "Puebla": ["221", "222", "223", "224", "225", "227", "231", "232", "233", "236", "237", "238", "243", "244", "248", "249", "275", "276", "746", "764", "797"],
  "Querétaro": ["414", "427", "441", "442", "446", "448", "487"],
  "Quintana Roo": ["983", "984", "997", "998"],
  "San Luis Potosí": ["444", "458", "481", "482", "483", "485", "487", "488", "489", "496"],
  "Sinaloa": ["667", "668", "669", "672", "673", "687", "694", "695", "696", "698"],
  "Sonora": ["622", "623", "631", "632", "633", "634", "637", "638", "641", "642", "643", "644", "645", "647", "651", "653", "662", "670"],
  "Tabasco": ["913", "914", "917", "923", "932", "933", "934", "937", "993"],
  "Tamaulipas": ["831", "832", "833", "834", "835", "836", "841", "867", "868", "891", "894", "897", "899"],
  "Tlaxcala": ["222", "241", "246", "247", "248", "276"],
  "Veracruz de Ignacio de la Llave": ["228", "229", "232", "235", "269", "271", "272", "273", "274", "278", "282", "283", "284", "285", "287", "288", "489", "782", "783", "784", "785", "833", "846", "921", "922", "924", "965", "985"],
  "Yucatán": ["969", "985", "986", "988", "991", "997", "999"],
  "Zacatecas": ["433", "437", "457", "458", "463", "467", "478", "492", "493", "494", "496", "498", "499"]
};

const validateLadaWithState = (phone: string, state: string): boolean => {
  const digits = phone.replace(/\D/g, "");
  if (digits.length !== 10) return false;
  
  const ladasAllowed = STATE_LADAS[state] || [];
  if (ladasAllowed.length === 0) return true;
  
  const prefix2 = digits.substring(0, 2);
  if (ladasAllowed.includes(prefix2)) return true;
  
  const prefix3 = digits.substring(0, 3);
  if (ladasAllowed.includes(prefix3)) return true;
  
  return false;
};

const validateEmailDomain = (email: string): boolean => {
  const emailTrimmed = email.trim();
  const atIdx = emailTrimmed.lastIndexOf("@");
  if (atIdx === -1 || atIdx === 0 || atIdx === emailTrimmed.length - 1) return false;
  
  const domain = emailTrimmed.substring(atIdx + 1).toLowerCase();
  const domainRegex = /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
  if (!domainRegex.test(domain)) return false;
  
  const blockedDomains = [
    "test.com", "example.com", "ejemplo.com", "prueba.com", "domain.com", 
    "correo.com", "mailinator.com", "tempmail.com", "yopmail.com", 
    "mail.com", "correo.es", "domain.mx"
  ];
  if (blockedDomains.includes(domain)) return false;
  
  return true;
};

const getStateFromZip = (zip: string): string => {
  if (!/^\d{5}$/.test(zip)) return "";
  const prefix = parseInt(zip.substring(0, 2), 10);
  
  if (prefix >= 1 && prefix <= 16) return "Ciudad de México";
  if (prefix === 20) return "Aguascalientes";
  if (prefix === 21 || prefix === 22) return "Baja California";
  if (prefix === 23) return "Baja California Sur";
  if (prefix === 24) return "Campeche";
  if (prefix >= 25 && prefix <= 27) return "Coahuila de Zaragoza";
  if (prefix === 28) return "Colima";
  if (prefix >= 29 && prefix <= 30) return "Chiapas";
  if (prefix >= 31 && prefix <= 33) return "Chihuahua";
  if (prefix >= 34 && prefix <= 35) return "Durango";
  if (prefix >= 36 && prefix <= 38) return "Guanajuato";
  if (prefix >= 39 && prefix <= 41) return "Guerrero";
  if (prefix >= 42 && prefix <= 43) return "Hidalgo";
  if (prefix >= 44 && prefix <= 49) return "Jalisco";
  if (prefix >= 50 && prefix <= 57) return "México";
  if (prefix >= 58 && prefix <= 61) return "Michoacán de Ocampo";
  if (prefix === 62) return "Morelos";
  if (prefix === 63) return "Nayarit";
  if (prefix >= 64 && prefix <= 67) return "Nuevo León";
  if (prefix >= 68 && prefix <= 71) return "Oaxaca";
  if (prefix >= 72 && prefix <= 75) return "Puebla";
  if (prefix === 76) return "Querétaro";
  if (prefix === 77) return "Quintana Roo";
  if (prefix >= 78 && prefix <= 79) return "San Luis Potosí";
  if (prefix >= 80 && prefix <= 82) return "Sinaloa";
  if (prefix >= 83 && prefix <= 85) return "Sonora";
  if (prefix === 86) return "Tabasco";
  if (prefix >= 87 && prefix <= 89) return "Tamaulipas";
  if (prefix === 90) return "Tlaxcala";
  if (prefix >= 91 && prefix <= 96) return "Veracruz de Ignacio de la Llave";
  if (prefix === 97) return "Yucatán";
  if (prefix >= 98 && prefix <= 99) return "Zacatecas";
  
  return "";
};

export function Header() {
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();
  const { 
    categories, 
    featuredSeason, 
    isLoaded,
    addCategory,
    removeCategory,
    updateCategories
  } = useSettings();
  const { cartItems, isLoaded: cartLoaded } = useCart();
  const { products } = useProducts();
  
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showPdfFilterModal, setShowPdfFilterModal] = useState(false);
  
  // Autocomplete suggestions states
  const [suggestedProducts, setSuggestedProducts] = useState<Product[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Admin category quick editor states
  const [isAdmin, setIsAdmin] = useState(false);
  const [showCategoryEditModal, setShowCategoryEditModal] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState("");

  // B2B Client Auth States
  const { session, loginClient, logoutClient } = useClientAuth();
  const [showB2BLogin, setShowB2BLogin] = useState(false);
  const [showClientPortal, setShowClientPortal] = useState(false);
  const [showB2bDropdown, setShowB2bDropdown] = useState(false);
  const [b2bEmail, setB2bEmail] = useState("");
  const [b2bAccessKey, setB2bAccessKey] = useState("");
  const [b2bLoginError, setB2bLoginError] = useState("");
  const [isB2bLoggingIn, setIsB2bLoggingIn] = useState(false);

  // B2B Client Registration States
  const [isB2bRegistering, setIsB2bRegistering] = useState(false);
  const [b2bRegBusinessName, setB2bRegBusinessName] = useState("");
  const [b2bRegContactName, setB2bRegContactName] = useState("");
  const [b2bRegEmail, setB2bRegEmail] = useState("");
  const [b2bRegPhone, setB2bRegPhone] = useState("");
  const [b2bRegRfc, setB2bRegRfc] = useState("");
  const [b2bRegNotes, setB2bRegNotes] = useState("");
  const [b2bRegSuccess, setB2bRegSuccess] = useState(false);
  const [b2bRegZip, setB2bRegZip] = useState("");
  const [b2bRegState, setB2bRegState] = useState("");
  const [b2bRegCity, setB2bRegCity] = useState("");
  const [b2bRegStreet, setB2bRegStreet] = useState("");
  const [b2bRegExtNum, setB2bRegExtNum] = useState("");
  const [b2bRegIntNum, setB2bRegIntNum] = useState("");
  const [b2bRegNeighborhood, setB2bRegNeighborhood] = useState("");
  const [b2bRegReference, setB2bRegReference] = useState("");
  const [regErrors, setRegErrors] = useState<Record<string, string>>({});
  // B2B Client Password/Access Key Reset States
  const [isB2bResetting, setIsB2bResetting] = useState(false);
  const [b2bResetEmail, setB2bResetEmail] = useState("");
  const [b2bResetSuccess, setB2bResetSuccess] = useState(false);
  const [isB2bResetLoading, setIsB2bResetLoading] = useState(false);

  // States for Key Resend and Background Feedback
  const [registeredKey, setRegisteredKey] = useState("");
  const [registeredPhone, setRegisteredPhone] = useState("");
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [registeredContactName, setRegisteredContactName] = useState("");
  const [isResending, setIsResending] = useState(false);
  const [resendStatus, setResendStatus] = useState("");

  const handlePortalClick = () => {
    if (session) {
      setShowClientPortal(true);
    } else {
      setShowB2BLogin(true);
    }
  };

  const handleB2bLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setB2bLoginError("");
    setIsB2bLoggingIn(true);
    try {
      const res = await loginClient(b2bEmail, b2bAccessKey);
      if (res.success) {
        setShowB2BLogin(false);
        setB2bEmail("");
        setB2bAccessKey("");
        router.push("/catalog");
      } else {
        setB2bLoginError(res.error || "Error al iniciar sesión.");
      }
    } catch (err: any) {
      setB2bLoginError(err.message || "Error inesperado.");
    } finally {
      setIsB2bLoggingIn(false);
    }
  };

  const handleB2bResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setB2bLoginError("");
    setIsB2bResetLoading(true);

    try {
      const emailTrimmed = b2bResetEmail.trim().toLowerCase();
      if (!emailTrimmed) {
        setB2bLoginError("Por favor ingresa tu correo registrado.");
        setIsB2bResetLoading(false);
        return;
      }

      // 1. Search for contact by email
      const { data: contacts, error: conErr } = await supabase
        .from("customer_contacts")
        .select("*")
        .eq("email", emailTrimmed);

      if (conErr) throw conErr;
      if (!contacts || contacts.length === 0) {
        setB2bLoginError("No se encontró ningún cliente registrado con este correo.");
        setIsB2bResetLoading(false);
        return;
      }

      // 2. Fetch the customer access_key
      const customerId = contacts[0].customer_id;
      const { data: customer, error: custErr } = await supabase
        .from("customers")
        .select("*")
        .eq("id", customerId)
        .single();

      if (custErr) throw custErr;
      if (!customer) {
        setB2bLoginError("Error al recuperar los datos del cliente.");
        setIsB2bResetLoading(false);
        return;
      }

      const accessKey = customer.access_key;
      if (!accessKey) {
        setB2bLoginError("Este cliente no cuenta con una clave de acceso activa.");
        setIsB2bResetLoading(false);
        return;
      }

      // 3. Send email and WhatsApp notifications using send-access-key API
      const contactName = contacts[0].name;
      const phone = contacts[0].phone;

      // Save info for background resend (without displaying the key)
      setRegisteredKey(accessKey);
      setRegisteredPhone(phone || "");
      setRegisteredEmail(emailTrimmed);
      setRegisteredContactName(contactName || "");
      setResendStatus("");

      await fetch("/api/send-access-key", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: emailTrimmed,
          phone,
          contact_name: contactName,
          access_key: accessKey
        })
      });

      setB2bResetSuccess(true);
    } catch (err: any) {
      console.error(err);
      setB2bLoginError(err.message || "Error al procesar la solicitud de recuperación.");
    } finally {
      setIsB2bResetLoading(false);
    }
  };

  const handleBackgroundResend = async () => {
    if (!registeredEmail || !registeredKey) {
      setResendStatus("Error: No hay datos para el reenvío.");
      return;
    }

    setIsResending(true);
    setResendStatus("");

    try {
      const res = await fetch("/api/send-access-key", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: registeredEmail,
          phone: registeredPhone,
          contact_name: registeredContactName,
          access_key: registeredKey
        })
      });

      if (res.ok) {
        setResendStatus("¡Clave reenviada con éxito por Correo y WhatsApp!");
      } else {
        const data = await res.json();
        setResendStatus(`Error: ${data.error || "No se pudo completar el reenvío."}`);
      }
    } catch (err: any) {
      console.error("Error reenviando clave:", err);
      setResendStatus("Error de conexión al reenviar la clave.");
    } finally {
      setIsResending(false);
    }
  };

  const validateRegField = (field: string, value: string, currentState?: string) => {
    let errorMsg = "";
    
    if (field === "company") {
      const companyTrimmed = value.trim();
      const companyLower = companyTrimmed.toLowerCase();
      const genericWords = ["empresa", "n/a", "na", "prueba", "pruebas", "ninguno", "ninguna", "generico", "test", "generic"];
      const companyRegex = /^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑüÜ\s.,&@'\"()_+\-\/]{2,150}$/;
      if (!companyTrimmed || !companyRegex.test(companyTrimmed) || genericWords.includes(companyLower)) {
        errorMsg = "Ingrese el nombre de su empresa.";
      }
    }
    
    if (field === "name") {
      const nameTrimmed = value.trim();
      const nameRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]{2,100}$/;
      const words = nameTrimmed.split(/\s+/).filter(w => w.length > 0);
      if (!nameTrimmed || !nameRegex.test(nameTrimmed) || !nameTrimmed.includes(" ") || words.length < 2) {
        errorMsg = "Ingrese Nombre y Apellido";
      }
    }
    
    if (field === "email") {
      const emailTrimmed = value.trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailTrimmed || !emailRegex.test(emailTrimmed)) {
        errorMsg = "Ingrese un correo electrónico válido.";
      } else if (!validateEmailDomain(emailTrimmed)) {
        errorMsg = "Ingrese un dominio de correo real y válido.";
      }
    }
    
    if (field === "phone") {
      const phoneDigits = value.replace(/\D/g, "");
      if (phoneDigits.length !== 10) {
        errorMsg = "Ingrese un teléfono válido de 10 dígitos.";
      } else {
        const stateToUse = currentState !== undefined ? currentState : b2bRegState;
        if (stateToUse && !validateLadaWithState(phoneDigits, stateToUse)) {
          errorMsg = "La lada del teléfono no corresponde al estado seleccionado.";
        }
      }
    }
    
    if (field === "state") {
      if (!value) {
        errorMsg = "Seleccione un Estado.";
      }
    }
    
    if (field === "city") {
      if (!value) {
        errorMsg = "Seleccione una Ciudad.";
      }
    }
    
    if (field === "zip") {
      const zipTrimmed = value.trim();
      const stateToUse = currentState !== undefined ? currentState : b2bRegState;
      if (!zipTrimmed || !/^\d{5}$/.test(zipTrimmed) || !validateZipCodeWithState(zipTrimmed, stateToUse)) {
        errorMsg = "Ingrese un código postal de 5 dígitos válido para el Estado.";
      }
    }
    
    if (field === "street") {
      if (!value.trim()) {
        errorMsg = "Ingrese la calle.";
      }
    }
    
    if (field === "exterior_number") {
      if (!value.trim()) {
        errorMsg = "Ingrese el número exterior.";
      }
    }
    
    if (field === "neighborhood") {
      if (!value.trim()) {
        errorMsg = "Ingrese la colonia.";
      }
    }
    
    if (field === "rfc") {
      const rfcTrimmed = value.trim().toUpperCase();
      if (rfcTrimmed) {
        const rfcRegex = /^[A-Z&Ñ]{3,4}\d{6}[A-Z0-9]{3}$/;
        if (!rfcRegex.test(rfcTrimmed)) {
          errorMsg = "RFC no válido. Debe tener 12 o 13 caracteres con homoclave conforme al SAT.";
        }
      }
    }
    
    setRegErrors(prev => {
      const copy = { ...prev };
      if (errorMsg) {
        copy[field] = errorMsg;
      } else {
        delete copy[field];
      }
      return copy;
    });
    
    return !errorMsg;
  };

  const handleRegInputChange = (field: string, value: string) => {
    let cleanedValue = value;
    
    if (field === "phone") {
      cleanedValue = value.replace(/\D/g, "").slice(0, 10);
      setB2bRegPhone(cleanedValue);
    } else if (field === "zip") {
      cleanedValue = value.replace(/\D/g, "").slice(0, 5);
      setB2bRegZip(cleanedValue);
    } else if (field === "rfc") {
      cleanedValue = value.toUpperCase();
      setB2bRegRfc(cleanedValue);
    } else if (field === "company") {
      setB2bRegBusinessName(cleanedValue);
    } else if (field === "name") {
      setB2bRegContactName(cleanedValue);
    } else if (field === "email") {
      setB2bRegEmail(cleanedValue);
    } else if (field === "state") {
      setB2bRegState(cleanedValue);
      const cities = (mexicoData as Record<string, string[]>)[cleanedValue] || [];
      setB2bRegCity(cities[0] || "");
    } else if (field === "city") {
      setB2bRegCity(cleanedValue);
    } else if (field === "street") {
      setB2bRegStreet(cleanedValue);
    } else if (field === "exterior_number") {
      setB2bRegExtNum(cleanedValue);
    } else if (field === "interior_number") {
      setB2bRegIntNum(cleanedValue);
    } else if (field === "neighborhood") {
      setB2bRegNeighborhood(cleanedValue);
    } else if (field === "reference") {
      setB2bRegReference(cleanedValue);
    }
    
    if (field === "zip" && cleanedValue.length === 5) {
      const detectedState = getStateFromZip(cleanedValue);
      if (detectedState) {
        setB2bRegState(detectedState);
        const cities = (mexicoData as Record<string, string[]>)[detectedState] || [];
        setB2bRegCity(cities[0] || "");
        
        setRegErrors(errs => {
          const copy = { ...errs };
          delete copy.zip;
          delete copy.state;
          delete copy.city;
          return copy;
        });
        
        const phoneDigits = b2bRegPhone.replace(/\D/g, "");
        if (phoneDigits.length === 10) {
          const isLadaValid = validateLadaWithState(phoneDigits, detectedState);
          setRegErrors(errs => {
            const copy = { ...errs };
            if (!isLadaValid) {
              copy.phone = "La lada del teléfono no corresponde al estado seleccionado.";
            } else {
              delete copy.phone;
            }
            return copy;
          });
        }
      }
    }
    
    if (regErrors[field]) {
      validateRegField(field, cleanedValue);
    }
  };

  const handleRegInputBlur = (field: string, value: string) => {
    validateRegField(field, value);
  };

  const handleB2bRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setB2bLoginError("");
    
    // Validate all fields
    let isValid = true;
    isValid = validateRegField("company", b2bRegBusinessName) && isValid;
    isValid = validateRegField("rfc", b2bRegRfc) && isValid;
    isValid = validateRegField("name", b2bRegContactName) && isValid;
    isValid = validateRegField("email", b2bRegEmail) && isValid;
    isValid = validateRegField("phone", b2bRegPhone) && isValid;
    isValid = validateRegField("zip", b2bRegZip) && isValid;
    isValid = validateRegField("state", b2bRegState) && isValid;
    isValid = validateRegField("city", b2bRegCity) && isValid;
    isValid = validateRegField("street", b2bRegStreet) && isValid;
    isValid = validateRegField("exterior_number", b2bRegExtNum) && isValid;
    isValid = validateRegField("neighborhood", b2bRegNeighborhood) && isValid;

    if (!isValid || Object.keys(regErrors).length > 0) {
      setB2bLoginError("Por favor corrige los errores en el formulario.");
      return;
    }

    setIsB2bLoggingIn(true);
    try {
      const generatedAccessKey = `GS-B2B-${Math.floor(1000 + Math.random() * 9000)}`;

      // 1. Insert Customer as prospect
      const { data: customer, error: customerError } = await supabase
        .from("customers")
        .insert([
          {
            business_name: b2bRegBusinessName.trim(),
            rfc: b2bRegRfc.trim() || null,
            customer_type: 'prospect',
            price_level: 'retail',
            notes: b2bRegNotes.trim() || null,
            accepts_marketing: true,
            marketing_channel: 'both',
            access_key: generatedAccessKey
          }
        ])
        .select()
        .single();

      if (customerError) throw customerError;

      // 2. Insert Primary Contact
      const { error: contactError } = await supabase
        .from("customer_contacts")
        .insert([
          {
            customer_id: customer.id,
            name: b2bRegContactName.trim(),
            email: b2bRegEmail.trim().toLowerCase(),
            phone: b2bRegPhone.trim(),
            whatsapp: b2bRegPhone.trim(),
            is_primary: true
          }
        ]);

      if (contactError) throw contactError;

      // 2b. Insert Default Address
      const { error: addressError } = await supabase
        .from("customer_addresses")
        .insert([
          {
            customer_id: customer.id,
            address_type: 'both',
            street: b2bRegStreet.trim(),
            exterior_number: b2bRegExtNum.trim(),
            interior_number: b2bRegIntNum.trim() || null,
            neighborhood: b2bRegNeighborhood.trim(),
            city: b2bRegCity,
            state: b2bRegState,
            postal_code: b2bRegZip,
            country: 'México',
            reference: b2bRegReference.trim() || null,
            is_default: true
          }
        ]);

      if (addressError) throw addressError;

      // Sync guest coupons if present in localStorage
      if (typeof window !== "undefined") {
        try {
          const claimedStr = localStorage.getItem("geekystore_claimed_coupons");
          if (claimedStr) {
            const claimed = JSON.parse(claimedStr) as string[];
            const successfullyClaimed: string[] = [];
            for (const coupon of claimed) {
              try {
                const res = await fetch("/api/claim-coupon", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    customer_id: customer.id,
                    coupon: coupon
                  })
                });
                if (res.ok) {
                  const data = await res.json();
                  if (data.success) {
                    successfullyClaimed.push(coupon);
                  } else {
                    console.warn(`Server failed to claim coupon ${coupon}:`, data.error);
                  }
                } else {
                  console.warn(`Server responded with status ${res.status} when claiming coupon ${coupon}`);
                }
              } catch (err) {
                console.error(`Failed to request claiming coupon ${coupon}:`, err);
              }
            }
            if (successfullyClaimed.length > 0) {
              const remaining = claimed.filter(c => !successfullyClaimed.includes(c));
              if (remaining.length > 0) {
                localStorage.setItem("geekystore_claimed_coupons", JSON.stringify(remaining));
              } else {
                localStorage.removeItem("geekystore_claimed_coupons");
              }
            }
          }
        } catch (e) {
          console.warn("Failed to sync guest coupons on register:", e);
        }
      }

      // 3. Log activity in CRM
      await supabase
        .from("customer_activity")
        .insert([
          {
            customer_id: customer.id,
            activity_type: 'note',
            title: 'Solicitud de Registro B2B',
            description: `El cliente solicitó registrarse como B2B. Correo: ${b2bRegEmail.trim()}, Teléfono: ${b2bRegPhone.trim()}. RFC: ${b2bRegRfc.trim() || 'N/A'}. Dirección: Calle ${b2bRegStreet.trim()} No. Ext ${b2bRegExtNum.trim()}${b2bRegIntNum.trim() ? ', Int ' + b2bRegIntNum.trim() : ''}, Col. ${b2bRegNeighborhood.trim()}, CP: ${b2bRegZip.trim()}, ${b2bRegCity}, ${b2bRegState}. Referencias: ${b2bRegReference.trim() || 'Ninguna'}. Notas: ${b2bRegNotes.trim() || 'Ninguna'}`,
            created_by: 'Sistema'
          }
        ]);

      // 4. Send access key to customer (Email & WhatsApp)
      try {
        await fetch("/api/send-access-key", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            email: b2bRegEmail.trim().toLowerCase(),
            phone: b2bRegPhone.trim(),
            contact_name: b2bRegContactName.trim(),
            access_key: generatedAccessKey
          })
        });
      } catch (waErr) {
        console.error("Failed to send access key notification:", waErr);
      }

      // Save info for background resend (without displaying the key)
      setRegisteredKey(generatedAccessKey);
      setRegisteredPhone(b2bRegPhone.trim());
      setRegisteredEmail(b2bRegEmail.trim().toLowerCase());
      setRegisteredContactName(b2bRegContactName.trim());
      setResendStatus("");

      setB2bRegSuccess(true);

      setB2bRegBusinessName("");
      setB2bRegContactName("");
      setB2bRegEmail("");
      setB2bRegPhone("");
      setB2bRegRfc("");
      setB2bRegNotes("");
      setB2bRegZip("");
      setB2bRegState("");
      setB2bRegCity("");
      setB2bRegStreet("");
      setB2bRegExtNum("");
      setB2bRegIntNum("");
      setB2bRegNeighborhood("");
      setB2bRegReference("");
      setRegErrors({});
    } catch (err: any) {
      console.error("B2B Register Error:", err);
      setB2bLoginError(err.message || "Error al enviar la solicitud de registro.");
    } finally {
      setIsB2bLoggingIn(false);
    }
  };

  // Check admin session
  useEffect(() => {
    supabase.auth.getSession().then((res) => {
      setIsAdmin(!!res?.data?.session);
    });
    
    // Listen to changes in auth state
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAdmin(!!session);
    });

    const handleOpenAuth = (e: Event) => {
      const customEvent = e as CustomEvent;
      setShowB2BLogin(true);
      if (customEvent.detail && customEvent.detail.register) {
        setIsB2bRegistering(true);
      } else {
        setIsB2bRegistering(false);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener("open_b2b_auth", handleOpenAuth);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener("open_b2b_auth", handleOpenAuth);
      }
      if (data?.subscription) {
        data.subscription.unsubscribe();
      }
    };
  }, []);

  const moveCategory = (index: number, direction: 'up' | 'down') => {
    const newCategories = [...categories];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex >= 0 && targetIndex < newCategories.length) {
      const temp = newCategories[index];
      newCategories[index] = newCategories[targetIndex];
      newCategories[targetIndex] = temp;
      updateCategories(newCategories);
    }
  };

  const handleDownloadPdf = async (categoryFilter: string | null) => {
    try {
      setIsGeneratingPdf(true);
      setShowPdfFilterModal(false);
      
      const { supabase } = await import("@/lib/supabase");
      let query = supabase.from("products").select("*");
      if (categoryFilter) {
        query = query.eq("category", categoryFilter);
      }
      const { data, error } = await query.order("created_at", { ascending: false });
      
      if (error) throw error;
      
      const products = data || [];
      
      const { generatePdfCatalog } = await import("@/utils/pdfGenerator");
      await generatePdfCatalog(products);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Hubo un error al generar el PDF.");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const getSearchSimilarity = (text: string, query: string): number => {
    const textLower = text.toLowerCase();
    const queryLower = query.trim().toLowerCase();
    if (!queryLower) return 0;
    
    if (textLower.includes(queryLower)) {
      return textLower.startsWith(queryLower) ? 1.0 : 0.8;
    }

    const queryWords = queryLower.split(/\s+/).filter(w => w.length > 0);
    const textWords = textLower.split(/\s+/).filter(w => w.length > 0);
    
    let matchingWordsCount = 0;
    queryWords.forEach(qWord => {
      if (textWords.some(tWord => tWord.includes(qWord) || qWord.includes(tWord))) {
        matchingWordsCount++;
      }
    });

    if (matchingWordsCount > 0) {
      return (matchingWordsCount / queryWords.length) * 0.5;
    }

    let charsMatched = 0;
    const queryCharSet = new Set(queryLower);
    queryCharSet.forEach(c => {
      if (textLower.includes(c)) {
        charsMatched++;
      }
    });
    const charOverlap = charsMatched / queryCharSet.size;
    if (charOverlap > 0.75) {
      return charOverlap * 0.2;
    }

    return 0;
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (!val.trim()) {
      setSuggestedProducts([]);
      return;
    }
    
    const scored = products
      .map(p => ({
        product: p,
        score: getSearchSimilarity(`${p.name} ${p.sku} ${p.category} ${p.description}`, val)
      }))
      .filter(item => item.score > 0.15)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map(item => item.product);

    setSuggestedProducts(scored);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (query) {
      router.push(`/catalog?q=${encodeURIComponent(query)}`);
      setShowSuggestions(false);
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    }
  };

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      {/* Top bar */}
      <div className="bg-primary-900 text-white text-xs py-2 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
        <p>Expertos en promocionales corporativos</p>
        <div className="flex space-x-4">
          <a href="tel:+524492601779" className="flex items-center hover:text-primary-100 transition-colors">
            <Phone className="w-3 h-3 mr-1" /> 449-260-1779
          </a>
          <a href="mailto:ventas@geekystore.mx" className="flex items-center hover:text-primary-100 transition-colors hidden sm:flex">
            <Mail className="w-3 h-3 mr-1" /> ventas@geekystore.mx
          </a>
        </div>
      </div>

      {/* Main Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          {/* Logo & B2B User Info */}
          <div className="flex-shrink-0 flex items-center gap-4">
            <Link href="/" className="text-3xl font-bold tracking-tight flex items-center gap-0.5" style={{ fontFamily: 'Museo, sans-serif' }}>
              <span className="text-secondary-500">{'</'}</span>
              <span className="text-primary-500">geeky</span>
              <span className="text-secondary-500">store</span>
              <span className="text-secondary-500">{'>'}</span>
            </Link>
            {session && (
              <div className="flex flex-col text-[10px] text-gray-500 pl-3 border-l border-gray-200 leading-tight">
                <span className="font-bold text-gray-950 truncate max-w-[120px]">{session.contact.name}</span>
                <span className="text-gray-700">CP: {session.addresses.find((a: any) => a.is_default)?.postal_code || session.addresses[0]?.postal_code || "N/A"}</span>
              </div>
            )}
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-2xl mx-8 hidden md:block relative">
            <form onSubmit={handleSearch} className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                placeholder="Busca tazas, termos, mochilas..."
                className="w-full bg-gray-100 border border-transparent text-gray-900 text-sm rounded-md focus:ring-primary-500 focus:border-primary-500 block p-2.5 pl-10 transition-all shadow-sm"
              />
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Search className="w-4 h-4 text-gray-500" />
              </div>
              <button type="submit" className="absolute inset-y-0 right-0 bg-primary-600 text-white px-4 rounded-r-md hover:bg-primary-700 transition-colors text-sm font-medium">
                Buscar
              </button>
            </form>

            {showSuggestions && suggestedProducts.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-50 max-h-80 overflow-y-auto divide-y divide-gray-100">
                {suggestedProducts.map(product => (
                  <div
                    key={product.id}
                    onMouseDown={() => {
                      router.push(`/product/${product.id}`);
                      setSearchQuery("");
                      setSuggestedProducts([]);
                    }}
                    className="flex items-center gap-3 p-2.5 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <div className="w-10 h-10 bg-gray-100 rounded overflow-hidden shrink-0 border border-gray-200">
                      <img src={product.images?.find(img => !!img) || "https://images.unsplash.com/photo-1505740420928-5e560c06d30e"} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-bold text-gray-900 truncate">{product.name}</p>
                      <p className="text-xs text-gray-400 truncate">{product.category} • SKU: {product.sku}</p>
                    </div>
                    <span className="text-sm font-extrabold text-primary-700 font-mono">${product.price.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowPdfFilterModal(true)}
              disabled={isGeneratingPdf}
              className="flex items-center gap-1.5 text-gray-600 hover:text-primary-600 font-medium text-sm transition-colors hidden lg:flex"
              title="Descargar Catálogo PDF"
            >
              <FileText className="w-5 h-5 text-primary-900" />
              <span>{isGeneratingPdf ? 'Generando...' : 'Catálogo PDF'}</span>
            </button>
            <Link href="/catalog" className="text-gray-600 hover:text-primary-600 font-medium text-sm hidden lg:block">
              Ver todo
            </Link>
            <Link href="/cart" className="bg-primary-50 text-primary-700 hover:bg-primary-100 p-2 rounded-full relative transition-colors">
              <ShoppingCart className="w-5 h-5" />
              {cartLoaded && cartItems.length > 0 && (
                <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-red-600 rounded-full shadow-sm">
                  {cartItems.length}
                </span>
              )}
            </Link>
            
            

            {/* B2B Client Login button & Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowB2bDropdown(!showB2bDropdown)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs border transition-all cursor-pointer ${
                  session 
                    ? 'bg-primary-600 border-primary-600 hover:bg-primary-700 hover:border-primary-700 text-white shadow-sm' 
                    : 'bg-[#eefcf7] border-[#cbf2e3] text-[#0a6644] hover:bg-[#dbf7ed]'
                }`}
              >
                <User className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">Mi Cuenta B2B</span>
              </button>

              {showB2bDropdown && (
                <>
                  {/* Backdrop overlay to close when clicking outside */}
                  <div className="fixed inset-0 z-30" onClick={() => setShowB2bDropdown(false)} />
                  
                  <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-150 rounded-xl shadow-xl z-40 py-1.5 divide-y divide-gray-100 text-left animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="py-1">
                      <button
                        disabled={!!session}
                        onClick={() => {
                          setShowB2BLogin(true);
                          setShowB2bDropdown(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-xs font-semibold flex items-center gap-2 cursor-pointer transition-colors border-0 bg-transparent ${
                          session 
                            ? 'text-gray-300 cursor-not-allowed bg-gray-50/50' 
                            : 'text-gray-700 hover:bg-gray-50 hover:text-primary-700'
                        }`}
                      >
                        Registrarse/Iniciar Sesión
                      </button>
                    </div>
                    <div className="py-1">
                      <button
                        disabled={!session}
                        onClick={() => {
                          setShowClientPortal(true);
                          setShowB2bDropdown(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-xs font-semibold flex items-center gap-2 cursor-pointer transition-colors border-0 bg-transparent ${
                          !session 
                            ? 'text-gray-300 cursor-not-allowed bg-gray-50/50' 
                            : 'text-gray-700 hover:bg-gray-50 hover:text-primary-700'
                        }`}
                      >
                        Mi Cuenta
                      </button>
                      <button
                        disabled={!session}
                        onClick={() => {
                          logoutClient();
                          setShowB2bDropdown(false);
                          router.push("/catalog");
                        }}
                        className={`w-full text-left px-4 py-2 text-xs font-semibold flex items-center gap-2 cursor-pointer transition-colors border-0 bg-transparent ${
                          !session 
                            ? 'text-gray-300 cursor-not-allowed bg-gray-50/50' 
                            : 'text-red-600 hover:bg-red-50'
                        }`}
                      >
                        Salir
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="md:hidden text-gray-500 hover:text-gray-900 p-2">
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className={`bg-white border-t ${isMobileMenuOpen ? 'block' : 'hidden'} md:block`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ul className="flex flex-col md:flex-row md:space-x-8 py-3 text-sm font-medium text-gray-600 gap-4 md:gap-0 items-start md:items-center">
            {categories.map((cat) => {
              const isEco = cat.toLowerCase().includes("ecoló") || cat.toLowerCase().includes("ecolo");
              return (
                <li key={cat}>
                  <Link 
                    href={`/catalog?category=${encodeURIComponent(cat)}`} 
                    onClick={() => setIsMobileMenuOpen(false)} 
                    className={`hover:text-primary-600 block py-2 md:py-0 transition-colors ${isEco ? 'text-green-600 font-semibold' : ''}`}
                  >
                    {isEco ? `🌿 ${cat}` : cat}
                  </Link>
                </li>
              );
            })}

            {isAdmin && (
              <>
                <li>
                  <button
                    onClick={() => setShowCategoryEditModal(true)}
                    className="flex items-center gap-1.5 text-primary-600 hover:text-primary-800 font-bold py-2 md:py-0 transition-colors"
                    title="Editar categorías del menú"
                  >
                    <Edit className="w-4 h-4" />
                    <span>Editar Menú</span>
                  </button>
                </li>
                <li>
                  <Link
                    href="/admin"
                    className="flex items-center gap-1.5 text-emerald-600 hover:text-emerald-800 font-extrabold py-2 md:py-0 transition-colors border-l pl-4 border-gray-200"
                    title="Ir al Panel de Administración"
                  >
                    <Sliders className="w-4 h-4" />
                    <span>Panel Admin</span>
                  </Link>
                </li>
              </>
            )}
            
            {/* Mobile-only menu items */}
            <li className="md:hidden border-t pt-4 mt-2 w-full">
              <button 
                onClick={() => { setShowPdfFilterModal(true); setIsMobileMenuOpen(false); }} 
                disabled={isGeneratingPdf} 
                className="flex items-center gap-2 text-gray-600 hover:text-primary-600 w-full text-left py-2"
              >
                <FileText className="w-5 h-5 text-primary-900" />
                <span>{isGeneratingPdf ? 'Generando...' : 'Descargar Catálogo PDF'}</span>
              </button>
            </li>
            <li className="md:hidden w-full">
              <Link href="/catalog" onClick={() => setIsMobileMenuOpen(false)} className="text-gray-600 hover:text-primary-600 block py-2 font-bold">Ver todo el catálogo</Link>
            </li>

            <li className="flex-grow hidden md:block"></li>
            {isLoaded && featuredSeason && (
              <li><Link href={`/catalog?season=${encodeURIComponent(featuredSeason)}`} onClick={() => setIsMobileMenuOpen(false)} className="hover:text-red-600 text-red-500 block py-2 md:py-0">✨ Especial {featuredSeason}</Link></li>
            )}
          </ul>
        </div>
      </nav>

      {/* Category selection modal for PDF download */}
      {showPdfFilterModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-900">Descargar Catálogo</h3>
                <button 
                  onClick={() => setShowPdfFilterModal(false)}
                  className="p-1 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <p className="text-sm text-gray-500 mb-6">
                Selecciona si deseas descargar el catálogo completo o filtrado por una categoría específica:
              </p>
              
              <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                {/* Option for All Categories */}
                <button
                  onClick={() => handleDownloadPdf(null)}
                  className="w-full text-left px-4 py-3 rounded-xl border border-primary-100 bg-primary-50/50 hover:bg-primary-50 hover:border-primary-300 transition-all font-bold text-primary-900 flex justify-between items-center"
                >
                  <span>Descargar Todo el Catálogo</span>
                  <span className="text-xs bg-primary-200 text-primary-800 px-2 py-0.5 rounded-full">Completo</span>
                </button>
                
                <div className="border-t border-gray-100 my-4 pt-4">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Filtrar por Categoría:</h4>
                </div>
                
                {/* Options for individual categories */}
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => handleDownloadPdf(cat)}
                    className="w-full text-left px-4 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 transition-all text-sm font-semibold text-gray-700 flex justify-between items-center"
                  >
                    <span>{cat}</span>
                    <span className="text-[10px] text-gray-400 font-normal">Solo esta sección</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Category edit modal for admin */}
      {showCategoryEditModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-900">Editar Categorías (Menú)</h3>
                <button 
                  onClick={() => setShowCategoryEditModal(false)}
                  className="p-1 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex gap-2 mb-6">
                <input 
                  type="text" 
                  value={newCategoryInput}
                  onChange={e => setNewCategoryInput(e.target.value)}
                  placeholder="Nueva categoría..."
                  className="flex-1 bg-gray-50 border border-gray-250 text-gray-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block p-2.5"
                  onKeyDown={e => {
                    if (e.key === 'Enter' && newCategoryInput.trim()) {
                      addCategory(newCategoryInput.trim());
                      setNewCategoryInput("");
                    }
                  }}
                />
                <button 
                  onClick={() => {
                    if (newCategoryInput.trim()) {
                      addCategory(newCategoryInput.trim());
                      setNewCategoryInput("");
                    }
                  }}
                  className="bg-primary-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-primary-700 transition-colors flex items-center justify-center"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                {categories.map((cat, idx) => (
                  <div key={cat} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-100 hover:bg-gray-100/50 transition-colors duration-200">
                    <span className="font-semibold text-gray-700 text-sm">{cat}</span>
                    <div className="flex items-center gap-1">
                      <button 
                        type="button"
                        disabled={idx === 0}
                        onClick={() => moveCategory(idx, 'up')}
                        className="text-gray-400 hover:text-primary-600 disabled:opacity-30 disabled:hover:text-gray-400 transition-colors p-1" 
                        title="Mover arriba"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button 
                        type="button"
                        disabled={idx === categories.length - 1}
                        onClick={() => moveCategory(idx, 'down')}
                        className="text-gray-400 hover:text-primary-600 disabled:opacity-30 disabled:hover:text-gray-400 transition-colors p-1" 
                        title="Mover abajo"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                      <div className="h-4 w-[1px] bg-gray-200 mx-1"></div>
                      <button onClick={() => removeCategory(cat)} className="text-gray-400 hover:text-red-600 transition-colors p-1" title="Eliminar">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                {categories.length === 0 && <p className="text-gray-550 text-sm italic text-center py-4">No hay categorías.</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* B2B Client Login/Registration Modal */}
      {showB2BLogin && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 transition-all duration-300">
          <div className={`bg-white rounded-2xl shadow-2xl w-full ${isB2bRegistering ? 'max-w-md' : 'max-w-sm'} overflow-hidden border border-gray-100/80 animate-in fade-in zoom-in-95 duration-300 text-left transition-all`}>
            <div className="p-6 relative">
              
              {/* Header */}
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-primary-600" />
                  {isB2bResetting ? "Recuperar Clave B2B" : isB2bRegistering ? "Registro Cliente B2B" : "Acceso Clientes B2B"}
                </h3>
                <button 
                  onClick={() => {
                    setShowB2BLogin(false);
                    setIsB2bRegistering(false);
                    setB2bRegSuccess(false);
                    setB2bLoginError("");
                    setIsB2bResetting(false);
                    setB2bResetSuccess(false);
                    setB2bResetEmail("");
                  }}
                  className="p-1.5 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {isB2bResetting ? (
                /* PASSWORD RESET FLOW */
                b2bResetSuccess ? (
                  <div className="text-center py-6 space-y-4 animate-in fade-in duration-300">
                    <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto border border-green-100 shadow-inner">
                      <KeyRound className="w-8 h-8 text-green-600 animate-bounce" />
                    </div>
                    <h4 className="text-lg font-bold text-gray-900">¡Clave Enviada!</h4>
                    <p className="text-xs text-gray-500 leading-relaxed px-2">
                      Hemos procesado tu solicitud. Tu clave de acceso ha sido enviada por **WhatsApp** y **correo electrónico** para que puedas copiarla e ingresar a tu cuenta.
                    </p>

                    <div className="pt-2 pb-1">
                      <button
                        type="button"
                        onClick={handleBackgroundResend}
                        disabled={isResending}
                        className="w-full flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white rounded-lg py-2 px-4 font-bold transition-all text-[11px] cursor-pointer shadow-sm hover:shadow-md"
                      >
                        {isResending ? (
                          <span className="flex items-center gap-1 justify-center">
                            <svg className="animate-spin -ml-1 mr-1.5 h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Reenviando...
                          </span>
                        ) : (
                          "Reenviar Clave (WhatsApp y Correo)"
                        )}
                      </button>

                      {resendStatus && (
                        <p className={`text-[10px] mt-2 font-semibold ${resendStatus.startsWith("Error") ? "text-red-500 bg-red-50 border border-red-100" : "text-green-600 bg-green-50 border border-green-100"} p-2 rounded-lg text-center transition-all duration-200`}>
                          {resendStatus}
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setIsB2bResetting(false);
                        setB2bResetSuccess(false);
                        setB2bResetEmail("");
                        setB2bLoginError("");
                        setResendStatus("");
                      }}
                      className="w-full mt-2 bg-gray-150 hover:bg-gray-200 text-gray-700 rounded-lg py-2.5 font-bold transition-colors text-xs cursor-pointer"
                    >
                      Volver al inicio de sesión
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleB2bResetSubmit} className="space-y-4 animate-in fade-in duration-350">
                    <p className="text-xs text-gray-500 leading-relaxed text-center">
                      Ingresa tu correo electrónico registrado y te enviaremos tu clave de acceso de inmediato por correo corporativo y WhatsApp.
                    </p>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Correo Registrado</label>
                      <input
                        type="email"
                        value={b2bResetEmail}
                        onChange={(e) => setB2bResetEmail(e.target.value)}
                        placeholder="correo@empresa.com"
                        className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-primary-500 outline-none"
                        required
                      />
                    </div>
                    {b2bLoginError && (
                      <p className="text-red-500 text-xs text-center font-medium bg-red-50 p-2 rounded-lg border border-red-100">
                        {b2bLoginError}
                      </p>
                    )}
                    <div className="space-y-2 pt-2">
                      <button
                        type="submit"
                        disabled={isB2bResetLoading}
                        className="w-full bg-primary-600 hover:bg-primary-700 text-white rounded-lg py-2.5 font-bold transition-colors disabled:opacity-50 flex items-center justify-center cursor-pointer text-sm uppercase"
                      >
                        {isB2bResetLoading ? "Enviando..." : "Recuperar Clave B2B"}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setIsB2bResetting(false);
                          setB2bLoginError("");
                          setB2bResetEmail("");
                        }}
                        className="w-full text-center text-xs font-bold text-gray-500 hover:text-gray-700 transition-colors py-1 cursor-pointer"
                      >
                        Volver al inicio de sesión
                      </button>
                    </div>
                  </form>
                )
              ) : isB2bRegistering ? (
                /* REGISTRATION FLOW */
                b2bRegSuccess ? (
                  <div className="text-center py-6 space-y-4 animate-in fade-in duration-300">
                    <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto border border-green-100 shadow-inner">
                      <Building2 className="w-8 h-8 text-green-600 animate-bounce" />
                    </div>
                    <h4 className="text-lg font-bold text-gray-900">¡Registro Exitoso!</h4>
                    <p className="text-xs text-gray-500 leading-relaxed px-2">
                      Hemos registrado tu información comercial. Tu clave de acceso personalizada ha sido enviada por **WhatsApp** y **correo electrónico** para que puedas copiarla e ingresar a tu cuenta.
                    </p>

                    <button
                      type="button"
                      onClick={() => {
                        setShowB2BLogin(false);
                        setIsB2bRegistering(false);
                        setB2bRegSuccess(false);
                        setResendStatus("");
                        router.push("/catalog");
                      }}
                      className="w-full bg-primary-600 hover:bg-primary-700 text-white rounded-lg py-2.5 font-bold transition-all text-xs cursor-pointer shadow-sm hover:shadow-md uppercase tracking-wider"
                    >
                      Aceptar y Cerrar
                    </button>

                    <div className="pt-2 pb-1">
                      <button
                        type="button"
                        onClick={handleBackgroundResend}
                        disabled={isResending}
                        className="w-full text-center text-xs font-bold text-gray-500 hover:text-gray-700 transition-colors py-1 cursor-pointer hover:underline"
                      >
                        {isResending ? (
                          <span className="flex items-center gap-1 justify-center text-gray-400">
                            <svg className="animate-spin -ml-1 mr-1.5 h-3 w-3 text-gray-450" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Reenviando...
                          </span>
                        ) : (
                          "Reenviar Clave (WhatsApp y Correo)"
                        )}
                      </button>

                      {resendStatus && (
                        <p className={`text-[10px] mt-2 font-semibold ${resendStatus.startsWith("Error") ? "text-red-500 bg-red-50 border border-red-100" : "text-green-600 bg-green-50 border border-green-100"} p-2 rounded-lg text-center transition-all duration-200`}>
                          {resendStatus}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleB2bRegisterSubmit} className="space-y-4 animate-in fade-in duration-300">
                    <div className="text-center pb-2">
                      <h4 className="text-lg font-bold text-gray-900">Crea tu cuenta empresarial B2B</h4>
                      <p className="text-xs text-gray-500">Es fácil y rápido. Obtén acceso a precios de escala y descuentos especiales.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[50vh] overflow-y-auto px-1">
                      {/* Razón Social */}
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Razón Social *</label>
                        <input
                          type="text"
                          value={b2bRegBusinessName}
                          onChange={(e) => handleRegInputChange("company", e.target.value)}
                          onBlur={(e) => handleRegInputBlur("company", e.target.value)}
                          placeholder="Empresa S.A. de C.V."
                          className={`w-full border ${regErrors.company ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-primary-500'} rounded-lg p-2 text-sm outline-none transition-all`}
                          required
                        />
                        {regErrors.company && <p className="text-red-500 text-[10px] mt-0.5">{regErrors.company}</p>}
                      </div>

                      {/* RFC */}
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">RFC (si requieres facturación)</label>
                        <input
                          type="text"
                          value={b2bRegRfc}
                          onChange={(e) => handleRegInputChange("rfc", e.target.value)}
                          onBlur={(e) => handleRegInputBlur("rfc", e.target.value)}
                          placeholder="XAXX010101000"
                          className={`w-full border ${regErrors.rfc ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-primary-500'} rounded-lg p-2 text-sm outline-none transition-all font-mono uppercase`}
                        />
                        {regErrors.rfc && <p className="text-red-500 text-[10px] mt-0.5">{regErrors.rfc}</p>}
                      </div>

                      {/* Nombre del responsable */}
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Nombre del responsable *</label>
                        <input
                          type="text"
                          value={b2bRegContactName}
                          onChange={(e) => handleRegInputChange("name", e.target.value)}
                          onBlur={(e) => handleRegInputBlur("name", e.target.value)}
                          placeholder="Juan Pérez"
                          className={`w-full border ${regErrors.name ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-primary-500'} rounded-lg p-2 text-sm outline-none transition-all`}
                          required
                        />
                        {regErrors.name && <p className="text-red-500 text-[10px] mt-0.5">{regErrors.name}</p>}
                      </div>

                      {/* Correo corporativo */}
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Correo corporativo *</label>
                        <input
                          type="email"
                          value={b2bRegEmail}
                          onChange={(e) => handleRegInputChange("email", e.target.value)}
                          onBlur={(e) => handleRegInputBlur("email", e.target.value)}
                          placeholder="correo@empresa.com"
                          className={`w-full border ${regErrors.email ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-primary-500'} rounded-lg p-2 text-sm outline-none transition-all`}
                          required
                        />
                        {regErrors.email && <p className="text-red-500 text-[10px] mt-0.5">{regErrors.email}</p>}
                      </div>

                      {/* Teléfono de contacto */}
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Teléfono o WhatsApp de contacto *</label>
                        <input
                          type="tel"
                          value={b2bRegPhone}
                          onChange={(e) => handleRegInputChange("phone", e.target.value)}
                          onBlur={(e) => handleRegInputBlur("phone", e.target.value)}
                          placeholder="4491234567"
                          className={`w-full border ${regErrors.phone ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-primary-500'} rounded-lg p-2 text-sm outline-none transition-all`}
                          required
                        />
                        {regErrors.phone && <p className="text-red-500 text-[10px] mt-0.5">{regErrors.phone}</p>}
                      </div>

                      {/* Código Postal */}
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Código Postal *</label>
                        <input
                          type="text"
                          value={b2bRegZip}
                          onChange={(e) => handleRegInputChange("zip", e.target.value)}
                          onBlur={(e) => handleRegInputBlur("zip", e.target.value)}
                          placeholder="20000"
                          className={`w-full border ${regErrors.zip ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-primary-500'} rounded-lg p-2 text-sm outline-none transition-all`}
                          required
                        />
                        {regErrors.zip && <p className="text-red-500 text-[10px] mt-0.5">{regErrors.zip}</p>}
                      </div>

                      {/* Estado */}
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Estado *</label>
                        <select
                          value={b2bRegState}
                          onChange={(e) => handleRegInputChange("state", e.target.value)}
                          onBlur={(e) => handleRegInputBlur("state", e.target.value)}
                          className={`w-full border ${regErrors.state ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-primary-500'} rounded-lg p-2 text-sm outline-none transition-all bg-white`}
                          required
                        >
                          <option value="">Selecciona un Estado</option>
                          {MEXICO_STATES.map((st) => (
                            <option key={st} value={st}>{st}</option>
                          ))}
                        </select>
                        {regErrors.state && <p className="text-red-500 text-[10px] mt-0.5">{regErrors.state}</p>}
                      </div>

                      {/* Ciudad */}
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Ciudad *</label>
                        <select
                          value={b2bRegCity}
                          onChange={(e) => handleRegInputChange("city", e.target.value)}
                          onBlur={(e) => handleRegInputBlur("city", e.target.value)}
                          className={`w-full border ${regErrors.city ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-primary-500'} rounded-lg p-2 text-sm outline-none transition-all bg-white`}
                          required
                        >
                          <option value="">Selecciona una Ciudad</option>
                          {b2bRegState && (mexicoData as Record<string, string[]>)[b2bRegState]?.map((ct) => (
                            <option key={ct} value={ct}>{ct}</option>
                          ))}
                        </select>
                        {regErrors.city && <p className="text-red-500 text-[10px] mt-0.5">{regErrors.city}</p>}
                      </div>

                      {/* Calle */}
                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-gray-700 mb-1">Calle *</label>
                        <input
                          type="text"
                          value={b2bRegStreet}
                          onChange={(e) => handleRegInputChange("street", e.target.value)}
                          onBlur={(e) => handleRegInputBlur("street", e.target.value)}
                          placeholder="Nombre de la calle"
                          className={`w-full border ${regErrors.street ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-primary-500'} rounded-lg p-2 text-sm outline-none transition-all bg-white text-gray-900`}
                          required
                        />
                        {regErrors.street && <p className="text-red-500 text-[10px] mt-0.5">{regErrors.street}</p>}
                      </div>

                      {/* Número Exterior */}
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Núm Exterior *</label>
                        <input
                          type="text"
                          value={b2bRegExtNum}
                          onChange={(e) => handleRegInputChange("exterior_number", e.target.value)}
                          onBlur={(e) => handleRegInputBlur("exterior_number", e.target.value)}
                          placeholder="Ej. 123"
                          className={`w-full border ${regErrors.exterior_number ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-primary-500'} rounded-lg p-2 text-sm outline-none transition-all bg-white text-gray-900`}
                          required
                        />
                        {regErrors.exterior_number && <p className="text-red-500 text-[10px] mt-0.5">{regErrors.exterior_number}</p>}
                      </div>

                      {/* Número Interior */}
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Núm Interior (Opcional)</label>
                        <input
                          type="text"
                          value={b2bRegIntNum}
                          onChange={(e) => handleRegInputChange("interior_number", e.target.value)}
                          placeholder="Ej. Depto 2B"
                          className="w-full border border-gray-300 focus:ring-primary-500 rounded-lg p-2 text-sm outline-none transition-all bg-white text-gray-900"
                        />
                      </div>

                      {/* Colonia */}
                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-gray-700 mb-1">Colonia *</label>
                        <input
                          type="text"
                          value={b2bRegNeighborhood}
                          onChange={(e) => handleRegInputChange("neighborhood", e.target.value)}
                          onBlur={(e) => handleRegInputBlur("neighborhood", e.target.value)}
                          placeholder="Nombre de la colonia"
                          className={`w-full border ${regErrors.neighborhood ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-primary-500'} rounded-lg p-2 text-sm outline-none transition-all bg-white text-gray-900`}
                          required
                        />
                        {regErrors.neighborhood && <p className="text-red-500 text-[10px] mt-0.5">{regErrors.neighborhood}</p>}
                      </div>

                      {/* Referencias */}
                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-gray-700 mb-1">Referencias (Opcional)</label>
                        <input
                          type="text"
                          value={b2bRegReference}
                          onChange={(e) => handleRegInputChange("reference", e.target.value)}
                          placeholder="Entre calles, color de fachada, etc."
                          className="w-full border border-gray-300 focus:ring-primary-500 rounded-lg p-2 text-sm outline-none transition-all bg-white text-gray-900"
                        />
                      </div>

                      {/* ¿Qué tipo de proyecto estás buscando? */}
                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-gray-700 mb-1">¿Qué tipo de proyecto estás buscando?</label>
                        <textarea
                          value={b2bRegNotes}
                          onChange={(e) => setB2bRegNotes(e.target.value)}
                          placeholder="Ej. Regalos para empleados, kits de bienvenida, evento corporativo, feria comercial, campaña de fidelización, artículos promocionales para clientes..."
                          rows={2}
                          className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-primary-500 outline-none transition-all resize-none"
                        />
                      </div>
                    </div>

                    {b2bLoginError && (
                      <p className="text-red-500 text-xs text-center font-medium bg-red-50 p-2 rounded-lg border border-red-100">
                        {b2bLoginError}
                      </p>
                    )}

                    <div className="space-y-2 pt-2">
                      <button
                        type="submit"
                        disabled={isB2bLoggingIn}
                        className="w-full bg-primary-600 hover:bg-primary-700 text-white rounded-lg py-2.5 font-bold transition-colors disabled:opacity-50 flex items-center justify-center cursor-pointer text-sm uppercase"
                      >
                        {isB2bLoggingIn ? "Registrando..." : "Regístrate"}
                      </button>

                      <div className="text-center text-[11px] text-gray-500 leading-normal px-2">
                        Al registrarse, acepta nuestra{" "}
                        <Link href="/soporte/aviso-privacidad" target="_blank" className="text-primary-600 font-bold hover:underline">
                          Política de privacidad y cookies
                        </Link>{" "}
                        y nuestras{" "}
                        <Link href="/soporte/politicas-envio" target="_blank" className="text-primary-600 font-bold hover:underline">
                          Políticas de Envío
                        </Link>
                        .
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setIsB2bRegistering(false);
                          setB2bLoginError("");
                        }}
                        className="w-full text-center text-xs font-bold text-gray-500 hover:text-gray-700 transition-colors py-1 cursor-pointer"
                      >
                        ¿Ya eres cliente? Inicia sesión aquí
                      </button>
                    </div>
                  </form>
                )
              ) : (
                /* LOGIN FLOW */
                <form onSubmit={handleB2bLoginSubmit} className="space-y-4 animate-in fade-in duration-350" autoComplete="off">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Correo Registrado</label>
                    <input
                      type="email"
                      value={b2bEmail}
                      onChange={(e) => setB2bEmail(e.target.value)}
                      placeholder="correo@empresa.com"
                      className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-primary-500 outline-none"
                      required
                      autoComplete="email-disabled"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-xs font-bold text-gray-700">Clave de Acceso B2B</label>
                      <button
                        type="button"
                        onClick={() => {
                          setIsB2bResetting(true);
                          setB2bLoginError("");
                        }}
                        className="text-[10px] text-primary-600 font-bold hover:underline cursor-pointer"
                      >
                        ¿Olvidaste tu clave?
                      </button>
                    </div>
                    <input
                      type="password"
                      value={b2bAccessKey}
                      onChange={(e) => setB2bAccessKey(e.target.value)}
                      placeholder="GS-B2B-XXXX"
                      className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-primary-500 font-mono outline-none"
                      required
                      autoComplete="new-password"
                    />
                  </div>
                  {b2bLoginError && (
                    <p className="text-red-500 text-xs text-center font-medium bg-red-50 p-2 rounded-lg border border-red-100">
                      {b2bLoginError}
                    </p>
                  )}
                  <div className="space-y-2 pt-2">
                    <button
                      type="submit"
                      disabled={isB2bLoggingIn}
                      className="w-full bg-primary-600 hover:bg-primary-700 text-white rounded-lg py-2.5 font-bold transition-colors disabled:opacity-50 flex items-center justify-center cursor-pointer text-sm uppercase"
                    >
                      {isB2bLoggingIn ? "Ingresando..." : "Iniciar Sesión"}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsB2bRegistering(true);
                        setB2bLoginError("");
                        setB2bRegSuccess(false);
                      }}
                      className="w-full text-center text-xs font-bold text-primary-600 hover:text-primary-800 transition-colors py-1 cursor-pointer"
                    >
                      ¿No tienes una cuenta B2B? Solicita tu registro aquí
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* B2B Client Dashboard Overlay Portal */}
      {showClientPortal && (
        <div className="fixed inset-0 bg-white z-50 overflow-y-auto animate-in slide-in-from-bottom duration-300">
          <ClientPortalView onBack={() => setShowClientPortal(false)} />
        </div>
      )}
    </header>
  );
}
