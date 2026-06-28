import { createContext, useContext, useState } from 'react'
import { ALL_YEARS, ALL_QUARTERS } from '../constants'

const Ctx = createContext(null)

export function FilterProvider({ children }) {
  const [selYears,    setSelYears]    = useState([...ALL_YEARS])
  const [selQuarters, setSelQuarters] = useState([...ALL_QUARTERS])

  function toggleYear(y) {
    setSelYears(prev => {
      const next = prev.includes(y) ? prev.filter(x => x !== y) : [...prev, y]
      return next.length ? next : prev   // never empty
    })
  }

  function toggleQuarter(q) {
    setSelQuarters(prev => {
      const next = prev.includes(q) ? prev.filter(x => x !== q) : [...prev, q]
      return next.length ? next : prev
    })
  }

  return (
    <Ctx.Provider value={{
      selYears, selQuarters,
      toggleYear, toggleQuarter,
      ALL_YEARS, ALL_QUARTERS,
    }}>
      {children}
    </Ctx.Provider>
  )
}

export function useFilters() {
  return useContext(Ctx)
}
