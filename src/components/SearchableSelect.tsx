'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';
import { clsx } from 'clsx';

interface Option {
  id: string;
  nama: string;
  kode?: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
}

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Pilih...',
  label,
  required = false
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedOption = useMemo(() => 
    options.find(opt => opt.id === value),
  [options, value]);

  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options;
    const lowerSearch = searchTerm.toLowerCase();
    return options.filter(opt => 
      opt.nama.toLowerCase().includes(lowerSearch) || 
      (opt.kode && opt.kode.toLowerCase().includes(lowerSearch))
    );
  }, [options, searchTerm]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setSearchTerm('');
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  };

  const handleSelect = (optionId: string) => {
    onChange(optionId);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearchTerm('');
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      {label && (
        <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.4rem', fontWeight: 600 }}>{label}</label>
      )}
      
      <div 
        onClick={handleToggle}
        className="input-base"
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          cursor: 'pointer',
          paddingRight: '1rem',
          minHeight: '48px',
          borderColor: isOpen ? 'var(--primary)' : 'rgba(255, 255, 255, 0.08)'
        }}
      >
        <span style={{ 
          color: selectedOption ? '#fff' : 'rgba(255, 255, 255, 0.3)',
          fontSize: '0.95rem',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          flex: 1
        }}>
          {selectedOption ? selectedOption.nama : placeholder}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {value && !required && (
            <X 
              size={14} 
              className="text-muted clear-icon" 
              onClick={handleClear} 
            />
          )}
          <ChevronDown 
            size={18} 
            style={{ 
              transition: 'transform 0.2s', 
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              opacity: 0.5
            }} 
          />
        </div>
      </div>

      {isOpen && (
        <div 
          className="glass" 
          style={{ 
            position: 'absolute', 
            top: 'calc(100% + 8px)', 
            left: 0, 
            right: 0, 
            zIndex: 1000, 
            maxHeight: '300px', 
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
            border: '1px solid var(--border)',
            padding: '0.5rem'
          }}
        >
          <div style={{ position: 'relative', margin: '0.5rem' }}>
            <Search 
              size={14} 
              style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} 
            />
            <input 
              ref={inputRef}
              type="text"
              placeholder="Cari..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              style={{ 
                width: '100%',
                padding: '0.6rem 0.75rem 0.6rem 2.25rem',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '10px',
                color: '#fff',
                fontSize: '0.85rem',
                outline: 'none'
              }}
            />
          </div>

          <div style={{ overflowY: 'auto', flex: 1, paddingRight: '4px' }} className="custom-scrollbar">
            {filteredOptions.length === 0 ? (
              <div style={{ padding: '1.5rem', textAlign: 'center', fontSize: '0.8rem', opacity: 0.5 }}>
                Tidak ditemukan.
              </div>
            ) : (
              filteredOptions.map((opt) => (
                <div 
                  key={opt.id}
                  onClick={() => handleSelect(opt.id)}
                  style={{ 
                    padding: '0.75rem 1rem', 
                    cursor: 'pointer',
                    borderRadius: '10px',
                    backgroundColor: value === opt.id ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'all 0.1s',
                    marginBottom: '2px'
                  }}
                  className="dropdown-item"
                >
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.9rem', color: value === opt.id ? 'var(--primary)' : '#fff', fontWeight: value === opt.id ? 700 : 400 }}>
                      {opt.nama}
                    </span>
                    {opt.kode && (
                      <span style={{ fontSize: '0.65rem', opacity: 0.4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        ID: {opt.kode}
                      </span>
                    )}
                  </div>
                  {value === opt.id && <Check size={14} color="var(--primary)" />}
                </div>
              ))
            )}
          </div>
        </div>
      )}
      
      <style jsx>{`
        .dropdown-item:hover {
          background-color: rgba(255, 255, 255, 0.05) !important;
        }
        .clear-icon:hover {
          color: #fff !important;
          cursor: pointer;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
}
