import { useMemo, useState } from 'react'
import { useAdmin } from '../contexts/AdminContext.tsx'
import { useAppData } from '../store.tsx'
import { getUserDisplayName } from '../utils/user.ts'

type Feedback =
  | { type: 'success'; message: string }
  | { type: 'error'; message: string }
  | null

type QuantityState = Record<string, number>

const buildItemsFromQuantities = (quantities: QuantityState) =>
  Object.entries(quantities)
    .filter(([, quantity]) => quantity > 0)
    .map(([typeId, quantity]) => ({ typeId, quantity }))

const ConsignesPage = () => {
  const {
    clients,
    consignTypes,
    consignTotals,
    addConsignType,
    removeConsignType,
    assignConsigns,
    returnConsigns,
  } = useAppData()
  const { isAdmin, user } = useAdmin()

  const [newTypeLabel, setNewTypeLabel] = useState('')
  const [typeFeedback, setTypeFeedback] = useState<Feedback>(null)
  const [typeLoading, setTypeLoading] = useState(false)
  const [removingTypeId, setRemovingTypeId] = useState<string | null>(null)

  const [assignClientId, setAssignClientId] = useState('')
  const [assignQuantities, setAssignQuantities] = useState<QuantityState>({})
  const [assignNote, setAssignNote] = useState('')
  const [assignFeedback, setAssignFeedback] = useState<Feedback>(null)
  const [assignLoading, setAssignLoading] = useState(false)

  const [returnClientId, setReturnClientId] = useState('')
  const [returnQuantities, setReturnQuantities] = useState<QuantityState>({})
  const [returnNote, setReturnNote] = useState('')
  const [returnFeedback, setReturnFeedback] = useState<Feedback>(null)
  const [returnLoading, setReturnLoading] = useState(false)

  const sortedClients = useMemo(
    () => [...clients].sort((a, b) => a.name.localeCompare(b.name)),
    [clients],
  )

  const outstandingByClient = useMemo(() => {
    const map: Record<string, Record<string, number>> = {}
    consignTotals.forEach((entry) => {
      if (entry.quantity <= 0) {
        return
      }
      if (!map[entry.clientId]) {
        map[entry.clientId] = {}
      }
      map[entry.clientId][entry.typeId] = entry.quantity
    })
    return map
  }, [consignTotals])

  const outstandingClientIds = useMemo(
    () =>
      Object.keys(outstandingByClient).sort((a, b) => {
        const left = clients.find((client) => client.id === a)?.name ?? a
        const right = clients.find((client) => client.id === b)?.name ?? b
        return left.localeCompare(right)
      }),
    [clients, outstandingByClient],
  )

  const myDisplayName = getUserDisplayName(user)
  const myOutstanding = useMemo(() => {
    if (!user) {
      return []
    }
    const map = new Map<string, number>()
    consignTotals.forEach((entry) => {
      if (entry.clientId === user.id && entry.quantity > 0) {
        map.set(entry.typeId, entry.quantity)
      }
    })
    if (map.size === 0) {
      return []
    }
    const result: Array<{ typeId: string; label: string; quantity: number }> = []
    consignTypes.forEach((type) => {
      const quantity = map.get(type.id)
      if (quantity && quantity > 0) {
        result.push({ typeId: type.id, label: type.label, quantity })
        map.delete(type.id)
      }
    })
    map.forEach((quantity, typeId) => {
      result.push({ typeId, label: typeId, quantity })
    })
    return result
  }, [consignTotals, consignTypes, user])

  const currentReturnOutstanding = returnClientId
    ? outstandingByClient[returnClientId] ?? {}
    : {}

  const handleQuantityChange = (
    setter: React.Dispatch<React.SetStateAction<QuantityState>>,
  ) => {
    return (typeId: string, rawValue: string) => {
      setter((prev) => {
        const next = { ...prev }
        if (!rawValue.trim()) {
          delete next[typeId]
          return next
        }
        const parsed = Math.floor(Number(rawValue))
        if (!Number.isFinite(parsed) || parsed <= 0) {
          delete next[typeId]
          return next
        }
        next[typeId] = parsed
        return next
      })
    }
  }

  const updateAssignQuantity = handleQuantityChange(setAssignQuantities)
  const updateReturnQuantity = handleQuantityChange(setReturnQuantities)

  const handleTypeSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!isAdmin) {
      setTypeFeedback({ type: 'error', message: 'Mode admin requis.' })
      return
    }
    setTypeFeedback(null)
    try {
      setTypeLoading(true)
      await addConsignType(newTypeLabel)
      setNewTypeLabel('')
      setTypeFeedback({ type: 'success', message: 'Type ajoute.' })
    } catch (error) {
      setTypeFeedback({
        type: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Impossible d ajouter le type.',
      })
    } finally {
      setTypeLoading(false)
    }
  }

  const handleTypeDelete = async (typeId: string) => {
    if (!isAdmin) {
      setTypeFeedback({ type: 'error', message: 'Mode admin requis.' })
      return
    }
    const confirmDelete = window.confirm(
      'Supprimer ce type de consigne ? Les mouvements historiques resteront associes.',
    )
    if (!confirmDelete) {
      return
    }
    setTypeFeedback(null)
    try {
      setRemovingTypeId(typeId)
      await removeConsignType(typeId)
      setTypeFeedback({ type: 'success', message: 'Type supprime.' })
    } catch (error) {
      setTypeFeedback({
        type: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Suppression impossible pour le moment.',
      })
    } finally {
      setRemovingTypeId(null)
    }
  }

  const handleAssignSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!isAdmin) {
      setAssignFeedback({ type: 'error', message: 'Mode admin requis.' })
      return
    }
    setAssignFeedback(null)
    try {
      setAssignLoading(true)
      await assignConsigns({
        clientId: assignClientId,
        items: buildItemsFromQuantities(assignQuantities),
        note: assignNote.trim() || undefined,
      })
      setAssignClientId('')
      setAssignQuantities({})
      setAssignNote('')
      setAssignFeedback({
        type: 'success',
        message: 'Consignes attribuees.',
      })
    } catch (error) {
      setAssignFeedback({
        type: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Echec de l attribution des consignes.',
      })
    } finally {
      setAssignLoading(false)
    }
  }

  const handleReturnSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!isAdmin) {
      setReturnFeedback({ type: 'error', message: 'Mode admin requis.' })
      return
    }
    setReturnFeedback(null)
    try {
      setReturnLoading(true)
      await returnConsigns({
        clientId: returnClientId,
        items: buildItemsFromQuantities(returnQuantities),
        note: returnNote.trim() || undefined,
      })
      setReturnQuantities({})
      setReturnClientId('')
      setReturnNote('')
      setReturnFeedback({
        type: 'success',
        message: 'Retour enregistre.',
      })
    } catch (error) {
      setReturnFeedback({
        type: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Echec de l enregistrement du retour.',
      })
    } finally {
      setReturnLoading(false)
    }
  }

  return (
    <section className="page-section">
      <div className="section-header">
        <div>
          <p className="eyebrow">Consignes</p>
          <h2>Suivez les bocaux et bouteilles</h2>
          <p className="section-lead">
            Ajoutez vos types de consignes, attribuez-les aux clients puis
            enregistrez les retours pour garder un suivi clair.
          </p>
        </div>
      </div>

      {isAdmin ? (
        <>
          <div className="grid-2">
        <div className="card">
          <div className="section-header">
            <h3>Types de consignes</h3>
            {typeFeedback && (
              <p className={`feedback ${typeFeedback.type}`}>
                {typeFeedback.message}
              </p>
            )}
          </div>
          {isAdmin ? (
            <form className="form-section" onSubmit={handleTypeSubmit}>
              <label className="form-field">
                <span>Nom du type</span>
                <input
                  type="text"
                  value={newTypeLabel}
                  onChange={(event) => setNewTypeLabel(event.target.value)}
                  placeholder="ex: Bocal 500ml"
                  required
                />
              </label>
              <button
                type="submit"
                className="primary-button"
                disabled={typeLoading}
              >
                {typeLoading ? 'Ajout...' : 'Ajouter'}
              </button>
            </form>
          ) : (
            <p className="muted">
              Activez le mode admin pour ajouter ou supprimer des types.
            </p>
          )}
          {consignTypes.length === 0 ? (
            <p className="muted">Aucun type cree pour l instant.</p>
          ) : (
            <ul className="summary-list">
              {consignTypes.map((type) => (
                <li key={type.id}>
                  <span>{type.label}</span>
                  {isAdmin && (
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() => handleTypeDelete(type.id)}
                      disabled={removingTypeId === type.id}
                    >
                      {removingTypeId === type.id ? 'Suppression...' : 'Supprimer'}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card">
          <div className="section-header">
            <h3>Attribuer des consignes</h3>
            {assignFeedback && (
              <p className={`feedback ${assignFeedback.type}`}>
                {assignFeedback.message}
              </p>
            )}
          </div>
          {!isAdmin ? (
            <p className="muted">
              Activez le mode admin pour enregistrer un consignage.
            </p>
          ) : consignTypes.length === 0 ? (
            <p className="muted">Creez au moins un type avant d attribuer.</p>
          ) : clients.length === 0 ? (
            <p className="muted">Ajoutez un client pour commencer.</p>
          ) : (
            <form className="form-section" onSubmit={handleAssignSubmit}>
              <label className="form-field">
                <span>Client</span>
                <select
                  value={assignClientId}
                  onChange={(event) => setAssignClientId(event.target.value)}
                  required
                >
                  <option value="">Selectionnez un client</option>
                  {sortedClients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="consign-qty-grid">
                {consignTypes.map((type) => (
                  <label className="form-field" key={type.id}>
                    <span>{type.label}</span>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={assignQuantities[type.id] ?? ''}
                      onChange={(event) =>
                        updateAssignQuantity(type.id, event.target.value)
                      }
                      placeholder="0"
                    />
                  </label>
                ))}
              </div>
              <label className="form-field">
                <span>Note</span>
                <input
                  type="text"
                  value={assignNote}
                  onChange={(event) => setAssignNote(event.target.value)}
                  placeholder="ex: Livraison du lundi"
                />
              </label>
              <button
                type="submit"
                className="primary-button"
                disabled={assignLoading}
              >
                {assignLoading ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </form>
          )}
        </div>
      </div>

      <div className="card">
        <div className="section-header">
          <h3>Retour de consignes</h3>
          {returnFeedback && (
            <p className={`feedback ${returnFeedback.type}`}>
              {returnFeedback.message}
            </p>
          )}
        </div>
        {!isAdmin ? (
          <p className="muted">
            Activez le mode admin pour enregistrer un retour.
          </p>
        ) : clients.length === 0 ? (
          <p className="muted">Ajoutez un client pour commencer.</p>
        ) : outstandingClientIds.length === 0 ? (
          <p className="muted">Aucune consigne en circulation pour le moment.</p>
        ) : (
          <form className="form-section" onSubmit={handleReturnSubmit}>
            <label className="form-field">
              <span>Client</span>
              <select
                value={returnClientId}
                onChange={(event) => {
                  setReturnClientId(event.target.value)
                  setReturnQuantities({})
                }}
                required
              >
                <option value="">Selectionnez un client</option>
                {outstandingClientIds.map((clientId) => {
                  const client =
                    clients.find((candidate) => candidate.id === clientId) ??
                    null
                  return (
                    <option key={clientId} value={clientId}>
                      {client ? client.name : clientId}
                    </option>
                  )
                })}
              </select>
            </label>
            {returnClientId && Object.keys(currentReturnOutstanding).length === 0 && (
              <p className="muted">
                Ce client n a aucune consigne en attente.
              </p>
            )}
            {returnClientId && Object.keys(currentReturnOutstanding).length > 0 && (
              <div className="consign-qty-grid">
                {consignTypes.map((type) => {
                  const outstanding = currentReturnOutstanding[type.id] ?? 0
                  if (outstanding <= 0) {
                    return null
                  }
                  return (
                    <label className="form-field" key={type.id}>
                      <span>
                        {type.label} (reste {outstanding})
                      </span>
                      <input
                        type="number"
                        min={0}
                        max={outstanding}
                        step={1}
                        value={returnQuantities[type.id] ?? ''}
                        onChange={(event) =>
                          updateReturnQuantity(type.id, event.target.value)
                        }
                        placeholder="0"
                      />
                    </label>
                  )
                })}
              </div>
            )}
            <label className="form-field">
              <span>Note</span>
              <input
                type="text"
                value={returnNote}
                onChange={(event) => setReturnNote(event.target.value)}
                placeholder="ex: Retour chauffeur"
              />
            </label>
            <button
              type="submit"
              className="primary-button"
              disabled={returnLoading}
            >
              {returnLoading ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </form>
        )}
      </div>

      <div className="card">
        <div className="section-header">
          <div>
            <h3>Consignes en circulation</h3>
            <p className="muted">
              Tableau des quantites positives par client et par type.
            </p>
          </div>
        </div>
        {consignTypes.length === 0 ? (
          <p className="muted">Ajoutez des types pour afficher le tableau.</p>
        ) : outstandingClientIds.length === 0 ? (
          <p className="muted">Aucune consigne en attente.</p>
        ) : (
          <div className="table-container">
            <table className="order-table">
              <thead>
                <tr>
                  <th>Client</th>
                  {consignTypes.map((type) => (
                    <th key={type.id}>{type.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {outstandingClientIds.map((clientId) => {
                  const client =
                    clients.find((candidate) => candidate.id === clientId) ??
                    null
                  const perType = outstandingByClient[clientId] ?? {}
                  return (
                    <tr key={clientId}>
                      <td>{client ? client.name : clientId}</td>
                      {consignTypes.map((type) => {
                        const value = perType[type.id] ?? 0
                        return (
                          <td key={`${clientId}-${type.id}`}>
                            {value > 0 ? value : '-'}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
        </>
      ) : (
        <div className="card">
          <div className="section-header">
            <div>
              <h3>Mes consignes</h3>
              <p className="muted">
                {myDisplayName
                  ? `Suivi pour ${myDisplayName}`
                  : 'Suivez les consignes liees a votre compte.'}
              </p>
            </div>
          </div>
          {!user ? (
            <p className="muted">Connectez-vous pour consulter vos consignes.</p>
          ) : myOutstanding.length === 0 ? (
            <p className="muted">Aucune consigne en attente.</p>
          ) : (
            <ul className="summary-list">
              {myOutstanding.map((entry) => (
                <li key={entry.typeId}>
                  <span>{entry.label}</span>
                  <strong>{entry.quantity}</strong>
                </li>
              ))}
            </ul>
          )}
          <p className="muted">
            Besoin d un ajustement ? Contactez l equipe Madacheese.
          </p>
        </div>
      )}
    </section>
  )
}

export default ConsignesPage
