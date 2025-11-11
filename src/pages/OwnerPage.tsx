import { useMemo } from 'react'
import { useAppData } from '../store.tsx'
import {
  ORDER_STATUS_OPTIONS,
  QUANTITY_TYPE_LABELS,
  type Order,
  type OrderStatus,
} from '../types.ts'
import { formatAriary } from '../utils/currency.ts'
import { useAdmin } from '../contexts/AdminContext.tsx'

const TRANSPORT_FEE_PER_PRODUCT = 1000

const getStatusLabel = (status: OrderStatus) =>
  ORDER_STATUS_OPTIONS.find((option) => option.id === status)?.label ?? status

const statusClass = (status: string) => {
  switch (status) {
    case 'livree_pas_payee':
      return 'status-chip danger'
    case 'livree_payee':
      return 'status-chip success'
    case 'non_livree_payee':
      return 'status-chip warning'
    case 'en_cours':
    case 'nouvelle':
      return 'status-chip info'
    default:
      return 'status-chip'
  }
}

const FIVE_MINUTES_IN_MS = 5 * 60 * 1000

const OwnerPage = () => {
  const { orders, updateOrderStatus, removeOrder } = useAppData()
  const { isAdmin } = useAdmin()

  const exportOrders = (ordersToExport: Order[], filename: string) => {
    if (!ordersToExport.length) {
      return
    }
    const headers = [
      'orderId',
      'createdAt',
      'status',
      'customer',
      'contact',
      'notes',
      'item',
      'quantity',
      'unit',
      'unitPrice',
      'lineTotal',
      'comment',
      'transportFee',
    ]
    const rows: string[] = []
    ordersToExport.forEach((order) => {
      const statusLabel = getStatusLabel(order.status)
      const transportFee = order.entries.length * TRANSPORT_FEE_PER_PRODUCT
      order.entries.forEach((entry, index) => {
        const values = [
          order.id,
          new Date(order.createdAt).toLocaleString('fr-FR'),
          statusLabel,
          order.customerName,
          order.contact ?? '',
          order.notes ?? '',
          entry.itemName,
          entry.quantity,
          QUANTITY_TYPE_LABELS[entry.quantityType],
          entry.unitPrice,
          entry.unitPrice * entry.quantity,
          entry.comment ?? '',
          index === 0 ? transportFee : '',
        ]
        rows.push(
          values
            .map((value) =>
              `"${String(value ?? '').replaceAll('"', '""')}"`
            )
            .join(','),
        )
      })
    })
    const csv = `${headers.join(',')}\n${rows.join('\n')}`
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleExportAll = () => exportOrders(orders, 'commandes_all.csv')

  const handleExportEnCours = () =>
    exportOrders(
      orders.filter((order) => order.status === 'en_cours'),
      'commandes_en_cours.csv',
    )

  const orderedList = useMemo(
    () =>
      [...orders].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [orders],
  )

  return (
    <section className="page-section">
      <div className="section-header">
        <div>
          <p className="eyebrow">Propriétaire</p>
          <h2>Commandes entrantes</h2>
          <p className="section-lead">
            Visualisez toutes les commandes clients, ajustez leur statut en un
            clic et préparez facilement les livraisons.
          </p>
        </div>
        <div className="export-buttons">
          <button type="button" className="ghost-button" onClick={handleExportEnCours}>
            Export en cours
          </button>
          <button type="button" className="primary-button" onClick={handleExportAll}>
            Export all
          </button>
        </div>
      </div>

      {orderedList.length === 0 ? (
        <div className="empty-state">
          <p>Aucune commande reçue pour le moment.</p>
        </div>
      ) : (
        <div className="order-stack">
          {orderedList.map((order) => {
            const productTotal = order.entries.reduce(
              (sum, entry) => sum + entry.quantity * entry.unitPrice,
              0,
            )
            const transportFee =
              order.entries.length * TRANSPORT_FEE_PER_PRODUCT
            const totalWithTransport = productTotal + transportFee
            const statusLabel = getStatusLabel(order.status as OrderStatus)
            const canDelete =
              order.status === 'nouvelle' || order.status === 'en_cours'
            const createdAtTime = new Date(order.createdAt).getTime()
            const isRecent =
              Date.now() - createdAtTime < FIVE_MINUTES_IN_MS
            const canDeleteForUser = canDelete && (isAdmin || isRecent)
            return (
              <article className="order-card" key={order.id}>
                <header>
                  <div>
                    <p className="eyebrow">{order.customerName}</p>
                    <h3>
                      Commande du{' '}
                      {new Date(order.createdAt).toLocaleString('fr-FR', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </h3>
                  </div>
                  <span className={statusClass(order.status)}>
                    {statusLabel}
                  </span>
                </header>

                <div className="order-meta">
                  {order.contact && (
                    <p>
                      <strong>Contact :</strong> {order.contact}
                    </p>
                  )}
                  {order.notes && (
                    <p>
                      <strong>Notes :</strong> {order.notes}
                    </p>
                  )}
                </div>

                <table className="order-table">
                  <thead>
                    <tr>
                      <th>Produit</th>
                      <th>Qté</th>
                      <th>PU</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.entries.map((entry) => (
                      <tr key={entry.id}>
                        <td>
                          <div className="order-product">
                            <span>{entry.itemName}</span>
                            {entry.comment && (
                              <p className="muted">Commentaire : {entry.comment}</p>
                            )}
                          </div>
                        </td>
                        <td>
                          {entry.quantity}{' '}
                          {QUANTITY_TYPE_LABELS[entry.quantityType]}
                        </td>
                        <td>{formatAriary(entry.unitPrice)}</td>
                        <td>{formatAriary(entry.unitPrice * entry.quantity)}</td>
                      </tr>
                    ))}
                    <tr>
                      <td>Frais de transport</td>
                      <td>{order.entries.length}</td>
                      <td>{formatAriary(TRANSPORT_FEE_PER_PRODUCT)}</td>
                      <td>{formatAriary(transportFee)}</td>
                    </tr>
                  </tbody>
                </table>

                <footer className="order-footer">
                  <div className="order-total">
                    <span>Total </span>
                    <strong>{formatAriary(totalWithTransport)}</strong>
                  </div>
                  <div className="order-actions">
                    <label className="form-field">
                      <span>Statut</span>
                      <select
                        value={order.status}
                        disabled={!isAdmin}
                        title={
                          !isAdmin
                            ? 'Réservé aux administrateurs'
                            : undefined
                        }
                        onChange={(event) =>
                          isAdmin &&
                          updateOrderStatus(
                            order.id,
                            event.target.value as OrderStatus,
                          )
                        }
                      >
                        {ORDER_STATUS_OPTIONS.map((option) => (
                          <option value={option.id} key={option.id}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    {canDelete && (
                      <button
                        type="button"
                        className="ghost-button"
                        disabled={!canDeleteForUser}
                        onClick={() => {
                          if (!canDeleteForUser) {
                            return
                          }
                          removeOrder(order.id)
                        }}
                        title={
                          !canDeleteForUser
                            ? 'Réservé aux admins ou commandes de moins de 5 minutes'
                            : undefined
                        }
                      >
                        Supprimer
                      </button>
                    )}
                  </div>
                </footer>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}

export default OwnerPage
