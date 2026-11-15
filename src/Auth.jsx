import { useState } from 'react'
import { supabase } from './lib/supabase'
import { ShoppingBag, Mail, Lock, ArrowRight } from 'lucide-react'
import './Auth.css'

export default function Auth() {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const atIndex = email.indexOf('@')
  const usernamePart = atIndex !== -1 ? email.slice(0, atIndex).trim() : ''
  const suggestedEmail =
    usernamePart && !email.toLowerCase().endsWith('@mahindrauniversity.edu.in')
      ? `${usernamePart}@mahindrauniversity.edu.in`
      : ''

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    const cleanEmail = email.trim().toLowerCase()

    try {
      if (mode === 'signup') {
        if (!cleanEmail.endsWith('@mahindrauniversity.edu.in')) {
          throw new Error('Please use your @mahindrauniversity.edu.in email address to register.')
        }

        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password
        })

        if (error) throw error

        if (data.session) {
          setMessage('Account created successfully!')
        } else {
          setMessage('Account created! Please verify your email before logging in.')
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password
        })

        if (error) throw error
      }
    } catch (error) {
      setMessage(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <ShoppingBag size={25} />
        </div>

        <h1>Snack<span>Zone</span></h1>

        <p className="auth-subtitle">
          {mode === 'login'
            ? 'Welcome back! Log in to order your favourite snacks.'
            : 'Create your account using your Mahindra University email.'}
        </p>

        <form onSubmit={handleSubmit}>
          <label>University email address</label>
          <div className="auth-input">
            <Mail size={18} />
            <input
              type="email"
              list="university-email-suggestions"
              placeholder="name@mahindrauniversity.edu.in"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
            <datalist id="university-email-suggestions">
              {suggestedEmail && <option value={suggestedEmail} />}
            </datalist>
          </div>

          <label>Password</label>
          <div className="auth-input">
            <Lock size={18} />
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              minLength={8}
              required
            />
          </div>

          {message && (
            <div className="auth-message" role="status">
              {message}
            </div>
          )}

          <button className="auth-submit" disabled={loading}>
            {loading
              ? 'Please wait...'
              : mode === 'login'
                ? 'Login'
                : 'Create account'}
            <ArrowRight size={18} />
          </button>
        </form>

        <div className="auth-switch">
          {mode === 'login'
            ? "Don't have an account?"
            : 'Already have an account?'}

          <button
            type="button"
            onClick={() => {
              setMode(mode === 'login' ? 'signup' : 'login')
              setMessage('')
            }}
          >
            {mode === 'login' ? 'Register' : 'Login'}
          </button>
        </div>
      </div>
    </div>
  )
}