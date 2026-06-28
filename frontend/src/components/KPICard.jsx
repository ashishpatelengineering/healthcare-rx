export default function KPICard({ label, value, sub, accent = 'blue', title }) {
  const cls = {
    blue:   '',
    green:  'green',
    orange: 'orange',
    red:    'red',
    navy:   'navy',
    indigo: 'indigo',
  }[accent] || ''

  return (
    <div className={`kpi-card ${cls}`} title={title}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value ?? '—'}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  )
}
