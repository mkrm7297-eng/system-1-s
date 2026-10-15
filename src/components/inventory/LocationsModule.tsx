import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { ProductVariant, Location, StockMovement, StockDocument } from '../../types';
import {
  Building2,
  Store,
  Truck,
  AlertTriangle,
  FileText,
  Search,
  Filter,
  ArrowDownRight,
  ArrowUpLeft,
  X,
  Clock,
  Layers,
  ChevronRight
} from 'lucide-react';

export const LocationsModule: React.FC = () => {
  const {
    locations,
    variants,
    products,
    balances,
    movements,
    documents,
    getVariantBalance,
    getProductById
  } = useStore();

  const [activeTab, setActiveTab] = useState<'matrix' | 'ledger' | 'reorder'>('matrix');
  const [selectedLocFilter, setSelectedLocFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDocDetails, setSelectedDocDetails] = useState<StockDocument | null>(null);

  // Group locations
  const physicalLocations = locations.filter(l => l.type === 'central' || l.type === 'branch');
  const virtualLocations = locations.filter(l => l.type !== 'central' && l.type !== 'branch');

  // Filtered variants
  const filteredVariants = variants.filter(v => {
    const p = getProductById(v.product_id);
    const q = searchQuery.toLowerCase();
    return (
      v.sku.toLowerCase().includes(q) ||
      v.barcode.includes(q) ||
      v.color_name.includes(q) ||
      p?.name.includes(q) ||
      p?.model_code.toLowerCase().includes(q)
    );
  });

  // Reorder items
  const reorderAlerts = variants.filter(v => {
    // Total on-hand across all physical branches
    const totalPhysical = physicalLocations.reduce(
      (sum, loc) => sum + getVariantBalance(v.id, loc.id),
      0
    );
    return totalPhysical <= v.min_reorder_level;
  });

  // Filtered movements
  const filteredMovements = movements.filter(m => {
    const matchesLoc = selectedLocFilter === 'all' || m.location_id === selectedLocFilter;
    const v = variants.find(vr => vr.id === m.variant_id);
    const p = v ? getProductById(v.product_id) : undefined;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !searchQuery ||
      m.document_id.toLowerCase().includes(q) ||
      v?.sku.toLowerCase().includes(q) ||
      p?.name.includes(q);

    return matchesLoc && matchesSearch;
  });

  const openDocDetails = (docId: string) => {
    const doc = documents.find(d => d.id === docId);
    if (doc) setSelectedDocDetails(doc);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Module Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            الوحدة B — المواقع والأرصدة وسجل الحركات
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            متابعة أرصدة المخزن المركزي والفروع، بضاعة بالطريق، التوالف، والتتبع الدقيق لكل حركة حتى مستندها الأصلي.
          </p>
        </div>

        {/* View Switcher */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
          <button
            onClick={() => setActiveTab('matrix')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              activeTab === 'matrix' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            مصفوفة الأرصدة بالمواقع
          </button>
          <button
            onClick={() => setActiveTab('ledger')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              activeTab === 'ledger' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            سجل القيود والحركات الكامل ({movements.length})
          </button>
          <button
            onClick={() => setActiveTab('reorder')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              activeTab === 'reorder' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            تنبيهات حد إعادة الطلب ({reorderAlerts.length})
          </button>
        </div>
      </div>

      {/* Location Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {locations.map(loc => {
          const locBalances = balances.filter(b => b.location_id === loc.id);
          const totalQty = locBalances.reduce((sum, b) => sum + b.on_hand_qty, 0);

          return (
            <div
              key={loc.id}
              className={`p-3.5 rounded-xl border bg-white shadow-xs ${
                loc.type === 'central'
                  ? 'border-amber-300 ring-1 ring-amber-100'
                  : loc.type === 'in_transit'
                  ? 'border-blue-200 bg-blue-50/20'
                  : loc.type === 'damaged'
                  ? 'border-red-200 bg-red-50/20'
                  : 'border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between text-slate-500 mb-1">
                {loc.type === 'central' ? (
                  <Building2 className="w-4 h-4 text-amber-600" />
                ) : loc.type === 'in_transit' ? (
                  <Truck className="w-4 h-4 text-blue-600" />
                ) : loc.type === 'damaged' ? (
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                ) : (
                  <Store className="w-4 h-4 text-slate-600" />
                )}
                <span className="text-[10px] font-mono font-semibold text-slate-400">{loc.code}</span>
              </div>
              <div className="text-xs font-bold text-slate-900 truncate" title={loc.name}>
                {loc.name}
              </div>
              <div className="mt-2 text-base font-bold font-mono text-slate-900 tabular-nums">
                {totalQty.toLocaleString()}{' '}
                <span className="text-[10px] font-sans font-normal text-slate-400">قطعة</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Search & Location Filter */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-3.5 rounded-xl border border-slate-200">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="بحث بالصنف أو SKU أو المستند..."
            className="w-full pr-9 pl-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-amber-500"
          />
        </div>

        {activeTab === 'ledger' && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 whitespace-nowrap">تصفية بالموقع:</span>
            <select
              value={selectedLocFilter}
              onChange={e => setSelectedLocFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="all">جميع المواقع</option>
              {locations.map(l => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* TAB 1: Stock Matrix Across Locations */}
      {activeTab === 'matrix' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                <tr>
                  <th className="py-3 px-4">الصنف والموديل</th>
                  <th className="py-3 px-4">كود SKU</th>
                  <th className="py-3 px-4">اللون</th>
                  <th className="py-3 px-4">المقاس</th>
                  {locations.map(loc => (
                    <th key={loc.id} className="py-3 px-3 text-center">
                      <span className="block truncate max-w-[90px]" title={loc.name}>
                        {loc.name.replace(/\(.*\)/, '')}
                      </span>
                    </th>
                  ))}
                  <th className="py-3 px-4 text-left font-bold text-slate-900">إجمالي المخزون</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredVariants.map(v => {
                  const prod = getProductById(v.product_id);
                  let grandTotal = 0;

                  return (
                    <tr key={v.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{prod?.name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{prod?.model_code}</div>
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-slate-700">{v.sku}</td>
                      <td className="py-3 px-4">{v.color_name}</td>
                      <td className="py-3 px-4 font-semibold">{v.size_name}</td>
                      {locations.map(loc => {
                        const bal = getVariantBalance(v.id, loc.id);
                        grandTotal += bal;

                        return (
                          <td key={loc.id} className="py-3 px-3 text-center font-mono tabular-nums">
                            <span
                              className={`font-semibold ${
                                bal > 0
                                  ? loc.type === 'in_transit'
                                    ? 'text-blue-600 font-bold'
                                    : 'text-slate-800'
                                  : bal < 0
                                  ? 'text-red-600 font-bold'
                                  : 'text-slate-300'
                              }`}
                            >
                              {bal}
                            </span>
                          </td>
                        );
                      })}
                      <td className="py-3 px-4 text-left font-mono font-bold text-slate-900 tabular-nums">
                        {grandTotal} قطعة
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Complete Immutable Stock Movements Ledger */}
      {activeTab === 'ledger' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                <tr>
                  <th className="py-3 px-4">التاريخ والوقت</th>
                  <th className="py-3 px-4">المستند الأصلي</th>
                  <th className="py-3 px-4">الصنف (SKU)</th>
                  <th className="py-3 px-4">الموقع</th>
                  <th className="py-3 px-4 text-center">حركة المخزون</th>
                  <th className="py-3 px-4 text-left">التكلفة للقطعة</th>
                  <th className="py-3 px-4 text-left font-bold text-slate-900">الرصيد بعد الحركة</th>
                  <th className="py-3 px-4">البيان والملاحظات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMovements.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      لا توجد قيود مخزنية مطابقة
                    </td>
                  </tr>
                ) : (
                  filteredMovements.map(m => {
                    const v = variants.find(vr => vr.id === m.variant_id);
                    const prod = v ? getProductById(v.product_id) : undefined;
                    const loc = locations.find(l => l.id === m.location_id);
                    const isPositive = m.qty_delta > 0;

                    return (
                      <tr key={m.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 text-[11px] font-mono text-slate-500 whitespace-nowrap">
                          {new Date(m.created_at).toLocaleString('ar-EG')}
                        </td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => openDocDetails(m.document_id)}
                            className="text-amber-700 hover:text-amber-900 font-mono font-semibold underline decoration-dotted cursor-pointer flex items-center gap-1"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>{m.document_id.slice(0, 15)}</span>
                          </button>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">{v?.sku}</div>
                          <div className="text-[10px] text-slate-400">{prod?.name}</div>
                        </td>
                        <td className="py-3 px-4 text-slate-700">{loc?.name}</td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1 font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                              isPositive
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-rose-50 text-rose-700'
                            }`}
                          >
                            {isPositive ? (
                              <ArrowDownRight className="w-3 h-3" />
                            ) : (
                              <ArrowUpLeft className="w-3 h-3" />
                            )}
                            <span>{isPositive ? `+${m.qty_delta}` : m.qty_delta}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 text-left font-mono tabular-nums text-slate-600">
                          {m.unit_cost > 0 ? `${m.unit_cost.toLocaleString()} ج.م` : '—'}
                        </td>
                        <td className="py-3 px-4 text-left font-mono font-bold text-slate-900 tabular-nums">
                          {m.balance_after}
                        </td>
                        <td className="py-3 px-4 text-slate-500 text-[11px]">{m.notes}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Reorder Level Alerts */}
      {activeTab === 'reorder' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-200 bg-amber-50/50">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>الأصناف التي وصل رصيدها إلى حد إعادة الطلب أو أقل:</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                <tr>
                  <th className="py-3 px-4">الصنف والموديل</th>
                  <th className="py-3 px-4">كود SKU</th>
                  <th className="py-3 px-4">اللون / المقاس</th>
                  <th className="py-3 px-4 text-center">حد إعادة الطلب</th>
                  <th className="py-3 px-4 text-center">الرصيد الفعلي الحالي</th>
                  <th className="py-3 px-4 text-center">العجز المطلوب طلبه</th>
                  <th className="py-3 px-4 text-left">الإجراء الموصى به</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reorderAlerts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      جميع الأصناف في الحدود الآمنة ولا توجد نواقص حرجة.
                    </td>
                  </tr>
                ) : (
                  reorderAlerts.map(v => {
                    const prod = getProductById(v.product_id);
                    const currentTotal = physicalLocations.reduce(
                      (sum, loc) => sum + getVariantBalance(v.id, loc.id),
                      0
                    );
                    const deficit = Math.max(0, v.min_reorder_level - currentTotal);

                    return (
                      <tr key={v.id} className="hover:bg-slate-50/70">
                        <td className="py-3 px-4 font-bold text-slate-900">{prod?.name}</td>
                        <td className="py-3 px-4 font-mono font-semibold text-slate-700">{v.sku}</td>
                        <td className="py-3 px-4">
                          {v.color_name} / {v.size_name}
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-semibold text-slate-600">
                          {v.min_reorder_level} قطعة
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-red-600">
                          {currentTotal} قطعة
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-amber-700">
                          {deficit} قطعة
                        </td>
                        <td className="py-3 px-4 text-left">
                          <span className="text-[11px] font-semibold text-amber-900 bg-amber-100 px-2 py-0.5 rounded">
                            إصدار أمر شراء عاجل
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Drill-down Document Modal */}
      {selectedDocDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg border border-slate-200 overflow-hidden text-right">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50">
              <button
                onClick={() => setSelectedDocDetails(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-600" />
                <span className="font-bold text-slate-900 text-sm">
                  تفاصيل المستند الأصلي: {selectedDocDetails.doc_no}
                </span>
              </div>
            </div>

            <div className="p-5 space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">نوع المستند:</span>
                <span className="font-semibold text-slate-800">{selectedDocDetails.type}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">تاريخ الإنشاء:</span>
                <span className="font-mono text-slate-800">
                  {new Date(selectedDocDetails.created_at).toLocaleString('ar-EG')}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">أنشئ بواسطة:</span>
                <span className="font-semibold text-slate-800">{selectedDocDetails.created_by}</span>
              </div>
              {selectedDocDetails.approved_by && (
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">المعتمد:</span>
                  <span className="font-semibold text-slate-800">{selectedDocDetails.approved_by}</span>
                </div>
              )}
              {selectedDocDetails.supervisor_override_reason && (
                <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-red-800">
                  <div className="font-bold">استثناء رصيد سالب معتمد:</div>
                  <div className="mt-1">{selectedDocDetails.supervisor_override_reason}</div>
                </div>
              )}
              <div className="pt-2">
                <div className="text-slate-500 mb-1">البيان:</div>
                <div className="p-2.5 bg-slate-50 rounded-lg text-slate-700 border border-slate-200">
                  {selectedDocDetails.notes || 'لا توجد ملاحظات إضافية'}
                </div>
              </div>
            </div>

            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 text-right">
              <button
                type="button"
                onClick={() => setSelectedDocDetails(null)}
                className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
