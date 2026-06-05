"use client";

import { useState, useMemo, useEffect } from "react";
import { useCart } from "@/hooks/useCart";
import { useQuotes } from "@/hooks/useQuotes";
import Link from "next/link";
import { Trash2, ShoppingCart, FileText, Send, AlertCircle, RotateCw } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import mexicoData from "@/utils/mexicoStates.json";
import { getColorName, Product } from "@/types";
import { useProducts } from "@/hooks/useProducts";
import { ProductCard } from "./ProductCard";
import { formatCurrency } from "@/utils/formatters";
import Image from "next/image";
import { useClientAuth } from "@/hooks/useClientAuth";
import { useCRM } from "@/hooks/useCRM";
import { useSettings } from "@/hooks/useSettings";
import { supabase } from "@/lib/supabase";

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

const getImageElement = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    if (src && !src.startsWith('data:')) {
      img.crossOrigin = "Anonymous";
    }
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
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
  if (ladasAllowed.length === 0) return true; // Fallback
  
  // Check if first 2 digits match
  const prefix2 = digits.substring(0, 2);
  if (ladasAllowed.includes(prefix2)) return true;
  
  // Check if first 3 digits match
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

export function CartView() {
  const { cartItems, isLoaded, updateQuantity, removeFromCart, cartTotal, clearCart } = useCart();
  const { addQuote } = useQuotes();
  const { products } = useProducts();
  const { homeSettings } = useSettings();
  const { getCustomerProfile, customers } = useCRM();
  const { session: clientSession } = useClientAuth();

  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedB2BCustomerId, setSelectedB2BCustomerId] = useState<string>("");
  const [selectedCustomerProfile, setSelectedCustomerProfile] = useState<any>(null);

  // Determine active B2B session
  const activeB2BSession = clientSession || selectedCustomerProfile;

  // Check if standard admin session exists
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setIsAdmin(!!data.session);
    });
  }, []);

  // Autofill if B2B client session is active
  useEffect(() => {
    if (clientSession) {
      const primaryContact = clientSession.contact;
      const defaultAddress = clientSession.addresses.find((a: any) => a.is_default) || clientSession.addresses[0];
      
      setFormData(prev => ({
        ...prev,
        name: primaryContact ? (primaryContact.name || "") : "",
        company: clientSession.customer.commercial_name || clientSession.customer.business_name || "",
        email: (primaryContact && primaryContact.email) ? primaryContact.email : "",
        phone: (primaryContact && primaryContact.phone) ? primaryContact.phone : "",
        zip: defaultAddress ? (defaultAddress.postal_code || "") : "",
        state: defaultAddress ? (defaultAddress.state || "") : "",
        city: defaultAddress ? (defaultAddress.city || "") : "",
        address: defaultAddress ? `${defaultAddress.street || ""} ${defaultAddress.exterior_number || ""}${defaultAddress.interior_number ? ' Int ' + defaultAddress.interior_number : ''}, Col. ${defaultAddress.neighborhood || ""}` : ""
      }));
      setErrors({});
    }
  }, [clientSession]);

  const handleSelectCustomer = async (id: string) => {
    setSelectedB2BCustomerId(id);
    if (!id) {
      setSelectedCustomerProfile(null);
      // Reset form
      setFormData({
        name: "",
        company: "",
        email: "",
        phone: "",
        zip: "",
        state: "",
        city: "",
        address: "",
        comments: ""
      });
      setErrors({});
      return;
    }
    try {
      const profile = await getCustomerProfile(id);
      setSelectedCustomerProfile(profile);
      
      const primaryContact = profile.contacts.find((c: any) => c.is_primary) || profile.contacts[0];
      const defaultAddress = profile.addresses.find((a: any) => a.is_default) || profile.addresses[0];
      
      setFormData(prev => ({
        ...prev,
        name: primaryContact ? (primaryContact.name || "") : "",
        company: profile.customer.commercial_name || profile.customer.business_name || "",
        email: (primaryContact && primaryContact.email) ? primaryContact.email : "",
        phone: (primaryContact && primaryContact.phone) ? primaryContact.phone : "",
        zip: defaultAddress ? (defaultAddress.postal_code || "") : "",
        state: defaultAddress ? (defaultAddress.state || "") : "",
        city: defaultAddress ? (defaultAddress.city || "") : "",
        address: defaultAddress ? `${defaultAddress.street || ""} ${defaultAddress.exterior_number || ""}${defaultAddress.interior_number ? ' Int ' + defaultAddress.interior_number : ''}, Col. ${defaultAddress.neighborhood || ""}` : ""
      }));
      setErrors({});
    } catch (e) {
      console.error("Error loading selected customer profile:", e);
    }
  };

  // Recalculate cart items with dynamic B2B pricing scales
  const recalculatedItems = useMemo(() => {
    return cartItems.map(item => {
      const product = products.find(p => p.id === item.productId);
      if (!product) return { ...item, isB2BApplied: false };

      const printPrices: Record<string, number> = {
        "Sin Impresión": 0,
        "Grabado Chico": 15,
        "Grabado Grande": 25,
        "DTF": 12,
        "Impresión 1 tinta": 10,
        "Impresión 2 tintas": 18,
        "Impresión 3 tintas": 25,
        "Impresión 4 tintas": 30,
        ...(homeSettings?.print_prices || {})
      };
      const printPrice = item.isPersonalized ? (printPrices[item.printOption] || 0) : 0;

      const basePrice = product.price || 0;
      const discountQty1 = product.discountQty1 ?? 100;
      const discountQty2 = product.discountQty2 ?? 150;
      const roundToHalf = (num: number) => Math.round(num * 2) / 2;
      const tier2Price = roundToHalf(basePrice * (1 - (product.discount100 || 0) / 100));
      const tier3Price = roundToHalf(basePrice * (1 - (product.discount150 || 0) / 100));

      let unitProductPrice = basePrice;
      if (item.quantity > discountQty2) {
        unitProductPrice = tier3Price;
      } else if (item.quantity >= discountQty1) {
        unitProductPrice = tier2Price;
      }

      if (activeB2BSession) {
        let priceAfterLevel = unitProductPrice;
        const priceLevel = activeB2BSession.customer.price_level;
        
        if (priceLevel === "wholesale") {
          const option1 = tier2Price;
          const option2 = unitProductPrice * 0.90;
          priceAfterLevel = Math.min(option1, option2);
        } else if (priceLevel === "distributor") {
          const option1 = tier3Price;
          const option2 = unitProductPrice * 0.80;
          priceAfterLevel = Math.min(option1, option2);
        } else if (priceLevel === "special") {
          priceAfterLevel = unitProductPrice * 0.75;
        }

        let bestDiscount = 0;
        const activeDiscounts = activeB2BSession.discounts || [];
        
        const prodDisc = activeDiscounts.find((d: any) => d.active && d.discount_type === "product" && d.product_id === product.id);
        const catDisc = activeDiscounts.find((d: any) => d.active && d.discount_type === "category" && d.category_id?.toLowerCase() === product.category?.toLowerCase());
        const globDisc = activeDiscounts.find((d: any) => d.active && d.discount_type === "global");
        
        if (prodDisc) {
          bestDiscount = prodDisc.discount_percent;
        } else if (catDisc) {
          bestDiscount = catDisc.discount_percent;
        } else if (globDisc) {
          bestDiscount = globDisc.discount_percent;
        } else {
          bestDiscount = activeB2BSession.customer.assigned_discount_percent || 0;
        }

        const b2bProductPrice = roundToHalf(priceAfterLevel * (1 - bestDiscount / 100));
        const finalUnit = b2bProductPrice + printPrice;
        return {
          ...item,
          unitPrice: finalUnit,
          totalPrice: finalUnit * item.quantity,
          isB2BApplied: true,
          originalPrice: basePrice + printPrice
        };
      }

      const finalUnit = unitProductPrice + printPrice;
      return {
        ...item,
        unitPrice: finalUnit,
        totalPrice: finalUnit * item.quantity,
        isB2BApplied: false
      };
    });
  }, [cartItems, products, activeB2BSession, homeSettings]);

  const recalculatedTotal = useMemo(() => {
    return recalculatedItems.reduce((sum, item) => sum + item.totalPrice, 0);
  }, [recalculatedItems]);

  const [recentViews, setRecentViews] = useState<Product[]>([]);
  
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("b2b_recent_views");
        if (stored) {
          const parsed = JSON.parse(stored) as Product[];
          const activeRecent = parsed.filter(p => products.some(prod => prod.id === p.id && prod.published !== false));
          setRecentViews(activeRecent.slice(0, 2));
        }
      } catch (e) {
        console.warn("Failed to load recent views", e);
      }
    }
  }, [products]);

  const suggestedProducts = useMemo(() => {
    const featured = products.filter(p => p.featured && p.published !== false);
    const recentIds = new Set(recentViews.map(r => r.id));
    const filteredFeatured = featured.filter(p => !recentIds.has(p.id));
    
    const list = [...recentViews];
    for (const p of filteredFeatured) {
      if (list.length >= 4) break;
      list.push(p);
    }
    for (const p of featured) {
      if (list.length >= 4) break;
      if (!list.some(item => item.id === p.id)) {
        list.push(p);
      }
    }
    return list.slice(0, 4);
  }, [products, recentViews]);
  
  const [formData, setFormData] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
    zip: "",
    state: "",
    city: "",
    address: "",
    comments: ""
  });
  const [isSending, setIsSending] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const FIELD_ORDER = ["name", "company", "email", "phone", "zip", "state", "city", "address", "comments"];

  const validateField = (field: string, value: string, currentState?: string) => {
    let errorMsg = "";
    
    if (field === "name") {
      const nameTrimmed = value.trim();
      const nameRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]{2,100}$/;
      const words = nameTrimmed.split(/\s+/).filter(w => w.length > 0);
      if (!nameTrimmed || !nameRegex.test(nameTrimmed) || !nameTrimmed.includes(" ") || words.length < 2) {
        errorMsg = "Ingrese Nombre y Apellido";
      }
    }
    
    if (field === "company") {
      const companyTrimmed = value.trim();
      const companyLower = companyTrimmed.toLowerCase();
      const genericWords = ["empresa", "n/a", "na", "prueba", "pruebas", "ninguno", "ninguna", "generico", "test", "generic"];
      const companyRegex = /^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑüÜ\s.,&@'\"()_+\-\/]{2,150}$/;
      if (!companyTrimmed || !companyRegex.test(companyTrimmed) || genericWords.includes(companyLower)) {
        errorMsg = "Ingrese el nombre de su empresa.";
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
        const stateToUse = currentState !== undefined ? currentState : formData.state;
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
      const stateToUse = currentState !== undefined ? currentState : formData.state;
      if (!zipTrimmed || !/^\d{5}$/.test(zipTrimmed) || !validateZipCodeWithState(zipTrimmed, stateToUse)) {
        errorMsg = "Ingrese un código postal válido de 5 dígitos que coincida con el Estado Capturado.";
      }
    }
    
    if (field === "address") {
      if (!value.trim()) {
        errorMsg = "Ingrese su dirección.";
      }
    }
    
    setErrors(prev => {
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

  const handleInputChange = (field: string, value: string) => {
    let cleanedValue = value;
    
    if (field === "phone") {
      cleanedValue = value.replace(/\D/g, "").slice(0, 10);
    } else if (field === "zip") {
      cleanedValue = value.replace(/\D/g, "").slice(0, 5);
    }
    
    setFormData(prev => {
      const updated = { ...prev, [field]: cleanedValue };
      
      if (field === "zip" && cleanedValue.length === 5) {
        const detectedState = getStateFromZip(cleanedValue);
        if (detectedState) {
          updated.state = detectedState;
          const cities = (mexicoData as Record<string, string[]>)[detectedState] || [];
          updated.city = cities[0] || "";
          
          setErrors(errs => {
            const copy = { ...errs };
            delete copy.zip;
            delete copy.state;
            delete copy.city;
            return copy;
          });
          
          const phoneDigits = updated.phone.replace(/\D/g, "");
          if (phoneDigits.length === 10) {
            const isLadaValid = validateLadaWithState(phoneDigits, detectedState);
            setErrors(errs => {
              const copy = { ...errs };
              if (!isLadaValid) {
                copy.phone = "La lada del teléfono no corresponde al estado seleccionado.";
              } else {
                delete copy.phone;
              }
              return copy;
            });
          }
          
          setTimeout(() => {
            const addressEl = document.getElementById("address");
            if (addressEl) {
              addressEl.focus();
            }
          }, 50);
        }
      }
      
      return updated;
    });
    
    if (errors[field]) {
      validateField(field, cleanedValue);
    }
  };

  const handleInputBlur = (field: string, value: string) => {
    validateField(field, value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>, field: string) => {
    if (e.key === 'Enter') {
      if (field === "comments") {
        return;
      }
      e.preventDefault();
      
      const isValid = validateField(field, (e.target as any).value);
      if (isValid) {
        const currentIndex = FIELD_ORDER.indexOf(field);
        if (currentIndex !== -1 && currentIndex < FIELD_ORDER.length - 1) {
          const nextField = FIELD_ORDER[currentIndex + 1];
          const nextElement = document.getElementById(nextField);
          if (nextElement) {
            nextElement.focus();
            if (nextElement.tagName === 'INPUT') {
              (nextElement as HTMLInputElement).select();
            }
          }
        }
      }
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    const nameTrimmed = formData.name.trim();
    const nameRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]{2,100}$/;
    const words = nameTrimmed.split(/\s+/).filter(w => w.length > 0);
    if (!nameTrimmed || !nameRegex.test(nameTrimmed) || !nameTrimmed.includes(" ") || words.length < 2) {
      newErrors.name = "Ingrese Nombre y Apellido";
    }
    
    const companyTrimmed = formData.company.trim();
    const companyLower = companyTrimmed.toLowerCase();
    const genericWords = ["empresa", "n/a", "na", "prueba", "pruebas", "ninguno", "ninguna", "generico", "test", "generic"];
    const companyRegex = /^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑüÜ\s.,&@'\"()_+\-\/]{2,150}$/;
    if (!companyTrimmed || !companyRegex.test(companyTrimmed) || genericWords.includes(companyLower)) {
      newErrors.company = "Ingrese el nombre de su empresa.";
    }
    
    const emailTrimmed = formData.email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailTrimmed || !emailRegex.test(emailTrimmed)) {
      newErrors.email = "Ingrese un correo electrónico válido.";
    } else if (!validateEmailDomain(emailTrimmed)) {
      newErrors.email = "Ingrese un dominio de correo real y válido.";
    }
    
    const phoneDigits = formData.phone.replace(/\D/g, "");
    if (phoneDigits.length !== 10) {
      newErrors.phone = "Ingrese un teléfono válido de 10 dígitos.";
    } else if (formData.state && !validateLadaWithState(phoneDigits, formData.state)) {
      newErrors.phone = "La lada del teléfono no corresponde al estado seleccionado.";
    }
    
    if (!formData.state) {
      newErrors.state = "Seleccione un Estado.";
    }
    if (!formData.city) {
      newErrors.city = "Seleccione una Ciudad.";
    }
    
    const zipTrimmed = formData.zip.trim();
    if (!zipTrimmed || !/^\d{5}$/.test(zipTrimmed) || !validateZipCodeWithState(zipTrimmed, formData.state)) {
      newErrors.zip = "Ingrese un código postal válido de 5 dígitos que coincida con el Estado Capturado.";
    }
    
    if (!formData.address.trim()) {
      newErrors.address = "Ingrese su dirección.";
    }
    
    setErrors(newErrors);
    
    if (Object.keys(newErrors).length > 0) {
      const firstErrorKey = Object.keys(newErrors)[0];
      const element = document.getElementById(firstErrorKey);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
        setTimeout(() => element.focus(), 500);
      }
    }
    
    return Object.keys(newErrors).length === 0;
  };

  const isFormFullyValid = useMemo(() => {
    // Check fields are filled
    const requiredFields = ["name", "company", "email", "phone", "zip", "state", "city", "address"];
    for (const f of requiredFields) {
      if (!formData[f as keyof typeof formData]?.trim()) return false;
    }
    
    // Check if there are active errors
    if (Object.keys(errors).length > 0) return false;
    
    // Validate rules
    const nameTrimmed = formData.name.trim();
    const nameRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]{2,100}$/;
    const nameWords = nameTrimmed.split(/\s+/).filter(w => w.length > 0);
    if (!nameRegex.test(nameTrimmed) || !nameTrimmed.includes(" ") || nameWords.length < 2) return false;
    
    const companyTrimmed = formData.company.trim();
    const companyLower = companyTrimmed.toLowerCase();
    const genericWords = ["empresa", "n/a", "na", "prueba", "pruebas", "ninguno", "ninguna", "generico", "test", "generic"];
    const companyRegex = /^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑüÜ\s.,&@'\"()_+\-\/]{2,150}$/;
    if (!companyRegex.test(companyTrimmed) || genericWords.includes(companyLower)) return false;
    
    const emailTrimmed = formData.email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailTrimmed) || !validateEmailDomain(emailTrimmed)) return false;
    
    const phoneDigits = formData.phone.replace(/\D/g, "");
    if (phoneDigits.length !== 10) return false;
    if (formData.state && !validateLadaWithState(phoneDigits, formData.state)) return false;
    
    const zipTrimmed = formData.zip.trim();
    if (!/^\d{5}$/.test(zipTrimmed) || !validateZipCodeWithState(zipTrimmed, formData.state)) return false;
    
    if (!formData.state || !formData.city || !formData.address.trim()) return false;
    
    return true;
  }, [formData, errors]);

  if (!isLoaded) {
    return <div className="text-center py-20 text-gray-500">Cargando carrito...</div>;
  }

  if (cartItems.length === 0) {
    return (
      <div className="space-y-12">
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm max-w-2xl mx-auto">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShoppingCart className="w-10 h-10 text-gray-300" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Tu cotización está vacía</h2>
          <p className="text-gray-550 mb-8">Aún no has agregado productos a tu lista de cotización.</p>
        </div>

        {suggestedProducts.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
            <h3 className="text-xl font-bold text-gray-900 mb-6 text-right border-b pb-4">
              Productos que podrían interesarte
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {suggestedProducts.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        )}

        <div className="text-center">
          <Link href="/catalog" className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-8 rounded-full shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 cursor-pointer">
            <RotateCw className="w-6 h-6" />
            Seguir explorando
          </Link>
        </div>
      </div>
    );
  }

  const handleSendQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    // Validar compra mínima por producto en todos los items
    const invalidItem = recalculatedItems.find(i => i.quantity < (i.minPurchase ?? 50));
    if (invalidItem) {
      alert(`Por favor, asegúrate de que el producto "${invalidItem.productName}" tenga al menos ${invalidItem.minPurchase ?? 50} piezas.`);
      return;
    }

    let itemsText = recalculatedItems.map(item => 
      `- ${item.quantity}x ${item.productName} (SKU: ${item.sku}) | Color: ${item.color} | Impresión: ${item.printOption} | P.U. ${formatCurrency(item.unitPrice)}`
    ).join("\n");

    const text = `*SOLICITUD DE COTIZACIÓN B2B*
${activeB2BSession ? `*Nivel B2B:* ${activeB2BSession.customer.price_level.toUpperCase()}\n` : ""}
*Datos del Cliente:*
Empresa: ${formData.company}
Contacto: ${formData.name}
Email: ${formData.email}
Teléfono: ${formData.phone}
Destino: ${formData.city}, ${formData.state}

*Artículos Solicitados:*
${itemsText}

*Subtotal Estimado:* ${formatCurrency(recalculatedTotal)} MXN
*Comentarios:* ${formData.comments || 'Ninguno'}

Quedo en espera de confirmación de existencias.`;

    // Save Quote to DB
    const newQuote = {
      id: `QUOTE-${Date.now()}`,
      date: new Date().toISOString(),
      client: { 
        ...formData,
        customerId: activeB2BSession?.customer?.id || null,
        discountApplied: activeB2BSession ? {
          priceLevel: activeB2BSession.customer.price_level,
          assignedDiscountPercent: activeB2BSession.customer.assigned_discount_percent
        } : null
      },
      items: [...recalculatedItems],
      total: recalculatedTotal,
      status: 'pending' as const
    };
    
    setIsSending(true);
    
    try {
      // 1. Guardar localmente y en Supabase DB
      await addQuote(newQuote);

      const res = await fetch('/api/send-quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newQuote)
      });
      
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al enviar cotización');
      }

      // 3. Notificar al usuario y vaciar carrito
      setShowSuccess(true);
      
      setTimeout(() => {
        setShowSuccess(false);
        clearCart();
      }, 5000);
      
    } catch (error: any) {
      console.error("Error enviando cotización:", error);
      alert(`Hubo un error al procesar la cotización: ${error.message}`);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Items List */}
      <div className="lg:col-span-2 space-y-4">
        {recalculatedItems.map((item) => (
          <div key={item.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col sm:flex-row gap-4 relative">
            <button 
              onClick={() => removeFromCart(item.id)}
              className="absolute top-4 right-4 text-gray-400 hover:text-red-500 transition-colors"
              title="Eliminar artículo"
            >
              <Trash2 className="w-5 h-5" />
            </button>
            
            <div className="flex gap-2 shrink-0">
              <div className="w-24 h-24 bg-gray-50 rounded-lg overflow-hidden border border-gray-100 relative group">
                <Image src={item.mockupImage || item.image} alt={item.productName} width={96} height={96} className="w-full h-full object-contain p-1" />
                <div className="absolute inset-x-0 bottom-0 bg-black/60 text-[10px] text-white font-bold text-center py-0.5">Vista</div>
              </div>
              {item.blueprintImage && (
                <div className="w-24 h-24 bg-gray-50 rounded-lg overflow-hidden border border-gray-100 hidden sm:block relative group">
                  <Image src={item.blueprintImage} alt="Plano Mecánico" width={96} height={96} className="w-full h-full object-contain p-1" />
                  <div className="absolute inset-x-0 bottom-0 bg-black/60 text-[10px] text-white font-bold text-center py-0.5">Plano</div>
                </div>
              )}
            </div>
            
            <div className="flex-1 flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-gray-900 text-lg pr-8">{item.productName}</h3>
                <div className="text-sm text-gray-500 flex flex-wrap gap-x-4 gap-y-1 mt-1 items-center">
                  <span>SKU: {item.sku}</span>
                  <span className="flex items-center gap-1.5">
                    Color: 
                    {item.color.startsWith('#') ? (
                      <>
                        <span 
                          className="w-4 h-4 rounded-full border border-gray-300 inline-block shadow-sm" 
                          style={{ backgroundColor: item.color }}
                          title={getColorName(item.color)}
                        />
                        <span>{getColorName(item.color)}</span>
                      </>
                    ) : (
                      item.color
                    )}
                  </span>
                  <span>{item.printOption}</span>
                </div>
              </div>
              
              <div className="flex flex-wrap items-center justify-between mt-4 gap-4">
                <div className="flex items-center space-x-2">
                  <label className="text-xs font-bold text-gray-500">CANTIDAD:</label>
                  <input 
                    type="number" 
                    min={item.minPurchase ?? 50}
                    value={item.quantity}
                    onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 0)}
                    onBlur={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      const minVal = item.minPurchase ?? 50;
                      if (val > 0 && val < minVal) updateQuantity(item.id, minVal);
                    }}
                    className="w-20 bg-gray-55 border border-gray-300 text-gray-900 text-sm rounded focus:ring-primary-500 focus:border-primary-500 block px-2 py-1 font-bold text-center"
                  />
                  {item.quantity > 0 && item.quantity < (item.minPurchase ?? 50) && (
                    <span className="text-red-500 text-xs flex items-center">
                      <AlertCircle className="w-3 h-3 mr-1" /> Mín. {item.minPurchase ?? 50}
                    </span>
                  )}
                </div>
                
                <div className="text-right">
                  <div className="text-xs text-gray-500">Subtotal</div>
                  <div className="font-black text-primary-700 text-lg">
                    {formatCurrency(item.totalPrice)}
                  </div>
                  {item.isB2BApplied && (
                    <div className="text-[9px] text-green-600 font-bold uppercase tracking-wider mt-0.5">Precio B2B Aplicado</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
        
        <div className="flex justify-between items-center pt-4">
          <Link href="/catalog" className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 px-5 rounded-lg shadow-sm hover:shadow transition-all text-sm cursor-pointer">
            <RotateCw className="w-5 h-5" />
            Seguir comprando
          </Link>
          <button onClick={clearCart} className="text-red-600 hover:text-red-800 text-sm font-normal transition-colors cursor-pointer">
            Vaciar Carrito
          </button>
        </div>
      </div>

      {/* Summary & Form */}
      <div className="lg:col-span-1">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sticky top-24">
          <h3 className="text-xl font-bold text-gray-900 mb-6 border-b pb-4">Resumen de Cotización</h3>
          
          <div className="flex justify-between mb-2 text-gray-600">
            <span>Artículos ({recalculatedItems.length})</span>
            <span>-</span>
          </div>
          <div className="flex justify-between mb-6 text-xl font-black text-gray-900">
            <span>Total Estimado</span>
            <span>{formatCurrency(recalculatedTotal)}</span>
          </div>
          <p className="text-xs text-gray-500 mb-6 text-center">
            * Precios sujetos a verificación de stock y volumen final. No incluye IVA.
          </p>

          <div className="border-t pt-6">
            <h4 className="font-bold text-gray-900 mb-4 text-sm uppercase flex items-center">
              <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center mr-2 text-xs">1</span>
              DATOS DE CONTACTO PARA COTIZACIÓN FORMAL
            </h4>

            {isAdmin && !clientSession && (
              <div className="mb-4 bg-primary-50/50 p-3 rounded-lg border border-primary-100 animate-in fade-in duration-200">
                <label className="block text-xs font-bold text-primary-800 uppercase tracking-wider mb-1.5">
                  Vincular Cliente B2B (Administrador)
                </label>
                <select
                  value={selectedB2BCustomerId}
                  onChange={(e) => handleSelectCustomer(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-primary-500 focus:border-primary-500 font-medium text-gray-700 cursor-pointer"
                >
                  <option value="">-- Seleccionar Cliente B2B --</option>
                  {customers.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.commercial_name || c.business_name} ({c.price_level})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {activeB2BSession && (
              <div className="mb-4 bg-green-50 border border-green-200 text-green-800 rounded-lg p-3 text-xs flex items-center gap-2 animate-in fade-in duration-200">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span>Sesión B2B vinculada. Los datos fiscales y de entrega están bloqueados.</span>
              </div>
            )}

            <form onSubmit={handleSendQuote} className="space-y-4">
              <div>
                <input 
                  id="name"
                  type="text" 
                  placeholder="Nombre Completo *" 
                  value={formData.name} 
                  onChange={e => handleInputChange("name", e.target.value)} 
                  onBlur={e => handleInputBlur("name", e.target.value)}
                  onKeyDown={e => handleKeyDown(e, "name")}
                  disabled={!!activeB2BSession}
                  className={`w-full rounded-lg p-3 text-sm focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed transition-all ${
                    errors.name ? 'border-red-500 ring-1 ring-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'
                  }`} 
                />
                {errors.name && <p className="text-xs text-red-500 mt-1 font-semibold">{errors.name}</p>}
              </div>

              <div>
                <input 
                  id="company"
                  type="text" 
                  placeholder="Empresa *" 
                  value={formData.company} 
                  onChange={e => handleInputChange("company", e.target.value)} 
                  onBlur={e => handleInputBlur("company", e.target.value)}
                  onKeyDown={e => handleKeyDown(e, "company")}
                  disabled={!!activeB2BSession}
                  className={`w-full rounded-lg p-3 text-sm focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed transition-all ${
                    errors.company ? 'border-red-500 ring-1 ring-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'
                  }`} 
                />
                {errors.company && <p className="text-xs text-red-500 mt-1 font-semibold">{errors.company}</p>}
              </div>

              <div>
                <input 
                  id="email"
                  type="email" 
                  placeholder="Email *" 
                  value={formData.email} 
                  onChange={e => handleInputChange("email", e.target.value)} 
                  onBlur={e => handleInputBlur("email", e.target.value)}
                  onKeyDown={e => handleKeyDown(e, "email")}
                  disabled={!!activeB2BSession}
                  className={`w-full rounded-lg p-3 text-sm focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed transition-all ${
                    errors.email ? 'border-red-500 ring-1 ring-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'
                  }`} 
                />
                {errors.email && <p className="text-xs text-red-500 mt-1 font-semibold">{errors.email}</p>}
              </div>

              <div>
                <input 
                  id="phone"
                  type="tel" 
                  placeholder="Teléfono / WhatsApp *" 
                  value={formData.phone} 
                  onChange={e => handleInputChange("phone", e.target.value)} 
                  onBlur={e => handleInputBlur("phone", e.target.value)}
                  onKeyDown={e => handleKeyDown(e, "phone")}
                  disabled={!!activeB2BSession}
                  className={`w-full rounded-lg p-3 text-sm focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed transition-all ${
                    errors.phone ? 'border-red-500 ring-1 ring-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'
                  }`} 
                />
                {errors.phone && <p className="text-xs text-red-500 mt-1 font-semibold">{errors.phone}</p>}
              </div>

              <div>
                <input 
                  id="zip"
                  type="text" 
                  placeholder="Código Postal *" 
                  value={formData.zip} 
                  onChange={e => handleInputChange("zip", e.target.value)} 
                  onBlur={e => handleInputBlur("zip", e.target.value)}
                  onKeyDown={e => handleKeyDown(e, "zip")}
                  disabled={!!activeB2BSession}
                  className={`w-full rounded-lg p-3 text-sm focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed transition-all ${
                    errors.zip ? 'border-red-500 ring-1 ring-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'
                  }`} 
                />
                {errors.zip && <p className="text-xs text-red-500 mt-1 font-semibold">{errors.zip}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <select 
                    id="state"
                    value={formData.state} 
                    onChange={e => {
                      const newState = e.target.value;
                      setFormData(prev => ({ ...prev, state: newState, city: "" }));
                      validateField("state", newState);
                      if (formData.zip) {
                        const isZipValid = validateZipCodeWithState(formData.zip.trim(), newState);
                        setErrors(prev => {
                          const copy = { ...prev };
                          if (!isZipValid) {
                            copy.zip = "Ingrese un código postal válido de 5 dígitos que coincida con el Estado Capturado.";
                          } else {
                            delete copy.zip;
                          }
                          delete copy.state;
                          delete copy.city;
                          return copy;
                        });
                      } else {
                        setErrors(prev => {
                          const copy = { ...prev };
                          delete copy.state;
                          delete copy.city;
                          return copy;
                        });
                      }
                    }} 
                    onKeyDown={e => handleKeyDown(e, "state")}
                    disabled={!!activeB2BSession}
                    className={`w-full rounded-lg p-3 text-sm focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed transition-all ${
                      errors.state ? 'border-red-500 ring-1 ring-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="" disabled>Estado *</option>
                    {MEXICO_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  {errors.state && <p className="text-xs text-red-500 mt-1 font-semibold">{errors.state}</p>}
                </div>
                <div>
                  <select 
                    id="city"
                    value={formData.city} 
                    onChange={e => handleInputChange("city", e.target.value)} 
                    onBlur={e => handleInputBlur("city", e.target.value)}
                    onKeyDown={e => handleKeyDown(e, "city")}
                    disabled={!!activeB2BSession || !formData.state} 
                    className={`w-full rounded-lg p-3 text-sm focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed transition-all ${
                      errors.city ? 'border-red-500 ring-1 ring-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="" disabled>Ciudad / Municipio *</option>
                    {formData.state && (mexicoData as Record<string, string[]>)[formData.state]?.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  {errors.city && <p className="text-xs text-red-500 mt-1 font-semibold">{errors.city}</p>}
                </div>
              </div>

              <div>
                <input 
                  id="address"
                  type="text" 
                  placeholder="Dirección *" 
                  value={formData.address} 
                  onChange={e => handleInputChange("address", e.target.value)} 
                  onBlur={e => handleInputBlur("address", e.target.value)}
                  onKeyDown={e => handleKeyDown(e, "address")}
                  disabled={!!activeB2BSession}
                  className={`w-full rounded-lg p-3 text-sm focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed transition-all ${
                    errors.address ? 'border-red-500 ring-1 ring-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'
                  }`} 
                />
                {errors.address && <p className="text-xs text-red-500 mt-1 font-semibold">{errors.address}</p>}
              </div>

              <textarea 
                id="comments"
                rows={2} 
                placeholder="Comentarios (Opcional)" 
                value={formData.comments} 
                onChange={e => setFormData({...formData, comments: e.target.value})} 
                onKeyDown={e => handleKeyDown(e, "comments")}
                className="w-full border-gray-300 rounded-lg p-3 text-sm focus:ring-primary-500 focus:border-primary-500"
              ></textarea>
              
              {showSuccess && (
                <div className="bg-green-50 border border-green-200 text-green-800 rounded-lg p-4 animate-in fade-in slide-in-from-bottom-2">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-green-800">¡Cotización enviada con éxito!</h3>
                      <div className="mt-2 text-sm text-green-700">
                        <p>Revisa tu WhatsApp para la confirmación, nuestro equipo te contactará a la brevedad.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <button 
                type="submit" 
                disabled={isSending || showSuccess || !isFormFullyValid}
                className="w-full bg-primary-600 text-white font-bold py-4 px-4 rounded-xl shadow-md hover:bg-primary-700 hover:-translate-y-0.5 transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 cursor-pointer"
              >
                <Send className="w-5 h-5 mr-2" />
                {isSending ? "Procesando..." : "Enviar Solicitud"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
