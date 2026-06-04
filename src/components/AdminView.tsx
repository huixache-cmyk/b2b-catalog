"use client";

import { useState, useEffect } from "react";
import { useProducts } from "@/hooks/useProducts";
import { useSettings } from "@/hooks/useSettings";
import { useQuotes } from "@/hooks/useQuotes";
import { User } from "lucide-react";
import dynamic from "next/dynamic";
import { supabase } from "@/lib/supabase";

import { AdminProductList } from "./admin/AdminProductList";
import { AdminQuotesList } from "./admin/AdminQuotesList";
import { AdminSettings } from "./admin/AdminSettings";
import { AdminSuppliers } from "./admin/AdminSuppliers";
import { AdminPromotions } from "./admin/AdminPromotions";

const AgentIntegrationView = dynamic(() => import('./AgentIntegrationView').then(mod => mod.AgentIntegrationView), { ssr: false });
const B2BAgentCRM = dynamic(() => import('./B2BAgentCRM').then(mod => mod.B2BAgentCRM), { ssr: false });

export function AdminView() {
  const { products, isLoaded, addProduct, updateProduct, deleteProduct } = useProducts();
  const { quotes, isLoaded: quotesLoaded, updateQuoteStatus, deleteQuote, updateQuote } = useQuotes();
  const [activeTab, setActiveTab] = useState<'products' | 'settings' | 'suppliers' | 'home' | 'quotes' | 'agent' | 'b2b-agent' | 'promotions'>('products');
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

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden relative">
      {/* Tabs */}
      <div className="flex border-b border-gray-200 bg-gray-50 px-6 pt-4 flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-wrap">
          <button 
            onClick={() => setActiveTab('products')}
            className={`px-6 py-3 font-bold text-sm border-b-2 transition-colors ${activeTab === 'products' ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >
            Productos
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={`px-6 py-3 font-bold text-sm border-b-2 transition-colors ${activeTab === 'settings' ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >
            Ajustes / Catálogos
          </button>
          <button 
            onClick={() => setActiveTab('suppliers')}
            className={`px-6 py-3 font-bold text-sm border-b-2 transition-colors ${activeTab === 'suppliers' ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >
            Proveedores
          </button>
          <button 
            onClick={() => setActiveTab('home')}
            className={`px-6 py-3 font-bold text-sm border-b-2 transition-colors ${activeTab === 'home' ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >
            Página de Inicio
          </button>
          <button 
            onClick={() => setActiveTab('quotes')}
            className={`px-6 py-3 font-bold text-sm border-b-2 transition-colors ${activeTab === 'quotes' ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >
            Cotizaciones
          </button>
          <button 
            onClick={() => setActiveTab('agent')}
            className={`px-6 py-3 font-bold text-sm border-b-2 transition-colors ${activeTab === 'agent' ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >
            Inteligencia IA
          </button>
          <button 
            onClick={() => setActiveTab('b2b-agent')}
            className={`px-6 py-3 font-bold text-sm border-b-2 transition-colors ${activeTab === 'b2b-agent' ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >
            Agente B2B
          </button>
          <button 
            onClick={() => setActiveTab('promotions')}
            className={`px-6 py-3 font-bold text-sm border-b-2 transition-colors ${activeTab === 'promotions' ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >
            Promociones
          </button>
        </div>
        <button
          onClick={async () => {
            await supabase.auth.signOut();
          }}
          className="text-xs bg-red-50 hover:bg-red-100 text-red-700 font-bold px-3 py-1.5 rounded-lg border border-red-200/60 transition-colors flex items-center gap-1.5 mb-2 self-end sm:self-auto"
        >
          Cerrar Sesión
        </button>
      </div>

      {activeTab === 'products' && (
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
      )}

      {activeTab === 'settings' && (
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
      )}

      {activeTab === 'home' && (
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
      )}

      {activeTab === 'suppliers' && (
        <AdminSuppliers 
          homeSettings={homeSettings}
          updateHomeSettings={updateHomeSettings}
          products={products}
          updateProduct={updateProduct}
        />
      )}

      {activeTab === 'quotes' && (
        <AdminQuotesList 
          quotes={quotes}
          updateQuoteStatus={updateQuoteStatus}
          deleteQuote={deleteQuote}
          updateQuote={updateQuote}
          homeSettings={homeSettings}
        />
      )}

      {activeTab === 'agent' && (
        <AgentIntegrationView />
      )}

      {activeTab === 'b2b-agent' && (
        <B2BAgentCRM />
      )}

      {activeTab === 'promotions' && (
        <AdminPromotions 
          homeSettings={homeSettings}
          updateHomeSettings={updateHomeSettings}
        />
      )}
    </div>
  );
}
