import { useState, useEffect, useMemo } from 'react'
import PageHeader from '../components/PageHeader'
import KPICard from '../components/KPICard'
import Chart from '../components/Chart'
import DataTable from '../components/DataTable'
import { Loading, ErrorMsg } from '../components/States'
import { api } from '../api'
import { mean, fmtPct, fmtK, fmtN } from '../utils'
import { COLORS, BUCKET_COLORS, BUCKET_ORDER, GREEN, ORANGE, RED } from '../constants'

const fmt$ = v => v == null ? '—' : `$${Number(v).toLocaleString('en-US', { maximumFractionDigits: 0 })}`

export default function RegionalPerformance() {
  const [raw, setRaw]   = useState(null)
  const [error, setErr] = useState(null)

  useEffect(() => {
    api.regionalPerformance()
      .then(d => setRaw(d))
      .catch(e => setErr(e.message))
  }, [])

  const derived = useMemo(() => {
    if (!raw) return null
    const reg = raw.map(r => ({
      ...r,
      subsequent_day_rate_pct: Math.max(0, (r.fill_rate_pct ?? 0) - (r.same_day_rate_pct ?? 0)),
      unfulfilled_rate_pct:    Math.max(0, 100 - (r.fill_rate_pct ?? 0)),
    }))

    const kpis = {
      regions:    reg.length,
      facilities: reg.reduce((a, r) => a + (r.hospital_count || 0), 0),
      totalRx:    reg.reduce((a, r) => a + (r.total_rx || 0), 0),
      totalRev:   reg.reduce((a, r) => a + (r.revenue || 0), 0),
      avgFill:    mean(reg, 'fill_rate_pct'),
    }

    // Revenue by region — bar chart colored by region
    const sortedByRev = [...reg].sort((a, b) => (b.revenue ?? 0) - (a.revenue ?? 0))
    const revenueChart = {
      data: [{
        type: 'bar',
        x: sortedByRev.map(r => r.region),
        y: sortedByRev.map(r => r.revenue),
        marker: { color: COLORS.slice(0, sortedByRev.length) },
        hovertemplate: '<b>%{x}</b><br>Revenue: $%{y:,.0f}<extra></extra>',
      }],
      layout: {
        showlegend: false,
        yaxis: { title: 'Total Revenue ($)' },
        xaxis: { title: 'Region' },
        margin: { t: 20, b: 60, l: 70, r: 30 },
      },
    }

    // Overall fill rate by region — bar chart
    const sortedByFill = [...reg].sort((a, b) => (b.fill_rate_pct ?? 0) - (a.fill_rate_pct ?? 0))
    const fillRateChart = {
      data: [{
        type: 'bar',
        x: sortedByFill.map(r => r.region),
        y: sortedByFill.map(r => r.fill_rate_pct ?? 0),
        marker: { color: COLORS.slice(0, sortedByFill.length) },
        hovertemplate: '<b>%{x}</b><br>Fill Rate: %{y:.1f}%<extra></extra>',
      }],
      layout: {
        showlegend: false,
        yaxis: { title: 'Fill Rate (%)', range: [0, 105] },
        xaxis: { title: 'Region' },
        margin: { t: 20, b: 60, l: 60, r: 30 },
      },
    }

    // Stacked outcome bar by region
    const outcomeChart = {
      data: [
        { key: 'same_day_rate_pct',       bucket: 'Same Day Fulfilled' },
        { key: 'subsequent_day_rate_pct', bucket: 'Subsequent Days Fulfilled' },
        { key: 'unfulfilled_rate_pct',    bucket: 'Unfulfilled' },
      ].map(({ key, bucket }) => ({
        type: 'bar', name: bucket,
        x: reg.map(r => r.region),
        y: reg.map(r => r[key] ?? 0),
        marker: { color: BUCKET_COLORS[bucket] },
      })),
      layout: {
        barmode: 'stack',
        legend: { orientation: 'h', y: 1.08 },
        yaxis: { title: '% of Total Rx', range: [0, 101] },
        xaxis: { title: '' },
        margin: { t: 40, b: 50, l: 60, r: 30 },
      },
    }

    // Radar / scatterpolar — 4 metrics (same as Streamlit)
    const METRICS = [
      { key: 'fill_rate_pct',            label: 'Fill Rate' },
      { key: 'same_day_rate_pct',        label: 'Same-Day Rate' },
      { key: 'subsequent_day_rate_pct',  label: 'Subsequent-Day Rate' },
      { key: 'avg_margin_pct',           label: 'Margin %' },
    ]
    const normed = METRICS.map(({ key, label }) => {
      const vals = reg.map(r => r[key] ?? 0)
      const mn = Math.min(...vals), mx = Math.max(...vals)
      return { label, vals: vals.map(v => mx === mn ? 50 : (v - mn) / (mx - mn) * 100) }
    })
    const theta = [...normed.map(m => m.label), normed[0].label]

    const radarChart = {
      data: reg.map((r, i) => ({
        type: 'scatterpolar', fill: 'toself',
        name: r.region,
        r: [...normed.map(m => m.vals[i]), normed[0].vals[i]],
        theta,
        line: { color: COLORS[i % COLORS.length] },
        fillcolor: COLORS[i % COLORS.length] + '25',
      })),
      layout: {
        polar: { radialaxis: { visible: true, range: [0, 100] } },
        legend: { orientation: 'h', y: -0.15 },
        margin: { t: 20, b: 80, l: 40, r: 40 },
      },
    }

    // Revenue vs Margin scatter — colored by region
    const revMarginChart = {
      data: [{
        type: 'scatter', mode: 'markers+text',
        x: reg.map(r => r.revenue),
        y: reg.map(r => r.avg_margin_pct),
        text: reg.map(r => r.region),
        textposition: 'top center',
        textfont: { size: 11 },
        marker: {
          size: reg.map(r => Math.sqrt((r.total_rx || 1)) / 6 + 10),
          color: COLORS.slice(0, reg.length),
          opacity: 0.85,
          line: { color: 'white', width: 1.5 },
        },
        hovertemplate: '<b>%{text}</b><br>Revenue: $%{x:,.0f}<br>Margin: %{y:.1f}%<extra></extra>',
      }],
      layout: {
        showlegend: false,
        xaxis: { title: 'Total Revenue ($)' },
        yaxis: { title: 'Avg Margin (%)' },
        margin: { t: 30, b: 60, l: 60, r: 30 },
      },
    }

    return { reg, kpis, revenueChart, fillRateChart, outcomeChart, radarChart, revMarginChart }
  }, [raw])

  if (error) return <ErrorMsg message={error} />

  const tableCols = [
    { key: 'region',                   label: 'Region' },
    { key: 'hospital_count',           label: 'Facilities',      align: 'right', format: fmtN },
    { key: 'total_rx',                 label: 'Rx Written',      align: 'right', format: fmtN },
    { key: 'fill_rate_pct',            label: 'Fill Rate %',     align: 'right', format: fmtPct },
    { key: 'same_day_rate_pct',        label: 'Same-Day %',      align: 'right', format: fmtPct },
    { key: 'subsequent_day_rate_pct',  label: 'Subsequent-Day %',align: 'right', format: fmtPct },
    { key: 'unfulfilled_rate_pct',     label: 'Unfulfilled %',   align: 'right', format: fmtPct },
    { key: 'avg_days_to_fill',         label: 'Avg Days to Fill',align: 'right', format: v => v != null ? Number(v).toFixed(2) : '—' },
    { key: 'revenue',                  label: 'Revenue ($)',      align: 'right', format: fmt$ },
    { key: 'avg_margin_pct',           label: 'Margin %',        align: 'right', format: fmtPct },
  ]

  return (
    <div>
      <PageHeader
        title="Regional Performance"
        subtitle="Operational and financial outcomes broken down by geographic region. Highlights where fill rates, dispensing turnaround, revenue, and margins differ significantly across the network, helping leadership make informed decisions about where to direct resources and investment."
      />

      {!derived ? <Loading /> : (
        <>
          <div className="kpi-section">
            <div className="kpi-grid kpi-grid-5">
              <KPICard label="Regions"       value={derived.kpis.regions}          accent="blue"
                title="Number of distinct geographic regions in the dataset." />
              <KPICard label="Facilities"    value={fmtN(derived.kpis.facilities)} accent="blue"
                title="Total number of hospital facilities across all regions." />
              <KPICard label="Rx Written"    value={fmtN(derived.kpis.totalRx)}    accent="blue"
                title="Total prescriptions written across all regions in the dataset." />
              <KPICard label="Total Revenue" value={fmt$(derived.kpis.totalRev)}   accent="navy"
                title="Sum of revenue from fulfilled prescriptions across all regions." />
              <KPICard label="Avg Fill Rate" value={fmtPct(derived.kpis.avgFill)}  accent="green"
                title="Simple average of fill rates across all regions. Each region's fill rate is Filled ÷ Written for that region." />
            </div>
          </div>

          {/* Revenue + Fill Rate side by side */}
          <div className="chart-row">
            <div className="card" style={{ marginBottom: 0 }}>
              <div className="section-title">Revenue by Region</div>
              <div className="section-subtitle">
                Total revenue generated by each region, ranked from highest to lowest. Reflects the combined
                effect of prescription volume, channel mix, and drug mix in each geography.
              </div>
              <Chart data={derived.revenueChart.data} layout={derived.revenueChart.layout} height={300} />
            </div>

            <div className="card" style={{ marginBottom: 0 }}>
              <div className="section-title">Overall Fill Rate by Region</div>
              <div className="section-subtitle">
                Fill rate for each region. Regions with fill rates significantly below the network average
                may have operational constraints or access challenges that warrant further investigation.
              </div>
              <Chart data={derived.fillRateChart.data} layout={derived.fillRateChart.layout} height={300} />
            </div>
          </div>

          {/* Stacked outcome bar — full width */}
          <div className="card" style={{ marginTop: 20 }}>
            <div className="section-title">Fulfillment Outcome Breakdown by Region</div>
            <div className="section-subtitle">
              The complete fulfillment outcome profile for each region shown as a stacked bar. Comparing the
              relative sizes of the three outcome bands across regions makes it easy to spot where unfulfilled
              or slow-dispensing patterns are disproportionately concentrated.
            </div>
            <Chart data={derived.outcomeChart.data} layout={derived.outcomeChart.layout} height={320} />
          </div>

          {/* Radar + Revenue vs Margin side by side */}
          <div className="chart-row" style={{ marginTop: 20 }}>
            <div className="card" style={{ marginBottom: 0 }}>
              <div className="section-title">Regional Operational Profile — Radar</div>
              <div className="section-subtitle">
                Four operational metrics normalised to a 0–100 scale and plotted as a radar chart. The shape
                of each region's polygon reveals at a glance where it leads and where it lags relative to
                the rest of the network.
              </div>
              <Chart data={derived.radarChart.data} layout={derived.radarChart.layout} height={360} />
            </div>

            <div className="card" style={{ marginBottom: 0 }}>
              <div className="section-title">Revenue vs. Margin — Regional View</div>
              <div className="section-subtitle">
                Each bubble represents a region, sized by total prescription volume. Regions in the upper-right
                generate both high revenue and strong margins — the most strategically significant geographies
                in the network.
              </div>
              <Chart data={derived.revMarginChart.data} layout={derived.revMarginChart.layout} height={360} />
            </div>
          </div>

          {/* Regional KPI table */}
          <div className="card" style={{ marginTop: 20 }}>
            <div className="section-title" style={{ marginBottom: 6 }}>Regional KPI Scorecard</div>
            <div className="section-subtitle">
              A full summary of every key metric for each region in a single table. Click any column header to
              sort and compare regions across the full range of operational and financial indicators.
            </div>
            <DataTable columns={tableCols} data={derived.reg ?? []} maxHeight={360} />
          </div>
        </>
      )}
    </div>
  )
}
