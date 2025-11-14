import type { Order } from '../types.ts'

export const TRANSPORT_FEE_PER_PRODUCT = 1000

export const computeOrderFinancials = (order: Order) => {
  const productTotal = order.entries.reduce(
    (sum, entry) => sum + entry.quantity * entry.unitPrice,
    0,
  )
  const transportFee = order.entries.length * TRANSPORT_FEE_PER_PRODUCT
  const grandTotal = productTotal + transportFee

  return { productTotal, transportFee, grandTotal }
}
