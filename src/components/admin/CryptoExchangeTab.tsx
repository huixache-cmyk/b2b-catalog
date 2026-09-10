"use client";

import React, { useState, useEffect } from 'react';
import { 
  Coins, 
  Activity, 
  AlertTriangle, 
  RefreshCw, 
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  Zap,
  ShieldCheck,
  History as HistoryIcon,
  Play,
  Pause,
  RotateCcw
} from 'lucide-react';

interface TradeHistory {
  id: string;
  asset: string;
  trade_type: 'BUY' | 'SELL' | string;
  executed_amount: number;
  execution_price: number;
  fees: number;
  status: 'executed' | 'rejected' | 'failed' | 'simulated' | string;
  created_at: string;
  display_label?: string;
  error_message?: string;
}

interface PortfolioCapital {
  base: number;
  openCryptoUsd: number;
  availableCashUsd: number;
  totalEquityUsd: number;
  todayPnlUsd: number;
}

export function CryptoExchangeTab() {
  const [history, setHistory] = useState<TradeHistory[]>([]);
  const [botActive, setBotActive] = useState<boolean>(true);
  const [exchangeMode, setExchangeMode] = useState<string>('simulation');
  const [capital, setCapital] = useState<PortfolioCapital>({
    base: 1000.00,
    openCryptoUsd: 0,
    availableCashUsd: 1000.00,
    totalEquityUsd: 1000.00,
    todayPnlUsd: 0
  });

  const [usdToMxn, setUsdToMxn] = useState<number>(17.50);
  const [isMockTriggering, setIsMockTriggering] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [historyDateSearch, setHistoryDateSearch] = useState<string>('');
  const [botActionLoading, setBotActionLoading] = useState<string | null>(null);

  // URL base y API Key de la API del bot
  const API_BASE = process.env.NEXT_PUBLIC_CRYPTO_BOT_API_URL || 'https://exchange-trade-production.up.railway.app/api';
  const API_KEY = process.env.NEXT_PUBLIC_INTERNAL_API_KEY || 'geeky_exchange_secret_key_2026';

  const authHeaders = (extraHeaders?: Record<string, string>) => ({
    'x-api-key': API_KEY,
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    ...(extraHeaders || {})
  });

  const fetchData = async () => {
    try {
      // 1. Estado general y capital
      const statusRes = await fetch(`${API_BASE}/status`, { headers: authHeaders() });
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        setBotActive(statusData.botActive ?? true);
        setExchangeMode(statusData.exchangeMode || 'simulation');
        if (statusData.capital) {
          setCapital(statusData.capital);
        }
      }

      // 2. Historial único de operaciones
      const historyRes = await fetch(`${API_BASE}/history`, { headers: authHeaders() });
      if (historyRes.ok) {
        const historyData = await historyRes.json();
        setHistory(historyData || []);
      }

      setErrorMsg(null);
    } catch (e: any) {
      console.warn('Error al conectar con la API del bot de trading:', e.message);
      setErrorMsg(`Sin conexión con la API de Exchange Trade en ${API_BASE}. Verificando reintento automático...`);
    }
  };

  useEffect(() => {
    const fetchRate = () => {
      fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=USDCMXN')
        .then(res => res.json())
        .then(data => {
          if (data && data.lastPrice) {
            setUsdToMxn(Number(data.lastPrice));
          }
        })
        .catch(e => console.warn('Error al obtener tasa USD/MXN:', e.message));
    };

    fetchData();
    fetchRate();

    const interval = setInterval(() => {
      fetchData();
      fetchRate();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleBotControl = async (action: 'start' | 'stop' | 'reset') => {
    if (action === 'reset') {
      const confirmed = window.confirm('¿Estás seguro de reiniciar el Bot Intradía a $1,000.00 USD Base? Esto despejará posiciones pendientes.');
      if (!confirmed) return;
    }

    setBotActionLoading(action);
    try {
      const res = await fetch(`${API_BASE}/bot/control`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ bot: 'intraday', action })
      });
      const data = await res.json();
      if (data.success || data.status === 'ok') {
        if (action === 'start') setBotActive(true);
        if (action === 'stop') setBotActive(false);
        await fetchData();
      } else {
        alert(data.error || `Error al ejecutar acción ${action}`);
      }
    } catch (err: any) {
      alert(`Error de conexión: ${err.message}`);
    } finally {
      setBotActionLoading(null);
    }
  };

  const handleTriggerMockSignal = async () => {
    setIsMockTriggering(true);
    try {
      const res = await fetch(`${API_BASE}/bot/mock-signal`, { method: 'POST', headers: authHeaders() });
      const data = await res.json();
      if (res.ok) {
        alert('Señales de prueba generadas y ejecutadas exitosamente.');
        fetchData();
      } else {
        alert(data.error || 'Error al gatillar señales de prueba.');
      }
    } catch (e: any) {
      alert('Error de conexión.');
    } finally {
      setIsMockTriggering(false);
    }
  };

  const filteredHistory = history.filter(item => {
    if (!historyDateSearch) return true;
    return item.created_at.includes(historyDateSearch) || item.asset.toLowerCase().includes(historyDateSearch.toLowerCase());
  });

  return (
    <div className="space-y-6 text-slate-100 p-2 md:p-6 bg-slate-950 min-h-screen font-sans">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-xl backdrop-blur-md">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <TrendingUp className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              Bot Intradía <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-semibold">$1,000.00 Base</span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Sistema de alta frecuencia y rotación dinámica • 1 USD = ${usdToMxn.toFixed(2)} MXN
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          <span className={`text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5 ${
            exchangeMode === 'real' 
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' 
              : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
          }`}>
            <span className={`w-2 h-2 rounded-full ${exchangeMode === 'real' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
            {exchangeMode === 'real' ? 'Modo Real Binance' : 'Modo Simulación High-Accuracy'}
          </span>

          <button
            onClick={() => handleBotControl(botActive ? 'stop' : 'start')}
            disabled={botActionLoading !== null}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shadow-md ${
              botActive 
                ? 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/30' 
                : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30'
            }`}
          >
            {botActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {botActive ? 'Pausar Bot' : 'Reactivar Bot'}
          </button>

          <button
            onClick={() => handleBotControl('reset')}
            disabled={botActionLoading !== null}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-all"
            title="Reiniciar Capital Base a $1,000 USD"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reiniciar $1K
          </button>

          <button
            onClick={handleTriggerMockSignal}
            disabled={isMockTriggering}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-cyan-500/20 transition-all"
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            {isMockTriggering ? 'Gatillando...' : 'Señal Manual'}
          </button>

          <button
            onClick={fetchData}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all"
            title="Refrescar datos"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-4 rounded-xl text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={fetchData} className="underline text-rose-300 hover:text-white font-semibold">Reintentar</button>
        </div>
      )}

      {/* 4 Cards principales de Estado Financiero Intradía */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Capital Líquido Disponible */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
            <span>Caja Líquida Disponible</span>
            <Coins className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl md:text-3xl font-extrabold text-white">
            ${capital.availableCashUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs text-slate-400 font-normal">USD</span>
          </div>
          <div className="mt-2 text-xs text-slate-400 flex items-center justify-between border-t border-slate-800/80 pt-2">
            <span>≈ ${(capital.availableCashUsd * usdToMxn).toLocaleString('es-MX', { maximumFractionDigits: 0 })} MXN</span>
            <span className="text-cyan-400 font-medium">Libre para Inversión</span>
          </div>
        </div>

        {/* Card 2: En Cripto (Posiciones Abiertas) */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
            <span>Posiciones Abiertas en Cripto</span>
            <Activity className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl md:text-3xl font-extrabold text-white">
            ${capital.openCryptoUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs text-slate-400 font-normal">USD</span>
          </div>
          <div className="mt-2 text-xs text-slate-400 flex items-center justify-between border-t border-slate-800/80 pt-2">
            <span>≈ ${(capital.openCryptoUsd * usdToMxn).toLocaleString('es-MX', { maximumFractionDigits: 0 })} MXN</span>
            <span className="text-blue-400 font-medium">BTC, ETH, SOL</span>
          </div>
        </div>

        {/* Card 3: Rendimiento Hoy (PnL Realizado) */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
            <span>Rendimiento Hoy (PnL)</span>
            {capital.todayPnlUsd >= 0 ? <ArrowUpRight className="w-4 h-4 text-emerald-400" /> : <ArrowDownRight className="w-4 h-4 text-rose-400" />}
          </div>
          <div className={`text-2xl md:text-3xl font-extrabold ${capital.todayPnlUsd >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {capital.todayPnlUsd >= 0 ? '+' : ''}${capital.todayPnlUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs font-normal">USD</span>
          </div>
          <div className="mt-2 text-xs text-slate-400 flex items-center justify-between border-t border-slate-800/80 pt-2">
            <span>≈ {capital.todayPnlUsd >= 0 ? '+' : ''}${(capital.todayPnlUsd * usdToMxn).toLocaleString('es-MX', { maximumFractionDigits: 2 })} MXN</span>
            <span className={capital.todayPnlUsd >= 0 ? 'text-emerald-400 font-medium' : 'text-rose-400 font-medium'}>
              {capital.base > 0 ? ((capital.todayPnlUsd / capital.base) * 100).toFixed(2) : '0.00'}% ROI Hoy
            </span>
          </div>
        </div>

        {/* Card 4: Patrimonio Total Intradía */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
            <span>Patrimonio Total Intradía</span>
            <ShieldCheck className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl md:text-3xl font-extrabold text-white">
            ${capital.totalEquityUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs text-slate-400 font-normal">USD</span>
          </div>
          <div className="mt-2 text-xs text-slate-400 flex items-center justify-between border-t border-slate-800/80 pt-2">
            <span>Base Inicial: ${capital.base.toFixed(2)} USD</span>
            <span className="text-purple-400 font-medium">100% Intradía</span>
          </div>
        </div>
      </div>

      {/* Historial Único de Operaciones Intradía */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <HistoryIcon className="w-5 h-5 text-cyan-400" />
            Historial Único de Operaciones Intradía
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 font-normal">
              {filteredHistory.length} registros
            </span>
          </h2>

          <input
            type="text"
            placeholder="Buscar por fecha u activo..."
            value={historyDateSearch}
            onChange={(e) => setHistoryDateSearch(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-1.5 text-xs text-white placeholder-slate-500 focus:border-cyan-500 outline-none w-full md:w-64"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-bold tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-3.5">Fecha / Hora</th>
                <th className="p-3.5">Activo</th>
                <th className="p-3.5">Tipo</th>
                <th className="p-3.5">Precio Ejecución</th>
                <th className="p-3.5">Monto Ejecutado</th>
                <th className="p-3.5">Estado</th>
                <th className="p-3.5 text-right">Detalle / Métricas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-500 text-xs">
                    No se encontraron operaciones registradas.
                  </td>
                </tr>
              ) : (
                filteredHistory.map(item => (
                  <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-3.5 text-slate-400 font-mono text-[11px]">
                      {new Date(item.created_at).toLocaleString('es-MX', {
                        day: '2-digit', month: '2-digit', year: 'numeric',
                        hour: '2-digit', minute: '2-digit', second: '2-digit'
                      })}
                    </td>
                    <td className="p-3.5 font-bold text-white">{item.asset}</td>
                    <td className="p-3.5">
                      <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                        item.trade_type === 'BUY'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      }`}>
                        {item.trade_type === 'BUY' ? 'COMPRA' : 'VENTA'}
                      </span>
                    </td>
                    <td className="p-3.5 font-semibold text-slate-200">
                      ${Number(item.execution_price || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3.5 font-bold text-white">
                      ${Number(item.executed_amount || 0).toFixed(2)} USD
                    </td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                        item.status === 'executed' || item.status === 'simulated'
                          ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        {item.status === 'simulated' ? 'SIMULADO' : item.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-3.5 text-right font-mono text-[11px] text-slate-400">
                      {item.error_message || 'Comisión: $0.00 USD'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}