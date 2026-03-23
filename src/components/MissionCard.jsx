export default function MissionCard({ mission, onTap }) {
  const isCompleted = mission.completed
  const hasNotes = mission.notes && mission.notes.trim().length > 0

  return (
    <button
      onClick={onTap}
      className={`w-full text-left rounded-xl p-5 shadow-sm transition-colors ${
        isCompleted
          ? 'bg-emerald-50 border border-emerald-200'
          : 'bg-white border border-stone-200 hover:border-stone-300'
      }`}
      style={{ minHeight: 44 }}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex-shrink-0">
          {isCompleted ? (
            <span className="text-emerald-600 text-xl">&#9745;</span>
          ) : (
            <span className="text-stone-300 text-xl">&#9744;</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p
            className={`text-sm leading-relaxed ${
              isCompleted ? 'text-emerald-800' : 'text-stone-700'
            }`}
          >
            {mission.missions?.text}
          </p>
          {hasNotes && (
            <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
              <span>&#9998;</span> note added
            </p>
          )}
        </div>
      </div>
    </button>
  )
}
