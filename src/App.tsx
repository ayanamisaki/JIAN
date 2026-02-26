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
  AlertCircle as AlertIcon
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
import { Item, Log, CategoryStat, HistoryPoint, Category } from './types';

const SLOGANS = [
  "拥有的越少，得到的越多。",
  "极简不是一无所有，而是清空杂念。",
  "只留下让你心动的物品。",
  "清空空间，清空大脑。",
  "Less is More.",
  "在繁杂的世界里，寻找简单的力量。",
  "物品不应成为负担，而应是生活的助力。"
];

// --- Storage Helpers ---

const STORAGE_KEYS = {
  ITEMS: 'jian_items_v2',
  LOGS: 'jian_logs_v2',
  CATEGORIES: 'jian_categories_v2'
};

const storage = {
  getItems: (): Item[] => JSON.parse(localStorage.getItem(STORAGE_KEYS.ITEMS) || '[]'),
  setItems: (items: Item[]) => localStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify(items)),
  getLogs: (): Log[] => JSON.parse(localStorage.getItem(STORAGE_KEYS.LOGS) || '[]'),
  setLogs: (logs: Log[]) => localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(logs)),
  getCategories: (): Category[] => JSON.parse(localStorage.getItem(STORAGE_KEYS.CATEGORIES) || '[]'),
  setCategories: (categories: Category[]) => localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories)),
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
    { id: 'stats', label: '统计', icon: PieChart },
    { id: 'logs', label: '日志', icon: History },
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
              placeholder="Name"
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
                  placeholder="Category"
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
              placeholder="Location"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-black/30 uppercase tracking-widest">备注 / 心情</label>
            <textarea 
              value={formData.notes}
              onChange={e => setFormData({...formData, notes: e.target.value})}
              className="minimal-input min-h-[80px] resize-none" 
              placeholder="Notes..."
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

// --- Main App ---

export default function App() {
  const [activeTab, setActiveTab] = useState('items');
  const [items, setItems] = useState<Item[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
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
  const [editingItem, setEditingItem] = useState<Item | null>(null);
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
    
    setItems(localItems.filter(i => i.status === 'active'));
    setLogs(localLogs);
    setCategories(localCategories);
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

  const exportToJSON = () => {
    const data = {
      items: storage.getItems(),
      logs: storage.getLogs(),
      categories: storage.getCategories()
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

  const groupedLogs = logs.reduce((acc: Record<string, Log[]>, log) => {
    const month = format(new Date(log.date), 'yyyy年MM月');
    if (!acc[month]) acc[month] = [];
    acc[month].push(log);
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
          <p className="text-[10px] font-bold text-black/20 uppercase tracking-[0.3em] italic mb-1">Daily Inspiration</p>
          <p className="text-sm font-serif text-black/60 italic">“ {slogan} ”</p>
        </div>
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-5xl font-serif font-bold tracking-tight mb-2">简.</h1>
            <p className="text-[10px] text-black/30 font-bold uppercase tracking-[0.2em]">Less is More</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-mono font-light leading-none">{items.length}</p>
            <p className="text-[9px] text-black/30 font-bold uppercase tracking-widest mt-1">Items in Stock</p>
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
                    placeholder="Search items..." 
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
                  Add Item
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
                    <p className="text-sm italic font-serif">No items in hesitation. Clear mind.</p>
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
                  <p className="text-[9px] font-bold text-black/30 uppercase tracking-widest mb-4">Total Value</p>
                  <p className="text-4xl font-mono font-light">¥{totalValue.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-black/30 uppercase tracking-widest mb-4">Categories</p>
                  <p className="text-4xl font-mono font-light">{Object.keys(groupedItems).length}</p>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold uppercase tracking-widest text-black/20">Summary</h3>
                <button 
                  onClick={exportToCSV}
                  className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-black/40 hover:text-black transition-all"
                >
                  <Download size={14} />
                  Export CSV
                </button>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <button onClick={() => showDetails('discarded')} className="bg-black/[0.02] p-4 text-center hover:bg-black/[0.05] transition-all">
                  <p className="text-[8px] font-bold text-black/30 uppercase tracking-widest mb-1">Discarded</p>
                  <p className="text-xl font-mono">{stats.summary.discarded}</p>
                </button>
                <button onClick={() => showDetails('gifted')} className="bg-black/[0.02] p-4 text-center hover:bg-black/[0.05] transition-all">
                  <p className="text-[8px] font-bold text-black/30 uppercase tracking-widest mb-1">Gifted</p>
                  <p className="text-xl font-mono">{stats.summary.gifted}</p>
                </button>
                <button onClick={() => showDetails('sold')} className="bg-black/[0.02] p-4 text-center hover:bg-black/[0.05] transition-all">
                  <p className="text-[8px] font-bold text-black/30 uppercase tracking-widest mb-1">Sold</p>
                  <p className="text-xl font-mono">{stats.summary.sold}</p>
                </button>
              </div>

              {stats.summary.soldValue > 0 && (
                <div className="bg-emerald-50/50 p-6 border border-emerald-100/50">
                   <p className="text-[9px] font-bold text-emerald-600/60 uppercase tracking-widest mb-1">Total Recovery</p>
                   <p className="text-3xl font-mono text-emerald-700">¥{stats.summary.soldValue.toLocaleString()}</p>
                </div>
              )}

              <div className="space-y-8">
                <h3 className="text-xs font-bold uppercase tracking-widest text-black/20">Inventory Trend</h3>
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
                <h3 className="text-xs font-bold uppercase tracking-widest text-black/20">Category Distribution</h3>
                <div className="space-y-4">
                  {(stats.categoryStats as CategoryStat[]).sort((a, b) => b.count - a.count).map((stat) => (
                    <div key={stat.category} className="space-y-1">
                      <div className="flex justify-between text-[10px] font-mono uppercase text-black/40">
                        <span>{stat.category}</span>
                        <span>{stat.count} items</span>
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
              className="space-y-16"
            >
              <div className="space-y-8">
                <h2 className="text-xs font-bold uppercase tracking-[0.3em] text-black/20">Category Management</h2>
                <div className="flex gap-4">
                  <input 
                    value={newCategoryName}
                    onChange={e => setNewCategoryName(e.target.value)}
                    placeholder="New Category Name"
                    className="flex-1 minimal-input"
                  />
                  <button onClick={addCategory} className="minimal-button">Add</button>
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
                <h2 className="text-xs font-bold uppercase tracking-[0.3em] text-black/20">Data Management</h2>
                <div className="grid grid-cols-2 gap-4">
                  <button onClick={exportToJSON} className="minimal-button py-3 text-[10px]">Backup JSON</button>
                  <label className="minimal-button py-3 text-[10px] text-center cursor-pointer">
                    Restore JSON
                    <input type="file" accept=".json" onChange={importFromJSON} className="hidden" />
                  </label>
                </div>
                <p className="text-[9px] text-black/20 italic">Note: Data is stored locally in your browser. Use Backup/Restore to move data between devices.</p>
              </div>

              <div className="space-y-8">
                <h2 className="text-xs font-bold uppercase tracking-[0.3em] text-black/20">App Info</h2>
                <div className="p-8 border border-black/5 text-center space-y-4">
                  <p className="text-3xl font-serif font-bold">简.</p>
                  <p className="text-xs text-black/30">Version 2.0.0</p>
                  <p className="text-[10px] text-black/20 uppercase tracking-widest">Minimalist Inventory Management</p>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'logs' && (
            <motion.div 
              key="logs"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-16"
            >
              {(Object.entries(groupedLogs) as [string, Log[]][]).map(([month, monthLogs]) => (
                <div key={month} className="space-y-8">
                  <h2 className="text-xs font-bold uppercase tracking-[0.3em] text-black/20 sticky top-0 bg-white/80 backdrop-blur-sm py-4 z-10">{month}</h2>
                  <div className="space-y-6">
                    {monthLogs.map((log) => {
                      const actionLabels: Record<string, string> = {
                        add: '+ Added',
                        discard: '- Discarded',
                        keep: '✓ Kept',
                        gift: '- Gifted',
                        sell: '- Sold'
                      };
                      return (
                        <div key={log.id} className="flex gap-6 group">
                          <div className="w-12 text-[10px] font-mono text-black/20 pt-1">
                            {format(new Date(log.date), 'MM.dd')}
                          </div>
                          <div className="flex-1 border-l border-black/[0.03] pl-6 pb-6">
                            <div className="flex items-center gap-3">
                              <span className={cn(
                                "text-[10px] font-bold uppercase tracking-widest",
                                log.action === 'add' ? "text-black" : "text-black/30"
                              )}>
                                {actionLabels[log.action] || log.action}
                              </span>
                              <span className="text-sm font-medium">{log.item_name}</span>
                            </div>
                            {log.note && (
                              <p className="text-[10px] text-black/20 mt-1 font-mono">{log.note}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              
              {logs.length === 0 && (
                <div className="py-32 text-center text-black/20 italic font-serif">
                  No history recorded yet.
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
      
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
                      placeholder="Recipient name"
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
      
      <ItemModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={fetchData}
        onDiscard={handleDiscard}
        item={editingItem}
        categories={categories}
      />

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
                      {item.recipient && <span>To: {item.recipient}</span>}
                      {item.selling_price && <span>Price: ¥{item.selling_price}</span>}
                    </div>
                  </div>
                ))}
                {detailItems.length === 0 && <p className="text-center py-12 text-black/20 italic">No records found.</p>}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
