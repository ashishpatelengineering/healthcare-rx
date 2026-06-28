import { ALL_YEARS, ALL_QUARTERS, BUCKET_ORDER, COLORS } from './constants'

// ── Filtering ────────────────────────────────────────────────────────────────
const QMAP = { Q1:[1,2,3], Q2:[4,5,6], Q3:[7,8,9], Q4:[10,11,12] }

export function filterTime(data, selYears, selQuarters) {
  if (!data?.length) return []

  const yearsSet   = new Set(selYears)
  const allYears   = selYears.length === ALL_YEARS.length
  const allQ       = selQuarters.length === ALL_QUARTERS.length
  const allowedM   = new Set(selQuarters.flatMap(q => QMAP[q] || []))
  const qLabels    = new Set(selYears.flatMap(y => selQuarters.map(q => `${q} ${y}`)))

  return data.filter(row => {
    if (!allYears && 'year' in row && !yearsSet.has(row.year)) return false
    if (!allQ) {
      if ('quarter_label' in row) return qLabels.has(row.quarter_label)
      if ('month_num' in row)     return allowedM.has(row.month_num)
    }
    return true
  })
}

// ── Sorting ──────────────────────────────────────────────────────────────────
export function sortByMonth(data, col = 'month_label') {
  return [...data].sort((a, b) =>
    new Date(a[col] + '-01') - new Date(b[col] + '-01'))
}

// ── Aggregation ──────────────────────────────────────────────────────────────
export function sum(data, col) {
  return data.reduce((acc, r) => acc + (Number(r[col]) || 0), 0)
}

export function mean(data, col) {
  if (!data.length) return 0
  return sum(data, col) / data.length
}

export function groupSum(data, groupCols, valueCols) {
  const isArr  = Array.isArray(groupCols)
  const gCols  = isArr ? groupCols : [groupCols]
  const key    = row => gCols.map(c => row[c]).join('|||')
  const groups = {}

  data.forEach(row => {
    const k = key(row)
    if (!groups[k]) {
      groups[k] = {}
      gCols.forEach(c => groups[k][c] = row[c])
      valueCols.forEach(c => groups[k][c] = 0)
    }
    valueCols.forEach(c => groups[k][c] += Number(row[c]) || 0)
  })
  return Object.values(groups)
}

// ── Bucket ordering ──────────────────────────────────────────────────────────
const BUCKET_IDX = Object.fromEntries(BUCKET_ORDER.map((b, i) => [b, i]))
export function sortBuckets(data, col = 'fulfillment_bucket') {
  return [...data].sort((a, b) =>
    (BUCKET_IDX[a[col]] ?? 99) - (BUCKET_IDX[b[col]] ?? 99))
}

// ── Formatting ───────────────────────────────────────────────────────────────
export const fmtM   = v => v == null ? '—' : `$${(v/1_000_000).toFixed(2)}M`
export const fmtPct = v => v == null ? '—' : `${Number(v).toFixed(1)}%`
export const fmtK   = v => v == null ? '—' : `$${Number(v).toLocaleString('en-US', { maximumFractionDigits:0 })}`
export const fmtN   = v => v == null ? '—' : Number(v).toLocaleString('en-US', { maximumFractionDigits:0 })

export function activeFilterSummary(selYears, selQuarters) {
  const parts = []
  if (selYears.length !== ALL_YEARS.length)
    parts.push(`Years: ${[...selYears].sort().join(', ')}`)
  if (selQuarters.length !== ALL_QUARTERS.length)
    parts.push(`Quarters: ${selQuarters.join(', ')}`)
  return parts.length ? 'Filtered — ' + parts.join(' · ') : 'All data · Jan 2023 – Dec 2024'
}

// ── Plotly helpers ───────────────────────────────────────────────────────────

/** Build one bar/scatter trace per unique value of colorCol */
export function tracesByColor(data, { x, y, colorCol, colorMap, type='bar', mode, extra={} }) {
  const groups = {}
  data.forEach(row => {
    const k = row[colorCol]
    if (!groups[k]) groups[k] = { x:[], y:[] }
    groups[k].x.push(row[x])
    groups[k].y.push(row[y])
  })
  return Object.entries(groups).map(([name, {x:xs, y:ys}]) => ({
    type,
    mode,
    name,
    x: xs,
    y: ys,
    marker: { color: colorMap?.[name] ?? COLORS[Object.keys(groups).indexOf(name) % COLORS.length] },
    ...extra,
  }))
}

/** Pivot data into a 2-D matrix for heatmaps */
export function pivotMatrix(data, { rowCol, colCol, valCol }) {
  const rows = [...new Set(data.map(r => r[rowCol]))]
  const cols = [...new Set(data.map(r => r[colCol]))]
  const idx  = {}
  data.forEach(r => { idx[`${r[rowCol]}|||${r[colCol]}`] = r[valCol] })
  const z = rows.map(row => cols.map(col => idx[`${row}|||${col}`] ?? null))
  return { z, x: cols, y: rows }
}

/** Build color scale array for Plotly */
export function colorScale(from, mid, to) {
  return [[0, from], [0.5, mid], [1, to]]
}
