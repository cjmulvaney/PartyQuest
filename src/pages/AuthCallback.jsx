import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'

export default function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    const redirect = sessionStorage.getItem('pq_auth_redirect') || '/organizer'
    sessionStorage.removeItem('pq_auth_redirect')

    // Subscription + timeout live at effect scope so the cleanup actually
    // runs on unmount (returning them from inside .then() leaks both)
    let subscription = null
    let timeout = null

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        sessionStorage.removeItem('pq_signed_out')
        navigate(redirect, { replace: true })
        return
      }

      // Wait for the auth state change from the URL hash
      ;({ data: { subscription } } = supabase.auth.onAuthStateChange(
        (event, session) => {
          if (event === 'SIGNED_IN' && session) {
            sessionStorage.removeItem('pq_signed_out')
            clearTimeout(timeout)
            navigate(redirect, { replace: true })
          }
        }
      ))

      // Timeout fallback — if no auth event after 5s, redirect home
      timeout = setTimeout(() => {
        navigate('/', { replace: true })
      }, 5000)
    })

    return () => {
      subscription?.unsubscribe()
      clearTimeout(timeout)
    }
  }, [navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-100">
      <div className="text-center space-y-3">
        <div className="w-8 h-8 border-3 border-emerald-700 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-stone-500">Signing you in...</p>
      </div>
    </div>
  )
}
