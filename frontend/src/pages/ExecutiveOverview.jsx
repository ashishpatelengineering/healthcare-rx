import { useState, useEffect, useMemo } from 'react'
import PageHeader from '../components/PageHeader'
import KPICard from '../components/KPICard'
import { Loading, ErrorMsg } from '../components/States'
import { useFilters } from '../context/FilterContext'
import { api } from '../api'
import { filterTime, sum, mean, fmtPct, fmtM } from '../utils'

export default function ExecutiveOverview() {
  const { selYears, selQuarters } = useFilters()
  const [raw, setRaw]   = useState(null)
  const [error, setErr] = useState(null)

  useEffect(() => {
    Promise.all([
      api.monthlyRxVolume(),
      api.fulfillmentSpeedTrend(),
      api.monthlyFinancials(),
      api.hospitalScorecard(),
    ])
      .then(([vol, trend, fin, hosp]) => setRaw({ vol, trend, fin, hosp }))
      .catch(e => setErr(e.message))
  }, [])

  const metrics = useMemo(() => {
    if (!raw) return null
    const vol   = filterTime(raw.vol,   selYears, selQuarters)
    const trend = filterTime(raw.trend, selYears, selQuarters)
    const fin   = filterTime(raw.fin,   selYears, selQuarters)
    const hosp  = raw.hosp  // no time dimension

    const totalRx     = sum(vol, 'rx_written')
    const totalFilled = sum(vol, 'rx_filled')
    const totalUnf    = totalRx - totalFilled
    const fillRate    = totalRx > 0 ? (totalFilled / totalRx * 100) : 0
    const totalRefill = sum(vol, 'rx_refill')
    const refillRate  = totalRx > 0 ? (totalRefill / totalRx * 100) : 0

    const tot    = sum(trend, 'rx_count')
    const sameCt = sum(trend.filter(r => r.fulfillment_bucket === 'Same Day Fulfilled'),        'rx_count')
    const subCt  = sum(trend.filter(r => r.fulfillment_bucket === 'Subsequent Days Fulfilled'), 'rx_count')
    const unfCt  = sum(trend.filter(r => r.fulfillment_bucket === 'Unfulfilled'),               'rx_count')
    const sameDayRate = tot > 0 ? sameCt / tot * 100 : 0
    const subRate     = tot > 0 ? subCt  / tot * 100 : 0

    const avgDays = hosp.length ? mean(hosp, 'avg_days_to_fill') : 0

    const totalRev    = sum(fin, 'revenue')
    const totalCost   = sum(fin, 'cost')
    const totalMargin = sum(fin, 'margin')
    const avgMrgPct   = mean(fin, 'avg_margin_pct')

    return {
      totalRx, totalFilled, totalUnf, fillRate,
      totalRefill, refillRate,
      sameDayRate, subRate, avgDays,
      totalRev, totalCost, totalMargin, avgMrgPct,
    }
  }, [raw, selYears, selQuarters])

  if (error) return <ErrorMsg message={error} />

  return (
    <div>
      <PageHeader
        title="Executive Overview"
        subtitle="A high-level summary of network performance across the selected period. Metrics cover every stage of the prescription journey from prescriptions written and fulfillment outcomes through to revenue, cost, and margin."
      />

      {!metrics ? <Loading /> : (
        <>
          {/* Prescription Volume */}
          <div className="kpi-section">
            <div className="kpi-section-label">Prescription Volume</div>
            <div className="kpi-grid kpi-grid-3">
              <KPICard
                label="Prescriptions Written"
                value={metrics.totalRx.toLocaleString()}
                accent="blue"
                title="Total number of prescriptions recorded in the selected period, regardless of whether they were dispensed."
              />
              <KPICard
                label="Prescriptions Filled"
                value={metrics.totalFilled.toLocaleString()}
                accent="green"
                title="Prescriptions with a status of Filled — i.e. the medication was actually dispensed to the patient."
              />
              <KPICard
                label="Unfulfilled"
                value={metrics.totalUnf.toLocaleString()}
                accent="red"
                title="Prescriptions Written minus Prescriptions Filled. These were not dispensed within the dataset period."
              />
            </div>
          </div>

          {/* Fulfillment Rates */}
          <div className="kpi-section">
            <div className="kpi-section-label">Fulfillment Rates</div>
            <div className="kpi-grid kpi-grid-3">
              <KPICard
                label="Overall Fill Rate"
                value={fmtPct(metrics.fillRate)}
                accent="green"
                title="Prescriptions Filled ÷ Prescriptions Written. The share of all prescriptions that were successfully dispensed."
              />
              <KPICard
                label="Same-Day Rate"
                value={fmtPct(metrics.sameDayRate)}
                accent="green"
                title="Share of all prescriptions that were dispensed on the same calendar day they were written (days_to_fulfill = 0)."
              />
              <KPICard
                label="Subsequent-Day Rate"
                value={fmtPct(metrics.subRate)}
                accent="orange"
                title="Share of all prescriptions that were dispensed one or more days after the prescription date (days_to_fulfill > 0)."
              />
            </div>
          </div>

          {/* Operational Throughput */}
          <div className="kpi-section">
            <div className="kpi-section-label">Operational Throughput</div>
            <div className="kpi-grid kpi-grid-3">
              <KPICard
                label="Avg Days to Fill"
                value={`${metrics.avgDays.toFixed(2)} days`}
                accent="orange"
                title="Average number of days between prescription date and dispense date, calculated only across prescriptions that were fulfilled. Averaged across all facilities in the selected period."
              />
              <KPICard
                label="Total Refills"
                value={metrics.totalRefill.toLocaleString()}
                accent="blue"
                title="Prescriptions flagged as refills (is_refill = true), meaning the patient has been prescribed this medication before."
              />
              <KPICard
                label="Refill Rate"
                value={fmtPct(metrics.refillRate)}
                accent="indigo"
                title="Total Refills ÷ Prescriptions Written. The proportion of prescriptions that are continuations of an existing course of treatment rather than new initiations."
              />
            </div>
          </div>

          {/* Financials */}
          <div className="kpi-section">
            <div className="kpi-section-label">Financials</div>
            <div className="kpi-grid kpi-grid-4">
              <KPICard
                label="Total Revenue"
                value={fmtM(metrics.totalRev)}
                accent="navy"
                title="Sum of revenue across all fulfilled prescriptions in the selected period, expressed in millions. Revenue is recorded at the prescription level."
              />
              <KPICard
                label="Total Cost"
                value={fmtM(metrics.totalCost)}
                accent="orange"
                title="Sum of cost across all fulfilled prescriptions in the selected period, expressed in millions. Cost is recorded at the prescription level."
              />
              <KPICard
                label="Total Margin"
                value={fmtM(metrics.totalMargin)}
                accent="green"
                title="Total Revenue minus Total Cost across all fulfilled prescriptions, expressed in millions."
              />
              <KPICard
                label="Avg Margin %"
                value={fmtPct(metrics.avgMrgPct)}
                accent="green"
                title="Average of the per-prescription margin percentage ((revenue − cost) ÷ revenue × 100), averaged across all fulfilled prescriptions in the selected period."
              />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
