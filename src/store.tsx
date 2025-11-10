import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type {
  CheeseItem,
  Order,
  OrderEntry,
  OrderStatus,
  QuantityType,
} from './types.ts'
import { QUANTITY_INPUT_STEP } from './types.ts'

interface NewOrderEntry {
  itemId: string
  quantity: number
  comment?: string
}

interface NewOrder {
  customerName: string
  contact: string
  notes: string
  entries: NewOrderEntry[]
}

interface AppDataContextShape {
  items: CheeseItem[]
  orders: Order[]
  addItem: (payload: Omit<CheeseItem, 'id'>) => void
  updateItem: (id: string, payload: Omit<CheeseItem, 'id'>) => void
  removeItem: (id: string) => void
  addOrder: (payload: NewOrder) => void
  updateOrderStatus: (id: string, status: OrderStatus) => void
}

const AppDataContext = createContext<AppDataContextShape | undefined>(undefined)

const STORAGE_KEYS = {
  items: 'happycheese-items',
  orders: 'happycheese-orders',
} as const

const defaultItems: CheeseItem[] = [
  {
    id: 'item-gruyere-stpaulin',
    name: 'Gruyere / Saint Paulin',
    price: 37500,
    quantityType: '/kg',
    multipleOf: 1,
    step: 1,
  },
  {
    id: 'item-fromage-fondu',
    name: 'Fromage fondu (nature/ail/fines herbes)',
    price: 7500,
    quantityType: '/500g',
    step: 1,
    commentEnabled: true,
  },
  {
    id: 'item-chevre',
    name: 'Fromage de chevre (80g piece)',
    price: 3500,
    quantityType: '/pc',
    multipleOf: 1,
    step: 1,
  },
  {
    id: 'item-fromage-blanc',
    name: 'Fromage blanc',
    price: 6000,
    quantityType: '/500g',
    step: 0.5,
  },
  {
    id: 'item-mozzarella',
    name: 'Mozzarella',
    price: 3400,
    quantityType: '/100g',
    step: 1,
  },
  {
    id: 'item-yaourt-nature',
    name: 'Yaourt Nature',
    price: 2500,
    quantityType: '/kg',
    step: 0.25,
  },
  {
    id: 'item-yaourt-sucre',
    name: 'Yaourt Sucre',
    price: 3500,
    quantityType: '/kg',
    step: 0.25,
  },
  {
    id: 'item-yaourt-grec',
    name: 'Yaourt Grec',
    price: 4000,
    quantityType: '/kg',
    step: 0.25,
  },
  {
    id: 'item-creme-fraiche',
    name: 'Creme Fraiche',
    price: 18000,
    quantityType: '/kg',
    step: 0.25,
  },
  {
    id: 'item-beurre',
    name: 'Beurre (doux/sale) - 250g',
    price: 11000,
    quantityType: '/pc',
    step: 1,
    commentEnabled: true,
  },
]

const hasWindow = typeof window !== 'undefined'

const readFromStorage = <T,>(key: string, fallback: T): T => {
  if (!hasWindow) {
    return fallback
  }
  const cached = window.localStorage.getItem(key)
  if (!cached) {
    return fallback
  }
  try {
    return JSON.parse(cached) as T
  } catch {
    return fallback
  }
}

const writeToStorage = <T,>(key: string, value: T) => {
  if (!hasWindow) {
    return
  }
  window.localStorage.setItem(key, JSON.stringify(value))
}

const generateId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return Math.random().toString(36).slice(2, 10)
}

const usePersistentState = <T,>(key: string, initialValue: T) => {
  const [value, setValue] = useState<T>(() => readFromStorage(key, initialValue))

  useEffect(() => {
    writeToStorage(key, value)
  }, [key, value])

  return [value, setValue] as const
}

const defaultStepFor = (quantityType: QuantityType) =>
  QUANTITY_INPUT_STEP[quantityType]

const normalizeItemPayload = (payload: Omit<CheeseItem, 'id'>) => {
  const normalizedMultiple =
    typeof payload.multipleOf === 'number' && payload.multipleOf > 0
      ? payload.multipleOf
      : undefined

  const normalizedStep =
    typeof payload.step === 'number' && payload.step > 0
      ? payload.step
      : undefined

  return {
    ...payload,
    multipleOf: normalizedMultiple,
    step: normalizedStep ?? defaultStepFor(payload.quantityType),
    commentEnabled: Boolean(payload.commentEnabled),
  }
}

export const AppDataProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = usePersistentState<CheeseItem[]>(
    STORAGE_KEYS.items,
    defaultItems,
  )
  const [orders, setOrders] = usePersistentState<Order[]>(
    STORAGE_KEYS.orders,
    [],
  )

  useEffect(() => {
    setItems((prev) => {
      let changed = false
      const next = prev.map((item) => {
        const legacy = item as CheeseItem & { orderStep?: number }
        let updated: CheeseItem = { ...item }

        if (typeof legacy.orderStep !== 'undefined') {
          const { orderStep, ...rest } = legacy
          updated = { ...rest }
          changed = true
        }

        if (
          updated.id === 'item-gruyere-stpaulin' &&
          updated.multipleOf !== 1
        ) {
          updated = { ...updated, multipleOf: 1 }
          changed = true
        }

        if (typeof updated.commentEnabled === 'undefined') {
          updated = { ...updated, commentEnabled: false }
          changed = true
        }

        if (typeof updated.step === 'undefined' || updated.step <= 0) {
          updated = { ...updated, step: defaultStepFor(updated.quantityType) }
          changed = true
        }

        return updated
      })
      return changed ? next : prev
    })
  }, [setItems])

  const addItem = (payload: Omit<CheeseItem, 'id'>) => {
    const normalized = normalizeItemPayload(payload)
    setItems((prev) => [...prev, { ...normalized, id: generateId() }])
  }

  const updateItem = (id: string, payload: Omit<CheeseItem, 'id'>) => {
    const normalized = normalizeItemPayload(payload)
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...normalized, id } : item)),
    )
  }

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id))
  }

  const addOrder = (payload: NewOrder) => {
    const orderEntries: OrderEntry[] = payload.entries
      .map((entry) => {
        const item = items.find((candidate) => candidate.id === entry.itemId)
        if (!item) {
          return undefined
        }
        return {
          id: generateId(),
          itemId: item.id,
          itemName: item.name,
          quantityType: item.quantityType,
          quantity: entry.quantity,
          unitPrice: item.price,
          comment: entry.comment?.trim() ? entry.comment.trim() : undefined,
        }
      })
      .filter(Boolean) as OrderEntry[]

    if (!orderEntries.length) {
      throw new Error('Impossible de créer une commande vide.')
    }

    const newOrder: Order = {
      id: generateId(),
      customerName: payload.customerName,
      contact: payload.contact,
      notes: payload.notes,
      createdAt: new Date().toISOString(),
      status: 'nouvelle',
      entries: orderEntries,
    }

    setOrders((prev) => [newOrder, ...prev])
  }

  const updateOrderStatus = (id: string, status: OrderStatus) => {
    setOrders((prev) =>
      prev.map((order) =>
        order.id === id
          ? {
              ...order,
              status,
            }
          : order,
      ),
    )
  }

  const value = useMemo(
    () => ({
      items,
      orders,
      addItem,
      updateItem,
      removeItem,
      addOrder,
      updateOrderStatus,
    }),
    [items, orders],
  )

  return (
    <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
  )
}

export const useAppData = () => {
  const ctx = useContext(AppDataContext)
  if (!ctx) {
    throw new Error('useAppData doit être utilisé dans AppDataProvider')
  }
  return ctx
}

export type { NewOrder, NewOrderEntry }
export type { QuantityType } from './types.ts'
