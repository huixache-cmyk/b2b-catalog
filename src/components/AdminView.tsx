"use client";

import { useState, useEffect } from "react";
import { useProducts } from "@/hooks/useProducts";
import { useSettings } from "@/hooks/useSettings";
import { useQuotes } from "@/hooks/useQuotes";
import { Product, MATERIALS, QuoteRequest } from "@/types";
import { Edit, Trash2, Plus, Search, X, Image as ImageIcon, Eye, Clock, CheckCircle, FileText, Download, User, ChevronUp, ChevronDown } from "lucide-react";
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

export function AdminView() {
  const { products, isLoaded, addProduct, updateProduct, deleteProduct } = useProducts();
  const { quotes, isLoaded: quotesLoaded, updateQuoteStatus, deleteQuote, updateQuote } = useQuotes();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<'products' | 'settings' | 'home' | 'quotes' | 'agent' | 'b2b-agent'>('products');
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
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
    });

    // Listen to changes in auth state
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
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
        for (let idx = 0; idx < 6; idx++) {
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
  const [finalPrintPrice, setFinalPrintPrice] = useState<string>("");
  const [finalShippingPrice, setFinalShippingPrice] = useState<string>("");
  const [deliveryTime, setDeliveryTime] = useState<string>("");
  const [address, setAddress] = useState<string>("");
  const [zip, setZip] = useState<string>("");
  const [isSavingQuote, setIsSavingQuote] = useState(false);

  useEffect(() => {
    if (viewingQuote) {
      setFinalPrintPrice(viewingQuote.client.finalPrintPrice !== undefined && viewingQuote.client.finalPrintPrice !== null ? viewingQuote.client.finalPrintPrice.toString() : "");
      setFinalShippingPrice(viewingQuote.client.finalShippingPrice !== undefined && viewingQuote.client.finalShippingPrice !== null ? viewingQuote.client.finalShippingPrice.toString() : "");
      setDeliveryTime(viewingQuote.client.deliveryTime || "");
      setAddress(viewingQuote.client.address || "");
      setZip(viewingQuote.client.zip || "");
    }
  }, [viewingQuote]);

  const handleSaveQuoteDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewingQuote) return;
    setIsSavingQuote(true);
    try {
      const parsedPrintPrice = finalPrintPrice === "" ? null : parseFloat(finalPrintPrice);
      const parsedShippingPrice = finalShippingPrice === "" ? null : parseFloat(finalShippingPrice);

      const baseProductSubtotal = viewingQuote.items.reduce((sum, item) => {
        const estPrintPrice = item.isPersonalized ? (printPrices[item.printOption] || 0) : 0;
        const baseProdPrice = item.unitPrice - estPrintPrice;
        return sum + (baseProdPrice * item.quantity);
      }, 0);

      let printSubtotal = 0;
      if (parsedPrintPrice !== null && !isNaN(parsedPrintPrice)) {
        printSubtotal = parsedPrintPrice;
      } else {
        printSubtotal = viewingQuote.items.reduce((sum, item) => {
          const estPrintPrice = item.isPersonalized ? (printPrices[item.printOption] || 0) : 0;
          return sum + (estPrintPrice * item.quantity);
        }, 0);
      }

      const shippingSubtotal = (parsedShippingPrice !== null && !isNaN(parsedShippingPrice)) ? parsedShippingPrice : 0;
      const subtotal = baseProductSubtotal + printSubtotal + shippingSubtotal;
      const totalWithIva = subtotal * 1.16;

      const updatedQuote: QuoteRequest = {
        ...viewingQuote,
        client: {
          ...viewingQuote.client,
          address,
          zip,
          finalPrintPrice: parsedPrintPrice !== null && !isNaN(parsedPrintPrice) ? parsedPrintPrice : undefined,
          finalShippingPrice: parsedShippingPrice !== null && !isNaN(parsedShippingPrice) ? parsedShippingPrice : undefined,
          deliveryTime: deliveryTime || undefined
        },
        total: totalWithIva
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
      img.crossOrigin = "Anonymous";
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
          img.crossOrigin = "Anonymous";
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

      // 6. Calculate Totals
      const totalQuantity = quote.items.reduce((sum, i) => sum + i.quantity, 0);
      const finalPrintPriceVal = quote.client.finalPrintPrice !== undefined && quote.client.finalPrintPrice !== null ? quote.client.finalPrintPrice : null;
      const finalShippingPriceVal = quote.client.finalShippingPrice !== undefined && quote.client.finalShippingPrice !== null ? quote.client.finalShippingPrice : null;

      const baseProductSubtotal = quote.items.reduce((sum, item) => {
        const estPrintPrice = item.isPersonalized ? (printPrices[item.printOption] || 0) : 0;
        const baseProdPrice = item.unitPrice - estPrintPrice;
        return sum + (baseProdPrice * item.quantity);
      }, 0);

      const printSubtotal = finalPrintPriceVal !== null ? finalPrintPriceVal : quote.items.reduce((sum, item) => {
        const estPrintPrice = item.isPersonalized ? (printPrices[item.printOption] || 0) : 0;
        return sum + (estPrintPrice * item.quantity);
      }, 0);

      const shippingSubtotal = finalShippingPriceVal !== null ? finalShippingPriceVal : 0;
      const subtotal = baseProductSubtotal + printSubtotal + shippingSubtotal;
      const iva = subtotal * 0.16;
      const total = subtotal + iva;

      // 7. Prepare Table Data
      const tableData = quote.items.map(item => {
        const estPrintPrice = item.isPersonalized ? (printPrices[item.printOption] || 0) : 0;
        const baseProdPrice = item.unitPrice - estPrintPrice;
        const unitPrintPrice = finalPrintPriceVal !== null ? (finalPrintPriceVal / totalQuantity) : estPrintPrice;
        const unitShippingPrice = finalShippingPriceVal !== null ? (finalShippingPriceVal / totalQuantity) : 0;
        const itemSubtotal = (baseProdPrice + unitPrintPrice + unitShippingPrice) * item.quantity;

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
        head: [['', 'SKU', 'Producto', 'Cant.', 'Precio', 'Impresión', 'Envío', 'Subtotal']],
        body: tableData,
        headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [240, 248, 247] },
        styles: { font: 'helvetica', fontSize: 9, minCellHeight: 18, valign: 'middle' },
        columnStyles: {
          0: { cellWidth: 18 },
          1: { cellWidth: 20 },
          2: { cellWidth: 50 },
          3: { cellWidth: 14, halign: 'center' },
          4: { cellWidth: 20, halign: 'right' },
          5: { cellWidth: 20, halign: 'right' },
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
                  const posX = data.cell.x + (data.cell.width - dim) / 2;
                  const posY = data.cell.y + (data.cell.height - dim) / 2;
                  doc.addImage(imgEl, 'PNG', posX, posY, dim, dim);
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
      discount150: 0
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

    // Fix empty images fallback
    let cleanedImages = (productToSave.images || []).filter(img => img.trim() !== "");
    if (cleanedImages.length === 0) {
      cleanedImages = ["https://picsum.photos/seed/newprod/600/600"];
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
              <th scope="col" className="px-6 py-4 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(product => (
              <tr key={product.id} className="bg-white border-b hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap flex items-center gap-3">
                  <div className="w-10 h-10 rounded overflow-hidden bg-gray-100 flex-shrink-0">
                    <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex flex-col">
                    <span className="truncate max-w-[200px] block font-bold" title={product.name}>{product.name}</span>
                    <span className="text-xs text-gray-400">{product.colors?.length || 0} colores</span>
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
                <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
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
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">50 a 99 piezas (Base)</label>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 font-bold">$</span>
                          <input required type="number" step="0.01" min="0" value={editingProduct.price || 0} onChange={e => setEditingProduct({...editingProduct, price: parseFloat(e.target.value) || 0})} className="w-full border border-gray-300 rounded-lg p-2 focus:ring-primary-500 focus:border-primary-500 text-sm font-bold" />
                        </div>
                      </div>
                      
                      {/* Tier 2 */}
                      <div className="bg-white p-3 rounded-lg border border-gray-200">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">100 a 150 piezas</label>
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
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Más de 150 piezas</label>
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
                      { label: "Plano Mecánico", key: 1 },
                      { label: "Foto Individual 1", key: 2 },
                      { label: "Foto Individual 2", key: 3 },
                      { label: "Foto Individual 3", key: 4 },
                      { label: "Foto Individual 4", key: 5 }
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
                  <div className="flex gap-6 p-4 bg-gray-50 rounded-lg border border-gray-200 mb-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={editingProduct.isNew || false} onChange={e => setEditingProduct({...editingProduct, isNew: e.target.checked})} className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500" />
                      <span className="text-sm font-bold text-gray-700">Etiqueta "NUEVO"</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={editingProduct.featured || false} onChange={e => setEditingProduct({...editingProduct, featured: e.target.checked})} className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500" />
                      <span className="text-sm font-bold text-gray-700">Producto Destacado</span>
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
                  
                  <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm animate-in fade-in duration-300">
                    <h3 className="font-bold text-gray-900 mb-4 border-b pb-2">Resumen</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-gray-500">Fecha</span> <span>{new Date(viewingQuote.date).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short', hour12: false })}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Artículos</span> <span>{viewingQuote.items.length}</span></div>
                      {viewingQuote.client.deliveryTime && (
                        <div className="flex justify-between"><span className="text-gray-500">Tiempo de Entrega</span> <span className="font-medium text-gray-900">{viewingQuote.client.deliveryTime}</span></div>
                      )}
                      <div className="flex justify-between font-bold text-lg mt-4 pt-4 border-t border-gray-100"><span className="text-gray-900">Total</span> <span className="text-primary-700">${viewingQuote.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span></div>
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm animate-in fade-in duration-300">
                    <h3 className="font-bold text-gray-900 mb-4 border-b pb-2">Ajustes de Cotización</h3>
                    <form onSubmit={handleSaveQuoteDetails} className="space-y-4 text-sm">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Precio Final Impresión</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="Reemplaza estimado"
                          value={finalPrintPrice}
                          onChange={(e) => setFinalPrintPrice(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Precio Final Envío</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="Costo de envío"
                          value={finalShippingPrice}
                          onChange={(e) => setFinalShippingPrice(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tiempo de Entrega</label>
                        <input
                          type="text"
                          placeholder="Ej. 5-7 días hábiles"
                          value={deliveryTime}
                          onChange={(e) => setDeliveryTime(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Dirección</label>
                        <input
                          type="text"
                          placeholder="Dirección del cliente"
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Código Postal</label>
                        <input
                          type="text"
                          placeholder="CP"
                          value={zip}
                          onChange={(e) => setZip(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-primary-500 focus:border-primary-500"
                        />
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
                  {viewingQuote.items.map(item => (
                    <div key={item.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                      <div className="flex items-start gap-4 mb-4 border-b border-gray-100 pb-4">
                        <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden shrink-0 border border-gray-200">
                          <img src={item.mockupImage || item.image} alt="" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-gray-900">{item.productName}</h4>
                          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500 mt-1 items-center">
                            <span>SKU: {item.sku}</span>
                            <span className="flex items-center gap-1">
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
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-gray-900">{item.quantity} pz</div>
                          <div className="text-xs text-gray-500 text-primary-600 font-bold">${item.totalPrice.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</div>
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
                  ))}
                </div>
                
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
