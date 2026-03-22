'use client';

import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';

function authHeader() {
  return { Authorization: `Bearer ${localStorage.getItem('token') ?? ''}` };
}

interface Position {
  id: string;
  market_id: string;
  position_type: 'YES' | 'NO';
  entry_price: string;
  quantity: string;
  status: string;
  unrealized_pnl: number;
  created_at: string;
}

export default function PositionsPage() {
  const [positions, setPositions] = useState<Position[]>([]);

  useEffect(() => {
    fetch('/api/positions', { headers: authHeader() })
      .then((r) => r.json())
      .then((data) => setPositions(Array.isArray(data) ? data : []));
  }, []);

  return (
    <>
      <Navbar />
      <main style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto', fontFamily: 'monospace' }}>
        <h1 style={pageHeader}>Open Positions</h1>

        {positions.length === 0 ? (
          <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>No open positions.</p>
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr>
                {['Market', 'Side', 'Entry Price', 'Quantity', 'Unrealized PnL', 'Opened'].map((h) => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {positions.map((p) => (
                <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={tdStyle}>{p.market_id.slice(0, 8)}…</td>
                  <td style={{ ...tdStyle, color: p.position_type === 'YES' ? 'var(--green)' : 'var(--red)' }}>
                    {p.position_type}
                  </td>
                  <td style={tdStyle}>{Number(p.entry_price).toFixed(4)}</td>
                  <td style={tdStyle}>{Number(p.quantity).toFixed(4)}</td>
                  <td style={{ ...tdStyle, color: p.unrealized_pnl >= 0 ? 'var(--green)' : 'var(--red)' }}>
                    {p.unrealized_pnl >= 0 ? '+' : ''}${p.unrealized_pnl.toFixed(2)}
                  </td>
                  <td style={{ ...tdStyle, color: 'var(--muted)' }}>
                    {new Date(p.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </main>
    </>
  );
}

const pageHeader: React.CSSProperties = { fontSize: '1rem', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '1.5rem', marginTop: 0 };
const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' };
const thStyle: React.CSSProperties = { textAlign: 'left', padding: '0.5rem 0.75rem', fontSize: '0.68rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--border)' };
const tdStyle: React.CSSProperties = { padding: '0.75rem', fontFamily: 'monospace' };
