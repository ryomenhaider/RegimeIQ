import clsx from 'clsx';
import { COLORS } from '../../../utils/constants';

export default function AltDataWidget() {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#11112a' }}>
      <div
        className="widget-header"
        style={{
          padding: '8px 12px',
          borderBottom: '1px solid #2a2a4a',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          cursor: 'grab'
        }}
      >
        <div style={{ width: '2px', height: '12px', borderRadius: '1px', background: '#f5c542', boxShadow: '0 0 6px rgba(245,197,66,0.4)' }} />
        <span style={{
          fontSize: '10px',
          fontFamily: 'IBM Plex Mono, monospace',
          fontWeight: 600,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: '#7777aa'
        }}>
          Alt Data
        </span>
      </div>
      <div style={{
        flex: 1,
        display: 'grid',
        placeItems: 'center',
        color: '#555570',
        fontSize: '11px',
        fontFamily: 'IBM Plex Mono, monospace',
        letterSpacing: '0.04em'
      }}>
        No data available
      </div>
    </div>
  );
}