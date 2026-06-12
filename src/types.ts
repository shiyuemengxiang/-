export type Exchange = 'HK' | 'US' | 'SH';

export interface Stock {
  symbol: string;
  name: string;
  exchange: Exchange;
  currency: string;
  price: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  change: number; // Price difference from prev close
  changePercent: number; // Percent difference from prev close
}

export type OrderSide = 'Buy' | 'Sell';
export type OrderType = 'Limit' | 'Market';
export type OrderStatus = 'Pending' | 'Filled' | 'Cancelled' | 'Rejected';

export interface Order {
  id: string;
  symbol: string;
  name: string;
  exchange: Exchange;
  side: OrderSide;
  type: OrderType;
  price: number; // Limit price or execution price
  quantity: number;
  filledQuantity: number;
  filledPrice?: number;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Position {
  symbol: string;
  name: string;
  exchange: Exchange;
  currency: string;
  quantity: number;
  availableQuantity: number;
  costPrice: number;
  currentPrice: number;
}

export interface CashInfo {
  currency: string;
  availableCash: number;
  frozenCash: number;
}

export interface AccountAssets {
  totalAssets: number; // NAV
  cash: number; // Available cash
  frozenCash: number; // Cash frozen for buy limit orders
  stockMarketValue: number; // Current value of positions
  dailyProfitLoss: number; // Profit/Loss for today
  dailyProfitLossPercent: number;
  currency: string; // Base currency
  cashInfos?: CashInfo[]; // Multi-currency cash breakdown
}

export interface Candle {
  time: number; // timestamp in ms or string
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface LongPortConfig {
  appKey: string;
  appSecret: string;
  accessToken: string;
  mode: 'sandbox' | 'live';
  isConnected: boolean;
}
