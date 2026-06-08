import React, { useState, useEffect } from "react";
import { Eye, Trash2, X, FileText, Download, Truck } from "lucide-react";
import { QuoteRequest } from "@/types";
import { formatCurrency, formatCurrencyMXN, formatDate } from "@/utils/formatters";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/lib/supabase";

interface AdminQuotesListProps {
  quotes: QuoteRequest[];
  updateQuoteStatus: (id: string, status: 'pending' | 'reviewed' | 'completed') => any;
  deleteQuote: (id: string) => any;
  updateQuote: (quote: QuoteRequest) => any;
  homeSettings: any;
}

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

export function AdminQuotesList({
  quotes,
  updateQuoteStatus,
  deleteQuote,
  updateQuote,
  homeSettings
}: AdminQuotesListProps) {
  const [viewingQuote, setViewingQuote] = useState<QuoteRequest | null>(null);

  // States for quote editing
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [itemAdjustments, setItemAdjustments] = useState<Record<string, { finalPrintPrice: string; finalShippingPrice: string }>>({});
  const [deliveryTime, setDeliveryTime] = useState<string>("");
  const [address, setAddress] = useState<string>("");
  const [zip, setZip] = useState<string>("");
  const [isSavingQuote, setIsSavingQuote] = useState(false);

  // Shipping states
  const [shippingBoxes, setShippingBoxes] = useState<number>(1);
  const [shippingWeight, setShippingWeight] = useState<number>(10);
  const [shippingInitialCost, setShippingInitialCost] = useState<number>(0);
  const [shippingSelectedCarrier, setShippingSelectedCarrier] = useState<string>("dhl");
  const [shippingLength, setShippingLength] = useState<number>(30);
  const [shippingWidth, setShippingWidth] = useState<number>(30);
  const [shippingHeight, setShippingHeight] = useState<number>(30);

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

  const getQuoteTotals = (quote: QuoteRequest, customPrices?: Record<string, number>) => {
    let baseProductSubtotal = 0;
    let printSubtotal = 0;
    let shippingSubtotal = 0;

    const pricesToUse = customPrices || activePrintPrices;

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

  useEffect(() => {
    if (viewingQuote) {
      const initialAdjustments: Record<string, { finalPrintPrice: string; finalShippingPrice: string }> = {};
      
      viewingQuote.items.forEach(item => {
        const estPrintPrice = item.isPersonalized ? (activePrintPrices[item.printOption] || 0) : 0;
        
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

  const handleDownloadQuotePdf = async (quote: QuoteRequest) => {
    try {
      let rfc = "No especificado";
      let paymentTerms = "50% de anticipo para iniciar producción y 50% restante contra entrega.";
      let priceLevel = "";
      
      const customerId = (quote.client as any).customerId;
      if (customerId) {
        try {
          const { data: customerData } = await supabase
            .from("customers")
            .select("rfc, payment_terms, price_level")
            .eq("id", customerId)
            .maybeSingle();
          
          if (customerData) {
            if (customerData.rfc) rfc = customerData.rfc;
            if (customerData.payment_terms) paymentTerms = customerData.payment_terms;
            if (customerData.price_level) priceLevel = customerData.price_level;
          }
        } catch (e) {
          console.warn("Failed to fetch customer profile for PDF:", e);
        }
      }

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

      const imgElements: Record<string, HTMLImageElement> = {};
      for (const item of quote.items) {
        const imgSrc = item.mockupImage || item.image;
        if (imgSrc) {
          const el = await getImageElement(imgSrc);
          if (el) imgElements[item.id] = el;
        }
      }

      const doc = new jsPDF();
      const primaryColor: [number, number, number] = [11, 80, 77]; // #0b504d

      doc.setFillColor(...primaryColor);
      doc.rect(0, 0, 210, 25, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.text("COTIZACIÓN B2B - GEEKYSTORE", 14, 17);

      doc.setTextColor(50, 50, 50);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("DATOS DEL CLIENTE", 14, 35);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`Cliente: ${quote.client.name}`, 14, 41);
      doc.text(`Empresa: ${quote.client.company}`, 14, 46);
      doc.text(`RFC: ${rfc}`, 14, 51);
      doc.text(`Email: ${quote.client.email}`, 14, 56);
      doc.text(`Teléfono: ${quote.client.phone}`, 14, 61);

      doc.text(`Dirección: ${quote.client.address || 'No especificada'}`, 110, 41);
      doc.text(`Destino: ${quote.client.city || ''}, ${quote.client.state || ''} CP: ${quote.client.zip || ''}`, 110, 46);
      doc.text(`Cond. Pago: ${paymentTerms}`, 110, 51);
      doc.text(`Tiempo Entrega: ${quote.client.deliveryTime || 'Por confirmar'}`, 110, 56);
      if (priceLevel) {
        doc.text(`Nivel de Cliente: B2B ${priceLevel.toUpperCase()}`, 110, 61);
      }

      const { subtotal, iva, total } = getQuoteTotals(quote, activePrintPrices);

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
          "", // Image
          item.sku,
          productoDesc,
          item.quantity.toString(),
          formatCurrency(baseProdPrice),
          formatCurrency(unitPrintPrice),
          formatCurrency(unitShippingPrice),
          formatCurrency(itemSubtotal)
        ];
      });

      autoTable(doc, {
        startY: 68,
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

      const finalY = (doc as any).lastAutoTable.finalY || 65;
      const rightAlignX = 196;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(50, 50, 50);
      
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
        doc.text(`Cupones Aplicados: ${couponNames}`, 14, finalY + 12);
        
        // Reset styles for the following totals
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(50, 50, 50);
      }

      let textY = finalY + 12;
      doc.text("Subtotal:", 140, textY);
      doc.text(formatCurrencyMXN(subtotal), rightAlignX, textY, { align: "right" });
      
      textY += 6;
      doc.text("IVA (16%):", 140, textY);
      doc.text(formatCurrencyMXN(iva), rightAlignX, textY, { align: "right" });
      
      textY += 7;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(11, 80, 77);
      doc.text("Total:", 140, textY);
      doc.text(formatCurrencyMXN(total), rightAlignX, textY, { align: "right" });

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
        `Condiciones de pago: ${paymentTerms}`,
        "Los tiempos de entrega acordados comenzarán a correr una vez recibido el anticipo correspondiente.",
        "La presente cotización tiene una vigencia de 15 días naturales a partir de la fecha de emisión."
      ];
      
      disclaimerLines.forEach((line, index) => {
        doc.text(`• ${line}`, 14, notesStartY + 7 + (index * 5));
      });

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

      const pdfBlob = doc.output('blob');

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

      try {
        const reader = new FileReader();
        reader.readAsDataURL(pdfBlob);
        reader.onloadend = async () => {
          try {
            const base64data = reader.result as string;
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch('/api/save-quote-pdf', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session?.access_token || ''}`
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

  const volumetricWeight = Math.round(((shippingLength * shippingWidth * shippingHeight) / 5000) * 10) / 10;
  const billableWeightPerBox = Math.max(shippingWeight, volumetricWeight);

  const selectedItem = viewingQuote?.items.find(item => item.id === selectedItemId);
  const carriers = viewingQuote ? calculateCarrierCosts(shippingBoxes, billableWeightPerBox, "20000", zip || viewingQuote.client.zip || "20000") : [];
  const carrier = carriers.find(c => c.id === shippingSelectedCarrier) || carriers[0];
  const carrierCost = carrier ? carrier.cost : 0;
  const sumCost = shippingInitialCost + carrierCost;
  const markup = sumCost * 0.10;
  const finalShippingTotal = sumCost + markup;

  // Initialize calculator boxes based on item quantity and supplier box capacity
  useEffect(() => {
    if (viewingQuote && selectedItemId) {
      const item = viewingQuote.items.find(i => i.id === selectedItemId);
      if (item) {
        const assoc = homeSettings?.product_supplier_map?.[item.productId];
        const piecesPerBox = assoc?.piecesPerBox || 50;
        const calculatedBoxes = Math.max(1, Math.ceil(item.quantity / piecesPerBox));
        setShippingBoxes(calculatedBoxes);
      }
    }
  }, [selectedItemId, viewingQuote, homeSettings]);

  return (
    <div className="p-6 animate-in fade-in duration-300">
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
                  <div className="text-xs text-gray-400">{formatDate(quote.date)}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="font-bold text-gray-900">{quote.client.company}</div>
                  <div className="text-xs text-gray-500">{quote.client.name}</div>
                </td>
                <td className="px-6 py-4 text-center font-medium">
                  {quote.items.length}
                </td>
                <td className="px-6 py-4 text-right font-medium text-gray-900">
                  {formatCurrency(quote.total)}
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
            
            <div className="p-6 overflow-y-auto flex-1 bg-gray-50/50 text-left">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Client Data */}
                <div className="md:col-span-1 space-y-4">
                  <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
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
                      {Array.isArray((viewingQuote.client as any).appliedCoupons) && (viewingQuote.client as any).appliedCoupons.length > 0 && (
                        <div>
                          <span className="text-gray-500 block text-xs uppercase font-semibold">Cupones Aplicados</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {(viewingQuote.client as any).appliedCoupons.map((code: string) => (
                              <span key={code} className="bg-green-100 text-green-800 border border-green-200 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                                {code === 'ENVIO_SIN_COSTO' ? 'Envío sin Costo' :
                                 code === 'MUESTRA_Y_ENVIO_GRATIS' ? 'Muestra + Envío Gratis' : code}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {(() => {
                    const { subtotal, iva, total } = getQuoteTotals(viewingQuote);
                    const headerDeliveryTime = deliveryTime || viewingQuote.client.deliveryTime;
                    
                    return (
                      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                        <h3 className="font-bold text-gray-900 mb-4 border-b pb-2">Resumen</h3>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between"><span className="text-gray-500">Fecha</span> <span>{formatDate(viewingQuote.date)}</span></div>
                          <div className="flex justify-between"><span className="text-gray-500">Artículos</span> <span>{viewingQuote.items.length}</span></div>
                          {headerDeliveryTime && (
                            <div className="flex justify-between"><span className="text-gray-500">Tiempo de Entrega</span> <span className="font-medium text-gray-900">{headerDeliveryTime}</span></div>
                          )}
                          <div className="flex justify-between mt-2 pt-2 border-t border-gray-100"><span className="text-gray-500">Subtotal</span> <span className="font-medium text-gray-900">{formatCurrency(subtotal)}</span></div>
                          <div className="flex justify-between"><span className="text-gray-500">IVA (16%)</span> <span className="font-medium text-gray-900">{formatCurrency(iva)}</span></div>
                          <div className="flex justify-between font-bold text-lg mt-2 pt-2 border-t border-gray-150"><span className="text-gray-900">Total</span> <span className="text-primary-700">{formatCurrency(total)}</span></div>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="font-bold text-gray-900 mb-4 border-b pb-2">Ajustes de Cotización</h3>
                    <form onSubmit={handleSaveQuoteDetails} className="space-y-4 text-sm">
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
                              Subtotal: {formatCurrency(itemSubtotal)}
                            </div>
                          </div>
                        </div>

                        {/* Adjustments Summary for this Item */}
                        <div className="bg-gray-50 rounded-lg p-3 text-xs grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div>
                            <span className="text-gray-400 block font-semibold text-[10px] uppercase">Precio Base</span>
                            <span className="font-bold text-gray-700">{formatCurrency(baseProdPrice)} c/u</span>
                          </div>
                          <div>
                            <span className="text-gray-400 block font-semibold text-[10px] uppercase">Impresión Final</span>
                            <span className="font-bold text-gray-700">
                              {item.isPersonalized 
                                ? `${formatCurrency(finalPrintPriceVal)} c/u` 
                                : "Sin Impresión"
                              }
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-400 block font-semibold text-[10px] uppercase">Envío Final</span>
                            <span className="font-bold text-gray-700">{formatCurrency(finalShippingPriceVal)} (Total)</span>
                          </div>
                          <div>
                            <span className="text-gray-400 block font-semibold text-[10px] uppercase">Precio Total Unitario</span>
                            <span className="font-extrabold text-primary-700">
                              {formatCurrency((baseProdPrice + (item.isPersonalized ? finalPrintPriceVal : 0)) + (finalShippingPriceVal / item.quantity))} c/u
                            </span>
                          </div>
                        </div>
                      
                      {/* Attached Mockups */}
                      {(item.mockupImage || item.blueprintImage) && (
                        <div className="bg-gray-50 rounded-lg p-3 mt-3">
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
                            <span>2. Destino Estimado</span>
                            <span className="text-[10px] text-gray-450 font-mono font-bold">Origen: 20000</span>
                          </h5>
                          <div className="space-y-4 flex-grow flex flex-col justify-between">
                            <div>
                              <div className="text-xs text-gray-500 mb-3 grid grid-cols-2 gap-x-2 gap-y-1">
                                <div>Cajas: <strong>{shippingBoxes} pz</strong></div>
                                <div>Peso Real: <strong>{totalRealWeight} kg</strong></div>
                                <div>Volumétrico: <strong>{totalVolumetricWeight} kg</strong></div>
                                <div>Facturable: <strong>{totalBillableWeight} kg</strong></div>
                              </div>

                              <div className="space-y-2 mt-2">
                                {carriers.map(c => (
                                  <label key={c.id} className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-all ${shippingSelectedCarrier === c.id ? 'border-primary-500 bg-primary-50/50 shadow-sm ring-2 ring-primary-50' : 'border-gray-150 bg-white hover:bg-gray-50/50'}`}>
                                    <div className="flex items-center gap-2">
                                      <input 
                                        type="radio" 
                                        name="selectedCarrier" 
                                        checked={shippingSelectedCarrier === c.id} 
                                        onChange={() => setShippingSelectedCarrier(c.id)}
                                        className="w-3.5 h-3.5 text-primary-600 border-gray-300 focus:ring-primary-500"
                                      />
                                      <div className="text-left">
                                        <span className="font-bold text-gray-800 block text-xs">{c.name}</span>
                                        <span className="text-[9px] text-gray-400 block -mt-0.5">{c.time}</span>
                                      </div>
                                    </div>
                                    <span className="font-mono font-extrabold text-primary-850 text-sm">
                                      {formatCurrency(c.cost)}
                                    </span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Recuadro 3: Resumen y Total de Envío */}
                        <div className="bg-white p-5 rounded-xl border border-gray-250 shadow-sm flex flex-col justify-between">
                          <div>
                            <h5 className="font-extrabold text-gray-800 text-xs uppercase tracking-wider mb-4 pb-2 border-b border-gray-100 flex items-center justify-between">
                              <span>3. Resumen de Envío</span>
                              <span className="text-[10px] text-emerald-600 font-bold">Markup: 10%</span>
                            </h5>
                            <div className="space-y-2.5 text-xs text-gray-600">
                              <div className="flex justify-between">
                                <span>Costo Envío Inicio:</span>
                                <span className="font-semibold text-gray-855">{formatCurrency(shippingInitialCost)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Tarifa Carrier ({carrier ? carrier.name : '-'}):</span>
                                <span className="font-semibold text-gray-855">{formatCurrency(carrierCost)}</span>
                              </div>
                              <div className="flex justify-between pt-2 border-t border-dashed">
                                <span className="font-bold">Costo Base de Envío:</span>
                                <span className="font-bold text-gray-900">{formatCurrency(sumCost)}</span>
                              </div>
                              <div className="flex justify-between text-emerald-700">
                                <span>Ganancia Requerida (+10%):</span>
                                <span className="font-bold text-primary-750">{formatCurrency(markup)}</span>
                              </div>
                              <div className="flex justify-between items-center pt-3 border-t-2 border-double border-gray-200 mt-2">
                                <span className="font-extrabold text-gray-850 text-sm">Precio Final Envío:</span>
                                <span className="text-xl font-black text-emerald-700 font-mono">
                                  {formatCurrencyMXN(finalShippingTotal)}
                                </span>
                              </div>
                            </div>
                          </div>

                          {selectedItem && (
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
                                alert(`Se aplicó el costo de envío de ${formatCurrency(finalShippingTotal)} al artículo seleccionado. Recuerda guardar los cambios de la cotización.`);
                              }}
                              className="w-full bg-emerald-650 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-lg shadow-sm transition-all text-xs text-center mt-6"
                            >
                              Aplicar Envío a Artículo
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
