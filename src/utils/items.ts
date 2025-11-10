import {
  QUANTITY_INPUT_STEP,
  QUANTITY_TYPE_LABELS,
  type CheeseItem,
} from '../types.ts'

const EPSILON = 0.0001

export const inputStepFor = (item: CheeseItem) =>
  QUANTITY_INPUT_STEP[item.quantityType]

export const validateQuantityMultiple = (
  item: CheeseItem,
  quantity: number,
): string | null => {
  if (!item.multipleOf || quantity === 0) {
    return null
  }

  const ratio = quantity / item.multipleOf
  const isMultiple = Math.abs(ratio - Math.round(ratio)) < EPSILON
  if (isMultiple) {
    return null
  }

  return `Quantité multiple de ${item.multipleOf} ${QUANTITY_TYPE_LABELS[item.quantityType]}`
}
