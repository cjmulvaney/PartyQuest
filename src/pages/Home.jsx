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
            Secret missions. Live leaderboard.
            <br />
            Make your next event unforgettable.
          </p>
        </div>

        {/* Primary CTA */}
        <button
          onClick={() => navigate('/join')}
          className="w-full py-3 rounded-xl bg-emerald-700 text-white font-semibold text-lg hover:bg-emerald-800 active:bg-emerald-900 transition-colors"
        >
          Join Event
        </button>

        {/* How it works */}
        <div className="bg-white rounded-xl border border-stone-200 p-5 text-left">
          <h3 className="text-sm font-semibold text-stone-700 mb-3">How it works</h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <span className="text-emerald-700 font-bold text-sm mt-0.5">1.</span>
              <p className="text-stone-500 text-sm">Your host creates an event and sends you an invite link or access code</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-emerald-700 font-bold text-sm mt-0.5">2.</span>
              <p className="text-stone-500 text-sm">You get secret missions — things like starting a conversation, pulling off a dare, or sharing a story</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-emerald-700 font-bold text-sm mt-0.5">3.</span>
              <p className="text-stone-500 text-sm">Complete missions during the event and earn points</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-emerald-700 font-bold text-sm mt-0.5">4.</span>
              <p className="text-stone-500 text-sm">Climb the live leaderboard and see what everyone else is up to</p>
            </div>
          </div>
        </div>

        {/* Organizer section */}
        <div className="pt-2 border-t border-stone-200 space-y-3">
          <h3 className="text-sm font-semibold text-stone-700">Hosting an event?</h3>
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
