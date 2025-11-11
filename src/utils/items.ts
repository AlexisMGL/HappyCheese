import {
  QUANTITY_INPUT_STEP,
  QUANTITY_TYPE_LABELS,
  type CheeseItem,
  type QuantityType,
} from '../types.ts'

const EPSILON = 0.0001
const KG_PER_UNIT: Record<QuantityType, number> = {
  '/pc': 1,
  '/kg': 1,
  '/100g': 0.1,
  '/500g': 0.5,
}

const getQuantityType = (source: CheeseItem | QuantityType): QuantityType =>
  typeof source === 'string' ? source : source.quantityType

const isPieceQuantity = (source: CheeseItem | QuantityType) =>
  getQuantityType(source) === '/pc'

const unitSizeInKg = (source: CheeseItem | QuantityType) =>
  KG_PER_UNIT[getQuantityType(source)] ?? 1

export const inputStepFor = (item: CheeseItem) =>
  item.step ?? QUANTITY_INPUT_STEP[item.quantityType]

export const displayUnitLabelFor = (source: CheeseItem | QuantityType) =>
  isPieceQuantity(source) ? 'pc' : 'kg'

export const toUnitQuantity = (
  source: CheeseItem | QuantityType,
  displayQuantity: number,
) => {
  if (!Number.isFinite(displayQuantity) || displayQuantity === 0) {
    return 0
  }
  if (isPieceQuantity(source)) {
    return displayQuantity
  }
  const size = unitSizeInKg(source)
  if (size <= 0) {
    return displayQuantity
  }
  return displayQuantity / size
}

export const toDisplayQuantity = (
  source: CheeseItem | QuantityType,
  unitQuantity: number,
) => {
  if (!Number.isFinite(unitQuantity) || unitQuantity === 0) {
    return 0
  }
  if (isPieceQuantity(source)) {
    return unitQuantity
  }
  const size = unitSizeInKg(source)
  if (size <= 0) {
    return unitQuantity
  }
  return unitQuantity * size
}

export const validateQuantityMultiple = (
  item: CheeseItem,
  quantity: number,
): string | null => {
  if (!item.multipleOf || quantity === 0) {
    return null
  }

  const unitQuantity = toUnitQuantity(item, quantity)
  if (unitQuantity === 0) {
    return null
  }

  const ratio = unitQuantity / item.multipleOf
  const isMultiple = Math.abs(ratio - Math.round(ratio)) < EPSILON
  if (isMultiple) {
    return null
  }

  return `Quantité multiple de ${item.multipleOf} ${QUANTITY_TYPE_LABELS[item.quantityType]}`
}
