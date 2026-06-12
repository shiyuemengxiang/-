import { useState, useEffect, useMemo } from 'react';
import Header from './components/Header';
import StockList from './components/StockList';
import StockChart from './components/StockChart';
import TradeForm from './components/TradeForm';
import PortfolioTabs from './components/PortfolioTabs';
import { Stock, Order, Position, AccountAssets, Candle, LongPortConfig, OrderSide, OrderType } from './types';
import { Activity, ShieldAlert, BadgeInfo } from 'lucide-react';

export default function App() {
  // Application Data States
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState<string>('00700');
  const [candles, setCandles] = useState<Candle[]>([]);
  const [assets, setAssets] = useState<AccountAssets>({
    totalAssets: 0,
    cash: 0,
    frozenCash: 0,
    stockMarketValue: 0,
    dailyProfitLoss: 0,
    dailyProfitLossPercent: 0,
    currency: 'USD',
  });
  const [positions, setPositions] = useState<Position[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [config, setConfig] = useState<LongPortConfig>({
    appKey: '',
    appSecret: '',
    accessToken: '',
    mode: 'sandbox',
    isConnected: false,
  });

  // Client visual indicators
  const [isLoading, setIsLoading] = useState(true);
  const [connectionError, setConnectionError] = useState(false);

  // Derive currently active selected stock object
  const selectedStock = useMemo(() => {
    return stocks.find(s => s.symbol === selectedSymbol);
  }, [stocks, selectedSymbol]);

  // 1. Fetch initial configuration & pre-fill states
  useEffect(() => {
    async function init() {
      try {
        // Hydrate from localStorage first
        const storedConfig = localStorage.getItem('lp_config');
        if (storedConfig) {
          try {
            const parsed = JSON.parse(storedConfig);
            if (parsed.appKey && parsed.appSecret && parsed.accessToken) {
               await fetch('/api/config/credentials', {
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify(parsed),
               });
            }
          } catch(e) {}
        }
        
        const storedSymbols = localStorage.getItem('lp_symbols');
        if (storedSymbols) {
           try {
             const parsedSymbols = JSON.parse(storedSymbols);
             for (const sym of parsedSymbols) {
               await fetch(`/api/market/symbol/${encodeURIComponent(sym)}`);
             }
           } catch(e) {}
        }

        const configRes = await fetch('/api/config/credentials');
        if (configRes.ok) {
          const configData = await configRes.json();
          setConfig(prev => ({
            ...prev,
            appKey: configData.hasCredentials ? '********' : '',
            appSecret: configData.hasCredentials ? '********' : '',
            accessToken: configData.hasCredentials ? '********' : '',
            mode: configData.mode,
            isConnected: configData.isConnected,
          }));
        }

        // Fetch first batch of market and asset structures
        await fetchMarket();
        await fetchAccount();
        setIsLoading(false);
      } catch (err) {
        console.error('Error during initial sync load:', err);
        setConnectionError(true);
        setIsLoading(false);
      }
    }
    init();
  }, []);

  // Persist searched symbols to local storage
  useEffect(() => {
    if (stocks.length > 0) {
      localStorage.setItem('lp_symbols', JSON.stringify(stocks.map(s => s.symbol)));
    }
  }, [stocks]);

  // 2. Fetch market list
  const fetchMarket = async () => {
    try {
      const res = await fetch('/api/market/stocks');
      if (res.ok) {
        const data = await res.json();
        setStocks(data);
      }
    } catch (err) {
      console.error('Error fetching market ticks:', err);
    }
  };

  // 3. Fetch account holdings & balances
  const fetchAccount = async () => {
    try {
      // Run concurrent requests
      const [assetsRes, positionsRes, ordersRes] = await Promise.all([
        fetch('/api/account/assets'),
        fetch('/api/account/positions'),
        fetch('/api/account/orders'),
      ]);

      if (assetsRes.ok && positionsRes.ok && ordersRes.ok) {
        const assetsData = await assetsRes.json();
        const positionsData = await positionsRes.json();
        const ordersData = await ordersRes.json();

        setAssets(assetsData);
        setPositions(positionsData);
        setOrders(ordersData);
      }
    } catch (err) {
      console.error('Error fetching account statistics:', err);
    }
  };

  // 4. Fetch specific historical candles
  const fetchCandles = async (symbol: string) => {
    try {
      const res = await fetch(`/api/market/candles/${symbol}`);
      if (res.ok) {
        const data = await res.json();
        setCandles(data);
      }
    } catch (err) {
      console.error(`Error fetching coordinates for ${symbol}:`, err);
    }
  };

  // Load K-lines on symbol change
  useEffect(() => {
    fetchCandles(selectedSymbol);
  }, [selectedSymbol]);

  // 5. Active Live polling hook (Every 3.5 seconds)
  useEffect(() => {
    const timer = setInterval(() => {
      fetchMarket();
      fetchAccount();
      if (selectedSymbol) {
        fetchCandles(selectedSymbol);
      }
    }, 3500);

    return () => clearInterval(timer);
  }, [selectedSymbol]);

  // --- Trade Action Handlers ---

  // A. Submit new trade
  const handlePlaceOrder = async (orderData: {
    symbol: string;
    side: OrderSide;
    type: OrderType;
    price: number;
    quantity: number;
  }) => {
    const res = await fetch('/api/trade/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData),
    });

    const data = await res.json();
    if (res.ok) {
      // Instantly synchronize account balances
      fetchAccount();
    }
    return data;
  };

  // B. Modify existing limit order
  const handleModifyOrder = async (orderId: string, price: number, quantity: number) => {
    const res = await fetch(`/api/trade/order/${orderId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ price, quantity }),
    });

    const data = await res.json();
    if (res.ok) {
      fetchAccount();
    }
    return data;
  };

  // C. Cancel existing trade order
  const handleCancelOrder = async (orderId: string) => {
    const res = await fetch(`/api/trade/order/${orderId}`, {
      method: 'DELETE',
    });

    const data = await res.json();
    if (res.ok) {
      fetchAccount();
    }
    return data;
  };

  // D. Save LongPort Credentials Configurations
  const handleSaveConfig = async (newCfg: {
    appKey: string;
    appSecret: string;
    accessToken: string;
    mode: 'sandbox' | 'live';
  }) => {
    try {
      localStorage.setItem('lp_config', JSON.stringify({
        appKey: newCfg.appKey,
        appSecret: newCfg.appSecret,
        accessToken: newCfg.accessToken,
        mode: newCfg.mode
      }));

      const res = await fetch('/api/config/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCfg),
      });

      if (res.ok) {
        const resData = await res.json();
        setConfig({
          ...newCfg,
          appKey: '********',
          appSecret: '********',
          accessToken: '********',
          isConnected: resData.config.isConnected,
        });
        
        // Ensure account figures (assets & holdings) sync dynamically right after successful configuration
        fetchAccount();
        fetchMarket(); // Update stocks to reflect any differences immediately
      }
    } catch (err) {
      console.error('Error setting credentials config:', err);
    }
  };

  const handleSelectStock = async (symbol: string) => {
    setSelectedSymbol(symbol);
    if (!stocks.some(s => s.symbol === symbol)) {
      try {
        const res = await fetch('/api/market/stocks');
        if (res.ok) {
          const freshStocks = await res.json();
          setStocks(freshStocks);
        }
      } catch (err) {
        console.error('Error fetching fresh market on selection:', err);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-250 flex flex-col font-sans" id="trading-terminal-root">
      {/* App Header Bar */}
      <Header 
        config={config} 
        onSaveConfig={handleSaveConfig} 
        systemStatus={connectionError ? 'simulating' : 'connected'} 
      />

      {/* Loading Canvas overlay */}
      {isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-[#0F172A] border-t border-slate-700 gap-3">
          <Activity className="h-8 w-8 text-blue-500 animate-spin" />
          <span className="text-xs text-slate-400 font-medium">正在启动 LongPort OpenAPI 交易服务端安全连接...</span>
        </div>
      ) : (
        <main className="flex-1 p-4 grid grid-cols-1 xl:grid-cols-12 gap-4 max-w-[1600px] mx-auto w-full min-h-0">
          {/* LEFT: Quotation List / Search (width 3 grid columns) */}
          <section className="xl:col-span-3 flex flex-col h-[400px] xl:h-auto min-h-0" id="terminal-section-left">
            <StockList 
              stocks={stocks} 
              selectedSymbol={selectedSymbol} 
              onSelectStock={handleSelectStock} 
            />
          </section>

          {/* RIGHT/CENTER CONTENT: Chart, Trade form, Portfolio (width 9 grid columns) */}
          <section className="xl:col-span-9 space-y-4 flex flex-col min-h-0" id="terminal-section-right">
            
            {/* Split layout: Chart & Placement Form */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
              {/* Candlestick Chart Area (col 7) */}
              <div className="xl:col-span-7 min-w-0" id="section-chart-container">
                {selectedStock ? (
                  <StockChart stock={selectedStock} candles={candles} />
                ) : (
                  <div className="bg-[#1E293B]/60 border border-slate-700 rounded-xl p-8 text-center text-slate-400 h-[400px] flex items-center justify-center text-xs">
                    请在左侧列表中选定一支证券，以加载其K线以及行情
                  </div>
                )}
              </div>

              {/* Order depth and Form Area (col 5) */}
              <div className="xl:col-span-5 min-w-0" id="section-trade-form-container">
                {selectedStock ? (
                  <TradeForm 
                    stock={selectedStock} 
                    accountAssets={assets} 
                    positions={positions} 
                    onPlaceOrder={handlePlaceOrder} 
                  />
                ) : (
                  <div className="bg-[#1E293B]/60 border border-slate-700 rounded-xl p-8 text-center text-slate-400 h-[400px] flex items-center justify-center text-xs">
                    载入交易单异常
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Section: Account portfolios holdings & orders logs */}
            <div className="w-full" id="section-portfolio-container">
              <PortfolioTabs 
                assets={assets}
                positions={positions}
                orders={orders}
                onSelectStock={setSelectedSymbol}
                onModifyOrder={handleModifyOrder}
                onCancelOrder={handleCancelOrder}
              />
            </div>
          </section>
        </main>
      )}

      {/* Connection Notice Bar (when server connects but local assets are empty) */}
      {connectionError && (
        <div className="bg-amber-950/20 text-amber-400 border-t border-amber-900/30 px-5 py-2 flex items-center gap-2 text-xs font-medium justify-center">
          <ShieldAlert className="h-3.5 w-3.5 flex-shrink-0" />
          <span>无法连通到真实的 OpenAPI 网关，已自动启动本地离线沙箱模拟匹配引擎。您依然能够进行流畅的下单、股票检索及挂单操作。</span>
        </div>
      )}
    </div>
  );
}
