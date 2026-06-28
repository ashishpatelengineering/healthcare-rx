import { useState, useMemo } from 'react'

/**
 * columns: [{ key, label, format?, align?, className? }]
 * data:    array of row objects
 */
export default function DataTable({ columns, data = [], maxHeight = 360 }) {
  const [sort, setSort] = useState({ key: null, dir: 1 })

  function toggleSort(key) {
    setSort(prev => ({ key, dir: prev.key === key ? -prev.dir : -1 }))
  }

  const sorted = useMemo(() => {
    if (!sort.key) return data
    return [...data].sort((a, b) => {
      const av = a[sort.key], bv = b[sort.key]
      if (av == null) return 1
      if (bv == null) return -1
      return (av > bv ? 1 : av < bv ? -1 : 0) * sort.dir
    })
  }, [data, sort])

  return (
    <div className="data-table-wrap">
      <div className="table-scroll" style={{ maxHeight }}>
        <table>
          <thead>
            <tr>
              {columns.map(col => (
                <th
                  key={col.key}
                  onClick={() => toggleSort(col.key)}
                  className={sort.key === col.key ? 'sorted' : ''}
                  style={{ textAlign: col.align === 'right' ? 'right' : 'left' }}
                >
                  {col.label}
                  <span className="sort-icon">
                    {sort.key === col.key ? (sort.dir === -1 ? ' ↓' : ' ↑') : ' ↕'}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => (
              <tr key={i}>
                {columns.map(col => (
                  <td
                    key={col.key}
                    className={[col.align === 'right' ? 'num' : '', col.className || ''].join(' ')}
                  >
                    {col.format ? col.format(row[col.key], row) : (row[col.key] ?? '—')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
