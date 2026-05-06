import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { COLORS } from '../../utils/constants';

/**
 * Modal component with accessibility features
 * - Focus trap: Tab cycles within modal
 * - Escape key: closes modal
 * - Animation: scale + opacity on open
 * - ARIA: modal role, dialog, labelledby
 */
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

  // Focus trap and keyboard handling
  useEffect(() => {
    if (!isOpen) return;

    // Store previous focus
    previousFocusRef.current = document.activeElement;
    setIsAnimating(true);

    // Move focus to modal
    setTimeout(() => {
      const closeButton = modalRef.current?.querySelector('[data-modal-close]');
      if (closeButton) {
        closeButton.focus();
      }
    }, 0);

    // Keyboard event handler
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }

      // Focus trap: manage Tab key
      if (e.key === 'Tab') {
        const focusableElements = modalRef.current?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        ) || [];

        const focusArray = Array.from(focusableElements);
        const currentIndex = focusArray.indexOf(document.activeElement);

        if (e.shiftKey) {
          if (currentIndex === 0) {
            e.preventDefault();
            focusArray[focusArray.length - 1]?.focus();
          }
        } else {
          if (currentIndex === focusArray.length - 1) {
            e.preventDefault();
            focusArray[0]?.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);

      // Restore focus when modal closes
      if (previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        animation: isAnimating ? 'fadeIn 150ms ease-out' : 'none'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>

      <div
        ref={modalRef}
        className={clsx('rounded-lg max-w-sm w-full mx-4', className)}
        style={{
          backgroundColor: COLORS.card,
          border: `1px solid ${COLORS.border}`,
          borderRadius: '8px',
          animation: 'modalSlideIn 150ms ease-out'
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId.current}
        {...props}
      >
        {/* Header */}
        {title && (
          <div
            className="flex items-center justify-between px-6 py-4 border-b"
            style={{ borderColor: COLORS.border }}
          >
            <h2
              id={titleId.current}
              className="text-base font-semibold"
              style={{ color: COLORS.accent }}
            >
              {title}
            </h2>
            <button
              data-modal-close
              onClick={onClose}
              className="p-1 rounded hover:opacity-75 transition-opacity"
              style={{ color: COLORS.text }}
              aria-label="Close modal"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 1001.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
              </svg>
            </button>
          </div>
        )}

        {/* Body */}
        <div className="px-6 py-4" style={{ color: COLORS.text }}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div
            className="px-6 py-4 border-t flex gap-3 justify-end"
            style={{ borderColor: COLORS.border }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
