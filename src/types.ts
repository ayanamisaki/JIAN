export interface Item {
  id: number;
  name: string;
  category: string;
  price: number;
  purchase_date?: string;
  fuzzy_date?: string;
  location: string;
  notes?: string;
  is_hesitation: number;
  status: 'active' | 'discarded' | 'gifted' | 'sold';
  removed_date?: string;
  selling_price?: number;
  recipient?: string;
  created_at: string;
}

export interface Log {
  id: number;
  item_id: number;
  action: 'add' | 'discard' | 'keep' | 'gift' | 'sell';
  item_name: string;
  date: string;
  note?: string;
}

export interface CategoryStat {
  category: string;
  count: number;
  total_value: number;
}

export interface Category {
  id: number;
  name: string;
  created_at: string;
}

export interface PriceComparison {
  platform: string;
  price: number;
}

export interface WishlistLog {
  id: number;
  date: string;
  action: string;
}

export interface WishlistItem {
  id: number;
  name: string;
  category: string;
  prices: PriceComparison[];
  reason_to_buy: string;
  reason_to_quit: string;
  pros: string;
  cons: string;
  status: 'considering' | 'purchased' | 'abandoned';
  desire_level: number; // 1-5
  logs: WishlistLog[];
  created_at: string;
}

export interface HistoryPoint {
  date: string;
  change: number;
}
