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
  RotateCcw,
  Landmark,
  Building2,
  UserCheck,
  PlusCircle,
  Trash2,
  X,
  CheckCircle2,
  Wallet,
  Send
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

interface BankRecipient {
  id: string;
  alias: string;
  bank_name: string;
  holder_name: string;
  clabe_account: string;
  created_at: string;
}

interface BankTransaction {
  id: string;
  recipient_id?: string;
  transaction_type: 'deposit' | 'withdrawal' | string;
  amount_usd: number;
  amount_mxn: number;
  exchange_rate: number;
  bank_name: string;
  source_account?: string;
  destination_clabe: string;
  reference?: string;
  status: string;
  created_at: string;
}

interface PortfolioCapital {
  base: number;
  effectiveCapitalBase?: number;
  openCryptoUsd: number;
  availableCashUsd: number;
  totalEquityUsd: number;
  todayPnlUsd: number;
  totalBankDepositsUsd?: number;
  totalBankWithdrawalsUsd?: number;
  netBankInjectionsUsd?: number;
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
    todayPnlUsd: 0,
    totalBankDepositsUsd: 0,
    totalBankWithdrawalsUsd: 0,
    netBankInjectionsUsd: 0
  });

  const [usdToMxn, setUsdToMxn] = useState<number>(17.50);
  const [isMockTriggering, setIsMockTriggering] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [historyDateSearch, setHistoryDateSearch] = useState<string>('');
  const [botActionLoading, setBotActionLoading] = useState<string | null>(null);

  // Estados del Módulo Bancario
  const [bankModalOpen, setBankModalOpen] = useState<boolean>(false);
  const [bankTab, setBankTab] = useState<'deposit' | 'withdrawal' | 'recipients' | 'history'>('deposit');
  const [recipients, setRecipients] = useState<BankRecipient[]>([]);
  const [bankHistory, setBankHistory] = useState<BankTransaction[]>([]);

  // Campos de Formulario Bancario
  const [amountUsd, setAmountUsd] = useState<string>('');
  const [bankName, setBankName] = useState<string>('Banorte');
  const [holderName, setHolderName] = useState<string>('');
  const [clabeAccount, setClabeAccount] = useState<string>('');
  const [reference, setReference] = useState<string>('');
  const [saveRecipient, setSaveRecipient] = useState<boolean>(false);
  const [recipientAlias, setRecipientAlias] = useState<string>('');
  const [isSubmittingBank, setIsSubmittingBank] = useState<boolean>(false);

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

  const fetchBankData = async () => {
    try {
      const recRes = await fetch(`${API_BASE}/bank/recipients`, { headers: authHeaders() });
      if (recRes.ok) setRecipients(await recRes.json());

      const txRes = await fetch(`${API_BASE}/bank/transactions`, { headers: authHeaders() });
      if (txRes.ok) setBankHistory(await txRes.json());
    } catch (e) {
      console.warn('Error al obtener datos de módulo bancario:', e);
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
    fetchBankData();
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

  const handleSelectRecipient = (rec: BankRecipient) => {
    setBankName(rec.bank_name);
    setHolderName(rec.holder_name);
    setClabeAccount(rec.clabe_account);
    setRecipientAlias(rec.alias);
    alert(`Cuenta seleccionada: ${rec.alias} (${rec.bank_name} - ${rec.clabe_account}).`);
  };

  const handleDeleteRecipient = async (id: string) => {
    if (!window.confirm('¿Eliminar esta cuenta guardada de tus destinatarios?')) return;
    try {
      const res = await fetch(`${API_BASE}/bank/recipients/${id}`, { method: 'DELETE', headers: authHeaders() });
      if (res.ok) {
        fetchBankData();
      } else {
        alert('No se pudo eliminar el destinatario.');
      }
    } catch (e) {
      alert('Error de conexión.');
    }
  };

  const handleBankTransactionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = Number(amountUsd);
    if (!amountUsd || numericAmount <= 0) return alert('Por favor ingresa un monto válido en USD.');
    if (!clabeAccount || clabeAccount.trim().length < 10) return alert('Ingresa una CLABE o cuenta bancaria válida (mínimo 10 dígitos).');

    if (bankTab === 'withdrawal' && numericAmount > capital.availableCashUsd) {
      return alert(`Fondos insuficientes. Intientas retirar $${numericAmount.toFixed(2)} USD pero tu caja disponible actual es de $${capital.availableCashUsd.toFixed(2)} USD.`);
    }

    setIsSubmittingBank(true);
    try {
      const payload = {
        transaction_type: bankTab === 'withdrawal' ? 'withdrawal' : 'deposit',
        amount_usd: numericAmount,
        amount_mxn: numericAmount * usdToMxn,
        exchange_rate: usdToMxn,
        bank_name: bankName,
        source_account: holderName || 'Cuenta Titular Principal',
        destination_clabe: clabeAccount,
        reference: reference || `${bankTab === 'deposit' ? 'Abono SPEI' : 'Retiro SPEI'} Bot Intradía`,
        save_recipient: saveRecipient,
        recipient_alias: recipientAlias || `${bankName} - ${holderName}`,
        holder_name: holderName || 'Titular Principal'
      };

      const res = await fetch(`${API_BASE}/bank/transaction`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok && data.success) {
        alert(`¡${bankTab === 'deposit' ? 'Abono' : 'Retiro'} bancario de $${numericAmount.toFixed(2)} USD registrado exitosamente!`);
        setAmountUsd('');
        setReference('');
        setSaveRecipient(false);
        setRecipientAlias('');
        await fetchData();
        await fetchBankData();
      } else {
        alert(data.error || 'Error al procesar la transferencia bancaria.');
      }
    } catch (err: any) {
      alert(`Error de conexión: ${err.message}`);
    } finally {
      setIsSubmittingBank(false);
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

      {/* 5 Cards principales de Estado Financiero Intradía */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Capital Líquido Disponible */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
            <span>Caja Líquida Disponible</span>
            <Coins className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-xl md:text-2xl font-extrabold text-white">
            ${capital.availableCashUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs text-slate-400 font-normal">USD</span>
          </div>
          <div className="mt-2 text-xs text-slate-400 flex items-center justify-between border-t border-slate-800/80 pt-2">
            <span>≈ ${(capital.availableCashUsd * usdToMxn).toLocaleString('es-MX', { maximumFractionDigits: 0 })} MXN</span>
            <span className="text-cyan-400 font-medium">Libre Inversión</span>
          </div>
        </div>

        {/* Card 2: En Cripto (Posiciones Abiertas) */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
            <span>Posiciones Abiertas</span>
            <Activity className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-xl md:text-2xl font-extrabold text-white">
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
          <div className={`text-xl md:text-2xl font-extrabold ${capital.todayPnlUsd >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {capital.todayPnlUsd >= 0 ? '+' : ''}${capital.todayPnlUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs font-normal">USD</span>
          </div>
          <div className="mt-2 text-xs text-slate-400 flex items-center justify-between border-t border-slate-800/80 pt-2">
            <span>≈ {capital.todayPnlUsd >= 0 ? '+' : ''}${(capital.todayPnlUsd * usdToMxn).toLocaleString('es-MX', { maximumFractionDigits: 2 })} MXN</span>
            <div className="flex flex-col items-end">
              <span className={capital.todayPnlUsd >= 0 ? 'text-emerald-400 font-medium' : 'text-rose-400 font-medium'}>
                {capital.base > 0 ? ((capital.todayPnlUsd / capital.base) * 100).toFixed(2) : '0.00'}% ROI Hoy
              </span>
              <span className="text-[10px] text-slate-400 font-medium mt-0.5">Cierre 6:00 pm</span>
            </div>
          </div>
        </div>

        {/* Card 4: Patrimonio Total Intradía */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
            <span>Patrimonio Total Intradía</span>
            <ShieldCheck className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-xl md:text-2xl font-extrabold text-white">
            ${capital.totalEquityUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs text-slate-400 font-normal">USD</span>
          </div>
          <div className="mt-2 text-xs text-slate-400 flex items-center justify-between border-t border-slate-800/80 pt-2">
            <span>Base: ${capital.base.toFixed(0)} USD</span>
            <span className="text-purple-400 font-medium">Acumulado Total</span>
          </div>
        </div>

        {/* Card 5: Módulo Bancario & Transferencias SPEI */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg hover:border-slate-700 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
              <span>Bancos & Transferencias</span>
              <Landmark className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-xl md:text-2xl font-extrabold text-white">
              {(capital.netBankInjectionsUsd || 0) >= 0 ? '+' : ''}${(capital.netBankInjectionsUsd || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs text-slate-400 font-normal">USD</span>
            </div>
          </div>

          <div className="mt-2 border-t border-slate-800/80 pt-2">
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2">
              <span>↑ Dep: ${(capital.totalBankDepositsUsd || 0).toFixed(0)}</span>
              <span>↓ Ret: ${(capital.totalBankWithdrawalsUsd || 0).toFixed(0)}</span>
            </div>
            <button
              onClick={() => { setBankModalOpen(true); fetchBankData(); }}
              className="w-full py-1.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-md transition-all"
            >
              <Landmark className="w-3.5 h-3.5" />
              Gestionar Fondos
            </button>
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
                    <td className="p-3.5 text-right font-mono text-[11px]">
                      {(() => {
                        const msg = item.error_message;
                        if (!msg) return <span className="text-slate-500">Comisión: $0.00 USD</span>;
                        const pnlIndex = msg.indexOf('PNL:');
                        if (pnlIndex !== -1) {
                          const beforePnl = msg.substring(0, pnlIndex);
                          const pnlPart = msg.substring(pnlIndex);
                          const isLoss = pnlPart.includes('PNL: -') || pnlPart.includes('-$') || pnlPart.includes('(-');
                          const isProfit = pnlPart.includes('PNL: +') || pnlPart.includes('+$');

                          const pnlStyle = isLoss
                            ? 'text-rose-400 font-bold bg-rose-500/20 px-2 py-0.5 rounded-md border border-rose-500/40 inline-block shadow-sm shadow-rose-900/30'
                            : isProfit
                            ? 'text-emerald-400 font-bold bg-emerald-500/20 px-2 py-0.5 rounded-md border border-emerald-500/40 inline-block shadow-sm shadow-emerald-900/30'
                            : 'text-cyan-400 font-bold bg-cyan-500/20 px-2 py-0.5 rounded-md border border-cyan-500/30 inline-block';

                          return (
                            <span className="text-slate-400 inline-flex items-center gap-1.5 flex-wrap justify-end">
                              <span>{beforePnl}</span>
                              <span className={pnlStyle}>{pnlPart}</span>
                            </span>
                          );
                        }
                        return <span className="text-slate-400">{msg}</span>;
                      })()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ============================================================ */}
      {/* MODAL EMERGENTE DEL MÓDULO BANCARIO & DESTINATARIOS SPEI      */}
      {/* ============================================================ */}
      {bankModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 text-slate-100 flex flex-col justify-between">
            {/* Header del Modal */}
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                    <Landmark className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Módulo Bancario SPEI / Transferencias</h2>
                    <p className="text-xs text-slate-400">Abona liquidez o retira capital libre a tus cuentas registradas</p>
                  </div>
                </div>

                <button
                  onClick={() => setBankModalOpen(false)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Selector de Pestañas del Modal */}
              <div className="flex flex-wrap gap-2 my-5 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
                <button
                  onClick={() => setBankTab('deposit')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                    bankTab === 'deposit'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <PlusCircle className="w-4 h-4" />
                  Abonar / Depósito
                </button>

                <button
                  onClick={() => setBankTab('withdrawal')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                    bankTab === 'withdrawal'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Send className="w-4 h-4" />
                  Retirar Fondos
                </button>

                <button
                  onClick={() => setBankTab('recipients')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                    bankTab === 'recipients'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <UserCheck className="w-4 h-4" />
                  Destinatarios ({recipients.length})
                </button>

                <button
                  onClick={() => setBankTab('history')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                    bankTab === 'history'
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30 shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <HistoryIcon className="w-4 h-4" />
                  Historial Movimientos
                </button>
              </div>

              {/* CONTENIDO PESTAÑA: DEPRÓSITO O RETIRO */}
              {(bankTab === 'deposit' || bankTab === 'withdrawal') && (
                <form onSubmit={handleBankTransactionSubmit} className="space-y-4">
                  {/* Selector rápido de Destinatario Registrado */}
                  {recipients.length > 0 && (
                    <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
                      <label className="text-[11px] font-semibold text-cyan-400 mb-1.5 block flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5" />
                        Cargar desde Destinatario Registrado:
                      </label>
                      <select
                        onChange={(e) => {
                          const selected = recipients.find(r => r.id === e.target.value);
                          if (selected) handleSelectRecipient(selected);
                        }}
                        defaultValue=""
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
                      >
                        <option value="" disabled>-- Selecciona una cuenta guardada --</option>
                        {recipients.map(r => (
                          <option key={r.id} value={r.id}>
                            {r.alias} ({r.bank_name} - {r.holder_name})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Monto USD */}
                    <div>
                      <label className="text-xs font-semibold text-slate-300 mb-1 block">
                        Monto a {bankTab === 'deposit' ? 'Abonar' : 'Retirar'} (USD) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Ej. 500.00"
                        value={amountUsd}
                        onChange={(e) => setAmountUsd(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white font-bold placeholder-slate-600 focus:border-emerald-500 outline-none"
                        required
                      />
                      {amountUsd && Number(amountUsd) > 0 && (
                        <p className="text-[11px] text-emerald-400 mt-1 font-semibold">
                          ≈ ${(Number(amountUsd) * usdToMxn).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN (Tasa: ${usdToMxn.toFixed(2)})
                        </p>
                      )}
                    </div>

                    {/* Banco / Aplicación */}
                    <div>
                      <label className="text-xs font-semibold text-slate-300 mb-1 block">
                        Banco / Aplicación Origen-Destino *
                      </label>
                      <select
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-emerald-500 outline-none"
                      >
                        <option value="Banorte">Banorte / Ixe</option>
                        <option value="BBVA">BBVA México</option>
                        <option value="STP">STP (Sistema de Transferencias)</option>
                        <option value="Bitso">Bitso / Bitso Alpha</option>
                        <option value="HSBC">HSBC México</option>
                        <option value="Santander">Santander México</option>
                        <option value="Banregio">Banregio / Hey Banco</option>
                        <option value="Nu">Nu México</option>
                        <option value="MercadoPago">Mercado Pago SPEI</option>
                        <option value="Otro">Otro Banco / Exchange</option>
                      </select>
                    </div>

                    {/* Titular / Cuenta Origen */}
                    <div>
                      <label className="text-xs font-semibold text-slate-300 mb-1 block">
                        Titular de la Cuenta *
                      </label>
                      <input
                        type="text"
                        placeholder="Ej. Juan Pérez / GeekyStore SA"
                        value={holderName}
                        onChange={(e) => setHolderName(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:border-emerald-500 outline-none"
                        required
                      />
                    </div>

                    {/* CLABE / Número de Cuenta */}
                    <div>
                      <label className="text-xs font-semibold text-slate-300 mb-1 block">
                        CLABE Interbancaria (18 dígitos) / Cuenta *
                      </label>
                      <input
                        type="text"
                        placeholder="072180001234567890"
                        value={clabeAccount}
                        onChange={(e) => setClabeAccount(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono placeholder-slate-600 focus:border-emerald-500 outline-none"
                        required
                      />
                    </div>
                  </div>

                  {/* Concepto / Referencia */}
                  <div>
                    <label className="text-xs font-semibold text-slate-300 mb-1 block">
                      Concepto / Referencia SPEI (Opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. Fondeo adicional de caja para Bot Intradía"
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-600 focus:border-emerald-500 outline-none"
                    />
                  </div>

                  {/* Checkbox para guardar datos del destinatario */}
                  <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 space-y-3">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-200">
                      <input
                        type="checkbox"
                        checked={saveRecipient}
                        onChange={(e) => setSaveRecipient(e.target.checked)}
                        className="w-4 h-4 rounded text-emerald-500 focus:ring-0 bg-slate-900 border-slate-700"
                      />
                      <span>💾 Guardar estos datos en mi Lista de Destinatarios Registrados</span>
                    </label>

                    {saveRecipient && (
                      <div>
                        <label className="text-[11px] font-semibold text-slate-400 mb-1 block">
                          Alias para identificar esta cuenta guardada:
                        </label>
                        <input
                          type="text"
                          placeholder="Ej. Banorte Pyme Empresa o Bitso Personal"
                          value={recipientAlias}
                          onChange={(e) => setRecipientAlias(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
                          required={saveRecipient}
                        />
                      </div>
                    )}
                  </div>

                  {/* Previsualización de Impacto en Liquidez */}
                  <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 text-xs space-y-1.5">
                    <div className="flex justify-between text-slate-400">
                      <span>Caja Líquida Actual:</span>
                      <span className="font-bold text-white">${capital.availableCashUsd.toFixed(2)} USD</span>
                    </div>
                    <div className="flex justify-between font-bold">
                      <span className="text-slate-300">Nueva Caja tras {bankTab === 'deposit' ? 'Abono' : 'Retiro'}:</span>
                      <span className={bankTab === 'deposit' ? 'text-emerald-400' : 'text-rose-400'}>
                        ${(bankTab === 'deposit'
                          ? capital.availableCashUsd + Number(amountUsd || 0)
                          : Math.max(0, capital.availableCashUsd - Number(amountUsd || 0))
                        ).toFixed(2)} USD
                      </span>
                    </div>
                  </div>

                  {/* Botón Submit */}
                  <button
                    type="submit"
                    disabled={isSubmittingBank}
                    className={`w-full py-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg transition-all ${
                      bankTab === 'deposit'
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-500/20'
                        : 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white shadow-rose-500/20'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {isSubmittingBank ? 'Procesando...' : `Confirmar ${bankTab === 'deposit' ? 'Abono de Fondos' : 'Retiro SPEI'}`}
                  </button>
                </form>
              )}

              {/* CONTENIDO PESTAÑA: DESTINATARIOS REGISTRADOS */}
              {bankTab === 'recipients' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                    <span>Cuentas y CLABEs guardadas para depósitos o retiros rápidos:</span>
                    <span className="font-semibold text-cyan-400">{recipients.length} guardadas</span>
                  </div>

                  {recipients.length === 0 ? (
                    <div className="bg-slate-950 p-8 rounded-2xl text-center text-slate-500 text-xs border border-slate-800">
                      No tienes destinatarios o cuentas bancarias guardadas aún. Marca la casilla "Guardar en destinatarios" al realizar un abono o retiro.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {recipients.map(r => (
                        <div key={r.id} className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between hover:border-slate-700 transition-all">
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-bold text-white text-sm">{r.alias}</span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-semibold">
                                {r.bank_name}
                              </span>
                            </div>
                            <p className="text-xs text-slate-300 font-medium">{r.holder_name}</p>
                            <p className="text-xs font-mono text-slate-400 mt-1">CLABE: {r.clabe_account}</p>
                          </div>

                          <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-900">
                            <button
                              onClick={() => handleSelectRecipient(r)}
                              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 underline flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Usar Cuenta
                            </button>

                            <button
                              onClick={() => handleDeleteRecipient(r.id)}
                              className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                              title="Eliminar destinatario"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* CONTENIDO PESTAÑA: HISTORIAL DE MOVIMIENTOS BANCARIOS */}
              {bankTab === 'history' && (
                <div className="space-y-3">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-bold tracking-wider border-b border-slate-800">
                        <tr>
                          <th className="p-3">Fecha / Hora</th>
                          <th className="p-3">Tipo</th>
                          <th className="p-3">Banco / Remitente</th>
                          <th className="p-3">Monto (USD)</th>
                          <th className="p-3">Monto (MXN)</th>
                          <th className="p-3">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {bankHistory.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="text-center py-6 text-slate-500 text-xs">
                              No hay registros de transferencias bancarias aún.
                            </td>
                          </tr>
                        ) : (
                          bankHistory.map(tx => (
                            <tr key={tx.id} className="hover:bg-slate-800/30 transition-colors">
                              <td className="p-3 text-slate-400 font-mono text-[11px]">
                                {new Date(tx.created_at).toLocaleString('es-MX', {
                                  day: '2-digit', month: '2-digit', year: 'numeric',
                                  hour: '2-digit', minute: '2-digit'
                                })}
                              </td>
                              <td className="p-3">
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                                  tx.transaction_type === 'deposit'
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                }`}>
                                  {tx.transaction_type === 'deposit' ? 'ABONO' : 'RETIRO'}
                                </span>
                              </td>
                              <td className="p-3 font-semibold text-white">
                                {tx.bank_name} <span className="text-slate-400 font-normal">({tx.destination_clabe?.slice(-4)})</span>
                              </td>
                              <td className="p-3 font-bold text-white">
                                ${(Number(tx.amount_usd) || 0).toFixed(2)} USD
                              </td>
                              <td className="p-3 font-semibold text-slate-300">
                                ${(Number(tx.amount_mxn) || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
                              </td>
                              <td className="p-3">
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                  COMPLETADO
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Footer del Modal */}
            <div className="pt-4 border-t border-slate-800 mt-6 flex justify-end">
              <button
                onClick={() => setBankModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all"
              >
                Cerrar Ventana
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}