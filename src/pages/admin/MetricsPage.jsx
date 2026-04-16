import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase.js'
import { useAdminToast } from '../../hooks/useAdminToast.jsx'

export default function MetricsPage() {
  const { toast } = useAdminToast()
  const [loading, setLoading] = useState(true)

  // Raw data
  const [totalEvents, setTotalEvents] = useState(0)
  const [totalParticipants, setTotalParticipants] = useState(0)
  const [phoneParticipantEvents, setPhoneParticipantEvents] = useState([])
  const [missionData, setMissionData] = useState([])
  const [surveys, setSurveys] = useState([])
  const [returningPlayers, setReturningPlayers] = useState(0)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const [
      { count: evCount, error: evErr },
      { count: partCount, error: partErr },
      { data: phoneParts, error: phoneErr },
      { data: missions, error: missionsErr },
      { data: sv, error: svErr },
      { count: returning, error: retErr },
    ] = await Promise.all([
      supabase.from('events').select('*', { count: 'exact', head: true }).neq('status', 'draft'),
      supabase.from('participants').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('participants').select('event_id').eq('is_active', true).not('phone', 'is', null),
      supabase.from('participant_missions').select('participant_id, completed'),
      supabase.from('event_surveys').select('rating, increased_enjoyment, met_someone, would_recommend'),
      supabase.from('known_players').select('*', { count: 'exact', head: true }).gt('event_count', 1),
    ])

    if (evErr) toast.error(`Failed to load events: ${evErr.message}`)
    if (partErr) toast.error(`Failed to load participants: ${partErr.message}`)
    if (phoneErr) toast.error(`Failed to load phone data: ${phoneErr.message}`)
    if (missionsErr) toast.error(`Failed to load mission data: ${missionsErr.message}`)
    if (svErr) toast.error(`Failed to load survey data: ${svErr.message}`)
    if (retErr) toast.error(`Failed to load retention data: ${retErr.message}`)

    setTotalEvents(evCount || 0)
    setTotalParticipants(partCount || 0)
    setPhoneParticipantEvents(phoneParts || [])
    setMissionData(missions || [])
    setSurveys(sv || [])
    setReturningPlayers(returning || 0)
    setLoading(false)
  }

  const metrics = useMemo(() => {
    // SMS reach: % of events that had at least one phone participant
    const eventsWithPhone = new Set(phoneParticipantEvents.map((p) => p.event_id))
    const smsReachPct = totalEvents > 0
      ? Math.round((eventsWithPhone.size / totalEvents) * 100)
      : 0

    // Avg participants / event
    const avgParticipants = totalEvents > 0
      ? (totalParticipants / totalEvents).toFixed(1)
      : '—'

    // Avg missions completed / participant
    const completedMissions = missionData.filter((pm) => pm.completed).length
    const participantsWithMissions = new Set(missionData.map((pm) => pm.participant_id)).size
    const avgMissions = participantsWithMissions > 0
      ? (completedMissions / participantsWithMissions).toFixed(1)
      : '—'

    // Survey stats
    const s = surveys
    const avgRating = s.length > 0
      ? (s.reduce((acc, r) => acc + (r.rating || 0), 0) / s.length).toFixed(1)
      : '—'
    const metSomeonePct = s.length > 0
      ? Math.round(s.filter((r) => r.met_someone === 'yes' || r.met_someone === 'kind_of').length / s.length * 100)
      : 0
    const recommendPct = s.length > 0
      ? Math.round(s.filter((r) => r.would_recommend === 'yes').length / s.length * 100)
      : 0

    return [
      { label: 'Total events', value: totalEvents.toLocaleString() },
      { label: 'Total participants', value: totalParticipants.toLocaleString() },
      { label: 'SMS reach', value: `${smsReachPct}%`, note: 'Events with ≥1 phone participant' },
      { label: 'Avg participants / event', value: avgParticipants },
      { label: 'Avg missions completed / player', value: avgMissions },
      { label: 'Total survey responses', value: s.length.toLocaleString() },
      { label: 'Avg rating', value: avgRating === '—' ? '—' : `${avgRating} / 5` },
      { label: '"Met someone" rate', value: s.length > 0 ? `${metSomeonePct}%` : '—', note: '% yes or kind of' },
      { label: '"Would recommend" rate', value: s.length > 0 ? `${recommendPct}%` : '—' },
      { label: 'Returning players', value: returningPlayers.toLocaleString(), note: '* Phone participants only' },
    ]
  }, [totalEvents, totalParticipants, phoneParticipantEvents, missionData, surveys, returningPlayers])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="pq-spinner" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2
          className="text-2xl font-bold"
          style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-text)' }}
        >
          Metrics
        </h2>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
          All-time stats across all events
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="p-4"
            style={{
              background: 'var(--color-surface)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
            }}
          >
            <p
              style={{
                color: 'var(--color-text-muted)',
                fontSize: '0.8125rem',
                fontFamily: 'var(--font-body)',
                marginBottom: '0.25rem',
              }}
            >
              {metric.label}
            </p>
            <p
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '1.75rem',
                fontWeight: 700,
                color: 'var(--color-text)',
                lineHeight: 1.1,
              }}
            >
              {metric.value}
            </p>
            {metric.note && (
              <p
                style={{
                  color: 'var(--color-text-muted)',
                  fontSize: '0.75rem',
                  fontFamily: 'var(--font-body)',
                  marginTop: '0.25rem',
                }}
              >
                {metric.note}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
