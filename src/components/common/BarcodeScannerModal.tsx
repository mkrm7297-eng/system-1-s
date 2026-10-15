import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../../context/StoreContext';
import { Barcode, Search, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { Code128Barcode } from './Code128Barcode';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
  title?: string;
  description?: string;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScan,
  title = 'محاكي قارئ الباركود الليزري (Code 128)',
  description = 'يعمل القارئ كمدخل قياسي عند المسح المباشر، أو يمكنك اختيار صنف سريع للتجربة'
}) => {
  const { variants, getProductById } = useStore();
  const [inputBarcode, setInputBarcode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setInputBarcode('');
      setError(null);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleManualSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = inputBarcode.trim();
    if (!clean) return;

    const matched = variants.find(v => v.barcode === clean || v.sku.toLowerCase() === clean.toLowerCase());
    if (matched) {
      onScan(matched.barcode);
      onClose();
    } else {
      setError(`الباركود أو الكود [${clean}] غير مسجل بالنظام`);
    }
  };

  const handleQuickPick = (barcode: string) => {
    onScan(barcode);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg border border-slate-200 overflow-hidden text-right">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50">
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900 text-sm">{title}</span>
            <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
              <Barcode className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <p className="text-xs text-slate-500 leading-relaxed">{description}</p>

          <form onSubmit={handleManualSubmit} className="space-y-2">
            <label className="block text-xs font-semibold text-slate-700">
              مسح الباركود (جاهز لاستقبال إشارة الماسح الضوئي أو الإدخال اليدوي):
            </label>
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={inputBarcode}
                onChange={e => {
                  setInputBarcode(e.target.value);
                  setError(null);
                }}
                placeholder="مرر قارئ الباركود أو اكتب الكود واضغط Enter..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 font-mono"
                autoFocus
              />
              <button
                type="submit"
                className="absolute left-2 top-2 p-1 text-slate-400 hover:text-slate-700 rounded-md"
              >
                <Search className="w-4 h-4" />
              </button>
            </div>
          </form>

          {error && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-50 text-red-700 text-xs border border-red-200">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Quick Clickable Barcode Matrix for rapid testing */}
          <div>
            <div className="text-xs font-semibold text-slate-700 mb-2">أصناف سريعة للاختبار المباشر:</div>
            <div className="grid grid-cols-1 gap-2 max-h-56 overflow-y-auto pr-1">
              {variants.slice(0, 6).map(v => {
                const prod = getProductById(v.product_id);
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => handleQuickPick(v.barcode)}
                    className="flex items-center justify-between p-2.5 text-right bg-slate-50 hover:bg-amber-50 hover:border-amber-300 border border-slate-200 rounded-lg transition-colors group cursor-pointer"
                  >
                    <div className="text-left font-mono text-xs font-semibold text-slate-700">
                      <span className="text-slate-400 text-[10px] block font-sans">كود باركود</span>
                      {v.barcode}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 group-hover:text-amber-900">
                        {prod?.name || 'صنف'}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {v.color_name} · مقاس {v.size_name} · {v.sku}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200 bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            إغلاق
          </button>
          <button
            type="button"
            onClick={() => handleManualSubmit()}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
          >
            تأكيد المسح
          </button>
        </div>
      </div>
    </div>
  );
};
