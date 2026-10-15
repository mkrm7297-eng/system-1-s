import React from 'react';
import {
  ShoppingCart,
  Tags,
  Boxes,
  Truck,
  ArrowLeftRight,
  ClipboardCheck,
  FileSpreadsheet,
  CheckCircle,
  Database,
  ShieldCheck,
  AlertOctagon
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const { balances, transfers, stocktakes } = useStore();

  const pendingTransfers = transfers.filter(t => t.status === 'in_transit').length;
  const activeStocktakes = stocktakes.filter(s => s.status === 'counting' || s.status === 'recounting').length;
  const negativeStockCount = balances.filter(b => b.on_hand_qty < 0).length;

  const menuItems = [
    {
      id: 'pos',
      label: 'نقطة البيع والمرتجعات',
      subtitle: 'الوحدة E · فواتير ومرتجعات وخصم FIFO',
      icon: ShoppingCart
    },
    {
      id: 'catalog',
      label: 'دليل الأصناف والباركود',
      subtitle: 'الوحدة A · Code 128 وطباعة الاستيكر',
      icon: Tags
    },
    {
      id: 'locations',
      label: 'الأرصدة والمواقع',
      subtitle: 'الوحدة B · رصيد الألوان والمقاسات',
      icon: Boxes
    },
    {
      id: 'purchases',
      label: 'المشتريات والاستلام',
      subtitle: 'الوحدة C · فواتير ودفعات FIFO',
      icon: Truck
    },
    {
      id: 'transfers',
      label: 'التحويلات وبضاعة الطريق',
      subtitle: 'الوحدة D · شحن واستلام الفروع',
      icon: ArrowLeftRight,
      badge: pendingTransfers > 0 ? `${pendingTransfers} بالطريق` : undefined
    },
    {
      id: 'stocktake',
      label: 'الجرد والمطابقة الأعمى',
      subtitle: 'الوحدة F · جلسات وعد الفروق والتسوية',
      icon: ClipboardCheck,
      badge: activeStocktakes > 0 ? `${activeStocktakes} جاري` : undefined
    },
    {
      id: 'reports',
      label: 'التقارير وسلامة البيانات',
      subtitle: 'الوحدة G · تكلفة FIFO والنسخ الاحتياطي',
      icon: FileSpreadsheet,
      badge: negativeStockCount > 0 ? `${negativeStockCount} سالب` : undefined,
      badgeVariant: 'danger'
    },
    {
      id: 'tests',
      label: 'اختبارات القبول (AT-01 → AT-16)',
      subtitle: 'الفصل 7 · فحص معايير الاعتماد الـ 16',
      icon: CheckCircle
    }
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-100 flex flex-col shrink-0 min-h-[calc(100vh-57px)]">
      <div className="p-4 border-b border-slate-800">
        <div className="text-xs font-semibold text-slate-400">بيئة التشغيل المعتمدة:</div>
        <div className="flex items-center justify-between mt-1 text-slate-200 text-xs">
          <span className="font-medium">كمبيوتر مركزي محلي</span>
          <span className="text-amber-400 font-mono text-[11px]">v1.0 Ready</span>
        </div>
        <div className="mt-2 pt-2 border-t border-slate-800 text-[11px] text-slate-400 flex items-center gap-1.5">
          <Database className="w-3.5 h-3.5 text-emerald-400" />
          <span>قاعدة بيانات محلية تدعم القيود والمعاملات</span>
        </div>
      </div>

      <nav className="p-2 space-y-1 flex-1 overflow-y-auto">
        {menuItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between p-3 rounded-lg text-right transition-all cursor-pointer ${
                isActive
                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    isActive ? 'bg-amber-400 text-slate-950 font-bold' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold leading-tight">{item.label}</div>
                  <div className="text-[10px] text-slate-400 leading-tight mt-0.5">{item.subtitle}</div>
                </div>
              </div>

              {item.badge && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-md font-semibold whitespace-nowrap ${
                    item.badgeVariant === 'danger'
                      ? 'bg-red-900/60 text-red-200 border border-red-700/50'
                      : 'bg-amber-900/50 text-amber-200 border border-amber-700/40'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer System Specs */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/40 text-[11px] text-slate-400 space-y-1">
        <div className="flex items-center justify-between">
          <span>طريقة تقييم التكلفة:</span>
          <span className="font-bold text-amber-400 font-mono">FIFO</span>
        </div>
        <div className="flex items-center justify-between">
          <span>ترميز الباركود:</span>
          <span className="font-bold text-slate-300 font-mono">Code 128</span>
        </div>
        <div className="flex items-center justify-between">
          <span>الرصيد السالب:</span>
          <span className="font-semibold text-slate-300">استثناء بصلاحية</span>
        </div>
      </div>
    </aside>
  );
};
