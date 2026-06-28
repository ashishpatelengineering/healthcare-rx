import { useState, useEffect, useMemo } from 'react'
import PageHeader from '../components/PageHeader'
import KPICard from '../components/KPICard'
import Chart from '../components/Chart'
import DataTable from '../components/DataTable'
import { Loading, ErrorMsg } from '../components/States'
import { useFilters } from '../context/FilterContext'
import { api } from '../api'
import { filterTime, sortByMonth, groupSum, sum, mean, fmtPct, fmtN } from '../utils'
import { PRIMARY, BLUE, GREEN, ORANGE, INDIGO } from '../constants'

export default function PrescriptionVolume() {
  const { selYears, selQuarters } = useFilters()
  const [raw, setRaw]   = useState(null)
  const [error, setErr] = useState(null)

  useEffect(() => {
    Promise.all([api.monthlyRxVolume(), api.newVsRefillTrend()])
      .then(([vol, refill]) => setRaw({ vol, refill }))
      .catch(e => setErr(e.message))
  }, [])

  const derived = useMemo(() => {
    if (!raw) return null
    const vol    = sortByMonth(filterTime(raw.vol,    selYears, selQuarters))
    const refill = sortByMonth(filterTime(raw.refill, selYears, selQuarters))

    // KPIs
    const totalWritten = sum(vol, 'rx_written')
    const totalFilled  = sum(vol, 'rx_filled')
    const totalNew     = sum(vol, 'rx_new')
    const totalRefill  = sum(vol, 'rx_refill')
    const fillRate     = totalWritten > 0 ? totalFilled / totalWritten * 100 : 0
    const sameDayAvg   = mean(vol, 'same_day_rate_pct')

    // Quarterly rollup
    const quarterly = groupSum(
      filterTime(raw.vol, selYears, selQuarters),
      'quarter_label',
      ['rx_written', 'rx_filled', 'rx_new', 'rx_refill']
    ).map(r => ({
      ...r,
      fill_rate_pct: r.rx_written > 0 ? (r.rx_filled / r.rx_written * 100) : 0,
    })).sort((a, b) => {
      if (!a.quarter_label || !b.quarter_label) return 0
      const [qa, ya] = a.quarter_label.split(' ')
      const [qb, yb] = b.quarter_label.split(' ')
      return ya !== yb ? Number(ya) - Number(yb) : qa.localeCompare(qb)
    })

    // Chart 1: Written vs Filled + Fill Rate line
    const chart1 = {
      data: [
        {
          type: 'bar', name: 'Rx Written',
          x: vol.map(r => r.month_label), y: vol.map(r => r.rx_written),
          marker: { color: BLUE }, opacity: 0.85,
        },
        {
          type: 'bar', name: 'Rx Filled',
          x: vol.map(r => r.month_label), y: vol.map(r => r.rx_filled),
          marker: { color: GREEN }, opacity: 0.85,
        },
        {
          type: 'scatter', name: 'Fill Rate %',
          x: vol.map(r => r.month_label), y: vol.map(r => r.fill_rate_pct),
          mode: 'lines+markers', yaxis: 'y2',
          line: { color: ORANGE, width: 2 }, marker: { size: 5 },
        },
      ],
      layout: {
        barmode: 'group',
        legend: { orientation: 'h', y: 1.08 },
        yaxis:  { title: 'Prescription Count' },
        yaxis2: { title: 'Fill Rate (%)', overlaying: 'y', side: 'right', range: [0, 110], showgrid: false },
        margin: { t: 40, b: 40, l: 60, r: 60 },
      },
    }

    // Chart 2: Fill Speed — Same-Day vs Subsequent-Day rate
    const chart2 = {
      data: [
        {
          type: 'scatter', name: 'Same-Day Rate', mode: 'lines+markers',
          x: vol.map(r => r.month_label),
          y: vol.map(r => r.same_day_rate_pct),
          line: { color: GREEN, width: 2 }, marker: { size: 5 },
        },
        {
          type: 'scatter', name: 'Subsequent-Day Rate', mode: 'lines+markers',
          x: vol.map(r => r.month_label),
          y: vol.map(r => (r.fill_rate_pct || 0) - (r.same_day_rate_pct || 0)),
          line: { color: ORANGE, width: 2, dash: 'dot' }, marker: { size: 5 },
        },
      ],
      layout: {
        legend: { orientation: 'h', y: 1.08 },
        yaxis:  { title: 'Rate (% of Rx Written)' },
        margin: { t: 40, b: 40, l: 60, r: 30 },
      },
    }

    // Chart 3: New vs Refill stacked area
    const months  = [...new Set(refill.map(r => r.month_label))].sort()
    const types   = ['New', 'Refill']
    const clrs    = [BLUE, INDIGO]
    const chart3 = {
      data: types.map((t, i) => {
        const byMonth = Object.fromEntries(
          refill.filter(r => r.rx_type === t).map(r => [r.month_label, r.rx_count])
        )
        return {
          type: 'scatter', fill: i === 0 ? 'tozeroy' : 'tonexty',
          name: t, mode: 'lines',
          x: months, y: months.map(m => byMonth[m] ?? 0),
          line: { color: clrs[i], width: 2 },
          fillcolor: clrs[i] + '40',
        }
      }),
      layout: {
        legend: { orientation: 'h', y: 1.05 },
        yaxis:  { title: 'Prescription Count' },
        margin: { t: 30, b: 40, l: 60, r: 30 },
      },
    }

    // Chart 4: Fill Rate Trend with period average line
    const avgFillRate = vol.length ? mean(vol, 'fill_rate_pct') : 0
    const chart4 = {
      data: [
        {
          type: 'scatter', name: 'Fill Rate', mode: 'lines+markers',
          x: vol.map(r => r.month_label), y: vol.map(r => r.fill_rate_pct),
          line: { color: BLUE, width: 2 }, marker: { size: 5 },
        },
        {
          type: 'scatter', name: `Period avg ${avgFillRate.toFixed(1)}%`,
          mode: 'lines',
          x: [vol[0]?.month_label, vol[vol.length - 1]?.month_label],
          y: [avgFillRate, avgFillRate],
          line: { color: ORANGE, dash: 'dot', width: 1.5 },
        },
      ],
      layout: {
        legend: { orientation: 'h', y: 1.08 },
        yaxis:  { title: 'Fill Rate (%)' },
        xaxis:  { title: 'Period' },
        margin: { t: 40, b: 30, l: 60, r: 30 },
      },
    }

    return { vol, refill, quarterly, totalWritten, totalFilled, totalNew, totalRefill, fillRate, sameDayAvg, chart1, chart2, chart3, chart4 }
  }, [raw, selYears, selQuarters])

  if (error) return <ErrorMsg message={error} />

  return (
    <div>
      <PageHeader
        title="Prescription Volume"
        subtitle="Monthly prescription activity from demand written through to fulfillment. Charts cover total volume, how quickly prescriptions were filled, and the balance between new prescriptions and refills."
      />

      {!derived ? <Loading /> : (
        <>
          <div className="kpi-section">
            <div className="kpi-grid kpi-grid-5">
              <KPICard label="Rx Written"  value={fmtN(derived.totalWritten)} accent="blue"
                title="Total prescriptions recorded across the selected period." />
              <KPICard label="Rx Filled"   value={fmtN(derived.totalFilled)}  accent="green"
                title="Prescriptions with status Filled — the medication was dispensed." />
              <KPICard label="Fill Rate"   value={fmtPct(derived.fillRate)}   accent="green"
                title="Rx Filled ÷ Rx Written for the selected period." />
              <KPICard label="New Rx"      value={fmtN(derived.totalNew)}     accent="blue"
                title="Prescriptions where is_refill = false — first-time initiations for this patient and medication." />
              <KPICard label="Refill Rx"   value={fmtN(derived.totalRefill)}  accent="indigo"
                title="Prescriptions where is_refill = true — continuations of an existing course of treatment." />
            </div>
          </div>

          {/* Written vs Filled */}
          <div className="card">
            <div className="section-title">Prescriptions Written vs. Filled</div>
            <div className="section-subtitle">
              Monthly prescriptions written and filled shown side by side. The gap between the two bars represents
              prescriptions that were not fulfilled. The orange line tracks the overall fill rate against the right-hand axis.
            </div>
            <Chart data={derived.chart1.data} layout={derived.chart1.layout} height={340} />
          </div>

          {/* Fill Speed */}
          <div className="card">
            <div className="section-title">Fill Speed — Same-Day vs. Subsequent-Day Rate</div>
            <div className="section-subtitle">
              Monthly rates for same-day and subsequent-day fulfillment. When the two lines move in opposite directions,
              it typically indicates a shift in dispensing capacity or a change in which channels are handling the most volume.
            </div>
            <Chart data={derived.chart2.data} layout={derived.chart2.layout} height={300} />
          </div>

          {/* New vs Refill */}
          <div className="card">
            <div className="section-title">New Initiations vs. Refill Continuations</div>
            <div className="section-subtitle">
              Monthly volume of new prescriptions and refills shown as stacked areas. A growing refill base reflects strong
              patient retention and ongoing adherence to treatment. Rising new prescription counts indicate expanding demand,
              new patient intake, or increased referral activity.
            </div>
            <Chart data={derived.chart3.data} layout={derived.chart3.layout} height={300} />
          </div>

          {/* Quarterly table */}
          {derived.quarterly?.length > 0 && (
            <div className="card">
              <div className="section-title" style={{ marginBottom: 6 }}>Quarterly Volume Summary</div>
              <div className="section-subtitle">
                Prescription volume and fill rate summarised by quarter. Provides a clean, period-by-period view of
                demand levels and how effectively prescriptions were fulfilled throughout the year.
              </div>
              <DataTable
                columns={[
                  { key: 'quarter_label', label: 'Quarter' },
                  { key: 'rx_written',    label: 'Rx Written',  align: 'right', format: v => fmtN(v) },
                  { key: 'rx_filled',     label: 'Rx Filled',   align: 'right', format: v => fmtN(v) },
                  { key: 'rx_new',        label: 'New Rx',      align: 'right', format: v => fmtN(v) },
                  { key: 'rx_refill',     label: 'Refill Rx',   align: 'right', format: v => fmtN(v) },
                  { key: 'fill_rate_pct', label: 'Fill Rate %', align: 'right', format: v => fmtPct(v) },
                ]}
                data={derived.quarterly}
              />
            </div>
          )}

          {/* Fill Rate Trend */}
          <div className="card">
            <div className="section-title">Fill Rate Trend</div>
            <div className="section-subtitle">
              Monthly fill rate plotted over the selected period. The dotted line marks the average for the period,
              making it easy to see at a glance whether performance is trending above or below the norm.
            </div>
            <Chart data={derived.chart4.data} layout={derived.chart4.layout} height={280} />
          </div>
        </>
      )}
    </div>
  )
}
