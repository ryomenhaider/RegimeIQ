import React from 'react';
import { X } from 'lucide-react';
import { clsx } from 'clsx';

const Modal = ({ isOpen, onClose, title, children, className }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div 
        className={clsx(
          "bg-bg-card border border-border rounded-sm w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]",
          className
        )}
      >
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-lg font-bold text-white tracking-tight uppercase">{title}</h2>
          <button 
            onClick={onClose}
            className="text-text-muted hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
