import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../../context/StoreContext';
import { ProductVariant, SalesDocument, SalesLine } from '../../types';
import {
  ShoppingCart,
  Barcode,
  Search,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ShieldAlert,
  FileText,
  DollarSign,
  TrendingUp,
  X,
  Store,
  Layers,
  ArrowRight,
  Printer
} from 'lucide-react';
import { Code128Barcode } from '../common/Code128Barcode';

interface CartItem {
  variant: ProductVariant;
  qty: number;
  price: number;
}

export const PosModule: React.FC = () => {
  const {
    variants,
    products,
    sales,
    salesLines,
    saleAllocations,
    selectedBranchId,
    setSelectedBranchId,
    locations,
    currentUser,
    processSale,
    processSaleReturn,
    cancelSale,
    importLegacyInvoice,
    getVariantBalance,
    getProductById,
    scannedBarcodeBus,
    clearBarcodeScan
  } = useStore();

  const [activeTab, setActiveTab] = useState<'checkout' | 'invoices' | 'legacy'>('checkout');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('عميل نقدي');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [posError, setPosError] = useState<string | null>(null);
  const [posSuccess, setPosSuccess] = useState<string | null>(null);

  // Receipt Modal State
  const [receiptModalSale, setReceiptModalSale] = useState<SalesDocument | null>(null);

  // FIFO Breakdown Modal State
  const [fifoBreakdownSale, setFifoBreakdownSale] = useState<SalesDocument | null>(null);

  // Negative Stock Override Modal
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  const [overrideReason, setOverrideReason] = useState('استثناء بيع عاجل - بضاعة وصلت ولم تسجل بعد بالسيستم');
  const [supervisorName, setSupervisorName] = useState('أ. طارق حسني (مشرف النظام)');

  // Returns Modal
  const [selectedSaleForReturn, setSelectedSaleForReturn] = useState<SalesDocument | null>(null);
  const [returnItemsInput, setReturnItemsInput] = useState<
    { salesLineId: string; variant_id: string; qty: number; condition: 'good' | 'damaged' | 'quarantine' }[]
  >([]);
  const [returnError, setReturnError] = useState<string | null>(null);

  // Legacy invoice import form state
  const [legacyExternalId, setLegacyExternalId] = useState('LEGACY-INV-9901');
  const [legacyBarcode, setLegacyBarcode] = useState(variants[0]?.barcode || '');
  const [legacyQty, setLegacyQty] = useState(2);
  const [legacyPrice, setLegacyPrice] = useState(580);
  const [legacyResult, setLegacyResult] = useState<{ success: boolean; message: string } | null>(null);

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Listen to global barcode scanner
  useEffect(() => {
    if (scannedBarcodeBus) {
      const clean = scannedBarcodeBus.trim();
      const matched = variants.find(
        v => v.barcode === clean || v.sku.toLowerCase() === clean.toLowerCase()
      );
      if (matched) {
        addToCart(matched);
      }
      clearBarcodeScan();
    }
  }, [scannedBarcodeBus]);

  useEffect(() => {
    if (activeTab === 'checkout') {
      barcodeInputRef.current?.focus();
    }
  }, [activeTab]);

  // Cart calculations
  const totalCartAmount = cart.reduce((sum, item) => sum + item.qty * item.price, 0);

  const addToCart = (variant: ProductVariant) => {
    setPosError(null);
    setPosSuccess(null);

    setCart(prev => {
      const existing = prev.find(item => item.variant.id === variant.id);
      if (existing) {
        return prev.map(item =>
          item.variant.id === variant.id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [...prev, { variant, qty: 1, price: variant.selling_price }];
    });
  };

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = barcodeInput.trim();
    if (!clean) return;

    const matched = variants.find(
      v => v.barcode === clean || v.sku.toLowerCase() === clean.toLowerCase()
    );

    if (matched) {
      addToCart(matched);
      setBarcodeInput('');
    } else {
      setPosError(`الباركود [${clean}] غير مسجل بدليل الأصناف`);
    }
  };

  const updateCartQty = (variantId: string, delta: number) => {
    setCart(prev =>
      prev
        .map(item => {
          if (item.variant.id === variantId) {
            const newQty = item.qty + delta;
            return newQty > 0 ? { ...item, qty: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeFromCart = (variantId: string) => {
    setCart(prev => prev.filter(item => item.variant.id !== variantId));
  };

  const handleCheckout = (override: boolean = false) => {
    setPosError(null);
    setPosSuccess(null);

    if (cart.length === 0) {
      setPosError('سلة المبيعات فارغة، يرجى مسح أو اختيار أصناف أولاً');
      return;
    }

    const items = cart.map(c => ({
      variant_id: c.variant.id,
      qty: c.qty,
      selling_price: c.price
    }));

    const overridePayload = override
      ? {
          override: true,
          reason: overrideReason,
          supervisorName: supervisorName || currentUser.name
        }
      : undefined;

    const res = processSale(selectedBranchId, items, customerName, overridePayload);

    if (res.success && res.saleDoc) {
      setPosSuccess(
        `تم اعتماد الفاتورة ${res.saleDoc.invoice_no} بنجاح. الإجمالي: ${res.saleDoc.total_amount} ج.م (تكلفة FIFO: ${res.saleDoc.total_cost_fifo} ج.م)`
      );
      setCart([]);
      setIsOverrideModalOpen(false);
      setReceiptModalSale(res.saleDoc);
    } else {
      // If error is due to negative stock and user wants to request override
      if (res.error?.includes('الرصيد غير كافٍ') || res.error?.includes('الرصيد السالب')) {
        setIsOverrideModalOpen(true);
      }
      setPosError(res.error || 'فشلت معالجة الفاتورة');
    }
  };

  // Open Return Modal
  const openReturnModal = (sale: SalesDocument) => {
    setSelectedSaleForReturn(sale);
    const lines = salesLines.filter(l => l.document_id === sale.id);
    const initialReturns = lines.map(l => ({
      salesLineId: l.id,
      variant_id: l.variant_id,
      qty: 0, // initially 0
      condition: 'good' as const
    }));
    setReturnItemsInput(initialReturns);
    setReturnError(null);
  };

  const handleReturnSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSaleForReturn) return;

    const toReturn = returnItemsInput.filter(r => r.qty > 0);
    if (toReturn.length === 0) {
      setReturnError('يرجى تحديد كمية مرتجع للقطع (أكبر من 0)');
      return;
    }

    const res = processSaleReturn(selectedSaleForReturn.id, toReturn);
    if (res.success) {
      setSelectedSaleForReturn(null);
    } else {
      setReturnError(res.error || 'فشل معالجة المرتجع');
    }
  };

  const handleLegacyImport = (e: React.FormEvent) => {
    e.preventDefault();
    setLegacyResult(null);

    const res = importLegacyInvoice({
      external_id: legacyExternalId.trim(),
      branch_id: selectedBranchId,
      date: new Date().toISOString(),
      lines: [
        {
          barcode: legacyBarcode.trim(),
          qty: legacyQty,
          price: legacyPrice
        }
      ]
    });

    if (res.success) {
      setLegacyResult({
        success: true,
        message: `تم ترحيل الفاتورة القديمة [${legacyExternalId}] واعتماد خصم المخزون بنجاح.`
      });
    } else {
      setLegacyResult({
        success: false,
        message: res.error || 'فشل استيراد الفاتورة القديمة'
      });
    }
  };

  const branchLoc = locations.find(l => l.id === selectedBranchId);

  return (
    <div className="p-6 space-y-6">
      {/* Module Title & Tab bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            الوحدة E — نقطة البيع والمرتجعات وتكلفة FIFO
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            خصم فوري للمخزون، تقييم تكلفة البضاعة المباعة آلياً وفق FIFO، رقابة صارمة على الرصيد السالب، ومعالجة المرتجعات.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
          <button
            onClick={() => setActiveTab('checkout')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              activeTab === 'checkout' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            كاشير البيع الفوري
          </button>
          <button
            onClick={() => setActiveTab('invoices')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              activeTab === 'invoices' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            سجل الفواتير والمرتجعات ({sales.length})
          </button>
          <button
            onClick={() => setActiveTab('legacy')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              activeTab === 'legacy' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            ترحيل فواتير السيستم القديم (AT-11)
          </button>
        </div>
      </div>

      {/* POS Checkout Tab */}
      {activeTab === 'checkout' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Product Grid & Barcode Scanner */}
          <div className="lg:col-span-7 space-y-4">
            {/* Scanner Input Card */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <form onSubmit={handleBarcodeSubmit} className="flex gap-2">
                <div className="relative flex-1">
                  <Barcode className="w-5 h-5 text-amber-600 absolute right-3 top-2.5" />
                  <input
                    ref={barcodeInputRef}
                    type="text"
                    value={barcodeInput}
                    onChange={e => setBarcodeInput(e.target.value)}
                    placeholder="امسح باركود الصنف (Code 128) أو اكتب الكود واضغط Enter..."
                    className="w-full pr-10 pl-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer whitespace-nowrap"
                >
                  إضافة
                </button>
              </form>
            </div>

            {posError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{posError}</span>
                </div>
                <button
                  onClick={() => setIsOverrideModalOpen(true)}
                  className="text-[11px] font-bold text-red-900 underline hover:no-underline"
                >
                  طلب تصريح مشرف
                </button>
              </div>
            )}

            {posSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{posSuccess}</span>
              </div>
            )}

            {/* Quick Apparel Picker Grid */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">
                  الأصناف المتوفرة بـ {branchLoc?.name}:
                </span>
                <span className="text-[11px] text-slate-500 font-mono">
                  {variants.length} صنف مسجل
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[460px] overflow-y-auto pr-1">
                {variants.map(v => {
                  const prod = getProductById(v.product_id);
                  const onHand = getVariantBalance(v.id, selectedBranchId);

                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => addToCart(v)}
                      className="p-3 text-right bg-slate-50 hover:bg-amber-50 hover:border-amber-300 border border-slate-200 rounded-xl transition-all flex flex-col justify-between group cursor-pointer"
                    >
                      <div>
                        <div className="text-xs font-bold text-slate-900 group-hover:text-amber-900 truncate">
                          {prod?.name}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {v.color_name} · مقاس {v.size_name}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400 mt-0.5">{v.sku}</div>
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs">
                        <span className="font-mono font-bold text-slate-900 tabular-nums">
                          {v.selling_price} ج.م
                        </span>
                        <span
                          className={`font-mono text-[11px] font-bold ${
                            onHand > 0
                              ? 'text-emerald-700'
                              : onHand < 0
                              ? 'text-red-600'
                              : 'text-slate-400'
                          }`}
                        >
                          {onHand} قطع
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: POS Cart & Checkout Ticket */}
          <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-slate-700" />
                <span className="text-xs font-bold text-slate-900">سلة الفاتورة الحالية</span>
              </div>
              <span className="text-xs font-mono font-semibold text-slate-500">
                {cart.length} أصناف
              </span>
            </div>

            <div className="p-4 border-b border-slate-200 space-y-3 bg-white">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    اسم العميل:
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    الفرع المنفذ:
                  </label>
                  <select
                    value={selectedBranchId}
                    onChange={e => setSelectedBranchId(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs focus:outline-none cursor-pointer"
                  >
                    {locations
                      .filter(l => l.type === 'branch')
                      .map(b => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Cart Items List */}
            <div className="p-4 flex-1 space-y-2.5 min-h-[260px] max-h-[340px] overflow-y-auto">
              {cart.length === 0 ? (
                <div className="h-48 flex flex-col items-center justify-center text-slate-400 text-xs">
                  <ShoppingCart className="w-8 h-8 text-slate-300 mb-2 stroke-[1.5]" />
                  <span>لا توجد أصناف في السلة</span>
                  <span className="text-[11px] text-slate-400 mt-1">
                    امسح الباركود أو انقر على صنف من القائمة
                  </span>
                </div>
              ) : (
                cart.map(item => {
                  const prod = getProductById(item.variant.product_id);
                  const onHand = getVariantBalance(item.variant.id, selectedBranchId);
                  const isExceeding = item.qty > onHand;

                  return (
                    <div
                      key={item.variant.id}
                      className={`p-2.5 rounded-lg border text-xs flex items-center justify-between ${
                        isExceeding
                          ? 'bg-red-50/70 border-red-300'
                          : 'bg-slate-50/80 border-slate-200'
                      }`}
                    >
                      <div className="flex-1 pr-1">
                        <div className="font-bold text-slate-900 truncate max-w-[170px]">
                          {prod?.name}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {item.variant.color_name} · مقاس {item.variant.size_name}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400">
                          سعر: {item.price} ج.م | متاح: {onHand}
                        </div>
                        {isExceeding && (
                          <div className="text-[10px] font-bold text-red-600 mt-0.5">
                            الكمية تتجاوز الرصيد المتاح!
                          </div>
                        )}
                      </div>

                      {/* Qty Stepper */}
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => updateCartQty(item.variant.id, -1)}
                          className="w-6 h-6 rounded bg-white border border-slate-300 flex items-center justify-center hover:bg-slate-100 cursor-pointer"
                        >
                          <Minus className="w-3 h-3 text-slate-600" />
                        </button>
                        <span className="w-7 text-center font-mono font-bold text-slate-900 tabular-nums">
                          {item.qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateCartQty(item.variant.id, 1)}
                          className="w-6 h-6 rounded bg-white border border-slate-300 flex items-center justify-center hover:bg-slate-100 cursor-pointer"
                        >
                          <Plus className="w-3 h-3 text-slate-600" />
                        </button>
                      </div>

                      {/* Line Total & Remove */}
                      <div className="text-left pl-1">
                        <div className="font-mono font-bold text-slate-900 tabular-nums">
                          {(item.qty * item.price).toLocaleString()} ج.م
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.variant.id)}
                          className="text-[10px] text-slate-400 hover:text-red-600 mt-1 cursor-pointer"
                        >
                          حذف
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Total & Checkout Button */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span>المجموع الإجمالي:</span>
                <span className="font-mono text-lg font-bold text-slate-900 tabular-nums">
                  {totalCartAmount.toLocaleString()} ج.م
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>آلية التكلفة المعتمدة:</span>
                <span className="font-mono font-bold text-amber-700">FIFO (الوارد أولاً يصرف أولاً)</span>
              </div>

              <button
                type="button"
                onClick={() => handleCheckout(false)}
                disabled={cart.length === 0}
                className="w-full py-2.5 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 disabled:opacity-40 transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>اعتماد البيع وخصم المخزون</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoices & Returns History Tab */}
      {activeTab === 'invoices' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="p-3.5 border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800">
              سجل فواتير المبيعات الصادرة وتخصيص تكلفة FIFO والأرباح:
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                <tr>
                  <th className="py-3 px-4">رقم الفاتورة</th>
                  <th className="py-3 px-4">الفرع</th>
                  <th className="py-3 px-4">العميل</th>
                  <th className="py-3 px-4 text-left">قيمة البيع</th>
                  <th className="py-3 px-4 text-left font-mono text-amber-900">تكلفة FIFO</th>
                  <th className="py-3 px-4 text-left font-mono text-emerald-800">صافي الربح</th>
                  <th className="py-3 px-4">حالة الفاتورة</th>
                  <th className="py-3 px-4">التاريخ</th>
                  <th className="py-3 px-4 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sales.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400">
                      لم يتم تسجيل أي فواتير مبيعات بعد
                    </td>
                  </tr>
                ) : (
                  sales.map(s => {
                    const br = locations.find(l => l.id === s.branch_id);
                    const isCancelled = s.status === 'cancelled';

                    return (
                      <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          {s.invoice_no}
                          {s.has_negative_stock_exception && (
                            <span
                              className="mr-1.5 px-1.5 py-0.5 text-[9px] bg-red-100 text-red-800 rounded font-sans font-bold"
                              title={s.negative_stock_reason}
                            >
                              استثناء سالب
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-700">{br?.name}</td>
                        <td className="py-3 px-4 text-slate-800">{s.customer_name || 'عميل نقدي'}</td>
                        <td className="py-3 px-4 text-left font-mono font-bold tabular-nums text-slate-900">
                          {s.total_amount.toLocaleString()} ج.م
                        </td>
                        <td className="py-3 px-4 text-left font-mono tabular-nums text-amber-800">
                          {s.total_cost_fifo.toLocaleString()} ج.م
                        </td>
                        <td className="py-3 px-4 text-left font-mono font-bold tabular-nums text-emerald-700">
                          {s.net_profit.toLocaleString()} ج.م
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              isCancelled
                                ? 'bg-slate-100 text-slate-500 line-through'
                                : s.status === 'returned_partial'
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-emerald-50 text-emerald-700'
                            }`}
                          >
                            {isCancelled
                              ? 'ملغاة'
                              : s.status === 'returned_partial'
                              ? 'مرتجع جزئي'
                              : 'مكتملة ومحصّلة'}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                          {new Date(s.date).toLocaleDateString('ar-EG')}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setReceiptModalSale(s)}
                              className="px-2 py-1 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded border border-slate-300 cursor-pointer flex items-center gap-1"
                              title="عرض وطباعة إيصال الفاتورة الحراري"
                            >
                              <Printer className="w-3 h-3" />
                              <span>إيصال</span>
                            </button>
                            <button
                              onClick={() => setFifoBreakdownSale(s)}
                              className="px-2 py-1 text-[11px] font-semibold text-blue-800 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 cursor-pointer flex items-center gap-1"
                              title="عرض تفاصيل تخصيص دفعات FIFO"
                            >
                              <Layers className="w-3 h-3" />
                              <span>FIFO</span>
                            </button>
                            {!isCancelled && (
                              <>
                                <button
                                  onClick={() => openReturnModal(s)}
                                  className="px-2 py-1 text-[11px] font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 rounded border border-amber-200 cursor-pointer"
                                >
                                  مرتجع
                                </button>
                                <button
                                  onClick={() => cancelSale(s.id, 'طلب إلغاء من الكاشير')}
                                  className="px-2 py-1 text-[11px] font-semibold text-rose-800 bg-rose-50 hover:bg-rose-100 rounded border border-rose-200 cursor-pointer"
                                >
                                  إلغاء
                                </button>
                              </>
                            )}
                          </div>
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

      {/* Legacy Invoice Import Tab (AT-11) */}
      {activeTab === 'legacy' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs max-w-2xl space-y-4">
          <div className="border-b border-slate-200 pb-3">
            <h3 className="font-bold text-slate-900 text-sm">
              استيراد فواتير السيستم القديم ومنع التكرار (معيار AT-11)
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              الاحتفاظ برقم الفاتورة القديم (External ID) لمنع تكرار استيراد الفاتورة أو خصم المخزون مرتين.
            </p>
          </div>

          <form onSubmit={handleLegacyImport} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  رقم الفاتورة القديمة (External Ref ID):
                </label>
                <input
                  type="text"
                  value={legacyExternalId}
                  onChange={e => setLegacyExternalId(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  باركود الصنف المباع:
                </label>
                <select
                  value={legacyBarcode}
                  onChange={e => setLegacyBarcode(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono focus:outline-none"
                >
                  {variants.map(v => (
                    <option key={v.id} value={v.barcode}>
                      {v.barcode} - {v.sku}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">الكمية:</label>
                <input
                  type="number"
                  min="1"
                  value={legacyQty}
                  onChange={e => setLegacyQty(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">السعر (ج.م):</label>
                <input
                  type="number"
                  value={legacyPrice}
                  onChange={e => setLegacyPrice(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono"
                />
              </div>
            </div>

            {legacyResult && (
              <div
                className={`p-3 rounded-lg text-xs flex items-center gap-2 border ${
                  legacyResult.success
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-red-50 text-red-800 border-red-200'
                }`}
              >
                {legacyResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                )}
                <span>{legacyResult.message}</span>
              </div>
            )}

            <button
              type="submit"
              className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer"
            >
              استيراد الفاتورة القديمة
            </button>
          </form>
        </div>
      )}

      {/* Modal 1: Negative Stock Supervisor Override Authorization (AT-10) */}
      {isOverrideModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg border border-red-200 overflow-hidden text-right">
            <div className="flex items-center justify-between px-6 py-4 border-b border-red-100 bg-red-50/70">
              <button
                onClick={() => setIsOverrideModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2 text-red-900 font-bold text-sm">
                <ShieldAlert className="w-5 h-5 text-red-600" />
                <span>تصريح استثنائي للرصيد السالب (معيار AT-10)</span>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 leading-relaxed">
                <span className="font-bold">القاعدة المعتمدة بالبند 4.3:</span> الأصل منع الرصيد السالب لحماية صحة المخزون والتكلفة.
                يُسمح به استثنائياً فقط عبر تصريح مشرف معتمد مع تسجيل سبب واضح، المستخدم، والتوقيت، وإدراج الصنف
                في قائمة المتابعة.
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  سبب السماح بالرصيد السالب (إلزامي):
                </label>
                <textarea
                  rows={2}
                  value={overrideReason}
                  onChange={e => setOverrideReason(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-red-600"
                  placeholder="مثال: البضاعة وصلت الفرع فعلياً ولم تُسجل فاتورة الشراء بالسيستم بعد..."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  المشرف المعتمد للصلاحية الاستثنائية:
                </label>
                <input
                  type="text"
                  value={supervisorName}
                  onChange={e => setSupervisorName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-3 border-t border-slate-200 bg-slate-50">
              <button
                type="button"
                onClick={() => setIsOverrideModalOpen(false)}
                className="px-4 py-2 text-xs text-slate-600 hover:text-slate-900"
              >
                إلغاء ورفض البيع
              </button>
              <button
                type="button"
                onClick={() => handleCheckout(true)}
                className="px-4 py-2 text-xs font-bold text-white bg-red-700 rounded-lg hover:bg-red-800 transition-colors shadow-xs cursor-pointer"
              >
                اعتماد الاستثناء وإتمام البيع بالسالب
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Customer Returns & Inspection Routing (AT-12) */}
      {selectedSaleForReturn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl border border-slate-200 overflow-hidden text-right">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <button
                onClick={() => setSelectedSaleForReturn(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
              <h3 className="font-bold text-slate-900 text-sm">
                تسجيل مرتجع مبيعات للفاتورة: {selectedSaleForReturn.invoice_no} (AT-12)
              </h3>
            </div>

            <form onSubmit={handleReturnSubmit} className="p-6 space-y-4">
              {returnError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{returnError}</span>
                </div>
              )}

              <p className="text-xs text-slate-500">
                حدد كمية المرتجع لكل صنف مع نتيجة الفحص (صالح يعود للفرع مع إرجاع تكلفة FIFO، تالف يُرحل لمستودع التوالف، أو حجر فحص).
              </p>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                    <tr>
                      <th className="py-2.5 px-3">الصنف المباع</th>
                      <th className="py-2.5 px-3 text-center">الكمية بالفاتورة</th>
                      <th className="py-2.5 px-3 text-center">كمية المرتجع</th>
                      <th className="py-2.5 px-3">نتيجة الفحص المخزني</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {salesLines
                      .filter(l => l.document_id === selectedSaleForReturn.id)
                      .map(line => {
                        const v = variants.find(vr => vr.id === line.variant_id);
                        const p = v ? getProductById(v.product_id) : undefined;
                        const retItem = returnItemsInput.find(r => r.salesLineId === line.id);
                        const retQty = retItem ? retItem.qty : 0;

                        return (
                          <tr key={line.id} className="hover:bg-slate-50/70">
                            <td className="py-2.5 px-3">
                              <div className="font-bold text-slate-900">{v?.sku}</div>
                              <div className="text-[10px] text-slate-400">{p?.name}</div>
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono font-semibold">
                              {line.qty}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <input
                                type="number"
                                min="0"
                                max={line.qty}
                                value={retQty}
                                onChange={e => {
                                  const val = parseInt(e.target.value, 10) || 0;
                                  setReturnItemsInput(prev =>
                                    prev.map(r =>
                                      r.salesLineId === line.id ? { ...r, qty: val } : r
                                    )
                                  );
                                }}
                                className="w-16 p-1 text-center bg-slate-50 border border-slate-300 rounded font-mono font-bold"
                              />
                            </td>
                            <td className="py-2.5 px-3">
                              <select
                                value={retItem?.condition || 'good'}
                                onChange={e => {
                                  const cond = e.target.value as 'good' | 'damaged' | 'quarantine';
                                  setReturnItemsInput(prev =>
                                    prev.map(r =>
                                      r.salesLineId === line.id ? { ...r, condition: cond } : r
                                    )
                                  );
                                }}
                                className="p-1 bg-slate-50 border border-slate-300 rounded text-xs"
                              >
                                <option value="good">سليم صالح (إرجاع للرصيد النشط)</option>
                                <option value="damaged">تالف (عزل لمخزن التوالف)</option>
                                <option value="quarantine">حجر فحص (إعادة تقييم)</option>
                              </select>
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
                  onClick={() => setSelectedSaleForReturn(null)}
                  className="px-4 py-2 text-xs text-slate-600 hover:text-slate-900"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  اعتماد المرتجع وعكس الأثر المالي
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Thermal Receipt Preview & Printing */}
      {receiptModalSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md border border-slate-200 overflow-hidden text-right flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-slate-50 no-print">
              <button
                onClick={() => setReceiptModalSale(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2 font-bold text-slate-900 text-xs">
                <Printer className="w-4 h-4 text-amber-600" />
                <span>إيصال فاتورة البيع الحراري (80mm)</span>
              </div>
            </div>

            <div className="p-6 overflow-y-auto flex-1 flex justify-center bg-slate-100">
              {/* Actual Printable Receipt */}
              <div
                id="receipt-print-area"
                className="bg-white p-5 rounded shadow-sm border border-slate-300 w-[300px] text-center font-sans text-xs text-slate-800 space-y-3"
              >
                <div className="border-b border-dashed border-slate-300 pb-3">
                  <div className="text-sm font-extrabold text-slate-950">متجر ملابس راقية</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {locations.find(l => l.id === receiptModalSale.branch_id)?.name}
                  </div>
                  <div className="text-[9px] text-slate-400">س.ت: 104928 · ب.ض: 492-104-883</div>
                </div>

                <div className="text-right text-[11px] space-y-1 border-b border-dashed border-slate-300 pb-2.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">رقم الفاتورة:</span>
                    <span className="font-mono font-bold text-slate-900">{receiptModalSale.invoice_no}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">التاريخ والوقت:</span>
                    <span className="font-mono text-slate-700">
                      {new Date(receiptModalSale.date).toLocaleString('ar-EG')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">الكاشير:</span>
                    <span className="text-slate-800">{receiptModalSale.created_by}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">العميل:</span>
                    <span className="text-slate-800">{receiptModalSale.customer_name || 'عميل نقدي'}</span>
                  </div>
                </div>

                {/* Items */}
                <div className="border-b border-dashed border-slate-300 pb-2.5">
                  <table className="w-full text-right text-[11px]">
                    <thead className="text-[10px] text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="py-1">الصنف</th>
                        <th className="py-1 text-center">الكمية</th>
                        <th className="py-1 text-left">السعر</th>
                        <th className="py-1 text-left">الإجمالي</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {salesLines
                        .filter(l => l.document_id === receiptModalSale.id)
                        .map(line => {
                          const v = variants.find(vr => vr.id === line.variant_id);
                          const p = v ? getProductById(v.product_id) : undefined;
                          return (
                            <tr key={line.id}>
                              <td className="py-1.5 pr-0.5">
                                <div className="font-bold text-slate-900 truncate max-w-[130px]">{p?.name}</div>
                                <div className="text-[9px] text-slate-500">
                                  {v?.color_name} · {v?.size_name}
                                </div>
                              </td>
                              <td className="py-1.5 text-center font-mono font-bold">{line.qty}</td>
                              <td className="py-1.5 text-left font-mono">{line.selling_price}</td>
                              <td className="py-1.5 text-left font-mono font-bold">{line.total_price}</td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>

                {/* Total */}
                <div className="space-y-1 text-right text-xs pt-1">
                  <div className="flex justify-between font-bold text-sm text-slate-950">
                    <span>المجموع الإجمالي:</span>
                    <span className="font-mono">{receiptModalSale.total_amount.toLocaleString()} ج.م</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>طريقة الدفع:</span>
                    <span>نقدي / Cash</span>
                  </div>
                </div>

                {/* Barcode on receipt for easy return scanning */}
                <div className="pt-2 border-t border-dashed border-slate-300 flex flex-col items-center">
                  <Code128Barcode
                    value={receiptModalSale.invoice_no}
                    options={{ height: 32, width: 1.1, fontSize: 9 }}
                  />
                  <div className="text-[9px] text-slate-500 mt-2 leading-relaxed">
                    الاستبدال والاسترجاع خلال 14 يوماً بالفاتورة والباركود الأصلي بحالة الشراء
                  </div>
                  <div className="text-[9px] font-bold text-slate-700 mt-1">شكراً لزيارتكم ونتمنى رؤيتكم قريباً!</div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200 bg-slate-50 no-print">
              <button
                type="button"
                onClick={() => setReceiptModalSale(null)}
                className="px-4 py-2 text-xs text-slate-600 hover:text-slate-900"
              >
                إغلاق
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة الإيصال (80mm)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 4: FIFO Lot Allocations Inspection */}
      {fifoBreakdownSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl border border-slate-200 overflow-hidden text-right">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <button
                onClick={() => setFifoBreakdownSale(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <Layers className="w-4 h-4 text-blue-600" />
                <span>تفاصيل تخصيص تكلفة FIFO للفاتورة: {fifoBreakdownSale.invoice_no}</span>
              </div>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200 text-center font-mono">
                <div>
                  <div className="text-[10px] text-slate-500 font-sans">قيمة المبيعات:</div>
                  <div className="font-bold text-slate-900 text-sm">{fifoBreakdownSale.total_amount.toLocaleString()} ج.م</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 font-sans">تكلفة FIFO المخصومة:</div>
                  <div className="font-bold text-amber-800 text-sm">{fifoBreakdownSale.total_cost_fifo.toLocaleString()} ج.م</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 font-sans">صافي الربح:</div>
                  <div className="font-bold text-emerald-700 text-sm">{fifoBreakdownSale.net_profit.toLocaleString()} ج.م</div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="font-bold text-slate-800">الدفعات المسحوبة لكل بند (الوارد أولاً يصرف أولاً):</div>

                {salesLines
                  .filter(l => l.document_id === fifoBreakdownSale.id)
                  .map(line => {
                    const v = variants.find(vr => vr.id === line.variant_id);
                    const p = v ? getProductById(v.product_id) : undefined;
                    const allocations = saleAllocations.filter(a => a.sales_line_id === line.id);

                    return (
                      <div key={line.id} className="border border-slate-200 rounded-lg p-3 bg-white space-y-2">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                          <span className="font-bold text-slate-900">{p?.name} - {v?.color_name} ({v?.size_name})</span>
                          <span className="font-mono text-slate-600">الكمية المباعة: {line.qty} قطعة</span>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-right text-[11px]">
                            <thead className="text-slate-500 bg-slate-50">
                              <tr>
                                <th className="p-1.5">معرف الدفعة (Lot ID)</th>
                                <th className="p-1.5 text-center">الكمية المخصصة</th>
                                <th className="p-1.5 text-left">تكلفة شراء القطعة</th>
                                <th className="p-1.5 text-left font-bold">إجمالي تكلفة الصرف</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-mono">
                              {allocations.length === 0 ? (
                                <tr>
                                  <td colSpan={4} className="p-2 text-center text-slate-400 font-sans">
                                    تخصيص افتتاحي مسجل
                                  </td>
                                </tr>
                              ) : (
                                allocations.map((alloc, idx) => (
                                  <tr key={idx} className="hover:bg-slate-50/50">
                                    <td className="p-1.5 text-slate-700">{alloc.lot_id}</td>
                                    <td className="p-1.5 text-center font-bold text-slate-900">{alloc.qty}</td>
                                    <td className="p-1.5 text-left text-slate-700">{alloc.unit_cost.toLocaleString()} ج.م</td>
                                    <td className="p-1.5 text-left font-bold text-amber-900">
                                      {(alloc.qty * alloc.unit_cost).toLocaleString()} ج.م
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 text-right">
              <button
                type="button"
                onClick={() => setFifoBreakdownSale(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 cursor-pointer"
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
