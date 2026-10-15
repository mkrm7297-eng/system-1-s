/**
 * Initial Seed Data for Clothing Inventory & POS System
 * Comprehensive default records for all units:
 * - Master Catalog (Models, colors, sizes, Code 128 barcodes)
 * - Central warehouse & 3 branches & in-transit & quarantine
 * - FIFO Cost Lots (exact benchmark 100@300 + 80@340)
 * - Purchase documents & lines
 * - Branch transfers (completed & in-transit)
 * - Sales documents with FIFO profit allocations
 * - Active stocktake session with blind count
 * - Audit logs trail
 */

import {
  ProductCategory,
  Product,
  ProductVariant,
  Location,
  Supplier,
  InventoryLot,
  StockBalance,
  StockMovement,
  StockDocument,
  PurchaseDocument,
  PurchaseLine,
  TransferDocument,
  TransferLine,
  SalesDocument,
  SalesLine,
  SaleLotAllocation,
  StocktakeSession,
  StocktakeLine,
  AuditLog,
  SystemUser
} from '../types';

export const INITIAL_USERS: SystemUser[] = [
  {
    id: 'user-admin',
    name: 'أحمد مكرم (مدير النظام)',
    role: 'admin',
    permissions: {
      canManageSettings: true,
      canManageInventory: true,
      canMakeSales: true,
      canStocktake: true,
      canApproveDiscrepancies: true,
      canOverrideNegativeStock: true,
      canViewAuditLogs: true
    }
  },
  {
    id: 'user-inventory',
    name: 'محمود عبد الله (إدارة المخزون)',
    role: 'inventory_manager',
    permissions: {
      canManageSettings: false,
      canManageInventory: true,
      canMakeSales: false,
      canStocktake: true,
      canApproveDiscrepancies: false,
      canOverrideNegativeStock: false,
      canViewAuditLogs: true
    }
  },
  {
    id: 'user-cashier',
    name: 'سارة إبراهيم (كاشير مبيعات)',
    role: 'cashier',
    permissions: {
      canManageSettings: false,
      canManageInventory: false,
      canMakeSales: true,
      canStocktake: false,
      canApproveDiscrepancies: false,
      canOverrideNegativeStock: false,
      canViewAuditLogs: false
    }
  },
  {
    id: 'user-auditor',
    name: 'كريم عادل (مراقب الجرد والتسويات)',
    role: 'auditor',
    permissions: {
      canManageSettings: false,
      canManageInventory: false,
      canMakeSales: false,
      canStocktake: true,
      canApproveDiscrepancies: true,
      canOverrideNegativeStock: false,
      canViewAuditLogs: true
    }
  },
  {
    id: 'user-supervisor-override',
    name: 'أ. طارق حسني (مشرف استثناء الرصيد السالب)',
    role: 'supervisor_override',
    permissions: {
      canManageSettings: false,
      canManageInventory: false,
      canMakeSales: true,
      canStocktake: false,
      canApproveDiscrepancies: false,
      canOverrideNegativeStock: true,
      canViewAuditLogs: true
    }
  }
];

export const INITIAL_CATEGORIES: ProductCategory[] = [
  { id: 'cat-suits', name: 'بدل ورسميات' },
  { id: 'cat-shirts', name: 'قمصان وبلايز' },
  { id: 'cat-trousers', name: 'بنطلونات جبردين وجينز' },
  { id: 'cat-dresses', name: 'فساتين وعبايات' }
];

export const INITIAL_LOCATIONS: Location[] = [
  {
    id: 'loc-central',
    code: 'WH-MAIN',
    name: 'المخزن المركزي (العاشر من رمضان)',
    type: 'central',
    status: 'active',
    address: 'المنطقة الصناعية الثالثة، بلوك 4'
  },
  {
    id: 'loc-maadi',
    code: 'BR-MAADI',
    name: 'فرع المعادي (شارع النصر)',
    type: 'branch',
    status: 'active',
    address: 'شارع النصر، دجلة المعادي'
  },
  {
    id: 'loc-nasrcity',
    code: 'BR-NASR',
    name: 'فرع مدينة نصر (عباس العقاد)',
    type: 'branch',
    status: 'active',
    address: 'شارع عباس العقاد الرئيسي'
  },
  {
    id: 'loc-mohandessin',
    code: 'BR-MOHAND',
    name: 'فرع المهندسين (شارع لبنان)',
    type: 'branch',
    status: 'active',
    address: 'ميدان لبنان، المهندسين'
  },
  {
    id: 'loc-transit',
    code: 'VIRT-TRANSIT',
    name: 'بضاعة بالطريق (تحويلات معلقة)',
    type: 'in_transit',
    status: 'active',
    address: 'موقع افتراضي لشحنات النقل بين الفروع'
  },
  {
    id: 'loc-damaged',
    code: 'VIRT-DAMAGED',
    name: 'مخزن التوالف والهوالك',
    type: 'damaged',
    status: 'active',
    address: 'موقع افتراضي لعزل المرتجعات التالفة'
  },
  {
    id: 'loc-quarantine',
    code: 'VIRT-QUARANTINE',
    name: 'مستودع حجر الفحص',
    type: 'quarantine',
    status: 'active',
    address: 'موقع افتراضي للقطع تحت الفحص وإعادة التقييم'
  }
];

export const INITIAL_SUPPLIERS: Supplier[] = [
  {
    id: 'sup-1',
    code: 'SUP-001',
    name: 'شركة النسيج والملابس الراقية (المحلة)',
    contact_info: 'المهندس رامي فؤاد',
    phone: '01001234567',
    status: 'active'
  },
  {
    id: 'sup-2',
    code: 'SUP-002',
    name: 'مؤسسة الأناقة الإيطالية للأقمشة',
    contact_info: 'الأستاذ وائل عثمان',
    phone: '01119876543',
    status: 'active'
  },
  {
    id: 'sup-3',
    code: 'SUP-003',
    name: 'مصنع الشرق للأزياء الجاهزة',
    contact_info: 'الحاج مجدي النمر',
    phone: '01224567890',
    status: 'active'
  }
];

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-suit-101',
    model_code: 'MOD-SUIT-101',
    name: 'بدلة رجالي كلاسيك سليم فيت',
    category_id: 'cat-suits',
    description: 'بدلة صوف تركي ممتاز مبطنة 2 زرار مناسبة للعمل والمناسبات',
    status: 'active',
    created_at: '2026-01-10T09:00:00Z'
  },
  {
    id: 'prod-shirt-202',
    model_code: 'MOD-SHIRT-202',
    name: 'قميص أكسفورد قطن مصري 100%',
    category_id: 'cat-shirts',
    description: 'قميص كاجوال كلاسيك مريح مقاوم للتجعد بأزرار صدفي',
    status: 'active',
    created_at: '2026-01-12T10:00:00Z'
  },
  {
    id: 'prod-trouser-303',
    model_code: 'MOD-TROUSER-303',
    name: 'بنطلون جبردين استرتش سليم',
    category_id: 'cat-trousers',
    description: 'جبردين معالج مرن عالي التحمل بقصة عصرية',
    status: 'active',
    created_at: '2026-01-15T11:00:00Z'
  },
  {
    id: 'prod-abaya-404',
    model_code: 'MOD-ABAYA-404',
    name: 'عباية خليجي كريب ملكي مطرزة',
    category_id: 'cat-dresses',
    description: 'كريب أسود فاحم مع تطريز يدوي على الأكمام',
    status: 'active',
    created_at: '2026-01-20T12:00:00Z'
  }
];

export const INITIAL_VARIANTS: ProductVariant[] = [
  {
    id: 'var-suit-nvy-42',
    product_id: 'prod-suit-101',
    color_id: 'clr-navy',
    color_name: 'كحلي داكن',
    size_id: 'sz-42',
    size_name: '42',
    sku: 'SUIT-NVY-42',
    barcode: '622100100420',
    selling_price: 580,
    min_reorder_level: 20,
    status: 'active'
  },
  {
    id: 'var-suit-nvy-44',
    product_id: 'prod-suit-101',
    color_id: 'clr-navy',
    color_name: 'كحلي داكن',
    size_id: 'sz-44',
    size_name: '44',
    sku: 'SUIT-NVY-44',
    barcode: '622100100444',
    selling_price: 580,
    min_reorder_level: 15,
    status: 'active'
  },
  {
    id: 'var-suit-blk-42',
    product_id: 'prod-suit-101',
    color_id: 'clr-black',
    color_name: 'أسود ملكي',
    size_id: 'sz-42',
    size_name: '42',
    sku: 'SUIT-BLK-42',
    barcode: '622100100421',
    selling_price: 580,
    min_reorder_level: 20,
    status: 'active'
  },
  {
    id: 'var-shirt-wht-m',
    product_id: 'prod-shirt-202',
    color_id: 'clr-white',
    color_name: 'أبيض ناصع',
    size_id: 'sz-m',
    size_name: 'M',
    sku: 'SHIRT-WHT-M',
    barcode: '622200200101',
    selling_price: 240,
    min_reorder_level: 25,
    status: 'active'
  },
  {
    id: 'var-shirt-wht-l',
    product_id: 'prod-shirt-202',
    color_id: 'clr-white',
    color_name: 'أبيض ناصع',
    size_id: 'sz-l',
    size_name: 'L',
    sku: 'SHIRT-WHT-L',
    barcode: '622200200102',
    selling_price: 240,
    min_reorder_level: 30,
    status: 'active'
  },
  {
    id: 'var-shirt-blu-l',
    product_id: 'prod-shirt-202',
    color_id: 'clr-blue',
    color_name: 'سماوي فاتح',
    size_id: 'sz-l',
    size_name: 'L',
    sku: 'SHIRT-BLU-L',
    barcode: '622200200202',
    selling_price: 240,
    min_reorder_level: 20,
    status: 'active'
  },
  {
    id: 'var-trouser-beg-34',
    product_id: 'prod-trouser-303',
    color_id: 'clr-beige',
    color_name: 'بيج كلاسيك',
    size_id: 'sz-34',
    size_name: '34',
    sku: 'TROUSER-BEG-34',
    barcode: '622300300340',
    selling_price: 320,
    min_reorder_level: 15,
    status: 'active'
  },
  {
    id: 'var-trouser-blk-34',
    product_id: 'prod-trouser-303',
    color_id: 'clr-black',
    color_name: 'أسود فحمي',
    size_id: 'sz-34',
    size_name: '34',
    sku: 'TROUSER-BLK-34',
    barcode: '622300300341',
    selling_price: 320,
    min_reorder_level: 15,
    status: 'active'
  },
  {
    id: 'var-abaya-blk-56',
    product_id: 'prod-abaya-404',
    color_id: 'clr-black',
    color_name: 'أسود مطرز',
    size_id: 'sz-56',
    size_name: '56',
    sku: 'ABAYA-BLK-56',
    barcode: '622400400560',
    selling_price: 750,
    min_reorder_level: 10,
    status: 'active'
  }
];

// Active FIFO Cost Lots
export const INITIAL_LOTS: InventoryLot[] = [
  // Central warehouse batches
  {
    id: 'lot-suit-001',
    variant_id: 'var-suit-nvy-42',
    location_id: 'loc-central',
    source_doc_id: 'PO-2026-001',
    source_line_id: 'POL-001-A',
    original_qty: 100,
    remaining_qty: 60, // 25 moved to Maadi, 15 in transit
    unit_cost: 300,
    created_at: '2026-01-05T08:00:00Z'
  },
  {
    id: 'lot-suit-002',
    variant_id: 'var-suit-nvy-42',
    location_id: 'loc-central',
    source_doc_id: 'PO-2026-002',
    source_line_id: 'POL-002-A',
    original_qty: 80,
    remaining_qty: 80,
    unit_cost: 340,
    created_at: '2026-01-18T09:30:00Z'
  },
  // In-Transit virtual location lot (pending transfer TR-2026-003)
  {
    id: 'lot-suit-transit-003',
    variant_id: 'var-suit-nvy-42',
    location_id: 'loc-transit',
    source_doc_id: 'TR-2026-003',
    source_line_id: 'TRL-003-A',
    original_qty: 15,
    remaining_qty: 15,
    unit_cost: 300,
    created_at: '2026-01-05T08:00:00Z'
  },
  // Maadi branch inventory lots
  {
    id: 'lot-suit-maadi-001',
    variant_id: 'var-suit-nvy-42',
    location_id: 'loc-maadi',
    source_doc_id: 'TR-2026-001',
    source_line_id: 'TRL-001-A',
    original_qty: 25,
    remaining_qty: 22, // 3 sold
    unit_cost: 300,
    created_at: '2026-01-05T08:00:00Z'
  },
  {
    id: 'lot-shirt-wht-l-001',
    variant_id: 'var-shirt-wht-l',
    location_id: 'loc-central',
    source_doc_id: 'PO-2026-003',
    source_line_id: 'POL-003-A',
    original_qty: 150,
    remaining_qty: 110,
    unit_cost: 110,
    created_at: '2026-01-10T11:00:00Z'
  },
  {
    id: 'lot-shirt-wht-l-maadi',
    variant_id: 'var-shirt-wht-l',
    location_id: 'loc-maadi',
    source_doc_id: 'TR-2026-002',
    source_line_id: 'TRL-002-A',
    original_qty: 40,
    remaining_qty: 37, // 3 sold
    unit_cost: 110,
    created_at: '2026-01-10T11:00:00Z'
  },
  {
    id: 'lot-trouser-beg-34-001',
    variant_id: 'var-trouser-beg-34',
    location_id: 'loc-central',
    source_doc_id: 'PO-2026-004',
    source_line_id: 'POL-004-A',
    original_qty: 60,
    remaining_qty: 60,
    unit_cost: 155,
    created_at: '2026-01-12T10:00:00Z'
  },
  {
    id: 'lot-abaya-blk-56-001',
    variant_id: 'var-abaya-blk-56',
    location_id: 'loc-central',
    source_doc_id: 'PO-2026-005',
    source_line_id: 'POL-005-A',
    original_qty: 35,
    remaining_qty: 35,
    unit_cost: 380,
    created_at: '2026-01-15T15:00:00Z'
  }
];

// Initial Stock Balances
export const INITIAL_BALANCES: StockBalance[] = [
  // SUIT-NVY-42
  {
    variant_id: 'var-suit-nvy-42',
    location_id: 'loc-central',
    on_hand_qty: 140, // 60 + 80
    reserved_qty: 0,
    last_updated: '2026-01-20T10:00:00Z'
  },
  {
    variant_id: 'var-suit-nvy-42',
    location_id: 'loc-maadi',
    on_hand_qty: 22,
    reserved_qty: 0,
    last_updated: '2026-01-20T10:00:00Z'
  },
  {
    variant_id: 'var-suit-nvy-42',
    location_id: 'loc-transit',
    on_hand_qty: 15,
    reserved_qty: 0,
    last_updated: '2026-01-21T11:00:00Z'
  },
  // SHIRT-WHT-L
  {
    variant_id: 'var-shirt-wht-l',
    location_id: 'loc-central',
    on_hand_qty: 110,
    reserved_qty: 0,
    last_updated: '2026-01-10T11:00:00Z'
  },
  {
    variant_id: 'var-shirt-wht-l',
    location_id: 'loc-maadi',
    on_hand_qty: 37,
    reserved_qty: 0,
    last_updated: '2026-01-20T12:00:00Z'
  },
  // TROUSER-BEG-34
  {
    variant_id: 'var-trouser-beg-34',
    location_id: 'loc-central',
    on_hand_qty: 60,
    reserved_qty: 0,
    last_updated: '2026-01-12T10:00:00Z'
  },
  // ABAYA-BLK-56
  {
    variant_id: 'var-abaya-blk-56',
    location_id: 'loc-central',
    on_hand_qty: 35,
    reserved_qty: 0,
    last_updated: '2026-01-15T15:00:00Z'
  }
];

// Initial Purchase Documents
export const INITIAL_PURCHASES: PurchaseDocument[] = [
  {
    id: 'pdoc-001',
    doc_no: 'PO-2026-001',
    supplier_id: 'sup-1',
    invoice_no: 'INV-SUP-8821',
    date: '2026-01-05T08:00:00Z',
    destination_location_id: 'loc-central',
    status: 'received_full',
    total_amount: 30000,
    created_by: 'أحمد مكرم (مدير النظام)',
    created_at: '2026-01-05T08:00:00Z',
    notes: 'استلام دفعة شراء 100 بدلة رجالي كحلي بتكلفة 300 ج'
  },
  {
    id: 'pdoc-002',
    doc_no: 'PO-2026-002',
    supplier_id: 'sup-1',
    invoice_no: 'INV-SUP-8910',
    date: '2026-01-18T09:30:00Z',
    destination_location_id: 'loc-central',
    status: 'received_full',
    total_amount: 27200,
    created_by: 'أحمد مكرم (مدير النظام)',
    created_at: '2026-01-18T09:30:00Z',
    notes: 'استلام دفعة شراء ثانية 80 بدلة بتكلفة 340 ج'
  },
  {
    id: 'pdoc-003',
    doc_no: 'PO-2026-003',
    supplier_id: 'sup-2',
    invoice_no: 'INV-SUP-9004',
    date: '2026-01-10T11:00:00Z',
    destination_location_id: 'loc-central',
    status: 'received_full',
    total_amount: 16500,
    created_by: 'أحمد مكرم (مدير النظام)',
    created_at: '2026-01-10T11:00:00Z',
    notes: 'استلام 150 قميص أكسفورد قطن مصري'
  }
];

export const INITIAL_PURCHASE_LINES: PurchaseLine[] = [
  {
    id: 'pline-001',
    document_id: 'pdoc-001',
    variant_id: 'var-suit-nvy-42',
    qty: 100,
    received_qty: 100,
    unit_cost: 300,
    total_cost: 30000
  },
  {
    id: 'pline-002',
    document_id: 'pdoc-002',
    variant_id: 'var-suit-nvy-42',
    qty: 80,
    received_qty: 80,
    unit_cost: 340,
    total_cost: 27200
  },
  {
    id: 'pline-003',
    document_id: 'pdoc-003',
    variant_id: 'var-shirt-wht-l',
    qty: 150,
    received_qty: 150,
    unit_cost: 110,
    total_cost: 16500
  }
];

// Initial Transfers (Completed & In-Transit)
export const INITIAL_TRANSFERS: TransferDocument[] = [
  {
    id: 'tr-001',
    transfer_no: 'TR-2026-001',
    source_location_id: 'loc-central',
    destination_location_id: 'loc-maadi',
    status: 'received_full',
    dispatched_at: '2026-01-06T10:00:00Z',
    received_at: '2026-01-06T14:00:00Z',
    created_by: 'محمود عبد الله (إدارة المخزون)',
    received_by: 'سارة إبراهيم (كاشير مبيعات)',
    notes: 'تحويل بضاعة افتتاحية لفرع المعادي'
  },
  {
    id: 'tr-002',
    transfer_no: 'TR-2026-002',
    source_location_id: 'loc-central',
    destination_location_id: 'loc-maadi',
    status: 'received_full',
    dispatched_at: '2026-01-11T09:00:00Z',
    received_at: '2026-01-11T12:00:00Z',
    created_by: 'محمود عبد الله (إدارة المخزون)',
    received_by: 'سارة إبراهيم (كاشير مبيعات)',
    notes: 'تحويل قمصان قطن لفرع المعادي'
  },
  {
    id: 'tr-003',
    transfer_no: 'TR-2026-003',
    source_location_id: 'loc-central',
    destination_location_id: 'loc-nasrcity',
    status: 'in_transit', // In transit pending destination confirmation
    dispatched_at: '2026-01-21T11:00:00Z',
    created_by: 'محمود عبد الله (إدارة المخزون)',
    notes: 'شحنة جارية بالطريق إلى فرع مدينة نصر (جاهزة لتأكيد الاستلام)'
  }
];

export const INITIAL_TRANSFER_LINES: TransferLine[] = [
  {
    id: 'trline-001',
    transfer_id: 'tr-001',
    variant_id: 'var-suit-nvy-42',
    dispatched_qty: 25,
    received_qty: 25,
    variance_qty: 0
  },
  {
    id: 'trline-002',
    transfer_id: 'tr-002',
    variant_id: 'var-shirt-wht-l',
    dispatched_qty: 40,
    received_qty: 40,
    variance_qty: 0
  },
  {
    id: 'trline-003',
    transfer_id: 'tr-003',
    variant_id: 'var-suit-nvy-42',
    dispatched_qty: 15,
    received_qty: 0,
    variance_qty: 15,
    notes: 'شحنة بالطريق'
  }
];

// Initial Sales Invoices with FIFO Profit allocations
export const INITIAL_SALES: SalesDocument[] = [
  {
    id: 'sale-001',
    invoice_no: 'INV-2026-001',
    branch_id: 'loc-maadi',
    customer_name: 'م. إيهاب سلامة',
    source_system: 'new_pos',
    status: 'completed',
    total_amount: 1160,
    total_cost_fifo: 600, // 2 @ 300
    net_profit: 560,
    date: '2026-01-20T14:30:00Z',
    created_by: 'سارة إبراهيم (كاشير مبيعات)'
  },
  {
    id: 'sale-002',
    invoice_no: 'INV-2026-002',
    branch_id: 'loc-maadi',
    customer_name: 'د. هاني خليل',
    source_system: 'new_pos',
    status: 'completed',
    total_amount: 720,
    total_cost_fifo: 330, // 3 @ 110
    net_profit: 390,
    date: '2026-01-20T16:15:00Z',
    created_by: 'سارة إبراهيم (كاشير مبيعات)'
  },
  {
    id: 'sale-003',
    invoice_no: 'INV-2026-003',
    branch_id: 'loc-maadi',
    customer_name: 'أ. عمرو شكري',
    source_system: 'new_pos',
    status: 'completed',
    total_amount: 580,
    total_cost_fifo: 300,
    net_profit: 280,
    date: '2026-01-21T10:00:00Z',
    created_by: 'سارة إبراهيم (كاشير مبيعات)'
  }
];

export const INITIAL_SALES_LINES: SalesLine[] = [
  {
    id: 'sline-001',
    document_id: 'sale-001',
    variant_id: 'var-suit-nvy-42',
    qty: 2,
    selling_price: 580,
    total_price: 1160,
    returned_qty: 0
  },
  {
    id: 'sline-002',
    document_id: 'sale-002',
    variant_id: 'var-shirt-wht-l',
    qty: 3,
    selling_price: 240,
    total_price: 720,
    returned_qty: 0
  },
  {
    id: 'sline-003',
    document_id: 'sale-003',
    variant_id: 'var-suit-nvy-42',
    qty: 1,
    selling_price: 580,
    total_price: 580,
    returned_qty: 0
  }
];

export const INITIAL_SALE_ALLOCATIONS: SaleLotAllocation[] = [
  {
    id: 'alloc-001',
    sales_line_id: 'sline-001',
    variant_id: 'var-suit-nvy-42',
    lot_id: 'lot-suit-maadi-001',
    qty: 2,
    unit_cost: 300
  },
  {
    id: 'alloc-002',
    sales_line_id: 'sline-002',
    variant_id: 'var-shirt-wht-l',
    lot_id: 'lot-shirt-wht-l-maadi',
    qty: 3,
    unit_cost: 110
  },
  {
    id: 'alloc-003',
    sales_line_id: 'sline-003',
    variant_id: 'var-suit-nvy-42',
    lot_id: 'lot-suit-maadi-001',
    qty: 1,
    unit_cost: 300
  }
];

// Initial Stocktake Session with Blind Count active
export const INITIAL_STOCKTAKES: StocktakeSession[] = [
  {
    id: 'stk-001',
    session_no: 'STK-2026-001',
    location_id: 'loc-maadi',
    scope: 'full',
    status: 'counting',
    blind_count: true,
    opened_at: '2026-01-21T08:30:00Z',
    opened_by: 'كريم عادل (مراقب الجرد والتسويات)'
  }
];

export const INITIAL_STOCKTAKE_LINES: StocktakeLine[] = [
  {
    id: 'stkline-001',
    session_id: 'stk-001',
    variant_id: 'var-suit-nvy-42',
    expected_qty: 22,
    counted_qty: 22,
    variance_qty: 0,
    unit_cost: 300,
    variance_cost: 0,
    is_recounted: false
  },
  {
    id: 'stkline-002',
    session_id: 'stk-001',
    variant_id: 'var-shirt-wht-l',
    expected_qty: 37,
    counted_qty: 36, // 1 shortage for testing recount
    variance_qty: -1,
    unit_cost: 110,
    variance_cost: -110,
    is_recounted: false
  }
];

// Initial Documents & Ledger Movements
export const INITIAL_DOCUMENTS: StockDocument[] = [
  {
    id: 'doc-init-po-01',
    doc_no: 'PO-2026-001',
    type: 'purchase_receipt',
    destination_location_id: 'loc-central',
    status: 'completed',
    notes: 'استلام شراء دفعة افتتاحية بدل صوف',
    created_by: 'أحمد مكرم (مدير النظام)',
    approved_by: 'أحمد مكرم (مدير النظام)',
    created_at: '2026-01-05T08:00:00Z'
  },
  {
    id: 'doc-init-po-02',
    doc_no: 'PO-2026-002',
    type: 'purchase_receipt',
    destination_location_id: 'loc-central',
    status: 'completed',
    notes: 'استلام شراء دفعة تكميلية بتكلفة 340 ج',
    created_by: 'أحمد مكرم (مدير النظام)',
    approved_by: 'أحمد مكرم (مدير النظام)',
    created_at: '2026-01-18T09:30:00Z'
  },
  {
    id: 'doc-init-po-03',
    doc_no: 'PO-2026-003',
    type: 'purchase_receipt',
    destination_location_id: 'loc-central',
    status: 'completed',
    notes: 'استلام قمصان قطن مصري فاخر',
    created_by: 'أحمد مكرم (مدير النظام)',
    approved_by: 'أحمد مكرم (مدير النظام)',
    created_at: '2026-01-10T11:00:00Z'
  },
  {
    id: 'doc-init-tr-01',
    doc_no: 'TR-2026-001',
    type: 'transfer_dispatch',
    source_location_id: 'loc-central',
    destination_location_id: 'loc-maadi',
    status: 'completed',
    notes: 'تحويل بضاعة لفرع المعادي',
    created_by: 'محمود عبد الله (إدارة المخزون)',
    approved_by: 'سارة إبراهيم (كاشير مبيعات)',
    created_at: '2026-01-06T10:00:00Z'
  },
  {
    id: 'doc-init-tr-03',
    doc_no: 'TR-2026-003',
    type: 'transfer_dispatch',
    source_location_id: 'loc-central',
    destination_location_id: 'loc-transit',
    status: 'pending_transit',
    notes: 'شحن بضاعة بالطريق إلى فرع مدينة نصر',
    created_by: 'محمود عبد الله (إدارة المخزون)',
    created_at: '2026-01-21T11:00:00Z'
  },
  {
    id: 'doc-init-sale-01',
    doc_no: 'INV-2026-001',
    type: 'sales_deduction',
    source_location_id: 'loc-maadi',
    status: 'completed',
    notes: 'فاتورة مبيعات فرع المعادي',
    created_by: 'سارة إبراهيم (كاشير مبيعات)',
    created_at: '2026-01-20T14:30:00Z'
  }
];

export const INITIAL_MOVEMENTS: StockMovement[] = [
  {
    id: 'mov-init-001',
    document_id: 'doc-init-po-01',
    variant_id: 'var-suit-nvy-42',
    location_id: 'loc-central',
    qty_delta: 100,
    lot_id: 'lot-suit-001',
    unit_cost: 300,
    balance_after: 100,
    notes: 'شراء دفعة 100 قطعة بتكلفة 300 ج',
    created_at: '2026-01-05T08:00:00Z'
  },
  {
    id: 'mov-init-002',
    document_id: 'doc-init-po-02',
    variant_id: 'var-suit-nvy-42',
    location_id: 'loc-central',
    qty_delta: 80,
    lot_id: 'lot-suit-002',
    unit_cost: 340,
    balance_after: 180,
    notes: 'شراء دفعة 80 قطعة بتكلفة 340 ج',
    created_at: '2026-01-18T09:30:00Z'
  },
  {
    id: 'mov-init-003',
    document_id: 'doc-init-tr-01',
    variant_id: 'var-suit-nvy-42',
    location_id: 'loc-central',
    qty_delta: -25,
    unit_cost: 300,
    balance_after: 155,
    notes: 'شحن تحويل إلى فرع المعادي',
    created_at: '2026-01-06T10:00:00Z'
  },
  {
    id: 'mov-init-004',
    document_id: 'doc-init-tr-01',
    variant_id: 'var-suit-nvy-42',
    location_id: 'loc-maadi',
    qty_delta: 25,
    unit_cost: 300,
    balance_after: 25,
    notes: 'استلام تحويل في فرع المعادي',
    created_at: '2026-01-06T14:00:00Z'
  },
  {
    id: 'mov-init-005',
    document_id: 'doc-init-tr-03',
    variant_id: 'var-suit-nvy-42',
    location_id: 'loc-central',
    qty_delta: -15,
    unit_cost: 300,
    balance_after: 140,
    notes: 'شحن تحويل إلى بضاعة بالطريق',
    created_at: '2026-01-21T11:00:00Z'
  },
  {
    id: 'mov-init-006',
    document_id: 'doc-init-tr-03',
    variant_id: 'var-suit-nvy-42',
    location_id: 'loc-transit',
    qty_delta: 15,
    unit_cost: 300,
    balance_after: 15,
    notes: 'دخول شحنة بضاعة بالطريق',
    created_at: '2026-01-21T11:00:00Z'
  },
  {
    id: 'mov-init-007',
    document_id: 'doc-init-sale-01',
    variant_id: 'var-suit-nvy-42',
    location_id: 'loc-maadi',
    qty_delta: -2,
    unit_cost: 300,
    balance_after: 23,
    notes: 'مبيعات فاتورة INV-2026-001',
    created_at: '2026-01-20T14:30:00Z'
  },
  {
    id: 'mov-init-008',
    document_id: 'doc-init-sale-01',
    variant_id: 'var-suit-nvy-42',
    location_id: 'loc-maadi',
    qty_delta: -1,
    unit_cost: 300,
    balance_after: 22,
    notes: 'مبيعات فاتورة INV-2026-003',
    created_at: '2026-01-21T10:00:00Z'
  },
  {
    id: 'mov-init-009',
    document_id: 'doc-init-po-03',
    variant_id: 'var-shirt-wht-l',
    location_id: 'loc-central',
    qty_delta: 150,
    lot_id: 'lot-shirt-wht-l-001',
    unit_cost: 110,
    balance_after: 150,
    notes: 'شراء قمصان قطن مصري',
    created_at: '2026-01-10T11:00:00Z'
  },
  {
    id: 'mov-init-010',
    document_id: 'doc-init-po-03',
    variant_id: 'var-shirt-wht-l',
    location_id: 'loc-central',
    qty_delta: -40,
    unit_cost: 110,
    balance_after: 110,
    notes: 'تحويل لفرع المعادي',
    created_at: '2026-01-11T09:00:00Z'
  },
  {
    id: 'mov-init-011',
    document_id: 'doc-init-po-03',
    variant_id: 'var-shirt-wht-l',
    location_id: 'loc-maadi',
    qty_delta: 40,
    unit_cost: 110,
    balance_after: 40,
    notes: 'استلام بالمعادي',
    created_at: '2026-01-11T12:00:00Z'
  },
  {
    id: 'mov-init-012',
    document_id: 'doc-init-sale-01',
    variant_id: 'var-shirt-wht-l',
    location_id: 'loc-maadi',
    qty_delta: -3,
    unit_cost: 110,
    balance_after: 37,
    notes: 'مبيعات فاتورة INV-2026-002',
    created_at: '2026-01-20T16:15:00Z'
  },
  {
    id: 'mov-init-013',
    document_id: 'doc-init-po-01',
    variant_id: 'var-trouser-beg-34',
    location_id: 'loc-central',
    qty_delta: 60,
    lot_id: 'lot-trouser-beg-34-001',
    unit_cost: 155,
    balance_after: 60,
    notes: 'شراء بنطلون جبردين بيج',
    created_at: '2026-01-12T10:00:00Z'
  },
  {
    id: 'mov-init-014',
    document_id: 'doc-init-po-01',
    variant_id: 'var-abaya-blk-56',
    location_id: 'loc-central',
    qty_delta: 35,
    lot_id: 'lot-abaya-blk-56-001',
    unit_cost: 380,
    balance_after: 35,
    notes: 'شراء عباية كريب خليجي',
    created_at: '2026-01-15T15:00:00Z'
  }
];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'log-001',
    user_id: 'user-admin',
    user_name: 'أحمد مكرم (مدير النظام)',
    action: 'RECEIVE_PURCHASE',
    entity_type: 'purchase',
    entity_id: 'pdoc-001',
    details: 'استلام فاتورة شراء INV-SUP-8821 لعدد 100 بدلة @ 300 ج.م بالمخزن الرئيسي',
    timestamp: '2026-01-05T08:00:00Z'
  },
  {
    id: 'log-002',
    user_id: 'user-inventory',
    user_name: 'محمود عبد الله (إدارة المخزون)',
    action: 'DISPATCH_TRANSFER',
    entity_type: 'transfer',
    entity_id: 'tr-001',
    details: 'شحن إذن تحويل TR-2026-001 لفرع المعادي لعدد 25 بدلة كحلي',
    timestamp: '2026-01-06T10:00:00Z'
  },
  {
    id: 'log-003',
    user_id: 'user-cashier',
    user_name: 'سارة إبراهيم (كاشير مبيعات)',
    action: 'CONFIRM_TRANSFER',
    entity_type: 'transfer',
    entity_id: 'tr-001',
    details: 'تأكيد استلام وفحص 25 بدلة كحلي بفرع المعادي مطابقة تامة',
    timestamp: '2026-01-06T14:00:00Z'
  },
  {
    id: 'log-004',
    user_id: 'user-admin',
    user_name: 'أحمد مكرم (مدير النظام)',
    action: 'RECEIVE_PURCHASE',
    entity_type: 'purchase',
    entity_id: 'pdoc-002',
    details: 'استلام دفعة شراء ثانية INV-SUP-8910 لعدد 80 بدلة @ 340 ج.م',
    timestamp: '2026-01-18T09:30:00Z'
  },
  {
    id: 'log-005',
    user_id: 'user-cashier',
    user_name: 'سارة إبراهيم (كاشير مبيعات)',
    action: 'PROCESS_SALE',
    entity_type: 'sale',
    entity_id: 'sale-001',
    details: 'اعتماد فاتورة بيع INV-2026-001 بقيمة 1,160 ج.م (تخصيص تكلفة FIFO: 600 ج.م)',
    timestamp: '2026-01-20T14:30:00Z'
  },
  {
    id: 'log-006',
    user_id: 'user-inventory',
    user_name: 'محمود عبد الله (إدارة المخزون)',
    action: 'DISPATCH_TRANSFER',
    entity_type: 'transfer',
    entity_id: 'tr-003',
    details: 'شحن 15 بدلة كحلي من المخزن الرئيسي إلى بضاعة بالطريق نحو فرع مدينة نصر',
    timestamp: '2026-01-21T11:00:00Z'
  },
  {
    id: 'log-007',
    user_id: 'user-auditor',
    user_name: 'كريم عادل (مراقب الجرد والتسويات)',
    action: 'START_STOCKTAKE',
    entity_type: 'stocktake',
    entity_id: 'stk-001',
    details: 'بدء جلسة جرد شامل STK-2026-001 بفرع المعادي مع تفعيل العد الأعمى',
    timestamp: '2026-01-21T08:30:00Z'
  }
];
