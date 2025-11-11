export type QuantityType = '/pc' | '/kg' | '/100g' | '/500g'

export interface CheeseItem {
  id: string
  name: string
  price: number
  quantityType: QuantityType
  multipleOf?: number
  commentEnabled?: boolean
  step?: number
}

export type OrderStatus =
  | 'nouvelle'
  | 'en_cours'
  | 'livree_pas_payee'
  | 'livree_payee'
  | 'non_livree_payee'

export interface OrderEntry {
  id: string
  itemId: string
  itemName: string
  quantityType: QuantityType
  quantity: number
  unitPrice: number
  comment?: string
}

export interface Order {
  id: string
  customerName: string
  contact: string
  notes: string
  createdAt: string
  status: OrderStatus
  entries: OrderEntry[]
  clientId?: string | null
}

export interface Client {
  id: string
  name: string
  contact: string
  createdAt: string
}

export const ORDER_STATUS_OPTIONS: Array<{ id: OrderStatus; label: string }> = [
  { id: 'nouvelle', label: 'Nouvelle commande' },
  { id: 'en_cours', label: 'En cours' },
  { id: 'livree_pas_payee', label: 'Livrée, pas payée' },
  { id: 'livree_payee', label: 'Livré & payé' },
  { id: 'non_livree_payee', label: 'Non livrée, payée' },
]

export const QUANTITY_TYPE_LABELS: Record<QuantityType, string> = {
  '/pc': '/pc',
  '/kg': '/kg',
  '/100g': '/100g',
  '/500g': '/500g',
}

export const QUANTITY_TYPE_OPTIONS: QuantityType[] = [
  '/pc',
  '/kg',
  '/100g',
  '/500g',
]

export const QUANTITY_INPUT_STEP: Record<QuantityType, number> = {
  '/pc': 1,
  '/kg': 0.1,
  '/100g': 1,
  '/500g': 0.5,
}
