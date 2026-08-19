import { useState } from 'react'
import { useAuthRegister, useAuthLogin } from '../api'
import { useAuth } from '../contexts/AuthContext'
import './AuthScreen.css'

type Tab = 'login' | 'register'

export default function AuthScreen() {
  const [tab, setTab] = useState<Tab>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')

  const { login } = useAuth()
  const registerMutation = useAuthRegister()
  const loginMutation = useAuthLogin()

  const isPending = registerMutation.isPending || loginMutation.isPending

  const handleTabChange = (newTab: Tab) => {
    setTab(newTab)
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      const result =
        tab === 'login'
          ? await loginMutation.mutateAsync({ email, password })
          : await registerMutation.mutateAsync({ email, password, name })
      login(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <h1 className="auth-logo">J.A.R.V.I.S.</h1>
        <p className="auth-subtitle">Sign in to continue</p>

        <div className="auth-tabs">
          <button
            type="button"
            className={tab === 'login' ? 'active' : ''}
            onClick={() => handleTabChange('login')}
          >
            Login
          </button>
          <button
            type="button"
            className={tab === 'register' ? 'active' : ''}
            onClick={() => handleTabChange('register')}
          >
            Register
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {tab === 'register' && (
            <div className="auth-field">
              <label htmlFor="auth-name">Name (optional)</label>
              <input
                id="auth-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                autoComplete="name"
                className="auth-input"
              />
            </div>
          )}
          <div className="auth-field">
            <label htmlFor="auth-email">Email</label>
            <input
              id="auth-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
              className="auth-input"
            />
          </div>
          <div className="auth-field">
            <label htmlFor="auth-password">Password</label>
            <input
              id="auth-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={tab === 'register' ? 'At least 8 characters' : 'Your password'}
              autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
              minLength={tab === 'register' ? 8 : undefined}
              required
              className="auth-input"
            />
          </div>

          <button type="submit" disabled={isPending} className="auth-btn auth-btn-submit">
            {isPending ? (
              <span className="auth-btn-with-spinner">
                <span className="auth-spinner" /> {tab === 'login' ? 'Logging in...' : 'Registering...'}
              </span>
            ) : tab === 'login' ? (
              'Login'
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        {error && <p className="auth-error">{error}</p>}
      </div>
    </div>
  )
}
