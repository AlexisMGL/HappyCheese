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

interface AppDataContextShape {
  items: CheeseItem[]
  orders: Order[]
  clients: Client[]
  loading: boolean
  addItem: (payload: Omit<CheeseItem, 'id'>) => Promise<void>
  updateItem: (id: string, payload: Omit<CheeseItem, 'id'>) => Promise<void>
  removeItem: (id: string) => Promise<void>
  addOrder: (payload: NewOrder) => Promise<void>
  updateOrderStatus: (id: string, status: OrderStatus) => Promise<void>
  removeOrder: (id: string) => Promise<void>
  addClient: (payload: { name: string; contact?: string }) => Promise<void>
  removeClient: (id: string) => Promise<void>
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

  useEffect(() => {
    ;(async () => {
      try {
        await Promise.all([fetchItems(), fetchOrders(), fetchClients()])
      } catch (error) {
        console.error('Supabase init error', error)
      } finally {
        setLoading(false)
      }
    })()
  }, [fetchItems, fetchOrders, fetchClients])

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
    const { error } = await supabase.from('clients').delete().eq('id', id)
    if (error) {
      throw error
    }
    setClients((prev) => prev.filter((client) => client.id !== id))
  }

  const value = useMemo(
    () => ({
      items,
      orders,
      clients,
      loading,
      addItem,
      updateItem,
      removeItem,
      addOrder,
      updateOrderStatus,
      removeOrder,
      addClient,
      removeClient,
    }),
    [items, orders, clients, loading],
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
