import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { FilterProvider } from './context/FilterContext'
import Sidebar from './components/Sidebar'
import About from './pages/About'
import ExecutiveOverview from './pages/ExecutiveOverview'
import PrescriptionVolume from './pages/PrescriptionVolume'
import FulfillmentPerformance from './pages/FulfillmentPerformance'
import HospitalScorecard from './pages/HospitalScorecard'
import FinancialPerformance from './pages/FinancialPerformance'
import DrugPerformance from './pages/DrugPerformance'
import RegionalPerformance from './pages/RegionalPerformance'

export default function App() {
  return (
    <BrowserRouter>
      <FilterProvider>
        <div className="app-shell">
          <Sidebar />
          <main className="main-content">
            <Routes>
              <Route path="/"            element={<About />} />
              <Route path="/executive"   element={<ExecutiveOverview />} />
              <Route path="/volume"      element={<PrescriptionVolume />} />
              <Route path="/fulfillment" element={<FulfillmentPerformance />} />
              <Route path="/hospitals"   element={<HospitalScorecard />} />
              <Route path="/financial"   element={<FinancialPerformance />} />
              <Route path="/drugs"       element={<DrugPerformance />} />
              <Route path="/regional"    element={<RegionalPerformance />} />
            </Routes>
          </main>
        </div>
      </FilterProvider>
    </BrowserRouter>
  )
}
