import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Package, 
  PieChart, 
  History, 
  Search, 
  Trash2, 
  ChevronRight, 
  Calendar, 
  MapPin, 
  DollarSign,
  AlertCircle,
  AlertTriangle,
  Check,
  Gift,
  ShoppingBag,
  Settings,
  Download,
  X,
  AlertCircle as AlertIcon,
  Heart,
  Star,
  ArrowRight,
  ThumbsUp,
  ThumbsDown,
  Store
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, differenceInDays, differenceInYears } from 'date-fns';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';
import { cn } from './lib/utils';
import { Item, Log, CategoryStat, HistoryPoint, Category, WishlistItem, PriceComparison } from './types';

const SLOGANS = [
  "拥有的越少，得到的越多。",
  "极简不是一无所有，而是清空杂念。",
  "只留下让你心动的物品。",
  "清空空间，清空大脑。",
  "Less is More.",
  "在繁杂的世界里，寻找简单的力量。",
  "物品不应成为负担，而应是生活的助力。"
];

const CollapsibleLogSection: React.FC<{ 
  title: string, 
  children: React.ReactNode, 
  defaultOpen?: boolean,
  level?: number 
}> = ({ title, children, defaultOpen = false, level = 0 }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <div className={cn("space-y-2", level > 0 && "ml-4 border-l border-black/[0.03] pl-4")}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 w-full text-left group py-1"
      >
        <ChevronRight 
          size={12} 
          className={cn("text-black/20 transition-transform", isOpen && "rotate-90")} 
        />
        <span className={cn(
          "font-bold uppercase tracking-widest text-black/40 group-hover:text-black transition-colors",
          level === 0 ? "text-[10px]" : "text-[9px]"
        )}>
          {title}
        </span>
      </button>
      {isOpen && <div className="space-y-2 pb-2">{children}</div>}
    </div>
  );
};

// --- Storage Helpers ---

const STORAGE_KEYS = {
  ITEMS: 'jian_items_v2',
  LOGS: 'jian_logs_v2',
  CATEGORIES: 'jian_categories_v2',
  WISHLIST: 'jian_wishlist_v2'
};

const storage = {
  getItems: (): Item[] => JSON.parse(localStorage.getItem(STORAGE_KEYS.ITEMS) || '[]'),
  setItems: (items: Item[]) => localStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify(items)),
  getLogs: (): Log[] => JSON.parse(localStorage.getItem(STORAGE_KEYS.LOGS) || '[]'),
  setLogs: (logs: Log[]) => localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(logs)),
  getCategories: (): Category[] => JSON.parse(localStorage.getItem(STORAGE_KEYS.CATEGORIES) || '[]'),
  setCategories: (categories: Category[]) => localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories)),
  getWishlist: (): WishlistItem[] => JSON.parse(localStorage.getItem(STORAGE_KEYS.WISHLIST) || '[]'),
  setWishlist: (items: WishlistItem[]) => localStorage.setItem(STORAGE_KEYS.WISHLIST, JSON.stringify(items)),
};

const calculateStats = (items: Item[], logs: Log[]) => {
  const activeItems = items.filter(i => i.status === 'active');
  const categoryStats = Object.entries(
    activeItems.reduce((acc: Record<string, {count: number, total_value: number}>, item) => {
      const cat = item.category || '未分类';
      if (!acc[cat]) acc[cat] = { count: 0, total_value: 0 };
      acc[cat].count++;
      acc[cat].total_value += item.price;
      return acc;
    }, {})
  ).map(([category, stats]) => ({ category, ...stats }));

  const summary = {
    discarded: items.filter(i => i.status === 'discarded').length,
    gifted: items.filter(i => i.status === 'gifted').length,
    sold: items.filter(i => i.status === 'sold').length,
    soldValue: items.filter(i => i.status === 'sold').reduce((sum, i) => sum + (i.selling_price || 0), 0)
  };

  const historyMap = logs.reduce((acc: Record<string, number>, log) => {
    const date = log.date;
    if (!acc[date]) acc[date] = 0;
    if (log.action === 'add') acc[date]++;
    else if (['discard', 'gift', 'sell'].includes(log.action)) acc[date]--;
    return acc;
  }, {});

  const history = Object.entries(historyMap)
    .map(([date, change]) => ({ date, change }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return { categoryStats, history, summary };
};

// --- Components ---

const Navbar: React.FC<{ activeTab: string, setActiveTab: (t: string) => void }> = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'items', label: '持有', icon: Package },
    { id: 'hesitation', label: '犹豫', icon: AlertTriangle },
    { id: 'shopping', label: '购物', icon: ShoppingBag },
    { id: 'stats', label: '统计', icon: PieChart },
    { id: 'settings', label: '设置', icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-t border-black/5 pb-safe">
      <div className="flex justify-around items-center h-20 max-w-3xl mx-auto px-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex flex-col items-center gap-1.5 px-4 py-2 transition-all duration-300",
              activeTab === tab.id 
                ? "text-black" 
                : "text-black/30 hover:text-black/60"
            )}
          >
            <tab.icon size={22} strokeWidth={activeTab === tab.id ? 2.5 : 2} />
            <span className={cn(
              "text-[10px] font-bold uppercase tracking-widest",
              activeTab === tab.id ? "opacity-100" : "opacity-60"
            )}>{tab.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
};

const ItemCard: React.FC<{ item: Item, onEdit: (item: Item) => void, onDelete: (id: number) => void }> = ({ item, onEdit, onDelete }) => {
  const purchaseDate = item.purchase_date ? new Date(item.purchase_date) : null;
  const now = new Date();
  
  let holdingTimeStr = item.fuzzy_date || '未知';
  if (purchaseDate) {
    const years = differenceInYears(now, purchaseDate);
    const days = differenceInDays(now, purchaseDate) % 365;
    holdingTimeStr = `${years}y ${days}d`;
  }

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-white border-b border-black/5 p-6 group flex justify-between items-center hover:bg-black/[0.01] transition-colors"
      onClick={() => onEdit(item)}
    >
      <div className="flex-1 min-w-0 cursor-pointer">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-lg font-medium text-black/90 truncate">{item.name}</h3>
          {item.is_hesitation === 1 && (
            <span className="text-[10px] font-bold text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded uppercase tracking-wider">犹豫</span>
          )}
        </div>
        <div className="flex items-center gap-4 text-xs text-black/30 font-mono">
          <span className="flex items-center gap-1"><MapPin size={10} /> {item.location || '无'}</span>
          <span className="flex items-center gap-1"><DollarSign size={10} /> {item.price.toLocaleString()}</span>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="text-right">
          <p className="text-sm font-mono text-black/60">{holdingTimeStr}</p>
          <p className="text-[9px] text-black/20 uppercase tracking-widest font-bold">Holding Time</p>
        </div>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onDelete(item.id);
          }}
          className="p-2 text-black/10 hover:text-red-500 hover:bg-red-50 rounded-full transition-all opacity-0 group-hover:opacity-100"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </motion.div>
  );
};

const HesitationItemCard: React.FC<{ item: Item, onAction: (id: number, action: string) => void | Promise<void> }> = ({ item, onAction }) => {
  const purchaseDate = item.purchase_date ? new Date(item.purchase_date) : null;
  const now = new Date();
  
  let holdingTimeStr = item.fuzzy_date || '未知';
  if (purchaseDate) {
    const years = differenceInYears(now, purchaseDate);
    const days = differenceInDays(now, purchaseDate) % 365;
    holdingTimeStr = `${years}y ${days}d`;
  }

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-white border-b border-black/5 p-6 space-y-6"
    >
      <div className="flex justify-between items-start">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-medium text-black/90 truncate">{item.name}</h3>
          <div className="flex items-center gap-4 text-xs text-black/30 font-mono mt-1">
            <span className="flex items-center gap-1"><MapPin size={10} /> {item.location || '无'}</span>
            <span className="flex items-center gap-1"><DollarSign size={10} /> {item.price.toLocaleString()}</span>
            <span className="flex items-center gap-1"><Calendar size={10} /> {holdingTimeStr}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        <button 
          onClick={() => onAction(item.id, 'keep')}
          className="flex flex-col items-center gap-2 p-3 hover:bg-black/[0.02] transition-colors group"
        >
          <div className="p-2 rounded-full bg-black/5 group-hover:bg-black group-hover:text-white transition-all">
            <Check size={16} />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-black/40 group-hover:text-black">保留</span>
        </button>
        <button 
          onClick={() => onAction(item.id, 'discard')}
          className="flex flex-col items-center gap-2 p-3 hover:bg-black/[0.02] transition-colors group"
        >
          <div className="p-2 rounded-full bg-black/5 group-hover:bg-red-500 group-hover:text-white transition-all">
            <Trash2 size={16} />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-black/40 group-hover:text-black">丢弃</span>
        </button>
        <button 
          onClick={() => onAction(item.id, 'gift')}
          className="flex flex-col items-center gap-2 p-3 hover:bg-black/[0.02] transition-colors group"
        >
          <div className="p-2 rounded-full bg-black/5 group-hover:bg-blue-500 group-hover:text-white transition-all">
            <Gift size={16} />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-black/40 group-hover:text-black">转赠</span>
        </button>
        <button 
          onClick={() => onAction(item.id, 'sell')}
          className="flex flex-col items-center gap-2 p-3 hover:bg-black/[0.02] transition-colors group"
        >
          <div className="p-2 rounded-full bg-black/5 group-hover:bg-emerald-500 group-hover:text-white transition-all">
            <ShoppingBag size={16} />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-black/40 group-hover:text-black">转卖</span>
        </button>
      </div>
    </motion.div>
  );
};

const ItemModal: React.FC<{ 
  isOpen: boolean, 
  onClose: () => void, 
  onSave: () => void, 
  onDiscard: (id: number) => void,
  item?: Item | null,
  categories: Category[]
}> = ({ isOpen, onClose, onSave, onDiscard, item, categories }) => {
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    price: '',
    purchase_date: format(new Date(), 'yyyy-MM-dd'),
    fuzzy_date: '',
    location: '',
    is_hesitation: false,
    notes: ''
  });

  const [dateMode, setDateMode] = useState<'exact' | 'fuzzy'>('exact');

  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name,
        category: item.category || '',
        price: item.price.toString(),
        purchase_date: item.purchase_date || format(new Date(), 'yyyy-MM-dd'),
        fuzzy_date: item.fuzzy_date || '',
        location: item.location || '',
        is_hesitation: item.is_hesitation === 1,
        notes: item.notes || ''
      });
      setDateMode(item.fuzzy_date ? 'fuzzy' : 'exact');
    } else {
      setFormData({
        name: '',
        category: '',
        price: '',
        purchase_date: format(new Date(), 'yyyy-MM-dd'),
        fuzzy_date: '',
        location: '',
        is_hesitation: false,
        notes: ''
      });
      setDateMode('exact');
    }
  }, [item, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      ...formData,
      purchase_date: dateMode === 'exact' ? formData.purchase_date : null,
      fuzzy_date: dateMode === 'fuzzy' ? formData.fuzzy_date : null,
      price: parseFloat(formData.price) || 0
    };

    const allItems = storage.getItems();
    const allLogs = storage.getLogs();
    const now = new Date().toISOString().split('T')[0];

    if (item) {
      const updatedItems = allItems.map(i => i.id === item.id ? { ...i, ...data, is_hesitation: data.is_hesitation ? 1 : 0 } : i);
      storage.setItems(updatedItems);
    } else {
      const newItem: Item = {
        ...data,
        id: Date.now(),
        is_hesitation: data.is_hesitation ? 1 : 0,
        status: 'active',
        created_at: new Date().toISOString()
      };
      storage.setItems([...allItems, newItem]);
      
      const newLog: Log = {
        id: Date.now() + 1,
        item_id: newItem.id,
        action: 'add',
        item_name: newItem.name,
        date: now
      };
      storage.setLogs([...allLogs, newLog]);
    }

    onSave();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-md bg-white rounded-none shadow-2xl p-8 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-serif font-bold">{item ? '编辑' : '登记'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-black/5 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-black/30 uppercase tracking-widest">物品名称</label>
            <input 
              required
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              className="minimal-input" 
              placeholder="物品名称"
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-black/30 uppercase tracking-widest">分类</label>
              <div className="relative">
                <input 
                  list="categories-list"
                  value={formData.category}
                  onChange={e => setFormData({...formData, category: e.target.value})}
                  className="minimal-input" 
                  placeholder="分类"
                />
                <datalist id="categories-list">
                  {categories.map(c => <option key={c.id} value={c.name} />)}
                </datalist>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-black/30 uppercase tracking-widest">金额 (¥)</label>
              <input 
                type="number"
                value={formData.price}
                onChange={e => setFormData({...formData, price: e.target.value})}
                className="minimal-input" 
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-bold text-black/30 uppercase tracking-widest">购买日期</label>
              <div className="flex gap-2">
                <button 
                  type="button"
                  onClick={() => setDateMode('exact')}
                  className={cn("text-[9px] px-2 py-0.5 border transition-all", dateMode === 'exact' ? "bg-black text-white border-black" : "border-black/10 text-black/40")}
                >精确</button>
                <button 
                  type="button"
                  onClick={() => setDateMode('fuzzy')}
                  className={cn("text-[9px] px-2 py-0.5 border transition-all", dateMode === 'fuzzy' ? "bg-black text-white border-black" : "border-black/10 text-black/40")}
                >模糊</button>
              </div>
            </div>
            {dateMode === 'exact' ? (
              <input 
                type="date"
                required
                value={formData.purchase_date}
                onChange={e => setFormData({...formData, purchase_date: e.target.value})}
                className="minimal-input" 
              />
            ) : (
              <select 
                value={formData.fuzzy_date}
                onChange={e => setFormData({...formData, fuzzy_date: e.target.value})}
                className="minimal-input bg-transparent"
              >
                <option value="">请选择</option>
                <option value="不久前">不久前</option>
                <option value="今年">今年</option>
                <option value="去年">去年</option>
                <option value="几年前">几年前</option>
              </select>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-black/30 uppercase tracking-widest">存放位置</label>
            <input 
              value={formData.location}
              onChange={e => setFormData({...formData, location: e.target.value})}
              className="minimal-input" 
              placeholder="存放位置"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-black/30 uppercase tracking-widest">备注 / 心情</label>
            <textarea 
              value={formData.notes}
              onChange={e => setFormData({...formData, notes: e.target.value})}
              className="minimal-input min-h-[80px] resize-none" 
              placeholder="写下关于这件物品的心情或备注..."
            />
          </div>

          <label className="flex items-center gap-3 py-2 cursor-pointer">
            <input 
              type="checkbox"
              checked={formData.is_hesitation}
              onChange={e => setFormData({...formData, is_hesitation: e.target.checked})}
              className="w-4 h-4 accent-black"
            />
            <span className="text-sm font-medium">纳入犹豫区</span>
          </label>

          <button type="submit" className="minimal-button w-full py-4 text-sm font-bold uppercase tracking-widest">
            {item ? '保存修改' : '确认登记'}
          </button>

          {item && item.status === 'active' && (
            <button 
              type="button"
              onClick={() => {
                onDiscard(item.id);
                onClose();
              }}
              className="w-full py-4 text-xs font-bold uppercase tracking-widest text-red-500 hover:bg-red-50 transition-all"
            >
              直接断舍离
            </button>
          )}
        </form>
      </motion.div>
    </div>
  );
};

const WishlistItemCard: React.FC<{ 
  item: WishlistItem, 
  onEdit: (item: WishlistItem) => void,
  onStatusChange: (id: number, status: WishlistItem['status']) => void 
}> = ({ item, onEdit, onStatusChange }) => {
  const minPrice = item.prices.length > 0 ? Math.min(...item.prices.map(p => p.price)) : 0;
  const daysOnList = differenceInDays(new Date(), new Date(item.created_at));
  const isAbandoned = item.status === 'abandoned';

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={cn(
        "bg-white border-b border-black/5 p-6 group cursor-pointer hover:bg-black/[0.01] transition-all",
        isAbandoned && "opacity-60 grayscale-[0.5]"
      )}
      onClick={() => onEdit(item)}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <h3 className={cn("text-lg font-medium text-black/90 truncate", isAbandoned && "line-through text-black/40")}>{item.name}</h3>
            <div className="flex gap-0.5">
              {[...Array(5)].map((_, i) => (
                <Star 
                  key={i} 
                  size={10} 
                  className={cn(i < item.desire_level ? "text-black fill-black" : "text-black/10")} 
                />
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4 text-[10px] text-black/30 font-mono uppercase tracking-widest">
            <span>{item.category || '未分类'}</span>
            <span>已加入 {daysOnList} 天</span>
            {isAbandoned && <span className="text-red-400 font-bold">已放弃</span>}
          </div>
        </div>
        <div className="text-right">
          <p className="text-lg font-mono font-light">¥{minPrice.toLocaleString()}</p>
          <p className="text-[9px] text-black/20 uppercase tracking-widest font-bold">最优价格</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-[9px] font-bold text-emerald-600/60 uppercase tracking-widest">
            <ThumbsUp size={10} /> 优点
          </div>
          <p className="text-xs text-black/60 line-clamp-1">{item.pros || '未填写'}</p>
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-[9px] font-bold text-red-600/60 uppercase tracking-widest">
            <ThumbsDown size={10} /> 缺点
          </div>
          <p className="text-xs text-black/60 line-clamp-1">{item.cons || '未填写'}</p>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-black/[0.03]">
        <div className="flex gap-4">
          {item.logs.slice(-1).map(log => (
            <span key={log.id} className="text-[9px] text-black/20 font-mono italic">
              最新: {log.action} ({format(new Date(log.date), 'MM.dd')})
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          {!isAbandoned ? (
            <>
              <button 
                onClick={(e) => { e.stopPropagation(); onStatusChange(item.id, 'purchased'); }}
                className="px-3 py-1 text-[9px] font-bold uppercase tracking-widest border border-black/10 hover:bg-black hover:text-white transition-all"
              >已购</button>
              <button 
                onClick={(e) => { e.stopPropagation(); onStatusChange(item.id, 'abandoned'); }}
                className="px-3 py-1 text-[9px] font-bold uppercase tracking-widest border border-black/10 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all"
              >放弃</button>
            </>
          ) : (
            <button 
              onClick={(e) => { e.stopPropagation(); onStatusChange(item.id, 'considering'); }}
              className="px-3 py-1 text-[9px] font-bold uppercase tracking-widest border border-black/10 hover:bg-black hover:text-white transition-all"
            >恢复考虑</button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

const WishlistModal: React.FC<{
  isOpen: boolean,
  onClose: () => void,
  onSave: () => void,
  item?: WishlistItem | null,
  categories: Category[]
}> = ({ isOpen, onClose, onSave, item, categories }) => {
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    prices: [{ platform: '', price: 0 }] as PriceComparison[],
    reason_to_buy: '',
    reason_to_quit: '',
    pros: '',
    cons: '',
    desire_level: 3,
    status: 'considering' as WishlistItem['status']
  });

  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name,
        category: item.category || '',
        prices: item.prices.length > 0 ? item.prices : [{ platform: '', price: 0 }],
        reason_to_buy: item.reason_to_buy || '',
        reason_to_quit: item.reason_to_quit || '',
        pros: item.pros || '',
        cons: item.cons || '',
        desire_level: item.desire_level || 3,
        status: item.status
      });
    } else {
      setFormData({
        name: '',
        category: '',
        prices: [{ platform: '', price: 0 }],
        reason_to_buy: '',
        reason_to_quit: '',
        pros: '',
        cons: '',
        desire_level: 3,
        status: 'considering'
      });
    }
  }, [item, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const allWishlist = storage.getWishlist();
    const now = new Date().toISOString();
    const dateStr = now.split('T')[0];

    if (item) {
      const updated = allWishlist.map(i => {
        if (i.id === item.id) {
          const newLogs = [...i.logs];
          if (i.status !== formData.status) {
            newLogs.push({ id: Date.now(), date: dateStr, action: `状态变更: ${formData.status}` });
          }
          return { ...i, ...formData, logs: newLogs };
        }
        return i;
      });
      storage.setWishlist(updated);
    } else {
      const newItem: WishlistItem = {
        ...formData,
        id: Date.now(),
        created_at: now,
        logs: [{ id: Date.now(), date: dateStr, action: '新建清单' }]
      };
      storage.setWishlist([...allWishlist, newItem]);
    }

    onSave();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-lg bg-white rounded-none shadow-2xl p-8 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-serif font-bold">{item ? '编辑清单' : '添加心愿'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-black/5 rounded-full transition-colors"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-6">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-black/30 uppercase tracking-widest">物品名称</label>
              <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="minimal-input" placeholder="您想要什么？" />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-black/30 uppercase tracking-widest">分类</label>
                <input list="categories-list" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="minimal-input" placeholder="分类" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-black/30 uppercase tracking-widest">欲望值</label>
                <div className="flex gap-2 py-2">
                  {[1, 2, 3, 4, 5].map(level => (
                    <button key={level} type="button" onClick={() => setFormData({...formData, desire_level: level})} className={cn("p-1 transition-all", formData.desire_level >= level ? "text-black" : "text-black/10")}>
                      <Star size={16} className={formData.desire_level >= level ? "fill-black" : ""} />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-bold text-black/30 uppercase tracking-widest flex justify-between">
                价格比对 
                <button type="button" onClick={() => setFormData({...formData, prices: [...formData.prices, { platform: '', price: 0 }]})} className="text-black hover:opacity-50 transition-opacity"><Plus size={12} /></button>
              </label>
              {formData.prices.map((p, idx) => (
                <div key={idx} className="flex gap-4">
                  <input value={p.platform} onChange={e => {
                    const newPrices = [...formData.prices];
                    newPrices[idx].platform = e.target.value;
                    setFormData({...formData, prices: newPrices});
                  }} className="flex-1 minimal-input text-xs" placeholder="平台 (如：淘宝)" />
                  <input type="number" value={p.price || ''} onChange={e => {
                    const newPrices = [...formData.prices];
                    newPrices[idx].price = parseFloat(e.target.value) || 0;
                    setFormData({...formData, prices: newPrices});
                  }} className="w-24 minimal-input text-xs font-mono" placeholder="价格" />
                  {formData.prices.length > 1 && (
                    <button type="button" onClick={() => setFormData({...formData, prices: formData.prices.filter((_, i) => i !== idx)})} className="text-black/20 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                  )}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-emerald-600/40 uppercase tracking-widest">想买理由</label>
                <textarea value={formData.reason_to_buy} onChange={e => setFormData({...formData, reason_to_buy: e.target.value})} className="minimal-input text-xs min-h-[60px] resize-none" placeholder="为什么要买？" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-red-600/40 uppercase tracking-widest">劝退理由</label>
                <textarea value={formData.reason_to_quit} onChange={e => setFormData({...formData, reason_to_quit: e.target.value})} className="minimal-input text-xs min-h-[60px] resize-none" placeholder="为什么不买？" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-black/30 uppercase tracking-widest">优点</label>
                <textarea value={formData.pros} onChange={e => setFormData({...formData, pros: e.target.value})} className="minimal-input text-xs min-h-[60px] resize-none" placeholder="优点" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-black/30 uppercase tracking-widest">缺点</label>
                <textarea value={formData.cons} onChange={e => setFormData({...formData, cons: e.target.value})} className="minimal-input text-xs min-h-[60px] resize-none" placeholder="缺点" />
              </div>
            </div>
          </div>

          <button type="submit" className="minimal-button w-full py-4 text-sm font-bold uppercase tracking-widest">
            {item ? '保存修改' : '加入清单'}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [activeTab, setActiveTab] = useState('items');
  const [items, setItems] = useState<Item[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [stats, setStats] = useState<{ 
    categoryStats: CategoryStat[], 
    history: HistoryPoint[],
    summary: { discarded: number, gifted: number, sold: number, soldValue: number }
  }>({ 
    categoryStats: [], 
    history: [],
    summary: { discarded: 0, gifted: 0, sold: 0, soldValue: 0 }
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isWishlistModalOpen, setIsWishlistModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [editingWishlistItem, setEditingWishlistItem] = useState<WishlistItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [slogan] = useState(() => SLOGANS[Math.floor(Math.random() * SLOGANS.length)]);
  const [detailView, setDetailView] = useState<string | null>(null);
  const [detailItems, setDetailItems] = useState<Item[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [pendingAction, setPendingAction] = useState<{
    id: number;
    type: 'delete' | 'discard' | 'gift' | 'sell' | 'keep';
    itemName: string;
  } | null>(null);

  const fetchData = () => {
    const localItems = storage.getItems();
    const localLogs = storage.getLogs();
    const localCategories = storage.getCategories();
    const localWishlist = storage.getWishlist();
    
    setItems(localItems.filter(i => i.status === 'active'));
    setLogs(localLogs);
    setCategories(localCategories);
    setWishlist(localWishlist);
    setStats(calculateStats(localItems, localLogs));
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = (item: Item) => {
    setPendingAction({ id: item.id, type: 'delete', itemName: item.name });
  };

  const handleDiscard = (id: number) => {
    const allItems = storage.getItems();
    const item = allItems.find(i => i.id === id);
    if (item) {
      setPendingAction({ id, type: 'discard', itemName: item.name });
    }
  };

  const handleHesitationAction = (id: number, action: string) => {
    const allItems = storage.getItems();
    const item = allItems.find(i => i.id === id);
    if (item) {
      setPendingAction({ id, type: action as any, itemName: item.name });
    }
  };

  const executePendingAction = async (extraData?: { recipient?: string, selling_price?: number }) => {
    if (!pendingAction) return;
    const { id, type } = pendingAction;
    const allItems = storage.getItems();
    const allLogs = storage.getLogs();
    const now = new Date().toISOString().split('T')[0];
    const item = allItems.find(i => i.id === id);

    if (!item) return;

    if (type === 'delete') {
      storage.setItems(allItems.filter(i => i.id !== id));
      storage.setLogs(allLogs.filter(l => l.item_id !== id));
    } else if (type === 'discard') {
      storage.setItems(allItems.map(i => i.id === id ? { ...i, status: 'discarded', removed_date: now } : i));
      storage.setLogs([...allLogs, { id: Date.now(), item_id: id, action: 'discard', item_name: item.name, date: now }]);
    } else if (type === 'keep') {
      storage.setItems(allItems.map(i => i.id === id ? { ...i, is_hesitation: 0 } : i));
      storage.setLogs([...allLogs, { id: Date.now(), item_id: id, action: 'keep', item_name: item.name, date: now }]);
    } else {
      const statusMap: Record<string, string> = { gift: 'gifted', sell: 'sold' };
      storage.setItems(allItems.map(i => i.id === id ? { 
        ...i, 
        status: statusMap[type] as any, 
        removed_date: now,
        recipient: extraData?.recipient || null,
        selling_price: extraData?.selling_price || null
      } : i));
      
      storage.setLogs([...allLogs, { 
        id: Date.now(), 
        item_id: id, 
        action: type as any, 
        item_name: item.name, 
        date: now,
        note: extraData?.recipient ? `赠予: ${extraData.recipient}` : (extraData?.selling_price ? `售价: ¥${extraData.selling_price}` : null)
      }]);
    }

    setPendingAction(null);
    fetchData();
  };

  const showDetails = (status: string) => {
    const allItems = storage.getItems();
    setDetailItems(allItems.filter(i => i.status === status).sort((a, b) => (b.removed_date || '').localeCompare(a.removed_date || '')));
    setDetailView(status);
  };

  const addCategory = () => {
    if (!newCategoryName) return;
    const allCats = storage.getCategories();
    if (allCats.some(c => c.name === newCategoryName)) {
      alert('分类已存在');
      return;
    }
    storage.setCategories([...allCats, { id: Date.now(), name: newCategoryName, created_at: new Date().toISOString() }]);
    setNewCategoryName('');
    fetchData();
  };

  const deleteCategory = (id: number) => {
    if (confirm('确定要删除这个分类吗？')) {
      const allCats = storage.getCategories();
      storage.setCategories(allCats.filter(c => c.id !== id));
      fetchData();
    }
  };

  const exportToCSV = () => {
    const data = storage.getItems();
    // ... same CSV logic ...
    
    const headers = ['ID', '名称', '分类', '金额', '购买日期', '模糊日期', '位置', '状态', '断舍离日期', '售价', '接收人', '备注'];
    const rows = data.map((item: Item) => [
      item.id,
      item.name,
      item.category || '未分类',
      item.price,
      item.purchase_date || '',
      item.fuzzy_date || '',
      item.location || '',
      item.status,
      item.removed_date || '',
      item.selling_price || '',
      item.recipient || '',
      item.notes || ''
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `jian_export_${format(new Date(), 'yyyyMMdd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleWishlistStatusChange = (id: number, status: WishlistItem['status']) => {
    const allWishlist = storage.getWishlist();
    const item = allWishlist.find(i => i.id === id);
    if (!item) return;

    const now = new Date().toISOString();
    const dateStr = now.split('T')[0];

    if (status === 'purchased') {
      // Move to items
      const minPrice = item.prices.length > 0 ? Math.min(...item.prices.map(p => p.price)) : 0;
      const newItem: Item = {
        id: Date.now(),
        name: item.name,
        category: item.category,
        price: minPrice,
        purchase_date: dateStr,
        fuzzy_date: null,
        location: '',
        status: 'active',
        is_hesitation: 0,
        notes: `From Wishlist. Reason: ${item.reason_to_buy}`,
        created_at: now
      };
      
      const allItems = storage.getItems();
      storage.setItems([...allItems, newItem]);
      
      const allLogs = storage.getLogs();
      storage.setLogs([...allLogs, { 
        id: Date.now() + 1, 
        item_id: newItem.id, 
        action: 'add', 
        item_name: newItem.name, 
        date: dateStr,
        note: '从心愿单购入'
      }]);

      // Remove from wishlist
      storage.setWishlist(allWishlist.filter(i => i.id !== id));
    } else {
      // Just update status
      const updated = allWishlist.map(i => i.id === id ? { 
        ...i, 
        status, 
        logs: [...i.logs, { id: Date.now(), date: dateStr, action: `状态变更: ${status}` }] 
      } : i);
      storage.setWishlist(updated);
    }
    fetchData();
  };

  const exportToJSON = () => {
    const data = {
      items: storage.getItems(),
      logs: storage.getLogs(),
      categories: storage.getCategories(),
      wishlist: storage.getWishlist()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `jian_backup_${format(new Date(), 'yyyyMMdd')}.json`;
    link.click();
  };

  const importFromJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.items && data.logs && data.categories) {
          storage.setItems(data.items);
          storage.setLogs(data.logs);
          storage.setCategories(data.categories);
          if (data.wishlist) storage.setWishlist(data.wishlist);
          fetchData();
          alert('导入成功');
        } else {
          alert('无效的备份文件');
        }
      } catch (err) {
        alert('解析失败');
      }
    };
    reader.readAsText(file);
  };

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (item.category || '未分类').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedItems = filteredItems.reduce((acc: Record<string, Item[]>, item) => {
    const cat = item.category || '未分类';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  const groupedLogs = logs.reduce((acc: any, log) => {
    const date = new Date(log.date);
    const year = date.getFullYear().toString() + '年';
    const month = (date.getMonth() + 1).toString() + '月';
    const day = date.getDate().toString() + '日';
    
    if (!acc[year]) acc[year] = {};
    if (!acc[year][month]) acc[year][month] = {};
    if (!acc[year][month][day]) acc[year][month][day] = [];
    acc[year][month][day].push(log);
    return acc;
  }, {});

  const totalValue = items.reduce((sum, item) => sum + item.price, 0);
  const hesitationItems = items.filter(item => item.is_hesitation === 1);

  let currentCount = 0;
  const trendData = stats.history.map(h => {
    currentCount += h.change;
    return { date: h.date, count: currentCount };
  });

  return (
    <div className="min-h-screen bg-white pb-32 font-sans">
      {/* Header */}
      <header className="px-8 py-12 max-w-3xl mx-auto">
        <div className="mb-8">
          <p className="text-[10px] font-bold text-black/20 uppercase tracking-[0.3em] italic mb-1">每日灵感</p>
          <p className="text-sm font-serif text-black/60 italic">“ {slogan} ”</p>
        </div>
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-5xl font-serif font-bold tracking-tight mb-2">简.</h1>
            <p className="text-[10px] text-black/30 font-bold uppercase tracking-[0.2em]">Less is More</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-mono font-light leading-none">{items.length}</p>
            <p className="text-[9px] text-black/30 font-bold uppercase tracking-widest mt-1">持有物品</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-8">
        <AnimatePresence mode="wait">
          {activeTab === 'items' && (
            <motion.div 
              key="items"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-12"
            >
              <div className="flex gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-0 top-1/2 -translate-y-1/2 text-black/20" size={14} />
                  <input 
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="搜索物品..." 
                    className="w-full bg-transparent border-b border-black/5 pl-6 py-2 text-sm focus:outline-none focus:border-black/20 transition-all"
                  />
                </div>
                <button 
                  onClick={() => {
                    setEditingItem(null);
                    setIsModalOpen(true);
                  }}
                  className="text-xs font-bold uppercase tracking-widest hover:opacity-50 transition-opacity"
                >
                  添加物品
                </button>
              </div>

              <div className="space-y-12">
                {(Object.entries(groupedItems) as [string, Item[]][]).map(([category, catItems]) => (
                  <div key={category} className="space-y-4">
                    <div className="flex items-center gap-4">
                      <h2 className="text-xs font-bold uppercase tracking-[0.3em] text-black/20">{category}</h2>
                      <div className="h-px flex-1 bg-black/[0.03]" />
                      <span className="text-[10px] font-mono text-black/20">{catItems.length}</span>
                    </div>
                    <div className="divide-y divide-black/[0.03]">
                      {catItems.map(item => (
                        <ItemCard 
                          key={item.id} 
                          item={item} 
                          onEdit={(item) => {
                            setEditingItem(item);
                            setIsModalOpen(true);
                          }}
                          onDelete={() => handleDelete(item)} 
                        />
                      ))}
                    </div>
                  </div>
                ))}
                
                {items.length === 0 && (
                  <div className="py-32 text-center text-black/20">
                    <p className="text-sm italic font-serif">Empty space, clear mind.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'hesitation' && (
            <motion.div 
              key="hesitation"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-12"
            >
              <div className="space-y-4">
                <h2 className="text-xs font-bold uppercase tracking-[0.3em] text-black/20">Hesitation Zone</h2>
                <p className="text-sm text-black/40 italic font-serif">Take your time, but eventually decide.</p>
              </div>

              <div className="divide-y divide-black/[0.03]">
                {hesitationItems.map(item => (
                  <HesitationItemCard key={item.id} item={item} onAction={handleHesitationAction} />
                ))}
                
                {hesitationItems.length === 0 && (
                  <div className="py-32 text-center text-black/20">
                    <p className="text-sm italic font-serif">犹豫区空空如也。心境清明。</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'shopping' && (
            <motion.div 
              key="shopping"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-12"
            >
              <div className="flex justify-between items-end">
                <div className="space-y-4">
                  <h2 className="text-xs font-bold uppercase tracking-[0.3em] text-black/20">购物清单</h2>
                  <p className="text-sm text-black/40 italic font-serif">三思而后买。</p>
                </div>
                <button 
                  onClick={() => {
                    setEditingWishlistItem(null);
                    setIsWishlistModalOpen(true);
                  }}
                  className="text-xs font-bold uppercase tracking-widest hover:opacity-50 transition-opacity"
                >
                  添加心愿
                </button>
              </div>

              <div className="space-y-12">
                <div className="space-y-4">
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/10 border-b border-black/[0.03] pb-2">考虑中</h3>
                  <div className="divide-y divide-black/[0.03]">
                    {wishlist.filter(i => i.status === 'considering').map(item => (
                      <WishlistItemCard 
                        key={item.id} 
                        item={item} 
                        onEdit={(item) => {
                          setEditingWishlistItem(item);
                          setIsWishlistModalOpen(true);
                        }}
                        onStatusChange={handleWishlistStatusChange}
                      />
                    ))}
                    {wishlist.filter(i => i.status === 'considering').length === 0 && (
                      <div className="py-12 text-center text-black/10">
                        <p className="text-xs italic font-serif">暂无考虑中的物品。</p>
                      </div>
                    )}
                  </div>
                </div>

                {wishlist.some(i => i.status === 'abandoned') && (
                  <div className="space-y-4">
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/10 border-b border-black/[0.03] pb-2">已放弃购买</h3>
                    <div className="divide-y divide-black/[0.03]">
                      {wishlist.filter(i => i.status === 'abandoned').map(item => (
                        <WishlistItemCard 
                          key={item.id} 
                          item={item} 
                          onEdit={(item) => {
                            setEditingWishlistItem(item);
                            setIsWishlistModalOpen(true);
                          }}
                          onStatusChange={handleWishlistStatusChange}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'stats' && (
            <motion.div 
              key="stats"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-16 pb-12"
            >
              <div className="grid grid-cols-2 gap-12">
                <div>
                  <p className="text-[9px] font-bold text-black/30 uppercase tracking-widest mb-4">总资产估值</p>
                  <p className="text-4xl font-mono font-light">¥{totalValue.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-black/30 uppercase tracking-widest mb-4">分类数量</p>
                  <p className="text-4xl font-mono font-light">{Object.keys(groupedItems).length}</p>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold uppercase tracking-widest text-black/20">断舍离成果</h3>
                <button 
                  onClick={exportToCSV}
                  className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-black/40 hover:text-black transition-all"
                >
                  <Download size={14} />
                  导出 CSV
                </button>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <button onClick={() => showDetails('discarded')} className="bg-black/[0.02] p-4 text-center hover:bg-black/[0.05] transition-all">
                  <p className="text-[8px] font-bold text-black/30 uppercase tracking-widest mb-1">已丢弃</p>
                  <p className="text-xl font-mono">{stats.summary.discarded}</p>
                </button>
                <button onClick={() => showDetails('gifted')} className="bg-black/[0.02] p-4 text-center hover:bg-black/[0.05] transition-all">
                  <p className="text-[8px] font-bold text-black/30 uppercase tracking-widest mb-1">已转赠</p>
                  <p className="text-xl font-mono">{stats.summary.gifted}</p>
                </button>
                <button onClick={() => showDetails('sold')} className="bg-black/[0.02] p-4 text-center hover:bg-black/[0.05] transition-all">
                  <p className="text-[8px] font-bold text-black/30 uppercase tracking-widest mb-1">已转卖</p>
                  <p className="text-xl font-mono">{stats.summary.sold}</p>
                </button>
              </div>

              {stats.summary.soldValue > 0 && (
                <div className="bg-emerald-50/50 p-6 border border-emerald-100/50">
                   <p className="text-[9px] font-bold text-emerald-600/60 uppercase tracking-widest mb-1">回血总额</p>
                   <p className="text-3xl font-mono text-emerald-700">¥{stats.summary.soldValue.toLocaleString()}</p>
                </div>
              )}

              <div className="space-y-8">
                <h3 className="text-xs font-bold uppercase tracking-widest text-black/20">断舍离成就</h3>
                <div className="bg-black/[0.02] p-8 space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-black flex items-center justify-center text-white">
                      <Heart size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-medium">您已经成功告别了 {stats.summary.discarded + stats.summary.gifted + stats.summary.sold} 件物品</p>
                      <p className="text-[10px] text-black/40">每一件物品的离开，都为您腾出了更多的生活空间。</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-black/5">
                    <div>
                      <p className="text-[8px] font-bold text-black/30 uppercase tracking-widest mb-1">释放空间估算</p>
                      <p className="text-lg font-mono">{(stats.summary.discarded + stats.summary.gifted + stats.summary.sold) * 0.05} m³</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-bold text-black/30 uppercase tracking-widest mb-1">减少心理负担</p>
                      <p className="text-lg font-mono">Significant</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-8">
                <h3 className="text-xs font-bold uppercase tracking-widest text-black/20">持有量趋势</h3>
                <div className="h-[240px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData}>
                      <XAxis 
                        dataKey="date" 
                        hide
                      />
                      <YAxis hide domain={['auto', 'auto']} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '0px', border: '1px solid #00000005', boxShadow: 'none', fontSize: '10px', fontFamily: 'monospace' }}
                      />
                      <Line 
                        type="stepAfter" 
                        dataKey="count" 
                        stroke="#000" 
                        strokeWidth={1.5} 
                        dot={false} 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="space-y-8">
                <h3 className="text-xs font-bold uppercase tracking-widest text-black/20">分类占比</h3>
                <div className="space-y-4">
                  {(stats.categoryStats as CategoryStat[]).sort((a, b) => b.count - a.count).map((stat) => (
                    <div key={stat.category} className="space-y-1">
                      <div className="flex justify-between text-[10px] font-mono uppercase text-black/40">
                        <span>{stat.category}</span>
                        <span>{stat.count} 件</span>
                      </div>
                      <div className="h-1 bg-black/[0.03] overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${(stat.count / (items.length || 1)) * 100}%` }}
                          className="h-full bg-black/60"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div 
              key="settings"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-16 pb-20"
            >
              <div className="space-y-8">
                <h2 className="text-xs font-bold uppercase tracking-[0.3em] text-black/20">断舍离日志</h2>
                <div className="space-y-4">
                  {Object.entries(groupedLogs).sort((a, b) => b[0].localeCompare(a[0])).map(([year, months]: [string, any]) => (
                    <CollapsibleLogSection key={year} title={year}>
                      {Object.entries(months).sort((a, b) => b[0].localeCompare(a[0])).map(([month, days]: [string, any]) => (
                        <CollapsibleLogSection key={month} title={month} level={1}>
                          {Object.entries(days).sort((a, b) => b[0].localeCompare(a[0])).map(([day, dayLogs]: [string, any]) => (
                            <CollapsibleLogSection key={day} title={day} level={2}>
                              <div className="space-y-4 pt-2">
                                {dayLogs.map((log: Log) => {
                                  const actionLabels: Record<string, string> = {
                                    add: '+ 新增',
                                    discard: '- 丢弃',
                                    keep: '✓ 保留',
                                    gift: '- 转赠',
                                    sell: '- 转卖'
                                  };
                                  return (
                                    <div key={log.id} className="flex gap-4 group pl-2">
                                      <div className="flex-1 border-l border-black/[0.03] pl-4">
                                        <div className="flex items-center gap-3">
                                          <span className={cn(
                                            "text-[9px] font-bold uppercase tracking-widest",
                                            log.action === 'add' ? "text-black" : "text-black/30"
                                          )}>
                                            {actionLabels[log.action] || log.action}
                                          </span>
                                          <span className="text-xs font-medium">{log.item_name}</span>
                                        </div>
                                        {log.note && (
                                          <p className="text-[9px] text-black/20 mt-0.5 font-mono">{log.note}</p>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </CollapsibleLogSection>
                          ))}
                        </CollapsibleLogSection>
                      ))}
                    </CollapsibleLogSection>
                  ))}
                  {logs.length === 0 && <p className="text-sm italic text-black/20">暂无日志。</p>}
                </div>
              </div>

              <div className="space-y-8">
                <h2 className="text-xs font-bold uppercase tracking-[0.3em] text-black/20">分类管理</h2>
                <div className="flex gap-4">
                  <input 
                    value={newCategoryName}
                    onChange={e => setNewCategoryName(e.target.value)}
                    placeholder="新分类名称"
                    className="flex-1 minimal-input"
                  />
                  <button onClick={addCategory} className="minimal-button">添加</button>
                </div>
                <div className="space-y-2">
                  {categories.map(cat => (
                    <div key={cat.id} className="flex justify-between items-center p-4 bg-black/[0.02] group">
                      <span className="text-sm">{cat.name}</span>
                      <button 
                        onClick={() => deleteCategory(cat.id)}
                        className="p-2 text-black/10 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-8">
                <h2 className="text-xs font-bold uppercase tracking-[0.3em] text-black/20">数据管理</h2>
                <div className="grid grid-cols-2 gap-4">
                  <button onClick={exportToJSON} className="minimal-button py-3 text-[10px]">备份 JSON</button>
                  <label className="minimal-button py-3 text-[10px] text-center cursor-pointer">
                    还原 JSON
                    <input type="file" accept=".json" onChange={importFromJSON} className="hidden" />
                  </label>
                </div>
                <p className="text-[9px] text-black/20 italic">注：数据存储在您的浏览器本地。使用备份/还原功能可在不同设备间迁移数据。</p>
              </div>

              <div className="space-y-8">
                <h2 className="text-xs font-bold uppercase tracking-[0.3em] text-black/20">关于应用</h2>
                <div className="p-8 border border-black/5 text-center space-y-4">
                  <p className="text-3xl font-serif font-bold">简.</p>
                  <p className="text-xs text-black/30">版本 2.0.0</p>
                  <p className="text-[10px] text-black/20 uppercase tracking-widest">极简主义物品管理</p>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <ItemModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={fetchData}
        onDiscard={handleDiscard}
        item={editingItem}
        categories={categories}
      />

      <WishlistModal
        isOpen={isWishlistModalOpen}
        onClose={() => setIsWishlistModalOpen(false)}
        onSave={fetchData}
        item={editingWishlistItem}
        categories={categories}
      />

      {/* Action Confirmation Modal */}
      <AnimatePresence>
        {pendingAction && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPendingAction(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-none shadow-2xl p-8"
            >
              <div className="flex items-center gap-4 mb-6 text-orange-500">
                <AlertIcon size={24} />
                <h3 className="text-xl font-serif font-bold text-black">确认操作</h3>
              </div>
              
              <p className="text-sm text-black/60 mb-8 leading-relaxed">
                您确定要对 <span className="font-bold text-black">“{pendingAction.itemName}”</span> 进行 
                <span className="font-bold text-black mx-1">
                  {pendingAction.type === 'delete' ? '彻底删除' : 
                   pendingAction.type === 'discard' ? '断舍离' : 
                   pendingAction.type === 'gift' ? '转赠' : 
                   pendingAction.type === 'sell' ? '转卖' : '保留'}
                </span> 
                操作吗？
                {pendingAction.type === 'delete' && <span className="block mt-2 text-red-500 font-bold text-[10px] uppercase tracking-widest">此操作不可撤销且不计入日志。</span>}
              </p>

              <div className="space-y-4">
                {pendingAction.type === 'gift' && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-black/30 uppercase tracking-widest">接收人</label>
                    <input 
                      id="recipient-input"
                      className="minimal-input" 
                      placeholder="接收人姓名"
                      autoFocus
                    />
                  </div>
                )}
                {pendingAction.type === 'sell' && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-black/30 uppercase tracking-widest">成交金额 (¥)</label>
                    <input 
                      id="price-input"
                      type="number"
                      className="minimal-input" 
                      placeholder="0.00"
                      autoFocus
                    />
                  </div>
                )}

                <div className="flex gap-4 pt-4">
                  <button 
                    onClick={() => setPendingAction(null)}
                    className="flex-1 py-3 text-xs font-bold uppercase tracking-widest text-black/40 hover:bg-black/5 transition-all"
                  >
                    取消
                  </button>
                  <button 
                    onClick={() => {
                      const recipient = (document.getElementById('recipient-input') as HTMLInputElement)?.value;
                      const price = (document.getElementById('price-input') as HTMLInputElement)?.value;
                      
                      if (pendingAction.type === 'gift' && !recipient) {
                        alert('请输入接收人');
                        return;
                      }
                      if (pendingAction.type === 'sell' && (!price || isNaN(parseFloat(price)))) {
                        alert('请输入有效的金额');
                        return;
                      }
                      
                      executePendingAction({
                        recipient,
                        selling_price: price ? parseFloat(price) : undefined
                      });
                    }}
                    className="flex-1 py-3 text-xs font-bold uppercase tracking-widest bg-black text-white hover:bg-black/80 transition-all"
                  >
                    确认
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Detail View Modal */}
      <AnimatePresence>
        {detailView && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDetailView(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-none shadow-2xl p-8 max-h-[80vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-serif font-bold uppercase tracking-widest">
                  {detailView === 'discarded' ? '已丢弃' : detailView === 'gifted' ? '已转赠' : '已转卖'}
                </h2>
                <button onClick={() => setDetailView(null)} className="p-2 hover:bg-black/5 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-6">
                {detailItems.map(item => (
                  <div key={item.id} className="border-b border-black/5 pb-4">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="font-medium">{item.name}</h4>
                      <span className="text-[10px] font-mono text-black/30">{item.removed_date}</span>
                    </div>
                    <div className="flex gap-4 text-[10px] font-mono text-black/40 uppercase">
                      <span>{item.category}</span>
                      {item.recipient && <span>接收人: {item.recipient}</span>}
                      {item.selling_price && <span>成交价: ¥{item.selling_price}</span>}
                    </div>
                  </div>
                ))}
                {detailItems.length === 0 && <p className="text-center py-12 text-black/20 italic">暂无记录。</p>}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
