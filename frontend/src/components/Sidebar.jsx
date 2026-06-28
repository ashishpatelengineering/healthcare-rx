import { NavLink } from 'react-router-dom'
import { useFilters } from '../context/FilterContext'

const NAV = [
  { to: '/',            label: 'About',                   end: true },
  { to: '/executive',   label: 'Executive Overview' },
  { to: '/volume',      label: 'Prescription Volume' },
  { to: '/fulfillment', label: 'Fulfillment Performance' },
  { to: '/hospitals',   label: 'Hospital Scorecard' },
  { to: '/financial',   label: 'Financial Performance' },
  { to: '/drugs',       label: 'Drug Performance' },
  { to: '/regional',    label: 'Regional Performance' },
]

export default function Sidebar() {
  const { selYears, selQuarters, toggleYear, toggleQuarter, ALL_YEARS, ALL_QUARTERS } = useFilters()

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-badge">Rx</div>
        <div>
          <div className="sidebar-logo-name">Healthcare Rx</div>
          <div className="sidebar-logo-sub">Analytics Platform</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <div className="sidebar-section-label">Navigate</div>
        {NAV.map(({ to, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
          >
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Filters */}
      <div className="sidebar-filters">
        <div className="sidebar-section-label">Filter by Period</div>

        <div className="filter-group">
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.3)', marginBottom: 6 }}>
            YEAR
          </div>
          <div className="filter-pill-row">
            {ALL_YEARS.map(y => (
              <button
                key={y}
                className={`filter-pill${selYears.includes(y) ? ' active' : ''}`}
                onClick={() => toggleYear(y)}
              >
                {y}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-group">
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.3)', marginBottom: 6 }}>
            QUARTER
          </div>
          <div className="filter-pill-row">
            {ALL_QUARTERS.map(q => (
              <button
                key={q}
                className={`filter-pill${selQuarters.includes(q) ? ' active' : ''}`}
                onClick={() => toggleQuarter(q)}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="sidebar-footer">
        <div className="sidebar-footer-text">Source: ANALYTICS_DB · Read-only</div>
      </div>
    </aside>
  )
}
