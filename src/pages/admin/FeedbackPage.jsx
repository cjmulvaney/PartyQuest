import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase.js'
import { useAdminToast } from '../../hooks/useAdminToast.jsx'

export default function FeedbackPage() {
  const { toast } = useAdminToast()
  const [feedback, setFeedback] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterEvent, setFilterEvent] = useState('all')
  const [events, setEvents] = useState([])
  const [search, setSearch] = useState('')
  const [sortDir, setSortDir] = useState('desc')
  const [surveys, setSurveys] = useState([])
  const [surveysLoading, setSurveysLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const [
      { data: fb, error: fbErr },
      { data: ev, error: evErr },
      { data: sv, error: svErr },
    ] = await Promise.all([
      supabase
        .from('feedback')
        .select('id, text, created_at, event_id, participant_id, events(name), participants(name)')
        .order('created_at', { ascending: false }),
      supabase
        .from('events')
        .select('id, name')
        .neq('status', 'draft')
        .order('name'),
      supabase
        .from('event_surveys')
        .select('event_id, rating, increased_enjoyment, met_someone, would_recommend'),
    ])
    if (fbErr) toast.error(`Failed to load feedback: ${fbErr.message}`)
    if (evErr) toast.error(`Failed to load events: ${evErr.message}`)
    if (svErr) toast.error(`Failed to load survey stats: ${svErr.message}`)
    setFeedback(fb || [])
    setEvents(ev || [])
    setSurveys(sv || [])
    setSurveysLoading(false)
    setLoading(false)
  }

  async function deleteFeedback(item) {
    if (!confirm('Delete this feedback entry? This cannot be undone.')) return
    const { error } = await supabase.from('feedback').delete().eq('id', item.id)
    if (error) {
      toast.error(`Failed to delete feedback: ${error.message}`)
      return
    }
    setFeedback((prev) => prev.filter((f) => f.id !== item.id))
    toast.success('Feedback deleted')
  }

  const filteredSurveys = useMemo(() => {
    if (filterEvent === 'all') return surveys
    return surveys.filter((s) => s.event_id === filterEvent)
  }, [surveys, filterEvent])

  const surveyStats = useMemo(() => {
    const s = filteredSurveys
    if (s.length === 0) return null
    const avgRating = (s.reduce((acc, r) => acc + (r.rating || 0), 0) / s.length).toFixed(1)
    const enjoyedPct = Math.round(
      s.filter((r) => r.increased_enjoyment === 'yes' || r.increased_enjoyment === 'somewhat').length / s.length * 100
    )
    const metSomeonePct = Math.round(
      s.filter((r) => r.met_someone === 'yes' || r.met_someone === 'kind_of').length / s.length * 100
    )
    const recommendPct = Math.round(
      s.filter((r) => r.would_recommend === 'yes').length / s.length * 100
    )
    return { avgRating, enjoyedPct, metSomeonePct, recommendPct, total: s.length }
  }, [filteredSurveys])

  const filtered = useMemo(() => {
    let result = feedback
    if (filterEvent !== 'all') {
      result = result.filter((f) => f.event_id === filterEvent)
    }
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        (f) =>
          f.text.toLowerCase().includes(q) ||
          f.participants?.name?.toLowerCase().includes(q) ||
          f.events?.name?.toLowerCase().includes(q)
      )
    }
    if (sortDir === 'asc') {
      result = [...result].reverse()
    }
    return result
  }, [feedback, filterEvent, search, sortDir])

  function exportCsv() {
    const rows = [['Feedback', 'Event', 'Participant', 'Date']]
    filtered.forEach((f) => {
      rows.push([
        `"${(f.text || '').replace(/"/g, '""')}"`,
        `"${(f.events?.name || '').replace(/"/g, '""')}"`,
        `"${(f.participants?.name || '').replace(/"/g, '""')}"`,
        f.created_at ? new Date(f.created_at).toLocaleDateString() : '',
      ])
    })
    const csv = rows.map((r) => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `party-quest-feedback-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success(`Exported ${filtered.length} feedback entries`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="pq-spinner" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Survey aggregate stats */}
      {!surveysLoading && (
        <div className="pq-card">
          <div className="flex items-center justify-between mb-4">
            <h3
              style={{ fontFamily: 'var(--font-heading)', fontSize: '1rem', fontWeight: 700, color: 'var(--color-text)' }}
            >
              Post-Event Survey Results
            </h3>
            {surveyStats && (
              <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                {surveyStats.total} response{surveyStats.total !== 1 ? 's' : ''}
                {filterEvent !== 'all' ? ' for this event' : ' all time'}
              </span>
            )}
          </div>
          {!surveyStats ? (
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              No survey responses yet{filterEvent !== 'all' ? ' for this event' : ''}.
            </p>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Avg Rating', value: `${surveyStats.avgRating} / 5` },
                { label: '% Enjoyed More', value: `${surveyStats.enjoyedPct}%` },
                { label: '% Met Someone', value: `${surveyStats.metSomeonePct}%` },
                { label: '% Would Recommend', value: `${surveyStats.recommendPct}%` },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="p-4"
                  style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-md)' }}
                >
                  <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8125rem', fontFamily: 'var(--font-body)', marginBottom: '0.25rem' }}>
                    {stat.label}
                  </p>
                  <p style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text)' }}>
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2
            className="text-2xl font-bold"
            style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-text)' }}
          >
            Feedback
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
            {filtered.length} response{filtered.length !== 1 ? 's' : ''}
            {filtered.length !== feedback.length && ` of ${feedback.length} total`}
          </p>
        </div>
        <button onClick={exportCsv} className="pq-btn pq-btn-secondary" style={{ fontSize: '0.8125rem' }}>
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search feedback..."
          className="pq-input"
          style={{ width: '250px' }}
        />
        <select
          value={filterEvent}
          onChange={(e) => setFilterEvent(e.target.value)}
          className="pq-input"
          style={{ width: 'auto', minWidth: '200px', cursor: 'pointer' }}
        >
          <option value="all">All Events ({feedback.length})</option>
          {events.map((ev) => (
            <option key={ev.id} value={ev.id}>
              {ev.name} ({feedback.filter((f) => f.event_id === ev.id).length})
            </option>
          ))}
        </select>
        <button
          onClick={() => setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))}
          className="pq-btn pq-btn-ghost"
          style={{ fontSize: '0.8125rem' }}
        >
          {sortDir === 'desc' ? 'Newest first' : 'Oldest first'} {sortDir === 'desc' ? '\u25BC' : '\u25B2'}
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="pq-card text-center py-12">
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            {feedback.length === 0 ? 'No feedback yet.' : 'No feedback matches your filters.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((f) => (
            <div
              key={f.id}
              className="pq-card"
              style={{ transition: 'var(--transition-fast)' }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--color-border-strong)')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
            >
              <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text)' }}>
                {f.text}
              </p>
              <div
                className="flex items-center gap-3 mt-3 pt-3"
                style={{ borderTop: '1px solid var(--color-border-light)' }}
              >
                {f.events?.name && (
                  <span className="pq-badge pq-badge-primary">{f.events.name}</span>
                )}
                {f.participants?.name && (
                  <span className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                    by {f.participants.name}
                  </span>
                )}
                <span className="text-xs ml-auto" style={{ color: 'var(--color-text-muted)' }}>
                  {new Date(f.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </span>
                <button
                  onClick={() => deleteFeedback(f)}
                  className="pq-btn pq-btn-ghost"
                  title="Delete feedback"
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--color-danger, #dc2626)',
                    padding: '0.25rem 0.5rem',
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
