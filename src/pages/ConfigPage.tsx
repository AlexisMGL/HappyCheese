import { useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { useAppData } from '../store.tsx'
import {
  QUANTITY_TYPE_LABELS,
  QUANTITY_TYPE_OPTIONS,
  type CheeseItem,
  type QuantityType,
} from '../types.ts'
import { formatAriary } from '../utils/currency.ts'

interface FormState {
  name: string
  price: string
  quantityType: QuantityType
  multipleOf: string
  commentEnabled: boolean
}

const initialState: FormState = {
  name: '',
  price: '',
  quantityType: '/pc',
  multipleOf: '',
  commentEnabled: false,
}

const ConfigPage = () => {
  const { items, addItem, updateItem, removeItem } = useAppData()
  const [formState, setFormState] = useState<FormState>(initialState)
  const [editingId, setEditingId] = useState<string | null>(null)

  const handleInputChange =
    (field: 'name' | 'price' | 'multipleOf') =>
    (event: ChangeEvent<HTMLInputElement>) => {
      setFormState((prev) => ({
        ...prev,
        [field]: event.target.value,
      }))
    }

  const handleQuantityTypeChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setFormState((prev) => ({
      ...prev,
      quantityType: event.target.value as QuantityType,
    }))
  }

  const handleCommentToggle = (event: ChangeEvent<HTMLInputElement>) => {
    setFormState((prev) => ({
      ...prev,
      commentEnabled: event.target.checked,
    }))
  }

  const resetForm = () => {
    setFormState(initialState)
    setEditingId(null)
  }

  const populateForEdit = (item: CheeseItem) => {
    setFormState({
      name: item.name,
      price: String(item.price),
      quantityType: item.quantityType,
      multipleOf: item.multipleOf ? String(item.multipleOf) : '',
      commentEnabled: Boolean(item.commentEnabled),
    })
    setEditingId(item.id)
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const parsedPrice = Number(formState.price)
    if (!formState.name.trim() || !Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      return
    }

    const parsedMultiple = Number(formState.multipleOf)
    const normalizedMultiple =
      formState.multipleOf.trim() &&
      Number.isFinite(parsedMultiple) &&
      parsedMultiple > 0
        ? parsedMultiple
        : undefined

    const payload = {
      name: formState.name.trim(),
      price: Number(parsedPrice.toFixed(2)),
      quantityType: formState.quantityType,
      multipleOf: normalizedMultiple,
      commentEnabled: formState.commentEnabled,
    }

    if (editingId) {
      updateItem(editingId, payload)
    } else {
      addItem(payload)
    }
    resetForm()
  }

  return (
    <section className="page-section">
      <div className="section-header">
        <div>
          <p className="eyebrow">Configuration</p>
          <h2>Carte & tarifs</h2>
          <p className="section-lead">
            Ajoutez ou modifiez des produits, définissez les multiples imposés et activez
            un champ commentaire pour laisser le client préciser un sous-type.
          </p>
        </div>
      </div>

      <div className="grid-2">
        <form className="card" onSubmit={handleSubmit}>
          <h3>{editingId ? 'Modifier le produit' : 'Ajouter un produit'}</h3>
          <label className="form-field">
            <span>Nom *</span>
            <input
              type="text"
              value={formState.name}
              onChange={handleInputChange('name')}
              placeholder="ex: Yaourt cacao"
              required
            />
          </label>
          <div className="grid-2 slim-gap">
            <label className="form-field">
              <span>Prix (Ar) *</span>
              <input
                type="number"
                min={0.1}
                step={0.1}
                value={formState.price}
                onChange={handleInputChange('price')}
                placeholder="ex: 2500"
                required
              />
            </label>
            <label className="form-field">
              <span>Unité</span>
              <select
                value={formState.quantityType}
                onChange={handleQuantityTypeChange}
              >
                {QUANTITY_TYPE_OPTIONS.map((unit) => (
                  <option value={unit} key={unit}>
                    {QUANTITY_TYPE_LABELS[unit]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="form-field">
            <span>Multiple imposé (optionnel)</span>
            <input
              type="number"
              min={0}
              step={0.1}
              value={formState.multipleOf}
              onChange={handleInputChange('multipleOf')}
              placeholder="ex: 1"
            />
            <small>
              Laissez vide pour autoriser n’importe quelle quantité. Exemple : 1 = multiples
              de 1 (pratique pour le Gruyère).
            </small>
          </label>

          <label className="form-field checkbox-field">
            <div className="checkbox-line">
              <input
                type="checkbox"
                checked={formState.commentEnabled}
                onChange={handleCommentToggle}
              />
              <span>Afficher un champ commentaire pour ce produit</span>
            </div>
            <small>
              Permet au client de préciser “doux / salé”, “nature / ail / fines herbes”, etc.
            </small>
          </label>

          <div className="form-actions">
            <button className="primary-button" type="submit">
              {editingId ? 'Mettre à jour' : 'Ajouter à la carte'}
            </button>
            {editingId && (
              <button className="ghost-button" type="button" onClick={resetForm}>
                Annuler
              </button>
            )}
          </div>
        </form>

        <div className="card">
          <h3>Carte actuelle</h3>
          {items.length === 0 ? (
            <p className="muted">Aucun produit configuré pour le moment.</p>
          ) : (
            <ul className="item-list">
              {items.map((item) => (
                <li key={item.id}>
                  <div>
                    <strong>{item.name}</strong>
                    <p className="muted">
                      {formatAriary(item.price)}{' '}
                      {QUANTITY_TYPE_LABELS[item.quantityType]}
                    </p>
                    <p className="muted">
                      {item.multipleOf
                        ? `Quantité multiple de ${item.multipleOf} ${QUANTITY_TYPE_LABELS[item.quantityType]}`
                        : 'Quantité libre'}
                    </p>
                    <p className="muted">
                      Commentaire {item.commentEnabled ? 'activé' : 'désactivé'}
                    </p>
                  </div>
                  <div className="item-actions">
                    <button
                      className="ghost-button"
                      type="button"
                      onClick={() => populateForEdit(item)}
                    >
                      Modifier
                    </button>
                    <button
                      className="ghost-button"
                      type="button"
                      onClick={() => removeItem(item.id)}
                    >
                      Retirer
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}

export default ConfigPage
