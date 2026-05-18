"use client";

import { useState, useRef, useEffect } from "react";
import { Upload, Image as ImageIcon, Search, CheckCircle, Trash2, Wand2, PenTool, Database, Download, Loader2 } from "lucide-react";
import { removeBackground } from "@imgly/background-removal";
import { Product } from "@/types";
import { useProducts } from "@/hooks/useProducts";

type AnalysisResult = {
  productName: string;
  category: string;
  material: string;
  specifications: string[];
  keywordsEn: string;
  keywordsEs: string;
  searchQueries: string[];
};

export function AgentIntegrationView() {
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);

  const [groupImage, setGroupImage] = useState<string | null>(null);
  const [individualImages, setIndividualImages] = useState<(string | null)[]>([null, null, null]);
  const [techImage, setTechImage] = useState<string | null>(null);

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

  const { addProduct } = useProducts();

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

  const handleSourceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const base64 = await resizeImage(file, 2000, 2000);
        setSourceImage(base64);
        
        // Auto-analyze
        setIsAnalyzing(true);
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
        } catch (error: any) {
          console.error(error);
          alert(`Hubo un error al analizar la imagen: ${error.message}. Revisa la consola o asegúrate de tener la API Key correcta.`);
        } finally {
          setIsAnalyzing(false);
        }
      } catch (err) {
        console.error("Error resizing image:", err);
        alert("No se pudo procesar la imagen seleccionada.");
      }
    }
  };

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

  const openSearch = () => {
    if (analysis) {
      const query = encodeURIComponent(analysis.keywordsEn);
      window.open(`https://www.alibaba.com/trade/search?SearchText=${query}`, '_blank');
    }
  };

  // 1. Remove Background using client-side WebAssembly
  const handleRemoveBackground = async (imageSrc: string | null, setImg: (val: string | null) => void, setLoading: React.Dispatch<React.SetStateAction<boolean>>) => {
    if (!imageSrc) return;
    setLoading(true);
    setBgProgress("Removiendo fondo localmente (puede tardar un momento)...");
    try {
      // Process on client side directly
      const blob = await removeBackground(imageSrc);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setImg(reader.result as string);
        setLoading(false);
        setBgProgress("");
      };
      reader.readAsDataURL(blob);
    } catch (error: any) {
      console.error(error);
      alert(`Error interno al quitar el fondo: ${error?.message || error}. Asegúrate de que la imagen sea nítida y tenga buen contraste.`);
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

      setTechImage(canvas.toDataURL('image/png'));
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
      images: [groupImage, ...individualImages.filter(Boolean), techImage].filter(Boolean) as string[],
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
          <div className="bg-white p-6 rounded-xl border shadow-sm">
            <h3 className="font-semibold text-lg flex items-center gap-2 mb-4">
              <span className="bg-blue-100 text-blue-700 w-6 h-6 rounded-full flex items-center justify-center text-sm">1</span>
              Imagen Origen (WhatsApp)
            </h3>
            {!sourceImage ? (
              <label className="border-2 border-dashed border-gray-300 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors">
                <Upload className="h-10 w-10 text-gray-400 mb-2" />
                <span className="text-sm text-gray-600">Sube la foto del cliente/proveedor</span>
                <input type="file" className="hidden" accept="image/*" onChange={handleSourceUpload} />
              </label>
            ) : (
              <div className="relative rounded-xl overflow-hidden group">
                <img src={sourceImage} alt="Source" className="w-full object-cover" />
                <button onClick={() => setSourceImage(null)} className="absolute top-2 right-2 p-2 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          <div className="bg-white p-6 rounded-xl border shadow-sm">
            <h3 className="font-semibold text-lg flex items-center gap-2 mb-4">
              <span className="bg-blue-100 text-blue-700 w-6 h-6 rounded-full flex items-center justify-center text-sm">2</span>
              Inteligencia y Búsqueda
            </h3>
            
            {isAnalyzing ? (
              <div className="flex flex-col items-center justify-center py-8 text-blue-600">
                <Loader2 className="h-8 w-8 animate-spin mb-2" />
                <span className="text-sm font-medium">Analizando producto con Gemini...</span>
              </div>
            ) : analysis ? (
              <div className="space-y-4">
                <div className="bg-gray-50 p-3 rounded-lg text-sm">
                  <p><span className="font-medium">Producto:</span> {analysis.productName}</p>
                  <p><span className="font-medium">Categoría:</span> {analysis.category}</p>
                  <p><span className="font-medium">Material:</span> {analysis.material}</p>
                </div>
                <div className="bg-green-50 text-green-800 p-3 rounded-lg text-sm">
                  <p className="font-medium mb-1">Keywords B2B:</p>
                  <p className="italic">{analysis.keywordsEn}</p>
                </div>
                <button 
                  onClick={openSearch}
                  className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  <Search className="w-4 h-4" />
                  Buscar en Alibaba
                </button>
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
                return (
                  <div key={`ind-${idx}`} className="flex-1 min-w-[200px] border rounded-lg p-3 bg-gray-50 flex flex-col h-full">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-medium text-sm text-gray-700 flex items-center gap-1"><ImageIcon className="w-4 h-4"/> Individual {idx + 1}</h4>
                      {img && (
                        <button onClick={() => setImg(null)} className="text-red-500 hover:bg-red-50 p-1 rounded transition-colors" title="Eliminar imagen">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    {!img ? (
                      <label className="border-2 border-dashed border-gray-300 rounded-lg flex-1 flex items-center justify-center cursor-pointer hover:bg-white transition-colors min-h-[120px]">
                        <span className="text-xs text-gray-500">Subir foto B2B</span>
                        <input type="file" className="hidden" accept="image/*" onChange={(e) => handleManualUpload(e, setImg)} />
                      </label>
                    ) : (
                      <div className="space-y-2 flex-1 flex flex-col">
                        <img src={img} alt={`Individual ${idx + 1}`} className="w-full h-32 object-contain bg-white rounded border flex-1" />
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
              <div className="flex-1 min-w-[200px] border rounded-lg p-3 bg-gray-50 flex flex-col h-full">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-medium text-sm text-gray-700 flex items-center gap-1"><ImageIcon className="w-4 h-4"/> Imagen Grupal</h4>
                  {groupImage && (
                    <button onClick={() => setGroupImage(null)} className="text-red-500 hover:bg-red-50 p-1 rounded transition-colors" title="Eliminar imagen">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                {!groupImage ? (
                  <label className="border-2 border-dashed border-gray-300 rounded-lg flex-1 flex items-center justify-center cursor-pointer hover:bg-white transition-colors min-h-[120px]">
                    <span className="text-xs text-gray-500">Subir (Opcional)</span>
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleManualUpload(e, setGroupImage)} />
                  </label>
                ) : (
                  <div className="space-y-2 flex-1 flex flex-col">
                    <img src={groupImage} alt="Group" className="w-full h-32 object-contain bg-white rounded border flex-1" />
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

          <div className="bg-white p-6 rounded-xl border shadow-sm flex flex-col items-center justify-center min-h-[160px]">
            <h3 className="font-semibold text-lg flex items-center gap-2 mb-2 w-full">
              <span className="bg-blue-100 text-blue-700 w-6 h-6 rounded-full flex items-center justify-center text-sm">4</span>
              Publicación Directa
            </h3>
            <p className="text-sm text-gray-500 mb-6 w-full">Todos los datos extraídos por la IA y las imágenes generadas se convertirán en un producto activo.</p>
            
            <button
              onClick={publishToCatalog}
              disabled={!analysis || !individualImages.some(img => img !== null) || isSaving}
              className={`w-full md:w-auto px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-md ${(!analysis || !individualImages.some(img => img !== null)) ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 text-white hover:scale-105'}`}
            >
              {isSaving ? <Loader2 className="w-5 h-5 animate-spin"/> : <CheckCircle className="w-5 h-5"/>}
              {isSaving ? "Guardando en Base de Datos..." : "Publicar Producto en Catálogo B2B"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
