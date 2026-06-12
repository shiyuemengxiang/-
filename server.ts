import express from 'express';
import path from 'path';
import type { Config, QuoteContext, TradeContext, OrderType as LPOrderType, OrderSide as LPOrderSide, TimeInForceType, SubmitOrderOptions, ReplaceOrderOptions } from 'longport';

let longport: any = null;
import('longport').then(m => {
  longport = m.default || m;
}).catch(e => {
  console.warn('Failed to load longport native binding:', e);
});

import { 
  Stock, 
  Order, 
  Position, 
  AccountAssets, 
  Candle, 
  LongPortConfig, 
  OrderSide, 
  OrderType 
} from './src/types';

// In-Memory Database State
const stocks: Stock[] = [
  {
    symbol: '00700',
    name: '腾讯控股',
    exchange: 'HK',
    currency: 'HKD',
    price: 382.4,
    open: 380.0,
    high: 385.0,
    low: 378.2,
    close: 379.8,
    volume: 5240000,
    change: 2.6,
    changePercent: 0.68,
  },
  {
    symbol: '09988',
    name: '阿里巴巴-W',
    exchange: 'HK',
    currency: 'HKD',
    price: 76.85,
    open: 77.2,
    high: 78.0,
    low: 76.5,
    close: 77.45,
    volume: 12400000,
    change: -0.6,
    changePercent: -0.77,
  },
  {
    symbol: 'AAPL',
    name: '苹果公司',
    exchange: 'US',
    currency: 'USD',
    price: 184.25,
    open: 182.5,
    high: 185.1,
    low: 182.0,
    close: 182.3,
    volume: 48000000,
    change: 1.95,
    changePercent: 1.07,
  },
  {
    symbol: 'TSLA',
    name: '特斯拉',
    exchange: 'US',
    currency: 'USD',
    price: 178.5,
    open: 179.0,
    high: 181.2,
    low: 176.3,
    close: 179.1,
    volume: 64000000,
    change: -0.6,
    changePercent: -0.34,
  },
  {
    symbol: 'NVDA',
    name: '英伟达',
    exchange: 'US',
    currency: 'USD',
    price: 121.8,
    open: 119.5,
    high: 123.5,
    low: 118.8,
    close: 119.2,
    volume: 180000000,
    change: 2.6,
    changePercent: 2.18,
  },
  {
    symbol: '600519',
    name: '贵州茅台',
    exchange: 'SH',
    currency: 'CNY',
    price: 1658.0,
    open: 1652.0,
    high: 1665.0,
    low: 1645.0,
    close: 1650.0,
    volume: 1200000,
    change: 8.0,
    changePercent: 0.48,
  },
  {
    symbol: 'LPORT',
    name: 'LongPort Group',
    exchange: 'US',
    currency: 'USD',
    price: 42.15,
    open: 40.0,
    high: 43.1,
    low: 39.8,
    close: 39.9,
    volume: 1850000,
    change: 2.25,
    changePercent: 5.64,
  }
];

// Exchange rates (relative to USD)
const FX_RATES: { [key: string]: number } = {
  USD: 1.0,
  HKD: 7.8,
  CNY: 7.2,
};

// Account State
let accountAssets: AccountAssets = {
  totalAssets: 154820.0,
  cash: 85000.0, // USD
  frozenCash: 0.0, // Cash locked in buy limit orders (USD)
  stockMarketValue: 69820.0, // calculated dynamically later
  dailyProfitLoss: 1240.0,
  dailyProfitLossPercent: 0.81,
  currency: 'USD',
};

let positions: Position[] = [
  {
    symbol: '00700',
    name: '腾讯控股',
    exchange: 'HK',
    currency: 'HKD',
    quantity: 600,
    availableQuantity: 600,
    costPrice: 375.0,
    currentPrice: 382.4,
  },
  {
    symbol: 'NVDA',
    name: '英伟达',
    exchange: 'US',
    currency: 'USD',
    quantity: 330,
    availableQuantity: 330,
    costPrice: 115.0,
    currentPrice: 121.8,
  },
];

let orders: Order[] = [
  {
    id: 'ord_1',
    symbol: 'AAPL',
    name: '苹果公司',
    exchange: 'US',
    side: 'Buy',
    type: 'Limit',
    price: 180.0,
    quantity: 100,
    filledQuantity: 0,
    status: 'Pending',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'ord_2',
    symbol: '09988',
    name: '阿里巴巴-W',
    exchange: 'HK',
    side: 'Sell',
    type: 'Limit',
    price: 80.0,
    quantity: 200,
    filledQuantity: 0,
    status: 'Pending',
    createdAt: new Date(Date.now() - 1800000).toISOString(),
    updatedAt: new Date(Date.now() - 1800000).toISOString(),
  },
  {
    id: 'ord_3',
    symbol: 'TSLA',
    name: '特斯拉',
    exchange: 'US',
    side: 'Buy',
    type: 'Market',
    price: 178.5,
    quantity: 50,
    filledQuantity: 50,
    filledPrice: 178.5,
    status: 'Filled',
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    updatedAt: new Date(Date.now() - 7200000).toISOString(),
  }
];

// Historical Candlestick Database (Map symbol to array of Candles)
const candlesCache: Map<string, Candle[]> = new Map();

// Generate initial mock candlestick history (last 100 minutes)
function generateHistoricalCandles(stock: Stock) {
  const candles: Candle[] = [];
  const basePrice = stock.price;
  const now = Date.now();
  const oneMinuteMs = 60000;

  let tempPrice = basePrice - (Math.random() - 0.4) * 8; // start slightly different

  for (let i = 100; i >= 0; i--) {
    const time = now - i * oneMinuteMs;
    // random walk
    const change = (Math.random() - 0.48) * (basePrice * 0.003); // slight upward drift
    const open = tempPrice;
    const close = tempPrice + change;
    const high = Math.max(open, close) + Math.random() * (basePrice * 0.002);
    const low = Math.min(open, close) - Math.random() * (basePrice * 0.002);
    const volume = Math.floor(Math.random() * 50000) + 10000;

    candles.push({
      time,
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
      volume,
    });
    tempPrice = close;
  }
  candlesCache.set(stock.symbol, candles);
}

// Initialize candles for all stocks
stocks.forEach(stock => generateHistoricalCandles(stock));

// Credentials config
let longPortConfig: LongPortConfig = {
  appKey: '',
  appSecret: '',
  accessToken: '',
  mode: 'sandbox',
  isConnected: false,
};

let lpConfig: Config | null = null;
let lpQuoteCtx: QuoteContext | null = null;
let lpTradeCtx: TradeContext | null = null;

// --- Yahoo Finance API Helper Functions ---

function normalizeSymbolToYahoo(symbol: string): string {
  const clean = symbol.trim().toUpperCase();
  if (clean.includes('.')) return clean;
  // Numeric symbol -> default to HK or SH/SZ
  if (/^\d+$/.test(clean)) {
    if (clean.length <= 4) {
      return clean.padStart(4, '0') + '.HK'; // Yahoo uses 0700.HK for 700
    } else if (clean.length === 5) {
      return clean + '.HK';
    } else if (clean.startsWith('60') || clean.startsWith('68') || clean.startsWith('90')) {
      return clean + '.SS';
    } else {
      return clean + '.SZ';
    }
  }
  // Alphabetic symbol without dot -> default to US stock
  return clean + '.US';
}

function normalizeForLongport(symbol: string): string {
  const clean = symbol.trim().toUpperCase();
  if (clean.includes('.')) return clean;
  if (/^\d+$/.test(clean)) {
    // HK stocks: e.g. 700.HK, no need to pad, strip leading zeros
    if (clean.length <= 5) {
      const num = clean.replace(/^0+/, '');
      return (num || '0') + '.HK';
    }
    if (clean.startsWith('60') || clean.startsWith('68') || clean.startsWith('90')) return clean + '.SH'; // Longport uses .SH
    return clean + '.SZ';
  }
  return clean + '.US';
}

function normalizeYahooToLocal(yahooSymbol: string, name?: string): { symbol: string; exchange: 'HK' | 'US' | 'SH'; currency: string; name: string } {
  const clean = yahooSymbol.toUpperCase();
  let displayName = name || clean;
  if (displayName.endsWith('.US') || displayName.endsWith('.HK') || displayName.endsWith('.SS') || displayName.endsWith('.SZ')) {
     displayName = displayName.split('.')[0];
  }

  let base = clean;
  if (base.includes('.US')) base = base.replace('.US', '');
  else if (base.includes('.HK')) base = base.replace('.HK', '');
  else if (base.includes('.SS')) base = base.replace('.SS', '');
  else if (base.includes('.SZ')) base = base.replace('.SZ', '');

  // Strip leading zeroes for purely numeric tickers (e.g. 0700 => 700)
  if (/^0+\d+$/.test(base)) {
    base = base.replace(/^0+/, '');
  }

  if (clean.endsWith('.HK')) {
    return {
      symbol: base,
      exchange: 'HK',
      currency: 'HKD',
      name: displayName,
    };
  } else if (clean.endsWith('.SS')) {
    return {
      symbol: base,
      exchange: 'SH',
      currency: 'CNY',
      name: displayName,
    };
  } else if (clean.endsWith('.SZ')) {
    return {
      symbol: base,
      exchange: 'SH',
      currency: 'CNY',
      name: displayName,
    };
  } else {
    return {
      symbol: base,
      exchange: 'US',
      currency: 'USD',
      name: displayName,
    };
  }
}

async function fetchYahooQuotes(symbols: string[]): Promise<any[]> {
  try {
    const promises = symbols.map(async (s) => {
      let ls = normalizeSymbolToYahoo(s);
      if (ls.endsWith('.US')) {
        ls = ls.replace('.US', '');
      }
      try {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ls)}?interval=1d&range=1d`;
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.0.0 Safari/537.36'
          }
        });
        if (!response.ok) return null;
        const data: any = await response.json();
        const meta = data?.chart?.result?.[0]?.meta;
        if (!meta) return null;
        // Map back to the expected properties from quoteResponse
        return {
          symbol: s,
          regularMarketPrice: meta.regularMarketPrice,
          regularMarketDayHigh: meta.regularMarketDayHigh,
          regularMarketDayLow: meta.regularMarketDayLow,
          regularMarketPreviousClose: meta.previousClose || meta.chartPreviousClose,
          regularMarketVolume: meta.regularMarketVolume,
          shortName: meta.shortName,
          longName: meta.longName
        };
      } catch (e) {
        return null;
      }
    });
    const results = await Promise.all(promises);
    return results.filter(Boolean);
  } catch (error) {
    console.error('Error in fetchYahooQuotes:', error);
    return [];
  }
}


// Helpers for currency conversion
function convertToUSD(val: number, fromCurrency: string): number {
  const rate = FX_RATES[fromCurrency] || 1.0;
  return val / rate;
}

function convertFromUSD(valUSD: number, toCurrency: string): number {
  const rate = FX_RATES[toCurrency] || 1.0;
  return valUSD * rate;
}

// Recalculate account values
function recalculatePortfolio() {
  let stockMarketValueUSD = 0;
  let dailyProfitAndLossUSD = 0;

  positions.forEach(pos => {
    // Find current stock details
    const stock = stocks.find(s => s.symbol === pos.symbol);
    if (stock) {
      pos.currentPrice = stock.price;
    }
    const posValInLocal = pos.quantity * pos.currentPrice;
    const costInLocal = pos.quantity * pos.costPrice;

    const posValInUSD = convertToUSD(posValInLocal, pos.currency);
    const costInUSD = convertToUSD(costInLocal, pos.currency);

    stockMarketValueUSD += posValInUSD;
    dailyProfitAndLossUSD += (posValInUSD - costInUSD);
  });

  if (!longPortConfig.isConnected) {
    // NAV = Cash + Holds + Frozen Cash
    const totalAssetsUSD = accountAssets.cash + stockMarketValueUSD + accountAssets.frozenCash;
    
    // daily PnL calculation model
    accountAssets.stockMarketValue = parseFloat(stockMarketValueUSD.toFixed(2));
    accountAssets.totalAssets = parseFloat(totalAssetsUSD.toFixed(2));
    accountAssets.dailyProfitLoss = parseFloat(dailyProfitAndLossUSD.toFixed(2));
    
    // Base initial asset was around 150000
    const initAsset = 150000.0;
    accountAssets.dailyProfitLossPercent = parseFloat(((dailyProfitAndLossUSD / initAsset) * 100).toFixed(2));
  } else {
    // Only update the unrealized P&L part if not provided directly
    accountAssets.stockMarketValue = parseFloat(stockMarketValueUSD.toFixed(2));
    const initAsset = accountAssets.totalAssets || 150000.0;
    accountAssets.dailyProfitLoss = parseFloat(dailyProfitAndLossUSD.toFixed(2));
    accountAssets.dailyProfitLossPercent = parseFloat(((dailyProfitAndLossUSD / initAsset) * 100).toFixed(2));
  }
}

// Periodically run background ticks to update stocks & match sandbox trade orders
function startSimulationTicker() {
  setInterval(async () => {
    if (stocks.length > 0) {
      try {
        let symbolsToFetch = stocks.map(s => s.symbol);
        if (lpQuoteCtx && longPortConfig.isConnected) {
          // Add default exchange extensions since longport requires them
          const lpSymbols = symbolsToFetch.map(s => normalizeForLongport(s)); 
          const quotes = await lpQuoteCtx.quote(lpSymbols);
          
          quotes.forEach(q => {
            const localInfo = normalizeYahooToLocal(q.symbol, q.symbol);
            const stock = stocks.find(s => s.symbol === localInfo.symbol);
            if (stock) {
              stock.price = q.lastDone ? q.lastDone.toNumber() : stock.price;
              stock.open = q.open ? q.open.toNumber() : stock.open;
              stock.high = q.high ? q.high.toNumber() : stock.high;
              stock.low = q.low ? q.low.toNumber() : stock.low;
              stock.volume = q.volume ?? stock.volume;
            }
          });
        } else {
          const results = await fetchYahooQuotes(symbolsToFetch);
          results.forEach(q => {
            const localInfo = normalizeYahooToLocal(q.symbol, q.shortName || q.longName);
            const stock = stocks.find(s => s.symbol === localInfo.symbol);
            if (stock) {
              stock.price = q.regularMarketPrice ?? stock.price;
              stock.open = q.regularMarketOpen ?? stock.open;
              stock.high = q.regularMarketDayHigh ?? stock.high;
              stock.low = q.regularMarketDayLow ?? stock.low;
              stock.close = q.regularMarketPreviousClose ?? stock.close;
              stock.volume = q.regularMarketVolume ?? stock.volume;
              stock.change = q.regularMarketChange ?? stock.change;
              stock.changePercent = q.regularMarketChangePercent ?? stock.changePercent;
            }
          });
        }
      } catch (err) {
        console.error('Error in background live ticker update:', err);
      }
    }
  
    if (!longPortConfig.isConnected) {
      // 3. Match Simulation Limit Orders
      orders.forEach(order => {
        if (order.status !== 'Pending') return;

        const stock = stocks.find(s => s.symbol === order.symbol);
        if (!stock) return;

        let isFilled = false;
        let fillPrice = order.price;

        if (order.side === 'Buy') {
          // Buy limit: execute if market price is lower or equal to limit price
          if (stock.price <= order.price) {
            isFilled = true;
            fillPrice = stock.price; // execute at stock price (better execution)
          }
        } else {
          // Sell limit: execute if market price is higher or equal to limit price
          if (stock.price >= order.price) {
            isFilled = true;
            fillPrice = stock.price;
          }
        }

        if (isFilled) {
          order.status = 'Filled';
          order.filledQuantity = order.quantity;
          order.filledPrice = fillPrice;
          order.updatedAt = new Date().toISOString();

          // Process final balances upon Fill
          const totalOrderCostLocal = order.quantity * fillPrice;
          const totalOrderCostUSD = convertToUSD(totalOrderCostLocal, stock.currency);

          if (order.side === 'Buy') {
            // A Buy limit has frozen cash = limit_price * quantity (USD)
            const frozenLocal = order.quantity * order.price;
            const frozenTotalUSD = convertToUSD(frozenLocal, stock.currency);

            // Deduct from Frozen, refund difference if fillPrice was cheaper, deduct totalOrderCostUSD from cash
            accountAssets.frozenCash = Math.max(0, parseFloat((accountAssets.frozenCash - frozenTotalUSD).toFixed(2)));
            // Refund difference if filled price is lower than limit price
            const refundUSD = frozenTotalUSD - totalOrderCostUSD;
            accountAssets.cash = parseFloat((accountAssets.cash - totalOrderCostUSD).toFixed(2));

            // Create/update position
            const existingPos = positions.find(p => p.symbol === order.symbol);
            if (existingPos) {
              const totalCostLocal = (existingPos.quantity * existingPos.costPrice) + totalOrderCostLocal;
              existingPos.quantity += order.quantity;
              existingPos.availableQuantity += order.quantity;
              existingPos.costPrice = parseFloat((totalCostLocal / existingPos.quantity).toFixed(2));
              existingPos.currentPrice = stock.price;
            } else {
              positions.push({
                symbol: order.symbol,
                name: order.name,
                exchange: order.exchange,
                currency: stock.currency,
                quantity: order.quantity,
                availableQuantity: order.quantity,
                costPrice: fillPrice,
                currentPrice: stock.price,
              });
            }
          } else {
            // Sell order: unfreeze holdings, add gained cash from sell
            const existingPos = positions.find(p => p.symbol === order.symbol);
            if (existingPos) {
              existingPos.quantity -= order.quantity;
              // Sold stocks are already frozen, so available stays as is or gets cleaned up
              if (existingPos.quantity <= 0) {
                // Delete position if fully liquidated
                positions = positions.filter(p => p.symbol !== order.symbol);
              } else {
                existingPos.currentPrice = stock.price;
              }
            }
            accountAssets.cash = parseFloat((accountAssets.cash + totalOrderCostUSD).toFixed(2));
          }
        }
      });
    }

    // 4. Recalculate portfolio to reflect stock changes
    recalculatePortfolio();
  }, 2000);
}

if (!process.env.VERCEL) {
  startSimulationTicker();
}

export const app = express();
app.use(express.json());

// In Vercel serverless environments, req.url might be stripped of the mount path (e.g. /market/stocks instead of /api/market/stocks).
app.use((req, res, next) => {
  if (process.env.VERCEL && !req.url.startsWith('/api')) {
    req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
  }
  next();
});

  // === Core API Routes ===

  // 1. Get Live Stock List
  app.get('/api/market/stocks', (req, res) => {
    res.json(stocks);
  });

  // 2. Search stock details by symbol
  app.get('/api/market/symbol/:symbol', async (req, res) => {
    const symbol = req.params.symbol.toUpperCase();
    let stock = stocks.find(s => s.symbol === symbol);

    if (!stock) {
      try {
        if (lpQuoteCtx && longPortConfig.isConnected) {
          const lpSymbol = normalizeForLongport(symbol);
          const quotesResult = await lpQuoteCtx.quote([lpSymbol]);
          if (quotesResult && quotesResult.length > 0) {
            const q = quotesResult[0];
            let name = q.symbol;
            try {
              const infos = await lpQuoteCtx.staticInfo([lpSymbol]);
              name = infos && infos.length > 0 ? (infos[0].nameCn || infos[0].nameEn || q.symbol) : q.symbol;
            } catch (sfErr) {
              console.warn(`staticInfo failed for ${lpSymbol}, using symbol instead`);
            }
            const localInfo = normalizeYahooToLocal(q.symbol, name);
            stock = {
              symbol: localInfo.symbol,
              name: localInfo.name,
              exchange: localInfo.exchange,
              currency: localInfo.currency,
              price: q.lastDone ? q.lastDone.toNumber() : 0,
              open: q.open ? q.open.toNumber() : 0,
              high: q.high ? q.high.toNumber() : 0,
              low: q.low ? q.low.toNumber() : 0,
              close: 0,
              volume: q.volume || 0,
              change: 0,
              changePercent: 0,
            };
            stocks.push(stock);
            generateHistoricalCandles(stock);
          }
        } else {
          const quotesResult = await fetchYahooQuotes([symbol]);
          if (quotesResult && quotesResult.length > 0) {
            const q = quotesResult[0];
            const localInfo = normalizeYahooToLocal(q.symbol, q.shortName || q.longName);
            stock = {
              symbol: localInfo.symbol,
              name: localInfo.name,
              exchange: localInfo.exchange,
              currency: localInfo.currency,
              price: q.regularMarketPrice ?? 0,
              open: q.regularMarketOpen ?? 0,
              high: q.regularMarketDayHigh ?? 0,
              low: q.regularMarketDayLow ?? 0,
              close: q.regularMarketPreviousClose ?? 0,
              volume: q.regularMarketVolume ?? 0,
              change: q.regularMarketChange ?? 0,
              changePercent: q.regularMarketChangePercent ?? 0,
            };
            stocks.push(stock);
            generateHistoricalCandles(stock);
          }
        }
      } catch (err) {
        console.error(`Failed to dynamically fetch stock quote for ${symbol}:`, err);
      }
    }

    if (!stock) {
      return res.status(404).json({ error: `未找到代码为 ${symbol} 的股票` });
    }
    res.json(stock);
  });

  // 3. Get candlestick chart data
  app.get('/api/market/candles/:symbol', async (req, res) => {
    const symbol = req.params.symbol.toUpperCase();

    try {
      let yahooSymbol = normalizeSymbolToYahoo(symbol);
      if (yahooSymbol.endsWith('.US')) {
         yahooSymbol = yahooSymbol.replace('.US', '');
      }
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=15m&range=5d`;
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.0.0 Safari/537.36'
          }
        });
        if (!response.ok) {
          throw new Error(`Yahoo chart request responded with status ${response.status}`);
        }
        const data: any = await response.json();
        const chartResult = data?.chart?.result?.[0];
        if (chartResult) {
          const timestamps = chartResult.timestamp || [];
          const quote = chartResult.indicators?.quote?.[0] || {};
          const opens = quote.open || [];
          const highs = quote.high || [];
          const lows = quote.low || [];
          const closes = quote.close || [];
          const volumes = quote.volume || [];

          const candlesVec: Candle[] = [];
          for (let i = 0; i < timestamps.length; i++) {
            if (opens[i] !== null && closes[i] !== null) {
              candlesVec.push({
                time: timestamps[i] * 1000,
                open: parseFloat(opens[i].toFixed(2)),
                high: parseFloat(highs[i].toFixed(2)),
                low: parseFloat(lows[i].toFixed(2)),
                close: parseFloat(closes[i].toFixed(2)),
                volume: Math.floor(volumes[i] || 0),
              });
            }
          }
          if (candlesVec.length > 0) {
            candlesCache.set(symbol, candlesVec);
            return res.json(candlesVec);
          }
        }
      } catch (err) {
        console.error(`Error loading real-market candles for ${symbol}:`, err);
      }

    const candles = candlesCache.get(symbol);
    if (!candles) {
      return res.status(404).json({ error: `未找到代码为 ${symbol} 的历史K线` });
    }
    res.json(candles);
  });

  // 3b. Search for any stock dynamically on Yahoo search
  app.get('/api/market/search', async (req, res) => {
    const query = (req.query.q || '').toString().trim();
    if (!query) {
      return res.json([]);
    }

    try {
      const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.0.0 Safari/537.36'
        }
      });
      if (!response.ok) {
        throw new Error(`Yahoo search responded with status ${response.status}`);
      }
      const data: any = await response.json();
      const rawQuotes = data?.quotes || [];

      const results = rawQuotes
        .filter((q: any) => q.quoteType === 'EQUITY' || q.typeDisp === 'Equity')
        .map((q: any) => {
          const localInfo = normalizeYahooToLocal(q.symbol, q.shortname || q.longname);
          return {
            symbol: localInfo.symbol,
            name: localInfo.name,
            exchange: localInfo.exchange,
            currency: localInfo.currency,
          };
        })
        .slice(0, 10);

      res.json(results);
    } catch (err) {
      console.error('Error searching on Yahoo Finance:', err);
      res.status(500).json({ error: '搜索服务暂时不可用' });
    }
  });

  // 4. Get Account Assets
  app.get('/api/account/assets', async (req, res) => {
    if (lpTradeCtx && longPortConfig.isConnected) {
      try {
        const balances = await lpTradeCtx.accountBalance();
        if (balances && balances.length > 0) {
          const mainBal = balances[0];
          accountAssets.totalAssets = mainBal.netAssets ? mainBal.netAssets.toNumber() : accountAssets.totalAssets;
          accountAssets.cash = mainBal.totalCash ? mainBal.totalCash.toNumber() : accountAssets.cash;
          
          if (mainBal.currency) {
            accountAssets.currency = mainBal.currency;
          }
          if (mainBal.cashInfos && mainBal.cashInfos.length > 0) {
            accountAssets.cashInfos = mainBal.cashInfos.map(ci => ({
              currency: ci.currency,
              availableCash: ci.availableCash ? ci.availableCash.toNumber() : 0,
              frozenCash: ci.frozenCash ? ci.frozenCash.toNumber() : 0,
            }));
          }
        }
      } catch (err: any) {
        console.error('Failed to sync account balance from Longport:', err);
      }
    }
    recalculatePortfolio();
    res.json(accountAssets);
  });

  // 5. Get Account Positions
  app.get('/api/account/positions', async (req, res) => {
    if (lpTradeCtx && longPortConfig.isConnected) {
      try {
        const posRes = await lpTradeCtx.stockPositions();
        if (posRes && posRes.channels && posRes.channels.length > 0) {
          const lpPositions = posRes.channels[0].positions || [];
          
          // Match LP positions dynamically
          const newPositions: Position[] = [];
          for (const lpPos of lpPositions) {
            const sym = normalizeYahooToLocal(lpPos.symbol, lpPos.symbolName);
            newPositions.push({
              symbol: sym.symbol,
              name: sym.name,
              exchange: sym.exchange,
              currency: sym.currency,
              quantity: lpPos.quantity.toNumber(),
              availableQuantity: lpPos.availableQuantity.toNumber(),
              costPrice: lpPos.costPrice.toNumber(),
              currentPrice: 0, // will be refilled by recalculatePortfolio
            });
            // Ensure the stock exists in the mock list
            if (!stocks.find(s => s.symbol === sym.symbol)) {
               stocks.push({
                  symbol: sym.symbol,
                  name: sym.name,
                  exchange: sym.exchange,
                  currency: sym.currency,
                  price: lpPos.costPrice.toNumber(), // fallback
                  open: lpPos.costPrice.toNumber(),
                  high: lpPos.costPrice.toNumber(),
                  low: lpPos.costPrice.toNumber(),
                  close: lpPos.costPrice.toNumber(),
                  volume: 0,
                  change: 0,
                  changePercent: 0,
               });
            }
          }
          positions = newPositions;
        }
      } catch (err: any) {
        console.error('Failed to sync positions from Longport:', err);
      }
    }
    recalculatePortfolio();
    res.json(positions);
  });

  // 6. Get Account Orders
  app.get('/api/account/orders', async (req, res) => {
    if (lpTradeCtx && longPortConfig.isConnected) {
      try {
        const lpOrders = await lpTradeCtx.todayOrders();
        if (lpOrders) {
           const mapOrderStatus = (status: number) => {
             // 5=Filled, 11=PartialFilled, 15=Canceled, 14=Rejected
             if (status === 5) return 'Filled';
             if (status === 15) return 'Cancelled';
             if (status === 14) return 'Rejected';
             return 'Pending';
           };
           const mapOrderType = (t: number) => {
             // 1=LO, 3=MO
             return t === 3 ? 'Market' : 'Limit';
           };
           
           const mappedOrders: Order[] = lpOrders.map(o => ({
              id: o.orderId,
              symbol: normalizeYahooToLocal(o.symbol, o.stockName).symbol,
              name: normalizeYahooToLocal(o.symbol, o.stockName).name,
              exchange: 'US', // Dummy
              side: o.side === 1 ? 'Buy' : 'Sell',
              type: mapOrderType(o.orderType as unknown as number) as OrderType,
              price: o.price ? o.price.toNumber() : 0,
              quantity: o.quantity ? o.quantity.toNumber() : 0,
              filledQuantity: o.executedQuantity ? o.executedQuantity.toNumber() : 0,
              status: mapOrderStatus(o.status as unknown as number) as any,
              createdAt: o.submittedAt ? o.submittedAt.toISOString() : new Date().toISOString(),
              updatedAt: o.updatedAt ? o.updatedAt.toISOString() : new Date().toISOString(),
           }));
           // We might sort it by time
           mappedOrders.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
           orders = mappedOrders;
           return res.json(orders);
        }
      } catch (err: any) {
        console.error('Failed to sync orders from Longport:', err);
      }
    }
    res.json(orders);
  });

  // 7. Place a New Trade Order (Buy/Sell, Limit/Market)
  app.post('/api/trade/order', async (req, res) => {
    const { symbol, side, type, price, quantity } = req.body;

    if (!symbol || !side || !type || !quantity || quantity <= 0) {
      return res.status(400).json({ error: '订单提交参数不完整或无效' });
    }

    const stock = stocks.find(s => s.symbol === symbol.toUpperCase());
    if (!stock) {
      return res.status(404).json({ error: '所选交易代码对应股票不存在' });
    }

    const limitPrice = type === 'Limit' ? parseFloat(price) : stock.price;
    if (type === 'Limit' && (!limitPrice || limitPrice <= 0)) {
      return res.status(400).json({ error: '限价单价格不合法' });
    }

    if (lpTradeCtx && longPortConfig.isConnected) {
      try {
        const lpSymbol = normalizeForLongport(symbol);
        const orderOpts: SubmitOrderOptions = {
          symbol: lpSymbol,
          orderType: type === 'Limit' ? 1 : 3, // 1=LO, 3=MO
          side: side === 'Buy' ? 1 : 2, // 1=Buy, 2=Sell
          submittedQuantity: new longport.Decimal(quantity.toString()),
          timeInForce: 1, // 1=Day
        };
        if (type === 'Limit') {
          orderOpts.submittedPrice = new longport.Decimal(limitPrice.toFixed(2));
        }
        
        const resp = await lpTradeCtx.submitOrder(orderOpts);
        
        const newOrder: Order = {
          id: resp.orderId || ('ord_' + Math.random().toString(36).substr(2, 9)),
          symbol: stock.symbol,
          name: stock.name,
          exchange: stock.exchange,
          side: side,
          type: type as OrderType,
          price: limitPrice,
          quantity,
          filledQuantity: 0,
          status: 'Pending',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        orders.unshift(newOrder); // Keep locally
        return res.json({ success: true, order: newOrder });
      } catch (err: any) {
        console.error('Longport submit failed', err);
        return res.status(500).json({ error: `提交Longport订单失败: ${err.message}` });
      }
    }

    // Fallback sandbox logic
    const totalCostLocal = quantity * limitPrice;
    const totalCostUSD = convertToUSD(totalCostLocal, stock.currency);

    // BUY Trade Verification
    if (side === 'Buy') {
      if (accountAssets.cash < totalCostUSD) {
        return res.status(400).json({ error: `资金不足！预估所需资金为 ${totalCostUSD.toFixed(2)} USD（含汇率转换），可用现金为 ${accountAssets.cash.toFixed(2)} USD` });
      }

      const orderId = 'ord_' + Math.random().toString(36).substr(2, 9);
      const newOrder: Order = {
        id: orderId,
        symbol: stock.symbol,
        name: stock.name,
        exchange: stock.exchange,
        side: 'Buy',
        type: type as OrderType,
        price: limitPrice,
        quantity,
        filledQuantity: 0,
        status: type === 'Market' ? 'Filled' : 'Pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (type === 'Market') {
        // Market order fills instantly
        newOrder.filledQuantity = quantity;
        newOrder.filledPrice = stock.price;
        
        // Subtract from cash
        const actualCostLocal = quantity * stock.price;
        const actualCostUSD = convertToUSD(actualCostLocal, stock.currency);
        accountAssets.cash = parseFloat((accountAssets.cash - actualCostUSD).toFixed(2));

        // Create/Update Position
        const existingPos = positions.find(p => p.symbol === stock.symbol);
        if (existingPos) {
          const totalCostPosLocal = (existingPos.quantity * existingPos.costPrice) + actualCostLocal;
          existingPos.quantity += quantity;
          existingPos.availableQuantity += quantity;
          existingPos.costPrice = parseFloat((totalCostPosLocal / existingPos.quantity).toFixed(2));
          existingPos.currentPrice = stock.price;
        } else {
          positions.push({
            symbol: stock.symbol,
            name: stock.name,
            exchange: stock.exchange,
            currency: stock.currency,
            quantity,
            availableQuantity: quantity,
            costPrice: stock.price,
            currentPrice: stock.price,
          });
        }
      } else {
        // Limit order buffers to pending state, freeze cash
        accountAssets.cash = parseFloat((accountAssets.cash - totalCostUSD).toFixed(2));
        accountAssets.frozenCash = parseFloat((accountAssets.frozenCash + totalCostUSD).toFixed(2));
      }

      orders.unshift(newOrder);
      recalculatePortfolio();
      return res.json({ success: true, order: newOrder });

    // SELL Trade Verification
    } else if (side === 'Sell') {
      const existingPos = positions.find(p => p.symbol === stock.symbol);
      if (!existingPos || existingPos.availableQuantity < quantity) {
        return res.status(400).json({ error: `持仓不足！您最多可卖出该股票 ${existingPos?.availableQuantity || 0} 股，当前尝试卖出 ${quantity} 股` });
      }

      // Freeze holdings for sell limit order
      existingPos.availableQuantity -= quantity;

      const orderId = 'ord_' + Math.random().toString(36).substr(2, 9);
      const newOrder: Order = {
        id: orderId,
        symbol: stock.symbol,
        name: stock.name,
        exchange: stock.exchange,
        side: 'Sell',
        type: type as OrderType,
        price: limitPrice,
        quantity,
        filledQuantity: 0,
        status: type === 'Market' ? 'Filled' : 'Pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (type === 'Market') {
        newOrder.filledQuantity = quantity;
        newOrder.filledPrice = stock.price;

        const sellSucceedValLocal = quantity * stock.price;
        const sellSucceedValUSD = convertToUSD(sellSucceedValLocal, stock.currency);

        existingPos.quantity -= quantity;
        if (existingPos.quantity <= 0) {
          positions = positions.filter(p => p.symbol !== stock.symbol);
        } else {
          existingPos.currentPrice = stock.price;
        }

        // Add to cash
        accountAssets.cash = parseFloat((accountAssets.cash + sellSucceedValUSD).toFixed(2));
      } else {
        // Limit order doesn't add money yet, keep stocks frozen
      }

      orders.unshift(newOrder);
      recalculatePortfolio();
      return res.json({ success: true, order: newOrder });
    }

    return res.status(400).json({ error: '无效交易类型' });
  });

  // 8. Modify a Pending Order (Update Price and/or Quantity)
  app.put('/api/trade/order/:id', async (req, res) => {
    const orderId = req.params.id;
    const { price: newPrice, quantity: newQuantity } = req.body;

    const order = orders.find(o => o.id === orderId);
    if (!order) {
      return res.status(404).json({ error: '未找到该订单' });
    }
    if (order.status !== 'Pending') {
      return res.status(400).json({ error: '订单当前状态不可修改 (已成交/已撤销)' });
    }

    const parsedPrice = parseFloat(newPrice);
    const parsedQuantity = parseInt(newQuantity);

    if (isNaN(parsedPrice) || parsedPrice <= 0 || isNaN(parsedQuantity) || parsedQuantity <= 0) {
      return res.status(400).json({ error: '价格或数量格式不合法' });
    }

    if (lpTradeCtx && longPortConfig.isConnected && !orderId.startsWith('ord_')) {
       try {
         const opts: ReplaceOrderOptions = {
           orderId: orderId,
           quantity: new longport.Decimal(parsedQuantity.toString()),
           price: new longport.Decimal(parsedPrice.toFixed(2)),
         };
         await lpTradeCtx.replaceOrder(opts);
         
         order.price = parsedPrice;
         order.quantity = parsedQuantity;
         order.updatedAt = new Date().toISOString();
         return res.json({ success: true, order });
       } catch (err: any) {
         console.error('Longport replace/modify failed', err);
         return res.status(500).json({ error: `修改Longport订单失败: ${err.message}` });
       }
    }

    const stock = stocks.find(s => s.symbol === order.symbol);
    if (!stock) {
      return res.status(500).json({ error: '无法获取关联合情数据' });
    }

    const originalCostLocal = order.quantity * order.price;
    const originalCostUSD = convertToUSD(originalCostLocal, stock.currency);

    const targetCostLocal = parsedQuantity * parsedPrice;
    const targetCostUSD = convertToUSD(targetCostLocal, stock.currency);

    if (order.side === 'Buy') {
      // Adjustment of frozen cash: targetCostUSD - originalCostUSD
      const fundingDiffUSD = targetCostUSD - originalCostUSD;
      if (fundingDiffUSD > 0 && accountAssets.cash < fundingDiffUSD) {
        return res.status(400).json({ error: `资金不足，修改失败！预估修改后需补交资金 ${fundingDiffUSD.toFixed(2)} USD，可用现金为 ${accountAssets.cash.toFixed(2)} USD` });
      }

      // Update account figures
      accountAssets.cash = parseFloat((accountAssets.cash - fundingDiffUSD).toFixed(2));
      accountAssets.frozenCash = parseFloat((accountAssets.frozenCash + fundingDiffUSD).toFixed(2));
    } else {
      // Adjust frozen holdings
      const existingPos = positions.find(p => p.symbol === order.symbol);
      if (!existingPos) {
        return res.status(400).json({ error: '持仓状态异常，无法定位持仓股票' });
      }

      const qtyDiff = parsedQuantity - order.quantity;
      if (qtyDiff > 0 && existingPos.availableQuantity < qtyDiff) {
        return res.status(400).json({ error: `持仓不足以满足数量修改！当前持仓可用额度：${existingPos.availableQuantity} 股，需要额外冻结：${qtyDiff} 股` });
      }

      existingPos.availableQuantity -= qtyDiff;
    }

    // Apply adjustments
    order.price = parsedPrice;
    order.quantity = parsedQuantity;
    order.updatedAt = new Date().toISOString();

    recalculatePortfolio();
    res.json({ success: true, order });
  });

  // 9. Cancel / Revoke a Pending Order
  app.delete('/api/trade/order/:id', async (req, res) => {
    const orderId = req.params.id;
    const order = orders.find(o => o.id === orderId);

    if (lpTradeCtx && longPortConfig.isConnected && !orderId.startsWith('ord_')) {
       try {
         await lpTradeCtx.cancelOrder(orderId);
         if (order) {
           order.status = 'Cancelled';
           order.updatedAt = new Date().toISOString();
         }
         return res.json({ success: true, order });
       } catch (err: any) {
         console.error('Longport cancel failed', err);
         return res.status(500).json({ error: `撤销Longport订单失败: ${err.message}` });
       }
    }

    if (!order) {
      return res.status(404).json({ error: '未找到要撤销的订单' });
    }
    if (order.status !== 'Pending') {
      return res.status(400).json({ error: '订单非挂单状态，无法撤销' });
    }

    const stock = stocks.find(s => s.symbol === order.symbol);
    
    order.status = 'Cancelled';
    order.updatedAt = new Date().toISOString();
    
    const orderCostLocal = order.quantity * order.price;
    const orderCurrency = stock ? stock.currency : (order.symbol?.endsWith('.HK') ? 'HKD' : 'USD');
    const orderCostUSD = convertToUSD(orderCostLocal, orderCurrency);

    if (order.side === 'Buy') {
      // Return frozen cash
      accountAssets.frozenCash = Math.max(0, parseFloat((accountAssets.frozenCash - orderCostUSD).toFixed(4)));
      accountAssets.cash = parseFloat((accountAssets.cash + orderCostUSD).toFixed(4));
    } else {
      // Return frozen stock quantity
      const existingPos = positions.find(p => p.symbol === order.symbol);
      if (existingPos) {
        existingPos.availableQuantity += order.quantity;
      }
    }

    recalculatePortfolio();
    res.json({ success: true, order });
  });

  // 10. Configure LongPort Credentials
  app.post('/api/config/credentials', async (req, res) => {
    const { appKey, appSecret, accessToken, mode } = req.body;

    if (!appKey || !appSecret || !accessToken) {
      return res.status(400).json({ error: '配置参数缺失，请录入 AppKey、AppSecret、AccessToken' });
    }

    try {
      lpConfig = new longport.Config({
        appKey,
        appSecret,
        accessToken,
        enablePrintQuotePackages: false,
      });

      lpQuoteCtx = await longport.QuoteContext.new(lpConfig);
      lpTradeCtx = await longport.TradeContext.new(lpConfig);

      longPortConfig = {
        appKey,
        appSecret,
        accessToken,
        mode: mode || 'sandbox',
        isConnected: true, // Mock valid verification
      };
      
      // Attempt to sync positions & assets initially
      try {
        const positionsRes = await lpTradeCtx.stockPositions();
        if (positionsRes && positionsRes.channels && positionsRes.channels.length > 0) {
          const positionsData = positionsRes.channels[0].positions;
        }
      } catch (err) {
        console.warn('Silent issue loading initial positions', err);
      }

      res.json({ success: true, config: { isConnected: true, mode: longPortConfig.mode } });
    } catch (error: any) {
      console.error('Failed to init LongPort context', error);
      res.status(500).json({ error: '验证长桥凭证失败: ' + error.message });
    }
  });

  // 11. Retrieve Current Connection Status
  app.get('/api/config/credentials', (req, res) => {
    res.json({
      isConnected: longPortConfig.isConnected,
      mode: longPortConfig.mode,
      hasCredentials: !!longPortConfig.appKey,
    });
  });

  // Vite middleware for development
  async function startServer() {
    const PORT = process.env.PORT || 3000;
    if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } else if (!process.env.VERCEL) {
      const distPath = path.join(process.cwd(), 'dist');
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }

    if (!process.env.VERCEL) {
      app.listen(PORT as number, '0.0.0.0', () => {
        console.log(`Server running on http://localhost:${PORT}`);
      });
    }
  }

  startServer();
