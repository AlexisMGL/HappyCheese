import { useState } from 'react'
import type { FormEvent } from 'react'
import { useAppData } from '../store.tsx'
import { useAdmin } from '../contexts/AdminContext.tsx'

type Feedback =
  | { type: 'success'; message: string }
  | { type: 'error'; message: string }
  | null

const ClientsPage = () => {
  const { clients, addClient, removeClient } = useAppData()
  const { isAdmin } = useAdmin()
  const [name, setName] = useState('')
  const [contact, setContact] = useState('')
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFeedback(null)
    const trimmedName = name.trim()
    const trimmedContact = contact.trim()

    if (!trimmedName) {
      setFeedback({
        type: 'error',
        message: 'Le nom du client est obligatoire.',
      })
      return
    }

    try {
      setSubmitting(true)
      await addClient({ name: trimmedName, contact: trimmedContact })
      setName('')
      setContact('')
      setFeedback({
        type: 'success',
        message: 'Client cree avec succes.',
      })
    } catch (error) {
      setFeedback({
        type: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Impossible de creer le client pour le moment.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!isAdmin) {
      return
    }
    const confirmDelete = window.confirm(
      'Voulez-vous vraiment supprimer ce client ?',
    )
    if (!confirmDelete) {
      return
    }
    setFeedback(null)
    try {
      setDeletingId(id)
      await removeClient(id)
      setFeedback({
        type: 'success',
        message: 'Client supprime.',
      })
    } catch (error) {
      setFeedback({
        type: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Echec de la suppression du client.',
      })
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <section className="page-section">
      <div className="section-header">
        <div>
          <p className="eyebrow">Clients</p>
          <h2>Gerez vos profils clients</h2>
          <p className="section-lead">
            Enregistrez vos contacts une fois pour toutes et reutilisez-les lors
            de la creation d&rsquo;une commande.
          </p>
        </div>
        {feedback && (
          <p className={`feedback ${feedback.type}`}>{feedback.message}</p>
        )}
      </div>

      <div className="card">
        <form className="form-section" onSubmit={handleSubmit}>
          <h3>Nouveau client</h3>
          <label className="form-field">
            <span>Nom / entreprise *</span>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="ex: Faharetana Shop"
              required
            />
          </label>
          <label className="form-field">
            <span>Contact</span>
            <input
              type="text"
              value={contact}
              onChange={(event) => setContact(event.target.value)}
              placeholder="034 00 000 00 / contact@mail.com"
            />
          </label>
          <button
            type="submit"
            className="primary-button"
            disabled={submitting}
          >
            {submitting ? 'Creation...' : 'Enregistrer'}
          </button>
        </form>
      </div>

      <div className="card">
        <div className="section-header">
          <div>
            <h3>Liste des clients</h3>
            <p className="muted">
              Visible uniquement en mode admin (bouton en haut a droite).
            </p>
          </div>
        </div>
        {!isAdmin ? (
          <p className="muted">
            Activez le mode administrateur pour visualiser et supprimer des
            clients.
          </p>
        ) : clients.length === 0 ? (
          <p className="muted">Aucun client enregistre pour le moment.</p>
        ) : (
          <ul className="summary-list">
            {clients.map((client) => (
              <li key={client.id}>
                <div>
                  <strong>{client.name}</strong>
                  {client.contact && (
                    <p className="muted">{client.contact}</p>
                  )}
                </div>
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => handleDelete(client.id)}
                  disabled={deletingId === client.id}
                >
                  {deletingId === client.id ? 'Suppression...' : 'Supprimer'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

export default ClientsPage
