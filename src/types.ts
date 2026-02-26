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

export interface HistoryPoint {
  date: string;
  change: number;
}
