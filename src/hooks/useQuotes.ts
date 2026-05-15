"use client";

import { useState, useEffect } from "react";
import { QuoteRequest } from "@/types";
import { supabase } from "@/lib/supabase";

export function useQuotes() {
  const [quotes, setQuotes] = useState<QuoteRequest[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    fetchQuotes();
  }, []);

  const fetchQuotes = async () => {
    try {
      const { data, error } = await supabase
        .from('quotes')
        .select('*')
        .order('date', { ascending: false });
        
      if (error) {
        console.error("Error fetching quotes from Supabase:", error);
        // Fallback a localStorage si falla la conexión
        const saved = localStorage.getItem("geekystore_quotes");
        if (saved) setQuotes(JSON.parse(saved) as QuoteRequest[]);
      } else if (data) {
        setQuotes(data as QuoteRequest[]);
        localStorage.setItem("geekystore_quotes", JSON.stringify(data)); // Actualizar backup
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoaded(true);
    }
  };

  const saveToLocalBackup = (newQuotes: QuoteRequest[]) => {
    try {
      localStorage.setItem("geekystore_quotes", JSON.stringify(newQuotes));
    } catch (e) {
      console.warn("No se pudo guardar la cotización en el historial local (memoria llena).", e);
    }
  };

  const addQuote = async (quote: QuoteRequest) => {
    // Actualización optimista
    const newQuotes = [quote, ...quotes];
    setQuotes(newQuotes);
    saveToLocalBackup(newQuotes);

    // Guardar en Supabase
    try {
      const { error } = await supabase.from('quotes').insert([quote]);
      if (error) console.error("Error saving quote to Supabase:", error);
    } catch (err) {
      console.error("Supabase insert exception:", err);
    }
  };

  const deleteQuote = async (id: string) => {
    // Actualización optimista
    const newQuotes = quotes.filter(q => q.id !== id);
    setQuotes(newQuotes);
    saveToLocalBackup(newQuotes);

    try {
      const { error } = await supabase.from('quotes').delete().eq('id', id);
      if (error) console.error("Error deleting quote from Supabase:", error);
    } catch (err) {
      console.error(err);
    }
  };

  const updateQuoteStatus = async (id: string, status: 'pending' | 'reviewed' | 'completed') => {
    // Actualización optimista
    const newQuotes = quotes.map(q => q.id === id ? { ...q, status } : q);
    setQuotes(newQuotes);
    saveToLocalBackup(newQuotes);

    try {
      const { error } = await supabase.from('quotes').update({ status }).eq('id', id);
      if (error) console.error("Error updating quote in Supabase:", error);
    } catch (err) {
      console.error(err);
    }
  };

  return {
    quotes,
    isLoaded,
    addQuote,
    deleteQuote,
    updateQuoteStatus
  };
}
