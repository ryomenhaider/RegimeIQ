import clsx from 'clsx';
import { COLORS } from '../../../utils/constants';

export default function SummaryStrip({ className }) {
  return (
    <div
      className={clsx(className)}
      style={{
        background: '#11112a',
        border: '1px solid #1e1e38',
        borderRadius: '5px',
        padding: '12px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
      }}
    >
      <div style={{
        width: '2px', height: '14px', borderRadius: '1px',
        background: '#7ED87A',
        boxShadow: '0 0 5px rgba(126,216,122,0.4)',
        flexShrink: 0
      }} />
      <span style={{
        fontFamily: 'IBM Plex Mono, monospace',
        fontSize: '11px',
        fontWeight: 600,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: '#7777aa'
      }}>
        Summary Strip
      </span>
    </div>
  );
}