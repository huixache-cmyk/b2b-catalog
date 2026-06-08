"use client";

import { useState, useEffect, useCallback } from "react";
import { DEFAULT_CATEGORIES, DEFAULT_SEASONS, PrintSupplier, ProductSupplier, ProductSupplierAssociation } from "@/types";
import { supabase } from "@/lib/supabase";

export type HomeSettings = {
  hero: {
    label: string;
    titleMain: string;
    titleHighlight: string;
    description: string;
    ctaPrimary: string;
    ctaSecondary: string;
    bgImage: string;
  };
  cta: {
    title: string;
    description: string;
    buttonText: string;
  };
  campaigns: Array<{ img: string; color: string }>;
  print_suppliers?: PrintSupplier[];
  product_suppliers?: ProductSupplier[];
  product_supplier_map?: Record<string, ProductSupplierAssociation>;
  print_prices?: Record<string, number>;
  promotions?: {
    tagText: string;
    tagPublished: boolean;
    sideTextTrigger: string;
    sideTitle: string;
    sideTextLeft: string;
    sideTextRight: string;
    sidePublished: boolean;
    catalogPromoPublished?: boolean;
    catalogPromoDelay?: number;
    coupon1Discount?: string;
    coupon1LeftNote?: string;
    coupon1RightTitle?: string;
    coupon1RightLimit?: string;
    coupon2Discount?: string;
    coupon2LeftNote?: string;
    coupon2RightTitle?: string;
    coupon2RightLimit?: string;
    catalogPromoButtonText?: string;
    catalogPromoFooterNote?: string;
    // Side Promo Customizer
    sideBgColor?: string;
    sideTextColor?: string;
    sidePromoTextColor?: string;
    sideButtonBgColor?: string;
    sideButtonTextColor?: string;
    sideTextSizeTitle?: string;
    sideTextSizePromo?: string;
    sideTriggerIcon?: string;
    // Catalog Promo Customizer
    catalogPromoBgColorStart?: string;
    catalogPromoBgColorEnd?: string;
    catalogPromoTextColor?: string;
    catalogPromoCouponBgColor?: string;
    catalogPromoCouponBorderColor?: string;
    catalogPromoCouponTextColor?: string;
    catalogPromoButtonBgColor?: string;
    catalogPromoButtonTextColor?: string;
    catalogPromoIcon?: string;
    catalogPromoAlwaysShow?: boolean;
    catalogPromoPage?: string;
    catalogPromoTitle?: string;
    catalogPromoBadge?: string;
    catalogPromoTargetAudience?: string;
    sideTextSizeTrigger?: string;
    sidePromoPage?: string;
    sidePromoTargetAudience?: string;
    // Tag Promo Customizer
    tagBgColor?: string;
    tagBorderColor?: string;
    tagTextColor?: string;
    tagTextSize?: string;
    tagIcon?: string;
    // Client Promo Customizer
    clientPromoPublished?: boolean;
    clientPromoDelay?: number;
    coupon3Discount?: string;
    coupon3LeftNote?: string;
    coupon3RightTitle?: string;
    coupon3RightLimit?: string;
    clientPromoButtonText?: string;
    clientPromoFooterNote?: string;
    clientPromoBgColorStart?: string;
    clientPromoBgColorEnd?: string;
    clientPromoTextColor?: string;
    clientPromoCouponBgColor?: string;
    clientPromoCouponBorderColor?: string;
    clientPromoCouponTextColor?: string;
    clientPromoButtonBgColor?: string;
    clientPromoButtonTextColor?: string;
    clientPromoIcon?: string;
    clientPromoAlwaysShow?: boolean;
    clientPromoPage?: string;
    clientPromoTitle?: string;
    clientPromoBadge?: string;
  };
};

const DEFAULT_HOME_SETTINGS: HomeSettings = {
  hero: {
    label: "Campaña Corporativa",
    titleMain: "Más que un promocional,",
    titleHighlight: "fideliza tu marca",
    description: "Descubre nuestro catálogo B2B con más de 1,000 productos listos para personalizar. Precios especiales por volumen.",
    ctaPrimary: "Ver Catálogo",
    ctaSecondary: "Solicitar Asesoría",
    bgImage: "https://images.unsplash.com/photo-1556761175-5973dc0f32d7?ixlib=rb-4.0.3&auto=format&fit=crop&w=1600&q=80"
  },
  cta: {
    title: "¿Tienes un proyecto en mente?",
    description: "Nuestro equipo de asesores está listo para ayudarte a encontrar el promocional perfecto para tu campaña, ajustado a tu presupuesto.",
    buttonText: "Cotiza Ahora"
  },
  campaigns: [
    { img: "https://images.unsplash.com/photo-1518605368461-1ee71165920f?auto=format&fit=crop&w=600&q=80", color: "from-green-900/80 to-green-600/40" },
    { img: "https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=600&q=80", color: "from-pink-900/80 to-pink-600/40" },
    { img: "https://images.unsplash.com/photo-1513885535751-8b9238bd345a?auto=format&fit=crop&w=600&q=80", color: "from-red-900/80 to-red-600/40" }
  ],
  print_suppliers: [],
  product_suppliers: [],
  product_supplier_map: {},
  print_prices: {
    "Sin Impresión": 0,
    "Grabado Chico": 15,
    "Grabado Grande": 25,
    "DTF": 12,
    "Impresión 1 tinta": 10,
    "Impresión 2 tintas": 18,
    "Impresión 3 tintas": 25,
    "Impresión 4 tintas": 30
  },
  promotions: {
    tagText: "Oferta especial de envío gratis",
    tagPublished: true,
    sideTextTrigger: "CONSIGUE 30% DE DTO.",
    sideTitle: "Suscribirse para disfrutar los precios de VIP y Ventas Flash",
    sideTextLeft: "Suscribirse y obtén -30% En Primer Pedido",
    sideTextRight: "ENVÍO GRATIS en su primer pedido +$MXN99",
    sidePublished: true,
    catalogPromoPublished: true,
    catalogPromoDelay: 3,
    coupon1Discount: "30% DE DESCUENTO",
    coupon1LeftNote: "Sin mín. de compra",
    coupon1RightTitle: "Cupón válido en todo el sitio",
    coupon1RightLimit: "Límite de $MXN3,000",
    coupon2Discount: "65% DE DESCUENTO",
    coupon2LeftNote: "Sin mín. de compra",
    coupon2RightTitle: "Cupón válido en todo el sitio",
    coupon2RightLimit: "Límite de $MXN240",
    catalogPromoButtonText: "¡Consíguelos Todos!",
    catalogPromoFooterNote: "Cupones confirmados después de iniciar sesión",
    sideBgColor: "#ffeceb",
    sideTextColor: "#222222",
    sidePromoTextColor: "#e1251b",
    sideButtonBgColor: "#000000",
    sideButtonTextColor: "#ffffff",
    sideTextSizeTitle: "Mediano",
    sideTextSizePromo: "Normal",
    sideTriggerIcon: "Arrow",
    catalogPromoBgColorStart: "#fff6ee",
    catalogPromoBgColorEnd: "#ffffff",
    catalogPromoTextColor: "#a0522d",
    catalogPromoCouponBgColor: "#fff7f6",
    catalogPromoCouponBorderColor: "#ffd2cc",
    catalogPromoCouponTextColor: "#ff4a5a",
    catalogPromoButtonBgColor: "#222222",
    catalogPromoButtonTextColor: "#ffffff",
    catalogPromoIcon: "GiftBow",
    catalogPromoAlwaysShow: false,
    catalogPromoPage: "Catálogo",
    catalogPromoTitle: "Ofertas especiales solo para ti",
    catalogPromoBadge: "Nuevo usuario",
    catalogPromoTargetAudience: "new_clients",
    sideTextSizeTrigger: "Mediano",
    sidePromoPage: "Detalle de Producto",
    sidePromoTargetAudience: "new_clients",
    tagBgColor: "#eefcf7",
    tagBorderColor: "#cbf2e3",
    tagTextColor: "#0a6644",
    tagTextSize: "text-xs",
    tagIcon: "Truck",
    // Client Promo Defaults
    clientPromoPublished: true,
    clientPromoDelay: 5,
    coupon3Discount: "ENVÍO SIN COSTO",
    coupon3LeftNote: "Cliente B2B",
    coupon3RightTitle: "Cupón de envío gratis",
    coupon3RightLimit: "Sin mínimo de compra",
    clientPromoButtonText: "Aplicar Cupón",
    clientPromoFooterNote: "Ingresa tu correo registrado para activar",
    clientPromoBgColorStart: "#f0fdf4",
    clientPromoBgColorEnd: "#ffffff",
    clientPromoTextColor: "#15803d",
    clientPromoCouponBgColor: "#f0fdf4",
    clientPromoCouponBorderColor: "#bbf7d0",
    clientPromoCouponTextColor: "#166534",
    clientPromoButtonBgColor: "#166534",
    clientPromoButtonTextColor: "#ffffff",
    clientPromoIcon: "GiftBow",
    clientPromoAlwaysShow: false,
    clientPromoPage: "Catálogo",
    clientPromoTitle: "Cupón Especial para Clientes",
    clientPromoBadge: "Clientes"
  }
};

type CachedSettingsData = {
  categories: string[];
  seasons: string[];
  featuredSeason: string | null;
  homeSettings: HomeSettings;
};

// Global in-memory cache
let globalSettingsCache: CachedSettingsData | null = null;
let globalSettingsLoaded = false;
let globalSettingsPromise: Promise<CachedSettingsData> | null = null;
const settingsListeners = new Set<(data: CachedSettingsData) => void>();

let saveTimeout: NodeJS.Timeout;

export function useSettings(initialCategories?: string[], initialSeasons?: string[]) {
  const [categories, setCategories] = useState<string[]>(initialCategories || DEFAULT_CATEGORIES);
  const [seasons, setSeasons] = useState<string[]>(initialSeasons || DEFAULT_SEASONS);
  const [featuredSeason, setFeaturedSeason] = useState<string | null>(null);
  const [homeSettings, setHomeSettings] = useState<HomeSettings>(DEFAULT_HOME_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  // Prime cache with server-rendered initial data if cache is empty
  if (!globalSettingsCache && (initialCategories || initialSeasons)) {
    globalSettingsCache = {
      categories: initialCategories || DEFAULT_CATEGORIES,
      seasons: initialSeasons || DEFAULT_SEASONS,
      featuredSeason: null,
      homeSettings: DEFAULT_HOME_SETTINGS
    };
    globalSettingsLoaded = true;
  }

  // Sync state with listeners
  useEffect(() => {
    const listener = (newData: CachedSettingsData) => {
      setCategories(newData.categories);
      setSeasons(newData.seasons);
      setFeaturedSeason(newData.featuredSeason);
      setHomeSettings(newData.homeSettings);
      setIsLoaded(true);
    };
    settingsListeners.add(listener);
    return () => {
      settingsListeners.delete(listener);
    };
  }, []);

  const fetchSettings = useCallback(async (force = false): Promise<CachedSettingsData> => {
    if (globalSettingsPromise && !force) {
      return globalSettingsPromise;
    }

    const fetchPromise = (async () => {
      try {
        const { data, error } = await supabase.from('settings').select('*').eq('id', 1).single();
        
        let resolvedData: CachedSettingsData;
        if (!error && data) {
          resolvedData = {
            categories: data.categories || DEFAULT_CATEGORIES,
            seasons: data.seasons || DEFAULT_SEASONS,
            featuredSeason: data.featured_season || null,
            homeSettings: {
              ...DEFAULT_HOME_SETTINGS,
              ...(data.home_settings || {}),
              cta: {
                ...DEFAULT_HOME_SETTINGS.cta,
                ...(data.home_settings?.cta || {})
              },
              promotions: {
                ...DEFAULT_HOME_SETTINGS.promotions,
                ...(data.home_settings?.promotions || {})
              }
            }
          };
        } else {
          resolvedData = globalSettingsCache || {
            categories: DEFAULT_CATEGORIES,
            seasons: DEFAULT_SEASONS,
            featuredSeason: null,
            homeSettings: DEFAULT_HOME_SETTINGS
          };
        }

        globalSettingsCache = resolvedData;
        globalSettingsLoaded = true;

        if (typeof window !== "undefined") {
          try {
            localStorage.setItem("b2b_settings_cache", JSON.stringify(resolvedData));
          } catch (e) {
            console.warn("Failed to write settings to localStorage:", e);
          }
        }

        settingsListeners.forEach(listener => listener(resolvedData));
        return resolvedData;
      } catch (err) {
        console.warn("Could not fetch settings from DB, falling back to defaults", err);
        const resolvedData = globalSettingsCache || {
          categories: DEFAULT_CATEGORIES,
          seasons: DEFAULT_SEASONS,
          featuredSeason: null,
          homeSettings: DEFAULT_HOME_SETTINGS
        };
        return resolvedData;
      } finally {
        globalSettingsPromise = null;
      }
    })();

    globalSettingsPromise = fetchPromise;
    return fetchPromise;
  }, []);

  useEffect(() => {
    if (globalSettingsCache) {
      setCategories(globalSettingsCache.categories);
      setSeasons(globalSettingsCache.seasons);
      setFeaturedSeason(globalSettingsCache.featuredSeason);
      setHomeSettings(globalSettingsCache.homeSettings);
      setIsLoaded(true);
    } else {
      if (typeof window !== "undefined") {
        try {
          const stored = localStorage.getItem("b2b_settings_cache");
          if (stored) {
            const parsed = JSON.parse(stored) as CachedSettingsData;
            globalSettingsCache = parsed;
            globalSettingsLoaded = true;
            setCategories(parsed.categories);
            setSeasons(parsed.seasons);
            setFeaturedSeason(parsed.featuredSeason);
            setHomeSettings(parsed.homeSettings);
            setIsLoaded(true);
          }
        } catch (e) {
          console.warn("Failed to read settings from localStorage:", e);
        }
      }
    }

    fetchSettings();
  }, [fetchSettings]);

  const saveToDb = (newSettings: any, immediate = false) => {
    clearTimeout(saveTimeout);
    const performSave = async () => {
      try {
        await supabase.from('settings').upsert({ id: 1, ...newSettings });
      } catch (err) {
        console.error("Error saving settings to DB", err);
      }
    };

    if (immediate) {
      performSave();
    } else {
      saveTimeout = setTimeout(performSave, 1000);
    }
  };

  const notifyUpdate = (updatedCache: CachedSettingsData) => {
    globalSettingsCache = updatedCache;
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("b2b_settings_cache", JSON.stringify(updatedCache));
      } catch (e) {
        console.warn("Failed to write settings cache to localStorage:", e);
      }
    }
    settingsListeners.forEach(listener => listener(updatedCache));
  };

  const updateCategories = (newCategories: string[]) => {
    const updated = {
      categories: newCategories,
      seasons: seasons,
      featuredSeason: featuredSeason,
      homeSettings: homeSettings
    };
    setCategories(newCategories);
    notifyUpdate(updated);
    saveToDb({ categories: newCategories });
  };

  const updateSeasons = (newSeasons: string[]) => {
    let fSeason = featuredSeason;
    if (featuredSeason && !newSeasons.includes(featuredSeason)) {
      fSeason = null;
      setFeaturedSeason(null);
      saveToDb({ seasons: newSeasons, featured_season: null });
    } else {
      saveToDb({ seasons: newSeasons });
    }

    const updated = {
      categories: categories,
      seasons: newSeasons,
      featuredSeason: fSeason,
      homeSettings: homeSettings
    };
    setSeasons(newSeasons);
    notifyUpdate(updated);
  };

  const updateFeaturedSeason = (season: string | null) => {
    const updated = {
      categories: categories,
      seasons: seasons,
      featuredSeason: season,
      homeSettings: homeSettings
    };
    setFeaturedSeason(season);
    notifyUpdate(updated);
    saveToDb({ featured_season: season });
  };

  const updateHomeSettings = (newSettings: HomeSettings, immediate = false) => {
    const updated = {
      categories: categories,
      seasons: seasons,
      featuredSeason: featuredSeason,
      homeSettings: newSettings
    };
    setHomeSettings(newSettings);
    notifyUpdate(updated);
    saveToDb({ home_settings: newSettings }, immediate);
  };

  const addCategory = (category: string) => {
    if (!categories.includes(category)) updateCategories([...categories, category]);
  };

  const removeCategory = (category: string) => {
    updateCategories(categories.filter(c => c !== category));
  };

  const addSeason = (season: string) => {
    if (!seasons.includes(season)) updateSeasons([...seasons, season]);
  };

  const removeSeason = (season: string) => {
    updateSeasons(seasons.filter(s => s !== season));
  };

  return {
    categories,
    seasons,
    isLoaded: isLoaded || globalSettingsLoaded,
    homeSettings,
    featuredSeason,
    addCategory,
    removeCategory,
    addSeason,
    removeSeason,
    updateCategories,
    updateSeasons,
    updateFeaturedSeason,
    updateHomeSettings
  };
}
