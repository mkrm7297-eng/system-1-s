/**
 * Data Models & Specifications according to
 * "وثيقة المواصفات النهائية — الإصدار 1.0 (Clothing Inventory & POS Management)"
 */

export type UserRole =
  | 'admin'               // مدير النظام
  | 'inventory_manager'  // إدارة المخزون
  | 'cashier'            // المبيعات
  | 'auditor'            // الجرد
  | 'approver'           // اعتماد التسويات
  | 'supervisor_override'// السماح بالرصيد السالب
  | 'auditor_review';    // مراجعة السجل

export interface SystemUser {
  id: string;
  name: string;
  role: UserRole;
  permissions: {
    canManageSettings: boolean;
    canManageInventory: boolean;
    canMakeSales: boolean;
    canStocktake: boolean;
    canApproveDiscrepancies: boolean;
    canOverrideNegativeStock: boolean;
    canViewAuditLogs: boolean;
  };
}

export interface ProductCategory {
  id: string;
  name: string;
}

export interface Product {
  id: string;
  model_code: string; // كود الموديل
  name: string;       // اسم الموديل
  category_id: string;
  description?: string;
  status: 'active' | 'archived';
  created_at: string;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  color_id: string;
  color_name: string;
  size_id: string;
  size_name: string;
  sku: string;         // فريد
  barcode: string;     // Code 128 مستقل وفريد
  selling_price: number;
  min_reorder_level: number;
  status: 'active' | 'archived';
}

export type LocationType = 'central' | 'branch' | 'in_transit' | 'damaged' | 'quarantine';

export interface Location {
  id: string;
  code: string;
  name: string;
  type: LocationType;
  status: 'active' | 'inactive';
  address?: string;
}

export interface Supplier {
  id: string;
  code: string;
  name: string;
  contact_info: string;
  phone: string;
  status: 'active' | 'inactive';
}

// FIFO Cost Lot
export interface InventoryLot {
  id: string;
  variant_id: string;
  location_id: string;
  source_doc_id: string;
  source_line_id: string;
  original_qty: number;
  remaining_qty: number;
  unit_cost: number;
  created_at: string;
}

export interface StockBalance {
  variant_id: string;
  location_id: string;
  on_hand_qty: number;
  reserved_qty: number;
  last_updated: string;
}

export type StockDocType =
  | 'purchase_receipt'
  | 'transfer_dispatch'
  | 'transfer_receive'
  | 'stocktake_adjustment'
  | 'sales_deduction'
  | 'sales_return'
  | 'vendor_return'
  | 'damage_writeoff'
  | 'negative_stock_reconcile';

export interface StockDocument {
  id: string;
  doc_no: string;
  type: StockDocType;
  source_location_id?: string;
  destination_location_id?: string;
  status: 'draft' | 'pending_transit' | 'approved' | 'completed' | 'cancelled';
  notes?: string;
  created_by: string;
  approved_by?: string;
  supervisor_override_reason?: string;
  related_doc_id?: string;
  created_at: string;
}

export interface StockMovement {
  id: string;
  document_id: string;
  variant_id: string;
  location_id: string;
  qty_delta: number; // positive or negative
  lot_id?: string;
  unit_cost: number;
  balance_after: number;
  notes?: string;
  created_at: string;
}

// Purchasing
export interface PurchaseDocument {
  id: string;
  doc_no: string;
  supplier_id: string;
  invoice_no: string;
  date: string;
  destination_location_id: string;
  status: 'draft' | 'approved' | 'received_partial' | 'received_full' | 'cancelled';
  total_amount: number;
  created_by: string;
  created_at: string;
  notes?: string;
}

export interface PurchaseLine {
  id: string;
  document_id: string;
  variant_id: string;
  qty: number;
  received_qty: number;
  unit_cost: number;
  total_cost: number;
}

// Transfers
export interface TransferDocument {
  id: string;
  transfer_no: string;
  source_location_id: string;
  destination_location_id: string;
  status: 'draft' | 'in_transit' | 'received_full' | 'received_partial' | 'disputed' | 'cancelled';
  dispatched_at?: string;
  received_at?: string;
  created_by: string;
  received_by?: string;
  notes?: string;
}

export interface TransferLine {
  id: string;
  transfer_id: string;
  variant_id: string;
  dispatched_qty: number;
  received_qty: number;
  variance_qty: number; // dispatched_qty - received_qty
  notes?: string;
}

// Sales POS
export interface SalesDocument {
  id: string;
  invoice_no: string;
  branch_id: string;
  customer_name?: string;
  source_system: 'new_pos' | 'legacy_migration';
  external_id?: string; // To prevent duplicate legacy imports
  status: 'draft' | 'completed' | 'cancelled' | 'returned_partial' | 'returned_full';
  total_amount: number;
  total_cost_fifo: number;
  net_profit: number;
  date: string;
  created_by: string;
  has_negative_stock_exception?: boolean;
  negative_stock_reason?: string;
  negative_stock_approved_by?: string;
}

export interface SalesLine {
  id: string;
  document_id: string;
  variant_id: string;
  qty: number;
  selling_price: number;
  total_price: number;
  returned_qty: number;
}

export interface SaleLotAllocation {
  id: string;
  sales_line_id: string;
  variant_id: string;
  lot_id: string;
  qty: number;
  unit_cost: number;
}

// Customer Returns
export interface SalesReturnDocument {
  id: string;
  return_no: string;
  original_sales_doc_id: string;
  branch_id: string;
  date: string;
  status: 'completed';
  total_refund_amount: number;
  total_refund_cost: number;
  created_by: string;
  notes?: string;
}

export interface SalesReturnLine {
  id: string;
  return_id: string;
  sales_line_id: string;
  variant_id: string;
  qty: number;
  unit_refund_price: number;
  unit_cost_reversed: number;
  condition: 'good' | 'damaged' | 'quarantine';
  target_location_id: string;
}

// Stocktaking
export interface StocktakeSession {
  id: string;
  session_no: string;
  location_id: string;
  scope: 'full' | 'category' | 'selective';
  category_id?: string;
  status: 'open' | 'counting' | 'recounting' | 'reconciled' | 'cancelled';
  blind_count: boolean; // hide system expected qty from counters
  opened_at: string;
  closed_at?: string;
  opened_by: string;
  approved_by?: string;
  reconciliation_notes?: string;
}

export interface StocktakeLine {
  id: string;
  session_id: string;
  variant_id: string;
  expected_qty: number;
  counted_qty: number;
  recount_qty?: number;
  variance_qty: number; // counted_qty - expected_qty
  unit_cost: number;
  variance_cost: number;
  is_recounted: boolean;
  notes?: string;
}

// Audit Log
export interface AuditLog {
  id: string;
  user_id: string;
  user_name: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details: string;
  timestamp: string;
}

// Acceptance Test Result
export interface AcceptanceTestResult {
  code: string;
  name: string;
  acceptanceCriteria: string;
  status: 'idle' | 'running' | 'passed' | 'failed';
  inputs: Record<string, any>;
  expectedOutput: Record<string, any>;
  actualOutput?: Record<string, any>;
  logs: string[];
  durationMs?: number;
}
