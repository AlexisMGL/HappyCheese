import { useMemo } from 'react'
import { useAppData } from '../store.tsx'
import { ORDER_STATUS_OPTIONS, QUANTITY_TYPE_LABELS } from '../types.ts'
import { formatAriary } from '../utils/currency.ts'

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

const OwnerPage = () => {
  const { orders, updateOrderStatus } = useAppData()

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
      </div>

      {orderedList.length === 0 ? (
        <div className="empty-state">
          <p>Aucune commande reçue pour le moment.</p>
        </div>
      ) : (
        <div className="order-stack">
          {orderedList.map((order) => {
            const total = order.entries.reduce(
              (sum, entry) => sum + entry.quantity * entry.unitPrice,
              0,
            )
            const statusOption =
              ORDER_STATUS_OPTIONS.find((opt) => opt.id === order.status) ??
              ORDER_STATUS_OPTIONS[0]
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
                    {statusOption.label}
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
                  </tbody>
                </table>

                <footer className="order-footer">
                  <div className="order-total">
                    <span>Total</span>
                    <strong>{formatAriary(total)}</strong>
                  </div>
                  <label className="form-field">
                    <span>Statut</span>
                    <select
                      value={order.status}
                      onChange={(event) =>
                        updateOrderStatus(
                          order.id,
                          event.target.value as (typeof ORDER_STATUS_OPTIONS)[number]['id'],
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
