"use client";

import { useState, useEffect } from "react";
import { useProducts } from "@/hooks/useProducts";
import { useSettings } from "@/hooks/useSettings";
import { useQuotes } from "@/hooks/useQuotes";
import { 
  User, 
  Package, 
  Settings as SettingsIcon, 
  Truck, 
  Home as HomeIcon, 
  FileText, 
  Cpu, 
  Sparkles, 
  Tag, 
  Users, 
  FileSpreadsheet, 
  LogOut, 
  BrainCircuit,
  Sliders
} from "lucide-react";
import dynamic from "next/dynamic";
import { supabase } from "@/lib/supabase";

import { AdminProductList } from "./admin/AdminProductList";
import { AdminQuotesList } from "./admin/AdminQuotesList";
import { AdminSettings } from "./admin/AdminSettings";
import { AdminSuppliers } from "./admin/AdminSuppliers";
import { AdminPromotions } from "./admin/AdminPromotions";

const AgentIntegrationView = dynamic(() => import('./AgentIntegrationView').then(mod => mod.AgentIntegrationView), { ssr: false });
const B2BAgentCRM = dynamic(() => import('./B2BAgentCRM').then(mod => mod.B2BAgentCRM), { ssr: false });
const AdminCRM = dynamic(() => import('./admin/AdminCRM').then(mod => mod.AdminCRM), { ssr: false });
const AdminFacturacion = dynamic(() => import('./admin/AdminFacturacion').then(mod => mod.AdminFacturacion), { ssr: false });
const AdminDiagnostics = dynamic(() => import('./admin/AdminDiagnostics').then(mod => mod.AdminDiagnostics), { ssr: false });

export function AdminView() {
  const { products, isLoaded, addProduct, updateProduct, deleteProduct } = useProducts();
  const { quotes, isLoaded: quotesLoaded, updateQuoteStatus, deleteQuote, updateQuote } = useQuotes();
  const [activeTab, setActiveTab] = useState<'products' | 'settings' | 'suppliers' | 'home' | 'quotes' | 'agent' | 'b2b-agent' | 'promotions' | 'b2b-crm' | 'factura' | 'diagnostics'>('products');
  const { 
    categories, 
    seasons, 
    isLoaded: settingsLoaded, 
    addCategory, 
    removeCategory, 
    addSeason, 
    removeSeason, 
    featuredSeason, 
    updateFeaturedSeason, 
    homeSettings, 
    updateHomeSettings, 
    updateCategories, 
    updateSeasons 
  } = useSettings();

  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    // Intercept unhandled promise rejections from Supabase GoTrue token refresh failure
    const handleRejection = (event: PromiseRejectionEvent) => {
      const msg = event.reason?.message || '';
      if (msg.includes('Refresh Token') || event.reason?.name === 'AuthApiError') {
        console.warn("Caught and suppressed unhandled Supabase auth rejection:", event.reason);
        event.preventDefault(); // Prevents Next.js crash overlay
        
        // Clear stale local storage session
        if (typeof window !== 'undefined') {
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
              localStorage.removeItem(key);
            }
          }
        }
        setIsAuthenticated(false);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('unhandledrejection', handleRejection);
    }

    // Check initial session safely
    supabase.auth.getSession()
      .then((res) => {
        const session = res?.data?.session;
        setIsAuthenticated(!!session);
        if (res?.error) {
          console.warn("Auth session error:", res.error.message);
          
          // Clear stale local storage session
          if (typeof window !== 'undefined') {
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
                localStorage.removeItem(key);
              }
            }
          }
          // Auto-signout to clear stale tokens from storage
          supabase.auth.signOut().catch(() => {});
        }
      })
      .catch((err) => {
        console.error("Failed to check auth session:", err);
        setIsAuthenticated(false);
      });

    // Listen to changes in auth state
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('unhandledrejection', handleRejection);
      }
      if (data?.subscription) {
        data.subscription.unsubscribe();
      }
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput || !passwordInput) {
      setLoginError("Ingresa tu correo y contraseña.");
      return;
    }
    setIsLoggingIn(true);
    setLoginError("");
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: emailInput,
        password: passwordInput,
      });
      if (error) {
        setLoginError(error.message === "Invalid login credentials" ? "Credenciales de acceso inválidas." : error.message);
      }
    } catch (err: any) {
      setLoginError("Error al iniciar sesión: " + err.message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 max-w-sm w-full">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="w-8 h-8 text-primary-700" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Acceso Restringido</h2>
            <p className="text-sm text-gray-500 mt-2">Inicia sesión como administrador para continuar.</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Correo Electrónico</label>
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="admin@geekystore.mx"
                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-primary-500 focus:border-primary-500"
                required
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Contraseña</label>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="••••••••"
                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-primary-500 focus:border-primary-500"
                required
              />
              {loginError && <p className="text-red-500 text-xs text-center mt-2 font-medium">{loginError}</p>}
            </div>
            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full bg-primary-700 hover:bg-primary-800 text-white rounded-lg py-2.5 font-bold transition-colors disabled:opacity-50 flex items-center justify-center"
            >
              {isLoggingIn ? "Iniciando sesión..." : "Acceder"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (!isLoaded || !settingsLoaded || !quotesLoaded) {
    return (
      <div className="p-12 text-center text-gray-500 flex flex-col items-center justify-center gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-700"></div>
        <p className="font-medium text-gray-700">Cargando administrador...</p>
        <p className="text-xs text-gray-400">
          Productos: {isLoaded ? "✅ Listos" : "⏳ Cargando..."} | 
          Ajustes: {settingsLoaded ? "✅ Listos" : "⏳ Cargando..."} | 
          Cotizaciones: {quotesLoaded ? "✅ Listos" : "⏳ Cargando..."}
        </p>
      </div>
    );
  }

  const productSuppliers = homeSettings?.product_suppliers || [];
  const tabItems = [
    { id: "products", name: "Productos", icon: Package, color: "amber" },
    { id: "settings", name: "Ajustes / Catálogos", icon: SettingsIcon, color: "emerald" },
    { id: "suppliers", name: "Proveedores", icon: Truck, color: "indigo" },
    { id: "home", name: "Página de Inicio", icon: HomeIcon, color: "rose" },
    { id: "quotes", name: "Cotizaciones", icon: FileText, color: "sky" },
    { id: "agent", name: "Inteligencia IA", icon: BrainCircuit, color: "violet" },
    { id: "b2b-agent", name: "Agente B2B", icon: Sparkles, color: "fuchsia" },
    { id: "promotions", name: "Promociones", icon: Tag, color: "red" },
    { id: "b2b-crm", name: "Clientes / CRM", icon: Users, color: "teal" },
    { id: "factura", name: "Facturación", icon: FileSpreadsheet, color: "cyan" },
    { id: "diagnostics", name: "Diagnósticos", icon: Sliders, color: "red" },
  ] as const;

  const colorStyles = {
    amber: {
      active: "bg-amber-100/90 text-amber-900 border-amber-500",
      inactive: "bg-amber-50/20 text-gray-500 hover:bg-amber-50 hover:text-amber-700 border-transparent",
      bottomLine: "bg-amber-500"
    },
    emerald: {
      active: "bg-emerald-100/90 text-emerald-900 border-emerald-500",
      inactive: "bg-emerald-50/20 text-gray-500 hover:bg-emerald-50 hover:text-emerald-700 border-transparent",
      bottomLine: "bg-emerald-500"
    },
    indigo: {
      active: "bg-indigo-100/90 text-indigo-900 border-indigo-500",
      inactive: "bg-indigo-50/20 text-gray-500 hover:bg-indigo-50 hover:text-indigo-700 border-transparent",
      bottomLine: "bg-indigo-500"
    },
    rose: {
      active: "bg-rose-100/90 text-rose-900 border-rose-500",
      inactive: "bg-rose-50/20 text-gray-500 hover:bg-rose-50 hover:text-rose-700 border-transparent",
      bottomLine: "bg-rose-500"
    },
    sky: {
      active: "bg-sky-100/90 text-sky-900 border-sky-500",
      inactive: "bg-sky-50/20 text-gray-500 hover:bg-sky-50 hover:text-sky-700 border-transparent",
      bottomLine: "bg-sky-500"
    },
    violet: {
      active: "bg-violet-100/90 text-violet-900 border-violet-500",
      inactive: "bg-violet-50/20 text-gray-500 hover:bg-violet-50 hover:text-violet-700 border-transparent",
      bottomLine: "bg-violet-500"
    },
    fuchsia: {
      active: "bg-fuchsia-100/90 text-fuchsia-900 border-fuchsia-500",
      inactive: "bg-fuchsia-50/20 text-gray-500 hover:bg-fuchsia-50 hover:text-fuchsia-700 border-transparent",
      bottomLine: "bg-fuchsia-500"
    },
    red: {
      active: "bg-red-100/90 text-red-900 border-red-500",
      inactive: "bg-red-50/20 text-gray-500 hover:bg-red-50 hover:text-red-700 border-transparent",
      bottomLine: "bg-red-500"
    },
    teal: {
      active: "bg-teal-100/90 text-teal-900 border-teal-500",
      inactive: "bg-teal-50/20 text-gray-500 hover:bg-teal-50 hover:text-teal-700 border-transparent",
      bottomLine: "bg-teal-500"
    },
    cyan: {
      active: "bg-cyan-100/90 text-cyan-900 border-cyan-500",
      inactive: "bg-cyan-50/20 text-gray-500 hover:bg-cyan-50 hover:text-cyan-700 border-transparent",
      bottomLine: "bg-cyan-500"
    }
  } as const;

  const renderTabContent = () => {
    switch (activeTab) {
      case 'products':
        return (
          <AdminProductList 
            products={products}
            isLoaded={isLoaded}
            addProduct={addProduct}
            updateProduct={updateProduct}
            deleteProduct={deleteProduct}
            categories={categories}
            seasons={seasons}
            homeSettings={homeSettings}
            productSuppliers={productSuppliers}
          />
        );
      case 'settings':
        return (
          <AdminSettings 
            viewType="settings"
            categories={categories}
            seasons={seasons}
            featuredSeason={featuredSeason}
            updateFeaturedSeason={updateFeaturedSeason}
            addCategory={addCategory}
            removeCategory={removeCategory}
            addSeason={addSeason}
            removeSeason={removeSeason}
            updateCategories={updateCategories}
            updateSeasons={updateSeasons}
            homeSettings={homeSettings}
            updateHomeSettings={updateHomeSettings}
          />
        );
      case 'suppliers':
        return (
          <AdminSuppliers 
            homeSettings={homeSettings}
            updateHomeSettings={updateHomeSettings}
            products={products}
            updateProduct={updateProduct}
          />
        );
      case 'home':
        return (
          <AdminSettings 
            viewType="home"
            categories={categories}
            seasons={seasons}
            featuredSeason={featuredSeason}
            updateFeaturedSeason={updateFeaturedSeason}
            addCategory={addCategory}
            removeCategory={removeCategory}
            addSeason={addSeason}
            removeSeason={removeSeason}
            updateCategories={updateCategories}
            updateSeasons={updateSeasons}
            homeSettings={homeSettings}
            updateHomeSettings={updateHomeSettings}
          />
        );
      case 'quotes':
        return (
          <AdminQuotesList 
            quotes={quotes}
            updateQuoteStatus={updateQuoteStatus}
            deleteQuote={deleteQuote}
            updateQuote={updateQuote}
            homeSettings={homeSettings}
          />
        );
      case 'agent':
        return <AgentIntegrationView />;
      case 'b2b-agent':
        return <B2BAgentCRM />;
      case 'promotions':
        return (
          <AdminPromotions 
            homeSettings={homeSettings}
            updateHomeSettings={updateHomeSettings}
          />
        );
      case 'b2b-crm':
        return <AdminCRM />;
      case 'factura':
        return (
          <div className="p-0 sm:p-2">
            <AdminFacturacion showBackButton={false} />
          </div>
        );
      case 'diagnostics':
        return <AdminDiagnostics />;
      default:
        return null;
    }
  };

  const activeColor = tabItems.find(t => t.id === activeTab)?.color || "amber";

  return (
    <div className="bg-white rounded-2xl shadow-md border border-gray-150 overflow-hidden min-h-[75vh] flex flex-col">
      {/* Console Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 bg-white border-b border-gray-150 gap-4">
        <div className="flex items-center gap-2">
          <svg className="w-6 h-6 flex-shrink-0" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="256" cy="256" r="256" fill="#00b3a9"/>
            <path d="M200 180 L110 256 L200 332" stroke="white" strokeWidth="46" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M250 360 L310 150" stroke="white" strokeWidth="42" strokeLinecap="round"/>
            <path d="M350 180 L440 256 L350 332" stroke="white" strokeWidth="46" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="font-extrabold text-lg text-primary-900" style={{ fontFamily: 'Museo, sans-serif' }}>geekystore</span>
        </div>
        
        <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
          <div className="text-left">
            <p className="text-xs font-bold text-gray-700">geroti@hotmail.com</p>
            <p className="text-[9px] text-gray-400 uppercase font-semibold">Administrador</p>
          </div>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
            }}
            className="text-xs bg-red-50 hover:bg-red-100 text-red-700 font-bold px-3 py-2 rounded-lg border border-red-200/50 transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <LogOut className="w-4 h-4" /> <span className="hidden sm:inline">Cerrar Sesión</span>
          </button>
        </div>
      </div>

      {/* Modern wrapping card pills menu (no scrollbars) */}
      <div className="bg-gray-50/80 p-4 border-b border-gray-200 flex-shrink-0">
        <div className="flex flex-wrap gap-2 z-10 relative">
          {tabItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 py-2 px-3.5 text-xs font-bold rounded-lg border transition-all shadow-sm ${
                  isActive 
                    ? "bg-white text-gray-900 border-gray-300 ring-2 ring-primary-500/10 scale-102 font-extrabold" 
                    : "bg-gray-100 hover:bg-gray-200/70 text-gray-600 border-gray-200/50"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-primary-700 scale-110" : "text-gray-500"}`} />
                <span className="text-[11px] tracking-tight whitespace-nowrap">{item.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content Container */}
      <div className="p-6 sm:p-8 bg-white flex-grow overflow-y-auto">
        {renderTabContent()}
      </div>
    </div>
  );
}
