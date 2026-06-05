"use client";
 
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Product } from "@/types";
import { ProductCard } from "./ProductCard";
import { Check, Info, ShieldCheck, Truck, ChevronRight, ChevronLeft, Upload, Download, X, AlertCircle, ShoppingCart, MapPin, Gift, Tag, Percent, Star, ChevronDown } from "lucide-react";
import Link from "next/link";
import { useCart } from "@/hooks/useCart";
import html2canvas from "html2canvas";
import { useSettings } from "@/hooks/useSettings";
import { formatCurrency } from "@/utils/formatters";
import Image from "next/image";

const renderTriggerIcon = (iconName?: string) => {
  switch (iconName) {
    case "Gift":
      return <Gift className="w-5 h-5 mb-2" />;
    case "Tag":
      return <Tag className="w-5 h-5 mb-2" />;
    case "Percent":
      return <Percent className="w-5 h-5 mb-2" />;
    default:
      return null;
  }
};

const renderTagIcon = (iconName?: string, textColor?: string) => {
  const iconColor = textColor || "#0a6644";
  switch (iconName) {
    case "Truck":
      return <Truck className="w-4 h-4 shrink-0" style={{ color: iconColor }} />;
    case "Tag":
      return <Tag className="w-4 h-4 shrink-0" style={{ color: iconColor }} />;
    case "Gift":
      return <Gift className="w-4 h-4 shrink-0" style={{ color: iconColor }} />;
    case "Percent":
      return <Percent className="w-4 h-4 shrink-0" style={{ color: iconColor }} />;
    case "Star":
      return <Star className="w-4 h-4 shrink-0" style={{ color: iconColor }} />;
    default:
      return null;
  }
};

const parseSideTextLeft = (fullText: string, promoColor: string, promoSize: string) => {
  const match = fullText.match(/(-\d+%|\d+%\s*DTO\.?|\d+%\s*OFF)/i);
  if (match) {
    const promoPart = match[0];
    const index = fullText.indexOf(promoPart);
    const before = fullText.substring(0, index).trim();
    const after = fullText.substring(index + promoPart.length).trim();
    
    const fontSize = promoSize === "Grande" ? "48px" : promoSize === "Muy Grande" ? "56px" : "40px";
    
    return (
      <div className="text-center flex flex-col justify-center items-center">
        {before && (
          <span className="text-[9px] sm:text-[10px] uppercase tracking-wide opacity-90">
            {before}
          </span>
        )}
        <span 
          className="font-black my-0.5 leading-none"
          style={{ color: promoColor, fontSize }}
        >
          {promoPart}
        </span>
        {after && (
          <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wide">
            {after}
          </span>
        )}
      </div>
    );
  }
  
  return (
    <div className="text-center flex flex-col justify-center items-center px-2">
      <span className="text-xs font-bold text-center leading-tight">{fullText}</span>
    </div>
  );
};

const parseSideTextRight = (fullText: string, promoColor: string, promoSize: string) => {
  const matchEnvio = fullText.match(/(ENVÍO\s+GRATIS|ENVIO\s+GRATIS|FREE\s+SHIPPING)/i);
  if (matchEnvio) {
    const promoPart = matchEnvio[0];
    const index = fullText.indexOf(promoPart);
    const after = fullText.substring(index + promoPart.length).trim();
    
    let line1 = after;
    let line2 = "";
    
    const plusIndex = after.search(/\+\$|\+MXN|en\s+su/i);
    if (plusIndex !== -1) {
      line1 = after.substring(0, plusIndex).trim();
      line2 = after.substring(plusIndex).trim();
    }
    
    const fontSize = promoSize === "Grande" ? "30px" : promoSize === "Muy Grande" ? "36px" : "24px";
    
    return (
      <div className="text-center flex flex-col justify-center items-center pl-3">
        <span 
          className="font-black leading-none uppercase"
          style={{ color: promoColor, fontSize }}
        >
          {promoPart.includes(" ") ? (
            <>
              <div>{promoPart.split(/\s+/)[0]}</div>
              <div className="mt-0.5">{promoPart.split(/\s+/)[1]}</div>
            </>
          ) : promoPart}
        </span>
        {line1 && (
          <span className="text-[9px] sm:text-[10px] uppercase tracking-wide mt-1.5 opacity-90">
            {line1}
          </span>
        )}
        {line2 && (
          <span className="text-[10px] sm:text-xs font-bold mt-0.5">
            {line2}
          </span>
        )}
      </div>
    );
  }
  
  return (
    <div className="text-center flex flex-col justify-center items-center pl-3 px-2">
      <span className="text-xs font-bold text-center leading-tight">{fullText}</span>
    </div>
  );
};
 
export function ProductDetailView({ product, relatedProducts }: { product: Product, relatedProducts: Product[] }) {
  const firstNonEmptyIndex = product.images.findIndex(img => !!img);
  const [selectedImage, setSelectedImage] = useState(firstNonEmptyIndex !== -1 ? firstNonEmptyIndex : 0);
  const [printOption, setPrintOption] = useState("Impresión 1 tinta");
  const [showMockup, setShowMockup] = useState(false);
  const [isPersonalized, setIsPersonalized] = useState(false);
 
  const [selectedColor, setSelectedColor] = useState(product.colors?.[0] || "Único");
  const [quantity, setQuantity] = useState<number | "">("");
 
  const { addToCart } = useCart();
  const [showToast, setShowToast] = useState(false);
  const [showSidePromo, setShowSidePromo] = useState(false);
  
  // Custom height/width calculation for side promotion to center it and match reference sizing
  const [panelWidth, setPanelWidth] = useState(440);

  useEffect(() => {
    const handleResize = () => {
      if (typeof window !== "undefined") {
        setPanelWidth(window.innerWidth < 640 ? window.innerWidth - 48 : 440);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
 
  // Save viewed product to recent views in localStorage
  useEffect(() => {
    if (typeof window !== "undefined" && product) {
      try {
        const stored = localStorage.getItem("b2b_recent_views");
        let list: Product[] = stored ? JSON.parse(stored) : [];
        list = list.filter(p => p.id !== product.id);
        list.unshift(product);
        list = list.slice(0, 5);
        localStorage.setItem("b2b_recent_views", JSON.stringify(list));
      } catch (e) {
        console.warn("Failed to save recent view", e);
      }
    }
  }, [product]);
 
  const [shippingDestination, setShippingDestination] = useState<{ name: string; city: string; state: string; zip: string } | null>(null);
 
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("geekystore_quotes");
        if (saved) {
          const quotes = JSON.parse(saved);
          if (Array.isArray(quotes) && quotes.length > 0) {
            const lastQuote = quotes[0];
            if (lastQuote && lastQuote.client) {
              const { name, city, state, zip } = lastQuote.client;
              if (name || city || state || zip) {
                setShippingDestination({ name, city, state, zip });
              }
            }
          }
        }
      } catch (e) {
        console.warn("Failed to load last shipping destination", e);
      }
    }
  }, []);
 
  // Mockup Editor States
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoPos, setLogoPos] = useState({ x: 50, y: 50 });
  const [logoScale, setLogoScale] = useState(1);
  const [logoRotation, setLogoRotation] = useState(0);
  const [logoOpacity, setLogoOpacity] = useState(1);
  
  const getIndividualImageIndex = () => product.images[1] ? 1 : (product.images[0] ? 0 : 1);
  const getTechImageIndex = () => {
    const individualIdx = getIndividualImageIndex();
    for (let i = product.images.length - 1; i >= 0; i--) {
      if (product.images[i] && i > individualIdx && i > 0) {
        return i;
      }
    }
    return 4;
  };

  const [mockupBgIndex, setMockupBgIndex] = useState(
    product.images[getTechImageIndex()] ? getTechImageIndex() : getIndividualImageIndex()
  );

  const getCorsUrl = (url: string) => {
    if (!url) return "";
    if (url.startsWith('data:')) return url;
    return url + (url.includes('?') ? '&' : '?') + 'cors=1';
  };

  const [paddedOriginalImage, setPaddedOriginalImage] = useState<string | null>(null);

  useEffect(() => {
    const originalImgUrl = product.images[getIndividualImageIndex()];
    if (!originalImgUrl) return;

    const img = new window.Image();
    if (!originalImgUrl.startsWith('data:')) {
      img.crossOrigin = "anonymous";
    }
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
    img.src = getCorsUrl(originalImgUrl);
  }, [product.images]);

  useEffect(() => {
    if (showMockup) {
      const scrollY = window.scrollY;
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.left = "0";
      document.body.style.right = "0";
      document.body.style.overflow = "hidden";
    } else {
      const scrollY = document.body.style.top;
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      document.body.style.overflow = "";
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || "0") * -1);
      }
    }
    return () => {
      const scrollY = document.body.style.top;
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      document.body.style.overflow = "";
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || "0") * -1);
      }
    };
  }, [showMockup]);

  const [savedMockups, setSavedMockups] = useState<{ bgIndex: number; imgData: string }[]>([]);
  
  const mockupBgUrl = mockupBgIndex === getTechImageIndex() 
    ? getCorsUrl(product.images[getTechImageIndex()]) 
    : (paddedOriginalImage || getCorsUrl(product.images[getIndividualImageIndex()]));

  const mockupPreviewRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragStartPos = useRef({ startX: 0, startY: 0, startPctX: 50, startPctY: 50 });

  const { homeSettings, isLoaded } = useSettings();

  // Floating Catalog Promo Modal state
  const [showPromoPopup, setShowPromoPopup] = useState(false);

  // Trigger catalog promotion popup for new users on product detail page
  useEffect(() => {
    if (typeof window !== "undefined") {
      const dismissed = localStorage.getItem("b2b_catalog_promo_dismissed") === "true";
      const isPublished = homeSettings?.promotions?.catalogPromoPublished ?? true;
      const alwaysShow = homeSettings?.promotions?.catalogPromoAlwaysShow ?? false;
      const displayPage = homeSettings?.promotions?.catalogPromoPage ?? "Catálogo";

      const shouldShowPage = displayPage === "Detalle de Producto" || displayPage === "Ambos";
      const shouldShowDismissed = !dismissed || alwaysShow;

      if (shouldShowDismissed && isPublished && shouldShowPage && isLoaded) {
        const delaySeconds = homeSettings?.promotions?.catalogPromoDelay ?? 3;
        const timer = setTimeout(() => {
          setShowPromoPopup(true);
        }, delaySeconds * 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [homeSettings, isLoaded]);

  const handleClosePromoPopup = () => {
    setShowPromoPopup(false);
    if (typeof window !== "undefined") {
      localStorage.setItem("b2b_catalog_promo_dismissed", "true");
    }
  };

  const handleClaimCoupons = () => {
    alert("¡Felicidades! Cupones aplicados correctamente. Inicia sesión o regístrate para disfrutarlos.");
    handleClosePromoPopup();
  };

  const printPrices: Record<string, number> = {
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
  const printPrice = isPersonalized ? (printPrices[printOption] || 0) : 0;

  const totalQuantity = typeof quantity === 'number' ? quantity : 0;

  const minPurchase = product.minPurchase ?? 50;
  const discountQty1 = product.discountQty1 ?? 100;
  const discountQty2 = product.discountQty2 ?? 150;

  const roundToHalf = (num: number) => Math.round(num * 2) / 2;
  const basePrice = product.price || 0;
  const tier2Price = roundToHalf(basePrice * (1 - (product.discount100 || 0) / 100));
  const tier3Price = roundToHalf(basePrice * (1 - (product.discount150 || 0) / 100));

  let unitProductPrice = basePrice;
  if (totalQuantity > discountQty2) {
    unitProductPrice = tier3Price;
  } else if (totalQuantity >= discountQty1) {
    unitProductPrice = tier2Price;
  }

  const unitDecoratedPrice = printPrice;
  const finalPricePerUnit = unitProductPrice + unitDecoratedPrice;
  const total = finalPricePerUnit * totalQuantity;

  const handleAddToCart = () => {
    if (totalQuantity < minPurchase) return;
    
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
      mockupImage,
      minPurchase
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
        backgroundColor: '#ffffff', 
        scale: 1.2, 
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

      // 1. Capture Tech Drawing (if exists)
      const hasTechImage = !!product.images[getTechImageIndex()];
      let techData = null;

      if (hasTechImage) {
        setMockupBgIndex(getTechImageIndex());
        await new Promise(r => setTimeout(r, 400)); // Esperar render y carga
        const techCanvas = await html2canvas(mockupPreviewRef.current, captureOptions);
        techData = techCanvas.toDataURL("image/jpeg", 0.7);
      }

      // 2. Capture Real Image
      setMockupBgIndex(getIndividualImageIndex());
      await new Promise(r => setTimeout(r, 400)); // Esperar render y carga
      const realCanvas = await html2canvas(mockupPreviewRef.current, captureOptions);
      const realData = realCanvas.toDataURL("image/jpeg", 0.7);

      // Save mockups
      const mockupsToSave = [
        { bgIndex: getIndividualImageIndex(), imgData: realData }
      ];
      if (hasTechImage && techData) {
        mockupsToSave.push({ bgIndex: getTechImageIndex(), imgData: techData });
      }
      setSavedMockups(mockupsToSave);
      
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
      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-24 left-1/2 transform -translate-x-1/2 bg-green-600 text-white py-3 px-6 rounded-full shadow-lg flex items-center gap-2 font-bold text-sm z-50 animate-in fade-in slide-in-from-top duration-300">
          <Check className="w-5 h-5 shrink-0" />
          <span>¡Agregado a tu lista de cotización con éxito!</span>
        </div>
      )}

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
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 lg:p-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Gallery */}
          <div className="lg:col-span-5 space-y-4">
            <div className="aspect-square bg-white rounded-xl overflow-hidden border border-gray-100 relative">
              <Image 
                src={product.images[selectedImage]} 
                alt={product.name} 
                width={600}
                height={600}
                className="w-full h-full object-contain p-4"
                priority
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
                   {!selectedColor.startsWith('#') && <span className="text-[10px] font-bold text-gray-550">{selectedColor.substring(0,3)}</span>}
                </div>
              )}
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
              {product.images.map((img, idx) => {
                if (!img) return null;
                return (
                  <button 
                    key={idx} 
                    onClick={() => setSelectedImage(idx)}
                    onMouseEnter={() => setSelectedImage(idx)}
                    className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${selectedImage === idx ? 'border-[#11a98c] ring-2 ring-[#11a98c]/20' : 'border-transparent hover:border-gray-200'}`}
                  >
                    <Image src={img} alt="" width={80} height={80} className="w-full h-full object-contain p-1" />
                  </button>
                );
              })}
            </div>

            {/* Saved Mockups Area */}
            {savedMockups.length > 0 && (
              <div id="generated-mockups-section" className="pt-6 mt-6 border-t border-gray-100">
                <h4 className="font-bold text-gray-900 mb-3 text-sm uppercase tracking-wider text-center">Tus Previsualizaciones</h4>
                <div className="grid grid-cols-2 gap-4">
                  {savedMockups.map((mockup) => (
                    <div key={mockup.bgIndex} className="rounded-lg overflow-hidden border border-gray-200 shadow-sm">
                      <img src={mockup.imgData} alt={`Mockup ${mockup.bgIndex}`} className="w-full h-auto object-contain bg-gray-50 aspect-square" />
                      <div className="bg-white p-2 text-center text-xs font-bold text-gray-550">
                        {mockup.bgIndex === getTechImageIndex() ? "Plano Mecánico" : `Vista ${mockup.bgIndex}`}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Details */}
          <div className="lg:col-span-4 space-y-5">
            <div>
              <div className="flex justify-between items-start mb-2 gap-2">
                <h1 className="text-2xl font-extrabold text-gray-900 leading-tight">{product.name}</h1>
                <span className="bg-gray-100 text-gray-655 px-3 py-1 rounded-full text-xs font-medium shrink-0">
                  SKU: {product.sku}
                </span>
              </div>
              <p className="text-gray-500 text-sm leading-relaxed mb-3">{product.description}</p>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 p-2.5 rounded-lg">
                  <span className="text-[10px] text-gray-550 block mb-0.5">Categoría</span>
                  <span className="font-semibold text-gray-900 text-xs">{product.category}</span>
                </div>
                <div className="bg-gray-50 p-2.5 rounded-lg">
                  <span className="text-[10px] text-gray-555 block mb-0.5">Material</span>
                  <span className="font-semibold text-gray-900 text-xs">{product.material}</span>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-5 space-y-5">
              {/* Volume scale */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-2.5 text-xs uppercase tracking-wider">Precio por Volumen (Producto)</h4>
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                  <div className="grid grid-cols-3 bg-gray-50 text-center text-[10px] font-bold text-gray-550 uppercase tracking-wider border-b border-gray-200">
                    <div className="py-2 border-r border-gray-200">DE {minPurchase} A {discountQty1 - 1} PZ</div>
                    <div className="py-2 border-r border-gray-200">DE {discountQty1} A {discountQty2} PZ</div>
                    <div className="py-2">MÁS DE {discountQty2} PZ</div>
                  </div>
                  <div className="grid grid-cols-3 text-center text-xs">
                    <div className="py-2.5 border-r border-gray-200 font-bold text-gray-900">{formatCurrency(basePrice)}</div>
                    <div className="py-2.5 border-r border-gray-200 font-bold text-gray-900">{formatCurrency(tier2Price)}</div>
                    <div className="py-2.5 font-bold text-gray-900">{formatCurrency(tier3Price)}</div>
                  </div>
                </div>
              </div>

              {/* Color Selection */}
              {product.colors && product.colors.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2.5 text-xs uppercase tracking-wider">Colores sujetos a disponibilidad</h4>
                  <div className="flex flex-wrap gap-2">
                    {product.colors.map(color => {
                      const isHex = color.startsWith('#');
                      return (
                      <button 
                        key={color}
                        onClick={() => setSelectedColor(color)}
                        title={color}
                        className={`w-7 h-7 rounded-full border-2 transition-all flex items-center justify-center ${selectedColor === color ? 'border-[#11a98c] ring-2 ring-[#11a98c]/20 ring-offset-2' : 'border-gray-200 hover:border-gray-300'}`}
                        style={{ backgroundColor: isHex ? color : '#e5e7eb' }}
                      >
                        {!isHex && <span className="text-[7px] text-gray-500 overflow-hidden font-bold">{color.substring(0,3)}</span>}
                      </button>
                    )})}
                  </div>
                </div>
              )}

              {/* Mockup Generator Link */}
              <div className="p-4 bg-primary-50 rounded-lg flex justify-center border border-primary-100">
                <button 
                  onClick={() => setShowMockup(true)}
                  className="w-full bg-[#11a98c] hover:bg-[#0b8a7b] text-white text-sm font-bold py-2.5 px-4 rounded transition-colors flex items-center justify-center cursor-pointer"
                >
                  Visualiza el producto con tu logo AQUÍ
                </button>
              </div>

              {/* Personalization Options */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3 text-xs uppercase tracking-wider">Opciones de Personalización</h4>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => setIsPersonalized(false)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${!isPersonalized ? 'border-[#11a98c] bg-[#11a98c]/5 ring-1 ring-[#11a98c]' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                  >
                    <div className="font-bold text-gray-900 text-sm">Sin Impresión</div>
                    <div className="text-[10px] text-gray-550 mt-0.5">Producto en blanco</div>
                  </button>
                  <button 
                    onClick={() => setIsPersonalized(true)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${isPersonalized ? 'border-[#11a98c] bg-[#11a98c]/5 ring-1 ring-[#11a98c]' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                  >
                    <div className="font-bold text-gray-900 text-sm">Con Impresión</div>
                    <div className="text-[10px] text-gray-550 mt-0.5">Logotipo u otra técnica</div>
                  </button>
                </div>
              </div>

              {isPersonalized && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2 text-xs uppercase tracking-wider">Técnica de Impresión</h4>
                  <select 
                    value={printOption}
                    onChange={(e) => setPrintOption(e.target.value)}
                    className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg focus:ring-[#11a98c] focus:border-[#11a98c] block p-2.5 text-sm font-medium"
                  >
                    {Object.entries(printPrices).filter(([tech]) => tech !== "Sin Impresión").map(([tech, price]) => (
                      <option key={tech} value={tech}>{tech} (+{formatCurrency(price)} c/u)</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Column 3: Buy Box */}
          <div className="lg:col-span-3 bg-gray-50 border border-gray-200 rounded-2xl p-5 space-y-4 self-start shadow-sm">
            <h3 className="font-extrabold text-gray-900 text-sm uppercase tracking-wider border-b pb-2">Desglose de Cotización</h3>
            
            {/* Destino de Envío */}
            <div className="bg-white rounded-xl p-3 border border-gray-200 flex items-center gap-2 text-xs text-gray-600">
              <MapPin className="w-4 h-4 text-[#11a98c] shrink-0" />
              <span className="font-bold text-gray-800">Enviar a:</span>
            </div>

            {/* Quantity Input */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Cantidad a Cotizar</label>
              <input 
                type="number" 
                min="0"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || "")}
                onBlur={() => {
                  if (typeof quantity === 'number' && quantity > 0 && quantity < minPurchase) {
                    setQuantity(minPurchase);
                  }
                }}
                placeholder={`Mín: ${minPurchase}`}
                className="w-full bg-white border border-gray-300 text-gray-900 text-base rounded-lg focus:ring-[#11a98c] focus:border-[#11a98c] block p-2 font-bold text-center"
              />
              {quantity === "" && (
                <p className="text-red-500 text-[10px] mt-1 flex items-center">
                  <AlertCircle className="w-3.5 h-3.5 mr-1 shrink-0" />
                  Mínimo {minPurchase} piezas.
                </p>
              )}
            </div>

            {/* Pricing breakdown */}
            <div className="bg-gray-900 text-white p-4 rounded-xl space-y-3 font-normal">
              <div className="flex justify-between items-center text-xs pb-2 border-b border-gray-700">
                <span className="text-gray-300 font-normal">Precio Escala (Pz)</span>
                <span className="font-normal">{formatCurrency(unitProductPrice)} c/u</span>
              </div>
              <div className="flex justify-between items-center text-xs pb-2 border-b border-gray-700">
                <span className="text-gray-300 font-normal">Costo Impresión</span>
                <span className="font-normal">+ {formatCurrency(unitDecoratedPrice)} c/u</span>
              </div>
              <div className="flex justify-between items-center text-xs font-normal">
                <span className="text-gray-300 font-normal">Final Unitario</span>
                <span className="font-normal text-primary-400">{formatCurrency(finalPricePerUnit)}</span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-gray-700 gap-2 font-normal">
                <div className="flex flex-col text-left font-normal">
                  <span className="text-[9px] text-gray-450 uppercase tracking-wider font-normal">Total Estimado</span>
                  <span className="text-[9px] text-gray-455 font-normal">({totalQuantity} pz)</span>
                </div>
                <span className="text-lg font-normal text-white text-right">{formatCurrency(total)}</span>
              </div>
              <p className="text-[9px] text-gray-455 mt-2 text-center font-normal">* Precios no incluyen IVA y están sujetos a existencias.</p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-2">
              <button 
                onClick={handleAddToCart} 
                disabled={totalQuantity < minPurchase}
                className={`w-full py-3 px-4 rounded-xl font-bold text-sm transition-colors flex items-center justify-center focus:ring-4 focus:ring-primary-300 focus:outline-none ${
                  totalQuantity >= minPurchase 
                    ? 'bg-[#11a98c] hover:bg-[#0b8a7b] text-white shadow-sm cursor-pointer' 
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                Agregar al carrito
              </button>
              
              <Link 
                href="/cart"
                className="w-full py-3 px-4 rounded-xl font-bold text-sm transition-colors flex items-center justify-center border border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-100 bg-white"
              >
                Ver carrito
              </Link>

              {/* Promotion Tag */}
              {homeSettings?.promotions?.tagPublished !== false && (
                <div 
                  className={`rounded-lg p-2.5 flex items-center gap-2 font-semibold mt-2 ${homeSettings?.promotions?.tagTextSize || "text-xs"}`}
                  style={{
                    backgroundColor: homeSettings?.promotions?.tagBgColor || "#eefcf7",
                    borderColor: homeSettings?.promotions?.tagBorderColor || "#cbf2e3",
                    color: homeSettings?.promotions?.tagTextColor || "#0a6644",
                    borderWidth: "1px"
                  }}
                >
                  {renderTagIcon(homeSettings?.promotions?.tagIcon, homeSettings?.promotions?.tagTextColor)}
                  <span>{homeSettings?.promotions?.tagText || "Oferta especial de envío gratis"}</span>
                </div>
              )}
            </div>

            {/* Remitente GeekyStore */}
            <div className="border-t border-gray-200 pt-3 mt-3 text-[11px] text-gray-500 space-y-1">
              <div className="flex justify-between">
                <span>Remitente:</span>
                <span className="font-bold text-gray-800">GeekyStore</span>
              </div>
              <div className="flex justify-between">
                <span>Código Postal:</span>
                <span className="font-bold text-gray-800">20196</span>
              </div>
              <div className="flex justify-between">
                <span>Envío:</span>
                <span className="text-green-600 font-bold">Por acordar</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Mockup Modal */}
      {showMockup && typeof window !== 'undefined' && createPortal(
        <div className="fixed inset-0 bg-[#e5e7eb] sm:bg-gray-900/90 z-50 flex items-center justify-center p-0 sm:p-4">
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
                  <div id="mockup-preview-capture" ref={mockupPreviewRef} className="relative inline-flex items-center justify-center max-w-full max-h-[35vh] md:max-h-[60vh]">
                    <img 
                      src={mockupBgUrl} 
                      alt="Mockup Base" 
                      crossOrigin={mockupBgUrl.startsWith('data:') ? undefined : "anonymous"}
                      className="max-w-full max-h-[35vh] md:max-h-[60vh] pointer-events-none object-contain" 
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
                          crossOrigin={logoUrl.startsWith('data:') ? undefined : "anonymous"}
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
                      if (!img) return null;
                      if (idx !== getIndividualImageIndex() && idx !== getTechImageIndex()) return null;
                      return (
                        <button 
                          key={idx} 
                          onClick={() => setMockupBgIndex(idx)}
                          className={`flex-shrink-0 w-20 h-20 bg-white rounded-lg overflow-hidden border-2 transition-all ${mockupBgIndex === idx ? 'border-[#11a98c]' : 'border-transparent hover:border-gray-300'}`}
                        >
                          <img 
                            src={idx === getTechImageIndex() ? getCorsUrl(img) : (paddedOriginalImage || getCorsUrl(product.images[getIndividualImageIndex()]))} 
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
        </div>,
        document.body
      )}

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <div className="pt-8 border-t border-gray-100 mt-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Productos Similares</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {relatedProducts.map(rp => (
              <ProductCard key={rp.id} product={rp} />
            ))}
          </div>
        </div>
      )}

      {/* Side Promotion Drawer */}
      {homeSettings?.promotions?.sidePublished !== false && 
       (homeSettings?.promotions?.sidePromoPage === "Detalle de Producto" || 
        homeSettings?.promotions?.sidePromoPage === "Ambos" ||
        homeSettings?.promotions?.sidePromoPage === undefined) && (
        <>
          {/* Drawer Overlay */}
          {showSidePromo && (
            <div 
              onClick={() => setShowSidePromo(false)} 
              className="fixed inset-0 bg-black/40 z-40 transition-opacity"
            />
          )}

          {/* Side Drawer Panel Wrapper (Floating Centered on Right Side) */}
          <div 
            className="fixed right-0 top-1/2 z-50 flex shadow-2xl transition-transform duration-300"
            style={{
              height: '420px',
              transform: showSidePromo 
                ? 'translate(0, -50%)' 
                : `translate(${panelWidth}px, -50%)`,
            }}
          >
            {/* Vertical Toggle Trigger Button (Sized to exact height of drawer) */}
            <button 
              onClick={() => setShowSidePromo(!showSidePromo)}
              className="w-12 transition-all duration-200 hover:brightness-110 active:scale-95 flex flex-col items-center py-6 px-1 rounded-l-2xl shadow-md focus:outline-none cursor-pointer select-none"
              style={{ 
                height: '420px',
                backgroundColor: homeSettings?.promotions?.sideButtonBgColor || "#000000",
                color: homeSettings?.promotions?.sideButtonTextColor || "#ffffff"
              }}
            >
              {/* Arrow icon pointing to close (▶) or open (◀) */}
              <div className="mb-4 text-xs font-bold flex flex-col items-center gap-1.5">
                <span>{showSidePromo ? '▶' : '◀'}</span>
                {renderTriggerIcon(homeSettings?.promotions?.sideTriggerIcon)}
              </div>
              
              {/* Vertical text (Larger and proportional to the tab) */}
              <span 
                className="tracking-[0.22em] font-extrabold uppercase select-none flex-1 text-center" 
                style={{ 
                  writingMode: 'vertical-lr', 
                  transform: 'rotate(180deg)',
                  fontSize: homeSettings?.promotions?.sideTextSizeTrigger === "Pequeño" 
                    ? "10px" 
                    : homeSettings?.promotions?.sideTextSizeTrigger === "Grande" 
                      ? "14px" 
                      : "12px"
                }}
              >
                {homeSettings?.promotions?.sideTextTrigger || "CONSIGUE 30% DE DTO."}
              </span>
            </button>

            {/* Pink Drawer Panel (Matching height of W-12 trigger) */}
            <div 
              className="flex flex-col font-sans border-y border-r rounded-r-2xl overflow-hidden shadow-inner"
              style={{ 
                width: `${panelWidth}px`, 
                height: '420px',
                backgroundColor: homeSettings?.promotions?.sideBgColor || "#ffeceb",
                color: homeSettings?.promotions?.sideTextColor || "#222222",
                borderColor: homeSettings?.promotions?.sidePromoTextColor || "#ffd2cc"
              }}
            >
              {/* Content Area (Sized and padded to fit cleanly inside 420px height) */}
              <div className="flex-1 p-6 flex flex-col justify-center space-y-5">
                
                {/* Promo Header Text */}
                <h3 
                  className="text-center font-bold leading-snug px-1 uppercase tracking-wide"
                  style={{
                    color: homeSettings?.promotions?.sideTextColor || "#222222",
                    fontSize: homeSettings?.promotions?.sideTextSizeTitle === "text-xs" 
                      ? "12px" 
                      : homeSettings?.promotions?.sideTextSizeTitle === "text-base" 
                        ? "16px" 
                        : "14px"
                  }}
                >
                  {homeSettings?.promotions?.sideTitle || "Suscribirse para disfrutar los precios de VIP y Ventas Flash"}
                </h3>

                {/* Promo Offer Columns */}
                <div className="grid grid-cols-2 gap-2 items-center relative py-1">
                  {/* Box 1 (Left) */}
                  {parseSideTextLeft(
                    homeSettings?.promotions?.sideTextLeft || "Suscribirse y obtén -30% En Primer Pedido",
                    homeSettings?.promotions?.sidePromoTextColor || "#e1251b",
                    homeSettings?.promotions?.sideTextSizePromo || "Normal"
                  )}

                  {/* Vertical Divider */}
                  <div 
                    className="absolute left-1/2 top-1 bottom-1 border-l" 
                    style={{ borderColor: homeSettings?.promotions?.sidePromoTextColor ? `${homeSettings.promotions.sidePromoTextColor}44` : "#fecaca" }}
                  />

                  {/* Box 2 (Right) */}
                  {parseSideTextRight(
                    homeSettings?.promotions?.sideTextRight || "ENVÍO GRATIS en su primer pedido +$MXN99",
                    homeSettings?.promotions?.sidePromoTextColor || "#e1251b",
                    homeSettings?.promotions?.sideTextSizePromo || "Normal"
                  )}
                </div>

                {/* Registration Form (Side-by-side) */}
                <div className="flex gap-2 w-full pt-1">
                  <input 
                    type="email" 
                    placeholder="INTRODUCE TU CORREO ELECTRÓNICO"
                    className="flex-1 bg-white border border-gray-300 rounded p-2.5 text-[10px] sm:text-xs focus:ring-[#e1251b] focus:border-[#e1251b] text-center font-semibold placeholder-gray-400 italic"
                  />
                  <button 
                    onClick={() => {
                      alert("¡Gracias por registrarte! Tu código de descuento ha sido enviado a tu correo.");
                      setShowSidePromo(false);
                    }}
                    className="w-24 sm:w-28 font-extrabold py-2.5 px-2 rounded text-[10px] sm:text-xs tracking-wider transition-all hover:brightness-110 active:scale-95 uppercase cursor-pointer"
                    style={{
                      backgroundColor: homeSettings?.promotions?.sideButtonBgColor || "#000000",
                      color: homeSettings?.promotions?.sideButtonTextColor || "#ffffff"
                    }}
                  >
                    REGÍSTRATE
                  </button>
                </div>

                {/* Disclaimers & Checkboxes */}
                <div className="text-[9px] sm:text-[10px] space-y-2.5 leading-relaxed pt-1" style={{ color: homeSettings?.promotions?.sideTextColor ? `${homeSettings.promotions.sideTextColor}cc` : "#6b7280" }}>
                  <p>
                    Al registrarse, acepta nuestra <span className="underline cursor-pointer hover:text-black">Política de privacidad y cookies</span> y nuestros <span className="underline cursor-pointer hover:text-black">Términos y condiciones</span>.
                  </p>
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input type="checkbox" className="mt-0.5 rounded text-black focus:ring-black h-3 w-3 border-gray-300 shrink-0" />
                    <span className="leading-normal">
                      Me gustaría recibir ofertas exclusivas y las últimas noticias de geekystore por correo electrónico. Entiendo que puedo comunicarme con geekystore para cancelar la suscripción en cualquier momento.
                    </span>
                  </label>
                </div>

              </div>
            </div>
          </div>
        </>
      )}

      {/* Floating Catalog Promotion Popup (New Users) */}
      {showPromoPopup && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          {/* Modal Container */}
          <div className="relative w-full max-w-[390px] flex flex-col items-center">
            {/* Close Button above the card */}
            <button 
              onClick={handleClosePromoPopup} 
              className="absolute -top-10 right-2 p-1.5 rounded-full border border-white/50 hover:border-white text-white hover:bg-white/10 transition-colors z-50 cursor-pointer"
              title="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Main White Promo Card */}
            <div 
              className="rounded-3xl w-full p-5 pt-7 pb-6 relative shadow-2xl flex flex-col items-center border"
              style={{
                background: `linear-gradient(to bottom, ${homeSettings?.promotions?.catalogPromoBgColorStart || "#fff6ee"}, ${homeSettings?.promotions?.catalogPromoBgColorEnd || "#ffffff"})`,
                borderColor: homeSettings?.promotions?.catalogPromoCouponBorderColor || "#ffeadd"
              }}
            >

              {/* Title Section */}
              <h2 
                className="font-bold text-center text-lg mt-1 mb-5"
                style={{ color: homeSettings?.promotions?.catalogPromoTextColor || "#a0522d" }}
              >
                Ofertas especiales solo para ti
              </h2>

              {/* Coupon List Container */}
              <div className="w-full space-y-4 mb-6">
                
                {/* Coupon 1 */}
                <div 
                  className="relative flex rounded-2xl overflow-hidden p-4 min-h-[92px] shadow-sm border"
                  style={{
                    backgroundColor: homeSettings?.promotions?.catalogPromoCouponBgColor || "#fff7f6",
                    borderColor: homeSettings?.promotions?.catalogPromoCouponBorderColor || "#ffd2cc"
                  }}
                >
                  {/* Left tag */}
                  <div 
                    className="absolute top-0 left-0 text-white text-[8px] font-extrabold px-2 py-0.5 rounded-br-xl tracking-wider uppercase"
                    style={{ backgroundColor: homeSettings?.promotions?.catalogPromoCouponTextColor || "#ff4a5a" }}
                  >
                    Nuevo usuario
                  </div>
                  
                  {/* Left content */}
                  <div className="w-[38%] flex flex-col justify-center items-center pr-2 pt-2 text-center">
                    <span 
                      className="text-xl sm:text-2xl font-black leading-none tracking-tight"
                      style={{ color: homeSettings?.promotions?.catalogPromoCouponTextColor || "#ff4a5a" }}
                    >
                      {homeSettings?.promotions?.coupon1Discount?.split(' ')[0] || "30%"}
                    </span>
                    <span 
                      className="text-[7.5px] font-bold mt-1 uppercase tracking-tight"
                      style={{ color: homeSettings?.promotions?.catalogPromoCouponTextColor || "#ff4a5a" }}
                    >
                      {homeSettings?.promotions?.coupon1Discount?.split(' ').slice(1).join(' ') || "DE DESCUENTO"}
                    </span>
                    <span className="text-[8px] text-gray-455 mt-1 font-medium">
                      {homeSettings?.promotions?.coupon1LeftNote || "Sin mín. de compra"}
                    </span>
                  </div>

                  {/* Dashed border separator */}
                  <div 
                    className="border-r border-dashed my-1" 
                    style={{ borderColor: homeSettings?.promotions?.catalogPromoCouponBorderColor || "#ffd2cc" }}
                  />

                  {/* Right content */}
                  <div className="flex-1 pl-4 flex flex-col justify-center text-left">
                    <span 
                      className="text-xs sm:text-sm font-extrabold leading-snug"
                      style={{ color: homeSettings?.promotions?.catalogPromoCouponTextColor || "#ff4a5a" }}
                    >
                      {homeSettings?.promotions?.coupon1RightTitle || "Cupón válido en todo el sitio"}
                    </span>
                    <span className="text-[9px] text-gray-500 mt-1">
                      {homeSettings?.promotions?.coupon1RightLimit || "Límite de $MXN3,000"}
                    </span>
                    <div className="flex items-center justify-between mt-2 text-[8px] text-gray-400">
                      <span>Por tiempo limitado</span>
                      <ChevronDown className="w-3 h-3 text-gray-455 shrink-0" />
                    </div>
                  </div>

                  {/* Scalloped circle cutouts */}
                  <div 
                    className="absolute top-0 left-[38%] -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-b"
                    style={{ 
                      backgroundColor: homeSettings?.promotions?.catalogPromoBgColorStart || "#fff6ee",
                      borderColor: homeSettings?.promotions?.catalogPromoCouponBorderColor || "#ffd2cc"
                    }}
                  />
                  <div 
                    className="absolute bottom-0 left-[38%] translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-t"
                    style={{ 
                      backgroundColor: homeSettings?.promotions?.catalogPromoBgColorEnd || "#ffffff",
                      borderColor: homeSettings?.promotions?.catalogPromoCouponBorderColor || "#ffd2cc"
                    }}
                  />
                </div>

                {/* Coupon 2 */}
                <div 
                  className="relative flex rounded-2xl overflow-hidden p-4 min-h-[92px] shadow-sm border"
                  style={{
                    backgroundColor: homeSettings?.promotions?.catalogPromoCouponBgColor || "#fff7f6",
                    borderColor: homeSettings?.promotions?.catalogPromoCouponBorderColor || "#ffd2cc"
                  }}
                >
                  {/* Left tag */}
                  <div 
                    className="absolute top-0 left-0 text-white text-[8px] font-extrabold px-2 py-0.5 rounded-br-xl tracking-wider uppercase"
                    style={{ backgroundColor: homeSettings?.promotions?.catalogPromoCouponTextColor || "#ff4a5a" }}
                  >
                    Nuevo usuario
                  </div>
                  
                  {/* Left content */}
                  <div className="w-[38%] flex flex-col justify-center items-center pr-2 pt-2 text-center">
                    <span 
                      className="text-xl sm:text-2xl font-black leading-none tracking-tight"
                      style={{ color: homeSettings?.promotions?.catalogPromoCouponTextColor || "#ff4a5a" }}
                    >
                      {homeSettings?.promotions?.coupon2Discount?.split(' ')[0] || "65%"}
                    </span>
                    <span 
                      className="text-[7.5px] font-bold mt-1 uppercase tracking-tight"
                      style={{ color: homeSettings?.promotions?.catalogPromoCouponTextColor || "#ff4a5a" }}
                    >
                      {homeSettings?.promotions?.coupon2Discount?.split(' ').slice(1).join(' ') || "DE DESCUENTO"}
                    </span>
                    <span className="text-[8px] text-gray-455 mt-1 font-medium">
                      {homeSettings?.promotions?.coupon2LeftNote || "Sin mín. de compra"}
                    </span>
                  </div>

                  {/* Dashed border separator */}
                  <div 
                    className="border-r border-dashed my-1" 
                    style={{ borderColor: homeSettings?.promotions?.catalogPromoCouponBorderColor || "#ffd2cc" }}
                  />

                  {/* Right content */}
                  <div className="flex-1 pl-4 flex flex-col justify-center text-left">
                    <span 
                      className="text-xs sm:text-sm font-extrabold leading-snug"
                      style={{ color: homeSettings?.promotions?.catalogPromoCouponTextColor || "#ff4a5a" }}
                    >
                      {homeSettings?.promotions?.coupon2RightTitle || "Cupón válido en todo el sitio"}
                    </span>
                    <span className="text-[9px] text-gray-550 mt-1">
                      {homeSettings?.promotions?.coupon2RightLimit || "Límite de $MXN240"}
                    </span>
                    <div className="flex items-center justify-between mt-2 text-[8px] text-gray-400">
                      <span>Por tiempo limitado</span>
                      <ChevronDown className="w-3 h-3 text-gray-455 shrink-0" />
                    </div>
                  </div>

                  {/* Scalloped circle cutouts */}
                  <div 
                    className="absolute top-0 left-[38%] -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-b"
                    style={{ 
                      backgroundColor: homeSettings?.promotions?.catalogPromoBgColorStart || "#fff6ee",
                      borderColor: homeSettings?.promotions?.catalogPromoCouponBorderColor || "#ffd2cc"
                    }}
                  />
                  <div 
                    className="absolute bottom-0 left-[38%] translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-t"
                    style={{ 
                      backgroundColor: homeSettings?.promotions?.catalogPromoBgColorEnd || "#ffffff",
                      borderColor: homeSettings?.promotions?.catalogPromoCouponBorderColor || "#ffd2cc"
                    }}
                  />
                </div>

              </div>

              {/* Action Claim Button */}
              <button 
                onClick={handleClaimCoupons}
                className="w-full text-sm font-extrabold py-3 px-6 rounded-full shadow-lg hover:shadow-xl hover:brightness-110 active:scale-[0.98] transition-all uppercase tracking-wider cursor-pointer flex items-center justify-center gap-2"
                style={{
                  backgroundColor: homeSettings?.promotions?.catalogPromoButtonBgColor || "#222222",
                  color: homeSettings?.promotions?.catalogPromoButtonTextColor || "#ffffff"
                }}
              >
                <span>{homeSettings?.promotions?.catalogPromoButtonText || "¡Consíguelos Todos!"}</span>
              </button>

            </div>

            {/* Under-card Footer Disclaimer Text */}
            <p className="text-[10px] text-white/95 text-center mt-3 tracking-wide drop-shadow-xs">
              {homeSettings?.promotions?.catalogPromoFooterNote || "Cupones confirmados después de iniciar sesión"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
