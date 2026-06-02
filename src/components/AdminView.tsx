"use client";

import { useState, useEffect } from "react";
import { useProducts } from "@/hooks/useProducts";
import { useSettings } from "@/hooks/useSettings";
import { useQuotes } from "@/hooks/useQuotes";
import { Product, MATERIALS, QuoteRequest } from "@/types";
import { Edit, Trash2, Plus, Search, X, Image as ImageIcon, Eye, Clock, CheckCircle, FileText, Download, User, ChevronUp, ChevronDown, Truck } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import dynamic from "next/dynamic";
import { uploadImage, supabase } from "@/lib/supabase";

const AgentIntegrationView = dynamic(() => import('./AgentIntegrationView').then(mod => mod.AgentIntegrationView), { ssr: false });
const B2BAgentCRM = dynamic(() => import('./B2BAgentCRM').then(mod => mod.B2BAgentCRM), { ssr: false });

const COLOR_PALETTE = [
  { name: "Rojo", hex: "#FF0000" },
  { name: "Verde", hex: "#00FF00" },
  { name: "Azul", hex: "#0000FF" },
  { name: "Negro", hex: "#000000" },
  { name: "Blanco", hex: "#FFFFFF" },
  { name: "Gris", hex: "#808080" },
  { name: "Amarillo", hex: "#FFFF00" },
  { name: "Naranja", hex: "#FFA500" },
  { name: "Morado", hex: "#800080" },
  { name: "Marrón", hex: "#8B4513" },
  { name: "Cian", hex: "#00FFFF" },
  { name: "Rosa", hex: "#FFC0CB" }
];

const getColorName = (hex: string) => {
  if (!hex.startsWith('#')) return hex;
  const color = COLOR_PALETTE.find(c => c.hex.toLowerCase() === hex.toLowerCase());
  return color ? color.name : hex;
};

const printPrices: Record<string, number> = {
  "Sin Impresión": 0,
  "Grabado Chico": 15,
  "Grabado Grande": 25,
  "Impresión 1 tinta": 10,
  "Impresión 2 tintas": 18,
  "Impresión 3 tintas": 25,
  "Impresión 4 tintas": 30
};

const GRADIENT_OPTIONS = [
  { label: "Verde", value: "from-green-900/80 to-green-600/40" },
  { label: "Rosa/Rojo", value: "from-pink-900/80 to-pink-600/40" },
  { label: "Rojo Oscuro", value: "from-red-900/80 to-red-600/40" },
  { label: "Azul", value: "from-blue-900/80 to-blue-600/40" },
  { label: "Púrpura", value: "from-purple-900/80 to-purple-600/40" },
  { label: "Naranja", value: "from-orange-900/80 to-orange-600/40" },
  { label: "Oscuro", value: "from-gray-900/90 to-gray-800/50" }
];

const roundToHalf = (num: number): number => {
  return Math.round(num * 2) / 2;
};

const getQuoteTotals = (quote: QuoteRequest, customPrices?: Record<string, number>) => {
  let baseProductSubtotal = 0;
  let printSubtotal = 0;
  let shippingSubtotal = 0;

  const pricesToUse = customPrices || printPrices;

  quote.items.forEach(item => {
    const estPrintPrice = item.isPersonalized ? (pricesToUse[item.printOption] || 0) : 0;
    const baseProdPrice = item.unitPrice - estPrintPrice;
    
    const finalPrint = item.finalPrintPrice !== undefined && item.finalPrintPrice !== null
      ? item.finalPrintPrice
      : estPrintPrice;
      
    const finalShipping = item.finalShippingPrice !== undefined && item.finalShippingPrice !== null
      ? item.finalShippingPrice
      : 0;

    baseProductSubtotal += baseProdPrice * item.quantity;
    printSubtotal += (item.isPersonalized ? finalPrint : 0) * item.quantity;
    shippingSubtotal += finalShipping;
  });

  const subtotal = baseProductSubtotal + printSubtotal + shippingSubtotal;
  const iva = subtotal * 0.16;
  const total = subtotal + iva;

  return {
    baseProductSubtotal,
    printSubtotal,
    shippingSubtotal,
    subtotal,
    iva,
    total
  };
};

export function AdminView() {
  const { products, isLoaded, addProduct, updateProduct, deleteProduct } = useProducts();
  const { quotes, isLoaded: quotesLoaded, updateQuoteStatus, deleteQuote, updateQuote } = useQuotes();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<'products' | 'settings' | 'suppliers' | 'home' | 'quotes' | 'agent' | 'b2b-agent'>('products');
  const { categories, seasons, isLoaded: settingsLoaded, addCategory, removeCategory, addSeason, removeSeason, featuredSeason, updateFeaturedSeason, homeSettings, updateHomeSettings, updateCategories, updateSeasons } = useSettings();
  
  const [newCategory, setNewCategory] = useState("");
  const [newSeason, setNewSeason] = useState("");

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

  const moveSeason = (index: number, direction: 'up' | 'down') => {
    const newSeasons = [...seasons];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex >= 0 && targetIndex < newSeasons.length) {
      const temp = newSeasons[index];
      newSeasons[index] = newSeasons[targetIndex];
      newSeasons[targetIndex] = temp;
      updateSeasons(newSeasons);
    }
  };
  
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    // Check initial session safely
    supabase.auth.getSession()
      .then((res) => {
        const session = res?.data?.session;
        setIsAuthenticated(!!session);
        if (res?.error) {
          console.warn("Auth session error:", res.error.message);
          // Auto-signout to clear stale tokens from storage
          supabase.auth.signOut().catch(() => {});
        }
      })
      .catch((err) => {
        console.error("Failed to check auth session:", err);
        setIsAuthenticated(false);
      });

    // Listen to changes in auth state
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => {
      if (data?.subscription) {
        data.subscription.unsubscribe();
      }
    };
  }, []);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [uploadingImage, setUploadingImage] = useState<number | string | null>(null);
  const [hoveredImageKey, setHoveredImageKey] = useState<number | null>(null);

  useEffect(() => {
    if (!isModalOpen) return;

    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      let imageFile: File | null = null;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          imageFile = items[i].getAsFile();
          break;
        }
      }

      if (!imageFile) return;

      e.preventDefault();

      let targetKey = hoveredImageKey;
      if (targetKey === null) {
        const currentImages = editingProduct.images || [];
        let firstEmpty = -1;
        for (let idx = 0; idx < 5; idx++) {
          if (!currentImages[idx]) {
            firstEmpty = idx;
            break;
          }
        }
        targetKey = firstEmpty !== -1 ? firstEmpty : 0;
      }

      try {
        setUploadingImage(targetKey);
        const publicUrl = await uploadImage(imageFile);
        if (publicUrl) {
          const newImages = [...(editingProduct.images || [])];
          while (newImages.length <= targetKey) newImages.push("");
          newImages[targetKey] = publicUrl;
          setEditingProduct(prev => ({...prev, images: newImages}));
        } else {
          alert("Error subiendo la imagen pegada.");
        }
      } catch (err) {
        console.error("Error uploading pasted image:", err);
        alert("No se pudo procesar la imagen pegada.");
      } finally {
        setUploadingImage(null);
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => {
      window.removeEventListener("paste", handlePaste);
    };
  }, [isModalOpen, hoveredImageKey, editingProduct.images]);

  const [viewingQuote, setViewingQuote] = useState<QuoteRequest | null>(null);

  // States for quote editing
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [itemAdjustments, setItemAdjustments] = useState<Record<string, { finalPrintPrice: string; finalShippingPrice: string }>>({});
  const [deliveryTime, setDeliveryTime] = useState<string>("");
  const [address, setAddress] = useState<string>("");
  const [zip, setZip] = useState<string>("");
  const [isSavingQuote, setIsSavingQuote] = useState(false);

  // Suppliers & Shipping states
  const [supplierTab, setSupplierTab] = useState<'print' | 'product'>('print');
  
  const [printSuppliers, setPrintSuppliers] = useState<any[]>([]);
  const [editingPrintSupplierId, setEditingPrintSupplierId] = useState<string | null>(null);
  const [printForm, setPrintForm] = useState({
    name: "",
    contact: "",
    phone1: "",
    phone2: "",
    address: "",
    grabado_chico: 0,
    grabado_grande: 0,
    dtf: 0,
    seri_1_tinta: 0,
    seri_2_tintas: 0,
    seri_3_tintas: 0,
    seri_4_tintas: 0
  });

  const [productSuppliers, setProductSuppliers] = useState<any[]>([]);
  const [editingProductSupplierId, setEditingProductSupplierId] = useState<string | null>(null);
  const [productForm, setProductForm] = useState({
    name: "",
    contact: "",
    phone1: "",
    phone2: "",
    address: ""
  });

  const [selectedAssocProductId, setSelectedAssocProductId] = useState<string>("");
  const [selectedAssocSupplierId, setSelectedAssocSupplierId] = useState<string>("");
  const [assocPrice, setAssocPrice] = useState<number>(0);
  const [assocPiecesPerBox, setAssocPiecesPerBox] = useState<number>(50);
  const [productSupplierSearch, setProductSupplierSearch] = useState<string>("");
  const [filterSupplierId, setFilterSupplierId] = useState<string>("all");

  const [shippingBoxes, setShippingBoxes] = useState<number>(1);
  const [shippingWeight, setShippingWeight] = useState<number>(10);
  const [shippingInitialCost, setShippingInitialCost] = useState<number>(0);
  const [shippingSelectedCarrier, setShippingSelectedCarrier] = useState<string>("dhl");
  const [shippingLength, setShippingLength] = useState<number>(30);
  const [shippingWidth, setShippingWidth] = useState<number>(30);
  const [shippingHeight, setShippingHeight] = useState<number>(30);

  // Sync settings when loaded
  useEffect(() => {
    if (homeSettings) {
      setPrintSuppliers(homeSettings.print_suppliers || []);
      setProductSuppliers(homeSettings.product_suppliers || []);
    }
  }, [homeSettings]);

  const activePrintPrices: Record<string, number> = {
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

  const calculateCarrierCosts = (
    boxes: number,
    weightPerBox: number,
    originZip: string,
    destZip: string
  ) => {
    const numBoxes = Math.max(1, boxes);
    const weight = Math.max(0.1, weightPerBox);
    
    const orig = parseInt(originZip) || 20000;
    const dest = parseInt(destZip) || 20000;
    const zipDistance = Math.abs(orig - dest);
    const distanceFactor = 1 + (zipDistance / 100000) * 1.5;
    const billableWeight = weight;
    
    const dhlBase = 180;
    const dhlPerKg = 15;
    const dhlCost = (dhlBase + billableWeight * dhlPerKg) * distanceFactor * numBoxes;
    
    const fedexBase = 160;
    const fedexPerKg = 12;
    const fedexCost = (fedexBase + billableWeight * fedexPerKg) * distanceFactor * numBoxes;
    
    const estafetaBase = 130;
    const estafetaPerKg = 10;
    const estafetaCost = (estafetaBase + billableWeight * estafetaPerKg) * distanceFactor * numBoxes;
    
    const paquetexpressBase = 110;
    const paquetexpressPerKg = 8;
    const paquetexpressCost = (paquetexpressBase + billableWeight * paquetexpressPerKg) * distanceFactor * numBoxes;
    
    return [
      { id: 'dhl', name: 'DHL Mex', cost: Math.round(dhlCost * 2) / 2, time: '1-2 días hábiles' },
      { id: 'fedex', name: 'Fedex Mex', cost: Math.round(fedexCost * 2) / 2, time: '2-3 días hábiles' },
      { id: 'estafeta', name: 'Estafeta', cost: Math.round(estafetaCost * 2) / 2, time: '2-4 días hábiles' },
      { id: 'paquetexpress', name: 'Paquetexpress', cost: Math.round(paquetexpressCost * 2) / 2, time: '3-5 días hábiles' }
    ];
  };

  const handleSavePrintSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!printForm.name.trim()) return;

    let updatedSuppliers = [...printSuppliers];
    if (editingPrintSupplierId) {
      updatedSuppliers = updatedSuppliers.map(s => s.id === editingPrintSupplierId ? { ...printForm, id: editingPrintSupplierId } : s);
      setEditingPrintSupplierId(null);
    } else {
      updatedSuppliers.push({
        ...printForm,
        id: `PS-${Date.now()}`
      });
    }

    setPrintSuppliers(updatedSuppliers);
    await updateHomeSettings({
      ...homeSettings,
      print_suppliers: updatedSuppliers
    });

    setPrintForm({
      name: "",
      contact: "",
      phone1: "",
      phone2: "",
      address: "",
      grabado_chico: 0,
      grabado_grande: 0,
      dtf: 0,
      seri_1_tinta: 0,
      seri_2_tintas: 0,
      seri_3_tintas: 0,
      seri_4_tintas: 0
    });
    alert("Proveedor de impresión guardado.");
  };

  const handleEditPrintSupplier = (supplier: any) => {
    setEditingPrintSupplierId(supplier.id);
    setPrintForm({
      name: supplier.name || "",
      contact: supplier.contact || "",
      phone1: supplier.phone1 || "",
      phone2: supplier.phone2 || "",
      address: supplier.address || "",
      grabado_chico: supplier.grabado_chico || 0,
      grabado_grande: supplier.grabado_grande || 0,
      dtf: supplier.dtf || 0,
      seri_1_tinta: supplier.seri_1_tinta || 0,
      seri_2_tintas: supplier.seri_2_tintas || 0,
      seri_3_tintas: supplier.seri_3_tintas || 0,
      seri_4_tintas: supplier.seri_4_tintas || 0
    });
  };

  const handleDeletePrintSupplier = async (id: string) => {
    if (!confirm("¿Seguro que deseas eliminar este proveedor de impresión?")) return;
    const updated = printSuppliers.filter(s => s.id !== id);
    setPrintSuppliers(updated);
    await updateHomeSettings({
      ...homeSettings,
      print_suppliers: updated
    });
  };

  const handleSaveProductSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productForm.name.trim()) return;

    let updatedSuppliers = [...productSuppliers];
    if (editingProductSupplierId) {
      updatedSuppliers = updatedSuppliers.map(s => s.id === editingProductSupplierId ? { ...productForm, id: editingProductSupplierId } : s);
      setEditingProductSupplierId(null);
    } else {
      updatedSuppliers.push({
        ...productForm,
        id: `PROD-S-${Date.now()}`
      });
    }

    setProductSuppliers(updatedSuppliers);
    await updateHomeSettings({
      ...homeSettings,
      product_suppliers: updatedSuppliers
    });

    setProductForm({
      name: "",
      contact: "",
      phone1: "",
      phone2: "",
      address: ""
    });
    alert("Proveedor de producto guardado.");
  };

  const handleEditProductSupplier = (supplier: any) => {
    setEditingProductSupplierId(supplier.id);
    setProductForm({
      name: supplier.name || "",
      contact: supplier.contact || "",
      phone1: supplier.phone1 || "",
      phone2: supplier.phone2 || "",
      address: supplier.address || ""
    });
  };

  const handleDeleteProductSupplier = async (id: string) => {
    if (!confirm("¿Seguro que deseas eliminar este proveedor de producto?")) return;
    const updated = productSuppliers.filter(s => s.id !== id);
    setProductSuppliers(updated);
    
    const map = { ...(homeSettings?.product_supplier_map || {}) };
    Object.keys(map).forEach(prodId => {
      if (map[prodId]?.supplierId === id) {
        delete map[prodId];
      }
    });

    await updateHomeSettings({
      ...homeSettings,
      product_suppliers: updated,
      product_supplier_map: map
    });
  };

  const handleSaveProductAssociation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssocProductId || !selectedAssocSupplierId) {
      alert("Por favor selecciona un producto y un proveedor.");
      return;
    }

    const prod = products.find(p => p.id === selectedAssocProductId);
    if (!prod) return;

    const updatedProduct = {
      ...prod,
      cost: assocPrice,
      minPurchase: assocPiecesPerBox
    };
    await updateProduct(updatedProduct);

    const map = { ...(homeSettings?.product_supplier_map || {}) };
    map[selectedAssocProductId] = {
      supplierId: selectedAssocSupplierId,
      price: assocPrice,
      piecesPerBox: assocPiecesPerBox
    };

    await updateHomeSettings({
      ...homeSettings,
      product_supplier_map: map
    });

    alert("Producto asociado exitosamente. Se actualizaron el Costo y Compra Mínima.");
  };

  const handleUnlinkProduct = async (productId: string) => {
    if (!confirm("¿Seguro que deseas desvincular este producto del proveedor?")) return;
    
    const map = { ...(homeSettings?.product_supplier_map || {}) };
    delete map[productId];

    await updateHomeSettings({
      ...homeSettings,
      product_supplier_map: map
    });
    
    alert("Producto desvinculado.");
  };

  const printTechniques = [
    { key: 'grabado_chico', name: 'Grabado Chico' },
    { key: 'grabado_grande', name: 'Grabado Grande' },
    { key: 'dtf', name: 'DTF' },
    { key: 'seri_1_tinta', name: 'Seri 1 Tinta' },
    { key: 'seri_2_tintas', name: 'Seri 2 Tintas' },
    { key: 'seri_3_tintas', name: 'Seri 3 Tintas' },
    { key: 'seri_4_tintas', name: 'Seri 4 Tintas' }
  ];

  const getMinMaxPrices = () => {
    const minPrices: Record<string, number> = {};
    const maxPrices: Record<string, number> = {};

    printTechniques.forEach(tech => {
      const activePrices = printSuppliers
        .map(s => Number(s[tech.key]) || 0)
        .filter(price => price > 0);

      if (activePrices.length > 0) {
        minPrices[tech.key] = Math.min(...activePrices);
        maxPrices[tech.key] = Math.max(...activePrices);
      }
    });

    return { minPrices, maxPrices };
  };

  const { minPrices, maxPrices } = getMinMaxPrices();

  const handleSyncPrintPrices = async () => {
    if (printSuppliers.length === 0) {
      alert("No hay proveedores de impresión registrados.");
      return;
    }

    const mapping: Record<string, string> = {
      'grabado_chico': 'Grabado Chico',
      'grabado_grande': 'Grabado Grande',
      'dtf': 'DTF',
      'seri_1_tinta': 'Impresión 1 tinta',
      'seri_2_tintas': 'Impresión 2 tintas',
      'seri_3_tintas': 'Impresión 3 tintas',
      'seri_4_tintas': 'Impresión 4 tintas'
    };

    const newPrintPrices = { ...activePrintPrices };

    printTechniques.forEach(tech => {
      const mappedKey = mapping[tech.key];
      if (mappedKey && minPrices[tech.key] !== undefined) {
        newPrintPrices[mappedKey] = minPrices[tech.key];
      }
    });

    await updateHomeSettings({
      ...homeSettings,
      print_prices: newPrintPrices
    });

    alert("¡Tarifas B2B actualizadas con los precios más bajos de los proveedores!");
  };

  useEffect(() => {
    if (viewingQuote) {
      const initialAdjustments: Record<string, { finalPrintPrice: string; finalShippingPrice: string }> = {};
      
      viewingQuote.items.forEach(item => {
        const estPrintPrice = item.isPersonalized ? (activePrintPrices[item.printOption] || 0) : 0;
        
        // default finalPrintPrice: if item.finalPrintPrice is set, use it. Else, estimated print price per unit (not total!)
        const savedPrintPrice = item.finalPrintPrice !== undefined && item.finalPrintPrice !== null
          ? item.finalPrintPrice.toString()
          : estPrintPrice.toString();
          
        const savedShippingPrice = item.finalShippingPrice !== undefined && item.finalShippingPrice !== null
          ? item.finalShippingPrice.toString()
          : "0";
        
        initialAdjustments[item.id] = {
          finalPrintPrice: savedPrintPrice,
          finalShippingPrice: savedShippingPrice
        };
      });
      
      setItemAdjustments(initialAdjustments);
      setDeliveryTime(viewingQuote.client.deliveryTime || "");
      setAddress(viewingQuote.client.address || "");
      setZip(viewingQuote.client.zip || "");
      
      // Auto-select the first item
      if (viewingQuote.items.length > 0) {
        setSelectedItemId(viewingQuote.items[0].id);
      }
    }
  }, [viewingQuote]);

  const handleSaveQuoteDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewingQuote) return;
    setIsSavingQuote(true);
    try {
      const updatedItems = viewingQuote.items.map(item => {
        const adj = itemAdjustments[item.id];
        const parsedPrintPrice = adj?.finalPrintPrice === "" ? null : parseFloat(adj?.finalPrintPrice || "");
        const parsedShippingPrice = adj?.finalShippingPrice === "" ? null : parseFloat(adj?.finalShippingPrice || "");

        return {
          ...item,
          finalPrintPrice: parsedPrintPrice !== null && !isNaN(parsedPrintPrice) ? parsedPrintPrice : null,
          finalShippingPrice: parsedShippingPrice !== null && !isNaN(parsedShippingPrice) ? parsedShippingPrice : null,
          deliveryTime: null
        };
      });

      // Calculate totals using getQuoteTotals helper
      const tempQuote: QuoteRequest = {
        ...viewingQuote,
        items: updatedItems,
        client: {
          ...viewingQuote.client,
          address,
          zip,
          deliveryTime: deliveryTime || undefined
        }
      };

      const { total } = getQuoteTotals(tempQuote, activePrintPrices);

      const updatedQuote: QuoteRequest = {
        ...tempQuote,
        total
      };

      await updateQuote(updatedQuote);
      setViewingQuote(updatedQuote);
      alert("Cotización actualizada con éxito.");
    } catch (err) {
      console.error(err);
      alert("Error al actualizar la cotización.");
    } finally {
      setIsSavingQuote(false);
    }
  };

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const getImageElement = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      if (src && !src.startsWith('data:')) {
        img.crossOrigin = "Anonymous";
      }
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  };

  const handleDownloadQuotePdf = async (quote: QuoteRequest) => {
    try {
      // 1. Helper to load image
      const getImageElement = (src: string): Promise<HTMLImageElement | null> => {
        return new Promise((resolve) => {
          if (!src) return resolve(null);
          const img = new Image();
          if (src && !src.startsWith('data:')) {
            img.crossOrigin = "Anonymous";
          }
          img.onload = () => resolve(img);
          img.onerror = () => resolve(null);
          img.src = src;
        });
      };

      // 2. Preload all product images for the table
      const imgElements: Record<string, HTMLImageElement> = {};
      for (const item of quote.items) {
        const imgSrc = item.mockupImage || item.image;
        if (imgSrc) {
          const el = await getImageElement(imgSrc);
          if (el) imgElements[item.id] = el;
        }
      }

      // 3. Initialize jsPDF
      const doc = new jsPDF();
      const primaryColor: [number, number, number] = [11, 80, 77]; // #0b504d

      // 4. Header Rect
      doc.setFillColor(...primaryColor);
      doc.rect(0, 0, 210, 25, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.text("COTIZACIÓN B2B - GEEKYSTORE", 14, 17);

      // 5. Client & Destination details below header
      doc.setTextColor(50, 50, 50);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("DATOS DEL CLIENTE", 14, 35);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`Cliente: ${quote.client.name}`, 14, 41);
      doc.text(`Empresa: ${quote.client.company}`, 14, 46);
      doc.text(`Email: ${quote.client.email}`, 14, 51);
      doc.text(`Teléfono: ${quote.client.phone}`, 14, 56);

      // Column 2
      doc.text(`Destino: ${quote.client.city || ''}, ${quote.client.state || ''}`, 110, 41);
      doc.text(`Dirección: ${quote.client.address || 'No especificada'}`, 110, 46);
      doc.text(`Código Postal: ${quote.client.zip || 'No especificado'}`, 110, 51);
      
      if (quote.client.deliveryTime) {
        doc.text(`Tiempo de Entrega: ${quote.client.deliveryTime}`, 110, 56);
      }

      // 6. Calculate Totals using getQuoteTotals helper
      const { baseProductSubtotal, printSubtotal, shippingSubtotal, subtotal, iva, total } = getQuoteTotals(quote, activePrintPrices);

      // 7. Prepare Table Data
      const tableData = quote.items.map(item => {
        const estPrintPrice = item.isPersonalized ? (activePrintPrices[item.printOption] || 0) : 0;
        const baseProdPrice = item.unitPrice - estPrintPrice;
        
        const unitPrintPrice = item.isPersonalized
          ? (item.finalPrintPrice !== undefined && item.finalPrintPrice !== null ? item.finalPrintPrice : estPrintPrice)
          : 0;
          
        const itemShippingTotal = item.finalShippingPrice !== undefined && item.finalShippingPrice !== null ? item.finalShippingPrice : 0;
        const unitShippingPrice = item.quantity > 0 ? (itemShippingTotal / item.quantity) : 0;
        
        const itemSubtotal = (baseProdPrice + unitPrintPrice) * item.quantity + itemShippingTotal;

        const colorName = getColorName(item.color);
        const productoDesc = `${item.productName}\nColor: ${colorName}\nImpresión: ${item.printOption}`;

        return [
          "", // Col 0: Image
          item.sku,
          productoDesc,
          item.quantity.toString(),
          `$${baseProdPrice.toFixed(2)}`,
          `$${unitPrintPrice.toFixed(2)}`,
          `$${unitShippingPrice.toFixed(2)}`,
          `$${itemSubtotal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        ];
      });

      // 8. Draw Table
      autoTable(doc, {
        startY: 63,
        head: [['', 'SKU', 'Producto', 'Cant.', 'Precio Producto', 'Impresión', 'Envío', 'Subtotal']],
        body: tableData,
        headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [240, 248, 247] },
        styles: { font: 'helvetica', fontSize: 9, minCellHeight: 18, valign: 'middle' },
        columnStyles: {
          0: { cellWidth: 16 },
          1: { cellWidth: 20 },
          2: { cellWidth: 48 },
          3: { cellWidth: 14, halign: 'center' },
          4: { cellWidth: 22, halign: 'right' },
          5: { cellWidth: 22, halign: 'right' },
          6: { cellWidth: 18, halign: 'right' },
          7: { cellWidth: 22, halign: 'right' }
        },
        didDrawCell: (data) => {
          if (data.section === 'body' && data.column.index === 0) {
            const item = quote.items[data.row.index];
            if (item) {
              const imgEl = imgElements[item.id];
              if (imgEl) {
                const dim = 13;
                try {
                  let w = dim;
                  let h = dim;
                  const imgWidth = imgEl.naturalWidth || imgEl.width;
                  const imgHeight = imgEl.naturalHeight || imgEl.height;
                  if (imgWidth && imgHeight) {
                    const ratio = imgWidth / imgHeight;
                    if (ratio > 1) {
                      h = dim / ratio;
                    } else {
                      w = dim * ratio;
                    }
                  }
                  const posX = data.cell.x + (data.cell.width - w) / 2;
                  const posY = data.cell.y + (data.cell.height - h) / 2;
                  doc.addImage(imgEl, 'PNG', posX, posY, w, h);
                } catch (e) {
                  console.warn("Could not add image to PDF", e);
                }
              }
            }
          }
        }
      });

      // 9. Accounts summary below table
      const finalY = (doc as any).lastAutoTable.finalY || 65;
      const rightAlignX = 196; // 210 - 14 (margin)
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(50, 50, 50);
      
      let textY = finalY + 12;
      doc.text("Subtotal:", 140, textY);
      doc.text(`$${subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN`, rightAlignX, textY, { align: "right" });
      
      textY += 6;
      doc.text("IVA (16%):", 140, textY);
      doc.text(`$${iva.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN`, rightAlignX, textY, { align: "right" });
      
      textY += 7;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(11, 80, 77); // primaryColor
      doc.text("Total:", 140, textY);
      doc.text(`$${total.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN`, rightAlignX, textY, { align: "right" });

      // 10. Disclaimer notes
      let notesStartY = textY + 15;
      if (notesStartY > 240) {
        doc.addPage();
        notesStartY = 20;
      }
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text("Condiciones y Notas Aclaratorias:", 14, notesStartY);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(80, 80, 80);
      
      const disclaimerLines = [
        "Colores sujetos a disponibilidad al momento de confirmar el pedido.",
        "Condiciones de pago: 50% de anticipo para iniciar producción y 50% restante contra entrega.",
        "Los tiempos de entrega acordados comenzarán a correr una vez recibido el anticipo correspondiente.",
        "La presente cotización tiene una vigencia de 15 días naturales a partir de la fecha de emisión."
      ];
      
      disclaimerLines.forEach((line, index) => {
        doc.text(`• ${line}`, 14, notesStartY + 7 + (index * 5));
      });

      // 11. Custom mockup attachments (resized proportionally to avoid distortion)
      const itemsWithMockups = quote.items.filter(item => item.mockupImage || item.blueprintImage);
      if (itemsWithMockups.length > 0) {
        for (const item of itemsWithMockups) {
          doc.addPage();
          
          doc.setFillColor(...primaryColor);
          doc.rect(0, 0, 210, 20, "F");
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(14);
          doc.text(`Anexo: ${item.productName} (${item.sku})`, 14, 13);
          
          doc.setTextColor(0, 0, 0);
          doc.setFontSize(10);
          
          let currentY = 30;
          
          if (item.mockupImage) {
            doc.text("Vista Previa con Logo:", 14, currentY);
            try {
              const imgEl = await getImageElement(item.mockupImage);
              if (imgEl) {
                // Calculate proportional width/height
                let w = 80;
                let h = 80;
                if (imgEl.width && imgEl.height) {
                  const ratio = imgEl.width / imgEl.height;
                  if (ratio > 1) {
                    h = 80 / ratio;
                  } else {
                    w = 80 * ratio;
                  }
                }
                doc.addImage(imgEl, "PNG", 14, currentY + 5, w, h);
              }
            } catch(e) { console.error(e) }
          }
          
          if (item.blueprintImage) {
            const bpX = item.mockupImage ? 110 : 14;
            doc.text("Plano Mecánico:", bpX, currentY);
            try {
              const bpEl = await getImageElement(item.blueprintImage);
              if (bpEl) {
                // Calculate proportional width/height
                let w = 80;
                let h = 80;
                if (bpEl.width && bpEl.height) {
                  const ratio = bpEl.width / bpEl.height;
                  if (ratio > 1) {
                    h = 80 / ratio;
                  } else {
                    w = 80 * ratio;
                  }
                }
                doc.addImage(bpEl, "PNG", bpX, currentY + 5, w, h);
              }
            } catch(e) { console.error(e) }
          }
        }
      }

      // 12. Save PDF
      const pdfBlob = doc.output('blob');

      // Helper para descarga manual si falla el guardado automático local
      const triggerManualDownload = async () => {
        if ('showSaveFilePicker' in window) {
          const handle = await (window as any).showSaveFilePicker({
            suggestedName: `Cotizacion_${quote.id}.pdf`,
            types: [{ description: 'Documento PDF', accept: { 'application/pdf': ['.pdf'] } }],
          });
          const writable = await handle.createWritable();
          await writable.write(pdfBlob);
          await writable.close();
        } else {
          const url = URL.createObjectURL(pdfBlob);
          const a = document.createElement('a');
          a.style.display = 'none';
          a.href = url;
          a.setAttribute('download', `Cotizacion_${quote.id}.pdf`);
          document.body.appendChild(a);
          a.click();
          setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
        }
      };

      // Intentar auto-guardado en OneDrive
      try {
        const reader = new FileReader();
        reader.readAsDataURL(pdfBlob);
        reader.onloadend = async () => {
          try {
            const base64data = reader.result as string;
            const res = await fetch('/api/save-quote-pdf', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                pdfBase64: base64data,
                clientName: quote.client.company || quote.client.name || 'Sin_Nombre',
                quoteId: quote.id,
              }),
            });

            if (res.ok) {
              const data = await res.json();
              alert(`¡Cotización guardada automáticamente en tu OneDrive!\nArchivo: ${data.filePath.split('\\').pop()}`);
            } else {
              console.warn("API de guardado local falló, recurriendo a descarga manual.");
              await triggerManualDownload();
            }
          } catch (e) {
            console.error("Error en petición de auto-guardado, descargando manualmente:", e);
            await triggerManualDownload();
          }
        };
      } catch (err) {
        console.error("Error preparando auto-guardado, descargando manualmente:", err);
        await triggerManualDownload();
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') console.error("Error generating PDF:", err);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput || !passwordInput) {
      setLoginError("Ingresa tu correo y contraseña.");
      return;
    }
    setIsLoggingIn(true);
    setLoginError("");
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: emailInput,
        password: passwordInput,
      });
      if (error) {
        setLoginError(error.message === "Invalid login credentials" ? "Credenciales de acceso inválidas." : error.message);
      }
    } catch (err: any) {
      setLoginError("Error al iniciar sesión: " + err.message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 max-w-sm w-full">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="w-8 h-8 text-primary-700" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Acceso Restringido</h2>
            <p className="text-sm text-gray-500 mt-2">Inicia sesión como administrador para continuar.</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Correo Electrónico</label>
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="admin@geekystore.mx"
                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-primary-500 focus:border-primary-500"
                required
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Contraseña</label>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="••••••••"
                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-primary-500 focus:border-primary-500"
                required
              />
              {loginError && <p className="text-red-500 text-xs text-center mt-2 font-medium">{loginError}</p>}
            </div>
            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full bg-primary-700 hover:bg-primary-800 text-white rounded-lg py-2.5 font-bold transition-colors disabled:opacity-50 flex items-center justify-center"
            >
              {isLoggingIn ? "Iniciando sesión..." : "Acceder"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (!isLoaded || !settingsLoaded) {
    return (
      <div className="p-12 text-center text-gray-500 flex flex-col items-center justify-center gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-700"></div>
        <p className="font-medium text-gray-700">Cargando administrador...</p>
        <p className="text-xs text-gray-400">
          Productos: {isLoaded ? "✅ Listos" : "⏳ Cargando..."} | 
          Ajustes: {settingsLoaded ? "✅ Listos" : "⏳ Cargando..."}
        </p>
      </div>
    );
  }

  const filtered = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = (id: string) => {
    setDeleteConfirmId(id);
  };

  const confirmDelete = () => {
    if (deleteConfirmId) {
      deleteProduct(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  const openNewModal = () => {
    setEditingProduct({
      name: "",
      sku: "",
      category: categories[0] || "",
      cost: 0,
      price: 0,
      stock: 0,
      material: MATERIALS[0],
      description: "",
      seasons: [],
      images: [""],
      colors: [],
      isNew: false,
      featured: false,
      discount100: 0,
      discount150: 0,
      published: true,
      minPurchase: 50,
      discountQty1: 100,
      discountQty2: 150
    });
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct({ ...product });
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    
    const productToSave = {
      ...editingProduct
    } as Product;

    // Fix empty images fallback (maintain 5-index layout without shifting)
    let cleanedImages = [...(productToSave.images || [])];
    while (cleanedImages.length < 5) {
      cleanedImages.push("");
    }
    const hasAnyImage = cleanedImages.some(img => img.trim() !== "");
    if (!hasAnyImage) {
      cleanedImages[0] = "https://picsum.photos/seed/newprod/600/600";
    }
    productToSave.images = cleanedImages;

    if (isEditing && productToSave.id) {
      updateProduct(productToSave);
    } else {
      productToSave.id = `PROD-${Date.now()}`;
      addProduct(productToSave);
    }
    setIsModalOpen(false);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden relative">
      {/* Tabs */}
      <div className="flex border-b border-gray-200 bg-gray-50 px-6 pt-4 flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-wrap">
          <button 
            onClick={() => setActiveTab('products')}
            className={`px-6 py-3 font-bold text-sm border-b-2 transition-colors ${activeTab === 'products' ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >
            Productos
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={`px-6 py-3 font-bold text-sm border-b-2 transition-colors ${activeTab === 'settings' ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >
            Ajustes / Catálogos
          </button>
          <button 
            onClick={() => setActiveTab('suppliers')}
            className={`px-6 py-3 font-bold text-sm border-b-2 transition-colors ${activeTab === 'suppliers' ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >
            Proveedores
          </button>
          <button 
            onClick={() => setActiveTab('home')}
            className={`px-6 py-3 font-bold text-sm border-b-2 transition-colors ${activeTab === 'home' ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >
            Página de Inicio
          </button>
          <button 
            onClick={() => setActiveTab('quotes')}
            className={`px-6 py-3 font-bold text-sm border-b-2 transition-colors ${activeTab === 'quotes' ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >
            Cotizaciones
          </button>
          <button 
            onClick={() => setActiveTab('agent')}
            className={`px-6 py-3 font-bold text-sm border-b-2 transition-colors ${activeTab === 'agent' ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >
            Inteligencia IA
          </button>
          <button 
            onClick={() => setActiveTab('b2b-agent')}
            className={`px-6 py-3 font-bold text-sm border-b-2 transition-colors ${activeTab === 'b2b-agent' ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >
            Agente B2B
          </button>
        </div>
        <button
          onClick={async () => {
            await supabase.auth.signOut();
          }}
          className="text-xs bg-red-50 hover:bg-red-100 text-red-700 font-bold px-3 py-1.5 rounded-lg border border-red-200/60 transition-colors flex items-center gap-1.5 mb-2 self-end sm:self-auto"
        >
          Cerrar Sesión
        </button>
      </div>

      {activeTab === 'products' && (
        <>
      {/* Top Bar */}
      <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="relative w-full sm:w-96">
          <input 
            type="text" 
            placeholder="Buscar por nombre o SKU..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block p-2.5 pl-10"
          />
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
        </div>
        <button 
          onClick={openNewModal}
          className="w-full sm:w-auto bg-primary-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-primary-700 transition-colors flex items-center justify-center"
        >
          <Plus className="w-5 h-5 mr-2" />
          Nuevo Producto
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto min-h-[400px]">
        <table className="w-full text-sm text-left text-gray-500">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-100">
            <tr>
              <th scope="col" className="px-6 py-4">Producto</th>
              <th scope="col" className="px-6 py-4">SKU</th>
              <th scope="col" className="px-6 py-4">Categoría</th>
              <th scope="col" className="px-6 py-4 text-right">Costo</th>
              <th scope="col" className="px-6 py-4 text-right">Precio Base</th>
              <th scope="col" className="px-6 py-4 text-right">Stock Total</th>
              <th scope="col" className="px-6 py-4 text-center">Publicado</th>
              <th scope="col" className="px-6 py-4 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(product => (
              <tr key={product.id} className="bg-white border-b hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap flex items-center gap-3">
                  <div className="w-10 h-10 rounded overflow-hidden bg-gray-100 flex-shrink-0">
                    <img src={product.images?.find(img => !!img) || "https://images.unsplash.com/photo-1505740420928-5e560c06d30e"} alt={product.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex flex-col">
                    <span className="truncate max-w-[200px] block font-bold" title={product.name}>{product.name}</span>
                    <span className="text-xs text-gray-400">
                      {product.colors?.length || 0} colores
                      {(() => {
                        const assoc = homeSettings?.product_supplier_map?.[product.id];
                        const s = productSuppliers.find(ps => ps.id === assoc?.supplierId);
                        return s ? ` • Prov: ${s.name}` : '';
                      })()}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">{product.sku}</td>
                <td className="px-6 py-4">
                  <span className="bg-primary-50 text-primary-700 text-xs font-semibold px-2.5 py-0.5 rounded">
                    {product.category}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  {typeof product.cost === 'number' ? `$${product.cost.toFixed(2)}` : "-"}
                </td>
                <td className="px-6 py-4 text-right font-medium text-gray-900">
                  ${product.price.toFixed(2)}
                </td>
                <td className="px-6 py-4 text-right">
                  <span className={`${product.stock < 500 ? 'text-red-600' : 'text-green-600'} font-semibold`}>
                    {product.stock.toLocaleString()}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <input
                    type="checkbox"
                    checked={product.published !== false}
                    onChange={(e) => {
                      updateProduct({
                        ...product,
                        published: e.target.checked
                      });
                    }}
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500 cursor-pointer"
                  />
                </td>
                <td className="px-6 py-4 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <button onClick={() => openEditModal(product)} className="text-gray-400 hover:text-primary-600 transition-colors p-1" title="Editar">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(product.id)} className="text-gray-400 hover:text-red-600 transition-colors p-1" title="Eliminar">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                  No se encontraron productos con ese término de búsqueda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="p-4 border-t border-gray-100 bg-gray-50 text-xs text-gray-500 text-center">
        Total en catálogo: {products.length} productos
      </div>

      </>
      )}

      {activeTab === 'settings' && (
        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Categories */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-6">Categorías de Producto</h3>
            <div className="flex gap-2 mb-6">
              <input 
                type="text" 
                value={newCategory}
                onChange={e => setNewCategory(e.target.value)}
                placeholder="Nueva categoría..."
                className="flex-1 bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block p-2.5"
                onKeyDown={e => {
                  if (e.key === 'Enter' && newCategory.trim()) {
                    addCategory(newCategory.trim());
                    setNewCategory("");
                  }
                }}
              />
              <button 
                onClick={() => {
                  if (newCategory.trim()) {
                    addCategory(newCategory.trim());
                    setNewCategory("");
                  }
                }}
                className="bg-primary-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-primary-700 transition-colors flex items-center justify-center"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
            <ul className="space-y-2">
              {categories.map((cat, idx) => (
                <li key={cat} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-100 hover:bg-gray-100/50 transition-colors duration-200 group">
                  <span className="font-medium text-gray-700">{cat}</span>
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
                    <div className="h-4 w-[1px] bg-gray-250 mx-1"></div>
                    <button onClick={() => removeCategory(cat)} className="text-gray-400 hover:text-red-600 transition-colors p-1" title="Eliminar">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </li>
              ))}
              {categories.length === 0 && <li className="text-gray-500 text-sm italic">No hay categorías.</li>}
            </ul>
          </div>

          {/* Seasons */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-6">Temporadas</h3>
            <div className="flex gap-2 mb-6">
              <input 
                type="text" 
                value={newSeason}
                onChange={e => setNewSeason(e.target.value)}
                placeholder="Nueva temporada..."
                className="flex-1 bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block p-2.5"
                onKeyDown={e => {
                  if (e.key === 'Enter' && newSeason.trim()) {
                    addSeason(newSeason.trim());
                    setNewSeason("");
                  }
                }}
              />
              <button 
                onClick={() => {
                  if (newSeason.trim()) {
                    addSeason(newSeason.trim());
                    setNewSeason("");
                  }
                }}
                className="bg-primary-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-primary-700 transition-colors flex items-center justify-center"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
            <ul className="space-y-2">
              {seasons.map((sea, idx) => (
                <li key={sea} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-100 hover:bg-gray-100/50 transition-colors duration-200 group">
                  <span className="font-medium text-gray-700">{sea}</span>
                  <div className="flex items-center gap-1">
                    <button 
                      type="button"
                      disabled={idx === 0}
                      onClick={() => moveSeason(idx, 'up')}
                      className="text-gray-400 hover:text-primary-600 disabled:opacity-30 disabled:hover:text-gray-400 transition-colors p-1" 
                      title="Mover arriba"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button 
                      type="button"
                      disabled={idx === seasons.length - 1}
                      onClick={() => moveSeason(idx, 'down')}
                      className="text-gray-400 hover:text-primary-600 disabled:opacity-30 disabled:hover:text-gray-400 transition-colors p-1" 
                      title="Mover abajo"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    <div className="h-4 w-[1px] bg-gray-250 mx-1"></div>
                    <button onClick={() => removeSeason(sea)} className="text-gray-400 hover:text-red-600 transition-colors p-1" title="Eliminar">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </li>
              ))}
              {seasons.length === 0 && <li className="text-gray-500 text-sm italic">No hay temporadas.</li>}
            </ul>
          </div>

          {/* Featured Season */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:col-span-2">
            <h3 className="text-lg font-bold text-gray-900 mb-6">Temporada Destacada en Menú Superior</h3>
            <div className="flex gap-4 items-center">
              <label className="text-sm font-medium text-gray-700">Seleccionar Temporada:</label>
              <select 
                value={featuredSeason || "none"}
                onChange={e => updateFeaturedSeason(e.target.value === "none" ? null : e.target.value)}
                className="bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block p-2.5 min-w-[200px]"
              >
                <option value="none">Ninguna (Ocultar botón)</option>
                {seasons.map(sea => (
                  <option key={sea} value={sea}>{sea}</option>
                ))}
              </select>
              {featuredSeason && (
                <span className="text-sm text-gray-500 ml-4 flex items-center">
                  Previsualización: <span className="text-red-500 font-medium ml-2">⭐ Especial {featuredSeason}</span>
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-3">Esta temporada aparecerá como un acceso directo destacado en la barra superior de la tienda.</p>
          </div>
        </div>
      )}

      {activeTab === 'home' && homeSettings && (
        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Hero Banner Form */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:col-span-2">
            <h3 className="text-lg font-bold text-gray-900 mb-6">Banner Principal (Hero)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Etiqueta Superior</label>
                <input type="text" value={homeSettings.hero.label} onChange={e => updateHomeSettings({...homeSettings, hero: {...homeSettings.hero, label: e.target.value}})} className="w-full border border-gray-300 rounded-lg p-2.5" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Imagen de Fondo (Sube un archivo)</label>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setUploadingImage('hero');
                    const publicUrl = await uploadImage(file);
                    if (publicUrl) {
                      updateHomeSettings({...homeSettings, hero: {...homeSettings.hero, bgImage: publicUrl}});
                    } else {
                      alert("Error subiendo la imagen.");
                    }
                    setUploadingImage(null);
                  }} 
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100" 
                />
                {uploadingImage === 'hero' && <p className="text-xs text-blue-500 mt-1 font-bold animate-pulse">Subiendo imagen...</p>}
                {homeSettings.hero.bgImage && (
                   <img src={homeSettings.hero.bgImage} className="mt-2 h-16 w-32 object-cover rounded shadow" alt="Hero Preview" />
                )}
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Título Principal (Texto Blanco)</label>
                <input type="text" value={homeSettings.hero.titleMain} onChange={e => updateHomeSettings({...homeSettings, hero: {...homeSettings.hero, titleMain: e.target.value}})} className="w-full border border-gray-300 rounded-lg p-2.5" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Título Destacado (Texto Gradiente)</label>
                <input type="text" value={homeSettings.hero.titleHighlight} onChange={e => updateHomeSettings({...homeSettings, hero: {...homeSettings.hero, titleHighlight: e.target.value}})} className="w-full border border-gray-300 rounded-lg p-2.5" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-gray-700 mb-2">Descripción</label>
                <textarea rows={2} value={homeSettings.hero.description} onChange={e => updateHomeSettings({...homeSettings, hero: {...homeSettings.hero, description: e.target.value}})} className="w-full border border-gray-300 rounded-lg p-2.5"></textarea>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Botón Primario</label>
                <input type="text" value={homeSettings.hero.ctaPrimary} onChange={e => updateHomeSettings({...homeSettings, hero: {...homeSettings.hero, ctaPrimary: e.target.value}})} className="w-full border border-gray-300 rounded-lg p-2.5" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Botón Secundario</label>
                <input type="text" value={homeSettings.hero.ctaSecondary} onChange={e => updateHomeSettings({...homeSettings, hero: {...homeSettings.hero, ctaSecondary: e.target.value}})} className="w-full border border-gray-300 rounded-lg p-2.5" />
              </div>
            </div>
          </div>

          {/* CTA Banner Form */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:col-span-2">
            <h3 className="text-lg font-bold text-gray-900 mb-6">Banner Inferior (Llamado a la acción)</h3>
            <div className="grid grid-cols-1 gap-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Título Principal</label>
                <input type="text" value={homeSettings.cta?.title || ""} onChange={e => updateHomeSettings({...homeSettings, cta: {...homeSettings.cta, title: e.target.value}})} className="w-full border border-gray-300 rounded-lg p-2.5" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Descripción</label>
                <textarea rows={2} value={homeSettings.cta?.description || ""} onChange={e => updateHomeSettings({...homeSettings, cta: {...homeSettings.cta, description: e.target.value}})} className="w-full border border-gray-300 rounded-lg p-2.5"></textarea>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Texto del Botón</label>
                <input type="text" value={homeSettings.cta?.buttonText || ""} onChange={e => updateHomeSettings({...homeSettings, cta: {...homeSettings.cta, buttonText: e.target.value}})} className="w-full border border-gray-300 rounded-lg p-2.5" />
              </div>
            </div>
          </div>

          {/* Campaigns */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:col-span-2">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Tarjetas de Campañas</h3>
            <p className="text-sm text-gray-500 mb-6">Aquí puedes configurar las imágenes y colores de las primeras 3 temporadas activas en tus Ajustes.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[0, 1, 2].map((idx) => {
                const seasonName = seasons[idx];
                if (!seasonName) return null;
                const campaignConfig = homeSettings.campaigns[idx] || { img: "", color: GRADIENT_OPTIONS[0].value };
                
                return (
                  <div key={idx} className="border border-gray-200 rounded-xl p-4 bg-gray-50">
                    <h4 className="font-bold text-primary-700 mb-4 pb-2 border-b border-gray-200">{seasonName}</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Imagen (Sube un archivo)</label>
                        <input 
                          type="file" 
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            setUploadingImage(`camp_${idx}`);
                            const publicUrl = await uploadImage(file);
                            if (publicUrl) {
                              const newCampaigns = [...homeSettings.campaigns];
                              newCampaigns[idx] = { ...campaignConfig, img: publicUrl };
                              updateHomeSettings({ ...homeSettings, campaigns: newCampaigns });
                            } else {
                              alert("Error subiendo la imagen.");
                            }
                            setUploadingImage(null);
                          }} 
                          className="w-full border border-gray-300 rounded-md p-1.5 text-sm file:mr-2 file:py-1 file:px-2 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100" 
                        />
                        {uploadingImage === `camp_${idx}` && <p className="text-xs text-blue-500 mt-1 font-bold animate-pulse">Subiendo...</p>}
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Tinte de Color</label>
                        <select 
                          value={campaignConfig.color}
                          onChange={e => {
                            const newCampaigns = [...homeSettings.campaigns];
                            newCampaigns[idx] = { ...campaignConfig, color: e.target.value };
                            updateHomeSettings({ ...homeSettings, campaigns: newCampaigns });
                          }}
                          className="w-full border border-gray-300 rounded-md p-2 text-sm"
                        >
                          {GRADIENT_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="h-20 rounded-lg relative overflow-hidden mt-2">
                        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('${campaignConfig.img}')` }}></div>
                        <div className={`absolute inset-0 bg-gradient-to-t ${campaignConfig.color}`}></div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'quotes' && (
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">Historial de Cotizaciones B2B</h2>
          </div>
          
          <div className="overflow-x-auto min-h-[400px]">
            <table className="w-full text-sm text-left text-gray-500">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-100">
                <tr>
                  <th scope="col" className="px-6 py-4">ID / Fecha</th>
                  <th scope="col" className="px-6 py-4">Cliente</th>
                  <th scope="col" className="px-6 py-4 text-center">Artículos</th>
                  <th scope="col" className="px-6 py-4 text-right">Total Estimado</th>
                  <th scope="col" className="px-6 py-4 text-center">Estado</th>
                  <th scope="col" className="px-6 py-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {quotes.map(quote => (
                  <tr key={quote.id} className="bg-white border-b hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900">{quote.id}</div>
                      <div className="text-xs text-gray-400">{new Date(quote.date).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short', hour12: false })}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900">{quote.client.company}</div>
                      <div className="text-xs text-gray-500">{quote.client.name}</div>
                    </td>
                    <td className="px-6 py-4 text-center font-medium">
                      {quote.items.length}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-gray-900">
                      ${quote.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <select 
                        value={quote.status}
                        onChange={(e) => updateQuoteStatus(quote.id, e.target.value as any)}
                        className={`text-xs font-bold rounded px-2 py-1 border-0 focus:ring-2 ${
                          quote.status === 'completed' ? 'bg-green-100 text-green-800' :
                          quote.status === 'reviewed' ? 'bg-blue-100 text-blue-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        <option value="pending">Pendiente</option>
                        <option value="reviewed">En Revisión</option>
                        <option value="completed">Completada</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-3">
                        <button onClick={() => setViewingQuote(quote)} className="text-gray-400 hover:text-primary-600 transition-colors" title="Ver Detalles">
                          <Eye className="w-5 h-5" />
                        </button>
                        <button onClick={() => deleteQuote(quote.id)} className="text-gray-400 hover:text-red-600 transition-colors" title="Eliminar">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {quotes.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      No hay cotizaciones solicitadas.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'agent' && (
        <AgentIntegrationView />
      )}

      {activeTab === 'b2b-agent' && (
        <B2BAgentCRM />
      )}

      {activeTab === 'suppliers' && (
        <div className="p-6 space-y-8 animate-in fade-in duration-300">
          <div className="bg-[#0f766e] rounded-2xl p-6 text-white shadow-md flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-2xl font-black">Gestión de Proveedores y Tarifas</h2>
              <p className="text-primary-100 text-sm mt-1">Control de costos de impresión, proveedores de producto y vinculación de catálogo.</p>
            </div>
            <div className="flex gap-2 bg-primary-900/40 p-1.5 rounded-xl border border-white/10">
              <button 
                onClick={() => setSupplierTab('print')} 
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${supplierTab === 'print' ? 'bg-white text-primary-850 shadow-sm' : 'text-white hover:bg-white/10'}`}
              >
                Imprentas / Impresión
              </button>
              <button 
                onClick={() => setSupplierTab('product')} 
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${supplierTab === 'product' ? 'bg-white text-primary-850 shadow-sm' : 'text-white hover:bg-white/10'}`}
              >
                Proveedores de Producto
              </button>
            </div>
          </div>

          {supplierTab === 'print' ? (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              {/* Form Col */}
              <div className="xl:col-span-1 space-y-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <Plus className="w-5 h-5 text-primary-600" />
                    {editingPrintSupplierId ? "Editar Proveedor de Impresión" : "Nuevo Proveedor de Impresión"}
                  </h3>
                  <form onSubmit={handleSavePrintSupplier} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Nombre del Proveedor *</label>
                      <input 
                        type="text" 
                        required 
                        placeholder="Ej. Impresiones Monterrey" 
                        value={printForm.name} 
                        onChange={e => setPrintForm({...printForm, name: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-gray-50 focus:bg-white focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Contacto</label>
                        <input 
                          type="text" 
                          placeholder="Ej. Ing. Carlos" 
                          value={printForm.contact} 
                          onChange={e => setPrintForm({...printForm, contact: e.target.value})}
                          className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-gray-50 focus:bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Dirección</label>
                        <input 
                          type="text" 
                          placeholder="Ej. Calle Juárez #10" 
                          value={printForm.address} 
                          onChange={e => setPrintForm({...printForm, address: e.target.value})}
                          className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-gray-50 focus:bg-white"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Teléfono 1</label>
                        <input 
                          type="text" 
                          placeholder="Ej. 8112345678" 
                          value={printForm.phone1} 
                          onChange={e => setPrintForm({...printForm, phone1: e.target.value})}
                          className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-gray-55 focus:bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Teléfono 2</label>
                        <input 
                          type="text" 
                          placeholder="Ej. 8118765432" 
                          value={printForm.phone2} 
                          onChange={e => setPrintForm({...printForm, phone2: e.target.value})}
                          className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-gray-55 focus:bg-white"
                        />
                      </div>
                    </div>

                    <h4 className="font-bold text-xs text-gray-400 uppercase tracking-wider pt-4 border-t border-gray-150 mb-2">Costos de Técnicas de Impresión ($)</h4>
                    
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block font-bold text-gray-600 mb-1">Grabado Chico</label>
                        <input type="number" step="0.01" value={printForm.grabado_chico} onChange={e => setPrintForm({...printForm, grabado_chico: parseFloat(e.target.value) || 0})} className="w-full border border-gray-300 rounded p-1.5 bg-gray-50" />
                      </div>
                      <div>
                        <label className="block font-bold text-gray-600 mb-1">Grabado Grande</label>
                        <input type="number" step="0.01" value={printForm.grabado_grande} onChange={e => setPrintForm({...printForm, grabado_grande: parseFloat(e.target.value) || 0})} className="w-full border border-gray-300 rounded p-1.5 bg-gray-50" />
                      </div>
                      <div>
                        <label className="block font-bold text-gray-600 mb-1">DTF</label>
                        <input type="number" step="0.01" value={printForm.dtf} onChange={e => setPrintForm({...printForm, dtf: parseFloat(e.target.value) || 0})} className="w-full border border-gray-300 rounded p-1.5 bg-gray-50" />
                      </div>
                      <div>
                        <label className="block font-bold text-gray-600 mb-1">Seri 1 Tinta</label>
                        <input type="number" step="0.01" value={printForm.seri_1_tinta} onChange={e => setPrintForm({...printForm, seri_1_tinta: parseFloat(e.target.value) || 0})} className="w-full border border-gray-300 rounded p-1.5 bg-gray-50" />
                      </div>
                      <div>
                        <label className="block font-bold text-gray-600 mb-1">Seri 2 Tintas</label>
                        <input type="number" step="0.01" value={printForm.seri_2_tintas} onChange={e => setPrintForm({...printForm, seri_2_tintas: parseFloat(e.target.value) || 0})} className="w-full border border-gray-300 rounded p-1.5 bg-gray-50" />
                      </div>
                      <div>
                        <label className="block font-bold text-gray-600 mb-1">Seri 3 Tintas</label>
                        <input type="number" step="0.01" value={printForm.seri_3_tintas} onChange={e => setPrintForm({...printForm, seri_3_tintas: parseFloat(e.target.value) || 0})} className="w-full border border-gray-300 rounded p-1.5 bg-gray-50" />
                      </div>
                      <div className="col-span-2">
                        <label className="block font-bold text-gray-600 mb-1">Seri 4 Tintas</label>
                        <input type="number" step="0.01" value={printForm.seri_4_tintas} onChange={e => setPrintForm({...printForm, grabado_grande: 0, dtf: 0, seri_4_tintas: parseFloat(e.target.value) || 0})} className="w-full border border-gray-300 rounded p-1.5 bg-gray-50" />
                      </div>
                    </div>

                    <div className="flex gap-3 pt-6">
                      <button 
                        type="submit" 
                        className="flex-1 bg-primary-600 text-white font-bold py-2.5 px-4 rounded-lg shadow-sm hover:bg-primary-700 transition-colors text-sm"
                      >
                        {editingPrintSupplierId ? "Guardar Cambios" : "Agregar Proveedor"}
                      </button>
                      {editingPrintSupplierId && (
                        <button 
                          type="button" 
                          onClick={() => {
                            setEditingPrintSupplierId(null);
                            setPrintForm({
                              name: "", contact: "", phone1: "", phone2: "", address: "",
                              grabado_chico: 0, grabado_grande: 0, dtf: 0,
                              seri_1_tinta: 0, seri_2_tintas: 0, seri_3_tintas: 0, seri_4_tintas: 0
                            });
                          }}
                          className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700 font-bold hover:bg-gray-50"
                        >
                          Cancelar
                        </button>
                      )}
                    </div>
                  </form>
                </div>
              </div>

              {/* Suppliers List Col */}
              <div className="xl:col-span-2 space-y-6">
                {/* Sync Card */}
                {printSuppliers.length > 0 && (
                  <div className="bg-primary-50 rounded-xl border border-primary-200 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="text-left">
                      <h3 className="font-bold text-primary-900 text-base">Sincronización Tarifaria B2B</h3>
                      <p className="text-primary-700 text-xs mt-0.5">Analiza y sincroniza las tarifas cobradas al cliente con el precio más competitivo del mercado.</p>
                    </div>
                    <button 
                      onClick={handleSyncPrintPrices}
                      className="bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold py-2.5 px-4 rounded-lg shadow-sm transition-colors flex items-center"
                    >
                      <CheckCircle className="w-4 h-4 mr-1.5" />
                      Sincronizar Costos B2B al Más Bajo
                    </button>
                  </div>
                )}

                {/* Print Suppliers Grid */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-gray-900">Directorio de Proveedores de Impresión</h3>
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{printSuppliers.length} registrados</span>
                  </div>
                  {printSuppliers.length === 0 ? (
                    <div className="p-12 text-center text-gray-400 text-sm">No hay proveedores de impresión registrados. Agrega uno a la izquierda.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left text-gray-500">
                        <thead className="text-[10px] text-gray-700 uppercase bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="px-4 py-3 font-bold">Proveedor</th>
                            <th className="px-3 py-3 font-bold text-center">G. Chico</th>
                            <th className="px-3 py-3 font-bold text-center">G. Grande</th>
                            <th className="px-3 py-3 font-bold text-center">DTF</th>
                            <th className="px-3 py-3 font-bold text-center">Seri 1 T</th>
                            <th className="px-3 py-3 font-bold text-center">Seri 2 T</th>
                            <th className="px-3 py-3 font-bold text-center">Seri 3 T</th>
                            <th className="px-3 py-3 font-bold text-center">Seri 4 T</th>
                            <th className="px-4 py-3 font-bold text-center">Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {printSuppliers.map((supplier: any) => (
                            <tr key={supplier.id} className="bg-white border-b hover:bg-gray-50/50">
                              <td className="px-4 py-3 font-bold text-gray-900">
                                <div>{supplier.name}</div>
                                <div className="text-[9px] text-gray-450 font-normal">Cont: {supplier.contact || '-'} | Tel: {supplier.phone1 || '-'}</div>
                              </td>
                              {printTechniques.map(tech => {
                                const price = Number(supplier[tech.key]) || 0;
                                const isMin = price === minPrices[tech.key] && printSuppliers.length > 1;
                                const isMax = price === maxPrices[tech.key] && printSuppliers.length > 1;
                                return (
                                  <td key={tech.key} className="px-3 py-3 text-center">
                                    <span className={isMin ? 'bg-green-100 text-green-800 font-bold px-1.5 py-0.5 rounded border border-green-200' : isMax ? 'bg-red-100 text-red-800 font-bold px-1.5 py-0.5 rounded border border-red-200' : 'text-gray-900'}>
                                      ${price.toFixed(2)}
                                    </span>
                                  </td>
                                );
                              })}
                              <td className="px-4 py-3 text-center">
                                <div className="flex gap-2 justify-center">
                                  <button onClick={() => handleEditPrintSupplier(supplier)} className="text-primary-600 hover:text-primary-800" title="Editar"><Edit className="w-4 h-4" /></button>
                                  <button onClick={() => handleDeletePrintSupplier(supplier.id)} className="text-red-500 hover:text-red-700" title="Eliminar"><Trash2 className="w-4 h-4" /></button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* B2B Live comparison reference panel */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-250 p-6">
                  <h3 className="font-bold text-gray-900 mb-4 border-b pb-2">Referencia de Costos de Cotización B2B</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {printTechniques.map(tech => {
                      const mapping: Record<string, string> = {
                        'grabado_chico': 'Grabado Chico',
                        'grabado_grande': 'Grabado Grande',
                        'dtf': 'DTF',
                        'seri_1_tinta': 'Impresión 1 tinta',
                        'seri_2_tintas': 'Impresión 2 tintas',
                        'seri_3_tintas': 'Impresión 3 tintas',
                        'seri_4_tintas': 'Impresión 4 tintas'
                      };
                      const b2bName = mapping[tech.key];
                      const b2bPrice = activePrintPrices[b2bName] || 0;
                      const bestPrice = minPrices[tech.key] || 0;
                      const bestSupplier = printSuppliers.find(s => Number(s[tech.key]) === bestPrice);

                      return (
                        <div key={tech.key} className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                          <span className="text-[10px] text-gray-500 font-bold block uppercase">{tech.name}</span>
                          <div className="flex justify-between items-baseline mt-1">
                            <span className="text-xs text-gray-700">B2B: <strong>${b2bPrice}</strong></span>
                            <span className="text-xs text-green-750 font-bold">Mín: ${bestPrice}</span>
                          </div>
                          {bestSupplier && (
                            <span className="text-[9px] text-gray-400 block mt-1 truncate">Mín: {bestSupplier.name}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              {/* Product Supplier Forms */}
              <div className="xl:col-span-1 space-y-6">
                {/* CRUD Form */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-250 p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <Plus className="w-5 h-5 text-primary-600" />
                    {editingProductSupplierId ? "Editar Proveedor de Producto" : "Nuevo Proveedor de Producto"}
                  </h3>
                  <form onSubmit={handleSaveProductSupplier} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Nombre del Proveedor *</label>
                      <input 
                        type="text" 
                        required 
                        placeholder="Ej. Promocionales de Occidente" 
                        value={productForm.name} 
                        onChange={e => setProductForm({...productForm, name: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-gray-50 focus:bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Contacto</label>
                      <input 
                        type="text" 
                        placeholder="Ej. Lic. Fernando" 
                        value={productForm.contact} 
                        onChange={e => setProductForm({...productForm, contact: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-gray-55 focus:bg-white"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Teléfono 1</label>
                        <input 
                          type="text" 
                          placeholder="Ej. 3312345678" 
                          value={productForm.phone1} 
                          onChange={e => setProductForm({...productForm, phone1: e.target.value})}
                          className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-gray-55 focus:bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Teléfono 2</label>
                        <input 
                          type="text" 
                          placeholder="Ej. 3318765432" 
                          value={productForm.phone2} 
                          onChange={e => setProductForm({...productForm, phone2: e.target.value})}
                          className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-gray-55 focus:bg-white"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Domicilio</label>
                      <input 
                        type="text" 
                        placeholder="Ej. Av. Vallarta #100" 
                        value={productForm.address} 
                        onChange={e => setProductForm({...productForm, address: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-gray-55 focus:bg-white"
                      />
                    </div>

                    <div className="flex gap-3 pt-4">
                      <button type="submit" className="flex-1 bg-primary-600 text-white font-bold py-2.5 px-4 rounded-lg shadow-sm hover:bg-primary-700 text-sm">
                        {editingProductSupplierId ? "Guardar Cambios" : "Agregar Proveedor"}
                      </button>
                      {editingProductSupplierId && (
                        <button 
                          type="button" 
                          onClick={() => {
                            setEditingProductSupplierId(null);
                            setProductForm({ name: "", contact: "", phone1: "", phone2: "", address: "" });
                          }}
                          className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700 font-bold hover:bg-gray-50"
                        >
                          Cancelar
                        </button>
                      )}
                    </div>
                  </form>
                </div>

                {/* Association Form */}
                {productSuppliers.length > 0 && products.length > 0 && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-250 p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                      <Plus className="w-5 h-5 text-primary-600" />
                      Asociar Producto a Proveedor
                    </h3>
                    <form onSubmit={handleSaveProductAssociation} className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Proveedor de Producto</label>
                        <select 
                          required 
                          value={selectedAssocSupplierId} 
                          onChange={e => setSelectedAssocSupplierId(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-white"
                        >
                          <option value="" disabled>Selecciona un proveedor...</option>
                          {productSuppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Producto del Catálogo</label>
                        <select 
                          required 
                          value={selectedAssocProductId} 
                          onChange={e => {
                            setSelectedAssocProductId(e.target.value);
                            const p = products.find(prod => prod.id === e.target.value);
                            if (p) {
                              setAssocPrice(p.cost || 0);
                              setAssocPiecesPerBox(p.minPurchase || 50);
                            }
                          }}
                          className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-white"
                        >
                          <option value="" disabled>Selecciona un producto...</option>
                          {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-750 uppercase mb-1">Costo Proveedor ($)</label>
                          <input 
                            type="number" 
                            step="0.01" 
                            min="0" 
                            value={assocPrice} 
                            onChange={e => setAssocPrice(parseFloat(e.target.value) || 0)}
                            className="w-full border border-gray-300 rounded-lg p-2.5 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-750 uppercase mb-1">Piezas por Caja</label>
                          <input 
                            type="number" 
                            min="1" 
                            value={assocPiecesPerBox} 
                            onChange={e => setAssocPiecesPerBox(parseInt(e.target.value) || 1)}
                            className="w-full border border-gray-300 rounded-lg p-2.5 text-sm"
                          />
                        </div>
                      </div>
                      <button type="submit" className="w-full bg-primary-600 text-white font-bold py-2.5 px-4 rounded-lg shadow-sm hover:bg-primary-700 text-sm mt-2">
                        Vincular y Actualizar Producto
                      </button>
                    </form>
                  </div>
                )}
              </div>

              {/* Product Supplier List & Directory */}
              <div className="xl:col-span-2 space-y-6">
                {/* Product Suppliers Directory */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-gray-900">Directorio de Proveedores de Producto</h3>
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{productSuppliers.length} registrados</span>
                  </div>
                  {productSuppliers.length === 0 ? (
                    <div className="p-12 text-center text-gray-400 text-sm">No hay proveedores de producto registrados. Agrega uno a la izquierda.</div>
                  ) : (
                    <div className="divide-y divide-gray-100 text-xs">
                      {productSuppliers.map((supplier: any) => (
                        <div key={supplier.id} className="p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white hover:bg-gray-50/50 transition-colors">
                          <div className="text-left space-y-1">
                            <h4 className="font-bold text-gray-900 text-sm">{supplier.name}</h4>
                            <div className="text-xs text-gray-500 space-y-0.5">
                              <div>Contacto: <strong className="text-gray-700">{supplier.contact || '-'}</strong></div>
                              <div>Tel: <span className="font-mono">{supplier.phone1 || '-'}</span> {supplier.phone2 ? " / " + supplier.phone2 : ""}</div>
                              <div>Domicilio: <span>{supplier.address || '-'}</span></div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => handleEditProductSupplier(supplier)} className="px-3 py-1.5 text-xs border border-gray-200 rounded font-bold hover:bg-gray-50 flex items-center text-gray-700" title="Editar"><Edit className="w-3.5 h-3.5 mr-1" /> Editar</button>
                            <button onClick={() => handleDeleteProductSupplier(supplier.id)} className="px-3 py-1.5 text-xs bg-red-50 border border-red-200 text-red-600 rounded font-bold hover:bg-red-100 flex items-center" title="Eliminar"><Trash2 className="w-3.5 h-3.5 mr-1" /> Borrar</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Linked Products Table with search and filter */}
                {productSuppliers.length > 0 && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gray-50">
                      <div>
                        <h3 className="font-bold text-gray-900">Productos Vinculados</h3>
                        <p className="text-xs text-gray-400">Listado de productos del catálogo y sus costos de proveedor asignados.</p>
                      </div>
                      <div className="flex flex-wrap gap-2 w-full md:w-auto">
                        <input 
                          type="text" 
                          placeholder="Buscar por nombre/SKU..." 
                          value={productSupplierSearch}
                          onChange={e => setProductSupplierSearch(e.target.value)}
                          className="border border-gray-300 rounded p-1.5 text-xs bg-white flex-1 md:flex-none w-36"
                        />
                        <select 
                          value={filterSupplierId} 
                          onChange={e => setFilterSupplierId(e.target.value)}
                          className="border border-gray-300 rounded p-1.5 text-xs bg-white w-40"
                        >
                          <option value="all">Todos los proveedores</option>
                          {productSuppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                      </div>
                    </div>

                    {(() => {
                      const associations = homeSettings?.product_supplier_map || {};
                      const assocList = Object.keys(associations).map(prodId => {
                        const prod = products.find(p => p.id === prodId);
                        const assoc = associations[prodId];
                        const supplier = productSuppliers.find(s => s.id === assoc.supplierId);
                        return {
                          productId: prodId,
                          product: prod,
                          supplierId: assoc.supplierId,
                          supplierName: supplier ? supplier.name : 'Desconocido',
                          price: assoc.price,
                          piecesPerBox: assoc.piecesPerBox
                        };
                      }).filter(item => {
                        if (!item.product) return false;
                        const matchSearch = item.product.name.toLowerCase().includes(productSupplierSearch.toLowerCase()) || item.product.sku.toLowerCase().includes(productSupplierSearch.toLowerCase());
                        const matchSupplier = filterSupplierId === 'all' || item.supplierId === filterSupplierId;
                        return matchSearch && matchSupplier;
                      });

                      if (assocList.length === 0) {
                        return <div className="p-12 text-center text-gray-400 text-sm">No hay productos vinculados que coincidan con la búsqueda.</div>;
                      }

                      return (
                        <div className="overflow-x-auto text-xs">
                          <table className="w-full text-xs text-left text-gray-500">
                            <thead className="text-[10px] text-gray-700 uppercase bg-gray-50 border-b border-gray-200">
                              <tr>
                                <th className="px-6 py-3">Producto</th>
                                <th className="px-6 py-3">SKU</th>
                                <th className="px-6 py-3">Proveedor</th>
                                <th className="px-6 py-3 text-right">Costo ($)</th>
                                <th className="px-6 py-3 text-right">Piezas x Caja</th>
                                <th className="px-6 py-3 text-center">Acciones</th>
                              </tr>
                            </thead>
                            <tbody>
                              {assocList.map(item => (
                                <tr key={item.productId} className="bg-white border-b hover:bg-gray-50/50">
                                  <td className="px-6 py-3 font-bold text-gray-900 flex items-center gap-2">
                                    <div className="w-8 h-8 rounded bg-gray-100 overflow-hidden shrink-0 border">
                                      <img src={item.product?.images?.[0]} alt="" className="w-full h-full object-cover" />
                                    </div>
                                    <span className="truncate max-w-[150px]">{item.product?.name}</span>
                                  </td>
                                  <td className="px-6 py-3">{item.product?.sku}</td>
                                  <td className="px-6 py-3 font-medium text-gray-800">{item.supplierName}</td>
                                  <td className="px-6 py-3 text-right font-bold text-gray-900">${item.price.toFixed(2)}</td>
                                  <td className="px-6 py-3 text-right font-medium">{item.piecesPerBox} pz</td>
                                  <td className="px-6 py-3 text-center">
                                    <button 
                                      onClick={() => handleUnlinkProduct(item.productId)}
                                      className="text-red-500 hover:text-red-700 font-bold hover:underline"
                                    >
                                      Desvincular
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-xl">
              <h2 className="text-xl font-bold text-gray-900">{isEditing ? "Editar Producto" : "Nuevo Producto"}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-900">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 overflow-y-auto flex-1 space-y-8">
              
              <div className="grid grid-cols-2 gap-6">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-bold text-gray-700 mb-2">Nombre del Producto *</label>
                  <input required type="text" value={editingProduct.name} onChange={e => setEditingProduct({...editingProduct, name: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-primary-500 focus:border-primary-500" />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-bold text-gray-700 mb-2">SKU *</label>
                  <input required type="text" value={editingProduct.sku} onChange={e => setEditingProduct({...editingProduct, sku: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-primary-500 focus:border-primary-500" />
                </div>
                
                <div className="col-span-2">
                  <h4 className="block text-sm font-bold text-gray-700 mb-2">Precios y Descuentos por Volumen</h4>
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                    {/* Dynamic scale thresholds configuration */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4 border-b border-gray-200 pb-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Compra Mínima (pz)</label>
                        <input 
                          type="number" 
                          min="1"
                          value={editingProduct.minPurchase === undefined ? 50 : editingProduct.minPurchase}
                          onChange={e => setEditingProduct({...editingProduct, minPurchase: parseInt(e.target.value) || 0})}
                          className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-primary-500 focus:border-primary-500 font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Cant. Descuento 1 (pz)</label>
                        <input 
                          type="number" 
                          min="1"
                          value={editingProduct.discountQty1 === undefined ? 100 : editingProduct.discountQty1}
                          onChange={e => setEditingProduct({...editingProduct, discountQty1: parseInt(e.target.value) || 0})}
                          className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-primary-500 focus:border-primary-500 font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Cant. Descuento 2 (pz)</label>
                        <input 
                          type="number" 
                          min="1"
                          value={editingProduct.discountQty2 === undefined ? 150 : editingProduct.discountQty2}
                          onChange={e => setEditingProduct({...editingProduct, discountQty2: parseInt(e.target.value) || 0})}
                          className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-primary-500 focus:border-primary-500 font-bold"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                      {/* Costo */}
                      <div className="bg-white p-3 rounded-lg border border-gray-200">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Costo del Producto</label>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 font-bold">$</span>
                          <input 
                            type="number" 
                            step="0.01" 
                            min="0" 
                            value={editingProduct.cost || 0} 
                            onChange={e => {
                              const costVal = parseFloat(e.target.value) || 0;
                              const calculatedPrice = roundToHalf(costVal * 1.7);
                              setEditingProduct(prev => ({
                                ...prev,
                                cost: costVal,
                                price: calculatedPrice,
                                discount100: prev.discount100 === undefined || prev.discount100 === 0 ? 10 : prev.discount100,
                                discount150: prev.discount150 === undefined || prev.discount150 === 0 ? 15 : prev.discount150
                              }));
                            }} 
                            className="w-full border border-gray-300 rounded-lg p-2 focus:ring-primary-500 focus:border-primary-500 text-sm font-bold" 
                          />
                        </div>
                      </div>

                      {/* Tier 1 */}
                      <div className="bg-white p-3 rounded-lg border border-gray-200">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
                          {(editingProduct.minPurchase === undefined ? 50 : editingProduct.minPurchase)} a {(editingProduct.discountQty1 === undefined ? 100 : editingProduct.discountQty1) - 1} piezas (Base)
                        </label>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 font-bold">$</span>
                          <input required type="number" step="0.01" min="0" value={editingProduct.price || 0} onChange={e => setEditingProduct({...editingProduct, price: parseFloat(e.target.value) || 0})} className="w-full border border-gray-300 rounded-lg p-2 focus:ring-primary-500 focus:border-primary-500 text-sm font-bold" />
                        </div>
                      </div>
                      
                      {/* Tier 2 */}
                      <div className="bg-white p-3 rounded-lg border border-gray-200">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
                          {(editingProduct.discountQty1 === undefined ? 100 : editingProduct.discountQty1)} a {(editingProduct.discountQty2 === undefined ? 150 : editingProduct.discountQty2) - 1} piezas
                        </label>
                        <div className="flex items-center gap-2 mb-2">
                          <input type="number" step="1" min="0" max="100" value={editingProduct.discount100 || 0} onChange={e => setEditingProduct({...editingProduct, discount100: parseFloat(e.target.value) || 0})} className="w-20 border border-gray-300 rounded-lg p-1.5 focus:ring-primary-500 focus:border-primary-500 text-sm font-bold" />
                          <span className="text-sm font-bold text-gray-500">% Desc.</span>
                        </div>
                        <div className="text-sm font-bold text-primary-700">
                          = ${roundToHalf((editingProduct.price || 0) * (1 - (editingProduct.discount100 || 0) / 100)).toFixed(2)} c/u
                        </div>
                      </div>

                      {/* Tier 3 */}
                      <div className="bg-white p-3 rounded-lg border border-gray-200">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
                          Más de {(editingProduct.discountQty2 === undefined ? 150 : editingProduct.discountQty2)} piezas
                        </label>
                        <div className="flex items-center gap-2 mb-2">
                          <input type="number" step="1" min="0" max="100" value={editingProduct.discount150 || 0} onChange={e => setEditingProduct({...editingProduct, discount150: parseFloat(e.target.value) || 0})} className="w-20 border border-gray-300 rounded-lg p-1.5 focus:ring-primary-500 focus:border-primary-500 text-sm font-bold" />
                          <span className="text-sm font-bold text-gray-500">% Desc.</span>
                        </div>
                        <div className="text-sm font-bold text-primary-700">
                          = ${roundToHalf((editingProduct.price || 0) * (1 - (editingProduct.discount150 || 0) / 100)).toFixed(2)} c/u
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-bold text-gray-700 mb-2">Categoría *</label>
                  <select required value={editingProduct.category} onChange={e => setEditingProduct({...editingProduct, category: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-primary-500 focus:border-primary-500">
                    {editingProduct.category && !categories.includes(editingProduct.category) && (
                      <option value={editingProduct.category}>{editingProduct.category} (Sugerido por IA)</option>
                    )}
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-bold text-gray-700 mb-2">Material Principal *</label>
                  <select required value={editingProduct.material} onChange={e => setEditingProduct({...editingProduct, material: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-primary-500 focus:border-primary-500">
                    {editingProduct.material && !MATERIALS.includes(editingProduct.material) && (
                      <option value={editingProduct.material}>{editingProduct.material} (Sugerido por IA)</option>
                    )}
                    {MATERIALS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-bold text-gray-700 mb-2">Temporadas</label>
                  <div className="flex flex-wrap gap-2">
                    {seasons.map(sea => {
                      const isSelected = (editingProduct.seasons || []).includes(sea);
                      return (
                        <label key={sea} className={`cursor-pointer px-3 py-1.5 rounded-full border text-sm flex items-center gap-2 transition-colors ${isSelected ? 'bg-primary-50 border-primary-500 text-primary-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                          <input 
                            type="checkbox" 
                            className="hidden"
                            checked={isSelected}
                            onChange={(e) => {
                              const newSeasons = e.target.checked 
                                ? [...(editingProduct.seasons || []), sea]
                                : (editingProduct.seasons || []).filter(s => s !== sea);
                              setEditingProduct({...editingProduct, seasons: newSeasons});
                            }}
                          />
                          {sea}
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-bold text-gray-700 mb-2">Descripción</label>
                  <textarea rows={3} value={editingProduct.description} onChange={e => setEditingProduct({...editingProduct, description: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-primary-500 focus:border-primary-500"></textarea>
                </div>

                <div className="col-span-2">
                  <h4 className="block text-sm font-bold text-gray-700 mb-2">Galería de Imágenes</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
                    {[
                      { label: "Foto Principal *", key: 0 },
                      { label: "Foto Individual 1", key: 1 },
                      { label: "Foto Individual 2", key: 2 },
                      { label: "Foto Individual 3", key: 3 },
                      { label: "Plano Mecánico", key: 4 }
                    ].map(imgField => {
                       const isHovered = hoveredImageKey === imgField.key;
                       return (
                         <div 
                           key={imgField.key}
                           onMouseEnter={() => setHoveredImageKey(imgField.key)}
                           onMouseLeave={() => setHoveredImageKey(null)}
                           className={`p-3.5 rounded-xl border-2 transition-all duration-300 ${
                             isHovered 
                               ? "border-primary-500 bg-white shadow-sm ring-4 ring-primary-500/5" 
                               : "border-transparent bg-transparent"
                           }`}
                         >
                           <div className="flex justify-between items-center mb-1.5">
                             <label className="block text-xs font-bold text-gray-500 uppercase">{imgField.label}</label>
                             <span className={`text-[10px] px-1.5 py-0.5 rounded border font-mono transition-colors duration-300 ${
                               isHovered 
                                 ? "bg-primary-50 border-primary-200 text-primary-700 font-semibold" 
                                 : "bg-gray-100 border-gray-200 text-gray-400"
                             }`}>
                               Ctrl + V
                             </span>
                           </div>
                           <div className="relative">
                             <input 
                               type="file"
                               accept="image/*"
                               onChange={async (e) => {
                                 const file = e.target.files?.[0];
                                 if (!file) return;
                                 setUploadingImage(imgField.key);
                                 const publicUrl = await uploadImage(file);
                                 if (publicUrl) {
                                   const newImages = [...(editingProduct.images || [])];
                                   while (newImages.length <= imgField.key) newImages.push("");
                                   newImages[imgField.key] = publicUrl;
                                   setEditingProduct({...editingProduct, images: newImages});
                                 } else {
                                   alert("Error subiendo la imagen.");
                                 }
                                 setUploadingImage(null);
                               }}
                               className="w-full border border-gray-300 rounded-lg p-2 focus:ring-primary-500 focus:border-primary-500 text-sm file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100" 
                             />
                           </div>
                           {uploadingImage === imgField.key && <p className="text-xs text-blue-500 mt-1 font-bold animate-pulse">Subiendo imagen...</p>}
                           {editingProduct.images?.[imgField.key] && (
                             <div className="mt-2.5 flex items-center gap-3">
                               <img src={editingProduct.images[imgField.key]} className="h-12 w-12 object-cover rounded-lg shadow-sm border border-gray-200" alt="Preview" />
                               <div className="flex flex-col gap-0.5">
                                 <button type="button" onClick={() => {
                                    const newImages = [...(editingProduct.images || [])];
                                    newImages[imgField.key] = "";
                                    setEditingProduct({...editingProduct, images: newImages});
                                 }} className="text-xs text-red-500 hover:text-red-700 font-bold self-start">Quitar</button>
                                 <span className="text-[10px] text-gray-400">Ctrl+V para reemplazar</span>
                                </div>
                             </div>
                           )}
                         </div>
                       );
                     })}
                  </div>
                </div>

              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="col-span-2">
                  <div className="flex flex-wrap gap-6 p-4 bg-gray-50 rounded-lg border border-gray-200 mb-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={editingProduct.isNew || false} onChange={e => setEditingProduct({...editingProduct, isNew: e.target.checked})} className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500" />
                      <span className="text-sm font-bold text-gray-700">Etiqueta "NUEVO"</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={editingProduct.featured || false} onChange={e => setEditingProduct({...editingProduct, featured: e.target.checked})} className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500" />
                      <span className="text-sm font-bold text-gray-700">Producto Destacado</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={editingProduct.published !== false} onChange={e => setEditingProduct({...editingProduct, published: e.target.checked})} className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500" />
                      <span className="text-sm font-bold text-gray-700">Publicado en Catálogo</span>
                    </label>
                  </div>
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-bold text-gray-700 mb-2">Stock Total *</label>
                  <input required type="number" min="0" value={editingProduct.stock || 0} onChange={e => setEditingProduct({...editingProduct, stock: parseInt(e.target.value) || 0})} className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-primary-500 focus:border-primary-500" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-bold text-gray-700 mb-2">Colores Disponibles</label>
                  <div className="flex flex-wrap gap-3">
                    {COLOR_PALETTE.map(c => {
                      const isSelected = (editingProduct.colors || []).includes(c.hex);
                      return (
                        <button
                          key={c.hex}
                          type="button"
                          onClick={() => {
                            const newColors = isSelected
                              ? (editingProduct.colors || []).filter(color => color !== c.hex)
                              : [...(editingProduct.colors || []), c.hex];
                            setEditingProduct({...editingProduct, colors: newColors});
                          }}
                          title={c.name}
                          className={`w-10 h-10 rounded-full border-2 transition-all flex items-center justify-center shadow-sm ${isSelected ? 'border-primary-600 ring-2 ring-primary-200 ring-offset-2' : 'border-gray-200 hover:border-gray-300'}`}
                          style={{ backgroundColor: c.hex }}
                        >
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-gray-100 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 border border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-50 transition-colors">
                  Cancelar
                </button>
                <button type="submit" className="px-5 py-2.5 bg-primary-600 text-white font-bold rounded-lg hover:bg-primary-700 transition-colors shadow-sm">
                  {isEditing ? "Guardar Cambios" : "Crear Producto"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Quote Modal */}
      {viewingQuote && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-xl">
              <h2 className="text-xl font-bold text-gray-900">Detalles de Cotización: {viewingQuote.id}</h2>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => handleDownloadQuotePdf(viewingQuote)}
                  className="bg-primary-600 text-white font-bold py-2 px-4 rounded-lg shadow-sm hover:bg-primary-700 transition-colors flex items-center text-sm"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Descargar PDF
                </button>
                <button onClick={() => setViewingQuote(null)} className="text-gray-400 hover:text-gray-900">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 bg-gray-50/50">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Client Data */}
                <div className="md:col-span-1 space-y-4">
                  <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm animate-in fade-in duration-300">
                    <h3 className="font-bold text-gray-900 mb-4 border-b pb-2">Datos del Cliente</h3>
                    <div className="space-y-3 text-sm">
                      <div><span className="text-gray-500 block text-xs uppercase font-semibold">Empresa</span> <span className="font-medium text-gray-900">{viewingQuote.client.company}</span></div>
                      <div><span className="text-gray-500 block text-xs uppercase font-semibold">Contacto</span> <span className="font-medium text-gray-900">{viewingQuote.client.name}</span></div>
                      <div><span className="text-gray-500 block text-xs uppercase font-semibold">Email</span> <span className="font-medium text-gray-900">{viewingQuote.client.email}</span></div>
                      <div><span className="text-gray-500 block text-xs uppercase font-semibold">Teléfono</span> <span className="font-medium text-gray-900">{viewingQuote.client.phone}</span></div>
                      <div><span className="text-gray-500 block text-xs uppercase font-semibold">Destino</span> <span className="font-medium text-gray-900">{viewingQuote.client.city}, {viewingQuote.client.state}</span></div>
                      {viewingQuote.client.address && (
                        <div><span className="text-gray-500 block text-xs uppercase font-semibold">Dirección</span> <span className="font-medium text-gray-900">{viewingQuote.client.address}</span></div>
                      )}
                      {viewingQuote.client.zip && (
                        <div><span className="text-gray-500 block text-xs uppercase font-semibold">Código Postal</span> <span className="font-medium text-gray-900">{viewingQuote.client.zip}</span></div>
                      )}
                      {viewingQuote.client.comments && (
                        <div><span className="text-gray-500 block text-xs uppercase font-semibold">Comentarios</span> <span className="text-gray-700 italic">{viewingQuote.client.comments}</span></div>
                      )}
                    </div>
                  </div>
                  
                  {(() => {
                    const { subtotal, iva, total } = getQuoteTotals(viewingQuote, activePrintPrices);
                    const headerDeliveryTime = deliveryTime || viewingQuote.client.deliveryTime;
                    
                    return (
                      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm animate-in fade-in duration-300">
                        <h3 className="font-bold text-gray-900 mb-4 border-b pb-2">Resumen</h3>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between"><span className="text-gray-500">Fecha</span> <span>{new Date(viewingQuote.date).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short', hour12: false })}</span></div>
                          <div className="flex justify-between"><span className="text-gray-500">Artículos</span> <span>{viewingQuote.items.length}</span></div>
                          {headerDeliveryTime && (
                            <div className="flex justify-between"><span className="text-gray-500">Tiempo de Entrega</span> <span className="font-medium text-gray-900">{headerDeliveryTime}</span></div>
                          )}
                          <div className="flex justify-between mt-2 pt-2 border-t border-gray-100"><span className="text-gray-500">Subtotal</span> <span className="font-medium text-gray-900">${subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                          <div className="flex justify-between"><span className="text-gray-500">IVA (16%)</span> <span className="font-medium text-gray-900">${iva.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                          <div className="flex justify-between font-bold text-lg mt-2 pt-2 border-t border-gray-150"><span className="text-gray-900">Total</span> <span className="text-primary-700">${total.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm animate-in fade-in duration-300">
                    <h3 className="font-bold text-gray-900 mb-4 border-b pb-2">Ajustes de Cotización</h3>
                    <form onSubmit={handleSaveQuoteDetails} className="space-y-4 text-sm">
                      {/* Item Selector Dropdown */}
                      {viewingQuote.items.length > 0 && (
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Artículo a Ajustar</label>
                          <select
                            value={selectedItemId}
                            onChange={(e) => setSelectedItemId(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-primary-500 focus:border-primary-500 bg-white font-medium text-gray-700"
                          >
                            {viewingQuote.items.map(item => (
                              <option key={item.id} value={item.id}>
                                {item.productName.substring(0, 35)}... ({getColorName(item.color)})
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Item Specific Fields */}
                      <div className="space-y-4 pt-2 border-t border-gray-100">
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Precio Final Impresión (Por Unidad)</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="Reemplaza estimado"
                            value={itemAdjustments[selectedItemId]?.finalPrintPrice || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              setItemAdjustments(prev => ({
                                ...prev,
                                [selectedItemId]: {
                                  ...prev[selectedItemId],
                                  finalPrintPrice: val
                                }
                              }));
                            }}
                            className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-primary-500 focus:border-primary-500 font-medium"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Precio Final Envío (Total por Artículo)</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="Costo de envío"
                            value={itemAdjustments[selectedItemId]?.finalShippingPrice || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              setItemAdjustments(prev => ({
                                ...prev,
                                [selectedItemId]: {
                                  ...prev[selectedItemId],
                                  finalShippingPrice: val
                                }
                              }));
                            }}
                            className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-primary-500 focus:border-primary-500 font-medium"
                          />
                        </div>
                      </div>

                      {/* Global Address, CP & Tiempo de Entrega Fields */}
                      <div className="space-y-4 pt-4 border-t border-gray-100">
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tiempo de Entrega (Global)</label>
                          <input
                            type="text"
                            placeholder="Ej. 5-7 días hábiles"
                            value={deliveryTime}
                            onChange={(e) => setDeliveryTime(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-primary-500 focus:border-primary-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Dirección (Global)</label>
                          <input
                            type="text"
                            placeholder="Dirección del cliente"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-primary-500 focus:border-primary-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Código Postal (Global)</label>
                          <input
                            type="text"
                            placeholder="CP"
                            value={zip}
                            onChange={(e) => setZip(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-primary-500 focus:border-primary-500"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={isSavingQuote}
                        className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-2.5 px-4 rounded-lg shadow-sm transition-colors text-center disabled:opacity-50"
                      >
                        {isSavingQuote ? "Guardando..." : "Guardar Cambios"}
                      </button>
                    </form>
                  </div>
                </div>

                <div className="md:col-span-2 space-y-4">
                  <h3 className="font-bold text-gray-900 text-lg">Artículos Solicitados</h3>
                  {viewingQuote.items.map(item => {
                    const estPrintPrice = item.isPersonalized ? (activePrintPrices[item.printOption] || 0) : 0;
                    const baseProdPrice = item.unitPrice - estPrintPrice;
                    const finalPrintPriceVal = item.finalPrintPrice !== undefined && item.finalPrintPrice !== null ? item.finalPrintPrice : estPrintPrice;
                    const finalShippingPriceVal = item.finalShippingPrice !== undefined && item.finalShippingPrice !== null ? item.finalShippingPrice : 0;
                    const itemSubtotal = (baseProdPrice + (item.isPersonalized ? finalPrintPriceVal : 0)) * item.quantity + finalShippingPriceVal;

                    return (
                      <div key={item.id} className={`bg-white p-4 rounded-xl border transition-all shadow-sm ${selectedItemId === item.id ? 'border-primary-500 ring-2 ring-primary-50' : 'border-gray-200'}`}>
                        <div className="flex items-start gap-4 mb-4 border-b border-gray-100 pb-4">
                          <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden shrink-0 border border-gray-200">
                            <img src={item.mockupImage || item.image} alt="" className="w-full h-full object-cover" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-bold text-gray-900">{item.productName}</h4>
                            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500 mt-1 items-center">
                              <span>SKU: {item.sku}</span>
                              <span className="flex items-center gap-1.5">
                                Color: 
                                {item.color.startsWith('#') ? (
                                  <>
                                    <span className="w-3 h-3 rounded-full border border-gray-300 inline-block" style={{ backgroundColor: item.color }} />
                                    {getColorName(item.color)}
                                  </>
                                ) : (
                                  getColorName(item.color)
                                )}
                              </span>
                              <span>Impresión: {item.printOption}</span>
                            </div>
                            
                            <button
                              type="button"
                              onClick={() => setSelectedItemId(item.id)}
                              className={`mt-3 text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors flex items-center gap-1 ${
                                selectedItemId === item.id
                                  ? 'bg-primary-600 border-primary-600 text-white shadow-sm'
                                  : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              {selectedItemId === item.id ? "Ajustando este artículo" : "Ajustar este artículo"}
                            </button>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-gray-900">{item.quantity} pz</div>
                            <div className="text-xs text-primary-700 font-bold mt-1">
                              Subtotal: ${itemSubtotal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                          </div>
                        </div>

                        {/* Adjustments Summary for this Item */}
                        <div className="bg-gray-50 rounded-lg p-3 text-xs grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div>
                            <span className="text-gray-400 block font-semibold text-[10px] uppercase">Precio Base</span>
                            <span className="font-bold text-gray-700">${baseProdPrice.toFixed(2)} c/u</span>
                          </div>
                          <div>
                            <span className="text-gray-400 block font-semibold text-[10px] uppercase">Impresión Final</span>
                            <span className="font-bold text-gray-700">
                              {item.isPersonalized 
                                ? `$${finalPrintPriceVal.toFixed(2)} c/u` 
                                : "Sin Impresión"
                              }
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-400 block font-semibold text-[10px] uppercase">Envío Final</span>
                            <span className="font-bold text-gray-700">${finalShippingPriceVal.toFixed(2)} (Total)</span>
                          </div>
                          <div>
                            <span className="text-gray-400 block font-semibold text-[10px] uppercase">Precio Total Unitario</span>
                            <span className="font-extrabold text-primary-700">
                              ${((baseProdPrice + (item.isPersonalized ? finalPrintPriceVal : 0)) + (finalShippingPriceVal / item.quantity)).toFixed(2)} c/u
                            </span>
                          </div>
                        </div>
                      
                      {/* Attached Mockups */}
                      {(item.mockupImage || item.blueprintImage) && (
                        <div className="bg-gray-50 rounded-lg p-3">
                          <h5 className="text-xs font-bold text-gray-700 mb-2 uppercase flex items-center"><FileText className="w-3 h-3 mr-1" /> Archivos Adjuntos (Mockups)</h5>
                          <div className="flex gap-4">
                            {item.mockupImage && (
                              <div className="flex flex-col items-center">
                                <span className="text-[10px] text-gray-500 mb-1 font-bold">Vista Previa</span>
                                <a href={item.mockupImage} download={`mockup-${item.sku}.png`} className="block w-20 h-20 bg-white border border-gray-200 rounded relative group overflow-hidden">
                                  <img src={item.mockupImage} alt="" className="w-full h-full object-contain" />
                                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                    <Download className="w-5 h-5 text-white" />
                                  </div>
                                </a>
                              </div>
                            )}
                            {item.blueprintImage && (
                              <div className="flex flex-col items-center">
                                <span className="text-[10px] text-gray-500 mb-1 font-bold">Plano Mecánico</span>
                                <a href={item.blueprintImage} download={`plano-${item.sku}.png`} className="block w-20 h-20 bg-white border border-gray-200 rounded relative group overflow-hidden">
                                  <img src={item.blueprintImage} alt="" className="w-full h-full object-contain" />
                                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                    <Download className="w-5 h-5 text-white" />
                                  </div>
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                </div>
                
                {/* Cálculo de Paquetería / Envíos */}
                {(() => {
                  const volumetricWeight = Math.round(((shippingLength * shippingWidth * shippingHeight) / 5000) * 10) / 10;
                  const billableWeightPerBox = Math.max(shippingWeight, volumetricWeight);
                  const totalRealWeight = shippingBoxes * shippingWeight;
                  const totalVolumetricWeight = shippingBoxes * volumetricWeight;
                  const totalBillableWeight = shippingBoxes * billableWeightPerBox;

                  return (
                    <div className="bg-gradient-to-br from-white to-gray-50/50 p-6 rounded-2xl border border-gray-250 shadow-md mt-8 md:col-span-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-150 pb-4 mb-5 gap-3">
                        <div className="flex items-center gap-3">
                          <div className="bg-primary-50 p-2.5 rounded-xl border border-primary-100">
                            <Truck className="w-6 h-6 text-primary-650" />
                          </div>
                          <div>
                            <h4 className="font-bold text-gray-900 text-base uppercase tracking-wide">
                              Cálculo de Envío (Paqueterías)
                            </h4>
                            <p className="text-xs text-gray-500 mt-0.5">
                              Artículo: <span className="font-bold text-primary-905">{viewingQuote.items.find(item => item.id === selectedItemId)?.productName || "Ninguno"}</span>
                            </p>
                          </div>
                        </div>
                        <span className="bg-primary-50 text-primary-800 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border border-primary-100 self-start sm:self-center">
                          Margen Requerido: +10%
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Recuadro 1: Paquetería de Inicio */}
                        <div className="bg-white p-5 rounded-xl border border-gray-200/80 shadow-sm flex flex-col justify-between">
                          <div>
                            <h5 className="font-extrabold text-gray-800 text-xs uppercase tracking-wider mb-4 pb-2 border-b border-gray-100 flex items-center justify-between">
                              <span>1. Origen e Inicio</span>
                              <span className="text-[10px] text-gray-400 font-semibold lowercase">caja e inicio</span>
                            </h5>
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-[11px] font-bold text-gray-655 uppercase mb-1">Cajas</label>
                                  <input 
                                    type="number" 
                                    min="1" 
                                    value={shippingBoxes} 
                                    onChange={e => setShippingBoxes(parseInt(e.target.value) || 1)}
                                    className="w-full border border-gray-300 rounded-lg p-2 bg-gray-50/50 font-bold text-sm focus:bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-gray-800"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[11px] font-bold text-gray-655 uppercase mb-1">Peso (kg)</label>
                                  <input 
                                    type="number" 
                                    min="0.1" 
                                    step="0.1" 
                                    value={shippingWeight} 
                                    onChange={e => setShippingWeight(parseFloat(e.target.value) || 0)}
                                    className="w-full border border-gray-300 rounded-lg p-2 bg-gray-50/50 font-bold text-sm focus:bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-gray-800"
                                  />
                                </div>
                              </div>
                              
                              <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Medidas de Caja (Largo x Ancho x Alto cm)</label>
                                <div className="grid grid-cols-3 gap-2">
                                  <div>
                                    <input 
                                      type="number" 
                                      min="1" 
                                      placeholder="Largo"
                                      value={shippingLength} 
                                      onChange={e => setShippingLength(parseInt(e.target.value) || 0)}
                                      className="w-full border border-gray-300 rounded-lg p-2 bg-gray-50/50 font-bold text-sm text-center focus:bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-gray-800"
                                    />
                                    <span className="text-[9px] text-gray-400 block text-center mt-0.5">Largo</span>
                                  </div>
                                  <div>
                                    <input 
                                      type="number" 
                                      min="1" 
                                      placeholder="Ancho"
                                      value={shippingWidth} 
                                      onChange={e => setShippingWidth(parseInt(e.target.value) || 0)}
                                      className="w-full border border-gray-300 rounded-lg p-2 bg-gray-50/50 font-bold text-sm text-center focus:bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-gray-800"
                                    />
                                    <span className="text-[9px] text-gray-400 block text-center mt-0.5">Ancho</span>
                                  </div>
                                  <div>
                                    <input 
                                      type="number" 
                                      min="1" 
                                      placeholder="Alto"
                                      value={shippingHeight} 
                                      onChange={e => setShippingHeight(parseInt(e.target.value) || 0)}
                                      className="w-full border border-gray-300 rounded-lg p-2 bg-gray-50/50 font-bold text-sm text-center focus:bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-gray-800"
                                    />
                                    <span className="text-[9px] text-gray-400 block text-center mt-0.5">Alto</span>
                                  </div>
                                </div>
                              </div>

                              <div>
                                <label className="block text-[11px] font-bold text-gray-655 uppercase mb-1">Costo Envío Inicio (Prov. a Geeky)</label>
                                <div className="relative rounded-lg shadow-sm">
                                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500 font-bold text-sm">$</div>
                                  <input 
                                    type="number" 
                                    min="0" 
                                    step="0.01"
                                    value={shippingInitialCost} 
                                    onChange={e => setShippingInitialCost(parseFloat(e.target.value) || 0)}
                                    className="w-full border border-gray-300 rounded-lg p-2 pl-7 bg-gray-50/50 font-extrabold text-sm focus:bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-primary-750"
                                  />
                                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-[10px] text-gray-400 font-bold">MXN</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Recuadro 2: Paquetería Destino */}
                        <div className="bg-white p-5 rounded-xl border border-gray-200/80 shadow-sm flex flex-col">
                          <h5 className="font-extrabold text-gray-800 text-xs uppercase tracking-wider mb-4 pb-2 border-b border-gray-100 flex items-center justify-between">
                            <span>2. Destino y Tarifas</span>
                            <span className="text-[10px] text-green-650 font-bold font-mono">CP: {zip || "N/A"}</span>
                          </h5>
                          <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-[11px] text-gray-650 bg-gray-55 p-3 rounded-lg border border-gray-150 mb-4">
                            <div>
                              <span className="text-gray-450 block text-[9px] uppercase font-bold">CP Origen</span>
                              <strong className="text-gray-700 font-mono">20000</strong>
                            </div>
                            <div>
                              <span className="text-gray-450 block text-[9px] uppercase font-bold">CP Destino</span>
                              <strong className="text-gray-755 font-mono">{zip || "N/A"}</strong>
                            </div>
                            <div>
                              <span className="text-gray-450 block text-[9px] uppercase font-bold">Peso Real</span>
                              <strong className="text-gray-700">{totalRealWeight.toFixed(1)} kg</strong>
                            </div>
                            <div>
                              <span className="text-gray-450 block text-[9px] uppercase font-bold">Peso Vol.</span>
                              <strong className="text-gray-700">{totalVolumetricWeight.toFixed(1)} kg</strong>
                            </div>
                            <div className="bg-primary-50 p-1.5 rounded border border-primary-100 col-span-2 flex justify-between items-center mt-1">
                              <span className="text-primary-850 font-bold text-[9px] uppercase">Facturable:</span>
                              <strong className="text-primary-850 text-xs font-black">{totalBillableWeight.toFixed(1)} kg</strong>
                            </div>
                          </div>

                          {/* Carrier Options Selector */}
                          <label className="block text-[10px] font-bold text-gray-500 uppercase mb-2">Selecciona Paquetería Destino</label>
                          <div className="space-y-2 flex-1 overflow-y-auto max-h-[170px] pr-1 scrollbar-thin">
                            {calculateCarrierCosts(shippingBoxes, billableWeightPerBox, '20000', zip).map(carrier => {
                              const isSelected = shippingSelectedCarrier === carrier.id;
                              return (
                                <div 
                                  key={carrier.id} 
                                  onClick={() => setShippingSelectedCarrier(carrier.id)}
                                  className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all duration-200 ${
                                    isSelected 
                                      ? 'border-primary-600 bg-primary-50/50 shadow-sm ring-1 ring-primary-500' 
                                      : 'border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300'
                                  }`}
                                >
                                  <div className="flex items-center gap-3">
                                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                                      isSelected ? 'border-primary-600 bg-primary-600' : 'border-gray-350'
                                    }`}>
                                      {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                    </div>
                                    <div className="text-left">
                                      <span className="font-bold text-gray-800 text-[12px] block leading-tight">{carrier.name}</span>
                                      <span className="text-[10px] text-gray-455">{carrier.time}</span>
                                    </div>
                                  </div>
                                  <span className="font-mono font-extrabold text-primary-850 text-sm">${carrier.cost.toFixed(2)}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Recuadro 3: Resumen y Aplicación */}
                        {(() => {
                          const carriers = calculateCarrierCosts(shippingBoxes, billableWeightPerBox, '20000', zip);
                          const selectedCarrier = carriers.find(c => c.id === shippingSelectedCarrier);
                          const carrierCost = selectedCarrier ? selectedCarrier.cost : 0;
                          const sumCost = shippingInitialCost + carrierCost;
                          const markup = sumCost * 0.10;
                          const finalShippingTotal = sumCost + markup;

                          return (
                            <div className="bg-white p-5 rounded-xl border border-gray-200/80 shadow-sm flex flex-col justify-between">
                              <div>
                                <h5 className="font-extrabold text-gray-800 text-xs uppercase tracking-wider mb-4 pb-2 border-b border-gray-100 flex items-center justify-between">
                                  <span>3. Resumen y Aplicación</span>
                                  <span className="text-[10px] text-primary-600 font-bold">desglose</span>
                                </h5>
                                
                                <div className="space-y-2.5 text-xs border-b border-gray-100 pb-4 mb-4">
                                  <div className="flex justify-between items-center text-gray-650">
                                    <span>Costo Inicio:</span>
                                    <span className="font-semibold text-gray-850">${shippingInitialCost.toFixed(2)}</span>
                                  </div>
                                  <div className="flex justify-between items-center text-gray-650">
                                    <span>Costo Destino ({selectedCarrier?.name}):</span>
                                    <span className="font-semibold text-gray-850">${carrierCost.toFixed(2)}</span>
                                  </div>
                                  <div className="flex justify-between items-center pt-2 border-t border-gray-100 text-gray-600">
                                    <span>Suma Costos:</span>
                                    <span className="font-bold text-gray-900">${sumCost.toFixed(2)}</span>
                                  </div>
                                  <div className="flex justify-between items-center text-primary-750 font-medium">
                                    <span>Margen Distribuidor (+10%):</span>
                                    <span className="font-bold text-primary-750">${markup.toFixed(2)}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="space-y-4">
                                <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 text-center">
                                  <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-widest block mb-1">Costo Envío Final Sugerido</span>
                                  <span className="text-xl font-black text-emerald-700 font-mono">${finalShippingTotal.toFixed(2)} MXN</span>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setItemAdjustments(prev => ({
                                      ...prev,
                                      [selectedItemId]: {
                                        ...prev[selectedItemId],
                                        finalShippingPrice: finalShippingTotal.toFixed(2)
                                      }
                                    }));
                                    alert(`Se aplicó el costo de envío de $${finalShippingTotal.toFixed(2)} al artículo seleccionado. Recuerda guardar los cambios de la cotización.`);
                                  }}
                                  className="w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold py-3 px-4 rounded-xl shadow hover:shadow-md transition-all duration-200 flex items-center justify-center gap-2 text-sm text-center cursor-pointer"
                                >
                                  <CheckCircle className="w-4 h-4 shrink-0" />
                                  Aplicar a Envío de Artículo
                                </button>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 text-center">
            <Trash2 className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-900 mb-2">¿Eliminar producto?</h3>
            <p className="text-gray-500 mb-6">Esta acción no se puede deshacer. El producto será eliminado del catálogo.</p>
            <div className="flex justify-center gap-3">
              <button onClick={() => setDeleteConfirmId(null)} className="px-4 py-2 border border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
              <button onClick={confirmDelete} className="px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors shadow-sm">
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
