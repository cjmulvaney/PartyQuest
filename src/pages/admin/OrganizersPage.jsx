import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase.js'

export default function OrganizersPage() {
  const [organizers, setOrganizers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadOrganizers()
  }, [])

  async function loadOrganizers() {
    // Get all events grouped by organizer
    const { data: events } = await supabase
      .from('events')
      .select('organizer_id, id, status')
      .neq('status', 'draft')

    if (!events || events.length === 0) {
      setOrganizers([])
      setLoading(false)
      return
    }

    // Group by organizer_id
    const byOrganizer = {}
    events.forEach((e) => {
      if (!e.organizer_id) return
      if (!byOrganizer[e.organizer_id]) {
        byOrganizer[e.organizer_id] = { id: e.organizer_id, eventCount: 0, activeCount: 0 }
      }
      byOrganizer[e.organizer_id].eventCount++
      if (e.status === 'active') byOrganizer[e.organizer_id].activeCount++
    })

    // Try to get user emails from auth (may not work without service role key)
    // Fall back to organizer_email from events
    const orgIds = Object.keys(byOrganizer)
    const { data: emailEvents } = await supabase
      .from('events')
      .select('organizer_id, organizer_email')
      .in('organizer_id', orgIds)
      .not('organizer_email', 'is', null)

    const emailMap = {}
    emailEvents?.forEach((e) => {
      if (e.organizer_email) emailMap[e.organizer_id] = e.organizer_email
    })

    const list = Object.values(byOrganizer).map((org) => ({
      ...org,
      email: emailMap[org.id] || org.id.substring(0, 8) + '...',
    }))

    setOrganizers(list)
    setLoading(false)
  }

  if (loading) return <p className="text-stone-500">Loading organizers...</p>

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-stone-800">Organizer Accounts</h2>

      <div className="text-sm text-stone-400">
        {organizers.length} organizer{organizers.length !== 1 ? 's' : ''}
      </div>

      {organizers.length === 0 ? (
        <p className="text-stone-400 text-sm text-center py-8">No organizers yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-stone-400 border-b border-stone-200">
                <th className="pb-2 font-medium">Email / ID</th>
                <th className="pb-2 font-medium">Total Events</th>
                <th className="pb-2 font-medium">Active Events</th>
              </tr>
            </thead>
            <tbody>
              {organizers.map((org) => (
                <tr key={org.id} className="border-b border-stone-100">
                  <td className="py-3 text-stone-800">{org.email}</td>
                  <td className="py-3 text-stone-600">{org.eventCount}</td>
                  <td className="py-3 text-stone-600">{org.activeCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
