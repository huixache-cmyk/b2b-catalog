"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export type B2BCompany = {
  id: string;
  name: string;
  industry: string;
  city: string;
};

export type B2BSignal = {
  id: string;
  signal_type: string;
  signal_date: string;
  description: string;
  score: number;
};

export type B2BContact = {
  id: string;
  full_name: string;
  job_title: string;
  email: string;
  phone: string;
};

export type B2BOpportunity = {
  id: string;
  company_id: string;
  total_score: number;
  stage: string;
  next_action?: string;
  estimated_budget?: number; // Calculado o agregado por el hook (opcional)
  hook_text?: string;
  // Relaciones
  company?: B2BCompany;
  signals?: B2BSignal[];
  contacts?: B2BContact[];
};

export type ScraperConfig = {
  id: number;
  is_active: boolean;
  search_keywords: string;
  last_run_at: string | null;
  updated_at: string;
};

export function useB2BAgent() {
  const [opportunities, setOpportunities] = useState<B2BOpportunity[]>([]);
  const [scraperConfig, setScraperConfig] = useState<ScraperConfig | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    fetchOpportunities();
    fetchScraperConfig();
  }, []);

  const fetchScraperConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('b2b_scraper_config')
        .select('*')
        .eq('id', 1)
        .single();
        
      if (data) {
        setScraperConfig(data as ScraperConfig);
      }
    } catch (err) {
      console.error("Error fetching scraper config", err);
    }
  };

  const updateScraperConfig = async (newConfig: Partial<ScraperConfig>) => {
    if (!scraperConfig) return;
    
    // Optimistic update
    setScraperConfig({ ...scraperConfig, ...newConfig });
    
    const { error } = await supabase
      .from('b2b_scraper_config')
      .update({ ...newConfig, updated_at: new Date().toISOString() })
      .eq('id', 1);
      
    if (error) {
      console.error("Error updating scraper config", error);
      fetchScraperConfig(); // Revert
    }
  };

  const fetchOpportunities = async () => {
    try {
      // Supabase join query
      const { data, error } = await supabase
        .from('b2b_opportunities')
        .select(`
          *,
          company:b2b_companies(
            id,
            name,
            industry,
            city,
            signals:b2b_signals(id, signal_type, signal_date, description, score),
            contacts:b2b_contacts(id, full_name, job_title, email, phone)
          )
        `);

      if (error) {
        console.error("Error fetching B2B opportunities:", error);
      } else if (data) {
        // Flatten or map relations for the UI
        const formattedData = data.map((item: any) => ({
          id: item.id,
          company_id: item.company_id,
          total_score: item.total_score,
          stage: item.stage,
          next_action: item.next_action,
          hook_text: item.hook_text,
          // Extract company
          company: item.company ? {
            id: item.company.id,
            name: item.company.name,
            industry: item.company.industry,
            city: item.company.city,
          } : undefined,
          // Extraemos la última señal (o todas) y el primer contacto
          signals: item.company?.signals || [],
          contacts: item.company?.contacts || [],
        })) as B2BOpportunity[];

        setOpportunities(formattedData);
      }
    } catch (err) {
      console.error("Unexpected error:", err);
    } finally {
      setIsLoaded(true);
    }
  };

  const deleteOpportunity = async (id: string) => {
    // Optimistic update
    setOpportunities(prev => prev.filter(opp => opp.id !== id));
    
    const { error } = await supabase
      .from('b2b_opportunities')
      .delete()
      .eq('id', id);
      
    if (error) {
      console.error("Error deleting opportunity:", error);
      fetchOpportunities(); // Revert
    }
  };

  const updateOpportunityStage = async (id: string, newStage: string) => {
    // Optimistic update
    setOpportunities(prev => 
      prev.map(opp => opp.id === id ? { ...opp, stage: newStage } : opp)
    );

    const { error } = await supabase
      .from('b2b_opportunities')
      .update({ stage: newStage, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error("Error updating opportunity stage:", error);
      // Revert if error
      fetchOpportunities();
    }
  };

  return {
    opportunities,
    scraperConfig,
    isLoaded,
    refresh: fetchOpportunities,
    updateOpportunityStage,
    deleteOpportunity,
    updateScraperConfig
  };
}
