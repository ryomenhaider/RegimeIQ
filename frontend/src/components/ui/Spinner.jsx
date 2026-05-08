import clsx from 'clsx';
import { COLORS } from '../../utils/constants';

export default function Spinner({
  size = 'md',
  color = '#7ED87A',
  className,
  ...props
}) {
  const sizePixels = { sm: 14, md: 22, lg: 36 };
  const px = sizePixels[size];
  const borderWidth = size === 'lg' ? 2.5 : 2;
  const uid = `sp-${px}`;

  return (
    <>
      <style>{`
        @keyframes pfSpin {
          to { transform: rotate(360deg); }
        }
        .${uid} {
          display: inline-block;
          width: ${px}px;
          height: ${px}px;
          border: ${borderWidth}px solid rgba(126,216,122,0.1);
          border-radius: 50%;
          border-top-color: ${color};
          animation: pfSpin 550ms linear infinite;
          flex-shrink: 0;
        }
      `}</style>
      <div
        className={clsx(uid, className)}
        role="status"
        aria-label="Loading"
        {...props}
      />
    </>
  );
}