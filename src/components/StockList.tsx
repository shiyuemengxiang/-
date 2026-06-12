import { useState } from 'react';
import { Search, TrendingUp, TrendingDown } from 'lucide-react';
import { Stock, Exchange } from '../types';

interface StockListProps {
  stocks: Stock[];
  selectedSymbol: string;
  onSelectStock: (symbol: string) => void;
}

export default function StockList({ stocks, selectedSymbol, onSelectStock }: StockListProps) {
  const [activeTab, setActiveTab] = useState<'ALL' | Exchange>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchingOnline, setIsSearchingOnline] = useState(false);
  const [searchFeedback, setSearchFeedback] = useState('');

  const handleOnlineSearch = async () => {
    if (!searchQuery) return;
    setIsSearchingOnline(true);
    setSearchFeedback('正在联网检索港/美/A股标的...');
    try {
      const uppercaseQuery = searchQuery.trim().toUpperCase();
      const res = await fetch(`/api/market/symbol/${encodeURIComponent(uppercaseQuery)}`);
      if (res.ok) {
        const data = await res.json();
        setSearchFeedback(`成功导入: ${data.name}`);
        setTimeout(() => {
          onSelectStock(data.symbol);
          setSearchQuery('');
          setSearchFeedback('');
        }, 800);
      } else {
        const errData = await res.json().catch(() => ({}));
        setSearchFeedback(errData.error || `未找到该代码 '${uppercaseQuery}'`);
      }
    } catch (err) {
      console.error('Online search failed:', err);
      setSearchFeedback('检索失败，请稍后重试');
    } finally {
      setIsSearchingOnline(false);
    }
  };

  // Filtering logs
  const filteredStocks = stocks.filter(stock => {
    // 1. Filter by Active Market Tab
    if (activeTab !== 'ALL' && stock.exchange !== activeTab) {
      return false;
    }
    // 2. Filter by search text (symbol or name)
    const query = searchQuery.toLowerCase();
    return (
      stock.symbol.toLowerCase().includes(query) ||
      stock.name.toLowerCase().includes(query)
    );
  });

  return (
    <div className="bg-[#111827] border border-slate-700 rounded-lg overflow-hidden flex flex-col h-full shadow-lg" id="stock-list-panel">
      {/* Header Panel */}
      <div className="p-3 border-b border-slate-700 bg-[#111827]">
        <h3 className="font-semibold text-xs text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-2.5">
          <Search className="h-3.5 w-3.5 text-blue-500" />
          股票行情查询
        </h3>

        {/* Search Input */}
        <div className="relative">
          <input
            type="text"
            placeholder="搜索代码、首字母或拼音..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#1E293B] border border-slate-600 rounded text-xs py-1.5 pl-7.5 pr-6 text-slate-200 placeholder-slate-450 focus:outline-none focus:border-blue-500"
          />
          <Search className="absolute left-2.5 top-2.5 h-3 w-3 text-slate-500" />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-200 text-xs"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-[#111827] border-b border-slate-705 text-[10px] p-1 gap-1">
        {(['ALL', 'HK', 'US', 'SH'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-1 rounded text-center font-medium transition-all ${
              activeTab === tab
                ? 'bg-slate-800 text-white shadow font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/10'
            }`}
          >
            {tab === 'ALL' ? '全部' : tab === 'HK' ? '港股' : tab === 'US' ? '美股' : '沪深'}
          </button>
        ))}
      </div>

      {/* Stock Table List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 custom-scrollbar">
        {filteredStocks.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-3">
            <span>未发现本地匹配的标的</span>
            {searchQuery && (
              <div className="w-full px-2" id="online-import-block">
                <button
                  onClick={handleOnlineSearch}
                  disabled={isSearchingOnline}
                  className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white font-medium py-1.5 px-3 rounded text-[11px] shadow transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {isSearchingOnline ? '🔍 正在检索...' : '🌍 联网检索并添加'}
                </button>
                {searchFeedback ? (
                  <p className={`text-[10px] mt-2 font-medium ${searchFeedback.includes('成功') ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {searchFeedback}
                  </p>
                ) : (
                  <p className="text-[10px] text-slate-400 mt-1.5 leading-normal">
                    可输入港/美/A股代码 (例: MSFT, 700, 600519) 并点击按钮，将自动拉取真实行情并加入行情看板
                  </p>
                )}
              </div>
            )}
          </div>
        ) : (
          filteredStocks.map(stock => {
            const isUp = stock.change >= 0;
            const isSelected = stock.symbol === selectedSymbol;

            return (
              <div
                key={stock.symbol}
                onClick={() => onSelectStock(stock.symbol)}
                className={`p-3 flex items-center justify-between cursor-pointer transition-all ${
                  isSelected 
                    ? 'bg-slate-800/50 border-l-2 border-blue-500 pl-2.5' 
                    : 'border-b border-slate-800/30 hover:bg-slate-800/30'
                }`}
                id={`stock-item-${stock.symbol}`}
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs font-semibold text-slate-200">{stock.symbol}</span>
                    <span className="text-[9px] bg-[#1E293B] text-slate-400 px-1 rounded font-medium">
                      {stock.exchange}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{stock.name}</div>
                </div>

                <div className="text-right">
                  <div className="font-mono text-xs font-bold text-slate-100">
                    {stock.price.toFixed(stock.price > 100 ? 1 : 2)}
                    <span className="text-[9px] text-slate-400 font-normal ml-0.5">{stock.currency}</span>
                  </div>
                  <div className={`text-[10px] font-mono font-medium flex items-center justify-end gap-0.5 mt-0.5 ${isUp ? 'text-rose-500' : 'text-emerald-400'}`}>
                    {isUp ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                    <span>{isUp ? '+' : ''}{stock.changePercent.toFixed(2)}%</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Info */}
      <div className="p-2.5 bg-[#111827] border-t border-slate-700 text-[10px] text-slate-500 text-center">
        长桥极速高频行情数据 • 更新频率: 1.5s
      </div>
    </div>
  );
}
