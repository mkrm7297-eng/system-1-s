import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import {
  FileSpreadsheet,
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Database,
  Truck,
  RotateCcw,
  Clock,
  Layers,
  Search,
  Activity
} from 'lucide-react';
import { reconstructBalancesFromLedger } from '../../utils/fifo';

export const ReportsModule: React.FC = () => {
  const {
    variants,
    products,
    locations,
    balances,
    lots,
    sales,
    transfers,
    movements,
    auditLogs,
    exportDatabaseBackup,
    restoreDatabaseBackup,
    resetToInitialData,
    getProductById
  } = useStore();

  const [activeReport, setActiveReport] = useState<
    'fifo_valuation' | 'negative_stock' | 'transit_transfers' | 'audit_log' | 'backup_integrity'
  >('fifo_valuation');

  const [restoreJson, setRestoreJson] = useState('');
  const [restoreFeedback, setRestoreFeedback] = useState<{
    success: boolean;
    message: string;
    balanceMismatches?: number;
  } | null>(null);

  const [integrityStatus, setIntegrityStatus] = useState<{
    tested: boolean;
    mismatchCount: number;
    details: string[];
  } | null>(null);

  // Financial & Inventory KPIs
  const totalValuation = lots.reduce((sum, l) => sum + l.remaining_qty * l.unit_cost, 0);
  const totalSalesRevenue = sales
    .filter(s => s.status !== 'cancelled')
    .reduce((sum, s) => sum + s.total_amount, 0);
  const totalFifoCost = sales
    .filter(s => s.status !== 'cancelled')
    .reduce((sum, s) => sum + s.total_cost_fifo, 0);
  const totalNetProfit = totalSalesRevenue - totalFifoCost;

  const negativeBalances = balances.filter(b => b.on_hand_qty < 0);
  const inTransitTransfers = transfers.filter(t => t.status === 'in_transit');

  const handleExportBackup = () => {
    const json = exportDatabaseBackup();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clothing-pos-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRestoreSubmit = () => {
    setRestoreFeedback(null);
    if (!restoreJson.trim()) return;
    const res = restoreDatabaseBackup(restoreJson.trim());
    setRestoreFeedback(res);
  };

  const runDatabaseIntegrityCheck = () => {
    const reconstructed = reconstructBalancesFromLedger(movements);
    const details: string[] = [];
    let mismatches = 0;

    for (const bal of balances) {
      const key = `${bal.variant_id}__${bal.location_id}`;
      const expected = reconstructed[key] || 0;
      if (expected !== bal.on_hand_qty) {
        mismatches++;
        const v = variants.find(vr => vr.id === bal.variant_id);
        const loc = locations.find(l => l.id === bal.location_id);
        details.push(
          `اختلاف في ${v?.sku || bal.variant_id} بموقع ${loc?.name}: رصيد الجدول (${bal.on_hand_qty}) مقابل رصيد الحركات (${expected})`
        );
      }
    }

    setIntegrityStatus({
      tested: true,
      mismatchCount: mismatches,
      details
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            الوحدة G — التقارير والمراجعة وسلامة قاعدة البيانات
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            تقييم المخزون وفق FIFO، متابعة الأرصدة السالبة وبضاعة الطريق، سجل التدقيق الكامل، والنسخ الاحتياطي مع التحقق من سلامة الأرصدة.
          </p>
        </div>

        {/* View Switcher */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto max-w-full">
          <button
            onClick={() => setActiveReport('fifo_valuation')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
              activeReport === 'fifo_valuation'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            تقييم المخزون وFIFO
          </button>
          <button
            onClick={() => setActiveReport('negative_stock')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
              activeReport === 'negative_stock'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            الأرصدة السالبة ({negativeBalances.length})
          </button>
          <button
            onClick={() => setActiveReport('transit_transfers')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
              activeReport === 'transit_transfers'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            بضاعة بالطريق ({inTransitTransfers.length})
          </button>
          <button
            onClick={() => setActiveReport('audit_log')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
              activeReport === 'audit_log'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            سجل التدقيق ({auditLogs.length})
          </button>
          <button
            onClick={() => setActiveReport('backup_integrity')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
              activeReport === 'backup_integrity'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            النسخ الاحتياطي وسلامة البيانات
          </button>
        </div>
      </div>

      {/* Financial & Inventory KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 font-semibold mb-1">
            إجمالي تقييم المخزون الحالي (FIFO):
          </div>
          <div className="text-lg font-bold font-mono text-slate-900 tabular-nums">
            {totalValuation.toLocaleString()} ج.م
          </div>
          <div className="text-[11px] text-slate-400 mt-1">حسب تكاليف دفعات الشراء الأصلية</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 font-semibold mb-1">إجمالي إيراد المبيعات:</div>
          <div className="text-lg font-bold font-mono text-slate-900 tabular-nums">
            {totalSalesRevenue.toLocaleString()} ج.م
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {sales.filter(s => s.status !== 'cancelled').length} فاتورة معتمدة
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 font-semibold mb-1">تكلفة البضاعة المباعة (COGS):</div>
          <div className="text-lg font-bold font-mono text-amber-800 tabular-nums">
            {totalFifoCost.toLocaleString()} ج.م
          </div>
          <div className="text-[11px] text-slate-400 mt-1">وفق تخصيص دفعات FIFO</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 font-semibold mb-1">صافي أرباح النشاط:</div>
          <div className="text-lg font-bold font-mono text-emerald-700 tabular-nums">
            {totalNetProfit.toLocaleString()} ج.م
          </div>
          <div className="text-[11px] text-emerald-600 mt-1 font-semibold">
            هامش الربح: {totalSalesRevenue > 0 ? Math.round((totalNetProfit / totalSalesRevenue) * 100) : 0}%
          </div>
        </div>
      </div>

      {/* TAB 1: FIFO Valuation Report */}
      {activeReport === 'fifo_valuation' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="p-3.5 border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800">
              تقرير التقييم المالي للمخزون ودفعات التكلفة النشطة (FIFO Valuation):
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                <tr>
                  <th className="py-3 px-4">الصنف والموديل</th>
                  <th className="py-3 px-4">كود SKU</th>
                  <th className="py-3 px-4">الموقع</th>
                  <th className="py-3 px-4 text-center">الرصيد المتاح</th>
                  <th className="py-3 px-4 text-center">عدد دفعات FIFO النشطة</th>
                  <th className="py-3 px-4 text-left">متوسط تكلفة الوحدة</th>
                  <th className="py-3 px-4 text-left font-bold text-slate-900">
                    إجمالي القيمة التقديرية
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {balances.map(b => {
                  const v = variants.find(vr => vr.id === b.variant_id);
                  const prod = v ? getProductById(v.product_id) : undefined;
                  const loc = locations.find(l => l.id === b.location_id);
                  const activeLotsForThis = lots.filter(
                    l => l.variant_id === b.variant_id && l.location_id === b.location_id && l.remaining_qty > 0
                  );
                  const lineValuation = activeLotsForThis.reduce(
                    (s, l) => s + l.remaining_qty * l.unit_cost,
                    0
                  );
                  const avgCost =
                    b.on_hand_qty > 0 ? lineValuation / b.on_hand_qty : 0;

                  return (
                    <tr key={`${b.variant_id}-${b.location_id}`} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{prod?.name}</div>
                        <div className="text-[11px] text-slate-400">
                          {v?.color_name} / {v?.size_name}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-slate-700">{v?.sku}</td>
                      <td className="py-3 px-4 text-slate-700">{loc?.name}</td>
                      <td className="py-3 px-4 text-center font-mono font-bold">
                        <span
                          className={
                            b.on_hand_qty > 0
                              ? 'text-slate-900'
                              : b.on_hand_qty < 0
                              ? 'text-red-600 font-bold'
                              : 'text-slate-400'
                          }
                        >
                          {b.on_hand_qty}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-slate-600">
                        {activeLotsForThis.length} دفعات
                      </td>
                      <td className="py-3 px-4 text-left font-mono tabular-nums text-slate-700">
                        {avgCost > 0 ? `${avgCost.toFixed(2)} ج.م` : '—'}
                      </td>
                      <td className="py-3 px-4 text-left font-mono font-bold text-slate-900 tabular-nums">
                        {lineValuation.toLocaleString()} ج.م
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Negative Stock Exceptions Monitor (Section 4.3) */}
      {activeReport === 'negative_stock' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs space-y-4">
          <div className="p-4 bg-red-50/70 border-b border-red-200 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-red-900">
              <ShieldAlert className="w-5 h-5 text-red-600" />
              <span>
                قائمة متابعة الأرصدة السالبة والاستثناءات الرقابية المعتمدة (البند 4.3):
              </span>
            </div>
            <span className="text-xs font-mono font-bold text-red-800">
              {negativeBalances.length} حالة تحتاج معالجة
            </span>
          </div>

          <div className="p-4 text-xs text-slate-600 leading-relaxed border-b border-slate-100">
            وفق وثيقة المواصفات المعتمدة: الرصيد السالب استثناء رقابي مضبوط لا يلغي الحاجة لتسجيل استلام الشراء
            أو التحويل الفعلي. عند ورود البضاعة، يجب فحص وإعادة تقييم تكلفة البيع المتأثرة.
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                <tr>
                  <th className="py-3 px-4">الصنف / SKU</th>
                  <th className="py-3 px-4">الموقع</th>
                  <th className="py-3 px-4 text-center">الرصيد السالب الحالي</th>
                  <th className="py-3 px-4">المستند المتسبب</th>
                  <th className="py-3 px-4">سبب الاستثناء والمشرف المعتمد</th>
                  <th className="py-3 px-4">تاريخ التحديث</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {negativeBalances.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-emerald-700 font-semibold">
                      ممتاز! لا توجد أي أرصدة سالبة في النظام حالياً (سلامة دقيقة 100%).
                    </td>
                  </tr>
                ) : (
                  negativeBalances.map(b => {
                    const v = variants.find(vr => vr.id === b.variant_id);
                    const prod = v ? getProductById(v.product_id) : undefined;
                    const loc = locations.find(l => l.id === b.location_id);
                    // Find sales with negative exception for this variant
                    const relatedSale = sales.find(
                      s => s.has_negative_stock_exception && s.branch_id === b.location_id
                    );

                    return (
                      <tr key={`${b.variant_id}-${b.location_id}`} className="hover:bg-red-50/30">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{prod?.name}</div>
                          <div className="text-[11px] text-slate-500 font-mono">{v?.sku}</div>
                        </td>
                        <td className="py-3 px-4 text-slate-700">{loc?.name}</td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-red-600 tabular-nums">
                          {b.on_hand_qty} قطعة
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-800">
                          {relatedSale ? relatedSale.invoice_no : 'فاتورة بيع'}
                        </td>
                        <td className="py-3 px-4 text-[11px]">
                          <div className="font-semibold text-red-900">
                            {relatedSale?.negative_stock_approved_by || 'مشرف النظام'}
                          </div>
                          <div className="text-slate-500">
                            {relatedSale?.negative_stock_reason || 'استثناء بيع عاجل'}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                          {new Date(b.last_updated).toLocaleString('ar-EG')}
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

      {/* TAB 3: In-Transit Transfers Monitor */}
      {activeReport === 'transit_transfers' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="p-3.5 border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800">
              تقرير شحنات بضاعة بالطريق المعلقة بين المواقع (In-Transit):
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                <tr>
                  <th className="py-3 px-4">رقم إذن التحويل</th>
                  <th className="py-3 px-4">المصدر</th>
                  <th className="py-3 px-4">الوجهة المستهدفة</th>
                  <th className="py-3 px-4">تاريخ الشحن</th>
                  <th className="py-3 px-4">المشرف على الشحن</th>
                  <th className="py-3 px-4">ملاحظات الشحنة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {inTransitTransfers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      لا توجد شحنات معلقة حالياً بالطريق
                    </td>
                  </tr>
                ) : (
                  inTransitTransfers.map(t => {
                    const src = locations.find(l => l.id === t.source_location_id);
                    const dst = locations.find(l => l.id === t.destination_location_id);

                    return (
                      <tr key={t.id} className="hover:bg-slate-50/70">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">{t.transfer_no}</td>
                        <td className="py-3 px-4 text-slate-800">{src?.name}</td>
                        <td className="py-3 px-4 text-slate-800">{dst?.name}</td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                          {t.dispatched_at ? new Date(t.dispatched_at).toLocaleString('ar-EG') : '—'}
                        </td>
                        <td className="py-3 px-4 text-slate-600">{t.created_by}</td>
                        <td className="py-3 px-4 text-slate-500 text-[11px]">{t.notes || '—'}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: Audit Logs Trail */}
      {activeReport === 'audit_log' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="p-3.5 border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800">
              سجل التدقيق الرقابي للعمليات والتسويات والإلغاءات (Audit Logs):
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                <tr>
                  <th className="py-3 px-4">التوقيت</th>
                  <th className="py-3 px-4">المستخدم</th>
                  <th className="py-3 px-4">نوع الإجراء</th>
                  <th className="py-3 px-4">الكيان / المستند</th>
                  <th className="py-3 px-4">تفاصيل العملية</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      لا توجد سجلات تدقيق حتى الآن
                    </td>
                  </tr>
                ) : (
                  auditLogs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString('ar-EG')}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">{log.user_name}</td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-[11px] bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">{log.entity_id}</td>
                      <td className="py-3 px-4 text-slate-700">{log.details}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: Backup & Database Integrity (AT-14, AT-16) */}
      {activeReport === 'backup_integrity' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Backup & Restore Card */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                النسخ الاحتياطي والاستعادة (معيار AT-14)
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                تصدير نسخة كاملة من قاعدة البيانات المحلية بصيغة JSON قابلة للاستعادة على أي جهاز بديل.
              </p>
            </div>

            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={handleExportBackup}
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>تحميل نسخة احتياطية (JSON)</span>
              </button>

              <button
                type="button"
                onClick={resetToInitialData}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>إعادة تعيين البيانات للوضع الافتراضي</span>
              </button>
            </div>

            <div className="pt-4 border-t border-slate-200 space-y-3">
              <label className="block text-xs font-semibold text-slate-700">
                استعادة نسخة احتياطية سابقة (الصق محتوى ملف JSON هنا):
              </label>
              <textarea
                rows={5}
                value={restoreJson}
                onChange={e => setRestoreJson(e.target.value)}
                placeholder='{"system": "Clothing Inventory & POS Management", "data": ...}'
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono focus:outline-none"
                dir="ltr"
              />

              {restoreFeedback && (
                <div
                  className={`p-3 rounded-lg text-xs flex items-center gap-2 border ${
                    restoreFeedback.success
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-red-50 text-red-800 border-red-200'
                  }`}
                >
                  {restoreFeedback.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                  )}
                  <span>{restoreFeedback.message}</span>
                </div>
              )}

              <button
                type="button"
                onClick={handleRestoreSubmit}
                disabled={!restoreJson.trim()}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-700 text-white rounded-lg text-xs font-bold hover:bg-emerald-800 disabled:opacity-40 transition-colors cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>استرجاع النسخة الاحتياطية ومطابقة القيود</span>
              </button>
            </div>
          </div>

          {/* Ledger Integrity Verification Card (AT-16) */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                فحص سلامة قاعدة البيانات وإعادة بناء الأرصدة (AT-16)
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                التحقق البرمجي التلقائي من أن جميع الأرصدة الحالية تطابق 100% مجموع قيود الحركات في السجل المالي،
                وكشف أي تباين دفتري.
              </p>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1.5 text-slate-600">
              <div>إجمالي قيود حركات المخزون المسجلة: <span className="font-bold font-mono text-slate-900">{movements.length}</span></div>
              <div>إجمالي سجلات الأرصدة بالمواقع: <span className="font-bold font-mono text-slate-900">{balances.length}</span></div>
              <div>إجمالي دفعات FIFO النشطة: <span className="font-bold font-mono text-slate-900">{lots.length}</span></div>
            </div>

            <button
              type="button"
              onClick={runDatabaseIntegrityCheck}
              className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold transition-colors shadow-xs cursor-pointer"
            >
              <Activity className="w-4 h-4" />
              <span>تشغيل فحص سلامة القيود والمطابقة الآن</span>
            </button>

            {integrityStatus && (
              <div
                className={`p-4 rounded-xl border text-xs space-y-2 ${
                  integrityStatus.mismatchCount === 0
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-red-50 border-red-200 text-red-900'
                }`}
              >
                <div className="flex items-center gap-2 font-bold">
                  {integrityStatus.mismatchCount === 0 ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>نتيجة الفحص: مطابقة تامة 100%! لا توجد أي فروق بين الأرصدة وسجل القيود.</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                      <span>تم اكتشاف {integrityStatus.mismatchCount} اختلاف في الأرصدة:</span>
                    </>
                  )}
                </div>

                {integrityStatus.details.length > 0 && (
                  <ul className="list-disc list-inside space-y-1 text-[11px] pr-2">
                    {integrityStatus.details.map((d, i) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
