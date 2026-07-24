"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { B2BClientSession, useClientAuth } from "@/hooks/useClientAuth";
import { supabase } from "@/lib/supabase";
import { QuoteRequest } from "@/types";
import { formatCurrency } from "@/utils/formatters";
import { 
  FileText, ArrowLeft, LogOut, Building2, User, MapPin, Percent, 
  ShoppingBag, Eye, EyeOff, X, Download, Plus, Trash2, Edit, Check, CheckCircle2, RotateCcw,
  Gift
} from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { CustomerAddress } from "@/services/crmService";
import mexicoData from "@/utils/mexicoStates.json";

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

export function ClientPortalView({ onBack }: { onBack?: () => void }) {
  const router = useRouter();
  const { session, logoutClient } = useClientAuth();
  const [quotes, setQuotes] = useState<QuoteRequest[]>([]);
  const [orders, setOrders] = useState<QuoteRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingQuote, setViewingQuote] = useState<QuoteRequest | null>(null);

  // States for changing access key
  const [newAccessKey, setNewAccessKey] = useState("");
  const [confirmAccessKey, setConfirmAccessKey] = useState("");
  const [keyChangeError, setKeyChangeError] = useState("");
  const [keyChangeSuccess, setKeyChangeSuccess] = useState("");
  const [isChangingKey, setIsChangingKey] = useState(false);

  // States for password visibility toggle
  const [showNewKey, setShowNewKey] = useState(false);
  const [showConfirmKey, setShowConfirmKey] = useState(false);

  // States for Commercial Data editing
  const [showCommercialModal, setShowCommercialModal] = useState(false);
  const [editBusinessName, setEditBusinessName] = useState("");
  const [editRfc, setEditRfc] = useState("");
  const [commercialError, setCommercialError] = useState("");
  const [isSavingCommercial, setIsSavingCommercial] = useState(false);

  // States for Main Contact editing
  const [showContactModal, setShowContactModal] = useState(false);
  const [editContactName, setEditContactName] = useState("");
  const [editContactEmail, setEditContactEmail] = useState("");
  const [editContactPhone, setEditContactPhone] = useState("");
  const [contactError, setContactError] = useState("");
  const [isSavingContact, setIsSavingContact] = useState(false);

  // States for Shipping Address editing/adding
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState<CustomerAddress | null>(null);
  const [addrStreet, setAddrStreet] = useState("");
  const [addrExtNum, setAddrExtNum] = useState("");
  const [addrIntNum, setAddrIntNum] = useState("");
  const [addrNeighborhood, setAddrNeighborhood] = useState("");
  const [addrZip, setAddrZip] = useState("");
  const [addrState, setAddrState] = useState("");
  const [addrCity, setAddrCity] = useState("");
  const [addrReference, setAddrReference] = useState("");
  const [addrIsDefault, setAddrIsDefault] = useState(false);
  const [addressError, setAddressError] = useState("");
  const [isSavingAddress, setIsSavingAddress] = useState(false);

  const handleChangeAccessKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setKeyChangeError("");
    setKeyChangeSuccess("");

    const keyTrimmed = newAccessKey.trim();
    const confirmTrimmed = confirmAccessKey.trim();

    if (keyTrimmed.length < 4) {
      setKeyChangeError("La clave debe tener al menos 4 caracteres.");
      return;
    }

    if (keyTrimmed !== confirmTrimmed) {
      setKeyChangeError("Las claves ingresadas no coinciden.");
      return;
    }

    setIsChangingKey(true);
    try {
      // 1. Check if key is already taken by another customer
      const { data: existing, error: checkErr } = await supabase
        .from("customers")
        .select("id")
        .eq("access_key", keyTrimmed);

      if (checkErr) throw checkErr;
      if (existing && existing.length > 0 && existing[0].id !== customer.id) {
        setKeyChangeError("Esta clave ya está en uso por otro cliente. Elige otra.");
        setIsChangingKey(false);
        return;
      }

      // 2. Update key
      const { error: updateErr } = await supabase
        .from("customers")
        .update({ access_key: keyTrimmed })
        .eq("id", customer.id);

      if (updateErr) throw updateErr;

      // 3. Log activity in CRM
      await supabase
        .from("customer_activity")
        .insert([{
          customer_id: customer.id,
          activity_type: "note",
          title: "Cambio de Clave",
          description: `El cliente cambió su clave de acceso B2B desde el portal.`,
          created_by: "Cliente"
        }]);

      // 4. Update local session storage
      const saved = localStorage.getItem("geekystore_b2b_session");
      if (saved) {
        const parsed = JSON.parse(saved);
        parsed.customer.access_key = keyTrimmed;
        localStorage.setItem("geekystore_b2b_session", JSON.stringify(parsed));
      }

      setKeyChangeSuccess("¡Clave actualizada con éxito!");
      setNewAccessKey("");
      setConfirmAccessKey("");
    } catch (err: any) {
      console.error(err);
      setKeyChangeError(err.message || "Error al actualizar la clave.");
    } finally {
      setIsChangingKey(false);
    }
  };

  const refreshSessionData = async () => {
    if (!session?.customer?.id) return;
    try {
      const customerId = session.customer.id;
      const [custRes, contactsRes, addressesRes, discountsRes] = await Promise.all([
        supabase.from("customers").select("*").eq("id", customerId).single(),
        supabase.from("customer_contacts").select("*").eq("customer_id", customerId),
        supabase.from("customer_addresses").select("*").eq("customer_id", customerId),
        supabase.from("customer_discounts").select("*").eq("customer_id", customerId)
      ]);

      if (custRes.error) throw custRes.error;

      const freshContact = contactsRes.data?.find(c => c.id === session.contact.id) || contactsRes.data?.find(c => c.is_primary) || contactsRes.data?.[0];

      const freshSession = {
        customer: custRes.data,
        contact: freshContact || session.contact,
        addresses: addressesRes.data || [],
        discounts: discountsRes.data || []
      };

      localStorage.setItem("geekystore_b2b_session", JSON.stringify(freshSession));
      window.dispatchEvent(new Event("b2b_session_updated"));
    } catch (e) {
      console.error("Error refreshing B2B session:", e);
    }
  };

  // Commercial Data methods
  const openEditCommercial = () => {
    if (!session) return;
    setEditBusinessName(session.customer.business_name || "");
    setEditRfc(session.customer.rfc || "");
    setCommercialError("");
    setShowCommercialModal(true);
  };

  const handleSaveCommercial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;
    setCommercialError("");

    const businessNameTrimmed = editBusinessName.trim();
    const rfcTrimmed = editRfc.trim().toUpperCase();

    if (!businessNameTrimmed) {
      setCommercialError("La Razón Social es requerida.");
      return;
    }

    if (rfcTrimmed) {
      const rfcRegex = /^[A-Z&Ñ]{3,4}\d{6}[A-Z0-9]{3}$/;
      if (!rfcRegex.test(rfcTrimmed)) {
        setCommercialError("RFC no válido. Debe tener 12 o 13 caracteres con homoclave conforme al SAT.");
        return;
      }
    }

    setIsSavingCommercial(true);
    try {
      const { error } = await supabase
        .from("customers")
        .update({
          business_name: businessNameTrimmed,
          rfc: rfcTrimmed || null,
          updated_at: new Date().toISOString()
        })
        .eq("id", session.customer.id);

      if (error) throw error;

      await supabase.from("customer_activity").insert([{
        customer_id: session.customer.id,
        activity_type: "note",
        title: "Datos Comerciales Actualizados",
        description: `El cliente actualizó su Razón Social a: "${businessNameTrimmed}" y RFC a: "${rfcTrimmed || 'No registrado'}" desde el portal.`,
        created_by: "Cliente"
      }]);

      await refreshSessionData();
      setShowCommercialModal(false);
    } catch (err: any) {
      console.error(err);
      setCommercialError(err.message || "Error al actualizar los datos comerciales.");
    } finally {
      setIsSavingCommercial(false);
    }
  };

  // Contact Info methods
  const openEditContact = () => {
    if (!session) return;
    setEditContactName(session.contact.name || "");
    setEditContactEmail(session.contact.email || "");
    setEditContactPhone(session.contact.phone || "");
    setContactError("");
    setShowContactModal(true);
  };

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;
    setContactError("");

    const nameTrimmed = editContactName.trim();
    const emailTrimmed = editContactEmail.trim().toLowerCase();
    const phoneDigits = editContactPhone.replace(/\D/g, "");

    const nameRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]{2,100}$/;
    const words = nameTrimmed.split(/\s+/).filter(w => w.length > 0);
    if (!nameTrimmed || !nameRegex.test(nameTrimmed) || !nameTrimmed.includes(" ") || words.length < 2) {
      setContactError("Ingrese Nombre y Apellido.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailTrimmed || !emailRegex.test(emailTrimmed)) {
      setContactError("Ingrese un correo electrónico válido.");
      return;
    }
    if (!validateEmailDomain(emailTrimmed)) {
      setContactError("Ingrese un dominio de correo real y válido.");
      return;
    }

    if (phoneDigits.length !== 10) {
      setContactError("Ingrese un teléfono válido de 10 dígitos.");
      return;
    }

    const defaultAddr = session.addresses.find(a => a.is_default) || session.addresses[0];
    const stateForLada = defaultAddr?.state;
    if (stateForLada && !validateLadaWithState(phoneDigits, stateForLada)) {
      setContactError(`La lada del teléfono no corresponde al estado de tu dirección principal (${stateForLada}).`);
      return;
    }

    setIsSavingContact(true);
    try {
      const { error } = await supabase
        .from("customer_contacts")
        .update({
          name: nameTrimmed,
          email: emailTrimmed,
          phone: phoneDigits,
          whatsapp: phoneDigits
        })
        .eq("id", session.contact.id);

      if (error) throw error;

      await supabase.from("customer_activity").insert([{
        customer_id: session.customer.id,
        activity_type: "note",
        title: "Contacto Principal Actualizado",
        description: `El cliente actualizó su contacto principal a: ${nameTrimmed}, Correo: ${emailTrimmed}, Tel: ${phoneDigits} desde el portal.`,
        created_by: "Cliente"
      }]);

      await refreshSessionData();
      setShowContactModal(false);
    } catch (err: any) {
      console.error(err);
      setContactError(err.message || "Error al actualizar el contacto.");
    } finally {
      setIsSavingContact(false);
    }
  };

  // Shipping Address methods
  const openAddAddress = () => {
    if (!session) return;
    setEditingAddress(null);
    setAddrStreet("");
    setAddrExtNum("");
    setAddrIntNum("");
    setAddrNeighborhood("");
    setAddrZip("");
    setAddrState("");
    setAddrCity("");
    setAddrReference("");
    setAddrIsDefault(session.addresses.length === 0);
    setAddressError("");
    setShowAddressModal(true);
  };

  const openEditAddress = (addr: CustomerAddress) => {
    setEditingAddress(addr);
    setAddrStreet(addr.street || "");
    setAddrExtNum(addr.exterior_number || "");
    setAddrIntNum(addr.interior_number || "");
    setAddrNeighborhood(addr.neighborhood || "");
    setAddrZip(addr.postal_code || "");
    setAddrState(addr.state || "");
    setAddrCity(addr.city || "");
    setAddrReference(addr.reference || "");
    setAddrIsDefault(addr.is_default || false);
    setAddressError("");
    setShowAddressModal(true);
  };

  const handleZipChange = (val: string) => {
    const cleaned = val.replace(/\D/g, "").slice(0, 5);
    setAddrZip(cleaned);

    if (cleaned.length === 5) {
      const detectedState = getStateFromZip(cleaned);
      if (detectedState) {
        setAddrState(detectedState);
        const cities = (mexicoData as Record<string, string[]>)[detectedState] || [];
        setAddrCity(cities[0] || "");
      }
    }
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;
    setAddressError("");

    const streetTrimmed = addrStreet.trim();
    const extNumTrimmed = addrExtNum.trim();
    const intNumTrimmed = addrIntNum.trim();
    const neighborhoodTrimmed = addrNeighborhood.trim();
    const zipTrimmed = addrZip.trim();
    const stateTrimmed = addrState.trim();
    const cityTrimmed = addrCity.trim();
    const referenceTrimmed = addrReference.trim();

    if (!streetTrimmed || !extNumTrimmed || !neighborhoodTrimmed || !stateTrimmed || !cityTrimmed) {
      setAddressError("Por favor completa todos los campos obligatorios.");
      return;
    }

    if (!/^\d{5}$/.test(zipTrimmed)) {
      setAddressError("El Código Postal debe ser de 5 dígitos.");
      return;
    }

    if (!validateZipCodeWithState(zipTrimmed, stateTrimmed)) {
      setAddressError(`El código postal no corresponde al estado seleccionado (${stateTrimmed}).`);
      return;
    }

    setIsSavingAddress(true);
    try {
      if (addrIsDefault) {
        await supabase
          .from("customer_addresses")
          .update({ is_default: false })
          .eq("customer_id", session.customer.id);
      }

      const addressPayload = {
        customer_id: session.customer.id,
        address_type: "shipping" as const,
        street: streetTrimmed,
        exterior_number: extNumTrimmed,
        interior_number: intNumTrimmed || null,
        neighborhood: neighborhoodTrimmed,
        city: cityTrimmed,
        state: stateTrimmed,
        postal_code: zipTrimmed,
        country: "México",
        reference: referenceTrimmed || null,
        is_default: addrIsDefault
      };

      if (editingAddress?.id) {
        const { error } = await supabase
          .from("customer_addresses")
          .update(addressPayload)
          .eq("id", editingAddress.id);
        if (error) throw error;
      } else {
        const isFirst = session.addresses.length === 0;
        if (isFirst) addressPayload.is_default = true;

        const { error } = await supabase
          .from("customer_addresses")
          .insert([addressPayload]);
        if (error) throw error;
      }

      await supabase.from("customer_activity").insert([{
        customer_id: session.customer.id,
        activity_type: "note",
        title: editingAddress?.id ? "Dirección de Envío Modificada" : "Nueva Dirección de Envío",
        description: `El cliente ${editingAddress?.id ? 'editó la dirección' : 'añadió una dirección'}: ${streetTrimmed} #${extNumTrimmed}, CP ${zipTrimmed}, ${cityTrimmed}, ${stateTrimmed} desde el portal.`,
        created_by: "Cliente"
      }]);

      await refreshSessionData();
      setShowAddressModal(false);
    } catch (err: any) {
      console.error(err);
      setAddressError(err.message || "Error al guardar la dirección.");
    } finally {
      setIsSavingAddress(false);
    }
  };

  const handleDeleteAddress = async (id: string, isDefault: boolean) => {
    if (!session) return;
    if (!confirm("¿Estás seguro de eliminar esta dirección?")) return;
    try {
      const { error } = await supabase
        .from("customer_addresses")
        .delete()
        .eq("id", id);
      if (error) throw error;

      await supabase.from("customer_activity").insert([{
        customer_id: session.customer.id,
        activity_type: "note",
        title: "Dirección de Envío Eliminada",
        description: `El cliente eliminó una dirección de envío desde el portal.`,
        created_by: "Cliente"
      }]);

      if (isDefault) {
        const remaining = session.addresses.filter(a => a.id !== id);
        if (remaining.length > 0) {
          await supabase
            .from("customer_addresses")
            .update({ is_default: true })
            .eq("id", remaining[0].id);
        }
      }

      await refreshSessionData();
    } catch (err: any) {
      console.error("Error deleting address:", err);
      alert(err.message || "Error al eliminar la dirección.");
    }
  };

  const handleSetDefaultAddress = async (id: string) => {
    if (!session) return;
    try {
      await supabase
        .from("customer_addresses")
        .update({ is_default: false })
        .eq("customer_id", session.customer.id);

      const { error } = await supabase
        .from("customer_addresses")
        .update({ is_default: true })
        .eq("id", id);

      if (error) throw error;

      await supabase.from("customer_activity").insert([{
        customer_id: session.customer.id,
        activity_type: "note",
        title: "Dirección Predeterminada Cambiada",
        description: `El cliente cambió su dirección de envío predeterminada desde el portal.`,
        created_by: "Cliente"
      }]);

      await refreshSessionData();
    } catch (err: any) {
      console.error("Error setting default address:", err);
      alert(err.message || "Error al establecer la dirección predeterminada.");
    }
  };

  useEffect(() => {
    if (session?.customer?.id) {
      fetchHistory();
    }
  }, [session]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("quotes")
        .select("*")
        .order("date", { ascending: false });

      if (!error && data) {
        const primaryEmail = session?.contact?.email?.toLowerCase();
        const customerQuotes = (data as QuoteRequest[]).filter(q => {
          const qCustId = (q.client as any).customerId;
          if (qCustId === session?.customer.id) return true;
          if (primaryEmail && q.client.email?.toLowerCase() === primaryEmail) return true;
          return false;
        });

        setQuotes(customerQuotes.filter(q => q.status !== "completed"));
        setOrders(customerQuotes.filter(q => q.status === "completed"));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (!session) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-center p-6">
        <Building2 className="w-16 h-16 text-gray-300 mb-4 animate-bounce" />
        <h2 className="text-xl font-bold text-gray-900">Sesión Expirada</h2>
        <p className="text-gray-500 mt-2 mb-6">Por favor inicia sesión desde el menú de B2B.</p>
        {onBack && (
          <button onClick={onBack} className="bg-primary-600 text-white font-bold py-2.5 px-6 rounded-lg shadow hover:bg-primary-700 transition-colors">
            Volver al Inicio
          </button>
        )}
      </div>
    );
  }

  const { customer, contact, addresses, discounts } = session;
  const defaultAddress = addresses.find(a => a.is_default) || addresses[0];

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-150 text-green-800 border-green-200";
      case "reviewed": return "bg-blue-100 text-blue-800 border-blue-200";
      default: return "bg-yellow-100 text-yellow-800 border-yellow-200";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "completed": return "Facturado / Pedido";
      case "reviewed": return "Revisado por Ventas";
      default: return "Pendiente";
    }
  };

  const handleDownloadPdf = async (quote: QuoteRequest) => {
    try {
      const doc = new jsPDF();
      const primaryColor: [number, number, number] = [11, 80, 77];

      doc.setFillColor(...primaryColor);
      doc.rect(0, 0, 210, 25, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.text("COTIZACIÓN B2B - GEEKYSTORE", 14, 17);

      doc.setTextColor(50, 50, 50);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("DATOS DE FACTURACIÓN Y ENVÍO", 14, 35);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`Razón Social: ${customer.business_name}`, 14, 41);
      doc.text(`Contacto: ${quote.client.name}`, 14, 46);
      doc.text(`RFC: ${customer.rfc || "No registrado"}`, 14, 51);
      doc.text(`Términos de Pago: ${customer.payment_terms || "Contado"}`, 14, 56);

      doc.text(`Email: ${quote.client.email}`, 110, 41);
      doc.text(`Teléfono: ${quote.client.phone}`, 110, 46);
      doc.text(`Dirección de Envío: ${quote.client.address || "No especificada"}`, 110, 51);
      doc.text(`Código Postal: ${quote.client.zip || "No especificado"}`, 110, 56);

      const tableData = quote.items.map(item => {
        const itemSubtotal = item.totalPrice;
        return [
          item.sku,
          item.productName,
          item.color.startsWith("#") ? "Especial" : item.color,
          item.printOption,
          item.quantity.toString(),
          formatCurrency(item.unitPrice),
          formatCurrency(itemSubtotal)
        ];
      });

      autoTable(doc, {
        startY: 65,
        head: [["SKU", "Producto", "Color", "Impresión", "Cant.", "P. Unitario", "Subtotal"]],
        body: tableData,
        headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: "bold" },
        styles: { font: "helvetica", fontSize: 9, valign: "middle" },
      });

      const finalY = (doc as any).lastAutoTable.finalY || 70;
      let offset = 15;
      const coupons = (quote.client as any).appliedCoupons;
      if (Array.isArray(coupons) && coupons.length > 0) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(16, 124, 65); // green-ish color
        const couponNames = coupons.map((code: string) => {
          if (code === 'ENVIO_SIN_COSTO') return "Envío sin Costo";
          if (code === 'MUESTRA_Y_ENVIO_GRATIS') return "Muestra Física y Envío Gratis";
          return code;
        }).join(", ");
        doc.text(`Cupones Aplicados: ${couponNames}`, 14, finalY + 10);
        offset = 20;
      }
      doc.setTextColor(50, 50, 50);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text(`Total Cotizado: ${formatCurrency(quote.total)} MXN`, 14, finalY + offset);

      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.text("* Esta es una copia digital de su solicitud de cotización.", 14, finalY + offset + 10);

      const pdfBlob = doc.output("blob");
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Cotizacion_${quote.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("PDF generation failed:", e);
      alert("Error al descargar PDF.");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-300">
      
      {/* Top Bar / Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-6 mb-8 gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Building2 className="w-4 h-4 text-primary-600" />
            <span>Portal de Clientes B2B</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900">{customer.commercial_name || customer.business_name}</h1>
          <p className="text-xs text-gray-400 mt-0.5">Clave Cliente: {customer.access_key}</p>
        </div>
        <div className="flex gap-3">
          {onBack && (
            <button 
              onClick={onBack}
              className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-bold border border-primary-600 hover:border-primary-700 shadow-sm px-4 py-2 rounded-lg text-sm transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" /> Explorar Catálogo
            </button>
          )}
          <button 
            onClick={() => {
              logoutClient();
              if (onBack) onBack();
              router.push("/catalog");
            }}
            className="flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-700 font-bold px-4 py-2 rounded-lg text-sm border border-red-200 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" /> Cerrar Sesión B2B
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Column 1: Commercial Data, Contact Info & Shipping Addresses */}
        <div className="space-y-6 lg:col-span-1">
          {/* Card: Commercial Status */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4 text-left">
            <h3 className="font-bold text-gray-900 border-b pb-2 text-sm uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary-600" /> Datos Comerciales
              </span>
              <button 
                onClick={openEditCommercial}
                className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-primary-600 transition-colors bg-transparent border-0 cursor-pointer"
                title="Editar Datos Comerciales"
              >
                <Edit className="w-4 h-4" />
              </button>
            </h3>
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-gray-400 block text-xs uppercase font-semibold">Razón Social</span>
                <span className="font-bold text-gray-800">{customer.business_name}</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-gray-400 block text-xs uppercase font-semibold">RFC</span>
                  <span className="font-bold text-gray-800">{customer.rfc || "-"}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-xs uppercase font-semibold">Nivel de Cliente</span>
                  <span className="font-bold text-primary-700 uppercase">{customer.customer_type}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-gray-400 block text-xs uppercase font-semibold">Nivel de Precios</span>
                  <span className="font-bold text-gray-800 uppercase">{customer.price_level}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-xs uppercase font-semibold">Términos Pago</span>
                  <span className="font-bold text-gray-800">{customer.payment_terms}</span>
                </div>
              </div>
              
              {/* Credit details */}
              {customer.credit_enabled && (
                <div className="bg-primary-50 p-3 rounded-lg border border-primary-100">
                  <span className="text-primary-800 block text-xs uppercase font-bold mb-1">Crédito Comercial Autorizado</span>
                  <span className="font-extrabold text-primary-900 text-lg">{formatCurrency(customer.credit_limit)} MXN</span>
                </div>
              )}
            </div>
          </div>

          {/* Card: Primary Contact */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4 text-left">
            <h3 className="font-bold text-gray-900 border-b pb-2 text-sm uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-2">
                <User className="w-4 h-4 text-primary-600" /> Contacto Principal
              </span>
              <button 
                onClick={openEditContact}
                className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-primary-600 transition-colors bg-transparent border-0 cursor-pointer"
                title="Editar Contacto Principal"
              >
                <Edit className="w-4 h-4" />
              </button>
            </h3>
            <div className="text-sm space-y-1">
              <p className="font-bold text-gray-800">{contact.name}</p>
              {contact.position && <p className="text-xs text-gray-500">{contact.position}</p>}
              <p className="text-gray-600 text-xs mt-1">{contact.email}</p>
              <p className="text-gray-600 text-xs">{contact.phone}</p>
            </div>
          </div>

          {/* Card: Shipping Addresses */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4 text-left">
            <h3 className="font-bold text-gray-900 border-b pb-2 text-sm uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary-600" /> Direcciones de Envío
              </span>
              <button 
                onClick={openAddAddress}
                className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-primary-600 transition-colors bg-transparent border-0 cursor-pointer"
                title="Agregar Dirección de Envío"
              >
                <Plus className="w-4.5 h-4.5" />
              </button>
            </h3>
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
              {addresses.map((addr) => (
                <div 
                  key={addr.id} 
                  className={`p-3 rounded-xl border text-xs relative group ${
                    addr.is_default 
                      ? 'bg-primary-50/10 border-primary-200 shadow-2xs' 
                      : 'bg-gray-50/40 border-gray-150'
                  }`}
                >
                  <div className="space-y-1 pr-14">
                    <p className="font-bold text-gray-900">
                      {addr.street} #{addr.exterior_number}{addr.interior_number ? `, Int. ${addr.interior_number}` : ""}
                    </p>
                    <p className="text-gray-600">{addr.neighborhood}, CP {addr.postal_code}</p>
                    <p className="text-gray-650">{addr.city}, {addr.state}</p>
                    {addr.reference && (
                      <p className="text-[10px] text-gray-450 italic mt-1 leading-normal">Ref: {addr.reference}</p>
                    )}
                  </div>
                  
                  {/* Actions overlay */}
                  <div className="absolute top-2.5 right-2.5 flex items-center gap-1">
                    {addr.is_default ? (
                      <span className="bg-primary-100 text-primary-800 font-extrabold px-1.5 py-0.5 rounded text-[8px] uppercase tracking-wider border border-primary-200 flex items-center gap-0.5">
                        <Check className="w-2.5 h-2.5" /> Principal
                      </span>
                    ) : (
                      <button 
                        onClick={() => handleSetDefaultAddress(addr.id!)}
                        className="text-[9px] text-gray-400 hover:text-primary-700 hover:underline font-bold bg-transparent border-0 cursor-pointer py-0.5 px-1"
                        title="Marcar como predeterminada"
                      >
                        Hacer Principal
                      </button>
                    )}
                    <button 
                      onClick={() => openEditAddress(addr)}
                      className="p-1 hover:bg-gray-200/80 rounded text-gray-400 hover:text-primary-650 transition-colors bg-transparent border-0 cursor-pointer"
                      title="Editar Dirección"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    {!addr.is_default && (
                      <button 
                        onClick={() => handleDeleteAddress(addr.id!, addr.is_default)}
                        className="p-1 hover:bg-red-50 rounded text-gray-400 hover:text-red-650 transition-colors bg-transparent border-0 cursor-pointer"
                        title="Eliminar Dirección"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {addresses.length === 0 && (
                <p className="text-xs text-gray-400 italic text-center py-4">No hay direcciones registradas.</p>
              )}
            </div>
          </div>
        </div>

        {/* Column 2: Quote & Order History */}
        <div className="space-y-6 lg:col-span-1">
          {/* Active Quotes History */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm text-left">
            <h3 className="font-bold text-gray-900 border-b pb-3 text-base flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary-700" /> Historial de Cotizaciones
            </h3>
            
            {loading ? (
              <div className="text-center py-6 text-gray-400">Cargando cotizaciones...</div>
            ) : quotes.length === 0 ? (
              <div className="text-center py-8 text-gray-400 italic">No tienes cotizaciones activas.</div>
            ) : (
              <div className="overflow-x-auto mt-3">
                <table className="w-full text-xs text-left text-gray-500">
                  <thead className="text-[10px] text-gray-750 uppercase bg-gray-50/80 border-b border-gray-100">
                    <tr>
                      <th scope="col" className="px-2 py-2">ID / Fecha</th>
                      <th scope="col" className="px-2 py-2 text-right">Monto</th>
                      <th scope="col" className="px-2 py-2 text-center">Estado</th>
                      <th scope="col" className="px-2 py-2 text-center"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {quotes.map(q => (
                      <tr key={q.id} className="bg-white border-b hover:bg-gray-50 transition-colors">
                        <td className="px-2 py-2.5">
                          <div className="font-bold text-gray-900 truncate max-w-[70px]">{q.id}</div>
                          <div className="text-[10px] text-gray-400">{new Date(q.date).toLocaleDateString()}</div>
                        </td>
                        <td className="px-2 py-2.5 text-right font-bold text-gray-900">{formatCurrency(q.total)}</td>
                        <td className="px-2 py-2.5 text-center">
                          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full border ${getStatusBadgeClass(q.status)}`}>
                            {getStatusLabel(q.status)}
                          </span>
                        </td>
                        <td className="px-2 py-2.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button onClick={() => setViewingQuote(q)} className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-primary-750">
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDownloadPdf(q)} className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-green-700" title="PDF">
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Orders History (Completed quotes) */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm text-left">
            <h3 className="font-bold text-gray-900 border-b pb-3 text-base flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-primary-700" /> Pedidos Confirmados
            </h3>
            
            {loading ? (
              <div className="text-center py-6 text-gray-400">Cargando pedidos...</div>
            ) : orders.length === 0 ? (
              <div className="text-center py-8 text-gray-400 italic">Sin pedidos finalizados.</div>
            ) : (
              <div className="overflow-x-auto mt-3">
                <table className="w-full text-xs text-left text-gray-500">
                  <thead className="text-[10px] text-gray-750 uppercase bg-gray-50/80 border-b border-gray-100">
                    <tr>
                      <th scope="col" className="px-2 py-2">ID / Fecha</th>
                      <th scope="col" className="px-2 py-2 text-right">Total</th>
                      <th scope="col" className="px-2 py-2 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map(o => (
                      <tr key={o.id} className="bg-white border-b hover:bg-gray-50 transition-colors">
                        <td className="px-2 py-2.5">
                          <div className="font-bold text-gray-900 truncate max-w-[70px]">{o.id}</div>
                          <div className="text-[10px] text-gray-400">{new Date(o.date).toLocaleDateString()}</div>
                        </td>
                        <td className="px-2 py-2.5 text-right font-black text-primary-700">{formatCurrency(o.total)}</td>
                        <td className="px-2 py-2.5 text-center">
                          <button onClick={() => handleDownloadPdf(o)} className="inline-flex items-center gap-0.5 text-[10px] text-primary-600 hover:text-primary-800 font-bold">
                            <Download className="w-3 h-3" /> PDF
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Column 3: Discounts & Change Access Key */}
        <div className="space-y-6 lg:col-span-1">
          
          {/* Card: Active Discounts */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4 text-left">
            <h3 className="font-bold text-gray-900 border-b pb-2 text-sm uppercase tracking-wider flex items-center gap-2">
              <Percent className="w-4 h-4 text-primary-600" /> Descuentos B2B Activos
            </h3>
            {discounts.filter(d => d.active && d.discount_type !== "promotion").length > 0 ? (
              <div className="space-y-3">
                {discounts.filter(d => d.active && d.discount_type !== "promotion").map(d => (
                  <div key={d.id} className="flex justify-between items-center bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                    <div>
                      <p className="text-xs font-bold text-gray-800 uppercase">
                        {d.discount_type === "product" ? "Descuento Producto" :
                         d.discount_type === "category" ? `Sección: ${d.category_id}` :
                         "Descuento Global"}
                      </p>
                      {d.valid_until && (
                        <p className="text-[10px] text-gray-450">Vence: {new Date(d.valid_until).toLocaleDateString()}</p>
                      )}
                    </div>
                    <span className="text-sm font-black text-green-700">-{d.discount_percent}%</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 italic text-center py-2">No tienes descuentos especiales asignados actualmente.</p>
            )}
          </div>

          {/* Card: Price Level Discount */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4 text-left">
            <h3 className="font-bold text-gray-900 border-b pb-2 text-sm uppercase tracking-wider flex items-center gap-2">
              <Percent className="w-4 h-4 text-primary-600" /> Descuento por Nivel B2B
            </h3>
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <span className="text-xs font-extrabold text-gray-950 uppercase">
                  Nivel de Precios: {
                    customer.price_level === 'retail' ? 'Retail' :
                    customer.price_level === 'wholesale' ? 'Mayorista' :
                    customer.price_level === 'distributor' ? 'Distribuidor' :
                    customer.price_level === 'special' ? 'Especial' :
                    customer.price_level
                  }
                </span>
                <span className="text-sm font-black text-primary-700">
                  {
                    customer.price_level === 'retail' ? '-5%' :
                    customer.price_level === 'wholesale' ? '-10%' :
                    customer.price_level === 'distributor' ? '-20%' :
                    customer.price_level === 'special' ? '-25%' :
                    '0%'
                  }
                </span>
              </div>
              <p className="text-[10px] text-gray-550 leading-normal">
                {
                  customer.price_level === 'retail' ? 'Aplica un descuento general del 5% en todos los productos del catálogo.' :
                  customer.price_level === 'wholesale' ? 'Aplica un descuento general del 10% (o el precio de escala de mayoreo de 100 piezas, el que resulte más bajo).' :
                  customer.price_level === 'distributor' ? 'Aplica un descuento general del 20% (o el precio de escala de distribuidor de 150 piezas, el que resulte más bajo).' :
                  customer.price_level === 'special' ? 'Aplica un descuento de nivel especial del 25% en todo el catálogo.' :
                  'Precios base estándar sin descuento especial de nivel.'
                }
              </p>
            </div>
          </div>

          {/* Card: B2B Coupons */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4 text-left">
            <h3 className="font-bold text-gray-900 border-b pb-2 text-sm uppercase tracking-wider flex items-center gap-2">
              <Gift className="w-4 h-4 text-primary-600" /> Mis Cupones B2B
            </h3>
            {discounts.filter(d => d.discount_type === "promotion").length > 0 ? (
              <div className="space-y-3">
                {discounts.filter(d => d.discount_type === "promotion").map(d => (
                  <div key={d.id || d.category_id} className="bg-gray-50 p-3 rounded-lg border border-gray-100 flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs font-extrabold text-gray-900 uppercase">
                          {d.category_id === 'ENVIO_SIN_COSTO' ? 'Envío sin Costo' :
                           d.category_id === 'MUESTRA_Y_ENVIO_GRATIS' ? 'Muestra Física y Envío Gratis' :
                           `Cupón: ${d.category_id}`}
                        </p>
                        <p className="text-[10px] text-gray-500 mt-0.5">
                          {d.category_id === 'ENVIO_SIN_COSTO' ? 'Envío de productos a domicilio sin cargo adicional.' :
                           d.category_id === 'MUESTRA_Y_ENVIO_GRATIS' ? 'Muestra física sin costo con envío a domicilio incluido.' :
                           'Beneficio de promoción especial.'}
                        </p>
                      </div>
                      <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border tracking-wider shrink-0 ${
                        d.active 
                          ? 'bg-green-50 text-green-700 border-green-200' 
                          : 'bg-gray-100 text-gray-400 border-gray-200'
                      }`}>
                        {d.active ? 'Activo' : 'Canjeado'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 italic text-center py-2">No tienes cupones asignados actualmente.</p>
            )}
          </div>

          {/* Card: Change Access Key */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4 text-left">
            <h3 className="font-bold text-gray-900 border-b pb-2 text-sm uppercase tracking-wider flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary-600" /> Cambiar Clave de Acceso
            </h3>
            <form onSubmit={handleChangeAccessKey} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Nueva Clave de Acceso</label>
                <div className="relative">
                  <input
                    type={showNewKey ? "text" : "password"}
                    required
                    value={newAccessKey}
                    onChange={e => setNewAccessKey(e.target.value)}
                    placeholder="Mínimo 4 caracteres"
                    className="w-full border border-gray-300 rounded-lg pl-3 pr-10 py-2.5 text-sm outline-none focus:ring-primary-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewKey(!showNewKey)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-650 cursor-pointer bg-transparent border-0"
                  >
                    {showNewKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Confirmar Nueva Clave</label>
                <div className="relative">
                  <input
                    type={showConfirmKey ? "text" : "password"}
                    required
                    value={confirmAccessKey}
                    onChange={e => setConfirmAccessKey(e.target.value)}
                    placeholder="Confirmar clave"
                    className="w-full border border-gray-300 rounded-lg pl-3 pr-10 py-2.5 text-sm outline-none focus:ring-primary-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmKey(!showConfirmKey)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-650 cursor-pointer bg-transparent border-0"
                  >
                    {showConfirmKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              {keyChangeError && <p className="text-red-500 text-xs">{keyChangeError}</p>}
              {keyChangeSuccess && <p className="text-green-600 text-xs font-semibold">{keyChangeSuccess}</p>}
              <button
                type="submit"
                disabled={isChangingKey}
                className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-2.5 rounded-lg text-xs transition-colors disabled:bg-gray-300"
              >
                {isChangingKey ? "Actualizando..." : "Actualizar Clave"}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* View Quote Details Modal */}
      {viewingQuote && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col">
            <div className="p-5 border-b border-gray-150 flex justify-between items-center bg-gray-50 rounded-t-2xl">
              <div>
                <h3 className="font-bold text-gray-900 text-lg">Detalles de Cotización: {viewingQuote.id}</h3>
                <p className="text-xs text-gray-500">{new Date(viewingQuote.date).toLocaleDateString()}</p>
              </div>
              <button onClick={() => setViewingQuote(null)} className="text-gray-400 hover:text-gray-900">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 text-left space-y-4">
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-250 grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-gray-400 block font-bold uppercase mb-0.5">Destino de entrega</span>
                  <p className="font-bold text-gray-800">{viewingQuote.client.address}</p>
                  <p className="text-gray-700">{viewingQuote.client.city}, {viewingQuote.client.state} - CP {viewingQuote.client.zip}</p>
                </div>
                <div>
                  <span className="text-gray-400 block font-bold uppercase mb-0.5">Comentarios</span>
                  <p className="italic text-gray-650">{viewingQuote.client.comments || "Ninguno"}</p>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-bold text-gray-900 text-sm">Artículos</h4>
                {viewingQuote.items.map(item => (
                  <div key={item.id} className="flex gap-4 p-3 border border-gray-200 rounded-xl bg-white shadow-xs">
                    <div className="w-12 h-12 bg-gray-50 border rounded-lg overflow-hidden shrink-0">
                      <img src={item.image} alt="" className="w-full h-full object-contain p-0.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 text-sm truncate">{item.productName}</p>
                      <p className="text-xs text-gray-500">Color: {item.color.startsWith('#') ? "Especial" : item.color} | Técnica: {item.printOption}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-gray-900 text-sm">{item.quantity} pz</p>
                      <p className="text-xs font-semibold text-primary-700">{formatCurrency(item.totalPrice)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-5 border-t border-gray-150 bg-gray-50 rounded-b-2xl flex justify-between items-center">
              <div className="text-left flex items-center gap-4">
                <div>
                  <span className="text-xs text-gray-500">Total Cotizado</span>
                  <p className="text-xl font-black text-primary-900">{formatCurrency(viewingQuote.total)}</p>
                </div>
                {Array.isArray((viewingQuote.client as any).appliedCoupons) && (viewingQuote.client as any).appliedCoupons.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 self-center">
                    {(viewingQuote.client as any).appliedCoupons.map((code: string) => (
                      <span key={code} className="bg-green-100 text-green-800 border border-green-200 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                        {code === 'ENVIO_SIN_COSTO' ? 'Envío sin Costo' :
                         code === 'MUESTRA_Y_ENVIO_GRATIS' ? 'Muestra + Envío Gratis' : code}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <button 
                onClick={() => {
                  handleDownloadPdf(viewingQuote);
                  setViewingQuote(null);
                }} 
                className="bg-primary-600 hover:bg-primary-700 text-white font-bold py-2.5 px-6 rounded-lg text-sm transition-colors flex items-center gap-1.5"
              >
                <Download className="w-4 h-4" /> Descargar PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Commercial Data Modal */}
      {showCommercialModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col overflow-hidden transform transition-all duration-300 scale-100">
            <div className="p-5 border-b border-gray-150 flex justify-between items-center bg-gray-50">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary-600" />
                <h3 className="font-bold text-gray-900 text-base">Editar Datos Comerciales</h3>
              </div>
              <button onClick={() => setShowCommercialModal(false)} className="text-gray-400 hover:text-gray-900 cursor-pointer bg-transparent border-0 p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveCommercial} className="p-6 space-y-4 text-left">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Razón Social <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  required
                  value={editBusinessName}
                  onChange={e => setEditBusinessName(e.target.value)}
                  placeholder="Ej. Comercializadora de México S.A. de C.V."
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all font-medium text-gray-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">RFC (si requiere facturación)</label>
                <input 
                  type="text" 
                  value={editRfc}
                  onChange={e => setEditRfc(e.target.value.toUpperCase())}
                  placeholder="Ej. COMA800101XXX"
                  maxLength={13}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all font-mono uppercase text-gray-850"
                />
              </div>

              {commercialError && (
                <p className="text-red-500 text-xs font-medium bg-red-50 p-2.5 rounded-lg border border-red-200">{commercialError}</p>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button 
                  type="button"
                  onClick={() => setShowCommercialModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-gray-500 hover:text-gray-750 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={isSavingCommercial}
                  className="px-5 py-2 text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 rounded-lg shadow disabled:bg-gray-300 cursor-pointer transition-colors"
                >
                  {isSavingCommercial ? "Guardando..." : "Guardar Cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Main Contact Modal */}
      {showContactModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col overflow-hidden transform transition-all duration-300 scale-100">
            <div className="p-5 border-b border-gray-150 flex justify-between items-center bg-gray-50">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-primary-600" />
                <h3 className="font-bold text-gray-900 text-base">Editar Contacto Principal</h3>
              </div>
              <button onClick={() => setShowContactModal(false)} className="text-gray-400 hover:text-gray-900 cursor-pointer bg-transparent border-0 p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveContact} className="p-6 space-y-4 text-left">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Nombre Completo <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  required
                  value={editContactName}
                  onChange={e => setEditContactName(e.target.value)}
                  placeholder="Nombre y Apellido"
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all font-medium text-gray-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Correo Electrónico <span className="text-red-500">*</span></label>
                <input 
                  type="email" 
                  required
                  value={editContactEmail}
                  onChange={e => setEditContactEmail(e.target.value)}
                  placeholder="correo@empresa.com"
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-gray-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Teléfono (10 dígitos) <span className="text-red-500">*</span></label>
                <input 
                  type="tel" 
                  required
                  value={editContactPhone}
                  onChange={e => setEditContactPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="4491234567"
                  maxLength={10}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all font-mono text-gray-850"
                />
              </div>

              {contactError && (
                <p className="text-red-500 text-xs font-medium bg-red-50 p-2.5 rounded-lg border border-red-200">{contactError}</p>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button 
                  type="button"
                  onClick={() => setShowContactModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-gray-500 hover:text-gray-750 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={isSavingContact}
                  className="px-5 py-2 text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 rounded-lg shadow disabled:bg-gray-300 cursor-pointer transition-colors"
                >
                  {isSavingContact ? "Guardando..." : "Guardar Cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Shipping Address Modal (Add/Edit) */}
      {showAddressModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col overflow-hidden transform transition-all duration-300 scale-100">
            <div className="p-5 border-b border-gray-150 flex justify-between items-center bg-gray-50">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary-600" />
                <h3 className="font-bold text-gray-900 text-base">
                  {editingAddress ? "Editar Dirección de Envío" : "Agregar Dirección de Envío"}
                </h3>
              </div>
              <button onClick={() => setShowAddressModal(false)} className="text-gray-400 hover:text-gray-900 cursor-pointer bg-transparent border-0 p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveAddress} className="p-6 space-y-4 text-left overflow-y-auto max-h-[75vh]">
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Calle / Av. <span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    required
                    value={addrStreet}
                    onChange={e => setAddrStreet(e.target.value)}
                    placeholder="Nombre de la calle"
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all font-medium text-gray-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Num. Ext. <span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    required
                    value={addrExtNum}
                    onChange={e => setAddrExtNum(e.target.value)}
                    placeholder="102-B"
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-gray-850"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Num. Int. (Opcional)</label>
                  <input 
                    type="text" 
                    value={addrIntNum}
                    onChange={e => setAddrIntNum(e.target.value)}
                    placeholder="Depto / Bodega"
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-gray-850"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Colonia / Fracc. <span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    required
                    value={addrNeighborhood}
                    onChange={e => setAddrNeighborhood(e.target.value)}
                    placeholder="Ej. Centro"
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-gray-850"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Código Postal <span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    required
                    value={addrZip}
                    onChange={e => handleZipChange(e.target.value)}
                    placeholder="5 dígitos"
                    maxLength={5}
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all font-mono text-gray-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Estado <span className="text-red-500">*</span></label>
                  <select 
                    value={addrState}
                    required
                    onChange={e => {
                      setAddrState(e.target.value);
                      const cities = (mexicoData as Record<string, string[]>)[e.target.value] || [];
                      setAddrCity(cities[0] || "");
                    }}
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all bg-white text-gray-800 font-medium"
                  >
                    <option value="">Seleccione...</option>
                    {Object.keys(mexicoData).map(st => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Municipio / Ciudad <span className="text-red-500">*</span></label>
                  <select 
                    value={addrCity}
                    required
                    onChange={e => setAddrCity(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all bg-white text-gray-850 font-medium"
                  >
                    <option value="">Seleccione...</option>
                    {addrState && ((mexicoData as Record<string, string[]>)[addrState] || []).map(cit => (
                      <option key={cit} value={cit}>{cit}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Referencias de Entrega (Opcional)</label>
                <textarea 
                  value={addrReference}
                  onChange={e => setAddrReference(e.target.value)}
                  placeholder="Ej. Fachada azul, portón negro, entre calle X y Y."
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-gray-800"
                />
              </div>

              {(!editingAddress || !editingAddress.is_default) && (
                <div className="flex items-center gap-2 pt-1">
                  <input 
                    type="checkbox" 
                    id="addrIsDefault"
                    checked={addrIsDefault}
                    onChange={e => setAddrIsDefault(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                  />
                  <label htmlFor="addrIsDefault" className="text-xs font-bold text-gray-750 uppercase cursor-pointer select-none">
                    Establecer como dirección de envío principal
                  </label>
                </div>
              )}

              {addressError && (
                <p className="text-red-500 text-xs font-medium bg-red-50 p-2.5 rounded-lg border border-red-200">{addressError}</p>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button 
                  type="button"
                  onClick={() => setShowAddressModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-gray-500 hover:text-gray-750 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={isSavingAddress}
                  className="px-5 py-2 text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 rounded-lg shadow disabled:bg-gray-300 cursor-pointer transition-colors"
                >
                  {isSavingAddress ? "Guardando..." : "Guardar Dirección"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
