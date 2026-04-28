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
    const { eventId, message } = await req.json()

    if (!eventId || !message?.trim()) {
      return new Response(JSON.stringify({ ok: false, error: 'eventId and message are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (message.trim().length > 320) {
      return new Response(JSON.stringify({ ok: false, error: 'Message too long (320 char max)' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const twilioSid = Deno.env.get('TWILIO_ACCOUNT_SID')
    const twilioToken = Deno.env.get('TWILIO_AUTH_TOKEN')
    const twilioPhone = Deno.env.get('TWILIO_PHONE_NUMBER')

    if (!twilioSid || !twilioToken || !twilioPhone) {
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

    // All active participants with phone numbers — no sms_sent_at filter (this is a freeform blast)
    const { data: participants } = await supabase
      .from('participants')
      .select('id, name, phone')
      .eq('event_id', eventId)
      .eq('is_active', true)
      .not('phone', 'is', null)

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
              Body: `${message.trim()}\nReply STOP to opt out.`,
            }),
          })

          if (res.ok) {
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

    return new Response(JSON.stringify({ ok: true, sent, failed, failedNames }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('send-custom-sms error:', err)
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
