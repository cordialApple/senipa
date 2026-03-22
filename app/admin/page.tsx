'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';

function authHeader() {
  return { Authorization: `Bearer ${localStorage.getItem('token') ?? ''}` };
}

interface Market {
  id: string;
  title: string;
  current_price: string;
  market_status: string;
}

interface TradeRow {
  id: string;
  user_email: string | null;
  market_title: string | null;
  position_type: string;
  quantity: string;
  entry_price: string;
  status: string;
  realized_pnl: string | null;
  created_at: string;
}

export default function AdminPage() {
  const router = useRouter();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [allTrades, setAllTrades] = useState<TradeRow[]>([]);
  const [priceInputs, setPriceInputs] = useState<Record<string, string>>({});
  const [createForm, setCreateForm] = useState({ title: '', description: '', current_price: '', expiration_date: '' });
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    // Guard: redirect if not admin
    try {
      const token = localStorage.getItem('token');
      if (!token) { router.push('/login'); return; }
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.role !== 'ADMIN') { router.push('/login'); return; }
    } catch {
      router.push('/login');
      return;
    }
    loadData();
  }, []);

  function loadData() {
    fetch('/api/markets', { headers: authHeader() })
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setMarkets(list);
        const prices: Record<string, string> = {};
        list.forEach((m: Market) => { prices[m.id] = Number(m.current_price).toFixed(4); });
        setPriceInputs(prices);
      });
    fetch('/api/admin/trades', { headers: authHeader() })
      .then((r) => r.json())
      .then((data) => setAllTrades(Array.isArray(data) ? data : []));
  }

  async function createMarket(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/markets/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify({
        ...createForm,
        current_price: Number(createForm.current_price),
        expiration_date: new Date(createForm.expiration_date).toISOString(),
      }),
    });
    if (res.ok) {
      setFeedback('Market created.');
      setCreateForm({ title: '', description: '', current_price: '', expiration_date: '' });
      loadData();
    } else {
      const b = await res.json();
      setFeedback(`Error: ${JSON.stringify(b.error)}`);
    }
  }

  async function updatePrice(marketId: string) {
    const res = await fetch('/api/markets/update-price', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify({ marketId, current_price: Number(priceInputs[marketId]) }),
    });
    setFeedback(res.ok ? 'Price updated.' : 'Price update failed.');
    if (res.ok) loadData();
  }

  async function resolve(marketId: string, outcome: 'YES' | 'NO') {
    if (!confirm(`Resolve market as ${outcome}?`)) return;
    const res = await fetch('/api/markets/resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify({ marketId, outcome }),
    });
    const b = await res.json();
    setFeedback(res.ok ? `Resolved. ${b.tradesSettled} trades settled.` : `Error: ${JSON.stringify(b.error)}`);
    if (res.ok) loadData();
  }

  async function resetAccounts() {
    if (!confirm('Reset ALL trader accounts? This deletes all trades and resets balances.')) return;
    const res = await fetch('/api/admin/reset', { method: 'POST', headers: authHeader() });
    const b = await res.json();
    setFeedback(res.ok ? `Reset ${b.accountsReset} accounts.` : 'Reset failed.');
    if (res.ok) loadData();
  }

  return (
    <>
      <Navbar />
      <main style={{ padding: '2rem', maxWidth: '1100px', margin: '0 auto', fontFamily: 'monospace' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1rem', letterSpacing: '0.1em', textTransform: 'uppercase', margin: 0 }}>Admin Panel</h1>
          <button onClick={resetAccounts} style={{ ...btnBase, border: '1px solid var(--red)', color: 'var(--red)' }}>
            Reset All Accounts
          </button>
        </div>

        {feedback && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '4px', padding: '0.6rem 1rem', fontSize: '0.78rem', marginBottom: '1.5rem', color: 'var(--text)' }}>
            {feedback}
          </div>
        )}

        {/* Create market */}
        <section style={{ ...cardStyle, marginBottom: '2rem' }}>
          <h2 style={sectionHeader}>Create Market</h2>
          <form onSubmit={createMarket} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <FormField label="Title">
              <input style={inputStyle} value={createForm.title} required
                onChange={(e) => setCreateForm((f) => ({ ...f, title: e.target.value }))} />
            </FormField>
            <FormField label="Description">
              <input style={inputStyle} value={createForm.description} required
                onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))} />
            </FormField>
            <FormField label="Starting Price (0–1)">
              <input style={inputStyle} type="number" min="0" max="1" step="0.0001" value={createForm.current_price} required
                onChange={(e) => setCreateForm((f) => ({ ...f, current_price: e.target.value }))} />
            </FormField>
            <FormField label="Expiration Date">
              <input style={inputStyle} type="datetime-local" value={createForm.expiration_date} required
                onChange={(e) => setCreateForm((f) => ({ ...f, expiration_date: e.target.value }))} />
            </FormField>
            <div style={{ gridColumn: '1 / -1' }}>
              <button type="submit" style={{ ...btnBase, background: 'var(--accent)', color: '#fff' }}>
                Create Market
              </button>
            </div>
          </form>
        </section>

        {/* Active markets */}
        <section style={{ ...cardStyle, marginBottom: '2rem' }}>
          <h2 style={sectionHeader}>Active Markets</h2>
          {markets.length === 0 ? (
            <p style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>No active markets.</p>
          ) : (
            <table style={tableStyle}>
              <thead>
                <tr>
                  {['Title', 'Price', 'Update Price', 'Resolve'].map((h) => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {markets.map((m) => (
                  <tr key={m.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={tdStyle}>{m.title}</td>
                    <td style={{ ...tdStyle, color: 'var(--accent)' }}>{Number(m.current_price).toFixed(4)}</td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <input
                          type="number"
                          min="0"
                          max="1"
                          step="0.0001"
                          value={priceInputs[m.id] ?? ''}
                          onChange={(e) => setPriceInputs((p) => ({ ...p, [m.id]: e.target.value }))}
                          style={{ ...inputStyle, width: '90px', padding: '0.3rem 0.5rem' }}
                        />
                        <button onClick={() => updatePrice(m.id)} style={{ ...btnBase, border: '1px solid var(--accent)', color: 'var(--accent)' }}>
                          Update
                        </button>
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => resolve(m.id, 'YES')} style={{ ...btnBase, border: '1px solid var(--green)', color: 'var(--green)' }}>YES</button>
                        <button onClick={() => resolve(m.id, 'NO')} style={{ ...btnBase, border: '1px solid var(--red)', color: 'var(--red)' }}>NO</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* All trades monitor */}
        <section style={cardStyle}>
          <h2 style={sectionHeader}>Recent Trades (last 50)</h2>
          {allTrades.length === 0 ? (
            <p style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>No trades yet.</p>
          ) : (
            <table style={tableStyle}>
              <thead>
                <tr>
                  {['User', 'Market', 'Side', 'Qty', 'Entry', 'Status', 'Realized PnL'].map((h) => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allTrades.map((t) => (
                  <tr key={t.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ ...tdStyle, color: 'var(--muted)' }}>{t.user_email ?? '—'}</td>
                    <td style={tdStyle}>{t.market_title ?? '—'}</td>
                    <td style={{ ...tdStyle, color: t.position_type === 'YES' ? 'var(--green)' : 'var(--red)' }}>
                      {t.position_type}
                    </td>
                    <td style={tdStyle}>{Number(t.quantity).toFixed(4)}</td>
                    <td style={tdStyle}>{Number(t.entry_price).toFixed(4)}</td>
                    <td style={{ ...tdStyle, color: t.status === 'OPEN' ? 'var(--yellow)' : 'var(--muted)' }}>
                      {t.status}
                    </td>
                    <td style={{ ...tdStyle, color: t.realized_pnl == null ? 'var(--muted)' : Number(t.realized_pnl) >= 0 ? 'var(--green)' : 'var(--red)' }}>
                      {t.realized_pnl == null ? '—' : `${Number(t.realized_pnl) >= 0 ? '+' : ''}$${Number(t.realized_pnl).toFixed(2)}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </main>
    </>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ fontSize: '0.68rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '0.35rem' }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const cardStyle: React.CSSProperties = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px', padding: '1.5rem' };
const sectionHeader: React.CSSProperties = { fontSize: '0.72rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 0, marginBottom: '1rem' };
const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' };
const thStyle: React.CSSProperties = { textAlign: 'left', padding: '0.45rem 0.75rem', fontSize: '0.66rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--border)' };
const tdStyle: React.CSSProperties = { padding: '0.65rem 0.75rem', fontFamily: 'monospace', verticalAlign: 'middle' };
const inputStyle: React.CSSProperties = { width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)', padding: '0.45rem 0.65rem', borderRadius: '4px', fontFamily: 'monospace', fontSize: '0.82rem', boxSizing: 'border-box' };
const btnBase: React.CSSProperties = { background: 'none', border: 'none', padding: '0.3rem 0.7rem', borderRadius: '3px', cursor: 'pointer', fontSize: '0.72rem', fontFamily: 'monospace', letterSpacing: '0.05em' };
