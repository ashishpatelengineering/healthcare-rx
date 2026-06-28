import { useState, useEffect, useMemo } from 'react'
import PageHeader from '../components/PageHeader'
import KPICard from '../components/KPICard'
import Chart from '../components/Chart'
import DataTable from '../components/DataTable'
import { Loading, ErrorMsg } from '../components/States'
import { api } from '../api'
import { groupSum, sum, mean, fmtPct, fmtK, fmtN } from '../utils'
import { COLORS } from '../constants'

const fmt$ = v => v == null ? '—' : `$${Number(v).toLocaleString('en-US', { maximumFractionDigits: 0 })}`

export default function DrugPerformance() {
  const [raw, setRaw]      = useState(null)
  const [error, setErr]    = useState(null)
  const [selCats, setSelCats] = useState([])   // empty = all

  useEffect(() => {
    api.drugCategoryPerformance()
      .then(d => { setRaw(d); setSelCats([]) })
      .catch(e => setErr(e.message))
  }, [])

  const allCats = useMemo(() => {
    if (!raw) return []
    return [...new Set(raw.map(r => r.drug_category))].sort()
  }, [raw])

  // selCats empty means "all" — same as Streamlit default
  const activeCats = selCats.length ? selCats : allCats

  function toggleCat(c) {
    setSelCats(prev => {
      const current = prev.length ? prev : allCats
      if (current.length === allCats.length) {
        // Currently showing all — clicking one narrows to just that one
        return [c]
      }
      const toggled = current.includes(c)
        ? current.filter(x => x !== c)
        : [...current, c]
      return toggled.length ? toggled : []  // empty = all
    })
  }

  const derived = useMemo(() => {
    if (!raw || !activeCats.length) return null
    const drug = raw.filter(r => activeCats.includes(r.drug_category))

    const cat = groupSum(drug, 'drug_category', ['total_rx', 'revenue', 'cost', 'margin'])
      .map(r => ({ ...r, margin_pct: r.revenue > 0 ? r.margin / r.revenue * 100 : 0 }))
      .sort((a, b) => b.revenue - a.revenue)

    const kpis = {
      categories: cat.length,
      totalRx:    sum(drug, 'total_rx'),
      totalRev:   sum(drug, 'revenue'),
      avgMargin:  mean(cat, 'margin_pct'),
    }

    // Revenue by category bar
    const catChart = {
      data: [{
        type: 'bar',
        x: cat.map(r => r.drug_category),
        y: cat.map(r => r.revenue),
        marker: { color: cat.map((_, i) => COLORS[i % COLORS.length]) },
        hovertemplate: '<b>%{x}</b><br>Revenue: $%{y:,.0f}<extra></extra>',
      }],
      layout: {
        showlegend: false,
        yaxis: { title: 'Revenue ($)' },
        xaxis: { title: 'Therapeutic Category', tickangle: 30 },
        margin: { t: 20, b: 80, l: 70, r: 30 },
      },
    }

    // Volume–Margin scatter — sized by revenue
    const scatterChart = {
      data: [{
        type: 'scatter', mode: 'markers+text',
        x: cat.map(r => r.total_rx),
        y: cat.map(r => r.margin_pct),
        text: cat.map(r => r.drug_category),
        textposition: 'top center',
        textfont: { size: 10 },
        marker: {
          size: cat.map(r => Math.sqrt(r.revenue / 500) + 8),
          color: COLORS.slice(0, cat.length),
          opacity: 0.85,
          line: { color: 'white', width: 1.5 },
        },
        hovertemplate: '<b>%{text}</b><br>Rx Vol: %{x:,}<br>Margin: %{y:.1f}%<extra></extra>',
      }],
      layout: {
        showlegend: false,
        xaxis: { title: 'Prescription Volume' },
        yaxis: { title: 'Margin (%)' },
        margin: { t: 30, b: 60, l: 60, r: 30 },
      },
    }

    // Revenue mix donut — full width
    const donutChart = {
      data: [{
        type: 'pie', hole: 0.45,
        labels: cat.map(r => r.drug_category),
        values: cat.map(r => r.revenue),
        marker: { colors: COLORS },
        textinfo: 'percent+label',
        textposition: 'outside',
        hovertemplate: '<b>%{label}</b><br>Revenue: $%{value:,.0f}<br>Share: %{percent}<extra></extra>',
      }],
      layout: {
        showlegend: false,
        margin: { t: 10, b: 10, l: 10, r: 10 },
      },
    }

    return { drug, cat, kpis, catChart, scatterChart, donutChart }
  }, [raw, activeCats])

  if (error) return <ErrorMsg message={error} />

  const top20Cols = [
    { key: 'drug_name',      label: 'Drug' },
    { key: 'drug_category',  label: 'Category' },
    { key: 'drug_class',     label: 'Class' },
    { key: 'total_rx',       label: 'Rx Volume',   align: 'right', format: fmtN },
    { key: 'fill_rate_pct',  label: 'Fill Rate %', align: 'right', format: fmtPct },
    { key: 'revenue',        label: 'Revenue ($)', align: 'right', format: fmt$ },
    { key: 'margin',         label: 'Margin ($)',  align: 'right', format: fmt$ },
    { key: 'avg_margin_pct', label: 'Margin %',    align: 'right', format: fmtPct },
  ]

  return (
    <div>
      <PageHeader
        title="Drug Performance"
        subtitle="Prescription volume, revenue, and margin analysed at both the therapeutic category and individual drug level. Helps identify the highest-value parts of the formulary and supports decisions about pricing, portfolio composition, and growth focus."
      />

      {!derived ? <Loading /> : (
        <>
          {/* Category filter */}
          <div className="card" style={{ padding: '14px 20px', marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 10 }}>
              Therapeutic Category
            </div>
            <div className="inline-filter">
              <button
                className={`inline-pill${activeCats.length === allCats.length ? ' active' : ''}`}
                onClick={() => setSelCats([])}
              >
                All categories
              </button>
              {allCats.map(c => (
                <button
                  key={c}
                  className={`inline-pill${activeCats.includes(c) && activeCats.length < allCats.length ? ' active' : ''}`}
                  onClick={() => toggleCat(c)}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="kpi-section">
            <div className="kpi-grid kpi-grid-4">
              <KPICard label="Categories"    value={derived.kpis.categories}        accent="blue"
                title="Number of distinct therapeutic categories in the current selection." />
              <KPICard label="Rx Volume"     value={fmtN(derived.kpis.totalRx)}     accent="blue"
                title="Total prescriptions written across all drugs in the current selection, regardless of fulfillment outcome." />
              <KPICard label="Total Revenue" value={fmt$(derived.kpis.totalRev)}    accent="navy"
                title="Sum of revenue from fulfilled prescriptions across all drugs in the current selection." />
              <KPICard label="Avg Margin %"  value={fmtPct(derived.kpis.avgMargin)} accent="green"
                title="Simple average of each therapeutic category's margin percentage. Each category's margin % is its total margin ÷ total revenue." />
            </div>
          </div>

          {/* Revenue + Scatter side by side */}
          <div className="chart-row">
            <div className="card" style={{ marginBottom: 0 }}>
              <div className="section-title">Revenue by Therapeutic Category</div>
              <div className="section-subtitle">
                Total revenue by therapeutic category, ranked from highest to lowest. Highlights which segments
                of the formulary contribute most to overall financial performance.
              </div>
              <Chart data={derived.catChart.data} layout={derived.catChart.layout} height={320} />
            </div>

            <div className="card" style={{ marginBottom: 0 }}>
              <div className="section-title">Volume–Margin Efficiency</div>
              <div className="section-subtitle">
                Each bubble represents a therapeutic category, sized by revenue. Categories in the upper-right
                combine high prescription volume with strong margins — the most commercially attractive segments
                of the formulary.
              </div>
              <Chart data={derived.scatterChart.data} layout={derived.scatterChart.layout} height={320} />
            </div>
          </div>

          {/* Revenue mix donut — full width */}
          <div className="card" style={{ marginTop: 20 }}>
            <div className="section-title">Revenue Mix by Therapeutic Category</div>
            <div className="section-subtitle">
              Each segment shows what share of total revenue a therapeutic category accounts for. A portfolio
              heavily concentrated in one or two categories may carry more commercial risk if demand in those
              areas shifts.
            </div>
            <Chart data={derived.donutChart.data} layout={derived.donutChart.layout} height={420} />
          </div>

          {/* Top 20 drugs table — full width */}
          <div className="card" style={{ marginTop: 20 }}>
            <div className="section-title" style={{ marginBottom: 6 }}>Top 20 Drugs by Revenue — Formulary Detail</div>
            <div className="section-subtitle">
              The 20 highest-revenue drugs in the formulary. Use this table to identify drugs generating
              significant revenue at low margins — which may merit a pricing review — and high-margin drugs
              with lower volumes that may represent untapped growth potential.
            </div>
            <DataTable
              columns={top20Cols}
              data={derived.drug?.slice(0, 20) ?? []}
              maxHeight={420}
            />
          </div>
        </>
      )}
    </div>
  )
}
