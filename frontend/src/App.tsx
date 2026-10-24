import { Route, Routes } from 'react-router'
import { AppShell } from './components/AppShell'
import { NotFound } from './pages/NotFound'
import { Placeholder } from './pages/Placeholder'

// Routes follow frontend.md. Swap each Placeholder for its page as it is built.
export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Placeholder title="page.home" />} />
        <Route path="check" element={<Placeholder title="page.check.facility" />} />
        <Route path="check/questions" element={<Placeholder title="page.check.questions" />} />
        <Route path="check/photo" element={<Placeholder title="page.check.photo" />} />
        <Route path="check/result" element={<Placeholder title="page.check.result" />} />
        <Route path="find" element={<Placeholder title="page.find" />} />
        <Route path="find/results" element={<Placeholder title="page.find.results" />} />
        <Route path="emergency" element={<Placeholder title="page.emergency" />} />
        <Route path="about" element={<Placeholder title="page.about" />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
