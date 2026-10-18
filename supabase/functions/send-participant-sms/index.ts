import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Called anonymously from Register right after self-registration. verify_jwt is
// off because the client uses a publishable (non-JWT) key, so this function does
// its own authorization: the caller must present a participant id + matching
// access code, and every message field is read from the database, never the request.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const RECENT_REGISTRATION_MINUTES = 15
const MAX_SMS_PER_EVENT_PER_HOUR = 100
const MAX_SMS_GLOBAL_PER_HOUR = 200
const DEMO_EVENT_CODE = 'DEMO01'

// US/Canada only — international SMS is the expensive toll-fraud vector
const ALLOWED_PHONE = /^\+1\d{10}$/
// Letters, spaces, apostrophes, hyphens only, so a "name" can't carry a URL
const SAFE_NAME = /^[\p{L}\p{M}' -]{1,30}$/u

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { participantId, accessCode } = await req.json()

    if (typeof participantId !== 'string' || typeof accessCode !== 'string') {
      return json({ ok: false, error: 'participantId and accessCode are required' }, 400)
    }

    const twilioSid = Deno.env.get('TWILIO_ACCOUNT_SID')
    const twilioToken = Deno.env.get('TWILIO_AUTH_TOKEN')
    const twilioPhone = Deno.env.get('TWILIO_PHONE_NUMBER')

    if (!twilioSid || !twilioToken || !twilioPhone) {
      console.error('Missing Twilio credentials')
      return json({ ok: false, error: 'SMS service not configured' }, 500)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    // The access code is the caller's proof of identity
    const { data: participant } = await supabase
      .from('participants')
      .select('id, name, phone, access_code, event_id, source, joined_at, is_active')
      .eq('id', participantId)
      .eq('access_code', accessCode.trim().toUpperCase())
      .eq('is_active', true)
      .maybeSingle()

    if (!participant) {
      return json({ ok: false, error: 'Participant not found' }, 404)
    }

    if (participant.source !== 'self') {
      return json({ ok: false, error: 'Not a self-registered participant' }, 403)
    }

    const registeredAt = participant.joined_at ? new Date(participant.joined_at).getTime() : 0
    if (Date.now() - registeredAt > RECENT_REGISTRATION_MINUTES * 60 * 1000) {
      return json({ ok: false, error: 'Registration SMS window has passed' }, 403)
    }

    if (!participant.phone || !ALLOWED_PHONE.test(participant.phone)) {
      return json({ ok: false, error: 'No supported phone number on file' }, 400)
    }

    const { data: event } = await supabase
      .from('events')
      .select('id, name, event_code, status')
      .eq('id', participant.event_id)
      .single()

    if (!event || !['upcoming', 'active'].includes(event.status)) {
      return json({ ok: false, error: 'Event is not open' }, 403)
    }

    if (event.event_code === DEMO_EVENT_CODE) {
      return json({ ok: false, error: 'SMS disabled for the demo event' }, 403)
    }

    // Volume caps bound the worst-case Twilio spend if this endpoint is scripted
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

    const { count: eventCount } = await supabase
      .from('participants')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', event.id)
      .gte('sms_sent_at', hourAgo)

    if ((eventCount ?? 0) >= MAX_SMS_PER_EVENT_PER_HOUR) {
      console.error(`Per-event SMS cap hit for event ${event.id}`)
      return json({ ok: false, error: 'SMS limit reached for this event' }, 429)
    }

    const { count: globalCount } = await supabase
      .from('participants')
      .select('id', { count: 'exact', head: true })
      .gte('sms_sent_at', hourAgo)

    if ((globalCount ?? 0) >= MAX_SMS_GLOBAL_PER_HOUR) {
      console.error('Global SMS cap hit')
      return json({ ok: false, error: 'SMS temporarily unavailable' }, 429)
    }

    // Atomically claim the send so concurrent calls can't double-text
    const { data: claimed } = await supabase
      .from('participants')
      .update({ sms_sent_at: new Date().toISOString() })
      .eq('id', participant.id)
      .is('sms_sent_at', null)
      .select('id')

    if (!claimed || claimed.length === 0) {
      return json({ ok: false, error: 'SMS already sent' }, 409)
    }

    const greeting = SAFE_NAME.test(participant.name.trim())
      ? `Party Quest: You're in, ${participant.name.trim()}!`
      : `Party Quest: You're in!`
    const eventName = event.name.length > 60 ? `${event.name.slice(0, 57)}...` : event.name
    const playUrl = `https://partyquest.connormulvaney.com/play/${participant.access_code}`

    const messageBody = [
      greeting,
      '',
      `Event: ${eventName}`,
      `Event Code: ${event.event_code}`,
      `Your Access Code: ${participant.access_code}`,
      '',
      `Play now: ${playUrl}`,
      '',
      `Save this link — you'll need it to rejoin.`,
      `Reply STOP to opt out.`,
    ].join('\n')

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`
    const twilioAuth = btoa(`${twilioSid}:${twilioToken}`)

    const twilioRes = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${twilioAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: participant.phone,
        From: twilioPhone,
        Body: messageBody,
      }),
    })

    if (!twilioRes.ok) {
      const err = await twilioRes.text()
      console.error('Twilio error:', err)
      // Release the claim so a retry can send
      await supabase
        .from('participants')
        .update({ sms_sent_at: null })
        .eq('id', participant.id)
      return json({ ok: false, error: 'Failed to send SMS' }, 500)
    }

    return json({ ok: true })
  } catch (err) {
    console.error('send-participant-sms error:', err)
    return json({ ok: false, error: 'Unexpected error' }, 500)
  }
})
