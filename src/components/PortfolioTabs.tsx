import { useState, useMemo } from 'react';
import { AccountAssets, Position, Order } from '../types';
import { Briefcase, FileClock, ClipboardList, Wallet, Edit, Trash2, ArrowRight } from 'lucide-react';

interface PortfolioTabsProps {
  assets: AccountAssets;
  positions: Position[];
  orders: Order[];
  onSelectStock: (symbol: string) => void;
  onModifyOrder: (orderId: string, price: number, quantity: number) => Promise<any>;
  onCancelOrder: (orderId: string) => Promise<any>;
}

export default function PortfolioTabs({ 
  assets, 
  positions, 
  orders, 
  onSelectStock, 
  onModifyOrder, 
  onCancelOrder 
}: PortfolioTabsProps) {
  const [activeTab, setActiveTab] = useState<'positions' | 'pending' | 'all-orders'>('positions');
  const [modifyingOrderId, setModifyingOrderId] = useState<string | null>(null);
  const [modPrice, setModPrice] = useState('');
  const [modQuantity, setModQuantity] = useState('');
  const [modError, setModError] = useState('');

  // Divide orders
  const pendingOrders = useMemo(() => orders.filter(o => o.status === 'Pending'), [orders]);
  
  const dailyProfitUp = assets.dailyProfitLoss >= 0;

  // Prepare input values to modify
  const openModifyForm = (order: Order) => {
    setModifyingOrderId(order.id);
    setModPrice(order.price.toString());
    setModQuantity(order.quantity.toString());
    setModError('');
  };

  const handleApplyModify = async (orderId: string) => {
    const p = parseFloat(modPrice);
    const q = parseInt(modQuantity);

    if (isNaN(p) || p <= 0 || isNaN(q) || q <= 0) {
      setModError('请输入合法价格和正数股数');
      return;
    }

    const res = await onModifyOrder(orderId, p, q);
    if (res.success) {
      setModifyingOrderId(null);
    } else {
      setModError(res.error || '修改失败');
    }
  };

  const handleCancel = async (orderId: string) => {
    if (window.confirm('确定要撤销当前选中的交易挂单吗？')) {
      await onCancelOrder(orderId);
    }
  };

  return (
    <div className="space-y-4" id="portfolio-tabs-panel">
      {/* 4-Column Assets Metric Card */}
      <div className="bg-[#1E293B]/65 border border-slate-700 rounded-lg p-4 sm:p-5 shadow-lg max-w-full text-slate-200">
        <h3 className="text-xs font-bold text-slate-400 mb-3 flex items-center gap-1.5 uppercase tracking-wider">
          <Wallet className="h-3.5 w-3.5 text-blue-500" />
          综合账户资产概述 ({assets.currency || 'USD'} 本位币)
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* NET ASSET VALUE */}
          <div className="bg-[#111827] p-3 rounded border border-slate-700">
            <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">总资产净值 (NAV)</span>
            <span className="text-base sm:text-lg font-mono font-bold text-white mt-1 block">
              {assets.totalAssets.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
              <span className="text-[10px] text-slate-455 font-normal ml-0.5">{assets.currency || 'USD'}</span>
            </span>
          </div>

          {/* AVAILABLE CASH */}
          <div className="bg-[#111827] p-3 rounded border border-slate-700">
            <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">可用现金/冻结现金</span>
            {assets.cashInfos && assets.cashInfos.length > 0 ? (
              <div className="flex flex-col gap-0.5 mt-1">
                {assets.cashInfos.map((ci, idx) => (
                  <div key={idx} className="flex items-baseline gap-1">
                    <span className="text-sm font-mono font-bold text-slate-100">
                      {ci.availableCash.toLocaleString(undefined, {minimumFractionDigits: 1, maximumFractionDigits: 2})}
                    </span>
                    <span className="text-[9px] text-slate-500 font-medium font-mono">
                      / {ci.frozenCash.toFixed(1)} {ci.currency}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-base sm:text-base font-mono font-bold text-slate-100">
                  {assets.cash.toLocaleString(undefined, {minimumFractionDigits: 1, maximumFractionDigits: 2})}
                </span>
                <span className="text-[10px] text-slate-500 font-medium font-mono">
                  / {assets.frozenCash.toFixed(1)} {assets.currency || 'USD'}
                </span>
              </div>
            )}
          </div>

          {/* STOCK VALUE */}
          <div className="bg-[#111827] p-3 rounded border border-slate-700">
            <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">证券总市值</span>
            <span className="text-base sm:text-lg font-mono font-bold text-slate-100 mt-1 block">
              {assets.stockMarketValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
              <span className="text-[10px] text-slate-455 font-normal ml-0.5">{assets.currency || 'USD'}</span>
            </span>
          </div>

          {/* TODAY'S P&L */}
          <div className={`p-3 rounded border transition-all ${
            dailyProfitUp 
              ? 'bg-rose-950/20 border-rose-900/40 text-rose-455' 
              : 'bg-emerald-950/20 border-emerald-900/30 text-emerald-400'
          }`}>
            <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">今日浮动盈亏 (P&L)</span>
            <div className="flex items-baseline gap-1.5 mt-1 font-mono font-bold">
              <span className="text-base sm:text-base">
                {dailyProfitUp ? '+' : ''}{assets.dailyProfitLoss.toFixed(2)}
              </span>
              <span className="text-xs">
                ({dailyProfitUp ? '+' : ''}{assets.dailyProfitLossPercent.toFixed(2)}%)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Tabs Segment */}
      <div className="bg-[#1E293B]/65 border border-slate-700 rounded-lg overflow-hidden shadow-lg flex flex-col min-h-[280px]">
        {/* Tab Headers */}
        <div className="flex bg-[#111827] border-b border-slate-700 text-xs text-slate-400 font-medium p-1 select-none">
          <button
            onClick={() => setActiveTab('positions')}
            className={`flex items-center gap-1.5 py-2 px-3 rounded text-xs transition-all ${
              activeTab === 'positions'
                ? 'bg-slate-800 text-white font-bold'
                : 'hover:text-slate-200'
            }`}
          >
            <Briefcase className="h-3.5 w-3.5" />
            持仓持股明细 ({positions.length})
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={`flex items-center gap-1.5 py-2 px-3 rounded text-xs transition-all ${
              activeTab === 'pending'
                ? 'bg-slate-800 text-white font-bold'
                : 'hover:text-slate-200'
            }`}
          >
            <FileClock className="h-3.5 w-3.5" />
            待交易挂单 ({pendingOrders.length})
          </button>
          <button
            onClick={() => setActiveTab('all-orders')}
            className={`flex items-center gap-1.5 py-2 px-3 rounded text-xs transition-all ${
              activeTab === 'all-orders'
                ? 'bg-slate-800 text-white font-bold'
                : 'hover:text-slate-200'
            }`}
          >
            <ClipboardList className="h-3.5 w-3.5" />
            今日所有订单 ({orders.length})
          </button>
        </div>

        {/* Tab Inner Panels */}
        <div className="flex-1 p-3.5 overflow-x-auto min-w-full">
          {/* TAB 1: POSITIONS */}
          {activeTab === 'positions' && (
            <div className="min-w-[650px]">
              {positions.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500">
                  当前尚无任何证券持仓。进行买入下单后，相应的代码及持仓信息将在此展示。
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-750 pb-2">
                      <th className="py-2.5 font-bold uppercase tracking-wider text-[10px]">证券名称/代码</th>
                      <th className="py-2.5 font-bold uppercase tracking-wider text-[10px] text-right">持股数 / 可用数</th>
                      <th className="py-2.5 font-bold uppercase tracking-wider text-[10px] text-right">成本价 / 持仓底仓</th>
                      <th className="py-2.5 font-bold uppercase tracking-wider text-[10px] text-right">当前市价</th>
                      <th className="py-2.5 font-bold uppercase tracking-wider text-[10px] text-right">当前总市值</th>
                      <th className="py-2.5 font-bold uppercase tracking-wider text-[10px] text-right">持仓浮动盈亏</th>
                      <th className="py-2.5 font-bold uppercase tracking-wider text-[10px] text-right">下单操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-802 text-slate-200 font-mono">
                    {positions.map(pos => {
                      const valueLocal = pos.quantity * pos.currentPrice;
                      const costLocal = pos.quantity * pos.costPrice;
                      const pnlLocal = valueLocal - costLocal;
                      const pnlPct = costLocal > 0 ? (pnlLocal / costLocal) * 100 : 0;
                      const isProfit = pnlLocal >= 0;

                      return (
                        <tr key={pos.symbol} className="hover:bg-slate-800/20 transition-colors">
                          <td className="py-2.5 pr-2 font-sans">
                            <div className="font-bold text-white text-sm">{pos.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                              {pos.symbol} • {pos.exchange} ({pos.currency})
                            </div>
                          </td>
                          <td className="py-2.5 text-right">
                            <span className="text-slate-200 font-bold font-mono">{pos.quantity}</span>
                            <span className="block text-[10px] text-slate-500 font-medium">可用: {pos.availableQuantity}</span>
                          </td>
                          <td className="py-2.5 text-right text-slate-300">{pos.costPrice.toFixed(2)}</td>
                          <td className="py-2.5 text-right text-slate-100 font-bold">{pos.currentPrice.toFixed(2)}</td>
                          <td className="py-2.5 text-right font-bold text-slate-200">
                            {valueLocal.toLocaleString(undefined, {minimumFractionDigits: 1, maximumFractionDigits: 2})}
                          </td>
                          <td className={`py-2.5 text-right font-bold ${isProfit ? 'text-rose-500' : 'text-emerald-400'}`}>
                            <span>{isProfit ? '+' : ''}{pnlLocal.toFixed(2)}</span>
                            <span className="block text-[10px] font-medium">{isProfit ? '+' : ''}{pnlPct.toFixed(2)}%</span>
                          </td>
                          <td className="py-2.5 text-right">
                            <button
                              onClick={() => onSelectStock(pos.symbol)}
                              className="px-2 py-1 text-[10px] font-bold text-blue-400 bg-blue-950/20 hover:bg-blue-950/50 border border-blue-900/40 rounded transition flex items-center gap-1 ml-auto cursor-pointer"
                            >
                              快捷买卖 <ArrowRight className="h-3 w-3" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* TAB 2: PENDING ORDERS */}
          {activeTab === 'pending' && (
            <div className="min-w-[650px]">
              {pendingOrders.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500">
                  当前尚无任何有效的待成交挂单。
                </div>
              ) : (
                <div className="space-y-4">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="text-slate-400 border-b border-slate-750 pb-2">
                        <th className="py-2.5 font-bold uppercase tracking-wider text-[10px]">标的名称/代码</th>
                        <th className="py-2.5 font-bold uppercase tracking-wider text-[10px]">方向</th>
                        <th className="py-2.5 font-bold uppercase tracking-wider text-[10px]">订单类型</th>
                        <th className="py-2.5 font-bold uppercase tracking-wider text-[10px] text-right">委托价格</th>
                        <th className="py-2.5 font-bold uppercase tracking-wider text-[10px] text-right">股数 / 已成交</th>
                        <th className="py-2.5 font-bold uppercase tracking-wider text-[10px]">状态</th>
                        <th className="py-2.5 font-bold uppercase tracking-wider text-[10px]">提交时间</th>
                        <th className="py-2.5 font-bold uppercase tracking-wider text-[10px] text-right">指令操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-802 text-slate-200 font-mono">
                      {pendingOrders.map(order => (
                        <tr key={order.id} className="hover:bg-slate-800/20 transition-colors">
                          <td className="py-2.5 pr-2 font-sans">
                            <div className="font-bold text-white text-sm">{order.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">{order.symbol} • {order.exchange}</div>
                          </td>
                          <td className="py-2.5">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                              order.side === 'Buy' ? 'bg-rose-950/40 text-rose-450 border border-rose-900/30' : 'bg-emerald-950/40 text-emerald-450 border border-emerald-900/30'
                            }`}>
                              {order.side === 'Buy' ? '买入' : '卖出'}
                            </span>
                          </td>
                          <td className="py-2.5 text-slate-400 font-sans">{order.type === 'Limit' ? '限价单' : '市价单'}</td>
                          <td className="py-2.5 text-right font-bold text-slate-100">{order.price.toFixed(2)}</td>
                          <td className="py-2.5 text-right text-slate-200">
                            {order.quantity} <span className="text-[10px] text-slate-500">/ {order.filledQuantity}</span>
                          </td>
                          <td className="py-2.5">
                            <span className="text-blue-400 text-[11px] font-bold animate-pulse">待交易</span>
                          </td>
                          <td className="py-2.5 text-slate-500 text-[10px] font-sans">
                            {new Date(order.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </td>
                          <td className="py-2.5 text-right">
                            <div className="flex items-center gap-1.5 justify-end">
                              <button
                                onClick={() => openModifyForm(order)}
                                className="px-2 py-1 bg-slate-800 hover:bg-slate-705 text-slate-300 rounded text-[10px] font-semibold border border-slate-700/60 flex items-center gap-1 cursor-pointer"
                              >
                                <Edit className="h-3 w-3" /> 改单
                              </button>
                              <button
                                onClick={() => handleCancel(order.id)}
                                className="px-2 py-1 bg-rose-950/20 hover:bg-rose-900/30 text-rose-400 rounded text-[10px] font-semibold border border-rose-900/20 flex items-center gap-1 cursor-pointer"
                              >
                                <Trash2 className="h-3 w-3" /> 撤单
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* INLINE MODIFY DRAW-UP / DRAWER */}
                  {modifyingOrderId && (
                    <div className="bg-slate-900 p-4 rounded border border-slate-700 space-y-3 max-w-sm ml-auto animate-in fade-in duration-100">
                      <div className="flex justify-between items-center pb-1 border-b border-slate-750">
                        <span className="text-xs font-bold text-white">修改当前挂单委任</span>
                        <button onClick={() => setModifyingOrderId(null)} className="text-slate-500 text-xs hover:text-slate-300">取消</button>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <label className="text-slate-400 block mb-1">修改价格</label>
                          <input
                            type="number"
                            step="0.01"
                            value={modPrice}
                            onChange={(e) => setModPrice(e.target.value)}
                            className="bg-slate-950 border border-slate-700 text-slate-200 w-full rounded p-1.5 focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="text-slate-400 block mb-1">修改数量</label>
                          <input
                            type="number"
                            step="1"
                            value={modQuantity}
                            onChange={(e) => setModQuantity(e.target.value)}
                            className="bg-slate-950 border border-slate-700 text-slate-200 w-full rounded p-1.5 focus:outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>

                      {modError && <div className="text-[10px] text-rose-400 font-semibold">{modError}</div>}

                      <button
                        onClick={() => handleApplyModify(modifyingOrderId)}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs py-1.5 rounded transition"
                      >
                        确认递交修改说明
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ALL ORDERS */}
          {activeTab === 'all-orders' && (
            <div className="min-w-[650px]">
              {orders.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500">
                  今天尚无任何交易指令细节。
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-750 pb-2">
                      <th className="py-2.5 font-bold uppercase tracking-wider text-[10px]">标的名称/代码</th>
                      <th className="py-2.5 font-bold uppercase tracking-wider text-[10px]">指令动作</th>
                      <th className="py-2.5 font-bold uppercase tracking-wider text-[10px]">性质</th>
                      <th className="py-2.5 font-bold uppercase tracking-wider text-[10px] text-right">委托价格 / 均成交价</th>
                      <th className="py-2.5 font-bold uppercase tracking-wider text-[10px] text-right">委托股数 / 已成交</th>
                      <th className="py-2.5 font-bold uppercase tracking-wider text-[10px]">当前状态</th>
                      <th className="py-2.5 font-bold uppercase tracking-wider text-[10px] text-right">最后修改</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-802 text-slate-200 font-mono">
                    {orders.map(order => {
                      const isBuy = order.side === 'Buy';
                      const isPending = order.status === 'Pending';
                      const isFilled = order.status === 'Filled';
                      const isCancelled = order.status === 'Cancelled';

                      return (
                        <tr key={order.id} className="hover:bg-slate-800/20 transition-colors">
                          <td className="py-2.5 pr-2 font-sans">
                            <div className="font-bold text-white text-sm">{order.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">{order.symbol} • {order.exchange}</div>
                          </td>
                          <td className="py-2.5">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                              isBuy ? 'bg-rose-950/40 text-rose-450 border border-rose-900/30' : 'bg-emerald-950/40 text-emerald-450 border border-emerald-900/30'
                            }`}>
                              {isBuy ? '买入' : '卖出'}
                            </span>
                          </td>
                          <td className="py-2.5 text-slate-400 font-sans">{order.type === 'Limit' ? '限价单' : '市价单'}</td>
                          <td className="py-2.5 text-right font-bold text-slate-100">
                            {order.price.toFixed(2)}
                            <span className="block text-[10px] font-normal text-slate-500">
                              均: {order.filledPrice ? order.filledPrice.toFixed(2) : '--'}
                            </span>
                          </td>
                          <td className="py-2.5 text-right text-slate-200">
                            {order.quantity} <span className="text-[10px] text-slate-500">/ {order.filledQuantity}</span>
                          </td>
                          <td className="py-2.5">
                            <span className={`text-[11px] font-bold ${
                              isPending 
                                ? 'text-blue-400 animate-pulse' 
                                : isFilled 
                                  ? 'text-rose-500 font-extrabold' 
                                  : isCancelled 
                                    ? 'text-slate-500' 
                                    : 'text-red-500'
                            }`}>
                              {isPending ? '挂单中' : isFilled ? '完全成交' : isCancelled ? '已撤销' : '已拒绝'}
                            </span>
                          </td>
                          <td className="py-2.5 text-right text-slate-500 text-[10px] font-sans">
                            {new Date(order.updatedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>
    </div>  );
}
