"use client";

import React, { useState, useEffect } from 'react';
import { 
  Coins, 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  MessageSquare,
  ArrowUpRight,
  ArrowDownRight,
  Save,
  Plus,
  Minus,
  Settings,
  TrendingUp
} from 'lucide-react';

interface CapitalHorizon {
  id: string;
  horizon: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'semiannual' | 'annual';
  allocated_percentage: number;
  suggested_percentage_ai: number | null;
  target_roi: number;
  current_balance: number;
}

interface TradeProposal {
  id: string;
  operation_code: string;
  asset: string;
  trade_type: 'BUY' | 'SELL';
  suggested_amount: number;
  current_price: number;
  horizon: string;
  justification: string;
  status: 'pending_auto_exec' | 'executed' | 'rejected' | 'failed';
  expires_at: string;
  created_at: string;
}

interface TradeHistory {
  id: string;
  asset: string;
  trade_type: 'BUY' | 'SELL';
  horizon: string;
  executed_amount: number;
  execution_price: number;
  fees: number;
  status: 'executed' | 'rejected' | 'failed' | 'simulated';
  created_at: string;
}

interface AssetConfig {
  id: string;
  asset: string;
  rsi_threshold_buy: number;
  rsi_threshold_sell: number;
  rejection_timeout_minutes: number;
  is_active: boolean;
}

export function CryptoExchangeTab() {
  const [horizons, setHorizons] = useState<CapitalHorizon[]>([]);
  const [proposals, setProposals] = useState<TradeProposal[]>([]);
  const [history, setHistory] = useState<TradeHistory[]>([]);
  const [assetConfigs, setAssetConfigs] = useState<AssetConfig[]>([]);
  const [whatsappStatus, setWhatsappStatus] = useState<string>('disconnected');
  const [whatsappQr, setWhatsappQr] = useState<string | null>(null);
  const [botActive, setBotActive] = useState<boolean>(true);
  const [exchangeMode, setExchangeMode] = useState<string>('simulation');
  
  // States for changes
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Inversión Inicial
  const [initialCapInput, setInitialCapInput] = useState<string>('1000');
  const [isMockTriggering, setIsMockTriggering] = useState<boolean>(false);
  const [usdToMxn, setUsdToMxn] = useState<number>(17.00);
  const [timeFilter, setTimeFilter] = useState<'1D' | '1W' | '1M' | '6M' | '1Y'>('1D');
  const [historyDateSearch, setHistoryDateSearch] = useState<string>('');
  const [historyCurrentPage, setHistoryCurrentPage] = useState<number>(1);
  
  // Capital Transaction inputs
  const [selectedTxHorizon, setSelectedTxHorizon] = useState<string>('daily');
  const [txAmount, setTxAmount] = useState<string>('');
  const [txType, setTxType] = useState<'deposit' | 'withdrawal'>('deposit');
  const [isTxSaving, setIsTxSaving] = useState<boolean>(false);

  // Asset configurations inputs
  const [editingConfigs, setEditingConfigs] = useState<Record<string, Partial<AssetConfig>>>({});

  // URL base de la API del bot
  const API_BASE = process.env.NEXT_PUBLIC_CRYPTO_BOT_API_URL || 'http://localhost:3005/api';

  const fetchData = async () => {
    try {
      // 1. Obtener estado general
      const statusRes = await fetch(`${API_BASE}/status`);
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        setBotActive(statusData.botActive);
        setExchangeMode(statusData.exchangeMode);
        setWhatsappStatus(statusData.whatsapp.status);
        setWhatsappQr(statusData.whatsapp.qr);
      }

      // 2. Obtener horizontes de capital
      const horizonsRes = await fetch(`${API_BASE}/config/horizons`);
      if (horizonsRes.ok) {
        const horizonsData = await horizonsRes.json();
        setHorizons(horizonsData);
      }

      // 3. Obtener propuestas activas
      const proposalsRes = await fetch(`${API_BASE}/proposals`);
      if (proposalsRes.ok) {
        const proposalsData = await proposalsRes.json();
        setProposals(proposalsData);
      }

      // 4. Obtener historial
      const historyRes = await fetch(`${API_BASE}/history`);
      if (historyRes.ok) {
        const historyData = await historyRes.json();
        setHistory(historyData);
      }

      // 5. Obtener configuraciones de activos
      const configsRes = await fetch(`${API_BASE}/config/assets`);
      if (configsRes.ok) {
        const configsData = await configsRes.json();
        setAssetConfigs(configsData);
        
        // Initialize editing state if not set
        setEditingConfigs(prev => {
          const init: Record<string, Partial<AssetConfig>> = { ...prev };
          configsData.forEach((c: AssetConfig) => {
            if (!init[c.asset]) {
              init[c.asset] = {
                rejection_timeout_minutes: c.rejection_timeout_minutes,
                rsi_threshold_buy: c.rsi_threshold_buy,
                rsi_threshold_sell: c.rsi_threshold_sell,
                is_active: c.is_active
              };
            }
          });
          return init;
        });
      }
      
      setErrorMsg(null);
    } catch (e: any) {
      console.warn('Error al conectar con la API del bot de trading:', e.message);
      setErrorMsg('No se pudo establecer conexión con el backend de Exchange Trade en ' + API_BASE + '. Asegúrate de que el bot esté en ejecución.');
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 8000); // Refrescar cada 8 segundos

    // Obtener tasa de cambio en tiempo real
    fetch('https://open.er-api.com/v6/latest/USD')
      .then(res => res.json())
      .then(data => {
        if (data && data.rates && data.rates.MXN) {
          setUsdToMxn(Number(data.rates.MXN));
        }
      })
      .catch(e => console.warn('Error al obtener tasa USD/MXN en tiempo real:', e.message));

    return () => clearInterval(interval);
  }, []);

  const handleConnectWhatsApp = async () => {
    try {
      await fetch(`${API_BASE}/whatsapp/connect`, { method: 'POST' });
      fetchData();
    } catch (e: any) {
      alert('Error al enviar la petición de conexión de WhatsApp.');
    }
  };

  const handleSavePercentages = async () => {
    setIsSaving(true);
    setErrorMsg(null);
    try {
      const sum = horizons.reduce((acc, curr) => acc + Number(curr.allocated_percentage), 0);
      if (Math.abs(sum - 100) > 0.01) {
        throw new Error(`La suma de los porcentajes de asignación debe ser exactamente 100% (Suma actual: ${sum}%).`);
      }

      const res = await fetch(`${API_BASE}/config/horizons`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(horizons)
      });

      if (!res.ok) throw new Error('Fallo en la base de datos al guardar porcentajes.');
      alert('Configuración de capital guardada exitosamente.');
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePercentageChange = (index: number, val: number) => {
    const updated = [...horizons];
    updated[index].allocated_percentage = val;
    setHorizons(updated);
  };

  const handleApplyAISuggestion = (index: number) => {
    const updated = [...horizons];
    const suggestion = updated[index].suggested_percentage_ai;
    if (suggestion !== null) {
      updated[index].allocated_percentage = suggestion;
      setHorizons(updated);
    }
  };

  const handleApplyAllAISuggestions = () => {
    const updated = horizons.map(h => ({
      ...h,
      allocated_percentage: h.suggested_percentage_ai !== null ? h.suggested_percentage_ai : h.allocated_percentage
    }));
    setHorizons(updated);
  };

  const handleCancelProposal = async (id: string) => {
    if (!confirm('¿Rechazar esta operación programada e impedir su auto-ejecución?')) return;
    try {
      const res = await fetch(`${API_BASE}/proposals/${id}/cancel`, { method: 'POST' });
      if (res.ok) {
        alert('Operación rechazada con éxito.');
        fetchData();
      }
    } catch (e) {
      alert('Error al rechazar propuesta.');
    }
  };

  // Deposit/Withdrawal capital transaction
  const handleCapitalTx = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(txAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert('Por favor ingresa un monto mayor a 0.');
      return;
    }

    setIsTxSaving(true);
    try {
      const res = await fetch(`${API_BASE}/capital/transaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          horizon: selectedTxHorizon,
          amount: amountNum,
          transactionType: txType
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Error al procesar transacción.');
      }

      alert('Transacción procesada con éxito.');
      setTxAmount('');
      fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsTxSaving(false);
    }
  };

  // Asset config changes
  const handleConfigFieldChange = (asset: string, field: keyof AssetConfig, val: any) => {
    setEditingConfigs(prev => ({
      ...prev,
      [asset]: {
        ...prev[asset],
        [field]: val
      }
    }));
  };

  const handleSaveAssetConfig = async (asset: string) => {
    const edits = editingConfigs[asset];
    if (!edits) return;

    try {
      const res = await fetch(`${API_BASE}/config/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          asset,
          rsiThresholdBuy: edits.rsi_threshold_buy,
          rsiThresholdSell: edits.rsi_threshold_sell,
          timeoutMinutes: edits.rejection_timeout_minutes,
          isActive: edits.is_active
        })
      });

      if (!res.ok) throw new Error('Error al actualizar configuración en la base de datos.');
      alert(`Configuración de ${asset} guardada.`);
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDistributeCapital = async () => {
    const total = parseFloat(initialCapInput);
    if (isNaN(total) || total <= 0) {
      alert('Por favor ingresa un monto total de inversión inicial válido.');
      return;
    }

    const sum = horizons.reduce((acc, curr) => acc + Number(curr.allocated_percentage), 0);
    if (Math.abs(sum - 100) > 0.01) {
      alert(`No se puede distribuir. La suma de los porcentajes actuales es de ${sum.toFixed(0)}%. Debe ser exactamente 100% para distribuir de forma exacta. Puedes presionar "Aplicar Todo IA" primero si quieres.`);
      return;
    }

    setIsSaving(true);
    try {
      // Calcular balances distribuidos
      const distributedHorizons = horizons.map(hz => ({
        ...hz,
        current_balance: total * (hz.allocated_percentage / 100)
      }));

      const res = await fetch(`${API_BASE}/config/horizons`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(distributedHorizons)
      });

      if (!res.ok) throw new Error('Error al guardar horizontes en la base de datos.');
      alert(`Capital total de $${total} USD distribuido e inicializado exitosamente en los horizontes.`);
      fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTriggerMockSignal = async () => {
    setIsMockTriggering(true);
    try {
      const res = await fetch(`${API_BASE}/bot/mock-signal`, { method: 'POST' });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Error al gatillar simulación.');
      }
      const data = await res.json();
      alert(`Simulación exitosa: Propuesta de prueba ${data.proposal.operation_code} creada y notificada por WhatsApp.`);
      fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsMockTriggering(false);
    }
  };

  const calculateCryptoBalances = () => {
    const balances: Record<string, { name: string; coins: number; cost: number; currentPrice: number; valueUsd: number; profitUsd: number }> = {
      'BTC/USDT': { name: 'Bitcoin', coins: 0, cost: 0, currentPrice: 80000, valueUsd: 0, profitUsd: 0 },
      'ETH/USDT': { name: 'Ethereum', coins: 0, cost: 0, currentPrice: 2600, valueUsd: 0, profitUsd: 0 },
      'SOL/USDT': { name: 'Solana', coins: 0, cost: 0, currentPrice: 180, valueUsd: 0, profitUsd: 0 }
    };

    assetConfigs.forEach(c => {
      if (balances[c.asset]) {
        balances[c.asset].currentPrice = (c as any).current_price || balances[c.asset].currentPrice;
      }
    });

    const activeTrades = [...history]
      .filter(h => h.status === 'executed' || h.status === 'simulated')
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    activeTrades.forEach(trade => {
      const asset = trade.asset;
      if (!balances[asset]) {
        balances[asset] = { name: asset.split('/')[0], coins: 0, cost: 0, currentPrice: 1.0, valueUsd: 0, profitUsd: 0 };
      }

      const qty = trade.executed_amount / trade.execution_price;
      if (trade.trade_type === 'BUY') {
        balances[asset].coins += qty;
        balances[asset].cost += trade.executed_amount;
      } else if (trade.trade_type === 'SELL') {
        const ratio = Math.min(1, qty / (balances[asset].coins || 1));
        balances[asset].coins = Math.max(0, balances[asset].coins - qty);
        balances[asset].cost = Math.max(0, balances[asset].cost * (1 - ratio));
      }
    });

    let totalInvestmentValue = 0;
    let totalProfit = 0;

    Object.keys(balances).forEach(key => {
      const b = balances[key];
      b.valueUsd = b.coins * b.currentPrice;
      b.profitUsd = b.coins > 0 ? (b.valueUsd - b.cost) : 0;
      totalInvestmentValue += b.valueUsd;
      totalProfit += b.profitUsd;
    });

    return { balances, totalInvestmentValue, totalProfit };
  };

  const getHorizonDynamicBalance = (horizonName: string, cashBalance: number) => {
    const hName = horizonName.toLowerCase();
    let cryptoValue = 0;
    
    // Group active trades by asset for this horizon
    const hTrades = history
      .filter(h => (h.status === 'executed' || h.status === 'simulated') && h.horizon.toLowerCase() === hName)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    const pos: Record<string, { coins: number }> = {};
    hTrades.forEach(t => {
      const qty = t.executed_amount / t.execution_price;
      if (!pos[t.asset]) pos[t.asset] = { coins: 0 };
      if (t.trade_type === 'BUY') {
        pos[t.asset].coins += qty;
      } else if (t.trade_type === 'SELL') {
        pos[t.asset].coins = Math.max(0, pos[t.asset].coins - qty);
      }
    });

    Object.keys(pos).forEach(asset => {
      const coins = pos[asset].coins;
      const currentPrice = (assetConfigs.find(c => c.asset === asset) as any)?.current_price || (asset.includes('BTC') ? 80000 : asset.includes('ETH') ? 2600 : 180);
      cryptoValue += coins * currentPrice;
    });

    return cashBalance + cryptoValue;
  };

  // Filtrar historial de transacciones según el rango de tiempo seleccionado
  const filterHistoryByTime = () => {
    const now = new Date().getTime();
    let limitMs = 24 * 60 * 60 * 1000; // 1D por defecto
    if (timeFilter === '1W') limitMs = 7 * 24 * 60 * 60 * 1000;
    else if (timeFilter === '1M') limitMs = 30 * 24 * 60 * 60 * 1000;
    else if (timeFilter === '6M') limitMs = 180 * 24 * 60 * 60 * 1000;
    else if (timeFilter === '1Y') limitMs = 365 * 24 * 60 * 60 * 1000;

    return history.filter(h => {
      const tradeTime = new Date(h.created_at).getTime();
      return (now - tradeTime) <= limitMs;
    });
  };

  // Custom SVG Chart points calculation
  const getChartPoints = () => {
    const { totalInvestmentValue, totalProfit } = calculateCryptoBalances();
    const totalCashCapital = horizons.reduce((acc, curr) => acc + curr.current_balance, 0);
    const realTimeTotalCapital = totalCashCapital + totalInvestmentValue;

    const filtered = filterHistoryByTime()
      .filter(h => h.status === 'executed' || h.status === 'simulated')
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    let points: number[] = [];
    
    if (filtered.length === 0) {
      // Si no hay operaciones en ese periodo, generamos una curva premium representativa del balance actual
      const base = realTimeTotalCapital || 1000;
      for (let i = 0; i < 15; i++) {
        const angle = (i / 14) * Math.PI * 2.5;
        const variation = Math.sin(angle * 2.1) * (base * 0.009) + (i * base * 0.0006);
        points.push(base - (base * 0.015) + variation);
      }
    } else {
      let accum = realTimeTotalCapital - totalProfit;
      points.push(accum);
      filtered.forEach(h => {
        const isProfit = h.trade_type === 'SELL';
        const delta = isProfit ? h.executed_amount * 0.048 : -h.executed_amount * 0.015;
        accum += delta;
        points.push(accum);
      });
    }

    const min = Math.min(...points);
    const max = Math.max(...points);
    const range = max - min || 1;
    
    const width = 400;
    const height = 100;
    const step = width / (points.length - 1);
    
    return points.map((val, idx) => {
      const x = idx * step;
      const y = height - ((val - min) / range) * (height - 20) - 10;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  };

  // Calculate Net Profit
  const { balances, totalInvestmentValue, totalProfit } = calculateCryptoBalances();
  const totalCashCapital = horizons.reduce((acc, curr) => acc + curr.current_balance, 0);
  const realTimeTotalCapital = totalCashCapital + totalInvestmentValue;
  const netProfit = totalProfit;
  const pendingProposals = proposals.filter(p => p.status === 'pending_auto_exec');

  return (
    <div className="space-y-6">
      {/* Alert Error */}
      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-start gap-2.5 text-sm">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-red-500 mt-0.5" />
          <div>
            <strong className="font-semibold">Backend desconectado:</strong> {errorMsg}
          </div>
        </div>
      )}

      {/* Info Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-150 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-3xs font-bold text-gray-400 uppercase tracking-wider">Estado General</p>
            <h3 className="text-xs font-bold text-gray-800 mt-1">
              {botActive ? '🟢 Monitoreo Activo' : '🔴 Bot Inactivo'}
            </h3>
          </div>
          <Activity className={`w-6 h-6 ${botActive ? 'text-emerald-500 animate-pulse' : 'text-gray-400'}`} />
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-150 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-3xs font-bold text-gray-400 uppercase tracking-wider">Modo de Operación</p>
            <h3 className="text-xs font-bold text-gray-800 mt-1 capitalize">
              {exchangeMode === 'simulation' ? '⚡ Simulación / Sandbox' : '💰 Real en Vivo'}
            </h3>
          </div>
          <Coins className="w-6 h-6 text-amber-500" />
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-150 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-3xs font-bold text-gray-400 uppercase tracking-wider">WhatsApp (Baileys)</p>
            <h3 className="text-xs font-bold text-gray-800 mt-1 uppercase">
              {whatsappStatus}
            </h3>
          </div>
          <MessageSquare className={`w-6 h-6 ${whatsappStatus === 'connected' ? 'text-emerald-500' : 'text-amber-500'}`} />
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-150 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-3xs font-bold text-gray-400 uppercase tracking-wider">Tasa de conversión</p>
            <h3 className="text-xs font-bold text-gray-800 mt-1">
              💵 ${usdToMxn.toFixed(3)} MXN
            </h3>
            <p className="text-[9px] font-bold text-gray-400 mt-0.5">
              C: ${(usdToMxn - 0.015).toFixed(3)} | V: ${(usdToMxn + 0.015).toFixed(3)}
            </p>
          </div>
          <TrendingUp className="w-6 h-6 text-emerald-500" />
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-150 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-3xs font-bold text-gray-400 uppercase tracking-wider">Capital Neto Consolidado</p>
            <h3 className="text-xs font-bold text-gray-800 mt-1">
              ${realTimeTotalCapital.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
            </h3>
            <p className="text-[9px] font-bold text-gray-455 mt-0.5">
              ≈ ${(realTimeTotalCapital * usdToMxn).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN
            </p>
          </div>
          <TrendingUp className="w-6 h-6 text-primary-600" />
        </div>
      </div>

      {/* Performance Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Metric SVG Chart */}
        <div className="bg-white p-6 rounded-xl border border-gray-150 shadow-sm col-span-2 space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-gray-100">
            <div>
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-500" /> Rendimiento Acumulado Cripto
              </h2>
              <p className="text-2xs text-gray-400 mt-0.5">Ganancias y pérdidas del portafolio en tiempo real.</p>
            </div>
            
            <div className="text-right">
              <span className={`text-xs font-extrabold flex items-center justify-end gap-0.5 ${netProfit >= 0 ? 'text-emerald-600' : 'text-red-650'}`}>
                {netProfit >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                {netProfit >= 0 ? '+' : ''}${netProfit.toFixed(2)} USD
              </span>
              <span className="block text-[9px] text-gray-400 font-bold">
                ≈ {netProfit >= 0 ? '+' : ''}${(netProfit * usdToMxn).toFixed(2)} MXN
              </span>
            </div>
          </div>

          {(() => {
            const yMax = netProfit !== 0 ? (realTimeTotalCapital + Math.abs(netProfit) * 0.15) : (realTimeTotalCapital * 1.005);
            const yMin = netProfit !== 0 ? Math.max(0, realTimeTotalCapital - Math.abs(netProfit) * 0.15) : (realTimeTotalCapital * 0.995);
            const yMid = (yMax + yMin) / 2;
            const yUpperMid = yMax - (yMax - yMin) * 0.25;
            const yLowerMid = yMax - (yMax - yMin) * 0.75;

            return (
              <div className="bg-gradient-to-b from-emerald-50/5 to-white border border-gray-150 rounded-xl p-4 relative flex flex-col justify-between">
                {/* Eje Y: Dinámico (Foto 3 format) */}
                <div className="absolute left-3 top-4 bottom-14 flex flex-col justify-between text-[9px] font-bold font-mono text-gray-400 select-none pointer-events-none z-10 border-r border-gray-100 pr-2">
                  <span>${yMax.toLocaleString(undefined, { maximumFractionDigits: 1 })}</span>
                  <span>${yUpperMid.toLocaleString(undefined, { maximumFractionDigits: 1 })}</span>
                  <span>${yMid.toLocaleString(undefined, { maximumFractionDigits: 1 })}</span>
                  <span>${yLowerMid.toLocaleString(undefined, { maximumFractionDigits: 1 })}</span>
                  <span>${yMin.toLocaleString(undefined, { maximumFractionDigits: 1 })}</span>
                </div>

                <div className="w-full h-28 pl-14 pr-2 flex items-end">
                  <svg viewBox="0 0 400 100" className="w-full h-full overflow-visible" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    {/* Fill Area */}
                    <path
                      d={`M 0,100 L ${getChartPoints()} L 400,100 Z`}
                      fill="url(#chartGrad)"
                    />
                    {/* Line (Foto 3 style) */}
                    <polyline
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="2.5"
                      points={getChartPoints()}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>

                {/* Eje X / Selector de rango de tiempo (Foto 3 style) */}
                <div className="flex justify-center items-center gap-6 pt-3 mt-2 border-t border-gray-100 select-none">
                  {([
                    { key: '1D', label: '1D' },
                    { key: '1W', label: '1S' },
                    { key: '1M', label: '1M' },
                    { key: '6M', label: '6M' },
                    { key: '1Y', label: '1A' }
                  ] as const).map(f => (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => setTimeFilter(f.key)}
                      className={`px-3 py-0.5 text-[10px] font-extrabold transition-all uppercase ${
                        timeFilter === f.key 
                          ? 'bg-gray-150 text-gray-800 rounded-full shadow-3xs' 
                          : 'text-gray-400 hover:text-gray-700'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>

        {/* Transaction Panel (Deposit/Withdrawal) */}
        <div className="bg-white p-6 rounded-xl border border-gray-150 shadow-sm space-y-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Modificar Capital</h2>
            <p className="text-xs text-gray-500 mt-0.5">Ingresa o retira fondos de cualquier horizonte de inversión.</p>
          </div>

          <form onSubmit={handleCapitalTx} className="space-y-3.5">
            <div>
              <label className="block text-2xs font-bold text-gray-500 uppercase mb-1">Plazo / Horizonte</label>
              <select
                value={selectedTxHorizon}
                onChange={(e) => setSelectedTxHorizon(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white"
              >
                {horizons.map(h => (
                  <option key={h.id} value={h.horizon}>
                    {h.horizon.toUpperCase()} (${h.current_balance.toFixed(0)} USD / ${(h.current_balance * usdToMxn).toFixed(0)} MXN)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-2xs font-bold text-gray-500 uppercase mb-1">Monto (USD)</label>
              <div className="relative rounded-lg shadow-sm">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <span className="text-gray-500 text-sm">$</span>
                </div>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={txAmount}
                  onChange={(e) => setTxAmount(e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 pl-7 pr-3 py-2 text-sm text-gray-900 focus:border-primary-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTxType('deposit')}
                className={`py-2 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                  txType === 'deposit' 
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800' 
                    : 'bg-white border-gray-250 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Plus className="w-3.5 h-3.5" /> Depositar
              </button>
              <button
                type="button"
                onClick={() => setTxType('withdrawal')}
                className={`py-2 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                  txType === 'withdrawal' 
                    ? 'bg-red-50 border-red-300 text-red-800' 
                    : 'bg-white border-gray-250 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Minus className="w-3.5 h-3.5" /> Retirar
              </button>
            </div>

            <button
              type="submit"
              disabled={isTxSaving}
              className="w-full bg-primary-700 hover:bg-primary-850 text-white font-bold py-2.5 px-4 rounded-lg transition-colors text-sm shadow-sm disabled:opacity-50"
            >
              {isTxSaving ? 'Procesando...' : `Confirmar ${txType === 'deposit' ? 'Depósito' : 'Retiro'}`}
            </button>
          </form>
        </div>
      </div>

      {/* Main Grid: Horizons & WhatsApp link (Shortened vertical alignment) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left 2 cols: Horizons Distribution */}
        <div className="bg-white p-6 rounded-xl border border-gray-150 shadow-sm lg:col-span-2 space-y-6 h-fit">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Distribución de Capital por Plazos</h2>
              <p className="text-sm text-gray-500 mt-1">
                Asigna qué porcentaje (%) de tus fondos totales opera en cada horizonte de tiempo.
              </p>
            </div>
            <button
              onClick={handleApplyAllAISuggestions}
              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold py-1.5 px-3 rounded-lg border border-emerald-200/50 transition-colors shadow-sm"
            >
              Aplicar Todo IA
            </button>
          </div>

          {/* Inicialización de Capital Inicial Consolidado */}
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-150 flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
                Inicializar Capital Total de Simulación
              </label>
              <p className="text-2xs text-gray-400">
                Define el monto total y repártelo automáticamente según los porcentajes (%) activos.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative rounded-md shadow-sm w-36">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <span className="text-gray-500 text-xs font-bold">$</span>
                </div>
                <input
                  type="number"
                  min="0"
                  placeholder="Ej: 1000.00"
                  value={initialCapInput}
                  onChange={(e) => setInitialCapInput(e.target.value)}
                  className="block w-full rounded-md border border-gray-300 pl-7 pr-12 py-1.5 text-xs focus:border-primary-500 focus:ring-primary-500 text-gray-900 font-bold"
                />
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                  <span className="text-gray-500 text-2xs font-bold">USD</span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleDistributeCapital}
                className="bg-primary-700 hover:bg-primary-850 text-white text-xs font-bold py-2 px-4 rounded-lg transition-colors shadow-sm"
              >
                Distribuir
              </button>
            </div>
          </div>

          <div className="overflow-x-auto pt-2">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="pb-2">Horizonte</th>
                  <th className="pb-2">Balance Real (USD / MXN)</th>
                  <th className="pb-2 text-center w-24">Porcentaje</th>
                  <th className="pb-2 text-center">Sugerencia IA</th>
                  <th className="pb-2 text-right">Target ROI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {horizons.map((hz, idx) => {
                  const dynBalance = getHorizonDynamicBalance(hz.horizon, hz.current_balance);
                  return (
                    <tr key={hz.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-2.5 font-bold text-primary-900 uppercase text-3xs tracking-wider">
                        {hz.horizon}
                      </td>
                      <td className="py-2.5">
                        <strong className="text-gray-800 text-2xs font-bold">${dynBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD</strong>
                        <span className="text-gray-400 font-medium block text-[9px] mt-0.5">≈ ${(dynBalance * usdToMxn).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN</span>
                      </td>
                      <td className="py-2.5 text-center">
                        <div className="relative rounded-md shadow-sm inline-flex w-16">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="1"
                            value={hz.allocated_percentage}
                            onChange={(e) => handlePercentageChange(idx, parseFloat(e.target.value) || 0)}
                            className="block w-full rounded-md border border-gray-300 px-1 py-1 pr-5 text-center text-3xs text-gray-900 font-bold"
                          />
                          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-1.5">
                            <span className="text-gray-400 text-[9px] font-bold">%</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 text-center">
                        {hz.suggested_percentage_ai !== null ? (
                          <button
                            type="button"
                            onClick={() => handleApplyAISuggestion(idx)}
                            className="bg-emerald-50 hover:bg-emerald-100 border border-emerald-150 text-emerald-800 font-extrabold px-1.5 py-0.5 rounded text-[9px] transition-all"
                          >
                            ✨ {hz.suggested_percentage_ai}%
                          </button>
                        ) : (
                          <span className="text-gray-300 font-medium text-3xs">-</span>
                        )}
                      </td>
                      <td className="py-2.5 text-right font-bold text-gray-500 text-[10px]">
                        +{hz.target_roi}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-center pt-3 border-t border-gray-100">
            <div className="text-xs text-gray-500">
              Suma Total: <strong className={`${
                Math.abs(horizons.reduce((s, h) => s + h.allocated_percentage, 0) - 100) < 0.01 
                  ? 'text-emerald-600' : 'text-red-500'
              }`}>{horizons.reduce((s, h) => s + h.allocated_percentage, 0).toFixed(0)}% / 100%</strong>
            </div>
            <button
              onClick={handleSavePercentages}
              disabled={isSaving}
              className="bg-primary-700 hover:bg-primary-850 text-white text-sm font-bold px-4 py-2 rounded-lg transition-colors disabled:opacity-50 shadow-sm flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" /> {isSaving ? 'Guardando...' : 'Guardar Distribución'}
            </button>
          </div>
        </div>

        {/* Right col: WhatsApp Connection card */}
        <div className="bg-white p-6 rounded-xl border border-gray-150 shadow-sm space-y-4 h-fit">
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-1.5">
              💬 Enlace de WhatsApp
            </h2>
            <p className="text-2xs text-gray-450 mt-0.5">Vincule su número de WhatsApp de administrador para recibir alertas.</p>
          </div>
          
          <div className="bg-gray-50 p-3.5 rounded-lg border border-gray-100 space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-500 font-medium">Estado:</span>
              <span className={`px-2 py-0.5 rounded font-bold uppercase text-3xs ${
                whatsappStatus === 'connected' ? 'bg-emerald-100 text-emerald-800' :
                whatsappStatus === 'qr_ready' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
              }`}>
                {whatsappStatus}
              </span>
            </div>

            {whatsappStatus === 'disconnected' && (
              <button
                onClick={handleConnectWhatsApp}
                className="w-full bg-primary-700 hover:bg-primary-850 text-white font-bold py-2 px-3 rounded-lg transition-colors text-xs shadow-sm"
              >
                Generar Código QR
              </button>
            )}

            {whatsappStatus === 'qr_ready' && whatsappQr && (
              <div className="space-y-2 text-center">
                <p className="text-3xs text-gray-500">Escanea desde tu app de WhatsApp:</p>
                <div className="bg-white p-2 rounded border border-gray-200 inline-block">
                  {whatsappQr.startsWith('data:image') ? (
                    <img src={whatsappQr} alt="QR Code" className="w-36 h-36 mx-auto" />
                  ) : (
                    <div className="w-36 h-36 flex items-center justify-center text-xs text-gray-500 font-mono">
                      [QR en Servidor]
                    </div>
                  )}
                </div>
              </div>
            )}

            {whatsappStatus === 'connected' && (
              <div className="text-emerald-855 text-3xs leading-relaxed bg-emerald-50 p-2.5 rounded border border-emerald-150">
                ✔ <strong>Línea Vinculada.</strong> Recibirás alertas con expiración configurable para cancelar o auto-ejecutar.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Grid 3: Wallets & Bot Parameters (Horizontal Layout) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Tus Criptomonedas (span 1) */}
        <div className="bg-white p-6 rounded-xl border border-gray-150 shadow-sm space-y-4 h-fit">
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-1.5">
              💼 Tus Criptomonedas
            </h2>
            <p className="text-2xs text-gray-450 mt-0.5">Capital invertido y rendimiento de tus activos en tiempo real.</p>
          </div>
          
          <div className="space-y-3">
            {Object.keys(balances).map(key => {
              const b = balances[key];
              return (
                <div key={key} className="flex justify-between items-center py-2.5 border-b border-gray-100 last:border-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary-50 border border-primary-100 flex items-center justify-center font-bold text-xs text-primary-750">
                      {key.split('/')[0]}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-800">{b.name}</p>
                      <p className="text-3xs text-gray-455 font-mono">
                        {b.coins.toFixed(6)} {key.split('/')[0]}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-gray-800">
                      ${b.valueUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                    </p>
                    <p className="text-3xs text-gray-455 mt-0.5">
                      ≈ ${(b.valueUsd * usdToMxn).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN
                    </p>
                    {b.coins > 0 && (
                      <p className={`text-3xs font-bold mt-0.5 ${b.profitUsd >= 0 ? 'text-emerald-600' : 'text-red-650'}`}>
                        {b.profitUsd >= 0 ? '▲ +' : '▼ '}${b.profitUsd.toFixed(2)} USD
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Parámetros del Bot (span 2) */}
        <div className="bg-white p-6 rounded-xl border border-gray-150 shadow-sm lg:col-span-2 space-y-4 h-fit">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-gray-100">
            <div>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-1.5">
                <Settings className="w-5 h-5 text-gray-600" /> Parámetros del Bot
              </h2>
              <p className="text-2xs text-gray-455 mt-0.5">
                Controla las alertas de compra/venta y la cuenta regresiva de ejecución pasiva (Base: 5 min).
              </p>
            </div>

            {/* Botón de simulación manual para pruebas */}
            <div className="bg-amber-50/70 p-2.5 rounded-lg border border-amber-200/50 flex items-center justify-between gap-3 max-w-sm">
              <div className="space-y-0.5">
                <h4 className="text-[10px] font-bold text-amber-850 flex items-center gap-1">
                  🧪 Simulación de Flujo
                </h4>
                <p className="text-[9px] text-amber-700 leading-tight">
                  Gatilla propuestas simuladas para BTC, ETH y SOL a la vez.
                </p>
              </div>
              <button
                type="button"
                onClick={handleTriggerMockSignal}
                disabled={isMockTriggering}
                className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-extrabold py-1.5 px-3 rounded-md transition-all text-3xs shadow-sm flex-shrink-0"
              >
                {isMockTriggering ? 'Simulando...' : 'Forzar Compra de los 3'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
            {assetConfigs.map(c => {
              const edit = editingConfigs[c.asset] || {};
              return (
                <div key={c.id} className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex flex-col justify-between space-y-3">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center border-b border-gray-200 pb-1.5">
                      <span className="font-bold text-gray-800 text-xs">{c.asset}</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={edit.is_active ?? c.is_active}
                          onChange={(e) => handleConfigFieldChange(c.asset, 'is_active', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-8 h-4 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-500"></div>
                        <span className="ml-1.5 text-[9px] font-extrabold text-gray-500 uppercase">
                          {(edit.is_active ?? c.is_active) ? 'Activo' : 'Pausa'}
                        </span>
                      </label>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5">
                      <div>
                        <label className="block text-[8px] font-bold text-gray-400 uppercase mb-0.5">Expira (Min)</label>
                        <input
                          type="number"
                          min="1"
                          value={edit.rejection_timeout_minutes ?? c.rejection_timeout_minutes}
                          onChange={(e) => handleConfigFieldChange(c.asset, 'rejection_timeout_minutes', parseInt(e.target.value) || 5)}
                          className="w-full text-3xs border border-gray-300 rounded px-1.5 py-0.5 bg-white font-mono text-gray-800 text-center font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[8px] font-bold text-gray-400 uppercase mb-0.5">Compra (RSI)</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={edit.rsi_threshold_buy ?? c.rsi_threshold_buy}
                          onChange={(e) => handleConfigFieldChange(c.asset, 'rsi_threshold_buy', parseFloat(e.target.value) || 30)}
                          className="w-full text-3xs border border-gray-300 rounded px-1.5 py-0.5 bg-white font-mono text-gray-800 text-center font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[8px] font-bold text-gray-400 uppercase mb-0.5">Venta (RSI)</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={edit.rsi_threshold_sell ?? c.rsi_threshold_sell}
                          onChange={(e) => handleConfigFieldChange(c.asset, 'rsi_threshold_sell', parseFloat(e.target.value) || 70)}
                          className="w-full text-3xs border border-gray-300 rounded px-1.5 py-0.5 bg-white font-mono text-gray-800 text-center font-bold"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleSaveAssetConfig(c.asset)}
                    className="w-full bg-white hover:bg-gray-150 text-gray-700 border border-gray-250 py-1 px-3 rounded-lg text-3xs font-extrabold transition-all shadow-3xs"
                  >
                    Guardar Parámetros
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Table Proposals */}
      <div className="bg-white p-6 rounded-xl border border-gray-150 shadow-sm space-y-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Operaciones en Cuenta Regresiva de Aprobación Pasiva</h2>
          <p className="text-sm text-gray-500 mt-1">
            Estas operaciones se realizarán en el Exchange automáticamente al expirar el tiempo, a menos que las rechaces.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500 font-semibold text-xs">
                <th className="py-3 px-2">Código</th>
                <th className="py-3 px-2">Activo</th>
                <th className="py-3 px-2">Tipo</th>
                <th className="py-3 px-2">Monto</th>
                <th className="py-3 px-2">Precio sugerido</th>
                <th className="py-3 px-2">Horizonte</th>
                <th className="py-3 px-2">Expira a las</th>
                <th className="py-3 px-2">Estatus</th>
                <th className="py-3 px-2 text-right">Acción</th>
              </tr>
            </thead>
            <tbody>
              {pendingProposals.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-gray-400 font-medium">
                    No hay propuestas pendientes de ejecución en este momento.
                  </td>
                </tr>
              ) : (
                pendingProposals.map((p) => {
                  const msLeft = new Date(p.expires_at).getTime() - Date.now();
                  const minLeft = Math.max(0, Math.round(msLeft / 60000));
                  return (
                    <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50/50 text-xs">
                      <td className="py-3.5 px-2 font-bold text-gray-800">{p.operation_code}</td>
                      <td className="py-3.5 px-2 font-medium">{p.asset}</td>
                      <td className="py-3.5 px-2">
                        <span className={`font-bold ${p.trade_type === 'BUY' ? 'text-emerald-600' : 'text-red-600'}`}>
                          {p.trade_type === 'BUY' ? 'COMPRAR' : 'VENDER'}
                        </span>
                      </td>
                      <td className="py-3.5 px-2 font-medium">${p.suggested_amount.toFixed(2)} USD</td>
                      <td className="py-3.5 px-2 text-gray-600">${p.current_price.toFixed(2)}</td>
                      <td className="py-3.5 px-2 uppercase font-semibold text-xs text-gray-500">{p.horizon}</td>
                      <td className="py-3.5 px-2 text-gray-500">
                        {new Date(p.expires_at).toLocaleTimeString()} ({minLeft} min restantes)
                      </td>
                      <td className="py-3.5 px-2">
                        <span className={`px-2 py-0.5 rounded-full text-3xs font-bold uppercase ${
                          p.status === 'pending_auto_exec' ? 'bg-amber-100 text-amber-800' :
                          p.status === 'executed' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-2 text-right">
                        {p.status === 'pending_auto_exec' && (
                          <button
                            onClick={() => handleCancelProposal(p.id)}
                            className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200/50 text-xs font-bold py-1 px-3 rounded-lg transition-colors shadow-sm"
                          >
                            Rechazar
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Historial de Operaciones Realizadas (Foto 2 format) */}
      <div className="bg-white p-6 rounded-xl border border-gray-150 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Historial de Operaciones</h2>
            <p className="text-sm text-gray-500 mt-1">
              Registro completo de compras y ventas cerradas en la cuenta de simulación con sus montos en USD y MXN.
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-2xs font-bold text-gray-500 uppercase tracking-wider">Filtrar por fecha:</span>
            <input
              type="date"
              value={historyDateSearch}
              onChange={(e) => {
                setHistoryDateSearch(e.target.value);
                setHistoryCurrentPage(1);
              }}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-950 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 bg-white font-semibold"
            />
            {historyDateSearch && (
              <button
                type="button"
                onClick={() => {
                  setHistoryDateSearch('');
                  setHistoryCurrentPage(1);
                }}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold py-1.5 px-3 rounded-lg border border-gray-250 transition-colors shadow-3xs"
              >
                Limpiar
              </button>
            )}
          </div>
        </div>

        {(() => {
          const itemsPerPage = 10;
          const filtered = [...history]
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .filter(h => {
              if (!historyDateSearch) return true;
              const hDate = new Date(h.created_at).toISOString().split('T')[0];
              return hDate === historyDateSearch;
            });

          const totalItems = filtered.length;
          const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
          const currentPage = Math.min(historyCurrentPage, totalPages);
          const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

          return (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 text-gray-500 font-semibold text-xs">
                      <th className="py-3 px-2">Activo</th>
                      <th className="py-3 px-2">Tipo</th>
                      <th className="py-3 px-2">Monto (USD)</th>
                      <th className="py-3 px-2">Monto (MXN)</th>
                      <th className="py-3 px-2">Precio de Ejecución</th>
                      <th className="py-3 px-2">Plazo</th>
                      <th className="py-3 px-2">Fecha</th>
                      <th className="py-3 px-2">Estatus</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-gray-400 font-medium">
                          No se encontraron operaciones en el historial.
                        </td>
                      </tr>
                    ) : (
                      paginated.map((h) => (
                        <tr key={h.id} className="border-b border-gray-100 hover:bg-gray-50/50 text-xs">
                          <td className="py-3.5 px-2 font-bold text-gray-800">{h.asset}</td>
                          <td className="py-3.5 px-2">
                            <span className={`font-bold ${h.trade_type === 'BUY' ? 'text-emerald-600' : 'text-red-650'}`}>
                              {h.trade_type === 'BUY' ? 'COMPRA' : 'VENTA'}
                            </span>
                          </td>
                          <td className={`py-3.5 px-2 font-semibold ${h.trade_type === 'BUY' ? 'text-red-600' : 'text-emerald-600'}`}>
                            {h.trade_type === 'BUY' ? '-' : '+'}${h.executed_amount.toFixed(2)} USD
                          </td>
                          <td className={`py-3.5 px-2 font-bold ${h.trade_type === 'BUY' ? 'text-red-400' : 'text-emerald-500'}`}>
                            {h.trade_type === 'BUY' ? '-' : '+'}${(h.executed_amount * usdToMxn).toFixed(2)} MXN
                          </td>
                          <td className="py-3.5 px-2 font-mono text-gray-650">
                            ${h.execution_price.toLocaleString(undefined, { minimumFractionDigits: 2 })} USD
                          </td>
                          <td className="py-3.5 px-2 uppercase font-semibold text-[10px] text-gray-400">{h.horizon}</td>
                          <td className="py-3.5 px-2 text-gray-500">
                            {new Date(h.created_at).toLocaleString()}
                          </td>
                          <td className="py-3.5 px-2">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                              h.status === 'executed' || h.status === 'simulated' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {h.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <span className="text-xs text-gray-500 font-medium">
                    Mostrando del <strong>{((currentPage - 1) * itemsPerPage) + 1}</strong> al <strong>{Math.min(currentPage * itemsPerPage, totalItems)}</strong> de <strong>{totalItems}</strong> operaciones
                  </span>
                  
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={currentPage === 1}
                      onClick={() => setHistoryCurrentPage(prev => Math.max(1, prev - 1))}
                      className="bg-white hover:bg-gray-50 disabled:opacity-50 text-gray-700 border border-gray-250 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-3xs"
                    >
                      Anterior
                    </button>
                    <span className="text-xs font-bold text-gray-700 px-1 font-mono">
                      Pág. {currentPage} de {totalPages}
                    </span>
                    <button
                      type="button"
                      disabled={currentPage === totalPages}
                      onClick={() => setHistoryCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      className="bg-white hover:bg-gray-50 disabled:opacity-50 text-gray-700 border border-gray-250 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-3xs"
                    >
                      Siguiente
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
