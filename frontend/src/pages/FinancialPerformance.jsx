import { useState, useEffect, useMemo } from 'react'
import PageHeader from '../components/PageHeader'
import KPICard from '../components/KPICard'
import Chart from '../components/Chart'
import DataTable from '../components/DataTable'
import { Loading, ErrorMsg } from '../components/States'
import { useFilters } from '../context/FilterContext'
import { api } from '../api'
import { filterTime, sortByMonth, groupSum, sum, mean, fmtPct, fmtK } from '../utils'
import { PRIMARY, BLUE, GREEN, ORANGE, COLORS } from '../constants'

const fmt$ = v => v == null ? '—' : `$${Number(v).toLocaleString('en-US', { maximumFractionDigits: 0 })}`

export default function FinancialPerformance() {
  const { selYears, selQuarters } = useFilters()
  const [raw, setRaw]   = useState(null)
  const [error, setErr] = useState(null)

  useEffect(() => {
    api.monthlyFinancials()
      .then(d => setRaw(d))
      .catch(e => setErr(e.message))
  }, [])

  const derived = useMemo(() => {
    if (!raw) return null
    const fin = sortByMonth(filterTime(raw, selYears, selQuarters))

    const kpis = {
      revenue:   sum(fin, 'revenue'),
      cost:      sum(fin, 'cost'),
      margin:    sum(fin, 'margin'),
      marginPct: mean(fin, 'avg_margin_pct'),
      filled:    sum(fin, 'rx_filled'),
    }

    // Monthly enterprise totals
    const monthly = groupSum(fin, 'month_label', ['revenue', 'cost', 'margin'])
      .sort((a, b) => new Date(a.month_label + '-01') - new Date(b.month_label + '-01'))

    // Enterprise P&L chart
    const plChart = {
      data: [
        {
          type: 'bar', name: 'Revenue',
          x: monthly.map(r => r.month_label), y: monthly.map(r => r.revenue),
          marker: { color: BLUE }, opacity: 0.85,
        },
        {
          type: 'bar', name: 'Cost',
          x: monthly.map(r => r.month_label), y: monthly.map(r => r.cost),
          marker: { color: ORANGE }, opacity: 0.85,
        },
        {
          type: 'scatter', name: 'Gross Margin', mode: 'lines+markers',
          x: monthly.map(r => r.month_label), y: monthly.map(r => r.margin),
          yaxis: 'y2',
          line: { color: GREEN, width: 2.5 }, marker: { size: 5 },
        },
      ],
      layout: {
        barmode: 'group',
        legend: { orientation: 'h', y: 1.08 },
        yaxis:  { title: 'Amount ($)' },
        yaxis2: { title: 'Gross Margin ($)', overlaying: 'y', side: 'right', showgrid: false },
        margin: { t: 40, b: 40, l: 70, r: 70 },
      },
    }

    // Revenue by channel stacked bar
    const channels = [...new Set(fin.map(r => r.channel_name))].sort()
    const months   = [...new Set(fin.map(r => r.month_label))].sort()
    const revenueChart = {
      data: channels.map((ch, i) => {
        const byMonth = Object.fromEntries(fin.filter(r => r.channel_name === ch).map(r => [r.month_label, r.revenue]))
        return {
          type: 'bar', name: ch,
          x: months, y: months.map(m => byMonth[m] ?? 0),
          marker: { color: COLORS[i % COLORS.length] },
        }
      }),
      layout: {
        barmode: 'stack',
        legend: { orientation: 'h', y: 1.08, title: { text: 'Fulfillment Channel' } },
        yaxis: { title: 'Revenue ($)' },
        xaxis: { title: 'Period' },
        margin: { t: 40, b: 40, l: 70, r: 30 },
      },
    }

    // Margin % by channel lines
    const marginChart = {
      data: channels.map((ch, i) => {
        const rows = sortByMonth(fin.filter(r => r.channel_name === ch))
        return {
          type: 'scatter', mode: 'lines+markers',
          name: ch,
          x: rows.map(r => r.month_label),
          y: rows.map(r => r.avg_margin_pct),
          line: { color: COLORS[i % COLORS.length], width: 2 },
          marker: { size: 4 },
        }
      }),
      layout: {
        legend: { orientation: 'h', y: 1.08, title: { text: 'Fulfillment Channel' } },
        yaxis: { title: 'Avg Margin (%)' },
        xaxis: { title: 'Period' },
        margin: { t: 40, b: 40, l: 60, r: 30 },
      },
    }

    // Quarterly financial summary table
    const quarterly = groupSum(fin, ['quarter_label', 'channel_name'], ['revenue', 'cost', 'margin'])
      .map(r => ({ ...r, margin_pct: r.revenue > 0 ? r.margin / r.revenue * 100 : 0 }))
      .sort((a, b) => {
        if (!a.quarter_label) return 1
        const [qa, ya] = a.quarter_label.split(' ')
        const [qb, yb] = b.quarter_label.split(' ')
        if (ya !== yb) return Number(ya) - Number(yb)
        if (qa !== qb) return qa.localeCompare(qb)
        return (a.channel_name || '').localeCompare(b.channel_name || '')
      })

    return { fin, kpis, plChart, revenueChart, marginChart, quarterly }
  }, [raw, selYears, selQuarters])

  if (error) return <ErrorMsg message={error} />

  return (
    <div>
      <PageHeader
        title="Financial Performance"
        subtitle="Monthly revenue, cost, and gross margin across the prescription network, broken down by fulfillment channel. Shows how each channel contributes to overall financial performance and highlights where margins may be under pressure."
      />

      {!derived ? <Loading /> : (
        <>
          <div className="kpi-section">
            <div className="kpi-grid kpi-grid-5">
              <KPICard label="Total Revenue" value={fmt$(derived.kpis.revenue)}   accent="navy"
                title="Sum of revenue across all fulfilled prescriptions in the selected period. Only filled prescriptions carry revenue — unfulfilled prescriptions contribute nothing." />
              <KPICard label="Total Cost"    value={fmt$(derived.kpis.cost)}      accent="orange"
                title="Sum of cost across all fulfilled prescriptions in the selected period." />
              <KPICard label="Total Margin"  value={fmt$(derived.kpis.margin)}    accent="green"
                title="Total Revenue minus Total Cost. Represents gross profit before any overhead or operating expenses." />
              <KPICard label="Avg Margin %"  value={fmtPct(derived.kpis.marginPct)} accent="green"
                title="Average of the per-prescription margin percentage across the selected period and all channels. Calculated as (revenue − cost) ÷ revenue per prescription, then averaged." />
              <KPICard label="Rx Filled"     value={derived.kpis.filled.toLocaleString()} accent="blue"
                title="Total fulfilled prescriptions in the selected period. Financial metrics on this page are derived exclusively from fulfilled prescriptions." />
            </div>
          </div>

          {/* Enterprise P&L */}
          <div className="card">
            <div className="section-title">Revenue, Cost & Gross Margin — Enterprise Monthly View</div>
            <div className="section-subtitle">
              Revenue and cost shown as grouped bars each month, with gross margin plotted on the secondary axis
              as a line. When the margin line flattens or falls while bars grow, it signals that cost increases
              are outpacing revenue growth.
            </div>
            <Chart data={derived.plChart.data} layout={derived.plChart.layout} height={340} />
          </div>

          {/* Revenue by channel */}
          <div className="card">
            <div className="section-title">Revenue Contribution by Fulfillment Channel — Monthly</div>
            <div className="section-subtitle">
              Monthly revenue split by fulfillment channel. Changes in the composition of the stacked bars from
              month to month indicate a shift in which channels are driving revenue, which can have knock-on
              effects on overall margin.
            </div>
            <Chart data={derived.revenueChart.data} layout={derived.revenueChart.layout} height={320} />
          </div>

          {/* Margin % by channel */}
          <div className="card">
            <div className="section-title">Channel Margin Percentage — Profitability Trend</div>
            <div className="section-subtitle">
              Margin percentage by fulfillment channel plotted over time. Channels maintaining consistently high
              margins are the most profitable parts of the network; a sustained decline in any channel is an
              early warning sign that warrants review.
            </div>
            <Chart data={derived.marginChart.data} layout={derived.marginChart.layout} height={300} />
          </div>

          {/* Quarterly table */}
          {derived.quarterly?.length > 0 && (
            <div className="card">
              <div className="section-title" style={{ marginBottom: 6 }}>Quarterly Financial Summary</div>
              <div className="section-subtitle">
                Revenue, cost, and margin summarised by quarter and fulfillment channel. Provides a clear,
                period-by-period view of financial performance that is well-suited to quarterly business reviews.
              </div>
              <DataTable
                columns={[
                  { key: 'quarter_label', label: 'Quarter' },
                  { key: 'channel_name',  label: 'Channel' },
                  { key: 'revenue',       label: 'Revenue ($)',  align: 'right', format: fmt$ },
                  { key: 'cost',          label: 'Cost ($)',     align: 'right', format: fmt$ },
                  { key: 'margin',        label: 'Margin ($)',   align: 'right', format: fmt$ },
                  { key: 'margin_pct',    label: 'Margin %',     align: 'right', format: fmtPct },
                ]}
                data={derived.quarterly}
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}
