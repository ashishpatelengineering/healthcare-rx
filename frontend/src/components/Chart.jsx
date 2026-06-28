import { useEffect, useRef } from 'react'
import { BASE_LAYOUT, PLOT_CONFIG } from '../constants'

export default function Chart({ data, layout = {}, style = {}, height = 320 }) {
  const ref = useRef(null)

  useEffect(() => {
    if (!ref.current || !data?.length) return
    const P = window.Plotly
    if (!P) return

    const merged = {
      ...BASE_LAYOUT,
      ...layout,
      xaxis: { ...BASE_LAYOUT.xaxis, ...(layout.xaxis || {}) },
      yaxis: { ...BASE_LAYOUT.yaxis, ...(layout.yaxis || {}) },
    }

    P.newPlot(ref.current, data, merged, PLOT_CONFIG)

    return () => { if (ref.current) P.purge(ref.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(data), JSON.stringify(layout)])

  return (
    <div
      ref={ref}
      style={{ width: '100%', minHeight: height, ...style }}
    />
  )
}
