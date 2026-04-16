import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase.js'
import { useAdminToast } from '../../hooks/useAdminToast.jsx'

export default function MissionsPage() {
  const { toast } = useAdminToast()
  const [missions, setMissions] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedCategories, setSelectedCategories] = useState(new Set())
  const [selectedTags, setSelectedTags] = useState(new Set())
  const [statusFilter, setStatusFilter] = useState('all') // all | active | inactive
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [showAddCategory, setShowAddCategory] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)
  const [newCatName, setNewCatName] = useState('')
  const [newCatDesc, setNewCatDesc] = useState('')
  const [csvStatus, setCsvStatus] = useState('')
  const fileRef = useRef(null)

  // New mission form state
  const [newText, setNewText] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [newTags, setNewTags] = useState('')
  const [newCreatorName, setNewCreatorName] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const [{ data: m, error: mErr }, { data: c, error: cErr }] = await Promise.all([
      supabase
        .from('missions')
        .select('id, text, active, tags, category_id, creator_name, categories(name)')
        .order('created_at', { ascending: false }),
      supabase.from('categories').select('id, name, description').order('name'),
    ])
    if (mErr) toast.error(`Failed to load missions: ${mErr.message}`)
    if (cErr) toast.error(`Failed to load categories: ${cErr.message}`)
    setMissions(m || [])
    setCategories(c || [])
    if (c?.length && !newCategory) setNewCategory(c[0].id)
    // Default: all categories selected
    setSelectedCategories(new Set(c?.map((cat) => cat.id) || []))
    setLoading(false)
  }

  // Collect all unique tags across missions
  const allTags = [...new Set(missions.flatMap((m) => m.tags || []))].sort()

  async function toggleActive(mission) {
    const { error } = await supabase
      .from('missions')
      .update({ active: !mission.active })
      .eq('id', mission.id)
    if (error) {
      toast.error(`Failed to toggle mission: ${error.message}`)
      return
    }
    setMissions((prev) =>
      prev.map((m) => (m.id === mission.id ? { ...m, active: !m.active } : m))
    )
    toast.success(mission.active ? 'Mission deactivated' : 'Mission activated')
  }

  async function deleteMission(mission) {
    if (!confirm(`Permanently delete this mission?\n\n"${mission.text.substring(0, 100)}..."\n\nThis cannot be undone.`)) return
    const { error } = await supabase.from('missions').delete().eq('id', mission.id)
    if (error) {
      toast.error(`Failed to delete mission: ${error.message}`)
      return
    }
    setMissions((prev) => prev.filter((m) => m.id !== mission.id))
    toast.success('Mission permanently deleted')
  }

  async function saveMission(id, text, categoryId, tags) {
    const tagArr = tags
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean)
    const { error } = await supabase
      .from('missions')
      .update({ text, category_id: categoryId, tags: tagArr })
      .eq('id', id)
    if (error) {
      toast.error(`Failed to save mission: ${error.message}`)
      return
    }
    // Re-fetch to get updated category name
    const { data } = await supabase
      .from('missions')
      .select('id, text, active, tags, category_id, creator_name, categories(name)')
      .eq('id', id)
      .single()
    if (data) {
      setMissions((prev) => prev.map((m) => (m.id === id ? data : m)))
    }
    setEditing(null)
    toast.success('Mission saved')
  }

  async function addMission() {
    if (!newText.trim()) return
    const tagArr = newTags
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean)
    const { data, error } = await supabase
      .from('missions')
      .insert({
        text: newText.trim(),
        category_id: newCategory,
        tags: tagArr,
        active: true,
        creator_name: newCreatorName.trim() || null,
      })
      .select('id, text, active, tags, category_id, creator_name, categories(name)')
      .single()
    if (error) {
      toast.error(`Failed to add mission: ${error.message}`)
      return
    }
    if (data) {
      setMissions((prev) => [data, ...prev])
      setNewText('')
      setNewTags('')
      setNewCreatorName('')
      setShowAdd(false)
      toast.success('Mission created')
    }
  }

  async function addCategory() {
    if (!newCatName.trim()) return
    const { data, error } = await supabase
      .from('categories')
      .insert({ name: newCatName.trim(), description: newCatDesc.trim() || null })
      .select()
      .single()
    if (error) {
      toast.error(`Failed to create category: ${error.message}`)
      return
    }
    if (data) {
      setCategories((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
      setSelectedCategories((prev) => new Set([...prev, data.id]))
      setNewCatName('')
      setNewCatDesc('')
      setShowAddCategory(false)
      toast.success(`Category "${data.name}" created`)
    }
  }

  async function updateCategory(id, name, description) {
    const { error } = await supabase
      .from('categories')
      .update({ name: name.trim(), description: description?.trim() || null })
      .eq('id', id)
    if (error) {
      toast.error(`Failed to update category: ${error.message}`)
      return
    }
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, name: name.trim(), description: description?.trim() || null } : c))
        .sort((a, b) => a.name.localeCompare(b.name))
    )
    // Update mission category names in local state
    setMissions((prev) =>
      prev.map((m) =>
        m.category_id === id ? { ...m, categories: { name: name.trim() } } : m
      )
    )
    setEditingCategory(null)
    toast.success('Category updated')
  }

  async function deleteCategory(cat) {
    const missionCount = missions.filter((m) => m.category_id === cat.id).length
    const msg = missionCount > 0
      ? `Delete category "${cat.name}"?\n\n${missionCount} mission(s) in this category will have their category set to none.\n\nThis cannot be undone.`
      : `Delete category "${cat.name}"?\n\nThis cannot be undone.`
    if (!confirm(msg)) return

    const { error } = await supabase.from('categories').delete().eq('id', cat.id)
    if (error) {
      toast.error(`Failed to delete category: ${error.message}`)
      return
    }
    setCategories((prev) => prev.filter((c) => c.id !== cat.id))
    setSelectedCategories((prev) => {
      const next = new Set(prev)
      next.delete(cat.id)
      return next
    })
    // Missions with this category will now have category_id = null (ON DELETE SET NULL)
    setMissions((prev) =>
      prev.map((m) =>
        m.category_id === cat.id ? { ...m, category_id: null, categories: null } : m
      )
    )
    toast.success(`Category "${cat.name}" deleted`)
  }

  async function handleCsvUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setCsvStatus('Parsing...')

    const text = await file.text()
    const lines = text.split('\n').filter((l) => l.trim())

    // Skip header if present
    const startIndex = lines[0]?.toLowerCase().includes('text') ? 1 : 0

    const rows = []
    const errors = []
    const newCategories = new Set()
    let localCategories = [...categories]

    for (let i = startIndex; i < lines.length; i++) {
      const parts = parseCsvLine(lines[i])
      if (parts.length < 2) {
        errors.push(`Line ${i + 1}: not enough columns`)
        continue
      }

      const missionText = parts[0]?.trim()
      const categoryName = parts[1]?.trim()
      const tags = parts[2]
        ? parts[2]
            .split(',')
            .map((t) => t.trim().toLowerCase())
            .filter(Boolean)
        : []

      if (!missionText || !categoryName) {
        errors.push(`Line ${i + 1}: missing text or category`)
        continue
      }

      // Find category (check local list which may include newly created ones)
      let cat = localCategories.find(
        (c) => c.name.toLowerCase() === categoryName.toLowerCase()
      )

      // Auto-create category if it doesn't exist
      if (!cat) {
        const { data: newCat, error: catErr } = await supabase
          .from('categories')
          .insert({ name: categoryName.trim() })
          .select()
          .single()
        if (catErr) {
          errors.push(`Line ${i + 1}: failed to create category "${categoryName}" — ${catErr.message}`)
          continue
        }
        cat = newCat
        localCategories.push(newCat)
        newCategories.add(categoryName)
      }

      rows.push({
        text: missionText,
        category_id: cat.id,
        tags,
        active: true,
      })
    }

    // Update categories state if new ones were created
    if (newCategories.size > 0) {
      setCategories(localCategories.sort((a, b) => a.name.localeCompare(b.name)))
      setSelectedCategories((prev) => {
        const updated = new Set(prev)
        localCategories.forEach((c) => updated.add(c.id))
        return updated
      })
    }

    if (rows.length === 0) {
      const msg = `No valid rows found. ${errors.length} error(s).`
      setCsvStatus(msg)
      toast.warning(msg)
      return
    }

    // Check for duplicates
    const existingTexts = new Set(missions.map((m) => m.text.toLowerCase()))
    const dupes = rows.filter((r) => existingTexts.has(r.text.toLowerCase()))
    const unique = rows.filter((r) => !existingTexts.has(r.text.toLowerCase()))

    if (unique.length === 0) {
      const msg = `All ${rows.length} missions already exist.`
      setCsvStatus(msg)
      toast.info(msg)
      return
    }

    setCsvStatus(`Importing ${unique.length} missions...`)

    const { data, error } = await supabase
      .from('missions')
      .insert(unique)
      .select('id, text, active, tags, category_id, creator_name, categories(name)')

    if (error) {
      setCsvStatus(`Error: ${error.message}`)
      toast.error(`CSV import failed: ${error.message}`)
    } else {
      setMissions((prev) => [...(data || []), ...prev])
      const msg = [`Imported ${data?.length || 0} missions.`]
      if (newCategories.size > 0) msg.push(`Created ${newCategories.size} new category(s): ${[...newCategories].join(', ')}.`)
      if (dupes.length) msg.push(`${dupes.length} duplicates skipped.`)
      if (errors.length) msg.push(`${errors.length} row errors.`)
      const fullMsg = msg.join(' ')
      setCsvStatus(fullMsg)
      toast.success(fullMsg)
    }

    if (fileRef.current) fileRef.current.value = ''
  }

  function exportCsv() {
    const rows = [['text', 'category', 'tags']]
    const source = statusFilter === 'all' ? missions : filtered
    source.forEach((m) => {
      const text = `"${(m.text || '').replace(/"/g, '""')}"`
      const cat = `"${(m.categories?.name || '').replace(/"/g, '""')}"`
      const tags = `"${(m.tags || []).join(',')}"`
      rows.push([text, cat, tags])
    })
    const csv = rows.map((r) => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `party-quest-missions-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success(`Exported ${source.length} missions`)
  }

  function toggleCategory(catId) {
    setSelectedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(catId)) {
        next.delete(catId)
      } else {
        next.add(catId)
      }
      return next
    })
  }

  function toggleTag(tag) {
    setSelectedTags((prev) => {
      const next = new Set(prev)
      if (next.has(tag)) {
        next.delete(tag)
      } else {
        next.add(tag)
      }
      return next
    })
  }

  // Filter missions
  const filtered = missions.filter((m) => {
    if (statusFilter === 'active' && !m.active) return false
    if (statusFilter === 'inactive' && m.active) return false
    if (selectedCategories.size < categories.length && !selectedCategories.has(m.category_id)) return false
    if (selectedTags.size > 0 && !(m.tags || []).some((t) => selectedTags.has(t))) return false
    if (search && !m.text.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <span className="pq-spinner" />
        <span className="ml-3" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)' }}>
          Loading missions...
        </span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2
          className="text-2xl font-bold"
          style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}
        >
          Mission Library
        </h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => { setShowAddCategory(!showAddCategory); setShowAdd(false) }}
            className="pq-btn pq-btn-secondary"
          >
            + Category
          </button>
          <button
            onClick={() => { setShowAdd(!showAdd); setShowAddCategory(false) }}
            className="pq-btn pq-btn-primary"
          >
            + Mission
          </button>
          <label className="pq-btn pq-btn-secondary" style={{ cursor: 'pointer' }}>
            Upload CSV
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              onChange={handleCsvUpload}
              className="hidden"
            />
          </label>
          <button onClick={exportCsv} className="pq-btn pq-btn-secondary">
            Export CSV
          </button>
        </div>
      </div>

      {/* CSV status */}
      {csvStatus && (
        <div
          className="pq-card flex items-center justify-between"
          style={{
            backgroundColor: 'var(--color-primary-subtle)',
            borderColor: 'var(--color-primary-light)',
            color: 'var(--color-primary)',
          }}
        >
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.875rem' }}>{csvStatus}</span>
          <button
            onClick={() => setCsvStatus('')}
            className="pq-btn pq-btn-ghost"
            style={{ color: 'var(--color-primary)', padding: '0.25rem 0.5rem', fontSize: '1.25rem', lineHeight: 1 }}
          >
            &times;
          </button>
        </div>
      )}

      {/* Add category form */}
      {showAddCategory && (
        <div className="pq-card space-y-3">
          <h3
            className="text-sm font-semibold"
            style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-heading)' }}
          >
            New Category
          </h3>
          <input
            type="text"
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            placeholder="Category name"
            className="pq-input w-full"
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && addCategory()}
          />
          <input
            type="text"
            value={newCatDesc}
            onChange={(e) => setNewCatDesc(e.target.value)}
            placeholder="Description (optional)"
            className="pq-input w-full"
            onKeyDown={(e) => e.key === 'Enter' && addCategory()}
          />
          <div className="flex gap-2">
            <button onClick={addCategory} className="pq-btn pq-btn-primary">
              Create
            </button>
            <button onClick={() => setShowAddCategory(false)} className="pq-btn pq-btn-ghost">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Add mission form */}
      {showAdd && (
        <div className="pq-card space-y-3">
          <h3
            className="text-sm font-semibold"
            style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-heading)' }}
          >
            New Mission
          </h3>
          <textarea
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder="Mission text..."
            rows={2}
            className="pq-input w-full"
            style={{ resize: 'vertical' }}
            autoFocus
          />
          <div className="flex gap-3">
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="pq-input flex-1"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={newTags}
              onChange={(e) => setNewTags(e.target.value)}
              placeholder="Tags (comma-separated)"
              className="pq-input flex-1"
            />
          </div>
          <input
            type="text"
            value={newCreatorName}
            onChange={(e) => setNewCreatorName(e.target.value)}
            placeholder="Who's creating this mission? (optional)"
            className="pq-input w-full"
          />
          <div className="flex gap-2">
            <button onClick={addMission} className="pq-btn pq-btn-primary">
              Add
            </button>
            <button onClick={() => setShowAdd(false)} className="pq-btn pq-btn-ghost">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Category toggles with edit/delete */}
      <div className="pq-card space-y-3">
        <div className="flex items-center justify-between">
          <h3
            className="text-sm font-semibold"
            style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-heading)' }}
          >
            Categories
          </h3>
          <button
            onClick={() => {
              if (selectedCategories.size === categories.length) {
                setSelectedCategories(new Set())
              } else {
                setSelectedCategories(new Set(categories.map((c) => c.id)))
              }
            }}
            className="pq-btn pq-btn-ghost"
            style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', color: 'var(--color-primary)' }}
          >
            {selectedCategories.size === categories.length ? 'Deselect All' : 'Select All'}
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => {
            const isOn = selectedCategories.has(cat.id)
            const count = missions.filter((m) => m.category_id === cat.id).length
            return (
              <div key={cat.id} className="flex items-center gap-0.5">
                <button
                  onClick={() => toggleCategory(cat.id)}
                  className={isOn ? 'pq-badge pq-badge-primary' : 'pq-badge pq-badge-muted'}
                  style={{
                    cursor: 'pointer',
                    border: 'none',
                    fontSize: '0.8125rem',
                    fontFamily: 'var(--font-body)',
                    padding: '0.375rem 0.75rem',
                    transition: 'var(--transition-fast)',
                    opacity: isOn ? 1 : 0.6,
                  }}
                >
                  {cat.name} ({count})
                </button>
                <button
                  onClick={() => setEditingCategory(editingCategory === cat.id ? null : cat.id)}
                  title="Edit category"
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--color-text-muted)', fontSize: '0.75rem', padding: '0.25rem',
                  }}
                >
                  &#9998;
                </button>
                <button
                  onClick={() => deleteCategory(cat)}
                  title="Delete category"
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--color-danger, #dc2626)', fontSize: '0.75rem', padding: '0.25rem',
                  }}
                >
                  &times;
                </button>
              </div>
            )
          })}
        </div>

        {/* Inline category editor */}
        {editingCategory && (
          <CategoryEditor
            category={categories.find((c) => c.id === editingCategory)}
            onSave={updateCategory}
            onCancel={() => setEditingCategory(null)}
          />
        )}
      </div>

      {/* Tag toggles */}
      {allTags.length > 0 && (
        <div className="pq-card space-y-3">
          <div className="flex items-center justify-between">
            <h3
              className="text-sm font-semibold"
              style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-heading)' }}
            >
              Tags
            </h3>
            {selectedTags.size > 0 && (
              <button
                onClick={() => setSelectedTags(new Set())}
                className="pq-btn pq-btn-ghost"
                style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', color: 'var(--color-primary)' }}
              >
                Clear
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {allTags.map((tag) => {
              const isOn = selectedTags.has(tag)
              return (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={isOn ? 'pq-badge pq-badge-success' : 'pq-badge pq-badge-muted'}
                  style={{
                    cursor: 'pointer',
                    border: 'none',
                    fontFamily: 'var(--font-body)',
                    transition: 'var(--transition-fast)',
                    opacity: isOn ? 1 : 0.7,
                  }}
                >
                  {tag}
                </button>
              )
            })}
          </div>
          {selectedTags.size > 0 && (
            <p style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)', fontSize: '0.75rem' }}>
              Showing missions with any of: {[...selectedTags].join(', ')}
            </p>
          )}
        </div>
      )}

      {/* Search + status filter */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search missions..."
          className="pq-input w-64"
        />
        <div
          className="flex overflow-hidden"
          style={{ borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}
        >
          {['all', 'active', 'inactive'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className="px-3 py-2 text-xs font-medium capitalize"
              style={{
                transition: 'var(--transition-fast)',
                fontFamily: 'var(--font-body)',
                backgroundColor: statusFilter === s ? 'var(--color-primary)' : 'var(--color-surface)',
                color: statusFilter === s ? 'var(--color-text-inverse)' : 'var(--color-text-muted)',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Mission count */}
      <div style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)', fontSize: '0.875rem' }}>
        {filtered.length} mission{filtered.length !== 1 ? 's' : ''}
        {filtered.length !== missions.length && ` of ${missions.length} total`}
      </div>

      {/* Mission list */}
      <div className="space-y-2">
        {filtered.map((m) => (
          <MissionRow
            key={m.id}
            mission={m}
            categories={categories}
            editing={editing === m.id}
            onEdit={() => setEditing(m.id)}
            onSave={saveMission}
            onCancel={() => setEditing(null)}
            onToggle={() => toggleActive(m)}
            onDelete={() => deleteMission(m)}
          />
        ))}
      </div>
      {filtered.length === 0 && (
        <p
          className="text-center py-4"
          style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)', fontSize: '0.875rem' }}
        >
          No missions match your filters.
        </p>
      )}
    </div>
  )
}

function CategoryEditor({ category, onSave, onCancel }) {
  const [name, setName] = useState(category?.name || '')
  const [desc, setDesc] = useState(category?.description || '')

  if (!category) return null

  return (
    <div
      style={{
        borderTop: '1px solid var(--color-border-light)',
        paddingTop: '0.75rem',
        marginTop: '0.5rem',
      }}
      className="space-y-2"
    >
      <p className="text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>
        Edit: {category.name}
      </p>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Category name"
        className="pq-input w-full"
        autoFocus
        onKeyDown={(e) => e.key === 'Enter' && onSave(category.id, name, desc)}
      />
      <input
        type="text"
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
        placeholder="Description (optional)"
        className="pq-input w-full"
        onKeyDown={(e) => e.key === 'Enter' && onSave(category.id, name, desc)}
      />
      <div className="flex gap-2">
        <button onClick={() => onSave(category.id, name, desc)} className="pq-btn pq-btn-primary">
          Save
        </button>
        <button onClick={onCancel} className="pq-btn pq-btn-ghost">
          Cancel
        </button>
      </div>
    </div>
  )
}

function MissionRow({ mission, categories, editing, onEdit, onSave, onCancel, onToggle, onDelete }) {
  const [text, setText] = useState(mission.text)
  const [categoryId, setCategoryId] = useState(mission.category_id)
  const [tags, setTags] = useState((mission.tags || []).join(', '))

  if (editing) {
    return (
      <div
        className="pq-card space-y-2"
        style={{ borderColor: 'var(--color-primary-light)' }}
      >
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          className="pq-input w-full"
          style={{ resize: 'vertical' }}
        />
        <div className="flex gap-3">
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="pq-input flex-1"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="Tags (comma-separated)"
            className="pq-input flex-1"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onSave(mission.id, text, categoryId, tags)}
            className="pq-btn pq-btn-primary"
          >
            Save
          </button>
          <button onClick={onCancel} className="pq-btn pq-btn-ghost">
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className="pq-card-interactive flex items-start gap-3"
      style={{ opacity: mission.active ? 1 : 0.5 }}
    >
      <div className="flex-1 min-w-0">
        <p style={{ color: 'var(--color-text)', fontFamily: 'var(--font-body)', fontSize: '0.875rem' }}>
          {mission.text}
        </p>
        <div className="flex flex-wrap items-center gap-2 mt-1.5">
          {mission.categories?.name ? (
            <span className="pq-badge pq-badge-primary">{mission.categories.name}</span>
          ) : (
            <span className="pq-badge pq-badge-muted" style={{ fontStyle: 'italic' }}>No category</span>
          )}
          {mission.tags?.map((t) => (
            <span key={t} className="pq-badge pq-badge-muted">
              {t}
            </span>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button onClick={onEdit} className="pq-btn pq-btn-ghost" style={{ fontSize: '0.75rem' }}>
          Edit
        </button>
        <button
          onClick={onToggle}
          className={mission.active ? 'pq-btn pq-btn-secondary' : 'pq-btn pq-btn-primary'}
          style={{ fontSize: '0.75rem' }}
        >
          {mission.active ? 'Deactivate' : 'Activate'}
        </button>
        <button
          onClick={onDelete}
          className="pq-btn pq-btn-danger"
          style={{ fontSize: '0.75rem' }}
        >
          Delete
        </button>
      </div>
    </div>
  )
}

function parseCsvLine(line) {
  const result = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current)
  return result
}
