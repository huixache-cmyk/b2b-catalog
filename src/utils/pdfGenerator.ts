import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Product } from "@/types";

export const generatePdfCatalog = async (products: Product[]) => {
  const activeProducts = products.filter(p => p.stock > 0);

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

  // Preload images
  const imgElements: Record<string, HTMLImageElement> = {};
  for (const p of activeProducts) {
    if (p.images && p.images[0]) {
      const el = await getImageElement(p.images[0]);
      if (el) imgElements[p.id || p.sku] = el;
    }
  }

  const doc = new jsPDF();
  const primaryColor: [number, number, number] = [11, 80, 77]; // #0b504d
  const secondaryColor: [number, number, number] = [64, 192, 185]; // #40c0b9

  // PAGE 1: COVER
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, 210, 297, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(40);
  doc.text("CATÁLOGO B2B", 105, 100, { align: "center" });
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(20);
  doc.text(`Nueva colección ${new Date().getFullYear()}`, 105, 120, { align: "center" });
  
  doc.setFont("helvetica", "italic");
  doc.setFontSize(14);
  doc.text("Expertos en promocionales corporativos", 105, 130, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.setTextColor(...secondaryColor);
  doc.text("</ geeky store >", 105, 250, { align: "center" });

  // PAGE 2+: PRODUCT LIST
  doc.addPage();
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...primaryColor);
  doc.text("Listado de Productos B2B", 14, 20);

  const tableData = activeProducts.length > 0 ? activeProducts.map(p => [
    "", // Image placeholder
    p.sku,
    p.name,
    p.category,
    p.colors && p.colors.length > 0 ? `${p.colors.length}` : "-",
    p.price ? `$${p.price.toFixed(2)}` : "-"
  ]) : [["", "-", "No hay productos activos", "-", "-", "-"]];

  autoTable(doc, {
    startY: 30,
    head: [['', 'SKU', 'Producto', 'Categoría', 'Colores', 'Precio Base']],
    body: tableData,
    headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [240, 248, 247] },
    styles: { font: 'helvetica', fontSize: 9, minCellHeight: 20, valign: 'middle' },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 25 },
      2: { cellWidth: 60 }
    },
    didDrawCell: (data) => {
      if (data.section === 'body' && data.column.index === 0 && activeProducts.length > 0) {
        const product = activeProducts[data.row.index];
        if (product) {
          const imgEl = imgElements[product.id || product.sku];
          if (imgEl) {
            const dim = 16;
            try {
              doc.addImage(imgEl, 'PNG', data.cell.x + 2, data.cell.y + 2, dim, dim);
            } catch (e) {
              console.warn("Could not add image to PDF", e);
            }
          }
        }
      }
    }
  });

  const finalY = (doc as any).lastAutoTable.finalY || 40;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text("Notas Importantes:", 14, finalY + 15);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("* Todos los precios están sujetos a cambios sin previo aviso y no incluyen IVA.", 14, finalY + 22);
  doc.text("* El costo de envío se calculará en base al volumen y peso del pedido al momento de formalizar la cotización.", 14, finalY + 28);
  doc.text("* La disponibilidad de inventario debe confirmarse por nuestros agentes de venta.", 14, finalY + 34);

  const pdfBlob = doc.output('blob');

  try {
    if ('showSaveFilePicker' in window) {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: 'Catalogo_GeekyStore.pdf',
        types: [{ description: 'Documento PDF', accept: { 'application/pdf': ['.pdf'] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(pdfBlob);
      await writable.close();
      return;
    }
  } catch (err: any) {
    if (err.name === 'AbortError') return;
  }

  const url = URL.createObjectURL(pdfBlob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.setAttribute('download', 'Catalogo_GeekyStore.pdf');
  document.body.appendChild(a);
  a.click();
  
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
};
