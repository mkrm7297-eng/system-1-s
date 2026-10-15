import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { StocktakeSession, StocktakeLine } from '../../types';
import {
  ClipboardCheck,
  Plus,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle2,
  Search,
  RotateCcw,
  ShieldCheck,
  X,
  FileSpreadsheet
} from 'lucide-react';

export const StocktakeModule: React.FC = () => {
  const {
    stocktakes,
    stocktakeLines,
    locations,
    variants,
    products,
    categories,
    currentUser,
    startStocktake,
    updateStocktakeCount,
    reconcileStocktake,
    getProductById
  } = useStore();

  const [activeSessionId, setActiveSessionId] = useState<string | null>(
    stocktakes[0]?.id || null
  );
  const [isStartModalOpen, setIsStartModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // New Session Form State
  const [locationId, setLocationId] = useState('loc-central');
  const [scope, setScope] = useState<'full' | 'category'>('full');
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '');
  const [blindCount, setBlindCount] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  // Reconciliation Notes
  const [reconcileNotes, setReconcileNotes] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  const activeSession = stocktakes.find(s => s.id === activeSessionId) || stocktakes[0];

  const handleStartSession = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const res = startStocktake(
      locationId,
      scope,
      blindCount,
      scope === 'category' ? categoryId : undefined
    );

    if (res.success && res.session) {
      setActiveSessionId(res.session.id);
      setIsStartModalOpen(false);
    } else {
      setFormError(res.error || 'فشل بدء جلسة الجرد');
    }
  };

  const handleReconcile = () => {
    setActionError(null);
    if (!activeSession) return;

    const res = reconcileStocktake(activeSession.id, reconcileNotes);
    if (!res.success) {
      setActionError(res.error || 'فشل اعتماد التسوية');
    }
  };

  // Lines for active session
  const currentLines = stocktakeLines.filter(
    l => activeSession && l.session_id === activeSession.id
  );

  const filteredLines = currentLines.filter(l => {
    const v = variants.find(vr => vr.id === l.variant_id);
    const p = v ? getProductById(v.product_id) : undefined;
    const q = searchTerm.toLowerCase();
    return (
      v?.sku.toLowerCase().includes(q) ||
      v?.barcode.includes(q) ||
      p?.name.includes(q)
    );
  });

  const totalVariancesCount = currentLines.filter(l => l.variance_qty !== 0).length;

  return (
    <div className="p-6 space-y-6">
      {/* Module Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            الوحدة F — الجرد والمطابقة والعد الأعمى (Blind Count)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            جلسات جرد دورية ومفاجئة، إخفاء الرصيد المتوقع لمنع التلاعب، إعادة عد الفروق، واعتماد التسويات بصلاحية رقابية.
          </p>
        </div>

        <button
          onClick={() => setIsStartModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>فتح جلسة جرد جديدة</span>
        </button>
      </div>

      {actionError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Session Header Card */}
      {activeSession ? (
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold">
              <ClipboardCheck className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-sm">
                  جلسة رقم: {activeSession.session_no}
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                    activeSession.status === 'reconciled'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-amber-50 text-amber-800 border border-amber-200'
                  }`}
                >
                  {activeSession.status === 'reconciled' ? 'تمت التسوية والاعتماد' : 'جلسة عد جارية'}
                </span>
              </div>
              <div className="text-xs text-slate-500 mt-1">
                الموقع:{' '}
                <span className="font-semibold text-slate-800">
                  {locations.find(l => l.id === activeSession.location_id)?.name}
                </span>{' '}
                · نوع الجرد: {activeSession.scope === 'full' ? 'جرد شامل' : 'جرد تصنيف محدد'} · المسؤول:{' '}
                {activeSession.opened_by}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {activeSession.blind_count && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 rounded-lg text-xs text-slate-700 border border-slate-200">
                <EyeOff className="w-3.5 h-3.5 text-slate-500" />
                <span>العد الأعمى مفعّل (الرصيد المتوقع مخفي عن القائم بالعد)</span>
              </div>
            )}

            {activeSession.status !== 'reconciled' && (
              <button
                onClick={handleReconcile}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-colors shadow-xs cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>اعتماد التسوية وقيد الفروق (AT-09)</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="p-8 text-center bg-white border border-slate-200 rounded-xl text-slate-400 text-xs">
          لا توجد جلسات جرد مفتوحة. انقر على زر فتح جلسة جرد جديدة للبدء.
        </div>
      )}

      {/* Counting Grid */}
      {activeSession && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="p-3.5 border-b border-slate-200 flex items-center justify-between">
            <div className="relative w-72">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="بحث بالصنف أو SKU أو الباركود..."
                className="w-full pr-9 pl-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="text-xs text-slate-600 font-medium">
              فروق الجرد المكتشفة: <span className="font-bold text-red-600 font-mono">{totalVariancesCount}</span> صنف
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                <tr>
                  <th className="py-3 px-4">الصنف / SKU</th>
                  <th className="py-3 px-4">باركود الصنف</th>
                  <th className="py-3 px-4 text-center">الرصيد الدفتري المسجل</th>
                  <th className="py-3 px-4 text-center">العد الفعلي للقطع</th>
                  <th className="py-3 px-4 text-center">فروق الجرد (AT-08)</th>
                  <th className="py-3 px-4 text-center">إعادة العد (Recount)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLines.map(line => {
                  const v = variants.find(vr => vr.id === line.variant_id);
                  const p = v ? getProductById(v.product_id) : undefined;
                  const isClosed = activeSession.status === 'reconciled';

                  return (
                    <tr key={line.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{p?.name}</div>
                        <div className="text-[11px] text-slate-500">
                          {v?.color_name} · مقاس {v?.size_name} [{v?.sku}]
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">{v?.barcode}</td>
                      <td className="py-3 px-4 text-center font-mono">
                        {activeSession.blind_count && !isClosed ? (
                          <span className="text-[11px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                            مخفي (عد أعمى)
                          </span>
                        ) : (
                          <span className="font-semibold text-slate-800">{line.expected_qty}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <input
                          type="number"
                          min="0"
                          disabled={isClosed}
                          value={line.counted_qty}
                          onChange={e =>
                            updateStocktakeCount(
                              activeSession.id,
                              line.variant_id,
                              parseInt(e.target.value, 10) || 0
                            )
                          }
                          className="w-20 p-1 text-center bg-slate-50 border border-slate-300 rounded font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-600 disabled:opacity-50"
                        />
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold">
                        {line.variance_qty === 0 ? (
                          <span className="text-emerald-600">0 (مطابق)</span>
                        ) : line.variance_qty > 0 ? (
                          <span className="text-blue-600">+{line.variance_qty} (فائض زيادة)</span>
                        ) : (
                          <span className="text-red-600">{line.variance_qty} (عجز مخزني)</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          disabled={isClosed}
                          onClick={() => {
                            const val = prompt('أدخل نتيجة إعادة العد للصنف:', String(line.counted_qty));
                            if (val !== null) {
                              updateStocktakeCount(
                                activeSession.id,
                                line.variant_id,
                                parseInt(val, 10) || 0,
                                true
                              );
                            }
                          }}
                          className="px-2 py-1 bg-slate-100 hover:bg-amber-100 text-slate-700 text-[11px] font-medium rounded transition-colors disabled:opacity-40 cursor-pointer"
                        >
                          إعادة عد
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Start New Stocktake */}
      {isStartModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg border border-slate-200 overflow-hidden text-right">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <button
                onClick={() => setIsStartModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
              <h3 className="font-bold text-slate-900 text-sm">
                فتح جلسة جرد فعلي ومطابقة (AT-08)
              </h3>
            </div>

            <form onSubmit={handleStartSession} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  الموقع المراد جرده:
                </label>
                <select
                  value={locationId}
                  onChange={e => setLocationId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none cursor-pointer"
                >
                  {locations
                    .filter(l => l.type === 'central' || l.type === 'branch')
                    .map(l => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">نطاق الجرد:</label>
                <div className="flex gap-4 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="scope"
                      checked={scope === 'full'}
                      onChange={() => setScope('full')}
                      className="text-amber-600 focus:ring-amber-500"
                    />
                    <span>جرد شامل لجميع الأصناف بالموقع</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="scope"
                      checked={scope === 'category'}
                      onChange={() => setScope('category')}
                      className="text-amber-600 focus:ring-amber-500"
                    />
                    <span>جرد تصنيف محدد</span>
                  </label>
                </div>
              </div>

              {scope === 'category' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    اختر التصنيف:
                  </label>
                  <select
                    value={categoryId}
                    onChange={e => setCategoryId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none cursor-pointer"
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-800">تفعيل العد الأعمى (Blind Count)</div>
                  <div className="text-[11px] text-slate-500">
                    إخفاء الرصيد المسجل عن شاشة العد لمنع التحيز وضمان دقة المطابقة
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={blindCount}
                  onChange={e => setBlindCount(e.target.checked)}
                  className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 w-4 h-4"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsStartModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-600 hover:text-slate-900"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  بدء جلسة الجرد
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
