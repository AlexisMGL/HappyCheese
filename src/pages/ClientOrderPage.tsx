import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useAppData } from '../store.tsx'
import { useAdmin } from '../contexts/AdminContext.tsx'
import { QUANTITY_TYPE_LABELS } from '../types.ts'
import type { CheeseItem } from '../types.ts'
import { formatAriary } from '../utils/currency.ts'
import {
  displayUnitLabelFor,
  inputStepFor,
  toUnitQuantity,
  validateQuantityMultiple,
} from '../utils/items.ts'
import { getUserContact, getUserDisplayName } from '../utils/user.ts'
import merciImage from '../../merci.png'

type Feedback =
  | { type: 'success'; message: string }
  | { type: 'error'; message: string }
  | null

interface SelectedEntry {
  item: CheeseItem
  quantity: number
  unitQuantity: number
  comment: string
}

const quantityLabel = (item: CheeseItem) =>
  `Quantité (${displayUnitLabelFor(item)})`

const TRANSPORT_FEE_PER_PRODUCT = 1000

const ClientOrderPage = () => {
  const { items, addOrder } = useAppData()
  const { user } = useAdmin()
  const [notes, setNotes] = useState('')
  const [selection, setSelection] = useState<Record<string, number>>({})
  const [comments, setComments] = useState<Record<string, string>>({})
  const [quantityErrors, setQuantityErrors] = useState<Record<string, string>>(
    {},
  )
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [showThanks, setShowThanks] = useState(false)

  const selectedEntries = useMemo<SelectedEntry[]>(
    () =>
      items.reduce<SelectedEntry[]>((acc, item) => {
        const quantity = Number(selection[item.id] || 0)
        if (quantity <= 0) {
          return acc
        }
        const unitQuantity = toUnitQuantity(item, quantity)
        if (unitQuantity <= 0) {
          return acc
        }
        const commentValue = (comments[item.id] ?? '').trim()
        acc.push({
          item,
          quantity,
          unitQuantity,
          comment: commentValue,
        })
        return acc
      }, []),
    [items, selection, comments],
  )

  const customerName = getUserDisplayName(user)
  const deliveryLocation =
    (user?.user_metadata?.delivery_location as string | undefined)?.trim() ||
    'AerialMetric'
  const company =
    (user?.user_metadata?.company as string | undefined)?.trim() || ''
  const contactInfo = getUserContact(user)

  const productTotal = selectedEntries.reduce(
    (sum, entry) => sum + entry.item.price * entry.unitQuantity,
    0,
  )
  const transportFees = selectedEntries.length * TRANSPORT_FEE_PER_PRODUCT
  const grandTotal = productTotal + transportFees

  const handleQuantityChange = (item: CheeseItem, value: string) => {
    const parsedValue = Number(value)
    const sanitized =
      Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : 0
    const errorMessage =
      sanitized > 0 ? validateQuantityMultiple(item, sanitized) : null

    setQuantityErrors((prev) => {
      if (!errorMessage && !prev[item.id]) {
        return prev
      }
      const next = { ...prev }
      if (errorMessage) {
        next[item.id] = errorMessage
      } else {
        delete next[item.id]
      }
      return next
    })

    setSelection((prev) => ({
      ...prev,
      [item.id]: sanitized,
    }))
  }

  const handleCommentChange = (itemId: string, value: string) => {
    setComments((prev) => {
      const next = { ...prev }
      if (value.trim().length === 0) {
        delete next[itemId]
      } else {
        next[itemId] = value
      }
      return next
    })
  }

  const resetForm = () => {
    setSelection({})
    setComments({})
    setNotes('')
    setQuantityErrors({})
  }

  useEffect(() => {
    if (!showThanks) {
      return
    }
    const timer = window.setTimeout(() => setShowThanks(false), 3000)
    return () => window.clearTimeout(timer)
  }, [showThanks])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFeedback(null)

    if (!user) {
      setFeedback({
        type: 'error',
        message: 'Connectez-vous pour passer commande.',
      })
      return
    }

    if (!selectedEntries.length) {
      setFeedback({
        type: 'error',
        message: 'Ajoutez au moins un produit à la commande.',
      })
      return
    }

    const invalidEntries: Record<string, string> = {}
    selectedEntries.forEach((entry) => {
      const message = validateQuantityMultiple(entry.item, entry.quantity)
      if (message) {
        invalidEntries[entry.item.id] = message
      }
    })

    if (Object.keys(invalidEntries).length > 0) {
      setQuantityErrors((prev) => ({ ...prev, ...invalidEntries }))
      setFeedback({
        type: 'error',
        message: 'Corrigez les quantités signalées avant de valider.',
      })
      return
    }

    try {
      const normalizedContact =
        contactInfo || user.email || ''
      await addOrder({
        clientId: user.id,
        customerName: customerName || user.email || 'Client',
        contact: normalizedContact,
        notes,
        entries: selectedEntries.map((entry) => ({
          itemId: entry.item.id,
          quantity: entry.unitQuantity,
          comment: entry.comment,
        })),
      })
      resetForm()
      setFeedback({
        type: 'success',
        message: 'Commande transmise à la laiterie.',
      })
      setShowThanks(true)
    } catch (error) {
      setFeedback({
        type: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Une erreur est survenue, merci de réessayer.',
      })
    }
  }

  return (
    <>
      <section className="page-section">
      <div className="section-header">
        <div>
          <p className="eyebrow">Commander</p>
          <h2>Composez votre sélection</h2>
          <p className="section-lead">
            Choisissez vos produits laitiers, indiquez les quantités, ajoutez un
            commentaire si besoin (beurre, fromage fondu…) puis validez. Les
            frais de transport (1 000 Ar par type de produit) se calculent
            automatiquement.
          </p>
        </div>
        {feedback && (
          <p className={`feedback ${feedback.type}`}>{feedback.message}</p>
        )}
      </div>

      {items.length === 0 ? (
        <div className="empty-state">
          <p>
            Aucun produit n’est disponible pour l’instant. Ajoutez des items
            dans l’onglet “Carte & Tarifs” pour les proposer à la vente.
          </p>
        </div>
      ) : (
        <form className="grid-2" onSubmit={handleSubmit} noValidate>
          <div className="card">
            <fieldset className="form-section">
              <legend>Mes informations</legend>
              {!user ? (
                <p className="muted">
                  Connectez-vous pour passer une commande.
                </p>
              ) : (
                <>
                  <div className="client-preview">
                    <strong>{customerName || user.email}</strong>
                    {company && <p className="muted">{company}</p>}
                    {user.email && <p className="muted">{user.email}</p>}
                    {deliveryLocation && (
                      <p className="muted">
                        Lieu de livraison : {deliveryLocation}
                      </p>
                    )}
                  </div>
                  <div className="form-field">
                    <span>Contact (non modifiable)</span>
                    <p className="muted">
                      {contactInfo || 'Aucun contact disponible'}
                    </p>
                  </div>
                </>
              )}
              <label className="form-field">
                <span>Notes</span>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder={'Pr\u00e9cisions sur la livraison, pr\u00e9f\u00e9rences...'}
                  rows={4}
                />
              </label>
            </fieldset>

            <fieldset className="form-section">
              <legend>Carte du moment</legend>
              <div className="items-grid">
                {items.map((item) => {
                  const currentValue = selection[item.id] ?? 0
                  const currentUnitQuantity = toUnitQuantity(
                    item,
                    currentValue,
                  )
                  const currentSubtotal = item.price * currentUnitQuantity
                  const error = quantityErrors[item.id]
                  const commentValue = comments[item.id] ?? ''
                  return (
                    <div className="item-card" key={item.id}>
                      <div>
                        <p className="item-name">{item.name}</p>
                        <p className="item-price">
                          {formatAriary(item.price)}{' '}
                          {QUANTITY_TYPE_LABELS[item.quantityType]}
                        </p>
                        <p className="item-subtotal">
                          Sous-total:{' '}
                          <strong>{formatAriary(currentSubtotal)}</strong>
                        </p>
                      </div>
                      <label className="form-field">
                        <span>{quantityLabel(item)}</span>
                        <input
                          type="number"
                          min={0}
                          step={inputStepFor(item)}
                          value={currentValue}
                          onChange={(event) =>
                            handleQuantityChange(item, event.target.value)
                          }
                        />
                        {error && <p className="input-error">{error}</p>}
                      </label>
                      {item.commentEnabled && (
                        <label className="form-field">
                          <span>Commentaire</span>
                          <input
                            type="text"
                            value={commentValue}
                            onChange={(event) =>
                              handleCommentChange(item.id, event.target.value)
                            }
                            placeholder="Préciser le sous-type"
                          />
                        </label>
                      )}
                    </div>
                  )
                })}
              </div>
            </fieldset>
          </div>

          <aside className="card sticky">
            <h3>Récapitulatif</h3>
            {selectedEntries.length === 0 ? (
              <p className="muted">Ajoutez des produits pour voir le total.</p>
            ) : (
              <ul className="summary-list">
                {selectedEntries.map((entry) => (
                  <li key={entry.item.id}>
                    <div>
                      <strong>{entry.item.name}</strong>
                      <p className="muted">
                        {entry.quantity} {displayUnitLabelFor(entry.item)}
                      </p>
                      {entry.comment && (
                        <p className="muted">Commentaire : {entry.comment}</p>
                      )}
                    </div>
                    <span>
                      {formatAriary(entry.item.price * entry.unitQuantity)}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            <div className="summary-total">
              <span>Produits</span>
              <strong>{formatAriary(productTotal)}</strong>
            </div>

            {selectedEntries.length > 0 && (
              <div className="summary-total">
                <span>
                  Frais de transport ({formatAriary(TRANSPORT_FEE_PER_PRODUCT)} x{' '}
                  {selectedEntries.length})
                </span>
                <strong>{formatAriary(transportFees)}</strong>
              </div>
            )}

            <div className="summary-total emphasis">
              <span>Total à régler</span>
              <strong>{formatAriary(grandTotal)}</strong>
            </div>

            <button type="submit" className="primary-button">
              Valider la commande
            </button>
          </aside>
        </form>
      )}
    </section>
      <div className={`thanks-banner ${showThanks ? 'is-visible' : ''}`}>
        <img src={merciImage} alt="Merci" />
      </div>
    </>
  )
}

export default ClientOrderPage
