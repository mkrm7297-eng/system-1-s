import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { TransferDocument, TransferLine } from '../../types';
import {
  ArrowLeftRight,
  Truck,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Store,
  X,
  FileText,
  Clock,
  Barcode
} from 'lucide-react';

export const TransfersModule: React.FC = () => {
  const {
    transfers,
    transferLines,
    locations,
    variants,
    products,
    createTransfer,
    confirmTransferReceipt,
    getVariantBalance,
    getProductById
  } = useStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [selectedTransferForReceive, setSelectedTransferForReceive] = useState<TransferDocument | null>(null);

  // New Transfer Form
  const [sourceLocId, setSourceLocId] = useState('loc-central');
  const [destLocId, setDestLocId] = useState('loc-maadi');
  const [transferNotes, setTransferNotes] = useState('');
  const [transferItems, setTransferItems] = useState<{ variant_id: string; qty: number }[]>([
    { variant_id: variants[0]?.id || '', qty: 10 }
  ]);
  const [formError, setFormError] = useState<string | null>(null);

  // Receiving Form State
  const [receivingInputs, setReceivingInputs] = useState<Record<string, number>>({});
  const [receiveNotes, setReceiveNotes] = useState<Record<string, string>>({});
  const [receiveError, setReceiveError] = useState<string | null>(null);

  const handleAddTransferItem = () => {
    setTransferItems(prev => [...prev, { variant_id: variants[0]?.id || '', qty: 5 }]);
  };

  const handleRemoveTransferItem = (index: number) => {
    setTransferItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    setTransferItems(prev =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const handleCreateTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (sourceLocId === destLocId) {
      setFormError('الموقع المصدر والموقع الهدف يجب أن يكونا مختلفين');
      return;
    }

    if (transferItems.length === 0) {
      setFormError('يرجى إضافة صنف واحد على الأقل للتحويل');
      return;
    }

    const res = createTransfer(sourceLocId, destLocId, transferItems, transferNotes);
    if (res.success) {
      setIsNewModalOpen(false);
      setTransferNotes('');
    } else {
      setFormError(res.error || 'فشل إنشاء إذن التحويل');
    }
  };

  const openReceiveModal = (transfer: TransferDocument) => {
    setSelectedTransferForReceive(transfer);
    const lines = transferLines.filter(l => l.transfer_id === transfer.id);
    const initialInputs: Record<string, number> = {};
    const initialNotes: Record<string, string> = {};

    lines.forEach(l => {
      initialInputs[l.id] = l.dispatched_qty; // default to matching count
      initialNotes[l.id] = '';
    });

    setReceivingInputs(initialInputs);
    setReceiveNotes(initialNotes);
    setReceiveError(null);
  };

  const handleConfirmReceiveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTransferForReceive) return;

    const lines = transferLines.filter(l => l.transfer_id === selectedTransferForReceive.id);
    const payload = lines.map(l => ({
      lineId: l.id,
      received_qty: receivingInputs[l.id] !== undefined ? receivingInputs[l.id] : l.dispatched_qty,
      notes: receiveNotes[l.id] || ''
    }));

    const res = confirmTransferReceipt(selectedTransferForReceive.id, payload);
    if (res.success) {
      setSelectedTransferForReceive(null);
    } else {
      setReceiveError(res.error || 'فشل تأكيد الاستلام');
    }
  };

  const filteredTransfers = transfers.filter(t => {
    const src = locations.find(l => l.id === t.source_location_id);
    const dst = locations.find(l => l.id === t.destination_location_id);
    const q = searchTerm.toLowerCase();
    return (
      t.transfer_no.toLowerCase().includes(q) ||
      src?.name.includes(q) ||
      dst?.name.includes(q)
    );
  });

  return (
    <div className="p-6 space-y-6">
      {/* Title & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            الوحدة D — التحويلات بين الفروع وبضاعة بالطريق
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            دورة تحويل مؤمنة: الشحن ينقل الكميات إلى موقع «بضاعة بالطريق»، والاستلام بالفرع يسجل الفروق والتسويات.
          </p>
        </div>

        <button
          onClick={() => setIsNewModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>إنشاء إذن شحن وتحويل جديد</span>
        </button>
      </div>

      {/* Transfers Data Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="p-3.5 border-b border-slate-200 flex items-center justify-between">
          <div className="relative w-72">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="بحث برقم التحويل أو الفرع..."
              className="w-full pr-9 pl-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="text-xs text-slate-500">
            إجمالي أذونات التحويل: <span className="font-bold text-slate-800">{transfers.length}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
              <tr>
                <th className="py-3 px-4">رقم إذن التحويل</th>
                <th className="py-3 px-4">الموقع المصدر</th>
                <th className="py-3 px-4">الموقع الهدف</th>
                <th className="py-3 px-4">حالة الشحنة</th>
                <th className="py-3 px-4">تاريخ الشحن</th>
                <th className="py-3 px-4">المسؤول عن الشحن</th>
                <th className="py-3 px-4 text-center">الإجراء المطلوب</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTransfers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    لا توجد تحويلات مسجلة
                  </td>
                </tr>
              ) : (
                filteredTransfers.map(t => {
                  const src = locations.find(l => l.id === t.source_location_id);
                  const dst = locations.find(l => l.id === t.destination_location_id);
                  const isTransit = t.status === 'in_transit';

                  return (
                    <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{t.transfer_no}</td>
                      <td className="py-3 px-4 font-medium text-slate-800">{src?.name}</td>
                      <td className="py-3 px-4 font-medium text-slate-800">{dst?.name}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-semibold ${
                            t.status === 'in_transit'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : t.status === 'received_full'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {t.status === 'in_transit' ? (
                            <>
                              <Truck className="w-3 h-3" />
                              <span>بضاعة بالطريق</span>
                            </>
                          ) : t.status === 'received_full' ? (
                            <>
                              <CheckCircle2 className="w-3 h-3" />
                              <span>تم الاستلام والمطابقة</span>
                            </>
                          ) : (
                            <>
                              <AlertTriangle className="w-3 h-3" />
                              <span>استلام جزئي (يوجد عجز)</span>
                            </>
                          )}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                        {t.dispatched_at ? new Date(t.dispatched_at).toLocaleDateString('ar-EG') : '—'}
                      </td>
                      <td className="py-3 px-4 text-slate-600">{t.created_by}</td>
                      <td className="py-3 px-4 text-center">
                        {isTransit ? (
                          <button
                            onClick={() => openReceiveModal(t)}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-md font-bold text-[11px] transition-colors cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>تأكيد الاستلام بالفرع</span>
                          </button>
                        ) : (
                          <span className="text-slate-400 text-[11px]">مكتمل ومغلق</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal 1: Create Transfer Dispatch */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl border border-slate-200 overflow-hidden text-right">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <button
                onClick={() => setIsNewModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
              <h3 className="font-bold text-slate-900 text-sm">
                إنشاء إذن شحن وتحويل بين المواقع (AT-06)
              </h3>
            </div>

            <form onSubmit={handleCreateTransferSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    الموقع المصدر (مكان الشحن):
                  </label>
                  <select
                    value={sourceLocId}
                    onChange={e => setSourceLocId(e.target.value)}
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
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    الموقع الهدف (فرع الوصول):
                  </label>
                  <select
                    value={destLocId}
                    onChange={e => setDestLocId(e.target.value)}
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

              {/* Items List */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-50 p-2.5 flex items-center justify-between border-b border-slate-200">
                  <span className="text-xs font-bold text-slate-800">الأصناف المراد نقلها:</span>
                  <button
                    type="button"
                    onClick={handleAddTransferItem}
                    className="flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-100 hover:bg-amber-200 px-2 py-1 rounded cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة صنف</span>
                  </button>
                </div>

                <div className="p-3 space-y-2 max-h-56 overflow-y-auto">
                  {transferItems.map((item, idx) => {
                    const availableAtSource = getVariantBalance(item.variant_id, sourceLocId);

                    return (
                      <div
                        key={idx}
                        className="grid grid-cols-12 gap-2 items-center bg-slate-50/70 p-2 rounded-lg border border-slate-200 text-xs"
                      >
                        <div className="col-span-8">
                          <label className="block text-[10px] text-slate-500 mb-0.5">الصنف:</label>
                          <select
                            value={item.variant_id}
                            onChange={e => handleItemChange(idx, 'variant_id', e.target.value)}
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

                        <div className="col-span-3">
                          <div className="flex justify-between items-center mb-0.5">
                            <span className="text-[10px] text-slate-500">الكمية:</span>
                            <span className="text-[10px] font-mono text-slate-400">
                              (المتاح: {availableAtSource})
                            </span>
                          </div>
                          <input
                            type="number"
                            min="1"
                            max={availableAtSource}
                            value={item.qty}
                            onChange={e =>
                              handleItemChange(idx, 'qty', parseInt(e.target.value, 10) || 1)
                            }
                            className="w-full p-1.5 bg-white border border-slate-300 rounded font-mono font-bold tabular-nums"
                          />
                        </div>

                        <div className="col-span-1 text-center pt-3">
                          <button
                            type="button"
                            onClick={() => handleRemoveTransferItem(idx)}
                            disabled={transferItems.length === 1}
                            className="text-slate-400 hover:text-red-600 disabled:opacity-30 cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ملاحظات أو رقم بوليصة الشحن:
                </label>
                <input
                  type="text"
                  value={transferNotes}
                  onChange={e => setTransferNotes(e.target.value)}
                  placeholder="اسم السائق أو رقم السيارة..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none"
                />
              </div>

              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg text-[11px] text-blue-900 leading-relaxed">
                عند الضغط على اعتماد الشحن، ستُخصم الكميات من الموقع المصدر وتُرحل آلياً إلى حساب «بضاعة بالطريق»
                مع الاحتفاظ بتكاليف دفعات الشراء الأصلية (FIFO) حتى يؤكد الفرع المستهدف الاستلام.
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
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
                  اعتماد الشحن ونقل البضاعة للطريق
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Confirm Transfer Receipt at Destination (AT-07) */}
      {selectedTransferForReceive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl border border-slate-200 overflow-hidden text-right">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <button
                onClick={() => setSelectedTransferForReceive(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
              <h3 className="font-bold text-slate-900 text-sm">
                تأكيد فحص واستلام الشحنة: {selectedTransferForReceive.transfer_no} (AT-07)
              </h3>
            </div>

            <form onSubmit={handleConfirmReceiveSubmit} className="p-6 space-y-4">
              {receiveError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{receiveError}</span>
                </div>
              )}

              <p className="text-xs text-slate-600">
                أدخل الكميات المستلمة فعلياً بعد العد ومسح الباركود بالفرع. في حال وجود عجز، سيظل الفرق مسجلاً
                ومعلقاً وفق متطلبات الوحدة D.
              </p>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                    <tr>
                      <th className="py-2.5 px-3">الصنف / SKU</th>
                      <th className="py-2.5 px-3 text-center">الكمية المشحونة</th>
                      <th className="py-2.5 px-3 text-center">المستلم الفعلي</th>
                      <th className="py-2.5 px-3 text-center">الفرق (عجز / زيادة)</th>
                      <th className="py-2.5 px-3">ملاحظة الفحص</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {transferLines
                      .filter(l => l.transfer_id === selectedTransferForReceive.id)
                      .map(line => {
                        const v = variants.find(vr => vr.id === line.variant_id);
                        const p = v ? getProductById(v.product_id) : undefined;
                        const recQty = receivingInputs[line.id] !== undefined ? receivingInputs[line.id] : line.dispatched_qty;
                        const variance = line.dispatched_qty - recQty;

                        return (
                          <tr key={line.id} className="hover:bg-slate-50/70">
                            <td className="py-2.5 px-3">
                              <div className="font-bold text-slate-900">{v?.sku}</div>
                              <div className="text-[10px] text-slate-400">{p?.name}</div>
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono font-semibold text-slate-700">
                              {line.dispatched_qty}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <input
                                type="number"
                                min="0"
                                value={recQty}
                                onChange={e =>
                                  setReceivingInputs(prev => ({
                                    ...prev,
                                    [line.id]: parseInt(e.target.value, 10) || 0
                                  }))
                                }
                                className="w-20 p-1 text-center bg-slate-50 border border-slate-300 rounded font-mono font-bold focus:outline-none"
                              />
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono font-bold">
                              {variance === 0 ? (
                                <span className="text-emerald-600">0 (مطابق)</span>
                              ) : variance > 0 ? (
                                <span className="text-red-600">-{variance} (عجز)</span>
                              ) : (
                                <span className="text-blue-600">+{Math.abs(variance)} (زيادة)</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3">
                              <input
                                type="text"
                                placeholder="سبب الفرق إن وجد..."
                                value={receiveNotes[line.id] || ''}
                                onChange={e =>
                                  setReceiveNotes(prev => ({
                                    ...prev,
                                    [line.id]: e.target.value
                                  }))
                                }
                                className="w-full p-1 bg-slate-50 border border-slate-200 rounded text-[11px] focus:outline-none"
                              />
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setSelectedTransferForReceive(null)}
                  className="px-4 py-2 text-xs text-slate-600 hover:text-slate-900"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  اعتماد استلام الفرع وإغلاق التحويل
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
