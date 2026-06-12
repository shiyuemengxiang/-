import { useState, useMemo } from 'react';
import { 
  ResponsiveContainer, 
  ComposedChart, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Bar, 
  Line, 
  ReferenceLine,
  CartesianGrid 
} from 'recharts';
import { Candle, Stock } from '../types';
import { Clock, TrendingUp, TrendingDown, Layers, BarChart4 } from 'lucide-react';

interface StockChartProps {
  stock: Stock;
  candles: Candle[];
}

export default function StockChart({ stock, candles }: StockChartProps) {
  const [chartType, setChartType] = useState<'candle' | 'line'>('candle');
  const [timeframe, setTimeframe] = useState<'1m' | '5m' | '1d'>('1m');

  // Format candles data for Recharts compatibility
  const chartData = useMemo(() => {
    return candles.map(c => {
      const open = parseFloat(c.open.toFixed(2));
      const close = parseFloat(c.close.toFixed(2));
      const high = parseFloat(c.high.toFixed(2));
      const low = parseFloat(c.low.toFixed(2));
      const isUp = close >= open;

      return {
        ...c,
        // formatted time for XAxis display
        timeLabel: new Date(c.time).toLocaleTimeString('zh-CN', { 
          hour: '2-digit', 
          minute: '2-digit',
          second: '2-digit'
        }),
        // Recharts dual bar coordinates
        openClose: [open, close],
        highLow: [low, high],
        isUp,
        volume: c.volume,
        closePrice: close,
      };
    });
  }, [candles]);

  const isUp = stock.change >= 0;

  // Render tooltip inside chart
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as Candle & { timeLabel: string; isUp: boolean };
      return (
        <div className="bg-slate-950/95 border border-slate-800 p-3 rounded-lg shadow-xl text-xs font-mono text-slate-300">
          <div className="text-[11px] text-slate-500 mb-1.5 flex items-center gap-1">
            <Clock className="h-3 w-3" /> {data.timeLabel}
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <div>开盘: <span className="text-slate-100">{data.open.toFixed(2)}</span></div>
            <div>收盘: <span className={data.close >= data.open ? 'text-rose-500' : 'text-emerald-500'}>{data.close.toFixed(2)}</span></div>
            <div>最高: <span className="text-rose-400">{data.high.toFixed(2)}</span></div>
            <div>最低: <span className="text-emerald-400">{data.low.toFixed(2)}</span></div>
            <div className="col-span-2 mt-1 border-t border-slate-800 pt-1 text-slate-400">
              成交: <span className="text-slate-200">{data.volume.toLocaleString()} 股</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-[#1E293B]/65 border border-slate-700 rounded-lg p-4 shadow-lg flex flex-col h-[400px]" id="stock-chart-panel">
      {/* Chart Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-700 pb-3 mb-4">
        {/* Left Info */}
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base text-white">{stock.name}</span>
              <span className="font-mono text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-medium">
                {stock.symbol}.{stock.exchange}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="font-mono font-bold text-lg text-white">
                {stock.price.toFixed(stock.price > 100 ? 1 : 2)}
                <span className="text-xs text-slate-400 font-normal ml-0.5">{stock.currency}</span>
              </span>
              <span className={`text-xs font-mono font-semibold flex items-center gap-0.5 ${isUp ? 'text-rose-500' : 'text-emerald-400'}`}>
                {isUp ? '+' : ''}{stock.change.toFixed(2)} ({isUp ? '+' : ''}{stock.changePercent.toFixed(2)}%)
              </span>
            </div>
          </div>
        </div>

        {/* Chart Controls */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {/* Timeframe selector */}
          <div className="flex bg-slate-900 p-0.5 border border-slate-700 rounded text-[10px] font-semibold">
            {(['1m', '5m', '1d'] as const).map(tf => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-2 py-1 rounded transition-all ${
                  timeframe === tf
                    ? 'bg-slate-850 text-blue-400 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tf === '1m' ? '1分钟' : tf === '5m' ? '5分钟' : '日K'}
              </button>
            ))}
          </div>

          {/* Chart type toggler */}
          <div className="flex bg-slate-900 p-0.5 border border-slate-700 rounded text-[10px] font-semibold">
            <button
              onClick={() => setChartType('candle')}
              className={`px-2 py-1 rounded transition-all flex items-center gap-1 ${
                chartType === 'candle'
                  ? 'bg-slate-850 text-white'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <BarChart4 className="h-3 w-3" /> K线
            </button>
            <button
              onClick={() => setChartType('line')}
              className={`px-2 py-1 rounded transition-all flex items-center gap-1 ${
                chartType === 'line'
                  ? 'bg-slate-850 text-white'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Layers className="h-3 w-3" /> 分时
            </button>
          </div>
        </div>
      </div>

      {/* Main Chart Stage */}
      <div className="flex-1 w-full min-h-0 text-[9px] font-mono" id="stock-recharts-container">
        {chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-500">
            正在载入实时行情数据...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
              <CartesianGrid stroke="#334155" strokeDasharray="3 3" strokeOpacity={0.3} vertical={false} />
              <XAxis 
                dataKey="timeLabel" 
                stroke="#64748b" 
                tickLine={false}
                axisLine={{ stroke: '#334155', strokeOpacity: 0.5 }}
              />
              <YAxis 
                domain={['auto', 'auto']} 
                stroke="#64748b"
                tickLine={false}
                axisLine={{ stroke: '#334155', strokeOpacity: 0.5 }}
              />
              <Tooltip content={<CustomTooltip />} />

              {/* Prev Close baseline representation */}
              <ReferenceLine y={stock.close} stroke="#3b82f6" strokeDasharray="3 3" strokeOpacity={0.4} />

              {chartType === 'line' ? (
                // Line chart mode
                <Line 
                  type="monotone" 
                  dataKey="closePrice" 
                  stroke={isUp ? '#f43f5e' : '#10b981'} 
                  strokeWidth={1.5}
                  dot={false} 
                  activeDot={{ r: 4 }}
                />
              ) : (
                // Native Recharts Candlestick mode
                <>
                  {/* Thick body bars representing Open to Close range */}
                  <Bar 
                    dataKey="openClose"
                    fill="#10b981" // fallback
                    radius={[0, 0, 0, 0]}
                    maxBarSize={10}
                  >
                    {chartData.map((entry, index) => (
                      <rect
                        key={`body-${index}`}
                        fill={entry.isUp ? '#f43f5e' : '#10b981'}
                      />
                    ))}
                  </Bar>
                  {/* Ultra-thin bars representing High to Low shadow wick */}
                  <Bar 
                    dataKey="highLow"
                    fill="#10b981" // fallback
                    maxBarSize={1.5}
                  >
                    {chartData.map((entry, index) => (
                      <rect
                        key={`wick-${index}`}
                        fill={entry.isUp ? '#f43f5e' : '#10b981'}
                      />
                    ))}
                  </Bar>
                </>
              )}
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
