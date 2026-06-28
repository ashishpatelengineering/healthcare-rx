const BASE = import.meta.env.VITE_API_URL || ''
const CACHE = new Map()
const TTL   = 5 * 60 * 1000   // 5 minutes

async function get(path) {
  const now = Date.now()
  if (CACHE.has(path)) {
    const { data, ts } = CACHE.get(path)
    if (now - ts < TTL) return data
  }
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${path}`)
  const data = await res.json()
  CACHE.set(path, { data, ts: now })
  return data
}

export const api = {
  monthlyRxVolume:          () => get('/api/monthly-rx-volume'),
  fulfillmentSpeed:         () => get('/api/fulfillment-speed'),
  fulfillmentSpeedTrend:    () => get('/api/fulfillment-speed-trend'),
  newVsRefillTrend:         () => get('/api/new-vs-refill-trend'),
  monthlyFinancials:        () => get('/api/monthly-financials'),
  hospitalScorecard:        () => get('/api/hospital-scorecard'),
  hospitalChannel:          () => get('/api/hospital-channel'),
  drugCategoryPerformance:  () => get('/api/drug-category-performance'),
  regionalPerformance:      () => get('/api/regional-performance'),
}
