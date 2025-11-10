export const formatAriary = (value: number) =>
  `${value.toLocaleString('fr-FR', {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 1,
    maximumFractionDigits: Number.isInteger(value) ? 0 : 1,
  })} Ar`
