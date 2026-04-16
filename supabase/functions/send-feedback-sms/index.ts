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
    const { eventId } = await req.json()

    if (!eventId) {
      return new Response(JSON.stringify({ ok: false, error: 'eventId required' }), {
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

    // Validate caller is the event organizer
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

      const { data: eventCheck } = await supabase
        .from('events')
        .select('organizer_id')
        .eq('id', eventId)
        .single()

      if (!eventCheck || eventCheck.organizer_id !== user.id) {
        return new Response(JSON.stringify({ ok: false, error: 'Not the event organizer' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    // Get event — check feedback_sent_at is null (idempotency gate)
    const { data: event } = await supabase
      .from('events')
      .select('id, name, event_code, feedback_sent_at')
      .eq('id', eventId)
      .single()

    if (!event) {
      return new Response(JSON.stringify({ ok: false, error: 'Event not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (event.feedback_sent_at) {
      return new Response(JSON.stringify({ ok: false, error: 'Feedback SMS already sent' }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get active participants with phone numbers
    const { data: participants } = await supabase
      .from('participants')
      .select('id, name, access_code, phone')
      .eq('event_id', eventId)
      .eq('is_active', true)
      .not('phone', 'is', null)

    // Always mark feedback_sent_at so the button changes state even with 0 phone participants
    if (!participants || participants.length === 0) {
      await supabase
        .from('events')
        .update({ feedback_sent_at: new Date().toISOString() })
        .eq('id', eventId)
      return new Response(JSON.stringify({ ok: true, sent: 0, failed: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`
    const twilioAuth = btoa(`${twilioSid}:${twilioToken}`)

    let sent = 0
    let failed = 0
    const sentPhones: string[] = []

    const results = await Promise.all(
      participants.map(async (p) => {
        const feedbackUrl = `https://party-quest-six.vercel.app/feedback/${p.access_code}`
        const messageBody = [
          `Party Quest: ${event.name} has ended!`,
          '',
          `Thanks for playing, ${p.name}! 🎉 Got 30 seconds?`,
          `Tell us how it went:`,
          feedbackUrl,
          '',
          `Reply STOP to opt out.`,
        ].join('\n')

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
            return { status: 'sent', phone: p.phone as string }
          } else {
            const err = await res.text()
            console.error(`Failed to send to ${p.id}:`, err)
            return { status: 'failed', phone: null }
          }
        } catch (err) {
          console.error(`Error sending to ${p.id}:`, err)
          return { status: 'failed', phone: null }
        }
      })
    )

    results.forEach((r) => {
      if (r.status === 'sent') {
        sent++
        if (r.phone) sentPhones.push(r.phone)
      } else {
        failed++
      }
    })

    // Mark feedback_sent_at on the event
    await supabase
      .from('events')
      .update({ feedback_sent_at: new Date().toISOString() })
      .eq('id', eventId)

    // SHA-256 hash each sent phone → upsert into known_players
    for (const phone of sentPhones) {
      const normalized = phone.replace(/\D/g, '')
      const encoded = new TextEncoder().encode(normalized)
      const hashBuffer = await crypto.subtle.digest('SHA-256', encoded)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      const phoneHash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')

      await supabase.rpc('rpc_increment_known_player', { p_phone_hash: phoneHash })
    }

    return new Response(JSON.stringify({ ok: true, sent, failed }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('send-feedback-sms error:', err)
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
