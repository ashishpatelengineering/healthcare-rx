import { useFilters } from '../context/FilterContext'
import { activeFilterSummary } from '../utils'

export default function PageHeader({ title, subtitle }) {
  const { selYears, selQuarters } = useFilters()
  const summary = activeFilterSummary(selYears, selQuarters)
  const isFiltered = !summary.startsWith('All')

  return (
    <div className="page-header">
      <h1 className="page-title">{title}</h1>
      {subtitle && <p className="page-subtitle">{subtitle}</p>}
      <div className={`filter-badge${isFiltered ? '' : ''}`} style={isFiltered ? {} : { background: '#F1F5F9', color: '#94A3B8' }}>
        <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor">
          <path d="M6 10.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5zm-2-3a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5zm-2-3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5z"/>
        </svg>
        {summary}
      </div>
    </div>
  )
}
