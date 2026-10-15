import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  ProductCategory,
  Product,
  ProductVariant,
  Location,
  Supplier,
  InventoryLot,
  StockBalance,
  StockDocument,
  StockMovement,
  PurchaseDocument,
  PurchaseLine,
  TransferDocument,
  TransferLine,
  SalesDocument,
  SalesLine,
  SaleLotAllocation,
  SalesReturnDocument,
  SalesReturnLine,
  StocktakeSession,
  StocktakeLine,
  AuditLog,
  SystemUser
} from '../types';
import {
  INITIAL_USERS,
  INITIAL_CATEGORIES,
  INITIAL_LOCATIONS,
  INITIAL_SUPPLIERS,
  INITIAL_PRODUCTS,
  INITIAL_VARIANTS,
  INITIAL_LOTS,
  INITIAL_BALANCES,
  INITIAL_DOCUMENTS,
  INITIAL_MOVEMENTS,
  INITIAL_PURCHASES,
  INITIAL_PURCHASE_LINES,
  INITIAL_TRANSFERS,
  INITIAL_TRANSFER_LINES,
  INITIAL_SALES,
  INITIAL_SALES_LINES,
  INITIAL_SALE_ALLOCATIONS,
  INITIAL_STOCKTAKES,
  INITIAL_STOCKTAKE_LINES,
  INITIAL_AUDIT_LOGS
} from '../data/initialData';
import { allocateFifoLots, transferFifoLots, reconstructBalancesFromLedger } from '../utils/fifo';

interface StoreContextType {
  // State
  currentUser: SystemUser;
  setCurrentUser: (user: SystemUser) => void;
  users: SystemUser[];
  selectedBranchId: string;
  setSelectedBranchId: (id: string) => void;
  categories: ProductCategory[];
  products: Product[];
  variants: ProductVariant[];
  locations: Location[];
  suppliers: Supplier[];
  lots: InventoryLot[];
  balances: StockBalance[];
  documents: StockDocument[];
  movements: StockMovement[];
  purchases: PurchaseDocument[];
  purchaseLines: PurchaseLine[];
  transfers: TransferDocument[];
  transferLines: TransferLine[];
  sales: SalesDocument[];
  salesLines: SalesLine[];
  saleAllocations: SaleLotAllocation[];
  salesReturns: SalesReturnDocument[];
  salesReturnLines: SalesReturnLine[];
  stocktakes: StocktakeSession[];
  stocktakeLines: StocktakeLine[];
  auditLogs: AuditLog[];

  // Helper getters
  getVariantById: (id: string) => ProductVariant | undefined;
  getVariantByBarcode: (barcode: string) => ProductVariant | undefined;
  getProductById: (id: string) => Product | undefined;
  getLocationById: (id: string) => Location | undefined;
  getVariantBalance: (variantId: string, locationId: string) => number;
  getAllBalancesForVariant: (variantId: string) => { location: Location; onHand: number; reserved: number }[];
  getLotsForVariant: (variantId: string, locationId: string) => InventoryLot[];

  // Transactions
  addProduct: (product: Omit<Product, 'id' | 'created_at'>, variantsList: Omit<ProductVariant, 'id' | 'product_id'>[]) => { success: boolean; error?: string; product?: Product };
  receivePurchase: (
    data: {
      supplier_id: string;
      invoice_no: string;
      destination_location_id: string;
      lines: { variant_id: string; ordered_qty: number; received_qty: number; unit_cost: number }[];
      notes?: string;
    }
  ) => { success: boolean; error?: string; docId?: string };
  createTransfer: (
    sourceLocationId: string,
    destLocationId: string,
    lines: { variant_id: string; qty: number }[],
    notes?: string
  ) => { success: boolean; error?: string; transferId?: string };
  confirmTransferReceipt: (
    transferId: string,
    receivedLines: { lineId: string; received_qty: number; notes?: string }[]
  ) => { success: boolean; error?: string };
  processSale: (
    branchId: string,
    items: { variant_id: string; qty: number; selling_price: number }[],
    customerName?: string,
    supervisorOverride?: { override: boolean; reason: string; supervisorName: string }
  ) => { success: boolean; error?: string; saleDoc?: SalesDocument };
  processSaleReturn: (
    salesDocId: string,
    returnItems: { salesLineId: string; variant_id: string; qty: number; condition: 'good' | 'damaged' | 'quarantine'; notes?: string }[]
  ) => { success: boolean; error?: string; returnDoc?: SalesReturnDocument };
  cancelSale: (salesDocId: string, reason: string) => { success: boolean; error?: string };
  startStocktake: (locationId: string, scope: 'full' | 'category' | 'selective', blindCount: boolean, categoryId?: string) => { success: boolean; error?: string; session?: StocktakeSession };
  updateStocktakeCount: (sessionId: string, variantId: string, countedQty: number, isRecount?: boolean) => void;
  reconcileStocktake: (sessionId: string, notes?: string) => { success: boolean; error?: string };
  importLegacyInvoice: (
    invoice: { external_id: string; branch_id: string; date: string; lines: { barcode: string; qty: number; price: number }[] }
  ) => { success: boolean; error?: string };
  importVariantsFromExcel: (
    rows: { model_code: string; name: string; category: string; color: string; size: string; sku: string; barcode: string; price: number; min_reorder: number }[]
  ) => { success: boolean; inserted: number; errors: string[] };
  processVendorReturn: (
    purchaseDocId: string,
    returns: { variant_id: string; qty: number; unit_cost: number; reason: string }[]
  ) => { success: boolean; error?: string; returnDocId?: string };
  quickReconcileNegativeStock: (
    variantId: string,
    locationId: string,
    replenishQty: number,
    unitCost: number,
    notes?: string
  ) => { success: boolean; error?: string };
  scannedBarcodeBus: string | null;
  triggerBarcodeScan: (barcode: string) => void;
  clearBarcodeScan: () => void;
  exportDatabaseBackup: () => string;
  restoreDatabaseBackup: (jsonContent: string) => { success: boolean; message: string; balanceMismatches?: number };
  resetToInitialData: () => void;
  addAuditLog: (action: string, entity_type: string, entity_id: string, details: string) => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'clothing_pos_system_data_v1';

export const StoreProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<SystemUser>(INITIAL_USERS[0]);
  const [users] = useState<SystemUser[]>(INITIAL_USERS);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('loc-maadi');
  const [scannedBarcodeBus, setScannedBarcodeBus] = useState<string | null>(null);

  const triggerBarcodeScan = (barcode: string) => {
    setScannedBarcodeBus(barcode);
  };

  const clearBarcodeScan = () => {
    setScannedBarcodeBus(null);
  };

  const [categories, setCategories] = useState<ProductCategory[]>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_categories`);
    return saved ? JSON.parse(saved) : INITIAL_CATEGORIES;
  });

  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_products`);
    return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
  });

  const [variants, setVariants] = useState<ProductVariant[]>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_variants`);
    return saved ? JSON.parse(saved) : INITIAL_VARIANTS;
  });

  const [locations, setLocations] = useState<Location[]>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_locations`);
    return saved ? JSON.parse(saved) : INITIAL_LOCATIONS;
  });

  const [suppliers, setSuppliers] = useState<Supplier[]>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_suppliers`);
    return saved ? JSON.parse(saved) : INITIAL_SUPPLIERS;
  });

  const [lots, setLots] = useState<InventoryLot[]>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_lots`);
    return saved ? JSON.parse(saved) : INITIAL_LOTS;
  });

  const [balances, setBalances] = useState<StockBalance[]>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_balances`);
    return saved ? JSON.parse(saved) : INITIAL_BALANCES;
  });

  const [documents, setDocuments] = useState<StockDocument[]>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_documents`);
    return saved ? JSON.parse(saved) : INITIAL_DOCUMENTS;
  });

  const [movements, setMovements] = useState<StockMovement[]>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_movements`);
    return saved ? JSON.parse(saved) : INITIAL_MOVEMENTS;
  });

  const [purchases, setPurchases] = useState<PurchaseDocument[]>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_purchases`);
    return saved ? JSON.parse(saved) : INITIAL_PURCHASES;
  });

  const [purchaseLines, setPurchaseLines] = useState<PurchaseLine[]>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_purchaseLines`);
    return saved ? JSON.parse(saved) : INITIAL_PURCHASE_LINES;
  });

  const [transfers, setTransfers] = useState<TransferDocument[]>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_transfers`);
    return saved ? JSON.parse(saved) : INITIAL_TRANSFERS;
  });

  const [transferLines, setTransferLines] = useState<TransferLine[]>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_transferLines`);
    return saved ? JSON.parse(saved) : INITIAL_TRANSFER_LINES;
  });

  const [sales, setSales] = useState<SalesDocument[]>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_sales`);
    return saved ? JSON.parse(saved) : INITIAL_SALES;
  });

  const [salesLines, setSalesLines] = useState<SalesLine[]>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_salesLines`);
    return saved ? JSON.parse(saved) : INITIAL_SALES_LINES;
  });

  const [saleAllocations, setSaleAllocations] = useState<SaleLotAllocation[]>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_saleAllocations`);
    return saved ? JSON.parse(saved) : INITIAL_SALE_ALLOCATIONS;
  });

  const [salesReturns, setSalesReturns] = useState<SalesReturnDocument[]>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_salesReturns`);
    return saved ? JSON.parse(saved) : [];
  });

  const [salesReturnLines, setSalesReturnLines] = useState<SalesReturnLine[]>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_salesReturnLines`);
    return saved ? JSON.parse(saved) : [];
  });

  const [stocktakes, setStocktakes] = useState<StocktakeSession[]>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_stocktakes`);
    return saved ? JSON.parse(saved) : INITIAL_STOCKTAKES;
  });

  const [stocktakeLines, setStocktakeLines] = useState<StocktakeLine[]>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_stocktakeLines`);
    return saved ? JSON.parse(saved) : INITIAL_STOCKTAKE_LINES;
  });

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_auditLogs`);
    return saved ? JSON.parse(saved) : INITIAL_AUDIT_LOGS;
  });

  // LocalStorage sync
  useEffect(() => {
    try {
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_categories`, JSON.stringify(categories));
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_products`, JSON.stringify(products));
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_variants`, JSON.stringify(variants));
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_locations`, JSON.stringify(locations));
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_suppliers`, JSON.stringify(suppliers));
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_lots`, JSON.stringify(lots));
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_balances`, JSON.stringify(balances));
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_documents`, JSON.stringify(documents));
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_movements`, JSON.stringify(movements));
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_purchases`, JSON.stringify(purchases));
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_purchaseLines`, JSON.stringify(purchaseLines));
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_transfers`, JSON.stringify(transfers));
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_transferLines`, JSON.stringify(transferLines));
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_sales`, JSON.stringify(sales));
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_salesLines`, JSON.stringify(salesLines));
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_saleAllocations`, JSON.stringify(saleAllocations));
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_salesReturns`, JSON.stringify(salesReturns));
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_salesReturnLines`, JSON.stringify(salesReturnLines));
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_stocktakes`, JSON.stringify(stocktakes));
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_stocktakeLines`, JSON.stringify(stocktakeLines));
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_auditLogs`, JSON.stringify(auditLogs));
    } catch {
      // storage quota or private mode fallback
    }
  }, [
    categories, products, variants, locations, suppliers, lots, balances,
    documents, movements, purchases, purchaseLines, transfers, transferLines,
    sales, salesLines, saleAllocations, salesReturns, salesReturnLines,
    stocktakes, stocktakeLines, auditLogs
  ]);

  const addAuditLog = (action: string, entity_type: string, entity_id: string, details: string) => {
    const newLog: AuditLog = {
      id: `LOG-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      user_id: currentUser.id,
      user_name: currentUser.name,
      action,
      entity_type,
      entity_id,
      details,
      timestamp: new Date().toISOString()
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  // Helper Getters
  const getVariantById = (id: string) => variants.find(v => v.id === id);
  const getVariantByBarcode = (barcode: string) => {
    const clean = barcode.trim();
    return variants.find(v => v.barcode === clean || v.sku.toLowerCase() === clean.toLowerCase());
  };
  const getProductById = (id: string) => products.find(p => p.id === id);
  const getLocationById = (id: string) => locations.find(l => l.id === id);

  const getVariantBalance = (variantId: string, locationId: string): number => {
    const bal = balances.find(b => b.variant_id === variantId && b.location_id === locationId);
    return bal ? bal.on_hand_qty : 0;
  };

  const getAllBalancesForVariant = (variantId: string) => {
    return locations.map(loc => {
      const bal = balances.find(b => b.variant_id === variantId && b.location_id === loc.id);
      return {
        location: loc,
        onHand: bal ? bal.on_hand_qty : 0,
        reserved: bal ? bal.reserved_qty : 0
      };
    });
  };

  const getLotsForVariant = (variantId: string, locationId: string) => {
    return lots.filter(l => l.variant_id === variantId && l.location_id === locationId && l.remaining_qty > 0);
  };

  // Mutator helper for updating balance safely
  const updateBalanceState = (
    currentBalances: StockBalance[],
    variantId: string,
    locationId: string,
    qtyDelta: number
  ): { updatedBalances: StockBalance[]; newOnHand: number } => {
    const list = [...currentBalances];
    const index = list.findIndex(b => b.variant_id === variantId && b.location_id === locationId);
    let newOnHand = 0;

    if (index >= 0) {
      newOnHand = list[index].on_hand_qty + qtyDelta;
      list[index] = {
        ...list[index],
        on_hand_qty: newOnHand,
        last_updated: new Date().toISOString()
      };
    } else {
      newOnHand = qtyDelta;
      list.push({
        variant_id: variantId,
        location_id: locationId,
        on_hand_qty: newOnHand,
        reserved_qty: 0,
        last_updated: new Date().toISOString()
      });
    }

    return { updatedBalances: list, newOnHand };
  };

  // Unit A: Add Product & Variants with strict uniqueness checks (AT-01, AT-02)
  const addProduct = (
    productData: Omit<Product, 'id' | 'created_at'>,
    variantsList: Omit<ProductVariant, 'id' | 'product_id'>[]
  ) => {
    // 1. Check duplicate model code
    if (products.some(p => p.model_code.toLowerCase() === productData.model_code.toLowerCase())) {
      return { success: false, error: `كود الموديل ${productData.model_code} مسجل بالفعل مسبقًا` };
    }

    // 2. Check duplicate barcodes and SKUs across entire system
    const existingBarcodes = new Set(variants.map(v => v.barcode));
    const existingSkus = new Set(variants.map(v => v.sku.toLowerCase()));

    const newBarcodes = new Set<string>();
    const newSkus = new Set<string>();

    for (const v of variantsList) {
      const cleanBarcode = v.barcode.trim();
      const cleanSku = v.sku.trim().toLowerCase();

      if (existingBarcodes.has(cleanBarcode) || newBarcodes.has(cleanBarcode)) {
        return { success: false, error: `الباركود ${cleanBarcode} مكرر! يمنع تكرار الباركود وفق معيار AT-02` };
      }
      if (existingSkus.has(cleanSku) || newSkus.has(cleanSku)) {
        return { success: false, error: `كود SKU ${v.sku} مكرر! يمنع تكرار الأكواد الداخلية` };
      }

      newBarcodes.add(cleanBarcode);
      newSkus.add(cleanSku);
    }

    const newProductId = `prod-${Date.now()}`;
    const newProduct: Product = {
      ...productData,
      id: newProductId,
      created_at: new Date().toISOString()
    };

    const newCreatedVariants: ProductVariant[] = variantsList.map((v, index) => ({
      ...v,
      id: `var-${Date.now()}-${index}`,
      product_id: newProductId
    }));

    setProducts(prev => [newProduct, ...prev]);
    setVariants(prev => [...prev, ...newCreatedVariants]);

    addAuditLog(
      'CREATE_PRODUCT',
      'product',
      newProductId,
      `تم إنشاء موديل: ${newProduct.name} (${newProduct.model_code}) مع ${newCreatedVariants.length} متغيرات ألوان ومقاسات`
    );

    return { success: true, product: newProduct };
  };

  // Unit C: Purchases & Receiving with Lot generation (AT-04)
  const receivePurchase = (data: {
    supplier_id: string;
    invoice_no: string;
    destination_location_id: string;
    lines: { variant_id: string; ordered_qty: number; received_qty: number; unit_cost: number }[];
    notes?: string;
  }) => {
    const docNo = `PO-${Date.now().toString().slice(-6)}`;
    const docId = `pdoc-${Date.now()}`;
    const now = new Date().toISOString();

    const isPartial = data.lines.some(l => l.received_qty < l.ordered_qty);
    const status = isPartial ? 'received_partial' : 'received_full';

    let totalAmount = 0;
    const newLots: InventoryLot[] = [];
    const newMovements: StockMovement[] = [];
    let currentBalances = [...balances];

    const newLines: PurchaseLine[] = data.lines.map((l, idx) => {
      const lineCost = l.received_qty * l.unit_cost;
      totalAmount += lineCost;
      const lineId = `pline-${Date.now()}-${idx}`;

      // Generate FIFO Lot for received items
      if (l.received_qty > 0) {
        const lotId = `LOT-PO-${Date.now()}-${idx}`;
        newLots.push({
          id: lotId,
          variant_id: l.variant_id,
          location_id: data.destination_location_id,
          source_doc_id: docNo,
          source_line_id: lineId,
          original_qty: l.received_qty,
          remaining_qty: l.received_qty,
          unit_cost: l.unit_cost,
          created_at: now
        });

        // Update balance
        const { updatedBalances, newOnHand } = updateBalanceState(
          currentBalances,
          l.variant_id,
          data.destination_location_id,
          l.received_qty
        );
        currentBalances = updatedBalances;

        // Stock movement ledger entry
        newMovements.push({
          id: `mov-${Date.now()}-${idx}`,
          document_id: docId,
          variant_id: l.variant_id,
          location_id: data.destination_location_id,
          qty_delta: l.received_qty,
          lot_id: lotId,
          unit_cost: l.unit_cost,
          balance_after: newOnHand,
          notes: `استلام فاتورة شراء ${data.invoice_no}`,
          created_at: now
        });
      }

      return {
        id: lineId,
        document_id: docId,
        variant_id: l.variant_id,
        qty: l.ordered_qty,
        received_qty: l.received_qty,
        unit_cost: l.unit_cost,
        total_cost: lineCost
      };
    });

    const newPurchaseDoc: PurchaseDocument = {
      id: docId,
      doc_no: docNo,
      supplier_id: data.supplier_id,
      invoice_no: data.invoice_no,
      date: now,
      destination_location_id: data.destination_location_id,
      status,
      total_amount: totalAmount,
      created_by: currentUser.name,
      created_at: now,
      notes: data.notes
    };

    const newStockDoc: StockDocument = {
      id: docId,
      doc_no: docNo,
      type: 'purchase_receipt',
      destination_location_id: data.destination_location_id,
      status: 'completed',
      notes: `فاتورة شراء رقم ${data.invoice_no}`,
      created_by: currentUser.name,
      approved_by: currentUser.name,
      created_at: now
    };

    setPurchases(prev => [newPurchaseDoc, ...prev]);
    setPurchaseLines(prev => [...prev, ...newLines]);
    setLots(prev => [...prev, ...newLots]);
    setBalances(currentBalances);
    setDocuments(prev => [newStockDoc, ...prev]);
    setMovements(prev => [...prev, ...newMovements]);

    addAuditLog(
      'RECEIVE_PURCHASE',
      'purchase',
      docId,
      `استلام بضاعة شراء من مورد. الفاتورة: ${data.invoice_no} بمبلغ ${totalAmount} ج.م`
    );

    return { success: true, docId };
  };

  // Unit C: Vendor Returns without deleting purchase history
  const processVendorReturn = (
    purchaseDocId: string,
    returns: { variant_id: string; qty: number; unit_cost: number; reason: string }[]
  ) => {
    const purchase = purchases.find(p => p.id === purchaseDocId);
    if (!purchase) return { success: false, error: 'فاتورة الشراء غير موجودة' };

    const locId = purchase.destination_location_id;
    for (const ret of returns) {
      const onHand = getVariantBalance(ret.variant_id, locId);
      if (onHand < ret.qty) {
        const v = getVariantById(ret.variant_id);
        return {
          success: false,
          error: `الرصيد المتاح للصنف ${v?.sku || ret.variant_id} في المستودع (${onHand}) غير كافٍ لرد ${ret.qty} للمورد`
        };
      }
    }

    const retDocNo = `VRET-${Date.now().toString().slice(-6)}`;
    const retDocId = `vret-${Date.now()}`;
    const now = new Date().toISOString();

    let currentBalances = [...balances];
    let currentLots = [...lots];
    const newMovements: StockMovement[] = [];
    let totalReturnAmount = 0;

    for (let i = 0; i < returns.length; i++) {
      const ret = returns[i];
      const lineCost = ret.qty * ret.unit_cost;
      totalReturnAmount += lineCost;

      const { updatedBalances, newOnHand } = updateBalanceState(
        currentBalances,
        ret.variant_id,
        locId,
        -ret.qty
      );
      currentBalances = updatedBalances;

      let remainingToDeduct = ret.qty;
      currentLots = currentLots.map(l => {
        if (remainingToDeduct > 0 && l.variant_id === ret.variant_id && l.location_id === locId && l.remaining_qty > 0) {
          const take = Math.min(l.remaining_qty, remainingToDeduct);
          remainingToDeduct -= take;
          return { ...l, remaining_qty: l.remaining_qty - take };
        }
        return l;
      });

      newMovements.push({
        id: `mov-${Date.now()}-vret-${i}`,
        document_id: retDocId,
        variant_id: ret.variant_id,
        location_id: locId,
        qty_delta: -ret.qty,
        unit_cost: ret.unit_cost,
        balance_after: newOnHand,
        notes: `مرتجع للمورد عن فاتورة ${purchase.invoice_no}: ${ret.reason}`,
        created_at: now
      });
    }

    const stockDoc: StockDocument = {
      id: retDocId,
      doc_no: retDocNo,
      type: 'vendor_return',
      source_location_id: locId,
      status: 'completed',
      notes: `مرتجع مشتريات للمورد عن فاتورة ${purchase.invoice_no}`,
      created_by: currentUser.name,
      approved_by: currentUser.name,
      related_doc_id: purchase.id,
      created_at: now
    };

    setBalances(currentBalances);
    setLots(currentLots);
    setDocuments(prev => [stockDoc, ...prev]);
    setMovements(prev => [...prev, ...newMovements]);

    addAuditLog(
      'VENDOR_RETURN',
      'purchase',
      retDocId,
      `تسجيل مرتجع مشتريات للمورد ${retDocNo} عن فاتورة ${purchase.invoice_no} بقيمة ${totalReturnAmount} ج.م دون حذف سجل الشراء الأصلي`
    );

    return { success: true, returnDocId: retDocId };
  };

  // Section 4.3: Quick reconcile negative balance by adding balancing stock receipt
  const quickReconcileNegativeStock = (
    variantId: string,
    locationId: string,
    replenishQty: number,
    unitCost: number,
    notes?: string
  ) => {
    const now = new Date().toISOString();
    const docId = `rec-neg-${Date.now()}`;
    const docNo = `REC-NEG-${Date.now().toString().slice(-6)}`;

    const { updatedBalances, newOnHand } = updateBalanceState(
      balances,
      variantId,
      locationId,
      replenishQty
    );

    const newLot: InventoryLot = {
      id: `LOT-NEG-RECON-${Date.now()}`,
      variant_id: variantId,
      location_id: locationId,
      source_doc_id: docNo,
      source_line_id: `LINE-${docNo}`,
      original_qty: replenishQty,
      remaining_qty: replenishQty,
      unit_cost: unitCost,
      created_at: now
    };

    const newMovement: StockMovement = {
      id: `mov-${Date.now()}-neg-rec`,
      document_id: docId,
      variant_id: variantId,
      location_id: locationId,
      qty_delta: replenishQty,
      lot_id: newLot.id,
      unit_cost: unitCost,
      balance_after: newOnHand,
      notes: notes || 'تسوية رصيد سالب معتمد واستلام بضاعة فعلية',
      created_at: now
    };

    const stockDoc: StockDocument = {
      id: docId,
      doc_no: docNo,
      type: 'negative_stock_reconcile',
      destination_location_id: locationId,
      status: 'completed',
      notes: notes || 'إعادة تقييم وتسوية رصيد سالب وفق البند 4.3',
      created_by: currentUser.name,
      approved_by: currentUser.name,
      created_at: now
    };

    setBalances(updatedBalances);
    setLots(prev => [newLot, ...prev]);
    setDocuments(prev => [stockDoc, ...prev]);
    setMovements(prev => [newMovement, ...prev]);

    addAuditLog(
      'RECONCILE_NEGATIVE_STOCK',
      'stock_balance',
      variantId,
      `تسوية رصيد سالب للصنف بموقع ${getLocationById(locationId)?.name} بإضافة ${replenishQty} قطعة بتكلفة ${unitCost} ج.م`
    );

    return { success: true };
  };

  // Unit D: Transfers between locations (AT-06, AT-07)
  const createTransfer = (
    sourceLocationId: string,
    destLocationId: string,
    lines: { variant_id: string; qty: number }[],
    notes?: string
  ) => {
    if (sourceLocationId === destLocationId) {
      return { success: false, error: 'الموقع المصدر والموقع الهدف متطابقان' };
    }

    // Verify balances at source
    for (const l of lines) {
      const onHand = getVariantBalance(l.variant_id, sourceLocationId);
      if (onHand < l.qty) {
        const v = getVariantById(l.variant_id);
        return {
          success: false,
          error: `الرصيد المتاح للصنف ${v?.sku || l.variant_id} في المصدر (${onHand}) غير كافٍ لنقل ${l.qty}`
        };
      }
    }

    const transferNo = `TR-${Date.now().toString().slice(-6)}`;
    const transferId = `tr-${Date.now()}`;
    const now = new Date().toISOString();

    let currentLots = [...lots];
    let currentBalances = [...balances];
    const newMovements: StockMovement[] = [];

    // Transfer FIFO lots: Source -> In-Transit virtual location
    for (const l of lines) {
      const { updatedLots, transferredCost } = transferFifoLots(
        l.variant_id,
        sourceLocationId,
        'loc-transit',
        l.qty,
        currentLots
      );
      currentLots = updatedLots;

      // Deduct from source
      const resSource = updateBalanceState(currentBalances, l.variant_id, sourceLocationId, -l.qty);
      currentBalances = resSource.updatedBalances;

      // Add to transit
      const resTransit = updateBalanceState(currentBalances, l.variant_id, 'loc-transit', l.qty);
      currentBalances = resTransit.updatedBalances;

      // Source movement
      newMovements.push({
        id: `mov-${Date.now()}-tr-src-${l.variant_id}`,
        document_id: transferId,
        variant_id: l.variant_id,
        location_id: sourceLocationId,
        qty_delta: -l.qty,
        unit_cost: transferredCost / l.qty,
        balance_after: resSource.newOnHand,
        notes: `شحن تحويل ${transferNo} إلى بضاعة بالطريق`,
        created_at: now
      });

      // Transit movement
      newMovements.push({
        id: `mov-${Date.now()}-tr-trn-${l.variant_id}`,
        document_id: transferId,
        variant_id: l.variant_id,
        location_id: 'loc-transit',
        qty_delta: l.qty,
        unit_cost: transferredCost / l.qty,
        balance_after: resTransit.newOnHand,
        notes: `دخول بضاعة بالطريق من التحويل ${transferNo}`,
        created_at: now
      });
    }

    const newTransferLines: TransferLine[] = lines.map((l, idx) => ({
      id: `trline-${Date.now()}-${idx}`,
      transfer_id: transferId,
      variant_id: l.variant_id,
      dispatched_qty: l.qty,
      received_qty: 0,
      variance_qty: l.qty,
      notes: ''
    }));

    const newTransferDoc: TransferDocument = {
      id: transferId,
      transfer_no: transferNo,
      source_location_id: sourceLocationId,
      destination_location_id: destLocationId,
      status: 'in_transit',
      dispatched_at: now,
      created_by: currentUser.name,
      notes
    };

    const newStockDoc: StockDocument = {
      id: transferId,
      doc_no: transferNo,
      type: 'transfer_dispatch',
      source_location_id: sourceLocationId,
      destination_location_id: 'loc-transit',
      status: 'pending_transit',
      notes: `شحن تحويل إلى ${getLocationById(destLocationId)?.name}`,
      created_by: currentUser.name,
      created_at: now
    };

    setTransfers(prev => [newTransferDoc, ...prev]);
    setTransferLines(prev => [...prev, ...newTransferLines]);
    setLots(currentLots);
    setBalances(currentBalances);
    setDocuments(prev => [newStockDoc, ...prev]);
    setMovements(prev => [...prev, ...newMovements]);

    addAuditLog(
      'DISPATCH_TRANSFER',
      'transfer',
      transferId,
      `شحن إذن تحويل ${transferNo} من ${getLocationById(sourceLocationId)?.name} إلى بضاعة بالطريق`
    );

    return { success: true, transferId };
  };

  // Unit D: Confirm Transfer Receipt at Destination (AT-06, AT-07)
  const confirmTransferReceipt = (
    transferId: string,
    receivedLines: { lineId: string; received_qty: number; notes?: string }[]
  ) => {
    const transfer = transfers.find(t => t.id === transferId);
    if (!transfer) return { success: false, error: 'إذن التحويل غير موجود' };
    if (transfer.status !== 'in_transit') return { success: false, error: 'التحويل ليس في حالة بضاعة بالطريق' };

    const now = new Date().toISOString();
    let currentLots = [...lots];
    let currentBalances = [...balances];
    const newMovements: StockMovement[] = [];

    const existingLines = transferLines.filter(l => l.transfer_id === transferId);
    let hasVariance = false;

    const updatedLines = existingLines.map(line => {
      const rec = receivedLines.find(r => r.lineId === line.id);
      const recQty = rec ? rec.received_qty : line.dispatched_qty;
      const variance = line.dispatched_qty - recQty;
      if (variance !== 0) hasVariance = true;

      // Deduct from in-transit, Add to destination
      if (recQty > 0) {
        const { updatedLots, transferredCost } = transferFifoLots(
          line.variant_id,
          'loc-transit',
          transfer.destination_location_id,
          recQty,
          currentLots
        );
        currentLots = updatedLots;

        // Balance deduct from transit
        const resTransit = updateBalanceState(currentBalances, line.variant_id, 'loc-transit', -recQty);
        currentBalances = resTransit.updatedBalances;

        // Balance add to destination
        const resDest = updateBalanceState(currentBalances, line.variant_id, transfer.destination_location_id, recQty);
        currentBalances = resDest.updatedBalances;

        newMovements.push({
          id: `mov-${Date.now()}-rcv-trn-${line.variant_id}`,
          document_id: transferId,
          variant_id: line.variant_id,
          location_id: 'loc-transit',
          qty_delta: -recQty,
          unit_cost: transferredCost / recQty,
          balance_after: resTransit.newOnHand,
          notes: `استلام جزئي/كلي من الطريق للتحويل ${transfer.transfer_no}`,
          created_at: now
        });

        newMovements.push({
          id: `mov-${Date.now()}-rcv-dst-${line.variant_id}`,
          document_id: transferId,
          variant_id: line.variant_id,
          location_id: transfer.destination_location_id,
          qty_delta: recQty,
          unit_cost: transferredCost / recQty,
          balance_after: resDest.newOnHand,
          notes: `إيداع بالموقع الهدف من التحويل ${transfer.transfer_no}`,
          created_at: now
        });
      }

      return {
        ...line,
        received_qty: recQty,
        variance_qty: variance,
        notes: rec?.notes || line.notes
      };
    });

    const newStatus = hasVariance ? 'received_partial' : 'received_full';

    setTransfers(prev =>
      prev.map(t =>
        t.id === transferId
          ? {
              ...t,
              status: newStatus,
              received_at: now,
              received_by: currentUser.name
            }
          : t
      )
    );

    setTransferLines(prev =>
      prev.map(l => {
        const updated = updatedLines.find(u => u.id === l.id);
        return updated || l;
      })
    );

    setLots(currentLots);
    setBalances(currentBalances);
    setMovements(prev => [...prev, ...newMovements]);

    addAuditLog(
      'CONFIRM_TRANSFER',
      'transfer',
      transferId,
      `تأكيد استلام التحويل ${transfer.transfer_no} في ${getLocationById(transfer.destination_location_id)?.name}. ${
        hasVariance ? 'يوجد فروق عجز قيد المتابعة' : 'مطابق بالكامل'
      }`
    );

    return { success: true };
  };

  // Unit E: Sales POS & FIFO Allocation with Negative Stock Control (AT-05, AT-10)
  const processSale = (
    branchId: string,
    items: { variant_id: string; qty: number; selling_price: number }[],
    customerName: string = 'عميل نقدي',
    supervisorOverride?: { override: boolean; reason: string; supervisorName: string }
  ) => {
    if (!currentUser.permissions.canMakeSales) {
      return { success: false, error: 'المستخدم الحالي ليس لديه صلاحية المبيعات' };
    }

    // 1. Check stock availability for all items
    let hasShortage = false;
    const shortages: { variant: ProductVariant; available: number; requested: number }[] = [];

    for (const item of items) {
      const onHand = getVariantBalance(item.variant_id, branchId);
      if (onHand < item.qty) {
        hasShortage = true;
        const v = getVariantById(item.variant_id);
        if (v) shortages.push({ variant: v, available: onHand, requested: item.qty });
      }
    }

    // 2. Negative stock enforcement (Section 4.3 and AT-10)
    let negativeAuthorized = false;
    let overrideReason = '';
    let supervisorApprover = '';

    if (hasShortage) {
      // Check if user has supervisor permission or provided valid override
      const canOverride = currentUser.permissions.canOverrideNegativeStock || supervisorOverride?.override;
      if (!canOverride) {
        const msg = shortages
          .map(s => `${s.variant.sku} (المتاح: ${s.available}، المطلوب: ${s.requested})`)
          .join(', ');
        return {
          success: false,
          error: `تم رفض البيع: الرصيد غير كافٍ للأصناف: ${msg}. الرصيد السالب ممنوع وفق مواصفات النظام ويحتاج صلاحية خاصة استثنائية (AT-10).`
        };
      }

      if (!supervisorOverride?.reason && !currentUser.permissions.canOverrideNegativeStock) {
        return { success: false, error: 'يجب تقديم سبب موثق لتصريح الرصيد السالب' };
      }

      negativeAuthorized = true;
      overrideReason = supervisorOverride?.reason || 'تصريح استثنائي مباشر من مشرف النظام للرصيد السالب';
      supervisorApprover = supervisorOverride?.supervisorName || currentUser.name;
    }

    // 3. Process FIFO Allocations across batches
    const now = new Date().toISOString();
    const invoiceNo = `INV-${Date.now().toString().slice(-6)}`;
    const saleDocId = `sale-${Date.now()}`;

    let currentLots = [...lots];
    let currentBalances = [...balances];
    const newSalesLines: SalesLine[] = [];
    const newAllocations: SaleLotAllocation[] = [];
    const newMovements: StockMovement[] = [];

    let totalSaleAmount = 0;
    let totalFifoCost = 0;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const salesLineId = `sline-${Date.now()}-${i}`;
      const lineTotal = item.qty * item.selling_price;
      totalSaleAmount += lineTotal;

      // FIFO Allocation
      const fifoRes = allocateFifoLots(
        item.variant_id,
        branchId,
        item.qty,
        currentLots,
        negativeAuthorized,
        0
      );

      currentLots = fifoRes.updatedLots;
      totalFifoCost += fifoRes.total_fifo_cost;

      // Deduct balance
      const { updatedBalances, newOnHand } = updateBalanceState(
        currentBalances,
        item.variant_id,
        branchId,
        -item.qty
      );
      currentBalances = updatedBalances;

      // Record Sales Line
      newSalesLines.push({
        id: salesLineId,
        document_id: saleDocId,
        variant_id: item.variant_id,
        qty: item.qty,
        selling_price: item.selling_price,
        total_price: lineTotal,
        returned_qty: 0
      });

      // Record Allocations
      for (const alloc of fifoRes.allocations) {
        newAllocations.push({
          id: `alloc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          sales_line_id: salesLineId,
          variant_id: item.variant_id,
          lot_id: alloc.lot_id,
          qty: alloc.qty,
          unit_cost: alloc.unit_cost
        });
      }

      // Stock Movement entry
      newMovements.push({
        id: `mov-${Date.now()}-sale-${item.variant_id}`,
        document_id: saleDocId,
        variant_id: item.variant_id,
        location_id: branchId,
        qty_delta: -item.qty,
        unit_cost: fifoRes.average_unit_cost,
        balance_after: newOnHand,
        notes: `مبيعات فاتورة ${invoiceNo} (${customerName})`,
        created_at: now
      });
    }

    const netProfit = totalSaleAmount - totalFifoCost;

    const newSaleDoc: SalesDocument = {
      id: saleDocId,
      invoice_no: invoiceNo,
      branch_id: branchId,
      customer_name: customerName,
      source_system: 'new_pos',
      status: 'completed',
      total_amount: Math.round(totalSaleAmount * 100) / 100,
      total_cost_fifo: Math.round(totalFifoCost * 100) / 100,
      net_profit: Math.round(netProfit * 100) / 100,
      date: now,
      created_by: currentUser.name,
      has_negative_stock_exception: negativeAuthorized,
      negative_stock_reason: negativeAuthorized ? overrideReason : undefined,
      negative_stock_approved_by: negativeAuthorized ? supervisorApprover : undefined
    };

    const newStockDoc: StockDocument = {
      id: saleDocId,
      doc_no: invoiceNo,
      type: 'sales_deduction',
      source_location_id: branchId,
      status: 'completed',
      notes: `فاتورة مبيعات ${invoiceNo}`,
      created_by: currentUser.name,
      approved_by: negativeAuthorized ? supervisorApprover : currentUser.name,
      supervisor_override_reason: negativeAuthorized ? overrideReason : undefined,
      created_at: now
    };

    setSales(prev => [newSaleDoc, ...prev]);
    setSalesLines(prev => [...prev, ...newSalesLines]);
    setSaleAllocations(prev => [...prev, ...newAllocations]);
    setLots(currentLots);
    setBalances(currentBalances);
    setDocuments(prev => [newStockDoc, ...prev]);
    setMovements(prev => [...prev, ...newMovements]);

    addAuditLog(
      'PROCESS_SALE',
      'sale',
      saleDocId,
      `اعتماد فاتورة بيع ${invoiceNo} بقيمة ${totalSaleAmount} ج.م (تكلفة FIFO: ${totalFifoCost} ج.م). ${
        negativeAuthorized ? `[استثناء رصيد سالب مصرح: ${overrideReason}]` : ''
      }`
    );

    return { success: true, saleDoc: newSaleDoc };
  };

  // Unit E: Customer Returns with Inspection Routing (AT-12)
  const processSaleReturn = (
    salesDocId: string,
    returnItems: { salesLineId: string; variant_id: string; qty: number; condition: 'good' | 'damaged' | 'quarantine'; notes?: string }[]
  ) => {
    const saleDoc = sales.find(s => s.id === salesDocId);
    if (!saleDoc) return { success: false, error: 'فاتورة البيع غير موجودة' };

    const returnNo = `RET-${Date.now().toString().slice(-6)}`;
    const returnId = `ret-${Date.now()}`;
    const now = new Date().toISOString();

    let totalRefundAmount = 0;
    let totalRefundCost = 0;

    let currentLots = [...lots];
    let currentBalances = [...balances];
    const newMovements: StockMovement[] = [];
    const newReturnLines: SalesReturnLine[] = [];

    for (const retItem of returnItems) {
      const sLine = salesLines.find(l => l.id === retItem.salesLineId);
      if (!sLine) continue;

      // Find original allocations to reverse cost accurately according to original FIFO allocation
      const allocations = saleAllocations.filter(a => a.sales_line_id === sLine.id);
      const avgUnitCost = allocations.length > 0
        ? allocations.reduce((sum, a) => sum + (a.qty * a.unit_cost), 0) / allocations.reduce((sum, a) => sum + a.qty, 0)
        : 0;

      const itemRefundAmount = retItem.qty * sLine.selling_price;
      const itemRefundCost = retItem.qty * avgUnitCost;

      totalRefundAmount += itemRefundAmount;
      totalRefundCost += itemRefundCost;

      // Destination location based on inspection
      let targetLocId = saleDoc.branch_id;
      if (retItem.condition === 'damaged') {
        targetLocId = 'loc-damaged';
      } else if (retItem.condition === 'quarantine') {
        targetLocId = 'loc-quarantine';
      }

      // Re-add balance to target location
      const { updatedBalances, newOnHand } = updateBalanceState(
        currentBalances,
        retItem.variant_id,
        targetLocId,
        retItem.qty
      );
      currentBalances = updatedBalances;

      // If condition is 'good', restore inventory lot for future sale
      if (retItem.condition === 'good') {
        currentLots.push({
          id: `LOT-RET-${Date.now()}-${retItem.variant_id}`,
          variant_id: retItem.variant_id,
          location_id: targetLocId,
          source_doc_id: returnNo,
          source_line_id: retItem.salesLineId,
          original_qty: retItem.qty,
          remaining_qty: retItem.qty,
          unit_cost: avgUnitCost,
          created_at: now
        });
      }

      newMovements.push({
        id: `mov-${Date.now()}-ret-${retItem.variant_id}`,
        document_id: returnId,
        variant_id: retItem.variant_id,
        location_id: targetLocId,
        qty_delta: retItem.qty,
        unit_cost: avgUnitCost,
        balance_after: newOnHand,
        notes: `مرتجع مبيعات فاتورة ${saleDoc.invoice_no} (حالة: ${retItem.condition})`,
        created_at: now
      });

      newReturnLines.push({
        id: `retline-${Date.now()}-${retItem.salesLineId}`,
        return_id: returnId,
        sales_line_id: retItem.salesLineId,
        variant_id: retItem.variant_id,
        qty: retItem.qty,
        unit_refund_price: sLine.selling_price,
        unit_cost_reversed: avgUnitCost,
        condition: retItem.condition,
        target_location_id: targetLocId
      });
    }

    const returnDoc: SalesReturnDocument = {
      id: returnId,
      return_no: returnNo,
      original_sales_doc_id: salesDocId,
      branch_id: saleDoc.branch_id,
      date: now,
      status: 'completed',
      total_refund_amount: totalRefundAmount,
      total_refund_cost: totalRefundCost,
      created_by: currentUser.name
    };

    setSalesReturns(prev => [returnDoc, ...prev]);
    setSalesReturnLines(prev => [...prev, ...newReturnLines]);
    setLots(currentLots);
    setBalances(currentBalances);
    setMovements(prev => [...prev, ...newMovements]);

    // Update sales doc status
    setSales(prev =>
      prev.map(s =>
        s.id === salesDocId
          ? { ...s, status: 'returned_partial' }
          : s
      )
    );

    addAuditLog(
      'PROCESS_RETURN',
      'sales_return',
      returnId,
      `تسجيل مرتجع مبيعات ${returnNo} لفاتورة ${saleDoc.invoice_no} بقيمة استرداد ${totalRefundAmount} ج.م`
    );

    return { success: true, returnDoc };
  };

  // Unit E: Cancel Sale (AT-12)
  const cancelSale = (salesDocId: string, reason: string) => {
    const saleDoc = sales.find(s => s.id === salesDocId);
    if (!saleDoc) return { success: false, error: 'فاتورة البيع غير موجودة' };
    if (saleDoc.status === 'cancelled') return { success: false, error: 'الفاتورة ملغاة بالفعل' };

    const docLines = salesLines.filter(l => l.document_id === salesDocId);
    const now = new Date().toISOString();

    let currentBalances = [...balances];
    let currentLots = [...lots];
    const newMovements: StockMovement[] = [];

    // Revert items to branch
    for (const l of docLines) {
      const { updatedBalances, newOnHand } = updateBalanceState(
        currentBalances,
        l.variant_id,
        saleDoc.branch_id,
        l.qty
      );
      currentBalances = updatedBalances;

      // Restore lots allocated
      const allocations = saleAllocations.filter(a => a.sales_line_id === l.id);
      for (const alloc of allocations) {
        const lot = currentLots.find(lot => lot.id === alloc.lot_id);
        if (lot) {
          lot.remaining_qty += alloc.qty;
        } else {
          currentLots.push({
            id: `LOT-RESTORE-${Date.now()}-${alloc.variant_id}`,
            variant_id: alloc.variant_id,
            location_id: saleDoc.branch_id,
            source_doc_id: `CAN-${saleDoc.invoice_no}`,
            source_line_id: l.id,
            original_qty: alloc.qty,
            remaining_qty: alloc.qty,
            unit_cost: alloc.unit_cost,
            created_at: now
          });
        }
      }

      newMovements.push({
        id: `mov-${Date.now()}-can-${l.variant_id}`,
        document_id: salesDocId,
        variant_id: l.variant_id,
        location_id: saleDoc.branch_id,
        qty_delta: l.qty,
        unit_cost: l.total_price / l.qty,
        balance_after: newOnHand,
        notes: `إلغاء فاتورة بيع ${saleDoc.invoice_no}: ${reason}`,
        created_at: now
      });
    }

    setSales(prev =>
      prev.map(s => (s.id === salesDocId ? { ...s, status: 'cancelled' } : s))
    );
    setBalances(currentBalances);
    setLots(currentLots);
    setMovements(prev => [...prev, ...newMovements]);

    addAuditLog(
      'CANCEL_SALE',
      'sale',
      salesDocId,
      `إلغاء فاتورة مبيعات ${saleDoc.invoice_no}. السبب: ${reason}`
    );

    return { success: true };
  };

  // Unit F: Stocktaking (Blind Count & Variance Reconciliation) (AT-08, AT-09)
  const startStocktake = (
    locationId: string,
    scope: 'full' | 'category' | 'selective',
    blindCount: boolean,
    categoryId?: string
  ) => {
    if (!currentUser.permissions.canStocktake) {
      return { success: false, error: 'المستخدم الحالي ليس لديه صلاحية الجرد' };
    }

    const sessionId = `stk-${Date.now()}`;
    const sessionNo = `STK-${Date.now().toString().slice(-6)}`;
    const now = new Date().toISOString();

    // Select variants based on scope
    let targetVariants = variants.filter(v => v.status === 'active');
    if (scope === 'category' && categoryId) {
      const prodsInCat = products.filter(p => p.category_id === categoryId).map(p => p.id);
      targetVariants = targetVariants.filter(v => prodsInCat.includes(v.product_id));
    }

    const lines: StocktakeLine[] = targetVariants.map((v, idx) => {
      const expQty = getVariantBalance(v.id, locationId);
      const unitCost = 0; // Cost resolved on reconciliation from lots
      return {
        id: `stkline-${Date.now()}-${idx}`,
        session_id: sessionId,
        variant_id: v.id,
        expected_qty: expQty,
        counted_qty: 0,
        variance_qty: 0 - expQty, // initial until counted
        unit_cost: unitCost,
        variance_cost: 0,
        is_recounted: false
      };
    });

    const session: StocktakeSession = {
      id: sessionId,
      session_no: sessionNo,
      location_id: locationId,
      scope,
      category_id: categoryId,
      status: 'counting',
      blind_count: blindCount,
      opened_at: now,
      opened_by: currentUser.name
    };

    setStocktakes(prev => [session, ...prev]);
    setStocktakeLines(prev => [...prev, ...lines]);

    addAuditLog(
      'START_STOCKTAKE',
      'stocktake',
      sessionId,
      `بدء جلسة جرد ${sessionNo} في موقع ${getLocationById(locationId)?.name} (عد أعمى: ${blindCount ? 'مفعّل' : 'معطّل'})`
    );

    return { success: true, session };
  };

  const updateStocktakeCount = (
    sessionId: string,
    variantId: string,
    countedQty: number,
    isRecount: boolean = false
  ) => {
    setStocktakeLines(prev =>
      prev.map(l => {
        if (l.session_id === sessionId && l.variant_id === variantId) {
          const finalCount = isRecount ? countedQty : countedQty;
          const variance = finalCount - l.expected_qty;
          return {
            ...l,
            counted_qty: finalCount,
            recount_qty: isRecount ? countedQty : l.recount_qty,
            variance_qty: variance,
            is_recounted: isRecount || l.is_recounted
          };
        }
        return l;
      })
    );
  };

  const reconcileStocktake = (sessionId: string, notes?: string) => {
    if (!currentUser.permissions.canApproveDiscrepancies) {
      return { success: false, error: 'يتطلب اعتماد فروق الجرد صلاحية "اعتماد التسويات" وفق متطلبات الوحدة F (AT-09)' };
    }

    const session = stocktakes.find(s => s.id === sessionId);
    if (!session) return { success: false, error: 'جلسة الجرد غير موجودة' };

    const lines = stocktakeLines.filter(l => l.session_id === sessionId);
    const now = new Date().toISOString();

    let currentBalances = [...balances];
    let currentLots = [...lots];
    const newMovements: StockMovement[] = [];

    // For lines with variance, create audited stock adjustment movements
    for (const l of lines) {
      if (l.variance_qty === 0) continue;

      // Update on-hand balance to match counted_qty exactly
      const { updatedBalances, newOnHand } = updateBalanceState(
        currentBalances,
        l.variant_id,
        session.location_id,
        l.variance_qty
      );
      currentBalances = updatedBalances;

      // Handle lot adjustments
      if (l.variance_qty > 0) {
        // Surplus: Create adjustment lot
        const v = getVariantById(l.variant_id);
        const estCost = v ? v.selling_price * 0.5 : 100;
        currentLots.push({
          id: `LOT-STK-SURPLUS-${Date.now()}-${l.variant_id}`,
          variant_id: l.variant_id,
          location_id: session.location_id,
          source_doc_id: session.session_no,
          source_line_id: l.id,
          original_qty: l.variance_qty,
          remaining_qty: l.variance_qty,
          unit_cost: estCost,
          created_at: now
        });
      } else {
        // Deficit: Deduct from oldest active lots via FIFO
        const absVariance = Math.abs(l.variance_qty);
        const fifoRes = allocateFifoLots(l.variant_id, session.location_id, absVariance, currentLots);
        currentLots = fifoRes.updatedLots;
      }

      newMovements.push({
        id: `mov-${Date.now()}-stk-${l.variant_id}`,
        document_id: sessionId,
        variant_id: l.variant_id,
        location_id: session.location_id,
        qty_delta: l.variance_qty,
        unit_cost: 0,
        balance_after: newOnHand,
        notes: `تسوية جرد معتمدة لجلسة ${session.session_no}: ${l.variance_qty > 0 ? 'فائض زيادة' : 'عجز مخزني'}`,
        created_at: now
      });
    }

    const stockDoc: StockDocument = {
      id: sessionId,
      doc_no: session.session_no,
      type: 'stocktake_adjustment',
      destination_location_id: session.location_id,
      status: 'completed',
      notes: notes || `تسوية جرد معتمدة لجلسة ${session.session_no}`,
      created_by: session.opened_by,
      approved_by: currentUser.name,
      created_at: now
    };

    setStocktakes(prev =>
      prev.map(s =>
        s.id === sessionId
          ? {
              ...s,
              status: 'reconciled',
              closed_at: now,
              approved_by: currentUser.name,
              reconciliation_notes: notes
            }
          : s
      )
    );

    setBalances(currentBalances);
    setLots(currentLots);
    setDocuments(prev => [stockDoc, ...prev]);
    setMovements(prev => [...prev, ...newMovements]);

    addAuditLog(
      'RECONCILE_STOCKTAKE',
      'stocktake',
      sessionId,
      `اعتماد تسوية فروق الجرد لجلسة ${session.session_no} في ${getLocationById(session.location_id)?.name}`
    );

    return { success: true };
  };

  // Legacy Invoices Import with duplicate detection (AT-11)
  const importLegacyInvoice = (invoice: {
    external_id: string;
    branch_id: string;
    date: string;
    lines: { barcode: string; qty: number; price: number }[];
  }) => {
    // 1. Check if external_id was already imported (AT-11)
    const exists = sales.some(s => s.external_id && s.external_id === invoice.external_id);
    if (exists) {
      return {
        success: false,
        error: `الفاتورة القديمة برقم مرجعي [${invoice.external_id}] مستوردة ومؤرشفة بالفعل! تم منع التكرار وفق معيار AT-11 لمنع خصم المخزون مرتين.`
      };
    }

    // Map items by barcode
    const saleItems: { variant_id: string; qty: number; selling_price: number }[] = [];
    for (const line of invoice.lines) {
      const v = getVariantByBarcode(line.barcode);
      if (!v) {
        return { success: false, error: `الباركود [${line.barcode}] غير معرف في دليل الأصناف الحالي` };
      }
      saleItems.push({
        variant_id: v.id,
        qty: line.qty,
        selling_price: line.price
      });
    }

    // Process sale with legacy flag
    const res = processSale(invoice.branch_id, saleItems, 'فاتورة مستوردة من النظام القديم');
    if (!res.success) return res;

    // Stamp external_id on the created sale doc
    if (res.saleDoc) {
      const updatedDoc: SalesDocument = {
        ...res.saleDoc,
        source_system: 'legacy_migration',
        external_id: invoice.external_id
      };
      setSales(prev => prev.map(s => (s.id === res.saleDoc!.id ? updatedDoc : s)));
    }

    return { success: true };
  };

  // Unit A: Excel Import with Diagnostics & Pre-commit error reporting (AT-15)
  const importVariantsFromExcel = (
    rows: {
      model_code: string;
      name: string;
      category: string;
      color: string;
      size: string;
      sku: string;
      barcode: string;
      price: number;
      min_reorder: number;
    }[]
  ) => {
    const errors: string[] = [];
    const existingBarcodes = new Set(variants.map(v => v.barcode));
    const existingSkus = new Set(variants.map(v => v.sku.toLowerCase()));

    const seenInBatchBarcodes = new Set<string>();
    const seenInBatchSkus = new Set<string>();

    rows.forEach((row, idx) => {
      const rowNum = idx + 1;
      const bcode = String(row.barcode || '').trim();
      const sku = String(row.sku || '').trim().toLowerCase();

      if (!row.model_code) errors.push(`السطر ${rowNum}: كود الموديل مطلوب`);
      if (!row.name) errors.push(`السطر ${rowNum}: اسم الموديل مطلوب`);
      if (!bcode) errors.push(`السطر ${rowNum}: الباركود مطلوب`);
      if (!sku) errors.push(`السطر ${rowNum}: SKU مطلوب`);

      if (bcode) {
        if (existingBarcodes.has(bcode)) {
          errors.push(`السطر ${rowNum}: الباركود [${bcode}] موجود بالفعل في قاعدة البيانات`);
        } else if (seenInBatchBarcodes.has(bcode)) {
          errors.push(`السطر ${rowNum}: تكرار الباركود [${bcode}] داخل نفس ملف Excel`);
        }
        seenInBatchBarcodes.add(bcode);
      }

      if (sku) {
        if (existingSkus.has(sku)) {
          errors.push(`السطر ${rowNum}: كود SKU [${row.sku}] موجود بالفعل في قاعدة البيانات`);
        } else if (seenInBatchSkus.has(sku)) {
          errors.push(`السطر ${rowNum}: تكرار SKU [${row.sku}] داخل نفس ملف Excel`);
        }
        seenInBatchSkus.add(sku);
      }
    });

    if (errors.length > 0) {
      return { success: false, inserted: 0, errors };
    }

    // Commit rows
    let inserted = 0;
    const newProducts: Product[] = [];
    const newVariants: ProductVariant[] = [];

    // Group by model_code
    const grouped: Record<string, typeof rows> = {};
    for (const r of rows) {
      if (!grouped[r.model_code]) grouped[r.model_code] = [];
      grouped[r.model_code].push(r);
    }

    for (const modelCode of Object.keys(grouped)) {
      const items = grouped[modelCode];
      const first = items[0];
      const prodId = `prod-xl-${Date.now()}-${modelCode}`;

      newProducts.push({
        id: prodId,
        model_code: modelCode,
        name: first.name,
        category_id: 'cat-suits',
        status: 'active',
        created_at: new Date().toISOString()
      });

      for (let j = 0; j < items.length; j++) {
        const item = items[j];
        newVariants.push({
          id: `var-xl-${Date.now()}-${modelCode}-${j}`,
          product_id: prodId,
          color_id: `clr-${item.color}`,
          color_name: item.color,
          size_id: `sz-${item.size}`,
          size_name: item.size,
          sku: item.sku,
          barcode: String(item.barcode).trim(),
          selling_price: Number(item.price) || 100,
          min_reorder_level: Number(item.min_reorder) || 10,
          status: 'active'
        });
        inserted++;
      }
    }

    setProducts(prev => [...prev, ...newProducts]);
    setVariants(prev => [...prev, ...newVariants]);

    addAuditLog(
      'IMPORT_EXCEL',
      'product_variants',
      'bulk',
      `تم استيراد ${inserted} صنف ومتغير بنجاح من ملف Excel بعد التحقق من خلوه من الأخطاء`
    );

    return { success: true, inserted, errors: [] };
  };

  // Database Backup & Integrity Check (AT-14, AT-16)
  const exportDatabaseBackup = () => {
    const backupData = {
      system: 'Clothing Inventory & POS Management',
      version: '1.0',
      timestamp: new Date().toISOString(),
      data: {
        categories,
        products,
        variants,
        locations,
        suppliers,
        lots,
        balances,
        documents,
        movements,
        purchases,
        purchaseLines,
        transfers,
        transferLines,
        sales,
        salesLines,
        saleAllocations,
        salesReturns,
        salesReturnLines,
        stocktakes,
        stocktakeLines,
        auditLogs
      }
    };
    return JSON.stringify(backupData, null, 2);
  };

  const restoreDatabaseBackup = (jsonContent: string) => {
    try {
      const parsed = JSON.parse(jsonContent);
      if (!parsed.data || !parsed.data.products || !parsed.data.movements) {
        return { success: false, message: 'صيغة ملف النسخة الاحتياطية غير صالحة أو تالفة' };
      }

      const d = parsed.data;
      setCategories(d.categories || []);
      setProducts(d.products || []);
      setVariants(d.variants || []);
      setLocations(d.locations || []);
      setSuppliers(d.suppliers || []);
      setLots(d.lots || []);
      setBalances(d.balances || []);
      setDocuments(d.documents || []);
      setMovements(d.movements || []);
      setPurchases(d.purchases || []);
      setPurchaseLines(d.purchaseLines || []);
      setTransfers(d.transfers || []);
      setTransferLines(d.transferLines || []);
      setSales(d.sales || []);
      setSalesLines(d.salesLines || []);
      setSaleAllocations(d.saleAllocations || []);
      setSalesReturns(d.salesReturns || []);
      setSalesReturnLines(d.salesReturnLines || []);
      setStocktakes(d.stocktakes || []);
      setStocktakeLines(d.stocktakeLines || []);
      setAuditLogs(d.auditLogs || []);

      // Verify integrity against ledger (AT-14, AT-16)
      const reconstructed = reconstructBalancesFromLedger(d.movements || []);
      let mismatchCount = 0;

      for (const bal of d.balances || []) {
        const key = `${bal.variant_id}__${bal.location_id}`;
        const ledgerExpected = reconstructed[key] || 0;
        if (ledgerExpected !== bal.on_hand_qty) {
          mismatchCount++;
        }
      }

      addAuditLog(
        'RESTORE_BACKUP',
        'database',
        'system',
        `تم استعادة النسخة الاحتياطية بنجاح. فحص سلامة الأرصدة: ${
          mismatchCount === 0 ? 'مطابقة تامة 100% مع سجل القيود' : `يوجد ${mismatchCount} اختلاف يحتاج فحص`
        }`
      );

      return {
        success: true,
        message: 'تم استرجاع النسخة الاحتياطية بنجاح ومطابقة سجل القيود.',
        balanceMismatches: mismatchCount
      };
    } catch {
      return { success: false, message: 'فشل قراءة ملف النسخة الاحتياطية، تأكد من سلامة ملف JSON' };
    }
  };

  const resetToInitialData = () => {
    setCategories(INITIAL_CATEGORIES);
    setProducts(INITIAL_PRODUCTS);
    setVariants(INITIAL_VARIANTS);
    setLocations(INITIAL_LOCATIONS);
    setSuppliers(INITIAL_SUPPLIERS);
    setLots(INITIAL_LOTS);
    setBalances(INITIAL_BALANCES);
    setDocuments(INITIAL_DOCUMENTS);
    setMovements(INITIAL_MOVEMENTS);
    setPurchases(INITIAL_PURCHASES);
    setPurchaseLines(INITIAL_PURCHASE_LINES);
    setTransfers(INITIAL_TRANSFERS);
    setTransferLines(INITIAL_TRANSFER_LINES);
    setSales(INITIAL_SALES);
    setSalesLines(INITIAL_SALES_LINES);
    setSaleAllocations(INITIAL_SALE_ALLOCATIONS);
    setSalesReturns([]);
    setSalesReturnLines([]);
    setStocktakes(INITIAL_STOCKTAKES);
    setStocktakeLines(INITIAL_STOCKTAKE_LINES);
    setAuditLogs(INITIAL_AUDIT_LOGS);
    localStorage.clear();
  };

  return (
    <StoreContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        users,
        selectedBranchId,
        setSelectedBranchId,
        categories,
        products,
        variants,
        locations,
        suppliers,
        lots,
        balances,
        documents,
        movements,
        purchases,
        purchaseLines,
        transfers,
        transferLines,
        sales,
        salesLines,
        saleAllocations,
        salesReturns,
        salesReturnLines,
        stocktakes,
        stocktakeLines,
        auditLogs,

        getVariantById,
        getVariantByBarcode,
        getProductById,
        getLocationById,
        getVariantBalance,
        getAllBalancesForVariant,
        getLotsForVariant,

        addProduct,
        receivePurchase,
        processVendorReturn,
        quickReconcileNegativeStock,
        scannedBarcodeBus,
        triggerBarcodeScan,
        clearBarcodeScan,
        createTransfer,
        confirmTransferReceipt,
        processSale,
        processSaleReturn,
        cancelSale,
        startStocktake,
        updateStocktakeCount,
        reconcileStocktake,
        importLegacyInvoice,
        importVariantsFromExcel,
        exportDatabaseBackup,
        restoreDatabaseBackup,
        resetToInitialData,
        addAuditLog
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) throw new Error('useStore must be used within a StoreProvider');
  return context;
};
