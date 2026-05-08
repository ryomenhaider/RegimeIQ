import clsx from 'clsx';
import { COLORS } from '../../utils/constants';

export default function Card({
  padding = 'md',
  border = 'default',
  children,
  className,
  ...props
}) {
  const paddingStyles = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6'
  };

  const borderMap = {
    default: '#2a2a4a',
    accent: 'rgba(126,216,122,0.35)',
    danger: 'rgba(255,68,85,0.35)'
  };

  const glowMap = {
    default: 'none',
    accent: '0 0 20px rgba(126,216,122,0.06)',
    danger: '0 0 20px rgba(255,68,85,0.06)'
  };

  return (
    <>
      <style>{`
        .pf-card {
          transition: border-color 150ms ease, box-shadow 150ms ease;
        }
        .pf-card:hover {
          border-color: ${border === 'default' ? '#3a3a5a' : borderMap[border]} !important;
        }
      `}</style>
      <div
        className={clsx('pf-card', paddingStyles[padding], className)}
        style={{
          backgroundColor: '#11112a',
          border: `1px solid ${borderMap[border]}`,
          borderRadius: '6px',
          boxShadow: glowMap[border],
          position: 'relative'
        }}
        {...props}
      >
        {children}
      </div>
    </>
  );
}