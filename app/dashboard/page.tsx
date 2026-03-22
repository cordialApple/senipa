'use client';

import { useEffect, useRef, useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
} from 'chart.js';
import gsap from 'gsap';
import Navbar from '@/components/Navbar';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

function authHeader() {
  return { Authorization: `Bearer ${localStorage.getItem('token') ?? ''}` };
}

interface Account {
  current_balance: string;
  starting_balance: string;
  peak_balance: string;
  profit_target: string;
  max_drawdown: string;
  current_drawdown: string;
  account_status: 'EVALUATION' | 'FUNDED' | 'FAILED';
  min_trades_required: number;
  trades_taken: number;
}

interface Position {
  market_id: string;
  position_type: 'YES' | 'NO';
  entry_price: string;
  quantity: string;
  status: string;
  unrealized_pnl: number;
  created_at: string;
  closed_at: string | null;
}

const STATUS_COLOR: Record<string, string> = {
  EVALUATION: 'var(--yellow)',
  FUNDED: 'var(--green)',
  FAILED: 'var(--red)',
};

export default function DashboardPage() {
  const [account, setAccount] = useState<Account | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const progressRef = useRef<HTMLDivElement>(null);
  const drawdownRef = useRef<HTMLDivElement>(null);
  const confettiFired = useRef(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/account', { headers: authHeader() }).then((r) => r.json()),
      fetch('/api/positions', { headers: authHeader() }).then((r) => r.json()),
    ]).then(([acc, pos]) => {
      setAccount(acc);
      setPositions(Array.isArray(pos) ? pos : []);
    });
  }, []);

  // Animate progress bars on mount
  useEffect(() => {
    if (!account) return;
    const profit = Number(account.current_balance) - Number(account.starting_balance);
    const profitPct = Math.min(Math.max(profit / Number(account.profit_target), 0), 1) * 100;
    const drawdownPct = Math.min(Number(account.current_drawdown) / Number(account.max_drawdown), 1) * 100;

    if (progressRef.current) {
      gsap.fromTo(progressRef.current, { width: '0%' }, { width: `${profitPct}%`, duration: 1, ease: 'power2.out' });
    }
    if (drawdownRef.current) {
      gsap.fromTo(drawdownRef.current, { width: '0%' }, { width: `${drawdownPct}%`, duration: 1, ease: 'power2.out' });
    }

    // Confetti — once per session on FUNDED
    if (account.account_status === 'FUNDED' && !confettiFired.current && !sessionStorage.getItem('funded_confetti')) {
      confettiFired.current = true;
      sessionStorage.setItem('funded_confetti', '1');
      fireConfetti();
    }
  }, [account]);

  function fireConfetti() {
    const colors = ['#00c48c', '#3b82f6', '#f5c518', '#ff4d4d', '#a855f7'];
    for (let i = 0; i < 80; i++) {
      const el = document.createElement('div');
      el.style.cssText = `position:fixed;top:0;left:${Math.random() * 100}vw;width:8px;height:8px;border-radius:50%;background:${colors[i % colors.length]};z-index:9999;pointer-events:none;`;
      document.body.appendChild(el);
      gsap.to(el, {
        y: `${60 + Math.random() * 40}vh`,
        x: `${(Math.random() - 0.5) * 200}px`,
        opacity: 0,
        rotation: Math.random() * 360,
        duration: 1.5 + Math.random(),
        ease: 'power1.out',
        onComplete: () => el.remove(),
        delay: Math.random() * 0.5,
      });
    }
  }

  // Equity curve: closed positions sorted by closed_at, prepend starting balance
  const closedSorted = [...positions]
    .filter((p) => p.status === 'CLOSED' && p.closed_at)
    .sort((a, b) => new Date(a.closed_at!).getTime() - new Date(b.closed_at!).getTime());

  const hasEquityData = closedSorted.length > 0;
  let runningBalance = account ? Number(account.starting_balance) : 0;
  const equityPoints = hasEquityData
    ? [
        { label: 'Start', value: runningBalance },
        ...closedSorted.map((p) => {
          runningBalance += Number(p.unrealized_pnl); // realized for closed
          return { label: new Date(p.closed_at!).toLocaleDateString(), value: runningBalance };
        }),
      ]
    : [];

  if (!account) {
    return (
      <>
        <Navbar />
        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--muted)', fontFamily: 'monospace' }}>
          Loading...
        </div>
      </>
    );
  }

  const profit = Number(account.current_balance) - Number(account.starting_balance);
  const profitPct = Math.min(Math.max(profit / Number(account.profit_target), 0), 1) * 100;
  const drawdownPct = Math.min(Number(account.current_drawdown) / Number(account.max_drawdown), 1) * 100;
  const drawdownDanger = drawdownPct > 80;

  return (
    <>
      <Navbar />
      <main style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', fontFamily: 'monospace' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.1rem', letterSpacing: '0.1em', textTransform: 'uppercase', margin: 0 }}>
            Dashboard
          </h1>
          <span style={{
            fontSize: '0.7rem',
            padding: '0.2rem 0.6rem',
            borderRadius: '3px',
            background: STATUS_COLOR[account.account_status] + '22',
            color: STATUS_COLOR[account.account_status],
            border: `1px solid ${STATUS_COLOR[account.account_status]}44`,
            letterSpacing: '0.08em',
          }}>
            {account.account_status}
          </span>
        </div>

        {/* Top cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
          <Card label="Balance" value={`$${Number(account.current_balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}`} />
          <Card label="Starting" value={`$${Number(account.starting_balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}`} />
          <Card
            label="P&L"
            value={`${profit >= 0 ? '+' : ''}$${profit.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
            valueColor={profit >= 0 ? 'var(--green)' : 'var(--red)'}
          />
          <Card label="Trades" value={`${account.trades_taken} / ${account.min_trades_required}`} />
        </div>

        {/* Progress bars */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
          <div style={barContainerStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={labelStyle}>Profit Target</span>
              <span style={labelStyle}>{profitPct.toFixed(1)}%</span>
            </div>
            <div style={{ background: 'var(--border)', borderRadius: '3px', height: '6px', overflow: 'hidden' }}>
              <div ref={progressRef} style={{ height: '100%', background: 'var(--green)', borderRadius: '3px', width: '0%' }} />
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: '0.4rem' }}>
              ${profit.toFixed(2)} / ${Number(account.profit_target).toFixed(2)}
            </div>
          </div>

          <div style={barContainerStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={labelStyle}>Drawdown</span>
              <span style={{ ...labelStyle, color: drawdownDanger ? 'var(--red)' : 'var(--muted)' }}>
                {drawdownPct.toFixed(1)}%
              </span>
            </div>
            <div style={{ background: 'var(--border)', borderRadius: '3px', height: '6px', overflow: 'hidden' }}>
              <div
                ref={drawdownRef}
                style={{
                  height: '100%',
                  background: drawdownDanger ? 'var(--red)' : 'var(--yellow)',
                  borderRadius: '3px',
                  width: '0%',
                }}
              />
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: '0.4rem' }}>
              ${Number(account.current_drawdown).toFixed(2)} / ${Number(account.max_drawdown).toFixed(2)} max
            </div>
          </div>
        </div>

        {/* Equity curve */}
        <section style={{ ...cardStyle, marginBottom: '2rem' }}>
          <h2 style={sectionHeader}>Equity Curve</h2>
          {hasEquityData ? (
            <Line
              data={{
                labels: equityPoints.map((p) => p.label),
                datasets: [{
                  data: equityPoints.map((p) => p.value),
                  borderColor: '#3b82f6',
                  backgroundColor: 'rgba(59,130,246,0.08)',
                  fill: true,
                  tension: 0.3,
                  pointRadius: 3,
                }],
              }}
              options={{
                responsive: true,
                plugins: { legend: { display: false } },
                scales: {
                  x: { ticks: { color: '#666', font: { family: 'monospace', size: 10 } }, grid: { color: '#222' } },
                  y: { ticks: { color: '#666', font: { family: 'monospace', size: 10 } }, grid: { color: '#222' } },
                },
              }}
            />
          ) : (
            <p style={{ color: 'var(--muted)', fontSize: '0.8rem', textAlign: 'center', padding: '2rem 0' }}>
              No closed trades yet. Your equity curve will appear here.
            </p>
          )}
        </section>

        {/* Open positions */}
        <section style={cardStyle}>
          <h2 style={sectionHeader}>Open Positions</h2>
          {positions.filter((p) => p.status === 'OPEN').length === 0 ? (
            <p style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>No open positions.</p>
          ) : (
            <table style={tableStyle}>
              <thead>
                <tr>
                  {['Market', 'Side', 'Entry', 'Qty', 'Unrealized PnL'].map((h) => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {positions.filter((p) => p.status === 'OPEN').map((p, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={tdStyle}>{p.market_id.slice(0, 8)}…</td>
                    <td style={{ ...tdStyle, color: p.position_type === 'YES' ? 'var(--green)' : 'var(--red)' }}>
                      {p.position_type}
                    </td>
                    <td style={tdStyle}>{Number(p.entry_price).toFixed(4)}</td>
                    <td style={tdStyle}>{Number(p.quantity).toFixed(4)}</td>
                    <td style={{ ...tdStyle, color: p.unrealized_pnl >= 0 ? 'var(--green)' : 'var(--red)' }}>
                      {p.unrealized_pnl >= 0 ? '+' : ''}${p.unrealized_pnl.toFixed(2)}
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

function Card({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div style={cardStyle}>
      <div style={labelStyle}>{label}</div>
      <div style={{ fontSize: '1.4rem', fontWeight: 700, marginTop: '0.4rem', color: valueColor ?? 'var(--text)', letterSpacing: '-0.02em' }}>
        {value}
      </div>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: '6px',
  padding: '1.25rem',
};
const barContainerStyle: React.CSSProperties = { ...cardStyle };
const labelStyle: React.CSSProperties = { fontSize: '0.7rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em' };
const sectionHeader: React.CSSProperties = { fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem', marginTop: 0 };
const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' };
const thStyle: React.CSSProperties = { textAlign: 'left', padding: '0.5rem 0.75rem', fontSize: '0.7rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--border)' };
const tdStyle: React.CSSProperties = { padding: '0.6rem 0.75rem', fontFamily: 'monospace' };
