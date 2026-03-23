export default function LockedMission({ unlockTime }) {
  const time = new Date(unlockTime)
  const label = time.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

  return (
    <div className="bg-stone-200 opacity-50 rounded-xl p-5 min-h-[80px] flex items-center justify-center">
      <p className="text-stone-500 text-sm font-medium text-center">
        Locked &mdash; unlocks at {label}
      </p>
    </div>
  )
}
