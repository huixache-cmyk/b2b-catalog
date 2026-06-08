"use client";
 
import { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { Product } from "@/types";
import { ProductCard } from "./ProductCard";
import { Check, Info, ShieldCheck, Truck, ChevronRight, ChevronLeft, Upload, Download, X, AlertCircle, ShoppingCart, MapPin, Gift, Tag, Percent, Star, ChevronDown, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/hooks/useCart";
import html2canvas from "html2canvas";
import { useSettings } from "@/hooks/useSettings";
import { formatCurrency } from "@/utils/formatters";
import Image from "next/image";
import { useClientAuth } from "@/hooks/useClientAuth";
import { supabase } from "@/lib/supabase";

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

const parsePromotionText = (fullText: string, promoColor: string, promoSize: string, side: 'left' | 'right') => {
  if (!fullText) return null;

  // Split into words, keeping the whitespace in the array
  const parts = fullText.split(/(\s+)/);
  const segments: { text: string; isUpper: boolean }[] = [];

  parts.forEach(part => {
    if (!part) return;
    
    // If it's just spaces, append to the last segment if we have one
    if (/^\s+$/.test(part)) {
      if (segments.length > 0) {
        segments[segments.length - 1].text += part;
      } else {
        segments.push({ text: part, isUpper: false });
      }
      return;
    }

    // Determine if it is uppercase
    // A part is uppercase if it has at least one letter and no lowercase letters
    const hasLetters = /[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ]/.test(part);
    let isUpper = false;
    if (hasLetters) {
      isUpper = !/[a-zñüáéíóú]/.test(part);
    } else {
      isUpper = segments.length > 0 ? segments[segments.length - 1].isUpper : false;
    }

    if (segments.length > 0 && segments[segments.length - 1].isUpper === isUpper) {
      segments[segments.length - 1].text += part;
    } else {
      segments.push({ text: part, isUpper });
    }
  });

  const isLeft = side === 'left';
  const fontSizeUpper = promoSize === "Grande" ? "42px" : promoSize === "Muy Grande" ? "52px" : "32px";
  
  const fontSizeLower = isLeft ? "10px" : "9px";

  return (
    <div className={`text-center flex flex-col justify-center items-center ${isLeft ? 'px-2' : 'pl-3 px-2'}`}>
      {segments.map((seg, idx) => {
        const trimmedText = seg.text.trim();
        if (!trimmedText) return null;

        if (seg.isUpper) {
          const words = trimmedText.split(/\s+/);
          return (
            <div key={idx} className="flex flex-col items-center">
              {words.map((word, wIdx) => (
                <span 
                  key={wIdx} 
                  className="font-black leading-none my-0.5 text-center block tracking-tighter"
                  style={{ color: promoColor, fontSize: fontSizeUpper }}
                >
                  {word}
                </span>
              ))}
            </div>
          );
        } else {
          return (
            <span 
              key={idx} 
              className="font-extrabold uppercase tracking-wide opacity-90 my-1 text-center block leading-tight max-w-full"
              style={{ 
                fontSize: fontSizeLower,
                color: '#4b5563'
              }}
            >
              {trimmedText}
            </span>
          );
        }
      })}
    </div>
  );
};

const parseSideTextLeft = (fullText: string, promoColor: string, promoSize: string) => {
  return parsePromotionText(fullText, promoColor, promoSize, 'left');
};

const parseSideTextRight = (fullText: string, promoColor: string, promoSize: string) => {
  return parsePromotionText(fullText, promoColor, promoSize, 'right');
};
 
export function ProductDetailView({ product, relatedProducts }: { product: Product, relatedProducts: Product[] }) {
  const router = useRouter();
  const { session } = useClientAuth();

  const hasEnvioSinCosto = useMemo(() => {
    if (session) {
      return session.discounts?.some(
        (d: any) => d.discount_type === "promotion" && d.category_id === "ENVIO_SIN_COSTO"
      );
    }
    if (typeof window !== "undefined") {
      try {
        const claimed = JSON.parse(localStorage.getItem("geekystore_claimed_coupons") || "[]");
        return claimed.includes("ENVIO_SIN_COSTO");
      } catch (e) {
        return false;
      }
    }
    return false;
  }, [session]);

  const hasMuestraEnvio = useMemo(() => {
    if (session) {
      return session.discounts?.some(
        (d: any) => d.discount_type === "promotion" && d.category_id === "MUESTRA_Y_ENVIO_GRATIS"
      );
    }
    if (typeof window !== "undefined") {
      try {
        const claimed = JSON.parse(localStorage.getItem("geekystore_claimed_coupons") || "[]");
        return claimed.includes("MUESTRA_Y_ENVIO_GRATIS");
      } catch (e) {
        return false;
      }
    }
    return false;
  }, [session]);
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
  const [acceptsOffers, setAcceptsOffers] = useState(false);
  
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
 
  const [shippingDestination, setShippingDestination] = useState<{ name: string; city: string; state: string; zip: string; address?: string } | null>(null);
 
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("geekystore_quotes");
        if (saved) {
          const quotes = JSON.parse(saved);
          if (Array.isArray(quotes) && quotes.length > 0) {
            const lastQuote = quotes[0];
            if (lastQuote && lastQuote.client) {
              const { name, city, state, zip, address } = lastQuote.client;
              if (name || city || state || zip) {
                setShippingDestination({ name, city, state, zip, address });
              }
            }
          }
        }
      } catch (e) {
        console.warn("Failed to load last shipping destination", e);
      }
    }
  }, []);

  const getShippingAddressText = () => {
    if (session && session.addresses && session.addresses.length > 0) {
      const defaultAddr = session.addresses.find(a => a.is_default) || session.addresses[0];
      const interior = defaultAddr.interior_number ? `, Int. ${defaultAddr.interior_number}` : "";
      return `${defaultAddr.street} #${defaultAddr.exterior_number}${interior}, Col. ${defaultAddr.neighborhood}, ${defaultAddr.city}, ${defaultAddr.state} - CP ${defaultAddr.postal_code}`;
    }
    if (shippingDestination) {
      const addrPart = shippingDestination.address ? `${shippingDestination.address}, ` : "";
      return `${addrPart}${shippingDestination.city}, ${shippingDestination.state} - CP ${shippingDestination.zip}`;
    }
    return "No especificado";
  };
 
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

  // Promocional Clientes State
  const [showClientPromoPopup, setShowClientPromoPopup] = useState(false);
  const [clientPromoEmail, setClientPromoEmail] = useState("");
  const [clientPromoError, setClientPromoError] = useState("");
  const [isSubmittingClientPromo, setIsSubmittingClientPromo] = useState(false);
  const [clientPromoSuccess, setClientPromoSuccess] = useState(false);

  // Signatures for dynamic localStorage keys to reset "first visit" status upon promotion changes
  const catalogPromoSignature = useMemo(() => {
    const p = homeSettings?.promotions;
    return `${p?.catalogPromoTitle || ""}_${p?.coupon1Discount || ""}_${p?.coupon1LeftNote || ""}_${p?.coupon1RightTitle || ""}_${p?.coupon1RightLimit || ""}_${p?.catalogPromoBadge || ""}_${p?.catalogPromoButtonText || ""}_${p?.catalogPromoFooterNote || ""}`.replace(/[^a-zA-Z0-9]/g, "_");
  }, [homeSettings?.promotions]);

  const catalogPromoKey = useMemo(() => {
    return `geekystore_first_visit_done_${catalogPromoSignature}`;
  }, [catalogPromoSignature]);

  const clientPromoSignature = useMemo(() => {
    const p = homeSettings?.promotions;
    return `${p?.clientPromoTitle || ""}_${p?.coupon3Discount || ""}_${p?.coupon3LeftNote || ""}_${p?.coupon3RightTitle || ""}_${p?.coupon3RightLimit || ""}_${p?.clientPromoBadge || ""}_${p?.clientPromoButtonText || ""}_${p?.clientPromoFooterNote || ""}`.replace(/[^a-zA-Z0-9]/g, "_");
  }, [homeSettings?.promotions]);

  const clientPromoKey = useMemo(() => {
    return `geekystore_client_visit_done_${clientPromoSignature}`;
  }, [clientPromoSignature]);

  // Trigger catalog promotion popup for guest users (Nuevos Clientes) on first visit
  useEffect(() => {
    if (typeof window !== "undefined" && isLoaded && !session && !hasEnvioSinCosto) {
      const isPublished = homeSettings?.promotions?.catalogPromoPublished ?? true;
      const alwaysShow = homeSettings?.promotions?.catalogPromoAlwaysShow ?? false;
      const displayPage = homeSettings?.promotions?.catalogPromoPage ?? "Detalle de Producto";

      const shouldShowPage = displayPage === "Detalle de Producto" || displayPage === "Ambos";
      const dismissed = localStorage.getItem(catalogPromoKey) === "true";
      const shouldShowDismissed = !dismissed || alwaysShow;

      if (isPublished && shouldShowPage && shouldShowDismissed) {
        const delaySeconds = homeSettings?.promotions?.catalogPromoDelay ?? 3;
        const timer = setTimeout(() => {
          setShowPromoPopup(true);
        }, delaySeconds * 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [homeSettings, isLoaded, session, hasEnvioSinCosto, catalogPromoKey]);

  // Trigger client promotion popup for registered users (Promocional Clientes) on first visit
  useEffect(() => {
    if (typeof window !== "undefined" && isLoaded && session && !hasEnvioSinCosto) {
      const isPublished = homeSettings?.promotions?.clientPromoPublished ?? true;
      const alwaysShow = homeSettings?.promotions?.clientPromoAlwaysShow ?? false;
      const displayPage = homeSettings?.promotions?.clientPromoPage ?? "Detalle de Producto";

      const shouldShowPage = displayPage === "Detalle de Producto" || displayPage === "Ambos";
      const dismissed = localStorage.getItem(clientPromoKey) === "true";
      const shouldShowDismissed = !dismissed || alwaysShow;

      if (isPublished && shouldShowPage && shouldShowDismissed) {
        const delaySeconds = homeSettings?.promotions?.clientPromoDelay ?? 5;
        const timer = setTimeout(() => {
          setShowClientPromoPopup(true);
        }, delaySeconds * 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [homeSettings, isLoaded, session, hasEnvioSinCosto, clientPromoKey]);

  const handleClosePromoPopup = () => {
    setShowPromoPopup(false);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(catalogPromoKey, "true");
      } catch (e) {
        console.warn("Could not save promo dismissal", e);
      }
    }
  };

  const handleCloseClientPromoPopup = () => {
    setShowClientPromoPopup(false);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(clientPromoKey, "true");
      } catch (e) {
        console.warn("Could not save client promo dismissal", e);
      }
    }
  };

  const handleClaimCoupons = async () => {
    if (session) {
      try {
        const { data: existing } = await supabase
          .from("customer_discounts")
          .select("*")
          .eq("customer_id", session.customer.id)
          .eq("discount_type", "promotion")
          .eq("category_id", "ENVIO_SIN_COSTO");
          
        if (!existing || existing.length === 0) {
          const res = await fetch("/api/claim-coupon", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              customer_id: session.customer.id,
              coupon: "ENVIO_SIN_COSTO"
            })
          });
          const resData = await res.json();
          if (!res.ok || !resData.success) {
            throw new Error(resData.error || "Failed to claim coupon");
          }
          
          // Update local storage session
          const updatedDiscounts = [...(session.discounts || []), {
            discount_type: 'promotion',
            category_id: 'ENVIO_SIN_COSTO',
            discount_percent: 0,
            active: true
          }];
          localStorage.setItem("geekystore_b2b_session", JSON.stringify({ ...session, discounts: updatedDiscounts }));
          window.dispatchEvent(new Event("b2b_session_updated"));
          alert("¡Felicidades! El cupón de Envío sin Costo ha sido agregado a tu cuenta B2B.");
        } else {
          alert("Ya has reclamado o usado este cupón.");
        }
      } catch (e) {
        console.error(e);
      }
    } else {
      if (typeof window !== "undefined") {
        try {
          const claimed = JSON.parse(localStorage.getItem("geekystore_claimed_coupons") || "[]");
          if (!claimed.includes("ENVIO_SIN_COSTO")) {
            claimed.push("ENVIO_SIN_COSTO");
            localStorage.setItem("geekystore_claimed_coupons", JSON.stringify(claimed));
          }
          // Dispatch event to open B2B registration modal
          window.dispatchEvent(new CustomEvent("open_b2b_auth", { detail: { register: true } }));
        } catch (e) {
          console.warn(e);
        }
      }
    }
    handleClosePromoPopup();
  };

  const handleClaimSideCoupon = async () => {
    if (session) {
      try {
        const { data: existing } = await supabase
          .from("customer_discounts")
          .select("*")
          .eq("customer_id", session.customer.id)
          .eq("discount_type", "promotion")
          .eq("category_id", "MUESTRA_Y_ENVIO_GRATIS");
          
        if (!existing || existing.length === 0) {
          const res = await fetch("/api/claim-coupon", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              customer_id: session.customer.id,
              coupon: "MUESTRA_Y_ENVIO_GRATIS"
            })
          });
          const resData = await res.json();
          if (!res.ok || !resData.success) {
            throw new Error(resData.error || "Failed to claim coupon");
          }
          
          // Update local storage session
          const updatedDiscounts = [...(session.discounts || []), {
            discount_type: 'promotion',
            category_id: 'MUESTRA_Y_ENVIO_GRATIS',
            discount_percent: 0,
            active: true
          }];
          localStorage.setItem("geekystore_b2b_session", JSON.stringify({ ...session, discounts: updatedDiscounts }));
          window.dispatchEvent(new Event("b2b_session_updated"));
          alert("¡Felicidades! El cupón de Muestra Física y Envío Gratis ha sido agregado a tu cuenta B2B.");
        } else {
          alert("Ya has reclamado o usado este cupón.");
        }
      } catch (e) {
        console.error(e);
      }
    }
    setShowSidePromo(false);
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

  // Helper to calculate B2B price for any quantity
  const getB2BPriceForQty = (qty: number, standardPriceOverride?: number) => {
    if (!session) return null;
    
    // 1. Determine standard scale price for that quantity
    let standardScalePrice = basePrice;
    if (standardPriceOverride !== undefined) {
      standardScalePrice = standardPriceOverride;
    } else {
      if (qty >= discountQty2) {
        standardScalePrice = tier3Price;
      } else if (qty >= discountQty1) {
        standardScalePrice = tier2Price;
      }
    }
    
    // 2. Apply level pricing rules
    let priceAfterLevel = standardScalePrice;
    const priceLevel = session.customer.price_level;
    
    if (priceLevel === "retail") {
      priceAfterLevel = standardScalePrice * 0.95;
    } else if (priceLevel === "wholesale") {
      const option1 = tier2Price;
      const option2 = standardScalePrice * 0.90;
      priceAfterLevel = Math.min(option1, option2);
    } else if (priceLevel === "distributor") {
      const option1 = tier3Price;
      const option2 = standardScalePrice * 0.80;
      priceAfterLevel = Math.min(option1, option2);
    } else if (priceLevel === "special") {
      priceAfterLevel = standardScalePrice * 0.75;
    } else {
      priceAfterLevel = standardScalePrice;
    }
    
    // 3. Resolve active client discounts (Priority: Product > Category > Global > Customer general)
    let bestDiscount = 0;
    const activeDiscounts = session.discounts || [];
    
    const prodDisc = activeDiscounts.find(d => d.active && d.discount_type === "product" && d.product_id === product.id);
    const catDisc = activeDiscounts.find(d => d.active && d.discount_type === "category" && d.category_id?.toLowerCase() === product.category?.toLowerCase());
    const globDisc = activeDiscounts.find(d => d.active && d.discount_type === "global");
    
    if (prodDisc) {
      bestDiscount = prodDisc.discount_percent;
    } else if (catDisc) {
      bestDiscount = catDisc.discount_percent;
    } else if (globDisc) {
      bestDiscount = globDisc.discount_percent;
    } else {
      bestDiscount = session.customer.assigned_discount_percent || 0;
    }
    
    return roundToHalf(priceAfterLevel * (1 - bestDiscount / 100));
  };

  let unitProductPrice = basePrice;
  if (totalQuantity >= discountQty2) {
    unitProductPrice = tier3Price;
  } else if (totalQuantity >= discountQty1) {
    unitProductPrice = tier2Price;
  }

  // Override if B2B customer session is active
  const b2bUnitPrice = getB2BPriceForQty(totalQuantity);
  if (b2bUnitPrice !== null) {
    unitProductPrice = b2bUnitPrice;
  }

  const unitDecoratedPrice = printPrice;
  const finalPricePerUnit = unitProductPrice + unitDecoratedPrice;
  const total = finalPricePerUnit * totalQuantity;

  const handleAddToCart = () => {
    if (totalQuantity < minPurchase) return;
    
    // El plano mecánico siempre debe ser el original del catálogo
    const techIndex = getTechImageIndex();
    const blueprintImage = product.images[techIndex];
    
    // El mockup con logo de la vista real (Imagen 1)
    const mockupImage = savedMockups.find(m => m.bgIndex === getIndividualImageIndex())?.imgData 
      || savedMockups.find(m => m.bgIndex !== techIndex)?.imgData;

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

  // Calculation of price breakdown components for display
  let standardScalePrice = basePrice;
  if (totalQuantity >= discountQty2) {
    standardScalePrice = tier3Price;
  } else if (totalQuantity >= discountQty1) {
    standardScalePrice = tier2Price;
  }

  let levelDiscountPerUnit = 0;
  let levelPercentLabel = "";
  let commercialDiscountPerUnit = 0;
  let commercialLabel = "";

  if (session) {
    const priceLevel = session.customer.price_level;
    let priceAfterLevel = standardScalePrice;
    if (priceLevel === "retail") {
      priceAfterLevel = standardScalePrice * 0.95;
      levelPercentLabel = "Retail (5%)";
    } else if (priceLevel === "wholesale") {
      const option1 = tier2Price;
      const option2 = standardScalePrice * 0.90;
      priceAfterLevel = Math.min(option1, option2);
      const pct = Math.round(((standardScalePrice - priceAfterLevel) / standardScalePrice) * 100);
      levelPercentLabel = `Mayorista (~${pct}%)`;
    } else if (priceLevel === "distributor") {
      const option1 = tier3Price;
      const option2 = standardScalePrice * 0.80;
      priceAfterLevel = Math.min(option1, option2);
      const pct = Math.round(((standardScalePrice - priceAfterLevel) / standardScalePrice) * 100);
      levelPercentLabel = `Distribuidor (~${pct}%)`;
    } else if (priceLevel === "special") {
      priceAfterLevel = standardScalePrice * 0.75;
      levelPercentLabel = "Especial (25%)";
    }
    levelDiscountPerUnit = standardScalePrice - priceAfterLevel;

    let bestDiscount = 0;
    const activeDiscounts = session.discounts || [];
    const prodDisc = activeDiscounts.find(d => d.active && d.discount_type === "product" && d.product_id === product.id);
    const catDisc = activeDiscounts.find(d => d.active && d.discount_type === "category" && d.category_id?.toLowerCase() === product.category?.toLowerCase());
    const globDisc = activeDiscounts.find(d => d.active && d.discount_type === "global");
    
    if (prodDisc) {
      bestDiscount = prodDisc.discount_percent;
      commercialLabel = `Especial Producto (${bestDiscount}%)`;
    } else if (catDisc) {
      bestDiscount = catDisc.discount_percent;
      commercialLabel = `Especial Categoría (${bestDiscount}%)`;
    } else if (globDisc) {
      bestDiscount = globDisc.discount_percent;
      commercialLabel = `Especial Global (${bestDiscount}%)`;
    } else {
      bestDiscount = session.customer.assigned_discount_percent || 0;
      commercialLabel = bestDiscount > 0 ? `Comercial Asignado (${bestDiscount}%)` : "";
    }
    // Match exact unitProductPrice mathematical rounding
    commercialDiscountPerUnit = priceAfterLevel - (getB2BPriceForQty(totalQuantity) || priceAfterLevel);
  }

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
                    <div className="py-2 border-r border-gray-200">DE {discountQty1} A {discountQty2 - 1} PZ</div>
                    <div className="py-2">DE {discountQty2} PZ O MÁS</div>
                  </div>
                  <div className="grid grid-cols-3 text-center text-xs">
                    <div className="py-2.5 border-r border-gray-200 font-bold">
                      {session ? (
                        <div className="flex flex-col items-center">
                          <span className="text-[10px] text-gray-400 line-through">{formatCurrency(basePrice)}</span>
                          <span className="text-green-600 font-black">{formatCurrency(getB2BPriceForQty(minPurchase, basePrice) || basePrice)}</span>
                        </div>
                      ) : (
                        <span className="text-gray-900">{formatCurrency(basePrice)}</span>
                      )}
                    </div>
                    <div className="py-2.5 border-r border-gray-200 font-bold">
                      {session ? (
                        <div className="flex flex-col items-center">
                          <span className="text-[10px] text-gray-400 line-through">{formatCurrency(tier2Price)}</span>
                          <span className="text-green-600 font-black">{formatCurrency(getB2BPriceForQty(discountQty1, tier2Price) || tier2Price)}</span>
                        </div>
                      ) : (
                        <span className="text-gray-900">{formatCurrency(tier2Price)}</span>
                      )}
                    </div>
                    <div className="py-2.5 font-bold">
                      {session ? (
                        <div className="flex flex-col items-center">
                          <span className="text-[10px] text-gray-400 line-through">{formatCurrency(tier3Price)}</span>
                          <span className="text-green-600 font-black">{formatCurrency(getB2BPriceForQty(discountQty2, tier3Price) || tier3Price)}</span>
                        </div>
                      ) : (
                        <span className="text-gray-900">{formatCurrency(tier3Price)}</span>
                      )}
                    </div>
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
            <div className="bg-white rounded-xl p-3 border border-gray-200 flex flex-col gap-1 text-xs text-gray-650 text-left">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#11a98c] shrink-0" />
                <span className="font-bold text-gray-800">Enviar a:</span>
              </div>
              <p className="font-medium text-gray-700 leading-normal pl-6">
                {getShippingAddressText()}
              </p>
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
            {session && (
              <div 
                className="rounded-lg p-2.5 flex items-center justify-between font-semibold mt-2 text-xs border"
                style={{
                  backgroundColor: "#eefcf7",
                  borderColor: "#cbf2e3",
                  color: "#0a6644"
                }}
              >
                <span>Precios B2B aplicados</span>
                <span className="opacity-80">Nivel: {
                  session.customer.price_level === 'retail' ? 'Retail' :
                  session.customer.price_level === 'wholesale' ? 'Mayorista' :
                  session.customer.price_level === 'distributor' ? 'Distribuidor' :
                  session.customer.price_level === 'special' ? 'Especial' :
                  session.customer.price_level
                }</span>
              </div>
            )}
            <div className="bg-gray-900 text-white p-4 rounded-xl space-y-3 font-normal">
              {/* Original Price */}
              <div className="flex justify-between items-center text-xs pb-2 border-b border-gray-700">
                <span className="text-gray-300 font-normal">Precio Escala (Base)</span>
                <span className="font-normal">{formatCurrency(standardScalePrice)} c/u</span>
              </div>
              
              {/* Level Discount */}
              {session && levelDiscountPerUnit > 0 && (
                <div className="flex justify-between items-center text-xs pb-2 border-b border-gray-700 text-green-400">
                  <span className="font-normal text-green-400">Descuento B2B</span>
                  <span className="font-normal">- {formatCurrency(levelDiscountPerUnit)} c/u</span>
                </div>
              )}

              {/* Commercial Discount */}
              {session && commercialDiscountPerUnit > 0 && (
                <div className="flex justify-between items-center text-xs pb-2 border-b border-gray-700 text-green-400">
                  <span className="font-normal text-green-400">Desc. Comercial ({commercialLabel})</span>
                  <span className="font-normal">- {formatCurrency(commercialDiscountPerUnit)} c/u</span>
                </div>
              )}

              {/* B2B Unitary Price after B2B/Commercial discounts */}
              {session && (
                <div className="flex justify-between items-center text-xs pb-2 border-b border-gray-700 font-semibold">
                  <span className="text-gray-300">Precio Producto B2B</span>
                  <span className="text-green-400">{formatCurrency(unitProductPrice)} c/u</span>
                </div>
              )}

              <div className="flex justify-between items-center text-xs pb-2 border-b border-gray-700">
                <span className="text-gray-300 font-normal">Costo Impresión</span>
                <span className="font-normal">+ {formatCurrency(unitDecoratedPrice)} c/u</span>
              </div>
              
              {/* Promotion Coupons */}
              {session && session.discounts?.filter((d: any) => d.active && d.discount_type === 'promotion').map((d: any) => (
                <div key={d.category_id} className="flex justify-between items-center text-[10px] pb-2 border-b border-gray-700 text-yellow-400">
                  <span className="font-normal text-yellow-400 flex items-center gap-1">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-yellow-400 shrink-0" />
                    Cupón: {d.category_id === 'ENVIO_SIN_COSTO' ? 'Envío Gratis' : 'Muestra + Envío Gratis'}
                  </span>
                  <span className="font-bold">Aplicado</span>
                </div>
              ))}

              <div className="flex justify-between items-center text-xs font-normal">
                <span className="text-gray-300 font-normal">Final Unitario</span>
                <span className="font-normal text-primary-400">{formatCurrency(finalPricePerUnit)}</span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-gray-700 gap-2 font-normal">
                <div className="flex flex-col text-left font-normal">
                  <span className="text-[9px] text-gray-455 uppercase tracking-wider font-normal">Total Estimado</span>
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
                className="w-full py-3 px-4 rounded-xl font-bold text-sm transition-colors flex items-center justify-center border border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-100 bg-white cursor-pointer"
              >
                Ver carrito
              </Link>

              <button 
                onClick={() => router.back()}
                className="w-full py-3 px-4 rounded-xl font-bold text-sm transition-colors flex items-center justify-center border border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-100 bg-white cursor-pointer"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Regresar
              </button>

              {/* Promotion Tag */}
              {homeSettings?.promotions?.tagPublished !== false && 
               session?.discounts?.some(d => d.active && d.discount_type === 'promotion' && d.category_id === 'ENVIO_SIN_COSTO') && (
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
       session && 
       !hasMuestraEnvio && 
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
                  <button 
                    onClick={handleClaimSideCoupon}
                    disabled={!acceptsOffers}
                    className={`w-full font-extrabold py-3 px-4 rounded text-xs tracking-wider transition-all uppercase ${
                      !acceptsOffers 
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-50' 
                        : 'hover:brightness-110 active:scale-95 cursor-pointer'
                    }`}
                    style={{
                      backgroundColor: acceptsOffers ? (homeSettings?.promotions?.sideButtonBgColor || "#000000") : undefined,
                      color: acceptsOffers ? (homeSettings?.promotions?.sideButtonTextColor || "#ffffff") : undefined
                    }}
                  >
                    CONSÍGUELO ¡
                  </button>
                </div>

                {/* Disclaimers & Checkboxes */}
                <div className="text-[9px] sm:text-[10px] space-y-2.5 leading-relaxed pt-1" style={{ color: homeSettings?.promotions?.sideTextColor ? `${homeSettings.promotions.sideTextColor}cc` : "#6b7280" }}>
                  <p>
                    Al continuar, acepta nuestro <Link href="/soporte/aviso-privacidad" className="underline hover:text-black">Aviso de Privacidad</Link> y nuestra <Link href="/soporte/politicas-envio" className="underline hover:text-black">Política de envíos</Link>.
                  </p>
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={acceptsOffers}
                      onChange={e => setAcceptsOffers(e.target.checked)}
                      className="mt-0.5 rounded text-black focus:ring-black h-3 w-3 border-gray-300 shrink-0 cursor-pointer" 
                    />
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
      {showPromoPopup && !session && !hasEnvioSinCosto && (
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
                {homeSettings?.promotions?.catalogPromoTitle || "Ofertas especiales solo para ti"}
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
                    {homeSettings?.promotions?.catalogPromoBadge || "Nuevo usuario"}
                  </div>
                  
                  {/* Left content */}
                  <div className="w-[38%] flex flex-col justify-center items-center pr-2 pt-2 text-center">
                    {(() => {
                      const fullText = homeSettings?.promotions?.coupon1Discount || "30% DE DESCUENTO";
                      const color = homeSettings?.promotions?.catalogPromoCouponTextColor || "#ff4a5a";
                      const hasAnyLowercase = /[a-zñüáéíóú]/.test(fullText);

                      if (!hasAnyLowercase) {
                        const firstWord = fullText.split(' ')[0] || "";
                        const remaining = fullText.split(' ').slice(1).join(' ') || "";
                        return (
                          <>
                            <span 
                              className="text-xl sm:text-2xl font-black leading-none tracking-tight block text-center"
                              style={{ color }}
                            >
                              {firstWord}
                            </span>
                            {remaining && (
                              <span 
                                className="text-[7.5px] font-bold mt-1 uppercase tracking-tight block text-center"
                                style={{ color }}
                              >
                                {remaining}
                              </span>
                            )}
                          </>
                        );
                      }

                      const words = fullText.split(/\s+/).filter(w => w.length > 0);
                      return (
                        <>
                          {words.map((word, idx) => {
                            const hasLetters = /[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ]/.test(word);
                            const isUpper = hasLetters && !/[a-zñüáéíóú]/.test(word);

                            if (isUpper || !hasLetters) {
                              return (
                                <span 
                                  key={idx}
                                  className="text-xl sm:text-2xl font-black leading-none tracking-tight block text-center uppercase"
                                  style={{ color }}
                                >
                                  {word}
                                </span>
                              );
                            } else {
                              return (
                                <span 
                                  key={idx}
                                  className="text-xs sm:text-sm font-extrabold leading-snug block text-center mt-0.5"
                                  style={{ color }}
                                >
                                  {word}
                                </span>
                              );
                            }
                          })}
                        </>
                      );
                    })()}
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
                <span>{homeSettings?.promotions?.catalogPromoButtonText || "¡Consíguelo!"}</span>
              </button>

            </div>

            {/* Under-card Footer Disclaimer Text */}
            <p className="text-[10px] text-white/95 text-center mt-3 tracking-wide drop-shadow-xs">
              {homeSettings?.promotions?.catalogPromoFooterNote || "Cupones confirmados después de iniciar sesión"}
            </p>
          </div>
        </div>
      )}

      {/* Floating Client Promotion Popup (Registered Clients) */}
      {showClientPromoPopup && session && !hasEnvioSinCosto && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="relative w-full max-w-[390px] flex flex-col items-center">
            {/* Close Button above the card */}
            <button 
              onClick={handleCloseClientPromoPopup} 
              className="absolute -top-10 right-2 p-1.5 rounded-full border border-white/50 hover:border-white text-white hover:bg-white/10 transition-colors z-50 cursor-pointer"
              title="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Main Card */}
            <div 
              className="rounded-3xl w-full p-5 pt-7 pb-6 relative shadow-2xl flex flex-col items-center border"
              style={{
                background: `linear-gradient(to bottom, ${homeSettings?.promotions?.clientPromoBgColorStart || "#f0fdf4"}, ${homeSettings?.promotions?.clientPromoBgColorEnd || "#ffffff"})`,
                borderColor: homeSettings?.promotions?.clientPromoCouponBorderColor || "#bbf7d0"
              }}
            >
              {/* Title Section */}
              <h2 
                className="font-bold text-center text-lg mt-1 mb-5"
                style={{ color: homeSettings?.promotions?.clientPromoTextColor || "#15803d" }}
              >
                {homeSettings?.promotions?.clientPromoTitle || "Cupón Especial para Clientes"}
              </h2>

              {/* Coupon Container */}
              <div className="w-full mb-6">
                <div 
                  className="relative flex rounded-2xl overflow-hidden p-4 min-h-[92px] shadow-sm border"
                  style={{
                    backgroundColor: homeSettings?.promotions?.clientPromoCouponBgColor || "#f0fdf4",
                    borderColor: homeSettings?.promotions?.clientPromoCouponBorderColor || "#bbf7d0"
                  }}
                >
                  {/* Left tag badge */}
                  <div 
                    className="absolute top-0 left-0 text-white text-[8px] font-extrabold px-2 py-0.5 rounded-br-xl tracking-wider uppercase"
                    style={{ backgroundColor: homeSettings?.promotions?.clientPromoCouponTextColor || "#166534" }}
                  >
                    {homeSettings?.promotions?.clientPromoBadge || "Clientes"}
                  </div>

                  {/* Left content (discount) */}
                  <div className="w-[38%] flex flex-col justify-center items-center pr-2 pt-2 text-center border-r border-dashed" style={{ borderColor: homeSettings?.promotions?.clientPromoCouponBorderColor || "#bbf7d0" }}>
                    <span 
                      className="text-sm sm:text-base font-black leading-none tracking-tight block text-center uppercase"
                      style={{ color: homeSettings?.promotions?.clientPromoCouponTextColor || "#166534" }}
                    >
                      {homeSettings?.promotions?.coupon3Discount || "ENVÍO SIN COSTO"}
                    </span>
                    <span className="text-[8px] text-gray-550 mt-1 font-medium">
                      {homeSettings?.promotions?.coupon3LeftNote || "Cliente B2B"}
                    </span>
                  </div>

                  {/* Right content */}
                  <div className="flex-1 pl-4 flex flex-col justify-center text-left">
                    <span 
                      className="text-xs sm:text-sm font-extrabold leading-snug"
                      style={{ color: homeSettings?.promotions?.clientPromoCouponTextColor || "#166534" }}
                    >
                      {homeSettings?.promotions?.coupon3RightTitle || "Cupón de envío gratis"}
                    </span>
                    <span className="text-[9px] text-gray-500 mt-1">
                      {homeSettings?.promotions?.coupon3RightLimit || "Sin mínimo de compra"}
                    </span>
                  </div>

                  {/* Scalloped circle cutouts */}
                  <div 
                    className="absolute top-0 left-[38%] -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-b"
                    style={{ 
                      backgroundColor: homeSettings?.promotions?.clientPromoBgColorStart || "#f0fdf4",
                      borderColor: homeSettings?.promotions?.clientPromoCouponBorderColor || "#bbf7d0"
                    }}
                  />
                  <div 
                    className="absolute bottom-0 left-[38%] translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-t"
                    style={{ 
                      backgroundColor: homeSettings?.promotions?.clientPromoBgColorEnd || "#ffffff",
                      borderColor: homeSettings?.promotions?.clientPromoCouponBorderColor || "#bbf7d0"
                    }}
                  />
                </div>
              </div>

              {/* Form Input Email & Button */}
              <div className="w-full space-y-3">
                {clientPromoSuccess ? (
                  <div className="text-center py-2 text-green-600 font-bold text-sm">
                    ¡Cupón aplicado exitosamente!
                  </div>
                ) : (
                  <>
                    <div>
                      <input 
                        type="email" 
                        value={clientPromoEmail}
                        onChange={(e) => {
                          setClientPromoEmail(e.target.value);
                          setClientPromoError("");
                        }}
                        placeholder="Ingresa tu correo registrado"
                        className="w-full border rounded-xl p-3 text-sm focus:outline-none focus:ring-2 font-medium bg-white text-gray-900 border-gray-300 focus:ring-green-500"
                        disabled={isSubmittingClientPromo}
                      />
                      {clientPromoError && (
                        <p className="text-red-500 text-xs mt-1.5 font-bold pl-1 uppercase tracking-wide">
                          {clientPromoError}
                        </p>
                      )}
                    </div>

                    <button 
                      onClick={async () => {
                        const emailVal = clientPromoEmail.trim().toLowerCase();
                        if (!emailVal) {
                          setClientPromoError("Por favor ingresa tu correo.");
                          return;
                        }
                        
                        setIsSubmittingClientPromo(true);
                        setClientPromoError("");
                        try {
                          // Query matching contact for logged-in customer in database
                          const { data: contacts, error: conErr } = await supabase
                            .from("customer_contacts")
                            .select("*")
                            .eq("customer_id", session.customer.id)
                            .eq("email", emailVal);

                          if (conErr) {
                            throw conErr;
                          }

                          if (!contacts || contacts.length === 0) {
                            setClientPromoError("no encontrado");
                            setIsSubmittingClientPromo(false);
                            return;
                          }

                          // Email registered for this client! Let's claim.
                          const res = await fetch("/api/claim-coupon", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              customer_id: session.customer.id,
                              coupon: "ENVIO_SIN_COSTO"
                            })
                          });
                          const resData = await res.json();
                          if (!res.ok || !resData.success) {
                            throw new Error(resData.error || "Failed to claim coupon");
                          }
                          
                          // Update active local session
                          const updatedDiscounts = [...(session.discounts || []), {
                            discount_type: 'promotion',
                            category_id: 'ENVIO_SIN_COSTO',
                            discount_percent: 0,
                            active: true
                          }];
                          localStorage.setItem("geekystore_b2b_session", JSON.stringify({ ...session, discounts: updatedDiscounts }));
                          window.dispatchEvent(new Event("b2b_session_updated"));
                          
                          setClientPromoSuccess(true);
                          setTimeout(() => {
                            setShowClientPromoPopup(false);
                            setClientPromoSuccess(false);
                            setClientPromoEmail("");
                          }, 2000);
                        } catch (e: any) {
                          console.error(e);
                          setClientPromoError(e.message || "Error al aplicar el cupón.");
                        } finally {
                          setIsSubmittingClientPromo(false);
                        }
                      }}
                      disabled={isSubmittingClientPromo}
                      className="w-full text-sm font-extrabold py-3 px-6 rounded-full shadow-lg hover:shadow-xl hover:brightness-110 active:scale-[0.98] transition-all uppercase tracking-wider cursor-pointer flex items-center justify-center gap-2"
                      style={{
                        backgroundColor: homeSettings?.promotions?.clientPromoButtonBgColor || "#166534",
                        color: homeSettings?.promotions?.clientPromoButtonTextColor || "#ffffff"
                      }}
                    >
                      {isSubmittingClientPromo ? "Verificando..." : (homeSettings?.promotions?.clientPromoButtonText || "Aplicar Cupón")}
                    </button>
                  </>
                )}
              </div>

              {/* Footer Disclaimer Text */}
              <p className="text-[10px] text-gray-500 text-center mt-3 tracking-wide">
                {homeSettings?.promotions?.clientPromoFooterNote || "Ingresa tu correo registrado para activar"}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
