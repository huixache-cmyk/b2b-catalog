"use client";

import { useState, useRef, useEffect } from "react";
import { Product } from "@/types";
import { ProductCard } from "./ProductCard";
import { Check, Info, ShieldCheck, Truck, ChevronRight, Upload, Download, X, AlertCircle, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useCart } from "@/hooks/useCart";
import html2canvas from "html2canvas";

export function ProductDetailView({ product, relatedProducts }: { product: Product, relatedProducts: Product[] }) {
  const [selectedImage, setSelectedImage] = useState(0);
  const [printOption, setPrintOption] = useState("Impresión 1 tinta");
  const [showMockup, setShowMockup] = useState(false);
  const [isPersonalized, setIsPersonalized] = useState(false);

  const [selectedColor, setSelectedColor] = useState(product.colors?.[0] || "Único");
  const [quantity, setQuantity] = useState<number | "">("");

  const { addToCart } = useCart();
  const [showToast, setShowToast] = useState(false);

  // Mockup Editor States
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoPos, setLogoPos] = useState({ x: 50, y: 50 });
  const [logoScale, setLogoScale] = useState(1);
  const [logoRotation, setLogoRotation] = useState(0);
  const [logoOpacity, setLogoOpacity] = useState(1);
  
  // Helper to find the correct images regardless of whether group image exists
  const getIndividualImageIndex = () => product.images.length === 3 ? 1 : 0;
  const getTechImageIndex = () => product.images.length - 1;

  const [mockupBgIndex, setMockupBgIndex] = useState(getTechImageIndex());

  const [paddedOriginalImage, setPaddedOriginalImage] = useState<string | null>(null);

  useEffect(() => {
    const originalImgUrl = product.images[getIndividualImageIndex()];
    if (!originalImgUrl) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      // Coincide exactamente con la lógica de AgentIntegrationView.tsx
      canvas.width = img.width + 100;
      canvas.height = img.height + 100;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Fondo blanco para que cuadre perfecto
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.drawImage(img, 50, 50);
      try {
        setPaddedOriginalImage(canvas.toDataURL('image/png'));
      } catch (e) {
        console.error("Failed to pad original image", e);
      }
    };
    img.src = originalImgUrl;
  }, [product.images]);

  const [savedMockups, setSavedMockups] = useState<{ bgIndex: number; imgData: string }[]>([]);
  
  const mockupPreviewRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragStartPos = useRef({ startX: 0, startY: 0, startPctX: 50, startPctY: 50 });

  const printPrices: Record<string, number> = {
    "Sin Impresión": 0,
    "Grabado Chico": 15,
    "Grabado Grande": 25,
    "Impresión 1 tinta": 10,
    "Impresión 2 tintas": 18,
    "Impresión 3 tintas": 25,
    "Impresión 4 tintas": 30
  };
  const printPrice = isPersonalized ? (printPrices[printOption] || 0) : 0;

  const totalQuantity = typeof quantity === 'number' ? quantity : 0;

  const basePrice = product.price || 0;
  const tier2Price = basePrice * (1 - (product.discount100 || 0) / 100);
  const tier3Price = basePrice * (1 - (product.discount150 || 0) / 100);

  let unitProductPrice = basePrice;
  if (totalQuantity > 150) {
    unitProductPrice = tier3Price;
  } else if (totalQuantity >= 100) {
    unitProductPrice = tier2Price;
  }

  const unitDecoratedPrice = printPrice;
  const finalPricePerUnit = unitProductPrice + unitDecoratedPrice;
  const total = finalPricePerUnit * totalQuantity;

  const handleAddToCart = () => {
    if (totalQuantity < 50) return;
    
    // El plano mecánico siempre es la última imagen del array (a menos que el usuario guarde un mockup sobre él)
    const techIndex = getTechImageIndex();
    const blueprintImage = savedMockups.find(m => m.bgIndex === techIndex)?.imgData || product.images[techIndex];
    
    // Cualquier otro mockup guardado que no sea el plano técnico
    const mockupImage = savedMockups.find(m => m.bgIndex !== techIndex)?.imgData;

    addToCart({
      id: Date.now().toString(),
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      image: product.images[0],
      color: selectedColor,
      quantity: totalQuantity,
      isPersonalized,
      printOption: isPersonalized ? printOption : "Sin Impresión",
      unitPrice: finalPricePerUnit,
      totalPrice: total,
      blueprintImage,
      mockupImage
    });
    
    setShowToast(true);
    setTimeout(() => setShowToast(false), 4000);
  };

  // Mockup Functions
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setLogoUrl(event.target?.result as string);
        setIsPersonalized(true); // Automatically set to personalized
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    isDragging.current = true;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    dragStartPos.current = { 
      startX: clientX, 
      startY: clientY, 
      startPctX: logoPos.x, 
      startPctY: logoPos.y 
    };
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (isDragging.current && mockupPreviewRef.current) {
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      
      const rect = mockupPreviewRef.current.getBoundingClientRect();
      const deltaX = clientX - dragStartPos.current.startX;
      const deltaY = clientY - dragStartPos.current.startY;
      
      const deltaPctX = (deltaX / rect.width) * 100;
      const deltaPctY = (deltaY / rect.height) * 100;
      
      setLogoPos({
        x: dragStartPos.current.startPctX + deltaPctX,
        y: dragStartPos.current.startPctY + deltaPctY
      });
    }
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  useEffect(() => {
    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("touchend", handleMouseUp);
    return () => {
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("touchend", handleMouseUp);
    };
  }, []);

  // Removed Dynamic Product Coloring per user request

  const [isSavingMockup, setIsSavingMockup] = useState(false);

  const handleDownloadMockup = async () => {
    if (!mockupPreviewRef.current) return;
    setIsSavingMockup(true);
    
    try {
      // Fix for iOS devices
      const originalScrollY = window.scrollY;
      window.scrollTo(0, 0);

      const originalIndex = mockupBgIndex;

      const captureOptions = { 
        useCORS: true, 
        allowTaint: true, 
        backgroundColor: null, 
        scale: 2, 
        scrollX: 0, 
        scrollY: 0,
        onclone: (clonedDoc: Document) => {
          const el = clonedDoc.getElementById('mockup-preview-capture');
          if (el && mockupPreviewRef.current) {
            // Medimos la imagen base original en pantalla para capturar sus dimensiones reales renderizadas
            const originalImg = mockupPreviewRef.current.querySelector('img');
            const imgRect = originalImg ? originalImg.getBoundingClientRect() : mockupPreviewRef.current.getBoundingClientRect();
            
            // Forzamos al contenedor del clon a medir exactamente lo mismo que la imagen base real
            el.style.width = `${imgRect.width}px`;
            el.style.height = `${imgRect.height}px`;
            el.style.maxWidth = 'none';
            el.style.maxHeight = 'none';
            el.style.display = 'inline-block'; // Eliminar comportamientos flex extraños en la captura
            
            const img = el.querySelector('img');
            if (img) {
              img.style.width = `${imgRect.width}px`;
              img.style.height = `${imgRect.height}px`;
              img.style.maxWidth = 'none';
              img.style.maxHeight = 'none';
            }
          }
        }
      };

      // 1. Capture Tech Drawing
      setMockupBgIndex(getTechImageIndex());
      await new Promise(r => setTimeout(r, 400)); // Esperar render y carga
      const techCanvas = await html2canvas(mockupPreviewRef.current, captureOptions);
      const techData = techCanvas.toDataURL("image/png");

      // 2. Capture Real Image
      setMockupBgIndex(getIndividualImageIndex());
      await new Promise(r => setTimeout(r, 400)); // Esperar render y carga
      const realCanvas = await html2canvas(mockupPreviewRef.current, captureOptions);
      const realData = realCanvas.toDataURL("image/png");

      // Save both
      setSavedMockups([
        { bgIndex: getTechImageIndex(), imgData: techData },
        { bgIndex: getIndividualImageIndex(), imgData: realData }
      ]);
      
      // Restore
      setMockupBgIndex(originalIndex);
      window.scrollTo(0, originalScrollY);
      
      setShowMockup(false);
      setTimeout(() => {
        document.getElementById('generated-mockups-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    } catch (err) {
      console.error("Error generating mockups", err);
    } finally {
      setIsSavingMockup(false);
    }
  };

  return (
    <div className="space-y-16">
      {/* Breadcrumb */}
      <nav className="flex text-sm text-gray-500">
        <Link href="/" className="hover:text-primary-600">Inicio</Link>
        <ChevronRight className="w-4 h-4 mx-2" />
        <Link href="/catalog" className="hover:text-primary-600">Catálogo</Link>
        <ChevronRight className="w-4 h-4 mx-2" />
        <Link href={`/catalog?category=${product.category}`} className="hover:text-primary-600">{product.category}</Link>
        <ChevronRight className="w-4 h-4 mx-2" />
        <span className="text-gray-900 font-medium truncate">{product.name}</span>
      </nav>

      {/* Main Product Area */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 lg:p-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          
          {/* Gallery */}
          <div className="space-y-4">
            <div className="aspect-square bg-white rounded-xl overflow-hidden border border-gray-100 relative">
              <img 
                src={product.images[selectedImage]} 
                alt={product.name} 
                className="w-full h-full object-contain p-4"
              />
              {product.isNew && (
                <div className="absolute top-4 left-4 bg-green-500 text-white text-sm font-bold px-3 py-1 rounded shadow-sm z-10">
                  NUEVO
                </div>
              )}
              {/* Selected Color Indicator Dot */}
              {selectedColor && selectedColor !== "Único" && (
                <div 
                  className="absolute top-4 right-4 w-10 h-10 rounded-full border-4 border-white shadow-md z-10 flex items-center justify-center"
                  style={{ backgroundColor: selectedColor.startsWith('#') ? selectedColor : '#e5e7eb' }}
                  title={`Color seleccionado: ${selectedColor}`}
                >
                   {!selectedColor.startsWith('#') && <span className="text-[10px] font-bold text-gray-500">{selectedColor.substring(0,3)}</span>}
                </div>
              )}
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
              {product.images.map((img, idx) => (
                <button 
                  key={idx} 
                  onClick={() => setSelectedImage(idx)}
                  className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${selectedImage === idx ? 'border-primary-500 ring-2 ring-primary-200' : 'border-transparent hover:border-gray-200'}`}
                >
                  <img src={img} alt="" className="w-full h-full object-contain p-1" />
                </button>
              ))}
            </div>

            {/* Saved Mockups Area */}
            {savedMockups.length > 0 && (
              <div id="generated-mockups-section" className="pt-6 mt-6 border-t border-gray-100">
                <h4 className="font-bold text-gray-900 mb-3 text-sm uppercase tracking-wider text-center">Tus Previsualizaciones</h4>
                <div className="grid grid-cols-2 gap-4">
                  {savedMockups.map((mockup) => (
                    <div key={mockup.bgIndex} className="rounded-lg overflow-hidden border border-gray-200 shadow-sm">
                      <img src={mockup.imgData} alt={`Mockup ${mockup.bgIndex}`} className="w-full h-auto object-contain bg-gray-50 aspect-square" />
                      <div className="bg-white p-2 text-center text-xs font-bold text-gray-500">
                        {mockup.bgIndex === getTechImageIndex() ? "Plano Mecánico" : `Vista ${mockup.bgIndex}`}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Details */}
          <div>
            <div className="mb-6">
              <div className="flex justify-between items-start mb-2">
                <h1 className="text-3xl font-extrabold text-gray-900">{product.name}</h1>
                <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm font-medium">
                  SKU: {product.sku}
                </span>
              </div>
              <p className="text-gray-500 text-lg leading-relaxed">{product.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-gray-50 p-4 rounded-lg">
                <span className="text-sm text-gray-500 block mb-1">Categoría</span>
                <span className="font-semibold text-gray-900">{product.category}</span>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <span className="text-sm text-gray-500 block mb-1">Material</span>
                <span className="font-semibold text-gray-900">{product.material}</span>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-8">
              <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                Calculadora de Cotización (B2B)
              </h3>
              
              {/* Color Selection */}
              {product.colors && product.colors.length > 0 && (
                <div className="mb-8">
                  <h4 className="font-semibold text-gray-900 mb-3 text-sm uppercase tracking-wider">Color</h4>
                  <div className="flex flex-wrap gap-3">
                    {product.colors.map(color => {
                      const isHex = color.startsWith('#');
                      return (
                      <button 
                        key={color}
                        onClick={() => setSelectedColor(color)}
                        title={color}
                        className={`w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center ${selectedColor === color ? 'border-primary-600 ring-2 ring-primary-200 ring-offset-2' : 'border-gray-200 hover:border-gray-300'}`}
                        style={{ backgroundColor: isHex ? color : '#e5e7eb' }}
                      >
                        {!isHex && <span className="text-[8px] text-gray-500 overflow-hidden font-bold">{color.substring(0,3)}</span>}
                      </button>
                    )})}
                  </div>
                </div>
              )}

              {/* Volume scale */}
              <div className="mb-8">
                <h4 className="font-semibold text-gray-900 mb-3">Precio por Volumen (Producto)</h4>
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                  <div className="grid grid-cols-3 bg-gray-50 text-center text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                    <div className="py-3 border-r border-gray-200">DE 50 A 99 PIEZAS</div>
                    <div className="py-3 border-r border-gray-200">DE 100 A 150 PIEZAS</div>
                    <div className="py-3">MÁS DE 150 PIEZAS</div>
                  </div>
                  <div className="grid grid-cols-3 text-center">
                    <div className="py-4 border-r border-gray-200 font-bold text-gray-900">${basePrice.toFixed(2)} MXN</div>
                    <div className="py-4 border-r border-gray-200 font-bold text-gray-900">${tier2Price.toFixed(2)} MXN</div>
                    <div className="py-4 font-bold text-gray-900">${tier3Price.toFixed(2)} MXN</div>
                  </div>
                </div>
              </div>

              {/* Quantity */}
              <div className="mb-8">
                <h4 className="font-semibold text-gray-900 mb-3">Cantidad a Cotizar</h4>
                <div className="flex items-center bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <div className="flex-1">
                    <label className="text-xs text-gray-500 font-bold uppercase block mb-1">CANTIDAD</label>
                    <div className="relative">
                      <input 
                        type="number" 
                        min="0"
                        value={quantity}
                        onChange={(e) => setQuantity(parseInt(e.target.value) || "")}
                        onBlur={() => {
                          if (typeof quantity === 'number' && quantity > 0 && quantity < 50) {
                            setQuantity(50);
                          }
                        }}
                        placeholder="Mín: 50"
                        className="w-full bg-white border border-gray-300 text-gray-900 text-lg rounded-lg focus:ring-primary-500 focus:border-primary-500 block p-2.5 font-bold"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-center px-4">
                    <X className="w-5 h-5 text-gray-400" />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-gray-500 font-bold uppercase block mb-1">COSTO UNITARIO</label>
                    <div className="bg-white border border-gray-300 rounded-lg p-2.5 flex items-center justify-center">
                      <span className="font-bold text-gray-900 text-lg">${unitProductPrice.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-center px-4 text-gray-400 font-bold">=</div>
                  <div className="flex-1">
                    <label className="text-xs text-gray-500 font-bold uppercase block mb-1">TOTAL</label>
                    <div className="bg-primary-50 border border-primary-200 rounded-lg p-2.5 flex items-center justify-center">
                      <span className="font-bold text-primary-700 text-lg">${(unitProductPrice * totalQuantity).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>
                {quantity === "" && (
                  <p className="text-red-500 text-sm mt-2 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    El pedido mínimo es de 50 piezas.
                  </p>
                )}
              </div>

              {/* Mockup Generator Link */}
              <div className="mb-8 p-4 bg-primary-50 rounded-lg flex justify-center border border-primary-100">
                <button 
                  onClick={() => setShowMockup(true)}
                  className="w-full bg-primary-600 hover:bg-primary-700 text-white text-lg font-bold py-3 px-4 rounded transition-colors flex items-center justify-center"
                >
                  Visualiza el producto con tu logo AQUÍ
                </button>
              </div>

              {/* Personalization Options */}
              <div className="mb-8">
                <h4 className="font-semibold text-gray-900 mb-3 text-sm uppercase tracking-wider">Opciones de Personalización</h4>
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => setIsPersonalized(false)}
                    className={`p-4 rounded-xl border text-left transition-all ${!isPersonalized ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-500' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                  >
                    <div className="font-bold text-gray-900">Sin Impresión</div>
                    <div className="text-xs text-gray-500 mt-1">Producto en blanco</div>
                  </button>
                  <button 
                    onClick={() => setIsPersonalized(true)}
                    className={`p-4 rounded-xl border text-left transition-all ${isPersonalized ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-500' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                  >
                    <div className="font-bold text-gray-900">Con Impresión</div>
                    <div className="text-xs text-gray-500 mt-1">Logotipo u otra técnica (Desde +$10 MXN)</div>
                  </button>
                </div>
              </div>

              <div className="space-y-6">
                {isPersonalized && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3 text-sm uppercase tracking-wider">Técnica de Impresión</h4>
                    <select 
                      value={printOption}
                      onChange={(e) => setPrintOption(e.target.value)}
                      className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg focus:ring-primary-500 focus:border-primary-500 block p-3 font-medium"
                    >
                      {Object.entries(printPrices).filter(([tech]) => tech !== "Sin Impresión").map(([tech, price]) => (
                        <option key={tech} value={tech}>{tech} (+${price} c/u)</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="bg-gray-900 text-white p-6 rounded-xl">
                  <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-700">
                    <span className="text-gray-300">Precio Escala (Producto)</span>
                    <span className="font-medium">${unitProductPrice.toFixed(2)} c/u</span>
                  </div>
                  <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-700">
                    <span className="text-gray-300">Costo Impresión</span>
                    <span className="font-medium">+ ${unitDecoratedPrice.toFixed(2)} c/u</span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-300">Precio Final Unitario</span>
                    <span className="font-bold text-xl text-primary-400">${finalPricePerUnit.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-end mt-6">
                    <span className="text-sm text-gray-400">Total Estimado ({totalQuantity} pz)</span>
                    <span className="text-3xl font-black">${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-4 text-center">* Precios no incluyen IVA. Sujetos a disponibilidad de stock.</p>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* Add to Cart Area */}
      <div id="add-to-cart-section" className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 max-w-4xl mx-auto flex flex-col items-center justify-center text-center relative overflow-hidden">
        {showToast && (
          <div className="absolute top-0 left-0 right-0 bg-green-500 text-white py-3 px-4 flex items-center justify-center font-bold text-sm animate-in slide-in-from-top fade-in duration-300 z-10">
            <Check className="w-5 h-5 mr-2" />
            Agregado a tu lista de cotización exitosamente.
          </div>
        )}
        
        <h2 className="text-xl font-bold text-gray-900 mb-2 mt-4">¿Todo listo?</h2>
        <p className="text-gray-500 mb-8 max-w-md">
          Agrega este producto a tu carrito de cotización. Podrás seguir explorando o solicitar el presupuesto formal por todo tu pedido.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
          <button 
            id="add-to-cart-btn"
            onClick={handleAddToCart} 
            disabled={totalQuantity < 50}
            className={`px-8 py-4 rounded-full font-bold text-lg transition-colors flex items-center justify-center focus:ring-4 focus:ring-primary-300 focus:outline-none ${
              totalQuantity >= 50 
                ? 'bg-primary-600 text-white hover:bg-primary-700 shadow-md hover:-translate-y-0.5' 
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            <ShoppingCart className="w-5 h-5 mr-2" />
            Agregar a Cotización
          </button>
          
          <Link 
            href="/cart"
            className="px-8 py-4 rounded-full font-bold text-lg transition-colors flex items-center justify-center border-2 border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50"
          >
            Ver Carrito
          </Link>
        </div>
      </div>

      {/* Interactive Mockup Modal */}
      {showMockup && (
        <div className="fixed inset-0 bg-gray-900/90 z-50 flex items-center justify-center p-0 sm:p-4">
          <div className="bg-[#e5e7eb] sm:rounded-2xl w-full h-full sm:h-[90vh] max-w-6xl flex flex-col overflow-hidden shadow-2xl relative">
            <div className="p-4 flex justify-between items-center bg-[#e5e7eb]">
              <h3 className="font-bold text-lg text-gray-800">Editor de Mockups</h3>
              <button onClick={() => setShowMockup(false)} className="p-2 hover:bg-gray-300 rounded-full transition-colors">
                <X className="w-6 h-6 text-gray-600" />
              </button>
            </div>
            
            <div className="flex-1 flex flex-col-reverse md:flex-row overflow-hidden relative bg-[#e5e7eb]">
              
              {/* Sidebar Controls */}
              <div className="flex-1 md:flex-none md:w-80 flex flex-col bg-[#e5e7eb] border-t md:border-t-0 md:border-r border-gray-300 min-h-0">
                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
                  
                  <div>
                    <label className="text-sm font-bold text-gray-700 mb-2 block">1. Sube tu Logo sin fondo (PNG/SVG)</label>
                    <div className="flex border border-gray-400 bg-white rounded overflow-hidden">
                      <label className="bg-gray-100 hover:bg-gray-200 px-3 py-2 text-sm font-medium cursor-pointer border-r border-gray-300 flex-shrink-0">
                        Seleccionar archivo
                        <input type="file" accept="image/png, image/svg+xml" onChange={handleLogoUpload} className="hidden" />
                      </label>
                      <span className="px-3 py-2 text-sm text-gray-500 truncate flex-1">
                        {logoUrl ? "Logo_cargado" : "Ningún archivo seleccionado"}
                      </span>
                    </div>
                  </div>

                  <div className="border-t border-gray-300 pt-6">
                    <label className="text-sm font-bold text-gray-700 mb-2 block">2. Método de Impresión</label>
                    <select 
                      value={printOption}
                      onChange={(e) => {
                        setPrintOption(e.target.value);
                        setIsPersonalized(true);
                      }}
                      className="w-full bg-white border border-gray-400 text-gray-900 rounded p-2 text-sm font-medium focus:ring-primary-500 focus:border-primary-500"
                    >
                      {Object.entries(printPrices).filter(([tech]) => tech !== "Sin Impresión").map(([tech]) => (
                        <option key={tech} value={tech}>{tech}</option>
                      ))}
                    </select>
                  </div>

                  <div className="border-t border-gray-300 pt-6 space-y-5 px-2 md:px-0">
                    <div>
                      <label className="text-sm font-bold text-gray-700 mb-2 block">Tamaño</label>
                      <input 
                        type="range" 
                        min="0.1" max="3" step="0.05" 
                        value={logoScale} 
                        onChange={e => setLogoScale(parseFloat(e.target.value))} 
                        className="w-full accent-[#0b8a7b] touch-pan-y" 
                      />
                    </div>
                    
                    <div className="border-t border-gray-300 pt-5">
                      <label className="text-sm font-bold text-gray-700 mb-2 block">Opacidad</label>
                      <input 
                        type="range" 
                        min="0.1" max="1" step="0.05" 
                        value={logoOpacity} 
                        onChange={e => setLogoOpacity(parseFloat(e.target.value))} 
                        className="w-full accent-[#0b8a7b] touch-pan-y" 
                      />
                    </div>
                    
                    <div className="border-t border-gray-300 pt-5">
                      <label className="text-sm font-bold text-gray-700 mb-2 block">Rotación</label>
                      <input 
                        type="range" 
                        min="-180" max="180" step="1" 
                        value={logoRotation} 
                        onChange={e => setLogoRotation(parseFloat(e.target.value))} 
                        className="w-full accent-[#0b8a7b] touch-pan-y" 
                      />
                    </div>
                  </div>
                </div>

                <div className="shrink-0 p-4 md:p-6 bg-[#e5e7eb] border-t border-gray-300 z-20">
                  <button 
                    onClick={handleDownloadMockup}
                    className="w-full bg-[#11a98c] hover:bg-[#0b8a7b] text-white font-bold py-3 px-4 rounded transition-colors shadow-sm"
                  >
                    Guardar Mockup
                  </button>
                </div>
              </div>

              {/* Preview Area */}
              <div className="shrink-0 h-[45vh] md:h-auto md:flex-1 flex flex-col bg-[#e5e7eb] relative p-4 md:p-6">
                <div className="flex-1 bg-white flex items-center justify-center relative overflow-hidden shadow-sm rounded-lg md:rounded-none"
                     onMouseMove={handleMouseMove}
                     onTouchMove={handleMouseMove}
                     style={{ touchAction: 'none' }} // Prevent scrolling while dragging
                >
                  <div id="mockup-preview-capture" ref={mockupPreviewRef} className="relative inline-flex items-center justify-center max-w-full max-h-full">
                    <img 
                      src={mockupBgIndex === getTechImageIndex() ? product.images[getTechImageIndex()] : (paddedOriginalImage || product.images[getIndividualImageIndex()])} 
                      alt="Mockup Base" 
                      crossOrigin="anonymous"
                      className="max-w-full max-h-full md:max-h-[60vh] pointer-events-none object-contain" 
                    />

                    {/* Selected Color Indicator Dot */}
                    {selectedColor && selectedColor !== "Único" && (
                      <div 
                        className="absolute top-4 right-4 w-12 h-12 rounded-full border-4 border-white shadow-lg z-20 flex items-center justify-center"
                        style={{ backgroundColor: selectedColor.startsWith('#') ? selectedColor : '#e5e7eb' }}
                        title={`Color seleccionado: ${selectedColor}`}
                      >
                         {!selectedColor.startsWith('#') && <span className="text-[10px] font-bold text-gray-500">{selectedColor.substring(0,3)}</span>}
                      </div>
                    )}

                    {logoUrl && (
                      <div 
                        className="absolute cursor-move"
                        style={{
                          left: `${logoPos.x}%`,
                          top: `${logoPos.y}%`,
                          transform: `translate(-50%, -50%) scale(${logoScale}) rotate(${logoRotation}deg)`,
                          opacity: logoOpacity,
                          zIndex: 10
                        }}
                        onMouseDown={handleMouseDown}
                        onTouchStart={handleMouseDown}
                      >
                        <img 
                          src={logoUrl} 
                          alt="Tu Logo" 
                          crossOrigin="anonymous"
                          className="max-w-[150px] max-h-[150px] object-contain pointer-events-none drop-shadow-sm" 
                          style={{ filter: printOption.toLowerCase().includes('grabado') ? 'grayscale(100%) contrast(150%) opacity(80%) brightness(0.2)' : 'none' }}
                          draggable={false}
                        />
                      </div>
                    )}
                  </div>
                  
                  {isSavingMockup && (
                    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-50 rounded-xl">
                      <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#11a98c] border-t-transparent mb-4"></div>
                      <p className="text-gray-900 font-bold text-lg">Guardando vistas...</p>
                      <p className="text-sm text-gray-500">Por favor espera un momento</p>
                    </div>
                  )}
                </div>

                {/* Bottom Carousel (inside editor) */}
                <div className="mt-6 flex justify-center pb-2">
                  <div className="flex gap-2 px-8 relative max-w-full overflow-x-auto pb-2">
                    {product.images.map((img, idx) => {
                      if (idx !== getIndividualImageIndex() && idx !== getTechImageIndex()) return null;
                      return (
                        <button 
                          key={idx} 
                          onClick={() => setMockupBgIndex(idx)}
                          className={`flex-shrink-0 w-20 h-20 bg-white rounded-lg overflow-hidden border-2 transition-all ${mockupBgIndex === idx ? 'border-[#11a98c]' : 'border-transparent hover:border-gray-300'}`}
                        >
                          <img 
                            src={idx === getTechImageIndex() ? img : (paddedOriginalImage || product.images[getIndividualImageIndex()])} 
                            alt="" 
                            className="w-full h-full object-contain p-1" 
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>

              </div>

            </div>
          </div>
        </div>
      )}

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <div className="pt-8 border-t border-gray-100">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Productos Similares</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {relatedProducts.map(rp => (
              <ProductCard key={rp.id} product={rp} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
