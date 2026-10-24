import { Route, Routes } from 'react-router'
import { AppShell } from './components/AppShell'
import { CheckFacility } from './pages/CheckFacility'
import { CheckPhoto } from './pages/CheckPhoto'
import { CheckQuestions } from './pages/CheckQuestions'
import { CheckResult } from './pages/CheckResult'
import { Emergency } from './pages/Emergency'
import { Find } from './pages/Find'
import { FindResults } from './pages/FindResults'
import { Home } from './pages/Home'
import { NotFound } from './pages/NotFound'
import { Placeholder } from './pages/Placeholder'
import { BillCheckProvider } from './state/BillCheck'

// Routes follow frontend.md. Swap each Placeholder for its page as it is built.
export function App() {
  return (
    <BillCheckProvider>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Home />} />
          <Route path="check" element={<CheckFacility />} />
          <Route path="check/questions" element={<CheckQuestions />} />
          <Route path="check/photo" element={<CheckPhoto />} />
          <Route path="check/result" element={<CheckResult />} />
          <Route path="find" element={<Find />} />
          <Route path="find/results" element={<FindResults />} />
          <Route path="emergency" element={<Emergency />} />
          <Route path="about" element={<Placeholder title="page.about" />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BillCheckProvider>
  )
}
