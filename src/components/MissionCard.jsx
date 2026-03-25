import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase.js'

export default function MissionCard({ mission, onSave }) {
  const isCompleted = mission.completed
  const [expanded, setExpanded] = useState(false)
  const [completed, setCompleted] = useState(isCompleted)
  const [notes, setNotes] = useState(mission.notes || '')
  const [photoUrl, setPhotoUrl] = useState(mission.photo_url || '')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [collapsing, setCollapsing] = useState(false)
  const fileInputRef = useRef(null)

  const missionText = mission.missions?.text
  const category = mission.missions?.category

  function handleCardTap() {
    if (expanded || isCompleted) return
    setExpanded(true)
  }

  function handleCollapse() {
    setCollapsing(true)
    setTimeout(() => {
      setExpanded(false)
      setCollapsing(false)
      // Reset form state
      setCompleted(isCompleted)
      setNotes(mission.notes || '')
      setPhotoUrl(mission.photo_url || '')
    }, 200)
  }

  async function handlePhotoUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${mission.id}-${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(fileName, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data } = supabase.storage
        .from('photos')
        .getPublicUrl(fileName)

      setPhotoUrl(data.publicUrl)
    } catch (err) {
      console.error('Photo upload failed:', err)
    } finally {
      setUploading(false)
    }
  }

  function handleRemovePhoto() {
    setPhotoUrl('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleSave() {
    setSaving(true)
    try {
      await onSave(mission.id, completed, notes, photoUrl)
      setCollapsing(true)
      setTimeout(() => {
        setExpanded(false)
        setCollapsing(false)
      }, 200)
    } catch (err) {
      console.error('Save failed:', err)
    } finally {
      setSaving(false)
    }
  }

  // --- Completed state ---
  if (isCompleted && !expanded) {
    return (
      <div
        className="pq-card w-full"
        style={{
          background: 'var(--color-success-light)',
          borderColor: 'var(--color-success)',
          borderWidth: '1.5px',
        }}
      >
        <div className="flex items-center gap-3">
          {/* Completed checkbox */}
          <div
            className="flex-shrink-0 flex items-center justify-center"
            style={{
              width: 28,
              height: 28,
              borderRadius: 'var(--radius-full)',
              background: 'var(--color-success)',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M3.5 8.5L6.5 11.5L12.5 4.5"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <div className="flex-1 min-w-0">
            <p
              style={{
                fontSize: 15,
                lineHeight: 1.5,
                color: 'var(--color-text)',
                fontFamily: 'var(--font-body)',
              }}
            >
              {missionText}
            </p>
            {(mission.notes || mission.photo_url) && (
              <div className="flex items-center gap-2 mt-1">
                {mission.notes && (
                  <span
                    className="pq-badge pq-badge-success"
                    style={{ fontSize: 11, padding: '2px 8px' }}
                  >
                    note added
                  </span>
                )}
                {mission.photo_url && (
                  <span
                    className="pq-badge pq-badge-success"
                    style={{ fontSize: 11, padding: '2px 8px' }}
                  >
                    photo attached
                  </span>
                )}
              </div>
            )}
          </div>

          {category && (
            <span className="pq-badge pq-badge-muted flex-shrink-0">
              {category}
            </span>
          )}
        </div>
      </div>
    )
  }

  // --- Collapsed incomplete state ---
  if (!expanded) {
    return (
      <button
        onClick={handleCardTap}
        className="pq-card pq-card-interactive w-full text-left"
        style={{
          cursor: 'pointer',
          minHeight: 44,
        }}
      >
        <div className="flex items-center gap-3">
          {/* Empty checkbox circle */}
          <div
            className="flex-shrink-0 flex items-center justify-center"
            style={{
              width: 28,
              height: 28,
              borderRadius: 'var(--radius-full)',
              border: '2px solid var(--color-border-strong)',
              background: 'var(--color-surface)',
              transition: 'border-color var(--transition-fast)',
            }}
          />

          <div className="flex-1 min-w-0">
            <p
              style={{
                fontSize: 15,
                lineHeight: 1.5,
                color: 'var(--color-text)',
                fontFamily: 'var(--font-body)',
              }}
            >
              {missionText}
            </p>
          </div>

          {category && (
            <span className="pq-badge pq-badge-muted flex-shrink-0">
              {category}
            </span>
          )}

          {/* Tap affordance chevron */}
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            className="flex-shrink-0"
            style={{ color: 'var(--color-text-muted)' }}
          >
            <path
              d="M7.5 5L12.5 10L7.5 15"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </button>
    )
  }

  // --- Expanded state ---
  return (
    <div
      className={`pq-card w-full ${collapsing ? 'mission-expand-exit' : 'mission-expand-enter'}`}
      style={{
        borderColor: 'var(--color-primary)',
        borderWidth: '1.5px',
        boxShadow: 'var(--shadow-md)',
      }}
    >
      {/* Header row */}
      <div className="flex items-start gap-3 mb-4">
        {/* Toggle checkbox */}
        <button
          onClick={() => setCompleted(!completed)}
          className="flex-shrink-0 flex items-center justify-center"
          style={{
            width: 32,
            height: 32,
            borderRadius: 'var(--radius-full)',
            border: completed ? 'none' : '2px solid var(--color-border-strong)',
            background: completed ? 'var(--color-success)' : 'var(--color-surface)',
            cursor: 'pointer',
            transition: 'all var(--transition-fast)',
            minHeight: 44,
            minWidth: 44,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
            margin: '-6px',
          }}
          aria-label={completed ? 'Mark incomplete' : 'Mark complete'}
        >
          {completed && (
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
              <path
                d="M3.5 8.5L6.5 11.5L12.5 4.5"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>

        <div className="flex-1 min-w-0" style={{ marginLeft: 6 }}>
          <p
            style={{
              fontSize: 17,
              lineHeight: 1.5,
              fontWeight: 500,
              color: 'var(--color-text)',
              fontFamily: 'var(--font-body)',
            }}
          >
            {missionText}
          </p>
          {category && (
            <span
              className="pq-badge pq-badge-primary mt-1"
              style={{ fontSize: 11 }}
            >
              {category}
            </span>
          )}
        </div>
      </div>

      {/* Notes */}
      <div className="mb-3">
        <label
          htmlFor={`notes-${mission.id}`}
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--color-text-secondary)',
            fontFamily: 'var(--font-body)',
            display: 'block',
            marginBottom: 6,
          }}
        >
          Notes
        </label>
        <textarea
          id={`notes-${mission.id}`}
          className="pq-input"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add a note about this mission..."
          rows={3}
          style={{
            resize: 'vertical',
            minHeight: 80,
          }}
        />
      </div>

      {/* Photo upload */}
      <div className="mb-4">
        <label
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--color-text-secondary)',
            fontFamily: 'var(--font-body)',
            display: 'block',
            marginBottom: 6,
          }}
        >
          Photo
        </label>

        {photoUrl ? (
          <div className="flex items-start gap-3">
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                border: '1px solid var(--color-border)',
                flexShrink: 0,
              }}
            >
              <img
                src={photoUrl}
                alt="Mission photo"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            </div>
            <button
              onClick={handleRemovePhoto}
              className="pq-btn pq-btn-ghost"
              style={{
                fontSize: 13,
                padding: '6px 12px',
                minHeight: 36,
                color: 'var(--color-danger)',
              }}
            >
              Remove
            </button>
          </div>
        ) : (
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoUpload}
              style={{ display: 'none' }}
              id={`photo-${mission.id}`}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="pq-btn pq-btn-secondary"
              disabled={uploading}
              style={{
                fontSize: 14,
                padding: '8px 16px',
                gap: 6,
              }}
            >
              {uploading ? (
                <>
                  <span className="pq-spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                  Uploading...
                </>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <rect
                      x="2"
                      y="3"
                      width="14"
                      height="12"
                      rx="2"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                    <circle cx="6.5" cy="7.5" r="1.5" stroke="currentColor" strokeWidth="1.2" />
                    <path
                      d="M2 12L5.5 9L8 11L11.5 7L16 12"
                      stroke="currentColor"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Add Photo
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleSave}
          className="pq-btn pq-btn-primary flex-1"
          disabled={saving}
        >
          {saving ? (
            <>
              <span className="pq-spinner" style={{ width: 16, height: 16, borderWidth: 2, borderTopColor: 'white', borderColor: 'rgba(255,255,255,0.3)' }} />
              Saving...
            </>
          ) : (
            'Save'
          )}
        </button>
        <button
          onClick={handleCollapse}
          className="pq-btn pq-btn-ghost"
          disabled={saving}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
