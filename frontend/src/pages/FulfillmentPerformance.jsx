import { useState, useEffect, useMemo } from 'react'
import PageHeader from '../components/PageHeader'
import KPICard from '../components/KPICard'
import Chart from '../components/Chart'
import { Loading, ErrorMsg } from '../components/States'
import { useFilters } from '../context/FilterContext'
import { api } from '../api'
import { filterTime, sortByMonth, sortBuckets, sum, fmtPct } from '../utils'
import { BUCKET_COLORS, BUCKET_ORDER, GREEN, ORANGE, RED } from '../constants'

export default function FulfillmentPerformance() {
  const { selYears, selQuarters } = useFilters()
  const [raw, setRaw]   = useState(null)
  const [error, setErr] = useState(null)

  useEffect(() => {
    Promise.all([api.fulfillmentSpeed(), api.fulfillmentSpeedTrend()])
      .then(([speed, trend]) => setRaw({ speed, trend }))
      .catch(e => setErr(e.message))
  }, [])

  const derived = useMemo(() => {
    if (!raw) return null
    const trend  = sortByMonth(filterTime(raw.trend, selYears, selQuarters))
    const speed  = raw.speed   // no time dimension

    // KPIs
    const tot    = sum(trend, 'rx_count')
    const sameCt = sum(trend.filter(r => r.fulfillment_bucket === 'Same Day Fulfilled'),        'rx_count')
    const subCt  = sum(trend.filter(r => r.fulfillment_bucket === 'Subsequent Days Fulfilled'), 'rx_count')
    const unfCt  = sum(trend.filter(r => r.fulfillment_bucket === 'Unfulfilled'),               'rx_count')
    const kpis = {
      total:       tot,
      sameDayRate: tot ? sameCt / tot * 100 : 0,
      subRate:     tot ? subCt  / tot * 100 : 0,
      unfRate:     tot ? unfCt  / tot * 100 : 0,
    }

    // Donut charts per channel
    const channels = [...new Set(speed.map(r => r.channel_name))].sort()
    const donutCharts = channels.map(ch => {
      const rows = sortBuckets(speed.filter(r => r.channel_name === ch))
      return {
        ch,
        data: [{
          type: 'pie', hole: 0.45,
          labels: rows.map(r => r.fulfillment_bucket),
          values: rows.map(r => r.rx_count),
          marker: { colors: rows.map(r => BUCKET_COLORS[r.fulfillment_bucket] ?? '#aaa') },
          textinfo: 'percent+label',
          textposition: 'outside',
          showlegend: false,
        }],
        layout: {
          title: { text: ch, font: { size: 13 }, y: 0.02, x: 0.5, xanchor: 'center', yanchor: 'bottom' },
          margin: { t: 10, b: 40, l: 20, r: 20 },
          showlegend: false,
        },
      }
    })

    // Grouped bar: outcome share side-by-side (pct_of_channel)
    const groupedBar = {
      data: BUCKET_ORDER.map(b => ({
        type: 'bar', name: b,
        x: channels,
        y: channels.map(ch => {
          const row = speed.find(r => r.channel_name === ch && r.fulfillment_bucket === b)
          return row ? (row.pct_of_channel ?? 0) : 0
        }),
        marker: { color: BUCKET_COLORS[b] },
      })),
      layout: {
        barmode: 'group',
        legend: { orientation: 'h', y: 1.08 },
        yaxis:  { title: 'Share of Channel (%)' },
        xaxis:  { title: 'Fulfillment Channel' },
        margin: { t: 40, b: 50, l: 60, r: 30 },
      },
    }

    // Stacked area: monthly outcome volumes
    const months = [...new Set(trend.map(r => r.month_label))].sort()
    const stackedArea = {
      data: BUCKET_ORDER.map(b => {
        const byMonth = Object.fromEntries(
          trend.filter(r => r.fulfillment_bucket === b).map(r => [r.month_label, r.rx_count])
        )
        return {
          type: 'scatter', stackgroup: 'one',
          name: b, mode: 'lines',
          x: months, y: months.map(m => byMonth[m] ?? 0),
          line: { color: BUCKET_COLORS[b] },
          fillcolor: BUCKET_COLORS[b] + '80',
        }
      }),
      layout: {
        legend: { orientation: 'h', y: 1.08 },
        yaxis:  { title: 'Prescription Count' },
        margin: { t: 40, b: 40, l: 60, r: 30 },
      },
    }

    // Unfulfilled rate trend with average line
    const monthTotals = {}, monthUnf = {}
    trend.forEach(r => {
      monthTotals[r.month_label] = (monthTotals[r.month_label] || 0) + r.rx_count
      if (r.fulfillment_bucket === 'Unfulfilled')
        monthUnf[r.month_label] = (monthUnf[r.month_label] || 0) + r.rx_count
    })
    const unfMonths = Object.keys(monthTotals).sort()
    const unfRates  = unfMonths.map(m => monthTotals[m] ? (monthUnf[m] || 0) / monthTotals[m] * 100 : 0)
    const avgUnf    = unfRates.length ? unfRates.reduce((a, b) => a + b, 0) / unfRates.length : 0

    const unfTrendChart = {
      data: [
        {
          type: 'scatter', name: 'Unfulfilled Rate', mode: 'lines+markers',
          x: unfMonths, y: unfRates,
          line: { color: RED, width: 2 }, marker: { size: 5 },
        },
        {
          type: 'scatter', name: `Avg ${avgUnf.toFixed(1)}%`, mode: 'lines',
          x: [unfMonths[0], unfMonths[unfMonths.length - 1]], y: [avgUnf, avgUnf],
          line: { color: ORANGE, dash: 'dot', width: 1.5 },
        },
      ],
      layout: {
        legend: { orientation: 'h', y: 1.08 },
        yaxis:  { title: 'Unfulfilled Rate (%)' },
        xaxis:  { title: 'Period' },
        margin: { t: 40, b: 40, l: 60, r: 30 },
      },
    }

    // Three-line rate trends by outcome
    const sameDayM = {}, subDayM = {}, unfM2 = {}, totalM = {}
    trend.forEach(r => {
      totalM[r.month_label] = (totalM[r.month_label] || 0) + r.rx_count
      if (r.fulfillment_bucket === 'Same Day Fulfilled')        sameDayM[r.month_label] = (sameDayM[r.month_label] || 0) + r.rx_count
      if (r.fulfillment_bucket === 'Subsequent Days Fulfilled') subDayM[r.month_label]  = (subDayM[r.month_label]  || 0) + r.rx_count
      if (r.fulfillment_bucket === 'Unfulfilled')              unfM2[r.month_label]    = (unfM2[r.month_label]    || 0) + r.rx_count
    })
    const rateMonths = Object.keys(totalM).sort()
    const rateTrendsChart = {
      data: [
        {
          type: 'scatter', name: 'Same Day Fulfilled', mode: 'lines+markers',
          x: rateMonths, y: rateMonths.map(m => totalM[m] ? (sameDayM[m] || 0) / totalM[m] * 100 : 0),
          line: { color: GREEN, width: 2 }, marker: { size: 5 },
        },
        {
          type: 'scatter', name: 'Subsequent Days Fulfilled', mode: 'lines+markers',
          x: rateMonths, y: rateMonths.map(m => totalM[m] ? (subDayM[m] || 0) / totalM[m] * 100 : 0),
          line: { color: ORANGE, width: 2, dash: 'dot' }, marker: { size: 5 },
        },
        {
          type: 'scatter', name: 'Unfulfilled', mode: 'lines+markers',
          x: rateMonths, y: rateMonths.map(m => totalM[m] ? (unfM2[m] || 0) / totalM[m] * 100 : 0),
          line: { color: RED, width: 2, dash: 'dash' }, marker: { size: 5 },
        },
      ],
      layout: {
        legend: { orientation: 'h', y: 1.08 },
        yaxis:  { title: 'Rate (% of all Rx written)' },
        xaxis:  { title: 'Period' },
        margin: { t: 40, b: 40, l: 60, r: 30 },
      },
    }

    // Stacked bar by channel (pct_of_channel)
    const stackedBar = {
      data: BUCKET_ORDER.map(b => ({
        type: 'bar', name: b,
        x: channels,
        y: channels.map(ch => {
          const row = speed.find(r => r.channel_name === ch && r.fulfillment_bucket === b)
          return row ? (row.pct_of_channel ?? 0) : 0
        }),
        marker: { color: BUCKET_COLORS[b] },
      })),
      layout: {
        barmode: 'stack',
        legend: { orientation: 'h', y: 1.08 },
        yaxis:  { title: 'Share (%)' },
        xaxis:  { title: 'Fulfillment Channel' },
        margin: { t: 40, b: 50, l: 60, r: 30 },
      },
    }

    return { kpis, donutCharts, groupedBar, stackedArea, unfTrendChart, rateTrendsChart, stackedBar }
  }, [raw, selYears, selQuarters])

  if (error) return <ErrorMsg message={error} />

  return (
    <div>
      <PageHeader
        title="Fulfillment Performance"
        subtitle="A channel-by-channel breakdown of how prescriptions resolve across the network. All three outcomes — same-day fulfilled, subsequently fulfilled, and unfulfilled — are tracked over time to show where performance is strong and where unfulfilled pressure may be growing."
      />

      {!derived ? <Loading /> : (
        <>
          <div className="kpi-section">
            <div className="kpi-grid kpi-grid-4">
              <KPICard label="Prescriptions"      value={derived.kpis.total.toLocaleString()} accent="blue"
                title="Total prescriptions included in the fulfillment trend data for the selected period." />
              <KPICard label="Same-Day Rate"       value={fmtPct(derived.kpis.sameDayRate)} accent="green"
                title="Share of all prescriptions dispensed on the same calendar day they were written." />
              <KPICard label="Subsequent-Day Rate" value={fmtPct(derived.kpis.subRate)}     accent="orange"
                title="Share of all prescriptions dispensed one or more days after the prescription date." />
              <KPICard label="Unfulfilled Rate"    value={fmtPct(derived.kpis.unfRate)}     accent="red"
                title="Share of all prescriptions that were not dispensed. Derived from the Unfulfilled fulfillment bucket." />
            </div>
          </div>

          {/* Donuts */}
          <div className="card">
            <div className="section-title">Outcome Distribution by Dispensing Channel</div>
            <div className="section-subtitle">
              Each donut shows how prescriptions in a given channel split across the three fulfillment outcomes,
              making it easy to spot channels with a disproportionately large unfulfilled slice.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${derived.donutCharts.length}, 1fr)`, gap: 8 }}>
              {derived.donutCharts.map(({ ch, data, layout }) => (
                <Chart key={ch} data={data} layout={layout} height={260} />
              ))}
            </div>
          </div>

          {/* Grouped bar */}
          <div className="card">
            <div className="section-title">Outcome Share by Channel — Side-by-Side</div>
            <div className="section-subtitle">
              Each channel's outcome shares displayed side by side for direct comparison. A channel with a notably
              high unfulfilled share relative to others is a signal for operational review.
            </div>
            <Chart data={derived.groupedBar.data} layout={derived.groupedBar.layout} height={320} />
          </div>

          {/* Stacked area */}
          <div className="card">
            <div className="section-title">Outcome Composition — Monthly Volume Trend</div>
            <div className="section-subtitle">
              Monthly prescription volumes broken down by outcome and stacked to show the total. An unfulfilled band
              that is growing in absolute size — even when the unfulfilled rate looks stable — is a warning sign worth
              investigating, particularly during periods of rising overall volume.
            </div>
            <Chart data={derived.stackedArea.data} layout={derived.stackedArea.layout} height={320} />
          </div>

          {/* Unfulfilled rate trend */}
          <div className="card">
            <div className="section-title">Unfulfilled Rate — Monthly Exposure</div>
            <div className="section-subtitle">
              The unfulfilled rate each month, expressed as a percentage of all prescriptions written. The dotted line
              marks the period average. A rate that remains consistently above average, or trends upward over multiple
              months, warrants prompt investigation.
            </div>
            <Chart data={derived.unfTrendChart.data} layout={derived.unfTrendChart.layout} height={280} />
          </div>

          {/* Three-line rate trends */}
          <div className="card">
            <div className="section-title">Fulfillment Rate Trends by Outcome</div>
            <div className="section-subtitle">
              The three outcome rates together account for 100% of prescriptions written in each period. A rising
              same-day rate alongside a falling unfulfilled rate is the clearest signal of improving service quality.
              A rising subsequent-day rate with a stable same-day rate means prescriptions are still being filled,
              but taking longer to reach patients.
            </div>
            <Chart data={derived.rateTrendsChart.data} layout={derived.rateTrendsChart.layout} height={320} />
          </div>

          {/* Stacked bar by channel */}
          <div className="card">
            <div className="section-title">Fulfillment Outcomes by Channel — Stacked View</div>
            <div className="section-subtitle">
              The full outcome breakdown for each dispensing channel shown as a stacked bar, making it straightforward
              to compare how well each channel is serving patients and where the greatest proportion of unfulfilled
              prescriptions originates.
            </div>
            <Chart data={derived.stackedBar.data} layout={derived.stackedBar.layout} height={300} />
          </div>
        </>
      )}
    </div>
  )
}
