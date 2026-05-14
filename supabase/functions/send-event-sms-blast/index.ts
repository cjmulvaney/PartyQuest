import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { eventId, scenario } = await req.json()

    if (!eventId || !['event_started', 'reminder'].includes(scenario)) {
      return new Response(JSON.stringify({ ok: false, error: 'Invalid input' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Twilio credentials
    const twilioSid = Deno.env.get('TWILIO_ACCOUNT_SID')
    const twilioToken = Deno.env.get('TWILIO_AUTH_TOKEN')
    const twilioPhone = Deno.env.get('TWILIO_PHONE_NUMBER')

    if (!twilioSid || !twilioToken || !twilioPhone) {
      console.error('Missing Twilio credentials')
      return new Response(JSON.stringify({ ok: false, error: 'SMS service not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    // Validate caller is the event organizer (for non-cron calls)
    const authHeader = req.headers.get('Authorization')
    if (authHeader && !authHeader.includes(serviceRoleKey)) {
      const { data: { user }, error: authError } = await supabase.auth.getUser(
        authHeader.replace('Bearer ', '')
      )

      if (authError || !user) {
        return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const { data: eventData } = await supabase
        .from('events')
        .select('organizer_id')
        .eq('id', eventId)
        .single()

      if (!eventData || eventData.organizer_id !== user.id) {
        return new Response(JSON.stringify({ ok: false, error: 'Not the event organizer' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    // Get event details
    const { data: event } = await supabase
      .from('events')
      .select('id, name, event_code, organizer_id')
      .eq('id', eventId)
      .single()

    if (!event) {
      return new Response(JSON.stringify({ ok: false, error: 'Event not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get organizer name
    const { data: organizer } = await supabase.auth.admin.getUserById(event.organizer_id)
    const organizerName = organizer?.user?.user_metadata?.full_name
      || organizer?.user?.email?.split('@')[0]
      || 'Your host'

    // Reminder uses reminder_sent_at so participants who already got a registration
    // confirmation (sms_sent_at set) still receive the 15-minute heads-up.
    const sentAtField = scenario === 'reminder' ? 'reminder_sent_at' : 'sms_sent_at'
    const { data: participants } = await supabase
      .from('participants')
      .select('id, name, access_code, phone, sms_sent_at, reminder_sent_at')
      .eq('event_id', eventId)
      .eq('is_active', true)
      .not('phone', 'is', null)
      .is(sentAtField, null)

    if (!participants || participants.length === 0) {
      return new Response(JSON.stringify({ ok: true, sent: 0, failed: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`
    const twilioAuth = btoa(`${twilioSid}:${twilioToken}`)

    let sent = 0
    let failed = 0
    const failedNames: string[] = []

    const results = await Promise.all(
      participants.map(async (p) => {
        const playUrl = `https://partyquest.connormulvaney.com/play/${p.access_code}`

        let messageBody: string
        if (scenario === 'reminder') {
          messageBody = [
            `Party Quest: ${event.name} starts in 15 minutes!`,
            '',
            `Hosted by: ${organizerName}`,
            `Event Code: ${event.event_code}`,
            `Your Access Code: ${p.access_code}`,
            `Play: ${playUrl}`,
            `Reply STOP to opt out.`,
          ].join('\n')
        } else {
          messageBody = [
            `Party Quest: ${event.name} is live!`,
            '',
            `Hosted by: ${organizerName}`,
            `Event Code: ${event.event_code}`,
            `Your Access Code: ${p.access_code}`,
            `Play: ${playUrl}`,
            '',
            `Start your missions now!`,
            `Reply STOP to opt out.`,
          ].join('\n')
        }

        try {
          const res = await fetch(twilioUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${twilioAuth}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              To: p.phone,
              From: twilioPhone,
              Body: messageBody,
            }),
          })

          if (res.ok) {
            // Mark as sent ONLY after Twilio confirms delivery
            await supabase
              .from('participants')
              .update({ [sentAtField]: new Date().toISOString() })
              .eq('id', p.id)
            return { status: 'sent' }
          } else {
            const err = await res.text()
            console.error(`Failed to send to ${p.id}:`, err)
            return { status: 'failed', name: p.name }
          }
        } catch (err) {
          console.error(`Error sending to ${p.id}:`, err)
          return { status: 'failed', name: p.name }
        }
      })
    )

    results.forEach((r) => {
      if (r.status === 'sent') sent++
      else {
        failed++
        if (r.name) failedNames.push(r.name)
      }
    })

    // Mark reminder rows as sent
    if (scenario === 'reminder' && sent > 0) {
      await supabase
        .from('sms_reminders')
        .update({ sent: true })
        .eq('event_id', eventId)
        .eq('sent', false)
    }

    return new Response(JSON.stringify({ ok: true, sent, failed, failedNames }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('send-event-sms-blast error:', err)
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
