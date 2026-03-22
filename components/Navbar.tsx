'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const payload = JSON.parse(atob(token.split('.')[1]));
      setRole(payload.role);
    } catch {
      // malformed token — leave role null
    }
  }, []);

  function logout() {
    localStorage.removeItem('token');
    router.push('/login');
  }

  const links = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/markets', label: 'Markets' },
    { href: '/positions', label: 'Positions' },
    { href: '/leaderboard', label: 'Leaderboard' },
    ...(role === 'ADMIN' ? [{ href: '/admin', label: 'Admin' }] : []),
  ];

  return (
    <nav style={{
      background: 'var(--surface)',
      borderBottom: '1px solid var(--border)',
      padding: '0 2rem',
      height: '56px',
      display: 'flex',
      alignItems: 'center',
      gap: '2rem',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      <span style={{ fontWeight: 700, letterSpacing: '0.08em', color: 'var(--accent)', fontSize: '0.9rem' }}>
        SENIPA
      </span>
      <div style={{ display: 'flex', gap: '1.5rem', flex: 1 }}>
        {links.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            style={{
              fontSize: '0.8rem',
              letterSpacing: '0.06em',
              fontWeight: pathname === href ? 600 : 400,
              color: pathname === href ? 'var(--text)' : 'var(--muted)',
              textDecoration: 'none',
              textTransform: 'uppercase',
              transition: 'color 0.15s',
            }}
          >
            {label}
          </Link>
        ))}
      </div>
      <button
        onClick={logout}
        style={{
          background: 'none',
          border: '1px solid var(--border)',
          color: 'var(--muted)',
          padding: '0.3rem 0.8rem',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '0.75rem',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }}
      >
        Logout
      </button>
    </nav>
  );
}
