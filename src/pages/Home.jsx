import { useNavigate } from 'react-router-dom'

export default function Home() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-100 px-4">
      <div className="max-w-sm w-full text-center space-y-8">
        {/* Hero */}
        <div className="space-y-4">
          <h1 className="text-5xl font-bold text-emerald-700 tracking-tight">
            Party Quest
          </h1>
          <p className="text-stone-500 text-lg leading-relaxed">
            Complete secret missions at your next party.
            <br />
            Earn points. Make connections. Make your event memorable.
          </p>
        </div>

        {/* Primary CTA */}
        <button
          onClick={() => navigate('/join')}
          className="w-full py-3 rounded-xl bg-emerald-700 text-white font-semibold text-lg hover:bg-emerald-800 active:bg-emerald-900 transition-colors"
        >
          Join Event
        </button>

        {/* What is Party Quest */}
        <div className="bg-white rounded-xl border border-stone-200 p-4">
          <h3 className="text-sm font-semibold text-stone-700 mb-2">What is Party Quest?</h3>
          <p className="text-stone-500 text-sm leading-relaxed text-left">
            Party Quest gives each guest secret missions to complete during an event — things like starting a conversation, pulling off a dare, or sharing a story. Completions are tracked on a live leaderboard everyone can see. It's a simple way to break the ice and get people interacting.
          </p>
        </div>

        {/* Organizer section */}
        <div className="pt-2 border-t border-stone-200 space-y-3">
          <h3 className="text-sm font-semibold text-stone-700">Organizer</h3>
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/organizer')}
              className="flex-1 py-2.5 rounded-xl border border-emerald-700 text-emerald-700 font-medium text-sm hover:bg-emerald-50 transition-colors"
            >
              Create Event
            </button>
            <button
              onClick={() => navigate('/spectator')}
              className="flex-1 py-2.5 rounded-xl border border-stone-300 text-stone-500 font-medium text-sm hover:bg-stone-50 transition-colors"
            >
              Spectator View
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
