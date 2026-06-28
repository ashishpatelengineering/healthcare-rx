export const PRIMARY  = '#2A7CC7'
export const BLUE     = '#2A7CC7'
export const NAVY     = '#0D2B4A'
export const GREEN    = '#12855C'
export const ORANGE   = '#C97A00'
export const RED      = '#C0392B'
export const INDIGO   = '#5850A8'
export const TEAL     = '#0E8A8A'
export const OLIVE    = '#3D7A1C'
export const ROSE     = '#8C2F55'

export const COLORS = [PRIMARY, GREEN, ORANGE, INDIGO, RED, TEAL, OLIVE, ROSE]

export const BUCKET_COLORS = {
  'Same Day Fulfilled':        GREEN,
  'Subsequent Days Fulfilled': ORANGE,
  'Unfulfilled':               RED,
}

export const BUCKET_ORDER = [
  'Same Day Fulfilled',
  'Subsequent Days Fulfilled',
  'Unfulfilled',
]

export const ALL_YEARS    = [2023, 2024]
export const ALL_QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4']

export const BASE_LAYOUT = {
  paper_bgcolor: 'rgba(0,0,0,0)',
  plot_bgcolor:  '#F8FAFC',
  font: { family: "'Inter', system-ui, sans-serif", color: NAVY, size: 12 },
  margin: { t: 30, b: 50, l: 60, r: 30 },
  legend: { orientation: 'h', y: 1.1, x: 0 },
  xaxis: {
    gridcolor:    '#E9EEF4',
    linecolor:    '#E2E8F0',
    zerolinecolor:'#E2E8F0',
    tickfont:     { size: 11 },
  },
  yaxis: {
    gridcolor:    '#E9EEF4',
    linecolor:    '#E2E8F0',
    zerolinecolor:'#E2E8F0',
    tickfont:     { size: 11 },
  },
  hoverlabel: {
    bgcolor:     NAVY,
    bordercolor: NAVY,
    font: { color: 'white', size: 12 },
  },
}

export const PLOT_CONFIG = {
  responsive:     true,
  displayModeBar: false,
}
