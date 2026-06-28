import { useState, useEffect, useMemo } from 'react'
import PageHeader from '../components/PageHeader'
import KPICard from '../components/KPICard'
import Chart from '../components/Chart'
import DataTable from '../components/DataTable'
import { Loading, ErrorMsg } from '../components/States'
import { api } from '../api'
import { mean, fmtPct, fmtN, fmtK, pivotMatrix, colorScale } from '../utils'
import { BUCKET_COLORS, BUCKET_ORDER, COLORS, GREEN, ORANGE, RED } from '../constants'

export default function HospitalScorecard() {
  const [raw, setRaw]   = useState(null)
  const [error, setErr] = useState(null)

  useEffect(() => {
    Promise.all([api.hospitalScorecard(), api.hospitalChannel()])
      .then(([hosp, hc]) => setRaw({ hosp, hc }))
      .catch(e => setErr(e.message))
  }, [])

  const derived = useMemo(() => {
    if (!raw) return null
    const hosp = raw.hosp.map(r => ({
      ...r,
      unfulfilled_rate_pct: 100 - (r.fill_rate_pct ?? 0),
    }))

    const kpis = {
      facilities: hosp.length,
      totalRx:    hosp.reduce((a, r) => a + (r.total_rx || 0), 0),
      avgFill:    mean(hosp, 'fill_rate_pct'),
      totalRev:   hosp.reduce((a, r) => a + (r.total_revenue || 0), 0),
      avgMargin:  mean(hosp, 'avg_margin_pct'),
    }

    // Horizontal stacked bar — ranked by fill rate
    const sorted = [...hosp].sort((a, b) => (a.fill_rate_pct ?? 0) - (b.fill_rate_pct ?? 0))
    const outcomeChart = {
      data: [
        { key: 'same_day_fill_rate_pct',       bucket: 'Same Day Fulfilled' },
        { key: 'subsequent_day_fill_rate_pct', bucket: 'Subsequent Days Fulfilled' },
        { key: 'unfulfilled_rate_pct',         bucket: 'Unfulfilled' },
      ].map(({ key, bucket }) => ({
        type: 'bar', orientation: 'h', name: bucket,
        y: sorted.map(r => r.hospital_name),
        x: sorted.map(r => r[key] ?? 0),
        marker: { color: BUCKET_COLORS[bucket] },
      })),
      layout: {
        barmode: 'stack',
        legend: { orientation: 'h', y: 1.04 },
        xaxis: { title: 'Rate (% of Rx Written)', range: [0, 100] },
        yaxis: { title: '', automargin: true, tickfont: { size: 10 } },
        margin: { t: 50, b: 50, l: 160, r: 30 },
        height: Math.max(300, sorted.length * 28 + 100),
      },
    }

    // Avg days to fill horizontal bar — colored by value
    const sortedByDays = [...hosp].sort((a, b) => (b.avg_days_to_fill ?? 0) - (a.avg_days_to_fill ?? 0))
    const daysChart = {
      data: [{
        type: 'bar', orientation: 'h',
        y: sortedByDays.map(r => r.hospital_name),
        x: sortedByDays.map(r => r.avg_days_to_fill ?? 0),
        marker: {
          color: sortedByDays.map(r => r.avg_days_to_fill ?? 0),
          colorscale: [[0, GREEN], [0.5, ORANGE], [1, RED]],
          showscale: false,
        },
        hovertemplate: '<b>%{y}</b><br>Avg Days: %{x:.2f}<extra></extra>',
      }],
      layout: {
        xaxis: { title: 'Avg Days to Fill' },
        yaxis: { title: '', automargin: true, tickfont: { size: 10 } },
        margin: { t: 20, b: 50, l: 160, r: 30 },
        height: Math.max(300, sortedByDays.length * 28 + 80),
      },
    }

    // Service Quality Matrix scatter — colored by region
    const regions = [...new Set(hosp.map(r => r.region))]
    const scatterChart = {
      data: regions.map((reg, i) => {
        const rows = hosp.filter(r => r.region === reg)
        return {
          type: 'scatter', mode: 'markers',
          name: reg,
          x: rows.map(r => r.same_day_fill_rate_pct),
          y: rows.map(r => r.unfulfilled_rate_pct),
          text: rows.map(r => r.hospital_name),
          marker: {
            size: rows.map(r => Math.sqrt((r.total_rx || 1)) / 4 + 6),
            color: COLORS[i % COLORS.length],
            opacity: 0.82,
            line: { color: 'white', width: 1 },
          },
          hovertemplate: '<b>%{text}</b><br>Same-Day: %{x:.1f}%<br>Unfulfilled: %{y:.1f}%<extra></extra>',
        }
      }),
      layout: {
        xaxis: { title: 'Same-Day Fulfilled Rate (%)' },
        yaxis: { title: 'Unfulfilled Rate (%)' },
        legend: { orientation: 'h', y: 1.04 },
        margin: { t: 50, b: 50, l: 60, r: 30 },
      },
    }

    // Heatmap
    const { z, x, y } = pivotMatrix(raw.hc, { rowCol: 'hospital_name', colCol: 'channel_name', valCol: 'avg_days_to_fill' })
    const heatmapChart = {
      data: [{
        type: 'heatmap', z, x, y,
        colorscale: colorScale(GREEN, ORANGE, RED),
        text: z.map(row => row.map(v => v != null ? v.toFixed(1) : 'N/A')),
        texttemplate: '%{text}',
        textfont: { size: 11 },
        hoverongaps: false,
      }],
      layout: {
        xaxis: { title: 'Fulfillment Channel', side: 'bottom' },
        yaxis: { automargin: true, tickfont: { size: 10 } },
        margin: { t: 20, b: 60, l: 160, r: 30 },
        height: Math.max(280, y.length * 28 + 80),
      },
    }

    // Revenue vs Margin scatter — colored by hospital_size
    const sizes = [...new Set(hosp.map(r => r.hospital_size))]
    const revMarginChart = {
      data: sizes.map((sz, i) => {
        const rows = hosp.filter(r => r.hospital_size === sz)
        return {
          type: 'scatter', mode: 'markers',
          name: sz,
          x: rows.map(r => r.total_revenue),
          y: rows.map(r => r.avg_margin_pct),
          text: rows.map(r => r.hospital_name),
          marker: {
            size: rows.map(r => Math.sqrt((r.total_rx || 1)) / 4 + 6),
            color: COLORS[i % COLORS.length],
            opacity: 0.82,
            line: { color: 'white', width: 1 },
          },
          hovertemplate: '<b>%{text}</b><br>Revenue: $%{x:,.0f}<br>Margin: %{y:.1f}%<extra></extra>',
        }
      }),
      layout: {
        xaxis: { title: 'Total Revenue ($)' },
        yaxis: { title: 'Avg Margin (%)' },
        legend: { orientation: 'h', y: 1.04, title: { text: 'Size' } },
        margin: { t: 50, b: 50, l: 60, r: 30 },
      },
    }

    return { hosp, kpis, outcomeChart, daysChart, scatterChart, heatmapChart, revMarginChart }
  }, [raw])

  if (error) return <ErrorMsg message={error} />

  const tableCols = [
    { key: 'hospital_name',              label: 'Facility' },
    { key: 'region',                     label: 'Region' },
    { key: 'hospital_size',              label: 'Size' },
    { key: 'state',                      label: 'State' },
    { key: 'total_rx',                   label: 'Rx Written',        align: 'right', format: fmtN },
    { key: 'fill_rate_pct',              label: 'Fill Rate %',       align: 'right', format: fmtPct },
    { key: 'same_day_fill_rate_pct',     label: 'Same-Day %',        align: 'right', format: fmtPct },
    { key: 'subsequent_day_fill_rate_pct', label: 'Subsequent-Day %', align: 'right', format: fmtPct },
    { key: 'unfulfilled_rate_pct',       label: 'Unfulfilled %',     align: 'right', format: fmtPct },
    { key: 'avg_days_to_fill',           label: 'Avg Days to Fill',  align: 'right', format: v => v != null ? Number(v).toFixed(2) : '—' },
    { key: 'total_revenue',              label: 'Revenue ($)',        align: 'right', format: fmtK },
    { key: 'total_margin',               label: 'Margin ($)',         align: 'right', format: fmtK },
    { key: 'avg_margin_pct',             label: 'Margin %',          align: 'right', format: fmtPct },
  ]

  return (
    <div>
      <PageHeader
        title="Hospital Scorecard"
        subtitle="Performance data for every facility in the network, spanning operational efficiency, fulfillment outcomes, and financial contribution. All three prescription outcomes are shown at the facility level to support peer comparison and help prioritise where improvement efforts should be focused."
      />

      {!derived ? <Loading /> : (
        <>
          <div className="kpi-section">
            <div className="kpi-grid kpi-grid-5">
              <KPICard label="Facilities"    value={derived.kpis.facilities}        accent="blue"
                title="Number of distinct hospitals in the dataset." />
              <KPICard label="Rx Written"    value={fmtN(derived.kpis.totalRx)}     accent="blue"
                title="Total prescriptions written across all facilities in the dataset." />
              <KPICard label="Avg Fill Rate" value={fmtPct(derived.kpis.avgFill)}   accent="green"
                title="Simple average of each facility's fill rate. Each facility's rate is Filled ÷ Written for that facility." />
              <KPICard label="Total Revenue" value={fmtK(derived.kpis.totalRev)}    accent="navy"
                title="Sum of revenue across all fulfilled prescriptions across all facilities." />
              <KPICard label="Avg Margin %"  value={fmtPct(derived.kpis.avgMargin)} accent="green"
                title="Simple average of each facility's average margin percentage. Each facility's margin % is the mean of per-prescription (revenue − cost) ÷ revenue." />
            </div>
          </div>

          {/* Summary table */}
          <div className="card">
            <div className="section-title" style={{ marginBottom: 6 }}>Facility Performance Summary</div>
            <div className="section-subtitle">
              Each row covers the full prescription lifecycle for a single facility: volume written, overall fill rate,
              outcome breakdown by speed, average days to fill, and financial results. Click any column header to sort
              and identify best and worst performers across the network.
            </div>
            <DataTable columns={tableCols} data={derived.hosp} maxHeight={340} />
          </div>

          {/* Outcome ranking */}
          <div className="card">
            <div className="section-title">Fulfillment Outcome Rates — Facility Ranking</div>
            <div className="section-subtitle">
              Facilities ordered from lowest to highest overall fill rate. The colour breakdown within each bar shows
              whether a performance gap is driven by slow dispensing, outright non-fulfilment, or a combination of both.
            </div>
            <Chart data={derived.outcomeChart.data} layout={derived.outcomeChart.layout}
              height={derived.outcomeChart.layout.height} />
          </div>

          {/* Days + Service Quality side by side */}
          <div className="chart-row">
            <div className="card" style={{ marginBottom: 0 }}>
              <div className="section-title">Average Days to Fill — Facility Ranking</div>
              <div className="section-subtitle">
                Facilities ranked by average time from prescription to dispensing. Facilities with longer bars are taking
                more days to fill on average, which may have a direct impact on patient experience and adherence.
              </div>
              <Chart data={derived.daysChart.data} layout={derived.daysChart.layout}
                height={derived.daysChart.layout.height} />
            </div>

            <div className="card" style={{ marginBottom: 0 }}>
              <div className="section-title">Service Quality Matrix</div>
              <div className="section-subtitle">
                Each bubble represents a facility. Facilities in the upper-left are achieving a high same-day fill rate
                while keeping their unfulfilled rate low — the strongest service quality position. Bubble size reflects
                total prescription volume.
              </div>
              <Chart data={derived.scatterChart.data} layout={derived.scatterChart.layout} height={380} />
            </div>
          </div>

          {/* Heatmap */}
          <div className="card" style={{ marginTop: 20 }}>
            <div className="section-title">Turnaround Time Heatmap — Facility by Fulfillment Channel</div>
            <div className="section-subtitle">
              Average days to fill shown for each combination of facility and dispensing channel. A cell that is
              significantly darker than others in the same row or column points to a channel-specific bottleneck
              that would not be visible in facility-level or network-level averages alone.
            </div>
            <Chart data={derived.heatmapChart.data} layout={derived.heatmapChart.layout}
              height={derived.heatmapChart.layout.height} />
          </div>

          {/* Revenue vs Margin */}
          <div className="card" style={{ marginTop: 20 }}>
            <div className="section-title">Revenue vs. Margin Contribution — Facility View</div>
            <div className="section-subtitle">
              Each bubble represents a facility, sized by prescription volume. Facilities in the upper-right generate
              both high revenue and strong margins, making them the most strategically significant sites in the network.
            </div>
            <Chart data={derived.revMarginChart.data} layout={derived.revMarginChart.layout} height={380} />
          </div>
        </>
      )}
    </div>
  )
}
