import React from 'react';
import { useStore } from '../../context/StoreContext';
import { Barcode, ShieldAlert, Store, UserCheck, Database, RefreshCw } from 'lucide-react';

interface HeaderProps {
  onOpenScanner: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenScanner, activeTab, setActiveTab }) => {
  const {
    currentUser,
    setCurrentUser,
    users,
    selectedBranchId,
    setSelectedBranchId,
    locations,
    balances
  } = useStore();

  const branchLocations = locations.filter(l => l.type === 'branch');
  const negativeCount = balances.filter(b => b.on_hand_qty < 0).length;

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
      <div className="flex items-center justify-between gap-6 px-6 py-3">
        {/* Zone 1: Single text wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-slate-900 text-amber-400 flex items-center justify-center font-bold text-base shadow-xs">
            C
          </div>
          <span className="text-base font-bold text-slate-900 tracking-tight whitespace-nowrap">
            نظام إدارة مخزون ومبيعات الملابس
          </span>
        </div>

        {/* Zone 2: Contextual Navigation Links */}
        <nav className="hidden lg:flex items-center gap-6 text-xs font-semibold text-slate-600">
          <button
            onClick={() => setActiveTab('pos')}
            className={`transition-colors whitespace-nowrap py-1 cursor-pointer ${
              activeTab === 'pos' ? 'text-amber-700 border-b-2 border-amber-600 font-bold' : 'hover:text-slate-900'
            }`}
          >
            نقطة البيع (POS)
          </button>
          <button
            onClick={() => setActiveTab('catalog')}
            className={`transition-colors whitespace-nowrap py-1 cursor-pointer ${
              activeTab === 'catalog' ? 'text-amber-700 border-b-2 border-amber-600 font-bold' : 'hover:text-slate-900'
            }`}
          >
            دليل الأصناف والباركود
          </button>
          <button
            onClick={() => setActiveTab('locations')}
            className={`transition-colors whitespace-nowrap py-1 cursor-pointer ${
              activeTab === 'locations' ? 'text-amber-700 border-b-2 border-amber-600 font-bold' : 'hover:text-slate-900'
            }`}
          >
            الأرصدة والمواقع
          </button>
          <button
            onClick={() => setActiveTab('transfers')}
            className={`transition-colors whitespace-nowrap py-1 cursor-pointer ${
              activeTab === 'transfers' ? 'text-amber-700 border-b-2 border-amber-600 font-bold' : 'hover:text-slate-900'
            }`}
          >
            التحويلات وبضاعة الطريق
          </button>
          <button
            onClick={() => setActiveTab('purchases')}
            className={`transition-colors whitespace-nowrap py-1 cursor-pointer ${
              activeTab === 'purchases' ? 'text-amber-700 border-b-2 border-amber-600 font-bold' : 'hover:text-slate-900'
            }`}
          >
            المشتريات والاستلام
          </button>
          <button
            onClick={() => setActiveTab('tests')}
            className={`transition-colors whitespace-nowrap py-1 cursor-pointer ${
              activeTab === 'tests' ? 'text-amber-700 border-b-2 border-amber-600 font-bold' : 'hover:text-slate-900'
            }`}
          >
            اختبارات القبول (AT-01 → AT-16)
          </button>
        </nav>

        {/* Zone 3: Primary Actions & User Role Switcher */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Negative Stock Alarm Alert if any negative exists */}
          {negativeCount > 0 && (
            <button
              onClick={() => setActiveTab('reports')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs font-semibold hover:bg-red-100 transition-colors"
              title="يوجد أرصدة سالبة تحتاج معالجة استثنائية وفق البند 4.3"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>{negativeCount} رصيد سالب</span>
            </button>
          )}

          {/* Current Branch Selector */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg text-xs">
            <Store className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-500 hidden sm:inline">الفرع:</span>
            <select
              value={selectedBranchId}
              onChange={e => setSelectedBranchId(e.target.value)}
              className="bg-transparent font-medium text-slate-800 focus:outline-none cursor-pointer"
            >
              {branchLocations.map(b => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* User & Role Switcher */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg text-xs">
            <UserCheck className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={currentUser.id}
              onChange={e => {
                const found = users.find(u => u.id === e.target.value);
                if (found) setCurrentUser(found);
              }}
              className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer"
            >
              {users.map(u => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>

          {/* Barcode Quick Trigger Button */}
          <button
            onClick={onOpenScanner}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-900 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors shadow-xs cursor-pointer whitespace-nowrap"
          >
            <Barcode className="w-4 h-4" />
            <span className="hidden sm:inline">مسح باركود</span>
          </button>
        </div>
      </div>
    </header>
  );
};
