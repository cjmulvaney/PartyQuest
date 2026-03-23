import { useNavigate } from 'react-router-dom'

export default function Home() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-100 px-4">
      <div className="max-w-sm w-full text-center space-y-8">
        <div className="space-y-3">
          <h1 className="text-5xl font-bold text-emerald-700 tracking-tight">
            Party Quest
          </h1>
          <p className="text-stone-500 text-lg">
            Increasing human connection through secret party quests.
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => navigate('/join')}
            className="w-full py-3 rounded-xl bg-emerald-700 text-white font-semibold text-lg hover:bg-emerald-800 active:bg-emerald-900 transition-colors"
          >
            Join Event
          </button>
          <button
            onClick={() => navigate('/organizer')}
            className="w-full py-3 rounded-xl bg-emerald-700 text-white font-semibold text-lg hover:bg-emerald-800 active:bg-emerald-900 transition-colors"
          >
            Create Event
          </button>
          <button
            onClick={() => navigate('/spectator')}
            className="w-full py-3 rounded-xl border border-stone-300 text-stone-600 font-semibold text-lg hover:bg-stone-200 active:bg-stone-300 transition-colors"
          >
            Spectator View
          </button>
        </div>
      </div>
    </div>
  )
}
