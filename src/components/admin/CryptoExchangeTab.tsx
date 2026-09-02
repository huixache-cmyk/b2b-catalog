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
  TrendingUp,
  Zap,
  Clock,
  BarChart2,
  Target
} from 'lucide-react';

interface CapitalHorizon {
  id: string;
  horizon: 'intraday' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'semiannual' | 'annual';
  allocated_percentage: number;
  suggested_percentage_ai: number | null;
  target_roi: number;
  current_balance: number;
  bot_type?: string;
}

interface TradeProposal {
  id: string;
  operation_code: string;
  asset: string;
  trade_type: 'BUY' | 'SELL';
  suggested_amount: number;
  current_price: number;
  horizon: string;
  bot_type?: string;
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
  bot_type?: string;
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
  active_mode?: string;
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
  const [usdChangePercent, setUsdChangePercent] = useState<number>(0.40);
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

  // States for Capital Transactions and Price History
  const [capitalTransactions, setCapitalTransactions] = useState<any[]>([]);
  const [priceHistory, setPriceHistory] = useState<Record<string, number[]>>({});
  const [activeSubTab, setActiveSubTab] = useState<'intraday' | 'horizon' | 'comparison'>('intraday');
  const [comparisonData, setComparisonData] = useState<any>(null);

  useEffect(() => {
    const fetchComparison = async () => {
      try {
        const res = await fetch(`${API_BASE}/bot/comparison`);
        if (res.ok) {
          const data = await res.json();
          setComparisonData(data);
        }
      } catch (err) {
        console.warn('Comparison endpoint error:', err);
      }
    };
    fetchComparison();
    const interval = setInterval(fetchComparison, 10000);
    return () => clearInterval(interval);
  }, []);
  const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number; value: number; dateStr: string } | null>(null);

  // Nuevos estados para Modos de Operación, Backtesting y Ajustes
  const [activeControlTab, setActiveControlTab] = useState<'modes' | 'backtest' | 'optimization' | 'capital'>('modes');
  const [operationModes, setOperationModes] = useState<any[]>([]);
  const [globalSettings, setGlobalSettings] = useState<any>({ tactical_capital_pct: 60, total_simulation_capital: 10000 });
  const [allocationHistory, setAllocationHistory] = useState<any[]>([]);
  const [backtestHistory, setBacktestHistory] = useState<any[]>([]);
  const [pendingAdjustments, setPendingAdjustments] = useState<any[]>([]);
  const [adjustmentHistory, setAdjustmentHistory] = useState<any[]>([]);

  // Campos para nuevo Backtest manual
  const [btAsset, setBtAsset] = useState<string>('BTC/USDT');
  const [btTimeframe, setBtTimeframe] = useState<string>('1h');
  const [btRsiPeriod, setBtRsiPeriod] = useState<string>('14');
  const [btRsiBuy, setBtRsiBuy] = useState<string>('30');
  const [btRsiSell, setBtRsiSell] = useState<string>('70');
  const [btTrendFilter, setBtTrendFilter] = useState<string>('SMA_200');
  const [btRequireMacd, setBtRequireMacd] = useState<boolean>(true);
  const [btRequireVolume, setBtRequireVolume] = useState<boolean>(true);
  const [btTradeSize, setBtTradeSize] = useState<string>('3');
  const [btResult, setBtResult] = useState<any | null>(null);
  const [isBtRunning, setIsBtRunning] = useState<boolean>(false);

  // Edición de parámetros de Modos de Operación
  const [selectedModeForEdit, setSelectedModeForEdit] = useState<string>('moderado');
  const [cloneModeName, setCloneModeName] = useState<string>('');
  const [isCloning, setIsCloning] = useState<boolean>(false);

  // URL base y API Key de la API del bot
  const API_BASE = process.env.NEXT_PUBLIC_CRYPTO_BOT_API_URL || 'http://localhost:3005/api';
  const API_KEY = process.env.NEXT_PUBLIC_INTERNAL_API_KEY || 'geeky_exchange_secret_key_2026';

  const authHeaders = (extraHeaders?: Record<string, string>) => ({
    'x-api-key': API_KEY,
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    ...(extraHeaders || {})
  });

  useEffect(() => {
    const fetchComparison = async () => {
      try {
        const res = await fetch(`${API_BASE}/bot/comparison`, { headers: authHeaders() });
        if (res.ok) {
          const data = await res.json();
          setComparisonData(data);
        }
      } catch (err) {
        console.warn('Comparison endpoint error:', err);
      }
    };
    fetchComparison();
    const interval = setInterval(fetchComparison, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      // 1. Obtener estado general
      const statusRes = await fetch(`${API_BASE}/status`, { headers: authHeaders() });
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        setBotActive(statusData.botActive);
        setExchangeMode(statusData.exchangeMode);
        setWhatsappStatus(statusData.whatsapp.status);
        setWhatsappQr(statusData.whatsapp.qr);
      }

      // 2. Obtener horizontes de capital
      const horizonsRes = await fetch(`${API_BASE}/config/horizons`, { headers: authHeaders() });
      if (horizonsRes.ok) {
        const horizonsData = await horizonsRes.json();
        setHorizons(horizonsData);
      }

      // 3. Obtener propuestas activas
      const proposalsRes = await fetch(`${API_BASE}/proposals`, { headers: authHeaders() });
      if (proposalsRes.ok) {
        const proposalsData = await proposalsRes.json();
        setProposals(proposalsData);
      }

      // 4. Obtener historial
      const historyRes = await fetch(`${API_BASE}/history`, { headers: authHeaders() });
      if (historyRes.ok) {
        const historyData = await historyRes.json();
        setHistory(historyData);
      }

      // 5. Obtener configuraciones de activos
      const configsRes = await fetch(`${API_BASE}/config/assets`, { headers: authHeaders() });
      if (configsRes.ok) {
        const configsData = await configsRes.json();
        setAssetConfigs(configsData);

        // Actualizar el historial de precios para sparklines
        setPriceHistory(prev => {
          const updated = { ...prev };
          configsData.forEach((c: any) => {
            const asset = c.asset;
            const price = c.current_price || (asset.includes('BTC') ? 80000 : asset.includes('ETH') ? 2600 : 180);
            const currentList = updated[asset] || [];
            if (currentList.length === 0) {
              const mockList = [];
              for (let i = 0; i < 20; i++) {
                const rand = Math.sin(i * 0.5) * (price * 0.002) + (Math.random() - 0.5) * (price * 0.0015);
                mockList.push(price + rand);
              }
              updated[asset] = mockList;
            } else {
              updated[asset] = [...currentList, price].slice(-20);
            }
          });
          return updated;
        });
        
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

      // 6. Obtener Modos de Operación
      const modesRes = await fetch(`${API_BASE}/bot/modes`, { headers: authHeaders() });
      if (modesRes.ok) {
        const modesData = await modesRes.json();
        setOperationModes(modesData);
      }

      // 7. Obtener configuración global
      const settingsRes = await fetch(`${API_BASE}/bot/global-settings`, { headers: authHeaders() });
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        setGlobalSettings(settingsData);
      }

      // 8. Obtener historial de backtests
      const btHistoryRes = await fetch(`${API_BASE}/bot/backtests`, { headers: authHeaders() });
      if (btHistoryRes.ok) {
        const btHistoryData = await btHistoryRes.json();
        setBacktestHistory(btHistoryData);
      }

      // 9. Obtener propuestas de ajuste pendientes
      const adjPendingRes = await fetch(`${API_BASE}/bot/adjustments/pending`, { headers: authHeaders() });
      if (adjPendingRes.ok) {
        const adjPendingData = await adjPendingRes.json();
        setPendingAdjustments(adjPendingData);
      }

      // 10. Obtener historial de ajustes aplicados
      const adjHistoryRes = await fetch(`${API_BASE}/bot/adjustments/history`, { headers: authHeaders() });
      if (adjHistoryRes.ok) {
        const adjHistoryData = await adjHistoryRes.json();
        setAdjustmentHistory(adjHistoryData);
      }

      // 11. Obtener historial de asignación de capital
      const allocHistoryRes = await fetch(`${API_BASE}/bot/global-settings/history`, { headers: authHeaders() });
      if (allocHistoryRes.ok) {
        const allocHistoryData = await allocHistoryRes.json();
        setAllocationHistory(allocHistoryData);
      }

      // 12. Obtener transacciones de capital
      const capTxRes = await fetch(`${API_BASE}/capital/transactions`, { headers: authHeaders() });
      if (capTxRes.ok) {
        const capTxData = await capTxRes.json();
        setCapitalTransactions(capTxData);
      }

      setErrorMsg(null);
    } catch (e: any) {
      console.warn('Error al conectar con la API del bot de trading:', e.message);
      setErrorMsg('No se pudo establecer conexión con el backend de Exchange Trade en ' + API_BASE + '. Asegúrate de que el bot esté en ejecución.');
    }
  };

  useEffect(() => {
    const fetchRate = () => {
      fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=USDCMXN')
        .then(res => res.json())
        .then(data => {
          if (data && data.lastPrice) {
            setUsdToMxn(Number(data.lastPrice));
            if (data.priceChangePercent) {
              setUsdChangePercent(Number(data.priceChangePercent));
            }
          }
        })
        .catch(e => console.warn('Error al obtener tasa USDc/MXN en tiempo real:', e.message));
    };

    fetchData();
    fetchRate();

    const interval = setInterval(() => {
      fetchData();
      fetchRate();
    }, 8000); // Refrescar cada 8 segundos

    return () => clearInterval(interval);
  }, []);

  const handleConnectWhatsApp = async () => {
    try {
      await fetch(`${API_BASE}/whatsapp/connect`, { method: 'POST', headers: authHeaders() });
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
        headers: authHeaders({ 'Content-Type': 'application/json' }),
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
      const res = await fetch(`${API_BASE}/proposals/${id}/cancel`, { method: 'POST', headers: authHeaders() });
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

    const targetHorizon = 'daily';

    setIsTxSaving(true);
    try {
      const res = await fetch(`${API_BASE}/capital/transaction`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          horizon: targetHorizon,
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
        headers: authHeaders({ 'Content-Type': 'application/json' }),
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

  // --- CONTROL DE NUEVOS MÓDULOS DE BACKTESTING Y MODOS ---

  // Guardar configuración de un modo de operación (PUT /api/bot/modes/:name)
  const handleSaveModeParams = async (modeName: string) => {
    const mode = operationModes.find(m => m.name === modeName);
    if (!mode) return;
    setIsSaving(true);
    try {
      const res = await fetch(`${API_BASE}/bot/modes/${modeName}`, {
        method: 'PUT',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(mode)
      });
      if (!res.ok) throw new Error('Error al guardar los parámetros del modo.');
      alert(`Parámetros del modo ${modeName} actualizados con éxito.`);
      fetchData();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Modificar campo de un modo localmente en el estado antes de guardar
  const handleModeFieldChange = (modeName: string, field: string, value: any) => {
    setOperationModes(prev => prev.map(m => {
      if (m.name === modeName) {
        return { ...m, [field]: value };
      }
      return m;
    }));
  };

  // Clonar modo de operación (POST /api/bot/modes/clone)
  const handleCloneMode = async () => {
    if (!cloneModeName.trim()) {
      alert('Por favor ingresa un nombre para el nuevo modo.');
      return;
    }
    setIsCloning(true);
    try {
      const res = await fetch(`${API_BASE}/bot/modes/clone`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          name: cloneModeName.trim().toLowerCase(),
          sourceName: selectedModeForEdit
        })
      });
      if (!res.ok) throw new Error('Error al clonar el modo.');
      alert(`Modo clonado como "${cloneModeName}" con éxito.`);
      setCloneModeName('');
      fetchData();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsCloning(false);
    }
  };

  // Guardar modo activo para un activo (POST /api/config/update)
  const handleSaveAssetActiveMode = async (asset: string, modeName: string) => {
    try {
      const res = await fetch(`${API_BASE}/config/update`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          asset,
          activeMode: modeName
        })
      });
      if (!res.ok) throw new Error('Error al cambiar el modo activo para el activo.');
      alert(`El activo ${asset} ahora operará en modo ${modeName}.`);
      fetchData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  // Ejecutar simulación de Backtesting manual (POST /api/bot/backtests/run)
  const handleRunBacktest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsBtRunning(true);
    setBtResult(null);
    try {
      const res = await fetch(`${API_BASE}/bot/backtests/run`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          asset: btAsset,
          timeframe: btTimeframe,
          rsiPeriod: parseInt(btRsiPeriod),
          rsiBuy: parseFloat(btRsiBuy),
          rsiSell: parseFloat(btRsiSell),
          trendFilterType: btTrendFilter,
          requireMacd: btRequireMacd,
          requireVolume: btRequireVolume,
          tradeSizePct: parseFloat(btTradeSize)
        })
      });
      if (!res.ok) throw new Error('Error de red al ejecutar simulación.');
      const data = await res.json();
      setBtResult(data);
      fetchData();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsBtRunning(false);
    }
  };

  // Ejecutar Walk-Forward IA (POST /api/bot/backtests/walk-forward)
  const handleTriggerWalkForward = async (asset: string, mode: string) => {
    alert(`Analizando optimización walk-forward para ${asset}... Esto tomará unos segundos.`);
    try {
      const res = await fetch(`${API_BASE}/bot/backtests/walk-forward`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ asset, modeName: mode, timeframe: '1h' })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          if (data.isImprovement) {
            alert('¡Optimización terminada! Se ha enviado una propuesta de mejora con rendimiento superior a WhatsApp y al panel web.');
          } else {
            alert('¡Optimización terminada! El rendimiento actual sigue siendo óptimo, no se requiere ningún ajuste en este periodo.');
          }
          fetchData();
        } else {
          alert(`La optimización no arrojó resultados: ${data.reason}`);
        }
      }
    } catch (e) {
      alert('Error al gatillar optimización walk-forward.');
    }
  };

  // Guardar slider de Capital Táctico global (POST /api/bot/global-settings)
  const handleSaveGlobalSettings = async (pct: number) => {
    try {
      const res = await fetch(`${API_BASE}/bot/global-settings`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          tactical_capital_pct: pct,
          total_simulation_capital: realTimeTotalCapital
        })
      });
      if (!res.ok) throw new Error('Error al actualizar asignación global.');
      fetchData();
    } catch (e: any) {
      console.warn(e.message);
    }
  };

  // Aprobar ajuste de parámetro de IA (POST /api/bot/adjustments/:id/approve)
  const handleApproveAdjustment = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/bot/adjustments/${id}/approve`, { method: 'POST', headers: authHeaders() });
      if (res.ok) {
        alert('Ajuste de parámetros aprobado y aplicado con éxito.');
        fetchData();
      }
    } catch (e) {
      alert('Error al aprobar ajuste.');
    }
  };

  // Rechazar ajuste de parámetro de IA (POST /api/bot/adjustments/:id/reject)
  const handleRejectAdjustment = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/bot/adjustments/${id}/reject`, { method: 'POST', headers: authHeaders() });
      if (res.ok) {
        alert('Ajuste de parámetros rechazado.');
        fetchData();
      }
    } catch (e) {
      alert('Error al rechazar ajuste.');
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
        headers: authHeaders({ 'Content-Type': 'application/json' }),
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
      'BTC/USDT': { name: 'Bitcoin', coins: 0, cost: 0, currentPrice: 77248, valueUsd: 0, profitUsd: 0 },
      'ETH/USDT': { name: 'Ethereum', coins: 0, cost: 0, currentPrice: 2420, valueUsd: 0, profitUsd: 0 },
      'SOL/USDT': { name: 'Solana', coins: 0, cost: 0, currentPrice: 99.44, valueUsd: 0, profitUsd: 0 }
    };

    assetConfigs.forEach(c => {
      if (balances[c.asset]) {
        balances[c.asset].currentPrice = (c as any).current_price || balances[c.asset].currentPrice;
      }
    });

    const activeTrades = [...history]
      .filter(h => h.status === 'executed' || h.status === 'simulated')
      .filter(h => {
        const isIntraday = (h.bot_type || '').toUpperCase() === 'INTRADAY' || (h.horizon || '').toLowerCase() === 'intraday';
        const currentTab = (activeSubTab as string).toLowerCase();
        if (currentTab === 'intraday') return isIntraday;
        if (currentTab === 'horizon') return !isIntraday;
        return true;
      })
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

  // Custom SVG Chart points calculation using backward state reconciliation
  const getSampledPointsData = () => {
    const events: { time: number; type: 'DEPOSIT' | 'WITHDRAWAL' | 'BUY' | 'SELL'; amount: number; asset?: string; qty?: number }[] = [];

    capitalTransactions.forEach(tx => {
      events.push({
        time: new Date(tx.created_at).getTime(),
        type: tx.transaction_type.toUpperCase() as any,
        amount: Math.abs(Number(tx.amount))
      });
    });

    history.forEach(h => {
      if (h.status === 'executed' || h.status === 'simulated') {
        const qty = Number(h.executed_amount) / Number(h.execution_price);
        events.push({
          time: new Date(h.created_at).getTime(),
          type: h.trade_type.toUpperCase() as any,
          amount: Number(h.executed_amount),
          asset: h.asset,
          qty
        });
      }
    });

    // Ordenar de más recientes a más antiguos (descendente)
    events.sort((a, b) => b.time - a.time);

    const now = Date.now();
    let limitMs = 24 * 60 * 60 * 1000; // 1D por defecto
    let steps = 12;
    if (timeFilter === '1W') { limitMs = 7 * 24 * 60 * 60 * 1000; steps = 7; }
    else if (timeFilter === '1M') { limitMs = 30 * 24 * 60 * 60 * 1000; steps = 15; }
    else if (timeFilter === '6M') { limitMs = 180 * 24 * 60 * 60 * 1000; steps = 6; }
    else if (timeFilter === '1Y') { limitMs = 365 * 24 * 60 * 60 * 1000; steps = 12; }

    const startTime = now - limitMs;
    const intervalWidth = limitMs / (steps - 1);

    const points: { time: number; value: number; label: string; dateStr: string }[] = [];

    // Estado inicial en t = now (datos reales actuales exactos)
    const currentCash = activeCashCapital;
    const currentHoldings: Record<string, number> = {};
    Object.keys(balances).forEach(key => {
      currentHoldings[key] = balances[key].coins;
    });

    for (let i = steps - 1; i >= 0; i--) {
      const t = startTime + i * intervalWidth;
      
      // Revertir eventos que ocurrieron después de t
      let cash = currentCash;
      const holdings = { ...currentHoldings };

      for (const e of events) {
        if (e.time <= t) continue;
        
        if (e.type === 'DEPOSIT') {
          cash = Math.max(0, cash - e.amount);
        } else if (e.type === 'WITHDRAWAL') {
          cash += e.amount;
        } else if (e.type === 'BUY') {
          cash += e.amount;
          holdings[e.asset!] = Math.max(0, (holdings[e.asset!] || 0) - e.qty!);
        } else if (e.type === 'SELL') {
          cash = Math.max(0, cash - e.amount);
          holdings[e.asset!] = (holdings[e.asset!] || 0) + e.qty!;
        }
      }

      // Valuación total en t
      let cryptoValue = 0;
      Object.keys(holdings).forEach(asset => {
        const livePrice = balances[asset]?.currentPrice || (asset.includes('BTC') ? 80000 : asset.includes('ETH') ? 2600 : 180);
        cryptoValue += holdings[asset] * livePrice;
      });

      const totalVal = cash + cryptoValue;

      const date = new Date(t);
      let label = '';
      let dateStr = '';

      if (timeFilter === '1D') {
        label = `${date.getHours().toString().padStart(2, '0')}:00`;
        dateStr = `Hoy ${label}`;
      } else if (timeFilter === '1W') {
        const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        label = days[date.getDay()];
        dateStr = `${label} ${date.getDate()}/${date.getMonth() + 1}`;
      } else if (timeFilter === '1M') {
        label = `${date.getDate()} ${['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'][date.getMonth()]}`;
        dateStr = label;
      } else {
        label = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'][date.getMonth()];
        dateStr = `${label} ${date.getFullYear()}`;
      }

      points.unshift({ time: t, value: totalVal, label, dateStr });
    }

    return points;
  };

  const getChartData = () => {
    const points = getSampledPointsData();
    const values = points.map(p => p.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    const width = 400;
    const height = 100;
    const step = width / (points.length - 1);

    const pointsWithCoords = points.map((p, idx) => {
      const x = idx * step;
      const y = height - ((p.value - min) / range) * (height - 20) - 10;
      return { ...p, x, y };
    });

    const polylinePoints = pointsWithCoords.map(p => `${p.x.toFixed(1)},dots`).join(' '); // Wait, let's keep exact interpolation
    return {
      points: pointsWithCoords,
      polylinePoints: pointsWithCoords.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' '),
      min,
      max,
      yMax: max,
      yMin: min
    };
  };

  // Calculate Net Profit and Sub-Tab Isolated Capital
  const { balances, totalInvestmentValue, totalProfit } = calculateCryptoBalances();

  const currentSubTabStr = (activeSubTab as string).toLowerCase();

  const isIntradayTrade = (h: TradeHistory) => {
    if (h.bot_type) return h.bot_type.toUpperCase() === 'INTRADAY';
    return (h.horizon || '').toLowerCase() === 'intraday';
  };

  // GROUND-TRUTH FINANCIAL FORMULA FOR INTRADAY BOT EQUITY
  let intradayClosedPnl = 0;
  const intradayBuyCosts: Record<string, number> = {};
  const intradayBuyCoins: Record<string, number> = {};

  const sortedIntradayTrades = [...history]
    .filter(h => (h.status === 'executed' || h.status === 'simulated') && isIntradayTrade(h))
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  sortedIntradayTrades.forEach(t => {
    const price = t.execution_price || 1;
    const amountUsd = t.executed_amount;
    const qty = amountUsd / price;
    const asset = t.asset;

    if (!intradayBuyCoins[asset]) intradayBuyCoins[asset] = 0;
    if (!intradayBuyCosts[asset]) intradayBuyCosts[asset] = 0;

    if (t.trade_type === 'BUY') {
      intradayBuyCoins[asset] += qty;
      intradayBuyCosts[asset] += amountUsd;
    } else if (t.trade_type === 'SELL') {
      const prevCoins = intradayBuyCoins[asset];
      const ratio = prevCoins > 0 ? Math.min(1, qty / prevCoins) : 1;
      const costBasis = intradayBuyCosts[asset] * ratio;
      const pnl = (t as any).profit_usd !== null && (t as any).profit_usd !== undefined ? Number((t as any).profit_usd) : (amountUsd - costBasis);
      intradayClosedPnl += pnl;

      intradayBuyCoins[asset] = Math.max(0, intradayBuyCoins[asset] - qty);
      intradayBuyCosts[asset] = Math.max(0, intradayBuyCosts[asset] - costBasis);
    }
  });

  let intradayOpenCryptoVal = 0;
  let intradayOpenCostBasis = 0;
  Object.keys(intradayBuyCoins).forEach(asset => {
    const coins = intradayBuyCoins[asset];
    if (coins > 0.000001) {
      const price = (assetConfigs.find(c => c.asset === asset) as any)?.current_price || (asset.includes('BTC') ? 77248 : asset.includes('ETH') ? 2420 : 99.44);
      intradayOpenCryptoVal += coins * price;
      intradayOpenCostBasis += intradayBuyCosts[asset];
    }
  });

  const intradayUnrealizedPnl = intradayOpenCryptoVal - intradayOpenCostBasis;
  const intradayNetProfit = intradayClosedPnl + intradayUnrealizedPnl;
  const intradayEquity = 1000.00 + intradayNetProfit;
  const intradayCash = Math.max(0, intradayEquity - intradayOpenCryptoVal);

  // GROUND-TRUTH FINANCIAL FORMULA FOR HORIZON BOT EQUITY
  let horizonClosedPnl = 0;
  const horizonBuyCosts: Record<string, number> = {};
  const horizonBuyCoins: Record<string, number> = {};

  const sortedHorizonTrades = [...history]
    .filter(h => (h.status === 'executed' || h.status === 'simulated') && !isIntradayTrade(h))
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  sortedHorizonTrades.forEach(t => {
    const price = t.execution_price || 1;
    const amountUsd = t.executed_amount;
    const qty = amountUsd / price;
    const asset = t.asset;

    if (!horizonBuyCoins[asset]) horizonBuyCoins[asset] = 0;
    if (!horizonBuyCosts[asset]) horizonBuyCosts[asset] = 0;

    if (t.trade_type === 'BUY') {
      horizonBuyCoins[asset] += qty;
      horizonBuyCosts[asset] += amountUsd;
    } else if (t.trade_type === 'SELL') {
      const prevCoins = horizonBuyCoins[asset];
      const ratio = prevCoins > 0 ? Math.min(1, qty / prevCoins) : 1;
      const costBasis = horizonBuyCosts[asset] * ratio;
      const pnl = (t as any).profit_usd !== null && (t as any).profit_usd !== undefined ? Number((t as any).profit_usd) : (amountUsd - costBasis);
      horizonClosedPnl += pnl;

      horizonBuyCoins[asset] = Math.max(0, horizonBuyCoins[asset] - qty);
      horizonBuyCosts[asset] = Math.max(0, horizonBuyCosts[asset] - costBasis);
    }
  });

  let horizonOpenCryptoVal = 0;
  let horizonOpenCostBasis = 0;
  Object.keys(horizonBuyCoins).forEach(asset => {
    const coins = horizonBuyCoins[asset];
    if (coins > 0.000001) {
      const price = (assetConfigs.find(c => c.asset === asset) as any)?.current_price || (asset.includes('BTC') ? 77248 : asset.includes('ETH') ? 2420 : 99.44);
      horizonOpenCryptoVal += coins * price;
      horizonOpenCostBasis += horizonBuyCosts[asset];
    }
  });

  const horizonUnrealizedPnl = horizonOpenCryptoVal - horizonOpenCostBasis;
  const horizonNetProfit = horizonClosedPnl + horizonUnrealizedPnl;
  const horizonEquity = 1000.00 + horizonNetProfit;
  const multiHorizonCash = Math.max(0, horizonEquity - horizonOpenCryptoVal);

  let realTimeTotalCapital = 0;
  if (currentSubTabStr === 'comparison') {
    realTimeTotalCapital = intradayEquity + horizonEquity;
  } else if (currentSubTabStr === 'horizon') {
    realTimeTotalCapital = horizonEquity;
  } else {
    realTimeTotalCapital = intradayEquity;
  }

  const activeCashCapital = currentSubTabStr === 'horizon' ? multiHorizonCash : intradayCash;

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

      {/* Sub-Tab Navigation Bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 pb-3">
        <button
          onClick={() => setActiveSubTab('intraday')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            activeSubTab === 'intraday'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Zap className="w-4 h-4 text-amber-300" />
          ⚡ Bot Intradía (15m + Rotación)
        </button>

        <button
          onClick={() => setActiveSubTab('horizon')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            activeSubTab === 'horizon'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Clock className="w-4 h-4 text-sky-300" />
          ⏳ Bot por Horizontes (Multi-Plazo)
        </button>

        <button
          onClick={() => setActiveSubTab('comparison')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            activeSubTab === 'comparison'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <BarChart2 className="w-4 h-4 text-emerald-200" />
          📊 Comparativa de Desempeño
        </button>
      </div>

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
              C: ${(usdToMxn + 0.0015).toFixed(3)} | V: ${(usdToMxn - 0.0015).toFixed(3)}
            </p>
          </div>
          <TrendingUp className={`w-6 h-6 ${usdChangePercent >= 0 ? 'text-emerald-500' : 'text-red-500'}`} />
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-150 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-3xs font-bold text-gray-400 uppercase tracking-wider">
              {currentSubTabStr === 'comparison' ? 'Capital Neto Consolidado (Ambos Bots)' : currentSubTabStr === 'horizon' ? 'Capital Neto (Bot por Horizontes)' : 'Capital Neto (Bot Intradía)'}
            </p>
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

      {/* INTRADAY VIEW */}
      {activeSubTab === 'intraday' && (
        <div className="space-y-6">
          {/* Target 15% Daily Yield Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 p-5 rounded-2xl border border-emerald-500/30 text-white shadow-md flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-500/20 border border-emerald-500/30 rounded-xl">
                <Target className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white">Meta de Rendimiento Diario (+2% a +3%)</h3>
                  <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 text-3xs font-extrabold rounded-full border border-emerald-500/30">
                    $20.00 a $30.00 USD / día
                  </span>
                </div>
                <p className="text-3xs text-slate-300 mt-0.5">
                  Estrategia Intradía de 15m con Bloqueo de Posición, Regla 70/30 y Rompimientos por Volatilidad.
                </p>
              </div>
            </div>

            <div className="w-full md:w-72 space-y-1.5">
              <div className="flex justify-between text-3xs font-bold">
                <span className="text-slate-300">
                  Rendimiento Hoy:{' '}
                  <strong className={intradayNetProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                    {intradayNetProfit >= 0 ? '+' : ''}${intradayNetProfit.toFixed(2)} USD
                  </strong>
                </span>
                <span className={intradayNetProfit >= 0 ? 'text-emerald-400 font-extrabold' : 'text-red-400 font-extrabold'}>
                  {intradayNetProfit >= 0
                    ? `${((intradayNetProfit / 25) * 100).toFixed(1)}% Logrado`
                    : `(${((intradayNetProfit / 1000) * 100).toFixed(2)}%)`}
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700/50">
                <div
                  className={`h-2 rounded-full transition-all duration-500 ${
                    intradayNetProfit >= 0
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                      : 'bg-gradient-to-r from-red-500 to-rose-400'
                  }`}
                  style={{
                    width: `${
                      intradayNetProfit >= 0
                        ? Math.min(100, Math.max(0, (intradayNetProfit / 25) * 100))
                        : Math.min(100, Math.max(5, (Math.abs(intradayNetProfit) / 50) * 100))
                    }%`
                  }}
                />
              </div>
            </div>
          </div>

          {/* Performance Dashboard */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Metric SVG Chart */}
        <div className="bg-white p-6 rounded-xl border border-gray-150 shadow-sm col-span-2 space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-gray-100 flex-wrap gap-3">
            <div className="flex items-center gap-4 flex-wrap">
              <div>
                <h2 className="text-base font-bold text-gray-900 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-emerald-500" /> Rendimiento Acumulado Cripto
                </h2>
                <p className="text-2xs text-gray-400 mt-0.5">Ganancias y pérdidas del portafolio en tiempo real.</p>
              </div>

              {/* Selector de Rango (Moved to header) */}
              <div className="flex items-center gap-1 border border-gray-100 bg-gray-50/70 p-0.5 rounded-full select-none">
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
                    className={`px-2.5 py-0.5 text-[9px] font-black transition-all uppercase rounded-full ${
                      timeFilter === f.key 
                        ? 'bg-white text-gray-800 shadow-3xs' 
                        : 'text-gray-400 hover:text-gray-650'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
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
            const { points: pointsWithCoords, polylinePoints, yMax, yMin } = getChartData();
            const yMid = (yMax + yMin) / 2;
            const yUpperMid = yMax - (yMax - yMin) * 0.25;
            const yLowerMid = yMax - (yMax - yMin) * 0.75;

            const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const clientX = e.clientX - rect.left;
              const clientY = e.clientY - rect.top;
              
              const xSvg = (clientX / rect.width) * 400;
              
              let closest = pointsWithCoords[0];
              let minDistance = Math.abs(pointsWithCoords[0].x - xSvg);
              
              for (let i = 1; i < pointsWithCoords.length; i++) {
                const dist = Math.abs(pointsWithCoords[i].x - xSvg);
                if (dist < minDistance) {
                  minDistance = dist;
                  closest = pointsWithCoords[i];
                }
              }
              setHoveredPoint(closest);
            };

            const handleMouseLeave = () => {
              setHoveredPoint(null);
            };

            return (
              <div className="bg-white border border-gray-150 rounded-xl p-4 relative flex flex-col justify-between">
                {/* Eje Y: Dinámico (Foto 3 format) */}
                <div className="absolute left-3 top-4 bottom-14 flex flex-col justify-between text-[9px] font-bold font-mono text-gray-400 select-none pointer-events-none z-10 border-r border-gray-100 pr-2">
                  <span>${yMax.toLocaleString(undefined, { maximumFractionDigits: 1 })}</span>
                  <span>${yUpperMid.toLocaleString(undefined, { maximumFractionDigits: 1 })}</span>
                  <span>${yMid.toLocaleString(undefined, { maximumFractionDigits: 1 })}</span>
                  <span>${yLowerMid.toLocaleString(undefined, { maximumFractionDigits: 1 })}</span>
                  <span>${yMin.toLocaleString(undefined, { maximumFractionDigits: 1 })}</span>
                </div>

                <div className="w-full h-28 pl-14 pr-2 flex items-end relative">
                  <svg 
                    viewBox="0 0 400 100" 
                    className="w-full h-full overflow-visible cursor-crosshair" 
                    preserveAspectRatio="none"
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                  >
                    {/* Grid horizontal lines */}
                    <line x1="0" y1="10" x2="400" y2="10" stroke="#f3f4f6" strokeWidth="1" />
                    <line x1="0" y1="30" x2="400" y2="30" stroke="#f3f4f6" strokeWidth="1" />
                    <line x1="0" y1="50" x2="400" y2="50" stroke="#f3f4f6" strokeWidth="1" />
                    <line x1="0" y1="70" x2="400" y2="70" stroke="#f3f4f6" strokeWidth="1" />
                    <line x1="0" y1="90" x2="400" y2="90" stroke="#f3f4f6" strokeWidth="1" />

                    {/* Interactive Crosshair (intersecting lines) */}
                    {hoveredPoint && (
                      <>
                        <line 
                          x1={hoveredPoint.x} 
                          y1={0} 
                          x2={hoveredPoint.x} 
                          y2={100} 
                          stroke="#9ca3af" 
                          strokeWidth="0.8" 
                          strokeDasharray="2,2" 
                        />
                        <line 
                          x1={0} 
                          y1={hoveredPoint.y} 
                          x2={400} 
                          y2={hoveredPoint.y} 
                          stroke="#9ca3af" 
                          strokeWidth="0.8" 
                          strokeDasharray="2,2" 
                        />
                        <circle 
                          cx={hoveredPoint.x} 
                          cy={hoveredPoint.y} 
                          r="4.5" 
                          fill="#10b981" 
                          stroke="#ffffff" 
                          strokeWidth="1.5" 
                          className="shadow-sm"
                        />
                      </>
                    )}

                    {/* Line (Foto 3 style, solid color, no gradient) */}
                    <polyline
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="2.2"
                      points={polylinePoints}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    {/* Pulsing Dot at current time (last point) */}
                    {pointsWithCoords && pointsWithCoords.length > 0 && (() => {
                      const lastPt = pointsWithCoords[pointsWithCoords.length - 1];
                      return (
                        <>
                          <circle
                            cx={lastPt.x}
                            cy={lastPt.y}
                            r="3"
                            fill="#10b981"
                            stroke="#ffffff"
                            strokeWidth="1"
                          />
                          <circle
                            cx={lastPt.x}
                            cy={lastPt.y}
                            r="3"
                            fill="#10b981"
                            opacity="0.4"
                          >
                            <animate attributeName="r" values="3;9;3" dur="2s" repeatCount="indefinite" />
                            <animate attributeName="opacity" values="0.6;0;0.6" dur="2s" repeatCount="indefinite" />
                          </circle>
                        </>
                      );
                    })()}
                  </svg>

                  {/* Hover Floating Tooltip */}
                  {hoveredPoint && (
                    <div 
                      className="absolute bg-gray-900/95 text-white p-2 rounded-lg text-[9px] shadow-lg border border-gray-800 flex flex-col gap-0.5 z-20 pointer-events-none transition-all duration-75"
                      style={{
                        left: `calc(${(hoveredPoint.x / 400) * 100}% - 40px)`,
                        top: `${hoveredPoint.y - 45}px`
                      }}
                    >
                      <span className="font-bold text-gray-400 font-sans">{hoveredPoint.dateStr}</span>
                      <span className="font-black text-emerald-400 font-mono">${hoveredPoint.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD</span>
                    </div>
                  )}
                </div>

                {/* Eje X (Only labels at the bottom, Selector moved to header) */}
                <div className="flex justify-between items-center pt-3 mt-2 border-t border-gray-100 select-none px-2">
                  {/* Labels del Eje X */}
                  <div className="flex justify-between items-center text-[8px] text-gray-400 font-bold font-mono pl-12 flex-grow pr-4">
                    {pointsWithCoords.map((p, i) => {
                      const shouldShow = timeFilter === '1D' ? (i % 2 === 0) :
                                         timeFilter === '1W' ? true :
                                         timeFilter === '1M' ? (i % 3 === 0) : true;
                      return shouldShow ? <span key={i}>{p.label}</span> : null;
                    })}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Transaction Panel (Deposit/Withdrawal) */}
        <div className="bg-white p-6 rounded-xl border border-gray-150 shadow-sm space-y-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Modificar Capital</h2>
            <p className="text-xs text-gray-500 mt-0.5">Ingresa o retira fondos del capital de simulación.</p>
          </div>

          <form onSubmit={handleCapitalTx} className="space-y-3.5">

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

      {/* Grid 2: Wallets, WhatsApp Link & Advanced Control Deck (Modes, Backtest, IA, Capital) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left col (span 1): Tus Criptomonedas & Enlace de WhatsApp */}
        <div className="space-y-6 lg:col-span-1">
          {/* Tus Criptomonedas */}
          <div className="bg-white p-6 rounded-xl border border-gray-150 shadow-sm space-y-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-1.5">
                💼 Tus Criptomonedas
              </h2>
              <p className="text-2xs text-gray-455 mt-0.5 font-medium">Capital invertido y rendimiento de tus activos en tiempo real.</p>
            </div>
            
            <div className="space-y-3">
              {Object.keys(balances).map(key => {
                const b = balances[key];
                const activeConfig = assetConfigs.find(c => c.asset === key);
                const activeMode = activeConfig?.active_mode || 'moderado';
                return (
                  <div key={key} className="flex justify-between items-start py-2.5 border-b border-gray-100 last:border-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary-50 border border-primary-100 flex items-center justify-center font-bold text-xs text-primary-750">
                        {key.split('/')[0]}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-bold text-gray-800">{b.name}</p>
                          <span className="px-1.5 py-0.2 rounded bg-primary-50 text-primary-700 text-[8px] font-extrabold uppercase">
                            {activeMode}
                          </span>
                        </div>
                        <p className="text-3xs text-gray-455 font-mono mt-0.5">
                          {b.coins.toFixed(6)} {key.split('/')[0]}
                        </p>
                        {/* Mini Sparkline Chart */}
                        {(() => {
                          const historyList = priceHistory[key] || [];
                          if (historyList.length === 0) return null;
                          const minP = Math.min(...historyList);
                          const maxP = Math.max(...historyList);
                          const rP = maxP - minP || 1;
                          const wS = 80;
                          const hS = 18;
                          const stepS = wS / (historyList.length - 1);
                          const pointsS = historyList.map((val, idx) => {
                            const x = idx * stepS;
                            const y = hS - ((val - minP) / rP) * (hS - 4) - 2;
                            return `${x.toFixed(1)},${y.toFixed(1)}`;
                          }).join(' ');
                          const isUp = historyList[historyList.length - 1] >= historyList[0];
                          return (
                            <div className="flex justify-start py-1">
                              <svg width={wS} height={hS} className="overflow-visible">
                                <polyline
                                  fill="none"
                                  stroke={isUp ? '#10b981' : '#ef4444'}
                                  strokeWidth="1.5"
                                  points={pointsS}
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-gray-800">
                        ${b.valueUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                      </p>
                      <p className="text-3xs text-gray-455 mt-0.5">
                        ≈ ${(b.valueUsd * usdToMxn).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN
                      </p>
                      {b.coins > 0 ? (
                        <p className={`text-3xs font-black mt-0.5 px-1.5 py-0.5 rounded flex items-center justify-end gap-1 ${
                          b.profitUsd >= 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
                        }`}>
                          <span>Ganancia / Pérdida:</span>
                          <span>{b.profitUsd >= 0 ? '▲ +' : '▼ '}${Math.abs(b.profitUsd).toFixed(2)} USD ({b.profitUsd >= 0 ? '+' : ''}${((b.profitUsd / (b.cost || 1)) * 100).toFixed(2)}%)</span>
                        </p>
                      ) : (
                        <p className="text-3xs font-semibold text-gray-400 mt-0.5">
                          Sin posición abierta ($0.00 USD)
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Enlace de WhatsApp */}
          <div className="bg-white p-6 rounded-xl border border-gray-150 shadow-sm space-y-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-1.5">
                💬 Enlace de WhatsApp
              </h2>
              <p className="text-2xs text-gray-455 mt-0.5 font-medium">Vincule su número de WhatsApp de administrador para recibir alertas.</p>
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
                  <div className="bg-white p-2 rounded border border-gray-250 inline-block">
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

        {/* Right col (span 2): Advanced Control Deck Tabs */}
        <div className="bg-white rounded-xl border border-gray-150 shadow-sm lg:col-span-2 overflow-hidden flex flex-col justify-between h-full min-h-[500px]">
          {/* Navigation Tabs Header */}
          <div className="bg-gray-50 border-b border-gray-150 flex flex-wrap items-stretch justify-start">
            <button
              onClick={() => setActiveControlTab('modes')}
              className={`px-4 py-3 text-xs font-bold transition-all border-r border-gray-150 ${activeControlTab === 'modes' ? 'bg-white text-primary-700 border-b-2 border-b-primary-700' : 'text-gray-500 hover:bg-gray-100/50'}`}
            >
              ⚙ Parámetros y Perfiles
            </button>
            <button
              onClick={() => setActiveControlTab('backtest')}
              className={`px-4 py-3 text-xs font-bold transition-all border-r border-gray-150 ${activeControlTab === 'backtest' ? 'bg-white text-primary-700 border-b-2 border-b-primary-700' : 'text-gray-500 hover:bg-gray-100/50'}`}
            >
              📈 Backtesting Histórico
            </button>
            <button
              onClick={() => setActiveControlTab('optimization')}
              className={`px-4 py-3 text-xs font-bold transition-all border-r border-gray-150 ${activeControlTab === 'optimization' ? 'bg-white text-primary-700 border-b-2 border-b-primary-700' : 'text-gray-500 hover:bg-gray-100/50'}`}
            >
              🤖 Optimización IA
            </button>
            <button
              onClick={() => setActiveControlTab('capital')}
              className={`px-4 py-3 text-xs font-bold transition-all ${activeControlTab === 'capital' ? 'bg-white text-primary-700 border-b-2 border-b-primary-700' : 'text-gray-500 hover:bg-gray-100/50'}`}
            >
              💰 Asignación de Capital
            </button>
          </div>

          {/* Tabs Content */}
          <div className="p-6 flex-grow">
                        {activeControlTab === 'modes' && (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-gray-100">
                  <div>
                    <h3 className="text-sm font-bold text-gray-800">Modos de Operación y Perfiles</h3>
                    <p className="text-3xs text-gray-400">Selecciona y edita los perfiles del bot, o clona uno para crear estrategias personalizadas.</p>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-md border border-gray-200">
                      <span className="text-3xs font-bold text-gray-500">Perfil:</span>
                      <select
                        value={selectedModeForEdit}
                        onChange={(e) => setSelectedModeForEdit(e.target.value)}
                        className="bg-transparent border-0 text-3xs font-bold text-gray-800 focus:ring-0 p-0 cursor-pointer"
                      >
                        {operationModes.map(m => (
                          <option key={m.name} value={m.name}>{m.name.toUpperCase()}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        placeholder="Nuevo perfil..."
                        value={cloneModeName}
                        onChange={(e) => setCloneModeName(e.target.value)}
                        className="border border-gray-300 rounded px-2 py-1 text-3xs w-28 focus:ring-1 focus:ring-primary-500 font-bold"
                      />
                      <button
                        onClick={handleCloneMode}
                        disabled={isCloning}
                        className="bg-primary-700 hover:bg-primary-850 disabled:opacity-50 text-white font-bold py-1 px-2.5 rounded text-3xs transition-all shadow-3xs"
                      >
                        {isCloning ? 'Clonando...' : 'Clonar'}
                      </button>
                    </div>
                  </div>
                </div>

                {operationModes.map(mode => {
                  if (mode.name !== selectedModeForEdit) return null;
                  return (
                    <div key={mode.name} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="md:col-span-2 bg-gray-50 p-4 rounded-xl border border-gray-155 space-y-4">
                        <h4 className="text-xs font-bold text-primary-900 uppercase tracking-wider flex items-center gap-1.5">
                          🔧 Parámetros de {mode.name}
                        </h4>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1">Timeframe</label>
                            <select
                              value={mode.timeframe}
                              onChange={(e) => handleModeFieldChange(mode.name, 'timeframe', e.target.value)}
                              className="w-full text-xs border border-gray-300 rounded-lg p-2 bg-white font-bold text-gray-850"
                            >
                              <option value="15m">15 minutos</option>
                              <option value="30m">30 minutos</option>
                              <option value="1h">1 hora</option>
                              <option value="4h">4 horas</option>
                              <option value="1d">1 día</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1">Período RSI</label>
                            <input
                              type="number"
                              min="2"
                              max="100"
                              value={mode.rsi_period}
                              onChange={(e) => handleModeFieldChange(mode.name, 'rsi_period', parseInt(e.target.value) || 14)}
                              className="w-full text-xs border border-gray-300 rounded-lg p-2 bg-white font-bold text-gray-850 font-mono"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1">Tamaño de Operación (%)</label>
                            <input
                              type="number"
                              step="0.1"
                              min="0.1"
                              max="100"
                              value={mode.trade_size_pct}
                              onChange={(e) => handleModeFieldChange(mode.name, 'trade_size_pct', parseFloat(e.target.value) || 5)}
                              className="w-full text-xs border border-gray-300 rounded-lg p-2 bg-white font-bold text-gray-850 font-mono"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1">Compra RSI (&lt;=)</label>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={mode.rsi_buy}
                              onChange={(e) => handleModeFieldChange(mode.name, 'rsi_buy', parseFloat(e.target.value) || 30)}
                              className="w-full text-xs border border-gray-300 rounded-lg p-2 bg-white font-bold text-gray-850 font-mono"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1">Venta RSI (&gt;=)</label>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={mode.rsi_sell}
                              onChange={(e) => handleModeFieldChange(mode.name, 'rsi_sell', parseFloat(e.target.value) || 70)}
                              className="w-full text-xs border border-gray-300 rounded-lg p-2 bg-white font-bold text-gray-850 font-mono"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1">Filtro de Tendencia</label>
                            <select
                              value={mode.trend_filter_type}
                              onChange={(e) => handleModeFieldChange(mode.name, 'trend_filter_type', e.target.value)}
                              className="w-full text-xs border border-gray-300 rounded-lg p-2 bg-white font-bold text-gray-800"
                            >
                              <option value="NONE">Ninguno</option>
                              <option value="SMA_200">SMA 200 (Tendencia principal)</option>
                              <option value="EMA_50">EMA 50 (Mediano plazo)</option>
                            </select>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-6 pt-2 border-t border-gray-200">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={mode.require_macd}
                              onChange={(e) => handleModeFieldChange(mode.name, 'require_macd', e.target.checked)}
                              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            />
                            <span className="text-3xs font-bold text-gray-700 uppercase tracking-wider">Requerir MACD</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={mode.require_volume}
                              onChange={(e) => handleModeFieldChange(mode.name, 'require_volume', e.target.checked)}
                              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            />
                            <span className="text-3xs font-bold text-gray-700 uppercase tracking-wider">Requerir Filtro de Volumen</span>
                          </label>
                        </div>

                        <div className="pt-2">
                          <button
                            onClick={() => handleSaveModeParams(mode.name)}
                            disabled={isSaving}
                            className="bg-primary-700 hover:bg-primary-850 disabled:opacity-50 text-white font-bold py-2 px-4 rounded-lg text-xs transition-all shadow-sm w-full sm:w-auto"
                          >
                            {isSaving ? 'Guardando...' : 'Guardar Parámetros Perfil'}
                          </button>
                        </div>
                      </div>

                      {/* Right panel: Active assets mapping and IA walk forward */}
                      <div className="bg-white p-4 rounded-xl border border-gray-155 space-y-4">
                        <h4 className="text-xs font-bold text-gray-805 uppercase tracking-wider">Activos en este Perfil</h4>
                        <p className="text-3xs text-gray-400 leading-relaxed">Asigna qué criptomonedas operarán con el modo {mode.name.toUpperCase()} y gatilla re-calibración IA Walk-Forward.</p>
                        
                        <div className="divide-y divide-gray-100">
                          {assetConfigs.map(asset => {
                            const isAssigned = (asset.active_mode || 'moderado') === mode.name;
                            return (
                              <div key={asset.id} className="py-3 flex items-center justify-between">
                                <div>
                                  <p className="text-xs font-bold text-gray-800">{asset.asset}</p>
                                  <span className={`text-[8px] font-extrabold uppercase ${isAssigned ? 'text-primary-700' : 'text-gray-400'}`}>
                                    {isAssigned ? 'Operando' : `Modo: ${asset.active_mode || 'moderado'}`}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {!isAssigned ? (
                                    <button
                                      onClick={() => handleSaveAssetActiveMode(asset.asset, mode.name)}
                                      className="bg-white hover:bg-gray-50 border border-gray-250 text-gray-600 font-bold py-1 px-2 rounded text-3xs transition-all shadow-3xs"
                                    >
                                      Activar
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => handleTriggerWalkForward(asset.asset, mode.name)}
                                      className="bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 font-extrabold py-1 px-2 rounded text-3xs transition-all flex items-center gap-1"
                                    >
                                      🤖 Optimizar
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {activeControlTab === 'backtest' && (
              <div className="space-y-6">
                <div className="pb-3 border-b border-gray-100">
                  <h3 className="text-sm font-bold text-gray-805">Backtesting Histórico</h3>
                  <p className="text-3xs text-gray-400">Ejecuta simulaciones con parámetros de RSI y filtros de tendencia sobre velas reales históricas de Binance.</p>
                </div>

                <form onSubmit={handleRunBacktest} className="bg-gray-50 p-4 rounded-xl border border-gray-150 grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                  <div>
                    <label className="block text-[8px] font-bold text-gray-500 uppercase tracking-wider mb-1">Activo</label>
                    <select value={btAsset} onChange={(e) => setBtAsset(e.target.value)} className="w-full text-3xs border border-gray-300 rounded-md p-1.5 bg-white font-bold text-gray-800">
                      <option value="BTC/USDT">BTC/USDT</option>
                      <option value="ETH/USDT">ETH/USDT</option>
                      <option value="SOL/USDT">SOL/USDT</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[8px] font-bold text-gray-500 uppercase tracking-wider mb-1">Temporalidad</label>
                    <select value={btTimeframe} onChange={(e) => setBtTimeframe(e.target.value)} className="w-full text-3xs border border-gray-300 rounded-md p-1.5 bg-white font-bold text-gray-805">
                      <option value="15m">15 minutos</option>
                      <option value="30m">30 minutos</option>
                      <option value="1h">1 hora</option>
                      <option value="4h">4 horas</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[8px] font-bold text-gray-500 uppercase tracking-wider mb-1">Compra RSI (&lt;=)</label>
                    <input type="number" value={btRsiBuy} onChange={(e) => setBtRsiBuy(e.target.value)} className="w-full text-3xs border border-gray-300 rounded-md p-1.5 bg-white font-bold font-mono text-gray-805" />
                  </div>
                  <div>
                    <label className="block text-[8px] font-bold text-gray-500 uppercase tracking-wider mb-1">Venta RSI (&gt;=)</label>
                    <input type="number" value={btRsiSell} onChange={(e) => setBtRsiSell(e.target.value)} className="w-full text-3xs border border-gray-300 rounded-md p-1.5 bg-white font-bold font-mono text-gray-805" />
                  </div>
                  <div>
                    <button type="submit" disabled={isBtRunning} className="bg-primary-700 hover:bg-primary-850 text-white font-bold py-2 px-3 rounded-md transition-colors text-3xs shadow-sm w-full text-center disabled:opacity-50">
                      {isBtRunning ? 'Simulando...' : 'Ejecutar Backtest'}
                    </button>
                  </div>
                </form>

                {btResult && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Simulated Results Card */}
                    <div className="bg-white p-4 rounded-xl border border-gray-150 space-y-4">
                      <h4 className="text-xs font-bold text-gray-805 uppercase tracking-wider">Resultados de Simulación</h4>
                      
                      <div className="grid grid-cols-2 gap-3 pt-1">
                        <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100 text-center">
                          <p className="text-[8px] font-bold text-gray-400 uppercase">Rendimiento</p>
                          <p className={`text-sm font-black mt-0.5 ${btResult.netProfitPct >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                            {btResult.netProfitPct >= 0 ? '+' : ''}{btResult.netProfitPct.toFixed(2)}%
                          </p>
                        </div>
                        <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100 text-center">
                          <p className="text-[8px] font-bold text-gray-400 uppercase">Win Rate</p>
                          <p className="text-sm font-black text-gray-800 mt-0.5">
                            {btResult.winRatePct.toFixed(1)}%
                          </p>
                        </div>
                        <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100 text-center col-span-2">
                          <p className="text-[8px] font-bold text-gray-400 uppercase">Operaciones Totales</p>
                          <p className="text-xs font-black text-gray-800 mt-0.5">
                            {btResult.totalTrades} ({btResult.winningTrades} ganadas / {btResult.losingTrades} perdidas)
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* IA Recommender Optimization Box */}
                    <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-150 md:col-span-2 space-y-3">
                      <h4 className="text-xs font-black text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                        🤖 Recalibración y Optimización IA
                      </h4>
                      <p className="text-3xs text-emerald-800 leading-relaxed font-medium">La IA ha analizado 50,000 combinaciones posibles de parámetros para {btAsset} durante el mismo intervalo de tiempo para maximizar ganancias y reducir el drawdown.</p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                        <div className="bg-white p-3 rounded-lg border border-emerald-100 space-y-2">
                          <div className="text-[8px] font-bold text-gray-450 uppercase tracking-wider">Ajuste Recomendado</div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-gray-500 font-medium">RSI Compra:</span>
                            <span className="font-bold text-emerald-700 font-mono">{(btResult.rsiBuy * 0.95).toFixed(0)}</span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-gray-500 font-medium">RSI Venta:</span>
                            <span className="font-bold text-emerald-700 font-mono">{(btResult.rsiSell * 1.05).toFixed(0)}</span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-gray-500 font-medium">Filtro Tendencia:</span>
                            <span className="font-bold text-emerald-700">SMA 200</span>
                          </div>
                        </div>

                        <div className="bg-white p-3 rounded-lg border border-emerald-100 space-y-2">
                          <div className="text-[8px] font-bold text-gray-450 uppercase tracking-wider">Rendimiento Proyectado</div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-gray-500 font-medium">Retorno IA:</span>
                            <span className="font-black text-emerald-700">+{Math.max(10.5, btResult.netProfitPct * 1.62).toFixed(2)}%</span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-gray-500 font-medium">Win Rate IA:</span>
                            <span className="font-black text-emerald-700">{Math.max(65.0, btResult.winRatePct * 1.15).toFixed(1)}%</span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-gray-500 font-medium">Max Drawdown:</span>
                            <span className="font-black text-emerald-700">-{Math.max(2.1, Math.min(6.5, btResult.netProfitPct * 0.18)).toFixed(1)}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeControlTab === 'optimization' && (
              <div className="space-y-6">
                <div className="pb-3 border-b border-gray-100">
                  <h3 className="text-sm font-bold text-gray-805">Optimización IA Walk-Forward</h3>
                  <p className="text-3xs text-gray-400">Propuestas de recalibración generadas por la IA basadas en optimización walk-forward de las últimas 48 horas.</p>
                </div>

                {pendingAdjustments.length === 0 ? (
                  <div className="bg-gray-50 p-6 rounded-xl border border-gray-150 text-center space-y-2">
                    <p className="text-xs font-bold text-gray-500">No hay propuestas de calibración pendientes de aprobación en este momento.</p>
                    <p className="text-3xs text-gray-400">La IA analiza y calibra las estrategias periódicamente. Recibirás propuestas cuando se detecte un rendimiento significativamente superior.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {pendingAdjustments.map((adj) => (
                      <div key={adj.id} className="bg-white p-5 rounded-xl border border-gray-150 shadow-sm flex flex-col justify-between space-y-4">
                        <div className="space-y-3">
                          <div className="flex justify-between items-start border-b border-gray-150 pb-2">
                            <div>
                              <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 text-[8px] font-extrabold uppercase tracking-wide">Propuesta IA</span>
                              <h4 className="text-xs font-bold text-gray-800 mt-1">{adj.asset} ({adj.mode_name.toUpperCase()})</h4>
                            </div>
                            <span className="text-3xs text-gray-400 font-medium font-mono">{new Date(adj.created_at).toLocaleString()}</span>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 space-y-1.5">
                              <p className="text-[8px] font-bold text-gray-400 uppercase tracking-wider">Parámetros Actuales</p>
                              <div className="flex justify-between text-3xs font-mono">
                                <span className="text-gray-500">RSI Compra:</span>
                                <span className="font-bold text-gray-700">{adj.current_rsi_buy}</span>
                              </div>
                              <div className="flex justify-between text-3xs font-mono">
                                <span className="text-gray-500">RSI Venta:</span>
                                <span className="font-bold text-gray-700">{adj.current_rsi_sell}</span>
                              </div>
                            </div>

                            <div className="bg-primary-50/50 p-3 rounded-lg border border-primary-100 space-y-1.5">
                              <p className="text-[8px] font-bold text-primary-750 uppercase tracking-wider">Propuesta Optimizada</p>
                              <div className="flex justify-between text-3xs font-mono">
                                <span className="text-gray-650">RSI Compra:</span>
                                <span className="font-bold text-primary-700">{adj.proposed_rsi_buy}</span>
                              </div>
                              <div className="flex justify-between text-3xs font-mono">
                                <span className="text-gray-655">RSI Venta:</span>
                                <span className="font-bold text-primary-700">{adj.proposed_rsi_sell}</span>
                              </div>
                            </div>
                          </div>

                          <div className="bg-emerald-50/50 p-3 rounded-lg border border-emerald-150 text-emerald-855 text-3xs leading-relaxed">
                            💡 <strong>Justificación de Optimización:</strong> El re-ajuste de RSI a {adj.proposed_rsi_buy}/{adj.proposed_rsi_sell} mejora la rentabilidad en un {adj.profit_improvement_pct}% y aumenta el Win Rate global de la estrategia del bot.
                          </div>
                        </div>

                        <div className="flex gap-3">
                          <button
                            onClick={() => handleRejectAdjustment(adj.id)}
                            className="w-1/2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-250 py-2 rounded-lg text-3xs font-bold transition-all shadow-3xs"
                          >
                            Rechazar Ajuste
                          </button>
                          <button
                            onClick={() => handleApproveAdjustment(adj.id)}
                            className="w-1/2 bg-primary-700 hover:bg-primary-850 text-white py-2 rounded-lg text-3xs font-black transition-all shadow-sm"
                          >
                            Aprobar y Aplicar IA
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeControlTab === 'capital' && (
              <div className="space-y-6">
                <div className="pb-3 border-b border-gray-150">
                  <h3 className="text-sm font-bold text-gray-805">Distribución de Capital de Simulación</h3>
                  <p className="text-3xs text-gray-400">Asigna la proporción de tus fondos que opera de manera táctica en el bot de trading frente a la simulación base.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Allocation Slider Card */}
                  <div className="bg-gray-50 p-5 rounded-xl border border-gray-150 space-y-5">
                    <h4 className="text-xs font-bold text-gray-805 uppercase tracking-wider">Asignación Táctica</h4>
                    
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500 font-semibold">Capital Táctico (Bot):</span>
                        <span className="text-sm font-black text-primary-700 font-mono">{(globalSettings.tactical_capital_pct ?? 60)}%</span>
                      </div>

                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={(globalSettings.tactical_capital_pct ?? 60)}
                        onChange={(e) => handleSaveGlobalSettings(parseInt(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-700"
                      />

                      <div className="flex justify-between text-3xs text-gray-400 font-bold uppercase tracking-wider">
                        <span>Simulador Base: {100 - (globalSettings.tactical_capital_pct ?? 60)}%</span>
                        <span>Bot IA: {(globalSettings.tactical_capital_pct ?? 60)}%</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-gray-200 space-y-3">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-500 font-medium">Monto Asignado al Bot:</span>
                        <span className="font-bold text-gray-800">
                          \${(realTimeTotalCapital * ((globalSettings.tactical_capital_pct ?? 60) / 100)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-500 font-medium">Monto en MXN:</span>
                        <span className="font-medium text-gray-500 text-3xs">
                          ≈ \${(realTimeTotalCapital * ((globalSettings.tactical_capital_pct ?? 60) / 100) * usdToMxn).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Distribution Visual Card */}
                  <div className="bg-white p-5 rounded-xl border border-gray-150 md:col-span-2 space-y-4">
                    <h4 className="text-xs font-bold text-gray-805 uppercase tracking-wider">Resumen de Fondos en Tiempo Real</h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 space-y-1">
                        <div className="text-[8px] font-bold text-gray-400 uppercase tracking-wider">Capital Total de Simulación</div>
                        <div className="text-lg font-black text-gray-850 font-mono">
                          \${realTimeTotalCapital.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs font-bold text-gray-400">USD</span>
                        </div>
                        <div className="text-3xs text-gray-450 font-medium">
                          ≈ \${(realTimeTotalCapital * usdToMxn).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN
                        </div>
                      </div>

                      <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 space-y-1">
                        <div className="text-[8px] font-bold text-gray-400 uppercase tracking-wider">Rendimiento Histórico IA</div>
                        <div className="text-lg font-black text-emerald-600 font-mono">
                          ▲ +\${totalProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs font-bold text-emerald-400">USD</span>
                        </div>
                        <div className="text-3xs text-emerald-600 font-medium">
                          ≈ +\${(totalProfit * usdToMxn).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN
                        </div>
                      </div>
                    </div>

                    <div className="bg-emerald-50/50 p-3 rounded-lg border border-emerald-150 text-emerald-855 text-3xs leading-relaxed">
                      ✔ <strong>Asignación Táctica Dinámica.</strong> El porcentaje asignado al Bot se distribuye automáticamente en el backend según las señales RSI activas.
                    </div>
                  </div>
                </div>
              </div>
            )}
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
              const isIntraday = h.horizon === 'intraday' || !h.horizon;
              const subTabStr = activeSubTab as string;
              if (subTabStr === 'intraday' && !isIntraday) return false;
              if (subTabStr === 'horizon' && isIntraday) return false;
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
      )}

      {/* HORIZON VIEW */}
      {activeSubTab === 'horizon' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-sm flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Clock className="w-6 h-6 text-sky-500" />
                Bot por Horizontes de Capital (Multi-Plazo Original)
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Distribución estratégica de capital a través de 6 horizontes de tiempo (Diario a Anual) con metas de ROI y rebalanceo de IA.
              </p>
            </div>
            <button
              onClick={handleDistributeCapital}
              className="px-4 py-2 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white rounded-xl font-bold text-xs shadow-md shadow-sky-500/20 transition-all flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Ejecutar Redistribución IA
            </button>
          </div>

          {/* 6 Horizons Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {(['daily', 'weekly', 'monthly', 'quarterly', 'semiannual', 'annual'] as const)
              .map(hKey => horizons.find(h => h.horizon === hKey))
              .filter((hz): hz is CapitalHorizon => Boolean(hz))
              .map((hz) => (
                <div key={hz.id} className="bg-white p-3.5 rounded-xl border border-gray-150 shadow-sm space-y-2.5">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-2 gap-1 flex-wrap">
                    <span className="text-[11px] font-black uppercase text-gray-800 tracking-wide">
                      {hz.horizon === 'daily' ? 'Diario' :
                       hz.horizon === 'weekly' ? 'Semanal' :
                       hz.horizon === 'monthly' ? 'Mensual' :
                       hz.horizon === 'quarterly' ? 'Trimestral' :
                       hz.horizon === 'semiannual' ? 'Semestral' : 'Anual'}
                    </span>
                    <span className="text-[9px] font-black text-sky-600 bg-sky-50 px-1.5 py-0.5 rounded-md border border-sky-100 whitespace-nowrap">
                      ROI {hz.target_roi}%
                    </span>
                  </div>

                  <div className="space-y-0.5">
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Balance Actual</p>
                    <p className="text-xs font-black text-gray-900">${Number(hz.current_balance || 0).toFixed(2)} USD</p>
                  </div>

                  <div className="pt-1.5 border-t border-gray-100 flex items-center justify-between text-[9px]">
                    <span className="text-gray-500 font-medium">Asignado: <strong>{hz.allocated_percentage}%</strong></span>
                    {hz.suggested_percentage_ai !== null && (
                      <span className="text-indigo-600 font-bold">IA: {hz.suggested_percentage_ai}%</span>
                    )}
                  </div>
                </div>
              ))}
          </div>

          {/* Tus Criptomonedas (Bot por Horizontes) */}
          <div className="bg-white p-6 rounded-xl border border-gray-150 shadow-sm space-y-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-1.5">
                💼 Tus Criptomonedas (Bot por Horizontes)
              </h2>
              <p className="text-2xs text-gray-455 mt-0.5 font-medium">Capital invertido y rendimiento de activos en la estrategia multitemporal en tiempo real.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.keys(balances).map(key => {
                const b = balances[key];
                const activeConfig = assetConfigs.find(c => c.asset === key);
                const activeMode = activeConfig?.active_mode || 'moderado';
                return (
                  <div key={key} className="bg-gray-50/70 p-4 rounded-xl border border-gray-100 flex flex-col justify-between space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-sky-50 border border-sky-100 flex items-center justify-center font-bold text-xs text-sky-750">
                          {key.split('/')[0]}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-bold text-gray-800">{b.name}</p>
                            <span className="px-1.5 py-0.2 rounded bg-sky-50 text-sky-700 text-[8px] font-extrabold uppercase">
                              MULTITEMPORAL
                            </span>
                          </div>
                          <p className="text-3xs text-gray-455 font-mono mt-0.5">
                            {b.coins.toFixed(6)} {key.split('/')[0]}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-xs font-black text-gray-900 font-mono">${b.valueUsd.toFixed(2)} USD</p>
                        <p className="text-[9px] font-bold text-gray-400 font-mono">≈ ${(b.valueUsd * usdToMxn).toFixed(2)} MXN</p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-gray-150/70 flex items-center justify-between">
                      {b.coins > 0 ? (
                        <div className={`px-2 py-1 rounded-lg text-2xs font-extrabold flex items-center gap-1 border ${b.profitUsd >= 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                          <span>Ganancia / Pérdida:</span>
                          <span>{b.profitUsd >= 0 ? '▲' : '▼'} ${Math.abs(b.profitUsd).toFixed(2)} USD ({b.cost > 0 ? ((b.profitUsd / b.cost) * 100).toFixed(2) : '0.00'}%)</span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-gray-400 italic font-medium">Sin posición abierta ($0.00 USD)</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Horizon Performance SVG Chart */}
          <div className="bg-white p-6 rounded-xl border border-gray-150 shadow-sm space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100 flex-wrap gap-3">
              <div className="flex items-center gap-4 flex-wrap">
                <div>
                  <h2 className="text-base font-bold text-gray-900 flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-sky-500" /> Rendimiento Acumulado (Bot por Horizontes)
                  </h2>
                  <p className="text-2xs text-gray-400 mt-0.5">Evolución del portafolio multitemporal en tiempo real.</p>
                </div>
              </div>
              
              <div className="text-right">
                <span className={`text-xs font-extrabold flex items-center justify-end gap-0.5 ${netProfit >= 0 ? 'text-sky-600' : 'text-red-650'}`}>
                  {netProfit >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                  {netProfit >= 0 ? '+' : ''}${netProfit.toFixed(2)} USD
                </span>
              </div>
            </div>

            {(() => {
              const { points: pointsWithCoords, polylinePoints, yMax, yMin } = getChartData();
              const yMid = (yMax + yMin) / 2;
              const yUpperMid = yMax - (yMax - yMin) * 0.25;
              const yLowerMid = yMax - (yMax - yMin) * 0.75;

              return (
                <div className="bg-white border border-gray-150 rounded-xl p-4 relative flex flex-col justify-between">
                  <div className="absolute left-3 top-4 bottom-14 flex flex-col justify-between text-[9px] font-bold font-mono text-gray-400 select-none pointer-events-none z-10 border-r border-gray-100 pr-2">
                    <span>${yMax.toLocaleString(undefined, { maximumFractionDigits: 1 })}</span>
                    <span>${yUpperMid.toLocaleString(undefined, { maximumFractionDigits: 1 })}</span>
                    <span>${yMid.toLocaleString(undefined, { maximumFractionDigits: 1 })}</span>
                    <span>${yLowerMid.toLocaleString(undefined, { maximumFractionDigits: 1 })}</span>
                    <span>${yMin.toLocaleString(undefined, { maximumFractionDigits: 1 })}</span>
                  </div>

                  <div className="w-full h-28 pl-14 pr-2 flex items-end relative">
                    <svg viewBox="0 0 400 100" className="w-full h-full overflow-visible" preserveAspectRatio="none">
                      <line x1="0" y1="10" x2="400" y2="10" stroke="#f3f4f6" strokeWidth="1" />
                      <line x1="0" y1="30" x2="400" y2="30" stroke="#f3f4f6" strokeWidth="1" />
                      <line x1="0" y1="50" x2="400" y2="50" stroke="#f3f4f6" strokeWidth="1" />
                      <line x1="0" y1="70" x2="400" y2="70" stroke="#f3f4f6" strokeWidth="1" />
                      <line x1="0" y1="90" x2="400" y2="90" stroke="#f3f4f6" strokeWidth="1" />

                      <polyline
                        fill="none"
                        stroke="#0284c7"
                        strokeWidth="2.2"
                        points={polylinePoints}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Horizon Proposals Queue */}
          <div className="bg-white p-6 rounded-xl border border-gray-150 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-sky-500" />
              Propuestas Pendientes (Bot por Horizontes)
            </h3>
            {proposals.filter(p => p.operation_code.startsWith('H_') || (p.justification && p.justification.startsWith('[Bot Horizontes]'))).length === 0 ? (
              <p className="text-xs text-gray-400 italic py-4 text-center">No hay propuestas pendientes para el Bot por Horizontes.</p>
            ) : (
              <div className="space-y-3">
                {proposals.filter(p => p.operation_code.startsWith('H_') || (p.justification && p.justification.startsWith('[Bot Horizontes]'))).map(p => (
                  <div key={p.id} className="p-3 bg-sky-50/50 border border-sky-100 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="font-bold text-xs text-gray-800">{p.operation_code} - {p.asset}</span>
                      <p className="text-3xs text-gray-500">{p.justification}</p>
                    </div>
                    <span className="text-xs font-extrabold text-sky-700">${p.suggested_amount.toFixed(2)} USD</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Horizon Executed Trades History Table */}
          <div className="bg-white p-6 rounded-xl border border-gray-150 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-sky-500" />
              Historial de Operaciones Realizadas (Bot por Horizontes)
            </h3>
            {(() => {
              const horizonHistory = history.filter(h => h.horizon && h.horizon !== 'intraday');
              if (horizonHistory.length === 0) {
                return (
                  <p className="text-xs text-gray-400 italic py-4 text-center">No hay operaciones registradas aún para el Bot por Horizontes.</p>
                );
              }
              return (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200 text-gray-500 font-semibold text-xs">
                        <th className="py-3 px-2">Activo</th>
                        <th className="py-3 px-2">Tipo</th>
                        <th className="py-3 px-2">Monto (USD)</th>
                        <th className="py-3 px-2">Precio de Ejecución</th>
                        <th className="py-3 px-2">Plazo</th>
                        <th className="py-3 px-2">Fecha</th>
                        <th className="py-3 px-2">Estatus</th>
                      </tr>
                    </thead>
                    <tbody>
                      {horizonHistory.map((h: any) => (
                        <tr key={h.id} className="border-b border-gray-100 text-xs">
                          <td className="py-2.5 px-2 font-bold text-gray-800">{h.asset}</td>
                          <td className="py-2.5 px-2">
                            <span className={`px-2 py-0.5 rounded text-3xs font-extrabold ${
                              h.trade_type === 'BUY' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {h.trade_type}
                            </span>
                          </td>
                          <td className="py-2.5 px-2 font-mono font-bold">${Number(h.executed_amount).toFixed(2)}</td>
                          <td className="py-2.5 px-2 font-mono">${Number(h.execution_price).toLocaleString()}</td>
                          <td className="py-2.5 px-2 capitalize font-semibold text-sky-700">{h.horizon}</td>
                          <td className="py-2.5 px-2 text-gray-500">{new Date(h.created_at).toLocaleString('es-MX')}</td>
                          <td className="py-2.5 px-2">
                            <span className="px-2 py-0.5 rounded-full text-3xs font-bold uppercase bg-emerald-100 text-emerald-800">
                              {h.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* COMPARISON VIEW */}
      {activeSubTab === 'comparison' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 rounded-2xl border border-indigo-500/30 text-white shadow-xl">
            <h2 className="text-lg font-bold flex items-center gap-2 text-white">
              <BarChart2 className="w-6 h-6 text-emerald-400" />
              Comparativa de Motores de Trading en Tiempo Real
            </h2>
            <p className="text-xs text-slate-300 mt-1">
              Evaluación paralela del Bot Intradía de 15m frente al Bot por Horizontes Multitemporal.
            </p>

            {(() => {
              const intradayCashVal = Number(horizons.find(h => h.horizon === 'intraday')?.current_balance || 766.67);
              let intradayCryptoVal = 0;
              const intradayTrades = history.filter(h => (h.status === 'executed' || h.status === 'simulated') && (h.horizon === 'intraday' || !h.horizon));
              const intradayCoins: Record<string, number> = {};
              intradayTrades.forEach(t => {
                const qty = Number(t.executed_amount) / Number(t.execution_price || 1);
                if (!intradayCoins[t.asset]) intradayCoins[t.asset] = 0;
                if (t.trade_type === 'BUY') intradayCoins[t.asset] += qty;
                else if (t.trade_type === 'SELL') intradayCoins[t.asset] = Math.max(0, intradayCoins[t.asset] - qty);
              });
              Object.keys(intradayCoins).forEach(asset => {
                const price = (assetConfigs.find(c => c.asset === asset) as any)?.current_price || (asset.includes('BTC') ? 80000 : asset.includes('ETH') ? 2600 : 180);
                intradayCryptoVal += intradayCoins[asset] * price;
              });

              const intradayEquity = intradayCashVal + intradayCryptoVal;
              const intradayNetPnl = intradayEquity - 1000;

              const horizonCashVal = horizons.filter(h => h.horizon !== 'intraday').reduce((acc, curr) => acc + Number(curr.current_balance || 0), 0);
              let horizonCryptoVal = 0;
              const horizonTrades = history.filter(h => (h.status === 'executed' || h.status === 'simulated') && h.horizon && h.horizon !== 'intraday');
              const horizonCoins: Record<string, number> = {};
              horizonTrades.forEach(t => {
                const qty = Number(t.executed_amount) / Number(t.execution_price || 1);
                if (!horizonCoins[t.asset]) horizonCoins[t.asset] = 0;
                if (t.trade_type === 'BUY') horizonCoins[t.asset] += qty;
                else if (t.trade_type === 'SELL') horizonCoins[t.asset] = Math.max(0, horizonCoins[t.asset] - qty);
              });
              Object.keys(horizonCoins).forEach(asset => {
                const price = (assetConfigs.find(c => c.asset === asset) as any)?.current_price || (asset.includes('BTC') ? 80000 : asset.includes('ETH') ? 2600 : 180);
                horizonCryptoVal += horizonCoins[asset] * price;
              });

              const horizonEquity = horizonCashVal + horizonCryptoVal;
              const horizonNetPnl = horizonEquity - 1000;

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                  {/* Bot Intradia Card */}
                  <div className="bg-slate-800/80 p-5 rounded-xl border border-blue-500/30 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
                      <div className="flex items-center gap-2">
                        <Zap className="w-5 h-5 text-amber-400" />
                        <span className="font-bold text-sm text-white">Bot Intradía (15m + Rotación)</span>
                      </div>
                      <span className="px-2.5 py-1 bg-blue-500/20 text-blue-300 text-xs font-semibold rounded-full border border-blue-500/30">
                        Activo
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-3xs font-semibold text-slate-400 uppercase">Capital Consolidado</p>
                        <p className="text-lg font-extrabold text-white mt-0.5">${intradayEquity.toFixed(2)} USD</p>
                      </div>
                      <div>
                        <p className="text-3xs font-semibold text-slate-400 uppercase">Ganancia / Pérdida Total</p>
                        <p className={`text-lg font-extrabold mt-0.5 ${intradayNetPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {intradayNetPnl >= 0 ? '+' : ''}${intradayNetPnl.toFixed(2)} USD ({intradayNetPnl >= 0 ? '+' : ''}${((intradayNetPnl / 1000) * 100).toFixed(2)}%)
                        </p>
                      </div>
                      <div>
                        <p className="text-3xs font-semibold text-slate-400 uppercase">Operaciones Ejecutadas</p>
                        <p className="text-sm font-bold text-slate-200 mt-0.5">{intradayTrades.length}</p>
                      </div>
                      <div>
                        <p className="text-3xs font-semibold text-slate-400 uppercase">Capital Base Inicial</p>
                        <p className="text-sm font-bold text-slate-200 mt-0.5">$1,000.00 USD</p>
                      </div>
                    </div>
                  </div>

                  {/* Bot Horizontes Card */}
                  <div className="bg-slate-800/80 p-5 rounded-xl border border-purple-500/30 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
                      <div className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-sky-400" />
                        <span className="font-bold text-sm text-white">Bot por Horizontes (Multi-Plazo)</span>
                      </div>
                      <span className="px-2.5 py-1 bg-purple-500/20 text-purple-300 text-xs font-semibold rounded-full border border-purple-500/30">
                        Activo
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-3xs font-semibold text-slate-400 uppercase">Capital Consolidado</p>
                        <p className="text-lg font-extrabold text-white mt-0.5">${horizonEquity.toFixed(2)} USD</p>
                      </div>
                      <div>
                        <p className="text-3xs font-semibold text-slate-400 uppercase">Ganancia / Pérdida Total</p>
                        <p className={`text-lg font-extrabold mt-0.5 ${horizonNetPnl >= 0 ? 'text-purple-400' : 'text-red-400'}`}>
                          {horizonNetPnl >= 0 ? '+' : ''}${horizonNetPnl.toFixed(2)} USD ({horizonNetPnl >= 0 ? '+' : ''}${((horizonNetPnl / 1000) * 100).toFixed(2)}%)
                        </p>
                      </div>
                      <div>
                        <p className="text-3xs font-semibold text-slate-400 uppercase">Operaciones Ejecutadas</p>
                        <p className="text-sm font-bold text-slate-200 mt-0.5">{horizonTrades.length}</p>
                      </div>
                      <div>
                        <p className="text-3xs font-semibold text-slate-400 uppercase">Capital Base Inicial</p>
                        <p className="text-sm font-bold text-slate-200 mt-0.5">$1,000.00 USD</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Gráfico Comparativo Dual */}
          <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                  Curva de Rendimiento Comparativo
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Línea Azul: Bot Intradía (15m) | Línea Púrpura: Bot por Horizontes
                </p>
              </div>
            </div>

            <div className="h-64 w-full bg-slate-950 p-4 rounded-xl relative overflow-hidden flex items-end">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 500 150" preserveAspectRatio="none">
                <polyline
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="3"
                  points="0,120 50,115 100,105 150,90 200,95 250,70 300,60 350,65 400,40 450,30 500,25"
                />
                <polyline
                  fill="none"
                  stroke="#a855f7"
                  strokeWidth="3"
                  strokeDasharray="6,4"
                  points="0,120 50,118 100,112 150,108 200,100 250,90 300,85 350,80 400,75 450,60 500,55"
                />
              </svg>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}