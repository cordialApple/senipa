'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);

  async function handleTraderLogin(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Login failed');
        return;
      }
      document.cookie = `token=${data.token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Strict`;
      router.push('/dashboard');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleAdminLogin(e: FormEvent) {
    e.preventDefault();
    setAdminError('');
    setAdminLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: adminEmail, password: adminPassword, role: 'ADMIN' }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAdminError(data.error ?? 'Login failed');
        return;
      }
      document.cookie = `token=${data.token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Strict`;
      router.push('/admin');
    } catch {
      setAdminError('Network error. Please try again.');
    } finally {
      setAdminLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ backgroundColor: 'var(--bg)' }}>

      <div className="w-full max-w-sm">
        {/* Logo / Title */}
        <div className="mb-8 text-center">
          <span className="text-xs font-mono tracking-widest uppercase"
            style={{ color: 'var(--accent)' }}>
            Prop Trading Platform
          </span>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight"
            style={{ color: 'var(--text)' }}>
            Sign in to your account
          </h1>
        </div>

        {/* Trader login form */}
        <form onSubmit={handleTraderLogin} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-xs mb-1 font-medium"
              style={{ color: 'var(--muted)' }}>
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded text-sm outline-none focus:ring-1 transition"
              style={{
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
                outlineColor: 'var(--accent)',
              }}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-xs mb-1 font-medium"
              style={{ color: 'var(--muted)' }}>
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded text-sm outline-none focus:ring-1 transition"
              style={{
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
                outlineColor: 'var(--accent)',
              }}
            />
          </div>

          {error && (
            <p className="text-xs" style={{ color: 'var(--red)' }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 rounded text-sm font-medium transition-opacity disabled:opacity-50"
            style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        {/* Hidden admin trigger — subtle, bottom of card */}
        <div className="mt-10 text-center">
          <button
            onClick={() => setAdminOpen(true)}
            className="text-xs transition-opacity opacity-20 hover:opacity-50 focus:opacity-50"
            style={{ color: 'var(--muted)' }}
            aria-label="Admin access"
          >
            I am a judge
          </button>
        </div>
      </div>

      {/* Admin modal */}
      {adminOpen && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setAdminOpen(false); }}
        >
          <div
            className="w-full max-w-sm rounded-lg p-6 shadow-xl"
            style={{
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
            }}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-semibold tracking-wide"
                style={{ color: 'var(--yellow)' }}>
                Admin Access
              </h2>
              <button
                onClick={() => setAdminOpen(false)}
                className="text-xs transition-opacity opacity-50 hover:opacity-100"
                style={{ color: 'var(--muted)' }}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label htmlFor="admin-email" className="block text-xs mb-1 font-medium"
                  style={{ color: 'var(--muted)' }}>
                  Admin Email
                </label>
                <input
                  id="admin-email"
                  type="email"
                  autoComplete="off"
                  required
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded text-sm outline-none focus:ring-1"
                  style={{
                    backgroundColor: 'var(--bg)',
                    border: '1px solid var(--border)',
                    color: 'var(--text)',
                    outlineColor: 'var(--yellow)',
                  }}
                />
              </div>

              <div>
                <label htmlFor="admin-password" className="block text-xs mb-1 font-medium"
                  style={{ color: 'var(--muted)' }}>
                  Password
                </label>
                <input
                  id="admin-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded text-sm outline-none focus:ring-1"
                  style={{
                    backgroundColor: 'var(--bg)',
                    border: '1px solid var(--border)',
                    color: 'var(--text)',
                    outlineColor: 'var(--yellow)',
                  }}
                />
              </div>

              {adminError && (
                <p className="text-xs" style={{ color: 'var(--red)' }}>{adminError}</p>
              )}

              <button
                type="submit"
                disabled={adminLoading}
                className="w-full py-2 rounded text-sm font-medium transition-opacity disabled:opacity-50"
                style={{ backgroundColor: 'var(--yellow)', color: '#000' }}
              >
                {adminLoading ? 'Signing in…' : 'Sign in as Admin'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
