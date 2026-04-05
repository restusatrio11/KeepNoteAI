'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, FileText, Settings, LogOut, Info, Target, Menu, X } from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';

export default function Navigation() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const links = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/laporan', label: 'Laporan', icon: FileText },
    { href: '/rencana', label: 'Rencana', icon: Target },
    { href: '/settings', label: 'Setelan', icon: Settings },
  ];

  if (!session) return null;

  return (
    <nav style={{ 
      position: 'sticky', 
      top: 0, 
      zIndex: 1000, 
      background: 'rgba(6, 6, 8, 0.8)', 
      backdropFilter: 'blur(12px)', 
      borderBottom: '1px solid var(--border)' 
    }}>
      <div className="container" style={{ height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" className="logo" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <img 
            src="/logo.png" 
            alt="KeepNoteAI" 
            style={{ width: '36px', height: '36px', objectFit: 'contain' }} 
          />
          <span style={{ fontWeight: 800, letterSpacing: '-0.5px' }}>KeepNoteAI</span>
        </Link>
        
        {/* Desktop Menu */}
        <div className="hide-on-mobile" style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                style={{ 
                   display: 'flex', 
                   alignItems: 'center', 
                   gap: '0.6rem', 
                   color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                   fontWeight: 700,
                   fontSize: '0.9rem',
                   transition: 'all 0.3s ease'
                }}
              >
                <Icon size={18} />
                <span>{link.label}</span>
              </Link>
            );
          })}
          <div style={{ width: '1px', height: '20px', backgroundColor: 'var(--border)', margin: '0 0.5rem' }} />
          <button
            onClick={() => signOut()}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.6rem', 
              color: 'var(--error)', 
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: 'pointer',
              background: 'none',
              border: 'none'
            }}
          >
            <LogOut size={18} />
            <span>Keluar</span>
          </button>
        </div>

        {/* Mobile Toggle */}
        <button 
          className="btn glass" 
          style={{ display: 'none', padding: '0.5rem', borderRadius: '10px' }}
          onClick={() => setIsMobileMenuOpen(true)}
        >
          <Menu size={24} />
          <style jsx>{`
            @media (max-width: 768px) {
              button { display: flex !important; }
            }
          `}</style>
        </button>
      </div>

      {/* Mobile Menu Overlay - Solid & Full Screen */}
      {isMobileMenuOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: '#060608', // Pure solid background
          zIndex: 99999,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          {/* Menu Header Area */}
          <div style={{ 
            height: '80px', 
            padding: '0 1.5rem', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            backgroundColor: '#060608'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <img src="/logo.png" alt="Logo" style={{ width: '32px', height: '32px' }} />
              <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff' }}>KeepNoteAI</span>
            </div>
            <button 
              onClick={() => setIsMobileMenuOpen(false)}
              style={{ 
                background: 'rgba(255,255,255,0.05)', 
                border: '1px solid rgba(255,255,255,0.1)',
                padding: '0.6rem', 
                borderRadius: '12px',
                color: '#fff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <X size={24} />
            </button>
          </div>

          {/* Nav Links Area */}
          <div style={{ 
            flex: 1, 
            padding: '2rem 1.5rem', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '1.25rem',
            overflowY: 'auto',
            backgroundColor: '#060608'
          }}>
            {links.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  style={{ 
                     display: 'flex', 
                     alignItems: 'center', 
                     gap: '1.25rem', 
                     color: isActive ? '#3b82f6' : '#fff',
                     fontWeight: isActive ? 800 : 600,
                     fontSize: '1.25rem', // Larger text
                     padding: '1.5rem',
                     backgroundColor: isActive ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                     border: '1px solid',
                     borderColor: isActive ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                     borderRadius: '20px',
                     textDecoration: 'none'
                  }}
                >
                  <Icon size={28} color={isActive ? '#3b82f6' : 'rgba(255,255,255,0.6)'} />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Logout Section */}
          <div style={{ padding: '2rem 1.5rem', borderTop: '1px solid rgba(255,255,255,0.1)', backgroundColor: '#060608' }}>
             <button
              onClick={() => signOut()}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                gap: '1rem', 
                color: '#fff',
                backgroundColor: '#ef4444',
                border: 'none',
                fontWeight: 800,
                fontSize: '1.25rem',
                width: '100%',
                padding: '1.5rem',
                borderRadius: '20px',
                cursor: 'pointer',
                boxShadow: '0 8px 16px rgba(239, 68, 68, 0.25)'
              }}
            >
              <LogOut size={26} />
              <span>Keluar Akun</span>
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
