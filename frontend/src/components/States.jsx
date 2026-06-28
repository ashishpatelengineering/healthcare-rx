export function Loading({ text = 'Loading data…' }) {
  return (
    <div className="loading-wrap">
      <div className="spinner" />
      <span className="loading-text">{text}</span>
    </div>
  )
}

export function ErrorMsg({ message }) {
  return (
    <div className="error-wrap">
      <strong>Unable to load data</strong>
      {message && <div style={{ marginTop: 4, fontSize: 12 }}>{message}</div>}
    </div>
  )
}
