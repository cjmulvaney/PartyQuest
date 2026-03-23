/**
 * Seeds a test event with participants and assigned missions.
 * Run with: node scripts/seed-test-event.js
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

// Read .env manually since we're outside Vite
const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dirname, '..', '.env')
const envFile = readFileSync(envPath, 'utf-8')
const env = {}
envFile.split('\n').forEach((line) => {
  const [key, ...rest] = line.split('=')
  if (key && rest.length) env[key.trim()] = rest.join('=').trim()
})

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)

const EVENT_CODE = 'TEST01'
const PARTICIPANT_NAMES = ['Sarah', 'Jake', 'Mike', 'Taylor', 'Alex']
const MISSIONS_PER_PERSON = 3

async function seed() {
  console.log('🎉 Seeding test event...\n')

  // 1. Check if test event already exists
  const { data: existing } = await supabase
    .from('events')
    .select('id')
    .eq('event_code', EVENT_CODE)
    .single()

  if (existing) {
    console.log(`Event "${EVENT_CODE}" already exists (id: ${existing.id}). Delete it in Supabase if you want to re-seed.`)
    return
  }

  // 2. Create event (no organizer_id since we don't have auth yet)
  const now = new Date()
  const endTime = new Date(now.getTime() + 6 * 60 * 60 * 1000) // 6 hours from now

  const { data: event, error: eventErr } = await supabase
    .from('events')
    .insert({
      name: 'Test Party',
      event_type: 'house party',
      start_time: now.toISOString(),
      end_time: endTime.toISOString(),
      event_code: EVENT_CODE,
      status: 'active',
    })
    .select()
    .single()

  if (eventErr) {
    console.error('Failed to create event:', eventErr.message)
    return
  }

  console.log(`✅ Event created: "${event.name}" (code: ${EVENT_CODE})`)

  // 3. Create event config
  const { error: configErr } = await supabase.from('event_config').insert({
    event_id: event.id,
    mission_count: MISSIONS_PER_PERSON,
    unlock_type: 'all_at_once',
    tag_filters: [],
  })

  if (configErr) {
    console.error('Failed to create config:', configErr.message)
    return
  }

  console.log(`✅ Event config: ${MISSIONS_PER_PERSON} missions per person, all unlocked`)

  // 4. Get all active missions
  const { data: allMissions } = await supabase
    .from('missions')
    .select('id')
    .eq('active', true)

  if (!allMissions || allMissions.length === 0) {
    console.error('No missions found! Did you run seed.sql?')
    return
  }

  console.log(`📋 ${allMissions.length} missions available in the pool`)

  // 5. Create participants and assign missions
  const generateCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let code = ''
    for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)]
    return code
  }

  // Shuffle helper
  const shuffle = (arr) => {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[a[i], a[j]] = [a[j], a[i]]
    }
    return a
  }

  const shuffled = shuffle(allMissions)
  let missionIndex = 0

  console.log('\n👥 Participants:')

  for (const name of PARTICIPANT_NAMES) {
    const accessCode = generateCode()

    const { data: participant, error: partErr } = await supabase
      .from('participants')
      .insert({
        event_id: event.id,
        name,
        access_code: accessCode,
        joined_at: null, // they haven't "joined" yet
      })
      .select()
      .single()

    if (partErr) {
      console.error(`Failed to create ${name}:`, partErr.message)
      continue
    }

    // Assign missions
    const assigned = []
    for (let i = 0; i < MISSIONS_PER_PERSON; i++) {
      assigned.push({
        participant_id: participant.id,
        mission_id: shuffled[missionIndex % shuffled.length].id,
        unlock_time: null, // all unlocked
      })
      missionIndex++
    }

    await supabase.from('participant_missions').insert(assigned)

    console.log(`   ${name.padEnd(10)} → access code: ${accessCode}`)
  }

  console.log('\n🎯 Done! To test the app:')
  console.log(`   1. Go to http://localhost:5173`)
  console.log(`   2. Click "Join Event"`)
  console.log(`   3. Enter event code: ${EVENT_CODE}`)
  console.log(`   4. Enter any participant name above (e.g. "Sarah")`)
  console.log(`   5. You'll see their missions and can mark them complete!`)
  console.log(`\n   Or use "Spectator View" with code ${EVENT_CODE} to see the leaderboard.`)
}

seed().catch(console.error)
