"use client";

import { useState, useEffect, useMemo } from "react";
import { useCRM } from "@/hooks/useCRM";
import { Customer, CustomerContact, CustomerAddress, CustomerDiscount, CustomerActivity, CustomerSegment } from "@/services/crmService";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/utils/formatters";
import { Search, Plus, Filter, User, MapPin, Percent, Phone, Mail, Building2, Trash2, Edit, Eye, MessageSquare, AlertCircle, CheckCircle, Calendar, Send, Activity, X, ChevronRight, Check } from "lucide-react";
import mexicoData from "@/utils/mexicoStates.json";
import { COLOR_PALETTE } from "@/types";

const MEXICO_STATES = Object.keys(mexicoData);

export function AdminCRM() {
  const {
    customers,
    segments,
    isLoaded,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    addContact,
    updateContact,
    deleteContact,
    addAddress,
    updateAddress,
    deleteAddress,
    addDiscount,
    updateDiscount,
    deleteDiscount,
    addActivity,
    getCustomerProfile,
    addSegment,
    updateSegment,
    deleteSegment,
    evaluateSegmentMembers,
    refreshCustomers
  } = useCRM();

  // Search & Filters State
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterPriceLevel, setFilterPriceLevel] = useState<string>("all");
  const [filterMarketing, setFilterMarketing] = useState<string>("all");

  // Navigation State
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customerProfile, setCustomerProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  // Form Modals State
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [activeFormTab, setActiveFormTab] = useState<'commercial' | 'contacts' | 'addresses' | 'discounts' | 'marketing' | 'notes'>('commercial');

  // Sub-forms local states (for Add/Edit Wizard)
  const [formCommercial, setFormCommercial] = useState({
    business_name: "",
    commercial_name: "",
    rfc: "",
    customer_type: "prospect" as Customer["customer_type"],
    price_level: "retail" as Customer["price_level"],
    assigned_discount_percent: 0,
    credit_enabled: false,
    credit_limit: 0,
    payment_terms: "Contado",
    notes: "",
    access_key: ""
  });

  const [formContacts, setFormContacts] = useState<Omit<CustomerContact, 'id' | 'customer_id'>[]>([]);
  const [newContact, setNewContact] = useState({
    name: "",
    position: "",
    email: "",
    phone: "",
    whatsapp: "",
    is_primary: false,
    notes: ""
  });

  const [formAddresses, setFormAddresses] = useState<Omit<CustomerAddress, 'id' | 'customer_id'>[]>([]);
  const [newAddress, setNewAddress] = useState({
    address_type: "shipping" as CustomerAddress["address_type"],
    street: "",
    exterior_number: "",
    interior_number: "",
    neighborhood: "",
    city: "",
    state: "",
    postal_code: "",
    country: "México",
    reference: "",
    is_default: false
  });

  const [formDiscounts, setFormDiscounts] = useState<Omit<CustomerDiscount, 'id' | 'customer_id'>[]>([]);
  const [newDiscount, setNewDiscount] = useState({
    discount_type: "global" as CustomerDiscount["discount_type"],
    category_id: "",
    product_id: "",
    discount_percent: 0,
    valid_from: "",
    valid_until: "",
    active: true
  });

  const [formMarketing, setFormMarketing] = useState({
    accepts_marketing: true,
    marketing_channel: "both" as Customer["marketing_channel"]
  });

  // Segments & Campaign State
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string>("");
  const [editingSegmentId, setEditingSegmentId] = useState<string | null>(null);
  const [campaignMessage, setCampaignMessage] = useState("");
  const [campaignRecipients, setCampaignRecipients] = useState<Customer[]>([]);
  const [newSegmentName, setNewSegmentName] = useState("");
  const [newSegmentDesc, setNewSegmentDesc] = useState("");
  const [newSegmentRules, setNewSegmentRules] = useState<CustomerSegment["rules_json"]>({
    state: "",
    city: "",
    customer_type: "",
    price_level: "",
    min_purchases: 0
  });

  // Profile Activity creation state
  const [activityNote, setActivityNote] = useState("");
  const [activityType, setActivityType] = useState<CustomerActivity["activity_type"]>("note");

  // Fetch detailed profile when a customer is clicked
  useEffect(() => {
    if (selectedCustomerId) {
      loadProfile(selectedCustomerId);
    } else {
      setCustomerProfile(null);
    }
  }, [selectedCustomerId]);

  const loadProfile = async (id: string) => {
    try {
      setProfileLoading(true);
      const prof = await getCustomerProfile(id);
      setCustomerProfile(prof);
    } catch (e) {
      console.error(e);
      alert("Error al cargar el perfil del cliente.");
    } finally {
      setProfileLoading(false);
    }
  };

  // Pre-fill fields on Edit
  const handleEditClick = (cust: Customer) => {
    setEditingCustomer(cust);
    setFormCommercial({
      business_name: cust.business_name,
      commercial_name: cust.commercial_name || "",
      rfc: cust.rfc || "",
      customer_type: cust.customer_type,
      price_level: cust.price_level,
      assigned_discount_percent: cust.assigned_discount_percent,
      credit_enabled: cust.credit_enabled,
      credit_limit: cust.credit_limit,
      payment_terms: cust.payment_terms,
      notes: cust.notes || "",
      access_key: cust.access_key || ""
    });
    setFormMarketing({
      accepts_marketing: cust.accepts_marketing,
      marketing_channel: cust.marketing_channel
    });

    // Fetch related detail lists from database for editing
    supabase.from('customer_contacts').select('*').eq('customer_id', cust.id).then(res => {
      if (res.data) setFormContacts(res.data);
    });
    supabase.from('customer_addresses').select('*').eq('customer_id', cust.id).then(res => {
      if (res.data) setFormAddresses(res.data);
    });
    supabase.from('customer_discounts').select('*').eq('customer_id', cust.id).then(res => {
      if (res.data) setFormDiscounts(res.data);
    });

    setActiveFormTab('commercial');
    setShowAddEditModal(true);
  };

  const handleNewCustomerClick = () => {
    setEditingCustomer(null);
    setFormCommercial({
      business_name: "",
      commercial_name: "",
      rfc: "",
      customer_type: "prospect",
      price_level: "retail",
      assigned_discount_percent: 0,
      credit_enabled: false,
      credit_limit: 0,
      payment_terms: "Contado",
      notes: "",
      access_key: `GS-B2B-${Math.floor(1000 + Math.random() * 9000)}`
    });
    setFormMarketing({
      accepts_marketing: true,
      marketing_channel: "both"
    });
    setFormContacts([]);
    setFormAddresses([]);
    setFormDiscounts([]);
    setActiveFormTab('commercial');
    setShowAddEditModal(true);
  };

  // Submit Handler for Add / Edit Client
  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formCommercial.business_name.trim()) {
      alert("Por favor ingresa la Razón Social.");
      return;
    }

    if (formCommercial.rfc && formCommercial.rfc.trim()) {
      const rfcRegex = /^[A-Z&Ñ]{3,4}\d{6}[A-Z0-9]{3}$/;
      if (!rfcRegex.test(formCommercial.rfc.trim().toUpperCase())) {
        alert("El RFC ingresado no cumple con el formato oficial del SAT (12 o 13 caracteres con homoclave).");
        return;
      }
    }

    try {
      const customerPayload = {
        ...formCommercial,
        ...formMarketing
      };

      if (editingCustomer?.id) {
        // 1. Update main record
        await updateCustomer(editingCustomer.id, customerPayload);

        // 2. Perform simple diff updating on nested lists for edit-mode
        // Note: For simplicity in B2B context, we clean & re-insert nested items or perform sequential update.
        await Promise.all([
          supabase.from('customer_contacts').delete().eq('customer_id', editingCustomer.id),
          supabase.from('customer_addresses').delete().eq('customer_id', editingCustomer.id),
          supabase.from('customer_discounts').delete().eq('customer_id', editingCustomer.id)
        ]);

        const contactsToInsert = formContacts.map(c => ({ ...c, customer_id: editingCustomer.id }));
        const addressesToInsert = formAddresses.map(a => ({ ...a, customer_id: editingCustomer.id }));
        const discountsToInsert = formDiscounts.map(d => ({ ...d, customer_id: editingCustomer.id }));

        await Promise.all([
          contactsToInsert.length > 0 ? supabase.from('customer_contacts').insert(contactsToInsert) : Promise.resolve(),
          addressesToInsert.length > 0 ? supabase.from('customer_addresses').insert(addressesToInsert) : Promise.resolve(),
          discountsToInsert.length > 0 ? supabase.from('customer_discounts').insert(discountsToInsert) : Promise.resolve(),
          addActivity({
            customer_id: editingCustomer.id,
            activity_type: 'note',
            title: 'Cliente Modificado',
            description: 'Se actualizaron los datos comerciales del cliente en el panel administrativo.',
            created_by: 'Administrador'
          })
        ]);

        alert("Cliente actualizado correctamente.");
      } else {
        // Add new customer
        await addCustomer(customerPayload, formContacts, formAddresses, formDiscounts);
        alert("Cliente registrado correctamente.");
      }
      setShowAddEditModal(false);
      refreshCustomers();
      if (selectedCustomerId) {
        loadProfile(selectedCustomerId);
      }
    } catch (e: any) {
      console.error(e);
      alert(`Error al guardar: ${e.message}`);
    }
  };

  // Add items temporarily in the wizard state
  const handleAddContactToForm = () => {
    if (!newContact.name) {
      alert("Por favor ingresa el nombre.");
      return;
    }
    const isFirst = formContacts.length === 0;
    const isPrimary = isFirst ? true : newContact.is_primary;

    const list = isPrimary 
      ? formContacts.map(c => ({ ...c, is_primary: false })) 
      : [...formContacts];

    list.push({ ...newContact, is_primary: isPrimary });
    setFormContacts(list);
    setNewContact({
      name: "",
      position: "",
      email: "",
      phone: "",
      whatsapp: "",
      is_primary: false,
      notes: ""
    });
  };

  const handleAddAddressToForm = () => {
    if (!newAddress.street || !newAddress.exterior_number || !newAddress.neighborhood || !newAddress.city || !newAddress.state || !newAddress.postal_code) {
      alert("Por favor completa los campos requeridos de la dirección.");
      return;
    }
    const isFirst = formAddresses.length === 0;
    const isDefault = isFirst ? true : newAddress.is_default;

    const list = isDefault 
      ? formAddresses.map(a => ({ ...a, is_default: false })) 
      : [...formAddresses];

    list.push({ ...newAddress, is_default: isDefault });
    setFormAddresses(list);
    setNewAddress({
      address_type: "shipping",
      street: "",
      exterior_number: "",
      interior_number: "",
      neighborhood: "",
      city: "",
      state: "",
      postal_code: "",
      country: "México",
      reference: "",
      is_default: false
    });
  };

  const handleAddDiscountToForm = () => {
    if (newDiscount.discount_percent <= 0) {
      alert("Por favor ingresa un porcentaje de descuento mayor a 0.");
      return;
    }
    formDiscounts.push({ ...newDiscount });
    setFormDiscounts([...formDiscounts]);
    setNewDiscount({
      discount_type: "global",
      category_id: "",
      product_id: "",
      discount_percent: 0,
      valid_from: "",
      valid_until: "",
      active: true
    });
  };

  // Delete nested lists temporarily in form state
  const handleRemoveContactFromForm = (idx: number) => {
    setFormContacts(formContacts.filter((_, i) => i !== idx));
  };

  const handleRemoveAddressFromForm = (idx: number) => {
    setFormAddresses(formAddresses.filter((_, i) => i !== idx));
  };

  const handleRemoveDiscountFromForm = (idx: number) => {
    setFormDiscounts(formDiscounts.filter((_, i) => i !== idx));
  };

  // Evaluate members when segment rules change
  const handleEvaluateSegment = async () => {
    if (!selectedSegmentId) return;
    const seg = segments.find(s => s.id === selectedSegmentId);
    if (!seg) return;

    try {
      const [allContacts, allAddresses, allQuotesRes] = await Promise.all([
        supabase.from("customer_contacts").select("*"),
        supabase.from("customer_addresses").select("*"),
        supabase.from("quotes").select("*")
      ]);

      const members = await evaluateSegmentMembers(
        seg.rules_json,
        allContacts.data || [],
        allAddresses.data || [],
        allQuotesRes.data || []
      );
      setCampaignRecipients(members);
    } catch (e) {
      console.error(e);
    }
  };

  // Submit quick activity (e.g. log phone call) from profile
  const handleAddActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activityNote.trim() || !selectedCustomerId) return;

    try {
      const title = activityType === "call" ? "Llamada Registrada" :
                    activityType === "whatsapp" ? "WhatsApp Enviado" :
                    activityType === "email" ? "Email Enviado" : "Nota Interna";

      await addActivity({
        customer_id: selectedCustomerId,
        activity_type: activityType,
        title,
        description: activityNote,
        created_by: "Administrador"
      });
      setActivityNote("");
      loadProfile(selectedCustomerId);
    } catch (e) {
      console.error(e);
      alert("Error al guardar actividad.");
    }
  };

  // Segment Save Handler
  const handleCreateSegment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSegmentName.trim()) {
      alert("Ingresa un nombre para el segmento");
      return;
    }
    try {
      if (editingSegmentId) {
        await updateSegment(editingSegmentId, {
          name: newSegmentName,
          description: newSegmentDesc,
          rules_json: newSegmentRules
        });
        setEditingSegmentId(null);
        alert("Segmento de campaña actualizado con éxito.");
      } else {
        await addSegment({
          name: newSegmentName,
          description: newSegmentDesc,
          rules_json: newSegmentRules,
          active: true
        });
        alert("Segmento de campaña guardado con éxito.");
      }
      setNewSegmentName("");
      setNewSegmentDesc("");
      setNewSegmentRules({
        state: "",
        city: "",
        customer_type: "",
        price_level: "",
        min_purchases: 0
      });
    } catch (e) {
      console.error(e);
      alert("Error al guardar segmento");
    }
  };

  // Evaluated filtered customer list
  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      // 1. Search term check
      const query = searchTerm.toLowerCase().trim();
      if (query) {
        const matchName = c.business_name.toLowerCase().includes(query) || (c.commercial_name?.toLowerCase().includes(query));
        const matchRfc = c.rfc?.toLowerCase().includes(query);
        const matchKey = c.access_key?.toLowerCase().includes(query);
        if (!matchName && !matchRfc && !matchKey) return false;
      }

      // 2. Filters check
      if (filterType !== "all" && c.customer_type !== filterType) return false;
      if (filterPriceLevel !== "all" && c.price_level !== filterPriceLevel) return false;
      if (filterMarketing !== "all") {
        const filterVal = filterMarketing === "true";
        if (c.accepts_marketing !== filterVal) return false;
      }

      return true;
    });
  }, [customers, searchTerm, filterType, filterPriceLevel, filterMarketing]);

  if (!isLoaded) {
    return (
      <div className="p-12 text-center text-gray-500 flex flex-col items-center justify-center gap-2">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-700"></div>
        <p className="text-sm font-semibold">Cargando Módulo Clientes B2B...</p>
      </div>
    );
  }

  return (
    <div className="p-6 text-left space-y-6 animate-in fade-in duration-300">
      
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <Building2 className="w-7 h-7 text-primary-600" />
            Clientes y CRM B2B
          </h2>
          <p className="text-sm text-gray-500">Gestión de cartera comercial, niveles de precio, bitácora comercial y campañas segmentadas.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setShowCampaignModal(true)}
            className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 font-bold py-2.5 px-4 rounded-lg text-sm shadow-sm transition-all flex items-center gap-2 cursor-pointer"
          >
            <Send className="w-4 h-4 text-primary-600" />
            Campañas / Segmentación
          </button>
          <button 
            onClick={handleNewCustomerClick}
            className="bg-primary-600 hover:bg-primary-700 text-white font-bold py-2.5 px-4 rounded-lg text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Nuevo Cliente
          </button>
        </div>
      </div>

      {/* Main Grid: Customer List and Details Panel */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Left Column: Customers List */}
        <div className="xl:col-span-2 space-y-4">
          
          {/* Search and Quick Filters bar */}
          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 items-center">
            
            {/* Search Input */}
            <div className="relative flex-1 w-full">
              <input 
                type="text" 
                placeholder="Buscar por nombre, RFC o clave..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:ring-primary-500 focus:border-primary-500"
              />
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
            </div>

            {/* Quick Select Filters */}
            <div className="flex flex-wrap gap-2 w-full md:w-auto">
              
              <select 
                value={filterType} 
                onChange={e => setFilterType(e.target.value)}
                className="border border-gray-300 rounded-lg text-xs bg-white text-gray-650 px-2 py-1.5 focus:ring-primary-500"
              >
                <option value="all">Tipos (Todos)</option>
                <option value="prospect">Prospecto</option>
                <option value="active">Activo</option>
                <option value="inactive">Inactivo</option>
                <option value="vip">VIP</option>
              </select>

              <select 
                value={filterPriceLevel} 
                onChange={e => setFilterPriceLevel(e.target.value)}
                className="border border-gray-300 rounded-lg text-xs bg-white text-gray-650 px-2 py-1.5 focus:ring-primary-500"
              >
                <option value="all">Nivel Precio (Todos)</option>
                <option value="retail">Retail</option>
                <option value="wholesale">Wholesale</option>
                <option value="distributor">Distributor</option>
                <option value="special">Special</option>
              </select>

              <select 
                value={filterMarketing} 
                onChange={e => setFilterMarketing(e.target.value)}
                className="border border-gray-300 rounded-lg text-xs bg-white text-gray-650 px-2 py-1.5 focus:ring-primary-500"
              >
                <option value="all">Publicidad (Todos)</option>
                <option value="true">Acepta Publicidad</option>
                <option value="false">No Acepta</option>
              </select>

            </div>

          </div>

          {/* List Table */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-gray-500">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th scope="col" className="px-6 py-4">Razón Social / Comercial</th>
                    <th scope="col" className="px-6 py-4">RFC</th>
                    <th scope="col" className="px-6 py-4">Nivel Precio</th>
                    <th scope="col" className="px-6 py-4 text-center">Tipo</th>
                    <th scope="col" className="px-6 py-4 text-center">Publicidad</th>
                    <th scope="col" className="px-6 py-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.map(cust => (
                    <tr 
                      key={cust.id} 
                      onClick={() => setSelectedCustomerId(cust.id || null)}
                      className={`border-b hover:bg-gray-50/70 transition-colors cursor-pointer ${selectedCustomerId === cust.id ? 'bg-primary-50/30' : 'bg-white'}`}
                    >
                      <td className="px-6 py-4">
                        <div className="font-bold text-gray-900">{cust.business_name}</div>
                        {cust.commercial_name && <div className="text-xs text-gray-400">{cust.commercial_name}</div>}
                        <div className="text-[10px] font-mono text-gray-400 mt-0.5">Clave: {cust.access_key}</div>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs">{cust.rfc || "-"}</td>
                      <td className="px-6 py-4 text-xs font-semibold text-gray-700 uppercase">{cust.price_level}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded border ${
                          cust.customer_type === "vip" ? 'bg-red-50 text-red-700 border-red-200' :
                          cust.customer_type === "active" ? 'bg-green-50 text-green-700 border-green-200' :
                          cust.customer_type === "inactive" ? 'bg-gray-100 text-gray-500 border-gray-200' :
                          'bg-yellow-50 text-yellow-700 border-yellow-250'
                        }`}>
                          {cust.customer_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cust.accepts_marketing ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {cust.accepts_marketing ? "Sí" : "No"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-2">
                          <button 
                            onClick={() => handleEditClick(cust)} 
                            className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-primary-600 transition-colors"
                            title="Editar Cliente"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => {
                              if (confirm("¿Estás seguro de eliminar este cliente? Se borrarán sus contactos y direcciones.")) {
                                deleteCustomer(cust.id!);
                                if (selectedCustomerId === cust.id) setSelectedCustomerId(null);
                              }
                            }} 
                            className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-red-600 transition-colors"
                            title="Eliminar Cliente"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredCustomers.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-gray-500 italic">
                        No se encontraron clientes que coincidan con la búsqueda o filtros.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Right Column: Customer Detailed Profile */}
        <div className="xl:col-span-1">
          {profileLoading ? (
            <div className="bg-white rounded-xl border border-gray-100 p-8 text-center text-gray-400 shadow-sm flex flex-col items-center justify-center min-h-[300px]">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mb-2"></div>
              <span>Cargando perfil del cliente...</span>
            </div>
          ) : customerProfile ? (
            <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm space-y-6 text-left relative animate-in slide-in-from-right duration-200">
              
              {/* Profile Header */}
              <div className="flex justify-between items-start border-b pb-4">
                <div>
                  <h3 className="font-black text-gray-900 text-lg">{customerProfile.customer.commercial_name || customerProfile.customer.business_name}</h3>
                  <p className="text-xs text-gray-500 font-mono mt-0.5">{customerProfile.customer.business_name}</p>
                  <p className="text-[10px] text-gray-400 font-mono mt-0.5">Clave de Acceso: <span className="font-bold text-primary-700">{customerProfile.customer.access_key || "-"}</span></p>
                </div>
                <button onClick={() => setSelectedCustomerId(null)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Badges / Metrics row */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-gray-55 p-2.5 rounded-lg border">
                  <span className="text-[10px] text-gray-400 uppercase font-semibold block mb-0.5">Límite de Crédito</span>
                  <span className="font-bold text-gray-800">
                    {customerProfile.customer.credit_enabled ? formatCurrency(customerProfile.customer.credit_limit) : "Inhabilitado"}
                  </span>
                </div>
                <div className="bg-gray-55 p-2.5 rounded-lg border">
                  <span className="text-[10px] text-gray-400 uppercase font-semibold block mb-0.5">Términos Pago</span>
                  <span className="font-bold text-gray-800">{customerProfile.customer.payment_terms}</span>
                </div>
              </div>

              {/* Contacts info */}
              <div>
                <h4 className="font-bold text-gray-900 text-xs uppercase tracking-wider mb-2.5 border-b pb-1">Contacto Principal</h4>
                {(() => {
                  const primary = customerProfile.contacts.find((c: any) => c.is_primary) || customerProfile.contacts[0];
                  if (!primary) return <p className="text-xs text-gray-400 italic">Sin contactos registrados.</p>;
                  return (
                    <div className="text-xs space-y-1 bg-gray-50/50 p-3 rounded-lg border border-gray-150 relative">
                      <p className="font-bold text-gray-800 text-sm">{primary.name}</p>
                      {primary.position && <p className="text-gray-400 font-medium">{primary.position}</p>}
                      <div className="flex items-center gap-1 text-gray-500 mt-2">
                        <Mail className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{primary.email || "-"}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-gray-500 mt-1">
                        <Phone className="w-3.5 h-3.5 shrink-0" />
                        <span>{primary.phone || "-"}</span>
                        {primary.whatsapp && (
                          <a 
                            href={`https://wa.me/${primary.whatsapp.replace(/\D/g, '')}`} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="bg-green-100 hover:bg-green-200 text-green-800 p-0.5 rounded text-[10px] font-bold flex items-center gap-0.5 transition-colors"
                          >
                            <MessageSquare className="w-3 h-3 text-green-700" /> WhatsApp
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Addresses default */}
              <div>
                <h4 className="font-bold text-gray-900 text-xs uppercase tracking-wider mb-2.5 border-b pb-1">Dirección Default</h4>
                {(() => {
                  const defAddr = customerProfile.addresses.find((a: any) => a.is_default) || customerProfile.addresses[0];
                  if (!defAddr) return <p className="text-xs text-gray-400 italic">Sin dirección registrada.</p>;
                  return (
                    <div className="text-xs text-gray-600 space-y-1 bg-gray-50/50 p-3 rounded-lg border border-gray-150">
                      <p className="font-bold text-gray-800">{defAddr.street} #{defAddr.exterior_number} {defAddr.interior_number ? `Int. ${defAddr.interior_number}` : ''}</p>
                      <p>{defAddr.neighborhood}, CP {defAddr.postal_code}</p>
                      <p>{defAddr.city}, {defAddr.state}</p>
                    </div>
                  );
                })()}
              </div>

              {/* Quotes & Orders History summary */}
              <div>
                <h4 className="font-bold text-gray-900 text-xs uppercase tracking-wider mb-2 border-b pb-1">Historial Cotizaciones y Pedidos</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {/* Active quotes */}
                  {customerProfile.quotes.map((q: any) => (
                    <div key={q.id} className="flex justify-between items-center text-xs p-2 bg-gray-50 border rounded-lg">
                      <div>
                        <span className="font-bold text-gray-800 block">{q.id}</span>
                        <span className="text-[10px] text-gray-450">{new Date(q.date).toLocaleDateString()}</span>
                      </div>
                      <span className="font-semibold text-primary-700">{formatCurrency(q.total)}</span>
                    </div>
                  ))}
                  {/* Orders quotes */}
                  {customerProfile.orders.map((o: any) => (
                    <div key={o.id} className="flex justify-between items-center text-xs p-2 bg-green-50/50 border border-green-200 rounded-lg">
                      <div>
                        <span className="font-bold text-green-950 block">{o.id}</span>
                        <span className="text-[10px] text-green-700">{new Date(o.date).toLocaleDateString()} (Entregado)</span>
                      </div>
                      <span className="font-extrabold text-green-800">{formatCurrency(o.total)}</span>
                    </div>
                  ))}
                  {customerProfile.quotes.length === 0 && customerProfile.orders.length === 0 && (
                    <p className="text-xs text-gray-400 italic text-center py-2">Sin solicitudes comerciales.</p>
                  )}
                </div>
              </div>

              {/* Bitácora de Actividades (Timeline) */}
              <div>
                <h4 className="font-bold text-gray-900 text-xs uppercase tracking-wider mb-3 border-b pb-1 flex justify-between items-center">
                  <span>Bitácora Comercial</span>
                  <Activity className="w-3.5 h-3.5 text-gray-450" />
                </h4>
                
                {/* Timeline Log list */}
                <div className="space-y-3 max-h-48 overflow-y-auto pr-1 mb-4">
                  {customerProfile.activities.map((act: CustomerActivity) => (
                    <div key={act.id} className="text-xs border-l-2 border-primary-200 pl-3 py-1 relative">
                      <div className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 bg-primary-600 rounded-full border-2 border-white"></div>
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-gray-800">{act.title}</span>
                        <span className="text-[9px] text-gray-400">{new Date(act.created_at || '').toLocaleString()}</span>
                      </div>
                      <p className="text-gray-600 mt-0.5">{act.description}</p>
                      <p className="text-[9px] text-gray-400 mt-0.5">Por: {act.created_by}</p>
                    </div>
                  ))}
                  {customerProfile.activities.length === 0 && (
                    <p className="text-xs text-gray-400 italic text-center py-2">Sin actividad previa registrada.</p>
                  )}
                </div>

                {/* Add new quick activity note */}
                <form onSubmit={handleAddActivity} className="space-y-2 pt-2 border-t">
                  <div className="flex gap-2">
                    <select 
                      value={activityType} 
                      onChange={e => setActivityType(e.target.value as any)}
                      className="border border-gray-300 rounded text-xs bg-white p-1"
                    >
                      <option value="note">Nota</option>
                      <option value="call">Llamada</option>
                      <option value="whatsapp">WhatsApp</option>
                      <option value="email">Email</option>
                    </select>
                    <input 
                      type="text" 
                      placeholder="Registrar detalles en la bitácora..."
                      value={activityNote}
                      onChange={e => setActivityNote(e.target.value)}
                      className="flex-1 border border-gray-300 rounded px-2.5 py-1 text-xs focus:ring-1 focus:ring-primary-500 focus:outline-none"
                    />
                    <button type="submit" className="bg-primary-600 text-white font-bold p-1 rounded text-xs hover:bg-primary-700">
                      Log
                    </button>
                  </div>
                </form>
              </div>

            </div>
          ) : (
            <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-8 text-center text-gray-400 min-h-[300px] flex flex-col items-center justify-center shadow-inner">
              <Building2 className="w-12 h-12 text-gray-300 mb-2" />
              <p className="text-sm font-bold">Selecciona un cliente de la lista</p>
              <p className="text-xs text-gray-400 mt-1">Podrás visualizar su contacto, direcciones predeterminadas, historial de cotizaciones, pedidos y su línea de tiempo comercial.</p>
            </div>
          )}
        </div>

      </div>

      {/* MODAL B: Alta y Edición de Cliente */}
      {showAddEditModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-150 flex justify-between items-center bg-gray-50 rounded-t-2xl">
              <h3 className="font-bold text-gray-900 text-lg">
                {editingCustomer ? `Editar Cliente: ${formCommercial.business_name}` : "Registrar Nuevo Cliente B2B"}
              </h3>
              <button onClick={() => setShowAddEditModal(false)} className="text-gray-450 hover:text-gray-900">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Form Wizard Tabs */}
            <div className="flex border-b text-xs font-semibold overflow-x-auto bg-gray-50/50">
              {[
                { id: 'commercial', label: 'Datos Comerciales' },
                { id: 'contacts', label: 'Contactos' },
                { id: 'addresses', label: 'Direcciones' },
                { id: 'discounts', label: 'Descuentos' },
                { id: 'marketing', label: 'Publicidad' },
                { id: 'notes', label: 'Notas Internas' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveFormTab(tab.id as any)}
                  className={`px-5 py-3 border-b-2 font-bold whitespace-nowrap transition-colors ${
                    activeFormTab === tab.id 
                      ? 'border-primary-600 text-primary-700 bg-white' 
                      : 'border-transparent text-gray-500 hover:text-gray-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Form Content Scrollable */}
            <form onSubmit={handleSaveCustomer} className="flex-1 overflow-y-auto p-6 space-y-6 text-sm text-left">
              
              {/* TAB 1: COMMERCIAL DATA */}
              {activeFormTab === 'commercial' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-gray-700 uppercase">Razón Social *</label>
                    <input 
                      type="text" 
                      required
                      value={formCommercial.business_name}
                      onChange={e => setFormCommercial({ ...formCommercial, business_name: e.target.value })}
                      placeholder="Ej. Comercializadora del Centro S.A. de C.V."
                      className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-gray-700 uppercase">Nombre Comercial</label>
                    <input 
                      type="text" 
                      value={formCommercial.commercial_name}
                      onChange={e => setFormCommercial({ ...formCommercial, commercial_name: e.target.value })}
                      placeholder="Ej. GeekyStore Retail"
                      className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-primary-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-gray-700 uppercase">RFC</label>
                    <input 
                      type="text" 
                      value={formCommercial.rfc}
                      onChange={e => setFormCommercial({ ...formCommercial, rfc: e.target.value.toUpperCase() })}
                      placeholder="Ej. CCE010101ABC"
                      className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-primary-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-gray-700 uppercase">Clave de Acceso B2B (Auto-generada)</label>
                    <input 
                      type="text" 
                      required
                      value={formCommercial.access_key}
                      onChange={e => setFormCommercial({ ...formCommercial, access_key: e.target.value })}
                      placeholder="Clave única para portal del cliente"
                      className="w-full border border-gray-300 rounded-lg p-2.5 text-sm font-bold text-primary-700 focus:ring-primary-500 bg-gray-50"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-gray-700 uppercase">Tipo de Cliente</label>
                    <select
                      value={formCommercial.customer_type}
                      onChange={e => setFormCommercial({ ...formCommercial, customer_type: e.target.value as any })}
                      className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-primary-500 bg-white"
                    >
                      <option value="prospect">Prospecto</option>
                      <option value="active">Activo</option>
                      <option value="inactive">Inactivo</option>
                      <option value="vip">VIP</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-gray-700 uppercase">Nivel de Precios B2B</label>
                    <select
                      value={formCommercial.price_level}
                      onChange={e => setFormCommercial({ ...formCommercial, price_level: e.target.value as any })}
                      className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-primary-500 bg-white"
                    >
                      <option value="retail">Retail (Escala base)</option>
                      <option value="wholesale">Wholesale (Escala 2 / 10% Dto.)</option>
                      <option value="distributor">Distributor (Escala 3 / 20% Dto.)</option>
                      <option value="special">Special (25% Dto. directo)</option>
                    </select>
                  </div>
                  
                  {/* Credit inputs */}
                  <div className="md:col-span-2 p-4 bg-gray-50 rounded-xl border space-y-4">
                    <div className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        id="credit_enabled"
                        checked={formCommercial.credit_enabled}
                        onChange={e => setFormCommercial({ ...formCommercial, credit_enabled: e.target.checked })}
                        className="rounded text-primary-600 focus:ring-primary-500"
                      />
                      <label htmlFor="credit_enabled" className="text-xs font-bold text-gray-700 uppercase cursor-pointer">Habilitar Crédito Comercial B2B</label>
                    </div>
                    {formCommercial.credit_enabled && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-200">
                        <div className="space-y-1">
                          <label className="block text-xs font-bold text-gray-700 uppercase">Límite de Crédito ($ MXN)</label>
                          <input 
                            type="number" 
                            min="0"
                            value={formCommercial.credit_limit}
                            onChange={e => setFormCommercial({ ...formCommercial, credit_limit: Number(e.target.value) })}
                            className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-primary-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-xs font-bold text-gray-700 uppercase">Condiciones comerciales de Pago</label>
                          <input 
                            type="text" 
                            value={formCommercial.payment_terms}
                            onChange={e => setFormCommercial({ ...formCommercial, payment_terms: e.target.value })}
                            placeholder="Ej. Crédito 30 días"
                            className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-primary-500"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: CONTACTS EDITOR */}
              {activeFormTab === 'contacts' && (
                <div className="space-y-6">
                  {/* Contact editor list */}
                  <div className="space-y-3">
                    <h4 className="font-bold text-gray-700 text-xs uppercase">Contactos Agregados</h4>
                    {formContacts.map((c, i) => (
                      <div key={i} className="flex justify-between items-center bg-gray-50 border p-3 rounded-lg text-xs">
                        <div>
                          <p className="font-bold text-gray-800 text-sm">{c.name} {c.is_primary && <span className="bg-primary-100 text-primary-850 px-1.5 py-0.5 rounded text-[9px] uppercase font-bold border border-primary-200 ml-1.5">Primario</span>}</p>
                          <p className="text-gray-450">{c.position || "Sin puesto"} | {c.email || "Sin email"} | {c.phone || "Sin teléfono"}</p>
                        </div>
                        <button 
                          type="button" 
                          onClick={() => handleRemoveContactFromForm(i)}
                          className="text-gray-400 hover:text-red-500 transition-colors p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    {formContacts.length === 0 && <p className="text-xs text-gray-400 italic">No hay contactos registrados para este cliente.</p>}
                  </div>

                  {/* Add new contact form */}
                  <div className="p-4 bg-gray-50 rounded-xl border grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <h5 className="font-bold text-gray-700 text-xs uppercase sm:col-span-2">Añadir Contacto</h5>
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-gray-600 uppercase">Nombre Completo</label>
                      <input 
                        type="text" 
                        value={newContact.name}
                        onChange={e => setNewContact({ ...newContact, name: e.target.value })}
                        className="w-full border border-gray-300 rounded p-2 text-xs bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-gray-600 uppercase">Cargo / Puesto</label>
                      <input 
                        type="text" 
                        value={newContact.position}
                        onChange={e => setNewContact({ ...newContact, position: e.target.value })}
                        placeholder="Ej. Compras"
                        className="w-full border border-gray-300 rounded p-2 text-xs bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-gray-600 uppercase">Correo electrónico</label>
                      <input 
                        type="email" 
                        value={newContact.email}
                        onChange={e => setNewContact({ ...newContact, email: e.target.value })}
                        className="w-full border border-gray-300 rounded p-2 text-xs bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-gray-600 uppercase">Teléfono de Oficina</label>
                      <input 
                        type="tel" 
                        value={newContact.phone}
                        onChange={e => setNewContact({ ...newContact, phone: e.target.value })}
                        className="w-full border border-gray-300 rounded p-2 text-xs bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-gray-600 uppercase">WhatsApp de Contacto Directo</label>
                      <input 
                        type="tel" 
                        value={newContact.whatsapp}
                        onChange={e => setNewContact({ ...newContact, whatsapp: e.target.value })}
                        placeholder="Ej. 52449..."
                        className="w-full border border-gray-300 rounded p-2 text-xs bg-white"
                      />
                    </div>
                    <div className="flex items-center gap-2 pt-4">
                      <input 
                        type="checkbox" 
                        id="new_is_primary"
                        checked={newContact.is_primary}
                        onChange={e => setNewContact({ ...newContact, is_primary: e.target.checked })}
                        className="rounded text-primary-600 focus:ring-primary-500"
                      />
                      <label htmlFor="new_is_primary" className="text-xs font-bold text-gray-700 uppercase cursor-pointer">Establecer como Contacto Principal</label>
                    </div>
                    <div className="sm:col-span-2 pt-2 text-right">
                      <button 
                        type="button" 
                        onClick={handleAddContactToForm}
                        className="bg-primary-600 text-white font-bold py-1.5 px-4 rounded text-xs hover:bg-primary-750 transition-colors"
                      >
                        Agregar Contacto
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: ADDRESSES EDITOR */}
              {activeFormTab === 'addresses' && (
                <div className="space-y-6">
                  {/* Address lists temporarily */}
                  <div className="space-y-3">
                    <h4 className="font-bold text-gray-700 text-xs uppercase">Direcciones Agregadas</h4>
                    {formAddresses.map((a, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-gray-50 border p-3 rounded-lg text-xs">
                        <div>
                          <p className="font-bold text-gray-800 text-sm">
                            {a.street} #{a.exterior_number} {a.interior_number ? `Int. ${a.interior_number}` : ''}
                            {a.is_default && <span className="bg-green-100 text-green-800 px-1.5 py-0.5 rounded text-[9px] uppercase font-bold border border-green-200 ml-1.5">Default</span>}
                          </p>
                          <p className="text-gray-450">{a.address_type.toUpperCase()} | {a.neighborhood}, CP {a.postal_code} | {a.city}, {a.state}</p>
                        </div>
                        <button 
                          type="button" 
                          onClick={() => handleRemoveAddressFromForm(idx)}
                          className="text-gray-400 hover:text-red-500 transition-colors p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    {formAddresses.length === 0 && <p className="text-xs text-gray-400 italic">No hay direcciones registradas para este cliente.</p>}
                  </div>

                  {/* Add new address sub-form */}
                  <div className="p-4 bg-gray-50 rounded-xl border grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <h5 className="font-bold text-gray-700 text-xs uppercase sm:col-span-2 md:col-span-3">Añadir Dirección</h5>
                    
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-gray-600 uppercase">Tipo de Dirección</label>
                      <select 
                        value={newAddress.address_type}
                        onChange={e => setNewAddress({ ...newAddress, address_type: e.target.value as any })}
                        className="w-full border border-gray-300 rounded p-2 text-xs bg-white"
                      >
                        <option value="shipping">Envío</option>
                        <option value="billing">Facturación</option>
                        <option value="both">Ambas (Facturación y Envío)</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-gray-600 uppercase">Calle *</label>
                      <input 
                        type="text" 
                        value={newAddress.street}
                        onChange={e => setNewAddress({ ...newAddress, street: e.target.value })}
                        className="w-full border border-gray-300 rounded p-2 text-xs bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-gray-600 uppercase">Núm Exterior *</label>
                      <input 
                        type="text" 
                        value={newAddress.exterior_number}
                        onChange={e => setNewAddress({ ...newAddress, exterior_number: e.target.value })}
                        className="w-full border border-gray-300 rounded p-2 text-xs bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-gray-600 uppercase">Núm Interior</label>
                      <input 
                        type="text" 
                        value={newAddress.interior_number}
                        onChange={e => setNewAddress({ ...newAddress, interior_number: e.target.value })}
                        className="w-full border border-gray-300 rounded p-2 text-xs bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-gray-600 uppercase">Colonia *</label>
                      <input 
                        type="text" 
                        value={newAddress.neighborhood}
                        onChange={e => setNewAddress({ ...newAddress, neighborhood: e.target.value })}
                        className="w-full border border-gray-300 rounded p-2 text-xs bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-gray-600 uppercase">Código Postal *</label>
                      <input 
                        type="text" 
                        value={newAddress.postal_code}
                        onChange={e => {
                          const val = e.target.value.replace(/\D/g, "").slice(0, 5);
                          setNewAddress(prev => {
                            const updated = { ...prev, postal_code: val };
                            // Auto fill state/city from mexico data if CP is 5 digits
                            if (val.length === 5) {
                              const prefix = parseInt(val.substring(0, 2), 10);
                              let detectedState = "";
                              
                              if (prefix >= 1 && prefix <= 16) detectedState = "Ciudad de México";
                              else if (prefix === 20) detectedState = "Aguascalientes";
                              else if (prefix === 21 || prefix === 22) detectedState = "Baja California";
                              else if (prefix === 23) detectedState = "Baja California Sur";
                              else if (prefix === 24) detectedState = "Campeche";
                              else if (prefix >= 25 && prefix <= 27) detectedState = "Coahuila de Zaragoza";
                              else if (prefix === 28) detectedState = "Colima";
                              else if (prefix >= 29 && prefix <= 30) detectedState = "Chiapas";
                              else if (prefix >= 31 && prefix <= 33) detectedState = "Chihuahua";
                              else if (prefix >= 34 && prefix <= 35) detectedState = "Durango";
                              else if (prefix >= 36 && prefix <= 38) detectedState = "Guanajuato";
                              else if (prefix >= 39 && prefix <= 41) detectedState = "Guerrero";
                              else if (prefix >= 42 && prefix <= 43) detectedState = "Hidalgo";
                              else if (prefix >= 44 && prefix <= 49) detectedState = "Jalisco";
                              else if (prefix >= 50 && prefix <= 57) detectedState = "México";
                              else if (prefix >= 58 && prefix <= 61) detectedState = "Michoacán de Ocampo";
                              else if (prefix === 62) detectedState = "Morelos";
                              else if (prefix === 63) detectedState = "Nayarit";
                              else if (prefix >= 64 && prefix <= 67) detectedState = "Nuevo León";
                              else if (prefix >= 68 && prefix <= 71) detectedState = "Oaxaca";
                              else if (prefix >= 72 && prefix <= 75) detectedState = "Puebla";
                              else if (prefix === 76) detectedState = "Querétaro";
                              else if (prefix === 77) detectedState = "Quintana Roo";
                              else if (prefix >= 78 && prefix <= 79) detectedState = "San Luis Potosí";
                              else if (prefix >= 80 && prefix <= 82) detectedState = "Sinaloa";
                              else if (prefix >= 83 && prefix <= 85) detectedState = "Sonora";
                              else if (prefix === 86) detectedState = "Tabasco";
                              else if (prefix >= 87 && prefix <= 89) detectedState = "Tamaulipas";
                              else if (prefix === 90) detectedState = "Tlaxcala";
                              else if (prefix >= 91 && prefix <= 96) detectedState = "Veracruz de Ignacio de la Llave";
                              else if (prefix === 97) detectedState = "Yucatán";
                              else if (prefix >= 98 && prefix <= 99) detectedState = "Zacatecas";
                              
                              if (detectedState) {
                                updated.state = detectedState;
                                const cities = (mexicoData as Record<string, string[]>)[detectedState] || [];
                                updated.city = cities[0] || "";
                              }
                            }
                            return updated;
                          });
                        }}
                        className="w-full border border-gray-300 rounded p-2 text-xs bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-gray-600 uppercase">Estado *</label>
                      <select 
                        value={newAddress.state}
                        onChange={e => setNewAddress({ ...newAddress, state: e.target.value, city: "" })}
                        className="w-full border border-gray-300 rounded p-2 text-xs bg-white"
                      >
                        <option value="">Selecciona Estado</option>
                        {MEXICO_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-gray-600 uppercase">Ciudad / Municipio *</label>
                      <select 
                        value={newAddress.city}
                        onChange={e => setNewAddress({ ...newAddress, city: e.target.value })}
                        disabled={!newAddress.state}
                        className="w-full border border-gray-300 rounded p-2 text-xs bg-white disabled:bg-gray-100"
                      >
                        <option value="">Selecciona Ciudad</option>
                        {newAddress.state && (mexicoData as Record<string, string[]>)[newAddress.state]?.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-gray-600 uppercase">Referencias (Entre calles, etc.)</label>
                      <input 
                        type="text" 
                        value={newAddress.reference}
                        onChange={e => setNewAddress({ ...newAddress, reference: e.target.value })}
                        className="w-full border border-gray-300 rounded p-2 text-xs bg-white"
                      />
                    </div>
                    <div className="flex items-center gap-2 pt-4 sm:col-span-2">
                      <input 
                        type="checkbox" 
                        id="new_is_default"
                        checked={newAddress.is_default}
                        onChange={e => setNewAddress({ ...newAddress, is_default: e.target.checked })}
                        className="rounded text-primary-600 focus:ring-primary-500"
                      />
                      <label htmlFor="new_is_default" className="text-xs font-bold text-gray-700 uppercase cursor-pointer">Establecer como Dirección de Envío Default</label>
                    </div>
                    <div className="sm:col-span-2 md:col-span-3 pt-2 text-right">
                      <button 
                        type="button" 
                        onClick={handleAddAddressToForm}
                        className="bg-primary-600 text-white font-bold py-1.5 px-4 rounded text-xs hover:bg-primary-750 transition-colors"
                      >
                        Agregar Dirección
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: DISCOUNTS EDITOR */}
              {activeFormTab === 'discounts' && (
                <div className="space-y-6">
                  {/* Global or Custom client discounts list */}
                  <div className="space-y-3">
                    <h4 className="font-bold text-gray-700 text-xs uppercase">Descuentos Especiales del Cliente</h4>
                    {formDiscounts.map((d, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-gray-50 border p-3 rounded-lg text-xs">
                        <div>
                          <p className="font-bold text-gray-800 text-sm">
                            {d.discount_type === "global" ? "Descuento Global" :
                             d.discount_type === "category" ? `Categoría: ${d.category_id}` :
                             `Producto ID: ${d.product_id}`}
                          </p>
                          {d.valid_until && (
                            <p className="text-[10px] text-gray-400">Vigencia: {d.valid_from ? new Date(d.valid_from).toLocaleDateString() : ""} - {new Date(d.valid_until).toLocaleDateString()}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-black text-green-700 text-sm">-{d.discount_percent}%</span>
                          <button 
                            type="button" 
                            onClick={() => handleRemoveDiscountFromForm(idx)}
                            className="text-gray-400 hover:text-red-500 transition-colors p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                    {formDiscounts.length === 0 && <p className="text-xs text-gray-400 italic">No hay descuentos específicos configurados.</p>}
                  </div>

                  {/* Add new discount sub-form */}
                  <div className="p-4 bg-gray-50 rounded-xl border grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <h5 className="font-bold text-gray-700 text-xs uppercase sm:col-span-2 md:col-span-3">Añadir Descuento Comercial Especial</h5>
                    
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-gray-600 uppercase">Tipo Descuento</label>
                      <select 
                        value={newDiscount.discount_type}
                        onChange={e => setNewDiscount({ ...newDiscount, discount_type: e.target.value as any })}
                        className="w-full border border-gray-300 rounded p-2 text-xs bg-white"
                      >
                        <option value="global">Global (Todo el sitio)</option>
                        <option value="category">Por Categoría</option>
                        <option value="product">Por Producto</option>
                      </select>
                    </div>

                    {newDiscount.discount_type === "category" && (
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-gray-600 uppercase">Nombre Categoría</label>
                        <input 
                          type="text" 
                          value={newDiscount.category_id}
                          onChange={e => setNewDiscount({ ...newDiscount, category_id: e.target.value })}
                          placeholder="Ej. Tecnología"
                          className="w-full border border-gray-300 rounded p-2 text-xs bg-white"
                        />
                      </div>
                    )}

                    {newDiscount.discount_type === "product" && (
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-gray-600 uppercase">ID del Producto (SKU o ID)</label>
                        <input 
                          type="text" 
                          value={newDiscount.product_id}
                          onChange={e => setNewDiscount({ ...newDiscount, product_id: e.target.value })}
                          placeholder="Ej. b0318543-..."
                          className="w-full border border-gray-300 rounded p-2 text-xs bg-white"
                        />
                      </div>
                    )}

                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-gray-600 uppercase">Descuento (%)</label>
                      <input 
                        type="number" 
                        min="0"
                        max="100"
                        value={newDiscount.discount_percent}
                        onChange={e => setNewDiscount({ ...newDiscount, discount_percent: Number(e.target.value) })}
                        className="w-full border border-gray-300 rounded p-2 text-xs bg-white"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-gray-600 uppercase">Válido Desde (Opcional)</label>
                      <input 
                        type="date" 
                        value={newDiscount.valid_from}
                        onChange={e => setNewDiscount({ ...newDiscount, valid_from: e.target.value })}
                        className="w-full border border-gray-300 rounded p-2 text-xs bg-white"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-gray-600 uppercase">Válido Hasta (Opcional)</label>
                      <input 
                        type="date" 
                        value={newDiscount.valid_until}
                        onChange={e => setNewDiscount({ ...newDiscount, valid_until: e.target.value })}
                        className="w-full border border-gray-300 rounded p-2 text-xs bg-white"
                      />
                    </div>

                    <div className="sm:col-span-2 md:col-span-3 pt-2 text-right">
                      <button 
                        type="button" 
                        onClick={handleAddDiscountToForm}
                        className="bg-primary-600 text-white font-bold py-1.5 px-4 rounded text-xs hover:bg-primary-750 transition-colors"
                      >
                        Agregar Descuento
                      </button>
                    </div>
                  </div>

                  {/* Cupones B2B */}
                  <div className="p-4 bg-gray-50 border rounded-xl space-y-3 mt-4">
                    <h5 className="font-bold text-gray-700 text-xs uppercase">Cupones de Promoción Disponibles</h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input 
                          type="checkbox"
                          checked={formDiscounts.some(d => d.discount_type === 'promotion' && d.category_id === 'ENVIO_SIN_COSTO' && d.active)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormDiscounts([...formDiscounts, { discount_type: 'promotion', category_id: 'ENVIO_SIN_COSTO', discount_percent: 0, active: true }]);
                            } else {
                              setFormDiscounts(formDiscounts.filter(d => !(d.discount_type === 'promotion' && d.category_id === 'ENVIO_SIN_COSTO')));
                            }
                          }}
                          className="rounded text-primary-600 focus:ring-primary-500 h-4 w-4 border-gray-300 cursor-pointer"
                        />
                        <span className="text-xs font-semibold text-gray-700">🎟️ Cupón Envío sin Costo</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input 
                          type="checkbox"
                          checked={formDiscounts.some(d => d.discount_type === 'promotion' && d.category_id === 'MUESTRA_Y_ENVIO_GRATIS' && d.active)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormDiscounts([...formDiscounts, { discount_type: 'promotion', category_id: 'MUESTRA_Y_ENVIO_GRATIS', discount_percent: 0, active: true }]);
                            } else {
                              setFormDiscounts(formDiscounts.filter(d => !(d.discount_type === 'promotion' && d.category_id === 'MUESTRA_Y_ENVIO_GRATIS')));
                            }
                          }}
                          className="rounded text-primary-600 focus:ring-primary-500 h-4 w-4 border-gray-300 cursor-pointer"
                        />
                        <span className="text-xs font-semibold text-gray-700">🎟️ Cupón Muestra Física y Envío Gratis</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: PUBLICIDAD Y PREFERENCIAS */}
              {activeFormTab === 'marketing' && (
                <div className="p-5 bg-gray-50 rounded-xl border space-y-5">
                  <h4 className="font-bold text-gray-700 text-xs uppercase border-b pb-1.5">Permisos de Publicidad y Campañas</h4>
                  
                  <div className="flex items-center gap-2.5">
                    <input 
                      type="checkbox" 
                      id="accepts_marketing"
                      checked={formMarketing.accepts_marketing}
                      onChange={e => setFormMarketing({ ...formMarketing, accepts_marketing: e.target.checked })}
                      className="rounded text-primary-600 focus:ring-primary-500 w-4 h-4 border-gray-350"
                    />
                    <label htmlFor="accepts_marketing" className="text-xs font-bold text-gray-700 uppercase cursor-pointer select-none">
                      El cliente acepta recibir publicidad y ofertas comerciales.
                    </label>
                  </div>

                  {formMarketing.accepts_marketing && (
                    <div className="space-y-1.5 animate-in fade-in duration-200">
                      <label className="block text-xs font-bold text-gray-700 uppercase">Canal de Envío Preferido</label>
                      <select
                        value={formMarketing.marketing_channel}
                        onChange={e => setFormMarketing({ ...formMarketing, marketing_channel: e.target.value as any })}
                        className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-primary-500 bg-white"
                      >
                        <option value="both">Ambos (WhatsApp y Email)</option>
                        <option value="whatsapp">WhatsApp Únicamente</option>
                        <option value="email">Correo Electrónico Únicamente</option>
                        <option value="none">Ninguno</option>
                      </select>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 6: NOTAS INTERNAS */}
              {activeFormTab === 'notes' && (
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-700 uppercase">Notas Internas y Observaciones Comerciales</label>
                  <textarea 
                    rows={6}
                    value={formCommercial.notes}
                    onChange={e => setFormCommercial({ ...formCommercial, notes: e.target.value })}
                    placeholder="Escribe comentarios privados sobre la negociación, historial, acuerdos de volumen, referencias, etc."
                    className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-primary-500"
                  />
                </div>
              )}

            </form>

            <div className="p-6 border-t border-gray-150 bg-gray-50 rounded-b-2xl flex justify-between items-center">
              <div>
                {activeFormTab !== 'commercial' && (
                  <button 
                    type="button" 
                    onClick={() => {
                      const tabs = ['commercial', 'contacts', 'addresses', 'discounts', 'marketing', 'notes'];
                      const idx = tabs.indexOf(activeFormTab);
                      setActiveFormTab(tabs[idx - 1] as any);
                    }}
                    className="text-gray-600 hover:text-gray-900 text-xs font-bold"
                  >
                    Anterior
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                {activeFormTab !== 'notes' ? (
                  <button 
                    type="button" 
                    onClick={() => {
                      const tabs = ['commercial', 'contacts', 'addresses', 'discounts', 'marketing', 'notes'];
                      const idx = tabs.indexOf(activeFormTab);
                      setActiveFormTab(tabs[idx + 1] as any);
                    }}
                    className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold py-2 px-6 rounded-lg text-xs"
                  >
                    Siguiente Sección
                  </button>
                ) : null}
                <button 
                  type="button" 
                  onClick={handleSaveCustomer}
                  className="bg-primary-600 hover:bg-primary-700 text-white font-bold py-2 px-6 rounded-lg text-xs shadow-sm cursor-pointer"
                >
                  Guardar Cliente B2B
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL C: Campañas y Segmentación */}
      {showCampaignModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-gray-150 flex justify-between items-center bg-gray-50 rounded-t-2xl">
              <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                <Send className="w-5 h-5 text-primary-600" />
                Diseñador de Campañas B2B
              </h3>
              <button onClick={() => setShowCampaignModal(false)} className="text-gray-400 hover:text-gray-900">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 text-sm text-left">
              
              {/* Rules & Segments Builder */}
              <div className="space-y-6">
                <div>
                  <h4 className="font-bold text-gray-800 text-xs uppercase mb-3">1. Seleccionar Segmento Existente</h4>
                  <div className="flex gap-2">
                    <select 
                      value={selectedSegmentId}
                      onChange={e => {
                        setSelectedSegmentId(e.target.value);
                        setEditingSegmentId(null);
                      }}
                      className="flex-1 border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-primary-500 bg-white"
                    >
                      <option value="">-- Elige un segmento --</option>
                      {segments.map(s => <option key={s.id} value={s.id}>{s.name} ({s.description})</option>)}
                    </select>
                    <button 
                      type="button" 
                      onClick={handleEvaluateSegment}
                      disabled={!selectedSegmentId}
                      className="bg-primary-600 hover:bg-primary-750 text-white font-bold px-3 rounded-lg text-xs disabled:opacity-50 cursor-pointer"
                    >
                      Calcular
                    </button>
                    {selectedSegmentId && (
                      <>
                        <button 
                          type="button" 
                          onClick={() => {
                            const seg = segments.find(s => s.id === selectedSegmentId);
                            if (seg && seg.id) {
                              setEditingSegmentId(seg.id);
                              setNewSegmentName(seg.name);
                              setNewSegmentDesc(seg.description || "");
                              setNewSegmentRules(seg.rules_json || {
                                state: "",
                                city: "",
                                customer_type: "",
                                price_level: "",
                                min_purchases: 0
                              });
                            }
                          }}
                          className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold px-3 rounded-lg text-xs cursor-pointer flex items-center justify-center border border-gray-200"
                          title="Editar Segmento"
                        >
                          <Edit className="w-4.5 h-4.5" />
                        </button>
                        <button 
                          type="button" 
                          onClick={async () => {
                            const seg = segments.find(s => s.id === selectedSegmentId);
                            if (seg && seg.id && confirm(`¿Estás seguro de que deseas eliminar el segmento "${seg.name}"?`)) {
                              try {
                                await deleteSegment(seg.id);
                                setSelectedSegmentId("");
                                setCampaignRecipients([]);
                                setEditingSegmentId(null);
                                alert("Segmento eliminado correctamente.");
                              } catch (e) {
                                console.error(e);
                                alert("Error al eliminar segmento.");
                              }
                            }
                          }}
                          className="bg-red-50 hover:bg-red-100 text-red-600 font-bold px-3 rounded-lg text-xs cursor-pointer flex items-center justify-center border border-red-200"
                          title="Eliminar Segmento"
                        >
                          <Trash2 className="w-4.5 h-4.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Create a new campaign segment */}
                <form onSubmit={handleCreateSegment} className="bg-gray-50 border p-4 rounded-xl space-y-4">
                  <h5 className="font-bold text-gray-700 text-xs uppercase flex items-center gap-1.5 border-b pb-1">
                    {editingSegmentId ? "Editar Segmento B2B" : "Crear Nuevo Segmento"}
                  </h5>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-gray-600 uppercase">Nombre</label>
                      <input 
                        type="text" 
                        value={newSegmentName}
                        onChange={e => setNewSegmentName(e.target.value)}
                        placeholder="Ej. VIP Monterrey"
                        className="w-full border border-gray-300 rounded p-2 text-xs bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-gray-600 uppercase">Descripción</label>
                      <input 
                        type="text" 
                        value={newSegmentDesc}
                        onChange={e => setNewSegmentDesc(e.target.value)}
                        placeholder="Ej. Clientes VIP en Mty"
                        className="w-full border border-gray-300 rounded p-2 text-xs bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-gray-600 uppercase">Filtrar Estado</label>
                      <select 
                        value={newSegmentRules.state}
                        onChange={e => setNewSegmentRules({ ...newSegmentRules, state: e.target.value })}
                        className="w-full border border-gray-300 rounded p-2 text-xs bg-white"
                      >
                        <option value="">Cualquier Estado</option>
                        {MEXICO_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-gray-600 uppercase">Tipo Cliente</label>
                      <select 
                        value={newSegmentRules.customer_type}
                        onChange={e => setNewSegmentRules({ ...newSegmentRules, customer_type: e.target.value })}
                        className="w-full border border-gray-300 rounded p-2 text-xs bg-white"
                      >
                        <option value="">Cualquier Tipo</option>
                        <option value="vip">VIP</option>
                        <option value="active">Activo</option>
                        <option value="prospect">Prospecto</option>
                      </select>
                    </div>
                  </div>
                  <div className="text-right pt-2 border-t flex justify-end gap-2">
                    {editingSegmentId && (
                      <button 
                        type="button" 
                        onClick={() => {
                          setEditingSegmentId(null);
                          setNewSegmentName("");
                          setNewSegmentDesc("");
                          setNewSegmentRules({
                            state: "",
                            city: "",
                            customer_type: "",
                            price_level: "",
                            min_purchases: 0
                          });
                        }}
                        className="bg-gray-200 text-gray-700 font-bold py-1.5 px-4 rounded text-xs hover:bg-gray-300 cursor-pointer"
                      >
                        Cancelar
                      </button>
                    )}
                    <button type="submit" className="bg-primary-600 text-white font-bold py-1.5 px-4 rounded text-xs hover:bg-primary-750 cursor-pointer">
                      {editingSegmentId ? "Actualizar Segmento" : "Guardar Segmento"}
                    </button>
                  </div>
                </form>
              </div>

              {/* Recipients List & Message Draft */}
              <div className="space-y-4 flex flex-col h-full min-h-0">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-gray-800 text-xs uppercase">2. Destinatarios Calificados ({campaignRecipients.length})</h4>
                  <span className="text-[10px] bg-red-100 text-red-800 font-bold px-2 py-0.5 rounded border border-red-200">Excluye publicidad rechazada</span>
                </div>
                
                {/* List of valid campaign members */}
                <div className="border rounded-lg p-2.5 max-h-40 overflow-y-auto bg-gray-50 flex-1">
                  {campaignRecipients.map(member => (
                    <div key={member.id} className="flex justify-between items-center border-b py-1.5 text-xs">
                      <div>
                        <span className="font-bold text-gray-800 block">{member.commercial_name || member.business_name}</span>
                        <span className="text-[10px] text-gray-400">Canal: {member.marketing_channel}</span>
                      </div>
                      <span className="text-xs font-semibold text-primary-700">{member.price_level}</span>
                    </div>
                  ))}
                  {campaignRecipients.length === 0 && (
                    <p className="text-xs text-gray-400 italic text-center py-4">No se han calculado miembros. Elige un segmento y haz clic en calcular.</p>
                  )}
                </div>

                {/* Draft WhatsApp text message */}
                <div className="space-y-2 pt-2">
                  <label className="block text-xs font-bold text-gray-700 uppercase">3. Redactar Mensaje de WhatsApp</label>
                  <textarea 
                    rows={3}
                    value={campaignMessage}
                    onChange={e => setCampaignMessage(e.target.value)}
                    placeholder="Escribe el mensaje de campaña... Ej: ¡Hola! Te compartimos nuestra nueva colección de termos ecológicos con tu 20% Dto. B2B. Accede a geekystore.mx con tu clave de acceso."
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-xs focus:ring-primary-500"
                  />
                  <div className="flex gap-2">
                    {campaignRecipients.length > 0 && campaignMessage.trim() && (
                      <button 
                        type="button"
                        onClick={async () => {
                          // Loop through members and trigger WhatsApp sendings
                          // Note: B2B mass WhatsApp trigger can launch manual WA links for each contact
                          const promises = campaignRecipients.map(async (member) => {
                            // Find primary contact whatsapp or phone
                            const { data: contacts } = await supabase
                              .from("customer_contacts")
                              .select("*")
                              .eq("customer_id", member.id);
                            
                            const contact = contacts?.find(c => c.is_primary) || contacts?.[0];
                            const phone = contact?.whatsapp || contact?.phone || "";
                            if (phone) {
                              const clean = phone.replace(/\D/g, "");
                              const text = encodeURIComponent(campaignMessage);
                              window.open(`https://wa.me/${clean}?text=${text}`, "_blank");

                              // Log Activity
                              await supabase.from("customer_activity").insert([{
                                customer_id: member.id,
                                activity_type: "promotion_sent",
                                title: "Campaña de WhatsApp Enviada",
                                description: `Mensaje de campaña enviado: "${campaignMessage.substring(0,60)}..."`,
                                created_by: "Administrador"
                              }]);
                            }
                          });
                          await Promise.all(promises);
                          alert("¡Mensajes de WhatsApp abiertos! Se registraron los envíos en las bitácoras comerciales de cada cliente.");
                          setShowCampaignModal(false);
                          if (selectedCustomerId) loadProfile(selectedCustomerId);
                        }}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 px-4 rounded-lg text-xs shadow flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <MessageSquare className="w-4 h-4" /> Lanzar Campaña en WhatsApp
                      </button>
                    )}
                  </div>
                </div>

              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
