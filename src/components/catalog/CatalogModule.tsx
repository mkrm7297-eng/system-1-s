import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { Product, ProductVariant } from '../../types';
import { Code128Barcode } from '../common/Code128Barcode';
import {
  Plus,
  Printer,
  Upload,
  Search,
  AlertCircle,
  CheckCircle2,
  Sliders,
  FileSpreadsheet,
  Layers,
  Sparkles,
  X
} from 'lucide-react';

export const CatalogModule: React.FC = () => {
  const {
    products,
    variants,
    categories,
    addProduct,
    importVariantsFromExcel,
    getVariantBalance,
    selectedBranchId
  } = useStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);

  // Sticker Print Config
  const [selectedVariantForPrint, setSelectedVariantForPrint] = useState<ProductVariant | null>(variants[0] || null);
  const [printCopies, setPrintCopies] = useState<number>(3);
  const [stickerWidthMm, setStickerWidthMm] = useState<number>(50);
  const [stickerHeightMm, setStickerHeightMm] = useState<number>(30);
  const [showPriceOnSticker, setShowPriceOnSticker] = useState<boolean>(true);

  // New Product Form State
  const [modelCode, setModelCode] = useState('');
  const [modelName, setModelName] = useState('');
  const [categoryId, setCategoryId] = useState(categories[0]?.id || 'cat-suits');
  const [description, setDescription] = useState('');
  const [colorsInput, setColorsInput] = useState('كحلي, أسود');
  const [sizesInput, setSizesInput] = useState('42, 44, 46');
  const [defaultPrice, setDefaultPrice] = useState('450');
  const [formError, setFormError] = useState<string | null>(null);

  // Excel Import state
  const [excelText, setExcelText] = useState(
    `MOD-COAT-500,بالطو جوخ شتوي,بدل ورسميات,رمادي,48,COAT-GRY-48,622500500480,850,10\nMOD-COAT-500,بالطو جوخ شتوي,بدل ورسميات,كحلي,48,COAT-NVY-48,622500500481,850,10`
  );
  const [importResult, setImportResult] = useState<{
    success: boolean;
    inserted: number;
    errors: string[];
  } | null>(null);

  // Filtered variants
  const filteredVariants = variants.filter(v => {
    const prod = products.find(p => p.id === v.product_id);
    const matchesSearch =
      v.barcode.includes(searchTerm) ||
      v.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.color_name.includes(searchTerm) ||
      prod?.name.includes(searchTerm) ||
      prod?.model_code.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory =
      selectedCategory === 'all' || prod?.category_id === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const handleCreateProductWithMatrix = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!modelCode.trim() || !modelName.trim()) {
      setFormError('يرجى ملء كود الموديل واسم الموديل');
      return;
    }

    const colors = colorsInput
      .split(',')
      .map(c => c.trim())
      .filter(Boolean);
    const sizes = sizesInput
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    if (colors.length === 0 || sizes.length === 0) {
      setFormError('يرجى إدخال لون ومقاس واحد على الأقل');
      return;
    }

    const price = parseFloat(defaultPrice) || 100;
    const cleanModel = modelCode.trim().toUpperCase();

    // Generate matrix of variants
    const generatedVariants: Omit<ProductVariant, 'id' | 'product_id'>[] = [];
    let counter = 1;

    for (const color of colors) {
      for (const size of sizes) {
        const sku = `${cleanModel}-${color.slice(0, 3).toUpperCase()}-${size}`;
        // Unique Code 128 barcode formula
        const barcodeNum = `622${Date.now().toString().slice(-6)}${counter.toString().padStart(3, '0')}`;
        counter++;

        generatedVariants.push({
          color_id: `clr-${color}`,
          color_name: color,
          size_id: `sz-${size}`,
          size_name: size,
          sku,
          barcode: barcodeNum,
          selling_price: price,
          min_reorder_level: 15,
          status: 'active'
        });
      }
    }

    const res = addProduct(
      {
        model_code: cleanModel,
        name: modelName.trim(),
        category_id: categoryId,
        description: description.trim(),
        status: 'active'
      },
      generatedVariants
    );

    if (res.success) {
      setIsAddModalOpen(false);
      setModelCode('');
      setModelName('');
      setDescription('');
    } else {
      setFormError(res.error || 'فشل إضافة الموديل');
    }
  };

  const handleImportExcelData = () => {
    setImportResult(null);
    const lines = excelText
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean);
    const rows = lines.map(line => {
      const parts = line.split(',').map(p => p.trim());
      return {
        model_code: parts[0] || '',
        name: parts[1] || '',
        category: parts[2] || '',
        color: parts[3] || '',
        size: parts[4] || '',
        sku: parts[5] || '',
        barcode: parts[6] || '',
        price: parseFloat(parts[7]) || 100,
        min_reorder: parseInt(parts[8], 10) || 10
      };
    });

    const result = importVariantsFromExcel(rows);
    setImportResult(result);
  };

  const openPrintStudio = (variant: ProductVariant) => {
    setSelectedVariantForPrint(variant);
    setIsPrintModalOpen(true);
  };

  const executePrint = () => {
    window.print();
  };

  return (
    <div className="p-6 space-y-6">
      {/* Top Banner and Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            الوحدة A — دليل الأصناف والباركود (Code 128)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            تعريف الموديلات والمتغيرات بالألوان والمقاسات، طباعة ملصقات الباركود، والتحقق الصارم من تفرد الأكواد.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsExcelModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>استيراد Excel مع فحص الأخطاء</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة موديل ومتغيرات جديدة</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-3.5 rounded-xl border border-slate-200">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="بحث بالباركود أو SKU أو الاسم أو الموديل..."
            className="w-full pr-9 pl-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-slate-500 whitespace-nowrap">التصنيف:</span>
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none cursor-pointer"
          >
            <option value="all">جميع التصنيفات ({variants.length})</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
              <tr>
                <th className="py-3 px-4">كود الباركود (Code 128)</th>
                <th className="py-3 px-4">الموديل والصنف</th>
                <th className="py-3 px-4">كود SKU</th>
                <th className="py-3 px-4">اللون</th>
                <th className="py-3 px-4">المقاس</th>
                <th className="py-3 px-4 text-left">سعر البيع</th>
                <th className="py-3 px-4 text-left">الرصيد الحالي</th>
                <th className="py-3 px-4 text-center">طباعة الملصق</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredVariants.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    لا توجد أصناف مطابقة للبحث
                  </td>
                </tr>
              ) : (
                filteredVariants.map(v => {
                  const prod = products.find(p => p.id === v.product_id);
                  const onHand = getVariantBalance(v.id, selectedBranchId);

                  return (
                    <tr key={v.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Code128Barcode
                            value={v.barcode}
                            options={{ height: 26, width: 1.1, fontSize: 9 }}
                            className="p-1 border border-slate-100 rounded"
                          />
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{prod?.name || 'موديل'}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{prod?.model_code}</div>
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-slate-700">{v.sku}</td>
                      <td className="py-3 px-4">{v.color_name}</td>
                      <td className="py-3 px-4 font-semibold">{v.size_name}</td>
                      <td className="py-3 px-4 text-left font-mono font-bold text-slate-900 tabular-nums">
                        {v.selling_price.toLocaleString()} ج.م
                      </td>
                      <td className="py-3 px-4 text-left">
                        <span
                          className={`font-mono font-bold tabular-nums ${
                            onHand > 0 ? 'text-emerald-700' : onHand < 0 ? 'text-red-600' : 'text-slate-400'
                          }`}
                        >
                          {onHand} قطعة
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => openPrintStudio(v)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-slate-700 bg-slate-100 hover:bg-amber-100 hover:text-amber-900 rounded-md transition-colors font-medium text-[11px] cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>استيكر</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal 1: Create Product with Variant Matrix */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl border border-slate-200 overflow-hidden text-right">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
              <h3 className="font-bold text-slate-900 text-sm">
                إنشاء موديل ملابس جديد ومصفوفة الألوان والمقاسات (AT-01)
              </h3>
            </div>

            <form onSubmit={handleCreateProductWithMatrix} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    كود الموديل الفريد (مثال: MOD-SUIT-105):
                  </label>
                  <input
                    type="text"
                    value={modelCode}
                    onChange={e => setModelCode(e.target.value)}
                    placeholder="MOD-..."
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono uppercase focus:outline-none focus:border-amber-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    اسم الموديل التجاري:
                  </label>
                  <input
                    type="text"
                    value={modelName}
                    onChange={e => setModelName(e.target.value)}
                    placeholder="بدلة رجالي صوف إيطالي..."
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-amber-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">التصنيف:</label>
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

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    سعر البيع الافتراضي (ج.م):
                  </label>
                  <input
                    type="number"
                    value={defaultPrice}
                    onChange={e => setDefaultPrice(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono tabular-nums focus:outline-none focus:border-amber-600"
                  />
                </div>
              </div>

              <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                  <Layers className="w-4 h-4 text-amber-700" />
                  <span>توليد متغيرات الألوان والمقاسات آلياً مع باركود مستقل:</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      الألوان (مفصولة بفاصلة):
                    </label>
                    <input
                      type="text"
                      value={colorsInput}
                      onChange={e => setColorsInput(e.target.value)}
                      placeholder="كحلي, أسود, رمادي"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      المقاسات (مفصولة بفاصلة):
                    </label>
                    <input
                      type="text"
                      value={sizesInput}
                      onChange={e => setSizesInput(e.target.value)}
                      placeholder="40, 42, 44, 46"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none"
                    />
                  </div>
                </div>

                <p className="text-[11px] text-amber-800">
                  سيقوم النظام آلياً بإنشاء سجل SKU فريد ورمز باركود Code 128 مستقل لكل تركيبة لون ومقاس ومنع أي تكرار.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-600 hover:text-slate-900"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  حفظ واعتماد الموديل
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Sticker Print Studio */}
      {isPrintModalOpen && selectedVariantForPrint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl border border-slate-200 overflow-hidden text-right">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <button
                onClick={() => setIsPrintModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
              <h3 className="font-bold text-slate-900 text-sm">
                استوديو طباعة استيكر الباركود (Code 128) ومعايرة الملصق
              </h3>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Controls */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    عدد الملصقات المطلوب طباعتها:
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={printCopies}
                    onChange={e => setPrintCopies(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono tabular-nums focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      عرض الملصق (مم):
                    </label>
                    <input
                      type="number"
                      value={stickerWidthMm}
                      onChange={e => setStickerWidthMm(parseInt(e.target.value, 10) || 50)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      ارتفاع الملصق (مم):
                    </label>
                    <input
                      type="number"
                      value={stickerHeightMm}
                      onChange={e => setStickerHeightMm(parseInt(e.target.value, 10) || 30)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="showPrice"
                    checked={showPriceOnSticker}
                    onChange={e => setShowPriceOnSticker(e.target.checked)}
                    className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                  />
                  <label htmlFor="showPrice" className="text-xs text-slate-700 font-medium">
                    إظهار سعر البيع على الملصق
                  </label>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-500 space-y-1">
                  <div>دقة الطباعة المدعومة: 203 DPI / 300 DPI</div>
                  <div>توافق الطابعات: Xprinter, Zebra, Bixolon, Honeywell</div>
                </div>
              </div>

              {/* Live Sticker Preview */}
              <div className="flex flex-col items-center justify-center bg-slate-100 p-6 rounded-xl border border-slate-200">
                <span className="text-xs text-slate-500 mb-3 font-semibold">معاينة الاستيكر الفعلي:</span>

                <div
                  id="sticker-print-area"
                  className="bg-white p-3 rounded shadow-xs border border-slate-300 flex flex-col items-center justify-between text-center"
                  style={{
                    width: `${stickerWidthMm * 3.77}px`,
                    minHeight: `${stickerHeightMm * 3.77}px`
                  }}
                >
                  <div className="text-[11px] font-bold text-slate-900 tracking-tight">
                    {products.find(p => p.id === selectedVariantForPrint.product_id)?.name}
                  </div>
                  <div className="text-[9px] text-slate-600 mt-0.5">
                    {selectedVariantForPrint.color_name} · مقاس {selectedVariantForPrint.size_name}
                  </div>

                  <div className="my-1.5 flex justify-center">
                    <Code128Barcode
                      value={selectedVariantForPrint.barcode}
                      options={{ height: 38, width: 1.2, fontSize: 9 }}
                      showText={true}
                    />
                  </div>

                  {showPriceOnSticker && (
                    <div className="text-[11px] font-bold text-slate-900 font-mono">
                      السعر: {selectedVariantForPrint.selling_price} ج.م
                    </div>
                  )}
                  <div className="text-[8px] text-slate-400 font-mono mt-0.5">
                    {selectedVariantForPrint.sku}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between px-6 py-3 border-t border-slate-200 bg-slate-50">
              <span className="text-xs text-slate-500 font-mono">
                كود المسح: {selectedVariantForPrint.barcode}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsPrintModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-600 hover:text-slate-900"
                >
                  إغلاق
                </button>
                <button
                  type="button"
                  onClick={executePrint}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة {printCopies} ملصق</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Excel Import & Pre-commit Error Diagnosis (AT-15) */}
      {isExcelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl border border-slate-200 overflow-hidden text-right">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <button
                onClick={() => setIsExcelModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
              <h3 className="font-bold text-slate-900 text-sm">
                استيراد الأصناف من ملف Excel / CSV مع كشف الأخطاء قبل الاعتماد (AT-15)
              </h3>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-500">
                الصيغة المطلوبة للأعمدة: كود الموديل, اسم الموديل, التصنيف, اللون, المقاس, SKU, الباركود, السعر, حد الطلب.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  بيانات CSV للتجربة أو اللصق:
                </label>
                <textarea
                  rows={6}
                  value={excelText}
                  onChange={e => setExcelText(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono focus:outline-none focus:border-amber-600"
                  dir="ltr"
                />
              </div>

              {importResult && (
                <div>
                  {importResult.success ? (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>
                        تم فحص البيانات واعتماد استيراد {importResult.inserted} متغير بنجاح دون أي تكرارات أو أخطاء.
                      </span>
                    </div>
                  ) : (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 space-y-1">
                      <div className="font-bold flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                        <span>تم رفض الاستيراد لوجود أخطاء يجب تصحيحها أولاً:</span>
                      </div>
                      <ul className="list-disc list-inside space-y-0.5 text-[11px] pr-2">
                        {importResult.errors.map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-3 border-t border-slate-200 bg-slate-50">
              <button
                type="button"
                onClick={() => setIsExcelModalOpen(false)}
                className="px-4 py-2 text-xs text-slate-600 hover:text-slate-900"
              >
                إغلاق
              </button>
              <button
                type="button"
                onClick={handleImportExcelData}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 transition-colors cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>فحص واعتماد الاستيراد</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
