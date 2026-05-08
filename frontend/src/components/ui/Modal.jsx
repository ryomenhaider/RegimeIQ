import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { COLORS } from '../../utils/constants';

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  className,
  ...props
}) {
  const modalRef = useRef(null);
  const previousFocusRef = useRef(null);
  const titleId = useRef(`modal-title-${Math.random().toString(36).slice(2)}`);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    previousFocusRef.current = document.activeElement;
    setIsAnimating(true);

    setTimeout(() => {
      const closeButton = modalRef.current?.querySelector('[data-modal-close]');
      if (closeButton) closeButton.focus();
    }, 0);

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab') {
        const focusableElements = modalRef.current?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        ) || [];
        const focusArray = Array.from(focusableElements);
        const currentIndex = focusArray.indexOf(document.activeElement);
        if (e.shiftKey) {
          if (currentIndex === 0) { e.preventDefault(); focusArray[focusArray.length - 1]?.focus(); }
        } else {
          if (currentIndex === focusArray.length - 1) { e.preventDefault(); focusArray[0]?.focus(); }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (previousFocusRef.current) previousFocusRef.current.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{
        backgroundColor: 'rgba(9,9,16,0.85)',
        backdropFilter: 'blur(4px)',
        animation: 'modalBgIn 150ms ease-out'
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <style>{`
        @keyframes modalBgIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes modalIn {
          from { opacity: 0; transform: translateY(-8px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .modal-close-btn {
          width: 28px; height: 28px;
          display: flex; align-items: center; justify-content: center;
          border-radius: 4px;
          transition: background 120ms ease, color 120ms ease;
          color: #555570;
        }
        .modal-close-btn:hover {
          background: rgba(42,42,74,0.8);
          color: #ddddf0;
        }
      `}</style>

      <div
        ref={modalRef}
        className={clsx('w-full mx-4', className)}
        style={{
          maxWidth: '440px',
          backgroundColor: '#11112a',
          border: '1px solid #2a2a4a',
          borderRadius: '8px',
          boxShadow: '0 24px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(126,216,122,0.04)',
          animation: 'modalIn 160ms cubic-bezier(0.16, 1, 0.3, 1)'
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId.current}
        {...props}
      >
        {/* Header */}
        {title && (
          <div
            className="flex items-center justify-between px-5 py-4"
            style={{ borderBottom: '1px solid #2a2a4a' }}
          >
            <div className="flex items-center gap-2">
              <div style={{ width: '3px', height: '14px', borderRadius: '2px', background: '#7ED87A', boxShadow: '0 0 8px rgba(126,216,122,0.5)' }} />
              <h2
                id={titleId.current}
                style={{
                  color: '#ddddf0',
                  fontSize: '13px',
                  fontFamily: 'IBM Plex Mono, monospace',
                  fontWeight: 600,
                  letterSpacing: '0.03em'
                }}
              >
                {title}
              </h2>
            </div>
            <button
              data-modal-close
              onClick={onClose}
              className="modal-close-btn"
              aria-label="Close modal"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                <path d="M1.5 1.5l11 11m-11 0l11-11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        )}

        {/* Body */}
        <div
          className="px-5 py-4"
          style={{ color: '#ddddf0', fontSize: '13px', lineHeight: '1.6', fontFamily: 'IBM Plex Sans, sans-serif' }}
        >
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div
            className="px-5 py-4 flex gap-2 justify-end"
            style={{ borderTop: '1px solid #2a2a4a' }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}