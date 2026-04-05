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

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 2000,
          backgroundColor: 'rgba(0,0,0,0.8)',
          backdropFilter: 'blur(10px)',
          animation: 'fadeIn 0.3s ease'
        }}>
          <div style={{
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            width: '280px',
            background: 'var(--background)',
            borderLeft: '1px solid var(--border)',
            padding: '2rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '2rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                 <img src="/logo.png" alt="KeepNoteAI" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
                 <span className="logo" style={{ fontSize: '1.2rem' }}>KeepNoteAI</span>
               </div>
               <button onClick={() => setIsMobileMenuOpen(false)} style={{ color: 'var(--text-muted)' }}>
                 <X size={24} />
               </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
                       gap: '1rem', 
                       color: isActive ? 'var(--primary)' : 'var(--foreground)',
                       fontWeight: 600,
                       fontSize: '1.1rem',
                       padding: '1rem',
                       backgroundColor: isActive ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                       borderRadius: '12px'
                    }}
                  >
                    <Icon size={22} />
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </div>

            <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
               <button
                onClick={() => signOut()}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '1rem', 
                  color: 'var(--error)', 
                  fontWeight: 700,
                  fontSize: '1.1rem',
                  width: '100%',
                  padding: '1rem'
                }}
              >
                <LogOut size={22} />
                <span>Keluar Akun</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
