"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { 
  FileText, 
  Download, 
  Plus, 
  Trash2, 
  RefreshCw, 
  CheckCircle2, 
  Info, 
  ArrowLeft,
  Settings,
  HelpCircle,
  FileCode,
  DollarSign,
  User,
  Building,
  AlertTriangle,
  Eye,
  Lock
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useCRM } from "@/hooks/useCRM";
import { useProducts } from "@/hooks/useProducts";
import { useQuotes } from "@/hooks/useQuotes";
import { supabase } from "@/lib/supabase";


// Interface Definitions
interface InvoiceItem {
  id: string;
  claveSat: string;
  noIdentificacion: string;
  cantidad: number;
  claveUnidad: string;
  unidad: string;
  descripcion: string;
  valorUnitario: number;
}

interface ClientTemplate {
  name: string;
  rfc: string;
  razonSocial: string;
  regimenFiscal: string;
  codigoPostal: string;
  usoCfdi: string;
  tipo: "moral" | "fisica";
}

// Client templates for simulation
const CLIENT_TEMPLATES: ClientTemplate[] = [
  {
    name: "Corporativo Alfa S.A. de C.V. (Persona Moral)",
    rfc: "CAL090812AX1",
    razonSocial: "CORPORATIVO ALFA",
    regimenFiscal: "601 - General de Ley Personas Morales",
    codigoPostal: "06600",
    usoCfdi: "G03 - Gastos en general",
    tipo: "moral"
  },
  {
    name: "María Elena Gómez Pérez (Persona Física)",
    rfc: "GOPE850212TY2",
    razonSocial: "MARIA ELENA GOMEZ PEREZ",
    regimenFiscal: "605 - Sueldos y Salarios e Ingresos Asimilados a Salarios",
    codigoPostal: "72000",
    usoCfdi: "CP01 - Sin efectos fiscales",
    tipo: "fisica"
  }
];

const PRESET_PRODUCTS = [
  {
    claveSat: "48101600", // Vajilla (tazas)
    noIdentificacion: "PROM-TAZ-01",
    descripcion: "Taza de Cerámica Sublimada 11oz con logotipo a color",
    valorUnitario: 45.00,
    unidad: "Pieza",
    claveUnidad: "H87"
  },
  {
    claveSat: "53121600", // Mochilas/Maletas
    noIdentificacion: "PROM-MOC-05",
    descripcion: "Mochila Ejecutiva Porta-Laptop con Bordado de Marca",
    valorUnitario: 380.00,
    unidad: "Pieza",
    claveUnidad: "H87"
  },
  {
    claveSat: "82121500", // Servicios de impresión
    noIdentificacion: "SERV-IMP-SR",
    descripcion: "Servicio de Impresión en Serigrafía Textil a 2 tintas",
    valorUnitario: 25.00,
    unidad: "Servicio",
    claveUnidad: "E48"
  },
  {
    claveSat: "46181504", // Ropa de seguridad/playeras
    noIdentificacion: "PROM-PLY-02",
    descripcion: "Playera Tipo Polo 100% Algodón con Bordado Corporativo",
    valorUnitario: 165.00,
    unidad: "Pieza",
    claveUnidad: "H87"
  },
  {
    claveSat: "43211700", // Periféricos (memorias USB)
    noIdentificacion: "PROM-USB-08",
    descripcion: "Memoria USB Promocional de 16GB con Grabado Láser",
    valorUnitario: 85.00,
    unidad: "Pieza",
    claveUnidad: "H87"
  }
];

// Helper to convert numbers to spanish words (SAT CFDI requirement)
function numeroALetras(num: number): string {
  const Unidades = (n: number): string => {
    switch (n) {
      case 1: return "UN";
      case 2: return "DOS";
      case 3: return "TRES";
      case 4: return "CUATRO";
      case 5: return "CINCO";
      case 6: return "SEIS";
      case 7: return "SIETE";
      case 8: return "OCHO";
      case 9: return "NUEVE";
      default: return "";
    }
  };

  const Decenas = (n: number): string => {
    const de = Math.floor(n / 10);
    const un = n % 10;
    switch (de) {
      case 1:
        switch (un) {
          case 0: return "DIEZ";
          case 1: return "ONCE";
          case 2: return "DOCE";
          case 3: return "TRECE";
          case 4: return "CATORCE";
          case 5: return "QUINCE";
          default: return "DIECI" + Unidades(un);
        }
      case 2:
        if (un === 0) return "VEINTE";
        return "VEINTI" + Unidades(un);
      case 3: return "TREINTA" + (un > 0 ? " Y " + Unidades(un) : "");
      case 4: return "CUARENTA" + (un > 0 ? " Y " + Unidades(un) : "");
      case 5: return "CINCUENTA" + (un > 0 ? " Y " + Unidades(un) : "");
      case 6: return "SESENTA" + (un > 0 ? " Y " + Unidades(un) : "");
      case 7: return "SETENTA" + (un > 0 ? " Y " + Unidades(un) : "");
      case 8: return "OCHENTA" + (un > 0 ? " Y " + Unidades(un) : "");
      case 9: return "NOVENTA" + (un > 0 ? " Y " + Unidades(un) : "");
      default: return Unidades(n);
    }
  };

  const Centenas = (n: number): string => {
    const ce = Math.floor(n / 100);
    const de = n % 100;
    switch (ce) {
      case 1:
        if (de === 0) return "CIEN";
        return "CIENTO " + Decenas(de);
      case 2: return "DOSCIENTOS " + Decenas(de);
      case 3: return "TRESCIENTOS " + Decenas(de);
      case 4: return "CUATROCIENTOS " + Decenas(de);
      case 5: return "QUINIENTOS " + Decenas(de);
      case 6: return "SEISCIENTOS " + Decenas(de);
      case 7: return "SETECIENTOS " + Decenas(de);
      case 8: return "OCHOCIENTOS " + Decenas(de);
      case 9: return "NOVECIENTOS " + Decenas(de);
      default: return Decenas(n);
    }
  };

  const Miles = (n: number): string => {
    const divisor = 1000;
    const ciento = Math.floor(n / divisor);
    const resto = n % divisor;
    let letras = "";
    if (ciento > 0) {
      if (ciento === 1) {
        letras = "MIL";
      } else {
        letras = Centenas(ciento) + " MIL";
      }
    }
    if (resto > 0) {
      letras += (letras ? " " : "") + Centenas(resto);
    }
    return letras;
  };

  const Millones = (n: number): string => {
    const divisor = 1000000;
    const ciento = Math.floor(n / divisor);
    const resto = n % divisor;
    let letras = "";
    if (ciento > 0) {
      if (ciento === 1) {
        letras = "UN MILLON";
      } else {
        letras = Miles(ciento) + " MILLONES";
      }
    }
    if (resto > 0) {
      letras += (letras ? " " : "") + Miles(resto);
    }
    return letras;
  };

  const entero = Math.floor(num);
  const centavos = Math.round((num - entero) * 100);
  const centavosStr = centavos.toString().padStart(2, "0") + "/100 M.N.";

  if (entero === 0) return `CERO PESOS ${centavosStr}`;
  if (entero === 1) return `UN PESO ${centavosStr}`;

  return `${Millones(entero)} PESOS ${centavosStr}`;
}

interface AdminFacturacionProps {
  showBackButton?: boolean;
}

export function AdminFacturacion({ showBackButton = true }: AdminFacturacionProps) {
  const { customers } = useCRM();
  const { products } = useProducts();
  const { quotes } = useQuotes();

  // Issuer details (Gerardo Rodriguez Tiscareño)
  const emisor = {
    rfc: "ROTG730313B35",
    nombre: "GERARDO RODRIGUEZ TISCAREÑO",
    nombreComercial: "geekystore",
    regimenFiscalCode: "626",
    regimenFiscal: "626 - Régimen Simplificado de Confianza",
    curp: "ROTG730313HASDSR09",
    calle: "CAPUCHINAS",
    numExt: "427",
    colonia: "VILLA TERESA",
    codigoPostal: "20126",
    ciudad: "AGUASCALIENTES",
    estado: "AGUASCALIENTES",
    pais: "México"
  };

  // CFDI general details state
  const [serie, setSerie] = useState("A");
  const [folio, setFolio] = useState("1024");
  const [tipoComprobante, setTipoComprobante] = useState("I - Ingreso");
  const [moneda, setMoneda] = useState("MXN");
  const [metodoPago, setMetodoPago] = useState("PUE"); // Pago en una Sola Exhibición
  const [formaPago, setFormaPago] = useState("03"); // Transferencia electrónica
  const [exportacion, setExportacion] = useState("01"); // No aplica
  const [fechaExpedicion, setFechaExpedicion] = useState("");

  // UUID and certificates mock
  const [uuid] = useState("C16A548E-59BD-4781-B139-65A60F5F6BAE");
  const [certificadoEmisor] = useState("00001000000509876543");
  const [certificadoSat] = useState("00001000000504465028");
  const [rfcPac] = useState("SAT970701NN3");

  // Receiver state
  const [clientType, setClientType] = useState<"moral" | "fisica" | "custom">("moral");
  const [clientRfc, setClientRfc] = useState(CLIENT_TEMPLATES[0].rfc);
  const [clientRazonSocial, setClientRazonSocial] = useState(CLIENT_TEMPLATES[0].razonSocial);
  const [clientRegimen, setClientRegimen] = useState(CLIENT_TEMPLATES[0].regimenFiscal);
  const [clientCp, setClientCp] = useState(CLIENT_TEMPLATES[0].codigoPostal);
  const [clientUso, setClientUso] = useState(CLIENT_TEMPLATES[0].usoCfdi);

  // Items / Conceptos state
  const [items, setItems] = useState<InvoiceItem[]>([
    {
      id: "1",
      claveSat: "48101600",
      noIdentificacion: "PROM-TAZ-01",
      cantidad: 150,
      claveUnidad: "H87",
      unidad: "Pieza",
      descripcion: "Taza de Cerámica Sublimada 11oz con logotipo de marca a color",
      valorUnitario: 45.00
    },
    {
      id: "2",
      claveSat: "53121600",
      noIdentificacion: "PROM-MOC-05",
      cantidad: 40,
      claveUnidad: "H87",
      unidad: "Pieza",
      descripcion: "Mochila Ejecutiva Porta-Laptop con Bordado de Logotipo en frente",
      valorUnitario: 380.00
    },
    {
      id: "3",
      claveSat: "82121500",
      noIdentificacion: "SERV-IMP-SR",
      cantidad: 1,
      claveUnidad: "E48",
      unidad: "Servicio",
      descripcion: "Servicio de Impresión en Serigrafía Textil a 2 tintas en camisas",
      valorUnitario: 1200.00
    }
  ]);

  // Combine custom products from database and preset fallback products
  const availableProducts = useMemo(() => {
    if (products && products.length > 0) {
      return products.map(p => ({
        claveSat: p.category.toLowerCase().includes("tecnolo") ? "43211700" :
                  p.category.toLowerCase().includes("taza") || p.category.toLowerCase().includes("hogar") ? "48101600" :
                  p.category.toLowerCase().includes("escr") || p.category.toLowerCase().includes("ofic") ? "44121700" :
                  p.category.toLowerCase().includes("bolsa") || p.category.toLowerCase().includes("moch") ? "53121600" :
                  p.category.toLowerCase().includes("servic") || p.category.toLowerCase().includes("impres") ? "82121500" :
                  p.category.toLowerCase().includes("cuidado") || p.category.toLowerCase().includes("tocad") ? "49221500" : "80141605",
        noIdentificacion: p.sku || `PROM-${p.id.substring(0, 5).toUpperCase()}`,
        descripcion: p.name,
        valorUnitario: p.price,
        unidad: p.category.toLowerCase().includes("serv") ? "Servicio" : "Pieza",
        claveUnidad: p.category.toLowerCase().includes("serv") ? "E48" : "H87"
      }));
    }
    return PRESET_PRODUCTS;
  }, [products]);

  // Concept inputs state (for adding a new one)
  const [newItemProduct, setNewItemProduct] = useState(0);
  const [newItemCantidad, setNewItemCantidad] = useState(1);
  const [newItemPrecio, setNewItemPrecio] = useState(0);
  const [newItemDesc, setNewItemDesc] = useState("");
  const [newItemClaveSat, setNewItemClaveSat] = useState("48101600");
  const [newItemClaveUnidad, setNewItemClaveUnidad] = useState("H87");
  const [newItemUnidad, setNewItemUnidad] = useState("Pieza");

  // Sync date of emission on load
  useEffect(() => {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 19).replace('T', ' ');
    setFechaExpedicion(dateStr);
  }, []);

  // Real Facturapi states
  const [stampedInvoice, setStampedInvoice] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isCreatingNC, setIsCreatingNC] = useState(false);
  const [isCreatingREP, setIsCreatingREP] = useState(false);
  
  // Input fields for related operations
  const [ncAmount, setNcAmount] = useState("");
  const [ncDesc, setNcDesc] = useState("Descuento sobre factura original");
  const [repAmount, setRepAmount] = useState("");
  const [repForm, setRepForm] = useState("03");
  const [repInstallment, setRepInstallment] = useState("1");
  const [cancelMotive, setCancelMotive] = useState("02"); // SAT 02 - Comprobante emitido con errores sin relación
  const [cancelSubstitution, setCancelSubstitution] = useState("");
  
  // Feedback toast/message
  const [apiFeedback, setApiFeedback] = useState<{ text: string; type: "success" | "error" | "info" | "" }>({ text: "", type: "" });

  // Product Search State
  const [prodSearchQuery, setProdSearchQuery] = useState("");
  const [isProdDropdownOpen, setIsProdDropdownOpen] = useState(false);

  const filteredProducts = useMemo(() => {
    if (!prodSearchQuery) return availableProducts;
    const query = prodSearchQuery.toLowerCase();
    return availableProducts.filter(p => 
      p.noIdentificacion.toLowerCase().includes(query) ||
      p.descripcion.toLowerCase().includes(query)
    );
  }, [availableProducts, prodSearchQuery]);

  const handleEmitRealInvoice = async () => {
    setIsSubmitting(true);
    setApiFeedback({ text: "Conectando con el SAT y timbrando comprobante...", type: "info" });
    try {
      const payload = {
        client: {
          razonSocial: clientRazonSocial,
          name: clientRazonSocial,
          rfc: clientRfc,
          regimenFiscal: clientRegimen.split(" - ")[0], // Extract SAT code (e.g. 601)
          codigoPostal: clientCp,
          usoCfdi: clientUso.split(" - ")[0] // Extract SAT code (e.g. G03)
        },
        items: items.map(item => ({
          cantidad: item.cantidad,
          descripcion: item.descripcion,
          valorUnitario: item.valorUnitario,
          claveSat: item.claveSat,
          claveUnidad: item.claveUnidad
        })),
        payment_form: formaPago,
        payment_method: metodoPago,
        use: clientUso.split(" - ")[0]
      };

      const res = await fetch("/api/facturacion/crear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al emitir factura.");
      }

      setStampedInvoice(data.invoice);
      setApiFeedback({ text: "¡Factura CFDI 4.0 timbrada con éxito en Sandbox!", type: "success" });
    } catch (err: any) {
      console.error(err);
      setApiFeedback({ text: `Error al timbrar: ${err.message}`, type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCheckStatus = async () => {
    if (!stampedInvoice?.id) return;
    setApiFeedback({ text: "Consultando estatus en el SAT...", type: "info" });
    try {
      const res = await fetch(`/api/facturacion/estatus?id=${stampedInvoice.id}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al consultar estatus.");
      }
      setStampedInvoice(data.invoice);
      setApiFeedback({ text: `Estatus actual: ${data.invoice.status === 'valid' ? 'VIGENTE' : 'CANCELADO'}`, type: "success" });
    } catch (err: any) {
      setApiFeedback({ text: `Error de estatus: ${err.message}`, type: "error" });
    }
  };

  const handleCancelInvoice = async () => {
    if (!stampedInvoice?.id) return;
    if (!confirm("¿Estás seguro de que deseas solicitar la cancelación de esta factura ante el SAT?")) return;
    setIsCancelling(true);
    setApiFeedback({ text: "Enviando solicitud de cancelación al SAT...", type: "info" });
    try {
      const res = await fetch("/api/facturacion/cancelar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: stampedInvoice.id,
          motive: cancelMotive,
          substitution: cancelSubstitution || undefined
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al cancelar factura.");
      }
      setStampedInvoice(data.invoice);
      setApiFeedback({ text: "¡Solicitud de cancelación aceptada y procesada ante el SAT!", type: "success" });
    } catch (err: any) {
      setApiFeedback({ text: `Error al cancelar: ${err.message}`, type: "error" });
    } finally {
      setIsCancelling(false);
    }
  };

  const handleCreateCreditNote = async () => {
    if (!stampedInvoice?.id) return;
    if (!ncAmount || Number(ncAmount) <= 0) {
      alert("Por favor ingresa un monto válido para la nota de crédito.");
      return;
    }
    setIsCreatingNC(true);
    setApiFeedback({ text: "Emitiendo Nota de Crédito (Egreso) relacionada...", type: "info" });
    try {
      const res = await fetch("/api/facturacion/nota-credito", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          original_invoice_id: stampedInvoice.id,
          amount: ncAmount,
          description: ncDesc
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al emitir nota de crédito.");
      }
      setApiFeedback({ text: `¡Nota de Crédito emitida con éxito! Folio SAT: ${data.invoice.uuid}`, type: "success" });
      setNcAmount("");
    } catch (err: any) {
      setApiFeedback({ text: `Error en Nota de Crédito: ${err.message}`, type: "error" });
    } finally {
      setIsCreatingNC(false);
    }
  };

  const handleCreatePaymentComplement = async () => {
    if (!stampedInvoice?.id) return;
    if (!repAmount || Number(repAmount) <= 0) {
      alert("Por favor ingresa un monto de pago válido.");
      return;
    }
    setIsCreatingREP(true);
    setApiFeedback({ text: "Emitiendo Complemento para Recepción de Pagos (REP)...", type: "info" });
    try {
      const res = await fetch("/api/facturacion/complemento", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          original_invoice_id: stampedInvoice.id,
          payment_form: repForm,
          amount: repAmount,
          installment_number: repInstallment
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al emitir complemento de pago.");
      }
      setApiFeedback({ text: `¡Complemento de Pago timbrado con éxito! Folio SAT: ${data.invoice.uuid}`, type: "success" });
      setRepAmount("");
    } catch (err: any) {
      setApiFeedback({ text: `Error en Complemento de Pago: ${err.message}`, type: "error" });
    } finally {
      setIsCreatingREP(false);
    }
  };

  // Update receiver fields when template changes
  const handleClientTemplateChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === "custom") {
      setClientType("custom");
    } else if (val.startsWith("tpl_")) {
      const idx = parseInt(val.replace("tpl_", ""));
      const tpl = CLIENT_TEMPLATES[idx];
      setClientType(tpl.tipo);
      setClientRfc(tpl.rfc);
      setClientRazonSocial(tpl.razonSocial);
      setClientRegimen(tpl.regimenFiscal);
      setClientCp(tpl.codigoPostal);
      setClientUso(tpl.usoCfdi);
    } else {
      const customer = customers.find(c => c.id === val);
      if (customer) {
        setClientRazonSocial(customer.business_name.toUpperCase());
        const rfc = customer.rfc || "";
        setClientRfc(rfc.toUpperCase());
        const type = rfc.length === 12 ? "moral" : "fisica";
        setClientType(type);
        if (type === "moral") {
          setClientRegimen("601 - General de Ley Personas Morales");
          setClientUso("G03 - Gastos en general");
        } else {
          setClientRegimen("625 - Régimen Simplificado de Confianza");
          setClientUso("CP01 - Sin efectos fiscales");
        }
        try {
          const { data: addrs, error } = await supabase
            .from("customer_addresses")
            .select("*")
            .eq("customer_id", customer.id);
          
          if (!error && addrs && addrs.length > 0) {
            const defAddr = addrs.find(a => a.is_default) || addrs[0];
            if (defAddr && defAddr.postal_code) {
              setClientCp(defAddr.postal_code);
            }
          }
        } catch (err) {
          console.error("Error fetching customer address:", err);
        }
      }
    }
  };

  const handleSelectProduct = (idx: number) => {
    setNewItemProduct(idx);
    const prod = availableProducts[idx];
    if (prod) {
      setNewItemPrecio(prod.valorUnitario);
      setNewItemDesc(prod.descripcion);
      setNewItemClaveSat(prod.claveSat);
      setNewItemClaveUnidad(prod.claveUnidad);
      setNewItemUnidad(prod.unidad);
    }
  };

  const handleImportQuote = async (quoteId: string) => {
    if (!quoteId) return;
    const quote = quotes.find(q => q.id === quoteId);
    if (!quote || !quote.client) return;

    setApiFeedback({ text: `Cargando datos de la cotización comercial...`, type: "info" });

    // 1. Relate the client
    const clientName = quote.client.company || quote.client.name || "";
    const clientEmail = quote.client.email || "";
    
    let matchedCustomer = customers.find(c => 
      (c.commercial_name && c.commercial_name.toLowerCase() === clientName.toLowerCase()) ||
      (c.business_name && c.business_name.toLowerCase() === clientName.toLowerCase()) ||
      ((c as any).primary_contact_email && (c as any).primary_contact_email.toLowerCase() === clientEmail.toLowerCase())
    );

    if (matchedCustomer) {
      setClientRazonSocial(matchedCustomer.business_name.toUpperCase());
      const rfc = matchedCustomer.rfc || "";
      setClientRfc(rfc.toUpperCase());
      const type = rfc.length === 12 ? "moral" : "fisica";
      setClientType(type);
      if (type === "moral") {
        setClientRegimen("601 - General de Ley Personas Morales");
        setClientUso("G03 - Gastos en general");
      } else {
        setClientRegimen("625 - Régimen Simplificado de Confianza");
        setClientUso("CP01 - Sin efectos fiscales");
      }
      
      // Load address
      try {
        const { data: addrs, error } = await supabase
          .from("customer_addresses")
          .select("*")
          .eq("customer_id", matchedCustomer.id);
        
        if (!error && addrs && addrs.length > 0) {
          const defAddr = addrs.find(a => a.is_default) || addrs[0];
          if (defAddr && defAddr.postal_code) {
            setClientCp(defAddr.postal_code);
          }
        }
      } catch (err) {
        console.error("Error fetching customer address for quote import:", err);
      }
    } else {
      // Fallback: Copy raw quote details directly
      setClientRazonSocial(clientName.toUpperCase());
      setClientRfc("XAXX010101000"); // SAT generic public RFC
      setClientCp(quote.client.zip || "01000");
      setClientType("fisica");
      setClientRegimen("625 - Régimen Simplificado de Confianza");
      setClientUso("CP01 - Sin efectos fiscales");
    }

    // 2. Map items
    const quoteItems = quote.items && Array.isArray(quote.items) ? quote.items : [];
    const mappedItems = quoteItems.map((ci, index) => {
      const matchedProd = availableProducts.find(ap => 
        ap.noIdentificacion.toLowerCase() === ci.sku.toLowerCase() ||
        ap.descripcion.toLowerCase() === ci.productName.toLowerCase()
      );
      
      return {
        id: String(index + 1),
        claveSat: matchedProd?.claveSat || "84111506",
        noIdentificacion: ci.sku || `PROM-${ci.id.substring(0, 5).toUpperCase()}`,
        cantidad: ci.quantity,
        claveUnidad: matchedProd?.claveUnidad || "H87",
        unidad: matchedProd?.unidad || "Pieza",
        descripcion: ci.productName,
        valorUnitario: ci.unitPrice
      };
    });

    setItems(mappedItems);
    setApiFeedback({ text: `Cotización de ${clientName} cargada con éxito en el simulador.`, type: "success" });
  };

  // Preset product select change handler
  const handlePresetSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const idx = parseInt(e.target.value);
    setNewItemProduct(idx);
    const prod = availableProducts[idx];
    if (prod) {
      setNewItemPrecio(prod.valorUnitario);
      setNewItemDesc(prod.descripcion);
      setNewItemClaveSat(prod.claveSat);
      setNewItemClaveUnidad(prod.claveUnidad);
      setNewItemUnidad(prod.unidad);
    }
  };

  // Set initial preset values
  useEffect(() => {
    const prod = availableProducts[0];
    if (prod) {
      setNewItemPrecio(prod.valorUnitario);
      setNewItemDesc(prod.descripcion);
      setNewItemClaveSat(prod.claveSat);
      setNewItemClaveUnidad(prod.claveUnidad);
      setNewItemUnidad(prod.unidad);
      setProdSearchQuery(`${prod.noIdentificacion} - ${prod.descripcion}`);
    }
  }, [availableProducts]);

  // Add Item to concepts
  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemDesc || newItemCantidad <= 0 || newItemPrecio <= 0) return;

    const prod = availableProducts[newItemProduct];
    const item: InvoiceItem = {
      id: Math.random().toString(36).substring(2, 9),
      claveSat: newItemClaveSat || (prod ? prod.claveSat : "48101600"),
      noIdentificacion: prod ? prod.noIdentificacion : "PROM-GEN-01",
      cantidad: newItemCantidad,
      claveUnidad: newItemClaveUnidad || (prod ? prod.claveUnidad : "H87"),
      unidad: newItemUnidad || (prod ? prod.unidad : "Pieza"),
      descripcion: newItemDesc,
      valorUnitario: newItemPrecio
    };

    setItems([...items, item]);
    setNewItemCantidad(1);
    const resetProd = availableProducts[newItemProduct];
    if (resetProd) {
      setNewItemPrecio(resetProd.valorUnitario);
      setNewItemDesc(resetProd.descripcion);
      setNewItemClaveSat(resetProd.claveSat);
      setNewItemClaveUnidad(resetProd.claveUnidad);
      setNewItemUnidad(resetProd.unidad);
    }
  };

  // Remove Item
  const handleRemoveItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  // Calculations
  const calculations = useMemo(() => {
    const subtotal = items.reduce((acc, item) => acc + (item.cantidad * item.valorUnitario), 0);
    const iva = subtotal * 0.16;
    const isMoral = clientType === "moral" || (clientType === "custom" && clientRfc.length === 12);
    const isrRetention = isMoral ? subtotal * 0.0125 : 0;
    const total = subtotal + iva - isrRetention;

    return {
      subtotal,
      iva,
      isrRetention,
      total,
      hasRetention: isrRetention > 0
    };
  }, [items, clientType, clientRfc]);

  // Generate XML CFDI 4.0 representation
  const generateXml = () => {
    const now = new Date();
    const dateIso = now.toISOString().slice(0, 19);

    const esc = (str: string) => str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    let conceptsXml = "";
    items.forEach(item => {
      const itemImport = (item.cantidad * item.valorUnitario).toFixed(2);
      const itemIva = (parseFloat(itemImport) * 0.16).toFixed(2);
      const itemIsr = (parseFloat(itemImport) * 0.0125).toFixed(2);

      conceptsXml += `
    <cfdi:Concepto ClaveProdServ="${item.claveSat}" NoIdentificacion="${item.noIdentificacion}" Cantidad="${item.cantidad.toFixed(2)}" ClaveUnidad="${item.claveUnidad}" Unidad="${item.unidad}" Descripcion="${esc(item.descripcion)}" ValorUnitario="${item.valorUnitario.toFixed(2)}" Importe="${itemImport}" ObjetoImp="02">
      <cfdi:Impuestos>
        <cfdi:Traslados>
          <cfdi:Traslado Base="${itemImport}" Impuesto="002" TipoFactor="Tasa" TasaOCuota="0.160000" Importe="${itemIva}"/>
        </cfdi:Traslados>${calculations.hasRetention ? `
        <cfdi:Retenciones>
          <cfdi:Retencion Base="${itemImport}" Impuesto="001" TipoFactor="Tasa" TasaOCuota="0.012500" Importe="${itemIsr}"/>
        </cfdi:Retenciones>` : ''}
      </cfdi:Impuestos>
    </cfdi:Concepto>`;
    });

    const subtotalStr = calculations.subtotal.toFixed(2);
    const ivaStr = calculations.iva.toFixed(2);
    const isrStr = calculations.isrRetention.toFixed(2);
    const totalStr = calculations.total.toFixed(2);

    const xml = `<?xml version="1.0" encoding="utf-8"?>
<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.sat.gob.mx/cfd/4 http://www.sat.gob.mx/sitio_internet/cfd/4/cfdv40.xsd" Version="4.0" Serie="${serie}" Folio="${folio}" Fecha="${dateIso}" Sello="MOCK_SELLO_DIGITAL_EMISOR_BASE64_CON_LLAVE_PRIVADA..." FormaPago="${formaPago}" NoCertificado="${certificadoEmisor}" Certificado="MOCK_CERTIFICADO_EMISOR_PEM..." SubTotal="${subtotalStr}" Moneda="${moneda}" Total="${totalStr}" TipoDeComprobante="I" Exportacion="${exportacion}" MetodoPago="${metodoPago}" LugarExpedicion="${emisor.codigoPostal}">
  <cfdi:Emisor Rfc="${emisor.rfc}" Nombre="${esc(emisor.nombre)}" RegimenFiscal="${emisor.regimenFiscalCode}"/>
  <cfdi:Receptor Rfc="${clientRfc}" Nombre="${esc(clientRazonSocial)}" DomicilioFiscalReceptor="${clientCp}" RegimenFiscalReceptor="${clientRegimen.substring(0, 3)}" UsoCFDI="${clientUso.substring(0, 3)}"/>
  <cfdi:Conceptos>${conceptsXml}
  </cfdi:Conceptos>
  <cfdi:Impuestos TotalImpuestosTrasladados="${ivaStr}"${calculations.hasRetention ? ` TotalImpuestosRetenidos="${isrStr}"` : ''}>${calculations.hasRetention ? `
    <cfdi:Retenciones>
      <cfdi:Retencion Impuesto="001" Importe="${isrStr}"/>
    </cfdi:Retenciones>` : ''}
    <cfdi:Traslados>
      <cfdi:Traslado Base="${subtotalStr}" Impuesto="002" TipoFactor="Tasa" TasaOCuota="0.160000" Importe="${ivaStr}"/>
    </cfdi:Traslados>
  </cfdi:Impuestos>
  <cfdi:Complemento>
    <tfd:TimbreFiscalDigital xmlns:tfd="http://www.sat.gob.mx/TimbreFiscalDigital" xsi:schemaLocation="http://www.sat.gob.mx/TimbreFiscalDigital http://www.sat.gob.mx/sitio_internet/cfd/TimbreFiscalDigital/TimbreFiscalDigitalv11.xsd" Version="1.1" UUID="${uuid}" FechaTimbrado="${dateIso}" RfcProvCertif="${rfcPac}" SelloCFD="MOCK_SELLO_CFD_FIRMA..." NoCertificadoSAT="${certificadoSat}" SelloSAT="MOCK_SELLO_SAT_FIRMA..."/>
  </cfdi:Complemento>
</cfdi:Comprobante>`;

    return xml;
  };

  // Helper to trigger server-side echo download to bypass iframe sandbox restrictions
  const downloadViaServer = (content: string, filename: string, mimeType: string, isBase64: boolean) => {
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = '/api/download-file';
    form.style.display = 'none';

    const inputContent = document.createElement('input');
    inputContent.type = 'hidden';
    inputContent.name = 'content';
    inputContent.value = content;
    form.appendChild(inputContent);

    const inputFilename = document.createElement('input');
    inputFilename.type = 'hidden';
    inputFilename.name = 'filename';
    inputFilename.value = filename;
    form.appendChild(inputFilename);

    const inputMime = document.createElement('input');
    inputMime.type = 'hidden';
    inputMime.name = 'mimeType';
    inputMime.value = mimeType;
    form.appendChild(inputMime);

    const inputBase64 = document.createElement('input');
    inputBase64.type = 'hidden';
    inputBase64.name = 'isBase64';
    inputBase64.value = isBase64 ? 'true' : 'false';
    form.appendChild(inputBase64);

    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);
  };

  // Download XML file
  const downloadXml = () => {
    const xmlContent = generateXml();
    downloadViaServer(xmlContent, `Factura_${serie}-${folio}.xml`, 'text/xml', false);
  };

  // Generates the PDF document instance
  const buildPdfInstance = () => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "letter"
    });

    const now = new Date();
    const dateStr = now.toLocaleString("es-MX");

    const primaryColor = [0, 68, 64]; 
    const secondaryColor = [85, 85, 85]; 
    const lightGray = [245, 245, 245];
    const borderGray = [220, 220, 220];

    // Logo (Circle icon with white coding brackets </>)
    doc.setFillColor(0, 179, 169); 
    doc.circle(14, 14, 4, 'F');
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.4);
    // Left bracket <
    doc.line(12.5, 12.5, 11.5, 14.0);
    doc.line(11.5, 14.0, 12.5, 15.5);
    // Middle slash /
    doc.line(13.5, 15.7, 14.5, 12.3);
    // Right bracket >
    doc.line(15.5, 12.5, 16.5, 14.0);
    doc.line(16.5, 14.0, 15.5, 15.5);

    doc.setTextColor(0, 68, 64);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("geekystore", 20, 16);

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text("Artículos Promocionales y Servicios de Impresión", 20, 20);

    // SAT / CFDI 4.0 title
    doc.setFillColor(240, 240, 240);
    doc.rect(125, 10, 75, 12, 'F');
    doc.setDrawColor(200, 200, 200);
    doc.rect(125, 10, 75, 12, 'S');

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(0, 68, 64);
    doc.text("FACTURA DIGITAL CFDI 4.0", 132, 15);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    doc.text(`Serie ${serie} - Folio ${folio}`, 148, 19);

    // --- Issuer & CFDI metadata (Columns) ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(0, 68, 64);
    doc.text("EMISOR", 10, 28);
    doc.line(10, 29, 100, 29);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(50, 50, 50);
    doc.setFont("helvetica", "bold");
    doc.text(emisor.nombre, 10, 33);
    doc.setFont("helvetica", "normal");
    doc.text(`RFC: ${emisor.rfc}`, 10, 37);
    doc.text(`Régimen: ${emisor.regimenFiscal}`, 10, 41);
    doc.text(`CURP: ${emisor.curp}`, 10, 45);
    doc.text(`Domicilio: ${emisor.calle} ${emisor.numExt}, Col. ${emisor.colonia}`, 10, 49);
    doc.text(`CP: ${emisor.codigoPostal}, ${emisor.ciudad}, ${emisor.estado}`, 10, 53);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 68, 64);
    doc.text("DATOS COMPROBANTE", 110, 28);
    doc.line(110, 29, 200, 29);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(50, 50, 50);
    doc.text(`Folio Fiscal (UUID): ${uuid}`, 110, 33);
    doc.text(`No. Certificado Emisor: ${certificadoEmisor}`, 110, 37);
    doc.text(`Lugar y Fecha Expedición: ${emisor.codigoPostal} a ${dateStr}`, 110, 41);
    doc.text(`Tipo de Comprobante: ${tipoComprobante}`, 110, 45);
    doc.text(`Método de Pago: ${metodoPago} - Pago en una sola exhibición`, 110, 49);
    doc.text(`Forma de Pago: ${formaPago} - Transferencia electrónica`, 110, 53);

    // --- Receptor Box ---
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 68, 64);
    doc.text("RECEPTOR", 10, 60);
    doc.line(10, 61, 200, 61);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(50, 50, 50);
    doc.setFont("helvetica", "bold");
    doc.text(clientRazonSocial, 10, 65);
    doc.setFont("helvetica", "normal");
    doc.text(`RFC: ${clientRfc} | CP Receptor: ${clientCp}`, 10, 69);
    doc.text(`Régimen Fiscal: ${clientRegimen}`, 10, 73);
    doc.text(`Uso CFDI: ${clientUso} | Moneda: ${moneda} - Peso Mexicano`, 10, 77);

    // --- Conceptos Table ---
    const tableBody = items.map(item => [
      item.claveSat,
      item.noIdentificacion,
      item.cantidad.toFixed(2),
      item.claveUnidad,
      item.unidad,
      item.descripcion,
      `$${item.valorUnitario.toFixed(2)}`,
      `$${(item.cantidad * item.valorUnitario).toFixed(2)}`
    ]);

    autoTable(doc, {
      startY: 82,
      head: [["Clave SAT", "No. Ident", "Cant.", "Clave U.", "Unidad", "Descripción", "P. Unitario", "Importe"]],
      body: tableBody,
      theme: "grid",
      headStyles: {
        fillColor: primaryColor as [number, number, number],
        textColor: [255, 255, 255],
        fontSize: 7.5,
        halign: "center",
        valign: "middle"
      },
      styles: {
        fontSize: 7.5,
        textColor: [40, 40, 40],
        cellPadding: 2
      },
      columnStyles: {
        0: { cellWidth: 15, halign: "center" },
        1: { cellWidth: 18, halign: "center" },
        2: { cellWidth: 10, halign: "center" },
        3: { cellWidth: 12, halign: "center" },
        4: { cellWidth: 12, halign: "center" },
        5: { cellWidth: 78 },
        6: { cellWidth: 18, halign: "right" },
        7: { cellWidth: 18, halign: "right" }
      }
    });

    const finalY = ((doc as any).lastAutoTable?.finalY || 82) + 6;

    // --- Subtotal & Totals Box ---
    const leftMargin = 120;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(50, 50, 50);

    doc.text("Subtotal:", leftMargin, finalY);
    doc.setFont("helvetica", "bold");
    doc.text(`$${calculations.subtotal.toFixed(2)}`, 200, finalY, { align: "right" });

    doc.setFont("helvetica", "normal");
    const ivaY = finalY + 4;
    doc.text("IVA Trasladado (16.00%):", leftMargin, ivaY);
    doc.text(`$${calculations.iva.toFixed(2)}`, 200, ivaY, { align: "right" });

    let currentY = ivaY;

    if (calculations.hasRetention) {
      currentY += 4;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(150, 20, 20);
      doc.text("ISR Retenido (1.25% RESICO):", leftMargin, currentY);
      doc.text(`-$${calculations.isrRetention.toFixed(2)}`, 200, currentY, { align: "right" });
    }

    currentY += 5;
    doc.setDrawColor(200, 200, 200);
    doc.line(leftMargin, currentY - 3, 200, currentY - 3);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 68, 64);
    doc.setFontSize(10);
    doc.text("TOTAL:", leftMargin, currentY);
    doc.text(`$${calculations.total.toFixed(2)}`, 200, currentY, { align: "right" });

    // Amount in words
    const amountInLetters = numeroALetras(calculations.total);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7.5);
    doc.setTextColor(80, 80, 80);
    doc.text(`Importe con Letra: ${amountInLetters}`, 10, finalY);

    // --- Digital Seal Complement / Stamps Section ---
    const stampsY = currentY + 12;
    
    // Mock QR Code box
    doc.setFillColor(250, 250, 250);
    doc.rect(10, stampsY, 30, 30, 'F');
    doc.setDrawColor(200, 200, 200);
    doc.rect(10, stampsY, 30, 30, 'S');
    // Draw visual mock lines in QR
    doc.setFillColor(80, 80, 80);
    doc.rect(12, stampsY + 2, 7, 7, 'F');
    doc.rect(31, stampsY + 2, 7, 7, 'F');
    doc.rect(12, stampsY + 21, 7, 7, 'F');
    doc.rect(20, stampsY + 10, 10, 10, 'F');

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(0, 68, 64);
    
    // Stamp labels and content
    doc.text("RFC Proveedor de Certificación: " + rfcPac, 45, stampsY + 3);
    doc.text("No. Certificado SAT: " + certificadoSat, 45, stampsY + 7);
    
    doc.setFont("helvetica", "bold");
    doc.text("Cadena Original del Complemento de Certificación Digital del SAT", 45, stampsY + 12);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    const cadenaMock = `||1.1|${uuid}|${dateStr.replace(", ", "T")}|${rfcPac}|M1ReE+u4qc75j6dqYj64UYH9pfJQov3v+yeXgb/PzsGb/LEJ0Ufgow86INh6ikN8fecLDLjlpgvkxqsHY6jUU6qtWDvce7mEBsCwzniEm3/4W55bunjlBuwlMCKkiz/smgsbUeJHSmDXf1wqSscBWqJ5EpH9n18x9UY7ftgdHtl=|00001000000504465028||`;
    doc.text(doc.splitTextToSize(cadenaMock, 150), 45, stampsY + 15);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 68, 64);
    doc.text("Sello Digital del Emisor", 45, stampsY + 22);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    const selloEmisorMock = "M1ReE+u4qc75j6dqYj64UYH9pfJQov3v+yeXgb/PzsGb/LEJ0Ufgow86INh6ikN8fecLDLjlpgvkxqsHY6jUU6qtWDvce7mEBsCwzniEm3/4W55bunjlBuwlMCKkiz/smgsbUeJHSmDXf1wqSscBWqJ5EpH9n18x9UY7ftgdHtl=";
    doc.text(doc.splitTextToSize(selloEmisorMock, 150), 45, stampsY + 25);

    // Disclaimer footer
    doc.setFont("helvetica", "italic");
    doc.setFontSize(6.5);
    doc.setTextColor(120, 120, 120);
    doc.text("Este documento es una representación impresa de un CFDI v4.0 simulado y cumple exclusivamente fines educativos e informativos.", 10, stampsY + 36);

    return doc;
  };

  // Download PDF file using jsPDF and jspdf-autotable
  const downloadPdf = () => {
    const doc = buildPdfInstance();
    const pdfBase64 = doc.output('datauristring');
    downloadViaServer(pdfBase64, `Factura_${serie}-${folio}.pdf`, 'application/pdf', true);
  };

  // Open PDF in a new tab using iframe to bypass sandbox preview restrictions
  const viewPdfInNewTab = () => {
    const doc = buildPdfInstance();
    const pdfBase64 = doc.output('datauristring');
    const pdfWindow = window.open("", "_blank");
    if (pdfWindow) {
      pdfWindow.document.write(
        `<html>
          <head>
            <title>Factura Digital CFDI 4.0 - geekystore</title>
            <style>body { margin: 0; padding: 0; background: #525659; }</style>
          </head>
          <body>
            <iframe width="100%" height="100%" style="border: none;" src="${pdfBase64}"></iframe>
          </body>
        </html>`
      );
    } else {
      alert("El navegador bloqueó la apertura de la nueva pestaña. Por favor, permite las ventanas emergentes (popups) para ver el PDF.");
    }
  };

  return (
    <div className="w-full text-gray-800">
      {/* Navigation Breadcrumb & Hero - only show if standalone */}
      {showBackButton && (
        <>
          <div className="mb-8 flex items-center justify-between">
            <Link href="/" className="inline-flex items-center text-sm font-medium text-primary-600 hover:text-primary-800 transition-colors">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver a la tienda
            </Link>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Simulador SAT Activo (Leyes 2026)
            </span>
          </div>

          <div className="bg-gradient-to-r from-primary-900 to-primary-700 text-white rounded-2xl p-6 sm:p-10 shadow-lg mb-10 relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
            <div className="relative z-10 max-w-3xl">
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-2">
                Formato de Factura CFDI 4.0
              </h1>
              <p className="text-primary-100 text-lg mb-4">
                Simulador interactivo para <strong>geekystore</strong>. Configura clientes, conceptos promocionales y descarga la factura oficial emitida en formatos PDF y XML.
              </p>
              <div className="flex flex-wrap gap-4 text-xs font-semibold text-primary-200">
                <span className="bg-primary-800/60 px-3 py-1 rounded-lg border border-primary-600">RFC: {emisor.rfc}</span>
                <span className="bg-primary-800/60 px-3 py-1 rounded-lg border border-primary-600">Regimen: 626 - RESICO</span>
                <span className="bg-primary-800/60 px-3 py-1 rounded-lg border border-primary-600">Lugar Exp: CP 20126</span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Main Grid: Inputs (Left) and CFDI Preview (Right) */}
      {/* API Feedback Notification */}
      {apiFeedback.text && (
        <div className={`mb-6 p-4 rounded-xl border flex items-center justify-between transition-all duration-300 ${
          apiFeedback.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
          apiFeedback.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
          'bg-blue-50 border-blue-200 text-blue-800'
        }`}>
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <span className="text-xs sm:text-sm font-semibold">{apiFeedback.text}</span>
          </div>
          <button 
            onClick={() => setApiFeedback({ text: "", type: "" })} 
            className="text-xs font-bold hover:underline ml-2"
          >
            Cerrar
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Simulator Form Control (5 Columns) */}
        <div className="lg:col-span-5 space-y-8">
          
          {/* Emisor Info Panel (Read-only verification) */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Settings className="w-5 h-5 text-primary-600" />
              <h2 className="text-lg font-bold text-gray-900">Datos del Emisor (Oficial)</h2>
            </div>
            <div className="text-sm space-y-3 bg-gray-50 p-4 rounded-lg border border-gray-100">
              <div>
                <label className="text-xs text-gray-400 block font-semibold">Razón Social</label>
                <span className="font-semibold text-gray-800 text-xs sm:text-sm">{emisor.nombre}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-400 block font-semibold">RFC</label>
                  <span className="font-mono text-gray-800 text-xs sm:text-sm">{emisor.rfc}</span>
                </div>
                <div>
                  <label className="text-xs text-gray-400 block font-semibold">CURP</label>
                  <span className="font-mono text-gray-800 text-xs">{emisor.curp}</span>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 block font-semibold">Régimen Fiscal</label>
                <span className="text-gray-800 text-xs">{emisor.regimenFiscal}</span>
              </div>
              <div>
                <label className="text-xs text-gray-400 block font-semibold">Domicilio Fiscal</label>
                <span className="text-gray-800 text-xs">{emisor.calle} #{emisor.numExt}, Col. {emisor.colonia}, CP {emisor.codigoPostal}, Aguascalientes, Ags.</span>
              </div>
            </div>
          </div>

          {/* Client Select & Receiver Configuration */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <User className="w-5 h-5 text-primary-600" />
              <h2 className="text-lg font-bold text-gray-900">Datos del Receptor (Cliente)</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-1">Cargar desde Cotización Comercial</label>
                <select 
                  onChange={(e) => handleImportQuote(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none bg-white font-semibold text-gray-700"
                  defaultValue=""
                >
                  <option value="">-- Vincular con Cotización --</option>
                  {quotes && quotes.map((q) => {
                    if (!q || !q.client) return null;
                    const clientLabel = q.client.company || q.client.name || 'Cliente sin nombre';
                    const formattedTotal = typeof q.total === 'number' ? q.total.toLocaleString() : '0';
                    const dateLabel = q.date ? new Date(q.date).toLocaleDateString() : '';
                    return (
                      <option key={q.id} value={q.id}>
                        {clientLabel} - ${formattedTotal} {dateLabel ? `(${dateLabel})` : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-1">Cargar Cliente / Receptor</label>
                <select 
                  onChange={handleClientTemplateChange}
                  className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none"
                >
                  <option value="custom">-- Seleccionar o ingresar manual --</option>
                  {customers.length > 0 && (
                    <optgroup label="Clientes del CRM">
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.commercial_name ? `${c.commercial_name} (${c.business_name})` : c.business_name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  <optgroup label="Plantillas de Ejemplo">
                    {CLIENT_TEMPLATES.map((t, idx) => (
                      <option key={`tpl_${idx}`} value={`tpl_${idx}`}>{t.name}</option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div className="border-t border-gray-100 pt-4 space-y-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Razón Social del Cliente</label>
                  <input 
                    type="text" 
                    value={clientRazonSocial}
                    onChange={(e) => {
                      setClientRazonSocial(e.target.value.toUpperCase());
                      if (clientType !== "custom") setClientType("custom");
                    }}
                    className="w-full rounded-lg border border-gray-300 p-2 text-xs font-semibold focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none"
                    placeholder="NOMBRE DE LA EMPRESA O CLIENTE"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1">RFC Cliente</label>
                    <input 
                      type="text" 
                      value={clientRfc}
                      maxLength={13}
                      onChange={(e) => {
                        const val = e.target.value.toUpperCase();
                        setClientRfc(val);
                        if (clientType !== "custom") setClientType("custom");
                      }}
                      className="w-full rounded-lg border border-gray-300 p-2 text-xs font-mono focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none"
                      placeholder="RFC123456XX0"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1">C.P. Receptor</label>
                    <input 
                      type="text" 
                      value={clientCp}
                      maxLength={5}
                      onChange={(e) => {
                        setClientCp(e.target.value);
                        if (clientType !== "custom") setClientType("custom");
                      }}
                      className="w-full rounded-lg border border-gray-300 p-2 text-xs font-mono focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none"
                      placeholder="00000"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1">Régimen Fiscal</label>
                    <select 
                      value={clientRegimen}
                      onChange={(e) => {
                        setClientRegimen(e.target.value);
                        if (clientType !== "custom") setClientType("custom");
                      }}
                      className="w-full rounded-lg border border-gray-300 p-2 text-xs focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none"
                    >
                      <option value="601 - General de Ley Personas Morales">601 - General Morales</option>
                      <option value="605 - Sueldos y Salarios e Ingresos Asimilados">605 - Sueldos y Salarios</option>
                      <option value="626 - Régimen Simplificado de Confianza">626 - RESICO</option>
                      <option value="603 - Personas Morales con Fines no Lucrativos">603 - Personas Morales No Lucrativas</option>
                      <option value="612 - Personas Físicas con Actividades Empresariales">612 - Act. Empresariales Físicas</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1">Uso de CFDI</label>
                    <select 
                      value={clientUso}
                      onChange={(e) => {
                        setClientUso(e.target.value);
                        if (clientType !== "custom") setClientType("custom");
                      }}
                      className="w-full rounded-lg border border-gray-300 p-2 text-xs focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none"
                    >
                      <option value="G03 - Gastos en general">G03 - Gastos en general</option>
                      <option value="CP01 - Sin efectos fiscales">CP01 - Sin efectos fiscales</option>
                      <option value="I08 - Devoluciones, descuentos o bonificaciones">I08 - Descuentos/Devoluciones</option>
                      <option value="S01 - Sin efectos fiscales (Obsoleto)">S01 - Sin efectos fiscales</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* RESICO Tax Rules Info Box */}
              <div className={`p-4 rounded-lg border flex gap-3 text-xs ${
                calculations.hasRetention 
                  ? "bg-amber-50 border-amber-200 text-amber-900" 
                  : "bg-blue-50 border-blue-200 text-blue-900"
              }`}>
                {calculations.hasRetention ? (
                  <>
                    <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                    <div>
                      <p className="font-bold">Aplica Retención de ISR (1.25%)</p>
                      <p className="mt-1">
                        Debido a que el receptor es una <strong>Persona Moral</strong> y el emisor tributa en <strong>RESICO</strong>, se aplica de forma obligatoria la retención de 1.25% de ISR sobre el subtotal de conformidad con la ley del SAT (Art 113-J).
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <Info className="w-5 h-5 text-blue-600 flex-shrink-0" />
                    <div>
                      <p className="font-bold">Sin Retención de ISR</p>
                      <p className="mt-1">
                        El cliente seleccionado es una <strong>Persona Física</strong>. Las retenciones de ISR no aplican para personas físicas en operaciones con emisores RESICO.
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Add Concept Form */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Plus className="w-5 h-5 text-primary-600" />
              <h2 className="text-lg font-bold text-gray-900">Agregar Concepto (Promocionales)</h2>
            </div>
            
            <form onSubmit={handleAddItem} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">Seleccionar Producto del Catálogo (Autocompletado)</label>
                <div className="relative">
                  <input
                    type="text"
                    value={prodSearchQuery}
                    onChange={(e) => {
                      setProdSearchQuery(e.target.value);
                      setIsProdDropdownOpen(true);
                    }}
                    onFocus={() => setIsProdDropdownOpen(true)}
                    onBlur={() => setTimeout(() => setIsProdDropdownOpen(false), 250)}
                    placeholder="Escribe SKU o nombre para buscar..."
                    className="w-full rounded-lg border border-gray-300 p-2 text-xs focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none font-semibold text-gray-700"
                  />
                  {isProdDropdownOpen && (
                    <div className="absolute z-30 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {filteredProducts.length > 0 ? (
                        filteredProducts.map((p, idx) => {
                          const origIdx = availableProducts.findIndex(ap => ap.noIdentificacion === p.noIdentificacion);
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                handleSelectProduct(origIdx);
                                setProdSearchQuery(`${p.noIdentificacion} - ${p.descripcion}`);
                                setIsProdDropdownOpen(false);
                              }}
                              className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 border-b border-gray-50 flex flex-col transition-colors"
                            >
                              <span className="font-bold text-gray-900">{p.noIdentificacion}</span>
                              <span className="text-gray-500 truncate">{p.descripcion}</span>
                            </button>
                          );
                        })
                      ) : (
                        <div className="p-3 text-xs text-gray-500 text-center">No se encontraron productos</div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Descripción Detallada del Concepto</label>
                <textarea 
                  value={newItemDesc}
                  onChange={(e) => setNewItemDesc(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-gray-300 p-2 text-xs focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none"
                  placeholder="Detalles de personalización, colores, logotipos..."
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Cantidad</label>
                  <input 
                    type="number" 
                    value={newItemCantidad}
                    onChange={(e) => setNewItemCantidad(parseInt(e.target.value) || 0)}
                    min={1}
                    className="w-full rounded-lg border border-gray-300 p-2 text-xs focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Precio Unitario ($)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={newItemPrecio}
                    onChange={(e) => setNewItemPrecio(parseFloat(e.target.value) || 0)}
                    min={0.01}
                    className="w-full rounded-lg border border-gray-300 p-2 text-xs focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Clave SAT (Prod/Serv)</label>
                  <input 
                    type="text" 
                    value={newItemClaveSat}
                    onChange={(e) => setNewItemClaveSat(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 p-2 text-xs focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none font-mono"
                    placeholder="48101600"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Clave Unidad SAT</label>
                  <input 
                    type="text" 
                    value={newItemClaveUnidad}
                    onChange={(e) => setNewItemClaveUnidad(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 p-2 text-xs focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none font-mono"
                    placeholder="H87"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Nombre Unidad</label>
                  <input 
                    type="text" 
                    value={newItemUnidad}
                    onChange={(e) => setNewItemUnidad(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 p-2 text-xs focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none"
                    placeholder="Pieza"
                  />
                </div>
              </div>

              <button 
                type="submit"
                className="w-full bg-primary-600 hover:bg-primary-700 text-white rounded-lg p-2.5 text-xs font-bold transition-colors flex items-center justify-center gap-1 shadow-sm"
              >
                <Plus className="w-4 h-4" /> Agregar Concepto
              </button>
            </form>
          </div>

          {/* General CFDI Meta Controls */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Settings className="w-5 h-5 text-primary-600" />
              <h2 className="text-lg font-bold text-gray-900">Configuración de Comprobante</h2>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="font-semibold text-gray-600 block mb-1">Serie</label>
                <input type="text" value={serie} onChange={(e) => setSerie(e.target.value)} className="w-full rounded-lg border border-gray-300 p-2" />
              </div>
              <div>
                <label className="font-semibold text-gray-600 block mb-1">Folio</label>
                <input type="text" value={folio} onChange={(e) => setFolio(e.target.value)} className="w-full rounded-lg border border-gray-300 p-2" />
              </div>
              <div>
                <label className="font-semibold text-gray-600 block mb-1">Método de Pago</label>
                <select value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)} className="w-full rounded-lg border border-gray-300 p-2">
                  <option value="PUE">PUE - Una sola exhibición</option>
                  <option value="PPD">PPD - Parcialidades o Diferido</option>
                </select>
              </div>
              <div>
                <label className="font-semibold text-gray-600 block mb-1">Forma de Pago</label>
                <select value={formaPago} onChange={(e) => setFormaPago(e.target.value)} className="w-full rounded-lg border border-gray-300 p-2">
                  <option value="03">03 - Transferencia Electrónica</option>
                  <option value="01">01 - Efectivo</option>
                  <option value="02">02 - Cheque nominativo</option>
                  <option value="04">04 - Tarjeta de Crédito</option>
                  <option value="99">99 - Por definir</option>
                </select>
              </div>
            </div>
          </div>

          {/* Real Invoicing Panel */}
          <div className="bg-white rounded-xl shadow-md border-2 border-primary-500/30 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Lock className="w-5 h-5 text-primary-600" />
              <h2 className="text-lg font-bold text-gray-900">Timbrado Real SAT (Sandbox)</h2>
            </div>
            
            {stampedInvoice ? (
              <div className="space-y-4 text-xs">
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-lg flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <div>
                    <span className="font-bold block">¡Comprobante Timbrado!</span>
                    <span className="font-mono text-[10px] break-all">{stampedInvoice.uuid}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <a 
                    href={`/api/facturacion/descargar?id=${stampedInvoice.id}&format=xml`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold p-2 rounded-lg flex items-center justify-center gap-1 border border-gray-300 transition-all text-center"
                  >
                    <FileCode className="w-4 h-4" /> XML Oficial
                  </a>
                  <a 
                    href={`/api/facturacion/descargar?id=${stampedInvoice.id}&format=pdf`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold p-2 rounded-lg flex items-center justify-center gap-1 shadow-sm transition-all text-center"
                  >
                    <Download className="w-4 h-4" /> PDF Oficial
                  </a>
                </div>

                <div className="border-t border-gray-200 pt-4 space-y-4">
                  {/* Status check */}
                  <div className="flex items-center justify-between">
                    <span>Estatus SAT: <strong className={stampedInvoice.status === 'valid' ? 'text-emerald-600' : 'text-red-600'}>{stampedInvoice.status.toUpperCase()}</strong></span>
                    <button 
                      onClick={handleCheckStatus}
                      className="text-primary-600 hover:underline font-bold flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" /> Actualizar Estatus
                    </button>
                  </div>

                  {/* Complement of payment (REP) (Only if payment method is PPD) */}
                  {metodoPago === 'PPD' && stampedInvoice.status === 'valid' && (
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 space-y-2">
                      <span className="font-bold text-gray-700 block text-left">Emitir Complemento de Pago (REP)</span>
                      <div className="grid grid-cols-2 gap-2 text-left">
                        <div>
                          <label className="text-[10px] text-gray-500 block">Monto Pagado</label>
                          <input 
                            type="number" 
                            value={repAmount} 
                            onChange={(e) => setRepAmount(e.target.value)} 
                            placeholder="Monto"
                            className="w-full border border-gray-300 rounded p-1.5"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-500 block">Parcialidad</label>
                          <input 
                            type="number" 
                            value={repInstallment} 
                            onChange={(e) => setRepInstallment(e.target.value)} 
                            className="w-full border border-gray-300 rounded p-1.5"
                          />
                        </div>
                      </div>
                      <button
                        onClick={handleCreatePaymentComplement}
                        disabled={isCreatingREP}
                        className="w-full bg-primary-750 hover:bg-primary-850 text-white rounded p-1.5 font-bold transition-all disabled:opacity-50"
                      >
                        {isCreatingREP ? "Emitiendo..." : "Emitir REP en SAT"}
                      </button>
                    </div>
                  )}

                  {/* Credit Note (Egreso) */}
                  {stampedInvoice.status === 'valid' && (
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 space-y-2">
                      <span className="font-bold text-gray-700 block text-left">Emitir Nota de Crédito (Egreso)</span>
                      <div className="space-y-1.5 text-left">
                        <label className="text-[10px] text-gray-500 block">Monto del Descuento</label>
                        <input 
                          type="number" 
                          value={ncAmount} 
                          onChange={(e) => setNcAmount(e.target.value)} 
                          placeholder="Monto"
                          className="w-full border border-gray-300 rounded p-1.5"
                        />
                      </div>
                      <button
                        onClick={handleCreateCreditNote}
                        disabled={isCreatingNC}
                        className="w-full bg-primary-750 hover:bg-primary-850 text-white rounded p-1.5 font-bold transition-all disabled:opacity-50"
                      >
                        {isCreatingNC ? "Emitiendo..." : "Emitir Nota de Crédito"}
                      </button>
                    </div>
                  )}

                  {/* Cancellation */}
                  {stampedInvoice.status === 'valid' && (
                    <div className="bg-red-50 p-3 rounded-lg border border-red-200 space-y-2">
                      <span className="font-bold text-red-800 block text-left">Cancelar Comprobante ante el SAT</span>
                      <div className="text-left">
                        <label className="text-[10px] text-gray-500 block">Motivo SAT</label>
                        <select 
                          value={cancelMotive} 
                          onChange={(e) => setCancelMotive(e.target.value)} 
                          className="w-full border border-gray-300 rounded p-1.5 bg-white text-gray-700"
                        >
                          <option value="02">02 - Comprobante emitido con errores sin relación</option>
                          <option value="03">03 - No se llevó a cabo la operación</option>
                          <option value="04">04 - Operación nominativa relacionada en una factura global</option>
                          <option value="01">01 - Comprobante emitido con errores con relación</option>
                        </select>
                      </div>
                      {cancelMotive === '01' && (
                        <div className="text-left">
                          <label className="text-[10px] text-gray-500 block">Folio Sustituto (UUID)</label>
                          <input 
                            type="text" 
                            value={cancelSubstitution} 
                            onChange={(e) => setCancelSubstitution(e.target.value)} 
                            placeholder="UUID de la factura de reemplazo"
                            className="w-full border border-gray-300 rounded p-1.5"
                          />
                        </div>
                      )}
                      <button
                        onClick={handleCancelInvoice}
                        disabled={isCancelling}
                        className="w-full bg-red-600 hover:bg-red-700 text-white rounded p-1.5 font-bold transition-all disabled:opacity-50"
                      >
                        {isCancelling ? "Cancelando..." : "Solicitar Cancelación"}
                      </button>
                    </div>
                  )}

                  <button
                    onClick={() => setStampedInvoice(null)}
                    className="w-full border border-gray-300 text-gray-600 rounded p-1.5 font-semibold hover:bg-gray-50 text-center"
                  >
                    Nueva Factura (Reset)
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                <p className="text-gray-500 text-left">
                  Usa este botón para realizar un <strong>timbrado real en el Sandbox del SAT</strong>. Esto generará un folio fiscal (UUID) de prueba y enlaces de descarga a archivos PDF/XML válidos ante la estructura CFDI 4.0.
                </p>
                <button
                  onClick={handleEmitRealInvoice}
                  disabled={isSubmitting || items.length === 0}
                  className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-lg p-3 font-bold transition-all shadow-sm flex items-center justify-center gap-1.5"
                >
                  <FileText className="w-4 h-4" /> 
                  {isSubmitting ? "Timbrando en SAT..." : "Emitir Factura SAT Real"}
                </button>
              </div>
            )}
          </div>

        </div>

        {/* CFDI Live Interactive representation (7 Columns) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Action Bar */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex flex-wrap gap-3 items-center justify-between">
            <span className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              Factura lista para exportar
            </span>
            <div className="flex gap-2">
              <button 
                onClick={downloadXml}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs py-2 px-4 rounded-lg flex items-center gap-1.5 border border-gray-300 transition-colors"
              >
                <FileCode className="w-4 h-4" /> XML
              </button>
               <button 
                onClick={viewPdfInNewTab}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 px-4 rounded-lg flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <Eye className="w-4 h-4" /> Ver PDF
              </button>
              <button 
                onClick={downloadPdf}
                className="bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs py-2 px-4 rounded-lg flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <Download className="w-4 h-4" /> PDF Impreso
              </button>
            </div>
          </div>

          {/* Visual SAT CFDI 4.0 Form (Representación Impresa) */}
          <div className="bg-white rounded-xl shadow-md border border-gray-300 p-6 md:p-8 font-sans text-gray-800 relative">
            
            {/* Header watermark */}
            <div className="absolute top-4 right-4 bg-gray-100 border border-gray-300 text-[9px] font-mono rounded px-2 py-0.5 text-gray-500 uppercase">
              Simulación CFDI 4.0
            </div>

            {/* Logo / Emisor / Factura Header */}
            <div className="flex flex-col md:flex-row justify-between items-start border-b border-gray-200 pb-6 gap-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-6 h-6 text-primary-600 flex-shrink-0" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="256" cy="256" r="256" fill="#00b3a9"/>
                    <path d="M200 180 L110 256 L200 332" stroke="white" strokeWidth="46" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M250 360 L310 150" stroke="white" strokeWidth="42" strokeLinecap="round"/>
                    <path d="M350 180 L440 256 L350 332" stroke="white" strokeWidth="46" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span className="font-extrabold text-lg text-primary-900" style={{ fontFamily: 'Museo, sans-serif' }}>geekystore</span>
                </div>
                <div className="text-[11px] text-gray-600 space-y-0.5">
                  <p className="font-bold text-gray-800 text-xs">{emisor.nombre}</p>
                  <p>RFC: <span className="font-mono">{emisor.rfc}</span></p>
                  <p>CURP: <span className="font-mono">{emisor.curp}</span></p>
                  <p>Régimen: <span className="font-semibold">{emisor.regimenFiscal}</span></p>
                  <p>Calle {emisor.calle} #{emisor.numExt}, Col. {emisor.colonia}</p>
                  <p>CP {emisor.codigoPostal}, Aguascalientes, Ags., {emisor.pais}</p>
                </div>
              </div>

              <div className="w-full md:w-auto md:text-right text-[11px] text-gray-600 space-y-1">
                <div className="bg-gray-50 border border-gray-200 rounded p-2.5 mb-2">
                  <p className="text-xs font-bold text-primary-900 uppercase">Factura Digital</p>
                  <p className="font-semibold text-gray-700">Serie {serie} - Folio {folio}</p>
                </div>
                <p>Lugar de Expedición: <span className="font-semibold font-mono">{emisor.codigoPostal}</span></p>
                <p>Fecha y Hora de Emisión: <span className="font-mono">{fechaExpedicion}</span></p>
                <p>Efecto de Comprobante: <span className="font-semibold">I - Ingreso</span></p>
                <p>Exportación: <span className="font-semibold">01 - No aplica</span></p>
              </div>
            </div>

            {/* CFDI & Client Metadata */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-6 border-b border-gray-200 text-[11px] text-gray-600">
              <div>
                <h3 className="font-bold text-xs text-primary-900 border-b border-gray-100 pb-1 mb-2 uppercase">Cliente (Receptor)</h3>
                <p className="font-bold text-gray-800 text-xs mb-1">{clientRazonSocial}</p>
                <p>RFC: <span className="font-mono font-semibold">{clientRfc}</span></p>
                <p>Domicilio Fiscal CP: <span className="font-semibold font-mono">{clientCp}</span></p>
                <p>Régimen Fiscal: <span className="font-semibold">{clientRegimen}</span></p>
                <p>Uso de CFDI: <span className="font-semibold">{clientUso}</span></p>
              </div>

              <div>
                <h3 className="font-bold text-xs text-primary-900 border-b border-gray-100 pb-1 mb-2 uppercase">Timbre / Certificación</h3>
                <p>Folio Fiscal UUID: <span className="font-mono text-gray-800 font-semibold text-[10px] break-all">{uuid}</span></p>
                <p>No. Certificado Emisor: <span className="font-mono">{certificadoEmisor}</span></p>
                <p>No. Certificado SAT: <span className="font-mono">{certificadoSat}</span></p>
                <p>RFC Proveedor Cert: <span className="font-mono">{rfcPac}</span></p>
                <p>Moneda: <span className="font-semibold">{moneda} - Peso Mexicano</span></p>
              </div>
            </div>

            {/* Concepts / Items Table */}
            <div className="py-6 overflow-x-auto">
              <table className="w-full text-left text-[11px] min-w-[500px]">
                <thead>
                  <tr className="border-b border-gray-300 text-gray-500 font-bold uppercase text-[9px]">
                    <th className="pb-2">Clave SAT</th>
                    <th className="pb-2">No. Ident</th>
                    <th className="pb-2 text-center">Cant</th>
                    <th className="pb-2">Clave U.</th>
                    <th className="pb-2">Descripción</th>
                    <th className="pb-2 text-right">Precio Unit</th>
                    <th className="pb-2 text-right">Importe</th>
                    <th className="pb-2 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const itemImport = item.cantidad * item.valorUnitario;
                    return (
                      <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                        <td className="py-3 font-mono text-[10px] text-gray-500">{item.claveSat}</td>
                        <td className="py-3 font-mono text-[10px] text-gray-500">{item.noIdentificacion}</td>
                        <td className="py-3 text-center">{item.cantidad}</td>
                        <td className="py-3 font-mono text-[10px] text-gray-500">{item.claveUnidad}</td>
                        <td className="py-3 pr-2 font-medium text-gray-800">
                          {item.descripcion}
                          <div className="text-[9px] text-gray-400 font-normal">
                            Unidad: {item.unidad} | IVA: Traslado 16.00%
                          </div>
                        </td>
                        <td className="py-3 text-right font-mono">${item.valorUnitario.toFixed(2)}</td>
                        <td className="py-3 text-right font-semibold font-mono">${itemImport.toFixed(2)}</td>
                        <td className="py-3 text-center">
                          <button 
                            onClick={() => handleRemoveItem(item.id)}
                            className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition-colors"
                            title="Remover concepto"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-gray-400 italic">
                        No hay conceptos en la factura. Agrega uno usando el formulario.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Invoice Bottom: Letters & Totals Block */}
            <div className="border-t border-gray-200 pt-6 flex flex-col md:flex-row gap-6 justify-between items-start">
              
              {/* Left side: Amount in letters */}
              <div className="w-full md:w-3/5 text-[10px] text-gray-500 space-y-2">
                <p>
                  <span className="font-bold text-gray-700 block text-[11px] mb-1">Importe con Letra:</span>
                  <span className="uppercase italic font-semibold">{numeroALetras(calculations.total)}</span>
                </p>
                <p>
                  <span className="font-bold text-gray-700 block">Condiciones de Facturación:</span>
                  Método de Pago: PUE (Pago en una Sola Exhibición). Forma de Pago: {formaPago} - Transferencia Electrónica. 
                  Emisión simulada para geekystore bajo normativa CFDI 4.0.
                </p>
              </div>

              {/* Right side: Calculations breakdown */}
              <div className="w-full md:w-1/3 bg-gray-50 rounded-lg p-4 border border-gray-100 text-xs text-gray-600 font-mono space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-semibold text-gray-800">${calculations.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-b border-gray-200 pb-2">
                  <span>IVA Traslado (16%)</span>
                  <span className="font-semibold text-emerald-700">+${calculations.iva.toFixed(2)}</span>
                </div>
                
                {calculations.hasRetention && (
                  <div className="flex justify-between text-red-700 border-b border-gray-200 pb-2">
                    <span>ISR Retenido (1.25%)</span>
                    <span className="font-semibold">-${calculations.isrRetention.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between text-sm pt-1">
                  <span className="font-bold text-primary-900">Total Neto</span>
                  <span className="font-bold text-primary-900 text-base font-sans">${calculations.total.toFixed(2)}</span>
                </div>
              </div>

            </div>

            {/* Digital Stamps complement box */}
            <div className="border-t border-gray-200 mt-8 pt-6 flex flex-col md:flex-row gap-6 items-center md:items-start text-[8px] text-gray-500 leading-normal">
              
              {/* Simulated QR Code */}
              <div className="w-24 h-24 bg-white border border-gray-300 p-2 flex-shrink-0 rounded flex flex-col justify-between items-center shadow-sm">
                <div className="grid grid-cols-3 gap-1 w-full h-full opacity-80">
                  <div className="bg-gray-800 rounded-sm"></div>
                  <div className="bg-gray-200"></div>
                  <div className="bg-gray-800 rounded-sm"></div>
                  <div className="bg-gray-200"></div>
                  <div className="bg-gray-800"></div>
                  <div className="bg-gray-200"></div>
                  <div className="bg-gray-800 rounded-sm"></div>
                  <div className="bg-gray-200"></div>
                  <div className="bg-gray-800"></div>
                </div>
                <span className="text-[6px] text-gray-400 font-mono select-none">VALIDADO SAT</span>
              </div>

              {/* Sello Strings */}
              <div className="space-y-3 font-mono break-all w-full">
                <div>
                  <h4 className="font-bold text-gray-700 text-[9px] uppercase">Cadena Original del Complemento de Certificación Digital del SAT</h4>
                  <p className="mt-0.5 bg-gray-50 p-1.5 rounded border border-gray-100 text-[8px]">
                    ||1.1|${uuid}|2026-07-16T14:16:00|${rfcPac}|M1ReE+u4qc75j6dqYj64UYH9pfJQov3v+yeXgb/PzsGb/LEJ0Ufgow86INh6ikN8fecLDLjlpgvkxqsHY6jUU6qtWDvce7mEBsCwzniEm3/4W55bunjlBuwlMCKkiz/smgsbUeJHSmDXf1wqSscBWqJ5EpH9n18x9UY7ftgdHtl=|00001000000504465028||
                  </p>
                </div>
                <div>
                  <h4 className="font-bold text-gray-700 text-[9px] uppercase">Sello Digital del Emisor</h4>
                  <p className="mt-0.5 bg-gray-50 p-1.5 rounded border border-gray-100 text-[8px]">
                    M1ReE+u4qc75j6dqYj64UYH9pfJQov3v+yeXgb/PzsGb/LEJ0Ufgow86INh6ikN8fecLDLjlpgvkxqsHY6jUU6qtWDvce7mEBsCwzniEm3/4W55bunjlBuwlMCKkiz/smgsbUeJHSmDXf1wqSscBWqJ5EpH9n18x9UY7ftgdHtl=
                  </p>
                </div>
                <div>
                  <h4 className="font-bold text-gray-700 text-[9px] uppercase">Sello Digital del SAT</h4>
                  <p className="mt-0.5 bg-gray-50 p-1.5 rounded border border-gray-100 text-[8px]">
                    ce7mEBsCwzniEm3/4W55bunjlBuwlMCKkiz/smgsbUeJHSmDXf1wqSscBWqJ5EpH9n18x9UY7ftgdHtl=
                  </p>
                </div>
              </div>

            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
