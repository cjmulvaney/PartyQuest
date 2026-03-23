import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase.js'

export default function MissionsPage() {
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
  const [newCatName, setNewCatName] = useState('')
  const [newCatDesc, setNewCatDesc] = useState('')
  const [csvStatus, setCsvStatus] = useState('')
  const fileRef = useRef(null)

  // New mission form state
  const [newText, setNewText] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [newTags, setNewTags] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const [{ data: m }, { data: c }] = await Promise.all([
      supabase
        .from('missions')
        .select('id, text, active, tags, category_id, categories(name)')
        .order('created_at', { ascending: false }),
      supabase.from('categories').select('id, name, description').order('name'),
    ])
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
    await supabase
      .from('missions')
      .update({ active: !mission.active })
      .eq('id', mission.id)
    setMissions((prev) =>
      prev.map((m) => (m.id === mission.id ? { ...m, active: !m.active } : m))
    )
  }

  async function saveMission(id, text, categoryId, tags) {
    const tagArr = tags
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean)
    await supabase
      .from('missions')
      .update({ text, category_id: categoryId, tags: tagArr })
      .eq('id', id)
    // Re-fetch to get updated category name
    const { data } = await supabase
      .from('missions')
      .select('id, text, active, tags, category_id, categories(name)')
      .eq('id', id)
      .single()
    if (data) {
      setMissions((prev) => prev.map((m) => (m.id === id ? data : m)))
    }
    setEditing(null)
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
      })
      .select('id, text, active, tags, category_id, categories(name)')
      .single()
    if (!error && data) {
      setMissions((prev) => [data, ...prev])
      setNewText('')
      setNewTags('')
      setShowAdd(false)
    }
  }

  async function addCategory() {
    if (!newCatName.trim()) return
    const { data, error } = await supabase
      .from('categories')
      .insert({ name: newCatName.trim(), description: newCatDesc.trim() || null })
      .select()
      .single()
    if (!error && data) {
      setCategories((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
      setSelectedCategories((prev) => new Set([...prev, data.id]))
      setNewCatName('')
      setNewCatDesc('')
      setShowAddCategory(false)
    }
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
          errors.push(`Line ${i + 1}: failed to create category "${categoryName}"`)
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
      setCsvStatus(`No valid rows found. ${errors.length} error(s).`)
      return
    }

    // Check for duplicates
    const existingTexts = new Set(missions.map((m) => m.text.toLowerCase()))
    const dupes = rows.filter((r) => existingTexts.has(r.text.toLowerCase()))
    const unique = rows.filter((r) => !existingTexts.has(r.text.toLowerCase()))

    if (unique.length === 0) {
      setCsvStatus(`All ${rows.length} missions already exist.`)
      return
    }

    setCsvStatus(`Importing ${unique.length} missions...`)

    const { data, error } = await supabase
      .from('missions')
      .insert(unique)
      .select('id, text, active, tags, category_id, categories(name)')

    if (error) {
      setCsvStatus(`Error: ${error.message}`)
    } else {
      setMissions((prev) => [...(data || []), ...prev])
      const msg = [`Imported ${data?.length || 0} missions.`]
      if (newCategories.size > 0) msg.push(`Created ${newCategories.size} new category(s): ${[...newCategories].join(', ')}.`)
      if (dupes.length) msg.push(`${dupes.length} duplicates skipped.`)
      if (errors.length) msg.push(`${errors.length} row errors.`)
      setCsvStatus(msg.join(' '))
    }

    if (fileRef.current) fileRef.current.value = ''
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

  if (loading) return <p className="text-stone-500">Loading missions...</p>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-stone-800">Mission Library</h2>
        <div className="flex gap-2">
          <button
            onClick={() => { setShowAddCategory(!showAddCategory); setShowAdd(false) }}
            className="px-4 py-2 rounded-lg border border-stone-300 text-stone-600 text-sm font-medium hover:bg-stone-50"
          >
            + Category
          </button>
          <button
            onClick={() => { setShowAdd(!showAdd); setShowAddCategory(false) }}
            className="px-4 py-2 rounded-lg bg-emerald-700 text-white text-sm font-medium hover:bg-emerald-800"
          >
            + Mission
          </button>
          <label className="px-4 py-2 rounded-lg border border-stone-300 text-stone-600 text-sm font-medium hover:bg-stone-50 cursor-pointer">
            Upload CSV
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              onChange={handleCsvUpload}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* CSV status */}
      {csvStatus && (
        <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-700">
          {csvStatus}
          <button
            onClick={() => setCsvStatus('')}
            className="ml-2 text-blue-500 hover:text-blue-700"
          >
            &times;
          </button>
        </div>
      )}

      {/* Add category form */}
      {showAddCategory && (
        <div className="rounded-xl bg-white border border-stone-200 p-4 space-y-3">
          <h3 className="text-sm font-semibold text-stone-700">New Category</h3>
          <input
            type="text"
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            placeholder="Category name"
            className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            autoFocus
          />
          <input
            type="text"
            value={newCatDesc}
            onChange={(e) => setNewCatDesc(e.target.value)}
            placeholder="Description (optional)"
            className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-600"
          />
          <div className="flex gap-2">
            <button
              onClick={addCategory}
              className="px-4 py-2 rounded-lg bg-emerald-700 text-white text-sm font-medium hover:bg-emerald-800"
            >
              Create
            </button>
            <button
              onClick={() => setShowAddCategory(false)}
              className="px-4 py-2 rounded-lg text-stone-500 text-sm hover:bg-stone-100"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Add mission form */}
      {showAdd && (
        <div className="rounded-xl bg-white border border-stone-200 p-4 space-y-3">
          <textarea
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder="Mission text..."
            rows={2}
            className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            autoFocus
          />
          <div className="flex gap-3">
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg border border-stone-300 text-sm text-stone-800"
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
              className="flex-1 px-3 py-2 rounded-lg border border-stone-300 text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={addMission}
              className="px-4 py-2 rounded-lg bg-emerald-700 text-white text-sm font-medium hover:bg-emerald-800"
            >
              Add
            </button>
            <button
              onClick={() => setShowAdd(false)}
              className="px-4 py-2 rounded-lg text-stone-500 text-sm hover:bg-stone-100"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Category toggles */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-stone-600">Categories</h3>
          <button
            onClick={() => {
              if (selectedCategories.size === categories.length) {
                setSelectedCategories(new Set())
              } else {
                setSelectedCategories(new Set(categories.map((c) => c.id)))
              }
            }}
            className="text-xs text-emerald-700 hover:underline"
          >
            {selectedCategories.size === categories.length ? 'Deselect All' : 'Select All'}
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => {
            const isOn = selectedCategories.has(cat.id)
            const count = missions.filter((m) => m.category_id === cat.id).length
            return (
              <button
                key={cat.id}
                onClick={() => toggleCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isOn
                    ? 'bg-emerald-700 text-white'
                    : 'bg-white border border-stone-300 text-stone-400'
                }`}
              >
                {cat.name} ({count})
              </button>
            )
          })}
        </div>
      </div>

      {/* Tag toggles */}
      {allTags.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-stone-600">Tags</h3>
            {selectedTags.size > 0 && (
              <button
                onClick={() => setSelectedTags(new Set())}
                className="text-xs text-emerald-700 hover:underline"
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
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    isOn
                      ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                      : 'bg-stone-100 text-stone-500 border border-transparent hover:bg-stone-200'
                  }`}
                >
                  {tag}
                </button>
              )
            })}
          </div>
          {selectedTags.size > 0 && (
            <p className="text-xs text-stone-400">
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
          className="px-3 py-2 rounded-lg border border-stone-300 text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 w-64"
        />
        <div className="flex rounded-lg border border-stone-300 overflow-hidden">
          {['all', 'active', 'inactive'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 text-xs font-medium capitalize transition-colors ${
                statusFilter === s
                  ? 'bg-emerald-700 text-white'
                  : 'bg-white text-stone-500 hover:bg-stone-50'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Mission list */}
      <div className="text-sm text-stone-400">
        {filtered.length} mission{filtered.length !== 1 ? 's' : ''}
        {filtered.length !== missions.length && ` of ${missions.length} total`}
      </div>
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
          />
        ))}
      </div>
      {filtered.length === 0 && (
        <p className="text-stone-400 text-sm text-center py-4">
          No missions match your filters.
        </p>
      )}
    </div>
  )
}

function MissionRow({ mission, categories, editing, onEdit, onSave, onCancel, onToggle }) {
  const [text, setText] = useState(mission.text)
  const [categoryId, setCategoryId] = useState(mission.category_id)
  const [tags, setTags] = useState((mission.tags || []).join(', '))

  if (editing) {
    return (
      <div className="rounded-xl bg-white border border-emerald-300 p-4 space-y-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-600"
        />
        <div className="flex gap-3">
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="flex-1 px-3 py-2 rounded-lg border border-stone-300 text-sm text-stone-800"
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
            className="flex-1 px-3 py-2 rounded-lg border border-stone-300 text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-600"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onSave(mission.id, text, categoryId, tags)}
            className="px-3 py-1.5 rounded-lg bg-emerald-700 text-white text-sm font-medium hover:bg-emerald-800"
          >
            Save
          </button>
          <button
            onClick={onCancel}
            className="px-3 py-1.5 rounded-lg text-stone-500 text-sm hover:bg-stone-100"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`rounded-xl bg-white border p-4 flex items-start gap-3 ${
        mission.active ? 'border-stone-200' : 'border-stone-200 opacity-50'
      }`}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm text-stone-800">{mission.text}</p>
        <div className="flex flex-wrap items-center gap-2 mt-1.5">
          <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
            {mission.categories?.name}
          </span>
          {mission.tags?.map((t) => (
            <span
              key={t}
              className="text-xs bg-stone-100 text-stone-500 px-1.5 py-0.5 rounded"
            >
              {t}
            </span>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onEdit}
          className="text-stone-400 text-xs hover:text-stone-600"
        >
          Edit
        </button>
        <button
          onClick={onToggle}
          className={`text-xs px-2 py-1 rounded-lg font-medium ${
            mission.active
              ? 'text-red-600 hover:bg-red-50'
              : 'text-emerald-600 hover:bg-emerald-50'
          }`}
        >
          {mission.active ? 'Deactivate' : 'Activate'}
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
