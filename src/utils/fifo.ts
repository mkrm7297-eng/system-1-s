/**
 * FIFO (First-In, First-Out) Cost Calculation & Lot Allocation Engine
 * As specified in Section 4.1 of the approved document:
 * "كل استلام شراء معتمد ينشئ دفعة تكلفة. وعند البيع، يخصص النظام الكمية المباعة
 *  على أقدم الدفعات المتاحة للصنف في الموقع وفق FIFO."
 */

import { InventoryLot, SaleLotAllocation, StockMovement } from '../types';

export interface FifoAllocationResult {
  allocations: {
    lot_id: string;
    qty: number;
    unit_cost: number;
    total_cost: number;
  }[];
  total_fifo_cost: number;
  average_unit_cost: number;
  is_fully_covered: boolean;
  shortage_qty: number;
  updatedLots: InventoryLot[];
}

/**
 * Calculates FIFO allocation for a required quantity of a variant at a specific location
 */
export function allocateFifoLots(
  variantId: string,
  locationId: string,
  requiredQty: number,
  allLots: InventoryLot[],
  allowNegativeStock: boolean = false,
  fallbackCost: number = 0
): FifoAllocationResult {
  // 1. Filter lots matching variant and location with remaining_qty > 0
  // 2. Sort ascending by created_at (oldest lot first)
  const availableLots = allLots
    .filter(lot => lot.variant_id === variantId && lot.location_id === locationId && lot.remaining_qty > 0)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  let remainingNeeded = requiredQty;
  let totalCost = 0;
  const allocations: {
    lot_id: string;
    qty: number;
    unit_cost: number;
    total_cost: number;
  }[] = [];

  // Deep clone lots to simulate state
  const updatedLots = allLots.map(l => ({ ...l }));

  for (const lot of availableLots) {
    if (remainingNeeded <= 0) break;

    const lotInState = updatedLots.find(l => l.id === lot.id);
    if (!lotInState || lotInState.remaining_qty <= 0) continue;

    const takeQty = Math.min(lotInState.remaining_qty, remainingNeeded);
    const lineCost = takeQty * lotInState.unit_cost;

    lotInState.remaining_qty -= takeQty;
    remainingNeeded -= takeQty;
    totalCost += lineCost;

    allocations.push({
      lot_id: lotInState.id,
      qty: takeQty,
      unit_cost: lotInState.unit_cost,
      total_cost: lineCost
    });
  }

  const is_fully_covered = remainingNeeded <= 0;
  const shortage_qty = remainingNeeded > 0 ? remainingNeeded : 0;

  // If there is shortage and negative stock is allowed with supervisor override
  if (!is_fully_covered && allowNegativeStock) {
    // Determine cost for negative allocation (use last known cost in available lots, or fallbackCost)
    const lastLot = availableLots[availableLots.length - 1];
    const unitCost = lastLot ? lastLot.unit_cost : (fallbackCost > 0 ? fallbackCost : 0);
    const deficitCost = shortage_qty * unitCost;

    allocations.push({
      lot_id: 'NEGATIVE_DEFICIT_OVERRIDE',
      qty: shortage_qty,
      unit_cost: unitCost,
      total_cost: deficitCost
    });
    totalCost += deficitCost;
  }

  const allocatedQty = requiredQty - (is_fully_covered || allowNegativeStock ? 0 : shortage_qty);
  const average_unit_cost = allocatedQty > 0 ? totalCost / allocatedQty : 0;

  return {
    allocations,
    total_fifo_cost: Math.round(totalCost * 100) / 100,
    average_unit_cost: Math.round(average_unit_cost * 100) / 100,
    is_fully_covered,
    shortage_qty,
    updatedLots
  };
}

/**
 * Transfers lots from source location to destination location (via in_transit)
 * Preserves original purchase lot identity, creation timestamp, and original unit cost!
 */
export function transferFifoLots(
  variantId: string,
  sourceLocationId: string,
  targetLocationId: string,
  qtyToTransfer: number,
  allLots: InventoryLot[]
): { updatedLots: InventoryLot[]; transferredCost: number; success: boolean } {
  const sourceLots = allLots
    .filter(l => l.variant_id === variantId && l.location_id === sourceLocationId && l.remaining_qty > 0)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  let remaining = qtyToTransfer;
  let totalCost = 0;
  const updatedLots = allLots.map(l => ({ ...l }));

  for (const src of sourceLots) {
    if (remaining <= 0) break;
    const lotInState = updatedLots.find(l => l.id === src.id);
    if (!lotInState || lotInState.remaining_qty <= 0) continue;

    const takeQty = Math.min(lotInState.remaining_qty, remaining);
    lotInState.remaining_qty -= takeQty;
    remaining -= takeQty;
    totalCost += takeQty * lotInState.unit_cost;

    // Check if target location already has a segment of this lot or create a transferred lot segment
    const existingTargetLot = updatedLots.find(
      l => l.source_line_id === lotInState.source_line_id && l.location_id === targetLocationId && l.unit_cost === lotInState.unit_cost
    );

    if (existingTargetLot) {
      existingTargetLot.remaining_qty += takeQty;
      existingTargetLot.original_qty += takeQty;
    } else {
      updatedLots.push({
        id: `LOT-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        variant_id: variantId,
        location_id: targetLocationId,
        source_doc_id: lotInState.source_doc_id,
        source_line_id: lotInState.source_line_id,
        original_qty: takeQty,
        remaining_qty: takeQty,
        unit_cost: lotInState.unit_cost,
        created_at: lotInState.created_at // retain original acquisition date for FIFO consistency
      });
    }
  }

  return {
    updatedLots,
    transferredCost: Math.round(totalCost * 100) / 100,
    success: remaining === 0
  };
}

/**
 * Reconstructs current stock balances per location and variant by summing movements
 * Used to verify database integrity (AT-14, AT-16)
 */
export function reconstructBalancesFromLedger(
  movements: StockMovement[]
): Record<string, number> {
  const balances: Record<string, number> = {};
  for (const mov of movements) {
    const key = `${mov.variant_id}__${mov.location_id}`;
    balances[key] = (balances[key] || 0) + mov.qty_delta;
  }
  return balances;
}
