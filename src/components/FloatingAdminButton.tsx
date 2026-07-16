"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sliders } from "lucide-react";
import { supabase } from "@/lib/supabase";

export function FloatingAdminButton() {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // 1. Initial check
    supabase.auth.getSession().then((res) => {
      setIsAdmin(!!res?.data?.session);
    });

    // 2. Auth change listener
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAdmin(!!session);
    });

    return () => {
      if (authListener?.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, []);

  if (!isAdmin) return null;

  return (
    <div className="fixed bottom-6 left-6 z-50 flex items-center gap-2 group animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Link 
        href="/admin"
        className="bg-gradient-to-tr from-primary-900 to-primary-600 hover:from-primary-800 hover:to-primary-500 text-white p-4 rounded-full shadow-2xl transition-transform hover:scale-110 flex items-center justify-center focus:outline-none focus:ring-4 focus:ring-primary-300 border border-primary-500/30"
        aria-label="Panel de Administración"
        title="Ir al Panel de Administración"
      >
        <Sliders className="w-6 h-6" />
      </Link>
      
      {/* Tooltip on Hover */}
      <div className="bg-gray-900/90 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-md pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap border border-gray-800">
        Panel de Administración
      </div>
    </div>
  );
}
