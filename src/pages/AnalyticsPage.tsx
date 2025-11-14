import {
  useMemo,
  useState,
  type ChangeEvent,
  type ReactNode,
} from 'react'
import { useAppData } from '../store.tsx'
import { formatAriary } from '../utils/currency.ts'
import { computeOrderFinancials } from '../utils/orders.ts'
import type { Order } from '../types.ts'

type DatePreset = '30' | '90' | '365' | 'custom'

type CustomRangeState = {
  start: string
  end: string
}

type DateRange = {
  start: Date | null
  end: Date
}

type OrderSnapshot = {
  order: Order
  createdAt: Date
  totals: ReturnType<typeof computeOrderFinancials>
}

type ChartPoint = {
  label: string
  value: number
}

type HorizontalDatum = {
  label: string
  value: number
  detail?: string
}

const presetOptions: Array<{ id: DatePreset; label: string; days?: number }> = [
  { id: '30', label: '30 derniers jours', days: 30 },
  { id: '90', label: '90 derniers jours', days: 90 },
  { id: '365', label: '12 derniers mois', days: 365 },
  { id: 'custom', label: 'Plage personnalisee' },
]

const fullDateFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
})

const weekLabelFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: 'short',
})

const monthLabelFormatter = new Intl.DateTimeFormat('fr-FR', {
  month: 'short',
  year: '2-digit',
})

const numberFormatter = new Intl.NumberFormat('fr-FR', {
  maximumFractionDigits: 0,
})

const decimalFormatter = new Intl.NumberFormat('fr-FR', {
  maximumFractionDigits: 1,
})

const percentFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'percent',
  maximumFractionDigits: 1,
})

const formatInputDate = (date: Date) => date.toISOString().slice(0, 10)

const clampToStartOfDay = (date: Date) => {
  const copy = new Date(date)
  copy.setHours(0, 0, 0, 0)
  return copy
}

const clampToEndOfDay = (date: Date) => {
  const copy = new Date(date)
  copy.setHours(23, 59, 59, 999)
  return copy
}

const parseDateInput = (value: string) => {
  if (!value) {
    return null
  }
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) {
    return null
  }
  const parsed = new Date(year, month - 1, day)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const addDays = (source: Date, amount: number) => {
  const next = new Date(source)
  next.setDate(next.getDate() + amount)
  return next
}

const startOfWeek = (source: Date) => {
  const base = clampToStartOfDay(source)
  const day = base.getDay()
  const diff = day === 0 ? 6 : day - 1
  return addDays(base, -diff)
}

const buildRangeLabel = (range: DateRange) => {
  const endLabel = fullDateFormatter.format(range.end)
  if (!range.start) {
    return `Jusqu'au ${endLabel}`
  }
  const startLabel = fullDateFormatter.format(range.start)
  const diffMs = range.end.getTime() - range.start.getTime()
  const diffDays = Math.max(1, Math.round(diffMs / 86_400_000) + 1)
  return `Du ${startLabel} au ${endLabel} - ${diffDays} jours`
}

const buildDateRange = (
  preset: DatePreset,
  customRange: CustomRangeState,
): DateRange => {
  const today = clampToEndOfDay(new Date())
  if (preset === 'custom') {
    const parsedStart = parseDateInput(customRange.start)
    const parsedEnd = parseDateInput(customRange.end)
    const endDate = clampToEndOfDay(parsedEnd ?? today)
    const startDate = parsedStart ? clampToStartOfDay(parsedStart) : null
    if (startDate && startDate > endDate) {
      return { start: endDate, end: endDate }
    }
    return { start: startDate, end: endDate }
  }
  const days = preset === '30' ? 30 : preset === '90' ? 90 : 365
  const startDate = clampToStartOfDay(new Date(today))
  startDate.setDate(startDate.getDate() - (days - 1))
  return { start: startDate, end: today }
}

const buildOrderSnapshots = (orders: Order[], range: DateRange): OrderSnapshot[] => {
  const startTime = range.start ? range.start.getTime() : null
  const endTime = range.end.getTime()
  return orders
    .map((order) => {
      const createdAt = new Date(order.createdAt)
      if (Number.isNaN(createdAt.getTime())) {
        return null
      }
      return {
        order,
        createdAt,
        totals: computeOrderFinancials(order),
      }
    })
    .filter((snapshot): snapshot is OrderSnapshot => {
      if (!snapshot) {
        return false
      }
      const created = snapshot.createdAt.getTime()
      if (startTime !== null && created < startTime) {
        return false
      }
      return created <= endTime
    })
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
}

const computeWeeklySeries = (
  snapshots: OrderSnapshot[],
  endDate: Date,
  weeksCount: number,
  mode: 'volume' | 'count',
): ChartPoint[] => {
  if (!weeksCount) {
    return []
  }
  const series: ChartPoint[] = []
  const endReference = clampToEndOfDay(endDate)
  const currentWeekStart = startOfWeek(endReference)
  for (let step = weeksCount - 1; step >= 0; step -= 1) {
    const weekStart = addDays(currentWeekStart, step * -7)
    const weekEnd = clampToEndOfDay(addDays(weekStart, 6))
    const label = `${weekLabelFormatter.format(weekStart)}-${weekLabelFormatter.format(weekEnd)}`
    let value = 0
    snapshots.forEach((snapshot) => {
      const created = snapshot.createdAt.getTime()
      if (created >= weekStart.getTime() && created <= weekEnd.getTime()) {
        value += mode === 'volume' ? snapshot.totals.grandTotal : 1
      }
    })
    series.push({ label, value })
  }
  return series
}

const computeMonthlySeries = (
  snapshots: OrderSnapshot[],
  endDate: Date,
  monthsCount: number,
): ChartPoint[] => {
  if (!monthsCount) {
    return []
  }
  const points: ChartPoint[] = []
  const anchor = new Date(endDate.getFullYear(), endDate.getMonth(), 1)
  for (let index = monthsCount - 1; index >= 0; index -= 1) {
    const target = new Date(anchor)
    target.setMonth(target.getMonth() - index)
    const monthStart = new Date(target.getFullYear(), target.getMonth(), 1)
    const monthEnd = clampToEndOfDay(
      new Date(target.getFullYear(), target.getMonth() + 1, 0),
    )
    const label = monthLabelFormatter.format(monthStart)
    let total = 0
    snapshots.forEach((snapshot) => {
      const created = snapshot.createdAt.getTime()
      if (created >= monthStart.getTime() && created <= monthEnd.getTime()) {
        total += snapshot.totals.grandTotal
      }
    })
    points.push({ label, value: total })
  }
  return points
}

const computeWeekdayDistribution = (snapshots: OrderSnapshot[]): ChartPoint[] => {
  const buckets = new Array(7).fill(0)
  snapshots.forEach((snapshot) => {
    const day = snapshot.createdAt.getDay()
    const normalizedIndex = day === 0 ? 6 : day - 1
    buckets[normalizedIndex] += 1
  })
  const labels = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
  return buckets.map((value, index) => ({ label: labels[index], value }))
}

const formatNumber = (value: number) =>
  numberFormatter.format(Math.round(value))

const AnalyticsPage = () => {
  const { orders, loading } = useAppData()
  const [preset, setPreset] = useState<DatePreset>('90')
  const [customRange, setCustomRange] = useState<CustomRangeState>(() => {
    const today = new Date()
    const start = new Date(today)
    start.setDate(start.getDate() - 89)
    return {
      start: formatInputDate(start),
      end: formatInputDate(today),
    }
  })

  const dateRange = useMemo(
    () => buildDateRange(preset, customRange),
    [preset, customRange],
  )

  const snapshots = useMemo(
    () => buildOrderSnapshots(orders, dateRange),
    [orders, dateRange],
  )

  const totals = useMemo(() => {
    return snapshots.reduce(
      (acc, snapshot) => {
        acc.products += snapshot.totals.productTotal
        acc.transport += snapshot.totals.transportFee
        acc.lines += snapshot.order.entries.length
        acc.clients.add(snapshot.order.customerName.trim() || 'Client')
        return acc
      },
      {
        products: 0,
        transport: 0,
        lines: 0,
        clients: new Set<string>(),
      },
    )
  }, [snapshots])

  const totalVolume = totals.products + totals.transport
  const orderCount = snapshots.length
  const averageOrder = orderCount ? totalVolume / orderCount : 0
  const averageLines = orderCount ? totals.lines / orderCount : 0

  const weeklyVolume = useMemo(
    () => computeWeeklySeries(snapshots, dateRange.end, 5, 'volume'),
    [snapshots, dateRange.end],
  )

  const weeklyOrderCounts = useMemo(
    () => computeWeeklySeries(snapshots, dateRange.end, 5, 'count'),
    [snapshots, dateRange.end],
  )

  const monthlyVolume = useMemo(
    () => computeMonthlySeries(snapshots, dateRange.end, 12),
    [snapshots, dateRange.end],
  )

  const weekdaySplit = useMemo(
    () => computeWeekdayDistribution(snapshots),
    [snapshots],
  )

  const productDistribution = useMemo(() => {
    const map = new Map<string, { total: number; lines: number }>()
    snapshots.forEach((snapshot) => {
      snapshot.order.entries.forEach((entry) => {
        const current = map.get(entry.itemName) ?? { total: 0, lines: 0 }
        current.total += entry.unitPrice * entry.quantity
        current.lines += entry.quantity
        map.set(entry.itemName, current)
      })
    })
    const dataset = Array.from(map.entries()).map(([label, stats]) => ({
      label,
      total: stats.total,
      lines: stats.lines,
    }))
    dataset.sort((a, b) => b.total - a.total)
    const combinedTotal = dataset.reduce((sum, item) => sum + item.total, 0)
    const topEntries = dataset.slice(0, 5)
    const remainderEntries = dataset.slice(5)
    const rows: HorizontalDatum[] = topEntries.map((entry) => ({
      label: entry.label,
      value: entry.total,
      detail: `${formatNumber(entry.lines)} qtés`,
    }))
    if (remainderEntries.length) {
      const rest = remainderEntries.reduce(
        (acc, item) => ({
          total: acc.total + item.total,
          lines: acc.lines + item.lines,
        }),
        { total: 0, lines: 0 },
      )
      rows.push({
        label: 'Autres',
        value: rest.total,
        detail: `${formatNumber(rest.lines)} qtés`,
      })
    }
    return { total: combinedTotal, rows }
  }, [snapshots])

  const topCustomers = useMemo(() => {
    const map = new Map<string, { total: number; orders: number }>()
    snapshots.forEach((snapshot) => {
      const name = snapshot.order.customerName.trim() || 'Client sans nom'
      const current = map.get(name) ?? { total: 0, orders: 0 }
      current.total += snapshot.totals.grandTotal
      current.orders += 1
      map.set(name, current)
    })
    const rows: HorizontalDatum[] = Array.from(map.entries())
      .map(([label, stats]) => ({
        label,
        value: stats.total,
        detail: `${stats.orders} commande${stats.orders > 1 ? 's' : ''}`,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
    return rows
  }, [snapshots])

  const handlePresetChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextPreset = event.target.value as DatePreset
    if (nextPreset === 'custom') {
      setCustomRange((prev) => ({
        start:
          dateRange.start !== null
            ? formatInputDate(dateRange.start)
            : prev.start || formatInputDate(dateRange.end),
        end: formatInputDate(dateRange.end),
      }))
    }
    setPreset(nextPreset)
  }

  const handleCustomDateChange = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const { name, value } = event.target
    setCustomRange((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const rangeLabel = buildRangeLabel(dateRange)
  const showEmptyState = !loading && snapshots.length === 0

  return (
    <div className="analytics-page">
      <header className="analytics-header">
        <div>
          <p className="eyebrow">Pilotage</p>
          <h2>Analytics commandes</h2>
          <p className="muted">{rangeLabel}</p>
        </div>
        <div className="analytics-filters">
          <label>
            Horizon
            <select value={preset} onChange={handlePresetChange}>
              {presetOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          {preset === 'custom' && (
            <div className="custom-range-inputs">
              <label>
                Du
                <input
                  type="date"
                  name="start"
                  value={customRange.start}
                  onChange={handleCustomDateChange}
                  max={customRange.end || formatInputDate(new Date())}
                />
              </label>
              <label>
                Au
                <input
                  type="date"
                  name="end"
                  value={customRange.end}
                  onChange={handleCustomDateChange}
                  max={formatInputDate(new Date())}
                />
              </label>
            </div>
          )}
        </div>
      </header>

      {loading && <div className="empty-state">Chargement des données...</div>}
      {showEmptyState && (
        <div className="empty-state">
          <p>Aucune commande sur la période sélectionnée.</p>
        </div>
      )}

      {!loading && !showEmptyState && (
        <>
          <section className="quick-metrics">
            <MetricCard label="Volume total" value={formatAriary(totalVolume)} />
            <MetricCard
              label="Commandes"
              value={formatNumber(orderCount)}
              helper={`${decimalFormatter.format(averageLines)} lignes / commande`}
            />
            <MetricCard
              label="Panier moyen"
              value={formatAriary(averageOrder)}
              helper="Produits + transport"
            />
            <MetricCard
              label="Clients actifs"
              value={formatNumber(totals.clients.size)}
              helper="Période filtrée"
            />
          </section>

          <section className="chart-grid">
            <ChartCard
              title="Volume (MGA) par semaine"
              description="5 dernières semaines"
            >
              <BarChart
                data={weeklyVolume}
                valueFormatter={formatAriary}
              />
            </ChartCard>

            <ChartCard
              title="Nombre de commandes par semaine"
              description="5 dernières semaines"
            >
              <BarChart
                data={weeklyOrderCounts}
                valueFormatter={(value) => `${formatNumber(value)} cmd`}
              />
            </ChartCard>

            <ChartCard
              title="Volume mensuel (12 mois)"
              description="Tendance rolling"
            >
              <BarChart
                data={monthlyVolume}
                valueFormatter={formatAriary}
              />
            </ChartCard>

            <ChartCard
              title="Activité par jour"
              description="Rythme hebdo"
            >
              <BarChart
                data={weekdaySplit}
                valueFormatter={(value) => formatNumber(value)}
              />
            </ChartCard>

            <ChartCard
              title="Répartition par produit"
              description="CA produits"
            >
              <HorizontalBarList
                data={productDistribution.rows}
                total={productDistribution.total}
                formatter={formatAriary}
                helper={(_, percent) => `${percentFormatter.format(percent / 100)} du total`}
              />
            </ChartCard>

            <ChartCard
              title="Top 5 clients"
              description="CA sur la période"
            >
              <HorizontalBarList
                data={topCustomers}
                total={totalVolume}
                formatter={formatAriary}
                helper={(item, percent) =>
                  `${percentFormatter.format(percent / 100)} - ${item.detail ?? ''}`
                }
              />
            </ChartCard>

            <ChartCard
              title="Poids des frais de transport"
              description="Produits vs transport"
            >
              <TransportSplit
                product={totals.products}
                transport={totals.transport}
              />
            </ChartCard>
          </section>
        </>
      )}
    </div>
  )
}

const MetricCard = ({
  label,
  value,
  helper,
}: {
  label: string
  value: string
  helper?: string
}) => (
  <article className="metric-card">
    <p className="eyebrow">{label}</p>
    <strong>{value}</strong>
    {helper && <span className="muted">{helper}</span>}
  </article>
)

const ChartCard = ({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) => (
  <section className="chart-card">
    <header>
      <div>
        {description && <p className="eyebrow">{description}</p>}
        <h3>{title}</h3>
      </div>
    </header>
    {children}
  </section>
)

const BarChart = ({
  data,
  valueFormatter = (value: number) => formatNumber(value),
}: {
  data: ChartPoint[]
  valueFormatter?: (value: number) => string
}) => {
  if (!data.length) {
    return <p className="muted">Aucune donnée disponible.</p>
  }
  const maxValue = Math.max(...data.map((point) => point.value), 0)
  if (maxValue === 0) {
    return <p className="muted">Pas encore de commandes sur cette période.</p>
  }
  return (
    <div className="bar-chart">
      {data.map((point) => {
        const height = Math.max(
          4,
          Math.round((point.value / maxValue) * 100),
        )
        return (
          <div key={point.label} className="bar-column">
            <div className="bar-value" style={{ height: `${height}%` }}>
              <span>{valueFormatter(point.value)}</span>
            </div>
            <span className="bar-label">{point.label}</span>
          </div>
        )
      })}
    </div>
  )
}

const HorizontalBarList = ({
  data,
  total,
  formatter = (value: number) => formatNumber(value),
  helper,
}: {
  data: HorizontalDatum[]
  total?: number
  formatter?: (value: number) => string
  helper?: (item: HorizontalDatum, percent: number) => string
}) => {
  if (!data.length) {
    return <p className="muted">Aucune donnée disponible.</p>
  }
  const maxValue = Math.max(...data.map((item) => item.value), 0)
  return (
    <ul className="horizontal-bars">
      {data.map((item) => {
        const denominator = total ?? maxValue
        const percent = denominator
          ? Math.min(100, (item.value / denominator) * 100)
          : 0
        const helperText = helper ? helper(item, Math.round(percent)) : item.detail
        return (
          <li key={item.label}>
            <div className="horizontal-bar-row">
              <div>
                <strong>{item.label}</strong>
                {helperText && <span className="muted">{helperText}</span>}
              </div>
              <span>{formatter(item.value)}</span>
            </div>
            <div className="horizontal-track">
              <div
                className="horizontal-fill"
                style={{ width: `${percent}%` }}
              />
            </div>
          </li>
        )
      })}
    </ul>
  )
}

const TransportSplit = ({
  product,
  transport,
}: {
  product: number
  transport: number
}) => {
  const total = product + transport
  if (!total) {
    return <p className="muted">Pas de données pour calculer la répartition.</p>
  }
  const transportShare = transport / total
  const productShare = product / total
  return (
    <div className="transport-split">
      <div className="stacked-bar">
        <div
          className="segment product"
          style={{ width: `${productShare * 100}%` }}
        />
        <div
          className="segment transport"
          style={{ width: `${transportShare * 100}%` }}
        />
      </div>
      <div className="split-legend">
        <div>
          <p className="eyebrow">Produits</p>
          <strong>{formatAriary(product)}</strong>
          <span className="muted">
            {percentFormatter.format(productShare)}
          </span>
        </div>
        <div>
          <p className="eyebrow">Transport</p>
          <strong>{formatAriary(transport)}</strong>
          <span className="muted">
            {percentFormatter.format(transportShare)}
          </span>
        </div>
      </div>
    </div>
  )
}

export default AnalyticsPage
