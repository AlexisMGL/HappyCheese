import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  QUANTITY_INPUT_STEP,
  type Client,
  type CheeseItem,
  type ConsignTotal,
  type ConsignType,
  type Order,
  type OrderEntry,
  type OrderStatus,
  type QuantityType,
} from './types.ts'
import { supabase } from './lib/supabaseClient.ts'

interface NewOrderEntry {
  itemId: string
  quantity: number
  comment?: string
}

interface NewOrder {
  clientId: string
  customerName: string
  contact: string
  notes: string
  entries: NewOrderEntry[]
}

interface ConsignItemInput {
  typeId: string
  quantity: number
}

interface ConsignTransactionPayload {
  clientId: string
  items: ConsignItemInput[]
  note?: string
}

interface AppDataContextShape {
  items: CheeseItem[]
  orders: Order[]
  clients: Client[]
  consignTypes: ConsignType[]
  consignTotals: ConsignTotal[]
  loading: boolean
  addItem: (payload: Omit<CheeseItem, 'id'>) => Promise<void>
  updateItem: (id: string, payload: Omit<CheeseItem, 'id'>) => Promise<void>
  removeItem: (id: string) => Promise<void>
  addOrder: (payload: NewOrder) => Promise<void>
  updateOrderStatus: (id: string, status: OrderStatus) => Promise<void>
  removeOrder: (id: string) => Promise<void>
  addClient: (payload: { name: string; contact?: string }) => Promise<void>
  removeClient: (id: string) => Promise<void>
  addConsignType: (label: string) => Promise<void>
  removeConsignType: (id: string) => Promise<void>
  assignConsigns: (payload: ConsignTransactionPayload) => Promise<void>
  returnConsigns: (payload: ConsignTransactionPayload) => Promise<void>
}

const AppDataContext = createContext<AppDataContextShape | undefined>(undefined)

type ItemRow = {
  id: string
  name: string
  price: number
  quantity_type: QuantityType
  multiple_of: number | null
  step: number | null
  comment_enabled: boolean | null
}

type OrderRow = {
  id: string
  customer_name: string
  contact: string | null
  notes: string | null
  client_id: string | null
  created_at: string
  status: OrderStatus
  order_items: OrderItemRow[]
}

type OrderItemRow = {
  id: string
  item_id: string | null
  item_name: string
  quantity: number
  quantity_type: QuantityType
  unit_price: number
  comment: string | null
}

type ClientRow = {
  id: string
  name: string
  contact: string | null
  created_at: string
}

type ConsignTypeRow = {
  id: string
  label: string
  created_at: string
}

type ConsignMovementRow = {
  id: string
  client_id: string
  type_id: string
  quantity: number
  note: string | null
  created_at: string
}

const mapItemFromRow = (row: ItemRow): CheeseItem => ({
  id: row.id,
  name: row.name,
  price: row.price,
  quantityType: row.quantity_type,
  multipleOf: row.multiple_of ?? undefined,
  commentEnabled: Boolean(row.comment_enabled),
  step: row.step ?? QUANTITY_INPUT_STEP[row.quantity_type],
})

const mapOrderFromRow = (row: OrderRow): Order => ({
  id: row.id,
  customerName: row.customer_name,
  contact: row.contact ?? '',
  notes: row.notes ?? '',
  clientId: row.client_id,
  createdAt: row.created_at,
  status: row.status,
  entries: row.order_items.map(mapOrderEntryFromRow),
})

const mapOrderEntryFromRow = (row: OrderItemRow): OrderEntry => ({
  id: row.id,
  itemId: row.item_id ?? row.id,
  itemName: row.item_name,
  quantity: row.quantity,
  quantityType: row.quantity_type,
  unitPrice: row.unit_price,
  comment: row.comment ?? undefined,
})

const mapClientFromRow = (row: ClientRow): Client => ({
  id: row.id,
  name: row.name,
  contact: row.contact ?? '',
  createdAt: row.created_at,
})

const mapConsignTypeFromRow = (row: ConsignTypeRow): ConsignType => ({
  id: row.id,
  label: row.label,
  createdAt: row.created_at,
})

const buildConsignTotalsFromRows = (
  rows: Array<Pick<ConsignMovementRow, 'client_id' | 'type_id' | 'quantity'>>,
): ConsignTotal[] => {
  const map = new Map<string, number>()
  rows.forEach((row) => {
    if (!row.client_id || !row.type_id) {
      return
    }
    const key = `${row.client_id}::${row.type_id}`
    const existing = map.get(key) ?? 0
    map.set(key, existing + row.quantity)
  })
  return Array.from(map.entries())
    .map(([key, quantity]) => {
      if (quantity === 0) {
        return null
      }
      const [clientId, typeId] = key.split('::')
      return {
        clientId,
        typeId,
        quantity,
      }
    })
    .filter((entry): entry is ConsignTotal => Boolean(entry))
}

const sanitizeConsignItems = (items: ConsignItemInput[]): ConsignItemInput[] => {
  const aggregates = new Map<string, number>()
  items.forEach((item) => {
    const trimmedId = item.typeId?.trim()
    if (!trimmedId) {
      return
    }
    const numericQuantity = Math.floor(Number(item.quantity))
    if (!Number.isFinite(numericQuantity) || numericQuantity <= 0) {
      return
    }
    aggregates.set(
      trimmedId,
      (aggregates.get(trimmedId) ?? 0) + numericQuantity,
    )
  })
  return Array.from(aggregates.entries()).map(([typeId, quantity]) => ({
    typeId,
    quantity,
  }))
}

const applyConsignDeltas = (
  totals: ConsignTotal[],
  clientId: string,
  items: ConsignItemInput[],
  multiplier: 1 | -1,
): ConsignTotal[] => {
  const map = new Map<string, number>()
  totals.forEach((entry) => {
    const key = `${entry.clientId}::${entry.typeId}`
    map.set(key, entry.quantity)
  })
  items.forEach((item) => {
    const key = `${clientId}::${item.typeId}`
    const current = map.get(key) ?? 0
    const next = current + item.quantity * multiplier
    if (next === 0) {
      map.delete(key)
    } else {
      map.set(key, next)
    }
  })
  return Array.from(map.entries())
    .map(([key, quantity]) => {
      const [nextClientId, nextTypeId] = key.split('::')
      return {
        clientId: nextClientId,
        typeId: nextTypeId,
        quantity,
      }
    })
    .filter((entry) => entry.quantity !== 0)
}

const normalizeItemPayload = (payload: Omit<CheeseItem, 'id'>) => ({
  name: payload.name,
  price: payload.price,
  quantity_type: payload.quantityType,
  multiple_of: payload.multipleOf ?? null,
  comment_enabled: payload.commentEnabled ?? false,
  step:
    typeof payload.step === 'number' && payload.step > 0
      ? payload.step
      : QUANTITY_INPUT_STEP[payload.quantityType],
})

export const AppDataProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CheeseItem[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [consignTypes, setConsignTypes] = useState<ConsignType[]>([])
  const [consignTotals, setConsignTotals] = useState<ConsignTotal[]>([])
  const [loading, setLoading] = useState(true)

  const fetchItems = useCallback(async () => {
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .order('name')
    if (error) {
      console.error(error)
      throw error
    }
    setItems((data ?? []).map(mapItemFromRow))
  }, [])

  const fetchOrders = useCallback(async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .order('created_at', { ascending: false })
    if (error) {
      console.error(error)
      throw error
    }
    setOrders((data ?? []).map(mapOrderFromRow))
  }, [])

  const fetchClients = useCallback(async () => {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('name')
    if (error) {
      console.error(error)
      throw error
    }
    setClients((data ?? []).map(mapClientFromRow))
  }, [])

  const fetchConsignTypes = useCallback(async () => {
    const { data, error } = await supabase
      .from('consign_types')
      .select('*')
      .order('label')
    if (error) {
      console.error(error)
      throw error
    }
    setConsignTypes((data ?? []).map(mapConsignTypeFromRow))
  }, [])

  const fetchConsignTotals = useCallback(async () => {
    const { data, error } = await supabase
      .from('consign_movements')
      .select('client_id,type_id,quantity')
    if (error) {
      console.error(error)
      throw error
    }
    setConsignTotals(buildConsignTotalsFromRows(data ?? []))
  }, [])

  useEffect(() => {
    ;(async () => {
      try {
        await Promise.all([
          fetchItems(),
          fetchOrders(),
          fetchClients(),
          fetchConsignTypes(),
          fetchConsignTotals(),
        ])
      } catch (error) {
        console.error('Supabase init error', error)
      } finally {
        setLoading(false)
      }
    })()
  }, [
    fetchItems,
    fetchOrders,
    fetchClients,
    fetchConsignTypes,
    fetchConsignTotals,
  ])

  const addItem = async (payload: Omit<CheeseItem, 'id'>) => {
    const dbPayload = normalizeItemPayload(payload)
    const { data, error } = await supabase
      .from('items')
      .insert(dbPayload)
      .select('*')
      .single()
    if (error || !data) {
      throw error
    }
    setItems((prev) => [...prev, mapItemFromRow(data)])
  }

  const updateItem = async (id: string, payload: Omit<CheeseItem, 'id'>) => {
    const dbPayload = normalizeItemPayload(payload)
    const { data, error } = await supabase
      .from('items')
      .update(dbPayload)
      .eq('id', id)
      .select('*')
      .single()
    if (error || !data) {
      throw error
    }
    setItems((prev) =>
      prev.map((item) => (item.id === id ? mapItemFromRow(data) : item)),
    )
  }

  const removeItem = async (id: string) => {
    const { error } = await supabase.from('items').delete().eq('id', id)
    if (error) {
      throw error
    }
    setItems((prev) => prev.filter((item) => item.id !== id))
  }

  const addOrder = async (payload: NewOrder) => {
    if (!payload.entries.length) {
      throw new Error('Impossible de créer une commande vide.')
    }
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        client_id: payload.clientId,
        customer_name: payload.customerName,
        contact: payload.contact,
        notes: payload.notes,
        status: 'nouvelle',
      })
      .select('*')
      .single()
    if (orderError || !order) {
      throw orderError
    }

    const orderItemsPayload = payload.entries.map((entry) => {
      const item = items.find((candidate) => candidate.id === entry.itemId)
      if (!item) {
        throw new Error('Produit introuvable')
      }
      return {
        order_id: order.id,
        item_id: item.id,
        item_name: item.name,
        quantity: entry.quantity,
        quantity_type: item.quantityType,
        unit_price: item.price,
        comment: entry.comment ?? null,
      }
    })

    const { data: insertedItems, error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItemsPayload)
      .select('*')
    if (itemsError) {
      throw itemsError
    }

    setOrders((prev) => [
      mapOrderFromRow({
        ...order,
        order_items: insertedItems ?? [],
      }),
      ...prev,
    ])
  }

  const updateOrderStatus = async (id: string, status: OrderStatus) => {
    const { error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', id)
    if (error) {
      throw error
    }
    setOrders((prev) =>
      prev.map((order) => (order.id === id ? { ...order, status } : order)),
    )
  }

  const removeOrder = async (id: string) => {
    const { error } = await supabase.from('orders').delete().eq('id', id)
    if (error) {
      throw error
    }
    setOrders((prev) => prev.filter((order) => order.id !== id))
  }

  const addClient = async (payload: { name: string; contact?: string }) => {
    const name = payload.name.trim()
    if (!name) {
      throw new Error('Le nom du client est obligatoire.')
    }
    const contact = payload.contact?.trim() ?? ''
    const { data, error } = await supabase
      .from('clients')
      .insert({
        name,
        contact: contact || null,
      })
      .select('*')
      .single()
    if (error || !data) {
      throw error
    }
    setClients((prev) =>
      [...prev, mapClientFromRow(data)].sort((a, b) =>
        a.name.localeCompare(b.name),
      ),
    )
  }

  const removeClient = async (id: string) => {
    const clientId = id.trim()
    if (!clientId) {
      throw new Error('Client introuvable.')
    }

    const { error: ordersUpdateError } = await supabase
      .from('orders')
      .update({ client_id: null })
      .eq('client_id', clientId)
    if (ordersUpdateError) {
      throw ordersUpdateError
    }

    const { error: movementsError } = await supabase
      .from('consign_movements')
      .delete()
      .eq('client_id', clientId)
    if (movementsError) {
      throw movementsError
    }

    const { error } = await supabase.from('clients').delete().eq('id', clientId)
    if (error) {
      throw error
    }
    setClients((prev) => prev.filter((client) => client.id !== clientId))
    setConsignTotals((prev) => prev.filter((entry) => entry.clientId !== clientId))
    setOrders((prev) =>
      prev.map((order) =>
        order.clientId === clientId ? { ...order, clientId: null } : order,
      ),
    )
  }

  const addConsignType = async (label: string) => {
    const trimmedLabel = label.trim()
    if (!trimmedLabel) {
      throw new Error('Le nom de la consigne est obligatoire.')
    }
    const { data, error } = await supabase
      .from('consign_types')
      .insert({ label: trimmedLabel })
      .select('*')
      .single()
    if (error || !data) {
      throw error
    }
    setConsignTypes((prev) =>
      [...prev, mapConsignTypeFromRow(data)].sort((a, b) =>
        a.label.localeCompare(b.label),
      ),
    )
  }

  const removeConsignType = async (id: string) => {
    const typeId = id.trim()
    if (!typeId) {
      throw new Error('Type introuvable.')
    }

    const { error: movementsError } = await supabase
      .from('consign_movements')
      .delete()
      .eq('type_id', typeId)
    if (movementsError) {
      throw movementsError
    }

    const { error } = await supabase.from('consign_types').delete().eq('id', typeId)
    if (error) {
      throw error
    }
    setConsignTypes((prev) => prev.filter((type) => type.id !== typeId))
    setConsignTotals((prev) => prev.filter((entry) => entry.typeId !== typeId))
  }

  const recordConsignMovements = useCallback(
    async (
      payload: ConsignTransactionPayload,
      multiplier: 1 | -1,
    ): Promise<void> => {
      const clientId = payload.clientId.trim()
      if (!clientId) {
        throw new Error('Selectionnez un client.')
      }
      const sanitizedItems = sanitizeConsignItems(payload.items)
      if (!sanitizedItems.length) {
        throw new Error('Ajoutez au moins une consigne a traiter.')
      }

      if (multiplier === -1) {
        const outstandingMap = new Map<string, number>()
        consignTotals.forEach((entry) => {
          if (entry.clientId === clientId) {
            outstandingMap.set(entry.typeId, entry.quantity)
          }
        })
        sanitizedItems.forEach((item) => {
          const available = outstandingMap.get(item.typeId) ?? 0
          if (item.quantity > available) {
            throw new Error(
              'Quantite retournee superieure aux consignes du client.',
            )
          }
        })
      }

      const payloadRows = sanitizedItems.map((item) => ({
        client_id: clientId,
        type_id: item.typeId,
        quantity: item.quantity * multiplier,
        note: payload.note?.trim() ? payload.note.trim() : null,
      }))
      const { error } = await supabase
        .from('consign_movements')
        .insert(payloadRows)
      if (error) {
        throw error
      }
      setConsignTotals((prev) =>
        applyConsignDeltas(prev, clientId, sanitizedItems, multiplier),
      )
    },
    [consignTotals],
  )

  const assignConsigns = useCallback(
    async (payload: ConsignTransactionPayload) => {
      await recordConsignMovements(payload, 1)
    },
    [recordConsignMovements],
  )

  const returnConsigns = useCallback(
    async (payload: ConsignTransactionPayload) => {
      await recordConsignMovements(payload, -1)
    },
    [recordConsignMovements],
  )

  const value = useMemo(
    () => ({
      items,
      orders,
      clients,
      consignTypes,
      consignTotals,
      loading,
      addItem,
      updateItem,
      removeItem,
      addOrder,
      updateOrderStatus,
      removeOrder,
      addClient,
      removeClient,
      addConsignType,
      removeConsignType,
      assignConsigns,
      returnConsigns,
    }),
    [
      items,
      orders,
      clients,
      consignTypes,
      consignTotals,
      loading,
      addConsignType,
      removeConsignType,
      assignConsigns,
      returnConsigns,
    ],
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
