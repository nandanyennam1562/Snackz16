import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { ShoppingBag, Mail, Lock, ArrowRight, ArrowLeft } from 'lucide-react'
import './Auth.css'

export default function Auth({ isRecoveryMode = false, onFinishRecovery }) {
  // 'login' | 'signup' | 'forgot-email' | 'set-password'
  const [mode, setMode] = useState(isRecoveryMode ? 'set-password' : 'login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (isRecoveryMode) {
      setMode('set-password')
      setMessage('Enter your new password below.')
    }
  }, [isRecoveryMode])

  const atIndex = email.indexOf('@')
  const usernamePart = atIndex !== -1 ? email.slice(0, atIndex).trim() : ''
  const suggestedEmail =
    usernamePart && !email.toLowerCase().endsWith('@mahindrauniversity.edu.in')
      ? `${usernamePart}@mahindrauniversity.edu.in`
      : ''

  async function handleAuthSubmit(e) {
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

  async function handleSendResetLink(e) {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    const cleanEmail = email.trim().toLowerCase()

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: window.location.origin
      })
      if (error) throw error
      setMessage('Password reset link sent! Check your email and click the link to set a new password.')
    } catch (error) {
      setMessage(error.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleUpdatePassword(e) {
    e.preventDefault()
    setMessage('')

    if (newPassword.length < 8) {
      setMessage('Password must be at least 8 characters long.')
      return
    }

    if (newPassword !== confirmPassword) {
      setMessage('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })
      if (error) throw error

      setNewPassword('')
      setConfirmPassword('')
      if (onFinishRecovery) {
        onFinishRecovery()
      } else {
        setMode('login')
        setMessage('Password updated! You can now log in.')
      }
    } catch (error) {
      setMessage(error.message)
    } finally {
      setLoading(false)
    }
  }

  function getSubtitle() {
    if (mode === 'signup') {
      return 'Create your account using your Mahindra University email.'
    }
    if (mode === 'forgot-email') {
      return 'Enter your registered email and we will send you a password reset link.'
    }
    if (mode === 'set-password') {
      return 'Choose a new password for your SnackZone account.'
    }
    return 'Welcome back! Log in to order your favourite snacks.'
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <ShoppingBag size={25} />
        </div>

        <h1>Snack<span>Zone</span></h1>

        <p className="auth-subtitle">{getSubtitle()}</p>

        {(mode === 'login' || mode === 'signup') && (
          <form onSubmit={handleAuthSubmit}>
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

            {mode === 'login' && (
              <div className="forgot-row">
                <button
                  type="button"
                  className="forgot-link"
                  onClick={() => {
                    setMode('forgot-email')
                    setMessage('')
                  }}
                >
                  Forgot password?
                </button>
              </div>
            )}

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
        )}

        {mode === 'forgot-email' && (
          <form onSubmit={handleSendResetLink}>
            <label>Registered university email</label>
            <div className="auth-input">
              <Mail size={18} />
              <input
                type="email"
                placeholder="name@mahindrauniversity.edu.in"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>

            {message && (
              <div className="auth-message" role="status">
                {message}
              </div>
            )}

            <button className="auth-submit" disabled={loading}>
              {loading ? 'Sending link...' : 'Send Reset Link'}
              <ArrowRight size={18} />
            </button>

            <button
              type="button"
              className="auth-back-button"
              onClick={() => {
                setMode('login')
                setMessage('')
              }}
            >
              <ArrowLeft size={16} />
              Back to Login
            </button>
          </form>
        )}

        {mode === 'set-password' && (
          <form onSubmit={handleUpdatePassword}>
            <label>New password</label>
            <div className="auth-input">
              <Lock size={18} />
              <input
                type="password"
                placeholder="At least 8 characters"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                minLength={8}
                required
              />
            </div>

            <label>Confirm new password</label>
            <div className="auth-input">
              <Lock size={18} />
              <input
                type="password"
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
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
              {loading ? 'Updating password...' : 'Update Password'}
              <ArrowRight size={18} />
            </button>
          </form>
        )}

        {(mode === 'login' || mode === 'signup') && (
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
        )}
      </div>
    </div>
  )
}