import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase.js'

export default function CompletionModal({ mission, onClose, onSave }) {
  const [completed, setCompleted] = useState(mission.completed)
  const [notes, setNotes] = useState(mission.notes || '')
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(mission.photo_url || '')
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef(null)

  function handleFileSelect(e) {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type and size
    if (!file.type.startsWith('image/')) return
    if (file.size > 5 * 1024 * 1024) {
      alert('Photo must be under 5MB')
      return
    }

    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  function removePhoto() {
    setPhotoFile(null)
    setPhotoPreview('')
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleSave() {
    setUploading(true)
    let photoUrl = mission.photo_url || null

    // Upload photo if one was selected
    if (photoFile) {
      const ext = photoFile.name.split('.').pop()
      const path = `missions/${mission.id}-${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(path, photoFile, { upsert: true })

      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from('photos')
          .getPublicUrl(path)
        photoUrl = urlData?.publicUrl || null
      }
    } else if (!photoPreview && mission.photo_url) {
      // Photo was removed
      photoUrl = null
    }

    setUploading(false)
    onSave(mission.id, completed, notes, photoUrl)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md mx-auto p-6 space-y-5 animate-slide-up max-h-[90vh] overflow-y-auto">
        <p className="text-stone-800 font-medium leading-relaxed">
          {mission.missions?.text}
        </p>

        <label className="flex items-center gap-3 cursor-pointer" style={{ minHeight: 44 }}>
          <input
            type="checkbox"
            checked={completed}
            onChange={(e) => setCompleted(e.target.checked)}
            className="w-5 h-5 rounded border-stone-300 text-emerald-700 focus:ring-emerald-600 accent-emerald-700"
          />
          <span className="text-stone-700 font-medium">Mark Complete</span>
        </label>

        <div>
          <label className="block text-sm font-medium text-stone-600 mb-1">
            Notes (optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add a note about how it went..."
            rows={3}
            className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 bg-stone-50 text-stone-700 placeholder-stone-400 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent"
          />
        </div>

        {/* Photo */}
        <div>
          <label className="block text-sm font-medium text-stone-600 mb-2">
            Photo (optional)
          </label>

          {photoPreview ? (
            <div className="relative">
              <img
                src={photoPreview}
                alt="Mission photo"
                className="w-full h-48 object-cover rounded-xl"
              />
              <button
                onClick={removePhoto}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 text-white text-sm flex items-center justify-center hover:bg-black/70"
              >
                &times;
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full py-8 rounded-xl border-2 border-dashed border-stone-300 text-stone-400 text-sm font-medium hover:border-emerald-400 hover:text-emerald-600 transition-colors"
            >
              + Add Photo
            </button>
          )}

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={uploading}
            className="flex-1 py-3 rounded-xl bg-emerald-700 text-white font-semibold hover:bg-emerald-800 active:bg-emerald-900 transition-colors disabled:opacity-50"
          >
            {uploading ? 'Saving...' : 'Save'}
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-stone-300 text-stone-600 font-semibold hover:bg-stone-200 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
