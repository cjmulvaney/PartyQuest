import { Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './hooks/useTheme.jsx'
import Home from './pages/Home.jsx'
import Join from './pages/Join.jsx'
import Play from './pages/Play.jsx'
import Register from './pages/Register.jsx'
import Spectator from './pages/Spectator.jsx'
import AuthCallback from './pages/AuthCallback.jsx'
import Dashboard from './pages/organizer/Dashboard.jsx'
import CreateEvent from './pages/organizer/CreateEvent.jsx'
import EventDetail from './pages/organizer/EventDetail.jsx'
import OrganizerSettings from './pages/organizer/Settings.jsx'
import AdminLayout from './pages/admin/AdminLayout.jsx'
import MissionsPage from './pages/admin/MissionsPage.jsx'
import EventsPage from './pages/admin/EventsPage.jsx'
import FeedbackPage from './pages/admin/FeedbackPage.jsx'
import OrganizersPage from './pages/admin/OrganizersPage.jsx'

export default function App() {
  return (
    <ThemeProvider>
      <div className="min-h-screen pq-bg-texture" style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)', position: 'relative' }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/join" element={<Join />} />
          <Route path="/play/:accessCode" element={<Play />} />
          <Route path="/register/:eventCode" element={<Register />} />
          <Route path="/spectator" element={<Spectator />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/organizer" element={<Dashboard />} />
          <Route path="/organizer/new" element={<CreateEvent />} />
          <Route path="/organizer/event/:id" element={<EventDetail />} />
          <Route path="/organizer/settings" element={<OrganizerSettings />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<MissionsPage />} />
            <Route path="events" element={<EventsPage />} />
            <Route path="feedback" element={<FeedbackPage />} />
            <Route path="organizers" element={<OrganizersPage />} />
          </Route>
        </Routes>
        <span
          style={{
            position: 'fixed',
            bottom: '8px',
            right: '10px',
            fontFamily: 'var(--font-body)',
            fontSize: '0.6rem',
            color: 'var(--color-text-muted)',
            opacity: 0.35,
            pointerEvents: 'none',
            userSelect: 'none',
            letterSpacing: '0.03em',
          }}
        >
          v2.3
        </span>
      </div>
    </ThemeProvider>
  )
}
