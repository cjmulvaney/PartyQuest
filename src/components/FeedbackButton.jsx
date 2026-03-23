import { useState } from 'react'
import { supabase } from '../lib/supabase.js'

export default function FeedbackButton({ eventId, participantId }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [submitted, setSubmitted] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!text.trim()) return

    await supabase.from('feedback').insert({
      event_id: eventId || null,
      participant_id: participantId || null,
      text: text.trim(),
    })

    setText('')
    setSubmitted(true)
    setTimeout(() => {
      setSubmitted(false)
      setOpen(false)
    }, 2000)
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-16 right-4 z-40 bg-stone-700 text-white text-xs font-medium px-3 py-2 rounded-full shadow-lg hover:bg-stone-800 transition-colors"
      >
        Feedback
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-sm mx-auto p-6 space-y-4">
            {submitted ? (
              <p className="text-emerald-700 font-medium text-center py-4">
                Thanks for your feedback!
              </p>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <h3 className="text-lg font-semibold text-stone-800">Feedback</h3>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="How's it going? Any suggestions?"
                  rows={4}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 bg-stone-50 text-stone-700 placeholder-stone-400 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent"
                  autoFocus
                />
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={!text.trim()}
                    className="flex-1 py-3 rounded-xl bg-emerald-700 text-white font-semibold hover:bg-emerald-800 transition-colors disabled:opacity-50"
                  >
                    Send
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="flex-1 py-3 rounded-xl border border-stone-300 text-stone-600 font-semibold hover:bg-stone-200 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
