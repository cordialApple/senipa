'use client';

import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';

function authHeader() {
  return { Authorization: `Bearer ${localStorage.getItem('token') ?? ''}` };
}

interface LeaderboardRow {
  leaderboardRank: number | null;
  email: string | null;
  totalProfit: string | null;
  winRate: string | null;
  totalTrades: number;
  maxDrawdown: string | null;
  accountStatus: string | null;
}

const STATUS_COLOR: Record<string, string> = {
  EVALUATION: 'var(--yellow)',
  FUNDED: 'var(--green)',
  FAILED: 'var(--red)',
};

export default function LeaderboardPage() {
  const [rows, setRows] = useState<LeaderboardRow[]>([]);

  useEffect(() => {
    fetch('/api/leaderboard', { headers: authHeader() })
      .then((r) => r.json())
      .then((data) => setRows(Array.isArray(data) ? data : []));
  }, []);

  return (
    <>
      <Navbar />
      <main style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto', fontFamily: 'monospace' }}>
        <h1 style={pageHeader}>Leaderboard</h1>

        {rows.length === 0 ? (
          <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>No traders ranked yet.</p>
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr>
                {['Rank', 'Trader', 'Total Profit', 'Win Rate', 'Trades', 'Status'].map((h) => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ ...tdStyle, color: r.leaderboardRank === 1 ? 'var(--yellow)' : 'var(--muted)', fontWeight: r.leaderboardRank === 1 ? 700 : 400 }}>
                    #{r.leaderboardRank ?? '—'}
                  </td>
                  <td style={tdStyle}>{r.email ?? '—'}</td>
                  <td style={{ ...tdStyle, color: Number(r.totalProfit ?? 0) >= 0 ? 'var(--green)' : 'var(--red)' }}>
                    {Number(r.totalProfit ?? 0) >= 0 ? '+' : ''}${Number(r.totalProfit ?? 0).toFixed(2)}
                  </td>
                  <td style={tdStyle}>{(Number(r.winRate ?? 0) * 100).toFixed(1)}%</td>
                  <td style={tdStyle}>{r.totalTrades}</td>
                  <td style={tdStyle}>
                    <span style={{
                      fontSize: '0.68rem',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '3px',
                      background: (STATUS_COLOR[r.accountStatus ?? ''] ?? 'var(--muted)') + '22',
                      color: STATUS_COLOR[r.accountStatus ?? ''] ?? 'var(--muted)',
                      border: `1px solid ${(STATUS_COLOR[r.accountStatus ?? ''] ?? 'var(--muted)')}44`,
                      letterSpacing: '0.06em',
                    }}>
                      {r.accountStatus ?? '—'}
                    </span>
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
