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
    const { participantId, phone, name, accessCode, eventName, eventCode, organizerName, scenario } = await req.json()

    if (scenario !== 'self_register') {
      return new Response(JSON.stringify({ ok: false, error: 'Invalid scenario' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Validate E.164 phone
    if (!phone || !/^\+[1-9]\d{1,14}$/.test(phone)) {
      return new Response(JSON.stringify({ ok: false, error: 'Invalid phone number' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get Twilio credentials from environment (set via Supabase Vault / Edge Function secrets)
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

    const playUrl = `https://partyquest.connormulvaney.com/play/${accessCode}`

    const messageBody = [
      `Party Quest: You're in, ${name}!`,
      '',
      `Event: ${eventName}`,
      organizerName ? `Hosted by: ${organizerName}` : null,
      `Event Code: ${eventCode}`,
      `Your Access Code: ${accessCode}`,
      '',
      `Play now: ${playUrl}`,
      '',
      `Save this link — you'll need it to rejoin.`,
      `Reply STOP to opt out.`,
    ].filter(Boolean).join('\n')

    // Send via Twilio REST API
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`
    const twilioAuth = btoa(`${twilioSid}:${twilioToken}`)

    const twilioRes = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${twilioAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: phone,
        From: twilioPhone,
        Body: messageBody,
      }),
    })

    if (!twilioRes.ok) {
      const err = await twilioRes.text()
      console.error('Twilio error:', err)
      return new Response(JSON.stringify({ ok: false, error: 'Failed to send SMS' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Update sms_sent_at on the participant record
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    await supabase
      .from('participants')
      .update({ sms_sent_at: new Date().toISOString() })
      .eq('id', participantId)

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('send-participant-sms error:', err)
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
