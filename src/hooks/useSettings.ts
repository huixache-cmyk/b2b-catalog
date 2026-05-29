"use client";

import { useState, useEffect } from "react";
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
  }
};


let saveTimeout: NodeJS.Timeout;

export function useSettings() {
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [seasons, setSeasons] = useState<string[]>(DEFAULT_SEASONS);
  const [featuredSeason, setFeaturedSeason] = useState<string | null>(null);
  const [homeSettings, setHomeSettings] = useState<HomeSettings>(DEFAULT_HOME_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase.from('settings').select('*').eq('id', 1).single();
      
      if (!error && data) {
        setCategories(data.categories || DEFAULT_CATEGORIES);
        setSeasons(data.seasons || DEFAULT_SEASONS);
        setFeaturedSeason(data.featured_season || null);
        setHomeSettings({
          ...DEFAULT_HOME_SETTINGS,
          ...(data.home_settings || {}),
          cta: {
            ...DEFAULT_HOME_SETTINGS.cta,
            ...(data.home_settings?.cta || {})
          }
        });
        setIsLoaded(true);
        return;
      }
    } catch (err) {
      console.warn("Could not fetch settings from DB, falling back to defaults", err);
    }
    
    // Fallback if DB is empty or fails
    setIsLoaded(true);
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const saveToDb = (newSettings: any) => {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(async () => {
      try {
        await supabase.from('settings').upsert({ id: 1, ...newSettings });
      } catch (err) {
        console.error("Error saving settings to DB", err);
      }
    }, 1000);
  };

  const updateCategories = (newCategories: string[]) => {
    setCategories(newCategories);
    saveToDb({ categories: newCategories });
  };

  const updateSeasons = (newSeasons: string[]) => {
    setSeasons(newSeasons);
    if (featuredSeason && !newSeasons.includes(featuredSeason)) {
      setFeaturedSeason(null);
      saveToDb({ seasons: newSeasons, featured_season: null });
    } else {
      saveToDb({ seasons: newSeasons });
    }
  };

  const updateFeaturedSeason = (season: string | null) => {
    setFeaturedSeason(season);
    saveToDb({ featured_season: season });
  };

  const updateHomeSettings = (newSettings: HomeSettings) => {
    setHomeSettings(newSettings);
    saveToDb({ home_settings: newSettings });
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
    isLoaded,
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
