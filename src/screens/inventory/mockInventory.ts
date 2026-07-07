// Local preview data only — no API calls. InventoryScreen is UI-first per the user's request
// (2026-07-04); real wiring against `src/api/inventory.ts` (GET /inventory, ready and committed)
// happens as a separate pass. See docs/decisions.md.
import type { InventoryItem } from '../../api/inventory'

export const MOCK_INVENTORY: InventoryItem[] = [
  { uuid: 'mock-1', product: { uuid: 'p-1', name: 'Arla Whole Milk 2L', sku: 'DAI-ARL-2L', category: 'dairy', costPrice: 1.5, sellPrice: 2.8, tax: 0, weight: 2, status: 'active' }, availableStock: 42, reservedStock: 6, createdAt: '2026-07-01T09:00:00Z', updatedAt: '2026-07-04T11:00:00Z' },
  { uuid: 'mock-2', product: { uuid: 'p-2', name: 'Lurpak Butter 250g', sku: 'DAI-LUR-250', category: 'dairy', costPrice: 2, sellPrice: 3.8, tax: 0, weight: 0.25, status: 'active' }, availableStock: 8, reservedStock: 2, createdAt: '2026-07-01T09:00:00Z', updatedAt: '2026-07-04T10:20:00Z' },
  { uuid: 'mock-3', product: { uuid: 'p-3', name: 'Nescafe Classic 200g', sku: 'GRO-NES-200', category: 'grocery', costPrice: 4, sellPrice: 7.5, tax: 5, weight: 0.2, status: 'active' }, availableStock: 0, reservedStock: 3, createdAt: '2026-07-01T09:00:00Z', updatedAt: '2026-07-04T09:40:00Z' },
  { uuid: 'mock-4', product: { uuid: 'p-4', name: 'Lays Classic 150g', sku: 'SNK-LAY-150', category: 'snacks', costPrice: 1.2, sellPrice: 2.5, tax: 5, weight: 0.15, status: 'active' }, availableStock: 63, reservedStock: 0, createdAt: '2026-07-01T09:00:00Z', updatedAt: '2026-07-03T18:00:00Z' },
  { uuid: 'mock-5', product: { uuid: 'p-5', name: 'Coca-Cola 1.5L', sku: 'BEV-COC-1.5', category: 'beverages', costPrice: 1.8, sellPrice: 3.2, tax: 5, weight: 1.5, status: 'active' }, availableStock: 5, reservedStock: 4, createdAt: '2026-07-01T09:00:00Z', updatedAt: '2026-07-04T12:10:00Z' },
  { uuid: 'mock-6', product: { uuid: 'p-6', name: 'Moleskine Classic Notebook A5', sku: 'OTH-MOL-A5', category: 'others', costPrice: 8, sellPrice: 16.99, tax: 12, weight: 0.2, status: 'active' }, availableStock: 19, reservedStock: 1, createdAt: '2026-07-01T09:00:00Z', updatedAt: '2026-07-02T15:00:00Z' },
  { uuid: 'mock-7', product: { uuid: 'p-7', name: 'Activia Strawberry Yogurt 4pk', sku: 'DAI-ACT-4PK', category: 'dairy', costPrice: 2, sellPrice: 3.8, tax: 0, weight: 0.5, status: 'active' }, availableStock: 27, reservedStock: 5, createdAt: '2026-07-01T09:00:00Z', updatedAt: '2026-07-04T08:30:00Z' },
  { uuid: 'mock-8', product: { uuid: 'p-8', name: 'Philadelphia Cream Cheese 200g', sku: 'DAI-PHI-200', category: 'dairy', costPrice: 1.8, sellPrice: 3.5, tax: 0, weight: 0.2, status: 'active' }, availableStock: 3, reservedStock: 0, createdAt: '2026-07-01T09:00:00Z', updatedAt: '2026-07-04T07:15:00Z' },
]

export type MovementType = 'initial' | 'reserved' | 'confirmed' | 'reverted' | 'expired'

export interface MovementEntry {
  uuid: string
  type: MovementType
  quantity: number
  note: string
  orderRef: string | null
  createdAt: string
  runningAvailable: number
  runningReserved: number
}

const STEP_TEMPLATE: Array<{ type: MovementType; note: string; hasOrder: boolean }> = [
  { type: 'reserved', note: 'reserved at checkout', hasOrder: true },
  { type: 'confirmed', note: 'order confirmed, stock deducted', hasOrder: true },
  { type: 'reverted', note: 'hold expired, stock released', hasOrder: true },
  { type: 'initial', note: 'stock received from supplier', hasOrder: false },
]

// Synthesizes a plausible-looking ledger ending at the item's current available/reserved, working
// backwards in time. Deterministic per item (no Math.random) so re-renders don't jitter the timeline.
export function buildMockLedger(item: InventoryItem): MovementEntry[] {
  const entries: MovementEntry[] = []
  let avail = item.availableStock
  let reserved = item.reservedStock
  const now = Date.now()

  STEP_TEMPLATE.forEach((step, i) => {
    const qty = ((item.availableStock + item.reservedStock + i * 3 + 2) % 6) + 1
    entries.push({
      uuid: `${item.uuid}-mv-${i}`,
      type: step.type,
      quantity: qty,
      note: step.note,
      orderRef: step.hasOrder ? `ORD-${(1000 + i * 37 + item.uuid.length * 13) % 9000}` : null,
      createdAt: new Date(now - i * 3 * 60 * 60 * 1000).toISOString(),
      runningAvailable: avail,
      runningReserved: reserved,
    })
    // walk backwards: undo this step's effect for the next (older) entry's running totals
    if (step.type === 'reserved') {
      avail = avail + qty
      reserved = Math.max(0, reserved - qty)
    } else if (step.type === 'confirmed') {
      reserved = reserved + qty
    } else if (step.type === 'reverted') {
      avail = Math.max(0, avail - qty)
      reserved = reserved + qty
    } else {
      avail = Math.max(0, avail - qty)
    }
  })

  return entries
}
