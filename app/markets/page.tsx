'use client';

import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';

function authHeader() {
  return { Authorization: `Bearer ${localStorage.getItem('token') ?? ''}` };
}

interface Market {
  id: string;
  title: string;
  description: string;
  current_price: string;
  expiration_date: string;
  market_status: string;
}

interface ModalState {
  market: Market;
  side: 'YES' | 'NO';
}

export default function MarketsPage() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [quantity, setQuantity] = useState('');
  const [balance, setBalance] = useState<number>(0);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch('/api/markets', { headers: authHeader() })
      .then((r) => r.json())
      .then(setMarkets);
    fetch('/api/account', { headers: authHeader() })
      .then((r) => r.json())
      .then((a) => setBalance(Number(a.current_balance)));
  }, []);

  function openModal(market: Market, side: 'YES' | 'NO') {
    setModal({ market, side });
    setQuantity('');
    setError('');
  }

  function closeModal() {
    setModal(null);
    setError('');
  }

  async function submitTrade() {
    if (!modal) return;
    const qty = Number(quantity);
    if (!qty || qty <= 0) { setError('Enter a valid quantity.'); return; }

    const positionValue = qty * Number(modal.market.current_price);
    if (positionValue > 0.2 * balance) {
      setError(`Position size $${positionValue.toFixed(2)} exceeds 20% of balance ($${(0.2 * balance).toFixed(2)}).`);
      return;
    }

    setSubmitting(true);
    const res = await fetch('/api/trade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify({ marketId: modal.market.id, position_type: modal.side, quantity: qty }),
    });
    setSubmitting(false);

    if (!res.ok) {
      const body = await res.json();
      setError(body.error ?? 'Trade failed.');
      return;
    }
    closeModal();
  }

  return (
    <>
      <Navbar />
      <main style={{ padding: '2rem', maxWidth: '1100px', margin: '0 auto', fontFamily: 'monospace' }}>
        <h1 style={pageHeader}>Markets</h1>

        <table style={tableStyle}>
          <thead>
            <tr>
              {['Title', 'Description', 'Price', 'Expiry', ''].map((h) => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {markets.map((m) => (
              <tr key={m.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={tdStyle}>{m.title}</td>
                <td style={{ ...tdStyle, color: 'var(--muted)', maxWidth: '280px' }}>{m.description}</td>
                <td style={{ ...tdStyle, color: 'var(--accent)' }}>{Number(m.current_price).toFixed(4)}</td>
                <td style={{ ...tdStyle, color: 'var(--muted)' }}>{new Date(m.expiration_date).toLocaleDateString()}</td>
                <td style={{ ...tdStyle, display: 'flex', gap: '0.5rem' }}>
                  <ActionBtn color="var(--green)" onClick={() => openModal(m, 'YES')}>YES</ActionBtn>
                  <ActionBtn color="var(--red)" onClick={() => openModal(m, 'NO')}>NO</ActionBtn>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {modal && (
          <div style={overlayStyle} onClick={closeModal}>
            <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
              <h2 style={{ fontSize: '0.85rem', marginBottom: '0.25rem', marginTop: 0 }}>{modal.market.title}</h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '1.25rem', marginTop: 0 }}>
                Opening <strong style={{ color: modal.side === 'YES' ? 'var(--green)' : 'var(--red)' }}>{modal.side}</strong> at{' '}
                <strong>{Number(modal.market.current_price).toFixed(4)}</strong>
              </p>

              <label style={labelStyle}>Quantity</label>
              <input
                type="number"
                min="0"
                step="any"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                style={inputStyle}
                autoFocus
              />
              {quantity && Number(quantity) > 0 && (
                <p style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: '0.4rem' }}>
                  Position value: ${(Number(quantity) * Number(modal.market.current_price)).toFixed(2)}
                  {' '}/ 20% limit: ${(0.2 * balance).toFixed(2)}
                </p>
              )}
              {error && <p style={{ fontSize: '0.75rem', color: 'var(--red)', marginTop: '0.5rem' }}>{error}</p>}

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
                <button onClick={submitTrade} disabled={submitting} style={{
                  ...btnBase,
                  background: modal.side === 'YES' ? 'var(--green)' : 'var(--red)',
                  color: '#000',
                  flex: 1,
                }}>
                  {submitting ? 'Submitting…' : `Open ${modal.side}`}
                </button>
                <button onClick={closeModal} style={{ ...btnBase, border: '1px solid var(--border)' }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}

function ActionBtn({ children, color, onClick }: { children: string; color: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      background: 'none',
      border: `1px solid ${color}`,
      color,
      padding: '0.25rem 0.65rem',
      borderRadius: '3px',
      cursor: 'pointer',
      fontSize: '0.72rem',
      letterSpacing: '0.06em',
      fontFamily: 'monospace',
    }}>
      {children}
    </button>
  );
}

const pageHeader: React.CSSProperties = { fontSize: '1rem', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '1.5rem', marginTop: 0 };
const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' };
const thStyle: React.CSSProperties = { textAlign: 'left', padding: '0.5rem 0.75rem', fontSize: '0.68rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--border)' };
const tdStyle: React.CSSProperties = { padding: '0.75rem', fontFamily: 'monospace', verticalAlign: 'middle' };
const labelStyle: React.CSSProperties = { fontSize: '0.7rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '0.4rem' };
const inputStyle: React.CSSProperties = { width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)', padding: '0.5rem 0.75rem', borderRadius: '4px', fontFamily: 'monospace', fontSize: '0.85rem', boxSizing: 'border-box' };
const btnBase: React.CSSProperties = { padding: '0.55rem 1rem', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.78rem', fontFamily: 'monospace', letterSpacing: '0.06em', fontWeight: 600 };
const overlayStyle: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 };
const modalStyle: React.CSSProperties = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '2rem', width: '380px', maxWidth: '90vw' };
