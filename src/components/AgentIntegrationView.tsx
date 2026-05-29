"use client";

import { useState, useRef, useEffect } from "react";
import { Upload, Image as ImageIcon, Search, CheckCircle, Trash2, Wand2, PenTool, Database, Download, Loader2, Globe } from "lucide-react";
import { removeBackground } from "@imgly/background-removal";
import { Product } from "@/types";
import { useProducts } from "@/hooks/useProducts";
import { uploadImage } from "@/lib/supabase";

type AnalysisResult = {
  productName: string;
  category: string;
  material: string;
  specifications: string[];
  keywordsEn: string;
  keywordsEs: string;
  searchQueries: string[];
  alibabaQuery?: string;
  amazonQuery?: string;
  mercadolibreQuery?: string;
};

export function AgentIntegrationView() {
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [sourceImagePublicUrl, setSourceImagePublicUrl] = useState<string | null>(null);
  const [isUploadingSource, setIsUploadingSource] = useState(false);
  const [editableAlibabaQuery, setEditableAlibabaQuery] = useState("");
  const [editableAmazonQuery, setEditableAmazonQuery] = useState("");
  const [editableMercadolibreQuery, setEditableMercadolibreQuery] = useState("");

  const [groupImage, setGroupImage] = useState<string | null>(null);
  const [individualImages, setIndividualImages] = useState<(string | null)[]>([null, null, null]);
  const [techImage, setTechImage] = useState<string | null>(null);
  const [hoveredZone, setHoveredZone] = useState<string | null>(null);

  const [isRemovingBg, setIsRemovingBg] = useState(false);
  const [bgProgress, setBgProgress] = useState("");
  const [isRemovingGroupBg, setIsRemovingGroupBg] = useState(false);
  const [isGeneratingBlueprint, setIsGeneratingBlueprint] = useState(false);
  const [showBlueprintEditor, setShowBlueprintEditor] = useState(false);
  const [blueprintSettings, setBlueprintSettings] = useState({
    realHeightCm: 24,
    logoWidthPercent: 40,
    logoHeightPercent: 30,
    logoOffsetX: 0,
    logoOffsetY: 0,
    logoRotation: 0
  });
  const [isSaving, setIsSaving] = useState(false);
  const [selectedProductIdToUpdate, setSelectedProductIdToUpdate] = useState<string>("");
  const [isUpdatingExisting, setIsUpdatingExisting] = useState(false);

  const { products, addProduct, updateProduct } = useProducts();

  const resizeImage = (file: File, maxWidth = 1000, maxHeight = 1000): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new window.Image();
        img.onload = () => {
          let { width, height } = img;
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = width * ratio;
            height = height * ratio;
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.8));
          } else {
            resolve(e.target?.result as string);
          }
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const processSourceImage = async (file: File, base64: string) => {
    setSourceImage(base64);
    
    // Auto-upload and analyze
    setIsUploadingSource(true);
    setIsAnalyzing(true);
    setSourceImagePublicUrl(null); // Reset previous URL

    try {
      const publicUrl = await uploadImage(file);
      if (publicUrl) {
        setSourceImagePublicUrl(publicUrl);
      }
    } catch (uploadError) {
      console.error("Error uploading source image to Supabase:", uploadError);
    } finally {
      setIsUploadingSource(false);
    }

    try {
      const res = await fetch('/api/analyze-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64 })
      });
      
      const textResponse = await res.text();
      let data;
      try {
        data = JSON.parse(textResponse);
      } catch(e) {
        throw new Error(res.status === 413 ? 'La imagen es demasiado pesada para el servidor (Payload Too Large).' : 'El servidor devolvió una respuesta no válida.');
      }

      if (!res.ok) throw new Error(data.error || `Error del servidor (${res.status})`);
      
      setAnalysis(data.data);
      
      // Initialise editable search queries
      setEditableAlibabaQuery(data.data.alibabaQuery || data.data.keywordsEn || "");
      setEditableAmazonQuery(data.data.amazonQuery || data.data.keywordsEs || "");
      setEditableMercadolibreQuery(data.data.mercadolibreQuery || data.data.keywordsEs || "");
    } catch (error: any) {
      console.error(error);
      alert(`Hubo un error al analizar la imagen: ${error.message}. Revisa la consola o asegúrate de tener la API Key correcta.`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSourceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const base64 = await resizeImage(file, 2000, 2000);
        await processSourceImage(file, base64);
      } catch (err) {
        console.error("Error resizing image:", err);
        alert("No se pudo procesar la imagen seleccionada.");
      }
    }
  };

  useEffect(() => {
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
      
      try {
        const base64 = await resizeImage(imageFile, 2000, 2000);
        
        if (hoveredZone === "source") {
          await processSourceImage(imageFile, base64);
        } else if (hoveredZone === "group") {
          setGroupImage(base64);
        } else if (hoveredZone && hoveredZone.startsWith("ind-")) {
          const idx = parseInt(hoveredZone.split("-")[1]);
          setIndividualImages(prev => {
            const newArr = [...prev];
            newArr[idx] = base64;
            return newArr;
          });
        } else {
          // Global fallback paste
          if (!sourceImage) {
            await processSourceImage(imageFile, base64);
          } else {
            const emptyIdx = individualImages.findIndex(img => img === null);
            if (emptyIdx !== -1) {
              setIndividualImages(prev => {
                const newArr = [...prev];
                newArr[emptyIdx] = base64;
                return newArr;
              });
            } else if (!groupImage) {
              setGroupImage(base64);
            } else {
              await processSourceImage(imageFile, base64);
            }
          }
        }
      } catch (err) {
        console.error("Error processing pasted image:", err);
        alert("No se pudo procesar la imagen pegada.");
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => {
      window.removeEventListener("paste", handlePaste);
    };
  }, [hoveredZone, sourceImage, individualImages, groupImage]);

  const handleManualUpload = async (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string | null) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const base64 = await resizeImage(file, 1000, 1000);
        setter(base64);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const openAlibabaSearch = () => {
    const query = editableAlibabaQuery || (analysis ? (analysis.alibabaQuery || analysis.keywordsEn) : "");
    if (query) {
      window.open(`https://www.alibaba.com/trade/search?SearchText=${encodeURIComponent(query)}`, '_blank');
    }
  };

  const openAmazonSearch = () => {
    const query = editableAmazonQuery || (analysis ? (analysis.amazonQuery || analysis.keywordsEs) : "");
    if (query) {
      window.open(`https://www.amazon.com.mx/s?k=${encodeURIComponent(query)}`, '_blank');
    }
  };

  const openMercadoLibreSearch = () => {
    const query = editableMercadolibreQuery || (analysis ? (analysis.mercadolibreQuery || analysis.keywordsEs) : "");
    if (query) {
      window.open(`https://listado.mercadolibre.com.mx/${encodeURIComponent(query)}`, '_blank');
    }
  };

  const openGoogleLensSearch = () => {
    if (sourceImagePublicUrl) {
      window.open(`https://lens.google.com/uploadbyurl?url=${encodeURIComponent(sourceImagePublicUrl)}`, '_blank');
    }
  };

  // 1. Remove Background using local client-side AI (GPU accelerated + progress bar)
  const handleRemoveBackground = async (imageSrc: string | null, setImg: (val: string | null) => void, setLoading: React.Dispatch<React.SetStateAction<boolean>>) => {
    if (!imageSrc) return;
    setLoading(true);
    setBgProgress("Inicializando motor local de IA (0%)...");
    try {
      const blob = await removeBackground(imageSrc, {
        device: 'gpu',
        progress: (key, current, total) => {
          const percent = Math.round((current / total) * 100);
          const stage = key.includes('fetch') ? 'Descargando IA' : 'Procesando bordes';
          setBgProgress(`${stage} (${percent}%)...`);
        }
      });
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setImg(reader.result as string);
        setLoading(false);
        setBgProgress("");
      };
      reader.readAsDataURL(blob);
    } catch (error: any) {
      console.error("Error en remoción de fondo local:", error);
      alert(`Error al quitar el fondo: ${error?.message || error}. Asegúrate de que la imagen sea nítida y tenga buen contraste.`);
      setLoading(false);
      setBgProgress("");
    }
  };

  // 2. Generate Canvas Blueprint Dynamically
  const handleGenerateBlueprintClick = () => {
    setIsGeneratingBlueprint(true);
    setShowBlueprintEditor(true);
  };

  useEffect(() => {
    const mainIndividualImage = individualImages.find(img => img !== null);
    if (!showBlueprintEditor || !mainIndividualImage) return;
    
    let isMounted = true;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      if (!isMounted) return;
      
      canvas.width = img.width + 100;
      canvas.height = img.height + 100;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = '#e5e7eb'; // Light gray grid
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 20) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 20) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
      }

      ctx.filter = 'grayscale(100%) opacity(40%) contrast(120%)';
      ctx.drawImage(img, 50, 50);
      
      ctx.filter = 'none';

      // Dimensions calculation
      const ratio = img.width / img.height;
      const realWidthCm = (blueprintSettings.realHeightCm * ratio).toFixed(1);
      
      const logoW_cm = ((blueprintSettings.logoWidthPercent / 100) * parseFloat(realWidthCm)).toFixed(1);
      const logoH_cm = ((blueprintSettings.logoHeightPercent / 100) * blueprintSettings.realHeightCm).toFixed(1);

      // 3. Draw Dimension Lines
      ctx.strokeStyle = '#2563eb'; // Blue for dimensions
      ctx.fillStyle = '#2563eb';
      ctx.lineWidth = 2;
      ctx.font = '600 18px sans-serif';

      ctx.beginPath(); ctx.moveTo(30, 50); ctx.lineTo(30, canvas.height - 50); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(20, 50); ctx.lineTo(40, 50); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(20, canvas.height - 50); ctx.lineTo(40, canvas.height - 50); ctx.stroke();
      
      ctx.save();
      ctx.translate(20, canvas.height / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = "center";
      ctx.fillText(`${blueprintSettings.realHeightCm} cm`, 0, 0);
      ctx.restore();

      ctx.beginPath(); ctx.moveTo(50, canvas.height - 30); ctx.lineTo(canvas.width - 50, canvas.height - 30); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(50, canvas.height - 40); ctx.lineTo(50, canvas.height - 20); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(canvas.width - 50, canvas.height - 40); ctx.lineTo(canvas.width - 50, canvas.height - 20); ctx.stroke();
      
      ctx.textAlign = "center";
      ctx.fillText(`${realWidthCm} cm`, canvas.width / 2, canvas.height - 10);

      // 4. Draw Print Area (Logo)
      const printW = img.width * (blueprintSettings.logoWidthPercent / 100);
      const printH = img.height * (blueprintSettings.logoHeightPercent / 100);
      const centerX = 50 + img.width / 2 + (img.width * (blueprintSettings.logoOffsetX / 100));
      const centerY = 50 + img.height / 2 + (img.height * (blueprintSettings.logoOffsetY / 100));

      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate((blueprintSettings.logoRotation * Math.PI) / 180);
      
      ctx.strokeStyle = '#dc2626'; // Red for print area
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(-printW / 2, -printH / 2, printW, printH);
      ctx.setLineDash([]);
      
      ctx.fillStyle = '#dc2626';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText(`${logoW_cm} x ${logoH_cm} cm`, 0, -10);
      ctx.font = '12px sans-serif';
      ctx.fillText("(Área Logo)", 0, 15);
      
      ctx.restore();

      setTechImage(canvas.toDataURL('image/jpeg', 0.7));
      setIsGeneratingBlueprint(false);
    };
    img.src = mainIndividualImage;

    return () => { isMounted = false; };
  }, [showBlueprintEditor, individualImages, blueprintSettings]);

  const publishToCatalog = () => {
    const mainIndividualImage = individualImages.find(img => img !== null);
    if (!analysis || !mainIndividualImage) {
      alert("Falta el análisis de la IA o al menos una imagen individual.");
      return;
    }
    
    setIsSaving(true);
    
    const newProduct: Product = {
      id: "AG-" + Math.random().toString(36).substring(2, 9),
      name: analysis.productName,
      sku: "SKU-" + Math.floor(Math.random() * 10000),
      description: `Material: ${analysis.material}. Características: ${analysis.specifications.join(', ')}.`,
      price: 0,
      stock: 100,
      category: analysis.category,
      material: analysis.material,
      images: [
        groupImage || "",
        individualImages[0] || "",
        individualImages[1] || "",
        individualImages[2] || "",
        techImage || ""
      ],
      colors: [],
      isNew: true
    };

    addProduct(newProduct);
    
    setTimeout(() => {
      setIsSaving(false);
      alert("¡Producto publicado en el catálogo exitosamente!");
      // Reset
      setSourceImage(null);
      setAnalysis(null);
      setGroupImage(null);
      setIndividualImages([null, null, null]);
      setShowBlueprintEditor(false);
    }, 800);
  };

  const updateExistingProductPhotos = async () => {
    if (!selectedProductIdToUpdate) {
      alert("Por favor selecciona un producto.");
      return;
    }
    const targetProduct = products.find(p => p.id === selectedProductIdToUpdate);
    if (!targetProduct) return;

    const hasNewImages = groupImage || individualImages.some(img => img !== null) || techImage;
    if (!hasNewImages) {
      alert("No hay nuevas imágenes o planos en la IA para copiar.");
      return;
    }

    setIsUpdatingExisting(true);
    try {
      const targetImages = targetProduct.images || [];

      // 1. Selectively update only the fields that were modified/generated in the IA panel
      const finalGroupImage = groupImage || targetImages[0] || "";
      const finalTechImage = techImage || targetImages[4] || "";

      const finalIndividualImages = [
        individualImages[0] || targetImages[1] || "",
        individualImages[1] || targetImages[2] || "",
        individualImages[2] || targetImages[3] || ""
      ];

      // 2. Re-assemble the fixed-index images array of length 5
      const mergedImages = [
        finalGroupImage,
        ...finalIndividualImages,
        finalTechImage
      ];

      const updatedProduct: Product = {
        ...targetProduct,
        images: mergedImages
      };
      
      await updateProduct(updatedProduct);
      alert(`¡Fotos del producto "${targetProduct.name}" actualizadas con éxito!`);
      
      // Reset
      setSourceImage(null);
      setAnalysis(null);
      setGroupImage(null);
      setIndividualImages([null, null, null]);
      setShowBlueprintEditor(false);
      setSelectedProductIdToUpdate("");
    } catch (err) {
      console.error(err);
      alert("Error al actualizar las fotos.");
    } finally {
      setIsUpdatingExisting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Inteligencia de Productos IA</h2>
          <p className="text-gray-500 mt-1">Sube una foto de WhatsApp, automatiza la búsqueda, diseña las imágenes y publícalo directo al catálogo.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* COL 1: Fuente e IA */}
        <div className="space-y-6">
          <div 
            onMouseEnter={() => setHoveredZone("source")}
            onMouseLeave={() => setHoveredZone(null)}
            className={`bg-white p-6 rounded-xl border shadow-sm transition-all duration-300 ${hoveredZone === "source" ? "ring-2 ring-blue-500/20 border-blue-500/50 bg-blue-50/5" : ""}`}
          >
            <h3 className="font-semibold text-lg flex items-center gap-2 mb-4">
              <span className="bg-blue-100 text-blue-700 w-6 h-6 rounded-full flex items-center justify-center text-sm">1</span>
              Imagen Origen (WhatsApp)
            </h3>
            {!sourceImage ? (
              <label className="border-2 border-dashed border-gray-300 hover:border-blue-400 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors group">
                <Upload className="h-10 w-10 text-gray-400 mb-2 group-hover:text-blue-500 group-hover:scale-110 transition-all duration-300" />
                <span className="text-sm text-gray-600 font-medium group-hover:text-blue-600">Sube la foto del cliente/proveedor</span>
                <span className="text-xs text-gray-400 mt-1.5 bg-gray-100 px-2 py-0.5 rounded border border-gray-200 shadow-sm group-hover:bg-blue-50 group-hover:border-blue-200 transition-colors">o presiona Ctrl+V para pegar</span>
                <input type="file" className="hidden" accept="image/*" onChange={handleSourceUpload} />
              </label>
            ) : (
              <div className="relative rounded-xl overflow-hidden group">
                <img src={sourceImage} alt="Source" className="w-full object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="text-xs text-white bg-black/60 px-3 py-1.5 rounded-lg border border-white/20">Presiona Ctrl+V para reemplazar</span>
                </div>
                <button onClick={() => setSourceImage(null)} className="absolute top-2 right-2 p-2 bg-black/50 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          <div className="bg-white p-6 rounded-xl border shadow-sm">
            <h3 className="font-semibold text-lg flex items-center gap-2 mb-4">
              <span className="bg-blue-100 text-blue-700 w-6 h-6 rounded-full flex items-center justify-center text-sm">2</span>
              Inteligencia y Búsqueda IA
            </h3>
            
            {isAnalyzing ? (
              <div className="flex flex-col items-center justify-center py-8 text-blue-600">
                <Loader2 className="h-8 w-8 animate-spin mb-2" />
                <span className="text-sm font-medium">Analizando producto con Gemini...</span>
                {isUploadingSource && (
                  <span className="text-xs text-gray-500 mt-1">Subiendo imagen origen a Supabase...</span>
                )}
              </div>
            ) : analysis ? (
              <div className="space-y-5">
                {/* Detalles de la IA */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-sm space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-200/60 pb-1.5">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Especificaciones Detectadas</span>
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">Gemini Flash</span>
                  </div>
                  <p><span className="font-medium text-slate-600">Producto:</span> <span className="text-slate-900 font-semibold">{analysis.productName}</span></p>
                  <p><span className="font-medium text-slate-600">Categoría:</span> <span className="text-slate-900">{analysis.category}</span></p>
                  <p><span className="font-medium text-slate-600">Material:</span> <span className="text-slate-900">{analysis.material}</span></p>
                  {analysis.specifications && analysis.specifications.length > 0 && (
                    <div className="mt-2">
                      <span className="font-medium text-slate-600">Detalles visuales:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {analysis.specifications.map((spec, i) => (
                          <span key={i} className="bg-white border border-slate-200 text-slate-700 text-xs px-2 py-0.5 rounded-md">
                            {spec}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Búsqueda Visual - Google Lens */}
                <div className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">Búsqueda Visual Inteligente</span>
                  {sourceImagePublicUrl ? (
                    <button 
                      onClick={openGoogleLensSearch}
                      className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 via-red-500 via-yellow-500 to-green-500 hover:opacity-90 text-white font-medium px-4 py-2.5 rounded-lg transition-all shadow-sm hover:scale-[1.01] active:scale-[0.99]"
                    >
                      <Globe className="w-4 h-4" />
                      Buscar Imagen con Google Lens
                    </button>
                  ) : (
                    <div className="border border-amber-200 bg-amber-50/50 rounded-lg p-2.5 text-xs text-amber-800">
                      {isUploadingSource ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Obteniendo enlace público de la imagen...</span>
                        </div>
                      ) : (
                        <span>No se generó enlace público. Sube la imagen de nuevo para usar Google Lens.</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Plataformas Individuales */}
                <div className="space-y-4 pt-2 border-t border-slate-100">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">Búsqueda de Coincidencia Exacta</span>
                  
                  {/* Alibaba */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-orange-600 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-500" /> Alibaba (Inglés)
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <input 
                        type="text"
                        value={editableAlibabaQuery}
                        onChange={(e) => setEditableAlibabaQuery(e.target.value)}
                        className="flex-1 text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50/50 focus:bg-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 transition-all text-slate-850"
                        placeholder="Términos para Alibaba"
                      />
                      <button 
                        onClick={openAlibabaSearch}
                        className="bg-orange-500 hover:bg-orange-600 text-white p-2 rounded-lg transition-colors flex items-center justify-center shrink-0 animate-fade-in"
                        title="Buscar en Alibaba"
                      >
                        <Search className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Amazon México */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-slate-700 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" /> Amazon México
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <input 
                        type="text"
                        value={editableAmazonQuery}
                        onChange={(e) => setEditableAmazonQuery(e.target.value)}
                        className="flex-1 text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50/50 focus:bg-white focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500/20 transition-all text-slate-850"
                        placeholder="Términos para Amazon MX"
                      />
                      <button 
                        onClick={openAmazonSearch}
                        className="bg-slate-800 hover:bg-slate-900 text-white p-2 rounded-lg transition-colors flex items-center justify-center shrink-0"
                        title="Buscar en Amazon México"
                      >
                        <Search className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Mercado Libre México */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-blue-700 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Mercado Libre México
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <input 
                        type="text"
                        value={editableMercadolibreQuery}
                        onChange={(e) => setEditableMercadolibreQuery(e.target.value)}
                        className="flex-1 text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50/50 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all text-slate-850"
                        placeholder="Términos para Mercado Libre"
                      />
                      <button 
                        onClick={openMercadoLibreSearch}
                        className="bg-yellow-400 hover:bg-yellow-500 text-slate-800 p-2 rounded-lg transition-colors flex items-center justify-center shrink-0"
                        title="Buscar en Mercado Libre México"
                      >
                        <Search className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8 text-sm">
                Sube la imagen para iniciar el análisis IA
              </div>
            )}
          </div>
        </div>

        {/* COL 2: Edición Automática */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-xl border shadow-sm">
            <h3 className="font-semibold text-lg flex items-center gap-2 mb-4">
              <span className="bg-blue-100 text-blue-700 w-6 h-6 rounded-full flex items-center justify-center text-sm">3</span>
              Diseño y Estandarización
            </h3>
            <p className="text-sm text-gray-500 mb-6">Sube la mejor foto individual que encontraste. La IA removerá el fondo y generará los planos mecánicos por ti.</p>

            <div className="flex flex-wrap gap-4">
              
              {/* Individual Images */}
              {[0, 1, 2].map(idx => {
                const img = individualImages[idx];
                const setImg = (val: string | null) => {
                  setIndividualImages(prev => {
                    const newArr = [...prev];
                    newArr[idx] = val;
                    return newArr;
                  });
                };
                const isHovered = hoveredZone === `ind-${idx}`;
                return (
                  <div 
                    key={`ind-${idx}`} 
                    onMouseEnter={() => setHoveredZone(`ind-${idx}`)}
                    onMouseLeave={() => setHoveredZone(null)}
                    className={`flex-1 min-w-[200px] border rounded-lg p-3 bg-gray-50 flex flex-col h-full transition-all duration-300 ${isHovered ? "ring-2 ring-indigo-500/20 border-indigo-500/50 bg-indigo-50/5" : ""}`}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-medium text-sm text-gray-700 flex items-center gap-1"><ImageIcon className="w-4 h-4"/> Individual {idx + 1}</h4>
                      {img && (
                        <button onClick={() => setImg(null)} className="text-red-500 hover:bg-red-50 p-1 rounded transition-colors" title="Eliminar imagen">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    {!img ? (
                      <label className="border-2 border-dashed border-gray-300 hover:border-indigo-400 rounded-lg flex-1 flex flex-col items-center justify-center cursor-pointer hover:bg-white transition-colors min-h-[120px] p-2 group">
                        <span className="text-xs text-gray-500 group-hover:text-indigo-600 font-medium">Subir foto B2B</span>
                        <span className="text-[10px] text-gray-400 mt-1 bg-white px-1.5 py-0.5 rounded border border-gray-200 group-hover:bg-indigo-50 group-hover:border-indigo-150 transition-colors">o presiona Ctrl+V</span>
                        <input type="file" className="hidden" accept="image/*" onChange={(e) => handleManualUpload(e, setImg)} />
                      </label>
                    ) : (
                      <div className="space-y-2 flex-1 flex flex-col relative group">
                        <img src={img} alt={`Individual ${idx + 1}`} className="w-full h-32 object-contain bg-white rounded border flex-1" />
                        <div className="absolute inset-0 bottom-10 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none rounded">
                          <span className="text-[9px] text-white bg-black/60 px-2 py-1 rounded border border-white/10">Ctrl+V para reemplazar</span>
                        </div>
                        <button 
                          onClick={() => handleRemoveBackground(img, setImg, setIsRemovingBg)}
                          disabled={isRemovingBg}
                          className="w-full text-xs flex items-center justify-center gap-1 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-2 py-2 rounded font-medium transition-colors"
                        >
                          {isRemovingBg ? <Loader2 className="w-3 h-3 animate-spin"/> : <Wand2 className="w-3 h-3"/>}
                          {isRemovingBg ? (bgProgress || "Borrando...") : "Quitar Fondo IA"}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Group Image */}
              <div 
                onMouseEnter={() => setHoveredZone("group")}
                onMouseLeave={() => setHoveredZone(null)}
                className={`flex-1 min-w-[200px] border rounded-lg p-3 bg-gray-50 flex flex-col h-full transition-all duration-300 ${hoveredZone === "group" ? "ring-2 ring-indigo-500/20 border-indigo-500/50 bg-indigo-50/5" : ""}`}
              >
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-medium text-sm text-gray-700 flex items-center gap-1"><ImageIcon className="w-4 h-4"/> Imagen Grupal</h4>
                  {groupImage && (
                    <button onClick={() => setGroupImage(null)} className="text-red-500 hover:bg-red-50 p-1 rounded transition-colors" title="Eliminar imagen">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                {!groupImage ? (
                  <label className="border-2 border-dashed border-gray-300 hover:border-indigo-400 rounded-lg flex-1 flex flex-col items-center justify-center cursor-pointer hover:bg-white transition-colors min-h-[120px] p-2 group">
                    <span className="text-xs text-gray-500 group-hover:text-indigo-600 font-medium">Subir (Opcional)</span>
                    <span className="text-[10px] text-gray-400 mt-1 bg-white px-1.5 py-0.5 rounded border border-gray-200 group-hover:bg-indigo-50 group-hover:border-indigo-150 transition-colors">o presiona Ctrl+V</span>
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleManualUpload(e, setGroupImage)} />
                  </label>
                ) : (
                  <div className="space-y-2 flex-1 flex flex-col relative group">
                    <img src={groupImage} alt="Group" className="w-full h-32 object-contain bg-white rounded border flex-1" />
                    <div className="absolute inset-0 bottom-10 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none rounded">
                      <span className="text-[9px] text-white bg-black/60 px-2 py-1 rounded border border-white/10">Ctrl+V para reemplazar</span>
                    </div>
                    <button 
                      onClick={() => handleRemoveBackground(groupImage, setGroupImage, setIsRemovingGroupBg)}
                      disabled={isRemovingGroupBg}
                      className="w-full text-xs flex items-center justify-center gap-1 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-2 py-2 rounded font-medium transition-colors"
                    >
                      {isRemovingGroupBg ? <Loader2 className="w-3 h-3 animate-spin"/> : <Wand2 className="w-3 h-3"/>}
                      {isRemovingGroupBg ? (bgProgress || "Borrando...") : "Quitar Fondo IA"}
                    </button>
                  </div>
                )}
              </div>

              {/* Blueprint Image */}
              <div className="flex-1 min-w-[200px] border rounded-lg p-3 bg-blue-50/50 flex flex-col h-full">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-medium text-sm text-blue-900 flex items-center gap-1"><PenTool className="w-4 h-4"/> Plano Técnico</h4>
                  {techImage && (
                    <button onClick={() => { setTechImage(null); setShowBlueprintEditor(false); }} className="text-red-500 hover:bg-red-50 p-1 rounded transition-colors" title="Eliminar plano">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                {!techImage ? (
                  <div className="flex-1 flex flex-col items-center justify-center gap-2 min-h-[120px]">
                    <button 
                      onClick={handleGenerateBlueprintClick}
                      disabled={!individualImages.some(img => img !== null) || isGeneratingBlueprint}
                      className={`w-full text-xs flex items-center justify-center gap-1 px-2 py-2 rounded font-medium transition-colors ${!individualImages.some(img => img !== null) ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                    >
                      {isGeneratingBlueprint ? <Loader2 className="w-3 h-3 animate-spin"/> : <Database className="w-3 h-3"/>}
                      Generar Plano Automático
                    </button>
                    <span className="text-[10px] text-gray-500 text-center leading-tight">Requiere Foto Individual sin fondo</span>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col">
                    <img src={techImage} alt="Blueprint" className="w-full min-h-[250px] object-contain bg-white rounded border flex-1" />
                    
                    {/* Controls Panel */}
                    {showBlueprintEditor && (
                      <div className="mt-3 space-y-2 bg-white/60 p-2 rounded border border-blue-100 text-[10px]">
                        <div>
                          <label className="flex justify-between text-gray-700 font-medium mb-1">Altura Real Producto <span className="text-blue-600 font-bold">{blueprintSettings.realHeightCm} cm</span></label>
                          <input type="range" min="5" max="100" step="0.5" value={blueprintSettings.realHeightCm} onChange={(e) => setBlueprintSettings({...blueprintSettings, realHeightCm: Number(e.target.value)})} className="w-full accent-blue-600"/>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="flex justify-between text-gray-600 mb-1">Ancho Logo <span>{blueprintSettings.logoWidthPercent}%</span></label>
                            <input type="range" min="5" max="100" step="0.5" value={blueprintSettings.logoWidthPercent} onChange={(e) => setBlueprintSettings({...blueprintSettings, logoWidthPercent: Number(e.target.value)})} className="w-full accent-red-500"/>
                          </div>
                          <div>
                            <label className="flex justify-between text-gray-600 mb-1">Alto Logo <span>{blueprintSettings.logoHeightPercent}%</span></label>
                            <input type="range" min="5" max="100" step="0.5" value={blueprintSettings.logoHeightPercent} onChange={(e) => setBlueprintSettings({...blueprintSettings, logoHeightPercent: Number(e.target.value)})} className="w-full accent-red-500"/>
                          </div>
                          <div>
                            <label className="flex justify-between text-gray-600 mb-1">Posición X <span>{blueprintSettings.logoOffsetX}%</span></label>
                            <input type="range" min="-50" max="50" step="0.5" value={blueprintSettings.logoOffsetX} onChange={(e) => setBlueprintSettings({...blueprintSettings, logoOffsetX: Number(e.target.value)})} className="w-full accent-gray-500"/>
                          </div>
                          <div>
                            <label className="flex justify-between text-gray-600 mb-1">Posición Y <span>{blueprintSettings.logoOffsetY}%</span></label>
                            <input type="range" min="-50" max="50" step="0.5" value={blueprintSettings.logoOffsetY} onChange={(e) => setBlueprintSettings({...blueprintSettings, logoOffsetY: Number(e.target.value)})} className="w-full accent-gray-500"/>
                          </div>
                        </div>
                        <div>
                          <label className="flex justify-between text-gray-600 mb-1">Rotación <span>{blueprintSettings.logoRotation}°</span></label>
                          <input type="range" min="-180" max="180" step="1" value={blueprintSettings.logoRotation} onChange={(e) => setBlueprintSettings({...blueprintSettings, logoRotation: Number(e.target.value)})} className="w-full accent-green-600"/>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border shadow-sm min-h-[160px]">
            <h3 className="font-semibold text-lg flex items-center gap-2 mb-4">
              <span className="bg-blue-100 text-blue-700 w-6 h-6 rounded-full flex items-center justify-center text-sm">4</span>
              Guardar e Integrar en el Catálogo
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Option A: Publish as New */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-sm text-gray-800 mb-1">Opción A: Publicar Producto Nuevo</h4>
                  <p className="text-xs text-gray-500 mb-4">Crea un producto nuevo en el catálogo con los datos y fotos extraídos por la IA.</p>
                </div>
                <button
                  onClick={publishToCatalog}
                  disabled={!analysis || !individualImages.some(img => img !== null) || isSaving}
                  className={`w-full px-4 py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 transition-all text-sm ${(!analysis || !individualImages.some(img => img !== null)) ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 text-white shadow-sm'}`}
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin"/> : <CheckCircle className="w-4 h-4"/>}
                  {isSaving ? "Publicando..." : "Publicar como Nuevo"}
                </button>
              </div>

              {/* Option B: Update Existing Product Photos */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-sm text-gray-800 mb-1">Opción B: Actualizar Fotos de Producto Existente</h4>
                  <p className="text-xs text-gray-500 mb-4">Copia las fotos generadas por la IA y el plano técnico a un producto del catálogo.</p>
                  
                  <div className="mb-4">
                    <label className="block text-xs font-bold text-gray-600 mb-1">Seleccionar Producto Destino:</label>
                    <select
                      value={selectedProductIdToUpdate}
                      onChange={e => setSelectedProductIdToUpdate(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg p-2 text-sm bg-white font-medium"
                    >
                      <option value="">-- Selecciona un producto --</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} {p.sku ? `(${p.sku})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  onClick={updateExistingProductPhotos}
                  disabled={!selectedProductIdToUpdate || (!groupImage && !individualImages.some(img => img !== null) && !techImage) || isUpdatingExisting}
                  className={`w-full px-4 py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 transition-all text-sm ${(!selectedProductIdToUpdate || (!groupImage && !individualImages.some(img => img !== null) && !techImage)) ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'}`}
                >
                  {isUpdatingExisting ? <Loader2 className="w-4 h-4 animate-spin"/> : <Database className="w-4 h-4"/>}
                  {isUpdatingExisting ? "Copiando..." : "Copiar Fotos e Imagen IA"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
