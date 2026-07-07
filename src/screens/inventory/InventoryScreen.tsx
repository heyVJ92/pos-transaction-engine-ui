import { useMemo, useState } from 'react'
import styles from './InventoryScreen.module.css'
import { MOCK_INVENTORY, buildMockLedger, type MovementType } from './mockInventory'

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function availabilityClass(available: number): string {
  if (available <= 0) return styles.availOut
  if (available <= 10) return styles.availLow
  return styles.availHealthy
}

const MOVEMENT_LABEL: Record<MovementType, string> = {
  initial: 'initial',
  reserved: 'reserved',
  confirmed: 'confirmed',
  reverted: 'reverted',
  expired: 'expired',
}

function movementClass(type: MovementType): string {
  switch (type) {
    case 'initial':
      return styles.moveInitial
    case 'reserved':
      return styles.moveReserved
    case 'confirmed':
      return styles.moveConfirmed
    case 'reverted':
      return styles.moveReverted
    case 'expired':
      return styles.moveExpired
  }
}

function dotClass(type: MovementType): string {
  switch (type) {
    case 'initial':
      return styles.dotInitial
    case 'reserved':
      return styles.dotReserved
    case 'confirmed':
      return styles.dotConfirmed
    case 'reverted':
      return styles.dotReverted
    case 'expired':
      return styles.dotExpired
  }
}

export default function InventoryScreen() {
  const [selectedUuid, setSelectedUuid] = useState(MOCK_INVENTORY[0]?.uuid ?? null)

  const selected = useMemo(
    () => MOCK_INVENTORY.find((item) => item.uuid === selectedUuid) ?? null,
    [selectedUuid],
  )

  const ledger = useMemo(() => (selected ? buildMockLedger(selected) : []), [selected])

  return (
    <div className={styles.root} data-screen-label="Inventory">
      <div className={styles.header}>
        <h1 className={styles.title}>Inventory</h1>
        <p className={styles.subtitle}>
          Available and reserved stock with the reservation ledger for the selected item.
        </p>
      </div>

      <div className={styles.previewBanner}>
        Preview data — not wired to the API yet. <code>GET /inventory</code> is ready server-side; this
        screen runs on local mock data until integration is confirmed.
      </div>

      <div className={styles.layout}>
        <div className={styles.table}>
          <div className={styles.tableHeader}>
            <span>Product</span>
            <span className={styles.right}>Available</span>
            <span className={styles.right}>Reserved</span>
          </div>
          {MOCK_INVENTORY.map((item) => (
            <div
              key={item.uuid}
              className={`${styles.row} ${item.uuid === selectedUuid ? styles.rowSelected : ''}`}
              onClick={() => setSelectedUuid(item.uuid)}
            >
              <div className={styles.productCell}>
                <div className={styles.productName}>{item.product.name}</div>
                <div className={styles.productSku}>{item.product.sku}</div>
              </div>
              <div className={styles.right}>
                <span className={`${styles.availBadge} ${availabilityClass(item.availableStock)}`}>
                  {item.availableStock}
                </span>
              </div>
              <span className={`${styles.reserved} ${styles.right}`}>{item.reservedStock}</span>
            </div>
          ))}
        </div>

        <div className={styles.ledgerPane}>
          {selected && (
            <>
              <div className={styles.ledgerHeader}>
                <div className={styles.ledgerLabel}>reservation ledger</div>
                <div className={styles.ledgerProductName}>{selected.product.name}</div>
                <div className={styles.ledgerStats}>
                  <span className={styles.ledgerSku}>{selected.product.sku}</span>
                  <span>available {selected.availableStock}</span>
                  <span>reserved {selected.reservedStock}</span>
                </div>
              </div>
              <div className={styles.ledgerBody}>
                {ledger.map((mv, i) => (
                  <div key={mv.uuid} className={styles.timelineRow}>
                    <div className={styles.timelineRail}>
                      <span className={`${styles.timelineDot} ${dotClass(mv.type)}`} />
                      {i < ledger.length - 1 && <span className={styles.timelineLine} />}
                    </div>
                    <div className={styles.timelineContent}>
                      <div className={styles.timelineTop}>
                        <span className={`${styles.moveBadge} ${movementClass(mv.type)}`}>
                          {MOVEMENT_LABEL[mv.type]}
                        </span>
                        <span className={styles.moveQty}>{mv.quantity}</span>
                        <span className={styles.moveTime}>{formatTime(mv.createdAt)}</span>
                      </div>
                      <div className={styles.moveNote}>
                        {mv.note}
                        {mv.orderRef && (
                          <>
                            {' · '}
                            <span className={styles.moveOrder}>{mv.orderRef}</span>
                          </>
                        )}
                      </div>
                      <div className={styles.moveRunning}>
                        <span>avail {mv.runningAvailable}</span>
                        <span>reserved {mv.runningReserved}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
