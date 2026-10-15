import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { PurchaseDocument, InventoryLot } from '../../types';
import {
  Truck,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  FileText,
  Clock,
  Layers,
  Building2,
  X,
  ArrowDownRight
} from 'lucide-react';

export const PurchasingModule: React.FC = () => {
  const {
    purchases,
    purchaseLines,
    suppliers,
    locations,
    variants,
    products,
    lots,
    receivePurchase,
    getProductById
  } = useStore();

  const [activeTab, setActiveTab] = useState<'invoices' | 'lots'>('invoices');
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Form State
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id || '');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [destinationLocationId, setDestinationLocationId] = useState('loc-central');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<
    { variant_id: string; ordered_qty: number; received_qty: number; unit_cost: number }[]
  >([
    {
      variant_id: variants[0]?.id || '',
      ordered_qty: 50,
      received_qty: 50,
      unit_cost: 320
    }
  ]);
  const [formError, setFormError] = useState<string | null>(null);

  const handleAddLine = () => {
    setLines(prev => [
      ...prev,
      {
        variant_id: variants[0]?.id || '',
        ordered_qty: 20,
        received_qty: 20,
        unit_cost: 200
      }
    ]);
  };

  const handleRemoveLine = (index: number) => {
    setLines(prev => prev.filter((_, i) => i !== index));
  };

  const handleLineChange = (index: number, field: string, value: any) => {
    setLines(prev =>
      prev.map((l, i) => {
        if (i === index) {
          return { ...l, [field]: value };
        }
        return l;
      })
    );
  };

  const handleSubmitPurchase = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!invoiceNo.trim()) {
      setFormError('يرجى إدخال رقم فاتورة المورد');
      return;
    }

    if (lines.length === 0) {
      setFormError('يرجى إضافة بند شراء واحد على الأقل');
      return;
    }

    const res = receivePurchase({
      supplier_id: supplierId,
      invoice_no: invoiceNo.trim(),
      destination_location_id: destinationLocationId,
      lines,
      notes
    });

    if (res.success) {
      setIsNewModalOpen(false);
      setInvoiceNo('');
      setNotes('');
    } else {
      setFormError(res.error || 'فشل تسجيل استلام الشراء');
    }
  };

  // Filtered invoices
  const filteredPurchases = purchases.filter(p => {
    const sup = suppliers.find(s => s.id === p.supplier_id);
    const q = searchTerm.toLowerCase();
    return (
      p.invoice_no.toLowerCase().includes(q) ||
      p.doc_no.toLowerCase().includes(q) ||
      sup?.name.includes(q)
    );
  });

  // Filtered FIFO lots
  const filteredLots = lots.filter(l => {
    const v = variants.find(vr => vr.id === l.variant_id);
    const p = v ? getProductById(v.product_id) : undefined;
    const q = searchTerm.toLowerCase();
    return (
      l.id.toLowerCase().includes(q) ||
      v?.sku.toLowerCase().includes(q) ||
      p?.name.includes(q)
    );
  });

  return (
    <div className="p-6 space-y-6">
      {/* Title & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            الوحدة C — المشتريات والاستلام ودفعات التكلفة (FIFO)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            تسجيل فواتير الموردين، مطابقة الاستلام الفعلي بالعجز والزيادة، وتوليد دفعات التكلفة مع الاحتفاظ بسعر الشراء الأصلي.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              onClick={() => setActiveTab('invoices')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                activeTab === 'invoices' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              فواتير الشراء الاستلامية
            </button>
            <button
              onClick={() => setActiveTab('lots')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                activeTab === 'lots' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              دفعات التكلفة النشطة (FIFO Lots)
            </button>
          </div>

          <button
            onClick={() => setIsNewModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>تسجيل استلام فاتورة شراء</span>
          </button>
        </div>
      </div>

      {/* Search Toolbar */}
      <div className="flex items-center justify-between bg-white p-3.5 rounded-xl border border-slate-200">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder={
              activeTab === 'invoices'
                ? 'بحث برقم الفاتورة أو المورد...'
                : 'بحث بالصنف أو كود الدفعة...'
            }
            className="w-full pr-9 pl-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* Invoices Table */}
      {activeTab === 'invoices' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                <tr>
                  <th className="py-3 px-4">رقم السند الداخلي</th>
                  <th className="py-3 px-4">فاتورة المورد</th>
                  <th className="py-3 px-4">المورد</th>
                  <th className="py-3 px-4">مستودع الاستلام</th>
                  <th className="py-3 px-4">حالة الاستلام</th>
                  <th className="py-3 px-4 text-left">إجمالي الفاتورة</th>
                  <th className="py-3 px-4">التاريخ</th>
                  <th className="py-3 px-4">المستلم</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPurchases.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      لا توجد فواتير شراء مسجلة بعد
                    </td>
                  </tr>
                ) : (
                  filteredPurchases.map(p => {
                    const sup = suppliers.find(s => s.id === p.supplier_id);
                    const loc = locations.find(l => l.id === p.destination_location_id);

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">{p.doc_no}</td>
                        <td className="py-3 px-4 font-mono text-slate-700">{p.invoice_no}</td>
                        <td className="py-3 px-4 font-medium text-slate-800">{sup?.name}</td>
                        <td className="py-3 px-4 text-slate-600">{loc?.name}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              p.status === 'received_full'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {p.status === 'received_full' ? 'استلام مطابق كامل' : 'استلام جزئي مع فروق'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-left font-mono font-bold text-slate-900 tabular-nums">
                          {p.total_amount.toLocaleString()} ج.م
                        </td>
                        <td className="py-3 px-4 text-[11px] font-mono text-slate-500">
                          {new Date(p.date).toLocaleDateString('ar-EG')}
                        </td>
                        <td className="py-3 px-4 text-slate-600 text-[11px]">{p.created_by}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* FIFO Lots Table */}
      {activeTab === 'lots' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="p-3 bg-amber-50/60 border-b border-amber-100 text-xs text-amber-900 flex items-center justify-between">
            <span>
              قاعدة بيانات دفعات التكلفة النشطة وفق مبدأ الوارد أولاً يصرف أولاً (FIFO). يخصم البيع من أقدم دفعة نشطة.
            </span>
            <span className="font-mono font-bold">{filteredLots.length} دفعة مخزنة</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                <tr>
                  <th className="py-3 px-4">معرف الدفعة (Lot ID)</th>
                  <th className="py-3 px-4">الموديل والصنف</th>
                  <th className="py-3 px-4">كود SKU</th>
                  <th className="py-3 px-4">الموقع الحالي</th>
                  <th className="py-3 px-4 text-center">الكمية الأصلية</th>
                  <th className="py-3 px-4 text-center font-bold text-slate-900">الكمية المتبقية</th>
                  <th className="py-3 px-4 text-left">تكلفة الشراء الأصلية للقطعة</th>
                  <th className="py-3 px-4 text-left font-bold text-slate-900">إجمالي قيمة الرصيد بالدفعة</th>
                  <th className="py-3 px-4">تاريخ الاستلام</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLots.map(lot => {
                  const v = variants.find(vr => vr.id === lot.variant_id);
                  const prod = v ? getProductById(v.product_id) : undefined;
                  const loc = locations.find(l => l.id === lot.location_id);
                  const totalLotValue = lot.remaining_qty * lot.unit_cost;

                  return (
                    <tr key={lot.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-semibold text-slate-700">{lot.id}</td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{prod?.name}</div>
                        <div className="text-[11px] text-slate-400">
                          {v?.color_name} / {v?.size_name}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-slate-700">{v?.sku}</td>
                      <td className="py-3 px-4 text-slate-700">{loc?.name}</td>
                      <td className="py-3 px-4 text-center font-mono tabular-nums text-slate-500">
                        {lot.original_qty}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold tabular-nums text-emerald-700">
                        {lot.remaining_qty}
                      </td>
                      <td className="py-3 px-4 text-left font-mono font-bold text-slate-800 tabular-nums">
                        {lot.unit_cost.toLocaleString()} ج.م
                      </td>
                      <td className="py-3 px-4 text-left font-mono font-bold text-slate-900 tabular-nums">
                        {totalLotValue.toLocaleString()} ج.م
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                        {new Date(lot.created_at).toLocaleDateString('ar-EG')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: New Purchase Invoice */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl border border-slate-200 overflow-hidden text-right">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <button
                onClick={() => setIsNewModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
              <h3 className="font-bold text-slate-900 text-sm">
                تسجيل استلام فاتورة شراء جديدة وتوليد دفعات FIFO (AT-04)
              </h3>
            </div>

            <form onSubmit={handleSubmitPurchase} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">المورد:</label>
                  <select
                    value={supplierId}
                    onChange={e => setSupplierId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none cursor-pointer"
                  >
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    رقم فاتورة المورد:
                  </label>
                  <input
                    type="text"
                    value={invoiceNo}
                    onChange={e => setInvoiceNo(e.target.value)}
                    placeholder="INV-SUP-..."
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono focus:outline-none focus:border-amber-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    مستودع الاستلام:
                  </label>
                  <select
                    value={destinationLocationId}
                    onChange={e => setDestinationLocationId(e.target.value)}
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
              </div>

              {/* Lines Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-50 p-2.5 flex items-center justify-between border-b border-slate-200">
                  <span className="text-xs font-bold text-slate-800">
                    أصناف الفاتورة والكميات المستلمة وتكلفة الشراء:
                  </span>
                  <button
                    type="button"
                    onClick={handleAddLine}
                    className="flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-100 hover:bg-amber-200 px-2 py-1 rounded cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة صنف</span>
                  </button>
                </div>

                <div className="p-3 space-y-2 max-h-60 overflow-y-auto">
                  {lines.map((line, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-12 gap-2 items-center bg-slate-50/60 p-2 rounded-lg border border-slate-200 text-xs"
                    >
                      <div className="col-span-5">
                        <label className="block text-[10px] text-slate-500 mb-0.5">الصنف / SKU:</label>
                        <select
                          value={line.variant_id}
                          onChange={e => handleLineChange(idx, 'variant_id', e.target.value)}
                          className="w-full p-1.5 bg-white border border-slate-300 rounded text-xs focus:outline-none"
                        >
                          {variants.map(v => {
                            const p = getProductById(v.product_id);
                            return (
                              <option key={v.id} value={v.id}>
                                {p?.name} - {v.color_name} ({v.size_name}) [{v.sku}]
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      <div className="col-span-2">
                        <label className="block text-[10px] text-slate-500 mb-0.5">المطلوب:</label>
                        <input
                          type="number"
                          min="1"
                          value={line.ordered_qty}
                          onChange={e =>
                            handleLineChange(idx, 'ordered_qty', parseInt(e.target.value, 10) || 1)
                          }
                          className="w-full p-1.5 bg-white border border-slate-300 rounded font-mono tabular-nums"
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="block text-[10px] text-slate-500 mb-0.5">المستلم الفعلي:</label>
                        <input
                          type="number"
                          min="0"
                          value={line.received_qty}
                          onChange={e =>
                            handleLineChange(idx, 'received_qty', parseInt(e.target.value, 10) || 0)
                          }
                          className="w-full p-1.5 bg-white border border-slate-300 rounded font-mono font-bold text-emerald-700 tabular-nums"
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="block text-[10px] text-slate-500 mb-0.5">تكلفة الوحدة (ج.م):</label>
                        <input
                          type="number"
                          min="0"
                          value={line.unit_cost}
                          onChange={e =>
                            handleLineChange(idx, 'unit_cost', parseFloat(e.target.value) || 0)
                          }
                          className="w-full p-1.5 bg-white border border-slate-300 rounded font-mono tabular-nums"
                        />
                      </div>

                      <div className="col-span-1 text-center pt-3">
                        <button
                          type="button"
                          onClick={() => handleRemoveLine(idx)}
                          disabled={lines.length === 1}
                          className="text-slate-400 hover:text-red-600 disabled:opacity-30 cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ملاحظات الاستلام:
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="ملاحظات فحص الجودة والمطابقة..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                <div className="text-xs font-mono font-bold text-slate-800">
                  إجمالي الفاتورة المتوقعة:{' '}
                  {lines.reduce((s, l) => s + l.received_qty * l.unit_cost, 0).toLocaleString()} ج.م
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsNewModalOpen(false)}
                    className="px-4 py-2 text-xs text-slate-600 hover:text-slate-900"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-bold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
                  >
                    اعتماد الاستلام وتوليد الدفعات
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
