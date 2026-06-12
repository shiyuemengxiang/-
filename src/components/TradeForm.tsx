import React, { useState, useEffect, useMemo } from 'react';
import { Stock, OrderSide, OrderType, Position, AccountAssets } from '../types';
import { ArrowUpDown, HelpCircle, Shield, Briefcase, DollarSign } from 'lucide-react';

interface TradeFormProps {
  stock: Stock;
  accountAssets: AccountAssets;
  positions: Position[];
  onPlaceOrder: (order: {
    symbol: string;
    side: OrderSide;
    type: OrderType;
    price: number;
    quantity: number;
  }) => Promise<any>;
}

export default function TradeForm({ stock, accountAssets, positions, onPlaceOrder }: TradeFormProps) {
  const [side, setSide] = useState<OrderSide>('Buy');
  const [type, setType] = useState<OrderType>('Limit');
  const [priceInput, setPriceInput] = useState('');
  const [quantityInput, setQuantityInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Synchronize price input when stock selection changes
  useEffect(() => {
    setPriceInput(stock.price.toString());
    setQuantityInput('');
    setErrorMessage('');
    setSuccessMessage('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stock.symbol]);

  // Derive target currency exchange rate factor
  const FX_FACTORS: { [key: string]: number } = {
    USD: 1.0,
    HKD: 7.8,
    CNY: 7.2,
  };
  const fxRate = FX_FACTORS[stock.currency] || 1.0;

  // Maximum purchase power or holding quantity calculation
  const maxBuyableQuantity = useMemo(() => {
    const currentPrice = parseFloat(priceInput) || stock.price;
    if (currentPrice <= 0) return 0;
    
    let availableCashInLocal = 0;
    const cacheInfos = accountAssets.cashInfos || [];
    const targetedCash = cacheInfos.find(ci => ci.currency === stock.currency);

    if (targetedCash) {
       // Perfect match, LongPort returns the asset in native currency.
       availableCashInLocal = targetedCash.availableCash;
    } else {
      // Fallback
      if (accountAssets.currency === stock.currency) {
         availableCashInLocal = accountAssets.cash;
      } else {
         const baseToUsdFactor = accountAssets.currency === 'USD' ? 1.0 : (FX_FACTORS[accountAssets.currency] ? 1 / FX_FACTORS[accountAssets.currency] : 1);
         const usdValue = accountAssets.cash * baseToUsdFactor;
         availableCashInLocal = usdValue * fxRate;
      }
    }

    return Math.floor(availableCashInLocal / currentPrice);
  }, [accountAssets, priceInput, stock.price, stock.currency, fxRate]);

  const maxSellableQuantity = useMemo(() => {
    const position = positions.find(p => p.symbol === stock.symbol);
    return position ? position.availableQuantity : 0;
  }, [positions, stock.symbol]);

  // Handle order percentage shortcuts (25%, 50%, etc)
  const handlePercentShortcut = (pct: number) => {
    if (side === 'Buy') {
      const targetQty = Math.floor(maxBuyableQuantity * pct);
      setQuantityInput(targetQty > 0 ? targetQty.toString() : '');
    } else {
      const targetQty = Math.floor(maxSellableQuantity * pct);
      setQuantityInput(targetQty > 0 ? targetQty.toString() : '');
    }
  };

  // Standard bid ask book offsets (买五/卖五)
  const orderBook = useMemo(() => {
    const p = stock.price;
    const spreads = [0.05, 0.04, 0.03, 0.02, 0.01];
    
    const asks = spreads.map((spread, idx) => {
      const askPrice = p + spread * (p > 500 ? 5 : p > 100 ? 1 : 0.2);
      const randVol = Math.floor(Math.random() * 8000) + 1200;
      return { level: 5 - idx, price: parseFloat(askPrice.toFixed(2)), volume: randVol };
    });

    const bids = spreads.reverse().map((spread, idx) => {
      const bidPrice = p - spread * (p > 500 ? 5 : p > 100 ? 1 : 0.2);
      const randVol = Math.floor(Math.random() * 8000) + 1200;
      return { level: idx + 1, price: parseFloat(bidPrice.toFixed(2)), volume: randVol };
    });

    return { asks, bids };
  }, [stock.price]);

  const previewEstimateUSD = useMemo(() => {
    const p = type === 'Limit' ? parseFloat(priceInput) : stock.price;
    const q = parseInt(quantityInput) || 0;
    if (isNaN(p) || p <= 0 || q <= 0) return 0;

    const totalInLocal = p * q;
    return totalInLocal / fxRate; // Convert to USD
  }, [priceInput, quantityInput, type, stock.price, fxRate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const targetPrice = type === 'Limit' ? parseFloat(priceInput) : stock.price;
    const targetQty = parseInt(quantityInput);

    if (isNaN(targetPrice) || targetPrice <= 0) {
      setErrorMessage('请输入合法的价格参数');
      return;
    }
    if (isNaN(targetQty) || targetQty <= 0) {
      setErrorMessage('请输入买卖股数/数量');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await onPlaceOrder({
        symbol: stock.symbol,
        side,
        type,
        price: targetPrice,
        quantity: targetQty,
      });

      if (result.success) {
        setSuccessMessage(`✓ 订单已提交：以 ${targetPrice.toFixed(2)} ${stock.currency} ${side === 'Buy' ? '买入' : '卖出'} ${targetQty} 股`);
        setQuantityInput('');
      } else {
        setErrorMessage(result.error || '交易失败');
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.error || err.message || '系统繁忙，下单失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-full" id="trade-form-panel text-slate-200">
      {/* Ask-Bid Order Book Panel (Depth) - Columns 5 */}
      <div className="lg:col-span-5 bg-[#1E293B] border border-slate-700 rounded-lg p-3.5 flex flex-col justify-between shadow-lg text-[10px] font-mono select-none">
        <div>
          <div className="text-slate-400 font-bold mb-3 border-b border-slate-700 pb-1.5 flex items-center justify-between text-[11px] uppercase tracking-wider">
            <span>十档行情 / 交易深度</span>
            <span className="text-[9px] text-slate-500 font-normal normal-case">毫秒级逐笔</span>
          </div>

          {/* ASKS (卖五 - 卖一) */}
          <div className="space-y-0.5">
            {orderBook.asks.map(ask => (
              <div 
                key={`ask-${ask.level}`} 
                onClick={() => setPriceInput(ask.price.toString())}
                className="flex items-center justify-between hover:bg-slate-800/30 p-1.5 rounded cursor-pointer transition-colors"
              >
                <span className="text-rose-500 font-medium">卖 {ask.level}</span>
                <span className="text-slate-100 font-bold">{ask.price.toFixed(2)}</span>
                <span className="text-slate-400 font-semibold">{ask.volume.toLocaleString()}</span>
              </div>
            ))}
          </div>

          {/* Current Middle Ticker */}
          <div className="my-2 py-1.5 border-y border-slate-750 flex items-center justify-between font-bold text-xs bg-[#111827]/65 px-2 rounded">
            <span className="text-slate-400 font-medium">最新价:</span>
            <span className={`text-[12px] font-mono font-extrabold ${stock.change >= 0 ? 'text-rose-500' : 'text-emerald-400'}`}>
              {stock.price.toFixed(2)}
            </span>
            <span className={`text-[10px] font-mono font-semibold ${stock.change >= 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {stock.change >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
            </span>
          </div>

          {/* BIDS (买一 - 买五) */}
          <div className="space-y-0.5">
            {orderBook.bids.map(bid => (
              <div 
                key={`bid-${bid.level}`} 
                onClick={() => setPriceInput(bid.price.toString())}
                className="flex items-center justify-between hover:bg-slate-800/30 p-1.5 rounded cursor-pointer transition-colors"
              >
                <span className="text-emerald-400 font-medium font-semibold">买 {bid.level}</span>
                <span className="text-slate-100 font-bold">{bid.price.toFixed(2)}</span>
                <span className="text-slate-400 font-semibold">{bid.volume.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Short info */}
        <div className="bg-[#111827] p-2 rounded border border-slate-700/60 mt-3 leading-relaxed text-slate-400 text-[9px] text-center flex items-center gap-1.2 justify-center">
          <Shield className="h-3 w-3 text-blue-500 flex-shrink-0" />
          <span>点击以上档价，可自动填入买卖限价框内。</span>
        </div>
      </div>

      {/* Trade Submission Form - Columns 7 */}
      <div className="lg:col-span-7 bg-[#1E293B] border border-slate-700 rounded-lg p-3.5 flex flex-col justify-between shadow-lg text-xs">
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* BUY SELL TOGGLE */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#111827] rounded border border-slate-700">
            <button
              type="button"
              onClick={() => {
                setSide('Buy');
                setErrorMessage('');
                setSuccessMessage('');
              }}
              className={`py-1.5 text-xs font-bold rounded transition-all flex items-center justify-center gap-1 ${
                side === 'Buy'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              买入 (Buy)
            </button>
            <button
              type="button"
              onClick={() => {
                setSide('Sell');
                setErrorMessage('');
                setSuccessMessage('');
              }}
              className={`py-1.5 text-xs font-bold rounded transition-all flex items-center justify-center gap-1 ${
                side === 'Sell'
                  ? 'bg-[#10B981] text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              卖出 (Sell)
            </button>
          </div>

          {/* ORDER TYPE */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">订单类型 (Type)</label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setType('Limit')}
                className={`py-1.5 rounded border text-[11px] font-medium transition-all ${
                  type === 'Limit'
                    ? 'border-blue-500 bg-blue-950/20 text-blue-405 font-bold'
                    : 'border-slate-700 bg-slate-900 text-slate-400 hover:bg-slate-850'
                }`}
              >
                限价单 (Limit)
              </button>
              <button
                type="button"
                onClick={() => setType('Market')}
                className={`py-1.5 rounded border text-[11px] font-medium transition-all ${
                  type === 'Market'
                    ? 'border-blue-500 bg-blue-950/20 text-blue-405 font-bold'
                    : 'border-slate-700 bg-slate-900 text-slate-400 hover:bg-slate-850'
                }`}
              >
                市价单 (Market)
              </button>
            </div>
          </div>

          {/* PRICE INPUT (Limit only) */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              {type === 'Limit' ? '委托价格' : '委托价格'} ({stock.currency})
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                disabled={type === 'Market'}
                required={type === 'Limit'}
                placeholder={type === 'Market' ? '将以当时的最优市价成交' : '输入委托价'}
                value={type === 'Market' ? '' : priceInput}
                onChange={(e) => setPriceInput(e.target.value)}
                className={`w-full bg-slate-900 border text-xs px-2.5 py-1.5 text-white rounded font-mono focus:outline-none focus:border-blue-500 ${
                  type === 'Market' ? 'border-slate-850/50 cursor-not-allowed text-slate-500 bg-slate-900/60' : 'border-slate-750'
                }`}
              />
              {type === 'Market' && (
                <span className="absolute right-3 top-2 text-[10px] text-slate-500 font-mono">
                  市价 (Market)
                </span>
              )}
            </div>
          </div>

          {/* QUANTITY INPUT */}
          <div>
            <div className="flex justify-between items-center mb-1 text-[10px] font-medium text-slate-400">
              <label className="font-bold uppercase tracking-wider">买买股数 (Quantity)</label>
              {side === 'Buy' ? (
                <span className="text-slate-500 font-mono flex items-center gap-1 normal-case">
                  <DollarSign className="h-3 w-3 inline" /> 可买约 
                  <span className="text-slate-300 font-bold">{maxBuyableQuantity}</span> 股
                </span>
              ) : (
                <span className="text-slate-500 font-mono flex items-center gap-1 normal-case">
                  <Briefcase className="h-3 w-3 inline" /> 可卖 
                  <span className="text-slate-300 font-bold">{maxSellableQuantity}</span> 股
                </span>
              )}
            </div>
            <div className="relative">
              <input
                type="number"
                min="1"
                step="1"
                required
                placeholder="请输入股数"
                value={quantityInput}
                onChange={(e) => setQuantityInput(e.target.value)}
                className="w-full bg-slate-900 border border-slate-750 text-xs px-2.5 py-1.5 text-white rounded font-mono focus:outline-none focus:border-blue-500"
              />
              <span className="absolute right-3 top-2 text-[10px] text-slate-500 font-mono font-medium">股</span>
            </div>
          </div>

          {/* QUICK SHORTCUT BUTTONS */}
          <div className="grid grid-cols-4 gap-2 text-[10px] font-bold">
            {['1/4', '1/2', '3/4', '整仓'].map((label, idx) => {
              const fraction = (idx + 1) * 0.25;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => handlePercentShortcut(fraction)}
                  className="bg-slate-900 border border-slate-700 py-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* ESTIMATES VALUE ROW */}
          {previewEstimateUSD > 0 && (
            <div className="p-2.5 bg-slate-900 border border-slate-700 rounded flex justify-between items-center text-[10px] font-mono leading-relaxed">
              <span className="text-slate-400 font-semibold">预估委托总额:</span>
              <div className="text-right">
                <span className="text-slate-200 font-bold">{(parseFloat(quantityInput) * (type === 'Limit' ? parseFloat(priceInput) : stock.price)).toFixed(2)} {stock.currency}</span>
                <span className="text-slate-400 block text-[9px]">≈ {previewEstimateUSD.toFixed(1)} USD</span>
              </div>
            </div>
          )}

          {/* STATUS MESSAGES */}
          {errorMessage && (
            <div className="p-2 bg-rose-950/30 border border-rose-900/40 rounded text-[10px] text-rose-450 leading-normal">
              ⚠️ {errorMessage}
            </div>
          )}
          {successMessage && (
            <div className="p-2 bg-emerald-950/20 border border-emerald-900/30 rounded text-[10px] text-emerald-400 leading-normal">
              {successMessage}
            </div>
          )}
        </form>

        {/* SUBMISSION CTA */}
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className={`w-full py-2.5 mt-3.5 text-xs font-bold rounded select-none text-white tracking-wider cursor-pointer shadow-md transition-all ${
            side === 'Buy'
              ? 'bg-rose-600 hover:bg-rose-500'
              : 'bg-emerald-600 hover:bg-emerald-500'
          }`}
          id="btn-execute-trade"
        >
          {isSubmitting ? '下单并加密处理中...' : `${side === 'Buy' ? '买入' : '卖出'} ${stock.name} (${stock.symbol})`}
        </button>
      </div>
    </div>
  );
}
